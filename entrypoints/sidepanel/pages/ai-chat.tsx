import { useRef, useEffect, useState, useCallback, useMemo } from "react";
import { observer } from "mobx-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
    Bot, Send, Sparkles, Wand2, Square, Trash2,
    Loader2, Search, Camera, CheckCircle2, AlertCircle,
    Save, Wrench, Settings, Eye, Key, ArrowLeft, ChevronDown,
    Plus, MessageSquare, X, Pencil, Table2,
    Clock, Hash,
} from "lucide-react";
import { useAiAgentStore, ChatMessage } from "@/entrypoints/stores/ai-agent-store";
import { useNavigate } from "react-router-dom";
import { CenteredState } from "../components/centered-state";

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
    get_element_attribute: Eye,
    count_elements: Hash,
    test_extraction: Table2,
    create_blueprint: Wrench,
    validate_blueprint: CheckCircle2,
    save_blueprint: Save,
};

// ─── Markdown renderer ──────────────────────────────────────────────────────

function parseInline(text: string, kp: string): React.ReactNode[] {
    const parts: React.ReactNode[] = [];
    // bold **x**, italic *x*, inline code `x`, links [text](url)
    const re = /(\*\*(.+?)\*\*|\*(.+?)\*|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\))/g;
    let last = 0, m: RegExpExecArray | null, idx = 0;
    while ((m = re.exec(text)) !== null) {
        if (m.index > last) parts.push(text.slice(last, m.index));
        if (m[2] !== undefined) parts.push(<strong key={`${kp}-b${idx++}`}>{m[2]}</strong>);
        else if (m[3] !== undefined) parts.push(<em key={`${kp}-i${idx++}`}>{m[3]}</em>);
        else if (m[4] !== undefined) parts.push(<code key={`${kp}-c${idx++}`} className="bg-gray-100 px-1 py-0.5 rounded text-[11px] font-mono text-emerald-700">{m[4]}</code>);
        else if (m[5] !== undefined && m[6] !== undefined) parts.push(<a key={`${kp}-a${idx++}`} href={m[6]} target="_blank" rel="noopener noreferrer" className="text-emerald-600 underline">{m[5]}</a>);
        last = re.lastIndex;
    }
    if (last < text.length) parts.push(text.slice(last));
    return parts;
}

