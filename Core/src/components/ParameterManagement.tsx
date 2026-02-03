
import { useState, useEffect, useCallback, useMemo } from 'react';
import { pb, useAuth } from './AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Calculator, Plus, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { FormattedNumberInput } from './ui/FormattedNumberInput';
import { PageHeader } from './PageHeader';
import { formatNumber } from '../utils/formatNumber';
import {
    finishedFields,
    parameterFields,
    operators,
    evaluateFormula,
    CalculatedField,
    FinishedPrintJob
} from '../utils/drukwerken-utils';

interface Press {
    id: string;
    name: string;
    active: boolean;
    archived: boolean;
}

export function ParameterManagement() {
    const { } = useAuth();
    const [presses, setPresses] = useState<Press[]>([]);
    const [parameters, setParameters] = useState<Record<string, Record<string, any>>>({});
    const [linkedParams, setLinkedParams] = useState<Record<string, boolean>>({});
    const [calculatedFields, setCalculatedFields] = useState<CalculatedField[]>([]);
    const [finishedJobs, setFinishedJobs] = useState<FinishedPrintJob[]>([]);

    // Formula Dialog State
    const [isFormulaDialogOpen, setIsFormulaDialogOpen] = useState(false);
    const [editingFormula, setEditingFormula] = useState<CalculatedField | null>(null);
    const [formulaName, setFormulaName] = useState('');
    const [currentFormula, setCurrentFormula] = useState('');
    const [targetColumn, setTargetColumn] = useState<'maxGross' | 'green' | 'red' | 'delta_number' | 'delta_percentage' | undefined>(undefined);

    const activePresses = useMemo(() => presses.filter(p => !p.archived).map(p => p.name), [presses]);

    const fetchPresses = useCallback(async () => {
        console.log("DEBUG: Fetching presses from collection 'persen'...");
        try {
            const records = await pb.collection('persen').getFullList<any>({
                sort: 'naam',
            });
            setPresses(records.map(r => ({
                id: r.id,
                name: r.naam,
                active: r.status !== 'niet actief',
                archived: r.archived || false
            })));
        } catch (error) {
            console.error("Error fetching presses:", error);
        }
    }, []);

    const fetchParameters = useCallback(async () => {
        try {
            const records = await pb.collection('press_parameters').getFullList();
            const paramsMap: Record<string, Record<string, any>> = {};

            // Initialize with active presses and default values
            activePresses.forEach((press: string) => {
                paramsMap[press] = {
                    margePercentage: '4,2',
                    opstart: 6000,
                    param_4_4: 4000,
                    param_4_0: 3000,
                    param_1_0: 1500,
                    param_1_1: 2000,
                    param_4_1: 3500,
                    pressId: presses.find(p => p.name === press)?.id
                };
            });

            records.forEach(record => {
                const press = presses.find(p => p.id === record.press);
                if (press) {
                    paramsMap[press.name] = {
                        ...paramsMap[press.name],
                        id: record.id,
                        margePercentage: record.marge || '4,2',
                        opstart: record.opstart || 6000,
                        param_4_4: record.k_4_4 || 4000,
                        param_4_0: record.k_4_0 || 3000,
                        param_1_0: record.k_1_0 || 1500,
                        param_1_1: record.k_1_1 || 2000,
                        param_4_1: record.k_4_1 || 3500,
                        pressId: press.id
                    };
                }
            });

            setParameters(paramsMap);

            // Fetch linked settings
            const settings = await pb.collection('app_settings').getFirstListItem('key="linked_parameters"').catch(() => null);
            if (settings) {
                setLinkedParams(settings.value || {});
            }
        } catch (error) {
            console.error("Error fetching parameters:", error);
        }
    }, [activePresses, presses]);

    const fetchCalculatedFields = useCallback(async () => {
        try {
            const records = await pb.collection('calculated_fields').getFullList<CalculatedField>({
                sort: 'created',
            });
            setCalculatedFields(records);
        } catch (error) {
            console.error("Error fetching calculated fields:", error);
        }
    }, []);

    const fetchFinishedJobs = useCallback(async () => {
        try {
            const records = await pb.collection('drukwerken').getFullList<FinishedPrintJob>({
                sort: '-date',
                limit: 1
            });
            setFinishedJobs(records);
        } catch (error) {
            console.error("Error fetching finished jobs for preview:", error);
        }
    }, []);

    useEffect(() => {
        fetchPresses();
    }, [fetchPresses]);

    useEffect(() => {
        if (presses.length > 0) {
            fetchParameters();
            fetchCalculatedFields();
            fetchFinishedJobs();
        }
    }, [presses.length, fetchParameters, fetchCalculatedFields, fetchFinishedJobs]);

    const handleParameterChange = async (pressName: string, param: string, value: string | number) => {
        const pressId = presses.find(p => p.name === pressName)?.id;
        if (!pressId) return;

        try {
            const isLinked = linkedParams[param];
            const pressesToUpdate = isLinked ? activePresses : [pressName];

            // Helper to map UI key to DB column
            const mapUiToDb = (uiKey: string): string => {
                const mapping: Record<string, string> = {
                    'margePercentage': 'marge',
                    'param_4_4': 'k_4_4',
                    'param_4_0': 'k_4_0',
                    'param_1_0': 'k_1_0',
                    'param_1_1': 'k_1_1',
                    'param_4_1': 'k_4_1',
                    'opstart': 'opstart'
                };
                return mapping[uiKey] || uiKey;
            };

            const dbColumn = mapUiToDb(param);

            for (const pName of pressesToUpdate) {
                const pId = presses.find(p => p.name === pName)?.id;
                if (!pId) continue;

                const dbData = {
                    press: pId,
                    [dbColumn]: value
                };

                const existing = await pb.collection('press_parameters').getFirstListItem(`press="${pId}"`).catch(() => null);
                if (existing) {
                    await pb.collection('press_parameters').update(existing.id, dbData);
                } else {
                    await pb.collection('press_parameters').create(dbData);
                }
            }

            fetchParameters();
            toast.success(`${param} bijgewerkt`);
        } catch (error) {
            console.error("Error updating parameter:", error);
            toast.error("Fout bij bijwerken parameter");
        }
    };

    const toggleLink = async (param: string) => {
        const newLinked = { ...linkedParams, [param]: !linkedParams[param] };
        setLinkedParams(newLinked);

        try {
            const settings = await pb.collection('app_settings').getFirstListItem('key="linked_parameters"').catch(() => null);
            if (settings) {
                await pb.collection('app_settings').update(settings.id, { value: newLinked });
            } else {
                await pb.collection('app_settings').create({ key: 'linked_parameters', value: newLinked });
            }

            // If linking, sync all presses to the first one's value
            if (newLinked[param] && activePresses.length > 1) {
                const firstPressValue = parameters[activePresses[0]][param];
                for (let i = 1; i < activePresses.length; i++) {
                    await handleParameterChange(activePresses[i], param, firstPressValue);
                }
            }
        } catch (error) {
            console.error("Error updating linked settings:", error);
        }
    };

    const handleOpenFormulaDialog = (field?: CalculatedField) => {
        if (field) {
            setEditingFormula(field);
            setFormulaName(field.name);
            setCurrentFormula(field.formula);
            setTargetColumn(field.targetColumn);
        } else {
            setEditingFormula(null);
            setFormulaName('');
            setCurrentFormula('');
            setTargetColumn(undefined);
        }
        setIsFormulaDialogOpen(true);
    };

    const handleSaveFormula = async () => {
        if (!formulaName.trim() || !currentFormula.trim()) {
            toast.error("Naam and formule zijn verplicht");
            return;
        }

        try {
            const data = {
                name: formulaName,
                formula: currentFormula,
                targetColumn: targetColumn || null
            };

            if (editingFormula) {
                await pb.collection('calculated_fields').update(editingFormula.id, data);
                toast.success("Formule bijgewerkt");
            } else {
                await pb.collection('calculated_fields').create(data);
                toast.success("Formule aangemaakt");
            }

            setIsFormulaDialogOpen(false);
            fetchCalculatedFields();
        } catch (error) {
            console.error("Error saving formula:", error);
            toast.error("Fout bij opslaan formule");
        }
    };

    const handleDeleteFormula = async (id: string) => {
        if (window.confirm("Weet je zeker dat je deze formule wilt verwijderen?")) {
            try {
                await pb.collection('calculated_fields').delete(id);
                toast.success("Formule verwijderd");
                fetchCalculatedFields();
            } catch (error) {
                console.error("Error deleting formula:", error);
                toast.error("Fout bij verwijderen formule");
            }
        }
    };

    const addTokenToFormula = (token: string) => {
        setCurrentFormula(prev => {
            const space = prev && !prev.endsWith(' ') ? ' ' : '';
            return prev + space + token + ' ';
        });
    };

    return (
        <div>
            <PageHeader
                title="Parameters"
                description="Beheer drukwerk parameters en formules"
                icon={Calculator}
                className="mb-2"
            />
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Pers Parameters</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[200px]">Parameter</TableHead>
                                        <TableHead className="w-[50px] text-center">Link</TableHead>
                                        {activePresses.map((press: string) => (
                                            <TableHead key={press} className="text-center min-w-[120px]">{press}</TableHead>
                                        ))}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <TableRow>
                                        <TableCell className="font-medium">Marge</TableCell>
                                        <TableCell className="text-center">
                                            <Checkbox
                                                checked={linkedParams.margePercentage}
                                                onCheckedChange={() => toggleLink('margePercentage')}
                                            />
                                        </TableCell>
                                        {activePresses.map((press: string) => (
                                            <TableCell key={press}>
                                                <div className="flex items-center gap-1">
                                                    <FormattedNumberInput
                                                        placeholder="%"
                                                        className="h-8 text-right"
                                                        decimals={2}
                                                        value={parseFloat((parameters[press]?.margePercentage || '0').replace(',', '.'))}
                                                        onChange={(val) => handleParameterChange(press, 'margePercentage', val !== null ? String(val) : '')}
                                                    />
                                                    <span className="text-xs text-gray-500 font-medium">%</span>
                                                </div>
                                            </TableCell>
                                        ))}
                                    </TableRow>

                                    <TableRow>
                                        <TableCell className="font-medium">Opstart</TableCell>
                                        <TableCell className="text-center">
                                            <Checkbox
                                                checked={linkedParams.opstart}
                                                onCheckedChange={() => toggleLink('opstart')}
                                            />
                                        </TableCell>
                                        {activePresses.map((press: string) => (
                                            <TableCell key={press} className="text-center">
                                                <FormattedNumberInput
                                                    className="h-8"
                                                    value={parameters[press]?.opstart || 0}
                                                    onChange={(val) => handleParameterChange(press, 'opstart', val || 0)}
                                                />
                                            </TableCell>
                                        ))}
                                    </TableRow>

                                    {parameterFields.filter(f => !['Marge', 'Opstart'].includes(f.label)).map(param => (
                                        <TableRow key={param.key}>
                                            <TableCell className="font-medium">{param.label}</TableCell>
                                            <TableCell className="text-center">
                                                <Checkbox
                                                    checked={linkedParams[param.key]}
                                                    onCheckedChange={() => toggleLink(param.key)}
                                                />
                                            </TableCell>
                                            {activePresses.map((press: string) => (
                                                <TableCell key={press}>
                                                    <FormattedNumberInput
                                                        className="h-8"
                                                        value={parameters[press]?.[param.key] || 0}
                                                        onChange={(val) => handleParameterChange(press, param.key, val || 0)}
                                                    />
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Berekende Velden</CardTitle>
                        <Button onClick={() => handleOpenFormulaDialog()} className="gap-2">
                            <Plus className="w-4 h-4" />
                            Nieuwe Formule
                        </Button>
                    </CardHeader>
                    <CardContent>
                        {calculatedFields.length === 0 ? (
                            <p className="text-gray-500 text-center py-8">Geen berekende velden. Klik op "Nieuwe Formule" om er een aan te maken.</p>
                        ) : (
                            <div className="space-y-4">
                                {calculatedFields.map((field) => (
                                    <div key={field.id} className="flex items-center justify-between p-4 border rounded-lg bg-slate-50/50">
                                        <div className="flex-1">
                                            <div className="font-bold text-slate-900">{field.name}</div>
                                            <div className="text-xs font-mono text-slate-500 mt-1">{field.formula}</div>
                                            {field.targetColumn && (
                                                <Badge variant="outline" className="mt-2 bg-blue-50 text-blue-600 border-blue-100 italic">
                                                    Kolom: {field.targetColumn}
                                                </Badge>
                                            )}
                                            <div className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider font-bold">
                                                Preview: {(() => {
                                                    if (finishedJobs.length > 0) {
                                                        const res = evaluateFormula(field.formula, finishedJobs[0], parameters, activePresses);
                                                        if (typeof res === 'number') {
                                                            const isPercentage = field.targetColumn === 'delta_percentage';
                                                            return formatNumber(isPercentage ? res * 100 : res, isPercentage ? 2 : 0) + (isPercentage ? '%' : '');
                                                        }
                                                        return res || '-';
                                                    }
                                                    return 'Geen data';
                                                })()}
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => handleOpenFormulaDialog(field)}>
                                                <Edit className="w-4 h-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleDeleteFormula(field.id)} className="text-red-500 hover:text-red-600 hover:bg-red-50">
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Dialog open={isFormulaDialogOpen} onOpenChange={setIsFormulaDialogOpen}>
                    <DialogContent className="max-w-4xl">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                                <Calculator className="w-5 h-5 text-blue-600" />
                                {editingFormula ? 'Formule Bewerken' : 'Nieuw Berekend Veld'}
                            </DialogTitle>
                            <DialogDescription>Stel een formule samen door op velden en operators te klikken.</DialogDescription>
                        </DialogHeader>

                        <div className="space-y-6 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-slate-700 font-bold uppercase text-[10px] tracking-wider">Veld Naam</Label>
                                    <Input
                                        placeholder="bijv. Totale Kosten"
                                        value={formulaName}
                                        onChange={(e) => setFormulaName(e.target.value)}
                                        className="bg-slate-50 border-slate-200"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-slate-700 font-bold uppercase text-[10px] tracking-wider">Kolom (Optioneel)</Label>
                                    <Select
                                        value={targetColumn || "none"}
                                        onValueChange={(value) => setTargetColumn(value === "none" ? undefined : value as any)}
                                    >
                                        <SelectTrigger className="bg-slate-50 border-slate-200">
                                            <SelectValue placeholder="Toon in kolom..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">Geen (Alleen referentie)</SelectItem>
                                            <SelectItem value="maxGross">Max Bruto</SelectItem>
                                            <SelectItem value="delta_number">Delta Getal</SelectItem>
                                            <SelectItem value="delta_percentage">Delta Percentage</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-slate-700 font-bold uppercase text-[10px] tracking-wider">Formule</Label>
                                <Input
                                    value={currentFormula}
                                    onChange={(e) => setCurrentFormula(e.target.value)}
                                    placeholder="Type of klik hieronder..."
                                    className="font-mono bg-slate-50 border-slate-200"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-widest border-b pb-1">Operators</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {operators.map(op => (
                                            <Button key={op} variant="outline" size="sm" onClick={() => addTokenToFormula(op)} className="font-mono h-8 w-8 p-0 border-slate-200 hover:bg-slate-100 hover:border-slate-300">
                                                {op}
                                            </Button>
                                        ))}
                                        <Button variant="outline" size="sm" onClick={() => setCurrentFormula('')} className="text-red-500 border-red-100 hover:bg-red-50 text-[10px] uppercase font-bold h-8 px-2">
                                            Clear
                                        </Button>
                                    </div>
                                    <div className="mt-4 p-3 bg-blue-50/50 rounded-lg border border-blue-100">
                                        <h4 className="text-[10px] font-black uppercase text-blue-600 tracking-widest mb-2">Veld Preview</h4>
                                        <div className="flex flex-wrap gap-1.5 min-h-[40px]">
                                            {currentFormula.split(' ').filter(t => t).map((token, idx) => {
                                                const field = finishedFields.find(f => f.key === token) || parameterFields.find(f => f.key === token);
                                                if (field) {
                                                    return <Badge key={idx} className="bg-blue-600 text-white border-transparent">{field.label}</Badge>;
                                                }
                                                return <span key={idx} className="font-mono text-sm px-1.5 py-0.5 bg-slate-200 rounded">{token}</span>;
                                            })}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-widest border-b pb-1 mb-2">Drukwerk Velden</h4>
                                        <div className="flex flex-wrap gap-1.5">
                                            {finishedFields.map(field => (
                                                <Badge key={field.key} variant="secondary" className="cursor-pointer hover:bg-slate-300 transition-colors py-1" onClick={() => addTokenToFormula(field.key)}>
                                                    {field.label}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-widest border-b pb-1 mb-2">Parameters</h4>
                                        <div className="flex flex-wrap gap-1.5">
                                            {parameterFields.map(field => (
                                                <Badge key={field.key} variant="outline" className="cursor-pointer hover:bg-blue-50 border-blue-200 text-blue-700 transition-colors py-1" onClick={() => addTokenToFormula(field.key)}>
                                                    {field.label}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6 border-t pt-4">
                            <Button variant="ghost" onClick={() => setIsFormulaDialogOpen(false)} className="uppercase text-[10px] font-bold tracking-widest">Annuleren</Button>
                            <Button onClick={handleSaveFormula} className="bg-blue-600 hover:bg-blue-700 text-white uppercase text-[10px] font-bold tracking-widest px-6 shadow-md shadow-blue-100">
                                Opslaan
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}

