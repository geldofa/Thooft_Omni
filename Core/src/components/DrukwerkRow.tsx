import { useState, useEffect, useRef, useCallback } from 'react';
import { pb, type User, type Permission, type ActivityLog } from './AuthContext';
import { drukwerkenCache, addToLockedCache } from '../services/DrukwerkenCache';
import { type Katern, type CalculatedField, evaluateFormula } from '../utils/drukwerken-utils';
import { FormulaResultWithTooltip } from './Drukwerken';
import { TableRow, TableCell } from './ui/table';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { FormattedNumberInput } from './ui/FormattedNumberInput';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Trash2, Pencil, MessageSquare } from 'lucide-react';
import { CmykIcon } from './ui/CmykIcon';
import { cn } from './ui/utils';
import { formatNumber } from '../utils/formatNumber';
import { format } from 'date-fns';
import { toast } from 'sonner';

// --- Configuration ---
const AUTO_SAVE_DELAY = 30_000;   // 30 seconds
const AUTO_FINISH_DELAY = 60_000; // 60 seconds
const PULSE_DURATION = 2_000;     // 2 seconds

// --- Props ---
export interface DrukwerkRowProps {
    werkorderId: string;
    katern: Katern;
    orderNr: string;
    orderName: string;
    effectivePress: string;
    effectivePressId: string;
    parameters: Record<string, Record<string, any>>;
    activePresses: string[];
    outputConversions: Record<string, Record<string, number>>;
    pressMap: Record<string, string>;
    calculatedFields: CalculatedField[];
    onKaternChange: (werkorderId: string, katernId: string, field: keyof Katern, value: any) => void;
    onDeleteKatern: (werkorderId: string, katernId: string) => void;
    onAutoSaved: (werkorderId: string, katernId: string, pbRecordId: string, savedGreen: number | null, savedRed: number | null, voltooid_op: string | null) => void;
    addActivityLog: (log: Omit<ActivityLog, 'id' | 'timestamp'>) => Promise<void>;
    user: User | null;
    hasPermission: (perm: Permission) => boolean;
    hideVolgorde?: boolean;
    hideKatern?: boolean;

}

