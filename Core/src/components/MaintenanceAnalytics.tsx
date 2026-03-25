import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { pb } from './AuthContext';
import {
    PieChart, Pie, Cell,
    XAxis, YAxis, Tooltip, ResponsiveContainer,
    LineChart, Line, CartesianGrid
} from 'recharts';
import { format, subMonths, isAfter, differenceInMonths } from 'date-fns';
import { nl } from 'date-fns/locale';
import { AlertCircle, Trophy } from 'lucide-react';
import { getStatusInfo } from '../utils/StatusUtils';

const STATUS_COLORS = {
    '< 6 mnd te laat': '#f87171',   // red-400
    '6-12 mnd te laat': '#ef4444',  // red-500
    '> 1 jaar te laat': '#b91c1c',  // red-700
    'Binnenkort': '#eab308',        // yellow-500
    'In orde': '#22c55e'            // green-500 (was Gepland)
};

const PRESS_ORDER = ['Lithoman', 'C818', 'C80'];
const sortPresses = (a: string, b: string) => {
    const indexA = PRESS_ORDER.indexOf(a);
    const indexB = PRESS_ORDER.indexOf(b);
    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    return a.localeCompare(b);
};

export function MaintenanceAnalytics() {
    const [data, setData] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [timeRange, setTimeRange] = useState<'1' | '6' | '12'>('6');

    const fetchData = useCallback(async () => {
        try {
            setIsLoading(true);
            const [maintenanceRecords, logs] = await Promise.all([
                pb.collection('onderhoud').getFullList({
                    sort: 'sort_order,created',
                    expand: 'category,pers,assigned_operator,assigned_team,tags',
                }),
                pb.collection('activity_logs').getFullList({
                    filter: `entity = "Task" && (action = "Updated" || action = "Created") && created >= "${subMonths(new Date(), 12).toISOString()}"`,
                    sort: '-created'
                })
            ]);
            setData(maintenanceRecords);
            setActivityLogs(logs as any[]);
            setError(null);
        } catch (err: any) {
            console.error("Failed to fetch maintenance analytics data:", err);
            setError("Kon de statistieken niet laden. Controleer je verbinding of permissies.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const [activityLogs, setActivityLogs] = useState<any[]>([]);

    // 2. Trend (Last 12 months, based on Activity Logs)
    const trendData = useMemo(() => {
        const months: Record<string, any> = {};
        const today = new Date();
        const presses = new Set<string>();

        // De-duplication: key is "taskId | dd/mm/yyyy"
        const uniqueCompletions = new Set<string>();

        // Initialize last 12 months
        for (let i = 11; i >= 0; i--) {
            const date = subMonths(today, i);
            const monthKey = format(date, 'MMM', { locale: nl });
            months[monthKey] = { month: monthKey, Total: 0 };
        }

        activityLogs.forEach(entry => {
            const newValue = entry.new_value || entry.newValue || '';
            // Extract date from "Laatste onderhoud: 20/03/2026"
            const dateMatch = newValue.match(/Laatste onderhoud:\s*(\d{2}\/\d{2}\/\d{4})/);
            if (!dateMatch) return;

            const dateStr = dateMatch[1];
            const taskId = entry.entity_id || entry.entityId || 'unknown';
            const completionKey = `${taskId}|${dateStr}`;

            // User filter: 1 completion per task per day
            if (uniqueCompletions.has(completionKey)) return;
            uniqueCompletions.add(completionKey);

            // Convert dd/mm/yyyy to Date
            const [day, month, year] = dateStr.split('/').map(Number);
            const completionDate = new Date(year, month - 1, day);

            // Re-verify it's within 12 months of today
            if (differenceInMonths(today, completionDate) > 11 || isAfter(completionDate, today)) return;

            const monthKey = format(completionDate, 'MMM', { locale: nl });
            const pressName = entry.press || 'Onbekend';
            presses.add(pressName);

            if (months[monthKey]) {
                months[monthKey][pressName] = (months[monthKey][pressName] || 0) + 1;
                months[monthKey].Total++;
            }
        });

        const dataArray = Object.values(months);
        // User request: Hide months with 0 tasks while data is filling up.
        // Option 1: Filter all 0s. 
        // Option 2: Filter leading 0s.
        // User said "months with 0 tasks are hidden", so we'll filter them all for now.
        const filteredData = dataArray.filter(m => m.Total > 0);

        return {
            data: filteredData,
            presses: Array.from(presses).sort(sortPresses)
        };
    }, [activityLogs]);

    const filteredDateData = useMemo(() => {
        const cutoffDate = subMonths(new Date(), parseInt(timeRange));
        return data.filter(record =>
            record.last_date && isAfter(new Date(record.last_date), cutoffDate)
        );
    }, [data, timeRange]);

    // 1. Task Status Distribution (Donut Chart per Press)
    const pressStatusData = useMemo(() => {
        const pressMap: Record<string, Record<string, number>> = {};
        const today = new Date();

        data.forEach(record => {
            const pressName = record.expand?.pers?.naam || 'Onbekend';
            if (!pressMap[pressName]) {
                pressMap[pressName] = {
                    '< 6 mnd te laat': 0,
                    '6-12 mnd te laat': 0,
                    '> 1 jaar te laat': 0,
                    'Binnenkort': 0,
                    'In orde': 0
                };
            }

            const nextDateStr = record.next_date;
            if (!nextDateStr) {
                pressMap[pressName]['In orde']++;
                return;
            }

            const nextDate = new Date(nextDateStr);
            const statusKey = getStatusInfo(nextDateStr).key;

            if (statusKey === 'Te laat') {
                const monthsOverdue = differenceInMonths(today, nextDate);
                if (monthsOverdue < 6) {
                    pressMap[pressName]['< 6 mnd te laat']++;
                } else if (monthsOverdue < 12) {
                    pressMap[pressName]['6-12 mnd te laat']++;
                } else {
                    pressMap[pressName]['> 1 jaar te laat']++;
                }
            } else if (statusKey === 'Deze Week' || statusKey === 'Deze Maand') {
                pressMap[pressName]['Binnenkort']++;
            } else {
                pressMap[pressName]['In orde']++;
            }
        });

        return Object.entries(pressMap).map(([press, counts]) => {
            const chartData = Object.entries(counts).map(([name, value]) => ({
                name,
                value,
                color: STATUS_COLORS[name as keyof typeof STATUS_COLORS] || '#cbd5e1'
            })).filter(d => d.value > 0);

            const total = chartData.reduce((sum, d) => sum + d.value, 0);
            const overdue = {
                '< 6 mnd': counts['< 6 mnd te laat'] || 0,
                '6-12 mnd': counts['6-12 mnd te laat'] || 0,
                '> 1 jaar': counts['> 1 jaar te laat'] || 0,
                total: (counts['< 6 mnd te laat'] || 0) + (counts['6-12 mnd te laat'] || 0) + (counts['> 1 jaar te laat'] || 0)
            };
            const binnenkort = counts['Binnenkort'] || 0;
            const inOrde = counts['In orde'] || 0;

            return { press, chartData, total, overdue, binnenkort, inOrde };
        }).sort((a, b) => sortPresses(a.press, b.press));
    }, [data]);
    
    // 3.5. Grand Total Tasks per Press
    const pressTotalCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        data.forEach(record => {
            const pressName = record.expand?.pers?.naam || 'Onbekend';
            counts[pressName] = (counts[pressName] || 0) + 1;
        });
        return counts;
    }, [data]);

    // 4. Operator Activity (Leaderboard by Press)
    const operatorDataByPress = useMemo(() => {
        const pressMap: Record<string, { operators: Record<string, number>, totalTasks: number }> = {};

        filteredDateData.forEach(record => {
            const pressName = record.expand?.pers?.naam || 'Onbekend';
            if (!pressMap[pressName]) pressMap[pressName] = { operators: {}, totalTasks: 0 };

            pressMap[pressName].totalTasks++;

            const names: string[] = [];

            // Extract names from expanded operators
            if (record.expand?.assigned_operator) {
                const ops = Array.isArray(record.expand.assigned_operator)
                    ? record.expand.assigned_operator
                    : [record.expand.assigned_operator];
                ops.forEach((o: any) => names.push(o.naam || o.name || 'Onbekend'));
            }

            // Extract names from expanded teams
            if (record.expand?.assigned_team) {
                const teams = Array.isArray(record.expand.assigned_team)
                    ? record.expand.assigned_team
                    : [record.expand.assigned_team];
                teams.forEach((t: any) => names.push(t.naam || t.name || 'Onbekend'));
            }

            // Fallback to legacy string field
            if (names.length === 0 && record.assignedTo) {
                const legacyNames = record.assignedTo.split(',').map((s: string) => s.trim()).filter(Boolean);
                names.push(...legacyNames);
            }

            names.forEach((name: string) => {
                pressMap[pressName].operators[name] = (pressMap[pressName].operators[name] || 0) + 1;
            });
        });

        return Object.entries(pressMap)
            .map(([pressName, d]) => ({
                pressName,
                totalTasks: d.totalTasks,
                grandTotal: pressTotalCounts[pressName] || 0,
                operators: Object.entries(d.operators)
                    .map(([name, count]) => ({ name, count }))
                    .sort((a, b) => b.count - a.count)
            }))
            .sort((a, b) => sortPresses(a.pressName, b.pressName));
    }, [filteredDateData, pressTotalCounts]);

    if (isLoading) {
        return <div className="p-8 flex items-center justify-center text-slate-500 animate-pulse">Statistieken laden...</div>;
    }

    return (
        <div className="space-y-4 max-w-7xl mx-auto w-full">

            {error && (
                <div className="bg-red-50 text-red-700 p-4 rounded-xl flex items-start gap-3 border border-red-100">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <p className="text-sm font-medium">{error}</p>
                </div>
            )}
            <div className="flex flex-col gap-3 w-full">
                {/* 1. Task Status Donut Charts (3 Cards without outer title) */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {pressStatusData.map(({ press, chartData, total, overdue, binnenkort, inOrde }) => (
                        <div key={press} className="flex flex-col border border-slate-200 rounded-xl p-3 bg-white shadow-sm overflow-hidden">
                            <h3 className="text-sm font-bold text-slate-700 mb-3 border-b border-slate-100 pb-2 w-full text-center uppercase tracking-tight">{press}</h3>

                            <div className="flex items-center justify-between min-h-[160px] h-auto w-full">
                                {/* Pie on the Left */}
                                <div className="w-1/2 flex items-center justify-center p-2">
                                    <div className="w-[140px] h-[140px] shrink-0">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                                                <Pie
                                                    data={chartData}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={38}
                                                    outerRadius={68}
                                                    paddingAngle={0}
                                                    dataKey="value"
                                                >
                                                    {chartData.map((entry, index) => {
                                                        const isOverdue = entry.name.includes('te laat');
                                                        return (
                                                            <Cell
                                                                key={`cell-${index}`}
                                                                fill={entry.color}
                                                                stroke={isOverdue ? entry.color : '#ffffff'}
                                                                strokeWidth={isOverdue ? 0 : 2}
                                                            />
                                                        );
                                                    })}
                                                </Pie>
                                                <Tooltip
                                                    formatter={(value: number) => [`${value} taken`, 'Aantal']}
                                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* Stats on the Right */}
                                <div className="w-1/2 flex flex-col justify-center gap-1.5 text-xs">
                                    {/* Te laat Box */}
                                    <div className="bg-red-50 rounded-lg p-2 border border-red-100 flex flex-col">
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: '#ef4444' }} />
                                            <span className="font-semibold text-red-800 text-[11px]">Te laat:</span>
                                            <span className="font-bold text-red-900 ml-auto">{total > 0 ? Math.round((overdue.total / total) * 100) : 0}%</span>
                                            <span className="text-[10px] text-red-700/80 font-medium">({overdue.total}/{total})</span>
                                        </div>
                                        {overdue.total > 0 && (
                                            <div className="flex flex-col gap-1 mt-1.5 pl-3 border-l-[1.5px] border-red-200 ml-1">
                                                {overdue['< 6 mnd'] > 0 && (
                                                    <div className="flex items-center justify-between text-[10px] text-red-700 leading-none">
                                                        <div className="flex items-center gap-1.5">
                                                            <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: STATUS_COLORS['< 6 mnd te laat'] }} />
                                                            <span className="truncate">&lt; 6 mnd:</span>
                                                        </div>
                                                        <span className="font-semibold ml-1 shrink-0">{Math.round((overdue['< 6 mnd'] / total) * 100)}% ({overdue['< 6 mnd']})</span>
                                                    </div>
                                                )}
                                                {overdue['6-12 mnd'] > 0 && (
                                                    <div className="flex items-center justify-between text-[10px] text-red-700 leading-none">
                                                        <div className="flex items-center gap-1.5">
                                                            <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: STATUS_COLORS['6-12 mnd te laat'] }} />
                                                            <span className="truncate">6-12 mnd:</span>
                                                        </div>
                                                        <span className="font-semibold ml-1 shrink-0">{Math.round((overdue['6-12 mnd'] / total) * 100)}% ({overdue['6-12 mnd']})</span>
                                                    </div>
                                                )}
                                                {overdue['> 1 jaar'] > 0 && (
                                                    <div className="flex items-center justify-between text-[10px] text-red-700 leading-none">
                                                        <div className="flex items-center gap-1.5">
                                                            <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: STATUS_COLORS['> 1 jaar te laat'] }} />
                                                            <span className="truncate">&gt; 1 jaar:</span>
                                                        </div>
                                                        <span className="font-semibold ml-1 shrink-0">{Math.round((overdue['> 1 jaar'] / total) * 100)}% ({overdue['> 1 jaar']})</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Binnenkort Box */}
                                    <div className="bg-yellow-50 rounded-lg p-2 border border-yellow-100 flex items-center gap-1.5">
                                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: STATUS_COLORS['Binnenkort'] }} />
                                        <span className="font-semibold text-yellow-800 text-[11px]">Binnenkort:</span>
                                        <span className="font-bold text-yellow-900 ml-auto">{total > 0 ? Math.round((binnenkort / total) * 100) : 0}%</span>
                                        <span className="text-[10px] text-yellow-700/80 font-medium">({binnenkort}/{total})</span>
                                    </div>

                                    {/* In orde Box */}
                                    <div className="bg-green-50 rounded-lg p-2 border border-green-100 flex items-center gap-1.5">
                                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: STATUS_COLORS['In orde'] }} />
                                        <span className="font-semibold text-green-800 text-[11px]">In orde:</span>
                                        <span className="font-bold text-green-900 ml-auto">{total > 0 ? Math.round((inOrde / total) * 100) : 0}%</span>
                                        <span className="text-[10px] text-green-700/80 font-medium">({inOrde}/{total})</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                {/* 2. Operator Leaderboard (Compact Vision) */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Trophy className="w-4 h-4 text-amber-500" />
                            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-tight">Operator Leaderboard</h3>
                        </div>

                        <div className="bg-slate-100/50 border border-slate-200 p-0.5 rounded-md flex items-center">
                            {(['1', '6', '12'] as const).map((r) => (
                                <button
                                    key={r}
                                    onClick={() => setTimeRange(r)}
                                    className={`px-3 py-0.5 text-[10px] font-bold rounded transition-all ${timeRange === r
                                        ? 'bg-white text-blue-600 shadow-sm'
                                        : 'text-slate-500 hover:bg-white/50'
                                        }`}
                                >
                                    {r}M
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                        {operatorDataByPress.map(({ pressName, operators, totalTasks, grandTotal }) => (
                            <div key={pressName} className="flex flex-col bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                                <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">{pressName}</span>
                                    <span className="text-[10px] font-medium text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-100 uppercase">
                                        {totalTasks}<span className="opacity-50 mx-0.5">/</span>{grandTotal} <span className="text-[9px] opacity-70">Taken</span>
                                    </span>
                                </div>
                                <div className="p-0 border-t border-slate-100">
                                    <div className="max-h-[165px] overflow-y-auto scrollbar-thin divide-y divide-slate-50">
                                        {operators.length > 0 ? (
                                            operators.map((op, index) => (
                                                <div key={op.name} className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 transition-colors group">
                                                    <div className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold shrink-0 shadow-sm ${index === 0 ? 'bg-amber-400 text-amber-950' :
                                                        index === 1 ? 'bg-slate-400 text-slate-950' :
                                                            index === 2 ? 'bg-orange-400 text-orange-950' :
                                                                'bg-slate-100 text-slate-600'
                                                        }`}>
                                                        {index + 1}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-[11px] font-semibold text-slate-800 truncate leading-tight">{op.name}</p>
                                                    </div>
                                                    <div className="text-[11px] font-bold text-slate-600 tabular-nums">
                                                        {op.count}
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="py-6 text-center text-[10px] text-slate-400 italic">No data</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 3. Trend (Last 12 Months) - Moved to bottom */}
                <Card className="shadow-sm border-slate-200 min-w-0 overflow-hidden">
                    <CardHeader className="pb-0 flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-lg font-semibold text-slate-800">Trend</CardTitle>
                            <CardDescription className="text-[11px]">Aantal afgeronde taken per machine (laatste 12 maanden)</CardDescription>
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 justify-end">
                            {trendData.presses.map((press, index) => (
                                <div key={press} className="flex items-center gap-1.5">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: [`#3b82f6`, `#a855f7`, `#f97316`, `#10b981`, `#ec4899`, `#ef4444`][index % 6] }} />
                                    <span className="text-[10px] font-medium text-slate-600">{press}</span>
                                </div>
                            ))}
                            <div className="flex items-center gap-1.5 ml-2 border-l pl-3 border-slate-200">
                                <div className="w-3 h-0 border-t border-dashed border-slate-400" />
                                <span className="text-[10px] font-medium text-slate-500 italic">Totaal</span>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                        <div className="h-[240px] w-full pt-1">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={trendData.data}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis
                                        dataKey="month"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#64748b', fontSize: 11 }}
                                        dy={10}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#64748b', fontSize: 11 }}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'white',
                                            borderRadius: '12px',
                                            border: '1px solid #e2e8f0',
                                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                                        }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="Total"
                                        stroke="#94a3b8"
                                        strokeWidth={1}
                                        strokeDasharray="5 5"
                                        dot={false}
                                        name="Totaal"
                                    />
                                    {trendData.presses.map((press, index) => (
                                        <Line
                                            key={press}
                                            type="monotone"
                                            dataKey={press}
                                            stroke={[`#3b82f6`, `#a855f7`, `#f97316`, `#10b981`, `#ec4899`, `#ef4444`][index % 6]}
                                            strokeWidth={2.5}
                                            dot={{ r: 4, strokeWidth: 2, fill: 'white' }}
                                            activeDot={{ r: 6, strokeWidth: 0 }}
                                            name={press}
                                        />
                                    ))}
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

            </div>
        </div>
    );
}
