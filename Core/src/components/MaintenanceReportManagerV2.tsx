import { useState, useEffect, useCallback } from 'react';
import {
    format,
    startOfDay,
    endOfDay,
    startOfWeek,
    endOfWeek,
    startOfMonth,
    endOfMonth,
    startOfYear,
    endOfYear,
    addDays,
    addWeeks,
    addMonths,
    addYears,
    subDays,
    subMonths,
    subYears
} from 'date-fns';
import { nl } from 'date-fns/locale';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { pb, Press, MaintenanceTask } from './AuthContext';
import { cn } from './ui/utils';
import { generateMaintenanceReport } from '../utils/pdfGenerator';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Save, Play, Trash2, Mail, Calendar as CalendarIcon, Settings, History, Download, FileText, ChevronRight, Eye } from 'lucide-react';
import { toast } from 'sonner';

const ROLLING_PERIOD_DAYS: Record<string, number> = {
    'day': 1, 'week': 7, 'month': 30, 'year': 365
};

const ROLLING_PERIOD_LABELS: Record<string, string> = {
    'day': 'Laatste 24u', 'week': 'Laatste 7 dagen', 'month': 'Laatste 30 dagen', 'year': 'Laatste jaar'
};

interface MaintenanceReport {
    id: string;
    name: string;
    press_ids: string[];
    period: 'day' | 'week' | 'month' | 'year';
    auto_generate: boolean;
    schedule_day?: number;
    last_run?: string;
    email_enabled: boolean;
    email_recipients: string;
    email_subject: string;
    is_rolling: boolean;
    period_offset: number;
    schedule_hour?: number;
    schedule_weekdays?: string[];
    schedule_month_type?: string;
    custom_date?: string;
    export_types?: string[];
}

interface ReportFile {
    id: string;
    file: string;
    maintenance_report: string;
    generated_at: string;
    created: string;
    updated: string;
}

export interface MaintenanceReportManagerV2Props {
    configId: string | null; // 'new' means creating a new report, actual ID means edit, null means hide
    tasks?: MaintenanceTask[];
    presses?: Press[];
    initialName?: string; // New: pre-fill name for new designs
    onSave?: () => void;
    onCancel?: () => void;
    onDelete?: () => void;
    onPreviewReady?: (url: string) => void;
}

