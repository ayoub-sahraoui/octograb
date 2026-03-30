import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { CirclePlus, Database, Settings, House, Bot, Bell, Sparkles, Menu, X, Check, CircleAlert, AlertTriangle, CheckCircle2, XCircle, Info, Lightbulb, Trash2, LibraryBig } from 'lucide-react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useBlueprintBuilderStore } from '@/entrypoints/stores/blueprint-builder-store'
import { useNotificationStore } from '@/entrypoints/stores/notification-store'
import { FREE_TIER_LIMITS } from '@/entrypoints/stores/license-store'
import { toast } from 'sonner'
import { observer } from 'mobx-react-lite'
import { AppNotification } from '@/core/database'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useConfirm } from '../components/confirm-dialog';

function formatRelativeTime(dateStr: string): string {
    const now = Date.now();
    const date = new Date(dateStr).getTime();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffSec < 60) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDay < 7) return `${diffDay}d ago`;
    return new Date(dateStr).toLocaleDateString();
}

function getNotificationIcon(n: AppNotification) {
    switch (n.type) {
        case 'success': return <CheckCircle2 className="h-4 w-4" />;
        case 'error': return <XCircle className="h-4 w-4" />;
        case 'warning': return <AlertTriangle className="h-4 w-4" />;
        case 'tip': return <Lightbulb className="h-4 w-4" />;
        default: return <Info className="h-4 w-4" />;
    }
}

function getNotificationStyles(n: AppNotification) {
    switch (n.type) {
        case 'success': return { bg: 'bg-green-100', text: 'text-green-600' };
        case 'error': return { bg: 'bg-red-100', text: 'text-red-600' };
        case 'warning': return { bg: 'bg-amber-100', text: 'text-amber-600' };
        case 'tip': return { bg: 'bg-purple-100', text: 'text-purple-600' };
        default: return { bg: 'bg-emerald-100', text: 'text-emerald-600' };
    }
}

