import React from 'react'
import { Button } from '@/components/ui/button'
import { CirclePlus, Database, Settings, Menu, Play, SquarePen, House } from 'lucide-react'
import { Outlet, useNavigate } from 'react-router-dom'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useBlueprintBuilderStore } from '@/entrypoints/stores/blueprint-builder'

export default function Layout() {
    const blueprintBuilderStore = useBlueprintBuilderStore();
    const navigate = useNavigate();
    const blueprintBuilderRoute = () => {
        // Create new blueprint 
        blueprintBuilderStore.createBlueprint("New Blueprint", "new blueprint");
        navigate("/blueprint-builder");
    }
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
            <div className="h-full flex-1 flex flex-col gap-2">
            <div className="bg-gray-100 w-full p-4 border border-gray-300 rounded-lg flex justify-between">
                <div>
                    <span className="text-2xl font-semibold">Scrapy</span>
                    <p className='text-xs text-gray-500'>
                        Get data from any website
                    </p>
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
            </div>
        </TooltipProvider>
    )
}