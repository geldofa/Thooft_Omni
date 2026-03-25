import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { pb } from './AuthContext';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    Line, CartesianGrid, ComposedChart,
    PieChart, Pie, Cell
} from 'recharts';
import { format, subMonths, startOfWeek } from 'date-fns';
import { nl } from 'date-fns/locale';
import { AlertCircle, Factory } from 'lucide-react';

const COLORS = {
    Lithoman: '#3b82f6', // blue-500
    'KBA C818': '#6366f1', // indigo-500
    'C80': '#0ea5e9', // sky-500
    Netto: '#0f766e', // teal-700
    Waste: '#ef4444', // red-500
    Production: '#10b981', // emerald-500
    Downtime: '#f97316', // orange-500
    Delta: '#f59e0b', // amber-500
    Default: '#94a3b8' // slate-400
};

export function ProductionAnalytics() {
    const [data, setData] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [conversions, setConversions] = useState<Record<string, Record<string, number>>>({});

    useEffect(() => {
        pb.collection('app_settings').getFirstListItem('key="output_conversions"')
            .then(r => setConversions(r.value || {}))
            .catch(e => console.warn("No output conversions found", e));
    }, []);
    const [timeRange, setTimeRange] = useState<number>(6); // Default 6 months

    useEffect(() => {
        let isMounted = true;
        async function fetchData() {
            try {
                setIsLoading(true);
                const startDate = subMonths(new Date(), timeRange);
                const filterStr = `date >= "${format(startDate, 'yyyy-MM-dd')}"`;

                const records = await pb.collection('drukwerken').getFullList({
                    sort: 'date',
                    filter: filterStr,
                    expand: 'pers'
                });
                
                if (isMounted) {
                    setData(records);
                    setError(null);
                }
            } catch (err: any) {
                console.error("Failed to fetch production analytics data:", err);
                if (isMounted) setError("Kon de statistieken niet laden.");
            } finally {
                if (isMounted) setIsLoading(false);
            }
        }
        fetchData();
        return () => { isMounted = false; };
    }, [timeRange]);

    // Calculate Data for Visualizations (Weekly Grouping)
    const { outputData, efficiencyData, performanceData, activePresses } = useMemo(() => {
        const outputMap: Record<string, any> = {};
        const effMap: Record<string, { date: string, rawDate: Date, bruto: number, netto: number, deltaSum: number, count: number, groen: number, rood: number }> = {};
        let totalGroen = 0;
        let totalRood = 0;
        let totalNettoPerf = 0;
        const pressSet = new Set<string>();

        const sortedData = [...data].sort((a, b) => new Date(a.date || a.datum).getTime() - new Date(b.date || b.datum).getTime());

        sortedData.forEach(record => {
            const pressName = record.expand?.pers?.naam || record.expand?.pers?.name || record.drukpers || 'Onbekend';
            const recordDateStr = record.date || record.datum;
            if (!recordDateStr) return;
            
            pressSet.add(pressName);
            const recordDate = new Date(recordDateStr);
            const weekStart = startOfWeek(recordDate, { weekStartsOn: 1 });
            const dateStr = format(weekStart, "'W'II", { locale: nl });

            // 1. Production Data
            if (!outputMap[dateStr]) {
                outputMap[dateStr] = { date: dateStr, rawDate: weekStart };
            }
            const bruto = Number(record.max_bruto || record.oplage_bruto) || 0;
            const netto = Number(record.netto_oplage || record.oplage_netto) || 0;
            const groen = Number(record.groen) || 0;
            const rood = Number(record.rood) || 0;
            const deltaPerc = Number(record.delta_percent || record.delta_percentage) || 0;

            outputMap[dateStr][pressName] = (outputMap[dateStr][pressName] || 0) + bruto;

            const hasActualProduction = (groen + rood) > 0;
            if (!effMap[dateStr]) {
                effMap[dateStr] = { date: dateStr, rawDate: weekStart, bruto: 0, netto: 0, deltaSum: 0, count: 0, groen: 0, rood: 0 };
            }

            if (hasActualProduction) {
                const pressId = record.pers || record.drukpers_id || record.expand?.pers?.id;
                const exOmwStr = String(record.ex_omw || 1);
                const divider = conversions[pressId]?.[exOmwStr] || 1;

                const actualGroen = groen * divider;
                const actualRood = rood * divider;

                effMap[dateStr].bruto += bruto;
                effMap[dateStr].netto += netto;
                effMap[dateStr].groen += actualGroen;
                effMap[dateStr].rood += actualRood;
                effMap[dateStr].deltaSum += deltaPerc;
                effMap[dateStr].count += 1;
            }

            // 3. Performance
            totalGroen += groen;
            totalRood += rood;
            totalNettoPerf += netto;
        });

        const outputArr = Object.values(outputMap).sort((a, b) => a.rawDate.getTime() - b.rawDate.getTime());
        const effArr = Object.values(effMap).sort((a, b) => a.rawDate.getTime() - b.rawDate.getTime()).map(week => {
            const verlies = (week.groen + week.rood) - week.netto;
            const waste = week.bruto > 0 ? (verlies / week.bruto) * 100 : 0;
            return {
                date: week.date,
                netto: week.netto,
                wastePercentage: parseFloat(Math.max(0, waste).toFixed(1)),
                avgDelta: parseFloat(((() => {
                    const ratio = week.deltaSum / week.count;
                    // Smart conversion: if average ratio > 0.5, it's likely old 100-centered logic
                    const normalizedRatio = ratio > 0.5 ? ratio - 1 : ratio;
                    return normalizedRatio * 100;
                })()).toFixed(1))
            };
        });

        const totalVerliesValue = (totalGroen + totalRood) - totalNettoPerf;
        const perfArr = [
            { name: 'Netto Oplage', value: totalNettoPerf, color: COLORS.Netto },
            { name: 'Goed Product', value: totalGroen, color: COLORS.Production },
            { name: 'Verlies', value: Math.max(0, totalVerliesValue), color: COLORS.Waste }
        ].filter(d => d.value > 0);

        return { outputData: outputArr, efficiencyData: effArr, performanceData: perfArr, activePresses: Array.from(pressSet) };
    }, [data]);

    const totalPerfValue = performanceData.reduce((sum, item) => sum + item.value, 0);
    const verliesValue = performanceData.find(d => d.name === 'Verlies')?.value || 0;
    const verliesPercentage = totalPerfValue > 0 ? Math.round((verliesValue / totalPerfValue) * 100) : 0;

    return (
        <div className="space-y-3 max-w-7xl mx-auto w-full p-2">
            <div className="flex items-center justify-between border-b pb-2 gap-4">
                <div className="flex items-center gap-3">
                    <div className="bg-slate-100 p-1.5 rounded-lg shrink-0">
                        <Factory className="w-5 h-5 text-slate-700" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                            Productie Statistieken
                            <Badge variant="secondary" className="bg-blue-100 text-blue-700 uppercase text-[10px] h-5 px-1.5">Beta</Badge>
                        </h2>
                        <p className="text-slate-500 text-[11px] font-medium leading-none">Analyseer output, efficiëntie, en verlies per week.</p>
                    </div>
                </div>

                <div className="flex bg-slate-100/50 border border-slate-200 p-0.5 rounded-lg">
                    {([1, 3, 6, 12] as const).map((r) => (
                        <button
                            key={r}
                            onClick={() => setTimeRange(r)}
                            className={`px-3 py-0.5 text-[10px] font-bold rounded-md transition-all ${
                                timeRange === r ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-white/50'
                            }`}
                        >
                            {r}M
                        </button>
                    ))}
                </div>
            </div>

            {error && (
                <div className="bg-red-50 text-red-700 p-3 rounded-lg flex items-start gap-3 border border-red-100 text-xs">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <p>{error}</p>
                </div>
            )}

            {isLoading && data.length === 0 ? (
                <div className="p-12 flex flex-col items-center justify-center text-slate-500 animate-pulse gap-3">
                    <Factory className="w-8 h-8 opacity-50" />
                    <p className="text-sm">Laden...</p>
                </div>
            ) : (
                <>
                    {/* 1. Production Card */}
                    <Card className="shadow-sm border-slate-200 overflow-hidden">
                        <CardHeader className="py-2 px-4 flex flex-row items-center justify-between space-y-0 min-h-[54px]">
                            <div>
                                <CardTitle className="text-sm font-bold text-slate-800 uppercase tracking-tight">Productie per Pers (Bruto)</CardTitle>
                                <CardDescription className="text-[10px]">Wekelijkse output verdeeld per machine</CardDescription>
                            </div>
                            {/* Legend in Header Row */}
                            <div className="flex items-center gap-3">
                                {activePresses.map(press => (
                                    <div key={press} className="flex items-center gap-1.5">
                                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[press as keyof typeof COLORS] || COLORS.Default }} />
                                        <span className="text-[10px] font-bold text-slate-600 tracking-tight">{press}</span>
                                    </div>
                                ))}
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="h-[280px] w-full p-2 pt-0">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={outputData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} dy={5} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} 
                                               tickFormatter={(val) => val >= 1000000 ? `${(val/1000000).toFixed(1)}M` : val >= 1000 ? `${val/1000}k` : val} />
                                        <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '12px' }}
                                                 formatter={(val: number, name: string) => [new Intl.NumberFormat('nl-NL').format(val), name]} />
                                        {activePresses.map((press, idx) => (
                                            <Bar key={press} dataKey={press} stackId="a" fill={COLORS[press as keyof typeof COLORS] || COLORS.Default} 
                                                 radius={idx === activePresses.length - 1 ? [2, 2, 0, 0] : [0, 0, 0, 0]} />
                                        ))}
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                        {/* 2. Efficiency Card */}
                        <Card className="shadow-sm border-slate-200 overflow-hidden">
                            <CardHeader className="py-2 px-4 flex flex-row items-center justify-between space-y-0 min-h-[54px]">
                                <div>
                                    <CardTitle className="text-sm font-bold text-slate-800 uppercase tracking-tight">Efficiëntie & Delta</CardTitle>
                                    <CardDescription className="text-[10px]">Netto output vs. Verlies % & Gemiddelde Delta %</CardDescription>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: COLORS.Netto }} />
                                        <span className="text-[10px] font-bold text-slate-600 tracking-tight">Netto</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-2.5 h-0.5" style={{ backgroundColor: COLORS.Waste }} />
                                        <span className="text-[10px] font-bold text-slate-600 tracking-tight">Verlies %</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-2.5 h-0.5" style={{ backgroundColor: COLORS.Delta }} />
                                        <span className="text-[10px] font-bold text-slate-600 tracking-tight">Delta %</span>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="h-[240px] w-full p-2 pt-0">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <ComposedChart data={efficiencyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} dy={5} />
                                            <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }}
                                                   tickFormatter={(val) => val >= 1000000 ? `${(val/1000000).toFixed(1)}M` : (val/1000).toFixed(0)+'k'} />
                                            <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: '#ef4444', fontSize: 10 }}
                                                   tickFormatter={(val) => `${val}%`} />
                                            <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px' }}
                                                     formatter={(val: any, name: string) => name.includes('%') ? [`${val}%`, name] : [new Intl.NumberFormat('nl-NL').format(val), name]} />
                                            <Bar yAxisId="left" dataKey="netto" name="Netto Oplage" fill={COLORS.Netto} radius={[2, 2, 0, 0]} barSize={20} />
                                            <Line yAxisId="right" type="monotone" dataKey="wastePercentage" name="Verlies %" stroke={COLORS.Waste} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                                            <Line yAxisId="right" type="monotone" dataKey="avgDelta" name="Delta %" stroke={COLORS.Delta} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                                        </ComposedChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>

                        {/* 3. Performance Card */}
                        <Card className="shadow-sm border-slate-200 overflow-hidden">
                            <CardHeader className="py-2 px-4 flex flex-row items-center justify-between space-y-0 min-h-[54px]">
                                <div>
                                    <CardTitle className="text-sm font-bold text-slate-800 uppercase tracking-tight flex items-center gap-2 flex-wrap">
                                        Prestaties (Verhouding)
                                        {verliesPercentage > 15 && <Badge variant="destructive" className="bg-red-500 text-[9px] h-4 px-1">Hoog Verlies</Badge>}
                                        {performanceData.find(d => d.name === 'Goed Product')?.value! < performanceData.find(d => d.name === 'Netto Oplage')?.value! && (
                                            <Badge variant="destructive" className="bg-orange-500 text-[9px] h-4 px-1">Productie Tekort</Badge>
                                        )}
                                    </CardTitle>
                                    <CardDescription className="text-[10px]">Netto vs. Goed vs. Verlies</CardDescription>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0 flex flex-row items-center">
                                <div className="w-1/2 h-[220px] relative">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={performanceData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={2} dataKey="value">
                                                {performanceData.map((entry, idx) => <Cell key={idx} fill={entry.color} stroke="none" />)}
                                            </Pie>
                                            <Tooltip formatter={(val: number) => [new Intl.NumberFormat('nl-NL').format(val), 'Aantal']} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                        <span className="text-sm font-bold text-slate-800 leading-none">
                                            {totalPerfValue >= 1000000 ? `${(totalPerfValue/1000000).toFixed(1)}M` : (totalPerfValue/1000).toFixed(1)+'k'}
                                        </span>
                                        <span className="text-[8px] text-slate-500 uppercase font-bold tracking-widest mt-1">Totaal</span>
                                    </div>
                                </div>
                                <div className="w-1/2 p-4 flex flex-col gap-2">
                                    {performanceData.map((item) => (
                                        <div key={item.name} className="flex items-center gap-2">
                                            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-bold text-slate-700 leading-tight uppercase">{item.name}</span>
                                                <span className="text-[10px] text-slate-500 tabular-nums">
                                                    {new Intl.NumberFormat('nl-NL').format(item.value)} ({totalPerfValue > 0 ? Math.round((item.value / totalPerfValue) * 100) : 0}%)
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                    {verliesPercentage > 15 && (
                                        <div className="mt-2 bg-red-50 border border-red-100 text-[10px] p-2 rounded-lg text-red-800 leading-tight flex gap-2">
                                            <AlertCircle className="w-3 h-3 shrink-0 text-red-600" />
                                            <span>Verlies is <strong>{verliesPercentage}%</strong>.</span>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </>
            )}
        </div>
    );
}
