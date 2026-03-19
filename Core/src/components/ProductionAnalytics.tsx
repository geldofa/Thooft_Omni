import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { pb } from './AuthContext';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    Line, CartesianGrid, ComposedChart, Legend,
    PieChart, Pie, Cell
} from 'recharts';
import { format, subDays } from 'date-fns';
import { nl } from 'date-fns/locale';
import { AlertCircle, Calendar as CalendarIcon, Factory } from 'lucide-react';
import { Button } from './ui/button';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';
import { cn } from './ui/utils';
import { DateRange } from 'react-day-picker';

const COLORS = {
    Lithoman: '#3b82f6', // blue-500
    'KBA C818': '#6366f1', // indigo-500
    'C80': '#0ea5e9', // sky-500
    Netto: '#0f766e', // teal-700
    Waste: '#ef4444', // red-500
    Production: '#10b981', // emerald-500
    Downtime: '#f97316', // orange-500 - Safety Orange
    Default: '#94a3b8' // slate-400
};

export function ProductionAnalytics() {
    const [data, setData] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Default to last 30 days
    const [date, setDate] = useState<DateRange | undefined>({
        from: subDays(new Date(), 30),
        to: new Date()
    });

    useEffect(() => {
        let isMounted = true;

        async function fetchData() {
            try {
                setIsLoading(true);
                // We fetch all or a large chunk because date filtering logic is complex with PB dates occasionally string formatted differently.
                // For a robust implementation, we fetch recent records and filter in-memory.
                // In production with thousands of records, we would add strict pocketbase filters: `datum >= "2023-01-01"`
                
                // Construct filter for pocketbase based on selected date
                let filterStr = '';
                if (date?.from) {
                    filterStr += `date >= "${format(date.from, 'yyyy-MM-dd')}"`;
                }
                if (date?.to) {
                    if (filterStr) filterStr += ' && ';
                    filterStr += `date <= "${format(date.to, 'yyyy-MM-dd')}"`;
                }

                const records = await pb.collection('drukwerken').getFullList({
                    sort: '-date',
                    filter: filterStr || undefined,
                    expand: 'pers'
                });
                
                if (isMounted) {
                    setData(records);
                    setError(null);
                }
            } catch (err: any) {
                console.error("Failed to fetch production analytics data:", err);
                if (isMounted) {
                    setError("Kon de statistieken niet laden. Controleer je verbinding of permissies.");
                }
            } finally {
                if (isMounted) setIsLoading(false);
            }
        }

        fetchData();

        return () => { isMounted = false; };
    }, [date]);

    // Calculate Data for Visualizations
    const { outputData, efficiencyData, performanceData, activePresses } = useMemo(() => {
        const outputMap: Record<string, any> = {};
        const effMap: Record<string, { date: string, rawDate: Date, bruto: number, netto: number }> = {};
        let totalGroen = 0;
        let totalRood = 0;
        let totalNettoPerf = 0;
        const pressSet = new Set<string>();

        // We sort the data chronologically for charts
        const sortedData = [...data].sort((a, b) => new Date(a.datum).getTime() - new Date(b.datum).getTime());

        sortedData.forEach(record => {
            // Flexible fallback to handle newly added fields vs exiting fields
            const pressName = record.expand?.pers?.naam || record.expand?.pers?.name || record.drukpers || 'Onbekend';
            const recordDateStr = record.date || record.datum;
            if (!recordDateStr) return;
            
            pressSet.add(pressName);

            // Parse Date
            const recordDate = new Date(recordDateStr);
            const dateStr = format(recordDate, 'dd MMM', { locale: nl });

            // 1. Output Data (Stacked Bar)
            if (!outputMap[dateStr]) {
                outputMap[dateStr] = { date: dateStr, rawDate: recordDate };
            }
            const bruto = Number(record.max_bruto || record.oplage_bruto) || 0;
            const netto = Number(record.netto_oplage || record.oplage_netto) || 0;
            
            outputMap[dateStr][pressName] = (outputMap[dateStr][pressName] || 0) + bruto;

            // 2. Efficiency Data (Aggregate per day across all presses)
            if (!effMap[dateStr]) {
                effMap[dateStr] = { date: dateStr, rawDate: recordDate, bruto: 0, netto: 0 };
            }
            effMap[dateStr].bruto += bruto;
            effMap[dateStr].netto += netto;

            // 3. Performance (Donut)
            const groenVal = Number(record.groen) || 0;
            const roodVal = Number(record.rood) || 0;
            totalGroen += groenVal;
            totalRood += roodVal;
            totalNettoPerf += netto;
        });

        const outputArr = Object.values(outputMap).sort((a, b) => a.rawDate.getTime() - b.rawDate.getTime());
        
        const effArr = Object.values(effMap).sort((a, b) => a.rawDate.getTime() - b.rawDate.getTime()).map(day => {
            const waste = day.bruto > 0 ? ((day.bruto - day.netto) / day.bruto) * 100 : 0;
            return {
                date: day.date,
                netto: day.netto,
                wastePercentage: parseFloat(waste.toFixed(2))
            };
        });

        const perfArr = [
            { name: 'Netto Oplage', value: totalNettoPerf, color: COLORS.Netto },
            { name: 'Groen (Goed)', value: totalGroen, color: COLORS.Production },
            { name: 'Rood (Afkeur)', value: totalRood, color: COLORS.Waste }
        ].filter(d => d.value > 0);

        return {
            outputData: outputArr,
            efficiencyData: effArr,
            performanceData: perfArr,
            activePresses: Array.from(pressSet)
        };
    }, [data]);

    const totalPerfValue = performanceData.reduce((sum, item) => sum + item.value, 0);
    const roodValue = performanceData.find(d => d.name.includes('Rood'))?.value || 0;
    const roodPercentage = totalPerfValue > 0 ? Math.round((roodValue / totalPerfValue) * 100) : 0;

    return (
        <div className="space-y-6 max-w-7xl mx-auto w-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-4 gap-4">
                <div className="flex items-center gap-3">
                    <div className="bg-slate-100 p-2 rounded-lg">
                        <Factory className="w-6 h-6 text-slate-700" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                            Productie Statistieken
                            <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-200 uppercase text-xs">Beta</Badge>
                        </h2>
                        <p className="text-slate-500 text-sm mt-1">Analyseer oplages, inschiet, en stilstand.</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                id="date"
                                variant={"outline"}
                                className={cn(
                                    "w-[260px] justify-start text-left font-normal bg-white shadow-sm border-slate-200",
                                    !date && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4 text-slate-500" />
                                {date?.from ? (
                                    date.to ? (
                                        <>
                                            {format(date.from, "d MMM, yyyy", { locale: nl })} -{" "}
                                            {format(date.to, "d MMM, yyyy", { locale: nl })}
                                        </>
                                    ) : (
                                        format(date.from, "d MMM, yyyy", { locale: nl })
                                    )
                                ) : (
                                    <span>Selecteer een datum range</span>
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                            <Calendar
                                initialFocus
                                mode="range"
                                defaultMonth={date?.from}
                                selected={date}
                                onSelect={setDate}
                                numberOfMonths={2}
                                locale={nl}
                            />
                        </PopoverContent>
                    </Popover>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 text-red-700 p-4 rounded-xl flex items-start gap-3 border border-red-100">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <p className="text-sm font-medium">{error}</p>
                </div>
            )}

            {isLoading && data.length === 0 ? (
                <div className="p-12 flex flex-col items-center justify-center text-slate-500 animate-pulse gap-4">
                    <Factory className="w-8 h-8 opacity-50" />
                    <p>Statistieken laden...</p>
                </div>
            ) : (
                <>
                    {/* 1. Total Output Stacked Bar Chart */}
                    <Card className="shadow-sm border-slate-200 w-full min-w-0 overflow-hidden">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg font-semibold text-slate-800">Totale Oplage per Pers (Bruto)</CardTitle>
                            <CardDescription>Dagelijkse output verdeeld per machine</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="h-[350px] w-full relative">
                                <div className="absolute inset-0 p-4 pt-0">
                                    <ResponsiveContainer width="99%" height="100%">
                                        <BarChart
                                            data={outputData}
                                            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                            <XAxis 
                                                dataKey="date" 
                                                axisLine={false} 
                                                tickLine={false} 
                                                tick={{ fill: '#64748b', fontSize: 12 }} 
                                                dy={10} 
                                            />
                                            <YAxis 
                                                axisLine={false} 
                                                tickLine={false} 
                                                tick={{ fill: '#64748b', fontSize: 12 }} 
                                                tickFormatter={(value) => value >= 1000000 ? `${(value/1000000).toFixed(1)}M` : value >= 1000 ? `${value/1000}k` : value}
                                            />
                                            <Tooltip 
                                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                                formatter={(value: number, name: string) => [new Intl.NumberFormat('nl-NL').format(value), name]}
                                            />
                                            <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                            {activePresses.map((press, index) => (
                                                <Bar 
                                                    key={press} 
                                                    dataKey={press} 
                                                    stackId="a" 
                                                    fill={COLORS[press as keyof typeof COLORS] || COLORS.Default} 
                                                    radius={index === activePresses.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                                                />
                                            ))}
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
                        {/* 2. Efficiency & Waste Composed Chart */}
                        <Card className="shadow-sm border-slate-200 min-w-0 overflow-hidden">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-lg font-semibold text-slate-800">Efficiëntie & Inschiet</CardTitle>
                                <CardDescription>Netto oplage vs. Inschiet percentage</CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="h-[300px] w-full relative">
                                    <div className="absolute inset-0 p-4 pt-0">
                                        <ResponsiveContainer width="99%" height="100%">
                                            <ComposedChart
                                                data={efficiencyData}
                                                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                                            >
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                                <XAxis 
                                                    dataKey="date" 
                                                    axisLine={false} 
                                                    tickLine={false} 
                                                    tick={{ fill: '#64748b', fontSize: 12 }} 
                                                    dy={10} 
                                                />
                                                <YAxis 
                                                    yAxisId="left"
                                                    axisLine={false} 
                                                    tickLine={false} 
                                                    tick={{ fill: '#64748b', fontSize: 12 }} 
                                                    tickFormatter={(value) => value >= 1000000 ? `${(value/1000000).toFixed(1)}M` : value >= 1000 ? `${value/1000}k` : value}
                                                />
                                                <YAxis 
                                                    yAxisId="right" 
                                                    orientation="right" 
                                                    axisLine={false} 
                                                    tickLine={false} 
                                                    tick={{ fill: '#ef4444', fontSize: 12 }} 
                                                    tickFormatter={(value) => `${value}%`}
                                                />
                                                <Tooltip 
                                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                                    formatter={(value: number, name: string) => {
                                                        if (name === 'Netto Oplage') return [new Intl.NumberFormat('nl-NL').format(value), name];
                                                        if (name === 'Inschiet %') return [`${value}%`, name];
                                                        return [value, name];
                                                    }}
                                                />
                                                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                                <Bar yAxisId="left" dataKey="netto" name="Netto Oplage" fill={COLORS.Netto} radius={[4, 4, 0, 0]} barSize={32} />
                                                <Line yAxisId="right" type="monotone" dataKey="wastePercentage" name="Inschiet %" stroke={COLORS.Waste} strokeWidth={3} dot={{ fill: COLORS.Waste, r: 4 }} activeDot={{ r: 6 }} />
                                            </ComposedChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* 3. Performance Donut Chart */}
                        <Card className="shadow-sm border-slate-200 min-w-0 overflow-hidden">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                                    Prestaties (Netto, Groen, Rood)
                                    {roodPercentage > 15 && (
                                        <Badge variant="destructive" className="bg-red-500 hover:bg-red-600 text-[10px] px-1.5 py-0 h-5">Veel Afkeur</Badge>
                                    )}
                                </CardTitle>
                                <CardDescription>Verhouding tussen geproduceerde output en afkeur</CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="h-[300px] w-full relative flex items-center">
                                    <div className="w-1/2 h-full relative">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                                                <Pie
                                                    data={performanceData}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={50}
                                                    outerRadius={80}
                                                    paddingAngle={2}
                                                    dataKey="value"
                                                >
                                                    {performanceData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                                    ))}
                                                </Pie>
                                                <Tooltip 
                                                    formatter={(value: number) => [new Intl.NumberFormat('nl-NL').format(value), 'Aantal']}
                                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                        {/* Center Text */}
                                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                            <span className="text-xl font-bold text-slate-800 leading-none">
                                                {totalPerfValue >= 1000000 ? `${(totalPerfValue / 1000000).toFixed(1)}M` : totalPerfValue >= 1000 ? `${(totalPerfValue / 1000).toFixed(1)}k` : totalPerfValue}
                                            </span>
                                            <span className="text-[10px] text-slate-500 font-medium">Totaal</span>
                                        </div>
                                    </div>

                                    {/* Legend/Stats */}
                                    <div className="w-1/2 p-4 flex flex-col justify-center gap-3">
                                        {performanceData.map((item) => (
                                            <div key={item.name} className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-semibold text-slate-700">{item.name}</span>
                                                    <span className="text-xs text-slate-500 tabular-nums">
                                                        {new Intl.NumberFormat('nl-NL').format(item.value)} ({totalPerfValue > 0 ? Math.round((item.value / totalPerfValue) * 100) : 0}%)
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                        
                                        {roodPercentage > 15 && (
                                            <div className="mt-2 bg-red-50 border border-red-200 text-red-800 text-xs p-2 rounded-lg flex items-start gap-2">
                                                <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                                                <span>Aandeel rood (afkeur) is <strong>{roodPercentage}%</strong>.</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </>
            )}
        </div>
    );
}
