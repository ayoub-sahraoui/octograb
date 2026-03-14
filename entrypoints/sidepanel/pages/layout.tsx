import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { CirclePlus, Database, Settings, Menu, Play, SquarePen, House, Bot, Sparkles } from 'lucide-react'
import { Outlet, useNavigate } from 'react-router-dom'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useBlueprintBuilderStore } from '@/entrypoints/stores/blueprint-builder-store'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function Layout() {
    const blueprintBuilderStore = useBlueprintBuilderStore();
    const navigate = useNavigate();
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [newBlueprintName, setNewBlueprintName] = useState('');
    const [newBlueprintDescription, setNewBlueprintDescription] = useState('');
    const [isAgentDialogOpen, setIsAgentDialogOpen] = useState(false);

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
    const blueprintsRoute = () => {
        navigate("/blueprints");
    }
    const homeRoute = () => {
        navigate("/");
    }
    return (
        <TooltipProvider>
            <div className="h-full flex-1 flex flex-col gap-2 min-h-0 overflow-hidden">
                <div className="bg-gray-100 w-full p-3 border border-gray-300 rounded-lg flex justify-between shrink-0">
                    <div className="flex items-center gap-2">
                        <img src="/octograb-logo.png" alt="OctoGrab Logo" className='w-12 h-12' />
                        <div>
                            <span className="text-2xl font-semibold">OctoGrab</span>
                            <p className='text-xs text-gray-500'>
                                Get data from any website
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-2 items-center">
                        <Button size="icon" onClick={blueprintBuilderRoute}>
                            <CirclePlus />
                        </Button>
                        <Button size="icon" onClick={() => setIsAgentDialogOpen(true)} className="relative">
                            <Bot />
                        </Button>
                        <Button size="icon" onClick={extractedDataRoute}>
                            <Database />
                        </Button>
                        <Button size="icon" onClick={settingsRoute}>
                            <Settings />
                        </Button>
                        <Button size="icon" onClick={homeRoute}>
                            <House />
                        </Button>
                    </div>
                </div>
                <Outlet />

                {/* AI Agent Coming Soon Dialog */}
                <Dialog open={isAgentDialogOpen} onOpenChange={setIsAgentDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-yellow-500" />
                                AI Blueprint Agent
                            </DialogTitle>
                            <DialogDescription>
                                Our AI agent will help you create blueprints automatically by describing what you want to scrape in plain English.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="flex flex-col items-center gap-4 py-6">
                            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                                <Bot className="w-8 h-8 text-gray-400" />
                            </div>
                            <div className="text-center">
                                <p className="text-lg font-semibold text-gray-700">Coming Soon</p>
                                <p className="text-sm text-gray-500 mt-1">We're building something amazing. Stay tuned!</p>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={() => setIsAgentDialogOpen(false)}>
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
                        <DialogFooter>
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