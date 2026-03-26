import { makeAutoObservable, runInAction } from 'mobx';
import { HumanMessage } from '@langchain/core/messages';
import type { BaseMessage } from '@langchain/core/messages';
import { runAgentStream, type AgentStreamEvent } from '@/core/ai/agent';
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

    constructor() {
        makeAutoObservable(this, {
            _abortController: false,
            _lcMessages: false,
            _saveTimer: false,
        } as any);
        this.loadSettings();
        this.loadConversations();
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
            runInAction(() => {
                this.provider = (result[STORAGE_KEY_PROVIDER] as ProviderId) || 'gemini';
                this.model = (result[STORAGE_KEY_MODEL] as string) || PROVIDERS[this.provider].defaultModel;
                for (const pid of PROVIDER_IDS) {
                    this.apiKeys[pid] = (result[STORAGE_KEY_PREFIX + pid] as string) || '';
                }
                this.settingsLoaded = true;
            });
        } catch (e) {
            console.error('[OctoGrab AI] Failed to load settings:', e);
            runInAction(() => { this.settingsLoaded = true; });
        }
    }

    async setProvider(provider: ProviderId) {
        runInAction(() => {
            this.provider = provider;
            this.model = PROVIDERS[provider].defaultModel;
        });
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
        runInAction(() => { this.apiKeys[provider] = key; });
        try {
            await browser.storage.local.set({ [STORAGE_KEY_PREFIX + provider]: key });
        } catch (e) {
            console.error('[OctoGrab AI] Failed to save API key:', e);
        }
    }

    async setModel(model: string) {
        runInAction(() => { this.model = model; });
        try {
            await browser.storage.local.set({ [STORAGE_KEY_MODEL]: model });
        } catch (e) {
            console.error('[OctoGrab AI] Failed to save model:', e);
        }
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
        runInAction(() => {
            this.status = 'idle';
            this.currentToolName = null;
        });
    }

    clearChat() {
        runInAction(() => {
            this.messages = [];
            this._lcMessages = [];
            this.status = 'idle';
            this.error = null;
            this.currentToolName = null;
        });
        (globalThis as any).__octograb_pending_blueprint = undefined;
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
            runInAction(() => {
                this.conversations = saved;
                this.conversationsLoaded = true;
                if (activeId && saved.find(c => c.id === activeId)) {
                    this.activeConversationId = activeId;
                    const conv = saved.find(c => c.id === activeId)!;
                    this.messages = conv.messages;
                } else if (saved.length > 0) {
                    // Load most recent
                    const sorted = [...saved].sort((a, b) => b.updatedAt - a.updatedAt);
                    this.activeConversationId = sorted[0].id;
                    this.messages = sorted[0].messages;
                }
            });
            log(`Loaded ${saved.length} conversations, active=${activeId}`);
        } catch (e) {
            logError('Failed to load conversations:', e);
            runInAction(() => { this.conversationsLoaded = true; });
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

        runInAction(() => {
            this.conversations.unshift(conv);
            this.activeConversationId = id;
            this.messages = [];
            this._lcMessages = [];
            this.status = 'idle';
            this.error = null;
            this.currentToolName = null;
        });

        (globalThis as any).__octograb_pending_blueprint = undefined;
        this.persistConversations();
        log(`Created new conversation: ${id}`);
    }

    switchConversation(id: string) {
        if (this.isRunning || id === this.activeConversationId) return;

        // Save current
        this.persistActiveConversation();

        const conv = this.conversations.find(c => c.id === id);
        if (!conv) return;

        runInAction(() => {
            this.activeConversationId = id;
            this.messages = [...conv.messages];
            this._lcMessages = []; // LangChain history can't be restored; new messages will work
            this.status = 'idle';
            this.error = null;
            this.currentToolName = null;
        });

        (globalThis as any).__octograb_pending_blueprint = undefined;
        browser.storage.local.set({ [STORAGE_KEY_ACTIVE_CONV]: id }).catch(() => { });
        log(`Switched to conversation: ${id}`);
    }

    deleteConversation(id: string) {
        if (this.isRunning) return;

        runInAction(() => {
            this.conversations = this.conversations.filter(c => c.id !== id);
            if (this.activeConversationId === id) {
                if (this.conversations.length > 0) {
                    const next = this.conversations[0];
                    this.activeConversationId = next.id;
                    this.messages = [...next.messages];
                } else {
                    this.activeConversationId = null;
                    this.messages = [];
                }
                this._lcMessages = [];
            }
        });

        this.persistConversations();
        log(`Deleted conversation: ${id}`);
    }

    renameConversation(id: string, title: string) {
        const conv = this.conversations.find(c => c.id === id);
        if (!conv) return;
        runInAction(() => { conv.title = title; });
        this.persistConversations();
    }

    get activeConversation(): Conversation | null {
        return this.conversations.find(c => c.id === this.activeConversationId) || null;
    }

    private persistActiveConversation() {
        if (!this.activeConversationId) return;
        const conv = this.conversations.find(c => c.id === this.activeConversationId);
        if (conv) {
            runInAction(() => {
                conv.messages = [...this.messages];
                conv.updatedAt = Date.now();
                // Auto-title from first user message
                if (conv.title === 'New Chat' && this.messages.length > 0) {
                    const firstUser = this.messages.find(m => m.role === 'user');
                    if (firstUser) {
                        conv.title = firstUser.content.length > 40
                            ? firstUser.content.substring(0, 40) + '…'
                            : firstUser.content;
                    }
                }
            });
        }
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
        runInAction(() => {
            this.messages.push(msg);
        });
        // Return the MobX observable proxy, not the raw object
        return this.messages[this.messages.length - 1];
    }

    private async runAgent() {
        this._abortController = new AbortController();
        runInAction(() => {
            this.status = 'thinking';
            this.error = null;
            this.currentToolName = null;
        });

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
                                runInAction(() => {
                                    this.status = 'streaming';
                                });
                            } else {
                                runInAction(() => {
                                    streamingMsg!.content += event.token;
                                });
                            }
                            break;
                        }

                        case 'stream_end': {
                            // Stream finished — finalize the message
                            streamingMsg = null;
                            runInAction(() => {
                                this.status = 'thinking';
                            });
                            break;
                        }

                        case 'tool_start':
                            runInAction(() => {
                                this.status = 'calling_tool';
                                this.currentToolName = event.toolName;
                            });
                            toolMessages.push(this.addMessage({
                                role: 'tool',
                                content: `Calling **${this.formatToolName(event.toolName)}**...`,
                                toolResult: { name: event.toolName, result: '' },
                            }));
                            break;

                        case 'tool_end': {
                            const toolMsg = toolMessages[toolMessages.length - 1];
                            if (toolMsg) {
                                runInAction(() => {
                                    toolMsg.content = `**${this.formatToolName(event.toolName)}** completed`;
                                    toolMsg.toolResult = { name: event.toolName, result: event.result };
                                });
                            }

                            try {
                                const parsed = JSON.parse(event.result);
                                // Show blueprint preview card when create_blueprint returns
                                if (parsed?.blueprintId && parsed?.validation) {
                                    runInAction(() => {
                                        toolMsg.blueprintPreview = {
                                            name: parsed.name,
                                            description: '',
                                            blockCount: parsed.blockCount,
                                            valid: parsed.validation?.valid ?? true,
                                            errors: parsed.validation?.errors ?? [],
                                            warnings: parsed.validation?.warnings ?? [],
                                        };
                                    });
                                }
                            } catch { /* not JSON, ignore */ }

                            runInAction(() => {
                                this.status = 'thinking';
                                this.currentToolName = null;
                            });
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
                            runInAction(() => {
                                this.error = event.message;
                            });
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
            const savedSignal = (globalThis as any).__octograb_blueprint_saved;
            if (savedSignal) {
                log('Blueprint saved signal detected:', savedSignal);
                (globalThis as any).__octograb_blueprint_saved = undefined;
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
            runInAction(() => {
                this.error = e.message;
            });
            this.addMessage({
                role: 'assistant',
                content: `Error: ${e.message}. Please check your API key and try again.`,
            });
        } finally {
            runInAction(() => {
                this.status = 'idle';
                this.currentToolName = null;
            });
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
        const blueprint = (globalThis as any).__octograb_pending_blueprint as Blueprint | undefined;
        if (!blueprint) return null;
        (globalThis as any).__octograb_pending_blueprint = undefined;
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
