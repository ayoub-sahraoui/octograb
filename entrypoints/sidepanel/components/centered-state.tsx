import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { getCenteredStateToneClasses, type CenteredStateTone } from './centered-state-display';

interface CenteredStateProps {
    icon: ReactNode;
    title: string;
    description: string;
    tone?: CenteredStateTone;
    action?: ReactNode;
    className?: string;
    compact?: boolean;
}

export function CenteredState({
    icon,
    title,
    description,
    tone = 'empty',
    action,
    className,
    compact = false,
}: CenteredStateProps) {
    const toneClasses = getCenteredStateToneClasses(tone);

    return (
        <div className={cn(
            'flex w-full flex-col items-center justify-center text-center',
            compact ? 'gap-3 py-6 px-4' : 'gap-4 py-10 px-6',
            className,
        )}>
            <div className={cn(
                'flex items-center justify-center rounded-full border',
                compact ? 'h-16 w-16' : 'h-20 w-20',
                toneClasses.iconRing,
            )}>
                {icon}
            </div>
            <div className="space-y-1">
                <h2 className={cn('font-semibold tracking-tight', compact ? 'text-base' : 'text-2xl', toneClasses.title)}>
                    {title}
                </h2>
                <p className={cn('mx-auto max-w-sm leading-relaxed', compact ? 'text-sm' : 'text-base', toneClasses.description)}>
                    {description}
                </p>
            </div>
            {action ? <div className="flex justify-center">{action}</div> : null}
        </div>
    );
}