export default observer(function Layout() {
    const blueprintBuilderStore = useBlueprintBuilderStore();
    const notificationStore = useNotificationStore();
    const navigate = useNavigate();
    const location = useLocation();
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isAiDialogOpen, setIsAiDialogOpen] = useState(false);
    const [newBlueprintName, setNewBlueprintName] = useState('');
    const [newBlueprintDescription, setNewBlueprintDescription] = useState('');
    const { alert: showAlert } = useConfirm();

    const blueprintBuilderRoute = () => {
        if (!blueprintBuilderStore.canCreateBlueprint) {
            toast.error('Free plan limit reached', {
                description: `Free plan allows ${FREE_TIER_LIMITS.maxBlueprints} blueprint. Upgrade to create more.`,
            });
            return;
        }
        setNewBlueprintName('');
        setNewBlueprintDescription('');
        setIsCreateDialogOpen(true);
    }

    const handleCreateBlueprint = async () => {
        if (!newBlueprintName.trim()) {
            await showAlert('Missing Name', 'Please enter a blueprint name');
            return;
        }
        const created = blueprintBuilderStore.createBlueprint(newBlueprintName.trim(), newBlueprintDescription.trim());
        if (!created) {
            toast.error('Free plan limit reached', {
                description: `Free plan allows ${FREE_TIER_LIMITS.maxBlueprints} blueprint. Upgrade to create more.`,
            });
            return;
        }
        setIsCreateDialogOpen(false);
        navigate('/blueprint-builder');
    };
    const extractedDataRoute = () => {
        navigate("/extracted-data");
    }
    const settingsRoute = () => {
        navigate("/settings");
    }
    const homeRoute = () => {
        navigate("/");
    }
    const aiChatRoute = () => {
        navigate('/ai-chat');
    }
    const macroLibraryRoute = () => {
        navigate('/macros');
    }

    const navItems = [
        { icon: House, label: 'Home', action: homeRoute, path: '/' },
        { icon: CirclePlus, label: 'Create blueprint', action: blueprintBuilderRoute, path: '/blueprint-builder' },
        { icon: Bot, label: 'AI assistant', action: aiChatRoute, path: '/ai-chat' },
        { icon: LibraryBig, label: 'Macros', action: macroLibraryRoute, path: '/macros' },
        { icon: Database, label: 'Extracted data', action: extractedDataRoute, path: '/extracted-data' },
        { icon: Settings, label: 'Settings', action: settingsRoute, path: '/settings' },
    ];

    return (
        <TooltipProvider>
            <div className="h-full flex-1 flex flex-col gap-2 min-h-0 overflow-hidden">
                <div className="bg-gray-100 w-full p-3 border border-gray-300 rounded-lg flex justify-between shrink-0">
                    <div className="flex items-center gap-2 min-w-0">
                        <img src="/octograb-logo.png" alt="OctoGrab Logo" className='w-10 h-10 shrink-0' />
                        <div className="min-w-0">
                            <span className="text-xl font-semibold leading-tight">OctoGrab</span>
                            <p className='text-[10px] text-gray-500 truncate'>
                                Ready to grab the web?
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-1.5 items-center shrink-0">
                        {/* Primary nav icons — visible on wider panels */}
                        <div className="hidden min-[420px]:flex gap-1.5 items-center">
                            {navItems.map((item) => {
                                const isActive = location.pathname === item.path;
                                return (
                                    <Tooltip key={item.label}>
                                        <TooltipTrigger asChild>
                                            <Button
                                                size="icon"
                                                variant={isActive ? 'default' : 'outline'}
                                                className={`h-9 w-9 ${isActive ? 'ring-2 ring-offset-1 ring-primary/30' : ''}`}
                                                onClick={item.action}
                                            >
                                                <item.icon className="h-4 w-4" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>{item.label}</p>
                                        </TooltipContent>
                                    </Tooltip>
                                );
                            })}
                        </div>

                        {/* Notification bell — always visible */}
                        <Popover>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <PopoverTrigger asChild>
                                        <Button size="icon" className="h-9 w-9 relative">
                                            <Bell className="h-4 w-4" />
                                            {notificationStore.unreadCount > 0 && (
                                                <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1.5 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center">
                                                    {notificationStore.unreadCount > 99 ? '99+' : notificationStore.unreadCount}
                                                </span>
                                            )}
                                        </Button>
                                    </PopoverTrigger>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Notifications</p>
                                </TooltipContent>
                            </Tooltip>
                            <PopoverContent align="end" className="w-80 p-0 bg-white border border-gray-200 shadow-lg rounded-lg overflow-hidden">
                                <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200">
                                    <h3 className="text-sm font-semibold text-gray-800">Notifications</h3>
                                    <div className="flex items-center gap-2">
                                        {notificationStore.unreadCount > 0 && (
                                            <button
                                                onClick={() => notificationStore.markAllRead()}
                                                className="text-xs text-emerald-600 hover:text-emerald-800 font-medium transition-colors"
                                            >
                                                Mark all read
                                            </button>
                                        )}
                                        {notificationStore.notifications.length > 0 && (
                                            <button
                                                onClick={() => notificationStore.clearAll()}
                                                className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
                                                title="Clear all"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div className="max-h-80 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#d1d5db #f3f4f6' }}>
                                    {notificationStore.notifications.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                                            <Bell className="h-8 w-8 mb-2 opacity-30" />
                                            <p className="text-sm font-medium">All caught up!</p>
                                            <p className="text-xs mt-0.5">No notifications</p>
                                        </div>
                                    ) : (
                                        notificationStore.notifications.map((n) => {
                                            const styles = getNotificationStyles(n);
                                            return (
                                                <div
                                                    key={n.id}
                                                    className={`flex items-start gap-3 px-4 py-3 border-b border-gray-100 last:border-b-0 transition-colors cursor-pointer hover:bg-gray-50 ${!n.read ? 'bg-emerald-50/40' : ''}`}
                                                    onClick={() => n.id && notificationStore.markRead(n.id)}
                                                >
                                                    <div className={`mt-0.5 shrink-0 rounded-full p-1.5 ${styles.bg} ${styles.text}`}>
                                                        {getNotificationIcon(n)}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <p className={`text-sm leading-tight ${!n.read ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>{n.title}</p>
                                                            {!n.read && <span className="shrink-0 h-1.5 w-1.5 rounded-full bg-emerald-500" />}
                                                        </div>
                                                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">{n.description}</p>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${styles.bg} ${styles.text}`}>
                                                                {n.category}
                                                            </span>
                                                            <span className="text-[10px] text-gray-400">{formatRelativeTime(n.createdAt)}</span>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); n.id && notificationStore.dismiss(n.id); }}
                                                        className="shrink-0 mt-0.5 p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
                                                        title="Dismiss"
                                                    >
                                                        <X className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </PopoverContent>
                        </Popover>

                        {/* Hamburger menu — visible on narrow panels */}
                        <div className="flex min-[420px]:hidden">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button size="icon" variant="outline" className="h-9 w-9">
                                        <Menu className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                    {navItems.map((item) => {
                                        const isActive = location.pathname === item.path;
                                        return (
                                            <DropdownMenuItem key={item.label} onClick={item.action} className={`gap-2 cursor-pointer ${isActive ? 'bg-accent font-medium' : ''}`}>
                                                <item.icon className="h-4 w-4" />
                                                {item.label}
                                            </DropdownMenuItem>
                                        );
                                    })}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                </div>
                <Outlet />

                {/* AI Assistant Coming Soon Dialog */}
                <Dialog open={isAiDialogOpen} onOpenChange={setIsAiDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>
                                AI Blueprint Assistant
                            </DialogTitle>
                            <DialogDescription>
                                Our AI assistant will help you create blueprints automatically by describing what you want to scrape in plain English.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="flex flex-col items-center gap-4 py-6">
                            <div className="w-16 h-16 rounded-full bg-yellow-50 flex items-center justify-center">
                                <Bot className="w-8 h-8 text-yellow-400" />
                            </div>
                            <div className="text-center">
                                <p className="text-lg font-semibold text-gray-700">Coming Soon</p>
                                <p className="text-sm text-gray-500 mt-1">We're building something amazing. Stay tuned!</p>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="default" onClick={() => { setIsAiDialogOpen(false); aiChatRoute(); }}>
                                Got It
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Create Blueprint Dialog */}
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create New Blueprint</DialogTitle>
                            <DialogDescription>
                                Enter a name and description for your new automation blueprint.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="navbar-name">Name *</Label>
                                <Input
                                    id="navbar-name"
                                    placeholder="My Automation Blueprint"
                                    value={newBlueprintName}
                                    onChange={(e) => setNewBlueprintName(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            handleCreateBlueprint();
                                        }
                                    }}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="navbar-description">Description</Label>
                                <Textarea
                                    id="navbar-description"
                                    placeholder="What does this blueprint do?"
                                    value={newBlueprintDescription}
                                    onChange={(e) => setNewBlueprintDescription(e.target.value)}
                                    rows={3}
                                />
                            </div>
                        </div>
                        <DialogFooter className='flex flex-col gap-2'>
                            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleCreateBlueprint}>
                                Create Blueprint
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </TooltipProvider>
    )
})
