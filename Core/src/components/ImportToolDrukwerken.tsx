import React, { useState, useMemo, useEffect } from 'react';
import { useAuth, pb } from './AuthContext';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from './ui/table';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Upload, ArrowRight, Check, AlertCircle, Save } from 'lucide-react';
import { toast } from 'sonner';
import Papa from 'papaparse';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from './ui/select';

interface MappingTarget {
    id: string;
    label: string;
    required: boolean;
    systemField: string;
}

const TARGET_FIELDS: MappingTarget[] = [
    { id: 'order_nummer', label: 'Order Nummer', required: true, systemField: 'order_nummer' },
    { id: 'order_name', label: 'Klant/Order Naam', required: true, systemField: 'klant_order_beschrijving' },
    { id: 'versie', label: 'Versie/Katern', required: false, systemField: 'versie' },
    { id: 'pages', label: 'Blz', required: false, systemField: 'blz' },
    { id: 'ex_omw', label: 'Ex/Omw', required: false, systemField: 'ex_omw' },
    { id: 'net_run', label: 'Netto Oplage', required: false, systemField: 'netto_oplage' },
    { id: 'startup', label: 'Opstart', required: false, systemField: 'opstart' },
    { id: 'c4_4', label: '4/4', required: false, systemField: 'k_4_4' },
    { id: 'c4_0', label: '4/0', required: false, systemField: 'k_4_0' },
    { id: 'c1_0', label: '1/0', required: false, systemField: 'k_1_0' },
    { id: 'c1_1', label: '1/1', required: false, systemField: 'k_1_1' },
    { id: 'c4_1', label: '4/1', required: false, systemField: 'k_4_1' },
    { id: 'max_gross', label: 'Max Bruto', required: false, systemField: 'max_bruto' },
    { id: 'green', label: 'Groen', required: false, systemField: 'groen' },
    { id: 'red', label: 'Rood', required: false, systemField: 'rood' },
    { id: 'delta', label: 'Delta', required: false, systemField: 'delta' },
    { id: 'delta_percent', label: 'Delta %', required: false, systemField: 'delta_percent' },
    { id: 'opmerking', label: 'Opmerking', required: false, systemField: 'opmerking' },
    { id: 'press', label: 'Pers/Machine', required: true, systemField: 'pers' },
];

