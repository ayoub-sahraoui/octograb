import { makeAutoObservable } from 'mobx';
import { HumanMessage } from '@langchain/core/messages';
import type { BaseMessage } from '@langchain/core/messages';
import { runAgentStream, type AgentStreamEvent } from '@/core/ai/agent';
import {
    clearPendingBlueprint,
    consumeSavedBlueprintSignal,
    getPendingBlueprint,
    setActiveAiConversation,
} from '@/core/ai/pending-blueprint-state';
import { PROVIDERS, PROVIDER_IDS, type ProviderId } from '@/core/ai/providers';
import { Blueprint } from '../models/blueprint';
import { browser } from 'wxt/browser';

const log = (...args: any[]) => console.log('[AI Store]', ...args);
const logError = (...args: any[]) => console.error('[AI Store]', ...args);

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant' | 'tool';
    content: string;
    timestamp: number;
    /** Tool call info for assistant messages */
    toolCalls?: { name: string; args: any }[];
    /** Tool execution result */
    toolResult?: { name: string; result: string };
    /** Blueprint preview embedded in message */
    blueprintPreview?: {
        name: string;
        description: string;
        blockCount: number;
        valid: boolean;
        errors: string[];
        warnings: string[];
    };
    /** Action the UI should handle (e.g., SAVE_BLUEPRINT) */
    action?: { type: string; data: any };
}

export type AgentStatus = 'idle' | 'thinking' | 'calling_tool' | 'streaming' | 'error';

export interface Conversation {
    id: string;
    title: string;
    messages: ChatMessage[];
    createdAt: number;
    updatedAt: number;
}

// Storage keys for per-provider API keys
const STORAGE_KEY_PREFIX = 'ai_provider_key_';
const STORAGE_KEY_PROVIDER = 'ai_selected_provider';
const STORAGE_KEY_MODEL = 'ai_selected_model';
const STORAGE_KEY_CONVERSATIONS = 'ai_conversations';
const STORAGE_KEY_ACTIVE_CONV = 'ai_active_conversation';
const MAX_CONVERSATIONS = 30;

// ─── Store ───────────────────────────────────────────────────────────────────

class AiAgentStore {
    messages: ChatMessage[] = [];
    status: AgentStatus = 'idle';
    currentToolName: string | null = null;
    error: string | null = null;

    /** Selected provider */
    provider: ProviderId = 'gemini';
    /** Per-provider API keys */
    apiKeys: Record<ProviderId, string> = {
        openai: '',
        mistral: '',
        gemini: '',
        groq: '',
    };
    /** Selected model for the current provider */
    model: string = 'gemini-2.5-flash-preview-05-20';
    /** Whether settings have been loaded from storage */
    settingsLoaded: boolean = false;

    /** Conversation management */
    conversations: Conversation[] = [];
    activeConversationId: string | null = null;
    conversationsLoaded: boolean = false;

    /** Abort controller for current agent run */
    private _abortController: AbortController | null = null;
    /** LangChain message history for the agent */
    private _lcMessages: BaseMessage[] = [];
    /** Debounce timer for conversation persistence */
    private _saveTimer: ReturnType<typeof setTimeout> | null = null;
    /** Promise for the initial settings hydration to avoid late overwrites */
    private _settingsLoadPromise: Promise<void> | null = null;

    constructor() {
        makeAutoObservable(this, {
            _abortController: false,
            _lcMessages: false,
            _saveTimer: false,
            _settingsLoadPromise: false,
        } as any);
        this._settingsLoadPromise = this.loadSettings();
        this.loadConversations();
    }

    // ─── Action Methods ────────────────────────────────────────────────────

    setSettingsLoaded(loaded: boolean) {
        this.settingsLoaded = loaded;
    }

    setProviderAndModel(provider: ProviderId, model: string) {
        this.provider = provider;
        this.model = model;
    }

