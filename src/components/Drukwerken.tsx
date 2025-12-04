import { useState } from 'react';
import { PressType } from './AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Plus, Edit, Trash2, Calculator, Check, Save, Search, ArrowUp, ArrowDown } from 'lucide-react';
import { formatNumber } from '../utils/formatNumber';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

interface Press {
    id: string;
    name: PressType;
    active: boolean;
    archived: boolean;
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
    targetColumn?: 'maxGross' | 'green' | 'red';
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

    // Helper to get formula for a specific column
    const getFormulaForColumn = (col: 'maxGross' | 'green' | 'red') => calculatedFields.find(f => f.targetColumn === col);

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

    const [finishedJobs, setFinishedJobs] = useState<FinishedPrintJob[]>([
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

    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
        key: 'date',
        direction: 'desc'
    });
    const [searchQuery, setSearchQuery] = useState('');
    const [searchField, setSearchField] = useState('all');

    const handleSort = (key: string) => {
        setSortConfig(current => ({
            key,
            direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const getSortIcon = (key: string) => {
        if (sortConfig.key !== key) return null;
        return sortConfig.direction === 'asc'
            ? <ArrowUp className="w-4 h-4 ml-1 text-blue-600" />
            : <ArrowDown className="w-4 h-4 ml-1 text-blue-600" />;
    };

    const filteredJobs = finishedJobs.filter(job => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        if (searchField === 'all') {
            return Object.values(job).some(val => String(val).toLowerCase().includes(query));
        }
        return String(job[searchField as keyof FinishedPrintJob]).toLowerCase().includes(query);
    });

    const sortedJobs = [...filteredJobs].sort((a, b) => {
        const aValue = (a as any)[sortConfig.key];
        const bValue = (b as any)[sortConfig.key];

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });

    const [newJob, setNewJob] = useState<Omit<FinishedPrintJob, 'id'>>({
        date: new Date().toISOString().split('T')[0].replace(/-/g, '/'),
        datum: '',
        orderNr: '',
        orderName: '',
        version: '',
        pages: 0,
        exOmw: '',
        netRun: 0,
        startup: false,
        c4_4: 0,
        c4_0: 0,
        c1_0: 0,
        c1_1: 0,
        c4_1: 0,
        maxGross: 0,
        green: 0,
        red: 0,
        performance: ''
    });

    const handleAddJob = () => {
        // Calculate values for fields that have formulas
        const calculatedMaxGross = getFormulaForColumn('maxGross')
            ? (typeof evaluateFormula(getFormulaForColumn('maxGross')!.formula, newJob) === 'number'
                ? evaluateFormula(getFormulaForColumn('maxGross')!.formula, newJob)
                : Number(String(evaluateFormula(getFormulaForColumn('maxGross')!.formula, newJob)).replace(/\./g, '').replace(',', '.')))
            : newJob.maxGross;

        const calculatedGreen = getFormulaForColumn('green')
            ? (typeof evaluateFormula(getFormulaForColumn('green')!.formula, newJob) === 'number'
                ? evaluateFormula(getFormulaForColumn('green')!.formula, newJob)
                : Number(String(evaluateFormula(getFormulaForColumn('green')!.formula, newJob)).replace(/\./g, '').replace(',', '.')))
            : newJob.green;

        const calculatedRed = getFormulaForColumn('red')
            ? (typeof evaluateFormula(getFormulaForColumn('red')!.formula, newJob) === 'number'
                ? evaluateFormula(getFormulaForColumn('red')!.formula, newJob)
                : Number(String(evaluateFormula(getFormulaForColumn('red')!.formula, newJob)).replace(/\./g, '').replace(',', '.')))
            : newJob.red;

        const job: FinishedPrintJob = {
            ...newJob,
            id: Date.now().toString(),
            maxGross: Number(calculatedMaxGross) || 0,
            green: Number(calculatedGreen) || 0,
            red: Number(calculatedRed) || 0
        };
        setFinishedJobs([job, ...finishedJobs]);
        // Reset fields but keep date
        setNewJob({
            ...newJob,
            orderNr: '',
            orderName: '',
            version: '',
            pages: 0,
            exOmw: '',
            netRun: 0,
            startup: false,
            c4_4: 0,
            c4_0: 0,
            c1_0: 0,
            c1_1: 0,
            c4_1: 0,
            maxGross: 0,
            green: 0,
            red: 0,
            performance: ''
        });
    };

    const [calculatedFields, setCalculatedFields] = useState<CalculatedField[]>([
        {
            id: 'main-cost-formula',
            name: 'Max Bruto',
            formula: 'IF(startup, Opstart * exOmw, 0) + netRun + (netRun * Marge) + (c4_4 * exOmw * param_4_4) + (c4_0 * exOmw * param_4_0) + (c1_0 * exOmw * param_1_0) + (c1_1 * exOmw * param_1_1) + (c4_1 * exOmw * param_4_1)',
            targetColumn: 'maxGross'
        }
    ]);
    const [isFormulaDialogOpen, setIsFormulaDialogOpen] = useState(false);
    const [editingFormula, setEditingFormula] = useState<CalculatedField | null>(null);
    const [formulaName, setFormulaName] = useState('');
    const [currentFormula, setCurrentFormula] = useState('');
    const [targetColumn, setTargetColumn] = useState<'maxGross' | 'green' | 'red' | undefined>(undefined);

    // Available fields for formula builder
    const finishedFields = [
        { key: 'pages', label: "Pagina's" },
        { key: 'exOmw', label: 'ex/omw.' },
        { key: 'netRun', label: 'Oplage netto' },
        { key: 'startup', label: 'Opstart' },
        { key: 'c4_4', label: '4/4' },
        { key: 'c4_0', label: '4/0' },
        { key: 'c1_0', label: '1/0' },
        { key: 'c1_1', label: '1/1' },
        { key: 'c4_1', label: '4/1' },
        { key: 'maxGross', label: 'Max Bruto' },
        { key: 'green', label: 'Groen' },
        { key: 'red', label: 'Rood' }
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

    const evaluateFormula = (formula: string, job: FinishedPrintJob | Omit<FinishedPrintJob, 'id'>): number | string => {
        try {
            // Return early if formula is empty
            if (!formula || !formula.trim()) {
                return 'N/A';
            }

            // Helper function for IF logic
            const IF = (condition: boolean, trueVal: any, falseVal: any) => condition ? trueVal : falseVal;

            // Get parameters from the first active press (or default if none)
            const activePressName = activePresses.length > 0 ? activePresses[0] : '';
            const pressParams = activePressName ? parameters[activePressName] : {};

            // Replace field names with actual values
            let evalFormula = formula;

            // Helper function to escape regex special characters
            const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

            // Replace finished job fields
            finishedFields.forEach(field => {
                const regex = new RegExp(escapeRegex(field.key), 'g');
                let value: any = (job as any)[field.key];

                // Special handling for startup (Opstart)
                if (field.key === 'startup') {
                    // If startup is checked (true), use the Opstart parameter value
                    // If unchecked (false), use 0
                    value = value ? (pressParams['opstart'] || 0) : 0;
                }

                evalFormula = evalFormula.replace(regex, String(value));
            });

            // Replace parameter fields with actual values from the first active press
            parameterFields.forEach(field => {
                const regex = new RegExp(escapeRegex(field.key), 'g');
                // Map friendly parameter keys to internal state keys
                let paramKey = field.key;
                if (field.key === 'Marge') paramKey = 'marge';
                if (field.key === 'Opstart') paramKey = 'opstart';

                let value = pressParams[paramKey] || 0;

                // Special handling for Marge percentage parsing (e.g., "4,2" -> 4.2)
                if (paramKey === 'marge') {
                    value = parseFloat((pressParams['margePercentage'] || '0').replace(',', '.')) || 0;
                }

                evalFormula = evalFormula.replace(regex, String(value));
            });

            // Evaluate the formula safely with the IF function in scope
            const result = Function('IF', '"use strict"; return (' + evalFormula + ')')(IF);

            // Format the result with thousand separators
            if (typeof result === 'number') {
                const rounded = Math.round(result * 100) / 100;
                // Format with dots as thousand separators (European style)
                return rounded.toLocaleString('nl-NL', {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 2
                });
            }

            return result;
        } catch (error) {
            console.error('Formula evaluation error:', error);
            return 'Error';
        }
    };

    const handleOpenFormulaDialog = (field?: CalculatedField, defaultTarget?: 'maxGross' | 'green' | 'red') => {
        if (field) {
            setEditingFormula(field);
            setFormulaName(field.name);
            setCurrentFormula(field.formula);
            setTargetColumn(field.targetColumn);
        } else {
            setEditingFormula(null);
            setFormulaName('');
            setCurrentFormula('');
            setTargetColumn(defaultTarget);
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
                    ? { ...f, name: formulaName, formula: currentFormula, targetColumn }
                    : f
            ));
        } else {
            const newField: CalculatedField = {
                id: Date.now().toString(),
                name: formulaName,
                formula: currentFormula,
                targetColumn
            };
            setCalculatedFields([...calculatedFields, newField]);
        }

        setIsFormulaDialogOpen(false);
        setFormulaName('');
        setCurrentFormula('');
        setTargetColumn(undefined);
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
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Finished Print Jobs</CardTitle>
                            <div className="flex gap-2 items-center">
                                <Select value={searchField} onValueChange={setSearchField}>
                                    <SelectTrigger className="w-[130px]">
                                        <SelectValue placeholder="Filter by" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Fields</SelectItem>
                                        <SelectItem value="orderNr">Order Nr</SelectItem>
                                        <SelectItem value="orderName">Order Name</SelectItem>
                                        <SelectItem value="date">Date</SelectItem>
                                    </SelectContent>
                                </Select>
                                <div className="relative">
                                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                                    <Input
                                        placeholder="Search..."
                                        className="pl-8 w-[200px]"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <Table className="table-fixed w-full">
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead colSpan={7} className="text-center bg-blue-100">Data</TableHead>
                                            <TableHead colSpan={6} className="text-center bg-green-100">Wissels</TableHead>
                                            <TableHead colSpan={3} className="text-center bg-yellow-100">Berekening</TableHead>
                                            <TableHead colSpan={2} className="text-center bg-purple-100">Prestatie</TableHead>
                                        </TableRow>
                                        <TableRow>
                                            <TableHead onClick={() => handleSort('date')} className="cursor-pointer hover:bg-gray-100 w-[110px]"><div className="flex items-center">Date {getSortIcon('date')}</div></TableHead>
                                            {/* Datum removed */}
                                            <TableHead onClick={() => handleSort('orderNr')} className="cursor-pointer hover:bg-gray-100 w-[90px]"><div className="flex items-center">Order nr {getSortIcon('orderNr')}</div></TableHead>
                                            <TableHead onClick={() => handleSort('orderName')} className="cursor-pointer hover:bg-gray-100 min-w-[150px]"><div className="flex items-center">Order {getSortIcon('orderName')}</div></TableHead>
                                            <TableHead onClick={() => handleSort('version')} className="cursor-pointer hover:bg-gray-100 w-[80px]"><div className="flex items-center">Versie/Katern {getSortIcon('version')}</div></TableHead>
                                            <TableHead onClick={() => handleSort('pages')} className="cursor-pointer hover:bg-gray-100 w-[70px]"><div className="flex items-center">Blz {getSortIcon('pages')}</div></TableHead>
                                            <TableHead onClick={() => handleSort('exOmw')} className="cursor-pointer hover:bg-gray-100 w-[60px]"><div className="flex items-center">ex/omw. {getSortIcon('exOmw')}</div></TableHead>
                                            <TableHead onClick={() => handleSort('netRun')} className="cursor-pointer hover:bg-gray-100 w-[100px]"><div className="flex items-center">Oplage netto {getSortIcon('netRun')}</div></TableHead>
                                            <TableHead onClick={() => handleSort('startup')} className="cursor-pointer hover:bg-gray-100 w-[70px]"><div className="flex items-center">Opstart {getSortIcon('startup')}</div></TableHead>
                                            <TableHead onClick={() => handleSort('c4_4')} className="cursor-pointer hover:bg-gray-100 w-[50px]"><div className="flex items-center">4/4 {getSortIcon('c4_4')}</div></TableHead>
                                            <TableHead onClick={() => handleSort('c4_0')} className="cursor-pointer hover:bg-gray-100 w-[50px]"><div className="flex items-center">4/0 {getSortIcon('c4_0')}</div></TableHead>
                                            <TableHead onClick={() => handleSort('c1_0')} className="cursor-pointer hover:bg-gray-100 w-[50px]"><div className="flex items-center">1/0 {getSortIcon('c1_0')}</div></TableHead>
                                            <TableHead onClick={() => handleSort('c1_1')} className="cursor-pointer hover:bg-gray-100 w-[50px]"><div className="flex items-center">1/1 {getSortIcon('c1_1')}</div></TableHead>
                                            <TableHead onClick={() => handleSort('c4_1')} className="cursor-pointer hover:bg-gray-100 w-[50px]"><div className="flex items-center">4/1 {getSortIcon('c4_1')}</div></TableHead>
                                            <TableHead className="w-[100px]">
                                                <div className="flex items-center gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        className="h-auto p-0 font-bold hover:bg-transparent hover:text-blue-600 truncate max-w-[80px]"
                                                        onClick={() => handleOpenFormulaDialog(getFormulaForColumn('maxGross'), 'maxGross')}
                                                        title={getFormulaForColumn('maxGross')?.name || 'Max Bruto'}
                                                    >
                                                        {getFormulaForColumn('maxGross')?.name || 'Max Bruto'}
                                                    </Button>
                                                    <div onClick={() => handleSort('maxGross')} className="cursor-pointer p-1 hover:bg-gray-200 rounded shrink-0">
                                                        {getSortIcon('maxGross')}
                                                    </div>
                                                </div>
                                            </TableHead>
                                            <TableHead className="w-[100px]">
                                                <div className="flex items-center gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        className="h-auto p-0 font-bold hover:bg-transparent hover:text-blue-600 truncate max-w-[80px]"
                                                        onClick={() => handleOpenFormulaDialog(getFormulaForColumn('green'), 'green')}
                                                        title={getFormulaForColumn('green')?.name || 'Groen'}
                                                    >
                                                        {getFormulaForColumn('green')?.name || 'Groen'}
                                                    </Button>
                                                    <div onClick={() => handleSort('green')} className="cursor-pointer p-1 hover:bg-gray-200 rounded shrink-0">
                                                        {getSortIcon('green')}
                                                    </div>
                                                </div>
                                            </TableHead>
                                            <TableHead className="w-[100px]">
                                                <div className="flex items-center gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        className="h-auto p-0 font-bold hover:bg-transparent hover:text-blue-600 truncate max-w-[80px]"
                                                        onClick={() => handleOpenFormulaDialog(getFormulaForColumn('red'), 'red')}
                                                        title={getFormulaForColumn('red')?.name || 'Rood'}
                                                    >
                                                        {getFormulaForColumn('red')?.name || 'Rood'}
                                                    </Button>
                                                    <div onClick={() => handleSort('red')} className="cursor-pointer p-1 hover:bg-gray-200 rounded shrink-0">
                                                        {getSortIcon('red')}
                                                    </div>
                                                </div>
                                            </TableHead>
                                            <TableHead onClick={() => handleSort('performance')} className="cursor-pointer hover:bg-gray-100 w-[80px]"><div className="flex items-center">Prestatie {getSortIcon('performance')}</div></TableHead>
                                            <TableHead className="w-[50px]"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {/* Input Row */}
                                        <TableRow className="bg-gray-50 border-b-2 border-blue-100">
                                            <TableCell className="p-1"><Input type="date" value={newJob.date} onChange={e => setNewJob({ ...newJob, date: e.target.value })} className="h-8 w-full [&::-webkit-calendar-picker-indicator]:hidden" /></TableCell>
                                            {/* Datum removed */}
                                            <TableCell className="p-1">
                                                <div className="flex items-center">
                                                    <span className="text-gray-500 mr-1 text-sm">DT</span>
                                                    <Input value={newJob.orderNr} onChange={e => setNewJob({ ...newJob, orderNr: e.target.value })} className="h-8 w-full" />
                                                </div>
                                            </TableCell>
                                            <TableCell className="p-1"><Input value={newJob.orderName} onChange={e => setNewJob({ ...newJob, orderName: e.target.value })} className="h-8 w-full" /></TableCell>
                                            <TableCell className="p-1"><Input value={newJob.version} onChange={e => setNewJob({ ...newJob, version: e.target.value })} className="h-8 w-full" /></TableCell>
                                            <TableCell className="p-1">
                                                <div className="flex items-center">
                                                    <Input type="number" value={newJob.pages || ''} onChange={e => setNewJob({ ...newJob, pages: Number(e.target.value) })} className="h-8 w-full" />
                                                    <span className="text-gray-500 ml-1 text-sm">blz</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="p-1"><Input value={newJob.exOmw} onChange={e => setNewJob({ ...newJob, exOmw: e.target.value })} className="h-8 w-full" /></TableCell>
                                            <TableCell className="p-1"><Input type="number" value={newJob.netRun || ''} onChange={e => setNewJob({ ...newJob, netRun: Number(e.target.value) })} className="h-8 w-full" /></TableCell>
                                            <TableCell className="p-1 text-center">
                                                <div className="flex justify-center">
                                                    <Checkbox checked={newJob.startup} onCheckedChange={c => setNewJob({ ...newJob, startup: !!c })} />
                                                </div>
                                            </TableCell>
                                            <TableCell className="p-1"><Input type="number" value={newJob.c4_4 || ''} onChange={e => setNewJob({ ...newJob, c4_4: Number(e.target.value) })} className="h-8 w-full" /></TableCell>
                                            <TableCell className="p-1"><Input type="number" value={newJob.c4_0 || ''} onChange={e => setNewJob({ ...newJob, c4_0: Number(e.target.value) })} className="h-8 w-full" /></TableCell>
                                            <TableCell className="p-1"><Input type="number" value={newJob.c1_0 || ''} onChange={e => setNewJob({ ...newJob, c1_0: Number(e.target.value) })} className="h-8 w-full" /></TableCell>
                                            <TableCell className="p-1"><Input type="number" value={newJob.c1_1 || ''} onChange={e => setNewJob({ ...newJob, c1_1: Number(e.target.value) })} className="h-8 w-full" /></TableCell>
                                            <TableCell className="p-1"><Input type="number" value={newJob.c4_1 || ''} onChange={e => setNewJob({ ...newJob, c4_1: Number(e.target.value) })} className="h-8 w-full" /></TableCell>
                                            <TableCell className={`p-1 ${getFormulaForColumn('maxGross') ? 'bg-gray-100 font-medium text-gray-700' : ''}`}>
                                                {(() => {
                                                    const formula = getFormulaForColumn('maxGross');
                                                    return formula
                                                        ? evaluateFormula(formula.formula, newJob)
                                                        : <Input type="number" value={newJob.maxGross || ''} onChange={e => setNewJob({ ...newJob, maxGross: Number(e.target.value) })} className="h-8 w-full" />;
                                                })()}
                                            </TableCell>
                                            <TableCell className={`p-1 ${getFormulaForColumn('green') ? 'bg-gray-100 font-medium text-gray-700' : ''}`}>
                                                {(() => {
                                                    const formula = getFormulaForColumn('green');
                                                    return formula
                                                        ? evaluateFormula(formula.formula, newJob)
                                                        : <Input type="number" value={newJob.green || ''} onChange={e => setNewJob({ ...newJob, green: Number(e.target.value) })} className="h-8 w-full" />;
                                                })()}
                                            </TableCell>
                                            <TableCell className={`p-1 ${getFormulaForColumn('red') ? 'bg-gray-100 font-medium text-gray-700' : ''}`}>
                                                {(() => {
                                                    const formula = getFormulaForColumn('red');
                                                    return formula
                                                        ? evaluateFormula(formula.formula, newJob)
                                                        : <Input type="number" value={newJob.red || ''} onChange={e => setNewJob({ ...newJob, red: Number(e.target.value) })} className="h-8 w-full" />;
                                                })()}
                                            </TableCell>
                                            <TableCell className="p-1"><Input value={newJob.performance} onChange={e => setNewJob({ ...newJob, performance: e.target.value })} className="h-8 w-full" /></TableCell>
                                            <TableCell className="p-1 text-center">
                                                <Button size="sm" variant="ghost" onClick={handleAddJob} className="hover:bg-blue-100 text-blue-600">
                                                    <Save className="w-4 h-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                        {sortedJobs.map((job) => (
                                            <TableRow key={job.id}>
                                                <TableCell>{job.date}</TableCell>
                                                {/* Datum removed */}
                                                <TableCell>DT {job.orderNr}</TableCell>
                                                <TableCell>{job.orderName}</TableCell>
                                                <TableCell>{job.version}</TableCell>
                                                <TableCell>{formatNumber(job.pages)} blz</TableCell>
                                                <TableCell>{job.exOmw}</TableCell>
                                                <TableCell>{formatNumber(job.netRun)}</TableCell>
                                                <TableCell>
                                                    <div className="flex justify-center">
                                                        {job.startup ? <Check className="w-4 h-4 text-green-600" /> : <span className="text-gray-300">-</span>}
                                                    </div>
                                                </TableCell>
                                                <TableCell>{formatNumber(job.c4_4)}</TableCell>
                                                <TableCell>{formatNumber(job.c4_0)}</TableCell>
                                                <TableCell>{formatNumber(job.c1_0)}</TableCell>
                                                <TableCell>{formatNumber(job.c1_1)}</TableCell>
                                                <TableCell>{formatNumber(job.c4_1)}</TableCell>
                                                <TableCell>
                                                    {(() => {
                                                        const formula = getFormulaForColumn('maxGross');
                                                        return formula ? evaluateFormula(formula.formula, job) : formatNumber(job.maxGross);
                                                    })()}
                                                </TableCell>
                                                <TableCell>
                                                    {(() => {
                                                        const formula = getFormulaForColumn('green');
                                                        return formula ? evaluateFormula(formula.formula, job) : formatNumber(job.green);
                                                    })()}
                                                </TableCell>
                                                <TableCell>
                                                    {(() => {
                                                        const formula = getFormulaForColumn('red');
                                                        return formula ? evaluateFormula(formula.formula, job) : formatNumber(job.red);
                                                    })()}
                                                </TableCell>
                                                <TableCell>{job.performance}</TableCell>
                                                <TableCell>
                                                    <Button size="sm" variant="ghost" className="hover:bg-red-100 text-red-500">
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </TableCell>
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
                            <Label>Target Column (Optional)</Label>
                            <Select
                                value={targetColumn || "none"}
                                onValueChange={(value) => setTargetColumn(value === "none" ? undefined : value as 'maxGross' | 'green' | 'red')}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a column to display this formula" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">None (Reference only)</SelectItem>
                                    <SelectItem value="maxGross">Max Bruto</SelectItem>
                                    <SelectItem value="green">Groen</SelectItem>
                                    <SelectItem value="red">Rood</SelectItem>
                                </SelectContent>
                            </Select>
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
