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
import { Upload, ArrowRight, Check, AlertCircle, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import Papa from 'papaparse';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from './ui/select';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from './ui/tooltip';
import { Checkbox } from './ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';

interface MappingTarget {
    id: string;
    label: string;
    required: boolean;
    systemField: string;
}

const TARGET_FIELDS: MappingTarget[] = [
    { id: 'task', label: 'Taak Naam', required: true, systemField: 'task' },
    { id: 'task_subtext', label: 'Taak Subtekst', required: false, systemField: 'taskSubtext' },
    { id: 'subtask', label: 'Subtaak Naam (alleen bij groepen)', required: false, systemField: 'subtaskName' },
    { id: 'subtask_subtext', label: 'Subtaak Subtekst', required: false, systemField: 'subtaskSubtext' },
    { id: 'category', label: 'Categorie', required: true, systemField: 'category' },
    { id: 'press', label: 'Machine/Pers', required: true, systemField: 'press' },
    { id: 'interval', label: 'Herhalingsinterval', required: false, systemField: 'maintenanceInterval' },
    { id: 'unit', label: 'Herhalings-eenheid', required: false, systemField: 'maintenanceIntervalUnit' },
    { id: 'last_date', label: 'Laatste Onderhoud', required: false, systemField: 'lastMaintenance' },
    { id: 'next_date', label: 'Volgende Herinnering', required: false, systemField: 'nextMaintenance' },
    { id: 'assigned', label: 'Toegewezen aan', required: false, systemField: 'assignedTo' },
    { id: 'opmerkingen', label: 'Interne Opmerkingen', required: false, systemField: 'opmerkingen' },
    { id: 'comment', label: 'Laatste Verslag (Tekst)', required: false, systemField: 'comment' },
    { id: 'commentDate', label: 'Datum Laatste Verslag', required: false, systemField: 'commentDate' },
    { id: 'is_external', label: 'Externe Taak', required: false, systemField: 'isExternal' },
];

const UNIT_MAPPING: Record<string, 'days' | 'weeks' | 'months'> = {
    'dag': 'days',
    'dagen': 'days',
    'day': 'days',
    'days': 'days',
    'week': 'weeks',
    'weken': 'weeks',
    'weeks': 'weeks',
    'maand': 'months',
    'maanden': 'months',
    'month': 'months',
    'months': 'months',
    'jaar': 'months', // Map year to months approx? Or irrelevant.
    'year': 'months',
};

export function ImportTool({ onComplete }: { onComplete?: () => void }) {
    const { categories, presses, operators, externalEntities, addTask, addActivityLog, user } = useAuth();

    const [csvData, setCsvData] = useState<any[]>([]);
    const [headers, setHeaders] = useState<string[]>([]);
    const [mappings, setMappings] = useState<Record<string, string | null>>({});
    const [step, setStep] = useState<'upload' | 'analysis' | 'resolve' | 'preview'>('upload');
    const [isImporting, setIsImporting] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);

    // Persistence for field labels (friendly names)
    const [fieldLabels, setFieldLabels] = useState<Record<string, string>>(() => {
        const saved = localStorage.getItem('import_field_labels');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.error("Failed to parse saved field labels", e);
            }
        }
        return Object.fromEntries(TARGET_FIELDS.map(t => [t.id, t.label]));
    });

    // Persistence for mappings (which column maps to which system field)
    const [savedMappings, setSavedMappings] = useState<Record<string, string | null>>(() => {
        const saved = localStorage.getItem('import_column_mappings');
        if (saved) {
            try { return JSON.parse(saved); } catch (e) { console.error("Failed to parse saved mappings", e); }
        }
        return {};
    });

    useEffect(() => {
        localStorage.setItem('import_field_labels', JSON.stringify(fieldLabels));
    }, [fieldLabels]);

    const saveSettings = () => {
        localStorage.setItem('import_column_mappings', JSON.stringify(mappings));
        localStorage.setItem('import_field_labels', JSON.stringify(fieldLabels));
        setSavedMappings(mappings);
        toast.success('Import instellingen succesvol opgeslagen');
    };

    // Grouping State
    const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
    const [rowModifications, setRowModifications] = useState<Record<number, { task: string, subtaskName: string }>>({});
    const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
    const [groupNameInput, setGroupNameInput] = useState('');

    const handleGroupSelected = () => {
        if (!groupNameInput.trim()) return;

        setRowModifications(prev => {
            const next = { ...prev };
            selectedRows.forEach(idx => {
                const row = processedData.find(d => d.originalIndex === idx);
                if (row) {
                    next[idx] = {
                        task: groupNameInput.trim(),
                        subtaskName: row.subtaskName || row.task
                    };
                }
            });
            return next;
        });

        setSelectedRows(new Set());
        setGroupNameInput('');
        setIsGroupDialogOpen(false);
        toast.success(`Taken gegroepeerd als "${groupNameInput}"`);
    };

    const toggleRowSelection = (index: number) => {
        setSelectedRows(prev => {
            const next = new Set(prev);
            if (next.has(index)) next.delete(index);
            else next.add(index);
            return next;
        });
    };

    const parseImportDate = (val: any): Date | null => {
        if (!val) return null;
        const str = val.toString().trim();
        const ddmmyyyy = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
        if (ddmmyyyy) {
            return new Date(parseInt(ddmmyyyy[3]), parseInt(ddmmyyyy[2]) - 1, parseInt(ddmmyyyy[1]));
        }
        const yyyymmdd = str.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
        if (yyyymmdd) {
            return new Date(parseInt(yyyymmdd[1]), parseInt(yyyymmdd[2]) - 1, parseInt(yyyymmdd[3]));
        }
        const d = new Date(str);
        return isNaN(d.getTime()) ? null : d;
    };

    const [resolutions, setResolutions] = useState<{
        categories: Record<string, { type: 'existing' | 'new', value: string }>;
        presses: Record<string, { type: 'existing' | 'new', value: string }>;
        operators: Record<string, { type: 'existing' | 'new' | 'external' | 'ignore', value: string }>;
    }>({ categories: {}, presses: {}, operators: {} });

    const unrecognised = useMemo(() => {
        if (!csvData.length || !mappings.category || !mappings.press) return { categories: [], presses: [], operators: [] };

        const missingCats = new Set<string>();
        const missingPresses = new Set<string>();
        const missingOps = new Set<string>();

        csvData.forEach(row => {
            const catName = row[mappings.category!]?.toString().trim();
            const pressName = row[mappings.press!]?.toString().trim();
            const opName = mappings.assignedTo ? row[mappings.assignedTo!]?.toString().trim() : null;

            if (catName && !categories.some(c => c.name.toLowerCase() === catName.toLowerCase() || c.id === catName)) {
                missingCats.add(catName);
            }
            if (pressName && !presses.some(p => p.name.toLowerCase() === pressName.toLowerCase() || p.id === pressName)) {
                missingPresses.add(pressName);
            }
            if (opName) {
                const names = opName.split(',').map((n: string) => n.trim()).filter(Boolean);
                names.forEach((n: string) => {
                    const exists = [...operators, ...externalEntities].some(o => o.name.toLowerCase() === n.toLowerCase() || o.id === n);
                    if (!exists) missingOps.add(n);
                });
            }
        });

        return {
            categories: Array.from(missingCats),
            presses: Array.from(missingPresses),
            operators: Array.from(missingOps)
        };
    }, [csvData, mappings, categories, presses, operators, externalEntities]);

    useEffect(() => {
        setResolutions(prev => {
            const next = { ...prev };
            unrecognised.categories.forEach(cat => {
                if (!next.categories[cat]) next.categories[cat] = { type: 'new', value: cat };
            });
            unrecognised.presses.forEach(p => {
                if (!next.presses[p]) next.presses[p] = { type: 'new', value: p };
            });
            unrecognised.operators.forEach(op => {
                if (!next.operators[op]) next.operators[op] = { type: 'ignore', value: op };
            });
            return next;
        });
    }, [unrecognised]);

    const updateResolution = (entityType: 'categories' | 'presses' | 'operators', key: string, update: Partial<{ type: any, value: string }>) => {
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
                    TARGET_FIELDS.forEach(target => {
                        const savedCol = savedMappings[target.systemField];
                        if (savedCol && rawHeaders.includes(savedCol)) {
                            initialMappings[target.systemField] = savedCol;
                            return;
                        }
                        const match = rawHeaders.find(h => {
                            const cleanedH = h.toLowerCase().trim();
                            const cleanedL = target.label.toLowerCase();
                            const cleanedS = target.systemField.toLowerCase();
                            return cleanedH === cleanedL || cleanedH === cleanedS || cleanedH.includes(cleanedL) || cleanedL.includes(cleanedH);
                        });
                        initialMappings[target.systemField] = match || null;
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
            if (file.type === 'text/csv' || file.name.endsWith('.csv') || file.name.endsWith('.tsv') || file.type === 'text/tab-separated-values' || file.type === 'application/vnd.ms-excel') {
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

                if (target.systemField === 'maintenanceIntervalUnit' && val) {
                    const cleaned = val.toLowerCase().trim();
                    val = UNIT_MAPPING[cleaned] || 'months';
                }

                if (target.systemField === 'maintenanceInterval') {
                    val = parseInt(val) || 1;
                }

                if ((target.systemField === 'lastMaintenance' || target.systemField === 'nextMaintenance' || target.systemField === 'commentDate') && val) {
                    val = parseImportDate(val);
                }

                if (target.systemField === 'isExternal') {
                    if (val === null || val === undefined) val = false;
                    else {
                        const s = val.toString().toLowerCase().trim();
                        val = s === 'ja' || s === 'yes' || s === 'true' || s === '1' || s === 'x' || s === 'v';
                    }
                }

                item[target.systemField] = val;
            });

            const rawCatName = item.category?.toString().trim();
            const resCat = resolutions.categories[rawCatName];
            const resolvedCategory = resCat?.type === 'existing'
                ? categories.find(c => c.id === resCat.value)
                : categories.find(c => c.name.toLowerCase() === (rawCatName?.toLowerCase() || ''));

            const rawPressName = item.press?.toString().trim();
            const resPress = resolutions.presses[rawPressName];
            const resolvedPress = resPress?.type === 'existing'
                ? presses.find(p => p.id === resPress.value)
                : presses.find(p => p.name.toLowerCase() === (rawPressName?.toLowerCase() || ''));

            const opName = item.assignedTo?.toString().trim();
            const resolvedOpIds: string[] = [];
            const resolvedOpTypes: string[] = [];

            if (opName) {
                const names = opName.split(',').map((n: string) => n.trim()).filter(Boolean);
                names.forEach((n: string) => {
                    const resOp = resolutions.operators[n];
                    if (resOp?.type === 'existing') {
                        if (resOp.value.startsWith('__PENDING__')) {
                            const pendingKey = resOp.value.replace('__PENDING__', '');
                            const pendingRes = resolutions.operators[pendingKey];
                            resolvedOpIds.push(`__PENDING_OP__${pendingKey}`);
                            resolvedOpTypes.push(pendingRes?.type === 'external' ? 'external' : 'operator');
                        } else {
                            resolvedOpIds.push(resOp.value);
                            const isExt = externalEntities.some(e => e.id === resOp.value);
                            resolvedOpTypes.push(isExt ? 'external' : 'operator');
                        }
                    } else if (resOp?.type === 'new' || resOp?.type === 'external') {
                        resolvedOpIds.push(`__NEW_OP__${n}`);
                        resolvedOpTypes.push(resOp.type === 'external' ? 'external' : 'operator');
                    } else if (!resOp && [...operators, ...externalEntities].some(o => o.name.toLowerCase() === n.toLowerCase())) {
                        const existing = [...operators, ...externalEntities].find(o => o.name.toLowerCase() === n.toLowerCase());
                        if (existing) {
                            resolvedOpIds.push(existing.id);
                            resolvedOpTypes.push(externalEntities.some(e => e.id === existing.id) ? 'external' : 'operator');
                        }
                    }
                });
            }

            const errors: string[] = [];
            if (!item.task) errors.push('Groep/Taak Naam ontbreekt');
            if (rawCatName && !resolvedCategory && resCat?.type !== 'new') errors.push(`Categorie '${rawCatName}' niet herkend`);
            if (!rawCatName && !resolvedCategory) errors.push('Categorie ontbreekt');
            if (rawPressName && !resolvedPress && resPress?.type !== 'new') errors.push(`Machine '${rawPressName}' niet herkend`);
            if (!rawPressName && !resolvedPress) errors.push('Machine ontbreekt');

            const mod = rowModifications[index];
            const finalTaskName = mod?.task || item.task;
            const finalSubtaskName = mod?.subtaskName || (item.subtaskName || item.task);

            return {
                ...item,
                originalIndex: index,
                task: finalTaskName,
                subtaskName: finalSubtaskName,
                categoryId: resolvedCategory?.id || (resCat?.type === 'new' ? `__NEW_CAT__${rawCatName}` : ''),
                categoryName: resolvedCategory?.name || (resCat?.type === 'new' ? resCat.value : (item.category || 'Onbekend')),
                pressId: resolvedPress?.id || (resPress?.type === 'new' ? `__NEW_PRESS__${rawPressName}` : ''),
                pressName: resolvedPress?.name || (resPress?.type === 'new' ? resPress.value : (item.press || 'Onbekend')),
                assignedToIds: resolvedOpIds,
                assignedToTypes: resolvedOpTypes,
                isValid: errors.length === 0,
                errors
            };
        });
    }, [csvData, mappings, step, categories, presses, operators, externalEntities, resolutions]);

    const handleImport = async () => {
        const validRows = processedData.filter(d => d.isValid);
        if (validRows.length === 0) {
            toast.error("Geen geldige rijen gevonden om te importeren.");
            return;
        }

        setIsImporting(true);
        let successCount = 0;

        try {
            const catMap: Record<string, string> = {};
            for (const [rawName, res] of Object.entries(resolutions.categories)) {
                if (res.type === 'new') {
                    try {
                        const record = await pb.collection('categorieen').create({ naam: res.value, active: true });
                        catMap[`__NEW_CAT__${rawName}`] = record.id;
                    } catch (err: any) {
                        try {
                            const existing = await pb.collection('categorieen').getFirstListItem(`naam="${res.value}"`);
                            catMap[`__NEW_CAT__${rawName}`] = existing.id;
                        } catch (fetchErr) {
                            console.error(`Failed to create or find category ${res.value}`, err);
                        }
                    }
                }
            }

            const pressMap: Record<string, string> = {};
            for (const [rawName, res] of Object.entries(resolutions.presses)) {
                if (res.type === 'new') {
                    try {
                        const record = await pb.collection('persen').create({ naam: res.value, active: true });
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

            // 1. Identify all unique presses for each new operator in the validRows
            const operatorPressMap: Record<string, Set<string>> = {};
            validRows.forEach(row => {
                if (row.assignedToIds && row.assignedToIds.length > 0) {
                    row.assignedToIds.forEach((id: string) => {
                        if (id.startsWith('__NEW_OP__')) {
                            const opName = id.replace('__NEW_OP__', '');
                            if (!operatorPressMap[opName]) operatorPressMap[opName] = new Set();
                            operatorPressMap[opName].add(row.pressName);
                        }
                    });
                }
            });

            const opMap: Record<string, string> = {};
            for (const [rawName, res] of Object.entries(resolutions.operators)) {
                if (res.type === 'new' || res.type === 'external') {
                    const associatedPresses = Array.from(operatorPressMap[rawName] || []);
                    try {
                        const record = await pb.collection('operatoren').create({
                            naam: res.value,
                            active: true,
                            dienstverband: res.type === 'external' ? 'Extern' : 'Intern',
                            presses: associatedPresses
                        });
                        opMap[rawName] = record.id;
                    } catch (err: any) {
                        try {
                            const existing = await pb.collection('operatoren').getFirstListItem(`naam="${res.value}"`);
                            opMap[rawName] = existing.id;
                        } catch (fetchErr) {
                            console.error(`Failed to create or find operator ${res.value}`, err);
                        }
                    }
                }
            }

            const groupCounts: Record<string, number> = {};
            validRows.forEach(row => {
                const groupKey = `${row.task?.toLowerCase()}|${row.pressId}|${row.categoryId}`;
                groupCounts[groupKey] = (groupCounts[groupKey] || 0) + 1;
            });

            for (const row of validRows) {
                const finalCatId = row.categoryId.startsWith('__NEW_CAT__') ? catMap[row.categoryId] : row.categoryId;
                const finalPressId = row.pressId.startsWith('__NEW_PRESS__') ? pressMap[row.pressId] : row.pressId;
                const finalAssignedToIds = row.assignedToIds.map((id: string) => {
                    if (id.startsWith('__NEW_OP__')) {
                        const opName = id.replace('__NEW_OP__', '');
                        return opMap[opName] || id;
                    }
                    if (id.startsWith('__PENDING_OP__')) {
                        const pendingKey = id.replace('__PENDING_OP__', '');
                        return opMap[pendingKey] || id;
                    }
                    return id;
                });

                const groupKey = `${row.task?.toLowerCase()}|${row.pressId}|${row.categoryId}`;
                const isSingleTask = groupCounts[groupKey] === 1;

                await addTask({
                    task: row.task,
                    taskSubtext: isSingleTask ? '' : (row.taskSubtext || ''),
                    subtaskName: isSingleTask ? row.task : row.subtaskName,
                    subtaskSubtext: isSingleTask ? '' : (row.subtaskSubtext || ''),
                    category: row.categoryName,
                    categoryId: finalCatId,
                    press: row.pressName,
                    pressId: finalPressId,
                    maintenanceInterval: row.maintenanceInterval,
                    maintenanceIntervalUnit: row.maintenanceIntervalUnit || 'months',
                    lastMaintenance: row.lastMaintenance || null,
                    nextMaintenance: row.nextMaintenance || new Date(),
                    assignedTo: row.assignedTo || '',
                    assignedToIds: finalAssignedToIds,
                    assignedToTypes: row.assignedToTypes,
                    opmerkingen: row.opmerkingen || '',
                    comment: row.comment || '',
                    commentDate: row.commentDate || null,
                    sort_order: 0,
                    isGroupTask: !isSingleTask,
                    isExternal: !!row.isExternal
                } as any);
                successCount++;
            }

            addActivityLog({
                user: user?.username || 'Import Tool',
                action: 'Imported',
                entity: 'MaintenanceTask',
                entityId: 'multiple',
                entityName: `Import from CSV`,
                details: `${successCount} taken succesvol geïmporteerd`
            });

            toast.success(`${successCount} taken succesvol geïmporteerd`);
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
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-gray-900 font-bold">Admin Import Tool</h2>
                    <p className="text-gray-600 mt-1">Importeer taken vanuit een spreadsheet (CSV of TSV)</p>
                </div>
                {step !== 'upload' && (
                    <Button variant="ghost" onClick={() => setStep('upload')} className="text-gray-500">
                        Opnieuw beginnen
                    </Button>
                )}
            </div>

            {step === 'upload' && (
                <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className="min-h-[40vh]"
                >
                    <Card className={`border-2 transition-all duration-200 h-full ${isDragOver ? 'border-blue-500 bg-blue-50 border-solid' : 'border-gray-300 bg-gray-50/50 hover:bg-gray-50 border-dashed'
                        }`}>
                        <CardContent className="flex flex-col items-center justify-center py-24 h-full">
                            <Upload className={`h-16 w-16 mb-6 transition-colors ${isDragOver ? 'text-blue-500' : 'text-gray-400'}`} />
                            <CardTitle className="mb-3 text-xl">
                                {isDragOver ? 'Bestand Loslaten' : 'Excel/CSV/TSV Bestand Uploaden'}
                            </CardTitle>
                            <CardDescription className="mb-8 text-center text-base">
                                Sleep uw bestand hierheen of klik om te bladeren.<br />
                                Ondersteunt .csv en .tsv formaten.
                            </CardDescription>
                            <Input
                                type="file"
                                accept=".csv,.tsv,text/csv,text/tab-separated-values"
                                onChange={handleFileUpload}
                                className="hidden"
                                id="csv-upload"
                            />
                            <Label htmlFor="csv-upload">
                                <span className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-md font-medium cursor-pointer transition-colors inline-block text-lg">
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
                                <CardDescription>Koppel uw spreadsheet-kolommen aan de systeem velden</CardDescription>
                            </div>
                            <Button onClick={saveSettings} variant="outline" size="sm" className="gap-2">
                                <Save className="w-4 h-4" /> Instellingen Opslaan
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
                                                <SelectTrigger className={`w-full ${!mappings[target.systemField] && target.required ? 'border-red-300 bg-red-50 text-red-900' : ''}`}>
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
                        <Button
                            onClick={() => {
                                if (validateMappings()) {
                                    setStep('resolve');
                                }
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white gap-2 h-11 px-8"
                        >
                            Volgende Stap <ArrowRight className="w-4 h-4" />
                        </Button>
                    </div>
                </Card>
            )}

            {step === 'resolve' && (
                <Card>
                    <CardHeader className="border-b bg-gray-50/50">
                        <CardTitle className="text-lg">Stap 2: Entiteiten Herkennen</CardTitle>
                        <CardDescription>Koppel onbekende waarden aan bestaande data of maak nieuwe aan</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-6 max-h-[60vh] overflow-y-auto">
                        {unrecognised.categories.length > 0 && (
                            <div className="space-y-3">
                                <h3 className="font-semibold flex items-center gap-2 text-gray-900">
                                    <AlertCircle className="w-4 h-4 text-orange-500" /> Categorieën ({unrecognised.categories.length})
                                </h3>
                                <div className="space-y-2">
                                    {unrecognised.categories.map(cat => (
                                        <div key={cat} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                                            <div className="flex-1 min-w-0">
                                                <span className="text-sm font-medium text-gray-500 block">In bestand:</span>
                                                <span className="text-gray-900 font-semibold truncate block">{cat}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Select
                                                    value={resolutions.categories[cat]?.type || 'new'}
                                                    onValueChange={(val: any) => updateResolution('categories', cat, { type: val })}
                                                >
                                                    <SelectTrigger className="w-[140px] h-9">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="new">Nieuw maken</SelectItem>
                                                        <SelectItem value="existing">Koppelen aan...</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                {resolutions.categories[cat]?.type === 'existing' && (
                                                    <Select
                                                        value={resolutions.categories[cat]?.value || ''}
                                                        onValueChange={(val) => updateResolution('categories', cat, { value: val })}
                                                    >
                                                        <SelectTrigger className="w-[180px] h-9">
                                                            <SelectValue placeholder="Kies..." />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {categories.map(c => (
                                                                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                )}
                                                {resolutions.categories[cat]?.type === 'new' && (
                                                    <Input
                                                        value={resolutions.categories[cat]?.value || ''}
                                                        onChange={(e) => updateResolution('categories', cat, { value: e.target.value })}
                                                        className="w-[180px] h-9"
                                                        placeholder="Naam..."
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {unrecognised.presses.length > 0 && (
                            <div className="space-y-3">
                                <h3 className="font-semibold flex items-center gap-2 text-gray-900">
                                    <AlertCircle className="w-4 h-4 text-orange-500" /> Machine/Persen ({unrecognised.presses.length})
                                </h3>
                                <div className="space-y-2">
                                    {unrecognised.presses.map(p => (
                                        <div key={p} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                                            <div className="flex-1 min-w-0">
                                                <span className="text-sm font-medium text-gray-500 block">In bestand:</span>
                                                <span className="text-gray-900 font-semibold truncate block">{p}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Select
                                                    value={resolutions.presses[p]?.type || 'new'}
                                                    onValueChange={(val: any) => updateResolution('presses', p, { type: val })}
                                                >
                                                    <SelectTrigger className="w-[140px] h-9">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="new">Nieuw maken</SelectItem>
                                                        <SelectItem value="existing">Koppelen aan...</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                {resolutions.presses[p]?.type === 'existing' && (
                                                    <Select
                                                        value={resolutions.presses[p]?.value || ''}
                                                        onValueChange={(val) => updateResolution('presses', p, { value: val })}
                                                    >
                                                        <SelectTrigger className="w-[180px] h-9">
                                                            <SelectValue placeholder="Kies..." />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {presses.map(pr => (
                                                                <SelectItem key={pr.id} value={pr.id}>{pr.name}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                )}
                                                {resolutions.presses[p]?.type === 'new' && (
                                                    <Input
                                                        value={resolutions.presses[p]?.value || ''}
                                                        onChange={(e) => updateResolution('presses', p, { value: e.target.value })}
                                                        className="w-[180px] h-9"
                                                        placeholder="Naam..."
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {unrecognised.operators.length > 0 && (
                            <div className="space-y-3">
                                <h3 className="font-semibold flex items-center gap-2 text-gray-900">
                                    <AlertCircle className="w-4 h-4 text-orange-500" /> Personeel ({unrecognised.operators.length})
                                </h3>
                                <div className="space-y-2">
                                    {unrecognised.operators.map(op => (
                                        <div key={op} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                                            <div className="flex-1 min-w-0">
                                                <span className="text-sm font-medium text-gray-500 block">In bestand:</span>
                                                <span className="text-gray-900 font-semibold truncate block">{op}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Select
                                                    value={resolutions.operators[op]?.type || 'ignore'}
                                                    onValueChange={(val: any) => updateResolution('operators', op, { type: val })}
                                                >
                                                    <SelectTrigger className="w-[160px] h-9">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="ignore">Niet importeren</SelectItem>
                                                        <SelectItem value="new">Nieuw (Intern)</SelectItem>
                                                        <SelectItem value="external">Nieuw (Extern)</SelectItem>
                                                        <SelectItem value="existing">Koppelen aan...</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                {resolutions.operators[op]?.type === 'existing' && (
                                                    <Select
                                                        value={resolutions.operators[op]?.value || ''}
                                                        onValueChange={(val) => updateResolution('operators', op, { value: val })}
                                                    >
                                                        <SelectTrigger className="w-[180px] h-9">
                                                            <SelectValue placeholder="Kies..." />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="_header" className="font-bold border-b bg-gray-50">Intern Personeel</SelectItem>
                                                            {operators.map(o => (
                                                                <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                                                            ))}
                                                            <SelectItem value="_header_ext" className="font-bold border-b bg-gray-50 mt-2">Extern / Derden</SelectItem>
                                                            {externalEntities.map(e => (
                                                                <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                                                            ))}
                                                            <SelectItem value="_header_pnd" className="font-bold border-b bg-gray-50 mt-2">Nieuw bij deze import</SelectItem>
                                                            {Object.entries(resolutions.operators)
                                                                .filter(([name, res]) => name !== op && (res.type === 'new' || res.type === 'external'))
                                                                .map(([name]) => (
                                                                    <SelectItem key={name} value={`__PENDING__${name}`}>{name}</SelectItem>
                                                                ))}
                                                        </SelectContent>
                                                    </Select>
                                                )}
                                                {(resolutions.operators[op]?.type === 'new' || resolutions.operators[op]?.type === 'external') && (
                                                    <Input
                                                        value={resolutions.operators[op]?.value || ''}
                                                        onChange={(e) => updateResolution('operators', op, { value: e.target.value })}
                                                        className="w-[180px] h-9"
                                                        placeholder="Naam..."
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {unrecognised.categories.length === 0 && unrecognised.presses.length === 0 && unrecognised.operators.length === 0 && (
                            <div className="py-12 text-center">
                                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Check className="w-8 h-8 text-green-600" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900">Alles Herkend!</h3>
                                <p className="text-gray-500">Alle entiteiten in uw bestand komen overeen met bestaande data.</p>
                            </div>
                        )}
                    </CardContent>
                    <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
                        <Button variant="outline" onClick={() => setStep('analysis')} className="h-11 px-8">Vorige</Button>
                        <Button onClick={() => setStep('preview')} className="bg-blue-600 hover:bg-blue-700 text-white gap-2 h-11 px-8">
                            Gekozen Opties Bevestigen <ArrowRight className="w-4 h-4" />
                        </Button>
                    </div>
                </Card>
            )}

            {step === 'preview' && (
                <div className="space-y-4">
                    <Card>
                        <CardHeader className="border-b bg-gray-50/50">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                    <CardTitle className="text-lg">Stap 3: Voorbeeld & Controle</CardTitle>
                                    <CardDescription>
                                        Controleer de data voordat u deze definitief importeert.
                                        ({processedData.filter(d => d.isValid).length} geldig, {processedData.filter(d => !d.isValid).length} ongeldig)
                                    </CardDescription>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={selectedRows.size === 0}
                                        onClick={() => setIsGroupDialogOpen(true)}
                                        className="gap-2 border-blue-200 text-blue-700 hover:bg-blue-50"
                                    >
                                        Geselecteerde Taken Groeperen ({selectedRows.size})
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0 overflow-x-auto max-h-[50vh]">
                            <Table>
                                <TableHeader className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                                    <TableRow>
                                        <TableHead className="w-[40px] px-2 text-center">
                                            <Checkbox
                                                checked={selectedRows.size === processedData.length && processedData.length > 0}
                                                onCheckedChange={(checked) => {
                                                    if (checked) {
                                                        setSelectedRows(new Set(processedData.map(d => d.originalIndex)));
                                                    } else {
                                                        setSelectedRows(new Set());
                                                    }
                                                }}
                                            />
                                        </TableHead>
                                        <TableHead className="w-[150px]">Status</TableHead>
                                        <TableHead className="min-w-[200px]">Taak (Groep)</TableHead>
                                        <TableHead className="min-w-[150px]">Subtaak</TableHead>
                                        <TableHead className="w-[120px]">Machine</TableHead>
                                        <TableHead className="w-[120px]">Categorie</TableHead>
                                        <TableHead className="w-[120px]">Interval</TableHead>
                                        <TableHead className="w-[120px]">Laatste Datum</TableHead>
                                        <TableHead className="w-[150px]">Toegewezen</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {processedData.map((row) => (
                                        <TableRow
                                            key={row.originalIndex}
                                            className={row.isValid ? (selectedRows.has(row.originalIndex) ? 'bg-blue-50/50' : '') : 'bg-red-50/50'}
                                        >
                                            <TableCell className="px-2 text-center">
                                                {row.isValid && (
                                                    <Checkbox
                                                        checked={selectedRows.has(row.originalIndex)}
                                                        onCheckedChange={() => toggleRowSelection(row.originalIndex)}
                                                    />
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {row.isValid ? (
                                                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 gap-1 font-medium">
                                                        <Check className="w-3 h-3" /> Gereed
                                                    </Badge>
                                                ) : (
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 gap-1 cursor-help font-medium">
                                                                    <X className="w-3 h-3" /> Fout ({row.errors.length})
                                                                </Badge>
                                                            </TooltipTrigger>
                                                            <TooltipContent className="bg-white border-red-200 text-red-900 p-3 shadow-xl max-w-xs">
                                                                <p className="font-bold mb-1">Verbeter de volgende punten:</p>
                                                                <ul className="list-disc pl-4 space-y-1">
                                                                    {row.errors.map((e: string, i: number) => <li key={i}>{e}</li>)}
                                                                </ul>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                )}
                                            </TableCell>
                                            <TableCell className="max-w-[250px]">
                                                <div className="font-medium text-gray-900 truncate">
                                                    {row.task}
                                                    {rowModifications[row.originalIndex] && (
                                                        <Badge variant="outline" className="ml-1 text-[10px] bg-blue-50 text-blue-600 h-4">Gewijzigd</Badge>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="max-w-[150px] truncate text-gray-500 italic">
                                                {row.subtaskName}
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap font-medium">{row.pressName}</TableCell>
                                            <TableCell className="whitespace-nowrap">{row.categoryName}</TableCell>
                                            <TableCell className="whitespace-nowrap">{row.maintenanceInterval} {row.maintenanceIntervalUnit}</TableCell>
                                            <TableCell className="whitespace-nowrap tabular-nums">
                                                {row.lastMaintenance ? row.lastMaintenance.toLocaleDateString() : '-'}
                                            </TableCell>
                                            <TableCell className="text-sm text-gray-600">
                                                {row.assignedTo || <span className="text-gray-300 italic">Geen</span>}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                        <div className="p-6 border-t bg-gray-50 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="text-sm text-gray-500">
                                <span className="font-bold text-gray-900">{processedData.filter(d => d.isValid).length}</span> taken worden toegevoegd.
                            </div>
                            <div className="flex items-center gap-3 w-full sm:w-auto">
                                <button
                                    onClick={handleImport}
                                    disabled={isImporting || !processedData.some(d => d.isValid)}
                                    className={`h-12 px-8 rounded-md font-bold text-base shadow-md transition-all active:scale-95 w-full sm:w-auto flex items-center justify-center order-1 sm:order-2 ${isImporting || !processedData.some(d => d.isValid)
                                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                                        }`}
                                >
                                    {isImporting ? 'BEZIG MET IMPORT...' : 'START IMPORT NU'}
                                </button>
                                <Button variant="ghost" onClick={() => setStep('resolve')} className="text-blue-700 hover:bg-blue-100/50 font-semibold w-full sm:w-auto order-2 sm:order-1">
                                    Koppelingen Aanpassen
                                </Button>
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            <Dialog open={isGroupDialogOpen} onOpenChange={setIsGroupDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Geselecteerde Taken Groeperen</DialogTitle>
                        <DialogDescription>
                            Voer een naam in voor deze groep. De geselecteerde taken ({selectedRows.size}) worden samengevoegd onder deze taaknaam. De originele taaknaam wordt gebruikt als subtaak.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Input
                            value={groupNameInput}
                            onChange={(e) => setGroupNameInput(e.target.value)}
                            placeholder="Naam van de nieuwe groep..."
                            className="font-medium"
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsGroupDialogOpen(false)}>Annuleren</Button>
                        <Button onClick={handleGroupSelected} disabled={!groupNameInput.trim()} className="bg-blue-600 text-white">
                            Groeperen
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