export function DrukwerkRow({
    werkorderId,
    katern,
    orderNr,
    orderName,
    effectivePress,
    effectivePressId,
    parameters,
    activePresses,
    outputConversions,
    pressMap,
    calculatedFields,
    onKaternChange,
    onDeleteKatern,
    onAutoSaved,
    addActivityLog,
    user,
    hasPermission,
    hideVolgorde = false,
    hideKatern = false,

}: DrukwerkRowProps) {

    // ===================== REFS =====================
    const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const autoFinishTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const latestKaternRef = useRef(katern);
    const latestOrderRef = useRef({ orderNr, orderName });
    const isSavingRef = useRef(false);
    const wasEverLockedRef = useRef(!!katern.is_finished);
    const flushRef = useRef<() => void>(() => { });

    // ===================== UI STATE =====================
    const [pulseActive, setPulseActive] = useState(false);
    const [showComment, setShowComment] = useState(false);
    const [showCmyk, setShowCmyk] = useState(false);
    const [commentValue, setCommentValue] = useState(katern.opmerking || '');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // ===================== PAPIER DATA =====================
    interface PapierRecord {
        id: string;
        naam: string;
        klasse: string;
        proef_profiel: string;
        gram_per_m2: number | null;
        start_front_k?: number;
        start_front_c?: number;
        start_front_m?: number;
        start_front_y?: number;
        start_back_k?: number;
        start_back_c?: number;
        start_back_m?: number;
        start_back_y?: number;
    }
    const [papierList, setPapierList] = useState<PapierRecord[]>([]);
    const papierFetchedRef = useRef(false);

    // ===================== FETCH PAPIER =====================
    useEffect(() => {
        if (showCmyk && !papierFetchedRef.current) {
            papierFetchedRef.current = true;
            pb.collection('papier').getFullList<PapierRecord>({
                sort: 'naam',
                filter: katern.papier_id ? `actief = true || id = "${katern.papier_id}"` : 'actief = true'
            })
                .then(setPapierList)
                .catch(err => console.error('[DrukwerkRow] Failed to fetch papier:', err));
        }
    }, [showCmyk]);

    // ===================== SYNC REFS WITH PROPS =====================
    useEffect(() => { latestKaternRef.current = katern; }, [katern]);
    useEffect(() => { latestOrderRef.current = { orderNr, orderName }; }, [orderNr, orderName]);
    useEffect(() => {
        if (katern.is_finished) wasEverLockedRef.current = true;
    }, [katern.is_finished]);
    useEffect(() => {
        setCommentValue(katern.opmerking || '');
    }, [katern.opmerking]);

    const adjustTextareaHeight = useCallback(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, []);

    useEffect(() => {
        if (showComment) {
            // timeout guarantees DOM is updated
            setTimeout(adjustTextareaHeight, 0);
        }
    }, [showComment, commentValue, adjustTextareaHeight]);

    // ===================== HELPERS =====================
    const getFormulaForColumn = useCallback(
        (col: string) => calculatedFields.find(f => f.targetColumn === col),
        [calculatedFields]
    );

    /** Build PocketBase data object from a Katern. */
    const buildPbData = useCallback((k: Katern, overrides?: Partial<{ is_finished: boolean; locked: boolean; opmerking: string }>) => {
        const today = new Date();
        const formattedDate = format(today, 'yyyy-MM-dd');
        const formattedDatum = format(today, 'dd-MM');
        const { orderNr: nr, orderName: name } = latestOrderRef.current;
        const divider = outputConversions[effectivePressId]?.[String(k.exOmw)] || 1;

        const jobForCalc: any = {
            ...k,
            orderNr: nr,
            orderName: name,
            pressName: effectivePress,
            pressId: effectivePressId,
        };

        // Calculate maxGross
        const maxGrossFormula = getFormulaForColumn('maxGross');
        const maxGrossVal = maxGrossFormula
            ? Number(evaluateFormula(maxGrossFormula.formula, jobForCalc, parameters, activePresses)) || 0
            : k.maxGross;

        // Scale green/red to actual units for delta
        const greenActual = (Number(k.green) || 0) * divider;
        const redActual = (Number(k.red) || 0) * divider;

        const jobForDelta: any = { ...jobForCalc, maxGross: maxGrossVal, green: greenActual, red: redActual };

        // Calculate delta
        const deltaFormula = getFormulaForColumn('delta_number');
        const deltaVal = deltaFormula
            ? (maxGrossVal !== null ? Number(evaluateFormula(deltaFormula.formula, jobForDelta, parameters, activePresses)) : null)
            : (maxGrossVal !== null ? (greenActual + redActual) - maxGrossVal : null);

        // Calculate delta percentage
        const deltaPctFormula = getFormulaForColumn('delta_percentage');
        const deltaPctVal = deltaPctFormula
            ? (deltaVal !== null ? Number(evaluateFormula(deltaPctFormula.formula, { ...jobForDelta, delta_number: deltaVal }, parameters, activePresses)) : null)
            : (maxGrossVal && maxGrossVal > 0 ? (deltaVal || 0) / maxGrossVal : null);

        return {
            date: formattedDate,
            datum: formattedDatum,
            order_nummer: parseInt(nr) || 0,
            klant_order_beschrijving: name,
            versie: k.version,
            blz: k.pages || 0,
            ex_omw: parseFloat(k.exOmw) || 1,
            netto_oplage: k.netRun || 0,
            opstart: k.startup,
            k_4_4: k.c4_4 || 0,
            k_4_0: k.c4_0 || 0,
            k_1_0: k.c1_0 || 0,
            k_1_1: k.c1_1 || 0,
            k_4_1: k.c4_1 || 0,
            max_bruto: maxGrossVal !== null ? Math.round(maxGrossVal) : 0,
            groen: Number(k.green) || 0,
            rood: Number(k.red) || 0,
            delta: deltaVal !== null ? Math.round(deltaVal) : 0,
            delta_percent: deltaPctVal || 0,
            pers: effectivePressId,
            status: 'check',
            opmerking: overrides?.opmerking ?? (k.opmerking || ''),
            is_finished: overrides?.is_finished ?? (k.is_finished || false),
            locked: overrides?.locked ?? (k.locked || false),
            voltooid_op: k.voltooid_op || ((Number(k.green) + Number(k.red) > 0) ? new Date().toISOString() : null),
            wissel: k.wissel || '',
            oplage: k.oplage || 0,
            // CMYK / Papier
            cmyk_naam: k.cmyk_naam || '',
            papier_id: k.papier_id || '',
            papier_klasse: k.papier_klasse || '',
            papier_proef_profiel: k.papier_proef_profiel || '',
            papier_gram: k.papier_gram || 0,
            front_k: k.front_k || 0,
            front_c: k.front_c || 0,
            front_m: k.front_m || 0,
            front_y: k.front_y || 0,
            back_k: k.back_k || 0,
            back_c: k.back_c || 0,
            back_m: k.back_m || 0,
            back_y: k.back_y || 0,
        };
    }, [effectivePress, effectivePressId, parameters, activePresses, outputConversions, getFormulaForColumn]);

    /** Validate green (actual units) against netRun. Returns true if OK. */
    const validateGreen = useCallback((k: Katern): boolean => {
        const greenVal = Number(k.green) || 0;
        const netRun = Number(k.netRun) || 0;

        if (greenVal === 0 || netRun === 0) return true;

        const divider = outputConversions[effectivePressId]?.[String(k.exOmw)] || 1;
        const greenActual = greenVal * divider;

        const deviation = Math.abs(greenActual - netRun) / netRun;
        if (deviation > 0.50) {
            toast.error(
                `Groen (${formatNumber(greenActual)}) wijkt meer dan 50% af van netto oplage (${formatNumber(netRun)}).`
            );
            return false;
        }
        return true;
    }, [effectivePressId, outputConversions]);

    /** Check if we have enough data to save (Nr, Name, and Green deviation) */
    const canAutoSave = useCallback((k: Katern): boolean => {
        const { orderNr: nr, orderName: name } = latestOrderRef.current;
        if (!nr || !name) return false;
        return validateGreen(k);
    }, [validateGreen]);

    // ===================== CORE SAVE =====================
    const performSave = useCallback(async (
        k?: Katern,
        overrides?: Partial<{ is_finished: boolean; locked: boolean; opmerking: string }>
    ) => {
        if (isSavingRef.current) return;
        isSavingRef.current = true;

        const katernToSave = k || latestKaternRef.current;
        const { orderNr: nr, orderName: name } = latestOrderRef.current;

        try {
            const pbData = buildPbData(katernToSave, overrides);

            let record;
            if (katernToSave.originalId) {
                record = await pb.collection('drukwerken').update(katernToSave.originalId, pbData);
            } else {
                record = await pb.collection('drukwerken').create(pbData);
            }

            // Update cache
            await drukwerkenCache.putRecord(record, user, hasPermission);

            // Notify parent
            onAutoSaved(werkorderId, katernToSave.id, record.id, pbData.groen, pbData.rood, pbData.voltooid_op);

            // Pulse animation
            setPulseActive(true);
            setTimeout(() => setPulseActive(false), PULSE_DURATION);

            // Log post-unlock changes
            if (wasEverLockedRef.current && !overrides?.is_finished) {
                await addActivityLog({
                    action: 'Updated',
                    entity: 'FinishedJob',
                    entityId: record.id,
                    entityName: `${nr} - ${name}`,
                    details: `Wijziging na ontgrendeling: ${nr} (Versie: ${katernToSave.version || '-'})`,
                    user: user?.username || 'System',
                    press: user?.press,
                });
            }

            window.dispatchEvent(new CustomEvent('pb-drukwerken-changed'));
        } catch (error) {
            console.error('[DrukwerkRow] Auto-save failed:', error);
            toast.error('Auto-save mislukt. Probeer handmatig op te slaan.');
        } finally {
            isSavingRef.current = false;
        }
    }, [buildPbData, user, hasPermission, onAutoSaved, werkorderId, addActivityLog]);

    // ===================== TIMERS =====================

    /** Start/reset the 30-second auto-save timer. */
    const startAutoSaveTimer = useCallback(() => {
        if (latestKaternRef.current.locked) return;

        if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);

        autoSaveTimerRef.current = setTimeout(() => {
            const k = latestKaternRef.current;

            if (!canAutoSave(k)) {
                autoSaveTimerRef.current = null;
                return;
            }

            performSave(k);
            autoSaveTimerRef.current = null;
        }, AUTO_SAVE_DELAY);
    }, [validateGreen, performSave]);

    /** Start/reset the 60-second auto-finish timer (only when both green > 0 AND red > 0). */
    const startAutoFinishTimer = useCallback(() => {
        if (latestKaternRef.current.is_finished || latestKaternRef.current.locked) return;

        if (autoFinishTimerRef.current) clearTimeout(autoFinishTimerRef.current);

        const k = latestKaternRef.current;
        const greenVal = Number(k.green) || 0;
        const redVal = Number(k.red) || 0;

        if (greenVal > 0 && redVal > 0) {
            autoFinishTimerRef.current = setTimeout(async () => {
                const currentK = latestKaternRef.current;

                if (!canAutoSave(currentK)) {
                    autoFinishTimerRef.current = null;
                    return;
                }

                // Save with lock flags
                await performSave(currentK, { is_finished: true, locked: true });

                // Update parent state
                onKaternChange(werkorderId, currentK.id, 'is_finished', true);
                onKaternChange(werkorderId, currentK.id, 'locked', true);

                // Log "Auto-voltooid"
                const { orderNr: nr, orderName: name } = latestOrderRef.current;
                await addActivityLog({
                    action: 'Updated',
                    entity: 'FinishedJob',
                    entityId: currentK.originalId || currentK.id,
                    entityName: `${nr} - ${name}`,
                    details: `Auto-voltooid: ${nr} (Versie: ${currentK.version || '-'})`,
                    user: user?.username || 'System',
                    press: user?.press,
                });

                toast.success(`Versie "${currentK.version || '-'}" automatisch voltooid.`);
                autoFinishTimerRef.current = null;
            }, AUTO_FINISH_DELAY);
        }
    }, [validateGreen, performSave, werkorderId, onKaternChange, addActivityLog, user]);

    // ===================== FLUSH ON UNMOUNT =====================

    useEffect(() => {
        const handleCancelFlush = (e: any) => {
            if (e.detail === werkorderId || e.detail === katern.id) {
                if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
                if (autoFinishTimerRef.current) clearTimeout(autoFinishTimerRef.current);
                autoSaveTimerRef.current = null;
                autoFinishTimerRef.current = null;
            }
        };
        window.addEventListener('cancel-drukwerk-flush', handleCancelFlush);
        return () => window.removeEventListener('cancel-drukwerk-flush', handleCancelFlush);
    }, [werkorderId, katern.id]);

    // Keep flushRef up to date with latest dependencies
    useEffect(() => {
        flushRef.current = () => {
            const hasActiveSave = !!autoSaveTimerRef.current;
            const hasActiveFinish = !!autoFinishTimerRef.current;

            if (hasActiveSave || hasActiveFinish) {
                if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
                if (autoFinishTimerRef.current) clearTimeout(autoFinishTimerRef.current);

                autoSaveTimerRef.current = null;
                autoFinishTimerRef.current = null;

                const k = latestKaternRef.current;

                // If we were about to finish, or if we are finishing now, ensure we lock
                const shouldLock = hasActiveFinish || (Number(k.green) > 0 && Number(k.red) > 0);

                if (!isSavingRef.current && canAutoSave(k)) {
                    // Fire-and-forget — component is unmounting
                    const pbData = buildPbData(k, shouldLock ? { is_finished: true, locked: true } : undefined);

                    if (k.originalId) {
                        pb.collection('drukwerken').update(k.originalId, pbData).catch(e =>
                            console.error('[DrukwerkRow] Flush update failed:', e)
                        );
                    } else {
                        pb.collection('drukwerken').create(pbData).catch(e =>
                            console.error('[DrukwerkRow] Flush create failed:', e)
                        );
                    }

                    // Update local cache as well to be safe
                    drukwerkenCache.putRecord({ ...pbData, id: k.originalId || '' } as any, user, hasPermission);

                    // ALSO update the locked cache directly if we are locking
                    if (shouldLock) {
                        addToLockedCache(k.id, k.originalId);
                    }
                }
            }
        };
    }, [validateGreen, buildPbData, user, hasPermission]);

    useEffect(() => {
        return () => {
            flushRef.current();
            if (autoFinishTimerRef.current) clearTimeout(autoFinishTimerRef.current);
        };
    }, []);

    // ===================== CHANGE HANDLER =====================

    /** Wraps parent onKaternChange + starts timers. */
    const handleChange = useCallback((field: keyof Katern, value: any) => {
        onKaternChange(werkorderId, katern.id, field, value);
        startAutoSaveTimer();
        startAutoFinishTimer();
    }, [werkorderId, katern.id, onKaternChange, startAutoSaveTimer, startAutoFinishTimer]);

    const handleCommentBlur = async () => {
        if (katern.originalId && commentValue !== (katern.opmerking || '')) {
            try {
                await pb.collection('drukwerken').update(katern.originalId, { opmerking: commentValue });
                onKaternChange(werkorderId, katern.id, 'opmerking', commentValue);
                toast.success('Opmerking opgeslagen.');
            } catch (error) {
                console.error('[DrukwerkRow] Comment update failed:', error);
                toast.error('Opmerking opslaan mislukt.');
            }
        } else if (!katern.originalId && commentValue !== (katern.opmerking || '')) {
            onKaternChange(werkorderId, katern.id, 'opmerking', commentValue);
        }
    };

    // ===================== UNLOCK HANDLER =====================

    const handleUnlock = useCallback(async () => {
        onKaternChange(werkorderId, katern.id, 'locked', false);
        onKaternChange(werkorderId, katern.id, 'is_finished', false);

        if (katern.originalId) {
            try {
                await pb.collection('drukwerken').update(katern.originalId, {
                    locked: false,
                    is_finished: false,
                });

                const { orderNr: nr, orderName: name } = latestOrderRef.current;
                await addActivityLog({
                    action: 'Updated',
                    entity: 'FinishedJob',
                    entityId: katern.originalId,
                    entityName: `${nr} - ${name}`,
                    details: `Ontgrendeld: ${nr} (Versie: ${katern.version || '-'})`,
                    user: user?.username || 'System',
                    press: user?.press,
                });

                toast.success(`Versie "${katern.version || '-'}" ontgrendeld.`);
            } catch (error) {
                console.error('[DrukwerkRow] Unlock failed:', error);
                toast.error('Ontgrendelen mislukt.');
            }
        }
    }, [werkorderId, katern.id, katern.originalId, katern.version, onKaternChange, addActivityLog, user]);

    // ===================== COMPUTED VALUES =====================

    const isLocked = !!katern.is_finished && !!katern.locked;
    const divider = outputConversions[effectivePressId]?.[String(katern.exOmw)] || 1;

    const jobWithOrderInfo: any = {
        ...katern,
        orderNr,
        orderName,
        pressName: effectivePress,
    };

    const maxGrossFormula = getFormulaForColumn('maxGross');
    const maxGrossVal = maxGrossFormula
        ? evaluateFormula(maxGrossFormula.formula, jobWithOrderInfo, parameters, activePresses) as number
        : katern.maxGross;

    const jobWithCalculatedMaxGross: any = {
        ...jobWithOrderInfo,
        maxGross: maxGrossVal,
        green: Number(katern.green) || 0,
        red: Number(katern.red) || 0,
    };

    const initialJobForEvaluation: any = {
        ...jobWithCalculatedMaxGross,
        green: (Number(katern.green) || 0) * divider,
        red: (Number(katern.red) || 0) * divider,
        maxGross: maxGrossVal,
        delta_number: 0,
    };

    // Pre-calculate delta_number so it's available for delta_percentage formula
    const deltaFormula = getFormulaForColumn('delta_number');
    const calculatedDelta = deltaFormula
        ? evaluateFormula(deltaFormula.formula, initialJobForEvaluation, parameters, activePresses)
        : 0;

    const jobForEvaluation: any = {
        ...initialJobForEvaluation,
        delta_number: Number(calculatedDelta) || 0,
        delta: Number(calculatedDelta) || 0, // Fallback for old formulas
    };

    // ===================== RENDER =====================

    const inputBaseClass = (locked: boolean) =>
        cn("h-9 px-2 border-gray-200", locked ? "bg-gray-100 text-gray-500" : "bg-white");

    const smallInputBaseClass = (locked: boolean) =>
        cn("h-9 px-1 text-[10px] border-gray-200", locked ? "bg-gray-100 text-gray-500" : "bg-white");

    return (
        <>
            <TableRow
                className={cn(
                    "hover:bg-blue-50/70 [&>td]:hover:bg-blue-50/70 transition-colors group",
                    isLocked && "bg-gray-50",
                    pulseActive && "animate-save-pulse"
                )}
            >
                {/* Version */}
                <TableCell>
                    <div className="flex gap-0 items-center">
                        {!hideVolgorde && (katern.volgorde !== undefined && katern.volgorde !== null) && (
                            <>
                                <div className="flex flex-col items-center justify-center min-w-[64px] h-9 bg-gray-50 border border-gray-200 rounded-md shadow-sm flex-shrink-0">
                                    <span className="text-[9px] uppercase text-gray-400 font-bold leading-none mb-0.5"></span>
                                    <span className="text-[11px] font-bold text-gray-700 leading-none">{katern.volgorde}</span>
                                </div>
                                <div className="self-stretch w-px bg-gray-300 mx-1.5 flex-shrink-0" />
                            </>
                        )}
                        {!hideKatern && (katern.signatureId !== undefined && katern.signatureId !== null) && (
                            <>
                                <div className="flex flex-col items-center justify-center min-w-[52px] h-9 bg-gray-50 border border-gray-200 rounded-md shadow-sm flex-shrink-0">
                                    <span className="text-[9px] uppercase text-gray-400 font-bold leading-none mb-0.5"></span>
                                    <span className="text-[11px] font-bold text-gray-700 leading-none">{katern.signatureId}</span>
                                </div>
                                <div className="self-stretch w-px bg-black mx-1.5 flex-shrink-0" />
                            </>
                        )}
                        <Input
                            value={katern.version}
                            onChange={(e) => handleChange('version', e.target.value)}
                            className={cn(inputBaseClass(isLocked), "flex-1")}
                            disabled={isLocked}
                        />
                        <div className="w-2 flex-shrink-0" />
                        <div className={cn(
                            "inline-flex items-center border rounded-md h-10 bg-white shadow-sm hover:shadow-md transition-all duration-300",
                            (() => {
                                const hasComment = !!commentValue;
                                const hasDensityData = !!(katern.papier_id || katern.cmyk_naam || katern.front_k || katern.front_c || katern.front_m || katern.front_y || katern.back_k || katern.back_c || katern.back_m || katern.back_y);
                                return (hasComment || hasDensityData || showComment || showCmyk) ? "border-gray-300 bg-gray-50/50" : "border-gray-200";
                            })()
                        )}>
                            {(() => {
                                const hasComment = !!commentValue;
                                return (
                                    <>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className={cn(
                                                "h-full min-w-[40px] rounded-none group/btn1 justify-center p-0 transition-colors duration-300",
                                                (showComment || hasComment)
                                                    ? "text-blue-600 bg-blue-50/50"
                                                    : "text-gray-400 hover:text-blue-600 hover:bg-blue-50/30"
                                            )}
                                            onClick={() => setShowComment(!showComment)}
                                        >
                                            <span className="flex items-center justify-center">
                                                <span className="flex items-center justify-center w-10 h-10 flex-shrink-0">
                                                    <MessageSquare
                                                        className="size-5"
                                                        fill={(showComment || hasComment) ? "currentColor" : "none"}
                                                    />
                                                </span>
                                                <span className={cn(
                                                    "font-semibold text-[13px] whitespace-nowrap overflow-hidden transition-all duration-300 delay-300 group-hover/btn1:delay-0",
                                                    (showComment || hasComment)
                                                        ? "opacity-100 max-w-[150px] ml-1 pr-3"
                                                        : "opacity-0 max-w-0 group-hover/btn1:opacity-100 group-hover/btn1:max-w-[150px] group-hover/btn1:ml-1 group-hover/btn1:pr-3"
                                                )}>
                                                    opmerking
                                                </span>
                                            </span>
                                        </Button>
                                        <div className="self-stretch w-px bg-gray-200 flex-shrink-0" />
                                    </>
                                );
                            })()}

                            {(() => {
                                const hasDensityData = !!(katern.papier_id || katern.cmyk_naam || katern.front_k || katern.front_c || katern.front_m || katern.front_y || katern.back_k || katern.back_c || katern.back_m || katern.back_y);
                                return (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className={cn(
                                            "h-full min-w-[40px] rounded-none group/btn2 justify-center p-0 transition-colors duration-300",
                                            (showCmyk || hasDensityData)
                                                ? "text-green-600 bg-green-50/50"
                                                : "text-gray-400 hover:text-green-600 hover:bg-green-50/30"
                                        )}
                                        onClick={() => setShowCmyk(!showCmyk)}
                                    >
                                        <span className="flex items-center justify-center">
                                            <span className="flex items-center justify-center w-10 h-10 flex-shrink-0">
                                                <CmykIcon
                                                    className="!w-7 !h-6 shrink-0"
                                                    colored={showCmyk || hasDensityData}
                                                />
                                            </span>
                                            <span className={cn(
                                                "font-semibold text-[13px] whitespace-nowrap overflow-hidden transition-all duration-300 delay-300 group-hover/btn2:delay-0",
                                                (showCmyk || hasDensityData)
                                                    ? "opacity-100 max-w-[150px] ml-1 pr-3"
                                                    : "opacity-0 max-w-0 group-hover/btn2:opacity-100 group-hover/btn2:max-w-[150px] group-hover/btn2:ml-1 group-hover/btn2:pr-3"
                                            )}>
                                                Densiteit
                                            </span>
                                        </span>
                                    </Button>
                                );
                            })()}
                        </div>
                    </div>
                </TableCell>

                {/* Pages */}
                <TableCell className="text-right">
                    <FormattedNumberInput
                        value={katern.pages || null}
                        onChange={(val) => handleChange('pages', val)}
                        className={cn(inputBaseClass(isLocked), "text-right")}
                        disabled={isLocked}
                    />
                </TableCell>

                {/* Ex/Omw */}
                <TableCell>
                    <Select
                        value={String(katern.exOmw || '1')}
                        onValueChange={(val) => handleChange('exOmw', val)}
                        disabled={isLocked}
                    >
                        <SelectTrigger className={cn(inputBaseClass(isLocked), "text-center")}>
                            <SelectValue placeholder="Deler" />
                        </SelectTrigger>
                        <SelectContent>
                            {(() => {
                                const pressExOmwKeys = Object.keys(outputConversions[effectivePressId] || {})
                                    .sort((a, b) => Number(a) - Number(b));
                                const options = pressExOmwKeys.length > 0 ? pressExOmwKeys : ['1', '2', '4'];
                                return options.map(val => (
                                    <SelectItem key={val} value={val}>{val}</SelectItem>
                                ));
                            })()}
                        </SelectContent>
                    </Select>
                </TableCell>

                {/* Net Run (Oplage) */}
                <TableCell className="text-right border-r border-black">
                    <FormattedNumberInput
                        value={katern.netRun || null}
                        onChange={(val) => handleChange('netRun', val)}
                        className={cn(inputBaseClass(isLocked), "text-right")}
                        disabled={isLocked}
                    />
                </TableCell>

                {/* Startup */}
                <TableCell className="text-center">
                    <Checkbox
                        checked={katern.startup}
                        onCheckedChange={(checked) => handleChange('startup', checked)}
                        disabled={isLocked}
                    />
                </TableCell>

                {/* Color channels: 4/4 */}
                <TableCell className="px-0">
                    <FormattedNumberInput
                        value={katern.c4_4 || null}
                        onChange={(val) => handleChange('c4_4', val)}
                        className={smallInputBaseClass(isLocked)}
                        disabled={isLocked}
                    />
                </TableCell>

                {/* 4/0 */}
                <TableCell className="px-0">
                    <FormattedNumberInput
                        value={katern.c4_0 || null}
                        onChange={(val) => handleChange('c4_0', val)}
                        className={smallInputBaseClass(isLocked)}
                        disabled={isLocked}
                    />
                </TableCell>

                {/* 1/0 */}
                <TableCell className="px-0">
                    <FormattedNumberInput
                        value={katern.c1_0 || null}
                        onChange={(val) => handleChange('c1_0', val)}
                        className={smallInputBaseClass(isLocked)}
                        disabled={isLocked}
                    />
                </TableCell>

                {/* 1/1 */}
                <TableCell className="px-0">
                    <FormattedNumberInput
                        value={katern.c1_1 || null}
                        onChange={(val) => handleChange('c1_1', val)}
                        className={smallInputBaseClass(isLocked)}
                        disabled={isLocked}
                    />
                </TableCell>

                {/* 4/1 */}
                <TableCell className="px-0 border-r border-black">
                    <FormattedNumberInput
                        value={katern.c4_1 || null}
                        onChange={(val) => handleChange('c4_1', val)}
                        className={smallInputBaseClass(isLocked)}
                        disabled={isLocked}
                    />
                </TableCell>

                {/* Max Gross */}
                <TableCell className="text-right border-r border-black">
                    <div className="flex flex-col items-center">
                        <FormulaResultWithTooltip
                            formula={maxGrossFormula?.formula || ''}
                            job={jobWithOrderInfo}
                            variant="maxGross"
                            parameters={parameters}
                            activePresses={activePresses}
                            result={maxGrossVal !== null ? maxGrossVal : 0}
                            outputConversions={outputConversions}
                            pressMap={pressMap}
                        />
                    </div>
                </TableCell>

                {/* Green (Goed) */}
                <TableCell className="text-right">
                    <div className="flex flex-col items-end">
                        <FormattedNumberInput
                            value={katern.green}
                            onChange={(val) => handleChange('green', val)}
                            className={cn(inputBaseClass(isLocked), "text-right")}
                            disabled={isLocked}
                        />
                        {divider > 1 && (
                            <div className="min-h-[12px] mb-1 flex items-center pr-2">
                                <span className="text-[9px] text-gray-900 font-medium leading-none">
                                    {((Number(katern.green) || 0) * divider).toLocaleString('nl-BE')}
                                </span>
                            </div>
                        )}
                    </div>
                </TableCell>

                {/* Red (Mislukt) */}
                <TableCell className="text-right border-r border-black">
                    <div className="flex flex-col items-end">
                        <FormattedNumberInput
                            value={katern.red}
                            onChange={(val) => handleChange('red', val)}
                            className={cn(inputBaseClass(isLocked), "text-right")}
                            disabled={isLocked}
                        />
                        {divider > 1 && (
                            <div className="min-h-[12px] mb-1 flex items-center pr-2">
                                <span className="text-[9px] text-gray-900 font-medium leading-none">
                                    {((Number(katern.red) || 0) * divider).toLocaleString('nl-BE')}
                                </span>
                            </div>
                        )}
                    </div>
                </TableCell>

                {/* Delta */}
                <TableCell className="text-right font-medium">
                    {(() => {
                        const f = getFormulaForColumn('delta_number');
                        const resRaw = f ? evaluateFormula(f.formula, jobForEvaluation, parameters, activePresses) : 0;
                        const res = Number(resRaw) || 0;
                        return (
                            <FormulaResultWithTooltip
                                formula={f?.formula || ''}
                                job={jobWithCalculatedMaxGross}
                                parameters={parameters}
                                activePresses={activePresses}
                                variant="delta"
                                result={res}
                                outputConversions={outputConversions}
                                pressMap={pressMap}
                            />
                        );
                    })()}
                </TableCell>

                {/* Delta % */}
                <TableCell className="text-right font-medium border-r border-black">
                    {(() => {
                        const f = getFormulaForColumn('delta_percentage');
                        if (f) {
                            const resultRaw = evaluateFormula(f.formula, jobForEvaluation, parameters, activePresses);
                            let numericValue = typeof resultRaw === 'number'
                                ? resultRaw
                                : parseFloat((resultRaw as string || '0').replace(/\./g, '').replace(',', '.'));

                            // Normalization logic: if result is around 1 (e.g., 0.95), convert to relative (e.g., -0.05)
                            if (numericValue > 0.5) {
                                numericValue -= 1;
                            }

                            return (
                                <FormulaResultWithTooltip
                                    formula={f.formula}
                                    job={jobWithCalculatedMaxGross}
                                    parameters={parameters}
                                    activePresses={activePresses}
                                    decimals={2}
                                    result={numericValue * 100}
                                    outputConversions={outputConversions}
                                    pressMap={pressMap}
                                    suffix="%"
                                    hideTooltip={true}
                                />
                            );
                        }
                        let dp = katern.deltaPercentage || 0;
                        if (dp > 0.5) dp -= 1;
                        return `${formatNumber(dp * 100, 2)}%`;
                    })()}
                </TableCell>

                {/* Actions */}
                <TableCell className="border-r border-black">
                    <div className="flex gap-0.5 items-center justify-center">
                        {isLocked && (
                            <Button
                                size="sm"
                                variant="ghost"
                                className="hover:bg-blue-100 text-blue-600 h-8 w-8 p-0"
                                onClick={handleUnlock}
                                title="Ontgrendelen"
                            >
                                <Pencil className="w-4 h-4" />
                            </Button>
                        )}
                        <Button
                            size="sm"
                            variant="ghost"
                            className="hover:bg-red-100 text-red-500 h-8 w-8 p-0"
                            onClick={() => onDeleteKatern(werkorderId, katern.id)}
                            disabled={isLocked}
                        >
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    </div>
                </TableCell>
            </TableRow>
            {showComment && (
                <TableRow className={cn("bg-blue-50/10", isLocked && "bg-gray-50/50")}>
                    <TableCell colSpan={16} className="p-0 border-b-0">
                        <div className="mx-4 my-2 pl-4 py-2 border-l-2 border-blue-400 bg-white/60 shadow-sm rounded-r-md">
                            <Textarea
                                ref={textareaRef}
                                value={commentValue}
                                onChange={(e) => {
                                    setCommentValue(e.target.value);
                                    adjustTextareaHeight();
                                }}
                                onBlur={handleCommentBlur}
                                placeholder="Voeg hier een opmerking toe voor deze versie..."
                                className="min-h-[40px] resize-none border-0 focus-visible:ring-0 px-0 rounded-none shadow-none text-sm bg-transparent overflow-hidden"
                                disabled={isLocked}
                            />
                        </div>
                    </TableCell>
                </TableRow>
            )}
            {showCmyk && (
                <TableRow className={cn("bg-green-50/10", isLocked && "bg-gray-50/50")}>
                    <TableCell colSpan={16} className="p-0 border-b-0">
                        <div className="mx-4 my-2 pl-4 py-3 border-l-2 border-green-400 bg-white/60 shadow-sm rounded-r-md">
                            <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                                {/* Col 1 - Row 1: Naam */}
                                <div className="flex flex-col gap-1">
                                    <Label className="text-xs text-gray-500">Naam</Label>
                                    <Input
                                        value={katern.cmyk_naam || ''}
                                        onChange={(e) => handleChange('cmyk_naam', e.target.value)}
                                        placeholder="bv. Basis - roze insteker"
                                        className={cn("h-9 border-gray-200", isLocked ? "bg-gray-100 text-gray-500" : "bg-white")}
                                        disabled={isLocked}
                                    />
                                </div>
                                {/* Col 2 - Row 1: Front KCMY */}
                                <div className="flex items-end gap-2">
                                    <Label className="text-xs font-semibold text-gray-600 w-10 pb-1">Front</Label>
                                    {(['K', 'C', 'M', 'Y'] as const).map(channel => {
                                        const fieldKey = `front_${channel.toLowerCase()}` as keyof Katern;
                                        const colorMap = { K: 'border-gray-800', C: 'border-cyan-500', M: 'border-pink-500', Y: 'border-yellow-500' };
                                        return (
                                            <div key={`front-${channel}`} className="flex flex-col items-center gap-0.5">
                                                <Label className="text-[10px] text-gray-400">{channel}</Label>
                                                <FormattedNumberInput
                                                    value={katern[fieldKey] as number | null}
                                                    onChange={(val) => handleChange(fieldKey, val)}
                                                    decimals={2}
                                                    className={cn(
                                                        "h-8 w-[80px] text-center text-xs border-b-2 rounded-sm",
                                                        colorMap[channel],
                                                        isLocked ? "bg-gray-100 text-gray-500" : "bg-white"
                                                    )}
                                                    placeholder="0,00"
                                                    disabled={isLocked}
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                                {/* Col 1 - Row 2: Papier, Klasse, Proefprofiel, gr/m² */}
                                <div className="flex flex-wrap gap-3 items-end">
                                    <div className="flex flex-col gap-1 min-w-[160px] flex-1">
                                        <Label className="text-xs text-gray-500">Papier</Label>
                                        <Select
                                            value={katern.papier_id || ''}
                                            onValueChange={(val) => {
                                                const selected = papierList.find(p => p.id === val);
                                                handleChange('papier_id', val);
                                                if (selected) {
                                                    handleChange('papier_klasse', selected.klasse || '');
                                                    handleChange('papier_proef_profiel', selected.proef_profiel || '');
                                                    handleChange('papier_gram', selected.gram_per_m2);

                                                    // Only apply start densities if they are not all 0 and current densities are 0
                                                    const hasStartDensities = (selected.start_front_k || 0) + (selected.start_front_c || 0) + (selected.start_front_m || 0) + (selected.start_front_y || 0) > 0;
                                                    const currentFrontDensities = (katern.front_k || 0) + (katern.front_c || 0) + (katern.front_m || 0) + (katern.front_y || 0);

                                                    if (hasStartDensities && currentFrontDensities === 0) {
                                                        handleChange('front_k', selected.start_front_k || 0);
                                                        handleChange('front_c', selected.start_front_c || 0);
                                                        handleChange('front_m', selected.start_front_m || 0);
                                                        handleChange('front_y', selected.start_front_y || 0);
                                                        handleChange('back_k', selected.start_back_k || 0);
                                                        handleChange('back_c', selected.start_back_c || 0);
                                                        handleChange('back_m', selected.start_back_m || 0);
                                                        handleChange('back_y', selected.start_back_y || 0);
                                                    }
                                                }
                                            }}
                                            disabled={isLocked}
                                        >
                                            <SelectTrigger className={cn("h-9 bg-white border-gray-200", isLocked && "bg-gray-100 text-gray-500")}>
                                                <SelectValue placeholder="Selecteer papier..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {papierList.map(p => (
                                                    <SelectItem key={p.id} value={p.id}>
                                                        {p.naam}{p.gram_per_m2 ? ` (${p.gram_per_m2} gr)` : ''}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="flex flex-col gap-1 w-[100px]">
                                        <Label className="text-xs text-gray-500">Klasse</Label>
                                        <Input
                                            value={katern.papier_klasse || ''}
                                            readOnly
                                            className="h-9 bg-gray-50 border-gray-200 text-gray-600"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1 w-[120px]">
                                        <Label className="text-xs text-gray-500">Proefprofiel</Label>
                                        <Input
                                            value={katern.papier_proef_profiel || ''}
                                            readOnly
                                            className="h-9 bg-gray-50 border-gray-200 text-gray-600"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1 w-[70px]">
                                        <Label className="text-xs text-gray-500">gr/m²</Label>
                                        <Input
                                            value={katern.papier_gram != null ? String(katern.papier_gram) : ''}
                                            readOnly
                                            className="h-9 bg-gray-50 border-gray-200 text-gray-600 text-right"
                                        />
                                    </div>
                                </div>
                                {/* Col 2 - Row 2: Back KCMY */}
                                <div className="flex items-end gap-2">
                                    <Label className="text-xs font-semibold text-gray-600 w-10 pb-1">Back</Label>
                                    {(['K', 'C', 'M', 'Y'] as const).map(channel => {
                                        const fieldKey = `back_${channel.toLowerCase()}` as keyof Katern;
                                        const colorMap = { K: 'border-gray-800', C: 'border-cyan-500', M: 'border-pink-500', Y: 'border-yellow-500' };
                                        return (
                                            <div key={`back-${channel}`} className="flex flex-col items-center gap-0.5">
                                                <Label className="text-[10px] text-gray-400">{channel}</Label>
                                                <FormattedNumberInput
                                                    value={katern[fieldKey] as number | null}
                                                    onChange={(val) => handleChange(fieldKey, val)}
                                                    decimals={2}
                                                    className={cn(
                                                        "h-8 w-[80px] text-center text-xs border-b-2 rounded-sm",
                                                        colorMap[channel],
                                                        isLocked ? "bg-gray-100 text-gray-500" : "bg-white"
                                                    )}
                                                    placeholder="0,00"
                                                    disabled={isLocked}
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </TableCell>
                </TableRow>
            )}
        </>
    );
}
