import { useState, useMemo } from 'react';
import { useAuth } from './AuthContext';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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
import { Upload, X, ArrowRight, Check, GripVertical, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import Papa from 'papaparse';

// --- TYPES ---

interface MappingTarget {
    id: string;
    label: string;
    required: boolean;
    systemField: string;
}


const TARGET_FIELDS: MappingTarget[] = [
    { id: 'task', label: 'Groep Naam', required: true, systemField: 'task' },
    { id: 'subtask', label: 'Subtaak Naam', required: true, systemField: 'subtaskName' },
    { id: 'category', label: 'Categorie', required: true, systemField: 'category' },
    { id: 'press', label: 'Machine (Pers)', required: true, systemField: 'press' },
    { id: 'interval', label: 'Interval (Aantal)', required: false, systemField: 'maintenanceInterval' },
    { id: 'unit', label: 'Eenheid (Dagen/Weken/Maanden)', required: false, systemField: 'maintenanceIntervalUnit' },
    { id: 'assigned', label: 'Toegewezen aan', required: false, systemField: 'assignedTo' },
    { id: 'notes', label: 'Opmerkingen', required: false, systemField: 'opmerkingen' },
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
};

// --- COMPONENTS ---

interface SortableHeaderProps {
    id: string;
    label: string;
}

function SortableHeader({ id, label }: SortableHeaderProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 100 : 1,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`flex items-center gap-2 p-2 bg-white border rounded-md shadow-sm mb-2 cursor-default ${isDragging ? 'border-blue-500 ring-2 ring-blue-100' : 'border-gray-200'
                }`}
        >
            <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-gray-400">
                <GripVertical className="h-4 w-4" />
            </div>
            <span className="text-sm font-medium truncate">{label}</span>
        </div>
    );
}

