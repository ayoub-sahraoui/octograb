import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { KeyRound, Loader2, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react';
import { activateLicense } from '@/core/license';

export default function LicenseActivation({ onActivated }: { onActivated: () => void }) {
    const [licenseKey, setLicenseKey] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleActivate = async () => {
        const key = licenseKey.trim().toUpperCase();
        if (!key) {
            setError('Please enter a license key');
            return;
        }

        setIsLoading(true);
        setError(null);

        const result = await activateLicense(key);

        setIsLoading(false);

        if (result.success) {
            setSuccess(true);
            setTimeout(() => {
                onActivated();
            }, 1500);
        } else {
            setError(result.error || 'Activation failed');
        }
    };

    // Format license key as user types (auto-add dashes)
    const handleKeyChange = (value: string) => {
        // Remove everything except alphanumeric and dashes
        let cleaned = value.toUpperCase().replace(/[^A-Z0-9-]/g, '');

        // Auto-format: OCTO-XXXX-XXXX-XXXX-XXXX
        if (!cleaned.startsWith('OCTO-') && cleaned.length > 4) {
            const parts = cleaned.replace(/-/g, '').match(/.{1,4}/g) || [];
            cleaned = parts.join('-');
        }

        setLicenseKey(cleaned);
        setError(null);
    };

    if (success) {
        return (
            <div className="h-full flex-1 flex flex-col items-center justify-center gap-4 p-6">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-xl font-semibold text-green-700">License Activated!</h2>
                <p className="text-sm text-gray-500">Starting OctoGrab...</p>
            </div>
        );
    }

    return (
        <div className="h-full flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="flex-1 flex flex-col items-center justify-center gap-6 p-6">
                {/* Logo & Title */}
                <div className="flex flex-col items-center gap-3">
                    <img src="/octograb-logo.png" alt="OctoGrab" className="w-16 h-16" />
                    <h1 className="text-2xl font-bold">OctoGrab</h1>
                    <p className="text-sm text-gray-500 text-center">
                        Enter your license key to activate the extension
                    </p>
                </div>

                {/* Activation Form */}
                <div className="w-full max-w-sm space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="license-key" className="flex items-center gap-1.5">
                            <KeyRound className="w-4 h-4" />
                            License Key
                        </Label>
                        <Input
                            id="license-key"
                            placeholder="OCTO-XXXX-XXXX-XXXX-XXXX"
                            value={licenseKey}
                            onChange={(e) => handleKeyChange(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleActivate();
                            }}
                            className="font-mono text-center tracking-wider"
                            disabled={isLoading}
                        />
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-md border border-red-200">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    <Button
                        onClick={handleActivate}
                        disabled={isLoading || !licenseKey.trim()}
                        className="w-full gap-2"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Activating...
                            </>
                        ) : (
                            <>
                                <ShieldCheck className="w-4 h-4" />
                                Activate License
                            </>
                        )}
                    </Button>
                </div>

                {/* Footer Info */}
                <div className="text-center space-y-2">
                    <p className="text-xs text-gray-400">
                        Don't have a license?{' '}
                        <a
                            href="https://octograb.online/pricing.html"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:underline"
                        >
                            Get one here
                        </a>
                    </p>
                    <p className="text-xs text-gray-400">
                        Each license can be activated on up to 3 devices.
                    </p>
                </div>
            </div>
        </div>
    );
}
