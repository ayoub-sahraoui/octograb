export type CenteredStateTone = 'empty' | 'error' | 'warning';

export function getCenteredStateToneClasses(tone: CenteredStateTone = 'empty') {
    switch (tone) {
        case 'error':
            return {
                iconRing: 'border-red-200 bg-red-50 text-red-500',
                title: 'text-red-900',
                description: 'text-red-700/80',
            };
        case 'warning':
            return {
                iconRing: 'border-amber-200 bg-amber-50 text-amber-600',
                title: 'text-slate-900',
                description: 'text-slate-600',
            };
        case 'empty':
        default:
            return {
                iconRing: 'border-emerald-200 bg-white text-slate-500',
                title: 'text-slate-900',
                description: 'text-slate-600',
            };
    }
}