    setApiKeyForProvider(provider: ProviderId, key: string) {
        this.apiKeys[provider] = key;
    }

    async setModel(model: string) {
        await this.waitForSettingsLoad();
        this.model = model;
        try {
            await browser.storage.local.set({ [STORAGE_KEY_MODEL]: model });
        } catch (e) {
            console.error('[OctoGrab AI] Failed to save model:', e);
        }
    }

    setStatus(status: AgentStatus) {
        this.status = status;
    }

    setError(error: string | null) {
        this.error = error;
    }

    setCurrentToolName(name: string | null) {
        this.currentToolName = name;
    }

    setConversations(conversations: Conversation[], activeId: string | null) {
        this.conversations = conversations;
        this.conversationsLoaded = true;
        if (activeId && conversations.find(c => c.id === activeId)) {
            this.activeConversationId = activeId;
            setActiveAiConversation(activeId);
            const conv = conversations.find(c => c.id === activeId)!;
            this.messages = conv.messages;
        } else if (conversations.length > 0) {
            const sorted = [...conversations].sort((a, b) => b.updatedAt - a.updatedAt);
            this.activeConversationId = sorted[0].id;
            setActiveAiConversation(sorted[0].id);
            this.messages = sorted[0].messages;
        } else {
            setActiveAiConversation(null);
        }
    }

    setConversationsLoaded(loaded: boolean) {
        this.conversationsLoaded = loaded;
    }

    addConversation(conv: Conversation) {
        this.conversations.unshift(conv);
        this.activeConversationId = conv.id;
        setActiveAiConversation(conv.id);
        this.messages = [];
        this._lcMessages = [];
        this.status = 'idle';
        this.error = null;
        this.currentToolName = null;
    }

    switchToConversation(id: string, messages: ChatMessage[]) {
        this.activeConversationId = id;
        setActiveAiConversation(id);
        this.messages = [...messages];
        this._lcMessages = [];
        this.status = 'idle';
        this.error = null;
        this.currentToolName = null;
    }

    deleteConversationById(id: string) {
        this.conversations = this.conversations.filter(c => c.id !== id);
        clearPendingBlueprint(id);
        if (this.activeConversationId === id) {
            if (this.conversations.length > 0) {
                const next = this.conversations[0];
                this.activeConversationId = next.id;
                setActiveAiConversation(next.id);
                this.messages = [...next.messages];
            } else {
                this.activeConversationId = null;
                setActiveAiConversation(null);
                this.messages = [];
            }
            this._lcMessages = [];
        }
    }

    updateConversationTitle(id: string, title: string) {
        const conv = this.conversations.find(c => c.id === id);
        if (conv) {
            conv.title = title;
        }
    }

    updateActiveConversationMessages() {
        if (!this.activeConversationId) return;
        const conv = this.conversations.find(c => c.id === this.activeConversationId);
        if (conv) {
            conv.messages = [...this.messages];
            conv.updatedAt = Date.now();
            if (conv.title === 'New Chat' && this.messages.length > 0) {
                const firstUser = this.messages.find(m => m.role === 'user');
                if (firstUser) {
                    conv.title = firstUser.content.length > 40
                        ? firstUser.content.substring(0, 40) + '…'
                        : firstUser.content;
                }
            }
        }
    }

    clearMessages() {
        this.messages = [];
        this._lcMessages = [];
        this.status = 'idle';
        this.error = null;
        this.currentToolName = null;
    }

    addChatMessage(msg: ChatMessage) {
        this.messages.push(msg);
    }

    resetAgentState() {
        this.status = 'idle';
        this.currentToolName = null;
    }

    // ─── Settings Management ──────────────────────────────────────────────

