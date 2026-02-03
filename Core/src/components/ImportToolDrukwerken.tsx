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
import { Upload, ArrowRight, Check, AlertCircle, Save, Edit, Filter } from 'lucide-react';
import { toast } from 'sonner';
import Papa from 'papaparse';

const FONT_SIZES = {
    title: "text-lg font-bold",
    header: "text-xs font-bold uppercase tracking-wider",
    body: "text-sm"
};

const COL_WIDTHS = {
    press: '100px',
    date: '100px',
    orderNr: '85px',
    orderName: '220px',
    pages: '65px',
    exOmw: '70px',
    netRun: '110px',
    startup: '65px',
    c4_4: '60px',
    c4_0: '60px',
    c1_0: '60px',
    c1_1: '60px',
    c4_1: '60px',
    maxGross: '90px',
    green: '90px',
    red: '90px',
    delta: '90px',
    deltaPercent: '80px',
    comment: '150px',
    actions: '60px'
};
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from './ui/tooltip';
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
    aliases?: string[];
}

const TARGET_FIELDS: MappingTarget[] = [
    { id: 'press', label: 'Pers', required: true, systemField: 'pers', aliases: ['machine', 'press', 'persnaam'] },
    { id: 'date', label: 'Datum (ISO)', required: false, systemField: 'date', aliases: ['date', 'tijd', 'datum_tijd'] },
    { id: 'datum', label: 'Datum', required: false, systemField: 'datum', aliases: ['datum'] },
    { id: 'orderNr', label: 'Order nr', required: true, systemField: 'order_nummer', aliases: ['ordernr', 'order_nr', 'order_nummer'] },
    { id: 'orderName', label: 'Order Naam', required: true, systemField: 'klant_order_beschrijving', aliases: ['ordernaam', 'order_naam', 'beschrijving', 'klant_order'] },
    { id: 'version', label: 'Versie', required: false, systemField: 'versie', aliases: ['variant', 'version'] },
    { id: 'pages', label: "Pagina's", required: false, systemField: 'blz', aliases: ['blz', 'pag', 'pages', 'pags'] },
    { id: 'exOmw', label: 'ex/Omw', required: false, systemField: 'ex_omw', aliases: ['omw', 'ex-omw', 'omslag'] },
    { id: 'netRun', label: 'Netto', required: false, systemField: 'netto_oplage', aliases: ['netto oplage', 'oplage', 'netrun', 'netto-oplage'] },
    { id: 'startup', label: 'Opstart', required: false, systemField: 'opstart', aliases: ['startup', 'start', 'instellings'] },
    { id: 'c4_4', label: '4/4', required: false, systemField: 'k_4_4', aliases: ['k44', 'c44', '4-4'] },
    { id: 'c4_0', label: '4/0', required: false, systemField: 'k_4_0', aliases: ['k40', 'c40', '4-0'] },
    { id: 'c1_0', label: '1/0', required: false, systemField: 'k_1_0', aliases: ['k10', 'c10', '1-0'] },
    { id: 'c1_1', label: '1/1', required: false, systemField: 'k_1_1', aliases: ['k11', 'c11', '1-1'] },
    { id: 'c4_1', label: '4/1', required: false, systemField: 'k_4_1', aliases: ['k41', 'c41', '4-1'] },
    { id: 'maxGross', label: 'Max', required: false, systemField: 'max_bruto', aliases: ['maximum bruto', 'max bruto', 'bruto', 'max-bruto'] },
    { id: 'green', label: 'Groen', required: false, systemField: 'groen', aliases: ['goed', 'goede', 'green'] },
    { id: 'red', label: 'Rood', required: false, systemField: 'rood', aliases: ['roed', 'fout', 'red', 'foute'] },
    { id: 'delta', label: 'Delta', required: false, systemField: 'delta', aliases: ['verschil', 'delta_number'] },
    { id: 'deltaPercent', label: 'Delta %', required: false, systemField: 'delta_percent', aliases: ['delta_p', 'rendement', 'prestatie'] },
    { id: 'comment', label: 'OPMERKING', required: false, systemField: 'opmerking', aliases: ['opmerkingen', 'remark', 'comments', 'notitie'] },
];

