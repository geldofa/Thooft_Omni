import { useState, useCallback, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PressType, useAuth, pb } from './AuthContext';
import { drukwerkenCache, CacheStatus } from '../services/DrukwerkenCache';
import { Card, CardContent } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'; // Added useEffect

import { toast } from 'sonner';
// import { pillListClass, pillTriggerClass } from '../styles/TabStyles';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Plus, Edit, Trash2, Check, Search, ArrowUp, ArrowDown, Printer, RefreshCw, Database, Wrench, X } from 'lucide-react';
import { TableVirtuoso } from 'react-virtuoso';
import { PageHeader } from './PageHeader';
import { formatNumber } from '../utils/formatNumber';
import { format, differenceInDays } from 'date-fns';
import { Checkbox } from './ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from './ui/tooltip';
import { Switch } from './ui/switch';
import { FormattedNumberInput } from './ui/FormattedNumberInput';
import { AddFinishedJobDialog } from './AddFinishedJobDialog';
import {
    evaluateFormula,
    Katern,
    FinishedPrintJob,
    CalculatedField
} from '../utils/drukwerken-utils';

interface Press {
    id: string;
    name: PressType;
    active: boolean;
    archived: boolean;
}

// Types moved to drukwerken-utils.ts (Katern, FinishedPrintJob, CalculatedField)

export interface Werkorder {
    id: string;
    orderNr: string;
    orderName: string; // Added orderName
    orderDate: string;
    katernen: Katern[];
}

// --- CONFIGURATION CONSTANTS ---
// EDIT THESE TO CHANGE LAYOUT AND TYPOGRAPHY FROM ONE PLACE
const COL_WIDTHS = {
    version: '400px',
    press: '50px',
    date: '55px',
    orderNr: '45px',
    orderName: '250px',
    pages: '40px',
    exOmw: '25px',
    netRun: '55px',
    startup: '30px',
    c4_4: '25px',
    c4_0: '25px',
    c1_0: '25px',
    c1_1: '25px',
    c4_1: '25px',
    maxGross: '55px',
    green: '55px',
    red: '55px',
    delta: '45px',
    deltaPercent: '45px',
    actions: '25px'
};

const FONT_SIZES = {
    title: 'text-2xl',      // Main report titles
    section: 'text-lg',    // Category headers
    body: 'text-sm',       // Table rows and general text
    label: 'text-xs',      // Small subtext
};


