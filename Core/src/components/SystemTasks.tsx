import { useState, useEffect, useCallback } from 'react';
import { pb, useAuth } from './AuthContext';
import { PageHeader } from './layout/PageHeader';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import {
    CalendarClock, PlayCircle, RefreshCw, CheckCircle2,
    Clock, AlertCircle, Loader2, Database, FileText
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from './ui/utils';
import { generatePresetReport } from '../utils/generateReport';
import { format } from 'date-fns';
import { formatDisplayDateTime } from '../utils/dateUtils';

// ─── Types ────────────────────────────────────────────────────────────────────

type TaskStatus = 'idle' | 'pending' | 'running' | 'done' | 'failed';

interface ScheduledTask {
    id: string;
    name: string;
    type: 'report' | 'backup' | 'jdf';
    interval: string;
    lastRun: Date | null;
    nextRun: Date | null;
    status: TaskStatus;
    preset?: any;
    description?: string;
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
    const { hasPermission } = useAuth();
    const [tasks, setTasks] = useState<ScheduledTask[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    if (!hasPermission('manage_system_tasks')) {
        return <div className="p-8 text-center text-gray-500 text-sm italic">Geen toegang tot systeem taken.</div>;
    }
    const [runningIds, setRunningIds] = useState<Set<string>>(new Set());

    const fetchTasks = useCallback(async () => {
        setIsLoading(true);
        try {
            // 1. Fetch data in parallel
            const [presets, archiveFiles, backupsRes, jdfScan] = await Promise.all([
                pb.collection('maintenance_reports').getFullList({ sort: 'name' }),
                pb.collection('report_files').getFullList({ sort: '-generated_at' }),
                fetch(`${pb.baseUrl.replace(/\/$/, '')}/api/backups`, {
                    headers: { 'Authorization': pb.authStore.token }
                }).then(res => res.ok ? res.json() : []),
                pb.collection('app_settings').getFirstListItem('key = "jdf_last_scan"').catch(() => null)
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

            // 4. Map JDF Watcher
            const jdfLast = jdfScan?.value?.timestamp ? new Date(jdfScan.value.timestamp) : null;
            const jdfNext = jdfLast ? new Date(jdfLast.getTime() + 5 * 60 * 1000) : null;
            const jdfTask: ScheduledTask = {
                id: 'jdf_scan',
                name: 'JDF Mapscanner',
                type: 'jdf',
                interval: 'Elke 5 minuten',
                lastRun: jdfLast,
                nextRun: jdfNext,
                status: 'idle',
                description: jdfScan?.value
                    ? `${jdfScan.value.files_found ?? 0} bestanden, ${jdfScan.value.new_records ?? 0} nieuw, ${jdfScan.value.updated_records ?? 0} bijgewerkt`
                    : 'Scant de JDF-map en synchroniseert orders',
            };

            setTasks([...reportTasks, backupTask, jdfTask]);
        } catch (e) {
            console.error('[SystemTasks] Fetch failed:', e);
            toast.error('Fout bij ophalen taken');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { fetchTasks(); }, [fetchTasks]);

    // Auto-run is now handled globally by useAutoReports in App.tsx

    const runTask = useCallback(async (task: ScheduledTask, trigger: 'manual' | 'auto' = 'manual') => {
        setRunningIds(prev => new Set(prev).add(task.id));
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'running' } : t));
        if (trigger === 'manual') toast.info(`Uitvoeren: ${task.name}...`);

        try {
            if (task.type === 'backup') {
                // Trigger PocketBase Backup
                const res = await fetch(`${pb.baseUrl.replace(/\/$/, '')}/api/backups`, {
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
            } else if (task.type === 'jdf') {
                const res = await fetch(`${pb.baseUrl.replace(/\/$/, '')}/api/jdf/scan`, {
                    method: 'POST',
                    headers: {
                        'Authorization': pb.authStore.token,
                        'Content-Type': 'application/json'
                    }
                });
                if (!res.ok) throw new Error(`JDF scan failed: ${res.status}`);
                const data = await res.json();
                if (data.skipped) {
                    toast.warning(data.error || 'JDF scan overgeslagen');
                } else {
                    toast.success(`JDF scan voltooid: ${data.new_records} nieuw, ${data.updated_records} bijgewerkt`);
                }
                setTimeout(fetchTasks, 500);
            } else {
                // Trigger Report Generation via shared utility
                if (!task.preset) return;
                await generatePresetReport(task.preset, trigger, trigger === 'manual' ? (pb.authStore.model?.username || 'Admin') : 'Systeem');
                if (trigger === 'manual') toast.success(`Rapport "${task.preset.name}" gegenereerd`);
                else toast.success(`[Auto] "${task.preset.name}" aangemaakt`);
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
                                                        task.type === 'backup' ? "bg-amber-50"
                                                        : task.type === 'jdf' ? "bg-blue-50"
                                                        : "bg-indigo-50"
                                                    )}>
                                                        {task.type === 'backup' ? (
                                                            <Database className="w-3.5 h-3.5 text-amber-500" />
                                                        ) : task.type === 'jdf' ? (
                                                            <FileText className="w-3.5 h-3.5 text-blue-500" />
                                                        ) : task.preset?.auto_generate ? (
                                                            <RefreshCw className="w-3.5 h-3.5 text-indigo-500" />
                                                        ) : (
                                                            <CalendarClock className="w-3.5 h-3.5 text-slate-400" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-sm text-slate-800">{task.name}</p>
                                                        <p className="text-[10px] text-slate-400">{task.description || task.preset?.description || (task.type === 'backup' ? 'Volledige database backup zip' : '')}</p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-xs font-semibold text-slate-600">{task.interval}</span>
                                            </TableCell>
                                            <TableCell>
                                                {task.lastRun
                                                    ? <span className="text-xs text-slate-600">{formatDisplayDateTime(task.lastRun)}</span>
                                                    : <span className="text-xs text-slate-400 italic">Nog niet uitgevoerd</span>
                                                }
                                            </TableCell>
                                            <TableCell>
                                                {task.nextRun
                                                    ? <span className="text-xs font-bold text-indigo-600">{task.nextRun.toLocaleDateString('nl-BE', { weekday: 'long' })} {formatDisplayDateTime(task.nextRun)}</span>
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
