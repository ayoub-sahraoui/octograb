import { useRef, useEffect, useState } from "react";
import { observer } from "mobx-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Bot, Send, Sparkles, Wand2, Square, Trash2,
    Loader2, Search, Camera, CheckCircle2, AlertCircle,
    Save, Wrench, Settings, Eye, Key,
} from "lucide-react";
import { useAiAgentStore, ChatMessage } from "@/entrypoints/stores/ai-agent-store";
import { useNavigate } from "react-router-dom";

const suggestions = [
    { icon: Wand2, text: "Scrape product listings from this page" },
    { icon: Search, text: "Extract all links and their text" },
    { icon: Wand2, text: "Create a pagination scraper for this site" },
];

const TOOL_ICONS: Record<string, typeof Search> = {
    analyze_page: Eye,
    get_page_screenshot: Camera,
    query_selector: Search,
    get_element_text: Eye,
    create_blueprint: Wrench,
    validate_blueprint: CheckCircle2,
    save_blueprint: Save,
};

// ─── Markdown-lite renderer ──────────────────────────────────────────────────

function renderMarkdown(text: string) {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];

        // Bold
        line = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        // Inline code
        line = line.replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded text-[12px] font-mono text-emerald-700">$1</code>');

        if (line.trim() === '') {
            elements.push(<br key={i} />);
        } else {
            elements.push(
                <span key={i} dangerouslySetInnerHTML={{ __html: line }} />
            );
            if (i < lines.length - 1) elements.push(<br key={`br-${i}`} />);
        }
    }

    return <>{elements}</>;
}

// ─── Tool status badge ───────────────────────────────────────────────────────

function ToolBadge({ message }: { message: ChatMessage }) {
    const toolName = message.toolResult?.name || '';
    const Icon = TOOL_ICONS[toolName] || Wrench;
    const isDone = !message.content.endsWith('...');

    return (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 border border-gray-100 text-xs text-gray-500">
            {isDone ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
            ) : (
                <Loader2 className="h-3.5 w-3.5 text-emerald-500 animate-spin shrink-0" />
            )}
            <Icon className="h-3.5 w-3.5 shrink-0" />
            {renderMarkdown(message.content)}
        </div>
    );
}

// ─── Blueprint preview card ──────────────────────────────────────────────────