export function ImportToolDrukwerken({ onComplete, minimal = false, initialFile, onStepChange }: { onComplete?: () => void, minimal?: boolean, initialFile?: File, onStepChange?: (step: 'upload' | 'analysis' | 'resolve' | 'preview') => void }) {
    const { presses } = useAuth();

    const [csvData, setCsvData] = useState<any[]>([]);
    const [headers, setHeaders] = useState<string[]>([]);
    const [mappings, setMappings] = useState<Record<string, string | null>>({});
    const [step, setStep] = useState<'upload' | 'analysis' | 'resolve' | 'preview'>('upload');
    const [isImporting, setIsImporting] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);

    useEffect(() => {
        if (onStepChange) onStepChange(step);
    }, [step, onStepChange]);

    // Persistence for field labels
    const [fieldLabels, setFieldLabels] = useState<Record<string, string>>(() => {
        const saved = localStorage.getItem('import_drukwerken_field_labels');
        if (saved) {
            try { return JSON.parse(saved); } catch (e) { console.error("Failed to parse saved field labels", e); }
        }
        return Object.fromEntries(TARGET_FIELDS.map(t => [t.id, t.label]));
    });

    // Persistence for mappings
    const [savedMappings, setSavedMappings] = useState<Record<string, string | null>>(() => {
        const saved = localStorage.getItem('import_drukwerken_column_mappings');
        if (saved) {
            try { return JSON.parse(saved); } catch (e) { console.error("Failed to parse saved mappings", e); }
        }
        return {};
    });

    useEffect(() => {
        localStorage.setItem('import_drukwerken_field_labels', JSON.stringify(fieldLabels));
    }, [fieldLabels]);

    const saveSettings = () => {
        localStorage.setItem('import_drukwerken_column_mappings', JSON.stringify(mappings));
        localStorage.setItem('import_drukwerken_field_labels', JSON.stringify(fieldLabels));
        setSavedMappings(mappings);
        toast.success('Import instellingen succesvol opgeslagen');
    };

    const [resolutions, setResolutions] = useState<{
        presses: Record<string, { type: 'existing' | 'new', value: string }>;
    }>({ presses: {} });

    const unrecognised = useMemo(() => {
        if (!csvData.length || !mappings.pers) return { presses: [] };

        const missingPresses = new Set<string>();

        csvData.forEach(row => {
            const pressName = row[mappings.pers!]?.toString().trim();
            if (pressName && !presses.some(p => p.name.toLowerCase() === pressName.toLowerCase() || p.id === pressName)) {
                missingPresses.add(pressName);
            }
        });

        return {
            presses: Array.from(missingPresses)
        };
    }, [csvData, mappings, presses]);

    useEffect(() => {
        setResolutions(prev => {
            const next = { ...prev };
            unrecognised.presses.forEach(p => {
                if (!next.presses[p]) next.presses[p] = { type: 'new', value: p };
            });
            return next;
        });
    }, [unrecognised]);

    const updateResolution = (entityType: 'presses', key: string, update: Partial<{ type: any, value: string }>) => {
        setResolutions(prev => ({
            ...prev,
            [entityType]: {
                ...prev[entityType],
                [key]: { ...prev[entityType][key], ...update }
            }
        }));
    };

    const processFile = (file: File) => {
        Papa.parse(file, {
            header: true,
            dynamicTyping: true,
            skipEmptyLines: 'greedy',
            complete: (results: Papa.ParseResult<any>) => {
                if (results.data && results.data.length > 0) {
                    const rawHeaders = Array.from(new Set(Object.keys(results.data[0]).filter(h => h && h.trim() !== '')));
                    setHeaders(rawHeaders);
                    setCsvData(results.data);

                    const initialMappings: Record<string, string | null> = {};
                    const usedHeaders = new Set<string>();

                    TARGET_FIELDS.forEach(target => {
                        const savedCol = savedMappings[target.systemField];
                        if (savedCol && rawHeaders.includes(savedCol)) {
                            initialMappings[target.systemField] = savedCol;
                            usedHeaders.add(savedCol);
                            return;
                        }

                        const match = rawHeaders.find(h => {
                            const cleanedH = h.toLowerCase().trim();
                            const cleanedL = target.label.toLowerCase();
                            const cleanedS = target.systemField.toLowerCase();
                            const cleanedID = target.id.toLowerCase();
                            return cleanedH === cleanedL || cleanedH === cleanedS || cleanedH === cleanedID;
                        });

                        if (match) {
                            initialMappings[target.systemField] = match;
                            usedHeaders.add(match);
                        }
                    });

                    setMappings(initialMappings);
                    setStep('analysis');
                    toast.success('Bestand geanalyseerd');
                } else {
                    toast.error('Geen data gevonden in het bestand');
                }
            },
            error: (error: Error) => {
                toast.error(`Fout bij laden: ${error.message}`);
            }
        });
    };

    useEffect(() => {
        if (initialFile) {
            processFile(initialFile);
        }
    }, [initialFile]);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) processFile(file);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) {
            if (file.name.endsWith('.csv') || file.name.endsWith('.tsv')) {
                processFile(file);
            } else {
                toast.error('Gelieve (alleen) een .csv of .tsv bestand te uploaden.');
            }
        }
    };

    const updateMapping = (systemField: string, csvHeader: string) => {
        setMappings(prev => ({
            ...prev,
            [systemField]: csvHeader === '_none' ? null : csvHeader
        }));
    };

    const validateMappings = () => {
        const missing = TARGET_FIELDS.filter(t => t.required && !mappings[t.systemField]);
        if (missing.length > 0) {
            toast.error(`Sommige verplichte velden zijn niet gemapped: ${missing.map(m => m.label).join(', ')}`);
            return false;
        }
        return true;
    };

    const processedData = useMemo(() => {
        if (step !== 'preview') return [];

        return csvData.map((row, index) => {
            const item: any = {};
            TARGET_FIELDS.forEach(target => {
                const csvHeader = mappings[target.systemField];
                let val = csvHeader ? row[csvHeader] : null;

                if (['blz', 'netto_oplage', 'k_4_4', 'k_4_0', 'k_1_0', 'k_1_1', 'k_4_1', 'max_bruto', 'groen', 'rood', 'delta', 'delta_percent', 'order_nummer'].includes(target.systemField)) {
                    if (typeof val === 'string') {
                        val = val.replace(/\./g, '').replace(',', '.');
                    }
                    val = parseFloat(val) || 0;
                }

                if (target.systemField === 'opstart') {
                    val = val === true || val === 'true' || val === 'Ja' || val === '1' || val === 1;
                }

                item[target.systemField] = val;
            });

            const rawPressName = item.pers?.toString().trim();
            const resPress = resolutions.presses[rawPressName];
            const resolvedPress = resPress?.type === 'existing'
                ? presses.find(p => p.id === resPress.value)
                : presses.find(p => p.name.toLowerCase() === (rawPressName?.toLowerCase() || ''));

            const errors: string[] = [];
            if (!item.order_nummer) errors.push('Order Nummer ontbreekt');
            if (!item.klant_order_beschrijving) errors.push('Klant/Order Naam ontbreekt');
            if (rawPressName && !resolvedPress && resPress?.type !== 'new') errors.push(`Machine '${rawPressName}' niet herkend`);
            if (!rawPressName && !resolvedPress) errors.push('Machine ontbreekt');

            return {
                ...item,
                originalIndex: index,
                pressId: resolvedPress?.id || (resPress?.type === 'new' ? `__NEW_PRESS__${rawPressName}` : ''),
                pressName: resolvedPress?.name || (resPress?.type === 'new' ? resPress.value : (item.pers || 'Onbekend')),
                isValid: errors.length === 0,
                errors
            };
        });
    }, [csvData, mappings, step, presses, resolutions]);

    const handleImport = async () => {
        const validRows = processedData.filter(d => d.isValid);
        if (validRows.length === 0) {
            toast.error("Geen geldige rijen gevonden om te importeren.");
            return;
        }

        setIsImporting(true);
        let successCount = 0;

        try {
            const pressMap: Record<string, string> = {};
            for (const [rawName, res] of Object.entries(resolutions.presses)) {
                if (res.type === 'new') {
                    try {
                        const record = await pb.collection('persen').create({ naam: res.value, active: true, archived: false });
                        pressMap[`__NEW_PRESS__${rawName}`] = record.id;
                    } catch (err: any) {
                        try {
                            const existing = await pb.collection('persen').getFirstListItem(`naam="${res.value}"`);
                            pressMap[`__NEW_PRESS__${rawName}`] = existing.id;
                        } catch (fetchErr) {
                            console.error(`Failed to create or find press ${res.value}`, err);
                        }
                    }
                }
            }

            for (const row of validRows) {
                const finalPressId = row.pressId.startsWith('__NEW_PRESS__') ? pressMap[row.pressId] : row.pressId;

                const pbData = {
                    order_nummer: row.order_nummer,
                    klant_order_beschrijving: row.klant_order_beschrijving,
                    versie: row.versie || '',
                    blz: row.blz || 0,
                    ex_omw: String(row.ex_omw || ''),
                    netto_oplage: row.netto_oplage || 0,
                    opstart: !!row.opstart,
                    k_4_4: row.k_4_4 || 0,
                    k_4_0: row.k_4_0 || 0,
                    k_1_0: row.k_1_0 || 0,
                    k_1_1: row.k_1_1 || 0,
                    k_4_1: row.k_4_1 || 0,
                    max_bruto: row.max_bruto || 0,
                    groen: row.groen || 0,
                    rood: row.rood || 0,
                    delta: row.delta || 0,
                    delta_percent: row.delta_percent || 0,
                    opmerking: row.opmerking || '',
                    pers: finalPressId
                };

                await pb.collection('drukwerken').create(pbData);
                successCount++;
            }

            toast.success(`${successCount} drukwerken succesvol geïmporteerd`);
            setStep('upload');
            setCsvData([]);
            if (onComplete) onComplete();
        } catch (error) {
            console.error('Import error:', error);
            toast.error('Er is een fout opgetreden bij de import.');
        } finally {
            setIsImporting(false);
        }
    };

    return (
        <div className="space-y-6">
            {!minimal && (
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-gray-900 font-bold">Drukwerken Import Tool</h2>
                        <p className="text-gray-600 mt-1">Snel data importeren voor de drukwerk rapportages</p>
                    </div>
                    {step !== 'upload' && (
                        <Button variant="ghost" onClick={() => setStep('upload')} className="text-gray-500">
                            Opnieuw beginnen
                        </Button>
                    )}
                </div>
            )}

            {step === 'upload' && (
                <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={minimal ? "min-h-[200px]" : "min-h-[30vh]"}
                >
                    <Card className={`border-2 transition-all duration-200 h-full ${isDragOver ? 'border-blue-500 bg-blue-50 border-solid' : 'border-gray-300 bg-gray-50/50 hover:bg-gray-50 border-dashed'}`}>
                        <CardContent className={`flex flex-col items-center justify-center h-full ${minimal ? 'py-8' : 'py-16'}`}>
                            <Upload className={`h-12 w-12 mb-4 ${isDragOver ? 'text-blue-500' : 'text-gray-400'}`} />
                            <CardTitle className="mb-2">Drukwerken Bestand Uploaden</CardTitle>
                            <CardDescription className="mb-6 text-center">
                                Sleep uw .csv of .tsv bestand hierheen.<br />
                            </CardDescription>
                            <Input
                                type="file"
                                accept=".csv,.tsv"
                                onChange={handleFileUpload}
                                className="hidden"
                                id="drukwerk-upload"
                            />
                            <Label htmlFor="drukwerk-upload">
                                <span className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium cursor-pointer transition-colors inline-block">
                                    Bestand Selecteren
                                </span>
                            </Label>
                        </CardContent>
                    </Card>
                </div>
            )}

            {step === 'analysis' && (
                <Card>
                    <CardHeader className="border-b bg-gray-50/50">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-lg">Stap 1: Kolom Koppeling</CardTitle>
                                <CardDescription>Koppel uw kolommen aan de drukwerk velden</CardDescription>
                            </div>
                            <Button onClick={saveSettings} variant="outline" size="sm" className="gap-2">
                                <Save className="w-4 h-4" /> Opslaan
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-1/3">Systeem Veld</TableHead>
                                    <TableHead className="w-2/3">Uw Kolom</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {TARGET_FIELDS.map(target => (
                                    <TableRow key={target.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Label className="font-medium text-gray-700">
                                                    {fieldLabels[target.id] || target.label}
                                                    {target.required && <span className="text-red-500 ml-1">*</span>}
                                                </Label>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-6 w-6 p-0 text-gray-400"
                                                    onClick={() => {
                                                        const newLabel = prompt('Voer een nieuwe naam in voor dit veld:', fieldLabels[target.id] || target.label);
                                                        if (newLabel) setFieldLabels(prev => ({ ...prev, [target.id]: newLabel }));
                                                    }}
                                                >
                                                    <Save className="w-3 h-3" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Select
                                                value={mappings[target.systemField] || '_none'}
                                                onValueChange={(val) => updateMapping(target.systemField, val)}
                                            >
                                                <SelectTrigger className={!mappings[target.systemField] && target.required ? 'border-red-300 bg-red-50' : ''}>
                                                    <SelectValue placeholder="Kies een kolom..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="_none">--- Niet importeren ---</SelectItem>
                                                    {headers.map(h => (
                                                        <SelectItem key={h} value={h}>{h}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                    <div className="p-4 border-t bg-gray-50 flex justify-end">
                        <Button onClick={() => validateMappings() && setStep('resolve')}>
                            Volgende <ArrowRight className="ml-2 w-4 h-4" />
                        </Button>
                    </div>
                </Card>
            )}

            {step === 'resolve' && (
                <Card>
                    <CardHeader>
                        <CardTitle>Stap 2: Machines Koppelen</CardTitle>
                        <CardDescription>We hebben een aantal machines gevonden die nog niet in het systeem staan.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {unrecognised.presses.length === 0 ? (
                            <div className="p-8 text-center text-gray-500 bg-gray-50 rounded-xl border-2 border-dashed">
                                <Check className="w-12 h-12 text-green-500 mx-auto mb-3" />
                                <p className="font-medium text-gray-900">Alle machines zijn herkend!</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {unrecognised.presses.map(p => (
                                    <div key={p} className="flex items-center gap-4 p-4 bg-white border rounded-xl shadow-sm">
                                        <div className="flex-1">
                                            <Label className="text-xs uppercase font-bold text-gray-500">Gevonden in CSV</Label>
                                            <div className="font-bold text-lg">{p}</div>
                                        </div>
                                        <ArrowRight className="text-gray-300" />
                                        <div className="flex-[2] space-y-3">
                                            <div className="flex gap-2 bg-gray-100 p-1 rounded-lg w-fit">
                                                <button
                                                    onClick={() => updateResolution('presses', p, { type: 'existing' })}
                                                    className={`px-3 py-1 rounded-md text-xs transition-all ${resolutions.presses[p]?.type === 'existing' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}
                                                >
                                                    Bestaande
                                                </button>
                                                <button
                                                    onClick={() => updateResolution('presses', p, { type: 'new' })}
                                                    className={`px-3 py-1 rounded-md text-xs transition-all ${resolutions.presses[p]?.type === 'new' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}
                                                >
                                                    Nieuw
                                                </button>
                                            </div>
                                            {resolutions.presses[p]?.type === 'existing' ? (
                                                <Select value={resolutions.presses[p].value} onValueChange={(val) => updateResolution('presses', p, { value: val })}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Kies machine..." />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {presses.map(exists => (
                                                            <SelectItem key={exists.id} value={exists.id}>{exists.name}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            ) : (
                                                <Input value={resolutions.presses[p].value} onChange={(e) => updateResolution('presses', p, { value: e.target.value })} placeholder="Systeem naam..." />
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                    <div className="p-4 border-t bg-gray-50 flex justify-between">
                        <Button variant="ghost" onClick={() => setStep('analysis')}>Terug</Button>
                        <Button onClick={() => setStep('preview')}>
                            Preview <ArrowRight className="ml-2 w-4 h-4" />
                        </Button>
                    </div>
                </Card>
            )}

            {step === 'preview' && (
                <div className="space-y-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Stap 3: Preview & Import</CardTitle>
                                <CardDescription>Controleer de data voordat deze definitief wordt geïmporteerd.</CardDescription>
                            </div>
                            <div className="flex gap-2">
                                <Badge variant="outline" className="bg-green-50 text-green-700">
                                    {processedData.filter(d => d.isValid).length} Geldig
                                </Badge>
                                {processedData.some(d => !d.isValid) && (
                                    <Badge variant="destructive">
                                        {processedData.filter(d => !d.isValid).length} Fouten
                                    </Badge>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="p-0 max-h-[500px] overflow-auto">
                            <Table>
                                <TableHeader className="sticky top-0 bg-white shadow-sm z-10">
                                    <TableRow>
                                        <TableHead className="w-10"></TableHead>
                                        <TableHead>Order</TableHead>
                                        <TableHead>Pers</TableHead>
                                        <TableHead>Versie</TableHead>
                                        <TableHead>Netto</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {processedData.map((row, i) => (
                                        <TableRow key={i} className={!row.isValid ? 'bg-red-50' : ''}>
                                            <TableCell>
                                                {row.isValid ? <Check className="w-4 h-4 text-green-500" /> : <AlertCircle className="w-4 h-4 text-red-500" />}
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-medium">DT{row.order_nummer}</div>
                                                <div className="text-xs text-gray-500 truncate max-w-[150px]">{row.klant_order_beschrijving}</div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="bg-blue-50">{row.pressName}</Badge>
                                            </TableCell>
                                            <TableCell>{row.versie}</TableCell>
                                            <TableCell>{row.netto_oplage}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    <div className="flex justify-between items-center p-4 bg-gray-900 rounded-xl text-white">
                        <Button variant="ghost" onClick={() => setStep('resolve')} className="text-white hover:bg-white/10">Terug</Button>
                        <div className="flex items-center gap-6">
                            <div className="text-right">
                                <div className="text-xs text-gray-400 uppercase font-bold">Totaal te importeren</div>
                                <div className="text-xl font-bold">{processedData.filter(d => d.isValid).length} records</div>
                            </div>
                            <Button
                                onClick={handleImport}
                                disabled={isImporting || processedData.filter(d => d.isValid).length === 0}
                                className="bg-blue-600 hover:bg-blue-700 h-10 px-8"
                            >
                                {isImporting ? 'Bezig met importeren...' : 'Nu Importeren'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

