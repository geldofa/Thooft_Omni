import { useState, useCallback, useEffect, useMemo } from 'react';
import { DrukwerkRow } from './DrukwerkRow';
import { useParams, useNavigate } from 'react-router-dom';
import { PressType, useAuth, pb } from './AuthContext';
import { drukwerkenCache, CacheStatus, readLockedCache, writeLockedCache, addToLockedCache, removeFromLockedCache, db } from '../services/DrukwerkenCache';
import { Card, CardContent } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'; // Added useEffect

import { toast } from 'sonner';
// import { pillListClass, pillTriggerClass } from '../styles/TabStyles';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Check, Edit, Trash2, Database, RefreshCw, X, Search, Wrench, Plus, ArrowUp, ArrowDown, CornerDownRight } from 'lucide-react';
import { cn } from './ui/utils';
import { TableVirtuoso } from 'react-virtuoso';
import { formatNumber } from '../utils/formatNumber';
import { format, differenceInDays } from 'date-fns';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from './ui/tooltip';


import { AddFinishedJobDialog } from './dialogs/AddFinishedJobDialog';
import { ConfirmationModal } from './ui/ConfirmationModal';
import {
    evaluateFormula,
    Katern,
    FinishedPrintJob,
    CalculatedField
} from '../utils/drukwerken-utils';
import { formatDisplayDate } from '../utils/dateUtils';

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
    date: '70px',
    orderNr: '45px',
    orderName: '220px',
    pages: '30px',
    exOmw: '40px',
    netRun: '55px',
    startup: '30px',
    c4_4: '25px',
    c4_0: '25px',
    c1_0: '25px',
    c1_1: '25px',
    c4_1: '25px',
    maxGross: '50px',
    green: '50px',
    red: '50px',
    delta: '45px',
    deltaPercent: '45px',
    actions: '30px'
};

const FONT_SIZES = {
    title: 'text-2xl',      // Main report titles
    section: 'text-lg',    // Category headers
    body: 'text-sm',       // Table rows and general text
    label: 'text-xs',      // Small subtext
};