    async loadSettings() {
        try {
            const keys = [
                STORAGE_KEY_PROVIDER,
                STORAGE_KEY_MODEL,
                ...PROVIDER_IDS.map(p => STORAGE_KEY_PREFIX + p),
            ];
            const result = await browser.storage.local.get(keys);
            const provider = (result[STORAGE_KEY_PROVIDER] as ProviderId) || 'gemini';
            const model = (result[STORAGE_KEY_MODEL] as string) || PROVIDERS[provider].defaultModel;
            this.setProviderAndModel(provider, model);
            for (const pid of PROVIDER_IDS) {
                this.setApiKeyForProvider(pid, (result[STORAGE_KEY_PREFIX + pid] as string) || '');
            }
            this.setSettingsLoaded(true);
        } catch (e) {
            console.error('[OctoGrab AI] Failed to load settings:', e);
            this.setSettingsLoaded(true);
        }
    }

    async setProvider(provider: ProviderId) {
        await this.waitForSettingsLoad();
        const model = PROVIDERS[provider].defaultModel;
        this.setProviderAndModel(provider, model);
        try {
            await browser.storage.local.set({
                [STORAGE_KEY_PROVIDER]: provider,
                [STORAGE_KEY_MODEL]: this.model,
            });
        } catch (e) {
            console.error('[OctoGrab AI] Failed to save provider:', e);
        }
    }

    async setApiKey(provider: ProviderId, key: string) {
        await this.waitForSettingsLoad();
        this.setApiKeyForProvider(provider, key);
        try {
            await browser.storage.local.set({ [STORAGE_KEY_PREFIX + provider]: key });
        } catch (e) {
            console.error('[OctoGrab AI] Failed to save API key:', e);
        }
    }

    async saveModel(model: string) {
        await this.setModel(model);
    }

    /** Current provider's API key */
    get apiKey(): string {
        return this.apiKeys[this.provider];
    }

    get hasApiKey(): boolean {
        return this.apiKey.length > 0;
    }

    get isRunning(): boolean {
        return this.status === 'thinking' || this.status === 'calling_tool' || this.status === 'streaming';
    }

    get providerConfig() {
        return PROVIDERS[this.provider];
    }

    // ─── Chat Actions ────────────────────────────────────────────────────

    async sendMessage(content: string) {
        if (!content.trim()) return;
        if (!this.hasApiKey) {
            this.addMessage({
                role: 'assistant',
                content: `Please set your **${PROVIDERS[this.provider].label}** API key in Settings → AI Assistant before using the agent.`,
            });
            return;
        }
        if (this.isRunning) return;

        log(`User message: "${content.substring(0, 100)}${content.length > 100 ? '...' : ''}"`);

        // Ensure we have an active conversation
        if (!this.activeConversationId) {
            this.newConversation();
        }

        // Add user message
        this.addMessage({ role: 'user', content });
        this._lcMessages.push(new HumanMessage(content));

        // Run agent
        await this.runAgent();
    }

    async sendSuggestion(text: string) {
        await this.sendMessage(text);
    }

    stop() {
        if (this._abortController) {
            this._abortController.abort();
            this._abortController = null;
        }
        this.resetAgentState();
    }

    clearChat() {
        this.clearMessages();
        clearPendingBlueprint(this.activeConversationId);
        // Update conversation in storage
        if (this.activeConversationId) {
            this.persistActiveConversation();
        }
    }

    // ─── Conversation Management ──────────────────────────────────────────

    async loadConversations() {
        try {
            const result = await browser.storage.local.get([STORAGE_KEY_CONVERSATIONS, STORAGE_KEY_ACTIVE_CONV]);
            const saved = (result[STORAGE_KEY_CONVERSATIONS] as Conversation[] | undefined) || [];
            const activeId = (result[STORAGE_KEY_ACTIVE_CONV] as string | undefined) || null;
            this.setConversations(saved, activeId);
            log(`Loaded ${saved.length} conversations, active=${activeId}`);
        } catch (e) {
            logError('Failed to load conversations:', e);
            this.setConversationsLoaded(true);
        }
    }

