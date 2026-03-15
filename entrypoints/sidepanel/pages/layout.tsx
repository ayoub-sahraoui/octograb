import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { CirclePlus, Database, Settings, House, Bot, Bell, Sparkles, Menu, X, Check, CircleAlert } from 'lucide-react'
import { Outlet, useNavigate } from 'react-router-dom'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useBlueprintBuilderStore } from '@/entrypoints/stores/blueprint-builder-store'
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

interface Notification {
    id: number;
    title: string;
    description: string;
    time: string;
    type: 'success' | 'info' | 'warning';
    read: boolean;
}

const initialNotifications: Notification[] = [
    {
        id: 1,
        title: "Welcome to OctoGrab!",
        description: "Get started by creating your first automation blueprint.",
        time: "Just now",
        type: "info",
        read: false,
    },
    {
        id: 2,
        title: "AI Chat coming soon",
        description: "Our AI assistant will help you build blueprints using natural language.",
        time: "Today",
        type: "info",
        read: false,
    },
    {
        id: 3,
        title: "Tip: Export your data",
        description: "You can export extracted data to CSV or JSON from the Extracted Data page.",
        time: "Today",
        type: "success",
        read: false,
    },
];

export default function Layout() {
    const blueprintBuilderStore = useBlueprintBuilderStore();
    const navigate = useNavigate();
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isAiDialogOpen, setIsAiDialogOpen] = useState(false);
    const [newBlueprintName, setNewBlueprintName] = useState('');
    const [newBlueprintDescription, setNewBlueprintDescription] = useState('');
    const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);

    const unreadCount = notifications.filter(n => !n.read).length;

    const markAsRead = (id: number) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    };

    const markAllAsRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    };

    const dismissNotification = (id: number) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    const blueprintBuilderRoute = () => {
        setNewBlueprintName('');
        setNewBlueprintDescription('');
        setIsCreateDialogOpen(true);
    }

    const handleCreateBlueprint = () => {
        if (!newBlueprintName.trim()) {
            alert('Please enter a blueprint name');
            return;
        }
        blueprintBuilderStore.createBlueprint(newBlueprintName.trim(), newBlueprintDescription.trim());
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

    const navItems = [
        { icon: House, label: 'Home', action: homeRoute },
        { icon: CirclePlus, label: 'Create blueprint', action: blueprintBuilderRoute },
        { icon: Bot, label: 'AI assistant', action: () => setIsAiDialogOpen(true) },
        { icon: Database, label: 'Extracted data', action: extractedDataRoute },
        { icon: Settings, label: 'Settings', action: settingsRoute },
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
                            {navItems.map((item) => (
                                <Tooltip key={item.label}>
                                    <TooltipTrigger asChild>
                                        <Button size="icon" className="h-9 w-9" onClick={item.action}>
                                            <item.icon className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>{item.label}</p>
                                    </TooltipContent>
                                </Tooltip>
                            ))}
                        </div>

                        {/* Notification bell — always visible */}
                        <Popover>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <PopoverTrigger asChild>
                                        <Button size="icon" className="h-9 w-9 relative">
                                            <Bell className="h-4 w-4" />
                                            {unreadCount > 0 && (
                                                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center">
                                                    {unreadCount}
                                                </span>
                                            )}
                                        </Button>
                                    </PopoverTrigger>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Notifications</p>
                                </TooltipContent>
                            </Tooltip>
                            <PopoverContent align="end" className="w-80 p-0">
                                <div className="flex items-center justify-between px-4 py-3 border-b">
                                    <h3 className="text-sm font-semibold">Notifications</h3>
                                    {unreadCount > 0 && (
                                        <button
                                            onClick={markAllAsRead}
                                            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                                        >
                                            Mark all as read
                                        </button>
                                    )}
                                </div>
                                <div className="max-h-72 overflow-y-auto">
                                    {notifications.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                                            <Bell className="h-8 w-8 mb-2 opacity-40" />
                                            <p className="text-sm">No notifications</p>
                                        </div>
                                    ) : (
                                        notifications.map((n) => (
                                            <div
                                                key={n.id}
                                                className={`flex items-start gap-3 px-4 py-3 border-b last:border-b-0 transition-colors cursor-pointer hover:bg-gray-50 ${!n.read ? 'bg-blue-50/50' : ''}`}
                                                onClick={() => markAsRead(n.id)}
                                            >
                                                <div className={`mt-0.5 shrink-0 rounded-full p-1.5 ${n.type === 'success' ? 'bg-green-100 text-green-600' : n.type === 'warning' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
                                                    {n.type === 'warning' ? <CircleAlert className="h-3.5 w-3.5" /> : n.type === 'success' ? <Check className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <p className={`text-sm truncate ${!n.read ? 'font-semibold' : 'font-medium text-gray-700'}`}>{n.title}</p>
                                                        {!n.read && <span className="shrink-0 h-2 w-2 rounded-full bg-blue-500" />}
                                                    </div>
                                                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.description}</p>
                                                    <p className="text-[10px] text-gray-400 mt-1">{n.time}</p>
                                                </div>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); dismissNotification(n.id); }}
                                                    className="shrink-0 mt-0.5 p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
                                                >
                                                    <X className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        ))
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
                                    {navItems.map((item) => (
                                        <DropdownMenuItem key={item.label} onClick={item.action} className="gap-2 cursor-pointer">
                                            <item.icon className="h-4 w-4" />
                                            {item.label}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                </div>
                <Outlet />

                {/* AI Assistant Coming Soon Dialog */}
                <Dialog open={isAiDialogOpen} onOpenChange={setIsAiDialogOpen}>
                    <DialogContent className='bg-gray-50'>
                        <DialogHeader className='flex flex-col items-center justify-center'>
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
                    <DialogContent className='bg-gray-50'>
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
}