// Component to render formula result with tooltip
export const FormulaResultWithTooltip = ({
    formula,
    job,
    decimals = 0,
    parameters,
    activePresses,
    result: propResult,
    variant = 'default',
    outputConversions = {},
    pressMap = {},
    suffix = '',
    prefix = '',
    hideTooltip = false,
    bold = false
}: {
    formula: string;
    job: FinishedPrintJob | Omit<FinishedPrintJob, 'id'> | Katern;
    decimals?: number;
    parameters: Record<string, Record<string, any>>;
    activePresses: string[];
    result?: number | string;
    variant?: 'maxGross' | 'delta' | 'default';
    outputConversions?: Record<string, Record<string, number>>;
    pressMap?: Record<string, string>;
    prefix?: string;
    suffix?: string;
    hideTooltip?: boolean;
    bold?: boolean;
}) => {
    const pressName = (job as any).pressName || (activePresses.length > 0 ? activePresses[0] : '');
    const pressId = pressMap[pressName] || '';
    const divider = outputConversions[pressId]?.[(job as any).exOmw] || 1;

    // VIZ STANDARD: DB stores cycles, but formulas expect units.
    // Scale the job fields to Total Units for consistent evaluation.
    const scaledJob = {
        ...job,
        green: (Number((job as any).green) || 0) * divider,
        red: (Number((job as any).red) || 0) * divider
    };

    // Re-evaluate or use passed result (which we now assume is Total Units)
    const rawResult = propResult !== undefined
        ? propResult
        : evaluateFormula(formula, scaledJob as any, parameters, activePresses);

    const numericRawResult = Number(rawResult) || 0;

    // VIZ STANDARD: Bold = Total Units (Absolute), Small = Cycles (Result / Divider)
    // Both maxGross and delta are already stored/calculated as Total Units.
    const totalUnits = numericRawResult;
    const machineCycles = numericRawResult / divider;

    const formattedTotal = `${prefix}${formatNumber(totalUnits, decimals)}${suffix}`;
    const formattedCycles = `${prefix}${formatNumber(machineCycles, decimals)}`;

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
            const greenCycles = Number((job as any).green || 0);
            const redCycles = Number((job as any).red || 0);
            const maxGross = Number((job as any).maxGross || 0);

            // Scale inputs to Total Units for the absolute Delta breakdown
            const greenActual = greenCycles * divider;
            const redActual = redCycles * divider;

            if (greenCycles !== 0) {
                parts.push({
                    label: "Groen",
                    formula: "Groen",
                    breakdown: formatNumber(greenActual),
                    value: greenActual,
                    operator: '+'
                });
            }
            if (redCycles !== 0) {
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

        if (parts.length === 0) return <span>{formattedTotal}</span>;

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
        <div className="flex flex-col items-end">
            {variant === 'maxGross' && divider > 1 && (
                <div className="flex items-center mb-0.5">
                    <span className="text-[9px] text-gray-400 leading-none">{formattedCycles} berekend</span>
                </div>
            )}
            {hideTooltip ? (
                <span className={cn(
                    "whitespace-nowrap leading-none py-1",
                    bold ? "font-bold" : "font-normal"
                )}>
                    {formattedTotal}
                </span>
            ) : (
                <Tooltip delayDuration={300}>
                    <TooltipTrigger asChild>
                        <span className={cn(
                            "cursor-help border-b border-dashed border-gray-400 whitespace-nowrap leading-none py-1",
                            bold ? "font-bold" : "font-normal"
                        )}>
                            {formattedTotal}
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
                                    <span className="text-sm font-black text-gray-900">{numericRawResult.toLocaleString('nl-BE')}{suffix}</span>
                                </div>
                            )}
                        </div>
                    </TooltipContent>
                </Tooltip>
            )}
        </div>
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
    const activeTab = (() => {
        const lower = subtab?.toLowerCase();
        if (lower === 'gedrukt') return 'Gedrukt';
        if (lower === 'prullenbak') return 'Prullenbak';
        return 'Nieuw';
    })() as 'Gedrukt' | 'Nieuw' | 'Prullenbak';


    const [isAddJobDialogOpen, setIsAddJobDialogOpen] = useState(false);
    const [editingJobs, setEditingJobs] = useState<FinishedPrintJob[]>([]);

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
            formula: '(green + red - maxGross) / maxGross',
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
        exOmw: '1',
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

    // --- Locked Katernen Browser Cache Handled by DrukwerkenCache ---

    const [werkorders, setWerkorders] = useState<Werkorder[]>(() => {
        const stored = localStorage.getItem('thooft_werkorders');
        let orders: Werkorder[] | null = null;
        if (stored) {
            try {
                orders = JSON.parse(stored);
            } catch (e) {
                console.error("Failed to parse stored werkorders:", e);
            }
        }

        if (!orders) {
            orders = [
                {
                    id: '1',
                    orderNr: '',
                    orderName: '',
                    orderDate: new Date().toISOString().split('T')[0],
                    katernen: [
                        { id: '1-1', version: '', pages: null, exOmw: '', netRun: null, startup: true, c4_4: 0, c4_0: 0, c1_0: 0, c1_1: 0, c4_1: 0, maxGross: 0, green: null, red: null, delta: 0, deltaPercentage: 0 }
                    ]
                }
            ];
        }

        // Reconcile locked state from the dedicated locked cache
        const lockedSet = readLockedCache();
        if (lockedSet.size > 0) {
            orders = orders.map(wo => ({
                ...wo,
                katernen: wo.katernen.map(k => {
                    const shouldBeLocked = lockedSet.has(k.id) || (k.originalId && lockedSet.has(k.originalId));
                    if (shouldBeLocked && (!k.locked || !k.is_finished)) {
                        console.log(`[Drukwerken] Restoring locked state for katern ${k.id} (originalId: ${k.originalId})`);
                        return { ...k, locked: true, is_finished: true };
                    }
                    return k;
                })
            }));
        }

        return orders;
    });

    // Stable sync function to avoid duplication
    const syncToLocalStorage = useCallback((orders: Werkorder[]) => {
        localStorage.setItem('thooft_werkorders', JSON.stringify(orders));

        // Rebuild the locked cache
        const lockedIds = new Set<string>();
        orders.forEach(wo => {
            wo.katernen.forEach(k => {
                if (k.locked && k.is_finished) {
                    lockedIds.add(k.id);
                    if (k.originalId) lockedIds.add(k.originalId);
                }
            });
        });
        writeLockedCache(lockedIds);
    }, []);

    // Also keep the effect for any other state changes, but handlers will now be more aggressive
    useEffect(() => {
        syncToLocalStorage(werkorders);
    }, [werkorders, syncToLocalStorage]);

    // --- RECONCILIATION ---
    // If we have "orphaned" drafts (katernen without an originalId), 
    // check if they already exist in the local cache (Dexie).
    // This happens if a save finished after the component unmounted previously.
    useEffect(() => {
        const reconcile = async () => {
            let needsUpdate = false;
            const nextWerkorders = await Promise.all(werkorders.map(async (wo) => {
                const nextKaternen = await Promise.all(wo.katernen.map(async (k) => {
                    if (!k.originalId && wo.orderNr && k.version) {
                        try {
                            const cachedJobs = await db.jobs
                                .where('[orderNr+version]')
                                .equals([wo.orderNr, k.version])
                                .toArray();

                            // Find the most recent one that matches the order date
                            const match = cachedJobs.find((j: FinishedPrintJob) => j.date === wo.orderDate || !j.date);
                            if (match) {
                                console.log(`[Drukwerken] Reconciled draft ${k.id} with cached record ${match.id}`);
                                needsUpdate = true;
                                return {
                                    ...k,
                                    originalId: match.id,
                                    locked: match.locked || k.locked,
                                    is_finished: match.is_finished || k.is_finished,
                                    dbGreen: match.green,
                                    dbRed: match.red,
                                    voltooid_op: match.voltooid_op
                                };
                            }
                        } catch (e) {
                            console.error("[Drukwerken] Reconciliation failed for katern", k.id, e);
                        }
                    }
                    return k;
                }));
                return { ...wo, katernen: nextKaternen };
            }));

            if (needsUpdate) {
                setWerkorders(nextWerkorders);
            }
        };

        // Only run if there are any katernen without IDs
        const hasOrphans = werkorders.some(wo => wo.katernen.some(k => !k.originalId));
        if (hasOrphans) {
            reconcile();
        }
    }, [werkorders]); // Dependencies: werkorders. We use hasOrphans and needsUpdate to prevent loops.


    const handleAddKaternClick = (werkorderId: string) => {
        handleKaternSubmit(defaultKaternToAdd, werkorderId);
    };

    const handleKaternSubmit = useCallback((katernData: Omit<Katern, 'id'>, werkorderId: string) => {
        setWerkorders(prev => {
            const next = prev.map(wo => {
                if (wo.id === werkorderId) {
                    const newKatern = { ...katernData, id: `${wo.id}-${wo.katernen.length + 1}` };
                    return { ...wo, katernen: [...wo.katernen, newKatern] };
                }
                return wo;
            });
            syncToLocalStorage(next);
            return next;
        });
    }, [syncToLocalStorage]);

    const defaultKatern: Katern = {
        id: 'new-katern-1', // Temporary ID, will be replaced with `${ newWerkorder.id } -1`
        version: '',
        pages: null,
        exOmw: '1',
        netRun: null,
        startup: true,
        c4_4: null,
        c4_0: null,
        c1_0: null,
        c1_1: null,
        c4_1: null,
        maxGross: null,
        green: null,
        red: null,
        delta: null,
        deltaPercentage: null,
    };

    const handleWerkorderSubmit = useCallback((werkorderData: Omit<Werkorder, 'id' | 'katernen'>) => {
        const newWerkorderId = Date.now().toString();
        const newKaternWithId: Katern = {
            ...defaultKatern,
            id: `${newWerkorderId}-1`,
        };

        const newWerkorder: Werkorder = {
            ...werkorderData,
            id: newWerkorderId,
            katernen: [newKaternWithId],
        };
        setWerkorders(prev => {
            const next = [newWerkorder, ...prev];
            syncToLocalStorage(next);
            return next;
        });
    }, [defaultKatern, syncToLocalStorage]);

    const handleKaternChange = useCallback((werkorderId: string, katernId: string, field: keyof Katern, value: any) => {
        // Immediately update the locked cache when lock state changes
        if (field === 'locked') {
            const wo = werkorders.find(w => w.id === werkorderId);
            const katern = wo?.katernen.find(k => k.id === katernId);
            if (value) {
                addToLockedCache(katernId, katern?.originalId);
            } else {
                removeFromLockedCache(katernId, katern?.originalId);
            }
        }

        setWerkorders(prevWerkorders => {
            const next = prevWerkorders.map(wo => {
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
            });
            syncToLocalStorage(next);
            return next;
        });
    }, [werkorders, addToLockedCache, removeFromLockedCache, syncToLocalStorage]);

    const handleAutoSaved = useCallback((werkorderId: string, katernId: string, pbRecordId: string, savedGreen: number | null, savedRed: number | null, voltooid_op: string | null) => {
        setWerkorders(prev => {
            const next = prev.map(wo => {
                if (wo.id === werkorderId) {
                    return {
                        ...wo,
                        katernen: wo.katernen.map(k => {
                            if (k.id === katernId) {
                                return { ...k, originalId: pbRecordId, dbGreen: savedGreen, dbRed: savedRed, voltooid_op };
                            }
                            return k;
                        })
                    };
                }
                return wo;
            });
            syncToLocalStorage(next);
            return next;
        });
    }, [syncToLocalStorage]);

    const handleWerkorderChange = useCallback((werkorderId: string, field: 'orderNr' | 'orderName', value: string) => {
        setWerkorders(prevWerkorders => {
            const next = prevWerkorders.map(wo => {
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
            });
            syncToLocalStorage(next);
            return next;
        });

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
    }, [syncToLocalStorage, validationErrors]);

    const handleDeleteWerkorder = async (werkorderId: string) => {
        const order = werkorders.find(wo => wo.id === werkorderId);
        if (order) {
            // Delete all autosaved katernen from DB
            for (const katern of order.katernen) {
                if (katern.originalId) {
                    try {
                        await archiveAndDeleteJobById(katern.originalId, `Order verwijderd uit Geplande Orders: ${order.orderNr} - ${order.orderName}`);
                    } catch (e) {
                        console.error(`Failed to delete katern ${katern.id} from DB`, e);
                    }
                }
            }
        }

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
                                { id: Date.now().toString() + '-1', version: '', pages: null, exOmw: '', netRun: 0, startup: true, c4_4: 0, c4_0: 0, c1_0: 0, c1_1: 0, c4_1: 0, maxGross: 0, green: null, red: null, delta: 0, deltaPercentage: 0 }
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

        // Validate all katernen have pages and netRun > 0
        const invalidKatern = werkorder.katernen.find(k => (k.pages || 0) <= 0 || (k.netRun || 0) <= 0);
        if (invalidKatern) {
            toast.error(`Pagina's en Oplage moeten groter zijn dan 0 voor alle versies.`);
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
                const pressId = effectivePressId;
                const divider = outputConversions[pressId]?.[String(katern.exOmw)] || 1;
                // The formula evaluation expects raw exOmw, and returns undivided actual units.
                // The green/red inputs are machine cycles, so they need to be scaled to actual units for delta calculation.

                const jobForCalculations = {
                    ...katern,
                    orderNr: werkorder.orderNr,
                    orderName: werkorder.orderName,
                    date: formattedDate,
                    datum: formattedDatum,
                    pressName: effectivePress,
                    pressId: pressId
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
                    : ((Number(greenActual) + Number(redActual)) - Number(maxGrossVal));

                return {
                    ...katern,
                    maxGross: Number(maxGrossVal),
                    green: Number(katern.green) || 0, // Store RAW Machine Cycles in DB
                    red: Number(katern.red) || 0,     // Store RAW Machine Cycles in DB
                    delta: Number(deltaVal),
                    deltaPercentage: (() => {
                        const f = getFormulaForColumn('delta_percentage');
                        if (f) {
                            const res = evaluateFormula(f.formula, { ...jobWithMaxGrossAndScaledGreenRed, delta_number: Number(deltaVal) || 0 }, parameters, activePresses);
                            return typeof res === 'number' ? res : Number(String(res).replace(/\./g, '').replace(',', '.'));
                        }
                        if (maxGrossVal > 0) return (Number(deltaVal) || 0) / maxGrossVal;
                        return 0;
                    })(),
                    pressId,
                    pressName: effectivePress
                } as any;
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
                    ex_omw: parseFloat(processedKatern.exOmw) || 1,
                    netto_oplage: processedKatern.netRun,
                    opstart: processedKatern.startup,
                    k_4_4: processedKatern.c4_4,
                    k_4_0: processedKatern.c4_0,
                    k_1_0: processedKatern.c1_0,
                    k_1_1: processedKatern.c1_1,
                    k_4_1: processedKatern.c4_1,
                    max_bruto: Math.round(processedKatern.maxGross as number),
                    groen: (processedKatern.green as number) || 0,
                    rood: (processedKatern.red as number) || 0,
                    delta: Math.round(processedKatern.delta as number),
                    delta_percent: (processedKatern.deltaPercentage as number) || 0,
                    pers: processedKatern.pressId || effectivePressId,
                    status: 'check',
                    opmerking: processedKatern.opmerking || '',
                    voltooid_op: processedKatern.voltooid_op || ((Number(processedKatern.green) + Number(processedKatern.red) > 0) ? new Date().toISOString() : null)
                };

                let record;
                if (processedKatern.originalId) {
                    record = await pb.collection('drukwerken').update(processedKatern.originalId, pbData);

                    // Fetch old record for diffing
                    const oldRecord = await pb.collection('drukwerken').getOne(processedKatern.originalId);

                    await addActivityLog({
                        action: 'Updated',
                        entity: 'FinishedJob',
                        entityId: record.id,
                        entityName: `${werkorder.orderNr} - ${werkorder.orderName}`,
                        details: `Drukwerk hervat en bijgewerkt: ${werkorder.orderNr} (Versie: ${processedKatern.version || '-'})`,
                        oldValue: [
                            `Order: ${oldRecord.order_nummer}`,
                            `Naam: ${oldRecord.klant_order_beschrijving}`,
                            `Versie: ${oldRecord.versie || '-'}`,
                            `Blz: ${oldRecord.blz}`,
                            `Ex/Omw: ${oldRecord.ex_omw}`,
                            `Netto: ${oldRecord.netto_oplage}`,
                            `Groen: ${oldRecord.groen}`,
                            `Rood: ${oldRecord.rood}`,
                            `Delta: ${oldRecord.delta}`,
                            `Delta %: ${oldRecord.delta_percent}%`
                        ].join('|||'),
                        newValue: [
                            `Order: ${pbData.order_nummer}`,
                            `Naam: ${pbData.klant_order_beschrijving}`,
                            `Versie: ${pbData.versie || '-'}`,
                            `Blz: ${pbData.blz}`,
                            `Ex/Omw: ${pbData.ex_omw}`,
                            `Netto: ${pbData.netto_oplage}`,
                            `Groen: ${pbData.groen}`,
                            `Rood: ${pbData.rood}`,
                            `Delta: ${pbData.delta}`,
                            `Delta %: ${pbData.delta_percent}%`
                        ].join('|||'),
                        user: user?.username || 'System',
                        press: user?.press
                    });
                } else {
                    record = await pb.collection('drukwerken').create(pbData);
                    await addActivityLog({
                        action: 'Created',
                        entity: 'FinishedJob',
                        entityId: record.id,
                        entityName: `${werkorder.orderNr} - ${werkorder.orderName}`,
                        details: `Drukwerk afgepunt: ${werkorder.orderNr} (Versie: ${processedKatern.version || '-'})`,
                        newValue: [
                            `Order: ${pbData.order_nummer}`,
                            `Naam: ${pbData.klant_order_beschrijving}`,
                            `Versie: ${pbData.versie || '-'}`,
                            `Blz: ${pbData.blz}`,
                            `Ex/Omw: ${pbData.ex_omw}`,
                            `Netto: ${pbData.netto_oplage}`,
                            `Groen: ${pbData.groen}`,
                            `Rood: ${pbData.rood}`,
                            `Delta: ${pbData.delta}`,
                            `Delta %: ${pbData.delta_percent}%`
                        ].join('|||'),
                        user: user?.username || 'System',
                        press: user?.press
                    });
                }

                await drukwerkenCache.putRecord(record, user, hasPermission);
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
                                { id: Date.now().toString() + '-1', version: '', pages: null, exOmw: '', netRun: 0, startup: true, c4_4: 0, c4_0: 0, c1_0: 0, c1_1: 0, c4_1: 0, maxGross: 0, green: null, red: null, delta: 0, deltaPercentage: 0 }
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
                        console.log(`[Drukwerken] Found params for ${pressName} (ID: ${pressId})`, record);
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

    const [weekFilter, setWeekFilter] = useState('all');
    const [monthFilter, setMonthFilter] = useState('all');

    useEffect(() => {
        if (typeof sessionStorage !== 'undefined') sessionStorage.setItem('drukwerken_pressFilter', pressFilter);
    }, [pressFilter]);

    // Reset week/month filters when year filter changes
    useEffect(() => {
        setWeekFilter('all');
        setMonthFilter('all');
    }, [yearFilter]);

    const effectivePress = useMemo(() => {
        // For press users, use their assigned press name
        if (user?.role === 'press' && user.press) return user.press;
        // For others, use the filter or the first active press
        if (pressFilter && pressFilter !== 'all') return pressFilter;
        return activePresses[0] || '';
    }, [user, pressFilter, activePresses]);

    const effectivePressId = useMemo(() => {
        if (user?.role === 'press' && user.pressId) return user.pressId;
        return pressMap[effectivePress] || '';
    }, [user, effectivePress, pressMap]);


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

    const weekOptions = useMemo(() => {
        const weeks = new Set<string>();
        const years = new Set<string>();

        finishedJobs.forEach(job => {
            if (!job.date) return;
            const d = new Date(job.date);
            if (isNaN(d.getTime())) return;
            years.add(d.getFullYear().toString());
        });

        const showYear = yearFilter === 'all' && years.size > 1;

        finishedJobs.forEach(job => {
            if (!job.date) return;
            const d = new Date(job.date);
            if (isNaN(d.getTime())) return;

            const weekNum = format(d, 'II');
            const yearStr = d.getFullYear().toString();

            // Filter by selected year if active
            if (yearFilter !== 'all' && yearStr !== yearFilter) return;

            // Generate label based on user preference
            const label = showYear ? `${yearStr} W${weekNum}` : `W${weekNum}`;
            const value = `${yearStr}-W${weekNum}`;

            weeks.add(JSON.stringify({ label, value }));
        });

        const options = Array.from(weeks).map(w => JSON.parse(w));
        // Sort by value (YYYY-Wxx) descending
        options.sort((a, b) => b.value.localeCompare(a.value));

        return [{ label: 'Alle Weken', value: 'all' }, ...options];
    }, [finishedJobs, yearFilter]);

    const monthOptions = useMemo(() => {
        const months = new Set<string>();
        const years = new Set<string>();
        const monthNames = ['Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni', 'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December'];

        finishedJobs.forEach(job => {
            if (!job.date) return;
            const d = new Date(job.date);
            if (isNaN(d.getTime())) return;
            years.add(d.getFullYear().toString());
        });

        const showYear = yearFilter === 'all' && years.size > 1;

        finishedJobs.forEach(job => {
            if (!job.date) return;
            const d = new Date(job.date);
            if (isNaN(d.getTime())) return;

            const yearStr = d.getFullYear().toString();
            // Filter by selected year if active
            if (yearFilter !== 'all' && yearStr !== yearFilter) return;

            const monthIdx = d.getMonth();
            const monthName = monthNames[monthIdx];

            // Generate label based on user preference
            const label = showYear ? `${yearStr} ${monthName}` : monthName;
            const value = `${yearStr}-${(monthIdx + 1).toString().padStart(2, '0')}`;

            months.add(JSON.stringify({ label, value }));
        });

        const options = Array.from(months).map(m => JSON.parse(m));
        // Sort by value (YYYY-MM) descending
        options.sort((a, b) => b.value.localeCompare(a.value));

        return [{ label: 'Alle Maanden', value: 'all' }, ...options];
    }, [finishedJobs, yearFilter]);

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

            // Month filter
            if (monthFilter !== 'all') {
                if (!job.date) return false;
                const d = new Date(job.date);
                if (isNaN(d.getTime())) return false;
                const monthVal = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
                if (monthVal !== monthFilter) return false;
            }

            // Week filter
            if (weekFilter !== 'all') {
                if (!job.date) return false;
                const d = new Date(job.date);
                if (isNaN(d.getTime())) return false;
                const weekVal = `${d.getFullYear()}-W${format(d, 'II')}`;
                if (weekVal !== weekFilter) return false;
            }

            if (!searchQuery) return true;
            const query = searchQuery.toLowerCase();
            if (searchField === 'all') {
                return Object.values(job).some(val => String(val).toLowerCase().includes(query));
            }
            return String(job[searchField as keyof FinishedPrintJob]).toLowerCase().includes(query);
        });
    }, [finishedJobs, yearFilter, weekFilter, monthFilter, pressFilter, searchQuery, searchField, hasPermission]);

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

    const [trashJobs, setTrashJobs] = useState<any[]>([]);
    const [isLoadingTrash, setIsLoadingTrash] = useState(false);

    const fetchTrashJobs = useCallback(async () => {
        if (!hasPermission('drukwerken_trash_view')) return;
        setIsLoadingTrash(true);
        try {
            const records = await pb.collection('trashed_drukwerken').getFullList({
                sort: '-created',
            });
            setTrashJobs(records);
        } catch (error) {
            console.error("Error fetching trash jobs:", error);
        } finally {
            setIsLoadingTrash(false);
        }
    }, [hasPermission]);

    useEffect(() => {
        if (activeTab === 'Prullenbak') {
            fetchTrashJobs();
        }
    }, [activeTab, fetchTrashJobs]);

    const handleRestoreJob = async (trashId: string) => {
        try {
            const trashRecord = await pb.collection('trashed_drukwerken').getOne(trashId);
            const metadata = { ...trashRecord.metadata };

            // Strip system-managed fields to allow PB to generate new ones
            delete metadata.id;
            delete metadata.created;
            delete metadata.updated;
            delete metadata.collectionId;
            delete metadata.collectionName;

            // Re-create in main collection
            const record = await pb.collection('drukwerken').create(metadata);

            // Delete from trash
            await pb.collection('trashed_drukwerken').delete(trashId);

            // Log action
            await addActivityLog({
                action: 'Updated',
                entity: 'FinishedJob',
                entityId: record.id,
                entityName: `${record.order_nummer} - ${record.klant_order_beschrijving}`,
                details: `Drukwerk hersteld uit prullenbak`,
                user: user?.username || 'System',
                press: user?.press
            });

            toast.success("Drukwerk hersteld.");
            fetchTrashJobs();
            if (user) drukwerkenCache.checkForUpdates(user, hasPermission);
        } catch (error: any) {
            console.error("Error restoring job:", error);
            if (error.data) {
                console.error("Validation error details:", JSON.stringify(error.data, null, 2));
            }
            toast.error("Fout bij herstellen.");
        }
    };

    const handleBulkJobSubmit = async (jobs: FinishedPrintJob[], deletedIds: string[] = []) => {
        try {
            // 1. Process deletions (Archive to trashed_drukwerken)
            if (deletedIds.length > 0) {
                await Promise.all(deletedIds.map((id) =>
                    archiveAndDeleteJobById(id, `Drukwerk verwijderd en gearchiveerd via snel bewerken`)
                ));
            }

            // 2. Update or Create jobs
            await Promise.all(jobs.map(async (job) => {
                const isNew = job.id.startsWith('temp-');

                if (isNew) {
                    // Recalculate formulas for consistency using helper
                    const processed = processJobFormulas(job);

                    const pbData: any = {
                        order_nummer: parseInt(job.orderNr),
                        klant_order_beschrijving: job.orderName,
                        versie: job.version,
                        blz: job.pages,
                        ex_omw: parseFloat(job.exOmw) || 1,
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
                        pers: processed.pressId || job.pressId || user?.pressId,
                        opmerking: job.opmerkingen,
                        voltooid_op: (Number(job.green) + Number(job.red) > 0) ? new Date().toISOString() : null
                    };

                    const record = await pb.collection('drukwerken').create(pbData);
                    await drukwerkenCache.putRecord(record, user, hasPermission);

                    // Log creation
                    await addActivityLog({
                        action: 'Created',
                        entity: 'FinishedJob',
                        entityId: record.id,
                        entityName: `${job.orderNr} - ${job.orderName}`,
                        details: `Bulk bewerking: Drukwerk aangemaakt (${job.orderNr})`,
                        newValue: [
                            `Order: ${pbData.order_nummer}`,
                            `Naam: ${pbData.klant_order_beschrijving}`,
                            `Versie: ${pbData.versie || '-'}`,
                            `Blz: ${pbData.blz}`,
                            `Ex/Omw: ${pbData.ex_omw}`,
                            `Netto: ${pbData.netto_oplage}`,
                            `Groen: ${pbData.groen}`,
                            `Rood: ${pbData.rood}`,
                            `Delta: ${pbData.delta}`,
                            `Delta %: ${pbData.delta_percent}%`
                        ].join('|||'),
                        user: user?.username || 'System',
                        press: user?.press
                    });
                } else {
                    // EXISTING JOB: Partial Update
                    const originalJob = editingJobs.find(ej => ej.id === job.id);
                    if (!originalJob) return; // Safeguard

                    const partialPbData: any = {};
                    let needsRecalc = false;

                    // Map local field names to PocketBase field names
                    const fieldMapping: Record<string, string> = {
                        orderNr: 'order_nummer',
                        orderName: 'klant_order_beschrijving',
                        version: 'versie',
                        pages: 'blz',
                        exOmw: 'ex_omw',
                        netRun: 'netto_oplage',
                        startup: 'opstart',
                        c4_4: 'k_4_4',
                        c4_0: 'k_4_0',
                        c1_0: 'k_1_0',
                        c1_1: 'k_1_1',
                        c4_1: 'k_4_1',
                        green: 'groen',
                        red: 'rood',
                        opmerkingen: 'opmerking'
                    };

                    // Fields that trigger a formula recalculation (Max Bruto, Delta)
                    const formulaTriggerFields = ['pages', 'exOmw', 'netRun', 'startup', 'c4_4', 'c4_0', 'c1_0', 'c1_1', 'c4_1', 'green', 'red'];

                    Object.entries(fieldMapping).forEach(([localKey, pbKey]) => {
                        const newVal = (job as any)[localKey];
                        const oldVal = (originalJob as any)[localKey];

                        if (newVal !== oldVal) {
                            if (localKey === 'orderNr') {
                                partialPbData[pbKey] = parseInt(newVal);
                            } else if (localKey === 'exOmw') {
                                partialPbData[pbKey] = parseFloat(newVal) || 1;
                            } else if (localKey !== 'green' && localKey !== 'red') {
                                // Green/Red are handled via processed object if needed
                                partialPbData[pbKey] = newVal;
                            }

                            if (formulaTriggerFields.includes(localKey)) {
                                needsRecalc = true;
                            }
                        }
                    });

                    // Set voltooid_op if not yet set and production is recorded
                    if (!originalJob.voltooid_op && (Number(job.green) + Number(job.red) > 0)) {
                        partialPbData.voltooid_op = new Date().toISOString();
                    }

                    // Only update if something changed
                    if (Object.keys(partialPbData).length > 0) {
                        const processed = processJobFormulas(job);

                        if (needsRecalc) {
                            partialPbData.max_bruto = processed.maxGross;
                            partialPbData.delta = processed.delta_number || 0;
                            partialPbData.delta_percent = processed.delta_percentage || 0;
                            partialPbData.groen = processed.green;
                            partialPbData.rood = processed.red;
                        }

                        const oldRecord = await pb.collection('drukwerken').getOne(job.id);
                        const record = await pb.collection('drukwerken').update(job.id, partialPbData);
                        await drukwerkenCache.putRecord(record, user, hasPermission);

                        // Log update with old vs new full snapshots (for better visibility in audit trail)
                        await addActivityLog({
                            action: 'Updated',
                            entity: 'FinishedJob',
                            entityId: job.id,
                            entityName: `${job.orderNr} - ${job.orderName}`,
                            details: `Bulk bewerking: Drukwerk bijgewerkt (${job.orderNr})`,
                            oldValue: [
                                `Order: ${oldRecord.order_nummer}`,
                                `Naam: ${oldRecord.klant_order_beschrijving}`,
                                `Versie: ${oldRecord.versie || '-'}`,
                                `Blz: ${oldRecord.blz}`,
                                `Ex/Omw: ${oldRecord.ex_omw}`,
                                `Netto: ${oldRecord.netto_oplage}`,
                                `Groen: ${oldRecord.groen}`,
                                `Rood: ${oldRecord.red}`,
                                `Delta: ${oldRecord.delta}`,
                                `Delta %: ${oldRecord.delta_percent}%`
                            ].join('|||'),
                            newValue: [
                                `Order: ${job.orderNr}`,
                                `Naam: ${job.orderName}`,
                                `Versie: ${job.version || '-'}`,
                                `Blz: ${job.pages}`,
                                `Ex/Omw: ${job.exOmw}`,
                                `Netto: ${job.netRun}`,
                                `Groen: ${processed.green}`,
                                `Rood: ${processed.red}`,
                                `Delta: ${processed.delta_number || 0}`,
                                `Delta %: ${processed.delta_percentage || 0}%`
                            ].join('|||'),
                            user: user?.username || 'System',
                            press: user?.press
                        });
                    }
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
        const maxGrossVal = (() => {
            if (job.pages === null || job.netRun === null) return null;
            const val = getFormulaForColumn('maxGross')
                ? Number(evaluateFormula(getFormulaForColumn('maxGross')!.formula,
                    { ...job, pressName, pressId }, // Use original scaled exOmw for formula "like before"
                    parameters, activePresses))
                : (Number(job.maxGross) || 0) * divider;
            return Math.round(val);
        })();

        // Scale inputs for Delta calculation
        const greenActual = (Number(job.green) || 0) * divider;
        const redActual = (Number(job.red) || 0) * divider;

        const jobForDelta = { ...job, pressName, pressId, maxGross: maxGrossVal, green: greenActual, red: redActual };

        const delta_numberVal = (() => {
            if (maxGrossVal === null) return null;
            const val = getFormulaForColumn('delta_number')
                ? Number(evaluateFormula(getFormulaForColumn('delta_number')!.formula, jobForDelta, parameters, activePresses))
                : ((greenActual + redActual) - maxGrossVal);
            return Math.round(val);
        })();

        const delta_percentageVal = (() => {
            if (maxGrossVal === null || maxGrossVal === 0) return null;
            const f = getFormulaForColumn('delta_percentage');
            let val = 0;
            if (f) {
                val = Number(evaluateFormula(f.formula, { ...jobForDelta, delta_number: delta_numberVal }, parameters, activePresses));
            } else if (maxGrossVal > 0) {
                val = (delta_numberVal || 0) / maxGrossVal;
            }
            return Math.round(val * 10000) / 10000;
        })();

        return {
            ...job,
            maxGross: maxGrossVal,         // Actual Units (UNDIVIDED)
            green: job.green, // Preserve null for blank display
            red: job.red,     // Preserve null for blank display
            delta: delta_numberVal,       // Actual Units (UNDIVIDED)
            delta_number: delta_numberVal,
            delta_percentage: delta_percentageVal,
            performance: delta_percentageVal !== null ? `${formatNumber(delta_percentageVal * 100, 2)}%` : '-',
            pressId: pressId,
            pressName: pressName
        };
    };

    const handleEditJob = (job: FinishedPrintJob) => {
        // Group by Order Nr only to find siblings (as per user request)
        const siblings = finishedJobs.filter(j =>
            String(j.orderNr) === String(job.orderNr)
        );

        // Sort siblings naturally by version
        siblings.sort((a, b) => a.version.localeCompare(b.version, undefined, { numeric: true }));

        // Convert 0 to null for blank display in dialog
        const sanitizedSiblings = siblings.map(j => ({
            ...j,
            pages: j.pages === 0 ? null : j.pages,
            netRun: j.netRun === 0 ? null : j.netRun,
            c4_4: j.c4_4 === 0 ? null : j.c4_4,
            c4_0: j.c4_0 === 0 ? null : j.c4_0,
            c1_0: j.c1_0 === 0 ? null : j.c1_0,
            c1_1: j.c1_1 === 0 ? null : j.c1_1,
            c4_1: j.c4_1 === 0 ? null : j.c4_1,
        }));

        setEditingJobs(sanitizedSiblings);
        setIsAddJobDialogOpen(true);
    };

    const handleMoveBackToNew = (jobs: FinishedPrintJob[]) => {
        if (!jobs || jobs.length === 0) return;

        const firstJob = jobs[0];
        const newWerkorderId = `resumed-${Date.now()} `;

        const newWerkorder: Werkorder = {
            id: newWerkorderId,
            orderNr: firstJob.orderNr,
            orderName: firstJob.orderName,
            orderDate: new Date().toISOString().split('T')[0],
            katernen: jobs.map((job, index) => ({
                id: `${newWerkorderId}-${index + 1} `,
                originalId: job.id, // Store the PB ID
                version: job.version,
                pages: job.pages,
                exOmw: job.exOmw,
                netRun: job.netRun || 0,
                startup: job.startup,
                c4_4: job.c4_4 || 0,
                c4_0: job.c4_0 || 0,
                c1_0: job.c1_0 || 0,
                c1_1: job.c1_1 || 0,
                c4_1: job.c4_1 || 0,
                maxGross: job.maxGross,
                green: job.green, // RAW Machine Cycles
                red: job.red,     // RAW Machine Cycles
                delta: job.delta_number,
                deltaPercentage: job.delta_percentage
            }))
        };

        setWerkorders([newWerkorder, ...werkorders]);
        setIsAddJobDialogOpen(false);
        navigate('/drukwerken/nieuw');
        toast.success(`Order ${firstJob.orderNr} gekloond naar Nieuw.`);

        // Log action
        addActivityLog({
            action: 'Updated',
            entity: 'FinishedJob',
            entityId: firstJob.orderNr,
            entityName: firstJob.orderName,
            details: `Order hervat: Gekloond van Gedrukt naar Nieuw`,
            user: user?.username || 'System',
            press: user?.press
        });
    };

    const archiveAndDeleteJobById = async (id: string, logDetails?: string) => {
        try {
            const oldRecord = await pb.collection('drukwerken').getOne(id);

            // Archive to trash collection safely
            try {
                await pb.collection('trashed_drukwerken').create({
                    original_id: id,
                    order_nummer: Number(oldRecord.order_nummer) || 0,
                    klant_order_beschrijving: oldRecord.klant_order_beschrijving || '',
                    versie: oldRecord.versie || '',
                    deleted_by: user?.username || 'System',
                    press: oldRecord.pers_name || oldRecord.pressName || user?.press || '',
                    metadata: oldRecord // Full record for easy restore
                });
            } catch (archiveErr: any) {
                console.error("Failed to archive job:", archiveErr);
                toast.error(`Kon versie niet archiveren: ${archiveErr.message || 'Onbekende fout'}`);
                throw archiveErr; // Prevent deletion if archiving fails
            }

            await pb.collection('drukwerken').delete(id);
            await drukwerkenCache.removeRecord(id);

            // Log deletion
            await addActivityLog({
                action: 'Deleted',
                entity: 'FinishedJob',
                entityId: id,
                entityName: `${oldRecord.order_nummer} - ${oldRecord.klant_order_beschrijving}`,
                details: logDetails || `Drukwerk verwijderd via lijst en gearchiveerd`,
                oldValue: [
                    `Order: ${oldRecord.order_nummer}`,
                    `Naam: ${oldRecord.klant_order_beschrijving}`,
                    `Versie: ${oldRecord.versie || '-'}`,
                    `Blz: ${oldRecord.blz}`,
                    `Ex/Omw: ${oldRecord.ex_omw}`,
                    `Netto: ${oldRecord.netto_oplage}`,
                    `Groen: ${oldRecord.groen}`,
                    `Rood: ${oldRecord.rood}`,
                    `Delta: ${oldRecord.delta}`,
                    `Delta %: ${oldRecord.delta_percent}%`
                ].join('|||'),
                user: user?.username || 'System',
                press: user?.press
            });

            return oldRecord;
        } catch (error) {
            console.error("Error archiving and deleting job:", error);
            throw error;
        }
    };

    const confirmDelete = async () => {
        if (!deleteAction) return;

        if (deleteAction.type === 'werkorder') {
            await handleDeleteWerkorder(deleteAction.id);
        } else if (deleteAction.type === 'katern' && deleteAction.secondaryId) {
            // Check if it's the last katern to delete the whole order
            const order = werkorders.find(wo => wo.id === deleteAction.id);
            if (order && order.katernen.length <= 1) {
                await handleDeleteWerkorder(deleteAction.id);
            } else {
                const katernToDelete = order?.katernen.find(k => k.id === deleteAction.secondaryId);
                if (katernToDelete?.originalId) {
                    try {
                        await archiveAndDeleteJobById(katernToDelete.originalId, `Versie verwijderd uit Geplande Orders: ${order?.orderNr} - ${order?.orderName}`);
                    } catch (e) {
                        return; // Don't delete locally if DB delete failed
                    }
                }

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
                await archiveAndDeleteJobById(deleteAction.id);
                toast.success("Drukwerk verwijderd en verplaatst naar prullenbak.");
                if (user) drukwerkenCache.checkForUpdates(user, hasPermission);
                fetchCalculatedFields();
            } catch (error) {
                // Error already toasted in helper if it was an archive error
                if (!String(error).includes("archiveren")) {
                    toast.error("Fout bij verwijderen drukwerk.\n" + error);
                }
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
            <Tabs value={activeTab} onValueChange={(value) => navigate(`/Drukwerken/${value}`)} className="w-full">
                <div className="space-y-4">
                    {isLoadingPresses && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/50 backdrop-blur-sm">
                            <div className="flex flex-col items-center gap-2">
                                <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
                                <p className="font-medium text-blue-900 text-lg">Persen Laden...</p>
                            </div>
                        </div>
                    )}

                    {(() => {
                        const showWerkorders = user?.role === 'press';
                        const showFinished = (user?.role?.toLowerCase() === 'admin' || user?.role?.toLowerCase() === 'meestergast' || (user?.role === 'press' && hasPermission('drukwerken_view')));
                        const showTrash = hasPermission('drukwerken_trash_view');
                        // Count visible tabs: Nieuw, Gedrukt, and Prullenbak
                        const tabCount = [showWerkorders, showFinished, showTrash].filter(Boolean).length;
                        const hasTabs = tabCount > 1;

                        return (
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2 mt-2">
                                <div className="flex items-center gap-4">
                                    {hasTabs && (
                                        <TabsList className="tab-pill-list">
                                            {showWerkorders && (
                                                <TabsTrigger value="Nieuw" className="tab-pill-trigger">Geplande Orders</TabsTrigger>
                                            )}
                                            {showFinished && (
                                                <TabsTrigger value="Gedrukt" className="tab-pill-trigger">Gedrukt</TabsTrigger>
                                            )}
                                            {hasPermission('drukwerken_trash_view') && (
                                                <TabsTrigger value="Prullenbak" className="tab-pill-trigger">Prullenbak</TabsTrigger>
                                            )}
                                        </TabsList>
                                    )}

                                    {/* Cache Status Indicators */}
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
                                        <div className="flex items-center gap-2 text-xs text-gray-400 font-normal opacity-50">
                                            <Check className="w-3 h-3" />
                                            <span>Up to date</span>
                                        </div>
                                    )}
                                </div>

                                {/* Action Controls */}
                                <div className="flex gap-2 items-center flex-wrap justify-end">
                                    {activeTab === 'Nieuw' && hasPermission('drukwerken_create') && (
                                        <Button onClick={() => handleWerkorderSubmit(defaultWerkorderData)}>
                                            <Plus className="w-4 h-4 mr-2" /> Werkorder
                                        </Button>
                                    )}
                                    {activeTab === 'Gedrukt' && (
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-9 w-9 hover:bg-blue-50 text-blue-600 border border-transparent hover:border-gray-200 transition-all rounded-md"
                                            onClick={() => {
                                                const limit = getSystemSetting('drukwerken_edit_limit', 1);
                                                drukwerkenCache.syncRecent(user, hasPermission, Number(limit));
                                            }}
                                            title={`Synchroniseer laatste ${getSystemSetting('drukwerken_edit_limit', 1)} dagen`}
                                        >
                                            <RefreshCw className={cn("w-4 h-4", cacheStatus.loading && "animate-spin")} />
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


                                    <div className="flex gap-2">
                                        {activeTab === 'Gedrukt' && (
                                            <>
                                                <Select
                                                    value={weekFilter}
                                                    onValueChange={(v) => {
                                                        setWeekFilter(v);
                                                        if (v !== 'all') setMonthFilter('all');
                                                    }}
                                                >
                                                    <SelectTrigger className="w-[140px] h-9 bg-white text-xs">
                                                        <SelectValue placeholder="Alle Weken" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {weekOptions.map(opt => (
                                                            <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>

                                                <Select
                                                    value={monthFilter}
                                                    onValueChange={(v) => {
                                                        setMonthFilter(v);
                                                        if (v !== 'all') setWeekFilter('all');
                                                    }}
                                                >
                                                    <SelectTrigger className="w-[140px] h-9 bg-white text-xs">
                                                        <SelectValue placeholder="Alle Maanden" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {monthOptions.map(opt => (
                                                            <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </>
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
                                    </div>

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
                            </div>
                        );
                    })()}

                    {user?.role === 'press' && (
                        <TabsContent value="Nieuw">
                            <div className="space-y-4 max-h-[calc(100vh-150px)] overflow-y-auto relative pb-6 px-1">
                                {werkorders.map((wo) => (
                                    <Card key={wo.id} className="p-4 shadow-sm">
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
                                                <TableRow className="sticky top-[40px] z-40 bg-white shadow-sm h-10">
                                                    <TableHead style={{ width: COL_WIDTHS.version }} className="border-r sticky top-[40px] z-40 bg-white">Version</TableHead>
                                                    <TableHead className="text-center border-r sticky top-[40px] z-40 bg-white" style={{ width: COL_WIDTHS.pages }}>Blz</TableHead>
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
                                                {wo.katernen.map((katern) => (
                                                    <DrukwerkRow
                                                        key={katern.id}
                                                        werkorderId={wo.id}
                                                        katern={katern}
                                                        orderNr={wo.orderNr}
                                                        orderName={wo.orderName}
                                                        effectivePress={effectivePress}
                                                        effectivePressId={effectivePressId}
                                                        parameters={parameters}
                                                        activePresses={activePresses}
                                                        outputConversions={outputConversions}
                                                        pressMap={pressMap}
                                                        calculatedFields={calculatedFields}
                                                        onKaternChange={handleKaternChange}
                                                        onDeleteKatern={requestDeleteKatern}
                                                        onAutoSaved={handleAutoSaved}
                                                        addActivityLog={addActivityLog}
                                                        user={user}
                                                        hasPermission={hasPermission}
                                                    />
                                                ))}
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
                                    </Card>
                                ))}
                            </div>
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
                                                {(user?.role?.toLowerCase() === 'admin' || user?.role?.toLowerCase() === 'meestergast') && <TableHead style={{ width: COL_WIDTHS.press }} className="text-center bg-gray-100 border-r border-slate-300">Pers</TableHead>}
                                                <TableHead onClick={() => requestSort('date')} style={{ width: COL_WIDTHS.date }} className="cursor-pointer hover:bg-gray-100 text-center border-r border-slate-300 bg-white"><div className="flex items-center justify-center">Datum {getSortIcon('date')}</div></TableHead>
                                                <TableHead onClick={() => requestSort('orderNr')} style={{ width: COL_WIDTHS.orderNr }} className="cursor-pointer hover:bg-gray-100 text-center border-r border-slate-300 bg-white"><div className="flex items-center justify-center">Order nr {getSortIcon('orderNr')}</div></TableHead>
                                                <TableHead onClick={() => requestSort('orderName')} style={{ width: COL_WIDTHS.orderName }} className="cursor-pointer hover:bg-gray-100 border-r border-slate-300 bg-white"><div className="flex items-center">Order {getSortIcon('orderName')}</div></TableHead>
                                                <TableHead onClick={() => requestSort('pages')} style={{ width: COL_WIDTHS.pages }} className="cursor-pointer hover:bg-gray-100 text-center border-r border-slate-300 bg-white"><div className="flex items-center justify-center">Blz {getSortIcon('pages')}</div></TableHead>
                                                <TableHead onClick={() => requestSort('exOmw')} style={{ width: COL_WIDTHS.exOmw }} className="cursor-pointer hover:bg-gray-100 text-center border-r border-slate-300 leading-3 bg-white"><div className="flex items-center justify-center h-full">Ex/<br />Omw. {getSortIcon('exOmw')}</div></TableHead>
                                                <TableHead onClick={() => requestSort('netRun')} style={{ width: COL_WIDTHS.netRun }} className="cursor-pointer hover:bg-gray-100 text-center border-r border-slate-300 bg-white"><div className="flex items-center justify-center">Oplage {getSortIcon('netRun')}</div></TableHead>
                                                <TableHead onClick={() => requestSort('startup')} style={{ width: COL_WIDTHS.startup }} className="cursor-pointer hover:bg-gray-100 text-center bg-gray-50 border-r border-slate-300"><div className="flex items-center justify-center">Opstart {getSortIcon('startup')}</div></TableHead>
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
                                    itemContent={(index, job) => {
                                        const prevJob = index > 0 ? sortedJobs[index - 1] : null;
                                        const isDateChange = prevJob && job.date !== prevJob.date;
                                        const borderClass = isDateChange ? "border-t border-t-slate-400" : "border-t border-t-gray-100";

                                        return (
                                            <>
                                                {(user?.role?.toLowerCase() === 'admin' || user?.role?.toLowerCase() === 'meestergast') && (
                                                    <TableCell className={cn("py-1 px-2 font-medium bg-gray-50 border-r border-black text-center truncate group-hover:bg-blue-50/70", borderClass)} title={job.pressName}>
                                                        {job.pressName || '-'}
                                                    </TableCell>
                                                )}
                                                <TableCell className={cn("py-1 px-2 text-center whitespace-nowrap", borderClass)}>
                                                    {(() => {
                                                        const d = new Date(job.date);
                                                        if (isNaN(d.getTime())) return formatDisplayDate(job.date);
                                                        return (
                                                            <>
                                                                <span className="text-gray-500 mr-2">W{format(d, 'II')}</span>
                                                                <span>{formatDisplayDate(job.date)}</span>
                                                            </>
                                                        );
                                                    })()}
                                                </TableCell>
                                                <TableCell className={cn("py-1 px-2 text-center", borderClass)}>DT {job.orderNr}</TableCell>
                                                <TableCell className={cn("py-1 px-2", borderClass)}>
                                                    <div className="flex flex-col">
                                                        <div className="flex items-center">
                                                            <span className="font-medium mr-2">{job.orderName}</span>
                                                            <span className="text-gray-500 whitespace-nowrap">{job.version}</span>
                                                        </div>
                                                        {((job as any).opmerking || job.opmerkingen) && (
                                                            <div className="flex items-start gap-1 mt-0.5 text-[11px] text-blue-600/80 italic font-medium leading-tight">
                                                                <CornerDownRight className="w-3 h-3 flex-shrink-0" />
                                                                <span>{(job as any).opmerking || job.opmerkingen}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className={cn("text-right py-1 px-1", borderClass)}>{formatNumber(job.pages)} blz</TableCell>
                                                <TableCell className={cn("text-center py-1 px-1", borderClass)}>{job.exOmw}</TableCell>
                                                <TableCell className={cn("text-right py-1 px-1 border-r border-black", borderClass)}>{formatNumber(job.netRun)}</TableCell>
                                                <TableCell className={cn("text-center py-1 px-1 bg-gray-50", borderClass)}>
                                                    <div className="flex justify-center">
                                                        {job.startup ? <Check className="w-4 h-4 text-green-600" /> : <span className="text-gray-300">-</span>}
                                                    </div>
                                                </TableCell>
                                                <TableCell className={cn("text-center py-1 px-1 bg-gray-50", borderClass)}>{formatNumber(job.c4_4)}</TableCell>
                                                <TableCell className={cn("text-center py-1 px-1 bg-gray-50", borderClass)}>{formatNumber(job.c4_0)}</TableCell>
                                                <TableCell className={cn("text-center py-1 px-1 bg-gray-50", borderClass)}>{formatNumber(job.c1_0)}</TableCell>
                                                <TableCell className={cn("text-center py-1 px-1 bg-gray-50", borderClass)}>{formatNumber(job.c1_1)}</TableCell>
                                                <TableCell className={cn("text-center py-1 px-1 bg-gray-50 border-r border-black group-hover:bg-blue-50/70", borderClass)}>{formatNumber(job.c4_1)}</TableCell>
                                                <TableCell className={cn("py-1 px-1 text-right", borderClass)}>
                                                    {(() => {
                                                        const formula = getFormulaForColumn('maxGross');
                                                        return (
                                                            <FormulaResultWithTooltip
                                                                formula={formula?.formula || ''}
                                                                job={job as any}
                                                                variant="maxGross"
                                                                parameters={parameters}
                                                                activePresses={activePresses}
                                                                result={Number(job.maxGross)}
                                                                outputConversions={outputConversions}
                                                                pressMap={pressMap}
                                                            />
                                                        );
                                                    })()}
                                                </TableCell>
                                                <TableCell className={cn("py-1 px-1 text-right", borderClass, (() => {
                                                    const pressId = pressMap[job.pressName || ''] || '';
                                                    const divider = outputConversions[pressId]?.[String(job.exOmw)] || 1;
                                                    const units = (Number(job.green) || 0) * divider;
                                                    return units < Number(job.netRun) ? "bg-red-50/80" : "";
                                                })())}>
                                                    {(() => {
                                                        const pressId = pressMap[job.pressName || ''] || '';
                                                        const divider = outputConversions[pressId]?.[String(job.exOmw)] || 1;
                                                        const cycles = Number(job.green) || 0;
                                                        const units = cycles * divider;
                                                        const isLow = units < Number(job.netRun);
                                                        return (
                                                            <div className={`flex flex-col items-end min-h-[36px] ${divider > 1 ? 'justify-end' : 'justify-center'}`}>
                                                                {divider > 1 && (
                                                                    <div className="flex items-center mb-0.5">
                                                                        <span className="text-[9px] text-gray-400 leading-none">{formatNumber(cycles)} ingegeven</span>
                                                                    </div>
                                                                )}
                                                                <div className="flex items-center py-1">
                                                                    <span className={cn("font-normal leading-none", isLow ? "text-red-600 underline decoration-dotted" : "")}>
                                                                        {formatNumber(units)}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        );
                                                    })()}
                                                </TableCell>
                                                <TableCell className={cn("py-1 px-1 text-right border-r border-black", borderClass)}>
                                                    {(() => {
                                                        const pressId = pressMap[job.pressName || ''] || '';
                                                        const divider = outputConversions[pressId]?.[String(job.exOmw)] || 1;
                                                        const cycles = Number(job.red) || 0;
                                                        const units = cycles * divider;
                                                        return (
                                                            <div className={`flex flex-col items-end min-h-[36px] ${divider > 1 ? 'justify-end' : 'justify-center'}`}>
                                                                {divider > 1 && (
                                                                    <div className="flex items-center mb-0.5">
                                                                        <span className="text-[9px] text-gray-400 leading-none">{formatNumber(cycles)} ingegeven</span>
                                                                    </div>
                                                                )}
                                                                <div className="flex items-center py-1">
                                                                    <span className="font-normal leading-none">{formatNumber(units)}</span>
                                                                </div>
                                                            </div>
                                                        );
                                                    })()}
                                                </TableCell>
                                                {(() => {
                                                    const f = getFormulaForColumn('delta_percentage');
                                                    let dp = Number(job.delta_percentage) || 0;
                                                    if (dp > 0.5) dp -= 1;
                                                    const perc = dp * 100;

                                                    let colorClass = "text-gray-500";
                                                    let bgClass = "";
                                                    const absDp = Math.abs(dp);

                                                    if (absDp > 0.01) {
                                                        const absVal = absDp * 100;
                                                        let ramp = 1;
                                                        if (absVal > 8) ramp = 5;
                                                        else if (absVal > 6) ramp = 4;
                                                        else if (absVal > 4) ramp = 3;
                                                        else if (absVal > 2) ramp = 2;

                                                        if (dp > 0) {
                                                            const reds = ["text-red-500", "text-red-600", "text-red-700", "text-red-800", "text-red-900"];
                                                            const bgs = ["bg-red-50/70", "bg-red-100/40", "bg-red-100/70", "bg-red-200/40", "bg-red-200/70"];
                                                            colorClass = `${reds[ramp - 1]} font-bold underline-offset-2${absVal > 5 ? ' underline decoration-1' : ''}`;
                                                            bgClass = bgs[ramp - 1];
                                                        } else {
                                                            const greens = ["text-green-600", "text-green-700", "text-green-800", "text-green-800", "text-green-950"];
                                                            const bgs = ["bg-green-50/70", "bg-green-100/40", "bg-green-100/70", "bg-green-200/40", "bg-green-200/70"];
                                                            colorClass = `${greens[ramp - 1]} font-normal`;
                                                            bgClass = bgs[ramp - 1];
                                                        }
                                                    }

                                                    return (
                                                        <>
                                                            <TableCell className={cn("text-right py-1 px-1", borderClass, bgClass)}>
                                                                {(() => {
                                                                    const formula = getFormulaForColumn('delta_number');
                                                                    const delta = Number(job.delta_number) || 0;

                                                                    return formula
                                                                        ? (
                                                                            <FormulaResultWithTooltip
                                                                                formula={formula.formula}
                                                                                job={job}
                                                                                parameters={parameters}
                                                                                activePresses={activePresses}
                                                                                variant="delta"
                                                                                result={delta}
                                                                                outputConversions={outputConversions}
                                                                                pressMap={pressMap}
                                                                                bold={false}
                                                                            />
                                                                        ) : (
                                                                            <div className={`flex flex-col items-end min-h-[36px] justify-center`}>
                                                                                <span className="font-normal py-1 leading-none">{formatNumber(delta, 0)}</span>
                                                                            </div>
                                                                        );
                                                                })()}
                                                            </TableCell>
                                                            <TableCell className={cn("text-right py-1 px-1 border-r border-black", borderClass, bgClass)}>
                                                                <div className={colorClass}>
                                                                    <FormulaResultWithTooltip
                                                                        formula={f?.formula || ''}
                                                                        job={job}
                                                                        parameters={parameters}
                                                                        activePresses={activePresses}
                                                                        decimals={2}
                                                                        result={perc}
                                                                        outputConversions={outputConversions}
                                                                        pressMap={pressMap}
                                                                        prefix={dp > 0 ? '+' : ''}
                                                                        suffix="%"
                                                                        hideTooltip={true}
                                                                        bold={dp > 0.01}
                                                                    />
                                                                </div>
                                                            </TableCell>
                                                        </>
                                                    );
                                                })()}
                                                <TableCell className={cn("py-1 px-1 border-r border-black", borderClass)}>
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
                                        );
                                    }}
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
                                        TableRow: (props: any) => <tr {...props} className="h-8 hover:bg-blue-50/70 [&>td]:hover:bg-blue-50/70 transition-colors group" />
                                    }}
                                />
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="Prullenbak">
                        <Card>
                            <CardContent className="p-0">
                                <Table className={`table-fixed w-full ${FONT_SIZES.body}`}>
                                    <TableHeader>
                                        <TableRow className="bg-gray-50 h-10">
                                            <TableHead className="w-[120px] text-center border-r">Verwijderd op</TableHead>
                                            <TableHead className="w-[100px] text-center border-r">Order Nr</TableHead>
                                            <TableHead className="border-r">Order Naam</TableHead>
                                            <TableHead className="w-[100px] text-center border-r">Versie</TableHead>
                                            <TableHead className="w-[120px] text-center border-r">Pers</TableHead>
                                            <TableHead className="w-[150px] text-center border-r">Door</TableHead>
                                            <TableHead className="w-[120px] text-center">Acties</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {isLoadingTrash ? (
                                            <TableRow>
                                                <TableCell colSpan={7} className="text-center py-12">
                                                    <div className="flex flex-col items-center gap-2">
                                                        <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
                                                        <span className="text-sm text-gray-500">Laden...</span>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ) : trashJobs.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={7} className="text-center py-12 text-gray-400">
                                                    <div className="flex flex-col items-center gap-2">
                                                        <Trash2 className="w-8 h-8 opacity-20" />
                                                        <span className="italic">De prullenbak is leeg.</span>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            trashJobs.map((job) => (
                                                <TableRow key={job.id} className="hover:bg-gray-50 h-10">
                                                    <TableCell className="text-center border-r text-xs">
                                                        {job.created ? format(new Date(job.created), 'dd/MM/yyyy HH:mm') : '-'}
                                                    </TableCell>
                                                    <TableCell className="text-center border-r font-medium">DT {job.order_nummer}</TableCell>
                                                    <TableCell className="border-r truncate" title={job.klant_order_beschrijving}>
                                                        {job.klant_order_beschrijving}
                                                    </TableCell>
                                                    <TableCell className="text-center border-r">{job.versie || '-'}</TableCell>
                                                    <TableCell className="text-center border-r">{job.press || '-'}</TableCell>
                                                    <TableCell className="text-center border-r text-gray-500">{job.deleted_by}</TableCell>
                                                    <TableCell className="text-center">
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="h-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50 text-[11px] font-medium"
                                                            onClick={() => handleRestoreJob(job.id)}
                                                        >
                                                            <RefreshCw className="w-3 h-3 mr-1" /> Terugzetten
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </div>
            </Tabs>

            {
                isAddJobDialogOpen && (
                    <AddFinishedJobDialog
                        open={isAddJobDialogOpen}
                        onOpenChange={setIsAddJobDialogOpen}
                        onSubmit={handleBulkJobSubmit}
                        initialJobs={editingJobs}
                        onCalculate={(job) => processJobFormulas(job) as FinishedPrintJob}
                        outputConversions={outputConversions}
                        pressMap={pressMap}
                        currentPressName={effectivePress}
                        onMoveToNew={handleMoveBackToNew}
                    />
                )
            }

            <ConfirmationModal
                open={deleteModalOpen}
                onOpenChange={setDeleteModalOpen}
                onConfirm={confirmDelete}
                title={deleteMessage.title}
                description={deleteMessage.description}
                confirmText="Verwijderen"
                variant="destructive"
            />
        </TooltipProvider >
    );
}

export default Drukwerken;