    newConversation() {
        if (this.isRunning) return;

        // Save current conversation first
        this.persistActiveConversation();

        const id = `conv_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        const conv: Conversation = {
            id,
            title: 'New Chat',
            messages: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };

        this.addConversation(conv);

        this.persistConversations();
        log(`Created new conversation: ${id}`);
    }

    switchConversation(id: string) {
        if (this.isRunning || id === this.activeConversationId) return;

        // Save current
        this.persistActiveConversation();

        const conv = this.conversations.find(c => c.id === id);
        if (!conv) return;

        this.switchToConversation(id, conv.messages);

        browser.storage.local.set({ [STORAGE_KEY_ACTIVE_CONV]: id }).catch(() => { });
        log(`Switched to conversation: ${id}`);
    }

    deleteConversation(id: string) {
        if (this.isRunning) return;

        this.deleteConversationById(id);

        this.persistConversations();
        log(`Deleted conversation: ${id}`);
    }

    renameConversation(id: string, title: string) {
        this.updateConversationTitle(id, title);
        this.persistConversations();
    }

    get activeConversation(): Conversation | null {
        return this.conversations.find(c => c.id === this.activeConversationId) || null;
    }

    private persistActiveConversation() {
        this.updateActiveConversationMessages();
        this.persistConversations();
    }

    private persistConversations() {
        if (this._saveTimer) clearTimeout(this._saveTimer);
        this._saveTimer = setTimeout(async () => {
            try {
                // Keep only recent conversations + trim tool results for storage
                const toSave = this.conversations.slice(0, MAX_CONVERSATIONS).map(c => ({
                    ...c,
                    messages: c.messages.map(m => ({
                        ...m,
                        toolResult: m.toolResult
                            ? { name: m.toolResult.name, result: m.toolResult.result.substring(0, 200) }
                            : undefined,
                    })),
                }));
                await browser.storage.local.set({
                    [STORAGE_KEY_CONVERSATIONS]: toSave,
                    [STORAGE_KEY_ACTIVE_CONV]: this.activeConversationId,
                });
            } catch (e) {
                logError('Failed to persist conversations:', e);
            }
        }, 500);
    }

    // ─── Internal ────────────────────────────────────────────────────────

    private addMessage(opts: Omit<ChatMessage, 'id' | 'timestamp'>) {
        const msg: ChatMessage = {
            id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            timestamp: Date.now(),
            ...opts,
        };
        this.addChatMessage(msg);
        // Return the MobX observable proxy, not the raw object
        return this.messages[this.messages.length - 1];
    }

    private async waitForSettingsLoad() {
        const promise = this._settingsLoadPromise;
        if (promise) {
            await promise;
        }
    }

    private async runAgent() {
        setActiveAiConversation(this.activeConversationId);
        this._abortController = new AbortController();
        this.setStatus('thinking');
        this.setError(null);
        this.setCurrentToolName(null);

        log(`Starting agent run — provider=${this.provider}, model=${this.model}, messages=${this._lcMessages.length}`);
        const toolMessages: ChatMessage[] = [];
        let streamingMsg: ChatMessage | null = null;

        try {
            const resultMessages = await runAgentStream(
                this.provider,
                this.apiKey,
                this._lcMessages,
                this.model,
                (event: AgentStreamEvent) => {
                    switch (event.type) {
                        case 'token': {
                            // Accumulate tokens into a streaming assistant message
                            if (!streamingMsg) {
                                streamingMsg = this.addMessage({
                                    role: 'assistant',
                                    content: event.token,
                                });
                                this.setStatus('streaming');
                            } else {
                                streamingMsg.content += event.token;
                            }
                            break;
                        }

                        case 'stream_end': {
                            // Stream finished — finalize the message
                            streamingMsg = null;
                            this.setStatus('thinking');
                            break;
                        }

                        case 'tool_start':
                            this.setStatus('calling_tool');
                            this.setCurrentToolName(event.toolName);
                            toolMessages.push(this.addMessage({
                                role: 'tool',
                                content: `Calling **${this.formatToolName(event.toolName)}**...`,
                                toolResult: { name: event.toolName, result: '' },
                            }));
                            break;

                        case 'tool_end': {
                            const toolMsg = toolMessages[toolMessages.length - 1];
                            if (toolMsg) {
                                toolMsg.content = `**${this.formatToolName(event.toolName)}** completed`;
                                toolMsg.toolResult = { name: event.toolName, result: event.result };
                            }

                            try {
                                const parsed = JSON.parse(event.result);
                                // Show blueprint preview card when create_blueprint returns
                                if (parsed?.blueprintId && parsed?.validation) {
                                    toolMsg.blueprintPreview = {
                                        name: parsed.name,
                                        description: '',
                                        blockCount: parsed.blockCount,
                                        valid: parsed.validation?.valid ?? true,
                                        errors: parsed.validation?.errors ?? [],
                                        warnings: parsed.validation?.warnings ?? [],
                                    };
                                }
                            } catch { /* not JSON, ignore */ }

                            this.setStatus('thinking');
                            this.setCurrentToolName(null);
                            break;
                        }

                        case 'agent_message': {
                            // Fallback for non-streaming providers
                            this.addMessage({
                                role: 'assistant',
                                content: event.content,
                            });
                            break;
                        }

                        case 'error':
                            this.setError(event.message);
                            this.addMessage({
                                role: 'assistant',
                                content: `An error occurred: ${event.message}`,
                            });
                            break;

                        case 'done':
                            break;
                    }
                },
                this._abortController.signal,
            );

            if (resultMessages) {
                this._lcMessages = resultMessages;
                log(`Agent run finished — message history: ${resultMessages.length}`);
            }

            // Check if a blueprint was saved — refresh the blueprint list
            const savedSignal = consumeSavedBlueprintSignal();
            if (savedSignal) {
                log('Blueprint saved signal detected:', savedSignal);
                try {
                    // Dynamically refresh the builder store's blueprint list
                    const { useBlueprintBuilderStore } = await import('./blueprint-builder-store');
                    const builderStore = useBlueprintBuilderStore();
                    await builderStore.loadBlueprints();
                    log('Blueprint list refreshed');
                } catch (refreshErr: any) {
                    logError('Failed to refresh blueprints:', refreshErr.message);
                }
            }

        } catch (e: any) {
            this.setError(e.message);
            this.addMessage({
                role: 'assistant',
                content: `Error: ${e.message}. Please check your API key and try again.`,
            });
        } finally {
            this.resetAgentState();
            this._abortController = null;
            // Persist conversation after agent run
            this.persistActiveConversation();
        }
    }

    private formatToolName(name: string): string {
        const names: Record<string, string> = {
            analyze_page: 'Analyzing page',
            get_page_url: 'Getting page URL',
            get_page_screenshot: 'Taking screenshot',
            query_selector: 'Testing selector',
            get_element_text: 'Reading element text',
            get_element_attribute: 'Reading attribute',
            count_elements: 'Counting elements',
            test_extraction: 'Testing extraction',
            create_blueprint: 'Creating blueprint',
            validate_blueprint: 'Validating blueprint',
            save_blueprint: 'Saving blueprint',
        };
        return names[name] || name;
    }

    // ─── Blueprint Save Handler ──────────────────────────────────────────

    savePendingBlueprint(): Blueprint | null {
        const blueprint = getPendingBlueprint(this.activeConversationId);
        if (!blueprint) return null;
        clearPendingBlueprint(this.activeConversationId);
        return blueprint;
    }
}

// ─── Singleton ───────────────────────────────────────────────────────────────

let _instance: AiAgentStore | null = null;

export function useAiAgentStore(): AiAgentStore {
    if (!_instance) {
        _instance = new AiAgentStore();
    }
    return _instance;
}
