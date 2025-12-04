import { useState } from 'react';
import { PressType } from './AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Plus, Edit, Trash2, Calculator, Check } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from './ui/dialog';
import { Badge } from './ui/badge';
import { Checkbox } from './ui/checkbox';

interface Press {
    id: string;
    name: PressType;
    active: boolean;
    archived: boolean;
}

interface Drukwerk {
    id: string;
    press: PressType;
    name: string;
    description: string;
    date: string;
    time: string;
    status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
}

interface FinishedPrintJob {
    id: string;
    date: string; // YYYY/MM/DD
    datum: string;
    orderNr: string;
    orderName: string;
    version: string;
    pages: number;
    exOmw: string;
    netRun: number;
    startup: boolean;
    c4_4: number;
    c4_0: number;
    c1_0: number;
    c1_1: number;
    c4_1: number;
    maxGross: number;
    green: number;
    red: number;
    performance: string;
}

interface CalculatedField {
    id: string;
    name: string;
    formula: string;
    description?: string;
}

export function Drukwerken({ presses }: { presses: Press[] }) {
    // Get active presses for columns
    const activePresses = presses
        .filter(p => p.active && !p.archived)
        .map(p => p.name);

    // Parameters state - one set per press
    const [parameters, setParameters] = useState<Record<string, Record<string, any>>>(() => {
        const initial: Record<string, Record<string, any>> = {};
        activePresses.forEach(press => {
            initial[press] = {
                marge: 0,
                margePercentage: '4,2',
                opstart: 6000,
                param_4_4: 4000,
                param_4_0: 3000,
                param_1_0: 1500,
                param_1_1: 2000,
                param_4_1: 3500
            };
        });
        return initial;
    });

    // Track which parameters are linked across presses
    const [linkedParams, setLinkedParams] = useState<Record<string, boolean>>({
        marge: false,
        margePercentage: false,
        opstart: false,
        param_4_4: false,
        param_4_0: false,
        param_1_0: false,
        param_1_1: false,
        param_4_1: false
    });

    const handleParameterChange = (press: string, param: string, value: any) => {
        if (linkedParams[param]) {
            // Update all presses
            const updated = { ...parameters };
            activePresses.forEach(p => {
                updated[p] = { ...updated[p], [param]: value };
            });
            setParameters(updated);
        } else {
            // Update only this press
            setParameters({
                ...parameters,
                [press]: {
                    ...parameters[press],
                    [param]: value
                }
            });
        }
    };

    const toggleLink = (param: string) => {
        const newLinked = !linkedParams[param];
        setLinkedParams({ ...linkedParams, [param]: newLinked });

        // If linking, sync all presses to first press value
        if (newLinked && activePresses.length > 0) {
            const firstPressValue = parameters[activePresses[0]][param];
            const updated = { ...parameters };
            activePresses.forEach(press => {
                updated[press] = { ...updated[press], [param]: firstPressValue };
            });
            setParameters(updated);
        }
    };

    const [finishedJobs] = useState<FinishedPrintJob[]>([
        {
            id: '1',
            date: '2025/12/01',
            datum: '01 Dec',
            orderNr: 'ORD-001',
            orderName: 'Magazine Q4',
            version: 'v1',
            pages: 32,
            exOmw: '1000',
            netRun: 5000,
            startup: true,
            c4_4: 32,
            c4_0: 0,
            c1_0: 0,
            c1_1: 0,
            c4_1: 0,
            maxGross: 5500,
            green: 100,
            red: 50,
            performance: '95%'
        },
        {
            id: '2',
            date: '2025/12/02',
            datum: '02 Dec',
            orderNr: 'ORD-002',
            orderName: 'Flyers A5',
            version: 'v1',
            pages: 2,
            exOmw: '5000',
            netRun: 10000,
            startup: false,
            c4_4: 2,
            c4_0: 0,
            c1_0: 0,
            c1_1: 0,
            c4_1: 0,
            maxGross: 10500,
            green: 20,
            red: 10,
            performance: '98%'
        }
    ]);

    const [calculatedFields, setCalculatedFields] = useState<CalculatedField[]>([]);
    const [isFormulaDialogOpen, setIsFormulaDialogOpen] = useState(false);
    const [editingFormula, setEditingFormula] = useState<CalculatedField | null>(null);
    const [formulaName, setFormulaName] = useState('');
    const [currentFormula, setCurrentFormula] = useState('');

    // Available fields for formula builder
    const finishedFields = [
        { key: 'pages', label: 'Pages' },
        { key: 'netRun', label: 'Net Run' },
        { key: 'startup', label: 'Startup' },
        { key: 'c4_4', label: '4/4' },
        { key: 'c4_0', label: '4/0' },
        { key: 'c1_0', label: '1/0' },
        { key: 'c1_1', label: '1/1' },
        { key: 'c4_1', label: '4/1' },
        { key: 'maxGross', label: 'Max Gross' },
        { key: 'green', label: 'Green' },
        { key: 'red', label: 'Red' }
    ];

    const parameterFields = [
        { key: 'Marge', label: 'Marge' },
        { key: 'Opstart', label: 'Opstart' },
        { key: 'param_4_4', label: '4/4' },
        { key: 'param_4_0', label: '4/0' },
        { key: 'param_1_0', label: '1/0' },
        { key: 'param_1_1', label: '1/1' },
        { key: 'param_4_1', label: '4/1' }
    ];

    const operators = ['+', '-', '*', '/', '(', ')'];

    const addToFormula = (value: string) => {
        setCurrentFormula(prev => prev + ' ' + value);
    };

    const evaluateFormula = (formula: string, job: FinishedPrintJob): number | string => {
        try {
            // Replace field names with actual values
            let evalFormula = formula;

            // Replace finished job fields
            finishedFields.forEach(field => {
                const regex = new RegExp(field.key, 'g');
                evalFormula = evalFormula.replace(regex, String(job[field.key as keyof FinishedPrintJob]));
            });

            // Replace parameter fields with placeholder values (for preview)
            evalFormula = evalFormula.replace(/Marge/g, '10');
            evalFormula = evalFormula.replace(/Opstart/g, '100');
            evalFormula = evalFormula.replace(/param_4_4/g, '50');
            evalFormula = evalFormula.replace(/param_4_0/g, '40');
            evalFormula = evalFormula.replace(/param_1_0/g, '30');
            evalFormula = evalFormula.replace(/param_1_1/g, '35');
            evalFormula = evalFormula.replace(/param_4_1/g, '45');

            // Evaluate the formula safely
            const result = Function('"use strict"; return (' + evalFormula + ')')();
            return typeof result === 'number' ? Math.round(result * 100) / 100 : result;
        } catch (error) {
            return 'Error';
        }
    };

    const handleOpenFormulaDialog = (field?: CalculatedField) => {
        if (field) {
            setEditingFormula(field);
            setFormulaName(field.name);
            setCurrentFormula(field.formula);
        } else {
            setEditingFormula(null);
            setFormulaName('');
            setCurrentFormula('');
        }
        setIsFormulaDialogOpen(true);
    };

    const handleSaveFormula = () => {
        if (!formulaName.trim() || !currentFormula.trim()) {
            return;
        }

        if (editingFormula) {
            setCalculatedFields(calculatedFields.map(f =>
                f.id === editingFormula.id
                    ? { ...f, name: formulaName, formula: currentFormula }
                    : f
            ));
        } else {
            const newField: CalculatedField = {
                id: Date.now().toString(),
                name: formulaName,
                formula: currentFormula
            };
            setCalculatedFields([...calculatedFields, newField]);
        }

        setIsFormulaDialogOpen(false);
        setFormulaName('');
        setCurrentFormula('');
        setEditingFormula(null);
    };

    const handleDeleteFormula = (id: string) => {
        setCalculatedFields(calculatedFields.filter(f => f.id !== id));
    };

    const previewResult = finishedJobs.length > 0
        ? evaluateFormula(currentFormula, finishedJobs[0])
        : 'N/A';

    return (
        <div className="space-y-4">
            <Tabs defaultValue="finished" className="w-full">
                <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
                    <TabsTrigger value="finished">Finished</TabsTrigger>
                    <TabsTrigger value="parameters">Parameters</TabsTrigger>
                </TabsList>

                <TabsContent value="finished">
                    <Card>
                        <CardHeader>
                            <CardTitle>Finished Print Jobs</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead colSpan={8} className="text-center bg-blue-100">Data</TableHead>
                                            <TableHead colSpan={6} className="text-center bg-green-100">Wissels</TableHead>
                                            <TableHead colSpan={3} className="text-center bg-yellow-100">Berekening</TableHead>
                                            <TableHead colSpan={1} className="text-center bg-purple-100">Prestatie</TableHead>
                                        </TableRow>
                                        <TableRow>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Datum</TableHead>
                                            <TableHead>Order nr</TableHead>
                                            <TableHead>Order</TableHead>
                                            <TableHead>Versie</TableHead>
                                            <TableHead>Pagina's</TableHead>
                                            <TableHead>ex/omw.</TableHead>
                                            <TableHead>Oplage netto</TableHead>
                                            <TableHead>Opstart</TableHead>
                                            <TableHead>4/4</TableHead>
                                            <TableHead>4/0</TableHead>
                                            <TableHead>1/0</TableHead>
                                            <TableHead>1/1</TableHead>
                                            <TableHead>4/1</TableHead>
                                            <TableHead>Max Bruto</TableHead>
                                            <TableHead>Groen</TableHead>
                                            <TableHead>Rood</TableHead>
                                            <TableHead>Prestatie</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {finishedJobs.map((job) => (
                                            <TableRow key={job.id}>
                                                <TableCell>{job.date}</TableCell>
                                                <TableCell>{job.datum}</TableCell>
                                                <TableCell>{job.orderNr}</TableCell>
                                                <TableCell>{job.orderName}</TableCell>
                                                <TableCell>{job.version}</TableCell>
                                                <TableCell>{job.pages}</TableCell>
                                                <TableCell>{job.exOmw}</TableCell>
                                                <TableCell>{job.netRun}</TableCell>
                                                <TableCell>
                                                    <div className="flex justify-center">
                                                        {job.startup ? <Check className="w-4 h-4 text-green-600" /> : <span className="text-gray-300">-</span>}
                                                    </div>
                                                </TableCell>
                                                <TableCell>{job.c4_4}</TableCell>
                                                <TableCell>{job.c4_0}</TableCell>
                                                <TableCell>{job.c1_0}</TableCell>
                                                <TableCell>{job.c1_1}</TableCell>
                                                <TableCell>{job.c4_1}</TableCell>
                                                <TableCell>{job.maxGross}</TableCell>
                                                <TableCell>{job.green}</TableCell>
                                                <TableCell>{job.red}</TableCell>
                                                <TableCell>{job.performance}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="parameters">
                    <div className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Parameters</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-[200px]">Parameter</TableHead>
                                                <TableHead className="w-[50px] text-center">Link</TableHead>
                                                {activePresses.map(press => (
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
                                                {activePresses.map(press => (
                                                    <TableCell key={press}>
                                                        <div className="flex gap-2">
                                                            <Input
                                                                type="text"
                                                                placeholder="%"
                                                                className="h-8"
                                                                value={parameters[press]?.margePercentage || ''}
                                                                onChange={(e) => handleParameterChange(press, 'margePercentage', e.target.value)}
                                                            />
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
                                                {activePresses.map(press => (
                                                    <TableCell key={press} className="text-center">
                                                        <Input
                                                            type="number"
                                                            className="h-8"
                                                            value={parameters[press]?.opstart || 0}
                                                            onChange={(e) => handleParameterChange(press, 'opstart', Number(e.target.value))}
                                                        />
                                                    </TableCell>
                                                ))}
                                            </TableRow>

                                            {[
                                                { id: 'param_4_4', label: '4/4' },
                                                { id: 'param_4_0', label: '4/0' },
                                                { id: 'param_1_0', label: '1/0' },
                                                { id: 'param_1_1', label: '1/1' },
                                                { id: 'param_4_1', label: '4/1' },
                                            ].map(param => (
                                                <TableRow key={param.id}>
                                                    <TableCell className="font-medium">{param.label}</TableCell>
                                                    <TableCell className="text-center">
                                                        <Checkbox
                                                            checked={linkedParams[param.id]}
                                                            onCheckedChange={() => toggleLink(param.id)}
                                                        />
                                                    </TableCell>
                                                    {activePresses.map(press => (
                                                        <TableCell key={press}>
                                                            <Input
                                                                type="number"
                                                                className="h-8"
                                                                value={parameters[press]?.[param.id] || 0}
                                                                onChange={(e) => handleParameterChange(press, param.id, Number(e.target.value))}
                                                            />
                                                        </TableCell>
                                                    ))}
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                                <div className="mt-4 flex justify-end">
                                    <Button>Save Changes</Button>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle>Calculated Fields</CardTitle>
                                <Button onClick={() => handleOpenFormulaDialog()} className="gap-2">
                                    <Plus className="w-4 h-4" />
                                    Add Formula
                                </Button>
                            </CardHeader>
                            <CardContent>
                                {calculatedFields.length === 0 ? (
                                    <p className="text-gray-500 text-center py-8">
                                        No calculated fields yet. Click "Add Formula" to create one.
                                    </p>
                                ) : (
                                    <div className="space-y-2">
                                        {calculatedFields.map((field) => (
                                            <div key={field.id} className="flex items-center justify-between p-3 border rounded-lg">
                                                <div className="flex-1">
                                                    <div className="font-medium">{field.name}</div>
                                                    <div className="text-sm text-gray-600 font-mono">{field.formula}</div>
                                                    <div className="text-xs text-gray-500 mt-1">
                                                        Preview: {evaluateFormula(field.formula, finishedJobs[0])}
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleOpenFormulaDialog(field)}
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleDeleteFormula(field.id)}
                                                    >
                                                        <Trash2 className="w-4 h-4 text-red-500" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>

            {/* Formula Builder Dialog */}
            <Dialog open={isFormulaDialogOpen} onOpenChange={setIsFormulaDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Calculator className="w-5 h-5" />
                            {editingFormula ? 'Edit Formula' : 'Create Calculated Field'}
                        </DialogTitle>
                        <DialogDescription>
                            Build a formula by clicking on fields, operators, and numbers below.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="formula-name">Field Name *</Label>
                            <Input
                                id="formula-name"
                                placeholder="e.g., Total Cost"
                                value={formulaName}
                                onChange={(e) => setFormulaName(e.target.value)}
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label>Formula</Label>
                            <Input
                                value={currentFormula}
                                onChange={(e) => setCurrentFormula(e.target.value)}
                                placeholder="Type or click fields below to build formula..."
                                className="font-mono"
                            />
                            <div className="p-3 border rounded-md bg-gray-50 min-h-[60px] flex flex-wrap gap-2 items-center">
                                {currentFormula ? (
                                    currentFormula.split(' ').filter(t => t).map((token, idx) => {
                                        const isField = finishedFields.some(f => f.key === token) || parameterFields.some(f => f.key === token);
                                        const isOperator = operators.includes(token);
                                        const isNumber = !isNaN(Number(token)) && token !== '';

                                        if (isField) {
                                            const field = finishedFields.find(f => f.key === token) || parameterFields.find(f => f.key === token);
                                            return (
                                                <Badge key={idx} variant="outline" className="bg-blue-50 border-blue-200">
                                                    {field?.label || token}
                                                </Badge>
                                            );
                                        } else if (isOperator) {
                                            return (
                                                <span key={idx} className="px-2 py-1 bg-gray-200 rounded font-mono text-sm">
                                                    {token}
                                                </span>
                                            );
                                        } else if (isNumber) {
                                            return (
                                                <span key={idx} className="px-2 py-1 bg-green-50 border border-green-200 rounded font-mono text-sm">
                                                    {token}
                                                </span>
                                            );
                                        } else {
                                            return <span key={idx} className="font-mono text-sm">{token}</span>;
                                        }
                                    })
                                ) : (
                                    <span className="text-gray-400 text-sm">Formula will appear here...</span>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentFormula('')}
                                >
                                    Clear
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentFormula(prev => prev.trim().split(' ').slice(0, -1).join(' '))}
                                >
                                    Remove Last
                                </Button>
                            </div>
                        </div>

                        <div className="grid gap-3">
                            <div>
                                <Label className="text-xs text-gray-600">Finished Job Fields</Label>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {finishedFields.map((field) => (
                                        <Badge
                                            key={field.key}
                                            variant="outline"
                                            className="cursor-pointer hover:bg-blue-100"
                                            onClick={() => addToFormula(field.key)}
                                        >
                                            {field.label}
                                        </Badge>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <Label className="text-xs text-gray-600">Parameters</Label>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {parameterFields.map((field) => (
                                        <Badge
                                            key={field.key}
                                            variant="outline"
                                            className="cursor-pointer hover:bg-green-100"
                                            onClick={() => addToFormula(field.key)}
                                        >
                                            {field.label}
                                        </Badge>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <Label className="text-xs text-gray-600">Operators</Label>
                                <div className="flex gap-2 mt-2">
                                    {operators.map((op) => (
                                        <Button
                                            key={op}
                                            variant="outline"
                                            size="sm"
                                            onClick={() => addToFormula(op)}
                                            className="w-10"
                                        >
                                            {op}
                                        </Button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <Label className="text-xs text-gray-600">Number</Label>
                                <div className="flex gap-2 mt-2">
                                    <Input
                                        type="number"
                                        placeholder="Enter number"
                                        className="w-32"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                addToFormula((e.target as HTMLInputElement).value);
                                                (e.target as HTMLInputElement).value = '';
                                            }
                                        }}
                                    />
                                    <span className="text-xs text-gray-500 self-center">Press Enter to add</span>
                                </div>
                            </div>
                        </div>

                        <div className="p-3 border rounded-md bg-blue-50">
                            <div className="text-sm font-medium text-gray-700">Preview Result</div>
                            <div className="text-2xl font-bold text-blue-600 mt-1">
                                {previewResult}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                                Using first job data with sample parameter values
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsFormulaDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSaveFormula} disabled={!formulaName.trim() || !currentFormula.trim()}>
                            {editingFormula ? 'Update Formula' : 'Save Formula'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
