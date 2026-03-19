import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { pb } from './AuthContext';
import {
    PieChart, Pie, Cell,
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    LineChart, Line, CartesianGrid
} from 'recharts';
import { format, subMonths, isAfter, startOfMonth, parseISO, differenceInMonths } from 'date-fns';
import { nl } from 'date-fns/locale';
import { Activity, AlertCircle } from 'lucide-react';
import { getStatusInfo } from '../utils/StatusUtils';

const STATUS_COLORS = {
    '< 6 mnd te laat': '#f87171',   // red-400
    '6-12 mnd te laat': '#ef4444',  // red-500
    '> 1 jaar te laat': '#b91c1c',  // red-700
    'Binnenkort': '#eab308',        // yellow-500
    'In orde': '#22c55e'            // green-500 (was Gepland)
};

export function MaintenanceAnalytics() {
    const [data, setData] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;

        async function fetchData() {
            try {
                setIsLoading(true);
                const records = await pb.collection('onderhoud').getFullList({
                    sort: '-created',
                    expand: 'pers'
                });
                if (isMounted) {
                    setData(records);
                    setError(null);
                }
            } catch (err: any) {
                console.error("Failed to fetch maintenance analytics data:", err);
                if (isMounted) {
                    setError("Kon de statistieken niet laden. Controleer je verbinding of permissies.");
                }
            } finally {
                if (isMounted) setIsLoading(false);
            }
        }

        fetchData();

        return () => { isMounted = false; };
    }, []);

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
        });
    }, [data]);

    // 2. Maintenance Frequency per Press (Horizontal Bar Chart)
    const pressData = useMemo(() => {
        const counts: Record<string, number> = {};
        data.forEach(curr => {
            const press = curr.expand?.pers?.naam || 'Onbekend';
            counts[press] = (counts[press] || 0) + 1;
        });

        return Object.entries(counts)
            .map(([name, count]) => ({ name, count: count as number }))
            .sort((a, b) => b.count - a.count); // Sort by highest frequency
    }, [data]);

    // 3. Completion Trend (Line Chart - Last 6 Months)
    const trendData = useMemo(() => {
        const sixMonthsAgo = startOfMonth(subMonths(new Date(), 5)); // Include current month = 6 months

        // Initialize last 6 months with 0
        const monthsMap = new Map<string, number>();
        for (let i = 5; i >= 0; i--) {
            const monthDate = subMonths(new Date(), i);
            const monthKey = format(monthDate, 'MMM yyyy', { locale: nl });
            monthsMap.set(monthKey, 0);
        }

        // Fill data
        data.forEach(record => {
            if (record.last_date) {
                try {
                    const date = parseISO(record.last_date);
                    if (isAfter(date, sixMonthsAgo) || date.getTime() === sixMonthsAgo.getTime()) {
                        const monthKey = format(date, 'MMM yyyy', { locale: nl });
                        if (monthsMap.has(monthKey)) {
                            monthsMap.set(monthKey, monthsMap.get(monthKey)! + 1);
                        }
                    }
                } catch (e) {
                    // Invalid date, ignore
                }
            }
        });

        return Array.from(monthsMap.entries()).map(([month, completed]) => ({
            month,
            completed
        }));
    }, [data]);

    if (isLoading) {
        return <div className="p-8 flex items-center justify-center text-slate-500 animate-pulse">Statistieken laden...</div>;
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto w-full">
            <div className="flex items-center justify-between border-b pb-4">
                <div className="flex items-center gap-3">
                    <div className="bg-purple-100 p-2 rounded-lg">
                        <Activity className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                            Onderhoud Statistieken
                            <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-200 uppercase text-xs">Beta</Badge>
                        </h2>
                        <p className="text-slate-500 text-sm mt-1">Analyseer taak statussen, machine belasting en productiviteit.</p>
                    </div>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 text-red-700 p-4 rounded-xl flex items-start gap-3 border border-red-100">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <p className="text-sm font-medium">{error}</p>
                </div>
            )}
            <div className="flex flex-col gap-6 w-full">
                {/* 1. Task Status Donut Charts */}
                <Card className="shadow-sm border-slate-200 min-w-0 overflow-hidden">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg font-semibold text-slate-800">Taak Statussen per Pers</CardTitle>
                        <CardDescription>Verdeling van statussen voor elke machine</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
                            {pressStatusData.map(({ press, chartData, total, overdue, binnenkort, inOrde }) => (
                                <div key={press} className="flex flex-col border border-slate-100 rounded-xl p-3 bg-white shadow-sm shadow-slate-200/50">
                                    <h3 className="text-sm font-semibold text-slate-700 mb-3 border-b border-slate-100 pb-2 w-full text-center">{press}</h3>

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
                                                    <span className="font-semibold text-red-800">Te laat:</span>
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
                                                <span className="font-semibold text-yellow-800">Binnenkort:</span>
                                                <span className="font-bold text-yellow-900 ml-auto">{total > 0 ? Math.round((binnenkort / total) * 100) : 0}%</span>
                                                <span className="text-[10px] text-yellow-700/80 font-medium">({binnenkort}/{total})</span>
                                            </div>

                                            {/* In orde Box */}
                                            <div className="bg-green-50 rounded-lg p-2 border border-green-100 flex items-center gap-1.5">
                                                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: STATUS_COLORS['In orde'] }} />
                                                <span className="font-semibold text-green-800">In orde:</span>
                                                <span className="font-bold text-green-900 ml-auto">{total > 0 ? Math.round((inOrde / total) * 100) : 0}%</span>
                                                <span className="text-[10px] text-green-700/80 font-medium">({inOrde}/{total})</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
                    {/* 2. Frequency per Press Bar Chart */}
                    <Card className="shadow-sm border-slate-200 min-w-0 overflow-hidden">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg font-semibold text-slate-800">Frequentie per Pers</CardTitle>
                            <CardDescription>Aantal onderhoudstaken per machine</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="h-[300px] w-full relative">
                                <div className="absolute inset-0 p-4 pt-0">
                                    <ResponsiveContainer width="99%" height="100%">
                                        <BarChart
                                            data={pressData}
                                            layout="vertical"
                                            margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                                            <XAxis type="number" hide />
                                            <YAxis
                                                dataKey="name"
                                                type="category"
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: '#64748b', fontSize: 12 }}
                                                width={80}
                                            />
                                            <Tooltip
                                                cursor={{ fill: '#f1f5f9' }}
                                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                                formatter={(value: number) => [`${value} taken`, 'Frequentie']}
                                            />
                                            <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={24} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* 3. Completion Trend Area/Line Chart */}
                    <Card className="shadow-sm border-slate-200 min-w-0 overflow-hidden">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg font-semibold text-slate-800">Voltooiing Trend</CardTitle>
                            <CardDescription>Afgehandelde taken (laatste 6 mdn)</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="h-[300px] w-full relative">
                                <div className="absolute inset-0 p-4 pt-0">
                                    <ResponsiveContainer width="99%" height="100%">
                                        <LineChart
                                            data={trendData}
                                            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                            <XAxis
                                                dataKey="month"
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: '#64748b', fontSize: 12 }}
                                                dy={10}
                                            />
                                            <YAxis
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: '#64748b', fontSize: 12 }}
                                            />
                                            <Tooltip
                                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                                formatter={(value: number) => [`${value} voltooid`, 'Taken']}
                                            />
                                            <Line
                                                type="monotone"
                                                dataKey="completed"
                                                stroke="#22c55e"
                                                strokeWidth={3}
                                                dot={{ fill: '#22c55e', strokeWidth: 2, r: 4 }}
                                                activeDot={{ r: 6, fill: '#16a34a' }}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
