import { useState, useCallback } from 'react';
import { Search, CheckCircle, AlertTriangle, ShieldCheck, Database, Wrench, Info, Loader2, User, MessageSquare } from 'lucide-react';
import { pb, useAuth } from '../AuthContext';
import { formatDisplayDate } from '../../utils/dateUtils';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { toast } from 'sonner';

interface Discrepancy {
    id: string;
    taskName: string;
    taskSubtext: string;
    subtaskName: string;
    subtaskSubtext: string;
    press: string;
    
    // Dates
    logDate: Date;
    dbDate: Date | null;
    suggestedNextDate: Date;
    
    // Operators
    logOperators: string;
    dbOperators: string;
    
    // Comments
    logComment: string;
    dbComment: string;
    
    logCreated: string;
    status: 'pending' | 'fixed' | 'error';
    hasDateMismatch: boolean;
    hasOperatorMismatch: boolean;
    hasCommentMismatch: boolean;
}

export function DataChecker() {
    const { user, addActivityLog } = useAuth();
    const [discrepancies, setDiscrepancies] = useState<Discrepancy[]>([]);
    const [isScanning, setIsScanning] = useState(false);
    const [isFixing, setIsFixing] = useState(false);

    const scanData = useCallback(async () => {
        try {
            setIsScanning(true);
            setDiscrepancies([]);

            // 1. Fetch ALL maintenance tasks and support data
            const [tasks] = await Promise.all([
                pb.collection('onderhoud').getFullList<any>({ expand: 'assigned_operator,assigned_team' }),
            ]);
            
            // 2. Fetch logs from last 30 days
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            
            const logs = await pb.collection('activity_logs').getFullList<any>({
                filter: `entity = 'Task' && action = 'Updated' && created >= '${thirtyDaysAgo.toISOString()}'`,
                sort: '-created'
            });

            const taskMap = new Map(tasks.map(t => [t.id, t]));
            const foundDiscrepancies: Discrepancy[] = [];
            const processedIds = new Set<string>();

            for (const log of logs) {
                if (processedIds.has(log.entityId)) continue;
                processedIds.add(log.entityId);

                const task = taskMap.get(log.entityId);
                if (!task) continue;

                const parts = (log.newValue || '').split('|||');
                let logDateStr = '';
                let logOperators = '';
                let logComment = '';

                for (const part of parts) {
                    if (part.startsWith('Laatste onderhoud: ')) {
                        logDateStr = part.replace('Laatste onderhoud: ', '').trim();
                    } else if (part.startsWith('Toegewezen aan: ')) {
                        logOperators = part.replace('Toegewezen aan: ', '').trim();
                    } else if (part.startsWith('Opmerkingen: ')) {
                        logComment = part.replace('Opmerkingen: ', '').trim();
                    }
                }

                if (!logDateStr || logDateStr === '-') continue;

                // 1. Check Date Mismatch
                const [d, m, y] = logDateStr.split('/').map(Number);
                const logDate = new Date(y, m - 1, d);
                const dbDate = task.last_date ? new Date(task.last_date) : null;
                const logISO = logDate.toISOString().split('T')[0];
                const dbISO = dbDate ? dbDate.toISOString().split('T')[0] : 'EMPTY';
                const hasDateMismatch = logISO !== dbISO;

                // 2. Check Operator Mismatch
                const dbOpsList = [
                    ...(task.expand?.assigned_operator?.map((o: any) => o.naam) || []),
                    ...(task.expand?.assigned_team?.map((t: any) => t.name) || [])
                ].sort();
                const dbOperators = dbOpsList.join(', ');
                const sortedLogOps = logOperators.split(',').map(s => s.trim()).sort().join(', ');
                const hasOperatorMismatch = logOperators !== '' && sortedLogOps !== dbOperators;

                // 3. Check Comment Mismatch
                const dbComment = task.opmerkingen || '(leeg)';
                const hasCommentMismatch = logComment !== '' && logComment !== dbComment;

                if (hasDateMismatch || hasOperatorMismatch || hasCommentMismatch) {
                    // Recalculate next date
                    const next = new Date(logDate);
                    const interval = task.interval || 0;
                    const unit = task.interval_unit;
                    
                    if (unit === 'Dagen') next.setDate(next.getDate() + interval);
                    else if (unit === 'Weken') next.setDate(next.getDate() + (interval * 7));
                    else if (unit === 'Maanden') next.setMonth(next.getMonth() + interval);
                    else if (unit === 'Jaren') next.setFullYear(next.getFullYear() + interval);

                    foundDiscrepancies.push({
                        id: task.id,
                        taskName: task.task,
                        taskSubtext: task.task_subtext || '',
                        subtaskName: task.subtask,
                        subtaskSubtext: task.subtask_subtext || '',
                        press: log.press || 'Onbekend',
                        logDate,
                        dbDate,
                        suggestedNextDate: next,
                        logOperators: logOperators || 'Niemand',
                        dbOperators: dbOperators || 'Niemand',
                        logComment: logComment || '(leeg)',
                        dbComment: dbComment || '(leeg)',
                        logCreated: log.created,
                        status: 'pending',
                        hasDateMismatch,
                        hasOperatorMismatch,
                        hasCommentMismatch
                    });
                }
            }

            setDiscrepancies(foundDiscrepancies);
            if (foundDiscrepancies.length === 0) {
                toast.success('Geen discrepanties gevonden.');
            } else {
                toast.info(`${foundDiscrepancies.length} issues gevonden.`);
            }
        } catch (error: any) {
            console.error('Scan failed:', error);
            toast.error(`Scan mislukt: ${error.message}`);
        } finally {
            setIsScanning(false);
        }
    }, []);

    const applyFixes = async (toFix: Discrepancy[]) => {
        try {
            setIsFixing(true);
            
            // For mapping operators/teams
            const [allOps, allTeams] = await Promise.all([
                pb.collection('operatoren').getFullList<any>(),
                pb.collection('ploegen').getFullList<any>()
            ]);

            let count = 0;
            for (const disc of toFix) {
                if (disc.status === 'fixed') continue;

                const updateData: any = {};
                const details: string[] = [];

                if (disc.hasDateMismatch) {
                    updateData.last_date = disc.logDate.toISOString();
                    updateData.next_date = disc.suggestedNextDate.toISOString();
                    details.push('Datum gecorrigeerd');
                }

                if (disc.hasOperatorMismatch) {
                    const logOpsNames = disc.logOperators.split(',').map(s => s.trim());
                    const opIds = allOps.filter(o => logOpsNames.includes(o.naam)).map(o => o.id);
                    const teamIds = allTeams.filter(t => logOpsNames.includes(t.name)).map(t => t.id);
                    updateData.assigned_operator = opIds;
                    updateData.assigned_team = teamIds;
                    details.push('Operators gecorrigeerd');
                }

                if (disc.hasCommentMismatch) {
                    updateData.opmerkingen = disc.logComment === '(leeg)' ? '' : disc.logComment;
                    details.push('Opmerkingen gecorrigeerd');
                }

                await pb.collection('onderhoud').update(disc.id, updateData);

                addActivityLog({
                    user: user?.name || user?.username || 'Onbekend',
                    action: 'Updated',
                    entity: 'Task',
                    entityId: disc.id,
                    entityName: `${disc.taskName} | ${disc.subtaskName}`,
                    details: `Data Checker: ${details.join(', ')} op basis van logboek`,
                    press: disc.press,
                    oldValue: 'Mismatch hersteld',
                    newValue: 'Corrected'
                });
                
                setDiscrepancies(prev => prev.map((d: Discrepancy) => d.id === disc.id ? { ...d, status: 'fixed' as const } : d));
                count++;
            }
            if (toFix.length > 1) {
                toast.success(`${count} issues succesvol hersteld.`);
            } else {
                toast.success(`Taak succesvol hersteld.`);
            }
        } catch (error: any) {
            console.error('Fix failed:', error);
            toast.error(`Herstel mislukt: ${error.message}`);
        } finally {
            setIsFixing(false);
        }
    };

    const fixAll = () => {
        applyFixes(discrepancies.filter(d => d.status === 'pending'));
    };

    return (
        <div className="space-y-6 p-4 max-w-[1600px] mx-auto">
            <Card className="border-none shadow-sm bg-white/50 backdrop-blur-sm">
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-7">
                    <div>
                        <CardTitle className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                            <Database className="w-6 h-6 text-blue-600" />
                            Data Checker
                        </CardTitle>
                        <p className="text-sm text-slate-500 mt-1">
                            Auditeert logs vs database voor Onderhoud, Operators en Opmerkingen.
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={scanData}
                            disabled={isScanning}
                            className="bg-white"
                        >
                            {isScanning ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
                            Scan Logboek
                        </Button>
                        <Button
                            onClick={fixAll}
                            disabled={discrepancies.length === 0 || isFixing}
                            className="bg-red-600 hover:bg-red-700 text-white"
                        >
                            {isFixing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Wrench className="w-4 h-4 mr-2" />}
                            Fix Alle Issues
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-4 mb-6 p-4 bg-blue-50/50 rounded-xl border border-blue-100">
                        <div className="text-sm text-slate-600 flex items-center gap-4">
                            <span className="flex items-center gap-1"><Info className="w-4 h-4" /> Bron: Logboek</span>
                            <span className="flex items-center gap-1 text-emerald-600"><CheckCircle className="w-4 h-4" /> Correct</span>
                            <span className="flex items-center gap-1 text-red-500"><AlertTriangle className="w-4 h-4" /> Database</span>
                        </div>
                    </div>

                    {discrepancies.length === 0 ? (
                        <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                            {isScanning ? (
                                <div className="flex flex-col items-center gap-3">
                                    <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
                                    <p className="text-slate-500 font-medium">Bezig met scannen...</p>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-3">
                                    <ShieldCheck className="w-12 h-12 text-slate-300" />
                                    <p className="text-slate-500 font-medium font-industrial">Klik op "Scan Logboek" om de audit te starten.</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="overflow-hidden rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                                    <tr>
                                        <th className="px-4 py-3 min-w-[300px]">Taak Informatie</th>
                                        <th className="px-4 py-3">Onderhoud</th>
                                        <th className="px-4 py-3">Operators</th>
                                        <th className="px-4 py-3">Opmerkingen</th>
                                        <th className="px-4 py-3 text-right">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {discrepancies.map((disc) => (
                                        <tr key={disc.id} className="hover:bg-slate-50/80 transition-colors group">
                                            <td className="px-4 py-4">
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-baseline gap-2">
                                                        <span className="font-semibold text-slate-900">{disc.taskName}</span>
                                                        <span className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">{disc.taskSubtext}</span>
                                                    </div>
                                                    <div className="flex items-baseline gap-2 pl-2 border-l-2 border-slate-100 italic">
                                                        <span className="text-slate-700">{disc.subtaskName}</span>
                                                        <span className="text-[11px] text-slate-400">{disc.subtaskSubtext}</span>
                                                    </div>
                                                    <Badge variant="outline" className="w-fit mt-1 text-[10px] bg-slate-100 text-slate-600 border-none px-1.5 py-0">
                                                        {disc.press}
                                                    </Badge>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex flex-col gap-1.5">
                                                    <div className="flex items-center gap-2">
                                                        <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                                                        <span className="text-emerald-700 font-medium">{formatDisplayDate(disc.logDate)}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <AlertTriangle className={`w-3.5 h-3.5 ${disc.hasDateMismatch ? 'text-red-500' : 'text-slate-300'}`} />
                                                        <span className={disc.hasDateMismatch ? 'text-red-600 line-through' : 'text-slate-400'}>
                                                            {formatDisplayDate(disc.dbDate)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex flex-col gap-1.5 max-w-[250px]">
                                                    <div className="flex items-start gap-2">
                                                        <User className="w-3.5 h-3.5 mt-0.5 text-emerald-500" />
                                                        <span className="text-emerald-700 text-xs line-clamp-2">{disc.logOperators}</span>
                                                    </div>
                                                    <div className="flex items-start gap-2">
                                                        <AlertTriangle className={`w-3.5 h-3.5 mt-0.5 ${disc.hasOperatorMismatch ? 'text-red-500' : 'text-slate-300'}`} />
                                                        <span className={`${disc.hasOperatorMismatch ? 'text-red-600 line-through' : 'text-slate-400'} text-xs line-clamp-2`}>
                                                            {disc.dbOperators}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex flex-col gap-1.5 max-w-[300px]">
                                                    <div className="flex items-start gap-2">
                                                        <MessageSquare className="w-3.5 h-3.5 mt-0.5 text-emerald-500" />
                                                        <span className="text-emerald-700 text-xs italic line-clamp-2">{disc.logComment}</span>
                                                    </div>
                                                    <div className="flex items-start gap-2">
                                                        <AlertTriangle className={`w-3.5 h-3.5 mt-0.5 ${disc.hasCommentMismatch ? 'text-red-500' : 'text-slate-300'}`} />
                                                        <span className={`${disc.hasCommentMismatch ? 'text-red-600 line-through' : 'text-slate-400'} text-xs italic line-clamp-2`}>
                                                            {disc.dbComment}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 text-right">
                                                {disc.status === 'fixed' ? (
                                                    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1 px-2">
                                                        <ShieldCheck className="w-3 h-3" /> Hersteld
                                                    </Badge>
                                                ) : (
                                                    <div className="flex items-center justify-end gap-2">
                                                        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                                                            Mismatch
                                                        </Badge>
                                                        <Button
                                                            size="sm"
                                                            className="h-8 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] px-3 gap-1"
                                                            onClick={() => applyFixes([disc])}
                                                        >
                                                            <Wrench className="w-3 h-3" />
                                                            FIX
                                                        </Button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
