import { useState, useCallback, useRef, createContext, useContext, ReactNode } from "react";
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogFooter,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogAction,
    AlertDialogCancel,
} from "@/components/ui/alert-dialog";

interface ConfirmOptions {
    title: string;
    description: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'default' | 'destructive';
}

interface ConfirmContextValue {
    confirm: (options: ConfirmOptions) => Promise<boolean>;
    alert: (title: string, description?: string) => Promise<void>;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function useConfirm(): ConfirmContextValue {
    const ctx = useContext(ConfirmContext);
    if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider');
    return ctx;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
    const [open, setOpen] = useState(false);
    const [options, setOptions] = useState<ConfirmOptions & { isAlert?: boolean }>({
        title: '',
        description: '',
    });
    const resolveRef = useRef<((v: boolean) => void) | null>(null);

    const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
        return new Promise<boolean>((resolve) => {
            setOptions({ ...opts, isAlert: false });
            resolveRef.current = resolve;
            setOpen(true);
        });
    }, []);

    const alertFn = useCallback((title: string, description?: string): Promise<void> => {
        return new Promise<void>((resolve) => {
            setOptions({ title, description: description || '', isAlert: true });
            resolveRef.current = () => resolve();
            setOpen(true);
        });
    }, []);

    const handleConfirm = () => {
        setOpen(false);
        resolveRef.current?.(true);
        resolveRef.current = null;
    };

    const handleCancel = () => {
        setOpen(false);
        resolveRef.current?.(false);
        resolveRef.current = null;
    };

    return (
        <ConfirmContext.Provider value={{ confirm, alert: alertFn }}>
            {children}
            <AlertDialog open={open} onOpenChange={(v) => { if (!v) handleCancel(); }}>
                <AlertDialogContent className="max-w-sm">
                    <AlertDialogHeader>
                        <AlertDialogTitle>{options.title}</AlertDialogTitle>
                        <AlertDialogDescription>{options.description}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        {!options.isAlert && (
                            <AlertDialogCancel onClick={handleCancel}>
                                {options.cancelLabel || 'Cancel'}
                            </AlertDialogCancel>
                        )}
                        <AlertDialogAction
                            onClick={handleConfirm}
                            className={options.variant === 'destructive' ? 'bg-red-600 hover:bg-red-700' : ''}
                        >
                            {options.isAlert ? 'OK' : (options.confirmLabel || 'Confirm')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </ConfirmContext.Provider>
    );
}