const parseImportDate = (val: any): string | null => {
    if (!val) return null;
    const str = val.toString().trim();

    // Attempt DD-MM-YYYY
    const ddmmyyyy = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
    if (ddmmyyyy) {
        return `${ddmmyyyy[3]}-${ddmmyyyy[2].padStart(2, '0')}-${ddmmyyyy[1].padStart(2, '0')}`;
    }

    // Attempt YYYY-MM-DD
    const yyyymmdd = str.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
    if (yyyymmdd) {
        return `${yyyymmdd[1]}-${yyyymmdd[2].padStart(2, '0')}-${yyyymmdd[3].padStart(2, '0')}`;
    }

    const d = new Date(str);
    if (!isNaN(d.getTime())) {
        return d.toISOString().split('T')[0];
    }

    return str; // Return as is if unparseable
};

export function ImportToolDrukwerken({ onComplete, minimal = false, initialFile, onStepChange }: { onComplete?: () => void, minimal?: boolean, initialFile?: File, onStepChange?: (step: 'upload' | 'analysis' | 'resolve' | 'preview') => void }) {
    const { presses } = useAuth();

    const [csvData, setCsvData] = useState<any[]>([]);
    const [headers, setHeaders] = useState<string[]>([]);
    const [mappings, setMappings] = useState<Record<string, string | null>>({});
    const [step, setStep] = useState<'upload' | 'analysis' | 'resolve' | 'preview'>('upload');
    const [isImporting, setIsImporting] = useState(false);
    const [showOnlyErrors, setShowOnlyErrors] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);
    const [renamedHeaders, setRenamedHeaders] = useState<string[]>([]);

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
        setRenamedHeaders([]);
        const seen = new Set<string>();
        const duplicates = new Set<string>();

        Papa.parse(file, {
            header: true,
            dynamicTyping: false,
            skipEmptyLines: 'greedy',
            delimitersToGuess: [',', '\t', ';', '|', ' '],
            transform: (val) => val?.trim() || val,
            transformHeader: (header) => {
                const h = header.trim();
                if (seen.has(h)) {
                    duplicates.add(h);
                }
                seen.add(h);
                return h;
            },
            complete: (results: Papa.ParseResult<any>) => {
                if (duplicates.size > 0) {
                    setRenamedHeaders(Array.from(duplicates));
                    console.warn("Duplicate headers detected:", Array.from(duplicates));
                }
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
                            const cleanedL = target.label.toLowerCase().trim();
                            const cleanedS = target.systemField.toLowerCase().trim();
                            const cleanedID = target.id.toLowerCase().trim();

                            // Check exact match with label, system field or ID
                            if (cleanedH === cleanedL || cleanedH === cleanedS || cleanedH === cleanedID) return true;

                            // Check aliases
                            if (target.aliases?.some(alias => cleanedH === alias.toLowerCase().trim())) return true;

                            return false;
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

                if (target.systemField === 'date' && val) {
                    val = parseImportDate(val);
                }

                if (target.systemField === 'order_nummer' && val) {
                    const cleaned = val.toString().replace(/\D/g, '');
                    val = parseInt(cleaned, 10) || 0;
                } else if (['netto_oplage', 'max_bruto', 'groen', 'rood'].includes(target.systemField)) {
                    // Stricter cleaning for Print Run / Counts: strip ALL non-digits
                    // This handles "24.022" or "136.026" as "24022" and "136026"
                    if (val !== null && val !== undefined && val !== '') {
                        const cleaned = val.toString().replace(/\D/g, '');
                        val = parseInt(cleaned, 10) || 0;
                    } else {
                        val = 0;
                    }
                } else if (['delta'].includes(target.systemField)) {
                    // For delta, preserve the minus sign but strip other non-digits (thousands separators)
                    if (val !== null && val !== undefined && val !== '') {
                        const cleaned = val.toString().replace(/[^\d-]/g, '');
                        val = parseInt(cleaned, 10) || 0;
                    } else {
                        val = 0;
                    }
                } else if (['ex_omw', 'blz', 'k_4_4', 'k_4_0', 'k_1_0', 'k_1_1', 'k_4_1'].includes(target.systemField) && val) {
                    // Clean numeric strings but keep decimal logic if any (European format)
                    let s = val.toString().trim();
                    // If it contains a comma but no dot, or if the comma is after the last dot, treat it as decimal.
                    // But usually these are just small floats or ints.
                    s = s.replace(/\./g, '').replace(',', '.'); // Remove thousands-dots, swap comma-decimal to dot
                    val = parseFloat(s) || 0;
                }

                if (target.systemField === 'delta_percent' && val) {
                    const s = val.toString().trim();
                    if (s.endsWith('%')) {
                        val = (parseFloat(s.replace('%', '').replace(',', '.')) || 0) / 100;
                    } else {
                        val = parseFloat(s.replace(',', '.')) || 0;
                    }
                }

                if (target.systemField === 'opstart') {
                    // Extremely robust boolean check
                    const s = val?.toString().trim().toLowerCase();
                    val = s === 'true' || s === 'ja' || s === 'yes' || s === '1' || s === 'x' || s === 'v' || s === 'waar' || s === 'j' || s === 'y' || s === 't';
                }

                if (target.systemField === 'datum' && !val && item.date) {
                    // Automatically derive datum if not explicitly mapped but date is present
                    const [y, m, d] = item.date.split('-');
                    if (y && m && d) val = `${d}.${m}.${y}`;
                }
                if (target.systemField === 'date' && !val && item.datum) {
                    // Automatically derive date if not explicitly mapped but datum is present
                    val = parseImportDate(item.datum);
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
                    date: row.date || new Date().toISOString().split('T')[0],
                    datum: row.datum || '',
                    order_nummer: row.order_nummer,
                    klant_order_beschrijving: row.klant_order_beschrijving,
                    versie: row.versie || '',
                    blz: row.blz || 0,
                    ex_omw: row.ex_omw || 0,
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
        } catch (error: any) {
            console.error('Import error:', error);
            const fieldError = Object.entries(error?.data?.data || {}).map(([k, v]: [string, any]) => `${k}: ${v?.message || v}`).join(', ');
            toast.error(`Import fout: ${fieldError || error?.data?.message || error?.message || 'Onbekend'}`);
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
                            <div className="flex items-center gap-2">
                                <Badge variant="outline" className="bg-blue-50 text-blue-700">
                                    {headers.length} Kolommen gevonden
                                </Badge>
                                {renamedHeaders.length > 0 && (
                                    <Badge variant="destructive" className="animate-pulse">
                                        Let op: Dubbele kolommen gedetecteerd
                                    </Badge>
                                )}
                                <Button onClick={saveSettings} variant="outline" size="sm" className="gap-2 ml-4">
                                    <Save className="w-4 h-4" /> Opslaan
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0 space-y-0">
                        {renamedHeaders.length > 0 && (
                            <div className="bg-amber-50 border-b border-amber-200 p-4 flex items-start gap-3 text-amber-800 text-sm">
                                <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                                <div>
                                    <strong>Mogelijke header-botsing:</strong>
                                    <p>De volgende kolommen komen meerdere keren voor: <span className="font-mono font-bold">{renamedHeaders.map(h => h === '' ? '(leeg)' : h).join(', ')}</span>.
                                        Controleer de mapping hieronder zorgvuldig om er zeker van te zijn dat de juiste gegevens worden gekoppeld.</p>
                                </div>
                            </div>
                        )}

                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-1/3 px-6">Systeem Veld</TableHead>
                                    <TableHead className="w-2/3 px-6">Uw Kolom</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {TARGET_FIELDS.map(target => (
                                    <TableRow key={target.id}>
                                        <TableCell className="px-6">
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
                                                    <Edit className="w-3 h-3" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                        <TableCell className="px-6">
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
                                <CardTitle className={FONT_SIZES.title}>Stap 3: Preview & Import</CardTitle>
                                <CardDescription>Controleer de data voordat deze definitief wordt geïmporteerd.</CardDescription>
                            </div>
                            <div className="flex gap-2 items-center">
                                <Button
                                    variant={showOnlyErrors ? "destructive" : "outline"}
                                    size="sm"
                                    onClick={() => setShowOnlyErrors(!showOnlyErrors)}
                                    className="gap-2"
                                >
                                    <Filter className="w-4 h-4" />
                                    {showOnlyErrors ? "Toon Alles" : "Toon Alleen Fouten"}
                                </Button>
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
                        <CardContent className="p-0">
                            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                                <Table className={`table-fixed w-full ${FONT_SIZES.body}`}>
                                    <colgroup>
                                        <col style={{ width: COL_WIDTHS.actions }} />
                                        <col style={{ width: COL_WIDTHS.press }} />
                                        <col style={{ width: COL_WIDTHS.date }} />
                                        <col style={{ width: COL_WIDTHS.orderNr }} />
                                        <col style={{ width: COL_WIDTHS.orderName }} />
                                        <col style={{ width: COL_WIDTHS.pages }} />
                                        <col style={{ width: COL_WIDTHS.exOmw }} />
                                        <col style={{ width: COL_WIDTHS.netRun }} />
                                        <col style={{ width: COL_WIDTHS.startup }} />
                                        <col style={{ width: COL_WIDTHS.c4_4 }} />
                                        <col style={{ width: COL_WIDTHS.c4_0 }} />
                                        <col style={{ width: COL_WIDTHS.c1_0 }} />
                                        <col style={{ width: COL_WIDTHS.c1_1 }} />
                                        <col style={{ width: COL_WIDTHS.c4_1 }} />
                                        <col style={{ width: COL_WIDTHS.maxGross }} />
                                        <col style={{ width: COL_WIDTHS.green }} />
                                        <col style={{ width: COL_WIDTHS.red }} />
                                        <col style={{ width: COL_WIDTHS.delta }} />
                                        <col style={{ width: COL_WIDTHS.deltaPercent }} />
                                        <col style={{ width: COL_WIDTHS.comment }} />
                                    </colgroup>
                                    <TableHeader className="z-20">
                                        <TableRow className="bg-white">
                                            <TableHead className="sticky top-0 bg-gray-100 border-r border-b z-30 h-10"></TableHead>
                                            <TableHead rowSpan={2} className="sticky top-0 text-center bg-gray-100 border-r border-b z-30 h-20">Pers</TableHead>
                                            <TableHead colSpan={6} className="sticky top-0 text-center bg-blue-100 z-30 h-10" style={{ borderRight: '1px solid black' }}>Data</TableHead>
                                            <TableHead colSpan={6} className="sticky top-0 text-center bg-green-100 z-30 h-10" style={{ borderTop: '1px solid black', borderRight: '1px solid black' }}>Wissels</TableHead>
                                            <TableHead colSpan={3} className="sticky top-0 text-center bg-yellow-100 z-30 h-10" style={{ borderTop: '1px solid black', borderRight: '1px solid black' }}>Berekening</TableHead>
                                            <TableHead colSpan={2} className="sticky top-0 text-center bg-purple-100 z-30 h-10" style={{ borderTop: '1px solid black', borderRight: '1px solid black' }}>Prestatie</TableHead>
                                            <TableHead rowSpan={2} className="sticky top-0 text-center bg-gray-100 border-b z-30 h-20">OPMERKING</TableHead>
                                        </TableRow>
                                        <TableRow className="bg-white">
                                            <TableHead className="sticky top-10 bg-gray-100 border-r border-b z-30 h-10"></TableHead>
                                            <TableHead className="sticky top-10 bg-gray-100 border-r border-b z-30 h-10">Datum</TableHead>
                                            <TableHead className="sticky top-10 bg-gray-100 border-r border-b z-30 h-10">Order</TableHead>
                                            <TableHead className="sticky top-10 bg-gray-100 border-r border-b z-30 h-10">Naam</TableHead>
                                            <TableHead className="sticky top-10 bg-gray-100 text-center border-r border-b z-30 h-10">Blz</TableHead>
                                            <TableHead className="sticky top-10 bg-gray-100 text-center border-r border-b z-30 h-10">Ex/Omw</TableHead>
                                            <TableHead className="sticky top-10 bg-gray-100 text-center border-r border-b z-30 h-10">Netto</TableHead>
                                            <TableHead className="sticky top-10 bg-gray-100 text-center border-r border-b z-30 h-10">Start</TableHead>
                                            <TableHead className="sticky top-10 bg-gray-100 text-center border-b z-30 h-10">4/4</TableHead>
                                            <TableHead className="sticky top-10 bg-gray-100 text-center border-b z-30 h-10">4/0</TableHead>
                                            <TableHead className="sticky top-10 bg-gray-100 text-center border-b z-30 h-10">1/0</TableHead>
                                            <TableHead className="sticky top-10 bg-gray-100 text-center border-b z-30 h-10">1/1</TableHead>
                                            <TableHead className="sticky top-10 bg-gray-100 text-center border-r border-b z-30 h-10">4/1</TableHead>
                                            <TableHead className="sticky top-10 bg-gray-100 text-center border-r border-b z-30 h-10">Max</TableHead>
                                            <TableHead className="sticky top-10 bg-gray-100 text-center border-r border-b z-30 h-10">Groen</TableHead>
                                            <TableHead className="sticky top-10 bg-gray-100 text-center border-r border-b z-30 h-10">Rood</TableHead>
                                            <TableHead className="sticky top-10 bg-gray-100 text-center border-r border-b z-30 h-10">Delta</TableHead>
                                            <TableHead className="sticky top-10 bg-gray-100 text-center border-r border-b z-30 h-10">Delta %</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {processedData
                                            .filter(row => !showOnlyErrors || !row.isValid)
                                            .map((row, i) => (
                                                <TableRow key={i} className={`bg-white h-8 hover:bg-gray-100 transition-colors ${!row.isValid ? 'bg-red-50' : ''}`}>
                                                    <TableCell className="p-1 text-center border-r">
                                                        {row.isValid ? (
                                                            <Check className="w-3 h-3 text-green-500 mx-auto" />
                                                        ) : (
                                                            <TooltipProvider>
                                                                <Tooltip>
                                                                    <TooltipTrigger>
                                                                        <AlertCircle className="w-3 h-3 text-red-500 mx-auto" />
                                                                    </TooltipTrigger>
                                                                    <TooltipContent className="bg-red-600 text-white border-none p-2 text-xs">
                                                                        <ul className="list-disc pl-3">
                                                                            {row.errors.map((e: string, idx: number) => <li key={idx}>{e}</li>)}
                                                                        </ul>
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            </TooltipProvider>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="py-1 px-2 font-medium bg-gray-50 border-r text-center truncate" title={row.pressName}>
                                                        {row.pressName || '-'}
                                                    </TableCell>
                                                    <TableCell className="py-1 px-2 border-r">{row.date || '-'}</TableCell>
                                                    <TableCell className="py-1 px-2 border-r">DT{row.order_nummer || '-'}</TableCell>
                                                    <TableCell className="py-1 px-2 border-r truncate" title={row.klant_order_beschrijving}>
                                                        {row.klant_order_beschrijving || '-'}
                                                    </TableCell>
                                                    <TableCell className="text-center py-1 px-1 border-r">{row.blz || 0} blz</TableCell>
                                                    <TableCell className="text-center py-1 px-1 border-r">{row.ex_omw || 0}</TableCell>
                                                    <TableCell className="text-center py-1 px-1 border-r">{row.netto_oplage || 0}</TableCell>
                                                    <TableCell className="text-center py-1 px-1 border-r">
                                                        {row.opstart ? <Check className="w-3 h-3 text-green-600 mx-auto" /> : '-'}
                                                    </TableCell>
                                                    <TableCell className="text-center py-1 px-1">{row.k_4_4 || 0}</TableCell>
                                                    <TableCell className="text-center py-1 px-1">{row.k_4_0 || 0}</TableCell>
                                                    <TableCell className="text-center py-1 px-1">{row.k_1_0 || 0}</TableCell>
                                                    <TableCell className="text-center py-1 px-1">{row.k_1_1 || 0}</TableCell>
                                                    <TableCell className="text-center py-1 px-1 border-r">{row.k_4_1 || 0}</TableCell>
                                                    <TableCell className="text-center py-1 px-1 border-r">{row.max_bruto || 0}</TableCell>
                                                    <TableCell className="text-center py-1 px-1 border-r">{row.groen || 0}</TableCell>
                                                    <TableCell className="text-center py-1 px-1 border-r">{row.rood || 0}</TableCell>
                                                    <TableCell className="text-center py-1 px-1 border-r">{row.delta || 0}</TableCell>
                                                    <TableCell className="text-center py-1 px-1">
                                                        {row.delta_percent ? `${(row.delta_percent * 100).toFixed(1)}%` : '-'}
                                                    </TableCell>
                                                    <TableCell className="py-1 px-2">{row.opmerking || '-'}</TableCell>
                                                </TableRow>
                                            ))}
                                    </TableBody>
                                </Table>
                            </div>
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

