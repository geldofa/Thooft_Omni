import { useState, useCallback, useEffect } from 'react';
import { PressType, useAuth, pb } from './AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardAction } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'; // Added useEffect

import { toast } from 'sonner';
// import { pillListClass, pillTriggerClass } from '../styles/TabStyles';
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
    pages: number | null;
    exOmw: string;
    netRun: number;
    startup: boolean;
    c4_4: number;
    c4_0: number;
    c1_0: number;
    c1_1: number;
    c4_1: number;
    maxGross: number;
    green: number | null;
    red: number | null;
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
    pages: number | null;
    exOmw: string;
    netRun: number | null;
    startup: boolean;
    c4_4: number | null;
    c4_0: number | null;
    c1_0: number | null;
    c1_1: number | null;
    c4_1: number | null;
    maxGross: number;
    green: number | null;
    red: number | null;
    delta_number: number;
    delta_percentage: number;
    opmerkingen?: string;
    delta: number;
    performance: string;
    pressId?: string;
    pressName?: string;
}

interface CalculatedField {
    id: string;
    name: string;
    formula: string;
    description?: string;
    targetColumn?: 'maxGross' | 'green' | 'red' | 'delta_number' | 'delta_percentage';
}

export function Drukwerken({ presses }: { presses: Press[] }) {
    const activePresses = presses
        .filter(p => p.active && !p.archived)
        .map(p => p.name);

    // Map press names to IDs for relation linking
    const pressMap = presses.reduce((acc, press) => {
        acc[press.name] = press.id;
        return acc;
    }, {} as Record<string, string>);

    const { user } = useAuth();

    const [activeTab, setActiveTab] = useState(user?.role === 'press' ? 'werkorders' : 'finished');

    const [isAddJobDialogOpen, setIsAddJobDialogOpen] = useState(false);
    const [editingJob, setEditingJob] = useState<FinishedPrintJob | null>(null);

    const defaultWerkorderData: Omit<Werkorder, 'id' | 'katernen'> = {
        orderNr: '',
        orderName: 'Nieuwe Werkorder', // Provide a default name
        orderDate: new Date().toISOString().split('T')[0],
    };

    const defaultKaternToAdd: Omit<Katern, 'id'> = {
        version: '',
        pages: null,
        exOmw: '',
        netRun: 0,
        startup: false,
        c4_4: 0,
        c4_0: 0,
        c1_0: 0,
        c1_1: 0,
        c4_1: 0,
        maxGross: 0,
        green: null,
        red: null,
        delta: 0,
        deltaPercentage: 0,
    };

    const [werkorders, setWerkorders] = useState<Werkorder[]>([
        {
            id: '1',
            orderNr: '',
            orderName: '',
            orderDate: new Date().toISOString().split('T')[0],
            katernen: [
                { id: '1-1', version: '', pages: null, exOmw: '', netRun: 0, startup: false, c4_4: 0, c4_0: 0, c1_0: 0, c1_1: 0, c4_1: 0, maxGross: 0, green: null, red: null, delta: 0, deltaPercentage: 0 }
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
        version: '',
        pages: null,
        exOmw: '',
        netRun: 0,
        startup: false,
        c4_4: 0,
        c4_0: 0,
        c1_0: 0,
        c1_1: 0,
        c4_1: 0,
        maxGross: 0,
        green: null,
        red: null,
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

    const handleKaternChange = (werkorderId: string, katernId: string, field: keyof Katern, value: any) => {
        setWerkorders(prevWerkorders =>
            prevWerkorders.map(wo => {
                if (wo.id === werkorderId) {
                    return {
                        ...wo,
                        katernen: wo.katernen.map(k => {
                            if (k.id === katernId) {
                                // For number inputs, handle empty string and convert to number
                                if (['pages', 'netRun', 'c4_4', 'c4_0', 'c1_0', 'c1_1', 'c4_1', 'green', 'red'].includes(field)) {
                                    const parsedValue = parseFloat(value);
                                    let numValue: number | null = isNaN(parsedValue) ? null : parsedValue;

                                    if (['netRun', 'c4_4', 'c4_0', 'c1_0', 'c1_1', 'c4_1'].includes(field as string)) {
                                        if (numValue === null) {
                                            numValue = 0;
                                        }
                                    }
                                    return { ...k, [field]: numValue };
                                }
                                // For boolean (checkbox)
                                if (field === 'startup') {
                                    return { ...k, [field]: Boolean(value) };
                                }
                                return { ...k, [field]: value };
                            }
                            return k;
                        })
                    };
                }
                return wo;
            })
        );
    };

    const handleWerkorderChange = (werkorderId: string, field: 'orderNr' | 'orderName', value: string) => {
        setWerkorders(prevWerkorders =>
            prevWerkorders.map(wo => {
                if (wo.id === werkorderId) {
                    if (field === 'orderNr') {
                        // Remove "DT" prefix if present and keep only digits
                        let orderNumber = value;
                        if (value.startsWith('DT')) {
                            orderNumber = value.substring(2);
                        }
                        const numericValue = orderNumber.replace(/[^0-9]/g, '');
                        return { ...wo, orderNr: numericValue };
                    }
                    return { ...wo, [field]: value };
                }
                return wo;
            })
        );
    };

    const handleSaveOrderToFinished = async (werkorder: Werkorder) => {
        if (user?.role === 'press' && !user.pressId) {
            toast.error("Kan niet opslaan: Persgegevens nog niet geladen. Probeer het over enkele seconden opnieuw.");
            return;
        }
        try {
            const promises = werkorder.katernen.map(async (katern) => {
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


                // Prepare data for PocketBase
                const pbData: any = {
                    order_nummer: parseInt(werkorder.orderNr),
                    klant_order_beschrijving: werkorder.orderName,
                    versie: katern.version,
                    blz: katern.pages,
                    ex_omw: katern.exOmw, // Assuming string like "2", check collection type if number
                    netto_oplage: katern.netRun,
                    opstart: katern.startup,
                    k_4_4: katern.c4_4,
                    k_4_0: katern.c4_0,
                    k_1_0: katern.c1_0,
                    k_1_1: katern.c1_1,
                    k_4_1: katern.c4_1,
                    max_bruto: maxGrossVal,
                    groen: Number(calculatedGreen) || 0,
                    rood: Number(calculatedRed) || 0,
                    delta: Number(calculatedDeltaNumber) || 0,
                    delta_percent: Number(calculatedDeltaPercentage) || 0,
                    opmerking: '', // No field in UI yet
                    pers: user?.pressId // Link to press
                };

                // Save to PocketBase
                const record = await pb.collection('drukwerken').create(pbData);

                return {
                    ...jobWithMaxGross,
                    id: record.id,
                    green: Number(calculatedGreen) || 0,
                    red: Number(calculatedRed) || 0,
                    delta_number: Number(calculatedDeltaNumber) || 0,
                    delta_percentage: Number(calculatedDeltaPercentage) || 0,
                    delta: Number(calculatedDeltaNumber) || 0,
                    performance: '100%',
                    pressId: user?.pressId,
                    pressName: user?.press
                };
            });

            await Promise.all(promises);

            fetchFinishedJobs(); // Refresh all jobs from server

            // Clear the Werkorder form by resetting to a new blank state
            setWerkorders(prev => prev.map(wo => {
                if (wo.id === werkorder.id) {
                    return {
                        id: Date.now().toString(), // New ID
                        orderNr: '',
                        orderName: '',
                        orderDate: new Date().toISOString().split('T')[0],
                        katernen: [
                            { id: Date.now().toString() + '-1', version: '', pages: null, exOmw: '', netRun: 0, startup: false, c4_4: 0, c4_0: 0, c1_0: 0, c1_1: 0, c4_1: 0, maxGross: 0, green: null, red: null, delta: 0, deltaPercentage: 0 }
                        ]
                    };
                }
                return wo;
            }));

            // Switch to Finished tab to show result
            setActiveTab('finished');
            toast.success("Order succesvol opgeslagen en formulier gewist.");

        } catch (error) {
            console.error("Error saving order:", error);
            toast.error("Fout bij opslaan order. Controleer console.");
        }
    };




    // Parameters state - one set per press
    const [parameters, setParameters] = useState<Record<string, Record<string, any>>>(() => {
        const initial: Record<string, Record<string, any>> = {};
        activePresses.forEach(press => {
            initial[press] = {
                id: '', // PocketBase Record ID
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

    // Fetch parameters from PocketBase on mount
    useEffect(() => {
        const fetchParameters = async () => {
            try {
                // Fetch all press parameters (expand press relation if needed, but we rely on linking by press ID)
                const records = await pb.collection('press_parameters').getFullList();

                setParameters(prev => {
                    const updated = { ...prev };

                    activePresses.forEach(pressName => {
                        const pressId = pressMap[pressName];
                        // Find parameter record for this press
                        const record = records.find((r: any) => r.press === pressId);

                        if (record) {
                            updated[pressName] = {
                                id: record.id,
                                marge: parseFloat(record.margePercentage?.replace(',', '.') || '0') / 100 || 0, // derived logic might need adjustment if storing both
                                margePercentage: record.marge || '4,2', // Mapping 'marge' from DB to 'margePercentage' text in UI based on schema
                                opstart: record.opstart || 6000,
                                param_4_4: record.param_4_4 || 4000,
                                param_4_0: record.param_4_0 || 3000,
                                param_1_0: record.param_1_0 || 1500,
                                param_1_1: record.param_1_1 || 2000,
                                param_4_1: record.param_4_1 || 3500
                            };
                        }
                    });

                    return updated;
                });
            } catch (error) {
                console.error("Error fetching parameters:", error);
            }
        };

        if (activePresses.length > 0) {
            fetchParameters();
        }
    }, [activePresses.join(',')]); // Dependency on active presses list

    // Helper to get formula for a specific column
    const getFormulaForColumn = (col: 'maxGross' | 'green' | 'red' | 'delta_number' | 'delta_percentage') => calculatedFields.find(f => f.targetColumn === col);

    // Track which parameters are linked across presses
    const [linkedParams, setLinkedParams] = useState<Record<string, boolean>>(() => {
        const saved = localStorage.getItem('drukwerken_linked_params');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.error("Failed to parse linked params from localStorage", e);
            }
        }
        return {
            marge: false,
            margePercentage: false,
            opstart: false,
            param_4_4: false,
            param_4_0: false,
            param_1_0: false,
            param_1_1: false,
            param_4_1: false
        };
    });

    useEffect(() => {
        localStorage.setItem('drukwerken_linked_params', JSON.stringify(linkedParams));
    }, [linkedParams]);

    const updateDb = async (pressName: string, field: string, val: any) => {
        const pressId = pressMap[pressName];
        if (!pressId) return;

        // Map UI fields to DB fields
        const dbData: any = {};
        if (field === 'margePercentage') dbData.marge = val;
        else dbData[field] = val;

        try {
            const currentParams = parameters[pressName];
            let recordId = currentParams?.id;

            if (recordId) {
                await pb.collection('press_parameters').update(recordId, dbData);
            } else {
                try {
                    const existing = await pb.collection('press_parameters').getFirstListItem(`press="${pressId}"`);
                    recordId = existing.id;
                    await pb.collection('press_parameters').update(recordId, dbData);
                    setParameters(curr => ({
                        ...curr,
                        [pressName]: { ...curr[pressName], id: recordId }
                    }));
                } catch (err: any) {
                    if (err.status === 404) {
                        dbData.press = pressId;
                        const created = await pb.collection('press_parameters').create(dbData);
                        setParameters(curr => ({
                            ...curr,
                            [pressName]: { ...curr[pressName], id: created.id }
                        }));
                    } else throw err;
                }
            }
        } catch (err) {
            console.error(`Failed to save parameter ${field} for ${pressName}:`, err);
            toast.error(`Kon parameter niet opslaan: ${field}`);
        }
    };

    const handleParameterChange = (press: string, param: string, value: any) => {
        if (linkedParams[param]) {
            const newParameters = { ...parameters };
            activePresses.forEach(p => {
                newParameters[p] = { ...newParameters[p], [param]: value };
                updateDb(p, param, value);
            });
            setParameters(newParameters);
        } else {
            setParameters(prev => ({
                ...prev,
                [press]: { ...prev[press], [param]: value }
            }));
            updateDb(press, param, value);
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
                // Persist synced value to all presses
                updateDb(press, param, firstPressValue);
            });
            setParameters(updated);
        }
    };

    const [finishedJobs, setFinishedJobs] = useState<FinishedPrintJob[]>([]);

    const fetchFinishedJobs = useCallback(async () => {
        try {
            let filter = '';
            if (user?.role === 'press' && user.press) {
                // If the migration used 'pers' relation, we filter by that
                // If it's a relation, we should use the ID if possible, but the name is also available in some contexts.
                // Given I added 'pressId' to user, I'll use that.
                if (user.pressId) {
                    filter = `pers = "${user.pressId}"`;
                } else {
                    // Fallback to name if ID not yet available (shouldn't happen with updated AuthContext)
                    filter = `pers.naam = "${user.press}"`;
                }
            }

            const records = await pb.collection('drukwerken').getFullList({
                sort: '-created',
                filter: filter
            });

            console.log("Fetched records count:", records.length, "Filter used:", filter);
            console.log("Logged in user:", { role: user?.role, press: user?.press, pressId: user?.pressId });

            // Strict filtering: only keep records that definitely belong to this press
            const filteredRecords = (user?.role === 'press' && user.press)
                ? records.filter((r: any) => {
                    const hasMatch = (user.pressId && r.pers === user.pressId) ||
                        (user.press && r.expand?.pers?.naam === user.press);
                    return hasMatch;
                })
                : records;

            console.log("Filtered records count:", filteredRecords.length);

            setFinishedJobs(filteredRecords.map((r: any) => ({
                id: r.id,
                date: r.created.split('T')[0],
                datum: r.created.split('T')[0].split('-').slice(1).reverse().join('-'), // simple format
                orderNr: String(r.order_nummer || ''),
                orderName: r.klant_order_beschrijving || '',
                version: r.versie || '',
                pages: r.blz,
                exOmw: String(r.ex_omw || ''),
                netRun: r.netto_oplage,
                startup: !!r.opstart,
                c4_4: r.k_4_4,
                c4_0: r.k_4_0,
                c1_0: r.k_1_0,
                c1_1: r.k_1_1,
                c4_1: r.k_4_1,
                maxGross: r.max_bruto || 0,
                green: r.groen,
                red: r.rood,
                delta_number: r.delta || 0,
                delta_percentage: r.delta_percent || 0,
                delta: r.delta || 0,
                performance: '100%',
                pressId: r.pers,
                pressName: (user?.role === 'press' && user.pressId === r.pers) ? user.press : (r.expand?.pers?.naam || '')
            })));
        } catch (error) {
            console.error("Error fetching finished jobs:", error);
        }
    }, [user]);

    useEffect(() => {
        fetchFinishedJobs();
    }, [fetchFinishedJobs]);

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

    const handleJobSubmit = async (jobData: Omit<FinishedPrintJob, 'id'>) => {
        if (user?.role === 'press' && !user.pressId) {
            toast.error("Kan niet opslaan: Persgegevens nog niet geladen.");
            return;
        }
        const processedJob = processJobFormulas(jobData);
        try {
            const pbData: any = {
                order_nummer: parseInt(processedJob.orderNr),
                klant_order_beschrijving: processedJob.orderName,
                versie: processedJob.version,
                blz: processedJob.pages,
                ex_omw: processedJob.exOmw,
                netto_oplage: processedJob.netRun,
                opstart: processedJob.startup,
                k_4_4: processedJob.c4_4,
                k_4_0: processedJob.c4_0,
                k_1_0: processedJob.c1_0,
                k_1_1: processedJob.c1_1,
                k_4_1: processedJob.c4_1,
                max_bruto: processedJob.maxGross,
                groen: processedJob.green,
                rood: processedJob.red,
                delta: processedJob.delta_number,
                delta_percent: processedJob.delta_percentage,
                opmerking: processedJob.opmerkingen,
                pers: user?.pressId
            };

            if (editingJob) {
                // Update existing job
                await pb.collection('drukwerken').update(editingJob.id, pbData);
                toast.success("Drukwerk succesvol bijgewerkt.");
            } else {
                // Add new job
                await pb.collection('drukwerken').create(pbData);
                toast.success("Drukwerk succesvol toegevoegd.");
            }
            fetchFinishedJobs(); // Refresh from server
        } catch (error) {
            console.error("Error saving job:", error);
            toast.error("Fout bij opslaan drukwerk.");
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
                const percentage = maxGrossVal !== 0 ? (((job.green ?? 0) + (job.red ?? 0)) / maxGrossVal) * 100 : 0;
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

    const handleDeleteJob = async (jobId: string) => {
        if (!confirm("Weet u zeker dat u dit drukwerk wilt verwijderen?")) return;
        try {
            await pb.collection('drukwerken').delete(jobId);
            toast.success("Drukwerk verwijderd.");
            fetchFinishedJobs();
        } catch (error) {
            console.error("Error deleting job:", error);
            toast.error("Fout bij verwijderen drukwerk.");
        }
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
        let evalFormula = formula;
        try {
            // Return early if formula is empty
            if (!formula || !formula.trim()) {
                return '';
            }

            // Helper function for IF logic
            const IF = (condition: boolean, trueVal: any, falseVal: any) => condition ? trueVal : falseVal;

            // Get parameters for the specific press if available, else first active press
            const jobPressName = (job as any).pressName;
            const pressParams = (jobPressName && parameters[jobPressName])
                ? parameters[jobPressName]
                : (activePresses.length > 0 ? parameters[activePresses[0]] : {});

            // Helper function to escape regex special characters
            const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

            // Replace finished job fields
            finishedFields.forEach(field => {
                const regex = new RegExp('\\b' + escapeRegex(field.key) + '\\b', 'g');
                let value: any = (job as any)[field.key];

                if (value === null) {
                    value = 0;
                }

                // Special handling for startup (Opstart)
                if (field.key === 'startup') {
                    // If startup is checked (true), use the Opstart parameter value
                    // If unchecked (false), use 0
                    value = value ? (pressParams['opstart'] || 0) : 0;
                }

                // Sanitize value: replace comma with dot for formula evaluation
                const sValue = String(value);
                let sanitizedValue = sValue;
                const commaCount = (sValue.match(/,/g) || []).length;

                if (commaCount > 0) {
                    if (commaCount === 1) {
                        // This is likely a decimal separator
                        sanitizedValue = sValue.replace(/\./g, '').replace(',', '.');
                    } else {
                        // Multiple commas, e.g. "1,2,3". This is not a valid number for us.
                        // We will strip all commas to avoid a syntax error.
                        sanitizedValue = sValue.replace(/,/g, '');
                    }
                }
                evalFormula = evalFormula.replace(regex, sanitizedValue);
            });

            // Replace parameter fields with actual values from the first active press
            parameterFields.forEach(field => {
                const regex = new RegExp('\\b' + escapeRegex(field.key) + '\\b', 'g');
                // Map friendly parameter keys to internal state keys
                let paramKey = field.key;
                if (field.key === 'Marge') paramKey = 'marge';
                if (field.key === 'Opstart') paramKey = 'opstart';

                let value = pressParams[paramKey] || 0;

                // Special handling for Marge percentage parsing (e.g., "4,2" -> 0.042)
                if (paramKey === 'marge') {
                    const sMarge = String(pressParams['margePercentage'] || '0');
                    const cleanMarge = sMarge.includes(',') ? sMarge.replace(/\./g, '').replace(',', '.') : sMarge;
                    value = (parseFloat(cleanMarge) || 0) / 100;
                }

                // Sanitize value
                const sValue = String(value);
                let sanitizedValue = sValue;
                const commaCount = (sValue.match(/,/g) || []).length;
                if (commaCount > 0) {
                    if (commaCount === 1) {
                        sanitizedValue = sValue.replace(/\./g, '').replace(',', '.');
                    } else {
                        sanitizedValue = sValue.replace(/,/g, '');
                    }
                }
                evalFormula = evalFormula.replace(regex, sanitizedValue);
            });

            // Evaluate the formula safely with the IF function in scope
            const result = Function('IF', '"use strict"; return (' + evalFormula + ')')(IF);

            // Format the result with thousand separators
            if (typeof result === 'number') {
                const rounded = Math.round(result * 100) / 100;
                // Format with dots as thousand separators (European style)
                return rounded;
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
        const formattedResult = typeof result === 'number' ? formatNumber(result) : result;

        if (!explanation || explanation.length === 0) {
            return <span>{formattedResult}</span>;
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
                    <span className="cursor-help border-b border-dashed border-gray-400">{formattedResult}</span>
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
                            <span className="font-bold text-sm" style={{ color: '#1f2937' }}>{formattedResult}</span>
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

        let sanitizedFormula = currentFormula;
        const numbersWithComma = currentFormula.match(/\d+,\d+/g);
        if (numbersWithComma) {
            numbersWithComma.forEach(numStr => {
                const sanitizedNum = numStr.replace(',', '.');
                sanitizedFormula = sanitizedFormula.replace(numStr, sanitizedNum);
            });
        }

        if (editingFormula) {
            setCalculatedFields(calculatedFields.map(f =>
                f.id === editingFormula.id
                    ? { ...f, name: formulaName, formula: sanitizedFormula, targetColumn }
                    : f
            ));
        } else {
            const newField: CalculatedField = {
                id: Date.now().toString(),
                name: formulaName,
                formula: sanitizedFormula,
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

    if (user?.role === 'press' && !user.pressId) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center space-y-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                    <p className="text-gray-500">Persgegevens laden...</p>
                </div>
            </div>
        );
    }

    const previewResult = (() => {
        if (finishedJobs.length > 0) {
            const res = evaluateFormula(currentFormula, finishedJobs[0]);
            if (typeof res === 'number') {
                return formatNumber(res);
            }
            return res || 'N/A'; // Show empty string as N/A
        }
        return 'N/A';
    })();

    return (
        <div className="space-y-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="tab-pill-list">
                    {user?.role === 'press' && (
                        <TabsTrigger value="werkorders" className="tab-pill-trigger">Werkorders</TabsTrigger>
                    )}
                    <TabsTrigger value="finished" className="tab-pill-trigger">Finished</TabsTrigger>
                    {user?.role !== 'press' && (
                        <TabsTrigger value="parameters" className="tab-pill-trigger">Parameters</TabsTrigger>
                    )}
                </TabsList>

                {user?.role === 'press' && (
                    <TabsContent value="werkorders">
                        <Card>
                            <CardHeader>
                                <CardTitle className="pl-4">Werkorders</CardTitle>
                                <CardAction>
                                    <Button onClick={() => handleWerkorderSubmit(defaultWerkorderData)}><Plus className="w-4 h-4 mr-2" /> Werkorder</Button>
                                </CardAction>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {werkorders.map((wo) => (
                                    <div key={wo.id} className="border p-4 rounded-lg">
                                        <div className="flex justify-between items-center mb-4">
                                            <div className="flex gap-4 w-full items-end">
                                                <div className="flex flex-col items-center">
                                                    <Label>Order Nr</Label>
                                                    <Input value={`DT${wo.orderNr}`} onChange={(e) => handleWerkorderChange(wo.id, 'orderNr', e.target.value)} style={{ width: '85px' }} className="text-center p-0 border-0 focus-visible:ring-0 focus-visible:ring-offset-0" />
                                                </div>
                                                <div className="flex-1">
                                                    <Label className="pl-3">Order</Label>
                                                    <Input value={wo.orderName} onChange={(e) => handleWerkorderChange(wo.id, 'orderName', e.target.value)} className="w-full border-0 focus-visible:ring-0 focus-visible:ring-offset-0" />
                                                </div>
                                            </div>
                                        </div>
                                        <Table className="w-full">
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead colSpan={4} className="text-center bg-blue-100" style={{ borderRight: '2px solid #e5e7eb' }}>Data</TableHead>
                                                    <TableHead colSpan={6} className="text-center bg-green-100" style={{ borderRight: '2px solid #e5e7eb' }}>Wissels</TableHead>
                                                    <TableHead colSpan={3} className="text-center bg-yellow-100" style={{ borderRight: '2px solid #e5e7eb' }}>Berekening</TableHead>
                                                    <TableHead colSpan={2} className="text-center bg-purple-100">Prestatie</TableHead>
                                                    <TableHead colSpan={1}></TableHead> {/* Actions */}
                                                </TableRow>
                                                <TableRow>
                                                    <TableHead>Version</TableHead>
                                                    <TableHead>Blz</TableHead>
                                                    <TableHead>Ex/Omw</TableHead>
                                                    <TableHead style={{ borderRight: '2px solid #e5e7eb' }}>Net Run</TableHead>
                                                    <TableHead className="text-center">Startup</TableHead>
                                                    <TableHead className="text-center">4/4</TableHead>
                                                    <TableHead className="text-center">4/0</TableHead>
                                                    <TableHead className="text-center">1/0</TableHead>
                                                    <TableHead className="text-center">1/1</TableHead>
                                                    <TableHead className="text-center" style={{ borderRight: '2px solid #e5e7eb' }}>4/1</TableHead>
                                                    <TableHead>Max Gross</TableHead>
                                                    <TableHead>Groen</TableHead>
                                                    <TableHead className="border-r" style={{ borderRight: '2px solid #e5e7eb' }}>Rood</TableHead>
                                                    <TableHead>Delta</TableHead>
                                                    <TableHead>Delta %</TableHead>
                                                    <TableHead></TableHead>                                                                                        </TableRow>
                                            </TableHeader>                                            <TableBody>
                                                {wo.katernen.map((katern) => {
                                                    const jobWithOrderInfo = { ...katern, orderNr: wo.orderNr, orderName: wo.orderName };
                                                    const maxGrossVal = getFormulaForColumn('maxGross')
                                                        ? evaluateFormula(getFormulaForColumn('maxGross')!.formula, jobWithOrderInfo) as number
                                                        : katern.maxGross;

                                                    const jobWithCalculatedMaxGross = { ...jobWithOrderInfo, maxGross: maxGrossVal };
                                                    return (
                                                        <TableRow key={katern.id}>
                                                            <TableCell>
                                                                <Input value={katern.version} onChange={(e) => handleKaternChange(wo.id, katern.id, 'version', e.target.value)} />
                                                            </TableCell>
                                                            <TableCell>
                                                                <Input type="number" value={katern.pages || ''} onChange={(e) => handleKaternChange(wo.id, katern.id, 'pages', e.target.value)} />
                                                            </TableCell>
                                                            <TableCell>
                                                                <Input value={katern.exOmw} onChange={(e) => handleKaternChange(wo.id, katern.id, 'exOmw', e.target.value)} />
                                                            </TableCell>
                                                            <TableCell style={{ borderRight: '2px solid #e5e7eb' }}>
                                                                <Input type="number" value={katern.netRun} onChange={(e) => handleKaternChange(wo.id, katern.id, 'netRun', e.target.value)} />
                                                            </TableCell>
                                                            <TableCell className="text-center">
                                                                <Checkbox checked={katern.startup} onCheckedChange={(checked) => handleKaternChange(wo.id, katern.id, 'startup', checked)} />
                                                            </TableCell>
                                                            <TableCell>
                                                                <Input title="4-4" value={katern.c4_4} onChange={(e) => handleKaternChange(wo.id, katern.id, 'c4_4', e.target.value)} className="p-1 px-2 h-8 text-xs text-center" />
                                                            </TableCell>
                                                            <TableCell>
                                                                <Input title="4-0" value={katern.c4_0} onChange={(e) => handleKaternChange(wo.id, katern.id, 'c4_0', e.target.value)} className="p-1 px-2 h-8 text-xs text-center" />
                                                            </TableCell>
                                                            <TableCell>
                                                                <Input title="1-0" value={katern.c1_0} onChange={(e) => handleKaternChange(wo.id, katern.id, 'c1_0', e.target.value)} className="p-1 px-2 h-8 text-xs text-center" />
                                                            </TableCell>
                                                            <TableCell>
                                                                <Input title="1-1" value={katern.c1_1} onChange={(e) => handleKaternChange(wo.id, katern.id, 'c1_1', e.target.value)} className="p-1 px-2 h-8 text-xs text-center" />
                                                            </TableCell>
                                                            <TableCell style={{ borderRight: '2px solid #e5e7eb' }}>
                                                                <Input title="4-1" value={katern.c4_1} onChange={(e) => handleKaternChange(wo.id, katern.id, 'c4_1', e.target.value)} className="p-1 px-2 h-8 text-xs text-center" />
                                                            </TableCell>
                                                            <TableCell style={{ borderRight: '2px solid #e5e7eb' }}>
                                                                <Input type="number" value={maxGrossVal} readOnly={!!getFormulaForColumn('maxGross')} className={getFormulaForColumn('maxGross') ? "bg-gray-100" : ""} />
                                                            </TableCell>
                                                            <TableCell>
                                                                <Input type="number" value={katern.green || ''} onChange={(e) => handleKaternChange(wo.id, katern.id, 'green', e.target.value)} />
                                                            </TableCell>
                                                            <TableCell style={{ borderRight: '2px solid #e5e7eb' }}>
                                                                <Input type="number" value={katern.red || ''} onChange={(e) => handleKaternChange(wo.id, katern.id, 'red', e.target.value)} />
                                                            </TableCell>
                                                            <TableCell className="text-center font-medium">
                                                                {(() => {
                                                                    const f = getFormulaForColumn('delta_number');
                                                                    const result = f ? evaluateFormula(f.formula, jobWithCalculatedMaxGross) : 0;
                                                                    return formatNumber(result);
                                                                })()}
                                                            </TableCell>
                                                            <TableCell className="text-center font-medium">
                                                                {(() => {
                                                                    const f = getFormulaForColumn('delta_percentage');
                                                                    const result = f ? evaluateFormula(f.formula, jobWithCalculatedMaxGross) : katern.deltaPercentage;
                                                                    const numericValue = typeof result === 'string'
                                                                        ? parseFloat(result.replace(/\./g, '').replace(',', '.'))
                                                                        : result;

                                                                    if (isNaN(numericValue as number)) {
                                                                        return '0.00%';
                                                                    }

                                                                    return `${(numericValue * 100).toFixed(2)}%`;
                                                                })()}
                                                            </TableCell>
                                                            <TableCell>
                                                                <Button size="sm" variant="ghost" className="hover:bg-red-100 text-red-500">
                                                                    <Trash2 className="w-4 h-4" />
                                                                </Button>
                                                            </TableCell>
                                                        </TableRow>
                                                    )
                                                })}
                                            </TableBody>
                                        </Table>
                                        <div className="flex justify-between items-center mt-2">
                                            <Button onClick={() => handleAddKaternClick(wo.id)} size="sm" variant="ghost">
                                                <Plus className="w-4 h-4 mr-1" /> Katern/Versie toevoegen
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
                )}

                <TabsContent value="finished">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Afgewerkte Drukwerken</CardTitle>
                            <div className="flex gap-2 items-center">
                                <Select value={searchField} onValueChange={setSearchField}>
                                    <SelectTrigger className="w-[130px]">
                                        <SelectValue placeholder="Filteren op" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Alle Velden</SelectItem>
                                        <SelectItem value="orderNr">Ordernr</SelectItem>
                                        <SelectItem value="orderName">Ordernaam</SelectItem>
                                        <SelectItem value="date">Datum</SelectItem>
                                    </SelectContent>
                                </Select>
                                <div className="relative">
                                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                                    <Input
                                        placeholder="Zoeken..."
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
                                            <TableHead onClick={() => handleSort('pages')} style={{ width: '55px' }} className="cursor-pointer hover:bg-gray-100 text-center border-r"><div className="flex items-center justify-center">Blz {getSortIcon('pages')}</div></TableHead>
                                            <TableHead onClick={() => handleSort('exOmw')} style={{ width: '55px' }} className="cursor-pointer hover:bg-gray-100 text-center leading-3 border-r"><div className="flex items-center justify-center h-full">Ex/<br />Omw. {getSortIcon('exOmw')}</div></TableHead>
                                            <TableHead onClick={() => handleSort('netRun')} style={{ width: '100px' }} className="cursor-pointer hover:bg-gray-100 text-center border-r"><div className="flex items-center justify-center">Oplage netto {getSortIcon('netRun')}</div></TableHead>
                                            <TableHead onClick={() => handleSort('startup')} style={{ width: '55px' }} className="cursor-pointer hover:bg-gray-100 text-center bg-gray-50"><div className="flex items-center justify-center">Opstart {getSortIcon('startup')}</div></TableHead>
                                            <TableHead onClick={() => handleSort('c4_4')} style={{ width: '55px' }} className="cursor-pointer hover:bg-gray-100 text-center bg-gray-50 border border-black"><div className="flex items-center justify-center">4/4 {getSortIcon('c4_4')}</div></TableHead>
                                            <TableHead onClick={() => handleSort('c4_0')} style={{ width: '55px' }} className="cursor-pointer hover:bg-gray-100 text-center bg-gray-50 border border-black"><div className="flex items-center justify-center">4/0 {getSortIcon('c4_0')}</div></TableHead>
                                            <TableHead onClick={() => handleSort('c1_0')} style={{ width: '55px' }} className="cursor-pointer hover:bg-gray-100 text-center bg-gray-50 border border-black"><div className="flex items-center justify-center">1/0 {getSortIcon('c1_0')}</div></TableHead>
                                            <TableHead onClick={() => handleSort('c1_1')} style={{ width: '55px' }} className="cursor-pointer hover:bg-gray-100 text-center bg-gray-50 border border-black"><div className="flex items-center justify-center">1/1 {getSortIcon('c1_1')}</div></TableHead>
                                            <TableHead onClick={() => handleSort('c4_1')} style={{ width: '55px' }} className="cursor-pointer hover:bg-gray-100 text-center bg-gray-50 border border-black border-r"><div className="flex items-center justify-center">4/1 {getSortIcon('c4_1')}</div></TableHead>
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
                                            <TableHead style={{ width: '90px' }} className="text-center border-r">
                                                <div className="flex items-center gap-1 justify-center">
                                                    <span className="font-bold">Delta</span>
                                                </div>
                                            </TableHead><TableHead style={{ width: '55px' }} className="text-center border-r">
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
                                            <TableRow key={job.id} className="h-8 hover:bg-gray-100 [&>td]:hover:bg-gray-100 transition-colors">
                                                <TableCell className="py-1 px-2">{job.date}</TableCell>
                                                {/* Datum removed */}
                                                <TableCell className="py-1 px-2">DT{job.orderNr}</TableCell>
                                                <TableCell className="py-1 px-2">
                                                    <span className="font-medium mr-2">{job.orderName}</span>
                                                    <span className="text-gray-500 whitespace-nowrap">{job.version}</span>
                                                </TableCell>
                                                <TableCell className="text-center py-1 px-1">{formatNumber(job.pages)} blz</TableCell>
                                                <TableCell className="text-center py-1 px-1">{job.exOmw}</TableCell>
                                                <TableCell className="text-center py-1 px-1 border-r">{formatNumber(job.netRun)}</TableCell>
                                                <TableCell className="text-center py-1 px-1 bg-gray-50">
                                                    <div className="flex justify-center">
                                                        {job.startup ? <Check className="w-4 h-4 text-green-600" /> : <span className="text-gray-300">-</span>}
                                                    </div>
                                                </TableCell>                                                <TableCell className="text-center py-1 px-1 bg-gray-50">{formatNumber(job.c4_4)}</TableCell>
                                                <TableCell className="text-center py-1 px-1 bg-gray-50">{formatNumber(job.c4_0)}</TableCell>
                                                <TableCell className="text-center py-1 px-1 bg-gray-50">{formatNumber(job.c1_0)}</TableCell>
                                                <TableCell className="text-center py-1 px-1 bg-gray-50">{formatNumber(job.c1_1)}</TableCell>
                                                <TableCell className="text-center py-1 px-1 bg-gray-50 border-r">{formatNumber(job.c4_1)}</TableCell>
                                                <TableCell className="py-1 px-1 text-center">
                                                    {(() => {
                                                        const formula = getFormulaForColumn('maxGross');
                                                        return formula
                                                            ? <FormulaResultWithTooltip formula={formula.formula} job={job} result={evaluateFormula(formula.formula, job)} />
                                                            : formatNumber(job.maxGross);
                                                    })()}
                                                </TableCell>
                                                <TableCell className="py-1 px-1 text-center">
                                                    {(() => {
                                                        const formula = getFormulaForColumn('green');
                                                        return formula
                                                            ? <FormulaResultWithTooltip formula={formula.formula} job={job} result={evaluateFormula(formula.formula, job)} />
                                                            : formatNumber(job.green);
                                                    })()}
                                                </TableCell>
                                                <TableCell className="py-1 px-1 text-center" style={{ borderRight: '1px solid black' }}>
                                                    {(() => {
                                                        const formula = getFormulaForColumn('red');
                                                        return formula
                                                            ? <FormulaResultWithTooltip formula={formula.formula} job={job} result={evaluateFormula(formula.formula, job)} />
                                                            : formatNumber(job.red);
                                                    })()}
                                                </TableCell>
                                                <TableCell className="text-center py-1 px-1">
                                                    {(() => {
                                                        const formula = getFormulaForColumn('delta_number');
                                                        return formula
                                                            ? formatNumber(evaluateFormula(formula.formula, job))
                                                            : formatNumber(job.delta_number);
                                                    })()}
                                                </TableCell><TableCell className="text-center py-1 px-1 border-r">
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
                                                <TableCell className="py-1 px-1">
                                                    <div className="flex gap-1 justify-center">
                                                        <Button size="icon" variant="ghost" className="h-6 w-6 hover:bg-blue-100 text-blue-600" onClick={() => handleEditJob(job)}>
                                                            <Edit className="w-3 h-3" />
                                                        </Button>
                                                        <Button size="icon" variant="ghost" className="h-6 w-6 hover:bg-red-100 text-red-500" onClick={() => handleDeleteJob(job.id)}>
                                                            <Trash2 className="w-3 h-3" />
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

                {user?.role !== 'press' && (
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
                                                            Preview: {(() => {
                                                                if (finishedJobs.length > 0) {
                                                                    const res = evaluateFormula(field.formula, finishedJobs[0]);
                                                                    return typeof res === 'number' ? formatNumber(res) : res;
                                                                }
                                                                return 'No data';
                                                            })()}
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
                )}
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
                                                const rawValue = (e.target as HTMLInputElement).value;
                                                const sanitized = rawValue.replace(',', '.');
                                                addToFormula(sanitized);
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