// Component to render formula result with tooltip
const FormulaResultWithTooltip = ({
    formula,
    job,
    decimals = 0,
    parameters,
    activePresses,
    result: propResult,
    variant = 'default'
}: {
    formula: string;
    job: FinishedPrintJob | Omit<FinishedPrintJob, 'id'> | Katern;
    decimals?: number;
    parameters: Record<string, Record<string, any>>;
    activePresses: string[];
    result?: number;
    variant?: 'maxGross' | 'delta' | 'default';
}) => {
    const result = propResult !== undefined ? propResult : evaluateFormula(formula, job, parameters, activePresses);
    const formattedResult = typeof result === 'number' ? formatNumber(result, decimals) : String(result || '');

    // Final Tooltip Design: 1 Card per high-level Part (Netto, Marge, Opstart, Colors)
    const renderCalculationFlow = () => {
        const pressName = (job as any).pressName || (activePresses.length > 0 ? activePresses[0] : '');
        const safeParams = parameters[pressName] || {};
        const pages = Number((job as any).pages || 1);
        const exOmw = Number((job as any).exOmw || 1);

        interface CalcPart {
            label: string;
            formula: string;
            breakdown: string;
            value: number;
            operator?: string;
        }

        const parts: CalcPart[] = [];

        if (variant === 'delta') {
            const green = Number((job as any).green || 0);
            const red = Number((job as any).red || 0);
            const maxGross = Number((job as any).maxGross || 0);

            if (green !== 0) {
                parts.push({
                    label: "Groen",
                    formula: "Groen",
                    breakdown: formatNumber(green),
                    value: green,
                    operator: '+'
                });
            }
            if (red !== 0) {
                parts.push({
                    label: "Rood",
                    formula: "Rood",
                    breakdown: formatNumber(red),
                    value: red,
                    operator: '+'
                });
            }
            if (maxGross !== 0) {
                parts.push({
                    label: "Max Bruto",
                    formula: "Max Bruto",
                    breakdown: formatNumber(maxGross),
                    value: maxGross,
                    operator: '-'
                });
            }
        } else {
            // 1. Netto (Net Run)
            const netRunVal = Number((job as any).netRun || 0);
            if (netRunVal > 0) {
                parts.push({
                    label: "Netto",
                    formula: "Oplage (netto)",
                    breakdown: formatNumber(netRunVal),
                    value: netRunVal
                });
            }

            // 2. Marge
            const margePercentStr = safeParams.margePercentage || '0';
            const margePercent = parseFloat(margePercentStr.replace(',', '.')) / 100;
            const margeVal = Math.round(netRunVal * margePercent);
            if (margeVal > 0) {
                parts.push({
                    label: "Marge",
                    formula: "Oplage × Marge %",
                    breakdown: `${formatNumber(netRunVal)} × ${margePercentStr}%`,
                    value: margeVal
                });
            }

            // 3. Opstart
            if ((job as any).startup) {
                const opstartParam = safeParams.opstart || 0;
                const opstartVal = opstartParam * exOmw;
                parts.push({
                    label: "Opstart",
                    formula: "Opstart × Ex/Omw",
                    breakdown: `${formatNumber(opstartParam)} × ${formatNumber(exOmw)}`,
                    value: opstartVal
                });
            }

            // 4. Color Channels
            const colorFields = [
                { key: 'c4_4', label: '4/4', param: 'param_4_4' },
                { key: 'c4_0', label: '4/0', param: 'param_4_0' },
                { key: 'c1_0', label: '1/0', param: 'param_1_0' },
                { key: 'c1_1', label: '1/1', param: 'param_1_1' },
                { key: 'c4_1', label: '4/1', param: 'param_4_1' }
            ];

            colorFields.forEach(field => {
                const count = Number((job as any)[field.key] || 0);
                if (count > 0) {
                    const paramVal = safeParams[field.param] || 0;
                    const totalVal = Math.round(count * exOmw * paramVal);
                    parts.push({
                        label: field.label,
                        formula: "omw × (aantal × factor)",
                        breakdown: `${formatNumber(exOmw)} × (${formatNumber(count)} × ${formatNumber(paramVal)})`,
                        value: totalVal
                    });
                }
            });
        }

        if (parts.length === 0) return <span>{formattedResult}</span>;

        return (
            <div className="flex flex-col items-center gap-4 py-2">
                {/* Divide parts into rows of 5 */}
                {Array.from({ length: Math.ceil(parts.length / 5) }).map((_, rowIndex) => (
                    <div key={rowIndex} className="flex flex-wrap items-center justify-center gap-3">
                        {parts.slice(rowIndex * 5, (rowIndex + 1) * 5).map((p, idx) => {
                            const globalIdx = rowIndex * 5 + idx;
                            return (
                                <div key={globalIdx} className="flex items-center gap-3">
                                    <div className="flex flex-col overflow-hidden rounded-xl border border-blue-100 shadow-md min-w-[140px]">
                                        {/* Header: Soft Blue */}
                                        <div className="bg-blue-50/80 px-3 py-1.5 border-b border-blue-100 flex justify-center">
                                            <span className="text-[11px] font-black text-blue-900 uppercase tracking-tight">
                                                {p.label}
                                            </span>
                                        </div>
                                        {/* Body: Clean White */}
                                        <div className="bg-white p-2 space-y-1 border-b border-blue-50/50">
                                            <div className="flex flex-col items-center">
                                                <div className="text-[11px] font-black text-gray-800 leading-tight text-center">{p.formula}</div>
                                            </div>
                                            <div className="pt-1 border-t border-gray-100/50 flex flex-col items-center">
                                                <div className="text-[11px] font-black text-blue-600 leading-tight text-center">{p.breakdown}</div>
                                            </div>
                                        </div>
                                        {/* Footer: Light Gray */}
                                        <div className="bg-slate-50 px-2 py-1.5 flex justify-center items-center">
                                            <span className="text-sm font-black text-gray-900 tabular-nums">
                                                {formatNumber(p.value)}
                                            </span>
                                        </div>
                                    </div>
                                    {globalIdx < parts.length - 1 && (
                                        <div className="text-blue-200 font-black text-3xl px-1">
                                            {parts[globalIdx + 1]?.operator === '-' || (variant === 'delta' && parts[globalIdx + 1]?.value < 0) ? '-' : '+'}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ))}


            </div>
        );
    };

    return (
        <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>
                <span className="cursor-help border-b border-dashed border-gray-400 whitespace-nowrap">{formattedResult}</span>
            </TooltipTrigger>
            <TooltipContent
                side="top"
                sideOffset={4}
                avoidCollisions
                style={{ backgroundColor: 'white', color: '#1f2937' }}
                className="border border-gray-100 shadow-2xl max-w-[95vw] p-3 z-[100] rounded-2xl"
            >
                {renderCalculationFlow()}
            </TooltipContent>
        </Tooltip>
    );
};

export function Drukwerken({ presses: propsPresses }: { presses?: Press[] }) {
    const [presses, setPresses] = useState<Press[]>(propsPresses || []);
    const [isLoadingPresses, setIsLoadingPresses] = useState(false);

    // Cache status state
    const [cacheStatus, setCacheStatus] = useState<CacheStatus>({
        loading: true,
        statusText: 'Initializing...',
        totalDocs: 0,
        cachedDocs: 0,
        newUpdates: 0
    });

    const fetchPressesLocal = useCallback(async () => {
        try {
            setIsLoadingPresses(true);
            const records = await pb.collection('persen').getFullList();
            setPresses(records.map((r: any) => ({
                id: r.id,
                name: r.naam,
                active: r.active !== false,
                archived: r.archived === true
            })));
        } catch (e) {
            console.error("Failed to fetch presses in Drukwerken", e);
        } finally {
            setIsLoadingPresses(false);
        }
    }, []);

    useEffect(() => {
        if (!propsPresses) {
            fetchPressesLocal();
        }
    }, [fetchPressesLocal, propsPresses]);
    const activePresses = useMemo(() => presses
        .filter(p => p.active && !p.archived)
        .map(p => p.name), [presses]);

    // Map press names to IDs for relation linking
    const pressMap = useMemo(() => presses.reduce((acc, press) => {
        acc[press.name] = press.id;
        return acc;
    }, {} as Record<string, string>), [presses]);

    const { user, hasPermission, getSystemSetting } = useAuth();

    const { subtab } = useParams<{ subtab: string }>();
    const navigate = useNavigate();
    const activeTab = subtab?.toLowerCase() === 'gedrukt' ? 'Gedrukt' : 'Nieuw';


    const [isAddJobDialogOpen, setIsAddJobDialogOpen] = useState(false);
    const [editingJobs, setEditingJobs] = useState<FinishedPrintJob[]>([]);
    const [showComparison, setShowComparison] = useState(false);

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
                const newKatern = { ...katernData, id: `${wo.id} -${wo.katernen.length + 1} ` };
                return { ...wo, katernen: [...wo.katernen, newKatern] };
            }
            return wo;
        }));
    };

    const defaultKatern: Katern = {
        id: 'new-katern-1', // Temporary ID, will be replaced with `${ newWerkorder.id } -1`
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
            id: `${newWerkorderId} -1`, // Assign a proper ID
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
            const today = new Date();
            const formattedDate = format(today, 'yyyy-MM-dd');
            const formattedDatum = format(today, 'dd-MM');

            const promises = werkorder.katernen.map(async (katern) => {
                const jobWithKaternData = {
                    ...katern,
                    orderNr: werkorder.orderNr,
                    orderName: werkorder.orderName,
                    date: formattedDate,
                    datum: formattedDatum,
                    pressName: user?.press
                };

                const calculatedMaxGross = getFormulaForColumn('maxGross')
                    ? (typeof evaluateFormula(getFormulaForColumn('maxGross')!.formula, jobWithKaternData, parameters, activePresses) === 'number'
                        ? evaluateFormula(getFormulaForColumn('maxGross')!.formula, jobWithKaternData, parameters, activePresses)
                        : Number(String(evaluateFormula(getFormulaForColumn('maxGross')!.formula, jobWithKaternData, parameters, activePresses)).replace(/\./g, '').replace(',', '.')))
                    : katern.maxGross;
                const maxGrossVal = Number(calculatedMaxGross) || 0;

                const jobWithMaxGross = { ...jobWithKaternData, maxGross: maxGrossVal };

                const greenVal = getFormulaForColumn('green')
                    ? (typeof evaluateFormula(getFormulaForColumn('green')!.formula, jobWithMaxGross, parameters, activePresses) === 'number'
                        ? evaluateFormula(getFormulaForColumn('green')!.formula, jobWithMaxGross, parameters, activePresses)
                        : Number(String(evaluateFormula(getFormulaForColumn('green')!.formula, jobWithMaxGross, parameters, activePresses)).replace(/\./g, '').replace(',', '.')))
                    : katern.green;

                const redVal = getFormulaForColumn('red')
                    ? (typeof evaluateFormula(getFormulaForColumn('red')!.formula, jobWithMaxGross, parameters, activePresses) === 'number'
                        ? evaluateFormula(getFormulaForColumn('red')!.formula, jobWithMaxGross, parameters, activePresses)
                        : Number(String(evaluateFormula(getFormulaForColumn('red')!.formula, jobWithMaxGross, parameters, activePresses)).replace(/\./g, '').replace(',', '.')))
                    : katern.red;

                const deltaVal = getFormulaForColumn('delta_number')
                    ? (typeof evaluateFormula(getFormulaForColumn('delta_number')!.formula, jobWithMaxGross, parameters, activePresses) === 'number'
                        ? evaluateFormula(getFormulaForColumn('delta_number')!.formula, jobWithMaxGross, parameters, activePresses)
                        : Number(String(evaluateFormula(getFormulaForColumn('delta_number')!.formula, jobWithMaxGross, parameters, activePresses)).replace(/\./g, '').replace(',', '.')))
                    : katern.delta;

                return {
                    ...katern,
                    maxGross: maxGrossVal,
                    green: greenVal,
                    red: redVal,
                    delta: deltaVal,
                    deltaPercentage: (() => {
                        const f = getFormulaForColumn('delta_percentage');
                        if (f) {
                            return typeof evaluateFormula(f.formula, jobWithMaxGross, parameters, activePresses) === 'number'
                                ? evaluateFormula(f.formula, jobWithMaxGross, parameters, activePresses)
                                : Number(String(evaluateFormula(f.formula, jobWithMaxGross, parameters, activePresses)).replace(/\./g, '').replace(',', '.'));
                        }
                        return katern.deltaPercentage;
                    })()
                };
            });

            const processedKaternen = await Promise.all(promises);

            // Now use the processedKaternen to create pbData
            for (const processedKatern of processedKaternen) {
                const pbData: any = {
                    date: formattedDate,
                    datum: formattedDatum,
                    order_nummer: parseInt(werkorder.orderNr),
                    klant_order_beschrijving: werkorder.orderName,
                    versie: processedKatern.version,
                    blz: processedKatern.pages,
                    ex_omw: parseFloat(processedKatern.exOmw) || 0,
                    netto_oplage: processedKatern.netRun,
                    opstart: processedKatern.startup,
                    k_4_4: processedKatern.c4_4,
                    k_4_0: processedKatern.c4_0,
                    k_1_0: processedKatern.c1_0,
                    k_1_1: processedKatern.c1_1,
                    k_4_1: processedKatern.c4_1,
                    max_bruto: processedKatern.maxGross,
                    groen: processedKatern.green || 0,
                    rood: processedKatern.red || 0,
                    delta: processedKatern.delta || 0,
                    delta_percent: processedKatern.deltaPercentage || 0,
                    opmerking: '', // No field in UI yet
                    pers: user?.pressId // Link to press
                };

                // Save to PocketBase
                await pb.collection('drukwerken').create(pbData);
            }

            fetchCalculatedFields();

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
            navigate('/Drukwerken/Gedrukt');
            toast.success("Order succesvol opgeslagen en formulier gewist.");

        } catch (error) {
            console.error("Error saving order:", error);
            toast.error("Fout bij opslaan order. Controleer console.");
        }
    };





    // Fetch parameters from PocketBase
    const fetchParameters = useCallback(async () => {
        try {
            // Fetch all press parameters (expand press relation if needed, but we rely on linking by press ID)
            const records = await pb.collection('press_parameters').getFullList();

            setParameters(prev => {
                const updated = { ...prev };
                console.log(`[Drukwerken] Updating parameters for ${activePresses.length} presses. Records found: ${records.length}`);

                activePresses.forEach(pressName => {
                    const pressId = pressMap[pressName];
                    // Find parameter record for this press
                    const record = records.find((r: any) => r.press === pressId);

                    if (record) {
                        console.log(`[Drukwerken] Found params for ${pressName} (ID: ${pressId})`);
                        updated[pressName] = {
                            id: record.id,
                            marge: parseFloat(String(record.marge || '0').replace(',', '.')) / 100 || 0,
                            margePercentage: String(record.marge || '4,2'),
                            opstart: record.opstart || 6000,
                            param_4_4: record.k_4_4 || 4000,
                            param_4_0: record.k_4_0 || 3000,
                            param_1_0: record.k_1_0 || 1500,
                            param_1_1: record.k_1_1 || 2000,
                            param_4_1: record.k_4_1 || 3500
                        };
                    } else {
                        console.warn(`[Drukwerken] No params found for ${pressName} (ID: ${pressId}). Using defaults.`);
                        // Ensure defaults are set if no record exists yet
                        updated[pressName] = {
                            id: '',
                            marge: 0.042,
                            margePercentage: '4,2',
                            opstart: 6000,
                            param_4_4: 4000,
                            param_4_0: 3000,
                            param_1_0: 1500,
                            param_1_1: 2000,
                            param_4_1: 3500
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

    const fetchCalculatedFields = useCallback(async () => {
        try {
            const records = await pb.collection('calculated_fields').getFullList<CalculatedField>({
                sort: 'created',
            });
            if (records.length > 0) {
                setCalculatedFields(records);
            }
        } catch (error) {
            console.error("Error fetching calculated fields:", error);
        }
    }, []);

    useEffect(() => {
        fetchCalculatedFields();
    }, [fetchCalculatedFields]);

    // Helper to get formula for a specific column
    const getFormulaForColumn = (col: 'maxGross' | 'green' | 'red' | 'delta_number' | 'delta_percentage') => calculatedFields.find(f => f.targetColumn === col);




    const [finishedJobs, setFinishedJobs] = useState<FinishedPrintJob[]>([]);

    useEffect(() => {
        const subscribeParameters = async () => {
            try {
                await pb.collection('press_parameters').subscribe('*', () => {
                    console.log("[Drukwerken] Parameters updated via realtime");
                    fetchParameters();
                });
            } catch (err) {
                console.error("Subscription to press_parameters failed:", err);
            }
        };

        subscribeParameters();

        return () => {
            pb.collection('press_parameters').unsubscribe('*').catch(() => { });
        };
    }, [fetchParameters]);

    // Subscribe to Cache Service
    useEffect(() => {
        // Subscribe to updates
        const unsubscribe = drukwerkenCache.subscribe(
            (jobs) => {
                setFinishedJobs(jobs);
            },
            (status) => {
                setCacheStatus(status);
            },
            user,
            hasPermission
        );

        // Trigger Sync
        if (user) {
            drukwerkenCache.sync(user, hasPermission);
        }

        return () => {
            unsubscribe();
        };
    }, [user, hasPermission]); // Run once on mount/user change

    // Background Update Check (Every 5 Minutes)
    useEffect(() => {
        const intervalId = setInterval(() => {
            if (user) {
                drukwerkenCache.checkForUpdates(user, hasPermission);
            }
        }, 5 * 60 * 1000); // 5 minutes

        return () => clearInterval(intervalId);
    }, [user, hasPermission]);

    // Detect Realtime Changes (using the custom event or direct PB subscription if the service didn't handle it internaly yet)
    // The service handles "checkForUpdates", but for immediate feedback we can still listen to global events
    // or rely on the service to subscribe to PB realtime.
    // Use the existing window event listener as a trigger for the cache service update check
    useEffect(() => {
        const handleDrukwerkenChange = () => {
            console.log("Real-time update: checking cache updates");
            if (user) drukwerkenCache.checkForUpdates(user, hasPermission);
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
    }, [fetchParameters, user, hasPermission]);


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
        // Default to current year instead of checking session storage
        return currentYear;
    });

    useEffect(() => {
        if (typeof sessionStorage !== 'undefined') sessionStorage.setItem('drukwerken_pressFilter', pressFilter);
    }, [pressFilter]);

    const effectivePress = useMemo(() => {
        if (user?.role === 'press' && user.press) return user.press;
        if (pressFilter && pressFilter !== 'all') return pressFilter;
        return activePresses[0] || '';
    }, [user, pressFilter, activePresses]);


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

    const filteredJobs = useMemo(() => {
        return finishedJobs.filter(job => {
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
    }, [finishedJobs, yearFilter, pressFilter, searchQuery, searchField, hasPermission]);

    const sortedJobs = useMemo(() => {
        if (!sortConfig) return filteredJobs;

        return [...filteredJobs].sort((a, b) => {
            const aValue = (a as any)[sortConfig.key];
            const bValue = (b as any)[sortConfig.key];

            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [filteredJobs, sortConfig, parameters, calculatedFields]);

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
            // Manual sync/update check or let realtime handle it
            if (user) drukwerkenCache.checkForUpdates(user, hasPermission);
            setIsAddJobDialogOpen(false);
            setEditingJobs([]);

        } catch (error) {
            console.error("Error saving bulk jobs:", error);
            toast.error("Fout bij opslaan.");
        }
    };

    const processJobFormulas = (job: Omit<FinishedPrintJob, 'id'> | FinishedPrintJob) => {
        const jobWithPress = {
            ...job,
            pressName: job.pressName || effectivePress,
            pressId: job.pressId || (job.pressName ? pressMap[job.pressName] : pressMap[effectivePress])
        };

        const maxGrossVal = getFormulaForColumn('maxGross')
            ? Number(evaluateFormula(getFormulaForColumn('maxGross')!.formula, jobWithPress, parameters, activePresses))
            : job.maxGross;

        const jobWithMaxGross = { ...jobWithPress, maxGross: maxGrossVal };

        const greenVal = getFormulaForColumn('green')
            ? Number(evaluateFormula(getFormulaForColumn('green')!.formula, jobWithMaxGross, parameters, activePresses))
            : job.green;

        const redVal = getFormulaForColumn('red')
            ? Number(evaluateFormula(getFormulaForColumn('red')!.formula, jobWithMaxGross, parameters, activePresses))
            : job.red;

        const delta_numberVal = getFormulaForColumn('delta_number')
            ? Number(evaluateFormula(getFormulaForColumn('delta_number')!.formula, jobWithMaxGross, parameters, activePresses))
            : job.delta_number;

        const delta_percentageVal = (() => {
            const f = getFormulaForColumn('delta_percentage');
            if (f) {
                return Number(evaluateFormula(f.formula, jobWithMaxGross, parameters, activePresses));
            }
            return job.delta_percentage;
        })();

        return {
            ...jobWithMaxGross,
            green: greenVal,
            red: redVal,
            delta_number: delta_numberVal,
            delta_percentage: delta_percentageVal,
            delta: delta_numberVal,
            performance: '100%'
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
            if (user) drukwerkenCache.checkForUpdates(user, hasPermission);
            fetchCalculatedFields();
        } catch (error) {
            console.error("Error deleting job:", error);
            toast.error("Fout bij verwijderen drukwerk.");
        }
    };


    return (
        <TooltipProvider delayDuration={300}>
            <div className="space-y-4">
                {isLoadingPresses && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/50 backdrop-blur-sm">
                        <div className="flex flex-col items-center gap-2">
                            <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
                            <p className="font-medium text-blue-900 text-lg">Persen Laden...</p>
                        </div>
                    </div>
                )}
                <PageHeader
                    title={
                        <div className="flex items-center gap-4">
                            <span>Drukwerken Registratie</span>
                            {(cacheStatus.loading || cacheStatus.newUpdates > 0) && (
                                <div className="flex items-center gap-2 text-sm font-normal text-gray-500 bg-gray-100 px-3 py-1 rounded-full animate-pulse">
                                    {cacheStatus.loading ? (
                                        <>
                                            <RefreshCw className="w-3 h-3 animate-spin" />
                                            <span>{cacheStatus.statusText}</span>
                                            {cacheStatus.totalDocs > 0 && (
                                                <span className="text-xs text-gray-400">({cacheStatus.cachedDocs}/{cacheStatus.totalDocs})</span>
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            <Database className="w-3 h-3 text-blue-500" />
                                            <span className="text-blue-600">{cacheStatus.newUpdates} updates found</span>
                                        </>
                                    )}
                                </div>
                            )}
                            {!cacheStatus.loading && cacheStatus.newUpdates === 0 && (
                                <div className="flex items-center gap-2 text-xs text-gray-400 font-normal">
                                    <Check className="w-3 h-3" />
                                    <span>Up to date</span>
                                </div>
                            )}
                        </div>
                    }
                    description="Beheer en registreer printopdrachten"
                    icon={Printer}
                    className="mb-2"
                    actions={
                        <div className="flex gap-2 items-center flex-wrap justify-end">
                            {activeTab === 'Nieuw' && hasPermission('drukwerken_create') && (
                                <Button onClick={() => handleWerkorderSubmit(defaultWerkorderData)}>
                                    <Plus className="w-4 h-4 mr-2" /> Werkorder
                                </Button>
                            )}
                            {activeTab === 'Gedrukt' && (
                                <Tabs value={yearFilter} onValueChange={setYearFilter} className="w-auto">
                                    <TabsList className="tab-pill-list h-9">
                                        {yearOptions.map((opt: any) => (
                                            <TabsTrigger
                                                key={opt.value}
                                                value={opt.value}
                                                className="tab-pill-trigger text-xs px-3 py-1"
                                            >
                                                {opt.label}
                                            </TabsTrigger>
                                        ))}
                                    </TabsList>
                                </Tabs>
                            )}

                            {user?.role?.toLowerCase() === 'admin' && (
                                <div className="flex items-center space-x-2 bg-white px-3 h-9 rounded-md border text-xs shadow-sm">
                                    <Switch
                                        id="compare-mode"
                                        checked={showComparison}
                                        onCheckedChange={setShowComparison}
                                        className="scale-75 origin-left"
                                    />
                                    <Label htmlFor="compare-mode" className="cursor-pointer font-medium text-gray-600">Vergelijk</Label>
                                </div>
                            )}

                            {user?.role?.toLowerCase() === 'admin' && (
                                <Select value={pressFilter} onValueChange={setPressFilter}>
                                    <SelectTrigger className="w-[140px] h-9 bg-white text-xs">
                                        <SelectValue placeholder="Alle Persen" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all" className="text-xs">Alle Persen</SelectItem>
                                        {activePresses.filter(press => press && press.trim() !== '').map(press => (
                                            <SelectItem key={press} value={press} className="text-xs">{press}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}

                            {activeTab === 'Gedrukt' && (
                                <div className="relative">
                                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                    <Input
                                        placeholder="Zoeken..."
                                        className="pl-10 pr-8 w-[200px] h-9 bg-white border-gray-200 focus:border-blue-500 transition-colors text-xs"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                    {searchQuery && (
                                        <button
                                            onClick={() => setSearchQuery('')}
                                            className="absolute right-2 top-2.5 h-4 w-4 text-gray-400 hover:text-gray-600 transition-colors"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    }
                />
                <Tabs value={activeTab} onValueChange={(value) => navigate(`/Drukwerken/${value}`)} className="w-full">
                    {(() => {
                        const showWerkorders = user?.role === 'press';
                        const showFinished = (user?.role?.toLowerCase() === 'admin' || user?.role?.toLowerCase() === 'meestergast' || (user?.role === 'press' && hasPermission('drukwerken_view')));

                        if (Number(showWerkorders) + Number(showFinished) <= 1) return null;

                        return (
                            <TabsList className="tab-pill-list">
                                {showWerkorders && (
                                    <TabsTrigger value="Nieuw" className="tab-pill-trigger">Nieuw Order</TabsTrigger>
                                )}
                                {showFinished && (
                                    <TabsTrigger value="Gedrukt" className="tab-pill-trigger">Gedrukt</TabsTrigger>
                                )}
                            </TabsList>
                        );
                    })()}

                    {user?.role === 'press' && (
                        <TabsContent value="Nieuw">
                            <Card>
                                <CardContent className="space-y-4 max-h-[calc(100vh-250px)] overflow-y-auto relative">
                                    {werkorders.map((wo) => (
                                        <div key={wo.id} className="border p-4 rounded-lg">
                                            <div className="flex justify-between items-center mb-4">
                                                <div className="flex gap-4 w-full items-end">
                                                    <div className="flex flex-col items-center">
                                                        <Label>Order Nr</Label>
                                                        <div className="flex items-center border border-gray-200 rounded-md px-2 bg-white h-9" style={{ width: '85px' }}>
                                                            <span className="text-sm font-medium text-muted-foreground mr-1">DT </span>
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
                                            <Table className={`table-fixed w-full ${FONT_SIZES.body}`} style={{ minWidth: '1200px' }}>
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
                                                    <TableRow className="border-b-0 sticky top-0 z-40 bg-white h-10">
                                                        <TableHead colSpan={4} className="text-center bg-blue-100 border-r border-black sticky top-0 z-40">Data</TableHead>
                                                        <TableHead colSpan={6} className="text-center bg-green-100 border-r border-black sticky top-0 z-40">Wissels</TableHead>
                                                        <TableHead colSpan={3} className="text-center bg-yellow-100 border-r border-black sticky top-0 z-40">Berekening</TableHead>
                                                        <TableHead colSpan={2} className="text-center bg-purple-100 border-r border-black sticky top-0 z-40">Prestatie</TableHead>
                                                        <TableHead colSpan={1} style={{ width: COL_WIDTHS.actions }} className="border-r border-black sticky top-0 z-40 bg-white"></TableHead>
                                                    </TableRow>
                                                    <TableRow className="border-b border-black sticky top-[40px] z-40 bg-white shadow-sm h-10">
                                                        <TableHead style={{ width: COL_WIDTHS.version }} className="border-r sticky top-[40px] z-40 bg-white">Version</TableHead>
                                                        <TableHead className="text-center border-r sticky top-[40px] z-40 bg-white" style={{ width: COL_WIDTHS.pages }}>Pagina's</TableHead>
                                                        <TableHead className="text-center items-center justify-center leading-3 border-r sticky top-[40px] z-40 bg-white" style={{ width: COL_WIDTHS.exOmw }}>Ex/<br />Omw.</TableHead>
                                                        <TableHead className="text-center border-r border-black sticky top-[40px] z-40 bg-white" style={{ width: COL_WIDTHS.netRun }}>Oplage</TableHead>
                                                        <TableHead className="text-center sticky top-[40px] z-40 bg-white" style={{ width: COL_WIDTHS.startup }}>Opstart</TableHead>
                                                        <TableHead className="text-center px-0 text-[10px] border-r sticky top-[40px] z-40 bg-white" style={{ width: COL_WIDTHS.c4_4 }}>4/4</TableHead>
                                                        <TableHead className="text-center px-0 text-[10px] border-r sticky top-[40px] z-40 bg-white" style={{ width: COL_WIDTHS.c4_0 }}>4/0</TableHead>
                                                        <TableHead className="text-center px-0 text-[10px] border-r sticky top-[40px] z-40 bg-white" style={{ width: COL_WIDTHS.c1_0 }}>1/0</TableHead>
                                                        <TableHead className="text-center px-0 text-[10px] border-r sticky top-[40px] z-40 bg-white" style={{ width: COL_WIDTHS.c1_1 }}>1/1</TableHead>
                                                        <TableHead className="text-center px-0 text-[10px] border-r border-black sticky top-[40px] z-40 bg-white" style={{ width: COL_WIDTHS.c4_1 }}>4/1</TableHead>
                                                        <TableHead className="text-center border-r sticky top-[40px] z-40 bg-white" style={{ width: COL_WIDTHS.maxGross }}>Max Bruto</TableHead>
                                                        <TableHead className="text-center border-r sticky top-[40px] z-40 bg-white" style={{ width: COL_WIDTHS.green }}>Groen</TableHead>
                                                        <TableHead className="text-center border-r border-black sticky top-[40px] z-40 bg-white" style={{ width: COL_WIDTHS.red }}>Rood</TableHead>
                                                        <TableHead className="text-center border-r sticky top-[40px] z-40 bg-white" style={{ width: COL_WIDTHS.delta }}>Delta</TableHead>
                                                        <TableHead className="text-center border-r border-black sticky top-[40px] z-40 bg-white" style={{ width: COL_WIDTHS.deltaPercent }}>Delta %</TableHead>
                                                        <TableHead style={{ width: COL_WIDTHS.actions }} className="border-r border-black sticky top-[40px] z-40 bg-white"></TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {wo.katernen.map((katern) => {
                                                        const jobWithOrderInfo = {
                                                            ...katern,
                                                            orderNr: wo.orderNr,
                                                            orderName: wo.orderName,
                                                            pressName: effectivePress
                                                        };
                                                        const maxGrossVal = getFormulaForColumn('maxGross')
                                                            ? evaluateFormula(getFormulaForColumn('maxGross')!.formula, jobWithOrderInfo, parameters, activePresses) as number
                                                            : katern.maxGross;

                                                        const jobWithCalculatedMaxGross = { ...jobWithOrderInfo, maxGross: maxGrossVal };
                                                        return (
                                                            <TableRow key={katern.id} className="hover:bg-blue-50/70 [&>td]:hover:bg-blue-50/70 transition-colors group">
                                                                <TableCell>
                                                                    <Input value={katern.version} onChange={(e) => handleKaternChange(wo.id, katern.id, 'version', e.target.value)} className="h-9 px-2 bg-white border-gray-200" />
                                                                </TableCell>
                                                                <TableCell className="text-right">
                                                                    <FormattedNumberInput value={katern.pages} onChange={(val) => handleKaternChange(wo.id, katern.id, 'pages', val)} className="h-9 px-2 bg-white border-gray-200 text-right" />
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Input value={katern.exOmw} onChange={(e) => handleKaternChange(wo.id, katern.id, 'exOmw', e.target.value)} className="h-9 px-2 bg-white border-gray-200 text-center" />
                                                                </TableCell>
                                                                <TableCell className="text-right border-r border-black">
                                                                    <FormattedNumberInput value={katern.netRun} onChange={(val) => handleKaternChange(wo.id, katern.id, 'netRun', val || 0)} className="h-9 px-2 bg-white border-gray-200 text-right" />
                                                                </TableCell>
                                                                <TableCell className="text-center">
                                                                    <Checkbox checked={katern.startup} onCheckedChange={(checked) => handleKaternChange(wo.id, katern.id, 'startup', checked)} />
                                                                </TableCell>
                                                                <TableCell className="px-0">
                                                                    <FormattedNumberInput value={katern.c4_4} onChange={(val) => handleKaternChange(wo.id, katern.id, 'c4_4', val || 0)} className="h-9 px-1 text-[10px] bg-white border-gray-200" />
                                                                </TableCell>
                                                                <TableCell className="px-0">
                                                                    <FormattedNumberInput value={katern.c4_0} onChange={(val) => handleKaternChange(wo.id, katern.id, 'c4_0', val || 0)} className="h-9 px-1 text-[10px] bg-white border-gray-200" />
                                                                </TableCell>
                                                                <TableCell className="px-0">
                                                                    <FormattedNumberInput value={katern.c1_0} onChange={(val) => handleKaternChange(wo.id, katern.id, 'c1_0', val || 0)} className="h-9 px-1 text-[10px] bg-white border-gray-200" />
                                                                </TableCell>
                                                                <TableCell className="px-0">
                                                                    <FormattedNumberInput value={katern.c1_1} onChange={(val) => handleKaternChange(wo.id, katern.id, 'c1_1', val || 0)} className="h-9 px-1 text-[10px] bg-white border-gray-200" />
                                                                </TableCell>
                                                                <TableCell className="px-0 border-r border-black">
                                                                    <FormattedNumberInput value={katern.c4_1} onChange={(val) => handleKaternChange(wo.id, katern.id, 'c4_1', val || 0)} className="h-9 px-1 text-[10px] bg-white border-gray-200" />
                                                                </TableCell>
                                                                <TableCell className="text-right border-r border-black">
                                                                    <div className="flex flex-col items-center">
                                                                        <FormulaResultWithTooltip
                                                                            formula={getFormulaForColumn('maxGross')?.formula || ''}
                                                                            job={jobWithOrderInfo}
                                                                            parameters={parameters}
                                                                            activePresses={activePresses}
                                                                            result={maxGrossVal}
                                                                        />
                                                                        {showComparison && (
                                                                            <div className="text-[10px] text-gray-400 border-t mt-1 pt-0.5 w-full text-center">
                                                                                Rec: {formatNumber(katern.maxGross)}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell className="text-right">
                                                                    <FormattedNumberInput value={katern.green} onChange={(val) => handleKaternChange(wo.id, katern.id, 'green', val)} className="h-9 px-2 bg-white border-gray-200 text-right" />
                                                                </TableCell>
                                                                <TableCell className="text-right border-r border-black">
                                                                    <FormattedNumberInput value={katern.red} onChange={(val) => handleKaternChange(wo.id, katern.id, 'red', val)} className="h-9 px-2 bg-white border-gray-200 text-right" />
                                                                </TableCell>
                                                                <TableCell className="text-right font-medium">
                                                                    {(() => {
                                                                        const f = getFormulaForColumn('delta_number');
                                                                        const result = f ? evaluateFormula(f.formula, jobWithCalculatedMaxGross, parameters, activePresses) : 0;
                                                                        return formatNumber(result, 0);
                                                                    })()}
                                                                </TableCell>
                                                                <TableCell className="text-right font-medium border-r border-black">
                                                                    {(() => {
                                                                        const f = getFormulaForColumn('delta_percentage');
                                                                        if (f) {
                                                                            const result = evaluateFormula(f.formula, jobWithCalculatedMaxGross, parameters, activePresses);
                                                                            const numericValue = typeof result === 'number'
                                                                                ? result
                                                                                : parseFloat((result as string || '0').replace(/\./g, '').replace(',', '.'));
                                                                            return `${formatNumber(numericValue * 100, 2)
                                                                                }% `;
                                                                        }
                                                                        return `${formatNumber(katern.deltaPercentage * 100, 2)}% `;
                                                                    })()}
                                                                </TableCell>
                                                                <TableCell className="border-r border-black">
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

                    <TabsContent value="Gedrukt">
                        <Card>
                            <CardContent className="p-0">
                                <TableVirtuoso
                                    style={{ height: 'calc(100vh - 220px)', minWidth: '1600px' }}
                                    data={sortedJobs}
                                    fixedHeaderContent={() => (
                                        <>
                                            <TableRow className="border-b-0 bg-white h-10">
                                                {user?.role?.toLowerCase() === 'admin' && <TableHead style={{ width: COL_WIDTHS.press }} className="bg-white"></TableHead>}
                                                <TableHead colSpan={6} className="text-center bg-blue-100 border-r border-black">Data</TableHead>
                                                <TableHead colSpan={6} className="text-center bg-green-100 border-r border-black">Wissels</TableHead>
                                                <TableHead colSpan={3} className="text-center bg-yellow-100 border-r border-black">Berekening</TableHead>
                                                <TableHead colSpan={2} className="text-center bg-purple-100 border-r border-black">Prestatie</TableHead>
                                                <TableHead style={{ width: COL_WIDTHS.actions }} className="border-r border-black bg-white"></TableHead>
                                            </TableRow>
                                            <TableRow className="border-b border-black bg-white shadow-sm h-10">
                                                {user?.role?.toLowerCase() === 'admin' && <TableHead style={{ width: COL_WIDTHS.press }} className="text-center bg-gray-100 border-r">Pers</TableHead>}
                                                <TableHead onClick={() => requestSort('date')} style={{ width: COL_WIDTHS.date }} className="cursor-pointer hover:bg-gray-100 text-center border-r bg-white"><div className="flex items-center justify-center">Datum {getSortIcon('date')}</div></TableHead>
                                                <TableHead onClick={() => requestSort('orderNr')} style={{ width: COL_WIDTHS.orderNr }} className="cursor-pointer hover:bg-gray-100 text-center border-r bg-white"><div className="flex items-center justify-center">Order nr {getSortIcon('orderNr')}</div></TableHead>
                                                <TableHead onClick={() => requestSort('orderName')} style={{ width: COL_WIDTHS.orderName }} className="cursor-pointer hover:bg-gray-100 border-r bg-white"><div className="flex items-center">Order {getSortIcon('orderName')}</div></TableHead>
                                                <TableHead onClick={() => requestSort('pages')} style={{ width: COL_WIDTHS.pages }} className="cursor-pointer hover:bg-gray-100 text-center border-r bg-white"><div className="flex items-center justify-center">Pagina's {getSortIcon('pages')}</div></TableHead>
                                                <TableHead onClick={() => requestSort('exOmw')} style={{ width: COL_WIDTHS.exOmw }} className="cursor-pointer hover:bg-gray-100 text-center border-r leading-3 bg-white"><div className="flex items-center justify-center h-full">Ex/<br />Omw. {getSortIcon('exOmw')}</div></TableHead>
                                                <TableHead onClick={() => requestSort('netRun')} style={{ width: COL_WIDTHS.netRun }} className="cursor-pointer hover:bg-gray-100 text-center border-r bg-white"><div className="flex items-center justify-center">Oplage {getSortIcon('netRun')}</div></TableHead>
                                                <TableHead onClick={() => requestSort('startup')} style={{ width: COL_WIDTHS.startup }} className="cursor-pointer hover:bg-gray-100 text-center bg-gray-50 border-r"><div className="flex items-center justify-center">Opstart {getSortIcon('startup')}</div></TableHead>
                                                <TableHead style={{ width: COL_WIDTHS.c4_4 }} className="px-1 text-center bg-gray-50 border-r">4/4</TableHead>
                                                <TableHead style={{ width: COL_WIDTHS.c4_0 }} className="px-1 text-center bg-gray-50 border-r">4/0</TableHead>
                                                <TableHead style={{ width: COL_WIDTHS.c1_0 }} className="px-1 text-center bg-gray-50 border-r">1/0</TableHead>
                                                <TableHead style={{ width: COL_WIDTHS.c1_1 }} className="px-1 text-center bg-gray-50 border-r">1/1</TableHead>
                                                <TableHead style={{ width: COL_WIDTHS.c4_1 }} className="px-1 text-center bg-gray-50 border-r">4/1</TableHead>
                                                <TableHead style={{ width: COL_WIDTHS.maxGross }} className="text-center border-r bg-white">
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
                                                <TableHead style={{ width: COL_WIDTHS.green }} className="text-center border-r bg-white">
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
                                                <TableHead style={{ width: COL_WIDTHS.red }} className="text-center border-r bg-white">
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
                                                <TableHead style={{ width: COL_WIDTHS.delta }} className="text-center border-r bg-white">
                                                    <div className="flex items-center gap-1 justify-center">
                                                        <span className="font-bold">Delta</span>
                                                    </div>
                                                </TableHead>
                                                <TableHead style={{ width: COL_WIDTHS.deltaPercent }} className="text-center border-r bg-white">
                                                    <div className="flex items-center gap-1 justify-center">
                                                        <span className="font-bold">Delta %</span>
                                                    </div>
                                                </TableHead>
                                                <TableHead style={{ width: COL_WIDTHS.actions }} className="text-center bg-white">
                                                    <div className="flex items-center gap-1 justify-center">
                                                        <Wrench className="w-4 h-4 text-gray-700" />
                                                    </div>
                                                </TableHead>
                                            </TableRow>
                                        </>
                                    )}
                                    itemContent={(_index, job) => (
                                        <>
                                            {user?.role?.toLowerCase() === 'admin' && (
                                                <TableCell className="py-1 px-2 font-medium bg-gray-50 border-r border-black text-center truncate group-hover:bg-blue-50/70" title={job.pressName}>
                                                    {job.pressName || '-'}
                                                </TableCell>
                                            )}
                                            <TableCell className="py-1 px-2 text-center">{job.date}</TableCell>
                                            <TableCell className="py-1 px-2 text-center">DT {job.orderNr}</TableCell>
                                            <TableCell className="py-1 px-2">
                                                <span className="font-medium mr-2">{job.orderName}</span>
                                                <span className="text-gray-500 whitespace-nowrap">{job.version}</span>
                                            </TableCell>
                                            <TableCell className="text-right py-1 px-1">{formatNumber(job.pages)} blz</TableCell>
                                            <TableCell className="text-center py-1 px-1">{job.exOmw}</TableCell>
                                            <TableCell className="text-right py-1 px-1 border-r border-black">{formatNumber(job.netRun)}</TableCell>
                                            <TableCell className="text-center py-1 px-1 bg-gray-50">
                                                <div className="flex justify-center">
                                                    {job.startup ? <Check className="w-4 h-4 text-green-600" /> : <span className="text-gray-300">-</span>}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center py-1 px-1 bg-gray-50">{formatNumber(job.c4_4)}</TableCell>
                                            <TableCell className="text-center py-1 px-1 bg-gray-50">{formatNumber(job.c4_0)}</TableCell>
                                            <TableCell className="text-center py-1 px-1 bg-gray-50">{formatNumber(job.c1_0)}</TableCell>
                                            <TableCell className="text-center py-1 px-1 bg-gray-50">{formatNumber(job.c1_1)}</TableCell>
                                            <TableCell className="text-center py-1 px-1 bg-gray-50 border-r border-black group-hover:bg-blue-50/70">{formatNumber(job.c4_1)}</TableCell>
                                            <TableCell className="py-1 px-1 text-right">
                                                <div className="flex flex-col items-center">
                                                    {(() => {
                                                        const formula = getFormulaForColumn('maxGross');
                                                        return formula
                                                            ? <FormulaResultWithTooltip formula={formula.formula} job={job} parameters={parameters} activePresses={activePresses} />
                                                            : formatNumber(job.maxGross, 0);
                                                    })()}
                                                    {showComparison && (
                                                        <div className="text-[10px] text-gray-400 border-t mt-1 pt-0.5 w-full text-center">
                                                            Rec: {formatNumber(job.maxGross)}
                                                        </div>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-1 px-1 text-right">
                                                {(() => {
                                                    const formula = getFormulaForColumn('green');
                                                    return formula
                                                        ? <FormulaResultWithTooltip formula={formula.formula} job={job} parameters={parameters} activePresses={activePresses} />
                                                        : formatNumber(job.green);
                                                })()}
                                            </TableCell>
                                            <TableCell className="py-1 px-1 text-right border-r border-black">
                                                {(() => {
                                                    const formula = getFormulaForColumn('red');
                                                    return formula
                                                        ? <FormulaResultWithTooltip formula={formula.formula} job={job} parameters={parameters} activePresses={activePresses} />
                                                        : formatNumber(job.red);
                                                })()}
                                            </TableCell>
                                            <TableCell className="text-right py-1 px-1">
                                                {(() => {
                                                    const formula = getFormulaForColumn('delta_number');
                                                    return formula
                                                        ? <FormulaResultWithTooltip formula={formula.formula} job={job} parameters={parameters} activePresses={activePresses} variant="delta" />
                                                        : formatNumber(job.delta_number, 0);
                                                })()}
                                            </TableCell>
                                            <TableCell className="text-right py-1 px-1 border-r border-black">
                                                {(() => {
                                                    const formula = getFormulaForColumn('delta_percentage');
                                                    const result = formula
                                                        ? evaluateFormula(formula.formula, job, parameters, activePresses)
                                                        : job.delta_percentage;

                                                    const percentageValue = typeof result === 'number'
                                                        ? result
                                                        : parseFloat((result as string || '0').replace(/\./g, '').replace(',', '.'));

                                                    return percentageValue !== undefined ? `${formatNumber(percentageValue * 100, 2)}% ` : '-';
                                                })()}
                                            </TableCell>
                                            <TableCell className="py-1 px-1 border-r border-black">
                                                <div className="flex gap-1 justify-center">
                                                    {(() => {
                                                        const editLimit = getSystemSetting('drukwerken_edit_limit', 1);
                                                        const referenceDate = job.date || job.created;
                                                        const isWithinEditLimit = referenceDate ? differenceInDays(new Date(), new Date(referenceDate)) < Number(editLimit) : true;
                                                        const canEdit = user?.role === 'admin' || user?.role === 'meestergast' || (user?.role === 'press' && isWithinEditLimit);

                                                        if (!canEdit) return null;

                                                        return (
                                                            <>
                                                                <Button size="icon" variant="ghost" className="h-6 w-6 hover:bg-blue-100 text-blue-600" onClick={() => handleEditJob(job)}>
                                                                    <Edit className="w-3 h-3" />
                                                                </Button>
                                                                {(user?.role === 'admin' || user?.role === 'meestergast') && (
                                                                    <Button size="icon" variant="ghost" className="h-6 w-6 hover:bg-re-100 text-red-500" onClick={() => handleDeleteJob(job.id)}>
                                                                        <Trash2 className="w-3 h-3" />
                                                                    </Button>
                                                                )}
                                                            </>
                                                        );
                                                    })()}
                                                </div>
                                            </TableCell>
                                        </>
                                    )}
                                    components={{
                                        Table: ({ style, ...props }: any) => (
                                            <table
                                                {...props}
                                                style={{ ...style, minWidth: '1600px', borderCollapse: 'collapse' }}
                                                className={`table-fixed w-full ${FONT_SIZES.body}`}
                                            >
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
                                                {props.children}
                                            </table>
                                        ),
                                        TableRow: (props: any) => <tr {...props} className="h-8 hover:bg-blue-50/70 [&>td]:hover:bg-blue-50/70 transition-colors group border-b border-gray-100" />
                                    }}
                                />
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>

            {isAddJobDialogOpen && (
                <AddFinishedJobDialog
                    open={isAddJobDialogOpen}
                    onOpenChange={setIsAddJobDialogOpen}
                    onSubmit={handleBulkJobSubmit}
                    initialJobs={editingJobs}
                    onCalculate={(job) => processJobFormulas(job) as FinishedPrintJob}
                />
            )}
        </TooltipProvider>
    );
}

export default Drukwerken;