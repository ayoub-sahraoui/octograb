import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell, CheckCheck, CircleAlert, Sparkles } from "lucide-react";

const notifications = [
    {
        id: 1,
        title: "Execution completed",
        description: "The product catalog blueprint finished successfully and exported 128 rows.",
        time: "2 min ago",
        type: "success",
    },
    {
        id: 2,
        title: "AI assistant preview available",
        description: "You can now open the AI chat tab and preview the upcoming conversation workflow.",
        time: "10 min ago",
        type: "info",
    },
    {
        id: 3,
        title: "Checkpoint ready",
        description: "A paused execution can be resumed from the latest saved checkpoint.",
        time: "Today",
        type: "warning",
    },
];

export default function Notifications() {
    return (
        <div className="h-full flex-1 min-h-0 overflow-hidden rounded-lg border border-gray-300 bg-gray-100 p-4">
            <div className="flex h-full min-h-0 flex-col gap-4">
                <div className="flex items-start justify-between gap-3 rounded-lg border bg-white p-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <Bell className="h-5 w-5 text-amber-500" />
                            <h1 className="text-lg font-semibold">Notifications</h1>
                        </div>
                        <p className="text-sm text-gray-500">
                            Track recent updates, execution activity, and upcoming product messages.
                        </p>
                    </div>
                    <Button variant="outline" size="sm" className="gap-2" disabled>
                        <CheckCheck className="h-4 w-4" />
                        Mark all as read
                    </Button>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto rounded-lg border bg-white p-4">
                    <div className="flex flex-col gap-3">
                        {notifications.map((notification) => (
                            <div key={notification.id} className="rounded-lg border border-gray-200 p-4 shadow-sm">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-start gap-3">
                                        <div className={`mt-0.5 rounded-full p-2 ${notification.type === "success" ? "bg-green-100 text-green-700" : notification.type === "warning" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}>
                                            {notification.type === "warning" ? (
                                                <CircleAlert className="h-4 w-4" />
                                            ) : (
                                                <Sparkles className="h-4 w-4" />
                                            )}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h2 className="text-sm font-semibold text-gray-900">{notification.title}</h2>
                                                <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
                                                    {notification.type}
                                                </Badge>
                                            </div>
                                            <p className="mt-1 text-sm text-gray-500">{notification.description}</p>
                                        </div>
                                    </div>
                                    <span className="shrink-0 text-xs text-gray-400">{notification.time}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
