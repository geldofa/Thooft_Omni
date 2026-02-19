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
import { ConfirmationModal } from './ui/ConfirmationModal';
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
    exOmw: '40px',
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
    variant = 'default',
    outputConversions = {},
    pressMap = {}
}: {
    formula: string;
    job: FinishedPrintJob | Omit<FinishedPrintJob, 'id'> | Katern;
    decimals?: number;
    parameters: Record<string, Record<string, any>>;
    activePresses: string[];
    result?: number;
    variant?: 'maxGross' | 'delta' | 'default';
    outputConversions?: Record<string, Record<string, number>>;
    pressMap?: Record<string, string>;
}) => {
    const pressName = (job as any).pressName || (activePresses.length > 0 ? activePresses[0] : '');
    const pressId = pressMap[pressName] || '';
    const divider = outputConversions[pressId]?.[(job as any).exOmw] || 1;

    // Re-evaluate or use passed result (which we now assume is UNDIVIDED Actual Units)
    const rawResult = propResult !== undefined
        ? propResult
        : evaluateFormula(formula, job as any, parameters, activePresses);

    const numericRawResult = Number(rawResult) || 0;
    // Delta should NOT be divided. Everything else (maxGross, green, red) should show machine cycles as main.
    const dividedResult = variant === 'delta' ? numericRawResult : (numericRawResult / divider);

    const formattedResult = formatNumber(dividedResult, decimals);

    // Final Tooltip Design: 1 Card per high-level Part (Netto, Marge, Opstart, Colors)
    const renderCalculationFlow = () => {
        const safeParams = parameters[pressName] || {};
        const exOmw = Number((job as any).exOmw || 1); // Use RAW exOmw for undivided calc breakdown

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

            // For Delta tooltip, we want to show the Actual Units
            // But are the job.green/red machine cycles or units?
            // In Gedrukt tab, they are units. In Nieuw tab, they are machine cycles.
            // Let's check for scaling.
            const dividerLoc = outputConversions[pressId]?.[(job as any).exOmw] || 1;
            const greenActual = green > 10000 ? green : green * dividerLoc;
            const redActual = red > 10000 ? red : red * dividerLoc;

            if (green !== 0) {
                parts.push({
                    label: "Groen",
                    formula: "Groen",
                    breakdown: formatNumber(greenActual),
                    value: greenActual,
                    operator: '+'
                });
            }
            if (red !== 0) {
                parts.push({
                    label: "Rood",
                    formula: "Rood",
                    breakdown: formatNumber(redActual),
                    value: redActual,
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
                <span className="cursor-help border-b border-dashed border-gray-400 whitespace-nowrap font-bold leading-none py-1">
                    {formatNumber(dividedResult, variant === 'maxGross' ? 0 : decimals)}
                </span>
            </TooltipTrigger>
            <TooltipContent
                side="top"
                sideOffset={4}
                avoidCollisions
                style={{ backgroundColor: 'white', color: '#1f2937' }}
                className="border border-gray-200 shadow-2xl max-w-[95vw] p-4 z-[100] rounded-2xl"
            >
                <div className="space-y-3">
                    <div className="flex justify-between items-center border-b border-gray-100 pb-2 mb-2">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Berekening</span>
                        {divider > 1 && (
                            <div className="px-2 py-0.5 rounded-full bg-blue-50 text-[10px] font-bold text-blue-600 border border-blue-100">
                                Deler: {divider}
                            </div>
                        )}
                    </div>
                    {renderCalculationFlow()}
                    {variant === 'maxGross' && divider > 1 && (
                        <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between items-center bg-gray-50/50 -mx-4 -mb-4 px-4 py-3 rounded-b-2xl">
                            <span className="text-[10px] font-bold text-gray-500 uppercase">Totaal (Output)</span>
                            <span className="text-sm font-black text-gray-900">{numericRawResult.toLocaleString('nl-BE')}</span>
                        </div>
                    )}
                </div>
            </TooltipContent>
        </Tooltip>
    );
};

export function Drukwerken({ presses: propsPresses }: { presses?: Press[] }) {
    const [presses, setPresses] = useState<Press[]>(propsPresses || []);
    const [isLoadingPresses, setIsLoadingPresses] = useState(false);
    const [outputConversions, setOutputConversions] = useState<Record<string, Record<string, number>>>({});

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

    const fetchOutputConversions = useCallback(async () => {
        try {
            const settings = await pb.collection('app_settings').getFirstListItem('key="output_conversions"').catch(() => null);
            if (settings) {
                setOutputConversions(settings.value || {});
            }
        } catch (error) {
            console.error("Error fetching output conversions:", error);
        }
    }, []);

    useEffect(() => {
        fetchOutputConversions();
    }, [fetchOutputConversions]);
    const activePresses = useMemo(() => presses
        .filter(p => p.active && !p.archived)
        .map(p => p.name), [presses]);

    // Map press names to IDs for relation linking
    const pressMap = useMemo(() => presses.reduce((acc, press) => {
        acc[press.name] = press.id;
        return acc;
    }, {} as Record<string, string>), [presses]);

    const { user, hasPermission, getSystemSetting, addActivityLog } = useAuth();

    const { subtab } = useParams<{ subtab: string }>();
    const navigate = useNavigate();
    const activeTab = subtab?.toLowerCase() === 'gedrukt' ? 'Gedrukt' : 'Nieuw';


    const [isAddJobDialogOpen, setIsAddJobDialogOpen] = useState(false);
    const [editingJobs, setEditingJobs] = useState<FinishedPrintJob[]>([]);
    const [showComparison, setShowComparison] = useState(false);

    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [deleteAction, setDeleteAction] = useState<{ type: 'werkorder' | 'katern' | 'job', id: string, secondaryId?: string } | null>(null);
    const [deleteMessage, setDeleteMessage] = useState({ title: '', description: '' });

    // Validation State
    const [validationErrors, setValidationErrors] = useState<Record<string, Record<string, boolean>>>({});

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

        // Clear validation errors for this field
        if (validationErrors[werkorderId]?.[field]) {
            setValidationErrors(prev => {
                const newErrors = { ...prev };
                if (newErrors[werkorderId]) {
                    const { [field]: _, ...rest } = newErrors[werkorderId];
                    if (Object.keys(rest).length === 0) {
                        delete newErrors[werkorderId];
                    } else {
                        newErrors[werkorderId] = rest;
                    }
                }
                return newErrors;
            });
        }
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



    const handleSaveOrderToFinished = async (werkorder: Werkorder) => {
        // Validation
        const errors: Record<string, boolean> = {};
        if (!werkorder.orderNr) errors.orderNr = true;
        if (!werkorder.orderName) errors.orderName = true;

        if (Object.keys(errors).length > 0) {
            setValidationErrors(prev => ({ ...prev, [werkorder.id]: errors }));
            toast.error("Niet alle verplichte velden zijn ingevuld (Ordernr en Naam).");
            return;
        }

        if (!hasPermission('drukwerken_view_all') && !user?.pressId) {
            toast.error("Kan niet opslaan: Persgegevens nog niet geladen. Probeer het over enkele seconden opnieuw.");
            return;
        }
        try {
            const today = new Date();
            const formattedDate = format(today, 'yyyy-MM-dd');
            const formattedDatum = format(today, 'dd-MM');

            const promises = werkorder.katernen.map(async (katern) => {
                const pressId = user?.pressId || '';
                const divider = outputConversions[pressId]?.[katern.exOmw] || 1;
                // The formula evaluation expects raw exOmw, and returns undivided actual units.
                // The green/red inputs are machine cycles, so they need to be scaled to actual units for delta calculation.

                const jobForCalculations = {
                    ...katern,
                    orderNr: werkorder.orderNr,
                    orderName: werkorder.orderName,
                    date: formattedDate,
                    datum: formattedDatum,
                    pressName: user?.press,
                    pressId: user?.pressId
                };

                const calculatedMaxGross = getFormulaForColumn('maxGross')
                    ? (typeof evaluateFormula(getFormulaForColumn('maxGross')!.formula, jobForCalculations, parameters, activePresses) === 'number'
                        ? evaluateFormula(getFormulaForColumn('maxGross')!.formula, jobForCalculations, parameters, activePresses)
                        : Number(String(evaluateFormula(getFormulaForColumn('maxGross')!.formula, jobForCalculations, parameters, activePresses)).replace(/\./g, '').replace(',', '.')))
                    : katern.maxGross;
                const maxGrossVal = Number(calculatedMaxGross) || 0;

                // Scale inputs for Delta and saving (green/red are machine cycles from input, convert to actual units)
                const greenActual = (Number(katern.green) || 0) * divider;
                const redActual = (Number(katern.red) || 0) * divider;

                const jobWithMaxGrossAndScaledGreenRed = { ...jobForCalculations, maxGross: maxGrossVal, green: greenActual, red: redActual };

                const deltaVal = getFormulaForColumn('delta_number')
                    ? (typeof evaluateFormula(getFormulaForColumn('delta_number')!.formula, jobWithMaxGrossAndScaledGreenRed, parameters, activePresses) === 'number'
                        ? evaluateFormula(getFormulaForColumn('delta_number')!.formula, jobWithMaxGrossAndScaledGreenRed, parameters, activePresses)
                        : Number(String(evaluateFormula(getFormulaForColumn('delta_number')!.formula, jobWithMaxGrossAndScaledGreenRed, parameters, activePresses)).replace(/\./g, '').replace(',', '.')))
                    : (Number(maxGrossVal) - (Number(greenActual) + Number(redActual)));

                return {
                    ...katern,
                    maxGross: Number(maxGrossVal),
                    green: Number(greenActual),
                    red: Number(redActual),
                    delta: Number(deltaVal),
                    deltaPercentage: (() => {
                        const f = getFormulaForColumn('delta_percentage');
                        if (f) {
                            return typeof evaluateFormula(f.formula, { ...jobWithMaxGrossAndScaledGreenRed, delta_number: deltaVal }, parameters, activePresses) === 'number'
                                ? evaluateFormula(f.formula, { ...jobWithMaxGrossAndScaledGreenRed, delta_number: deltaVal }, parameters, activePresses) as number
                                : Number(String(evaluateFormula(f.formula, { ...jobWithMaxGrossAndScaledGreenRed, delta_number: deltaVal }, parameters, activePresses)).replace(/\./g, '').replace(',', '.'));
                        }
                        return Number(maxGrossVal) > 0 ? Number(deltaVal) / Number(maxGrossVal) : (0 as number);
                    })() as number
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
                    ex_omw: parseFloat(processedKatern.exOmw) || 0, // Use the raw exOmw from katern
                    netto_oplage: processedKatern.netRun,
                    opstart: processedKatern.startup,
                    k_4_4: processedKatern.c4_4,
                    k_4_0: processedKatern.c4_0,
                    k_1_0: processedKatern.c1_0,
                    k_1_1: processedKatern.c1_1,
                    k_4_1: processedKatern.c4_1,
                    max_bruto: Math.round(processedKatern.maxGross as number), // Round to 0 decimals
                    groen: (processedKatern.green as number) || 0, // This is now actual units
                    rood: (processedKatern.red as number) || 0, // This is now actual units
                    delta: Math.round(processedKatern.delta as number), // Round to 0 decimals
                    delta_percent: (processedKatern.deltaPercentage as number) || 0,
                    pers: user?.pressId,
                    status: 'check',
                    opmerking: ''
                };

                const record = await pb.collection('drukwerken').create(pbData);
                await drukwerkenCache.putRecord(record, user, hasPermission);

                // Log creation
                await addActivityLog({
                    action: 'Created',
                    entity: 'FinishedJob',
                    entityId: 'new',
                    entityName: `${werkorder.orderNr} - ${werkorder.orderName}`,
                    details: `Drukwerk afgepunt: ${werkorder.orderNr} (Versie: ${processedKatern.version || '-'})`,
                    newValue: [
                        `Order: ${werkorder.orderNr}`,
                        `Blz: ${processedKatern.pages}`,
                        `Netto: ${processedKatern.netRun}`,
                        `Versie: ${processedKatern.version || '-'}`
                    ].join('|||'),
                    user: user?.username || 'System',
                    press: user?.press
                });
            }

            fetchCalculatedFields();

            // Trigger cache update immediately
            if (user) {
                drukwerkenCache.checkForUpdates(user, hasPermission);
            }
            // Notify other components/listeners
            window.dispatchEvent(new CustomEvent('pb-drukwerken-changed'));

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
        let isSubscribed = false;
        const subscribeParameters = async () => {
            if (!user) return;
            try {
                await pb.collection('press_parameters').subscribe('*', () => {
                    console.log("[Drukwerken] Parameters updated via realtime");
                    fetchParameters();
                });
                isSubscribed = true;
            } catch (err) {
                console.error("Subscription to press_parameters failed:", err);
            }
        };

        subscribeParameters();

        return () => {
            if (isSubscribed) {
                pb.collection('press_parameters').unsubscribe('*').catch(() => { });
            }
        };
    }, [fetchParameters, user?.id]);

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
                await Promise.all(deletedIds.map(async (id) => {
                    await pb.collection('drukwerken').delete(id);
                    // Log deletion
                    await addActivityLog({
                        action: 'Deleted',
                        entity: 'FinishedJob',
                        entityId: id,
                        entityName: id,
                        details: `Bulk bewerking: Drukwerk verwijderd (${id})`,
                        oldValue: `ID: ${id}`,
                        user: user?.username || 'System',
                        press: user?.press
                    });
                }));
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
                    // Log creation
                    await addActivityLog({
                        action: 'Created',
                        entity: 'FinishedJob',
                        entityId: 'new',
                        entityName: `${job.orderNr} - ${job.orderName}`,
                        details: `Bulk bewerking: Drukwerk aangemaakt (${job.orderNr})`,
                        newValue: [
                            `Order: ${job.orderNr}`,
                            `Blz: ${job.pages}`,
                            `Netto: ${job.netRun}`
                        ].join('|||'),
                        user: user?.username || 'System',
                        press: user?.press
                    });
                } else {
                    await pb.collection('drukwerken').update(job.id, pbData);
                    // Log update
                    await addActivityLog({
                        action: 'Updated',
                        entity: 'FinishedJob',
                        entityId: job.id,
                        entityName: `${job.orderNr} - ${job.orderName}`,
                        details: `Bulk bewerking: Drukwerk bijgewerkt (${job.orderNr})`,
                        newValue: [
                            `Order: ${job.orderNr}`,
                            `Blz: ${job.pages}`,
                            `Netto: ${job.netRun}`
                        ].join('|||'),
                        user: user?.username || 'System',
                        press: user?.press
                    });
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
        const pressName = job.pressName || effectivePress;
        const pressId = job.pressId || (job.pressName ? pressMap[job.pressName] : pressMap[effectivePress]);
        const divider = outputConversions[pressId]?.[String(job.exOmw)] || 1;

        // Formula evaluation using raw exOmw (returns undivided Actual Units)
        const maxGrossVal = getFormulaForColumn('maxGross')
            ? Number(evaluateFormula(getFormulaForColumn('maxGross')!.formula,
                { ...job, pressName, pressId }, // Use original scaled exOmw for formula "like before"
                parameters, activePresses))
            : (Number(job.maxGross) || 0) * divider;

        // Scale inputs for Delta calculation
        const greenActual = (Number(job.green) || 0) * divider;
        const redActual = (Number(job.red) || 0) * divider;

        const jobForDelta = { ...job, pressName, pressId, maxGross: maxGrossVal, green: greenActual, red: redActual };

        const delta_numberVal = getFormulaForColumn('delta_number')
            ? Number(evaluateFormula(getFormulaForColumn('delta_number')!.formula, jobForDelta, parameters, activePresses))
            : (maxGrossVal - (greenActual + redActual));

        const delta_percentageVal = (() => {
            const f = getFormulaForColumn('delta_percentage');
            if (f) {
                return Number(evaluateFormula(f.formula, { ...jobForDelta, delta_number: delta_numberVal }, parameters, activePresses));
            }
            if (maxGrossVal > 0) return delta_numberVal / maxGrossVal;
            return 0;
        })();

        return {
            ...job,
            maxGross: maxGrossVal,         // Actual Units (UNDIVIDED)
            green: (Number(job.green) || 0), // Keep as machine input for UI
            red: (Number(job.red) || 0),     // Keep as machine input for UI
            delta: delta_numberVal,       // Actual Units (UNDIVIDED)
            delta_number: delta_numberVal,
            delta_percentage: delta_percentageVal,
            performance: `${formatNumber(delta_percentageVal * 100, 2)}%`
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

    const confirmDelete = async () => {
        if (!deleteAction) return;

        if (deleteAction.type === 'werkorder') {
            handleDeleteWerkorder(deleteAction.id);
        } else if (deleteAction.type === 'katern' && deleteAction.secondaryId) {
            // Check if it's the last katern to delete the whole order
            const order = werkorders.find(wo => wo.id === deleteAction.id);
            if (order && order.katernen.length <= 1) {
                handleDeleteWerkorder(deleteAction.id);
            } else {
                setWerkorders(prev => prev.map(wo => {
                    if (wo.id === deleteAction.id) {
                        return {
                            ...wo,
                            katernen: wo.katernen.filter(k => k.id !== deleteAction.secondaryId)
                        };
                    }
                    return wo;
                }));
            }
        } else if (deleteAction.type === 'job') {
            try {
                await pb.collection('drukwerken').delete(deleteAction.id);
                // Log deletion
                await addActivityLog({
                    action: 'Deleted',
                    entity: 'FinishedJob',
                    entityId: deleteAction.id,
                    entityName: deleteAction.id,
                    details: `Drukwerk verwijderd via lijst`,
                    oldValue: `ID: ${deleteAction.id}`,
                    user: user?.username || 'System',
                    press: user?.press
                });

                toast.success("Drukwerk verwijderd.");
                if (user) drukwerkenCache.checkForUpdates(user, hasPermission);
                fetchCalculatedFields();
            } catch (error) {
                console.error("Error deleting job:", error);
                toast.error("Fout bij verwijderen drukwerk.\n" + error);
            }
        }
        setDeleteAction(null);
    };

    const requestDeleteWerkorder = (id: string, isFullOrder = false) => {
        setDeleteAction({ type: 'werkorder', id });
        setDeleteMessage({
            title: "Werkorder verwijderen",
            description: isFullOrder
                ? "Dit is de laatste versie in deze order. Wilt u de volledige werkorder verwijderen?"
                : "Weet je zeker dat je deze gehele werkorder wilt verwijderen?"
        });
        setDeleteModalOpen(true);
    };

    const requestDeleteKatern = (werkorderId: string, katernId: string) => {
        const order = werkorders.find(wo => wo.id === werkorderId);
        if (order && order.katernen.length <= 1) {
            requestDeleteWerkorder(werkorderId, true);
            return;
        }

        setDeleteAction({ type: 'katern', id: werkorderId, secondaryId: katernId });
        setDeleteMessage({
            title: "Versie verwijderen",
            description: "Weet je zeker dat je deze versie (katern) wilt verwijderen?"
        });
        setDeleteModalOpen(true);
    };

    const requestDeleteJob = (jobId: string) => {
        setDeleteAction({ type: 'job', id: jobId });
        setDeleteMessage({
            title: "Drukwerk verwijderen",
            description: "Weet u zeker dat u dit drukwerk wilt verwijderen?"
        });
        setDeleteModalOpen(true);
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

                            {(user?.role?.toLowerCase() === 'admin' || user?.role?.toLowerCase() === 'meestergast') && (
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

                            {(user?.role?.toLowerCase() === 'admin' || user?.role?.toLowerCase() === 'meestergast') && (
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
                                                        <div className={`flex items-center border rounded-md px-2 bg-white h-9 transition-all ${validationErrors[wo.id]?.orderNr ? 'border-red-500 ring-1 ring-red-500 shadow-[0_0_0_2px_rgba(239,68,68,0.2)]' : 'border-gray-200'}`} style={{ width: '85px' }}>
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
                                                            <Input
                                                                value={wo.orderName}
                                                                onChange={(e) => handleWerkorderChange(wo.id, 'orderName', e.target.value)}
                                                                className={`w-full bg-white transition-all ${validationErrors[wo.id]?.orderName ? 'border-red-500 ring-1 ring-red-500 shadow-[0_0_0_2px_rgba(239,68,68,0.2)]' : 'border-gray-200'}`}
                                                            />
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-9 w-9 p-0 hover:bg-red-100 text-red-500"
                                                                onClick={() => {
                                                                    requestDeleteWerkorder(wo.id);
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

                                                        const divider = outputConversions[pressMap[effectivePress]]?.[String(katern.exOmw)] || 1;
                                                        const jobWithCalculatedMaxGross = {
                                                            ...jobWithOrderInfo,
                                                            maxGross: maxGrossVal,
                                                            green: (Number(katern.green) || 0) * divider,
                                                            red: (Number(katern.red) || 0) * divider
                                                        };
                                                        return (
                                                            <TableRow key={katern.id} className="hover:bg-blue-50/70 [&>td]:hover:bg-blue-50/70 transition-colors group">
                                                                <TableCell>
                                                                    <Input value={katern.version} onChange={(e) => handleKaternChange(wo.id, katern.id, 'version', e.target.value)} className="h-9 px-2 bg-white border-gray-200" />
                                                                </TableCell>
                                                                <TableCell className="text-right">
                                                                    <FormattedNumberInput value={katern.pages} onChange={(val) => handleKaternChange(wo.id, katern.id, 'pages', val)} className="h-9 px-2 bg-white border-gray-200 text-right" />
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Select
                                                                        value={String(katern.exOmw || '1')}
                                                                        onValueChange={(val) => handleKaternChange(wo.id, katern.id, 'exOmw', val)}
                                                                    >
                                                                        <SelectTrigger className="h-9 px-2 bg-white border-gray-200 text-center">
                                                                            <SelectValue placeholder="Deler" />
                                                                        </SelectTrigger>
                                                                        <SelectContent>
                                                                            {(() => {
                                                                                const pressId = pressMap[effectivePress] || '';
                                                                                const pressExOmwKeys = Object.keys(outputConversions[pressId] || {}).sort((a, b) => Number(a) - Number(b));
                                                                                // Fallback to 1,2,4 only when no conversions configured at all
                                                                                const options = pressExOmwKeys.length > 0 ? pressExOmwKeys : ['1', '2', '4'];
                                                                                return options.map(val => (
                                                                                    <SelectItem key={val} value={val}>{val}</SelectItem>
                                                                                ));
                                                                            })()}
                                                                        </SelectContent>
                                                                    </Select>
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
                                                                            variant="maxGross"
                                                                            parameters={parameters}
                                                                            activePresses={activePresses}
                                                                            result={maxGrossVal}
                                                                            outputConversions={outputConversions}
                                                                            pressMap={pressMap}
                                                                        />
                                                                        {showComparison && (
                                                                            <div className="text-[10px] text-gray-400 border-t mt-1 pt-0.5 w-full text-center">
                                                                                Rec: {formatNumber(katern.maxGross)}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell className="text-right">
                                                                    <div className="flex flex-col items-end">
                                                                        <FormattedNumberInput value={katern.green} onChange={(val) => handleKaternChange(wo.id, katern.id, 'green', val)} className="h-9 px-2 bg-white border-gray-200 text-right" />
                                                                        {divider > 1 && (
                                                                            <div className="min-h-[12px] mb-1 flex items-center pr-2">
                                                                                <span className="text-[9px] text-gray-900 font-medium leading-none">
                                                                                    {((Number(katern.green) || 0) * divider).toLocaleString('nl-BE')}
                                                                                </span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell className="text-right border-r border-black">
                                                                    <div className="flex flex-col items-end">
                                                                        <FormattedNumberInput value={katern.red} onChange={(val) => handleKaternChange(wo.id, katern.id, 'red', val)} className="h-9 px-2 bg-white border-gray-200 text-right" />
                                                                        {divider > 1 && (
                                                                            <div className="min-h-[12px] mb-1 flex items-center pr-2">
                                                                                <span className="text-[9px] text-gray-900 font-medium leading-none">
                                                                                    {((Number(katern.red) || 0) * divider).toLocaleString('nl-BE')}
                                                                                </span>
                                                                            </div>
                                                                        )}
                                                                    </div>
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
                                                                        onClick={() => requestDeleteKatern(wo.id, katern.id)}
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
                                    key={Object.keys(outputConversions).length > 0 ? 'loaded' : 'loading'}
                                    style={{ height: 'calc(100vh - 220px)', minWidth: '1600px' }}
                                    data={sortedJobs}
                                    context={{ outputConversions, pressMap }}
                                    fixedHeaderContent={() => (
                                        <>
                                            <TableRow className="border-b-0 bg-white h-10">
                                                {(user?.role?.toLowerCase() === 'admin' || user?.role?.toLowerCase() === 'meestergast') && <TableHead style={{ width: COL_WIDTHS.press }} className="bg-white"></TableHead>}
                                                <TableHead colSpan={6} className="text-center bg-blue-100 border-r border-black">Data</TableHead>
                                                <TableHead colSpan={6} className="text-center bg-green-100 border-r border-black">Wissels</TableHead>
                                                <TableHead colSpan={3} className="text-center bg-yellow-100 border-r border-black">Berekening</TableHead>
                                                <TableHead colSpan={2} className="text-center bg-purple-100 border-r border-black">Prestatie</TableHead>
                                                <TableHead style={{ width: COL_WIDTHS.actions }} className="border-r border-black bg-white"></TableHead>
                                            </TableRow>
                                            <TableRow className="border-b border-black bg-white shadow-sm h-10">
                                                {(user?.role?.toLowerCase() === 'admin' || user?.role?.toLowerCase() === 'meestergast') && <TableHead style={{ width: COL_WIDTHS.press }} className="text-center bg-gray-100 border-r">Pers</TableHead>}
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
                                            {(user?.role?.toLowerCase() === 'admin' || user?.role?.toLowerCase() === 'meestergast') && (
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
                                                {(() => {
                                                    const pressId = pressMap[job.pressName || ''] || '';
                                                    const divider = outputConversions[pressId]?.[String(job.exOmw)] || 1;
                                                    const formula = getFormulaForColumn('maxGross');
                                                    const showSub = divider > 1 && !!formula;
                                                    return (
                                                        <div className={`flex flex-col items-end min-h-[36px] ${showSub ? 'justify-end' : 'justify-center'}`}>
                                                            {showSub && (() => {
                                                                const raw = evaluateFormula(formula!.formula, job as any, parameters, activePresses);
                                                                const cycles = (Number(raw) || 0) / divider;
                                                                return (
                                                                    <div className="flex items-center mb-0.5">
                                                                        <span className="text-[9px] text-gray-400 leading-none">{formatNumber(cycles, 0)} berekend</span>
                                                                    </div>
                                                                );
                                                            })()}
                                                            <div className="flex items-center py-1">
                                                                <span className="font-bold leading-none">{formatNumber(job.maxGross, 0)}</span>
                                                            </div>
                                                            {showComparison && (
                                                                <div className="text-[10px] text-gray-400 border-t mt-1 pt-0.5 w-full text-center">
                                                                    Rec: {formatNumber(job.maxGross, 0)}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })()}
                                            </TableCell>
                                            <TableCell className="py-1 px-1 text-right">
                                                {(() => {
                                                    const pressId = pressMap[job.pressName || ''] || '';
                                                    const divider = outputConversions[pressId]?.[String(job.exOmw)] || 1;
                                                    const units = Number(job.green) || 0;
                                                    const cycles = units / divider;
                                                    return (
                                                        <div className={`flex flex-col items-end min-h-[36px] ${divider > 1 ? 'justify-end' : 'justify-center'}`}>
                                                            {divider > 1 && (
                                                                <div className="flex items-center mb-0.5">
                                                                    <span className="text-[9px] text-gray-400 leading-none">{formatNumber(cycles)} ingegeven</span>
                                                                </div>
                                                            )}
                                                            <div className="flex items-center py-1">
                                                                <span className="font-bold leading-none">{formatNumber(units)}</span>
                                                            </div>
                                                        </div>
                                                    );
                                                })()}
                                            </TableCell>
                                            <TableCell className="py-1 px-1 text-right border-r border-black">
                                                {(() => {
                                                    const pressId = pressMap[job.pressName || ''] || '';
                                                    const divider = outputConversions[pressId]?.[String(job.exOmw)] || 1;
                                                    const units = Number(job.red) || 0;
                                                    const cycles = units / divider;
                                                    return (
                                                        <div className={`flex flex-col items-end min-h-[36px] ${divider > 1 ? 'justify-end' : 'justify-center'}`}>
                                                            {divider > 1 && (
                                                                <div className="flex items-center mb-0.5">
                                                                    <span className="text-[9px] text-gray-400 leading-none">{formatNumber(cycles)} ingegeven</span>
                                                                </div>
                                                            )}
                                                            <div className="flex items-center py-1">
                                                                <span className="font-bold leading-none">{formatNumber(units)}</span>
                                                            </div>
                                                        </div>
                                                    );
                                                })()}
                                            </TableCell>
                                            <TableCell className="text-right py-1 px-1">
                                                {(() => {
                                                    const pressId = pressMap[job.pressName || ''] || '';
                                                    const divider = outputConversions[pressId]?.[String(job.exOmw)] || 1;
                                                    const formula = getFormulaForColumn('delta_number');
                                                    return (
                                                        <div className={`flex flex-col items-end min-h-[36px] ${divider > 1 ? 'justify-end' : 'justify-center'}`}>
                                                            {formula
                                                                ? <FormulaResultWithTooltip formula={formula.formula} job={job} parameters={parameters} activePresses={activePresses} variant="delta" outputConversions={outputConversions} pressMap={pressMap} />
                                                                : <span className="py-1">{formatNumber(job.delta_number, 0)}</span>
                                                            }
                                                        </div>
                                                    );
                                                })()}
                                            </TableCell>
                                            <TableCell className="text-right py-1 px-1 border-r border-black">
                                                {(() => {
                                                    const pressId = pressMap[job.pressName || ''] || '';
                                                    const divider = outputConversions[pressId]?.[String(job.exOmw)] || 1;
                                                    const formula = getFormulaForColumn('delta_percentage');

                                                    const correctedJob = { ...job, exOmw: String(Number(job.exOmw || 1) / divider) };

                                                    const result = formula
                                                        ? evaluateFormula(formula.formula, correctedJob, parameters, activePresses)
                                                        : job.delta_percentage;

                                                    const percentageValue = typeof result === 'number'
                                                        ? result
                                                        : parseFloat((result as string || '0').replace(/\./g, '').replace(',', '.'));

                                                    return (
                                                        <div className={`flex flex-col items-end min-h-[36px] ${divider > 1 ? 'justify-end' : 'justify-center'}`}>
                                                            <span className="py-1">
                                                                {percentageValue !== undefined ? `${formatNumber(percentageValue * 100, 2)}%` : '-'}
                                                            </span>
                                                        </div>
                                                    );
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
                                                                    <Button size="icon" variant="ghost" className="h-6 w-6 hover:bg-red-100 text-red-500" onClick={() => requestDeleteJob(job.id)}>
                                                                        <Trash2 className="w-3 h-3" />
                                                                    </Button>
                                                                )}
                                                            </>
                                                        );
                                                    })()}
                                                </div>
                                            </TableCell>
                                        </>
                                    )
                                    }
                                    components={{
                                        Table: ({ style, ...props }: any) => (
                                            <table
                                                {...props}
                                                style={{ ...style, minWidth: '1600px', borderCollapse: 'collapse' }}
                                                className={`table-fixed w-full ${FONT_SIZES.body}`}
                                            >
                                                <colgroup>
                                                    {(user?.role?.toLowerCase() === 'admin' || user?.role?.toLowerCase() === 'meestergast') && <col style={{ width: COL_WIDTHS.press }} />}
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
                    outputConversions={outputConversions}
                    pressMap={pressMap}
                />
            )}

            <ConfirmationModal
                open={deleteModalOpen}
                onOpenChange={setDeleteModalOpen}
                onConfirm={confirmDelete}
                title={deleteMessage.title}
                description={deleteMessage.description}
                confirmText="Verwijderen"
                variant="destructive"
            />
        </TooltipProvider>
    );
}

export default Drukwerken;