function renderMarkdown(text: string) {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let i = 0;

    while (i < lines.length) {
        const line = lines[i];
        const trimmed = line.trim();

        // Empty line → spacer
        if (trimmed === '') { elements.push(<div key={i} className="h-1.5" />); i++; continue; }

        // Horizontal rule
        if (/^[-*_]{3,}\s*$/.test(trimmed)) { elements.push(<hr key={i} className="border-gray-200 my-1.5" />); i++; continue; }

        // Headers
        if (trimmed.startsWith('### ')) { elements.push(<h4 key={i} className="font-bold text-[13px] mt-2 mb-0.5">{parseInline(trimmed.slice(4), `h${i}`)}</h4>); i++; continue; }
        if (trimmed.startsWith('## ')) { elements.push(<h3 key={i} className="font-bold text-sm mt-2 mb-0.5">{parseInline(trimmed.slice(3), `h${i}`)}</h3>); i++; continue; }
        if (trimmed.startsWith('# ')) { elements.push(<h2 key={i} className="font-bold text-[15px] mt-2 mb-0.5">{parseInline(trimmed.slice(2), `h${i}`)}</h2>); i++; continue; }

        // Code blocks ```
        if (trimmed.startsWith('```')) {
            const codeLines: string[] = [];
            i++;
            while (i < lines.length && !lines[i].trim().startsWith('```')) {
                codeLines.push(lines[i]); i++;
            }
            if (i < lines.length) i++; // skip closing ```
            elements.push(
                <pre key={`code-${i}`} className="bg-gray-900 text-gray-100 text-[11px] font-mono rounded-md px-3 py-2 my-1 overflow-x-auto whitespace-pre-wrap break-words leading-relaxed">
                    {codeLines.join('\n')}
                </pre>
            );
            continue;
        }

        // Table (starts with |)
        if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
            const tableRows: string[] = [];
            while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
                tableRows.push(lines[i].trim()); i++;
            }
            // Parse header, separator, body
            if (tableRows.length >= 2) {
                const parseRow = (row: string) => row.split('|').slice(1, -1).map(c => c.trim());
                const header = parseRow(tableRows[0]);
                const isSep = (row: string) => parseRow(row).every(c => /^[-:]+$/.test(c));
                const bodyStart = isSep(tableRows[1]) ? 2 : 1;
                const bodyRows = tableRows.slice(bodyStart).filter(r => !isSep(r));
                elements.push(
                    <div key={`tbl-${i}`} className="my-1.5 overflow-x-auto rounded-md border border-gray-200">
                        <table className="w-full text-[11px]">
                            <thead>
                                <tr className="bg-gray-50">
                                    {header.map((h, ci) => <th key={ci} className="px-2 py-1.5 text-left font-semibold text-gray-700 border-b border-gray-200 whitespace-nowrap">{parseInline(h, `th${i}-${ci}`)}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {bodyRows.map((row, ri) => {
                                    const cells = parseRow(row);
                                    return (
                                        <tr key={ri} className={ri % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                                            {cells.map((c, ci) => <td key={ci} className="px-2 py-1.5 text-gray-600 border-b border-gray-100 max-w-[150px] truncate">{parseInline(c, `td${i}-${ri}-${ci}`)}</td>)}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                );
            }
            continue;
        }

        // Unordered list (- or *)
        if (/^[-*]\s/.test(trimmed)) {
            const items: string[] = [];
            while (i < lines.length && /^\s*[-*]\s/.test(lines[i])) {
                items.push(lines[i].replace(/^\s*[-*]\s/, '')); i++;
            }
            elements.push(
                <ul key={`ul-${i}`} className="list-disc list-inside space-y-0.5 my-0.5 text-[13px]">
                    {items.map((item, j) => <li key={j} className="break-words">{parseInline(item, `ul${i}-${j}`)}</li>)}
                </ul>
            );
            continue;
        }

        // Ordered list
        if (/^\d+\.\s/.test(trimmed)) {
            const items: string[] = [];
            while (i < lines.length && /^\s*\d+\.\s/.test(lines[i])) {
                items.push(lines[i].replace(/^\s*\d+\.\s/, '')); i++;
            }
            elements.push(
                <ol key={`ol-${i}`} className="list-decimal list-inside space-y-0.5 my-0.5 text-[13px]">
                    {items.map((item, j) => <li key={j} className="break-words">{parseInline(item, `ol${i}-${j}`)}</li>)}
                </ol>
            );
            continue;
        }

        // Regular paragraph
        elements.push(<span key={i} className="break-words">{parseInline(line, `p${i}`)}</span>);
        if (i < lines.length - 1 && lines[i + 1]?.trim() !== '') {
            elements.push(<br key={`br-${i}`} />);
        }
        i++;
    }

    return <>{elements}</>;
}

// ─── JSON Data Table ────────────────────────────────────────────────────────
// Renders extracted sample data as a rich table when tool results contain JSON arrays

function JsonDataTable({ data }: { data: Record<string, any>[] }) {
    if (!data.length) return null;
    const keys = Object.keys(data[0]);
    return (
        <div className="my-1.5 overflow-x-auto rounded-md border border-emerald-200 bg-white">
            <table className="w-full text-[11px]">
                <thead>
                    <tr className="bg-emerald-50/70">
                        {keys.map((k) => (
                            <th key={k} className="px-2 py-1.5 text-left font-semibold text-emerald-800 border-b border-emerald-200 whitespace-nowrap">
                                {k}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.map((row, ri) => (
                        <tr key={ri} className={ri % 2 === 0 ? 'bg-white' : 'bg-emerald-50/20'}>
                            {keys.map((k) => (
                                <td key={k} className="px-2 py-1.5 text-gray-600 border-b border-gray-100 max-w-[160px] truncate" title={String(row[k] ?? '')}>
                                    {String(row[k] ?? '')}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

// ─── Detect clickable options from assistant messages ────────────────────────

function extractOptions(content: string): string[] | null {
    // Detect numbered lists like "1. Option A\n2. Option B" or bullet lists used as choices
    const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
    const numberedOpts: string[] = [];
    for (const line of lines) {
        const m = line.match(/^\d+[\.\)]\s+\*{0,2}(.+?)\*{0,2}\s*[—–-]?\s*.*$/);
        if (m) numberedOpts.push(m[1].replace(/\*+/g, '').trim());
    }
    // Only show as clickable if there are 2-6 options and the message seems like a question
    const hasQuestion = /\?|which|what|choose|pick|select|want|prefer|like/i.test(content);
    if (numberedOpts.length >= 2 && numberedOpts.length <= 6 && hasQuestion) {
        return numberedOpts;
    }
    return null;
}

// ─── Tool call card (collapsible) ─────────────────────────────────────────────

const ToolCallCard = observer(({ message }: { message: ChatMessage }) => {
    const [expanded, setExpanded] = useState(false);
    const [showTable, setShowTable] = useState(false);
    const toolName = message.toolResult?.name || '';
    const Icon = TOOL_ICONS[toolName] || Wrench;
    // Fixed: check for "completed" keyword instead of trailing "..." which breaks with markdown
    const isDone = message.content.includes('completed') || (!message.content.includes('Calling') && !message.content.endsWith('...'));
    const resultText = message.toolResult?.result || '';

    // Try to parse sample data from tool results
    const sampleData = useMemo<Record<string, any>[] | null>(() => {
        if (!resultText || !isDone) return null;
        try {
            const parsed = JSON.parse(resultText);
            if (parsed?.sample && Array.isArray(parsed.sample) && parsed.sample.length > 0) {
                return parsed.sample;
            }
        } catch { /* not JSON */ }
        return null;
    }, [resultText, isDone]);

    return (
        <div className="ml-9 mt-1">
            <button
                onClick={() => isDone && setExpanded(!expanded)}
                className={`flex items-center gap-2 w-full text-left px-3 py-1.5 rounded-lg text-xs transition-colors ${isDone ? 'hover:bg-gray-100 cursor-pointer' : 'cursor-default'} ${expanded ? 'bg-gray-50 border border-gray-200' : 'bg-transparent'}`}
            >
                {isDone ? (
                    <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                ) : (
                    <Loader2 className="h-3 w-3 text-emerald-500 animate-spin shrink-0" />
                )}
                <Icon className="h-3 w-3 text-gray-400 shrink-0" />
                <span className="text-gray-500 flex-1 truncate text-[11px]">
                    {isDone
                        ? <>{toolName.replace(/_/g, ' ')} <span className="text-emerald-600">done</span></>
                        : <>{toolName.replace(/_/g, ' ')}...</>
                    }
                </span>
                {isDone && (resultText || sampleData) && (
                    <ChevronDown className={`h-3 w-3 text-gray-400 shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                )}
            </button>

            {expanded && (
                <div className="ml-3 mt-1 mb-1 border-l-2 border-gray-200 pl-3">
                    {sampleData && (
                        <div className="mb-1">
                            <button
                                onClick={() => setShowTable(!showTable)}
                                className="flex items-center gap-1 text-[10px] text-emerald-600 hover:text-emerald-700 mb-1"
                            >
                                <Table2 className="h-3 w-3" />
                                {showTable ? 'Hide' : 'Show'} sample data ({sampleData.length} rows)
                            </button>
                            {showTable && <JsonDataTable data={sampleData} />}
                        </div>
                    )}
                    {resultText && (
                        <pre className="text-[10px] text-gray-500 font-mono whitespace-pre-wrap break-all max-h-[120px] overflow-y-auto leading-relaxed">
                            {resultText.length > 800 ? resultText.substring(0, 800) + '\u2026' : resultText}
                        </pre>
                    )}
                </div>
            )}

            {message.blueprintPreview && (
                <BlueprintPreviewCard preview={message.blueprintPreview} />
            )}
        </div>
    );
});

// ─── Blueprint preview card ──────────────────────────────────────────────────

function BlueprintPreviewCard({ preview }: { preview: NonNullable<ChatMessage['blueprintPreview']> }) {
    return (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3 mt-1.5 ml-3">
            <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{preview.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{preview.blockCount} blocks</p>
                </div>
                {preview.valid ? (
                    <span className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full shrink-0">
                        <CheckCircle2 className="h-3 w-3" /> Valid
                    </span>
                ) : (
                    <span className="flex items-center gap-1 text-xs text-red-500 bg-red-50 px-2 py-0.5 rounded-full shrink-0">
                        <AlertCircle className="h-3 w-3" /> {preview.errors.length} error{preview.errors.length !== 1 ? 's' : ''}
                    </span>
                )}
            </div>
            {preview.errors.length > 0 && (
                <div className="mt-2 space-y-0.5">
                    {preview.errors.map((err, i) => (
                        <p key={i} className="text-[11px] text-red-500 break-words">{'\u2022'} {err}</p>
                    ))}
                </div>
            )}
            {preview.warnings.length > 0 && (
                <div className="mt-2 space-y-0.5">
                    {preview.warnings.map((w, i) => (
                        <p key={i} className="text-[11px] text-yellow-600 break-words">{'\u26A0'} {w}</p>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Clickable Options ───────────────────────────────────────────────────────

function OptionButtons({ options, onSelect, disabled }: {
    options: string[];
    onSelect: (text: string) => void;
    disabled: boolean;
}) {
    return (
        <div className="flex flex-wrap gap-1.5 mt-2">
            {options.map((opt, i) => (
                <button
                    key={i}
                    onClick={() => onSelect(opt)}
                    disabled={disabled}
                    className="px-3 py-1.5 rounded-full text-[12px] font-medium border border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                >
                    {opt}
                </button>
            ))}
        </div>
    );
}

// ─── Message bubble ──────────────────────────────────────────────────────────

const MessageBubble = observer(({ message, showAvatar, onSave, onSendOption, isStreaming, isLast }: {
    message: ChatMessage;
    showAvatar: boolean;
    onSave: () => void;
    onSendOption: (text: string) => void;
    isStreaming?: boolean;
    isLast?: boolean;
}) => {
    if (message.role === 'tool') {
        return <ToolCallCard message={message} />;
    }

    const isAssistant = message.role === 'assistant';

    // Detect clickable options in the last assistant message
    const options = isAssistant && isLast && !isStreaming ? extractOptions(message.content) : null;

    return (
        <div className={`flex items-start gap-2 ${isAssistant ? "" : "flex-row-reverse"} ${showAvatar ? "mt-3 first:mt-0" : "mt-0.5"}`}>
            <div className="w-7 shrink-0 pt-0.5">
                {showAvatar && (
                    <Avatar className="h-7 w-7 border shadow-sm">
                        <AvatarFallback className={isAssistant ? "bg-emerald-100 text-emerald-700 text-xs" : "bg-gray-100 text-gray-600 text-xs"}>
                            {isAssistant ? <Bot className="h-3.5 w-3.5" /> : "U"}
                        </AvatarFallback>
                    </Avatar>
                )}
            </div>
            <div className={`min-w-0 max-w-[88%] rounded-2xl px-3.5 py-2 text-[13px] leading-relaxed ${isAssistant
                ? "bg-gray-50 border border-gray-100 text-gray-800 rounded-tl-md"
                : "bg-emerald-600 text-white rounded-tr-md shadow-sm"
                }`}>
                <div className="overflow-hidden break-words">
                    {renderMarkdown(message.content)}
                    {isStreaming && <span className="inline-block w-1.5 h-4 bg-emerald-500 ml-0.5 animate-pulse rounded-sm align-text-bottom" />}
                </div>
                {options && (
                    <OptionButtons options={options} onSelect={onSendOption} disabled={false} />
                )}
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
});

// ─── Thinking indicator ──────────────────────────────────────────────────────

const TOOL_LABELS: Record<string, string> = {
    analyze_page: 'Analyzing page structure',
    get_page_url: 'Getting page URL',
    query_selector: 'Testing selector',
    get_element_text: 'Reading text',
    get_element_attribute: 'Reading attribute',
    count_elements: 'Counting matches',
    test_extraction: 'Testing extraction',
    create_blueprint: 'Creating blueprint',
    validate_blueprint: 'Validating',
    save_blueprint: 'Saving blueprint',
};

function ThinkingIndicator({ toolName, status }: { toolName: string | null; status: string }) {
    if (status === 'streaming') return null;

    return (
        <div className="flex items-center gap-2 mt-2 ml-9">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-50 border border-gray-100">
                {toolName ? (
                    <>
                        <Loader2 className="h-3 w-3 animate-spin text-emerald-500" />
                        <span className="text-[11px] text-gray-500">{TOOL_LABELS[toolName] || toolName}...</span>
                    </>
                ) : (
                    <>
                        <span className="flex gap-0.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-bounce [animation-delay:0ms]" />
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-bounce [animation-delay:150ms]" />
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-bounce [animation-delay:300ms]" />
                        </span>
                        <span className="text-[11px] text-gray-400">Thinking...</span>
                    </>
                )}
            </div>
        </div>
    );
}

// ─── Empty state ─────────────────────────────────────────────────────────────

function EmptyState({ hasApiKey, onNavigateSettings }: { hasApiKey: boolean; onNavigateSettings: () => void }) {
    if (!hasApiKey) {
        return (
            <CenteredState
                icon={<Key className="h-6 w-6" />}
                title="API key required"
                description="Add your API key in Settings to start using the AI assistant."
                tone="warning"
                className="flex-1"
                action={(
                    <Button size="sm" variant="outline" className="text-xs" onClick={onNavigateSettings}>
                        <Settings className="mr-1.5 h-3.5 w-3.5" /> Open Settings
                    </Button>
                )}
            />
        );
    }

    return (
        <CenteredState
            icon={<Bot className="h-6 w-6" />}
            title="OctoGrab AI"
            description="Tell me what data you want to extract and I’ll analyze the page and help build the blueprint."
            className="flex-1"
        />
    );
}

// ─── Conversation Drawer ────────────────────────────────────────────────────

function timeAgo(ts: number): string {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
}

const ConversationDrawer = observer(({ open, onClose }: { open: boolean; onClose: () => void }) => {
    const store = useAiAgentStore();
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState('');

    const handleRename = (id: string) => {
        if (editTitle.trim()) {
            store.renameConversation(id, editTitle.trim());
        }
        setEditingId(null);
    };

    const sortedConversations = [...store.conversations].sort((a, b) => b.updatedAt - a.updatedAt);

    return (
        <>
            {/* Backdrop */}
            {open && <div className="absolute inset-0 bg-black/20 z-40" onClick={onClose} />}

            {/* Drawer */}
            <div className={`absolute inset-y-0 left-0 w-[260px] bg-white border-r border-gray-200 shadow-lg z-50 flex flex-col transition-transform duration-200 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-100">
                    <span className="text-sm font-semibold text-gray-700">Conversations</span>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => { store.newConversation(); onClose(); }}
                            className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500 hover:text-emerald-600 transition-colors"
                            title="New chat"
                        >
                            <Plus className="h-4 w-4" />
                        </button>
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto py-1">
                    {sortedConversations.length === 0 ? (
                        <CenteredState
                            icon={<MessageSquare className="h-5 w-5" />}
                            title="No conversations yet"
                            description="Start a new AI chat to plan or refine a blueprint."
                            compact
                            className="py-10"
                        />
                    ) : (
                        sortedConversations.map(conv => {
                            const isActive = conv.id === store.activeConversationId;
                            const msgCount = conv.messages.filter(m => m.role !== 'tool').length;
                            return (
                                <div
                                    key={conv.id}
                                    className={`group flex items-center gap-2 mx-1.5 my-0.5 px-2.5 py-2 rounded-lg cursor-pointer transition-colors ${isActive
                                        ? 'bg-emerald-50 border border-emerald-200'
                                        : 'hover:bg-gray-50 border border-transparent'
                                        }`}
                                    onClick={() => { store.switchConversation(conv.id); onClose(); }}
                                >
                                    <MessageSquare className={`h-3.5 w-3.5 shrink-0 ${isActive ? 'text-emerald-600' : 'text-gray-400'}`} />
                                    <div className="flex-1 min-w-0">
                                        {editingId === conv.id ? (
                                            <input
                                                autoFocus
                                                value={editTitle}
                                                onChange={e => setEditTitle(e.target.value)}
                                                onBlur={() => handleRename(conv.id)}
                                                onKeyDown={e => { if (e.key === 'Enter') handleRename(conv.id); if (e.key === 'Escape') setEditingId(null); }}
                                                onClick={e => e.stopPropagation()}
                                                className="w-full text-xs bg-white border border-emerald-300 rounded px-1.5 py-0.5 outline-none focus:ring-1 focus:ring-emerald-400"
                                            />
                                        ) : (
                                            <>
                                                <p className={`text-xs truncate ${isActive ? 'text-emerald-800 font-medium' : 'text-gray-700'}`}>
                                                    {conv.title}
                                                </p>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                                                        <Clock className="h-2.5 w-2.5" /> {timeAgo(conv.updatedAt)}
                                                    </span>
                                                    {msgCount > 0 && (
                                                        <span className="text-[10px] text-gray-400">
                                                            {msgCount} msg{msgCount !== 1 ? 's' : ''}
                                                        </span>
                                                    )}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={e => { e.stopPropagation(); setEditingId(conv.id); setEditTitle(conv.title); }}
                                            className="p-1 rounded hover:bg-gray-200 text-gray-400"
                                            title="Rename"
                                        >
                                            <Pencil className="h-3 w-3" />
                                        </button>
                                        <button
                                            onClick={e => { e.stopPropagation(); store.deleteConversation(conv.id); }}
                                            className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"
                                            title="Delete"
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </>
    );
});

// ─── Main Component ──────────────────────────────────────────────────────────

const AiChat = observer(() => {
    const store = useAiAgentStore();
    const navigate = useNavigate();
    const [input, setInput] = useState('');
    const [drawerOpen, setDrawerOpen] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    // Auto-scroll on new messages and while streaming
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [store.messages.length, store.status, store.messages[store.messages.length - 1]?.content?.length]);

    // Auto-resize textarea
    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.style.height = 'auto';
            inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 100) + 'px';
        }
    }, [input]);

    const handleSend = useCallback((text?: string) => {
        const msg = text || input.trim();
        if (!msg || store.isRunning) return;
        store.sendMessage(msg);
        setInput('');
        if (inputRef.current) {
            inputRef.current.style.height = 'auto';
        }
    }, [input, store]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleSuggestion = (text: string) => {
        if (store.isRunning) return;
        handleSend(text);
    };

    const handleSaveBlueprint = () => {
        const blueprint = store.savePendingBlueprint();
        if (blueprint) {
            navigate('/blueprint-builder', { state: { blueprint: blueprint.toJSON() } });
        }
    };

    const hasMessages = store.messages.length > 0;
    const lastMsg = store.messages[store.messages.length - 1];
    const isStreamingLastMsg = store.status === 'streaming' && lastMsg?.role === 'assistant';

    return (
        <div className="h-full flex-1 min-h-0 overflow-hidden flex flex-col gap-2 relative">
            {/* Conversation Drawer */}
            <ConversationDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

            {/* Header */}
            <div className="flex items-center gap-1.5 shrink-0">
                <Button size="icon" variant="ghost" onClick={() => navigate('/')} title="Back to Home" className="h-8 w-8 shrink-0">
                    <ArrowLeft className="w-4 h-4" />
                </Button>
                <h1 className="text-base font-semibold flex-1 truncate">AI Assistant</h1>
                {/* Conversation history button */}
                <button
                    onClick={() => setDrawerOpen(true)}
                    className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors relative"
                    title="Conversation history"
                >
                    <MessageSquare className="h-4 w-4" />
                    {store.conversations.length > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-emerald-500 text-white text-[8px] flex items-center justify-center font-bold">
                            {store.conversations.length}
                        </span>
                    )}
                </button>
                {/* New chat */}
                <button
                    onClick={() => store.newConversation()}
                    disabled={store.isRunning}
                    className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500 hover:text-emerald-600 transition-colors disabled:opacity-40"
                    title="New chat"
                >
                    <Plus className="h-4 w-4" />
                </button>
                {/* Model badge */}
                <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-gray-50 border border-gray-200 text-[10px] text-gray-500 shrink-0" title={`${store.providerConfig.label} \u2014 ${store.model}`}>
                    <Sparkles className="h-3 w-3 text-emerald-500" />
                    <span className="max-w-[60px] truncate">{store.model.split('-').slice(0, 2).join('-')}</span>
                </div>
            </div>

            {/* Suggestion chips */}
            {!hasMessages && store.hasApiKey && (
                <div className="relative shrink-0">
                    <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                        {suggestions.map((s) => (
                            <button
                                key={s.text}
                                onClick={() => handleSuggestion(s.text)}
                                disabled={store.isRunning}
                                className="flex items-center gap-1.5 shrink-0 rounded-full border border-gray-200 bg-white px-2.5 py-1.5 text-[11px] text-gray-600 shadow-sm hover:shadow hover:border-emerald-300 transition-all disabled:opacity-50"
                            >
                                <s.icon className="h-3 w-3 text-emerald-500" />
                                <span className="whitespace-nowrap">{s.text}</span>
                            </button>
                        ))}
                    </div>
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
                    <div className="flex flex-col p-3">
                        {store.messages.map((msg, idx) => {
                            const prev = idx > 0 ? store.messages[idx - 1] : null;
                            const showAvatar = !prev || prev.role !== msg.role || prev.role === 'tool';
                            const isThisStreaming = isStreamingLastMsg && idx === store.messages.length - 1;
                            const isLast = idx === store.messages.length - 1 && !store.isRunning;

                            return (
                                <MessageBubble
                                    key={msg.id}
                                    message={msg}
                                    showAvatar={showAvatar}
                                    onSave={handleSaveBlueprint}
                                    onSendOption={handleSend}
                                    isStreaming={isThisStreaming}
                                    isLast={isLast}
                                />
                            );
                        })}

                        {/* Thinking / tool calling indicator (not shown during streaming) */}
                        {store.isRunning && store.status !== 'streaming' && (
                            <ThinkingIndicator toolName={store.currentToolName} status={store.status} />
                        )}
                    </div>
                )}
            </div>

            {/* Input area */}
            <div className="rounded-lg border bg-white p-2 shrink-0">
                {/* Action bar */}
                {hasMessages && (
                    <div className="flex items-center justify-between mb-1.5 px-1">
                        <div className="flex items-center gap-1">
                            {store.isRunning && (
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 text-[11px] text-red-500 hover:text-red-600 hover:bg-red-50 px-2"
                                    onClick={() => store.stop()}
                                >
                                    <Square className="h-2.5 w-2.5 mr-1" /> Stop
                                </Button>
                            )}
                        </div>
                        <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 text-[11px] text-gray-400 hover:text-gray-600 px-2"
                            onClick={() => store.clearChat()}
                            disabled={store.isRunning}
                        >
                            <Trash2 className="h-2.5 w-2.5 mr-1" /> Clear
                        </Button>
                    </div>
                )}

                <div className="flex items-end gap-2">
                    <div className="flex-1 flex items-end rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 focus-within:border-emerald-300 focus-within:ring-1 focus-within:ring-emerald-200 transition-all">
                        <textarea
                            ref={inputRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={store.hasApiKey
                                ? "Describe what to scrape..."
                                : "Set API key in Settings first..."
                            }
                            disabled={!store.hasApiKey || store.isRunning}
                            className="flex-1 bg-transparent text-sm text-gray-700 placeholder:text-gray-400 outline-none resize-none min-h-[20px] max-h-[100px] leading-5"
                            rows={1}
                        />
                    </div>
                    <Button
                        size="icon"
                        className="h-9 w-9 shrink-0 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300"
                        onClick={() => handleSend()}
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
