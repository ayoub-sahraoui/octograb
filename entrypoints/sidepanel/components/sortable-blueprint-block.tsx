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
        <div ref={setNodeRef} style={style} className="relative">
            <BlueprintBlock
                block={block}
                leadingControl={
                    <div
                        {...attributes}
                        {...listeners}
                        className="flex h-10 w-10 shrink-0 cursor-grab items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500 transition hover:border-slate-300 hover:bg-slate-100 active:cursor-grabbing"
                        onClick={(e) => e.stopPropagation()}
                        title="Drag to reorder block"
                    >
                        <GripVertical className="w-4 h-4" />
                    </div>
                }
            />
        </div>
    );
}
