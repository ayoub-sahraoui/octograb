import { Button } from "@/components/ui/button";
import { Play, SquarePen } from "lucide-react";

export default function Home() {
    return (
        <div className="h-full flex-1 flex flex-col gap-2">
            <h1 className="text-xl font-semibold ml-2">Blueprints</h1>
            <div className="flex flex-col gap-2 scroll-auto flex-1">
                <div className="bg-gray-100 p-4 border hover:ring-2 border-gray-300 rounded-lg flex flex-col">
                    <h1 className="text-lg">Blueprints name</h1>
                    <p>Website name</p>
                    <div className="flex gap-2 justify-end">
                        <Button size="icon">
                            <Play />
                        </Button>
                        <Button size="icon">
                            <SquarePen />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
