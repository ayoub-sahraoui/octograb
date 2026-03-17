import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import BlueprintBlock from './blueprint-block';
import { Block } from '@/entrypoints/models/types';
import { GripVertical } from 'lucide-react';

interface SortableBlueprintBlockProps {
    block: Block;
}

export function SortableBlueprintBlock({ block }: SortableBlueprintBlockProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: block.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} className="relative" onPointerDown={(e) => e.stopPropagation()}>
            <div className="absolute left-0 top-0 bottom-0 flex items-center -ml-8 z-10">
                <div
                    {...attributes}
                    {...listeners}
                    className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-200 rounded"
                >
                    <GripVertical className="w-4 h-4 text-gray-400" />
                </div>
            </div>
            <BlueprintBlock block={block} />
        </div>
    );
}
