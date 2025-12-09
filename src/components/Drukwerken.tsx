import { useState } from 'react';
import { PressType } from './AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Plus, Edit, Trash2, Calculator, Check, Search, ArrowUp, ArrowDown } from 'lucide-react';
import { formatNumber } from '../utils/formatNumber';
import { format } from 'date-fns';
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
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { AddFinishedJobDialog } from './AddFinishedJobDialog';



interface Press {
    id: string;
    name: PressType;
    active: boolean;
    archived: boolean;
}

export interface Katern {
    id: string;
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
    delta: number;
    deltaPercentage: number;
}

export interface Werkorder {
    id: string;
    orderNr: string;
    orderName: string; // Added orderName
    orderDate: string;
    katernen: Katern[];
}



export interface FinishedPrintJob {
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
    delta_number: number;
    delta_percentage: number;
    delta: number;
    performance: string;
}

interface CalculatedField {
    id: string;
    name: string;
    formula: string;
    description?: string;
    targetColumn?: 'maxGross' | 'green' | 'red' | 'delta_number' | 'delta_percentage';
}

export function Drukwerken({ presses }: { presses: Press[] }) {
    // Get active presses for columns
    const activePresses = presses
        .filter(p => p.active && !p.archived)
        .map(p => p.name);

    const [isAddJobDialogOpen, setIsAddJobDialogOpen] = useState(false);
    const [editingJob, setEditingJob] = useState<FinishedPrintJob | null>(null);

    const defaultWerkorderData: Omit<Werkorder, 'id' | 'katernen'> = {
        orderNr: '',
        orderName: 'New Werkorder', // Provide a default name
        orderDate: new Date().toISOString().split('T')[0],
    };

    const defaultKaternToAdd: Omit<Katern, 'id'> = {
        version: 'New Version',
        pages: 0,
        exOmw: '0',
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
        delta: 0,
        deltaPercentage: 0,
    };

    const [werkorders, setWerkorders] = useState<Werkorder[]>([
        {
            id: '1',
            orderNr: '0001',
            orderName: 'Spar 2025-01', // Added default orderName
            orderDate: '2025-01-01',
            katernen: [
                { id: '1-1', version: 'Nederlands - Katern 1', pages: 40, exOmw: '2', netRun: 100000, startup: true, c4_4: 0, c4_0: 0, c1_0: 0, c1_1: 0, c4_1: 0, maxGross: 0, green: 101000, red: 3000, delta: 0, deltaPercentage: 0 },
                { id: '1-2', version: 'Frans - Katern 1', pages: 40, exOmw: '2', netRun: 50000, startup: false, c4_4: 1, c4_0: 0, c1_0: 0, c1_1: 0, c4_1: 0, maxGross: 0, green: 50500, red: 1500, delta: 0, deltaPercentage: 0 },
            ]
        }
    ]);

    const handleAddKaternClick = (werkorderId: string) => {
        handleKaternSubmit(defaultKaternToAdd, werkorderId);
    };

    const handleKaternSubmit = (katernData: Omit<Katern, 'id'>, werkorderId: string) => {
        setWerkorders(werkorders.map(wo => {
            if (wo.id === werkorderId) {
                const newKatern = { ...katernData, id: `${wo.id}-${wo.katernen.length + 1}` };
                return { ...wo, katernen: [...wo.katernen, newKatern] };
            }
            return wo;
        }));
    };

    const defaultKatern: Katern = {
        id: 'new-katern-1', // Temporary ID, will be replaced with `${newWerkorder.id}-1`
        version: 'New Version 1',
        pages: 0,
        exOmw: '0',
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
        delta: 0,
        deltaPercentage: 0,
    };

    const handleWerkorderSubmit = (werkorderData: Omit<Werkorder, 'id' | 'katernen'>) => {
        const newWerkorderId = Date.now().toString();
        const newKaternWithId: Katern = {
            ...defaultKatern,
            id: `${newWerkorderId}-1`, // Assign a proper ID
        };

        const newWerkorder: Werkorder = {
            ...werkorderData,
            id: newWerkorderId,
            katernen: [newKaternWithId], // Now includes the default katern
        };
        setWerkorders([newWerkorder, ...werkorders]);
    };

    const handleSaveOrderToFinished = (werkorder: Werkorder) => {
        const newFinishedJobs: FinishedPrintJob[] = werkorder.katernen.map(katern => {
            const today = new Date();
            const formattedDate = format(today, 'yyyy-MM-dd');
            const formattedDatum = format(today, 'dd-MM');

            const jobWithKaternData = {
                ...katern,
                orderNr: werkorder.orderNr,
                orderName: werkorder.orderName,
                date: formattedDate,
                datum: formattedDatum,
            };

            const calculatedMaxGross = getFormulaForColumn('maxGross')
                ? (typeof evaluateFormula(getFormulaForColumn('maxGross')!.formula, jobWithKaternData) === 'number'
                    ? evaluateFormula(getFormulaForColumn('maxGross')!.formula, jobWithKaternData)
                    : Number(String(evaluateFormula(getFormulaForColumn('maxGross')!.formula, jobWithKaternData)).replace(/\./g, '').replace(',', '.')))
                : katern.maxGross;
            const maxGrossVal = Number(calculatedMaxGross) || 0;

            const jobWithMaxGross = { ...jobWithKaternData, maxGross: maxGrossVal };

            const calculatedGreen = getFormulaForColumn('green')
                ? (typeof evaluateFormula(getFormulaForColumn('green')!.formula, jobWithMaxGross) === 'number'
                    ? evaluateFormula(getFormulaForColumn('green')!.formula, jobWithMaxGross)
                    : Number(String(evaluateFormula(getFormulaForColumn('green')!.formula, jobWithMaxGross)).replace(/\./g, '').replace(',', '.')))
                : katern.green;

            const calculatedRed = getFormulaForColumn('red')
                ? (typeof evaluateFormula(getFormulaForColumn('red')!.formula, jobWithMaxGross) === 'number'
                    ? evaluateFormula(getFormulaForColumn('red')!.formula, jobWithMaxGross)
                    : Number(String(evaluateFormula(getFormulaForColumn('red')!.formula, jobWithMaxGross)).replace(/\./g, '').replace(',', '.')))
                : katern.red;

            const calculatedDeltaNumber = getFormulaForColumn('delta_number')
                ? (typeof evaluateFormula(getFormulaForColumn('delta_number')!.formula, jobWithMaxGross) === 'number'
                    ? evaluateFormula(getFormulaForColumn('delta_number')!.formula, jobWithMaxGross)
                    : Number(String(evaluateFormula(getFormulaForColumn('delta_number')!.formula, jobWithMaxGross)).replace(/\./g, '').replace(',', '.')))
                : katern.delta;

            const calculatedDeltaPercentage = getFormulaForColumn('delta_percentage')
                ? (() => {
                    const f = getFormulaForColumn('delta_percentage')!;
                    if (f.formula && f.formula.trim() !== '(green + red) / maxGross') {
                        return typeof evaluateFormula(f.formula, jobWithMaxGross) === 'number'
                            ? evaluateFormula(f.formula, jobWithMaxGross)
                            : Number(String(evaluateFormula(f.formula, jobWithMaxGross)).replace(/\./g, '').replace(',', '.'));
                    }
                    const percentage = maxGrossVal !== 0 ? ((Number(calculatedGreen) + Number(calculatedRed)) / maxGrossVal) * 100 : 0;
                    return percentage;
                })()
                : katern.deltaPercentage;

            return {
                id: Date.now().toString() + '-' + katern.id, // Unique ID
                date: formattedDate,
                datum: formattedDatum,
                orderNr: werkorder.orderNr,
                orderName: werkorder.orderName,
                version: katern.version,
                pages: katern.pages,
                exOmw: katern.exOmw,
                netRun: katern.netRun,
                startup: katern.startup,
                c4_4: katern.c4_4,
                c4_0: katern.c4_0,
                c1_0: katern.c1_0,
                c1_1: katern.c1_1,
                c4_1: katern.c4_1,
                maxGross: maxGrossVal,
                green: Number(calculatedGreen) || 0,
                red: Number(calculatedRed) || 0,
                delta_number: Number(calculatedDeltaNumber) || 0,
                delta_percentage: Number(calculatedDeltaPercentage) || 0,
                delta: Number(calculatedDeltaNumber) || 0, // Assuming delta is delta_number
                performance: '100%' // Placeholder
            };
        });

        setFinishedJobs(prevJobs => [...newFinishedJobs, ...prevJobs]);
        // Optionally, remove the werkorder from the current list after saving
        // setWerkorders(prevWerkorders => prevWerkorders.filter(wo => wo.id !== werkorder.id));
    };




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
    const getFormulaForColumn = (col: 'maxGross' | 'green' | 'red' | 'delta_number' | 'delta_percentage') => calculatedFields.find(f => f.targetColumn === col);

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
            date: '2025-01-01',
            datum: '01-01',
            orderNr: '0001',
            orderName: 'Spar 2025-01',
            version: 'Nederlands - Katern 1',
            pages: 40,
            exOmw: '2',
            netRun: 100000,
            startup: true,
            c4_4: 0,
            c4_0: 0,
            c1_0: 0,
            c1_1: 0,
            c4_1: 0,
            maxGross: 0,
            green: 101000, // 101% of 100000
            red: 3000,     // 3% of 100000
            delta_number: 0,
            delta_percentage: 0,
            delta: 0,
            performance: '100%'
        },
        {
            id: '2',
            date: '2025-01-01',
            datum: '01-01',
            orderNr: '0001',
            orderName: 'Spar 2025-01',
            version: 'Frans - Katern 1',
            pages: 40,
            exOmw: '2',
            netRun: 50000,
            startup: false,
            c4_4: 1,
            c4_0: 0,
            c1_0: 0,
            c1_1: 0,
            c4_1: 0,
            maxGross: 0,
            green: 50500, // 101% of 50000
            red: 1500,    // 3% of 50000
            delta_number: 0,
            delta_percentage: 0,
            delta: 0,
            performance: '100%'
        },
        {
            id: '3',
            date: '2025-01-01',
            datum: '01-01',
            orderNr: '0001',
            orderName: 'Spar 2025-01',
            version: 'Nederlands - Katern 2',
            pages: 32,
            exOmw: '2',
            netRun: 100000,
            startup: false,
            c4_4: 1,
            c4_0: 0,
            c1_0: 0,
            c1_1: 0,
            c4_1: 0,
            maxGross: 0,
            green: 101000, // 101% of 100000
            red: 3000,     // 3% of 100000
            delta_number: 0,
            delta_percentage: 0,
            delta: 0,
            performance: '100%'
        },
        {
            id: '4',
            date: '2025-01-01',
            datum: '01-01',
            orderNr: '0001',
            orderName: 'Spar 2025-01',
            version: 'Frans - Katern 2',
            pages: 32,
            exOmw: '2',
            netRun: 50000,
            startup: false,
            c4_4: 1,
            c4_0: 0,
            c1_0: 0,
            c1_1: 0,
            c4_1: 0,
            maxGross: 0,
            green: 50500, // 101% of 50000
            red: 1500,    // 3% of 50000
            delta_number: 0,
            delta_percentage: 0,
            delta: 0,
            performance: '100%'
        }
    ]);

    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchField, setSearchField] = useState('all');

    const handleSort = (key: string) => {
        setSortConfig(current => {
            if (current?.key === key) {
                // Toggle: asc -> desc -> null (reset)
                if (current.direction === 'asc') {
                    return { key, direction: 'desc' };
                } else {
                    return null; // Reset to original order
                }
            }
            return { key, direction: 'asc' };
        });
    };

    const getSortIcon = (key: string) => {
        if (!sortConfig || sortConfig.key !== key) return null;
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

    const sortedJobs = sortConfig
        ? [...filteredJobs].sort((a, b) => {
            const aValue = (a as any)[sortConfig.key];
            const bValue = (b as any)[sortConfig.key];

            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        })
        : filteredJobs;

    const handleJobSubmit = (jobData: Omit<FinishedPrintJob, 'id'>) => {
        const processedJob = processJobFormulas(jobData);
        if (editingJob) {
            // Update existing job
            setFinishedJobs(finishedJobs.map(j => j.id === editingJob.id ? { ...processedJob, id: j.id } : j));
        } else {
            // Add new job
            setFinishedJobs([{ ...processedJob, id: Date.now().toString() }, ...finishedJobs]);
        }
    };

    const processJobFormulas = (job: Omit<FinishedPrintJob, 'id'> | FinishedPrintJob) => {
        const calculatedMaxGross = getFormulaForColumn('maxGross')
            ? (typeof evaluateFormula(getFormulaForColumn('maxGross')!.formula, job) === 'number'
                ? evaluateFormula(getFormulaForColumn('maxGross')!.formula, job)
                : Number(String(evaluateFormula(getFormulaForColumn('maxGross')!.formula, job)).replace(/\./g, '').replace(',', '.')))
            : job.maxGross;
        const maxGrossVal = Number(calculatedMaxGross) || 0;

        const jobWithMaxGross = { ...job, maxGross: maxGrossVal };

        const calculatedGreen = getFormulaForColumn('green')
            ? (typeof evaluateFormula(getFormulaForColumn('green')!.formula, jobWithMaxGross) === 'number'
                ? evaluateFormula(getFormulaForColumn('green')!.formula, jobWithMaxGross)
                : Number(String(evaluateFormula(getFormulaForColumn('green')!.formula, jobWithMaxGross)).replace(/\./g, '').replace(',', '.')))
            : job.green;

        const calculatedRed = getFormulaForColumn('red')
            ? (typeof evaluateFormula(getFormulaForColumn('red')!.formula, jobWithMaxGross) === 'number'
                ? evaluateFormula(getFormulaForColumn('red')!.formula, jobWithMaxGross)
                : Number(String(evaluateFormula(getFormulaForColumn('red')!.formula, jobWithMaxGross)).replace(/\./g, '').replace(',', '.')))
            : job.red;

        const calculatedDeltaNumber = getFormulaForColumn('delta_number')
            ? (typeof evaluateFormula(getFormulaForColumn('delta_number')!.formula, jobWithMaxGross) === 'number'
                ? evaluateFormula(getFormulaForColumn('delta_number')!.formula, jobWithMaxGross)
                : Number(String(evaluateFormula(getFormulaForColumn('delta_number')!.formula, jobWithMaxGross)).replace(/\./g, '').replace(',', '.')))
            : job.delta_number || 0;

        const calculatedDeltaPercentage = getFormulaForColumn('delta_percentage')
            ? (() => {
                const f = getFormulaForColumn('delta_percentage')!;
                if (f.formula && f.formula.trim() !== '(green + red) / maxGross') {
                    return typeof evaluateFormula(f.formula, jobWithMaxGross) === 'number'
                        ? evaluateFormula(f.formula, jobWithMaxGross)
                        : Number(String(evaluateFormula(f.formula, jobWithMaxGross)).replace(/\./g, '').replace(',', '.'));
                }
                const percentage = maxGrossVal !== 0 ? ((job.green + job.red) / maxGrossVal) * 100 : 0;
                return percentage;
            })()
            : job.delta_percentage || 0;

        return {
            ...job,
            maxGross: maxGrossVal,
            green: Number(calculatedGreen) || 0,
            red: Number(calculatedRed) || 0,
            delta_number: Number(calculatedDeltaNumber) || 0,
            delta_percentage: Number(calculatedDeltaPercentage) || 0,
            delta: 0 // This seems to be another delta, keeping as is for now
        };
    };

    const handleEditJob = (job: FinishedPrintJob) => {
        setEditingJob(job);
        setIsAddJobDialogOpen(true);
    };

    const handleDeleteJob = (jobId: string) => {
        setFinishedJobs(finishedJobs.filter(job => job.id !== jobId));
    };

    const [calculatedFields, setCalculatedFields] = useState<CalculatedField[]>([
        {
            id: 'main-cost-formula',
            name: 'Max Bruto',
            formula: 'IF(startup, Opstart * exOmw, 0) + netRun + (netRun * Marge) + (c4_4 * exOmw * param_4_4) + (c4_0 * exOmw * param_4_0) + (c1_0 * exOmw * param_1_0) + (c1_1 * exOmw * param_1_1) + (c4_1 * exOmw * param_4_1)',
            targetColumn: 'maxGross'
        },
        {
            id: 'delta-number-formula',
            name: 'Delta Number',
            formula: 'green + red - maxGross',
            targetColumn: 'delta_number'
        },
        {
            id: 'delta-percentage-formula',
            name: 'Delta Percentage',
            formula: '(green + red) / maxGross',
            targetColumn: 'delta_percentage'
        }
    ]);
    const [isFormulaDialogOpen, setIsFormulaDialogOpen] = useState(false);
    const [editingFormula, setEditingFormula] = useState<CalculatedField | null>(null);
    const [formulaName, setFormulaName] = useState('');
    const [currentFormula, setCurrentFormula] = useState('');
    const [targetColumn, setTargetColumn] = useState<'maxGross' | 'green' | 'red' | 'delta_number' | 'delta_percentage' | undefined>(undefined);

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
        { key: 'red', label: 'Rood' },
        { key: 'delta', label: 'Delta' }
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

    const evaluateFormula = (formula: string, job: FinishedPrintJob | Omit<FinishedPrintJob, 'id'> | Katern): number | string => {
        try {
            // Return early if formula is empty
            if (!formula || !formula.trim()) {
                return '';
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

                // Special handling for Marge percentage parsing (e.g., "4,2" -> 0.042)
                if (paramKey === 'marge') {
                    value = (parseFloat((pressParams['margePercentage'] || '0').replace(',', '.')) || 0) / 100;
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
            return '';
        }
    };

    // Color palette for formula explanation elements - each field has a unique color (inline styles)
    const fieldColors: Record<string, { bg: string; text: string }> = {
        // Job fields - each with distinct color
        pages: { bg: '#dbeafe', text: '#1e40af' },      // blue
        exOmw: { bg: '#cffafe', text: '#0e7490' },      // cyan
        netRun: { bg: '#ccfbf1', text: '#0f766e' },     // teal
        startup: { bg: '#d1fae5', text: '#047857' },    // emerald
        c4_4: { bg: '#e0e7ff', text: '#4338ca' },       // indigo
        c4_0: { bg: '#ede9fe', text: '#6d28d9' },       // violet
        c1_0: { bg: '#f3e8ff', text: '#7c3aed' },       // purple
        c1_1: { bg: '#fae8ff', text: '#a21caf' },       // fuchsia
        c4_1: { bg: '#fce7f3', text: '#be185d' },       // pink
        // Parameter fields - each with distinct color
        Marge: { bg: '#dcfce7', text: '#15803d' },      // green
        Opstart: { bg: '#ecfccb', text: '#4d7c0f' },    // lime
        param_4_4: { bg: '#fef9c3', text: '#a16207' },  // yellow
        param_4_0: { bg: '#fef3c7', text: '#b45309' },  // amber
        param_1_0: { bg: '#ffedd5', text: '#c2410c' },  // orange
        param_1_1: { bg: '#fee2e2', text: '#b91c1c' },  // red
        param_4_1: { bg: '#ffe4e6', text: '#be123c' },  // rose
    };

    // Generate formula explanation with colored substitutions
    const getFormulaExplanation = (formula: string, job: FinishedPrintJob | Omit<FinishedPrintJob, 'id'> | Katern) => {
        if (!formula || !formula.trim()) return null;

        const activePressName = activePresses.length > 0 ? activePresses[0] : '';
        const pressParams = activePressName ? parameters[activePressName] : {};

        const substitutions: { key: string; label: string; value: string | number; color: { bg: string; text: string } }[] = [];

        // Collect job field substitutions
        finishedFields.forEach(field => {
            if (formula.includes(field.key)) {
                let value: any = (job as any)[field.key];
                if (field.key === 'startup') {
                    value = value ? (pressParams['opstart'] || 0) : 0;
                }
                substitutions.push({
                    key: field.key,
                    label: field.label,
                    value: value,
                    color: fieldColors[field.key] || { bg: '#f3f4f6', text: '#374151' }
                });
            }
        });

        // Collect parameter field substitutions
        parameterFields.forEach(field => {
            if (formula.includes(field.key)) {
                let paramKey = field.key;
                if (field.key === 'Marge') paramKey = 'marge';
                if (field.key === 'Opstart') paramKey = 'opstart';

                let value = pressParams[paramKey] || 0;
                if (paramKey === 'marge') {
                    value = (parseFloat((pressParams['margePercentage'] || '0').replace(',', '.')) || 0) / 100;
                }

                substitutions.push({
                    key: field.key,
                    label: field.label + ' (param)',
                    value: value,
                    color: fieldColors[field.key] || { bg: '#f3f4f6', text: '#374151' }
                });
            }
        });

        return substitutions;
    };

    // Component to render formula result with tooltip
    const FormulaResultWithTooltip = ({
        formula,
        job,
        result
    }: {
        formula: string;
        job: FinishedPrintJob | Omit<FinishedPrintJob, 'id'> | Katern;
        result: string | number
    }) => {
        const explanation = getFormulaExplanation(formula, job);

        if (!explanation || explanation.length === 0) {
            return <span>{result}</span>;
        }

        // Build a map of field keys to their substitution info for quick lookup
        const subMap = new Map(explanation.map(sub => [sub.key, sub]));

        // Render formula with colored badges - parse and replace variables with styled spans
        const renderFormulaWithBadges = () => {
            const allKeys = explanation.map(sub => sub.key).sort((a, b) => b.length - a.length);
            const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const pattern = new RegExp(`(${allKeys.map(escapeRegex).join('|')})`, 'g');
            const parts = formula.split(pattern);

            return parts.map((part, idx) => {
                const sub = subMap.get(part);
                if (sub) {
                    const displayValue = typeof sub.value === 'number' ? formatNumber(sub.value) : sub.value;
                    return (
                        <span
                            key={idx}
                            className="inline-block px-1 py-0.5 rounded text-xs font-medium mx-0.5"
                            style={{ backgroundColor: sub.color.bg, color: sub.color.text }}
                        >
                            {displayValue}
                        </span>
                    );
                }
                return <span key={idx} style={{ color: '#374151' }}>{part}</span>;
            });
        };

        return (
            <Tooltip>
                <TooltipTrigger asChild>
                    <span className="cursor-help border-b border-dashed border-gray-400">{result}</span>
                </TooltipTrigger>
                <TooltipContent
                    side="top"
                    style={{ backgroundColor: 'white', color: '#1f2937' }}
                    className="border border-gray-200 shadow-lg max-w-md p-3"
                >
                    <div className="space-y-2">
                        <div className="text-xs font-semibold" style={{ color: '#4b5563' }}>Formule berekening:</div>
                        <div className="font-mono text-xs p-2 rounded border flex flex-wrap items-center" style={{ backgroundColor: '#f3f4f6', borderColor: '#e5e7eb' }}>
                            {renderFormulaWithBadges()}
                        </div>
                        <div className="text-xs font-semibold mt-3 mb-1" style={{ color: '#4b5563' }}>Gebruikte waarden:</div>
                        <div className="flex flex-wrap gap-1.5">
                            {explanation.map((sub, idx) => (
                                <span
                                    key={idx}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium"
                                    style={{ backgroundColor: sub.color.bg, color: sub.color.text }}
                                >
                                    <span style={{ opacity: 0.7 }}>{sub.label}:</span>
                                    <span className="font-bold">{typeof sub.value === 'number' ? formatNumber(sub.value) : sub.value}</span>
                                </span>
                            ))}
                        </div>
                        <div className="border-t pt-2 mt-2 flex items-center justify-between" style={{ borderColor: '#e5e7eb' }}>
                            <span className="text-xs" style={{ color: '#6b7280' }}>Resultaat:</span>
                            <span className="font-bold text-sm" style={{ color: '#1f2937' }}>{result}</span>
                        </div>
                    </div>
                </TooltipContent>
            </Tooltip>
        );
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
            <Tabs defaultValue="werkorders" className="w-full">
                <TabsList className="flex w-full whitespace-nowrap">
                    <TabsTrigger value="werkorders">Werkorders</TabsTrigger>
                    <TabsTrigger value="finished">Finished</TabsTrigger>
                    <TabsTrigger value="parameters">Parameters</TabsTrigger>
                </TabsList>

                <TabsContent value="werkorders">
                    <Card>
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <CardTitle>Werkorders</CardTitle>
                                <Button onClick={() => handleWerkorderSubmit(defaultWerkorderData)}><Plus className="w-4 h-4 mr-2" /> Werkorder</Button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {werkorders.map((wo) => (
                                <div key={wo.id} className="border p-4 rounded-lg">
                                    <div className="flex justify-between items-center mb-4">
                                        <div className="flex gap-4 w-full items-end">
                                            <div className="w-[60px]">
                                                <Label>Order Nr</Label>
                                                <Input value={`DT ${wo.orderNr}`} readOnly />
                                            </div>
                                            <div>
                                                <Label>Order</Label>
                                                <Input value={wo.orderName} readOnly className="w-full" />
                                            </div>
                                        </div>
                                    </div>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead style={{ width: '60px' }}>Order Date</TableHead>
                                                <TableHead>Versie/Katern</TableHead>
                                                <TableHead style={{ width: '40px' }} className="text-center">Pagina's</TableHead>
                                                <TableHead style={{ width: '100px' }} className="text-center">Ex/Omw.</TableHead>
                                                <TableHead style={{ width: '100px' }}>Oplage</TableHead>
                                                <TableHead style={{ width: '60px' }}>Opstart</TableHead>
                                                <TableHead style={{ width: '40px' }} className="text-center">4/4</TableHead>
                                                <TableHead style={{ width: '40px' }} className="text-center">4/0</TableHead>
                                                <TableHead style={{ width: '40px' }} className="text-center">1/0</TableHead>
                                                <TableHead style={{ width: '40px' }} className="text-center">1/1</TableHead>
                                                <TableHead style={{ width: '40px' }} className="text-center">4/1</TableHead>
                                                <TableHead style={{ width: '100px' }} className="text-center">Max Bruto</TableHead>
                                                <TableHead style={{ width: '100px' }} className="text-center">Groen</TableHead>
                                                <TableHead style={{ width: '100px' }} className="text-center">Rood</TableHead>
                                                <TableHead style={{ width: '100px' }} className="text-center">Delta</TableHead>
                                                <TableHead style={{ width: '40px' }} className="text-center">Delta %</TableHead>
                                                <TableHead style={{ width: '100px' }}>Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {wo.katernen.map((katern) => (
                                                <TableRow key={katern.id}>
                                                    <TableCell>{wo.orderDate}</TableCell>
                                                    <TableCell><Input value={katern.version} /></TableCell>
                                                    <TableCell className="text-center"><Input type="number" value={katern.pages} className="text-right" /></TableCell>
                                                    <TableCell><Input value={katern.exOmw} className="w-full text-center px-0 py-0" /></TableCell>
                                                    <TableCell><Input type="number" value={katern.netRun} /></TableCell>
                                                    <TableCell><Checkbox checked={katern.startup} /></TableCell>
                                                    <TableCell className="text-center"><Input type="number" value={katern.c4_4} className="text-center border-none focus-visible:ring-0 focus-visible:ring-offset-0" /></TableCell>
                                                    <TableCell className="text-center"><Input type="number" value={katern.c4_0} className="text-center border-none focus-visible:ring-0 focus-visible:ring-offset-0" /></TableCell>
                                                    <TableCell className="text-center"><Input type="number" value={katern.c1_0} className="text-center border-none focus-visible:ring-0 focus-visible:ring-offset-0" /></TableCell>
                                                    <TableCell className="text-center"><Input type="number" value={katern.c1_1} className="text-center border-none focus-visible:ring-0 focus-visible:ring-offset-0" /></TableCell>
                                                    <TableCell className="text-center"><Input type="number" value={katern.c4_1} className="text-center border-none focus-visible:ring-0 focus-visible:ring-offset-0" /></TableCell>
                                                    <TableCell>
                                                        {(() => {
                                                            const formula = getFormulaForColumn('maxGross');
                                                            return formula
                                                                ? <FormulaResultWithTooltip formula={formula.formula} job={katern} result={evaluateFormula(formula.formula, katern)} />
                                                                : formatNumber(katern.maxGross);
                                                        })()}
                                                    </TableCell>
                                                    <TableCell><Input type="number" value={katern.green} /></TableCell>
                                                    <TableCell><Input type="number" value={katern.red} /></TableCell>
                                                    <TableCell>
                                                        {(() => {
                                                            const formula = getFormulaForColumn('delta_number');
                                                            return formula ? formatNumber(evaluateFormula(formula.formula, katern)) : formatNumber(katern.delta);
                                                        })()}
                                                    </TableCell>
                                                    <TableCell>
                                                        {(() => {
                                                            const formula = getFormulaForColumn('delta_percentage');
                                                            const result = formula
                                                                ? evaluateFormula(formula.formula, katern)
                                                                : formatNumber(katern.deltaPercentage);

                                                            const percentageValue = typeof result === 'string'
                                                                ? parseFloat(result.replace(/\./g, '').replace(',', '.')) * 100
                                                                : result * 100;

                                                            const formattedPercentage = Math.round(percentageValue * 100) / 100;

                                                            return formula
                                                                ? formattedPercentage + '%'
                                                                : formattedPercentage + '%';
                                                        })()}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Button size="sm" variant="ghost" className="hover:bg-red-100 text-red-500">
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                    <div className="flex justify-between items-center mt-2">
                                        <Button onClick={() => handleAddKaternClick(wo.id)} size="sm" variant="ghost">
                                            <Plus className="w-4 h-4 mr-1" /> Add Katern/Versie
                                        </Button>
                                        <Button onClick={() => handleSaveOrderToFinished(wo)} size="sm" className="w-48">
                                            Order Opslaan
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </TabsContent>

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
                                <Button onClick={() => { setEditingJob(null); setIsAddJobDialogOpen(true); }}>
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add Finished Job
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <Table className="table-fixed w-full">
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead colSpan={6} className="text-center bg-blue-100" style={{ borderRight: '1px solid black' }}>Data</TableHead>
                                            <TableHead colSpan={6} className="text-center bg-green-100" style={{ borderTop: '1px solid black', borderRight: '1px solid black' }}>Wissels</TableHead>
                                            <TableHead colSpan={3} className="text-center bg-yellow-100" style={{ borderTop: '1px solid black', borderRight: '1px solid black' }}>Berekening</TableHead>
                                            <TableHead colSpan={2} className="text-center bg-purple-100" style={{ borderTop: '1px solid black', borderRight: '1px solid black' }}>Prestatie</TableHead>
                                            <TableHead className="w-[100px]"></TableHead>
                                        </TableRow>
                                        <TableRow>
                                            <TableHead onClick={() => handleSort('date')} style={{ width: '83px' }} className="cursor-pointer hover:bg-gray-100 border-r"><div className="flex items-center">Date {getSortIcon('date')}</div></TableHead>
                                            {/* Datum removed */}
                                            <TableHead onClick={() => handleSort('orderNr')} style={{ width: '65px' }} className="cursor-pointer hover:bg-gray-100 border-r"><div className="flex items-center">Order nr {getSortIcon('orderNr')}</div></TableHead>
                                            <TableHead onClick={() => handleSort('orderName')} className="cursor-pointer hover:bg-gray-100 min-w-[150px] border-r"><div className="flex items-center">Order {getSortIcon('orderName')}</div></TableHead>
                                            <TableHead onClick={() => handleSort('pages')} className="cursor-pointer hover:bg-gray-100 text-center border-r"><div className="flex items-center justify-center">Blz {getSortIcon('pages')}</div></TableHead>
                                            <TableHead onClick={() => handleSort('exOmw')} className="cursor-pointer hover:bg-gray-100 text-center leading-3 border-r"><div className="flex items-center justify-center h-full">Ex/<br />Omw. {getSortIcon('exOmw')}</div></TableHead>
                                            <TableHead onClick={() => handleSort('netRun')} className="cursor-pointer hover:bg-gray-100 text-center border-r"><div className="flex items-center justify-center">Oplage netto {getSortIcon('netRun')}</div></TableHead>
                                            <TableHead onClick={() => handleSort('startup')} className="cursor-pointer hover:bg-gray-100 text-center bg-gray-50"><div className="flex items-center justify-center">Opstart {getSortIcon('startup')}</div></TableHead>
                                            <TableHead onClick={() => handleSort('c4_4')} className="cursor-pointer hover:bg-gray-100 text-center bg-gray-50 border border-black"><div className="flex items-center justify-center">4/4 {getSortIcon('c4_4')}</div></TableHead>
                                            <TableHead onClick={() => handleSort('c4_0')} className="cursor-pointer hover:bg-gray-100 text-center bg-gray-50 border border-black"><div className="flex items-center justify-center">4/0 {getSortIcon('c4_0')}</div></TableHead>
                                            <TableHead onClick={() => handleSort('c1_0')} className="cursor-pointer hover:bg-gray-100 text-center bg-gray-50 border border-black"><div className="flex items-center justify-center">1/0 {getSortIcon('c1_0')}</div></TableHead>
                                            <TableHead onClick={() => handleSort('c1_1')} className="cursor-pointer hover:bg-gray-100 text-center bg-gray-50 border border-black"><div className="flex items-center justify-center">1/1 {getSortIcon('c1_1')}</div></TableHead>
                                            <TableHead onClick={() => handleSort('c4_1')} className="cursor-pointer hover:bg-gray-100 text-center bg-gray-50 border border-black border-r"><div className="flex items-center justify-center">4/1 {getSortIcon('c4_1')}</div></TableHead>
                                            <TableHead style={{ width: '90px' }} className="text-center border-r">
                                                <div className="flex items-center gap-1 justify-center">
                                                    <Button
                                                        variant="ghost"
                                                        className="h-auto p-0 font-bold hover:bg-transparent hover:text-blue-600 truncate max-w-[60px]"
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
                                            <TableHead style={{ width: '90px' }} className="text-center border-r">
                                                <div className="flex items-center gap-1 justify-center">
                                                    <Button
                                                        variant="ghost"
                                                        className="h-auto p-0 font-bold hover:bg-transparent hover:text-blue-600 truncate max-w-[60px]"
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
                                            <TableHead style={{ width: '90px', borderRight: '1px solid black' }} className="text-center">
                                                <div className="flex items-center gap-1 justify-center">
                                                    <Button
                                                        variant="ghost"
                                                        className="h-auto p-0 font-bold hover:bg-transparent hover:text-blue-600 truncate max-w-[60px]"
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
                                            <TableHead className="text-center border-r">
                                                <div className="flex items-center gap-1 justify-center">
                                                    <span className="font-bold">Delta</span>
                                                </div>
                                            </TableHead><TableHead className="text-center border-r">
                                                <div className="flex items-center gap-1 justify-center">
                                                    <span className="font-bold">Delta %</span>
                                                </div>
                                            </TableHead>
                                            <TableHead style={{ width: '100px' }} className="text-center">
                                                <div className="flex items-center gap-1 justify-center">
                                                    <span className="font-bold">Acties</span>
                                                </div>
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {sortedJobs.map((job) => (
                                            <TableRow key={job.id}>
                                                <TableCell>{job.date}</TableCell>
                                                {/* Datum removed */}
                                                <TableCell>DT {job.orderNr}</TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="font-medium">{job.orderName}</span>
                                                        <div className="flex items-center text-xs text-gray-500 mt-0.5">
                                                            <span className="w-3 h-3 border-l border-b border-gray-300 mr-1 rounded-bl-sm inline-block"></span>
                                                            {job.version}
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="w-full text-center p-0">{formatNumber(job.pages)} blz</TableCell>
                                                <TableCell className="w-full text-center p-0">{job.exOmw}</TableCell>
                                                <TableCell className="w-full text-center p-0 border-r">{formatNumber(job.netRun)}</TableCell>
                                                <TableCell className="w-full text-center p-0 bg-gray-50">
                                                    <div className="flex justify-center">
                                                        {job.startup ? <Check className="w-4 h-4 text-green-600" /> : <span className="text-gray-300">-</span>}
                                                    </div>
                                                </TableCell>                                                <TableCell className="w-full text-center p-0 bg-gray-50">{formatNumber(job.c4_4)}</TableCell>
                                                <TableCell className="w-full text-center p-0 bg-gray-50">{formatNumber(job.c4_0)}</TableCell>
                                                <TableCell className="w-full text-center p-0 bg-gray-50">{formatNumber(job.c1_0)}</TableCell>
                                                <TableCell className="w-full text-center p-0 bg-gray-50">{formatNumber(job.c1_1)}</TableCell>
                                                <TableCell className="w-full text-center p-0 bg-gray-50 border-r">{formatNumber(job.c4_1)}</TableCell>
                                                <TableCell className="p-0 text-center">
                                                    {(() => {
                                                        const formula = getFormulaForColumn('maxGross');
                                                        return formula
                                                            ? <FormulaResultWithTooltip formula={formula.formula} job={job} result={evaluateFormula(formula.formula, job)} />
                                                            : formatNumber(job.maxGross);
                                                    })()}
                                                </TableCell>
                                                <TableCell className="p-0 text-center">
                                                    {(() => {
                                                        const formula = getFormulaForColumn('green');
                                                        return formula
                                                            ? <FormulaResultWithTooltip formula={formula.formula} job={job} result={evaluateFormula(formula.formula, job)} />
                                                            : formatNumber(job.green);
                                                    })()}
                                                </TableCell>
                                                <TableCell className="p-0 text-center" style={{ borderRight: '1px solid black' }}>
                                                    {(() => {
                                                        const formula = getFormulaForColumn('red');
                                                        return formula
                                                            ? <FormulaResultWithTooltip formula={formula.formula} job={job} result={evaluateFormula(formula.formula, job)} />
                                                            : formatNumber(job.red);
                                                    })()}
                                                </TableCell>
                                                <TableCell className="w-full text-center p-0">
                                                    {(() => {
                                                        const formula = getFormulaForColumn('delta_number');
                                                        return formula
                                                            ? formatNumber(evaluateFormula(formula.formula, job))
                                                            : formatNumber(job.delta_number);
                                                    })()}
                                                </TableCell><TableCell className="w-full text-center p-0 border-r">
                                                    {(() => {
                                                        const formula = getFormulaForColumn('delta_percentage');
                                                        const result = formula
                                                            ? evaluateFormula(formula.formula, job)
                                                            : formatNumber(job.delta_percentage);

                                                        // Format the percentage correctly
                                                        const percentageValue = typeof result === 'string'
                                                            ? parseFloat(result.replace(/\./g, '').replace(',', '.')) * 100
                                                            : result * 100;

                                                        const formattedPercentage = Math.round(percentageValue * 100) / 100; // Round to 2 decimal places

                                                        return formula
                                                            ? formattedPercentage + '%'
                                                            : formattedPercentage + '%';
                                                    })()}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex gap-2">
                                                        <Button size="sm" variant="ghost" className="hover:bg-blue-100 text-blue-600" onClick={() => handleEditJob(job)}>
                                                            <Edit className="w-4 h-4" />
                                                        </Button>
                                                        <Button size="sm" variant="ghost" className="hover:bg-red-100 text-red-500" onClick={() => handleDeleteJob(job.id)}>
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
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
            </Tabs >

            <AddFinishedJobDialog
                open={isAddJobDialogOpen}
                onOpenChange={setIsAddJobDialogOpen}
                onSubmit={handleJobSubmit}
                editJob={editingJob}
            />



            {/* Formula Builder Dialog */}
            < Dialog open={isFormulaDialogOpen} onOpenChange={setIsFormulaDialogOpen} >
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
                                    <SelectItem value="delta_number">Delta Number</SelectItem>
                                    <SelectItem value="delta_percentage">Delta Percentage</SelectItem>
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
            </Dialog >
        </div >
    );
}
