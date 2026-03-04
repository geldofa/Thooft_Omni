import { useState, useEffect, useCallback } from 'react';
import { pb } from './AuthContext';
import { pdf } from '@react-pdf/renderer';
import { PageHeader } from './PageHeader';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import {
    CalendarClock, PlayCircle, RefreshCw, CheckCircle2,
    Clock, AlertCircle, Loader2, Database
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from './ui/utils';
import { MaintenanceReportPDF } from './pdf/MaintenanceReportPDF';
import type { ColumnDef } from './pdf/MaintenanceReportPDF';
import { getStatusInfo } from '../utils/StatusUtils';
import {
    format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
    startOfYear, endOfYear, subDays, subWeeks, subMonths, subYears, addDays,
} from 'date-fns';

// ─── Types ────────────────────────────────────────────────────────────────────

type TaskStatus = 'idle' | 'pending' | 'running' | 'done' | 'failed';

interface ScheduledTask {
    id: string;
    name: string;
    type: 'report' | 'backup';
    interval: string;
    lastRun: Date | null;
    nextRun: Date | null;
    status: TaskStatus;
    preset?: any;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ALL_COLUMN_DEFS: ColumnDef[] = [
    { id: 'taskName', label: 'Taak', field: 'taskName' },
    { id: 'interval', label: 'Interval', field: 'interval' },
    { id: 'completedOn', label: 'Laatste onderhoud', field: 'completedOn' },
    { id: 'executedBy', label: 'Uitvoerder', field: 'executedBy' },
    { id: 'note', label: 'Opmerking', field: 'note' },
    { id: 'daysDiff', label: 'Dagen Over', field: 'daysDiff' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildPeriodFilter(period: string, status: string): string {
    const fmt = (d: Date) => format(d, 'yyyy-MM-dd HH:mm:ss');
    const todayStart = fmt(startOfDay(new Date()));
    if (status === 'Nu Nodig') {
        if (period === 'Alles overtijd') return `next_date < "${todayStart}"`;
        if (period === '> 6 maanden') return `next_date < "${fmt(subMonths(startOfDay(new Date()), 6))}"`;
        if (period === '> 1 jaar') return `next_date < "${fmt(subYears(startOfDay(new Date()), 1))}"`;
    }
    if (status === 'Binnenkort') {
        if (period === 'Deze Week') return `next_date >= "${todayStart}" && next_date <= "${fmt(endOfWeek(new Date(), { weekStartsOn: 1 }))}"`;
        if (period === '14 Dagen') return `next_date >= "${todayStart}" && next_date <= "${fmt(endOfDay(addDays(new Date(), 14)))}"`;
        if (period === 'Deze Maand') return `next_date >= "${todayStart}" && next_date <= "${fmt(endOfMonth(new Date()))}"`;
    }
    if (status === 'Voltooid') {
        const ref = new Date();
        let start: Date, end: Date;
        switch (period) {
            case 'Vandaag': start = startOfDay(ref); end = endOfDay(ref); break;
            case 'Gisteren': start = startOfDay(subDays(ref, 1)); end = endOfDay(subDays(ref, 1)); break;
            case 'Deze Week': start = startOfWeek(ref, { weekStartsOn: 1 }); end = endOfWeek(ref, { weekStartsOn: 1 }); break;
            case 'Vorige Week': { const p = subWeeks(ref, 1); start = startOfWeek(p, { weekStartsOn: 1 }); end = endOfWeek(p, { weekStartsOn: 1 }); break; }
            case 'Deze Maand': start = startOfMonth(ref); end = endOfMonth(ref); break;
            case 'Vorige Maand': { const p = subMonths(ref, 1); start = startOfMonth(p); end = endOfMonth(p); break; }
            case 'Dit Jaar': start = startOfYear(ref); end = endOfYear(ref); break;
            case 'Vorig Jaar': { const p = subYears(ref, 1); start = startOfYear(p); end = endOfYear(p); break; }
            default: return '';
        }
        return `last_date >= "${fmt(start)}" && last_date <= "${fmt(end)}"`;
    }
    return '';
}

function matchesStatus(nextDate: Date | null, status: string): boolean {
    const todayStart = startOfDay(new Date());
    if (status === 'Nu Nodig') return !!nextDate && nextDate < todayStart;
    if (status === 'Binnenkort') return !!nextDate && nextDate >= todayStart;
    return true;
}

function formatInterval(val: number, unit: string) {
    if (!val) return '-';
    return `${val} ${unit}`;
}

function formatDateNL(dateStr: string | null) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
}

function getNextRunDate(preset: any): Date | null {
    if (!preset.auto_generate) return null;
    const now = new Date();
    const hour = preset.settings?.schedule_hour ?? 0;
    const interval = preset.period || 'week';
    let next = new Date(now);
    next.setHours(hour, 0, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);

    if (interval === 'day') return next;
    if (interval === 'week') {
        const targetDay = preset.settings?.schedule_weekday;
        if (targetDay === undefined) return next;
        const jsDayMap: Record<number, number> = { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 0 };
        const targetJsDay = jsDayMap[targetDay];
        while (next.getDay() !== targetJsDay) next.setDate(next.getDate() + 1);
        return next;
    }
    if (interval === 'month') {
        const dayType = preset.settings?.schedule_day_type || 'first_day';
        const exactDay = preset.settings?.schedule_exact_day || 1;
        const findMonthRun = (date: Date): Date => {
            let d = new Date(date.getFullYear(), date.getMonth(), 1, hour, 0, 0, 0);
            if (dayType === 'last_day') d = new Date(date.getFullYear(), date.getMonth() + 1, 0, hour, 0, 0, 0);
            else if (dayType === 'exact_day') d.setDate(exactDay);
            else if (dayType === 'first_weekday') {
                const fd = d.getDay();
                if (fd === 6) d.setDate(3);
                else if (fd === 0) d.setDate(2);
            }
            return d;
        };
        let nextRun = findMonthRun(next);
        if (nextRun <= now) nextRun = findMonthRun(new Date(next.getFullYear(), next.getMonth() + 1, 1));
        return nextRun;
    }
    if (interval === 'year') {
        const month = preset.settings?.schedule_month || 1;
        let nextRun = new Date(now.getFullYear(), month - 1, 1, hour, 0, 0, 0);
        if (nextRun <= now) nextRun.setFullYear(now.getFullYear() + 1);
        return nextRun;
    }
    return null;
}

function intervalLabel(preset: any): string {
    const p = preset.period;
    if (p === 'day') return 'Dagelijks';
    if (p === 'week') return 'Wekelijks';
    if (p === 'month') return 'Maandelijks';
    if (p === 'year') return 'Jaarlijks';
    return p || '-';
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SystemTasks() {
    const [tasks, setTasks] = useState<ScheduledTask[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [runningIds, setRunningIds] = useState<Set<string>>(new Set());
    const [autoRanIds, setAutoRanIds] = useState<Set<string>>(new Set());

    const fetchTasks = useCallback(async () => {
        setIsLoading(true);
        try {
            // 1. Fetch data in parallel
            const [presets, archiveFiles, backupsRes] = await Promise.all([
                pb.collection('maintenance_reports').getFullList({ sort: 'name' }),
                pb.collection('report_files').getFullList({ sort: '-generated_at' }),
                fetch(`${pb.baseUrl}/api/backups`, {
                    headers: { 'Authorization': pb.authStore.token }
                }).then(res => res.ok ? res.json() : [])
            ]);

            // 2. Map Report Presets
            const reportTasks: ScheduledTask[] = presets.map((p: any) => {
                const lastRun = p.last_run ? new Date(p.last_run) : null;
                const nextRun = getNextRunDate(p);

                const files = archiveFiles.filter((f: any) => f.maintenance_report === p.id);
                const latestFile = files[0] ?? null;
                const latestFileDate = latestFile ? new Date(latestFile.generated_at) : null;

                // Pending: backend fired (last_run updated) but no matching PDF yet (within 5 min grace)
                const isPending = lastRun && (!latestFileDate || lastRun.getTime() > latestFileDate.getTime() + 300_000);

                return {
                    id: p.id,
                    name: p.name,
                    type: 'report',
                    interval: intervalLabel(p),
                    lastRun,
                    nextRun: p.auto_generate ? nextRun : null,
                    status: isPending ? 'pending' : (latestFileDate ? 'done' : 'idle'),
                    preset: p,
                };
            });

            // 3. Map System Backup (Static task placeholder)
            const latestBackup = Array.isArray(backupsRes) ? backupsRes.sort((a: any, b: any) =>
                new Date(b.modified).getTime() - new Date(a.modified).getTime())[0] : null;

            const backupTask: ScheduledTask = {
                id: 'system_backup',
                name: 'Systeem Backup (Full)',
                type: 'backup',
                interval: 'Dagelijks (00:00)',
                lastRun: latestBackup ? new Date(latestBackup.modified) : null,
                nextRun: new Date(new Date().setHours(24, 0, 0, 0)), // Next midnight
                status: 'idle', // Backups are handled by PB directly or cron
            };

            setTasks([...reportTasks, backupTask]);
        } catch (e) {
            console.error('[SystemTasks] Fetch failed:', e);
            toast.error('Fout bij ophalen taken');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { fetchTasks(); }, [fetchTasks]);

    // Auto-run pending tasks once on mount
    useEffect(() => {
        if (isLoading) return;
        tasks.forEach(t => {
            if (t.status === 'pending' && !autoRanIds.has(t.id) && !runningIds.has(t.id)) {
                setAutoRanIds(prev => new Set(prev).add(t.id));
                runTask(t, 'auto');
            }
        });
    }, [isLoading]);  // eslint-disable-line react-hooks/exhaustive-deps

    const runTask = useCallback(async (task: ScheduledTask, trigger: 'manual' | 'auto' = 'manual') => {
        setRunningIds(prev => new Set(prev).add(task.id));
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'running' } : t));
        if (trigger === 'manual') toast.info(`Uitvoeren: ${task.name}...`);

        try {
            if (task.type === 'backup') {
                // Trigger PocketBase Backup
                const res = await fetch(`${pb.baseUrl}/api/backups`, {
                    method: 'POST',
                    headers: {
                        'Authorization': pb.authStore.token,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ name: `manual_${format(new Date(), 'yyyyMMdd_HHmm')}.zip` })
                });

                if (!res.ok) throw new Error(`Backup failed: ${res.status}`);

                toast.success(`Systeem Backup gestart`);
                // Give it a moment then refresh
                setTimeout(fetchTasks, 2000);
            } else {
                // Trigger Report Generation (Original logic)
                if (!task.preset) return;
                const preset = task.preset;
                const s = preset.settings || { selectedPress: 'Alle persen', selectedPeriod: 'Alles overtijd', selectedStatus: 'Nu Nodig' };

                const filters: string[] = [];
                if (s.selectedPress && s.selectedPress !== 'Alle persen') {
                    filters.push(`pers.naam = "${s.selectedPress}"`);
                }
                const periodFilter = buildPeriodFilter(s.selectedPeriod, s.selectedStatus);
                if (periodFilter) filters.push(periodFilter);

                const records = await pb.collection('onderhoud').getFullList({
                    filter: filters.join(' && ') || undefined,
                    expand: 'category,pers,assigned_operator,assigned_team',
                });

                const mapped = [];
                for (const r of records as any[]) {
                    const nDate = r.next_date ? new Date(r.next_date) : null;
                    if (!matchesStatus(nDate, s.selectedStatus)) continue;

                    let dDiff = 0;
                    if (nDate) {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        dDiff = Math.ceil((nDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                    }

                    const ops = Array.isArray(r.expand?.assigned_operator) ? r.expand.assigned_operator : r.expand?.assigned_operator ? [r.expand.assigned_operator] : [];
                    const tms = Array.isArray(r.expand?.assigned_team) ? r.expand.assigned_team : r.expand?.assigned_team ? [r.expand.assigned_team] : [];
                    const exBy = [...ops, ...tms].map((o: any) => o.naam || o.name || 'Onbekend').join(', ') || '-';

                    mapped.push({
                        id: r.id,
                        category: r.expand?.category?.naam || 'Overig',
                        press: r.expand?.pers?.naam || 'Onbekend',
                        parentTask: r.task || '-',
                        taskName: r.subtask || r.task || '-',
                        interval: formatInterval(r.interval || 0, r.interval_unit || 'Dagen'),
                        completedOn: formatDateNL(r.last_date),
                        executedBy: exBy,
                        note: r.opmerkingen || '',
                        statusKey: getStatusInfo(nDate).key,
                        daysDiff: dDiff,
                    });
                }

                const selectedColumnIds: string[] = s.selectedColumns || ALL_COLUMN_DEFS.map(c => c.id);
                const visibleColumns = ALL_COLUMN_DEFS.filter(c => selectedColumnIds.includes(c.id));
                const dateStr = format(new Date(), 'yyyy-MM-dd_HH-mm');
                const filename = `${preset.name.replace(/\s+/g, '_')}_${dateStr}.pdf`;

                const blob = await pdf(
                    <MaintenanceReportPDF
                        tasks={mapped as any}
                        reportTitle={preset.name}
                        selectedPress={s.selectedPress || 'Alle persen'}
                        selectedPeriod={s.selectedPeriod || '-'}
                        selectedStatus={s.selectedStatus || '-'}
                        generatedAt={new Date().toLocaleDateString('nl-NL')}
                        columns={visibleColumns}
                        fontSize={s.fontSize || 9}
                        marginH={s.marginH || 30}
                        marginV={s.marginV || 10}
                        columnWidths={s.columnWidths || {}}
                    />
                ).toBlob();

                const fd = new FormData();
                fd.append('file', blob, filename);
                fd.append('maintenance_report', preset.id);
                fd.append('generated_at', new Date().toISOString());
                fd.append('trigger', trigger);
                fd.append('created_by', trigger === 'manual' ? (pb.authStore.model?.username || 'Admin') : 'Systeem');

                await pb.collection('report_files').create(fd);
                await pb.collection('maintenance_reports').update(preset.id, { last_run: new Date().toISOString() });

                if (trigger === 'manual') toast.success(`Rapport "${preset.name}" gegenereerd`);
                else toast.success(`[Auto] "${preset.name}" aangemaakt`);
            }

            setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'done', lastRun: new Date() } : t));
        } catch (e) {
            console.error('[SystemTasks] Task failed:', e);
            toast.error(`Fout bij uitvoeren: ${task.name}`);
            setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'failed' } : t));
        } finally {
            setRunningIds(prev => { const su = new Set(prev); su.delete(task.id); return su; });
        }
    }, [fetchTasks]); // Added fetchTasks to dependencies

    const statusBadge = (status: TaskStatus, isAuto: boolean) => {
        if (status === 'running') return <Badge className="bg-blue-50 text-blue-700 border-none gap-1 font-bold"><Loader2 className="w-3 h-3 animate-spin" /> Bezig</Badge>;
        if (status === 'pending') return <Badge className="bg-orange-50 text-orange-700 border-none gap-1 font-bold"><Clock className="w-3 h-3" /> In wachtrij</Badge>;
        if (status === 'done') return <Badge className="bg-green-50 text-green-700 border-none gap-1 font-bold"><CheckCircle2 className="w-3 h-3" /> Voltooid</Badge>;
        if (status === 'failed') return <Badge className="bg-red-50 text-red-700 border-none gap-1 font-bold"><AlertCircle className="w-3 h-3" /> Mislukt</Badge>;
        if (!isAuto) return <Badge className="bg-slate-50 text-slate-500 border-none font-bold">Handmatig</Badge>;
        return <Badge className="bg-slate-50 text-slate-500 border-none font-bold">Actief</Badge>;
    };

    return (
        <div className="w-full h-full flex flex-col gap-6 overflow-auto pb-4">
            <div className="flex items-center justify-between shrink-0">
                <PageHeader
                    title="Geplande Taken"
                    description="Automatische rapporten en systeemtaken. Taken in wachtrij worden automatisch uitgevoerd."
                    icon={CalendarClock}
                    iconColor="text-indigo-600"
                    iconBgColor="bg-indigo-50"
                    className="mb-0"
                />
                <Button
                    variant="outline"
                    onClick={fetchTasks}
                    disabled={isLoading}
                    className="gap-2 border-indigo-100 text-indigo-700 hover:bg-indigo-50"
                >
                    <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
                    Vernieuwen
                </Button>
            </div>

            <Card className="border-indigo-100 shadow-sm overflow-hidden">
                <CardHeader className="pb-3 border-b bg-slate-50/50">
                    <CardTitle className="text-sm font-bold text-slate-700">Automatische Rapporten</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-32 text-slate-400">
                            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Laden...
                        </div>
                    ) : tasks.length === 0 ? (
                        <div className="flex items-center justify-center h-32 text-slate-400 italic text-sm">
                            Geen geplande rapporten gevonden.
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-50/30">
                                    <TableHead className="text-[10px] uppercase tracking-wider font-black text-slate-500 pl-6">Taak</TableHead>
                                    <TableHead className="text-[10px] uppercase tracking-wider font-black text-slate-500">Interval</TableHead>
                                    <TableHead className="text-[10px] uppercase tracking-wider font-black text-slate-500">Laatste Run</TableHead>
                                    <TableHead className="text-[10px] uppercase tracking-wider font-black text-slate-500">Volgende Run</TableHead>
                                    <TableHead className="text-[10px] uppercase tracking-wider font-black text-slate-500">Status</TableHead>
                                    <TableHead className="text-[10px] uppercase tracking-wider font-black text-slate-500 pr-6 text-right">Actie</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {tasks.map(task => {
                                    const isRunning = runningIds.has(task.id);
                                    return (
                                        <TableRow key={task.id} className="hover:bg-indigo-50/20 transition-colors">
                                            <TableCell className="pl-6">
                                                <div className="flex items-center gap-2">
                                                    <div className={cn("p-1.5 rounded-md",
                                                        task.type === 'backup' ? "bg-amber-50" : "bg-indigo-50"
                                                    )}>
                                                        {task.type === 'backup' ? (
                                                            <Database className="w-3.5 h-3.5 text-amber-500" />
                                                        ) : task.preset?.auto_generate ? (
                                                            <RefreshCw className="w-3.5 h-3.5 text-indigo-500" />
                                                        ) : (
                                                            <CalendarClock className="w-3.5 h-3.5 text-slate-400" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-sm text-slate-800">{task.name}</p>
                                                        <p className="text-[10px] text-slate-400">{task.preset?.description || (task.type === 'backup' ? 'Volledige database backup zip' : '')}</p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-xs font-semibold text-slate-600">{task.interval}</span>
                                            </TableCell>
                                            <TableCell>
                                                {task.lastRun
                                                    ? <span className="text-xs text-slate-600">{task.lastRun.toLocaleString('nl-NL', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                                                    : <span className="text-xs text-slate-400 italic">Nog niet uitgevoerd</span>
                                                }
                                            </TableCell>
                                            <TableCell>
                                                {task.nextRun
                                                    ? <span className="text-xs font-bold text-indigo-600">{task.nextRun.toLocaleString('nl-NL', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                                                    : <span className="text-xs text-slate-400 italic">—</span>
                                                }
                                            </TableCell>
                                            <TableCell>
                                                {statusBadge(task.status, task.preset?.auto_generate)}
                                            </TableCell>
                                            <TableCell className="text-right pr-6">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => runTask(task, 'manual')}
                                                    disabled={isRunning}
                                                    className="gap-1.5 h-8 text-xs border-indigo-100 text-indigo-700 hover:bg-indigo-50"
                                                >
                                                    {isRunning
                                                        ? <Loader2 className="w-3 h-3 animate-spin" />
                                                        : <PlayCircle className="w-3 h-3" />
                                                    }
                                                    Nu Uitvoeren
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