export function MaintenanceReportManagerV2({ configId, tasks = [], presses = [], initialName, onSave, onCancel, onDelete, onPreviewReady }: MaintenanceReportManagerV2Props) {
    const [report, setReport] = useState<MaintenanceReport | null>(null);
    const [isLoadingInit, setIsLoadingInit] = useState(false);

    // Editor State
    const [isLoading, setIsLoading] = useState(false);
    const [name, setName] = useState('');
    const [selectedPressIds, setSelectedPressIds] = useState<string[]>([]);
    const [period, setPeriod] = useState<MaintenanceReport['period']>('week');
    const [isRolling, setIsRolling] = useState(true);
    const [autoGenerate, setAutoGenerate] = useState(false);
    const [scheduleDay, setScheduleDay] = useState(1);
    const [periodOffset, setPeriodOffset] = useState(0);
    const [emailEnabled, setEmailEnabled] = useState(false);
    const [emailRecipients, setEmailRecipients] = useState('');
    const [emailSubject, setEmailSubject] = useState('');
    const [scheduleHour, setScheduleHour] = useState(9);
    const [scheduleWeekdays, setScheduleWeekdays] = useState<string[]>(['1']);
    const [scheduleMonthType, setScheduleMonthType] = useState('first_day');
    const [customDate, setCustomDate] = useState<Date | undefined>(undefined);
    const [exportTypes, setExportTypes] = useState<string[]>(['overdue']);
    const [history, setHistory] = useState<ReportFile[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);

    const fetchHistory = useCallback(async (id: string) => {
        try {
            setIsLoadingHistory(true);
            const records = await pb.collection('report_files').getFullList<ReportFile>({
                filter: `maintenance_report = "${id}"`,
                sort: '-generated_at',
            });
            setHistory(records);
        } catch (error) {
            console.error("Error fetching report history:", error);
        } finally {
            setIsLoadingHistory(false);
        }
    }, []);

    const initializeData = useCallback(async () => {
        if (!configId) return;

        if (configId === 'new') {
            setReport(null);
            setName(initialName || '');
            setSelectedPressIds([]);
            setPeriod('week');
            setIsRolling(true);
            setAutoGenerate(false);
            setScheduleDay(1);
            setPeriodOffset(0);
            setEmailEnabled(false);
            setEmailRecipients('');
            setEmailSubject('');
            setScheduleHour(9);
            setScheduleWeekdays(['1']);
            setScheduleMonthType('first_day');
            setCustomDate(undefined);
            setExportTypes(['overdue']);
            setHistory([]);
            return;
        }

        try {
            setIsLoadingInit(true);
            const reportData = await pb.collection('maintenance_reports').getOne<MaintenanceReport>(configId);
            setReport(reportData);

            setName(reportData.name);
            setSelectedPressIds(Array.isArray(reportData.press_ids) ? reportData.press_ids : []);
            setPeriod(reportData.period);
            setIsRolling(reportData.is_rolling !== false);
            setAutoGenerate(reportData.auto_generate);
            setScheduleDay(reportData.schedule_day || 1);
            setPeriodOffset(reportData.period_offset || 0);
            setEmailEnabled(reportData.email_enabled);
            setEmailRecipients(reportData.email_recipients || '');
            setEmailSubject(reportData.email_subject || '');
            setScheduleHour(reportData.schedule_hour ?? 9);
            setScheduleWeekdays(reportData.schedule_weekdays || ['1']);
            setScheduleMonthType(reportData.schedule_month_type || 'first_day');
            setCustomDate(reportData.custom_date ? new Date(reportData.custom_date) : undefined);
            setExportTypes(Array.isArray(reportData.export_types) && reportData.export_types.length > 0 ? reportData.export_types : ['executed']);

            fetchHistory(configId);
        } catch (error) {
            console.error("Error fetching report config:", error);
            toast.error("Kon configuratie niet laden");
        } finally {
            setIsLoadingInit(false);
        }
    }, [configId, fetchHistory]);


    useEffect(() => {
        initializeData();
    }, [initializeData]);

    const handleSave = async () => {
        if (!name.trim()) {
            toast.error("Geef het rapport een naam");
            return;
        }

        try {
            setIsLoading(true);
            const data = {
                name,
                press_ids: selectedPressIds,
                period,
                auto_generate: autoGenerate,
                schedule_day: scheduleDay,
                period_offset: periodOffset,
                email_enabled: emailEnabled,
                email_recipients: emailRecipients,
                email_subject: emailSubject,
                is_rolling: isRolling,
                schedule_hour: scheduleHour,
                schedule_weekdays: scheduleWeekdays,
                schedule_month_type: scheduleMonthType,
                custom_date: customDate ? customDate.toISOString() : null,
                export_types: exportTypes
            };

            if (report?.id) {
                await pb.collection('maintenance_reports').update(report.id, data);
                toast.success("Rapport configuratie bijgewerkt");
            } else {
                await pb.collection('maintenance_reports').create(data);
                toast.success("Nieuw rapport aangemaakt");
            }
            onSave?.();
        } catch (error) {
            console.error("Error saving report:", error);
            toast.error("Kon rapport niet opslaan");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!report?.id) return;
        if (!confirm("Weet je zeker dat je deze configuratie wilt verwijderen?")) return;

        try {
            setIsLoading(true);
            await pb.collection('maintenance_reports').delete(report.id);
            toast.success("Rapport verwijderd");
            onDelete?.();
        } catch (error) {
            console.error("Error deleting report:", error);
            toast.error("Kon rapport niet verwijderen");
        } finally {
            setIsLoading(false);
        }
    };

    const handlePreview = async (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsLoading(true);
        try {
            let baseDate = new Date();

            // Priority 1: Custom Date (Only for Day reports in Strict mode)
            if (!isRolling && period === 'day' && customDate) {
                baseDate = customDate;
            }
            // Priority 2: Period Offset
            else if (periodOffset !== 0) {
                if (period === 'day') baseDate = addDays(baseDate, periodOffset);
                else if (period === 'week') baseDate = addWeeks(baseDate, periodOffset);
                else if (period === 'month') baseDate = addMonths(baseDate, periodOffset);
                else if (period === 'year') baseDate = addYears(baseDate, periodOffset);
            }

            let startDate = new Date();
            let endDate = new Date();

            if (isRolling) {
                endDate = baseDate;
                if (period === 'month') {
                    startDate = subMonths(baseDate, 1);
                } else if (period === 'year') {
                    startDate = subYears(baseDate, 1);
                } else {
                    startDate = subDays(baseDate, ROLLING_PERIOD_DAYS[period] || 7);
                }
            } else {
                if (period === 'day') {
                    startDate = startOfDay(baseDate);
                    endDate = endOfDay(baseDate);
                } else if (period === 'week') {
                    startDate = startOfWeek(baseDate, { weekStartsOn: 1 });
                    endDate = endOfWeek(baseDate, { weekStartsOn: 1 });
                } else if (period === 'month') {
                    startDate = startOfMonth(baseDate);
                    endDate = endOfMonth(baseDate);
                } else if (period === 'year') {
                    startDate = startOfYear(baseDate);
                    endDate = endOfYear(baseDate);
                }
            }

            const filteredTasks = tasks.filter(task => {
                if (selectedPressIds.length > 0 && !selectedPressIds.includes(task.pressId)) return false;

                const now = new Date();
                const today = startOfDay(now);
                const nextMaintenance = new Date(task.nextMaintenance);
                const lastMaintenance = task.lastMaintenance ? new Date(task.lastMaintenance) : null;

                const results = [];

                if (exportTypes.includes('executed') && lastMaintenance) {
                    results.push(lastMaintenance >= startDate && lastMaintenance <= endDate);
                }

                if (exportTypes.includes('overdue')) {
                    results.push(nextMaintenance < today);
                }

                if (exportTypes.includes('soon')) {
                    const soonLimit = addDays(today, 30);
                    results.push(nextMaintenance >= today && nextMaintenance <= soonLimit);
                }

                if (exportTypes.includes('this_week')) {
                    const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
                    results.push(nextMaintenance >= today && nextMaintenance <= weekEnd);
                }

                return results.some(r => r === true);
            });

            const selectedPressObjects = presses.filter(p => selectedPressIds.includes(p.id));

            let periodLabel: string = period;
            let outputDetails: string = '';

            if (!isRolling) {
                const y = baseDate.getFullYear();
                if (period === 'day') {
                    periodLabel = format(baseDate, 'dd-MM-yyyy', { locale: nl });
                    outputDetails = format(baseDate, 'yyyy_MM_dd');
                } else if (period === 'week') {
                    const w = format(baseDate, 'ww');
                    const startStr = format(startDate, 'dd/MM');
                    const endStr = format(endDate, 'dd/MM');
                    periodLabel = `${y} | W${w} | ${startStr} - ${endStr}`;
                    outputDetails = format(baseDate, "yyyy_'W'ww");
                } else if (period === 'month') {
                    periodLabel = format(baseDate, 'yyyy | MMMM', { locale: nl });
                    outputDetails = format(baseDate, "yyyy_MM");
                } else if (period === 'year') {
                    periodLabel = format(baseDate, 'yyyy', { locale: nl });
                    outputDetails = format(baseDate, 'yyyy');
                }
            } else {
                periodLabel = ROLLING_PERIOD_LABELS[period] || period;
                if (period === 'day') outputDetails = `Rolling_Dag_${format(baseDate, 'yyyy_MM_dd')}`;
                else if (period === 'week') outputDetails = `Rolling_Week_${format(baseDate, 'yyyy_MM_dd')}`;
                else if (period === 'month') outputDetails = `Rolling_Maand_${format(baseDate, 'yyyy_MM_dd')}`;
                else if (period === 'year') outputDetails = `Rolling_Jaar_${format(baseDate, 'yyyy_MM_dd')}`;
            }

            if (selectedPressIds.length > 0) {
                const pressSuffix = selectedPressObjects.map(p => p.name).join('_');
                outputDetails += `_${pressSuffix}`;
            }

            // Construct Final Filename: [PresetName]_[Details]_[HHmm] (Manual UI Export)
            const timestamp = format(new Date(), 'HHmm');
            const baseName = name || 'Maintenance_Report';

            // Refinement: Simplify "Onderhoud nu nodig" filename
            let effectiveDetails = outputDetails;
            if (baseName === 'Onderhoud nu nodig') {
                effectiveDetails = effectiveDetails.replace(/Rolling_(Dag|Week|Maand|Jaar)_/i, '');
            }

            let outputName = `${baseName}_${effectiveDetails}_${timestamp}`;

            // Sanitize filename: remove spaces and special characters
            outputName = outputName.replace(/[\s\W]+/g, '_').replace(/^_|_$/g, '');

            const fileRecord = await generateMaintenanceReport({
                period: periodLabel,
                tasks: filteredTasks,
                reportId: report?.id || undefined,
                reportName: name,
                selectedPresses: selectedPressObjects,
                fileName: outputName,
                exportTypes: exportTypes,
                startDate,
                endDate
            });

            if (fileRecord) {
                let finalRecord = fileRecord;
                if (!finalRecord.file && finalRecord.id) {
                    try {
                        finalRecord = await pb.collection('report_files').getOne(finalRecord.id);
                    } catch (e) {
                        console.warn("Fallback fetch failed", e);
                    }
                }
                if (finalRecord && finalRecord.file) {
                    const fileUrl = pb.files.getURL(finalRecord, finalRecord.file);
                    if (onPreviewReady) {
                        onPreviewReady(fileUrl);
                    } else {
                        window.open(fileUrl + "?download=1", '_blank');
                    }
                    if (report?.id) fetchHistory(report.id);
                } else {
                    toast.error("Preview bestand niet gevonden of geen toegang");
                }
            }
        } catch (error) {
            console.error("Preview generation failed:", error);
            toast.error("Kon preview niet genereren");
        } finally {
            setIsLoading(false);
        }
    };

    const togglePress = (pressId: string) => {
        setSelectedPressIds(prev =>
            prev.includes(pressId)
                ? prev.filter(id => id !== pressId)
                : [...prev, pressId]
        );
    };

    if (!configId) return null;

    if (isLoadingInit) {
        return (
            <div className="flex flex-col items-center justify-center p-20 border-2 border-dashed rounded-xl bg-gray-50/50 text-gray-400">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mb-4" />
                <p className="text-sm">Configuratie laden...</p>
            </div>
        );
    }

    return (
        <div className={cn(
            "bg-transparent transition-all duration-500 flex gap-4",
            configId !== 'new' ? "max-w-[100%]" : ""
        )}>
            <div className="bg-white border rounded-xl shadow-sm overflow-hidden flex-1">
                <div className="p-5">
                    <div className="space-y-5">
                        {/* Top Row: Name and Presses */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 items-end">
                            <div className="grid gap-1.5 flex-1">
                                <Label htmlFor="item-name" className="text-[10px] font-bold text-gray-700 uppercase tracking-tight">Rapport Naam</Label>
                                <Input
                                    id="item-name"
                                    placeholder="bv. Maandelijks Overzicht Sheetfed"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    className="bg-white h-9 text-sm"
                                />
                            </div>

                            <div className="space-y-2 flex-1">
                                <Label className="text-[10px] font-bold text-gray-700 uppercase tracking-tight">Persen</Label>
                                <div className="flex flex-wrap gap-1.5">
                                    <Button
                                        variant={selectedPressIds.length === 0 ? "default" : "outline"}
                                        size="xs"
                                        onClick={() => setSelectedPressIds([])}
                                        className={cn("rounded-full px-3 h-7 text-[10px]", selectedPressIds.length === 0 ? "bg-blue-600 border-blue-600 text-white" : "border-gray-200")}
                                    >
                                        Alle persen
                                    </Button>
                                    {presses.map(press => (
                                        <Button
                                            key={press.id}
                                            variant={selectedPressIds.includes(press.id) ? "default" : "outline"}
                                            size="xs"
                                            onClick={() => togglePress(press.id)}
                                            className={cn("rounded-full px-3 h-7 text-[10px]", selectedPressIds.includes(press.id) ? "bg-blue-500 border-blue-500 text-white" : "border-gray-200")}
                                        >
                                            {press.name}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Middle Row: Period and Automation */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                            {/* Left: Period Settings */}
                            <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
                                <div className="p-3 bg-gray-50/50 border-bottom border-dashed flex items-center justify-between h-[52px]">
                                    <div className="space-y-0.5">
                                        <Label className="text-xs font-bold">Periode Type</Label>
                                        <p className="text-[9px] text-gray-500 leading-none">{isRolling ? "Rolling (laatste X dagen)" : "Strict (kalender periode)"}</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={cn("text-[9px]", !isRolling ? "font-bold text-blue-600 uppercase" : "text-gray-400 uppercase")}>Strict</span>
                                        <Switch checked={isRolling} onCheckedChange={setIsRolling} className="scale-75" />
                                        <span className={cn("text-[9px]", isRolling ? "font-bold text-blue-600 uppercase" : "text-gray-400 uppercase")}>Rolling</span>
                                    </div>
                                </div>

                                {/* Period Preset Selection (Only for Strict) */}
                                {!isRolling && (
                                    <div className="space-y-2 p-3 border-t border-dashed">
                                        <Label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Periode Selectie</Label>
                                        <div className="flex flex-wrap gap-1.5">
                                            {period === 'day' && (
                                                <>
                                                    <Button variant={periodOffset === 0 && !customDate ? "default" : "outline"} size="xs" onClick={() => { setPeriodOffset(0); setCustomDate(undefined); }} className="rounded-full px-3 h-7 text-[10px]">Vandaag</Button>
                                                    <Button variant={periodOffset === -1 ? "default" : "outline"} size="xs" onClick={() => { setPeriodOffset(-1); setCustomDate(undefined); }} className="rounded-full px-3 h-7 text-[10px]">Gisteren</Button>
                                                    <Popover>
                                                        <PopoverTrigger asChild>
                                                            <Button variant={customDate ? "default" : "outline"} size="xs" className="rounded-full px-3 h-7 text-[10px] gap-2">
                                                                <CalendarIcon className="w-3 h-3" />
                                                                {customDate ? format(customDate, 'dd MMM yyyy', { locale: nl }) : 'Kies datum'}
                                                            </Button>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-auto p-0" align="start">
                                                            <Calendar
                                                                mode="single"
                                                                selected={customDate}
                                                                onSelect={(d) => { setCustomDate(d); setPeriodOffset(0); }}
                                                                initialFocus
                                                                locale={nl}
                                                            />
                                                        </PopoverContent>
                                                    </Popover>
                                                </>
                                            )}
                                            {period === 'week' && (
                                                <>
                                                    <Button variant={periodOffset === 0 ? "default" : "outline"} size="xs" onClick={() => setPeriodOffset(0)} className="rounded-full px-3 h-7 text-[10px]">Deze week</Button>
                                                    <Button variant={periodOffset === -1 ? "default" : "outline"} size="xs" onClick={() => setPeriodOffset(-1)} className="rounded-full px-3 h-7 text-[10px]">Vorige week</Button>
                                                </>
                                            )}
                                            {period === 'month' && (
                                                <>
                                                    <Button variant={periodOffset === 0 ? "default" : "outline"} size="xs" onClick={() => setPeriodOffset(0)} className="rounded-full px-3 h-7 text-[10px]">Deze maand</Button>
                                                    <Button variant={periodOffset === -1 ? "default" : "outline"} size="xs" onClick={() => setPeriodOffset(-1)} className="rounded-full px-3 h-7 text-[10px]">Vorige maand</Button>
                                                </>
                                            )}
                                            {period === 'year' && (
                                                <>
                                                    <Button variant={periodOffset === 0 ? "default" : "outline"} size="xs" onClick={() => setPeriodOffset(0)} className="rounded-full px-3 h-7 text-[10px]">Dit jaar</Button>
                                                    <Button variant={periodOffset === -1 ? "default" : "outline"} size="xs" onClick={() => setPeriodOffset(-1)} className="rounded-full px-3 h-7 text-[10px]">Vorig jaar</Button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {isRolling && (
                                    <div className="grid gap-2 p-3 border-t border-dashed">
                                        <Label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Offset (Rolling)</Label>
                                        <div className="flex items-center gap-3">
                                            <Input
                                                type="number"
                                                value={periodOffset}
                                                onChange={e => setPeriodOffset(parseInt(e.target.value) || 0)}
                                                className="h-8 w-20 text-xs"
                                            />
                                            <span className="text-[9px] text-gray-400">Bv. -1 voor een periode terug</span>
                                        </div>
                                    </div>
                                )}

                                {/* Task Status Selector (Chips) - Moved Inside */}
                                <div className="space-y-2 p-3 border-t border-dashed">
                                    <Label className="text-[10px] font-bold text-gray-700 uppercase tracking-tight">Status Selectie</Label>
                                    <div className="flex flex-wrap gap-1.5">
                                        {[
                                            { id: 'executed', label: 'Uitgevoerd' },
                                            { id: 'overdue', label: 'Overdue' },
                                            { id: 'soon', label: 'Binnenkort' },
                                            { id: 'this_week', label: 'Deze week' }
                                        ].map((type) => {
                                            const active = exportTypes.includes(type.id);
                                            return (
                                                <Button
                                                    key={type.id}
                                                    variant={active ? "default" : "outline"}
                                                    size="xs"
                                                    onClick={() => {
                                                        setExportTypes(prev =>
                                                            prev.includes(type.id)
                                                                ? (prev.length > 1 ? prev.filter(t => t !== type.id) : prev)
                                                                : [...prev, type.id]
                                                        );
                                                    }}
                                                    className={cn(
                                                        "rounded-full px-3 h-7 text-[10px] transition-all",
                                                        active ? "bg-blue-600 border-blue-600 text-white" : "border-gray-200 text-gray-500"
                                                    )}
                                                >
                                                    {type.label}
                                                </Button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>



                            {/* Right: Automation */}
                            <div className="space-y-4">
                                <div className="space-y-3 p-4 border rounded-xl bg-white shadow-sm ring-1 ring-blue-500/5 h-full">
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="p-1.5 bg-blue-50 rounded-lg">
                                            <Settings className="w-3.5 h-3.5 text-blue-600" />
                                        </div>
                                        <Label className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">
                                            Automatisering
                                        </Label>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="grid gap-1.5">
                                            <Label className="text-[9px] font-bold text-gray-500 uppercase tracking-tight">Periode</Label>
                                            <Select value={period} onValueChange={(v: any) => setPeriod(v)}>
                                                <SelectTrigger className="h-8 text-xs bg-gray-50/50">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="day">Dag</SelectItem>
                                                    <SelectItem value="week">Week</SelectItem>
                                                    <SelectItem value="month">Maand</SelectItem>
                                                    <SelectItem value="year">Jaar</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="grid gap-1.5">
                                            <Label className="text-[9px] font-bold text-gray-500 uppercase tracking-tight">Tijdstip (Uur)</Label>
                                            <Select value={scheduleHour.toString()} onValueChange={(v) => setScheduleHour(parseInt(v))}>
                                                <SelectTrigger className="h-8 text-xs bg-gray-50/50">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {Array.from({ length: 24 }).map((_, i) => (
                                                        <SelectItem key={i} value={i.toString()}>{i.toString().padStart(2, '0')}:00</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    {period === 'week' && (
                                        <div className="grid gap-1.5 pt-2 border-t border-dashed">
                                            <Label className="text-[9px] font-bold text-gray-400 uppercase">Weekdagen</Label>
                                            <div className="flex flex-wrap gap-1">
                                                {['1', '2', '3', '4', '5', '6', '0'].map((day) => {
                                                    const labels: Record<string, string> = { '1': 'Ma', '2': 'Di', '3': 'Wo', '4': 'Do', '5': 'Vr', '6': 'Za', '0': 'Zo' };
                                                    const active = scheduleWeekdays.includes(day);
                                                    return (
                                                        <Button
                                                            key={day}
                                                            variant={active ? "default" : "outline"}
                                                            size="xs"
                                                            className={cn("h-7 px-2 text-[9px] min-w-[30px] rounded-lg transition-all", active ? "bg-blue-600 border-blue-600 text-white" : "border-gray-200 text-gray-400")}
                                                            onClick={() => {
                                                                setScheduleWeekdays(prev =>
                                                                    prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
                                                                );
                                                            }}
                                                        >
                                                            {labels[day]}
                                                        </Button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {period === 'month' && (
                                        <div className="grid gap-1.5 pt-2 border-t border-dashed">
                                            <Label className="text-[9px] font-bold text-gray-400 uppercase">Maanddag</Label>
                                            <Select value={scheduleMonthType} onValueChange={setScheduleMonthType}>
                                                <SelectTrigger className="h-8 text-xs bg-gray-50/50">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="first_day">Eerste dag</SelectItem>
                                                    <SelectItem value="first_weekday">Eerste weekdag</SelectItem>
                                                    <SelectItem value="last_day">Laatste dag</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between pt-2 border-t border-dashed h-10">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold text-gray-700">Auto-generatie</span>
                                            <span className="text-[9px] text-gray-400 leading-none">PDF automatisch genereren</span>
                                        </div>
                                        <Switch
                                            checked={autoGenerate}
                                            onCheckedChange={setAutoGenerate}
                                            className="scale-75 data-[state=checked]:bg-blue-600"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Bottom Row: Email Full Width */}
                        <div className="p-3 border rounded-xl bg-gray-50/50 flex items-center justify-between relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-1.5 opacity-5 group-hover:opacity-10 transition-opacity">
                                <Mail className="w-10 h-10 text-gray-400 rotate-12" />
                            </div>
                            <div className="flex flex-col gap-0.5">
                                <div className="flex items-center gap-2">
                                    <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">E-mail Koppeling</Label>
                                    <span className="text-[9px] font-medium text-gray-500 bg-gray-200/50 px-1.5 py-0.5 rounded uppercase w-fit tracking-tighter">Binnenkort</span>
                                </div>
                                <p className="text-[9px] text-gray-400">Ontvang rapportages direct in uw inbox (Huidige release: handmatig export)</p>
                            </div>
                            <Switch checked={false} disabled className="scale-75 opacity-50" />
                        </div>
                    </div>

                    <div className="flex justify-between items-center mt-6 pt-4 border-t">
                        <div className="flex gap-2">
                            {report && (
                                <Button variant="ghost" size="xs" onClick={handleDelete} disabled={isLoading} className="text-red-500 hover:text-red-600 hover:bg-red-50 h-8 font-bold text-[10px] uppercase tracking-wide">
                                    <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                                    Vervallen
                                </Button>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <Button variant="ghost" size="sm" onClick={() => onCancel?.()} disabled={isLoading} className="text-gray-500 h-9 px-4">
                                Sluiten
                            </Button>
                            <Button size="sm" onClick={handleSave} disabled={isLoading} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md h-9 px-6 font-semibold">
                                <Save className="w-3.5 h-3.5 mr-1.5" />
                                Opslaan
                            </Button>
                            <Button size="sm" onClick={handlePreview} disabled={isLoading} variant="outline" className="border-blue-200 text-blue-600 hover:bg-blue-50 h-9 px-4">
                                <Play className="w-3.5 h-3.5 mr-1.5 fill-current" />
                                Export...
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Side Panel: History */}
                {configId !== 'new' && (
                    <div className="hidden xl:flex flex-col w-72 bg-white border rounded-xl shadow-sm overflow-hidden shrink-0 animate-in slide-in-from-right duration-500">
                        <div className="p-4 border-b bg-gray-50/50 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-blue-50 rounded-lg">
                                    <History className="w-3.5 h-3.5 text-blue-600" />
                                </div>
                                <h4 className="text-[10px] font-bold text-gray-700 uppercase tracking-widest">Export Historie</h4>
                            </div>
                            <div className="bg-gray-200 text-gray-600 text-[8px] h-4 px-1.5 rounded-full flex items-center justify-center font-bold">{history.length}</div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-2 space-y-2 max-h-[500px] min-h-[300px]">
                            {isLoadingHistory ? (
                                <div className="flex flex-col items-center justify-center h-40 gap-2 opacity-50">
                                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                                    <span className="text-[10px] uppercase font-bold tracking-tighter">Laden...</span>
                                </div>
                            ) : history.length > 0 ? (
                                history.map((item) => (
                                    <div
                                        key={item.id}
                                        className="group flex items-center justify-between p-2 rounded-lg border border-transparent hover:border-blue-100 hover:bg-blue-50/50 transition-all cursor-pointer"
                                        onClick={() => window.open(pb.files.getURL(item, item.file) + "?download=1", '_blank')}
                                    >
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            <div className="shrink-0 w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                                                <FileText className="w-3.5 h-3.5 text-gray-400 group-hover:text-blue-600" />
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-[10px] font-bold text-gray-700 truncate group-hover:text-blue-700">{item.file}</span>
                                                <span className="text-[9px] text-gray-400">{format(new Date(item.generated_at), 'dd MMM yyyy HH:mm', { locale: nl })}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="w-7 h-7 p-0 text-gray-400 hover:text-blue-600 hover:bg-blue-100/50"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    window.open(pb.files.getURL(item, item.file), '_blank');
                                                }}
                                            >
                                                <Eye className="w-3.5 h-3.5" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="w-7 h-7 p-0 text-gray-400 hover:text-blue-600 hover:bg-blue-100/50"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    window.open(pb.files.getURL(item, item.file) + "?download=1", '_blank');
                                                }}
                                            >
                                                <Download className="w-3.5 h-3.5" />
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="flex flex-col items-center justify-center h-40 text-center px-4">
                                    <History className="w-8 h-8 text-gray-100 mb-2" />
                                    <p className="text-[10px] font-bold text-gray-300 uppercase tracking-tight">Geen historie gevonden</p>
                                    <p className="text-[9px] text-gray-400 mt-1">Exporteer dit rapport om historie op te bouwen</p>
                                </div>
                            )}
                        </div>

                        <div className="p-3 border-t bg-gray-50/30">
                            <Button
                                variant="ghost"
                                size="xs"
                                className="w-full h-8 text-blue-600 font-bold text-[9px] uppercase tracking-widest hover:bg-blue-50"
                                onClick={() => window.open('/Rapport', '_blank')}
                            >
                                Open Volledig Archief
                                <ChevronRight className="w-3 h-3 ml-1" />
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