function BlueprintPreviewCard({ message, onSave }: { message: ChatMessage; onSave: () => void }) {
    const bp = message.blueprintPreview!;
    return (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3 mt-2">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-semibold text-gray-800">{bp.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{bp.blockCount} blocks</p>
                </div>
                {bp.valid ? (
                    <span className="flex items-center gap-1 text-xs text-emerald-600">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Valid
                    </span>
                ) : (
                    <span className="flex items-center gap-1 text-xs text-red-500">
                        <AlertCircle className="h-3.5 w-3.5" /> {bp.errors.length} error{bp.errors.length !== 1 ? 's' : ''}
                    </span>
                )}
            </div>
            {bp.errors.length > 0 && (
                <div className="mt-2 space-y-1">
                    {bp.errors.map((err, i) => (
                        <p key={i} className="text-xs text-red-500">• {err}</p>
                    ))}
                </div>
            )}
            {bp.warnings.length > 0 && (
                <div className="mt-2 space-y-1">
                    {bp.warnings.map((w, i) => (
                        <p key={i} className="text-xs text-yellow-600">⚠ {w}</p>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Message bubble ──────────────────────────────────────────────────────────

function MessageBubble({ message, showAvatar, onSave }: {
    message: ChatMessage;
    showAvatar: boolean;
    onSave: () => void;
}) {
    if (message.role === 'tool') {
        return (
            <div className="flex items-start gap-2 mt-1 ml-10">
                <ToolBadge message={message} />
                {message.blueprintPreview && (
                    <BlueprintPreviewCard message={message} onSave={onSave} />
                )}
            </div>
        );
    }

    const isAssistant = message.role === 'assistant';

    return (
        <div className={`flex items-end gap-2 ${isAssistant ? "" : "flex-row-reverse"} ${showAvatar ? "mt-4 first:mt-0" : "mt-1"}`}>
            <div className="w-8 shrink-0">
                {showAvatar && (
                    <Avatar className="h-8 w-8 border shadow-sm">
                        <AvatarFallback className={isAssistant ? "bg-emerald-200 text-emerald-700 text-xs" : "bg-gray-100 text-gray-600 text-xs"}>
                            {isAssistant ? <Bot className="h-3.5 w-3.5" /> : "U"}
                        </AvatarFallback>
                    </Avatar>
                )}
            </div>
            <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed shadow-sm ${isAssistant
                ? "bg-gray-50 border border-gray-100 text-gray-800 rounded-bl-md"
                : "bg-emerald-600 text-white rounded-br-md"
                }`}>
                <div className="whitespace-pre-line">{renderMarkdown(message.content)}</div>
                {message.action?.type === 'SAVE_BLUEPRINT' && (
                    <Button
                        size="sm"
                        className="mt-2 h-7 text-xs bg-emerald-600 hover:bg-emerald-700"
                        onClick={onSave}
                    >
                        <Save className="h-3 w-3 mr-1" /> Save Blueprint
                    </Button>
                )}
            </div>
        </div>
    );
}

// ─── Thinking indicator ──────────────────────────────────────────────────────

function ThinkingIndicator({ toolName }: { toolName: string | null }) {
    return (
        <div className="flex items-end gap-2 mt-4">
            <div className="w-8 shrink-0">
                <Avatar className="h-8 w-8 border shadow-sm">
                    <AvatarFallback className="bg-emerald-200 text-emerald-700 text-xs">
                        <Bot className="h-3.5 w-3.5" />
                    </AvatarFallback>
                </Avatar>
            </div>
            <div className="rounded-2xl rounded-bl-md bg-gray-50 border border-gray-100 px-4 py-3 shadow-sm">
                {toolName ? (
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-500" />
                        <span>Using tool...</span>
                    </div>
                ) : (
                    <div className="flex gap-1">
                        <span className="h-2 w-2 rounded-full bg-emerald-300 animate-bounce [animation-delay:0ms]" />
                        <span className="h-2 w-2 rounded-full bg-emerald-300 animate-bounce [animation-delay:150ms]" />
                        <span className="h-2 w-2 rounded-full bg-emerald-300 animate-bounce [animation-delay:300ms]" />
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Empty state ─────────────────────────────────────────────────────────────

function EmptyState({ hasApiKey, onNavigateSettings }: { hasApiKey: boolean; onNavigateSettings: () => void }) {
    if (!hasApiKey) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-6">
                <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center">
                    <Key className="w-7 h-7 text-amber-400" />
                </div>
                <div>
                    <p className="text-sm font-semibold text-gray-700">API Key Required</p>
                    <p className="text-xs text-gray-500 mt-1 max-w-[220px]">
                        Add your OpenAI API key in Settings to start using the AI assistant.
                    </p>
                </div>
                <Button size="sm" variant="outline" className="text-xs" onClick={onNavigateSettings}>
                    <Settings className="h-3.5 w-3.5 mr-1.5" /> Open Settings
                </Button>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-6">
            <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center">
                <Bot className="w-7 h-7 text-emerald-500" />
            </div>
            <div>
                <p className="text-sm font-semibold text-gray-700">OctoGrab AI Assistant</p>
                <p className="text-xs text-gray-500 mt-1 max-w-[240px]">
                    Describe what you want to scrape and I'll analyze the page and create a blueprint for you.
                </p>
            </div>
        </div>
    );
}

// ─── Main Component ──────────────────────────────────────────────────────────

const AiChat = observer(() => {
    const store = useAiAgentStore();
    const navigate = useNavigate();
    const [input, setInput] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [store.messages.length, store.status]);

    // Auto-resize textarea
    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.style.height = 'auto';
            inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 100) + 'px';
        }
    }, [input]);

    const handleSend = () => {
        if (!input.trim() || store.isRunning) return;
        store.sendMessage(input.trim());
        setInput('');
        if (inputRef.current) {
            inputRef.current.style.height = 'auto';
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleSuggestion = (text: string) => {
        if (store.isRunning) return;
        store.sendSuggestion(text);
    };

    const handleSaveBlueprint = () => {
        const blueprint = store.savePendingBlueprint();
        if (blueprint) {
            // Navigate to blueprint builder with the new blueprint
            // The blueprint builder store will pick it up
            navigate('/blueprint-builder', { state: { blueprint: blueprint.toJSON() } });
        }
    };

    const hasMessages = store.messages.length > 0;

    return (
        <div className="h-full flex-1 min-h-0 overflow-hidden flex flex-col gap-2">
            {/* Suggestion chips */}
            {!hasMessages && store.hasApiKey && (
                <div className="relative shrink-0">
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                        {suggestions.map((s) => (
                            <button
                                key={s.text}
                                onClick={() => handleSuggestion(s.text)}
                                disabled={store.isRunning}
                                className="flex items-center gap-2 shrink-0 rounded-full border border-gray-200 bg-white px-3.5 py-2 text-xs text-gray-600 shadow-sm hover:shadow hover:border-emerald-300 transition-all disabled:opacity-50"
                            >
                                <s.icon className="h-3.5 w-3.5 text-emerald-500" />
                                {s.text}
                            </button>
                        ))}
                    </div>
                    <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-gray-200/80 to-transparent pointer-events-none" />
                    <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-gray-200/80 to-transparent pointer-events-none" />
                </div>
            )}

            {/* Conversation area */}
            <div className="flex-1 min-h-0 overflow-y-auto rounded-lg border bg-white" ref={scrollRef}>
                {!hasMessages ? (
                    <EmptyState
                        hasApiKey={store.hasApiKey}
                        onNavigateSettings={() => navigate('/settings')}
                    />
                ) : (
                    <div className="flex flex-col gap-1 p-4">
                        {store.messages.map((msg, idx) => {
                            const prev = idx > 0 ? store.messages[idx - 1] : null;
                            const showAvatar = !prev || prev.role !== msg.role || prev.role === 'tool';

                            return (
                                <MessageBubble
                                    key={msg.id}
                                    message={msg}
                                    showAvatar={showAvatar}
                                    onSave={handleSaveBlueprint}
                                />
                            );
                        })}

                        {/* Thinking / tool calling indicator */}
                        {store.isRunning && (
                            <ThinkingIndicator toolName={store.currentToolName} />
                        )}
                    </div>
                )}
            </div>

            {/* Input area */}
            <div className="rounded-lg border bg-white p-2.5 shrink-0">
                {/* Action bar */}
                {hasMessages && (
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1">
                            {store.isRunning && (
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 px-2"
                                    onClick={() => store.stop()}
                                >
                                    <Square className="h-3 w-3 mr-1" /> Stop
                                </Button>
                            )}
                        </div>
                        <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 text-xs text-gray-400 hover:text-gray-600 px-2"
                            onClick={() => store.clearChat()}
                            disabled={store.isRunning}
                        >
                            <Trash2 className="h-3 w-3 mr-1" /> Clear
                        </Button>
                    </div>
                )}

                <div className="flex items-end gap-2">
                    <div className="flex-1 flex items-end rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                        <Sparkles className="h-4 w-4 text-gray-300 shrink-0 mr-2 mb-0.5" />
                        <textarea
                            ref={inputRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={store.hasApiKey
                                ? "Describe what you want to scrape..."
                                : "Set API key in Settings first..."
                            }
                            disabled={!store.hasApiKey || store.isRunning}
                            className="flex-1 bg-transparent text-sm text-gray-700 placeholder:text-gray-400 outline-none resize-none min-h-[20px] max-h-[100px] leading-5"
                            rows={1}
                        />
                    </div>
                    <Button
                        size="icon"
                        className="h-10 w-10 shrink-0 bg-emerald-600 hover:bg-emerald-700"
                        onClick={handleSend}
                        disabled={!input.trim() || !store.hasApiKey || store.isRunning}
                    >
                        {store.isRunning ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Send className="h-4 w-4" />
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
});

export default AiChat;
