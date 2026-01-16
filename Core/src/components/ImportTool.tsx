import React, { useState, useMemo } from 'react';
import { useAuth, pb, MaintenanceTask } from './AuthContext';
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

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: Error | null }> {
    constructor(props: { children: React.ReactNode }) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error("ImportTool Error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="p-4 border border-red-500 bg-red-50 rounded text-red-700">
                    <h2 className="font-bold">Something went wrong in ImportTool</h2>
                    <pre className="mt-2 text-sm">{this.state.error?.message}</pre>
                </div>
            );
        }

        return (
            <TooltipProvider>
                {this.props.children}
            </TooltipProvider>
        );
    }
}

function ImportToolContent() {
    const { categories, presses, operators, externalEntities, addTask, addActivityLog, user, tasks, updateTask, fetchTasks } = useAuth();

    const [csvData, setCsvData] = useState<any[]>([]);
    const [headers, setHeaders] = useState<string[]>([]);
    const [mappings, setMappings] = useState<Record<string, string | null>>({});
    const [step, setStep] = useState<'upload' | 'analysis' | 'resolve' | 'preview'>('upload');
    const [isImporting, setIsImporting] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);
    const [isRecalculating, setIsRecalculating] = useState(false);

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

    React.useEffect(() => {
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
                // Find original values to use as fallback
                const row = processedData.find(d => d.originalIndex === idx);
                if (row) {
                    next[idx] = {
                        task: groupNameInput.trim(),
                        subtaskName: row.subtaskName || row.task // Preserve existing subtask or use old task name
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
        // Try DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
        const ddmmyyyy = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
        if (ddmmyyyy) {
            return new Date(parseInt(ddmmyyyy[3]), parseInt(ddmmyyyy[2]) - 1, parseInt(ddmmyyyy[1]));
        }
        // Try YYYY-MM-DD
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

    // Update resolutions when unrecognised items change
    React.useEffect(() => {
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
                        // 1. Try saved mapping first
                        const savedCol = savedMappings[target.systemField];
                        if (savedCol && rawHeaders.includes(savedCol)) {
                            initialMappings[target.systemField] = savedCol;
                            return;
                        }

                        // 2. Fuzzy match fallback
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
                        // Check if it's a reference to another pending operator
                        if (resOp.value.startsWith('__PENDING__')) {
                            const pendingKey = resOp.value.replace('__PENDING__', '');
                            const pendingRes = resolutions.operators[pendingKey];
                            // Mark as pending - will be resolved in handleImport after creation
                            resolvedOpIds.push(`__PENDING_OP__${pendingKey}`);
                            resolvedOpTypes.push(pendingRes?.type === 'external' ? 'external' : 'operator');
                        } else {
                            resolvedOpIds.push(resOp.value);
                            const isExt = externalEntities.some(e => e.id === resOp.value);
                            resolvedOpTypes.push(isExt ? 'external' : 'operator');
                        }
                    } else if (resOp?.type === 'new' || resOp?.type === 'external') {
                        // Will be created during import - use placeholder
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
            // Note: subtask is NOT required - single tasks use task name as subtask automatically
            if (rawCatName && !resolvedCategory && resCat?.type !== 'new') errors.push(`Categorie '${rawCatName}' niet herkend`);
            if (!rawCatName && !resolvedCategory) errors.push('Categorie ontbreekt');
            if (rawPressName && !resolvedPress && resPress?.type !== 'new') errors.push(`Machine '${rawPressName}' niet herkend`);
            if (!rawPressName && !resolvedPress) errors.push('Machine ontbreekt');

            if (!rawPressName && !resolvedPress) errors.push('Machine ontbreekt');

            // Apply manual modifications
            const mod = rowModifications[index];
            const finalTaskName = mod?.task || item.task;
            const finalSubtaskName = mod?.subtaskName || (item.subtaskName || item.task); // If grouped, fallback to task name as subtask

            return {
                ...item,
                originalIndex: index,
                task: finalTaskName,
                subtaskName: finalSubtaskName,
                // Adjust subtask subtext if needed? (Usually stays same)
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

            const opMap: Record<string, string> = {};
            for (const [rawName, res] of Object.entries(resolutions.operators)) {
                if (res.type === 'new') {
                    try {
                        const record = await pb.collection('operatoren').create({ naam: res.value, active: true, dienstverband: 'Intern' });
                        opMap[rawName] = record.id;
                    } catch (err: any) {
                        try {
                            const existing = await pb.collection('operatoren').getFirstListItem(`naam="${res.value}"`);
                            opMap[rawName] = existing.id;
                        } catch (fetchErr) {
                            console.error(`Failed to create or find operator ${res.value}`, err);
                        }
                    }
                } else if (res.type === 'external') {
                    try {
                        const record = await pb.collection('operatoren').create({ naam: res.value, active: true, dienstverband: 'Extern' });
                        opMap[rawName] = record.id;
                    } catch (err: any) {
                        try {
                            const existing = await pb.collection('operatoren').getFirstListItem(`naam="${res.value}"`);
                            opMap[rawName] = existing.id;
                        } catch (fetchErr) {
                            console.error(`Failed to create or find external entity ${res.value}`, err);
                        }
                    }
                }
            }

            // Count occurrences of each group name to determine single vs grouped tasks
            // Use lowercase for case-insensitive grouping
            const groupCounts: Record<string, number> = {};
            validRows.forEach(row => {
                const groupKey = `${row.task?.toLowerCase()}|${row.pressId}|${row.categoryId}`;
                groupCounts[groupKey] = (groupCounts[groupKey] || 0) + 1;
            });

            for (const row of validRows) {
                const finalCatId = row.categoryId.startsWith('__NEW_CAT__') ? catMap[row.categoryId] : row.categoryId;
                const finalPressId = row.pressId.startsWith('__NEW_PRESS__') ? pressMap[row.pressId] : row.pressId;

                const finalAssignedToIds = row.assignedToIds.map((id: string) => {
                    // Handle __NEW_OP__ placeholders (operators being created by name)
                    if (id.startsWith('__NEW_OP__')) {
                        const opName = id.replace('__NEW_OP__', '');
                        return opMap[opName] || id;
                    }
                    // Handle __PENDING_OP__ placeholders (references to other pending operators)
                    if (id.startsWith('__PENDING_OP__')) {
                        const pendingKey = id.replace('__PENDING_OP__', '');
                        return opMap[pendingKey] || id;
                    }
                    return id;
                });

                // Determine if this is a single task (group appears only once)
                // Use lowercase for case-insensitive matching
                const groupKey = `${row.task?.toLowerCase()}|${row.pressId}|${row.categoryId}`;
                const isSingleTask = groupCounts[groupKey] === 1;

                await addTask({
                    task: row.task,
                    taskSubtext: isSingleTask ? '' : (row.taskSubtext || ''),
                    // For single tasks: subtaskName = task (no subtask concept)
                    // For grouped tasks: use the subtaskName from CSV
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
                    isGroupTask: !isSingleTask
                } as any);
                successCount++;
            }

            addActivityLog({
                user: user?.username || 'Admin',
                action: 'Imported',
                entity: 'MaintenanceTask',
                entityId: 'multiple',
                entityName: `Import from CSV`,
                details: `${successCount} taken succesvol geïmporteerd`
            });

            toast.success(`${successCount} taken succesvol geïmporteerd`);
            setStep('upload');
            setCsvData([]);
        } catch (error) {
            console.error('Import error:', error);
            toast.error('Er is een fout opgetreden bij de import.');
        } finally {
            setIsImporting(false);
        }
    };

    const handleRecalculateDates = async () => {
        if (!confirm('Dit zal alle geplande datums herberekenen op basis van de laatste onderhoudsdatum. Dit corrigeert foutieve "Vandaag" datums door de import. Weet u het zeker?')) return;

        setIsRecalculating(true);
        let count = 0;
        try {
            const updates: Promise<void>[] = [];

            for (const group of tasks) {
                for (const sub of group.subtasks) {
                    if (sub.lastMaintenance && sub.maintenanceInterval) {
                        const last = new Date(sub.lastMaintenance);
                        const unit = (sub.maintenanceIntervalUnit || '').toLowerCase();
                        const interval = sub.maintenanceInterval;

                        const expected = new Date(last);
                        if (unit.includes('maand') || unit.includes('month') || unit === 'months') {
                            expected.setMonth(expected.getMonth() + interval);
                        } else if (unit.includes('week') || unit.includes('weeks')) {
                            expected.setDate(expected.getDate() + (interval * 7));
                        } else {
                            expected.setDate(expected.getDate() + interval);
                        }

                        // Check diff
                        const current = sub.nextMaintenance ? new Date(sub.nextMaintenance) : new Date();
                        const diff = Math.abs(current.getTime() - expected.getTime());

                        if (diff > 86400000) { // > 1 day difference
                            const taskToUpdate: MaintenanceTask = {
                                id: sub.id,
                                task: group.taskName,
                                taskSubtext: group.taskSubtext,
                                subtaskName: sub.subtaskName,
                                subtaskSubtext: sub.subtext,
                                category: group.category,
                                categoryId: group.categoryId,
                                press: group.press,
                                pressId: group.pressId,
                                lastMaintenance: sub.lastMaintenance,
                                nextMaintenance: expected,
                                maintenanceInterval: sub.maintenanceInterval,
                                maintenanceIntervalUnit: sub.maintenanceIntervalUnit,
                                assignedTo: sub.assignedTo,
                                assignedToIds: sub.assignedToIds || [],
                                assignedToTypes: sub.assignedToTypes || [],
                                opmerkingen: sub.opmerkingen || '',
                                comment: sub.comment || '',
                                commentDate: sub.commentDate,
                                sort_order: sub.sort_order || 0,
                                created: new Date().toISOString(),
                                updated: new Date().toISOString()
                            };

                            updates.push(updateTask(taskToUpdate, false));
                            count++;
                        }
                    }
                }
            }

            if (updates.length > 0) {
                await Promise.all(updates);
                await fetchTasks();
                toast.success(`${count} datums succesvol hersteld.`);
            } else {
                toast.info('Geen datums hoeven te worden aangepast.');
            }

        } catch (e) {
            console.error(e);
            toast.error('Fout bij herstel.');
        } finally {
            setIsRecalculating(false);
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
                >
                    <Card className={`border-dashed border-2 transition-all duration-200 ${isDragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-gray-50/50 hover:bg-gray-50'
                        }`}>
                        <CardContent className="flex flex-col items-center justify-center py-12">
                            <Upload className={`h-12 w-12 mb-4 transition-colors ${isDragOver ? 'text-blue-500' : 'text-gray-400'}`} />
                            <CardTitle className="mb-2">
                                {isDragOver ? 'Bestand Loslaten' : 'Excel/CSV/TSV Bestand Uploaden'}
                            </CardTitle>
                            <CardDescription className="mb-6 text-center">
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
                                <span className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium cursor-pointer transition-colors inline-block">
                                    Bestand Selecteren
                                </span>
                            </Label>
                        </CardContent>
                    </Card>
                </div>
            )}

            {step === 'analysis' && (
                <Card className="max-w-4xl mx-auto">
                    <CardHeader>
                        <CardTitle>Import Analyse & Mapping</CardTitle>
                        <CardDescription>
                            We hebben {csvData.length} rijen gevonden. Controleer hieronder de koppelingen tussen uw bestand en het systeem.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0 flex flex-col max-h-[75vh]">
                        <div className="p-6 pb-2 space-y-6 flex-1 overflow-hidden flex flex-col">
                            <div className="border rounded-lg overflow-auto flex-1 bg-white">
                                <Table>
                                    <TableHeader className="bg-gray-50 sticky top-0 z-10">
                                        <TableRow>
                                            <TableHead className="w-[35%]">Veld Naam (Bewerkbaar)</TableHead>
                                            <TableHead className="w-[30%]">CSV Kolom</TableHead>
                                            <TableHead className="w-[35%]">Data Preview</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {TARGET_FIELDS.map(field => {
                                            const mappedCol = mappings[field.systemField];
                                            const isMapped = !!mappedCol;
                                            const isRequired = field.required;
                                            const previewValues = mappedCol
                                                ? csvData.slice(0, 3).map(row => row[mappedCol]).join(', ')
                                                : '';

                                            return (
                                                <TableRow key={field.id}>
                                                    <TableCell>
                                                        <div className="space-y-1">
                                                            <div className="flex items-center gap-2">
                                                                <Input
                                                                    value={fieldLabels[field.id]}
                                                                    onChange={(e) => setFieldLabels(prev => ({ ...prev, [field.id]: e.target.value }))}
                                                                    className="h-8 font-medium bg-transparent border-gray-200 hover:border-gray-300 focus:bg-white transition-colors"
                                                                />
                                                                {isMapped ? (
                                                                    <Check className="h-4 w-4 text-green-500 shrink-0" />
                                                                ) : isRequired && (
                                                                    <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                                                                )}
                                                            </div>
                                                            <span className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold px-1">
                                                                {isRequired ? <span className="text-red-400">Verplicht</span> : 'Optioneel'}
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Select
                                                            value={mappedCol && mappedCol.trim() !== '' ? mappedCol : '_none'}
                                                            onValueChange={(val) => updateMapping(field.systemField, val)}
                                                        >
                                                            <SelectTrigger className={`w-full h-8 ${!mappedCol && isRequired ? 'border-red-200 bg-red-50/30' : ''}`}>
                                                                <SelectValue placeholder="Kies kolom..." />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="_none" className="text-gray-400 italic">-- overslaan --</SelectItem>
                                                                {headers.filter(h => h && typeof h === 'string' && h.trim() !== '').map(h => (
                                                                    <SelectItem key={h} value={h}>{h}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </TableCell>
                                                    <TableCell>
                                                        {mappedCol ? (
                                                            <div className="text-[11px] text-gray-400 font-mono bg-gray-50/50 p-1.5 rounded truncate max-w-[200px]" title={previewValues}>
                                                                {previewValues}{csvData.length > 3 && '...'}
                                                            </div>
                                                        ) : (
                                                            <span className="text-[11px] text-gray-300 italic">Geen selectie</span>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>

                        <div className="p-4 bg-gray-100/50 border-t flex justify-between items-center shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                            <div className="flex gap-2">
                                <Button variant="ghost" onClick={() => setStep('upload')} className="text-gray-500 hover:text-gray-700">Annuleren</Button>
                                <Button variant="outline" onClick={saveSettings} className="bg-white text-blue-600 border-blue-200 hover:bg-blue-50 h-9 font-semibold">
                                    <Save className="w-4 h-4 mr-2" /> Instellingen Opslaan
                                </Button>
                            </div>
                            <div className="flex items-center gap-4">
                                {TARGET_FIELDS.some(t => t.required && !mappings[t.systemField]) && (
                                    <span className="text-sm text-red-600 font-bold bg-white px-3 py-1 rounded-full border border-red-100 animate-pulse">Map alle verplichte velden</span>
                                )}
                                <Button
                                    onClick={() => {
                                        saveSettings();
                                        if (validateMappings()) setStep('resolve');
                                    }}
                                    disabled={TARGET_FIELDS.some(t => t.required && !mappings[t.systemField])}
                                    className="bg-blue-600 hover:bg-blue-700 h-10 px-8 shadow-lg transition-all active:scale-95 font-bold"
                                >
                                    Opslaan & Doorgaan <ArrowRight className="ml-2 h-5 w-5" />
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {step === 'resolve' && (
                <Card className="max-w-4xl mx-auto">
                    <CardHeader>
                        <CardTitle>Onbekende Entiteiten Koppelen</CardTitle>
                        <CardDescription>De volgende items zijn niet gevonden in het systeem. Kies hoe u ze wilt verwerken.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0 flex flex-col max-h-[75vh]">
                        <div className="p-6 pb-2 space-y-8 flex-1 overflow-auto bg-gray-50/30">
                            {/* Categories */}
                            {unrecognised.categories.length > 0 && (
                                <div className="space-y-4">
                                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                        <div className="bg-orange-100 text-orange-700 w-6 h-6 rounded-full flex items-center justify-center text-xs">1</div>
                                        Nieuwe Categorieën ({unrecognised.categories.length})
                                    </h3>
                                    <div className="space-y-3">
                                        {unrecognised.categories.map(cat => (
                                            <div key={cat} className="flex items-center gap-4 p-3 bg-white rounded-lg border shadow-sm">
                                                <span className="font-medium text-gray-700 flex-1">{cat}</span>
                                                <div className="flex items-center gap-2">
                                                    <Select value={resolutions.categories[cat]?.type} onValueChange={(val) => updateResolution('categories', cat, { type: val as any })}>
                                                        <SelectTrigger className="w-[180px] h-9"><SelectValue /></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="new" className="text-blue-600 font-medium">Nieuw aanmaken</SelectItem>
                                                            <SelectItem value="existing">Bestaande koppelen</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    {resolutions.categories[cat]?.type === 'existing' ? (
                                                        <Select value={resolutions.categories[cat]?.value} onValueChange={(val) => updateResolution('categories', cat, { value: val })}>
                                                            <SelectTrigger className="w-[200px] h-9"><SelectValue placeholder="Kies..." /></SelectTrigger>
                                                            <SelectContent>
                                                                {categories.filter(c => c.id && c.id.trim() !== '').map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                                            </SelectContent>
                                                        </Select>
                                                    ) : (
                                                        <Input value={resolutions.categories[cat]?.value} onChange={(e) => updateResolution('categories', cat, { value: e.target.value })} className="w-[200px] h-9" placeholder="Systeemnaam..." />
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Presses */}
                            {unrecognised.presses.length > 0 && (
                                <div className="space-y-4">
                                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                        <div className="bg-orange-100 text-orange-700 w-6 h-6 rounded-full flex items-center justify-center text-xs">2</div>
                                        Nieuwe Machines/Persen ({unrecognised.presses.length})
                                    </h3>
                                    <div className="space-y-3">
                                        {unrecognised.presses.map(p => (
                                            <div key={p} className="flex items-center gap-4 p-3 bg-white rounded-lg border shadow-sm">
                                                <span className="font-medium text-gray-700 flex-1">{p}</span>
                                                <div className="flex items-center gap-2">
                                                    <Select value={resolutions.presses[p]?.type} onValueChange={(val) => updateResolution('presses', p, { type: val as any })}>
                                                        <SelectTrigger className="w-[180px] h-9"><SelectValue /></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="new" className="text-blue-600 font-medium">Nieuw aanmaken</SelectItem>
                                                            <SelectItem value="existing">Bestaande koppelen</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    {resolutions.presses[p]?.type === 'existing' ? (
                                                        <Select value={resolutions.presses[p]?.value} onValueChange={(val) => updateResolution('presses', p, { value: val })}>
                                                            <SelectTrigger className="w-[200px] h-9"><SelectValue placeholder="Kies..." /></SelectTrigger>
                                                            <SelectContent>
                                                                {presses.filter(pr => pr.id && pr.id.trim() !== '').map(pr => <SelectItem key={pr.id} value={pr.id}>{pr.name}</SelectItem>)}
                                                            </SelectContent>
                                                        </Select>
                                                    ) : (
                                                        <Input value={resolutions.presses[p]?.value} onChange={(e) => updateResolution('presses', p, { value: e.target.value })} className="w-[200px] h-9" placeholder="Systeemnaam..." />
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Operators */}
                            {unrecognised.operators.length > 0 && (
                                <div className="space-y-4">
                                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                        <div className="bg-orange-100 text-orange-700 w-6 h-6 rounded-full flex items-center justify-center text-xs">3</div>
                                        Nieuwe Operatoren ({unrecognised.operators.length})
                                    </h3>
                                    <div className="space-y-3">
                                        {unrecognised.operators.map(op => (
                                            <div key={op} className="flex items-center gap-4 p-3 bg-white rounded-lg border shadow-sm">
                                                <span className="font-medium text-gray-700 flex-1">{op}</span>
                                                <div className="flex items-center gap-2">
                                                    <Select value={resolutions.operators[op]?.type} onValueChange={(val) => updateResolution('operators', op, { type: val as any })}>
                                                        <SelectTrigger className="w-[180px] h-9"><SelectValue /></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="ignore">Negeren / Leeg laten</SelectItem>
                                                            <SelectItem value="new" className="text-blue-600 font-medium">Nieuw aanmaken (Intern)</SelectItem>
                                                            <SelectItem value="external" className="text-purple-600 font-medium">Nieuw aanmaken (Extern)</SelectItem>
                                                            <SelectItem value="existing">Bestaande koppelen</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    {resolutions.operators[op]?.type === 'existing' ? (
                                                        <Select value={resolutions.operators[op]?.value} onValueChange={(val) => updateResolution('operators', op, { value: val })}>
                                                            <SelectTrigger className="w-[200px] h-9"><SelectValue placeholder="Kies..." /></SelectTrigger>
                                                            <SelectContent>
                                                                {/* Existing operators and external entities */}
                                                                {[...operators, ...externalEntities].filter(o => o.id && o.id.trim() !== '').map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                                                                {/* Pending new operators from current session (for reuse with duplicates) */}
                                                                {Object.entries(resolutions.operators)
                                                                    .filter(([key, res]) => key !== op && (res.type === 'new' || res.type === 'external') && res.value)
                                                                    .map(([key, res]) => (
                                                                        <SelectItem key={`pending-${key}`} value={`__PENDING__${key}`} className="text-blue-600">
                                                                            {res.value} (nieuw)
                                                                        </SelectItem>
                                                                    ))
                                                                }
                                                            </SelectContent>
                                                        </Select>
                                                    ) : resolutions.operators[op]?.type === 'new' || resolutions.operators[op]?.type === 'external' ? (
                                                        <Input value={resolutions.operators[op]?.value} onChange={(e) => updateResolution('operators', op, { value: e.target.value })} className="w-[200px] h-9" placeholder="Systeemnaam..." />
                                                    ) : (
                                                        <div className="w-[200px] text-xs text-gray-400 italic text-center">Veld blijft leeg</div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {unrecognised.categories.length === 0 && unrecognised.presses.length === 0 && unrecognised.operators.length === 0 && (
                                <div className="text-center py-12 bg-green-50 rounded-lg border border-green-100 border-dashed">
                                    <Check className="h-10 w-10 text-green-500 mx-auto mb-2" />
                                    <p className="text-green-700 font-medium">Alle items herkend!</p>
                                    <p className="text-green-600 text-sm">U kunt door naar de preview om te importeren.</p>
                                </div>
                            )}
                        </div>

                        <div className="p-4 bg-gray-100/50 border-t flex justify-between items-center shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                            <Button variant="ghost" onClick={() => setStep('analysis')} className="text-gray-500 hover:text-gray-700">Terug naar Mapping</Button>
                            <Button onClick={() => setStep('preview')} className="bg-blue-600 hover:bg-blue-700 h-10 px-8 shadow-lg transition-all active:scale-95 font-bold">
                                Naar Preview & Import <ArrowRight className="ml-2 h-5 w-5" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {step === 'preview' && (
                <div className="pb-32">
                    <Card className="shadow-xl max-w-6xl mx-auto">
                        <CardHeader className="bg-gray-50/50 border-b flex-none">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Data Preview & Validatie</CardTitle>
                                    <CardDescription>Controleer de data. Ongeldige rijen worden automatisch overgeslagen bij import.</CardDescription>
                                </div>
                                <div className="flex gap-2 items-center">
                                    {selectedRows.size > 0 && (
                                        <div className="flex items-center gap-2 mr-4 bg-blue-100 px-3 py-1 rounded-md animate-in fade-in">
                                            <span className="text-sm font-medium text-blue-700">{selectedRows.size} geselecteerd</span>
                                            <Button size="sm" onClick={() => setIsGroupDialogOpen(true)} className="h-7 text-xs bg-blue-600 hover:bg-blue-700">
                                                Groeperen
                                            </Button>
                                            <Button size="sm" variant="ghost" onClick={() => setSelectedRows(new Set())} className="h-7 w-7 p-0 text-blue-700 hover:text-blue-900 hover:bg-blue-200">
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    )}
                                    <Badge variant="outline" className="bg-white px-3 py-1">{processedData.length} Totaal</Badge>
                                    <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200">
                                        {processedData.filter(d => d.isValid).length} Geldig
                                    </Badge>
                                    {processedData.some(d => !d.isValid) && (
                                        <Badge variant="destructive" className="bg-red-100 text-red-700 border-red-200">
                                            {processedData.filter(d => !d.isValid).length} Fouten
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        </CardHeader>

                        {/* Main Scrollable Content */}
                        <CardContent className="flex-1 overflow-y-auto min-h-0 p-0">
                            {/* Group by category for MaintenanceTable-like display */}
                            {(() => {
                                // Group data by category
                                const groupedByCategory: Record<string, typeof processedData> = {};
                                processedData.forEach(row => {
                                    const catKey = row.categoryName || 'Onbekend';
                                    if (!groupedByCategory[catKey]) groupedByCategory[catKey] = [];
                                    groupedByCategory[catKey].push(row);
                                });

                                return Object.entries(groupedByCategory).map(([categoryName, rows]) => {
                                    // Further group by task name within each category
                                    const groupedByTask: Record<string, typeof rows> = {};
                                    rows.forEach(row => {
                                        const taskKey = row.task?.toLowerCase() || 'Onbekend';
                                        if (!groupedByTask[taskKey]) groupedByTask[taskKey] = [];
                                        groupedByTask[taskKey].push(row);
                                    });

                                    return (
                                        <div key={categoryName} className="border-b last:border-b-0">
                                            {/* Category Header */}
                                            <div className="bg-gray-100 px-4 py-2 flex items-center gap-3 sticky top-0 z-10">
                                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                                <span className="font-semibold text-gray-800">{categoryName}</span>
                                                <Badge variant="outline" className="text-xs">{rows.length} taken</Badge>
                                            </div>

                                            {/* Task Groups within Category */}
                                            {Object.entries(groupedByTask).map(([taskKey, taskRows]) => {
                                                const isGrouped = taskRows.length > 1;
                                                const firstRow = taskRows[0];
                                                const hasErrors = taskRows.some(r => !r.isValid);

                                                return (
                                                    <div key={taskKey} className={`border-l-4 ${hasErrors ? 'border-l-red-300' : 'border-l-transparent'}`}>
                                                        {/* Group Header (if multiple subtasks) */}
                                                        {isGrouped && (
                                                            <div className="bg-gray-50 px-4 py-2 flex items-center justify-between">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-5 h-5 bg-blue-100 text-blue-600 rounded flex items-center justify-center text-xs font-bold">
                                                                        {taskRows.length}
                                                                    </div>
                                                                    <span className="font-medium text-gray-700">{firstRow.task}</span>
                                                                    {firstRow.taskSubtext && (
                                                                        <span className="text-xs text-gray-400">{firstRow.taskSubtext}</span>
                                                                    )}
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <Badge variant="secondary" className="text-xs">{firstRow.pressName}</Badge>
                                                                    {hasErrors && <AlertCircle className="h-4 w-4 text-red-500" />}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Subtask Rows */}
                                                        {taskRows.map((row, idx) => (
                                                            <div
                                                                key={idx}
                                                                className={`px-4 py-2 flex items-center justify-between border-b border-gray-100 last:border-b-0 ${!row.isValid ? 'bg-red-50/50' : 'hover:bg-gray-50/50'
                                                                    } ${isGrouped ? 'pl-2' : ''}`}
                                                            >
                                                                {/* Selection Checkbox */}
                                                                <div className="pr-3 flex items-center">
                                                                    <Checkbox
                                                                        checked={selectedRows.has(row.originalIndex)}
                                                                        onCheckedChange={() => toggleRowSelection(row.originalIndex)}
                                                                    />
                                                                </div>

                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center gap-2">
                                                                        {!isGrouped && (
                                                                            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full flex-shrink-0"></div>
                                                                        )}
                                                                        <span className={`font-medium text-gray-900 truncate ${isGrouped ? 'text-sm' : ''}`}>
                                                                            {isGrouped ? row.subtaskName : row.task}
                                                                        </span>
                                                                        {row.subtaskSubtext && (
                                                                            <span className="text-xs text-gray-400 truncate">{row.subtaskSubtext}</span>
                                                                        )}
                                                                    </div>
                                                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 mt-1.5 text-xs text-gray-500">
                                                                        <div title="Machine" className="truncate">🏭 {row.pressName}</div>
                                                                        <div title="Interval" className="truncate">⏱️ {row.maintenanceInterval} {row.maintenanceIntervalUnit}</div>
                                                                        <div title="Toegewezen aan" className="truncate">👤 {row.assignedTo || '-'}</div>
                                                                        <div title="Vorige" className="truncate text-gray-400">📅 Vorige: {row.lastMaintenance ? row.lastMaintenance.toLocaleDateString('nl-NL') : '-'}</div>
                                                                        <div title="Volgende" className="truncate font-medium text-blue-600">📅 Volgende: {row.nextMaintenance ? row.nextMaintenance.toLocaleDateString('nl-NL') : '-'}</div>
                                                                        {row.comment && <div className="col-span-2 truncate" title={`Laatste verslag: ${row.comment}`}>💬 {row.comment}</div>}
                                                                        {row.opmerkingen && <div className="col-span-2 truncate text-amber-700 bg-amber-50 px-1 rounded inline-block" title={`Opmerking: ${row.opmerkingen}`}>📝 {row.opmerkingen}</div>}
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-3 flex-shrink-0">
                                                                    {!row.isValid ? (
                                                                        <Tooltip>
                                                                            <TooltipTrigger asChild>
                                                                                <div className="bg-red-100 p-1 rounded-full cursor-help">
                                                                                    <AlertCircle className="h-4 w-4 text-red-600" />
                                                                                </div>
                                                                            </TooltipTrigger>
                                                                            <TooltipContent side="left" className="bg-white border-red-100 text-red-700 p-3 shadow-xl max-w-[250px]">
                                                                                <div className="font-bold mb-2 flex items-center gap-2">
                                                                                    <AlertCircle className="h-4 w-4" /> Validatiefouten:
                                                                                </div>
                                                                                <ul className="list-disc list-inside text-xs space-y-1">
                                                                                    {(row.errors as string[]).map((err: string, i: number) => <li key={i}>{err}</li>)}
                                                                                </ul>
                                                                            </TooltipContent>
                                                                        </Tooltip>
                                                                    ) : (
                                                                        <Check className="h-4 w-4 text-green-500" />
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                });
                            })()}
                        </CardContent>

                        {/* Static Footer inside Flex Container */}
                        <div className="flex-none p-4 bg-blue-50/80 border-t flex flex-col sm:flex-row justify-between items-center shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] rounded-b-lg gap-4 sm:gap-0">
                            <div className="flex items-center gap-3 w-full sm:w-auto">
                                {processedData.some(d => d.isValid) ? (
                                    <>
                                        <div className="bg-blue-600 p-2.5 rounded-full shadow-lg flex-shrink-0"><Check className="h-5 w-5 text-white" /></div>
                                        <div className="flex-1 sm:flex-auto">
                                            <p className="text-blue-900 font-bold leading-tight">Ready voor Import</p>
                                            <p className="text-blue-700 text-xs font-medium">
                                                {processedData.filter(d => d.isValid).length} records worden toegevoegd.
                                                {processedData.some(d => !d.isValid) && ` (${processedData.filter(d => !d.isValid).length} overgeslagen)`}
                                            </p>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="bg-red-500 p-2.5 rounded-full shadow-lg flex-shrink-0"><X className="h-5 w-5 text-white" /></div>
                                        <div className="flex-1 sm:flex-auto">
                                            <p className="text-red-900 font-bold leading-tight">Geen geldige rijen</p>
                                            <p className="text-red-700 text-xs font-medium">Controleer de mapping en onbekende items.</p>
                                        </div>
                                    </>
                                )}
                            </div>
                            <div className="flex gap-4 w-full sm:w-auto flex-col sm:flex-row items-center">
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
            )
            }

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

            <div className="mt-12 border-t pt-8 pb-8">
                <Card className="border-orange-200 bg-orange-50">
                    <CardHeader>
                        <CardTitle className="text-orange-800">Database Tools</CardTitle>
                        <CardDescription className="text-orange-700">
                            Hulpmiddelen voor database correctie en onderhoud.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-medium text-orange-900">Planning Herberekenen</h3>
                                <p className="text-sm text-orange-700 mt-1">
                                    Herstel foutieve "Vandaag" datums door de import.
                                    Dit berekent de volgende datum opnieuw op basis van "Laatste Onderhoud" + "Interval".
                                </p>
                            </div>
                            <Button
                                onClick={handleRecalculateDates}
                                disabled={isRecalculating}
                                variant="outline"
                                className="border-orange-300 text-orange-800 hover:bg-orange-100 bg-white"
                            >
                                {isRecalculating ? 'Bezig...' : 'Datums Herstellen'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div >
    );
}

export function ImportTool() {
    return (
        <ErrorBoundary>
            <ImportToolContent />
        </ErrorBoundary>
    );
}
