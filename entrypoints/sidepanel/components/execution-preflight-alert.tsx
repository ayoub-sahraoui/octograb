import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { ExecutionPreflightFeedback } from '@/entrypoints/models/execution-preflight-feedback';

export function ExecutionPreflightAlert({
    feedback,
    onOpenBuilder,
}: {
    feedback: ExecutionPreflightFeedback;
    onOpenBuilder?: () => void;
}) {
    return (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="border-amber-300 text-amber-800">
                    Preflight check failed
                </Badge>
                <Badge variant="outline" className="border-slate-300 text-slate-700">
                    No data captured yet
                </Badge>
                {feedback.affectedPath ? (
                    <Badge variant="outline" className="border-slate-300 text-slate-700">
                        Affected block: {feedback.affectedPath}
                    </Badge>
                ) : null}
            </div>
            <p className="mt-2 text-sm font-medium text-amber-900">{feedback.title}</p>
            <p className="mt-1 text-sm text-amber-800">{feedback.summary}</p>
            <div className="mt-3 rounded-md border border-amber-200 bg-white/60 p-2 text-xs text-amber-950">
                <p className="font-semibold">Problem</p>
                <p className="mt-1">{feedback.problem}</p>
                <p className="mt-2 font-semibold">Why it happened</p>
                <p className="mt-1">{feedback.whyItHappened}</p>
                {feedback.selector ? (
                    <p className="mt-2">
                        <span className="font-semibold">Selector:</span>{' '}
                        <code className="rounded bg-amber-100 px-1 py-0.5 break-all whitespace-pre-wrap">{feedback.selector}</code>
                    </p>
                ) : null}
            </div>
            <div className="mt-3 text-xs text-amber-900">
                <p className="font-semibold">Fix steps</p>
                <ol className="mt-1 list-decimal space-y-1 pl-4">
                    {feedback.fixSteps.map((step) => (
                        <li key={step}>{step}</li>
                    ))}
                </ol>
            </div>
            <p className="mt-2 text-xs text-amber-900">{feedback.suggestedAction}</p>
            <details className="mt-3 text-xs text-amber-900">
                <summary className="cursor-pointer font-medium">Details</summary>
                <ul className="mt-2 space-y-1">
                    {feedback.details.map((detail) => (
                        <li key={detail}>{detail}</li>
                    ))}
                </ul>
            </details>
            {onOpenBuilder ? (
                <div className="mt-3">
                    <Button size="sm" variant="outline" onClick={onOpenBuilder}>
                        Open in Builder
                    </Button>
                </div>
            ) : null}
        </div>
    );
}
