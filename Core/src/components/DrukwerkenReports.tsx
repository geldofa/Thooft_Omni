import { useState, useEffect, useMemo } from 'react';
import { pb, Press } from './AuthContext';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { BookOpen, FileText, ChevronRight, Download, Loader2 } from 'lucide-react';
import { PDFViewer, PDFDownloadLink } from '@react-pdf/renderer';
import { DrukwerkenPDF, DrukwerkTask } from './pdf/DrukwerkenPDF';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from './ui/card';
import { Input } from './ui/input';
import { cn } from './ui/utils';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays, subWeeks, subMonths, subYears } from 'date-fns';

interface DrukwerkenReportsProps {
    presses?: Press[];
}

const PERIOD_OPTIONS = ['Vandaag', 'Gisteren', 'Deze Week', 'Vorige Week', 'Deze Maand', 'Vorige Maand', 'Dit Jaar', 'Vorig Jaar'];

export function DrukwerkenReports({ presses: initialPresses }: DrukwerkenReportsProps) {
    const [presses, setPresses] = useState<Press[]>(initialPresses || []);
    const [isLoading, setIsLoading] = useState(false);
    const [tasks, setTasks] = useState<DrukwerkTask[]>([]);

    const [selectedPress, setSelectedPress] = useState('Alle persen');
    const [selectedPeriod, setSelectedPeriod] = useState('Deze Week');
    const [reportTitle, setReportTitle] = useState('Drukwerken Overzicht');

    const [fontSize, setFontSize] = useState(9);
    const [marginH, setMarginH] = useState(30);
    const [marginV, setMarginV] = useState(10);
    const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

    useEffect(() => {
        if (!initialPresses) {
            (async () => {
                const records = await pb.collection('persen').getFullList({ sort: 'naam' });
                setPresses(records.map((r: any) => ({
                    id: r.id,
                    name: r.naam,
                    active: r.active !== false,
                    archived: r.archived === true
                })));
            })();
        }
    }, [initialPresses]);

    const activePresses = useMemo(() => 
        presses.filter(p => p.active && !p.archived),
    [presses]);


    const buildPeriodFilter = (period: string) => {
        const ref = new Date();
        let start: Date, end: Date;
        const fmt = (d: Date) => d.toISOString().replace('T', ' ').split('.')[0];

        switch (period) {
            case 'Vandaag': start = startOfDay(ref); end = endOfDay(ref); break;
            case 'Gisteren': start = startOfDay(subDays(ref, 1)); end = endOfDay(subDays(ref, 1)); break;
            case 'Deze Week': start = startOfWeek(ref, { weekStartsOn: 1 }); end = endOfWeek(ref, { weekStartsOn: 1 }); break;
            case 'Vorige Week': {
                const prev = subWeeks(ref, 1);
                start = startOfWeek(prev, { weekStartsOn: 1 }); end = endOfWeek(prev, { weekStartsOn: 1 });
                break;
            }
            case 'Deze Maand': start = startOfMonth(ref); end = endOfMonth(ref); break;
            case 'Vorige Maand': {
                const prev = subMonths(ref, 1);
                start = startOfMonth(prev); end = endOfMonth(prev);
                break;
            }
            case 'Dit Jaar': start = startOfYear(ref); end = endOfYear(ref); break;
            case 'Vorig Jaar': {
                const prev = subYears(ref, 1);
                start = startOfYear(prev); end = endOfYear(prev);
                break;
            }
            default: return '';
        }
        return `date >= "${fmt(start)}" && date <= "${fmt(end)}"`;
    };

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setIsLoading(true);
            try {
                const filters: string[] = [];
                if (selectedPress !== 'Alle persen') {
                    const p = activePresses.find(ap => ap.name === selectedPress);
                    if (p) filters.push(`pers = "${p.id}"`);
                }
                const pFilter = buildPeriodFilter(selectedPeriod);
                if (pFilter) filters.push(pFilter);

                const records = await pb.collection('drukwerken').getFullList({
                    filter: filters.join(' && ') || undefined,
                    expand: 'pers',
                    sort: '-date',
                });

                const mapped: DrukwerkTask[] = records.map((r: any) => ({
                    id: r.id,
                    date: r.date.split(' ')[0],
                    order_nummer: r.order_nummer,
                    klant_order_beschrijving: r.klant_order_beschrijving,
                    versie: r.versie,
                    blz: r.blz,
                    ex_omw: r.ex_omw,
                    netto_oplage: r.netto_oplage,
                    opstart: r.opstart,
                    k_4_4: r.k_4_4,
                    k_4_0: r.k_4_0,
                    k_1_0: r.k_1_0,
                    k_1_1: r.k_1_1,
                    k_4_1: r.k_4_1,
                    max_bruto: r.max_bruto,
                    groen: r.groen,
                    rood: r.rood,
                    delta: r.delta,
                    delta_percent: r.delta_percent,
                    pers_name: r.expand?.pers?.naam || 'Onbekend'
                }));

                if (!cancelled) setTasks(mapped);
            } catch (e) {
                console.error("Failed to fetch drukwerken", e);
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [selectedPress, selectedPeriod, activePresses]);

    return (
        <div className="w-full h-full mx-auto flex flex-col gap-6 overflow-hidden">
            <div className="flex items-center justify-between shrink-0">
                <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <BookOpen className="w-6 h-6 text-emerald-600" /> Drukwerken Rapporten
                </h1>
            </div>

            <div className="flex flex-row gap-6 items-start w-full h-[calc(100vh-170px)]">
                {/* Left Panel - Configuration */}
                <div className="flex-1 min-w-[400px] h-full">
                    <Card className="flex flex-col h-full border-sky-100 shadow-sm overflow-hidden flex-1 shrink-0">
                        <CardHeader className="pb-4 shrink-0">
                            <CardTitle className="text-base">Filters & Layout</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6 flex-1 overflow-y-auto min-h-0 custom-scrollbar pb-6 pr-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs uppercase text-muted-foreground font-bold">Rapport Titel</Label>
                                <Input value={reportTitle} onChange={e => setReportTitle(e.target.value)} placeholder="Bijv. Wekelijks Productie Overzicht" />
                            </div>

                            <div className="space-y-3">
                                <Label className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">Pers Selectie</Label>
                                <div className="flex flex-wrap gap-2">
                                    {['Alle persen', ...activePresses.map(p => p.name)].map((p) => (
                                        <Button
                                            key={p}
                                            variant={selectedPress === p ? "default" : "outline"}
                                            size="sm"
                                            onClick={() => setSelectedPress(p)}
                                            className={cn(
                                                "rounded-full px-4 h-8 text-xs transition-all",
                                                selectedPress === p ? "bg-sky-600 border-sky-600 shadow-sm" : "border-slate-200 text-slate-600 hover:bg-slate-50"
                                            )}
                                        >
                                            {p}
                                        </Button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-3">
                                <Label className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">Periode</Label>
                                <div className="flex flex-wrap gap-2">
                                    {PERIOD_OPTIONS.map(o => (
                                        <Button
                                            key={o}
                                            variant={selectedPeriod === o ? "default" : "outline"}
                                            size="sm"
                                            onClick={() => setSelectedPeriod(o)}
                                            className={cn(
                                                "rounded-full px-4 h-8 text-xs transition-all",
                                                selectedPeriod === o ? "bg-slate-800 border-slate-800" : "border-slate-200 text-slate-500 hover:bg-slate-50"
                                            )}
                                        >
                                            {o}
                                        </Button>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-4 border-t mt-4">
                                <Button variant="ghost" size="sm" onClick={() => setIsAdvancedOpen(!isAdvancedOpen)} className="w-full justify-between h-8 text-[10px] font-bold uppercase text-slate-400">
                                    <span>Extra PDF Opties</span>
                                    <ChevronRight className={cn("w-3 h-3 transition-transform", isAdvancedOpen && "rotate-90")} />
                                </Button>
                                {isAdvancedOpen && (
                                    <div className="grid grid-cols-3 gap-2 mt-2 p-2 bg-slate-50 rounded border animate-in fade-in duration-200">
                                        <div className="space-y-1"><Label className="text-[9px] uppercase">Font</Label><Input type="number" value={fontSize} onChange={e => setFontSize(Number(e.target.value))} className="h-7 text-[10px]" /></div>
                                        <div className="space-y-1"><Label className="text-[9px] uppercase">Marge H</Label><Input type="number" value={marginH} onChange={e => setMarginH(Number(e.target.value))} className="h-7 text-[10px]" /></div>
                                        <div className="space-y-1"><Label className="text-[9px] uppercase">Marge V</Label><Input type="number" value={marginV} onChange={e => setMarginV(Number(e.target.value))} className="h-7 text-[10px]" /></div>
                                    </div>
                                )}
                            </div>
                        </CardContent>

                        <CardFooter className="flex flex-col gap-2 pt-4 border-t bg-slate-50/50 shrink-0">
                            {tasks.length > 0 ? (
                                <PDFDownloadLink
                                    document={
                                        <DrukwerkenPDF
                                            reportTitle={reportTitle}
                                            selectedPeriod={selectedPeriod}
                                            tasks={tasks}
                                            fontSize={fontSize}
                                            marginH={marginH}
                                            marginV={marginV}
                                        />
                                    }
                                    fileName={`drukwerken-${selectedPress.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.pdf`}
                                    className="w-full"
                                >
                                    {({ loading }) => (
                                        <Button className="w-full h-10 bg-sky-600 hover:bg-sky-700 text-white font-bold gap-2" disabled={loading}>
                                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                                            {loading ? 'Genereren...' : `Download PDF (${tasks.length} jobs)`}
                                        </Button>
                                    )}
                                </PDFDownloadLink>
                            ) : (
                                <Button disabled className="w-full h-10 font-bold gap-2">
                                    <Download className="w-4 h-4" /> Download PDF
                                </Button>
                            )}
                        </CardFooter>
                    </Card>
                </div>

                {/* Right Panel - Live Preview */}
                <div className="flex-1 h-full min-w-0 shrink flex justify-center bg-transparent">
                    <div className="relative h-full bg-slate-100 rounded-xl border border-sky-100 overflow-hidden shadow-sm flex items-center justify-center w-full">
                        {isLoading ? (
                            <div className="flex flex-col items-center gap-3">
                                <Loader2 className="h-10 w-10 animate-spin text-sky-600" />
                                <p className="font-medium text-sky-900 text-lg">Preview wordt gegenereerd...</p>
                            </div>
                        ) : tasks.length > 0 ? (
                            <PDFViewer width="100%" height="100%" className="border-none">
                                <DrukwerkenPDF
                                    reportTitle={reportTitle}
                                    selectedPeriod={selectedPeriod}
                                    tasks={tasks}
                                    fontSize={fontSize}
                                    marginH={marginH}
                                    marginV={marginV}
                                />
                            </PDFViewer>
                        ) : (
                            <div className="text-center p-8">
                                <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                <p className="text-sm text-slate-400 font-medium">Geen data gevonden voor de geselecteerde filters.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
