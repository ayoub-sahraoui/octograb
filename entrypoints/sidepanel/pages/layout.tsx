import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { CirclePlus, Database, Settings, Menu, Play, SquarePen, House } from 'lucide-react'
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
import AppLogo from '@/public/octograb-logo.png';

export default function Layout() {
    const blueprintBuilderStore = useBlueprintBuilderStore();
    const navigate = useNavigate();
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [newBlueprintName, setNewBlueprintName] = useState('');
    const [newBlueprintDescription, setNewBlueprintDescription] = useState('');

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
                        <img src={AppLogo} alt="OctoGrab Logo" className='w-12 h-12' />
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