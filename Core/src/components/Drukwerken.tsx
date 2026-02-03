import { useState, useCallback, useEffect, useMemo } from 'react';
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
import { FormattedNumberInput } from './ui/FormattedNumberInput';
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

// --- CONFIGURATION CONSTANTS ---
// EDIT THESE TO CHANGE LAYOUT AND TYPOGRAPHY FROM ONE PLACE
const COL_WIDTHS = {
    version: '400px',
    press: '80px',
    date: '85px',
    orderNr: '65px',
    orderName: '150px',
    pages: '55px',
    exOmw: '55px',
    netRun: '100px',
    startup: '55px',
    c4_4: '55px',
    c4_0: '55px',
    c1_0: '55px',
    c1_1: '55px',
    c4_1: '55px',
    maxGross: '90px',
    green: '90px',
    red: '90px',
    delta: '90px',
    deltaPercent: '55px',
    actions: '40px'
};

const FONT_SIZES = {
    title: 'text-2xl',      // Main report titles
    section: 'text-lg',    // Category headers
    body: 'text-sm',       // Table rows and general text
    label: 'text-xs',      // Small subtext
};

export function Drukwerken({ presses }: { presses: Press[] }) {
    const activePresses = presses
        .filter(p => p.active && !p.archived)
        .map(p => p.name);

    // Map press names to IDs for relation linking
    const pressMap = presses.reduce((acc, press) => {
        acc[press.name] = press.id;
        return acc;
    }, {} as Record<string, string>);

    const { user, hasPermission } = useAuth();

    const [activeTab, setActiveTab] = useState(() => {
        if (typeof sessionStorage !== 'undefined') {
            const saved = sessionStorage.getItem('drukwerken_activeTab');
            if (saved) return saved;
        }
        return user?.role === 'press' ? 'werkorders' : 'finished';
    });

    useEffect(() => {
        if (typeof sessionStorage !== 'undefined') {
            sessionStorage.setItem('drukwerken_activeTab', activeTab);
        }
    }, [activeTab]);

    const [isAddJobDialogOpen, setIsAddJobDialogOpen] = useState(false);
    const [editingJobs, setEditingJobs] = useState<FinishedPrintJob[]>([]);

    const defaultWerkorderData: Omit<Werkorder, 'id' | 'katernen'> = {
        orderNr: '',
        orderName: '', // Provide a default name
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

    const [werkorders, setWerkorders] = useState<Werkorder[]>(() => {
        const stored = localStorage.getItem('thooft_werkorders');
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch (e) {
                console.error("Failed to parse stored werkorders:", e);
            }
        }
        return [
            {
                id: '1',
                orderNr: '',
                orderName: '',
                orderDate: new Date().toISOString().split('T')[0],
                katernen: [
                    { id: '1-1', version: '', pages: null, exOmw: '', netRun: 0, startup: false, c4_4: 0, c4_0: 0, c1_0: 0, c1_1: 0, c4_1: 0, maxGross: 0, green: null, red: null, delta: 0, deltaPercentage: 0 }
                ]
            }
        ];
    });

    // Save werkorders to localStorage whenever they change
    useEffect(() => {
        localStorage.setItem('thooft_werkorders', JSON.stringify(werkorders));
    }, [werkorders]);


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

    const handleDeleteWerkorder = (werkorderId: string) => {
        setWerkorders(prev => {
            if (prev.length <= 1) {
                // If it's the last one, reset it instead of deleting
                return prev.map(wo => {
                    if (wo.id === werkorderId) {
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
                });
            }
            // Otherwise delete normally
            return prev.filter(wo => wo.id !== werkorderId);
        });
    };

    const handleDeleteKatern = (werkorderId: string, katernId: string) => {
        const order = werkorders.find(wo => wo.id === werkorderId);
        if (!order) return;

        if (order.katernen.length <= 1) {
            if (window.confirm("Dit is de laatste versie in deze order. Wilt u de volledige werkorder verwijderen?")) {
                handleDeleteWerkorder(werkorderId);
            }
            return;
        }

        if (window.confirm("Weet je zeker dat je deze versie (katern) wilt verwijderen?")) {
            setWerkorders(prev => prev.map(wo => {
                if (wo.id === werkorderId) {
                    return {
                        ...wo,
                        katernen: wo.katernen.filter(k => k.id !== katernId)
                    };
                }
                return wo;
            }));
        }
    };

    const handleSaveOrderToFinished = async (werkorder: Werkorder) => {
        if (!hasPermission('drukwerken_view_all') && !user?.pressId) {
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
                    date: formattedDate,
                    datum: formattedDatum,
                    order_nummer: parseInt(werkorder.orderNr),
                    klant_order_beschrijving: werkorder.orderName,
                    versie: katern.version,
                    blz: katern.pages,
                    ex_omw: parseFloat(katern.exOmw) || 0,
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
            setWerkorders(prev => {
                if (prev.length > 1) {
                    return prev.filter(wo => wo.id !== werkorder.id);
                }
                return prev.map(wo => {
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
                });
            });

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

    // Fetch parameters from PocketBase
    const fetchParameters = useCallback(async () => {
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
                            marge: parseFloat(record.margePercentage?.replace(',', '.') || '0') / 100 || 0,
                            margePercentage: record.marge || '4,2',
                            opstart: record.opstart || 6000,
                            param_4_4: record.k_4_4 || 4000,
                            param_4_0: record.k_4_0 || 3000,
                            param_1_0: record.k_1_0 || 1500,
                            param_1_1: record.k_1_1 || 2000,
                            param_4_1: record.k_4_1 || 3500
                        };
                    }
                });

                return updated;
            });
        } catch (error) {
            console.error("Error fetching parameters:", error);
        }
    }, [activePresses, pressMap]);

    useEffect(() => {
        if (activePresses.length > 0) {
            fetchParameters();
        }
    }, [fetchParameters, activePresses.length]);

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
        if (field === 'margePercentage') {
            dbData.marge = val;
        } else if (field.startsWith('param_')) {
            // Map param_X_Y to k_X_Y for database
            const dbField = field.replace('param_', 'k_');
            dbData[dbField] = val;
        } else {
            dbData[field] = val;
        }

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
            const currentYear = new Date().getFullYear();
            let filter = '';
            if (!hasPermission('drukwerken_view_all') && user?.press) {
                if (user.pressId) {
                    filter = `pers = "${user.pressId}"`;
                } else {
                    filter = `pers.naam = "${user.press}"`;
                }
            }

            // Phase 1: Load current year only (Fast load)
            const yearFilterStr = `date ~ "${currentYear}-" || datum ~ ".${currentYear}" || date ~ "${currentYear}/"`;
            const currentYearFilter = filter ? `(${filter}) && (${yearFilterStr})` : yearFilterStr;

            const firstBatch = await pb.collection('drukwerken').getFullList({
                sort: '-date,-created',
                expand: 'pers',
                filter: currentYearFilter
            });

            const mapJob = (r: any) => {
                const jobDate = r.date ? r.date.split(' ')[0] : (r.created ? r.created.split('T')[0] : '');
                return {
                    id: r.id,
                    date: jobDate,
                    datum: jobDate ? jobDate.split('-').reverse().join('.') : '',
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
                    pressName: (!hasPermission('drukwerken_view_all') && user?.pressId === r.pers) ? user?.press : (r.expand?.pers?.naam || '')
                };
            };

            const initialJobs = firstBatch.map(mapJob);
            setFinishedJobs(initialJobs);

            // Phase 2: Load historical data silently in background
            // PocketBase doesn't support negation of a group like !(a || b). 
            // We must rewrite as (!a && !b).
            const historicalYearFilter = `date !~ "${currentYear}-" && datum !~ ".${currentYear}" && date !~ "${currentYear}/"`;
            const historicalFilter = filter ? `(${filter}) && (${historicalYearFilter})` : historicalYearFilter;

            const secondBatch = await pb.collection('drukwerken').getFullList({
                sort: '-date,-created',
                expand: 'pers',
                filter: historicalFilter
            });

            if (secondBatch.length > 0) {
                const historicalJobs = secondBatch.map(mapJob);
                setFinishedJobs(prev => {
                    // Combine and re-sort
                    const combined = [...prev, ...historicalJobs];
                    return combined.sort((a, b) => {
                        const dateA = a.date || '';
                        const dateB = b.date || '';
                        return dateB.localeCompare(dateA);
                    });
                });
            }
        } catch (error) {
            console.error("Error fetching finished jobs:", error);
        }
    }, [user, hasPermission]);

    useEffect(() => {
        fetchFinishedJobs();
    }, [fetchFinishedJobs]);

    // Real-time refresh listeners
    useEffect(() => {
        const handleDrukwerkenChange = () => {
            console.log("Real-time update: refreshing finished jobs");
            fetchFinishedJobs();
        };
        const handleParametersChange = () => {
            console.log("Real-time update: refreshing parameters");
            fetchParameters();
        };

        window.addEventListener('pb-drukwerken-changed', handleDrukwerkenChange);
        window.addEventListener('pb-parameters-changed', handleParametersChange);

        return () => {
            window.removeEventListener('pb-drukwerken-changed', handleDrukwerkenChange);
            window.removeEventListener('pb-parameters-changed', handleParametersChange);
        };
    }, [fetchFinishedJobs, fetchParameters]);

    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
    const [searchQuery, setSearchQuery] = useState(() => {
        if (typeof sessionStorage !== 'undefined') return sessionStorage.getItem('drukwerken_searchQuery') || '';
        return '';
    });

    useEffect(() => {
        if (typeof sessionStorage !== 'undefined') sessionStorage.setItem('drukwerken_searchQuery', searchQuery);
    }, [searchQuery]);

    const [searchField] = useState('all');
    const [pressFilter, setPressFilter] = useState(() => {
        if (typeof sessionStorage !== 'undefined') return sessionStorage.getItem('drukwerken_pressFilter') || 'all';
        return 'all';
    });

    const [yearFilter, setYearFilter] = useState(() => {
        const currentYear = new Date().getFullYear().toString();
        if (typeof sessionStorage !== 'undefined') return sessionStorage.getItem('drukwerken_yearFilter') || currentYear;
        return currentYear;
    });

    useEffect(() => {
        if (typeof sessionStorage !== 'undefined') sessionStorage.setItem('drukwerken_pressFilter', pressFilter);
    }, [pressFilter]);

    useEffect(() => {
        if (typeof sessionStorage !== 'undefined') sessionStorage.setItem('drukwerken_yearFilter', yearFilter);
    }, [yearFilter]);

    const requestSort = (key: string) => { // Renamed handleSort to requestSort
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

    const yearOptions = useMemo(() => {
        const years = Array.from(new Set(
            finishedJobs.map(job => {
                const datePart = job.date || '';
                return datePart.split('-')[0] || datePart.split('/')[0] || job.datum?.split('.')[2];
            }).filter(Boolean)
        )).sort((a, b) => b!.localeCompare(a!)) as string[];

        const now = new Date();
        const curY = now.getFullYear().toString();

        const options = [{ value: 'all', label: 'Volledige Lijst' }];

        years.forEach(y => {
            options.push({ value: y, label: y });
        });

        // Ensure current year is always an option even if no data yet
        if (!years.includes(curY)) {
            options.splice(1, 0, { value: curY, label: curY });
        }

        return options;
    }, [finishedJobs]);

    const filteredJobs = finishedJobs.filter(job => {
        // Year filter
        if (yearFilter !== 'all') {
            const datePart = job.date || '';
            const jobYear = datePart.split('-')[0] || datePart.split('/')[0] || job.datum?.split('.')[2];
            if (jobYear !== yearFilter) return false;
        }

        // Press filter (for admins)
        if (hasPermission('drukwerken_view_all') && pressFilter !== 'all') {
            if (job.pressName !== pressFilter) return false;
        }

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

    const handleBulkJobSubmit = async (jobs: FinishedPrintJob[], deletedIds: string[]) => {
        try {
            // 1. Delete removed jobs
            if (deletedIds.length > 0) {
                await Promise.all(deletedIds.map(id => pb.collection('drukwerken').delete(id)));
            }

            // 2. Update or Create jobs
            await Promise.all(jobs.map(async (job) => {
                const isNew = job.id.startsWith('temp-');

                // Recalculate formulas for consistency using helper
                const jobForFormulas = { ...job }; // Clone to avoid mutation issues
                const processed = processJobFormulas(jobForFormulas);

                const pbData: any = {
                    order_nummer: parseInt(job.orderNr),
                    klant_order_beschrijving: job.orderName,
                    versie: job.version,
                    blz: job.pages,
                    ex_omw: parseFloat(job.exOmw) || 0,
                    netto_oplage: job.netRun,
                    opstart: job.startup,
                    k_4_4: job.c4_4,
                    k_4_0: job.c4_0,
                    k_1_0: job.c1_0,
                    k_1_1: job.c1_1,
                    k_4_1: job.c4_1,
                    max_bruto: processed.maxGross,
                    groen: processed.green,
                    rood: processed.red,
                    delta: processed.delta_number || 0,
                    delta_percent: processed.delta_percentage || 0,
                    pers: job.pressId || user?.pressId,
                    // Assume opmerkingen handled if present
                    opmerking: job.opmerkingen
                };

                if (isNew) {
                    await pb.collection('drukwerken').create(pbData);
                } else {
                    await pb.collection('drukwerken').update(job.id, pbData);
                }
            }));

            toast.success("Wijzigingen opgeslagen.");
            fetchFinishedJobs();
            setIsAddJobDialogOpen(false);
            setEditingJobs([]);

        } catch (error) {
            console.error("Error saving bulk jobs:", error);
            toast.error("Fout bij opslaan.");
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
        // Group by Order Nr only to find siblings (as per user request)
        const siblings = finishedJobs.filter(j =>
            String(j.orderNr) === String(job.orderNr)
        );

        // Sort siblings naturally by version
        siblings.sort((a, b) => a.version.localeCompare(b.version, undefined, { numeric: true }));

        setEditingJobs(siblings);
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
        { key: 'delta_number', label: 'Delta' }
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
                : (activePresses.length > 0 ? (parameters[activePresses[0]] || {}) : {});

            // Final fallback to empty object to prevent "reading property of undefined"
            const safeParams = pressParams || {};

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
                    value = value ? (safeParams['opstart'] || 0) : 0;
                }

                // Sanitize value: replace comma with dot for formula evaluation
                const sValue = String(value).trim();
                let sanitizedValue = sValue;

                if (!sValue || sValue === 'null' || sValue === 'undefined') {
                    sanitizedValue = '0';
                } else {
                    const commaCount = (sValue.match(/,/g) || []).length;
                    if (commaCount > 0) {
                        if (commaCount === 1) {
                            sanitizedValue = sValue.replace(/\./g, '').replace(',', '.');
                        } else {
                            sanitizedValue = sValue.replace(/,/g, '');
                        }
                    } else if (sValue.includes('.')) {
                        // If no comma but has dots, they might be thousands separators 
                        // UNLESS there's only one dot and it's acting as a decimal (US format)
                        const dotCount = (sValue.match(/\./g) || []).length;
                        if (dotCount > 1) {
                            sanitizedValue = sValue.replace(/\./g, '');
                        }
                    }
                }

                // Final check: if it's not a valid numeric string, default to 0 to avoid syntax errors
                if (isNaN(parseFloat(sanitizedValue))) {
                    sanitizedValue = '0';
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

                let value = safeParams[paramKey] || 0;

                // Special handling for Marge percentage parsing (e.g., "4,2" -> 0.042)
                if (paramKey === 'marge') {
                    const sMarge = String(safeParams['margePercentage'] || '0');
                    const cleanMarge = sMarge.includes(',') ? sMarge.replace(/\./g, '').replace(',', '.') : sMarge;
                    value = (parseFloat(cleanMarge) || 0) / 100;
                }

                // Sanitize value
                const sValue = String(value).trim();
                let sanitizedValue = sValue;

                if (!sValue || sValue === 'null' || sValue === 'undefined') {
                    sanitizedValue = '0';
                } else {
                    const commaCount = (sValue.match(/,/g) || []).length;
                    if (commaCount > 0) {
                        if (commaCount === 1) {
                            sanitizedValue = sValue.replace(/\./g, '').replace(',', '.');
                        } else {
                            sanitizedValue = sValue.replace(/,/g, '');
                        }
                    } else if (sValue.includes('.')) {
                        const dotCount = (sValue.match(/\./g) || []).length;
                        if (dotCount > 1) {
                            sanitizedValue = sValue.replace(/\./g, '');
                        }
                    }
                }

                if (isNaN(parseFloat(sanitizedValue))) {
                    sanitizedValue = '0';
                }

                evalFormula = evalFormula.replace(regex, sanitizedValue);
            });

            // Evaluate the formula safely with the IF function in scope
            const result = Function('IF', '"use strict"; return (' + evalFormula + ')')(IF);

            // Format the result with thousand separators
            if (typeof result === 'number') {
                return result;
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
        const pressParams = (activePressName && parameters[activePressName]) ? parameters[activePressName] : {};
        const safeParams = pressParams || {};

        const substitutions: { key: string; label: string; value: string | number; color: { bg: string; text: string } }[] = [];

        // Collect job field substitutions
        finishedFields.forEach(field => {
            if (formula.includes(field.key)) {
                let value: any = (job as any)[field.key];
                if (field.key === 'startup') {
                    value = value ? (safeParams['opstart'] || 0) : 0;
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

                let value = safeParams[paramKey] || 0;
                if (paramKey === 'marge') {
                    value = (parseFloat((safeParams['margePercentage'] || '0').replace(',', '.')) || 0) / 100;
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
        result,
        decimals = 0
    }: {
        formula: string;
        job: FinishedPrintJob | Omit<FinishedPrintJob, 'id'> | Katern;
        result: string | number;
        decimals?: number
    }) => {
        const explanation = getFormulaExplanation(formula, job);
        const formattedResult = typeof result === 'number' ? formatNumber(result, decimals) : result;

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
                        <TabsTrigger value="werkorders" className="tab-pill-trigger">Nieuw Order</TabsTrigger>
                    )}
                    {(user?.role?.toLowerCase() === 'admin' || user?.role?.toLowerCase() === 'meestergast' || (user?.role === 'press' && hasPermission('drukwerken_view'))) && (
                        <TabsTrigger value="finished" className="tab-pill-trigger">Finished</TabsTrigger>
                    )}
                    {(user?.role?.toLowerCase() === 'admin' || user?.role?.toLowerCase() === 'meestergast') && (
                        <TabsTrigger value="parameters" className="tab-pill-trigger">Parameters</TabsTrigger>
                    )}
                </TabsList>

                {user?.role === 'press' && (
                    <TabsContent value="werkorders">
                        <Card>
                            <CardHeader>
                                <CardTitle className="pl-4">Werkorders</CardTitle>
                                <CardAction>
                                    {hasPermission('drukwerken_create') && (
                                        <Button onClick={() => handleWerkorderSubmit(defaultWerkorderData)}><Plus className="w-4 h-4 mr-2" /> Werkorder</Button>
                                    )}
                                </CardAction>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {werkorders.map((wo) => (
                                    <div key={wo.id} className="border p-4 rounded-lg">
                                        <div className="flex justify-between items-center mb-4">
                                            <div className="flex gap-4 w-full items-end">
                                                <div className="flex flex-col items-center">
                                                    <Label>Order Nr</Label>
                                                    <div className="flex items-center border border-gray-200 rounded-md px-2 bg-white h-9" style={{ width: '85px' }}>
                                                        <span className="text-sm font-medium text-muted-foreground mr-1">DT</span>
                                                        <Input
                                                            value={wo.orderNr}
                                                            onChange={(e) => handleWerkorderChange(wo.id, 'orderNr', e.target.value)}
                                                            className="text-right p-0 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-full w-full bg-transparent"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="flex-1">
                                                    <Label className="pl-3">Order</Label>
                                                    <div className="flex gap-2 items-center">
                                                        <Input value={wo.orderName} onChange={(e) => handleWerkorderChange(wo.id, 'orderName', e.target.value)} className="w-full bg-white border-gray-200" />
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-9 w-9 p-0 hover:bg-red-100 text-red-500"
                                                            onClick={() => {
                                                                if (window.confirm("Weet je zeker dat je deze gehele werkorder wilt verwijderen?")) {
                                                                    handleDeleteWerkorder(wo.id);
                                                                }
                                                            }}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <Table className={`table-fixed w-full ${FONT_SIZES.body}`}>
                                            <colgroup>
                                                <col style={{ width: COL_WIDTHS.version }} />
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
                                                <col style={{ width: COL_WIDTHS.actions }} />
                                            </colgroup>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead colSpan={4} className="text-center bg-blue-100" style={{ borderRight: '2px solid #e5e7eb' }}>Data</TableHead>
                                                    <TableHead colSpan={6} className="text-center bg-green-100" style={{ borderRight: '2px solid #e5e7eb' }}>Wissels</TableHead>
                                                    <TableHead colSpan={3} className="text-center bg-yellow-100" style={{ borderRight: '2px solid #e5e7eb' }}>Berekening</TableHead>
                                                    <TableHead colSpan={2} className="text-center bg-purple-100">Prestatie</TableHead>
                                                    <TableHead colSpan={1} style={{ width: COL_WIDTHS.actions }}></TableHead> {/* Actions */}
                                                </TableRow>
                                                <TableRow>
                                                    <TableHead style={{ width: COL_WIDTHS.version }}>Version</TableHead>
                                                    <TableHead style={{ width: COL_WIDTHS.pages }}>Blz</TableHead>
                                                    <TableHead style={{ width: COL_WIDTHS.exOmw }}>Ex/Omw</TableHead>
                                                    <TableHead style={{ width: COL_WIDTHS.netRun, borderRight: '2px solid #e5e7eb' }}>Net Run</TableHead>
                                                    <TableHead className="text-center" style={{ width: COL_WIDTHS.startup }}>Startup</TableHead>
                                                    <TableHead className="text-center" style={{ width: COL_WIDTHS.c4_4 }}>4/4</TableHead>
                                                    <TableHead className="text-center" style={{ width: COL_WIDTHS.c4_0 }}>4/0</TableHead>
                                                    <TableHead className="text-center" style={{ width: COL_WIDTHS.c1_0 }}>1/0</TableHead>
                                                    <TableHead className="text-center" style={{ width: COL_WIDTHS.c1_1 }}>1/1</TableHead>
                                                    <TableHead className="text-center" style={{ width: COL_WIDTHS.c4_1, borderRight: '2px solid #e5e7eb' }}>4/1</TableHead>
                                                    <TableHead className="text-center" style={{ width: COL_WIDTHS.maxGross }}>Max Gross</TableHead>
                                                    <TableHead className="text-center" style={{ width: COL_WIDTHS.green }}>Groen</TableHead>
                                                    <TableHead className="border-r" style={{ width: COL_WIDTHS.red, borderRight: '2px solid #e5e7eb' }}>Rood</TableHead>
                                                    <TableHead className="text-center" style={{ width: COL_WIDTHS.delta }}>Delta</TableHead>
                                                    <TableHead className="text-center" style={{ width: COL_WIDTHS.deltaPercent }}>Delta %</TableHead>
                                                    <TableHead style={{ width: COL_WIDTHS.actions }}></TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {wo.katernen.map((katern) => {
                                                    const jobWithOrderInfo = { ...katern, orderNr: wo.orderNr, orderName: wo.orderName };
                                                    const maxGrossVal = getFormulaForColumn('maxGross')
                                                        ? evaluateFormula(getFormulaForColumn('maxGross')!.formula, jobWithOrderInfo) as number
                                                        : katern.maxGross;

                                                    const jobWithCalculatedMaxGross = { ...jobWithOrderInfo, maxGross: maxGrossVal };
                                                    return (
                                                        <TableRow key={katern.id}>
                                                            <TableCell>
                                                                <Input value={katern.version} onChange={(e) => handleKaternChange(wo.id, katern.id, 'version', e.target.value)} className="h-9 px-2 bg-white border-gray-200" />
                                                            </TableCell>
                                                            <TableCell>
                                                                <FormattedNumberInput value={katern.pages} onChange={(val) => handleKaternChange(wo.id, katern.id, 'pages', val)} className="h-9 px-2 bg-white border-gray-200" />
                                                            </TableCell>
                                                            <TableCell>
                                                                <Input value={katern.exOmw} onChange={(e) => handleKaternChange(wo.id, katern.id, 'exOmw', e.target.value)} className="h-9 px-2 bg-white border-gray-200" />
                                                            </TableCell>
                                                            <TableCell style={{ borderRight: '2px solid #e5e7eb' }}>
                                                                <FormattedNumberInput value={katern.netRun} onChange={(val) => handleKaternChange(wo.id, katern.id, 'netRun', val || 0)} className="h-9 px-2 bg-white border-gray-200" />
                                                            </TableCell>
                                                            <TableCell className="text-center">
                                                                <Checkbox checked={katern.startup} onCheckedChange={(checked) => handleKaternChange(wo.id, katern.id, 'startup', checked)} />
                                                            </TableCell>
                                                            <TableCell>
                                                                <FormattedNumberInput value={katern.c4_4} onChange={(val) => handleKaternChange(wo.id, katern.id, 'c4_4', val || 0)} className="h-9 px-2 bg-white border-gray-200" />
                                                            </TableCell>
                                                            <TableCell>
                                                                <FormattedNumberInput value={katern.c4_0} onChange={(val) => handleKaternChange(wo.id, katern.id, 'c4_0', val || 0)} className="h-9 px-2 bg-white border-gray-200" />
                                                            </TableCell>
                                                            <TableCell>
                                                                <FormattedNumberInput value={katern.c1_0} onChange={(val) => handleKaternChange(wo.id, katern.id, 'c1_0', val || 0)} className="h-9 px-2 bg-white border-gray-200" />
                                                            </TableCell>
                                                            <TableCell>
                                                                <FormattedNumberInput value={katern.c1_1} onChange={(val) => handleKaternChange(wo.id, katern.id, 'c1_1', val || 0)} className="h-9 px-2 bg-white border-gray-200" />
                                                            </TableCell>
                                                            <TableCell style={{ borderRight: '2px solid #e5e7eb' }}>
                                                                <FormattedNumberInput value={katern.c4_1} onChange={(val) => handleKaternChange(wo.id, katern.id, 'c4_1', val || 0)} className="h-9 px-2 bg-white border-gray-200" />
                                                            </TableCell>
                                                            <TableCell style={{ borderRight: '2px solid #e5e7eb' }} className="text-center">
                                                                {getFormulaForColumn('maxGross') ? (
                                                                    <span className="font-medium">{formatNumber(maxGrossVal, 0)}</span>
                                                                ) : (
                                                                    <Input
                                                                        type="number"
                                                                        value={maxGrossVal}
                                                                        onChange={(e) => handleKaternChange(wo.id, katern.id, 'maxGross', e.target.value)}
                                                                        className="h-9 px-2 bg-white border-gray-200"
                                                                    />
                                                                )}
                                                            </TableCell>
                                                            <TableCell>
                                                                <FormattedNumberInput value={katern.green} onChange={(val) => handleKaternChange(wo.id, katern.id, 'green', val)} className="h-9 px-2 bg-white border-gray-200" />
                                                            </TableCell>
                                                            <TableCell style={{ borderRight: '2px solid #e5e7eb' }}>
                                                                <FormattedNumberInput value={katern.red} onChange={(val) => handleKaternChange(wo.id, katern.id, 'red', val)} className="h-9 px-2 bg-white border-gray-200" />
                                                            </TableCell>
                                                            <TableCell className="text-center font-medium">
                                                                {(() => {
                                                                    const f = getFormulaForColumn('delta_number');
                                                                    const result = f ? evaluateFormula(f.formula, jobWithCalculatedMaxGross) : 0;
                                                                    return formatNumber(result, 0);
                                                                })()}
                                                            </TableCell>
                                                            <TableCell className="text-center font-medium">
                                                                {(() => {
                                                                    const f = getFormulaForColumn('delta_percentage');
                                                                    const result = f ? evaluateFormula(f.formula, jobWithCalculatedMaxGross) : katern.deltaPercentage;
                                                                    const numericValue = typeof result === 'number'
                                                                        ? result
                                                                        : parseFloat((result as string || '0').replace(/\./g, '').replace(',', '.'));

                                                                    return `${formatNumber(numericValue * 100, 2)}%`;
                                                                })()}
                                                            </TableCell>
                                                            <TableCell>
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    className="hover:bg-red-100 text-red-500"
                                                                    onClick={() => handleDeleteKatern(wo.id, katern.id)}
                                                                >
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
                        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4">
                            <CardTitle className={FONT_SIZES.title}>Afgewerkte Drukwerken</CardTitle>
                            <div className="flex gap-2 items-center flex-wrap">
                                <Tabs value={yearFilter} onValueChange={setYearFilter} className="w-auto">
                                    <TabsList className="bg-gray-100/50 border h-9 p-1">
                                        {yearOptions.map(opt => (
                                            <TabsTrigger
                                                key={opt.value}
                                                value={opt.value}
                                                className="px-3 py-1 text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm"
                                            >
                                                {opt.label}
                                            </TabsTrigger>
                                        ))}
                                    </TabsList>
                                </Tabs>
                                {user?.role?.toLowerCase() === 'admin' && (
                                    <Select value={pressFilter} onValueChange={setPressFilter}>
                                        <SelectTrigger className="w-[140px]">
                                            <SelectValue placeholder="Alle Persen" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Alle Persen</SelectItem>
                                            {activePresses.filter(press => press && press.trim() !== '').map(press => (
                                                <SelectItem key={press} value={press}>{press}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                                <div className="relative">
                                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                    <Input
                                        placeholder="Zoeken..."
                                        className="pl-10 w-[200px] bg-white border-gray-200 focus:border-blue-500 transition-colors"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <Table className={`table-fixed w-full ${FONT_SIZES.body}`}>
                                    <colgroup>
                                        {user?.role?.toLowerCase() === 'admin' && <col style={{ width: COL_WIDTHS.press }} />}
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
                                        <col style={{ width: COL_WIDTHS.actions }} />
                                    </colgroup>
                                    <TableHeader>
                                        <TableRow>
                                            {user?.role?.toLowerCase() === 'admin' && <TableHead rowSpan={2} style={{ width: COL_WIDTHS.press }} className="text-center bg-gray-100 border-r border-b">Pers</TableHead>}
                                            <TableHead colSpan={6} className="text-center bg-blue-100" style={{ borderRight: '1px solid black' }}>Data</TableHead>
                                            <TableHead colSpan={6} className="text-center bg-green-100" style={{ borderTop: '1px solid black', borderRight: '1px solid black' }}>Wissels</TableHead>
                                            <TableHead colSpan={3} className="text-center bg-yellow-100" style={{ borderTop: '1px solid black', borderRight: '1px solid black' }}>Berekening</TableHead>
                                            <TableHead colSpan={2} className="text-center bg-purple-100" style={{ borderTop: '1px solid black', borderRight: '1px solid black' }}>Prestatie</TableHead>
                                            <TableHead style={{ width: COL_WIDTHS.actions }}></TableHead>
                                        </TableRow>
                                        <TableRow>
                                            <TableHead onClick={() => requestSort('date')} style={{ width: COL_WIDTHS.date }} className="cursor-pointer hover:bg-gray-100 border-r"><div className="flex items-center">Date {getSortIcon('date')}</div></TableHead>
                                            {/* Datum removed */}
                                            <TableHead onClick={() => requestSort('orderNr')} style={{ width: COL_WIDTHS.orderNr }} className="cursor-pointer hover:bg-gray-100 border-r"><div className="flex items-center">Order nr {getSortIcon('orderNr')}</div></TableHead>
                                            <TableHead onClick={() => requestSort('orderName')} style={{ width: COL_WIDTHS.orderName }} className="cursor-pointer hover:bg-gray-100 border-r"><div className="flex items-center">Order {getSortIcon('orderName')}</div></TableHead>
                                            <TableHead onClick={() => requestSort('pages')} style={{ width: COL_WIDTHS.pages }} className="cursor-pointer hover:bg-gray-100 text-center border-r"><div className="flex items-center justify-center">Blz {getSortIcon('pages')}</div></TableHead>
                                            <TableHead onClick={() => requestSort('exOmw')} style={{ width: COL_WIDTHS.exOmw }} className="cursor-pointer hover:bg-gray-100 text-center leading-3 border-r"><div className="flex items-center justify-center h-full">Ex/<br />Omw. {getSortIcon('exOmw')}</div></TableHead>
                                            <TableHead onClick={() => requestSort('netRun')} style={{ width: COL_WIDTHS.netRun }} className="cursor-pointer hover:bg-gray-100 text-center border-r"><div className="flex items-center justify-center">Oplage netto {getSortIcon('netRun')}</div></TableHead>
                                            <TableHead onClick={() => requestSort('startup')} style={{ width: COL_WIDTHS.startup }} className="cursor-pointer hover:bg-gray-100 text-center bg-gray-50"><div className="flex items-center justify-center">Opstart {getSortIcon('startup')}</div></TableHead>
                                            <TableHead onClick={() => requestSort('c4_4')} style={{ width: COL_WIDTHS.c4_4 }} className="cursor-pointer hover:bg-gray-100 text-center bg-gray-50 border border-black"><div className="flex items-center justify-center">4/4 {getSortIcon('c4_4')}</div></TableHead>
                                            <TableHead onClick={() => requestSort('c4_0')} style={{ width: COL_WIDTHS.c4_0 }} className="cursor-pointer hover:bg-gray-100 text-center bg-gray-50 border border-black"><div className="flex items-center justify-center">4/0 {getSortIcon('c4_0')}</div></TableHead>
                                            <TableHead onClick={() => requestSort('c1_0')} style={{ width: COL_WIDTHS.c1_0 }} className="cursor-pointer hover:bg-gray-100 text-center bg-gray-50 border border-black"><div className="flex items-center justify-center">1/0 {getSortIcon('c1_0')}</div></TableHead>
                                            <TableHead onClick={() => requestSort('c1_1')} style={{ width: COL_WIDTHS.c1_1 }} className="cursor-pointer hover:bg-gray-100 text-center bg-gray-50 border border-black"><div className="flex items-center justify-center">1/1 {getSortIcon('c1_1')}</div></TableHead>
                                            <TableHead onClick={() => requestSort('c4_1')} style={{ width: COL_WIDTHS.c4_1 }} className="cursor-pointer hover:bg-gray-100 text-center bg-gray-50 border border-black border-r"><div className="flex items-center justify-center">4/1 {getSortIcon('c4_1')}</div></TableHead>
                                            <TableHead style={{ width: COL_WIDTHS.maxGross }} className="text-center border-r">
                                                <div className="flex items-center gap-1 justify-center">
                                                    <span
                                                        className="font-bold whitespace-nowrap"
                                                        title={getFormulaForColumn('maxGross')?.name || 'Max Bruto'}
                                                    >
                                                        {getFormulaForColumn('maxGross')?.name || 'Max Bruto'}
                                                    </span>
                                                    <div onClick={() => requestSort('maxGross')} className="cursor-pointer p-1 hover:bg-gray-200 rounded shrink-0">
                                                        {getSortIcon('maxGross')}
                                                    </div>
                                                </div>
                                            </TableHead>
                                            <TableHead style={{ width: COL_WIDTHS.green }} className="text-center border-r">
                                                <div className="flex items-center gap-1 justify-center">
                                                    <span
                                                        className="font-bold whitespace-nowrap"
                                                        title={getFormulaForColumn('green')?.name || 'Groen'}
                                                    >
                                                        {getFormulaForColumn('green')?.name || 'Groen'}
                                                    </span>
                                                    <div onClick={() => requestSort('green')} className="cursor-pointer p-1 hover:bg-gray-200 rounded shrink-0">
                                                        {getSortIcon('green')}
                                                    </div>
                                                </div>
                                            </TableHead>
                                            <TableHead style={{ width: COL_WIDTHS.red, borderRight: '1px solid black' }} className="text-center">
                                                <div className="flex items-center gap-1 justify-center">
                                                    <span
                                                        className="font-bold whitespace-nowrap"
                                                        title={getFormulaForColumn('red')?.name || 'Rood'}
                                                    >
                                                        {getFormulaForColumn('red')?.name || 'Rood'}
                                                    </span>
                                                    <div onClick={() => requestSort('red')} className="cursor-pointer p-1 hover:bg-gray-200 rounded shrink-0">
                                                        {getSortIcon('red')}
                                                    </div>
                                                </div>
                                            </TableHead>
                                            <TableHead style={{ width: COL_WIDTHS.delta }} className="text-center border-r">
                                                <div className="flex items-center gap-1 justify-center">
                                                    <span className="font-bold">Delta</span>
                                                </div>
                                            </TableHead><TableHead style={{ width: COL_WIDTHS.deltaPercent }} className="text-center border-r">
                                                <div className="flex items-center gap-1 justify-center">
                                                    <span className="font-bold">Delta %</span>
                                                </div>
                                            </TableHead>
                                            <TableHead style={{ width: COL_WIDTHS.actions }} className="text-center">
                                                <div className="flex items-center gap-1 justify-center">
                                                    <span className="font-bold">Acties</span>
                                                </div>
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {sortedJobs.map((job) => (
                                            <TableRow key={job.id} className="h-8 hover:bg-gray-100 [&>td]:hover:bg-gray-100 transition-colors">
                                                {user?.role?.toLowerCase() === 'admin' && (
                                                    <TableCell className="py-1 px-2 font-medium bg-gray-50 border-r text-center truncate" title={job.pressName}>
                                                        {job.pressName || '-'}
                                                    </TableCell>
                                                )}
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
                                                            : formatNumber(job.maxGross, 0);
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
                                                            ? <FormulaResultWithTooltip formula={formula.formula} job={job} result={evaluateFormula(formula.formula, job)} />
                                                            : formatNumber(job.delta_number, 0);
                                                    })()}
                                                </TableCell><TableCell className="text-center py-1 px-1 border-r">
                                                    {(() => {
                                                        const formula = getFormulaForColumn('delta_percentage');
                                                        const result = formula
                                                            ? evaluateFormula(formula.formula, job)
                                                            : job.delta_percentage;

                                                        const percentageValue = typeof result === 'number'
                                                            ? result
                                                            : parseFloat((result as string || '0').replace(/\./g, '').replace(',', '.'));

                                                        return percentageValue !== undefined ? `${formatNumber(percentageValue * 100, 2)}%` : '-';
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
                                                                <FormattedNumberInput
                                                                    placeholder="%"
                                                                    className="h-8"
                                                                    value={parseFloat((parameters[press]?.margePercentage || '0').replace(',', '.'))}
                                                                    onChange={(val) => handleParameterChange(press, 'margePercentage', val !== null ? String(val) : '')}
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
                                                            <FormattedNumberInput
                                                                className="h-8"
                                                                value={parameters[press]?.opstart || 0}
                                                                onChange={(val) => handleParameterChange(press, 'opstart', val || 0)}
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
                                                                <FormattedNumberInput
                                                                    className="h-8"
                                                                    value={parameters[press]?.[param.id] || 0}
                                                                    onChange={(val) => handleParameterChange(press, param.id, val || 0)}
                                                                />
                                                            </TableCell>
                                                        ))}
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                    <div className="mt-4 flex justify-end">
                                        <Button onClick={() => toast.success('Parameters succesvol bijgewerkt')}>Save Changes</Button>
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
                                                                    if (typeof res === 'number') {
                                                                        const isPercentage = field.targetColumn === 'delta_percentage';
                                                                        const decimals = isPercentage ? 2 : 0;
                                                                        const displayVal = isPercentage ? res * 100 : res;
                                                                        return formatNumber(displayVal, decimals) + (isPercentage ? '%' : '');
                                                                    }
                                                                    return res;
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
            </Tabs>

            <AddFinishedJobDialog
                open={isAddJobDialogOpen}
                onOpenChange={setIsAddJobDialogOpen}
                onSubmit={handleBulkJobSubmit}
                initialJobs={editingJobs}
                onCalculate={(job) => processJobFormulas(job) as FinishedPrintJob}
            />



            {/* Formula Builder Dialog */}
            < Dialog open={isFormulaDialogOpen} onOpenChange={setIsFormulaDialogOpen} >
                <DialogContent className="max-w-5xl sm:max-w-[1200px]">
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