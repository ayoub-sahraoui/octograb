import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Bot, Send, Sparkles, Wand2 } from "lucide-react";

const conversation = [
    {
        id: 1,
        role: "assistant",
        message: "👋 Hey there! I'm OctoGrab AI — your scraping co-pilot. Tell me what data you need and I'll draft a blueprint for you.",
        time: "12:00 PM",
    },
    {
        id: 2,
        role: "user",
        message: "I want to scrape product titles, prices, and image URLs from an e-commerce category page.",
        time: "12:01 PM",
    },
    {
        id: 3,
        role: "assistant",
        message: "Great choice! Here's what I'd build:\n\n1. **Navigate** → open the category URL\n2. **Loop** → iterate over each product card\n3. **Extract** → grab title, price, and image from each card\n4. **Store** → save to your local database\n\nWant me to generate this blueprint now?",
        time: "12:01 PM",
    },
    {
        id: 4,
        role: "user",
        message: "Yes, generate it!",
        time: "12:02 PM",
    },
    {
        id: 5,
        role: "assistant",
        message: "I've drafted a 4-block blueprint called **\"Product Catalog Scraper\"**. You can review and fine-tune it in the builder.",
        time: "12:02 PM",
    },
];

const suggestions = [
    { icon: Wand2, text: "Create a blueprint for product listings" },
    { icon: Wand2, text: "Extract article titles and dates" },
    { icon: Wand2, text: "Scrape job postings from search results" },
];

export default function AiChat() {
    return (
        <div className="h-full flex-1 min-h-0 overflow-hidden flex flex-col gap-2">
            {/* Suggestion chips */}
            <div className="relative shrink-0">
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                    {suggestions.map((s) => (
                        <button
                            key={s.text}
                            disabled
                            className="flex items-center gap-2 shrink-0 rounded-full border border-gray-200 bg-white px-3.5 py-2 text-xs text-gray-600 shadow-sm hover:shadow transition-shadow"
                        >
                            <s.icon className="h-3.5 w-3.5" />
                            {s.text}
                        </button>
                    ))}
                </div>
                {/* Fade indicators */}
                <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-gray-200 to-transparent pointer-events-none" />
                <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-gray-200 to-transparent pointer-events-none" />
            </div>

            {/* Conversation area */}
            <div className="flex-1 min-h-0 overflow-y-auto rounded-lg border bg-white">
                <div className="flex flex-col gap-1 p-4">
                    {conversation.map((item, idx) => {
                        const isAssistant = item.role === "assistant";
                        const showAvatar = idx === 0 || conversation[idx - 1].role !== item.role;

                        return (
                            <div key={item.id} className={`flex items-end gap-2 ${isAssistant ? "" : "flex-row-reverse"} ${showAvatar ? "mt-4 first:mt-0" : "mt-1"}`}>
                                {/* Avatar column */}
                                <div className="w-8 shrink-0">
                                    {showAvatar && (
                                        <Avatar className="h-8 w-8 border shadow-sm">
                                            <AvatarFallback className={isAssistant ? "bg-emerald-200 text-emerald-700 text-xs" : "bg-gray-100 text-gray-600 text-xs"}>
                                                {isAssistant ? <Bot className="h-3.5 w-3.5" /> : "U"}
                                            </AvatarFallback>
                                        </Avatar>
                                    )}
                                </div>
                                {/* Bubble */}
                                <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed shadow-sm ${isAssistant
                                    ? "bg-gray-50 border border-gray-100 text-gray-800 rounded-bl-md"
                                    : "bg-primary text-primary-foreground rounded-br-md"
                                    }`}>
                                    <p className="whitespace-pre-line">{item.message}</p>
                                    <p className={`mt-1.5 text-[10px] ${isAssistant ? "text-gray-400" : "text-primary-foreground/60"}`}>{item.time}</p>
                                </div>
                            </div>
                        );
                    })}

                    {/* Typing indicator */}
                    <div className="flex items-end gap-2 mt-4">
                        <div className="w-8 shrink-0">
                            <Avatar className="h-8 w-8 border shadow-sm">
                                <AvatarFallback className="bg-emerald-200 text-emerald-700 text-xs">
                                    <Bot className="h-3.5 w-3.5" />
                                </AvatarFallback>
                            </Avatar>
                        </div>
                        <div className="rounded-2xl rounded-bl-md bg-gray-50 border border-gray-100 px-4 py-3 shadow-sm">
                            <div className="flex gap-1">
                                <span className="h-2 w-2 rounded-full bg-gray-300 animate-bounce [animation-delay:0ms]" />
                                <span className="h-2 w-2 rounded-full bg-gray-300 animate-bounce [animation-delay:150ms]" />
                                <span className="h-2 w-2 rounded-full bg-gray-300 animate-bounce [animation-delay:300ms]" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Input area */}
            <div className="rounded-lg border bg-white p-2.5 shrink-0">
                <div className="flex items-center gap-2">
                    <div className="flex-1 flex items-center rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
                        <Sparkles className="h-4 w-4 text-gray-300 shrink-0 mr-2" />
                        <span className="text-sm text-gray-400">Describe what you want to automate...</span>
                    </div>
                    <Button size="icon" className="h-10 w-10 shrink-0" disabled>
                        <Send className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
