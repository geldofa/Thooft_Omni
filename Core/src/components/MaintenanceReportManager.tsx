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
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Plus, Save, FileText, ChevronsUpDown, Trash2, Mail, Calendar as CalendarIcon, Settings, Play } from 'lucide-react';
import { PageHeader } from './PageHeader';
import { toast } from 'sonner';
import { pb, Press, MaintenanceTask } from './AuthContext';
import { cn } from './ui/utils';
import { generateMaintenanceReport } from '../utils/pdfGenerator';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';

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
}

interface MaintenanceReportManagerProps {
    tasks?: MaintenanceTask[];
}

export function MaintenanceReportManager({ tasks = [] }: MaintenanceReportManagerProps) {
    const [reports, setReports] = useState<MaintenanceReport[]>([]);
    const [presses, setPresses] = useState<Press[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        try {
            setIsLoading(true);
            const [reportsData, pressesData] = await Promise.all([
                pb.collection('maintenance_reports').getFullList<MaintenanceReport>(),
                pb.collection('persen').getFullList({ sort: 'naam' })
            ]);

            setReports(reportsData);
            setPresses(pressesData.map((p: any) => ({
                id: p.id,
                name: p.naam,
                active: p.active,
                archived: p.archived,
                category_order: p.category_order
            })));
        } catch (error) {
            console.error("Error fetching data:", error);
            toast.error("Kon gegevens niet laden");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleNewReport = () => {
        setExpandedId('new');
    };

    return (
        <div className="flex flex-col h-[calc(100vh-140px)]">
            <PageHeader
                title="Onderhoudsrapportage Beheer"
                description="Configureer automatische rapportages en e-mail instellingen"
                icon={FileText}
                actions={
                    <Button type="button" onClick={handleNewReport} className="gap-2 bg-blue-600 hover:bg-blue-700 shadow-md" disabled={isLoading}>
                        <Plus className="w-4 h-4" />
                        Nieuw Rapport
                    </Button>
                }
            />

            <div className="flex-1 overflow-hidden mt-4">
                <ScrollArea className="h-full pr-4">
                    <div className="space-y-4 pb-10">
                        {isLoading && !reports.length && (
                            <div className="flex flex-col items-center justify-center p-20 border-2 border-dashed rounded-xl bg-gray-50/50 text-gray-400">
                                <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mb-4" />
                                <p className="text-sm">Gegevens laden...</p>
                            </div>
                        )}

                        {expandedId === 'new' && (
                            <ReportItem
                                report={null}
                                presses={presses}
                                tasks={tasks}
                                onSave={() => {
                                    setExpandedId(null);
                                    fetchData();
                                }}
                                onCancel={() => setExpandedId(null)}
                                isExpanded={true}
                                onDelete={() => setExpandedId(null)}
                            />
                        )}

                        {reports.map((report) => (
                            <ReportItem
                                key={report.id}
                                report={report}
                                presses={presses}
                                tasks={tasks}
                                onSave={() => {
                                    setExpandedId(null);
                                    fetchData();
                                }}
                                onCancel={() => setExpandedId(expandedId === report.id ? null : expandedId)}
                                isExpanded={expandedId === report.id}
                                onToggle={() => setExpandedId(expandedId === report.id ? null : report.id)}
                                onDelete={() => {
                                    setExpandedId(null);
                                    fetchData();
                                }}
                            />
                        ))}

                        {!isLoading && reports.length === 0 && expandedId !== 'new' && (
                            <div className="flex flex-col items-center justify-center p-20 border-2 border-dashed rounded-xl bg-gray-50/50 text-gray-400">
                                <FileText className="w-12 h-12 mb-4 opacity-20" />
                                <p className="text-lg font-medium">Nog geen rapporten geconfigureerd</p>
                                <Button variant="outline" onClick={handleNewReport} className="mt-4">
                                    Maak je eerste rapport
                                </Button>
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </div>
        </div>
    );
}

interface ReportItemProps {
    report: MaintenanceReport | null; // null for new
    presses: Press[];
    tasks: MaintenanceTask[];
    isExpanded: boolean;
    onToggle?: () => void;
    onSave: () => void;
    onCancel: () => void;
    onDelete: () => void;
}

function ReportItem({ report, presses, tasks, isExpanded, onToggle, onSave, onCancel, onDelete }: ReportItemProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [name, setName] = useState(report?.name || '');
    const [selectedPressIds, setSelectedPressIds] = useState<string[]>(Array.isArray(report?.press_ids) ? report.press_ids : []);
    const [period, setPeriod] = useState<MaintenanceReport['period']>(report?.period || 'week');
    const [isRolling, setIsRolling] = useState(report?.is_rolling !== false);
    const [autoGenerate, setAutoGenerate] = useState(report?.auto_generate || false);
    const [scheduleDay, setScheduleDay] = useState(report?.schedule_day || 1);
    const [periodOffset, setPeriodOffset] = useState(report?.period_offset || 0);
    const [emailEnabled, setEmailEnabled] = useState(report?.email_enabled || false);
    const [emailRecipients, setEmailRecipients] = useState(report?.email_recipients || '');
    const [emailSubject, setEmailSubject] = useState(report?.email_subject || '');
    const [scheduleHour, setScheduleHour] = useState(report?.schedule_hour ?? 9);
    const [scheduleWeekdays, setScheduleWeekdays] = useState<string[]>(report?.schedule_weekdays || ['1']);
    const [scheduleMonthType, setScheduleMonthType] = useState(report?.schedule_month_type || 'first_day');
    const [customDate, setCustomDate] = useState<Date | undefined>(report?.custom_date ? new Date(report.custom_date) : undefined);

    // Update state when report changes
    useEffect(() => {
        if (report) {
            setName(report.name);
            setSelectedPressIds(Array.isArray(report.press_ids) ? report.press_ids : []);
            setPeriod(report.period);
            setIsRolling(report.is_rolling !== false);
            setAutoGenerate(report.auto_generate);
            setScheduleDay(report.schedule_day || 1);
            setPeriodOffset(report.period_offset || 0);
            setEmailEnabled(report.email_enabled);
            setEmailRecipients(report.email_recipients || '');
            setEmailSubject(report.email_subject || '');
            setScheduleHour(report.schedule_hour ?? 9);
            setScheduleWeekdays(report.schedule_weekdays || ['1']);
            setScheduleMonthType(report.schedule_month_type || 'first_day');
            setCustomDate(report.custom_date ? new Date(report.custom_date) : undefined);
        }
    }, [report]);

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
                custom_date: customDate ? customDate.toISOString() : null
            };

            if (report?.id) {
                await pb.collection('maintenance_reports').update(report.id, data);
                toast.success("Rapport configuratie bijgewerkt");
            } else {
                await pb.collection('maintenance_reports').create(data);
                toast.success("Nieuw rapport aangemaakt");
            }
            onSave();
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
            onDelete();
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
                const periodMap: Record<string, number> = {
                    'day': 1, 'week': 7, 'month': 30, 'year': 365
                };
                endDate = baseDate;
                if (period === 'month') {
                    startDate = subMonths(baseDate, 1);
                } else if (period === 'year') {
                    startDate = subYears(baseDate, 1);
                } else {
                    startDate = subDays(baseDate, periodMap[period] || 7);
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
                if (!task.lastMaintenance) return false;
                const doneDate = new Date(task.lastMaintenance);
                return doneDate >= startDate && doneDate <= endDate;
            });

            const selectedPressObjects = presses.filter(p => selectedPressIds.includes(p.id));

            let periodLabel: string = period;
            if (!isRolling) {
                const y = baseDate.getFullYear();
                if (period === 'day') {
                    periodLabel = format(baseDate, 'dd-MM-yyyy', { locale: nl });
                } else if (period === 'week') {
                    const w = format(baseDate, 'ww');
                    const startStr = format(startDate, 'dd/MM');
                    const endStr = format(endDate, 'dd/MM');
                    periodLabel = `${y} | W${w} | ${startStr} - ${endStr}`;
                } else if (period === 'month') {
                    periodLabel = format(baseDate, 'yyyy | MMMM', { locale: nl });
                } else if (period === 'year') {
                    periodLabel = format(baseDate, 'yyyy', { locale: nl });
                }
            } else {
                const map: Record<string, string> = { 'day': 'Laatste 24u', 'week': 'Laatste 7 dagen', 'month': 'Laatste 30 dagen', 'year': 'Laatste jaar' };
                periodLabel = map[period] || period;
            }

            const fileRecord = await generateMaintenanceReport({
                period: periodLabel,
                tasks: filteredTasks,
                reportId: report?.id || undefined,
                reportName: name,
                selectedPresses: selectedPressObjects
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
                    window.open(fileUrl, '_blank');
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

    const safeSelectedPressIds = Array.isArray(selectedPressIds) ? selectedPressIds : [];

    return (
        <Card className={cn(
            "transition-all duration-300 overflow-hidden border-l-4",
            isExpanded ? "ring-2 ring-blue-500/20 border-l-blue-500 shadow-xl" : "hover:border-l-blue-400 border-l-transparent shadow-sm hover:shadow-md cursor-pointer"
        )} onClick={!isExpanded ? onToggle : undefined}>
            {/* Header / Summary View */}
            <div className="p-4 flex items-start justify-between">
                <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg text-gray-900">{name || "Nieuw Rapport"}</h3>
                        {!isExpanded && autoGenerate && (
                            <Badge variant="secondary" className="text-[10px] text-green-700 border-green-200 uppercase tracking-wider">Auto</Badge>
                        )}
                    </div>

                    {!isExpanded && (
                        <div className="flex flex-wrap gap-2">
                            <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-none flex items-center gap-1.5 font-normal">
                                <CalendarIcon className="w-3 h-3" />
                                <span className="capitalize">{period}</span>
                                {isRolling ? '(Rolling)' : '(Strict)'}
                            </Badge>

                            <Badge variant="secondary" className="bg-gray-100 text-gray-700 border-none flex items-center gap-1.5 font-normal">
                                <FileText className="w-3 h-3" />
                                {safeSelectedPressIds.length === 0 ? "Alle persen" : `${safeSelectedPressIds.length} persen`}
                            </Badge>

                            {emailEnabled && (
                                <Badge variant="secondary" className="bg-orange-50 text-orange-700 border-none flex items-center gap-1.5 font-normal">
                                    <Mail className="w-3 h-3" />
                                    Email actief
                                </Badge>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                    {!isExpanded && report && (
                        <Button variant="ghost" size="sm" onClick={handlePreview} disabled={isLoading} className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                            <Play className="w-4 h-4 mr-1.5" />
                            Preview
                        </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={isExpanded ? onCancel : onToggle}>
                        <ChevronsUpDown className={cn("w-4 h-4 text-gray-400 transition-transform", isExpanded && "rotate-180")} />
                    </Button>
                </div>
            </div>

            {/* Expanded Content */}
            {isExpanded && (
                <div className="px-6 pb-6 pt-2 border-t bg-gray-50/30">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Left Column: Core Settings */}
                        <div className="space-y-6">
                            <div className="space-y-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="item-name" className="text-sm font-bold text-gray-700 uppercase tracking-tight">Rapport Naam</Label>
                                    <Input
                                        id="item-name"
                                        placeholder="bv. Maandelijks Overzicht Sheetfed"
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        className="bg-white"
                                    />
                                </div>

                                <div className="flex items-center justify-between p-3 rounded-lg bg-white border shadow-sm">
                                    <div className="space-y-0.5">
                                        <Label className="font-semibold">Periode Type</Label>
                                        <p className="text-[10px] text-gray-500">{isRolling ? "Rolling (laatste X dagen)" : "Strict (kalender periode)"}</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={cn("text-[10px]", !isRolling ? "font-bold text-blue-600 uppercase" : "text-gray-400 uppercase tracking-wide")}>Strict</span>
                                        <Switch checked={isRolling} onCheckedChange={setIsRolling} />
                                        <span className={cn("text-[10px]", isRolling ? "font-bold text-blue-600 uppercase" : "text-gray-400 uppercase tracking-wide")}>Rolling</span>
                                    </div>
                                </div>

                                {/* Period Preset Selection (Only for Strict) */}
                                {!isRolling && (
                                    <div className="space-y-3 p-4 bg-white border rounded-xl shadow-sm">
                                        <Label className="text-xs font-bold text-gray-500 uppercase">Periode Selectie</Label>
                                        <div className="flex flex-wrap gap-2">
                                            {period === 'day' && (
                                                <>
                                                    <Button variant={periodOffset === 0 && !customDate ? "default" : "outline"} size="sm" onClick={() => { setPeriodOffset(0); setCustomDate(undefined); }} className="rounded-full px-4">Vandaag</Button>
                                                    <Button variant={periodOffset === -1 ? "default" : "outline"} size="sm" onClick={() => { setPeriodOffset(-1); setCustomDate(undefined); }} className="rounded-full px-4">Gisteren</Button>
                                                    <Popover>
                                                        <PopoverTrigger asChild>
                                                            <Button variant={customDate ? "default" : "outline"} size="sm" className="rounded-full px-4 gap-2">
                                                                <CalendarIcon className="w-3.5 h-3.5" />
                                                                {customDate ? format(customDate, 'dd MMM yyyy', { locale: nl }) : 'Datum kiezer'}
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
                                                    <Button variant={periodOffset === 0 ? "default" : "outline"} size="sm" onClick={() => setPeriodOffset(0)} className="rounded-full px-4">Deze week</Button>
                                                    <Button variant={periodOffset === -1 ? "default" : "outline"} size="sm" onClick={() => setPeriodOffset(-1)} className="rounded-full px-4">Vorige week</Button>
                                                </>
                                            )}
                                            {period === 'month' && (
                                                <>
                                                    <Button variant={periodOffset === 0 ? "default" : "outline"} size="sm" onClick={() => setPeriodOffset(0)} className="rounded-full px-4">Deze maand</Button>
                                                    <Button variant={periodOffset === -1 ? "default" : "outline"} size="sm" onClick={() => setPeriodOffset(-1)} className="rounded-full px-4">Vorige maand</Button>
                                                </>
                                            )}
                                            {period === 'year' && (
                                                <>
                                                    <Button variant={periodOffset === 0 ? "default" : "outline"} size="sm" onClick={() => setPeriodOffset(0)} className="rounded-full px-4">Dit jaar</Button>
                                                    <Button variant={periodOffset === -1 ? "default" : "outline"} size="sm" onClick={() => setPeriodOffset(-1)} className="rounded-full px-4">Vorig jaar</Button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {isRolling && (
                                    <div className="grid gap-2 p-3 bg-white border rounded-xl shadow-sm">
                                        <Label className="text-xs font-bold text-gray-500 uppercase">Configuratie (Rolling)</Label>
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs text-gray-500">Offset:</span>
                                            <Input
                                                type="number"
                                                value={periodOffset}
                                                onChange={e => setPeriodOffset(parseInt(e.target.value) || 0)}
                                                className="h-8 w-20"
                                            />
                                            <span className="text-[10px] text-gray-400">Bv. -1 voor een periode terug</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-3">
                                <Label className="text-sm font-bold text-gray-700 uppercase tracking-tight">Geselecteerde Persen</Label>
                                <div className="flex flex-wrap gap-2">
                                    <Button
                                        variant={safeSelectedPressIds.length === 0 ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => setSelectedPressIds([])}
                                        className={cn("rounded-full px-4", safeSelectedPressIds.length === 0 ? "bg-blue-600 hover:bg-blue-700 border-blue-600 text-white" : "")}
                                    >
                                        Alle persen
                                    </Button>
                                    {presses.map(press => (
                                        <Button
                                            key={press.id}
                                            variant={safeSelectedPressIds.includes(press.id) ? "default" : "outline"}
                                            size="sm"
                                            onClick={() => togglePress(press.id)}
                                            className={cn("rounded-full px-4", safeSelectedPressIds.includes(press.id) ? "bg-blue-500 hover:bg-blue-600 border-blue-500" : "")}
                                        >
                                            {press.name}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Automation & Email */}
                        <div className="space-y-6">
                            <div className="space-y-4">
                                <Label className="text-xs font-bold text-blue-600 uppercase tracking-widest flex items-center gap-2">
                                    <Settings className="w-3.5 h-3.5" />
                                    Automatisering
                                </Label>

                                <div className="space-y-4 border p-4 rounded-xl bg-white shadow-sm">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="grid gap-2">
                                            <Label className="text-xs font-semibold text-gray-500 uppercase tracking-tight">Rapport Periode</Label>
                                            <Select value={period} onValueChange={(v: any) => setPeriod(v)}>
                                                <SelectTrigger className="h-8 text-xs">
                                                    <SelectValue placeholder="Kies periode" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="day">Dag</SelectItem>
                                                    <SelectItem value="week">Week</SelectItem>
                                                    <SelectItem value="month">Maand</SelectItem>
                                                    <SelectItem value="year">Jaar</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="grid gap-2">
                                            <Label className="text-xs font-semibold text-gray-500 uppercase tracking-tight">Tijdstip (Uur)</Label>
                                            <Select value={scheduleHour.toString()} onValueChange={(v) => setScheduleHour(parseInt(v))}>
                                                <SelectTrigger className="h-8 text-xs">
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
                                        <div className="grid gap-2 pt-2 border-t border-dashed">
                                            <Label className="text-[10px] font-semibold text-gray-500 uppercase tracking-tight">Dagen van de week</Label>
                                            <div className="flex flex-wrap gap-1">
                                                {['1', '2', '3', '4', '5', '6', '0'].map((day) => {
                                                    const labels: Record<string, string> = { '1': 'Ma', '2': 'Di', '3': 'Wo', '4': 'Do', '5': 'Vr', '6': 'Za', '0': 'Zo' };
                                                    const active = scheduleWeekdays.includes(day);
                                                    return (
                                                        <Button
                                                            key={day}
                                                            variant={active ? "default" : "outline"}
                                                            size="sm"
                                                            className={cn("h-7 px-2 text-[10px] min-w-[32px] rounded-md transition-all", active ? "bg-blue-600 hover:bg-blue-700 text-white border-blue-600" : "")}
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
                                        <div className="grid gap-2 pt-2 border-t border-dashed">
                                            <Label className="text-[10px] font-semibold text-gray-500 uppercase tracking-tight">Dag in de maand</Label>
                                            <Select value={scheduleMonthType} onValueChange={setScheduleMonthType}>
                                                <SelectTrigger className="h-8 text-xs">
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
                                            <span className="text-[10px] font-medium">Auto-generatie</span>
                                            <span className="text-[9px] text-gray-400">Genereer PDF via cron</span>
                                        </div>
                                        <Switch
                                            checked={autoGenerate}
                                            onCheckedChange={setAutoGenerate}
                                            className="scale-75"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-3 opacity-50 grayscale pointer-events-none relative p-1 mt-6">
                                    <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
                                        <Badge variant="outline" className="bg-white/90 shadow-sm border-gray-300 text-gray-600 font-bold uppercase tracking-wider backdrop-blur-sm px-3 py-1">
                                            Binnenkort beschikbaar
                                        </Badge>
                                    </div>
                                    <div className="flex items-center justify-between p-1">
                                        <div className="space-y-0.5">
                                            <Label className="text-xs font-semibold text-gray-600 uppercase tracking-tight">E-mail Koppeling</Label>
                                            <p className="text-[10px] text-gray-400">Stuur rapport automatisch door</p>
                                        </div>
                                        <Switch checked={emailEnabled} onCheckedChange={setEmailEnabled} />
                                    </div>

                                    {emailEnabled && (
                                        <div className="space-y-3 pt-1 border-t border-dashed">
                                            <div className="grid gap-1">
                                                <Label className="text-[10px] font-bold text-gray-500 uppercase">Ontvangers</Label>
                                                <Input
                                                    placeholder="email@example.com"
                                                    value={emailRecipients}
                                                    onChange={e => setEmailRecipients(e.target.value)}
                                                    className="text-xs h-8 bg-white"
                                                />
                                            </div>
                                            <div className="grid gap-1">
                                                <Label className="text-[10px] font-bold text-gray-500 uppercase">Onderwerp</Label>
                                                <Input
                                                    placeholder="Onderhoudsrapport..."
                                                    value={emailSubject}
                                                    onChange={e => setEmailSubject(e.target.value)}
                                                    className="text-xs h-8 bg-white"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-between items-center mt-8 pt-4 border-t">
                        <div className="flex gap-2">
                            {report && (
                                <Button variant="ghost" size="sm" onClick={handleDelete} disabled={isLoading} className="text-red-500 hover:text-red-600 hover:bg-red-50">
                                    <Trash2 className="w-4 h-4 mr-1.5" />
                                    Verwijderen
                                </Button>
                            )}
                        </div>
                        <div className="flex gap-3">
                            <Button variant="outline" size="sm" onClick={onCancel} disabled={isLoading}>
                                Annuleren
                            </Button>
                            <Button size="sm" onClick={handlePreview} disabled={isLoading} variant="secondary">
                                <Play className="w-4 h-4 mr-1.5" />
                                Preview
                            </Button>
                            <Button size="sm" onClick={handleSave} disabled={isLoading} className="bg-blue-600 hover:bg-blue-700 px-6">
                                <Save className="w-4 h-4 mr-1.5" />
                                {report ? "Opslaan" : "Aanmaken"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </Card>
    );
}