export function ImportTool() {
    const { categories, presses, addTask, addActivityLog, user } = useAuth();

    const [csvData, setCsvData] = useState<any[]>([]);
    const [headers, setHeaders] = useState<string[]>([]);
    const [mappings, setMappings] = useState<Record<string, string | null>>({});
    const [step, setStep] = useState<'upload' | 'analysis' | 'map' | 'preview'>('upload');
    const [isImporting, setIsImporting] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);

    // Drag and drop sensors
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const processFile = (file: File) => {
        Papa.parse(file, {
            header: true,
            dynamicTyping: true,
            skipEmptyLines: 'greedy',
            complete: (results: Papa.ParseResult<any>) => {
                if (results.data && results.data.length > 0) {
                    const rawHeaders = Object.keys(results.data[0]);
                    setHeaders(rawHeaders);
                    setCsvData(results.data);

                    // Smart mapping attempt
                    const initialMappings: Record<string, string | null> = {};
                    TARGET_FIELDS.forEach(target => {
                        const match = rawHeaders.find(h => {
                            const cleanedH = h.toLowerCase().trim();
                            // Expanded matching logic
                            const cleanedL = target.label.toLowerCase();
                            const cleanedS = target.systemField.toLowerCase();

                            // Specific Dutch translations/variations could be added here
                            return cleanedH === cleanedL ||
                                cleanedH === cleanedS ||
                                cleanedH.includes(cleanedL) ||
                                cleanedL.includes(cleanedH);
                        });
                        initialMappings[target.systemField] = match || null;
                    });

                    setMappings(initialMappings);
                    setStep('analysis'); // NEW STEP
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
            if (file.type === 'text/csv' || file.name.endsWith('.csv') || file.name.endsWith('.tsv') || file.type === 'text/tab-separated-values') {
                processFile(file);
            } else {
                toast.error('Gelieve (alleen) een .csv of .tsv bestand te uploaden.');
            }
        }
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over) return;

        const sourceHeader = active.id as string;
        const targetField = over.id as string;

        if (TARGET_FIELDS.some(t => t.systemField === targetField)) {
            setMappings(prev => ({
                ...prev,
                [targetField]: sourceHeader
            }));
        }
    };

    const clearMapping = (field: string) => {
        setMappings(prev => ({ ...prev, [field]: null }));
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

        return csvData.map(row => {
            const item: any = {};
            TARGET_FIELDS.forEach(target => {
                const csvHeader = mappings[target.systemField];
                let val = csvHeader ? row[csvHeader] : null;

                // Custom transformation for units
                if (target.systemField === 'maintenanceIntervalUnit' && val) {
                    const cleaned = val.toLowerCase().trim();
                    val = UNIT_MAPPING[cleaned] || 'months';
                }

                // Custom transformation for numbers
                if (target.systemField === 'maintenanceInterval') {
                    val = parseInt(val) || 1;
                }

                item[target.systemField] = val;
            });

            // Resolve IDs for Category and Press
            const resolvedCategory = categories.find(c => c.name.toLowerCase().trim() === (item.category?.toLowerCase()?.trim() || ''))
                || categories.find(c => c.id === item.category);
            const resolvedPress = presses.find(p => p.name.toLowerCase().trim() === (item.press?.toLowerCase()?.trim() || ''))
                || presses.find(p => p.id === item.press);

            return {
                ...item,
                categoryId: resolvedCategory?.id || '',
                categoryName: resolvedCategory?.name || item.category || 'Onbekend',
                pressId: resolvedPress?.id || '',
                pressName: resolvedPress?.name || item.press || 'Onbekend',
                isValid: !!resolvedCategory && !!resolvedPress
            };
        });
    }, [csvData, mappings, step, categories, presses]);

    const handleImport = async () => {
        const invalidCount = processedData.filter(d => !d.isValid).length;
        if (invalidCount > 0) {
            toast.error(`${invalidCount} rijen hebben ongeldige categorieën of machines.`);
            return;
        }

        setIsImporting(true);
        let successCount = 0;

        try {
            for (const row of processedData) {
                await addTask({
                    task: row.task,
                    taskSubtext: '',
                    subtaskName: row.subtaskName,
                    subtaskSubtext: '',
                    category: row.categoryName,
                    categoryId: row.categoryId,
                    press: row.pressName,
                    pressId: row.pressId,
                    maintenanceInterval: row.maintenanceInterval,
                    maintenanceIntervalUnit: row.maintenanceIntervalUnit || 'months',
                    lastMaintenance: null,
                    nextMaintenance: new Date(),
                    assignedTo: row.assignedTo || '',
                    opmerkingen: row.opmerkingen || '',
                    commentDate: null,
                    sort_order: 0,
                    isGroupTask: false
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
                            <Upload className={`h-12 w-12 mb-4 transition-colors ${isDragOver ? 'text-blue-500' : 'text-gray-400'
                                }`} />
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
                <Card>
                    <CardHeader>
                        <CardTitle>Analyse Voltooid</CardTitle>
                        <CardDescription>We hebben uw bestand succesvol geanalyseerd.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-blue-50 p-4 rounded-lg flex flex-col items-center justify-center text-center">
                                <span className="text-3xl font-bold text-blue-700">{csvData.length}</span>
                                <span className="text-sm text-blue-600 font-medium">Rijen gevonden</span>
                            </div>
                            <div className="bg-green-50 p-4 rounded-lg flex flex-col items-center justify-center text-center">
                                <span className="text-3xl font-bold text-green-700">
                                    {Object.values(mappings).filter(Boolean).length} / {TARGET_FIELDS.length}
                                </span>
                                <span className="text-sm text-green-600 font-medium">Velden automatisch gemapped</span>
                            </div>
                        </div>

                        {headers.length <= 1 && (
                            <div className="bg-red-50 border border-red-200 rounded-md p-4 flex gap-3 text-red-700 items-start">
                                <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="font-bold text-sm">Waarschuwing: Slechts 1 kolom gevonden</h4>
                                    <p className="text-sm mt-1">
                                        Het lijkt erop dat het bestand niet correct is gesplitst.
                                        Controleer of uw CSV komma's (,) gebruikt of uw TSV tabs gebruikt.
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="border rounded-md p-3 bg-gray-50">
                            <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider">Gevonden Kolommen ({headers.length})</p>
                            <div className="flex flex-wrap gap-2">
                                {headers.map(h => (
                                    <Badge key={h} variant="secondary" className="bg-white border-gray-200 text-gray-700 font-normal">
                                        {h}
                                    </Badge>
                                ))}
                            </div>
                        </div>

                        <div className="flex justify-end gap-3">
                            <Button variant="outline" onClick={() => setStep('upload')}>
                                Ander bestand
                            </Button>
                            <Button onClick={() => setStep('map')} className="bg-blue-600 hover:bg-blue-700">
                                {Object.values(mappings).filter(Boolean).length === 0 ? 'Handmatig Mappen' : 'Doorgaan naar Mapping'} <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {step === 'map' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                            <div className="bg-blue-100 text-blue-700 w-6 h-6 rounded-full flex items-center justify-center text-xs">1</div>
                            CSV Kolommen
                        </h3>
                        <p className="text-sm text-gray-500 italic mb-4">
                            Sleep de kolommen vanuit uw CSV naar de juiste systeemvelden aan de rechterkant.
                        </p>

                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                            <SortableContext items={headers} strategy={verticalListSortingStrategy}>
                                <div className="grid grid-cols-2 gap-2 max-h-[400px] overflow-y-auto p-2 border rounded-md bg-white">
                                    {headers.map((header) => (
                                        <SortableHeader key={header} id={header} label={header} />
                                    ))}
                                </div>
                            </SortableContext>
                        </DndContext>
                    </div>

                    <div className="space-y-4">
                        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                            <div className="bg-blue-100 text-blue-700 w-6 h-6 rounded-full flex items-center justify-center text-xs">2</div>
                            Systeem Velden
                        </h3>

                        <div className="space-y-2">
                            {TARGET_FIELDS.map((target) => (
                                <div
                                    key={target.systemField}
                                    id={target.systemField}
                                    className={`flex flex-col gap-1 p-3 border rounded-md transition-all ${mappings[target.systemField]
                                        ? 'border-green-200 bg-green-50/30'
                                        : 'border-gray-200 bg-white'
                                        }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <Label className="flex items-center gap-2">
                                            {target.label}
                                            {target.required && <span className="text-red-500">*</span>}
                                        </Label>

                                        {mappings[target.systemField] && (
                                            <button onClick={() => clearMapping(target.systemField)}>
                                                <X className="h-4 w-4 text-gray-400 hover:text-red-500" />
                                            </button>
                                        )}
                                    </div>

                                    <div className={`mt-2 p-2 rounded border border-dashed flex items-center justify-center text-sm ${mappings[target.systemField]
                                        ? 'border-green-400 bg-white text-green-700 font-medium'
                                        : 'border-gray-200 text-gray-400 italic'
                                        }`}>
                                        {mappings[target.systemField] || 'Sleep kolom hierheen'}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <Button
                            className="w-full mt-4 bg-blue-600 hover:bg-blue-700"
                            onClick={() => validateMappings() && setStep('preview')}
                        >
                            Preview Import <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}

            {step === 'preview' && (
                <div className="space-y-6">
                    <Card>
                        <CardHeader className="bg-gray-50/50 border-b">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Data Preview</CardTitle>
                                    <CardDescription>
                                        Controleer of alle data juist is geïnterpreteerd voordat u importeert.
                                    </CardDescription>
                                </div>
                                <Badge variant="outline" className="bg-white">
                                    {processedData.length} Rijen
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="max-h-[500px] overflow-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Taak (en Groep)</TableHead>
                                            <TableHead>Machine</TableHead>
                                            <TableHead>Categorie</TableHead>
                                            <TableHead>Interval</TableHead>
                                            <TableHead>Toegewezen</TableHead>
                                            <TableHead className="w-10"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {processedData.map((row, idx) => (
                                            <TableRow key={idx} className={!row.isValid ? 'bg-red-50' : ''}>
                                                <TableCell>
                                                    <div className="font-medium text-gray-900">{row.subtaskName}</div>
                                                    <div className="text-xs text-gray-500">Groep: {row.task}</div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={!!row.pressId ? 'secondary' : 'destructive'} className="whitespace-nowrap">
                                                        {row.pressName}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={!!row.categoryId ? 'secondary' : 'destructive'} className="whitespace-nowrap">
                                                        {row.categoryName}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-gray-600">
                                                    {row.maintenanceInterval} {row.maintenanceIntervalUnit}
                                                </TableCell>
                                                <TableCell className="text-gray-600">
                                                    {row.assignedTo || '-'}
                                                </TableCell>
                                                <TableCell>
                                                    {!row.isValid && (
                                                        <AlertCircle className="h-4 w-4 text-red-500" />
                                                    )}
                                                    {row.isValid && <Check className="h-4 w-4 text-green-500" />}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex justify-between items-center bg-blue-50 p-4 rounded-lg border border-blue-100">
                        <div className="flex items-center gap-3">
                            <div className="bg-blue-600 p-2 rounded-full">
                                <Check className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <p className="text-blue-900 font-semibold">Klaar om te importeren</p>
                                <p className="text-blue-700 text-sm">
                                    {processedData.filter(d => d.isValid).length} taken zullen worden toegevoegd.
                                    {processedData.filter(d => !d.isValid).length > 0 && ` ${processedData.filter(d => !d.isValid).length} fouten gevonden.`}
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setStep('map')}>
                                Mapping Aanpassen
                            </Button>
                            <Button
                                onClick={handleImport}
                                disabled={isImporting || processedData.some(d => !d.isValid)}
                                className="bg-blue-600 hover:bg-blue-700 min-w-[120px]"
                            >
                                {isImporting ? 'Importeren...' : 'Start Import'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
