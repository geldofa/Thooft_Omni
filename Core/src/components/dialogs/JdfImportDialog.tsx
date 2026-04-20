import { useState, useCallback } from 'react';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Upload, FileText, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { parseJdf, jdfVersionsToJobs, getLangChipColors, type JdfParseResult } from '../../utils/jdf-parser';
import { FinishedPrintJob } from '../../utils/drukwerken-utils';
import { cn } from '../ui/utils';

interface JdfImportDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    // pressMap: name → id
    pressMap: Record<string, string>;
    onImport: (jobs: FinishedPrintJob[]) => void;
}

export function JdfImportDialog({ open, onOpenChange, pressMap, onImport }: JdfImportDialogProps) {
    const [parsed, setParsed] = useState<JdfParseResult | null>(null);
    const [fileName, setFileName] = useState('');
    const [dragOver, setDragOver] = useState(false);
    const [error, setError] = useState('');

    const reset = () => {
        setParsed(null);
        setFileName('');
        setError('');
    };

    const handleClose = () => {
        reset();
        onOpenChange(false);
    };

    const processFile = useCallback((file: File) => {
        if (!file.name.toLowerCase().endsWith('.jdf')) {
            setError('Enkel .jdf bestanden worden ondersteund.');
            return;
        }
        setError('');
        setFileName(file.name);

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const result = parseJdf(e.target?.result as string);
                if (result.jobs.length === 0) {
                    setError('Geen versies gevonden in dit JDF-bestand.');
                    return;
                }
                setParsed(result);
            } catch (err: any) {
                setError(err.message || 'Fout bij het lezen van het JDF-bestand.');
            }
        };
        reader.readAsText(file, 'utf-8');
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) processFile(file);
    }, [processFile]);

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) processFile(file);
        e.target.value = '';
    };

    const handleConfirm = () => {
        if (!parsed) return;

        // Match press by DeviceID to PB press name
        const pressName = Object.keys(pressMap).find(
            name => name.toLowerCase() === parsed.pressDeviceId.toLowerCase()
        ) || '';
        const pressId = pressMap[pressName] || '';

        if (!pressName) {
            toast.warning(`Pers "${parsed.pressDeviceId}" niet gevonden. Controleer de persnaam na het importeren.`);
        }

        const jobs = jdfVersionsToJobs(parsed, pressName, pressId);
        onImport(jobs);
        handleClose();
    };

    // Group versions by language prefix for preview
    const grouped = parsed
        ? parsed.jobs.reduce<Record<string, typeof parsed.jobs>>((acc, v) => {
            const key = v.langPrefix || '—';
            (acc[key] ??= []).push(v);
            return acc;
        }, {})
        : {};

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] w-full max-h-[85vh] flex flex-col overflow-hidden gap-3">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold">Importeren via JDF</DialogTitle>
                    <DialogDescription>
                        Sleep een JDF-bestand naar het veld hieronder om een order voor te vullen.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col flex-1 min-h-0 gap-4 overflow-y-auto pr-1">
                    {/* Drop zone */}
                    <label
                        className={cn(
                            'relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed cursor-pointer transition-all duration-150 select-none',
                            'min-h-[140px] p-6 text-center',
                            dragOver
                                ? 'border-blue-500 bg-blue-50 scale-[1.01]'
                                : parsed
                                    ? 'border-green-400 bg-green-50'
                                    : 'border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50/40'
                        )}
                        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={handleDrop}
                    >
                        <input
                            type="file"
                            accept=".jdf"
                            className="sr-only"
                            onChange={handleFileInput}
                        />
                        {parsed ? (
                            <>
                                <FileText className="w-10 h-10 text-green-600" />
                                <div>
                                    <p className="font-semibold text-green-700">{fileName}</p>
                                    <p className="text-sm text-green-600">{parsed.jobs.length} versies gevonden</p>
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="text-xs text-gray-500 hover:text-gray-700"
                                    onClick={(e) => { e.preventDefault(); reset(); }}
                                >
                                    Ander bestand kiezen
                                </Button>
                            </>
                        ) : (
                            <>
                                <Upload className={cn('w-10 h-10 transition-colors', dragOver ? 'text-blue-500' : 'text-gray-400')} />
                                <div>
                                    <p className="font-medium text-gray-700">Sleep een .jdf bestand hierheen</p>
                                    <p className="text-sm text-gray-500">of klik om te bladeren</p>
                                </div>
                            </>
                        )}
                    </label>

                    {error && (
                        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            {error}
                        </div>
                    )}

                    {/* Preview */}
                    {parsed && (
                        <div className="space-y-3">
                            <div className="grid grid-cols-3 gap-3 text-sm border rounded-lg p-3 bg-gray-50">
                                <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-0.5">Order nr</p>
                                    <p className="font-semibold">DT{parsed.orderNr}</p>
                                </div>
                                <div className="col-span-2">
                                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-0.5">Order naam</p>
                                    <p className="font-semibold">{parsed.orderName}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-0.5">Pers (JDF)</p>
                                    <p className="font-semibold">{parsed.pressDeviceId || '—'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-0.5">Ex/Omw</p>
                                    <p className="font-semibold">{parsed.exOmw}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-0.5">Pagina's</p>
                                    <p className="font-semibold">{parsed.pages ?? '—'}</p>
                                </div>
                            </div>

                            <div className="border rounded-lg overflow-hidden">
                                <div className="px-3 py-2 bg-gray-50 border-b text-xs font-bold uppercase tracking-wider text-gray-500">
                                    Versies ({parsed.jobs.length})
                                </div>
                                <div className="divide-y max-h-[240px] overflow-y-auto">
                                    {Object.entries(grouped).map(([prefix, versions]) => (
                                        <div key={prefix}>
                                            <div className="px-3 py-1.5 bg-gray-50/70 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                                                {prefix} — {versions.length} versies
                                            </div>
                                            {versions.map((v) => {
                                                const colors = getLangChipColors(v.langPrefix);
                                                return (
                                                    <div key={v.version} className="flex items-center gap-2 px-3 py-1.5 text-sm">
                                                        {v.langPrefix && (
                                                            <Badge
                                                                variant="outline"
                                                                className={cn('text-[10px] px-1.5 h-4 font-bold border flex-shrink-0', colors.bg, colors.text, colors.border)}
                                                            >
                                                                {v.langPrefix}
                                                            </Badge>
                                                        )}
                                                        <span className="text-gray-700">{v.versionLabel}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="border-t pt-3 flex-none">
                    <Button type="button" variant="ghost" onClick={handleClose}>Annuleren</Button>
                    <Button
                        type="button"
                        disabled={!parsed}
                        onClick={handleConfirm}
                        className="min-w-[140px]"
                    >
                        Importeren ({parsed?.jobs.length ?? 0} versies)
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
