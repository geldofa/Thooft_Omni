import { useState, useCallback, useEffect } from 'react';
import { Search, CheckCircle, AlertTriangle, ShieldCheck, Database, Loader2, Trash2, Copy, Calculator, Clock, EyeOff, Pencil, X, Save } from 'lucide-react';
import { pb } from '../AuthContext';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { toast } from 'sonner';
import { format } from 'date-fns';

// ─── Types ───────────────────────────────────────────────────────────────────

interface DrukwerkRecord {
    id: string;
    order_nummer: string;
    klant_order_beschrijving: string;
    versie: string;
    date: string;
    created: string;
    groen: number | null;
    rood: number | null;
    max_bruto: number | null;
    delta: number | null;
    delta_percent: number | null;
    is_finished: boolean;
    pressName: string;
}

interface DuplicateGroup {
    key: string;
    orderNr: string;
    versie: string;
    records: DrukwerkRecord[];
    ignoredIds: Set<string>;
}

interface CalcIssue {
    record: DrukwerkRecord;
    storedDelta: number | null;
    expectedDelta: number | null;
    ignored: boolean;
}

interface LingeringOrder {
    record: DrukwerkRecord;
    daysSinceCreated: number;
    ignored: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(str: string | null | undefined): string {
    if (!str) return '—';
    try {
        return format(new Date(str), 'dd/MM/yyyy');
    } catch {
        return str;
    }
}

function formatDateTime(str: string | null | undefined): string {
    if (!str) return '—';
    try {
        return format(new Date(str), 'dd/MM/yyyy HH:mm');
    } catch {
        return str;
    }
}

const CALC_TOLERANCE = 2; // allow ±2 rounding difference

function calcExpectedDelta(groen: number | null, maxBruto: number | null): number | null {
    if (groen == null || maxBruto == null || maxBruto === 0) return null;
    return groen - maxBruto;
}

// Returns true if all records in the group are identical except for created/date
function isSameExceptDate(group: DuplicateGroup): boolean {
    const [first, ...rest] = group.records;
    return rest.every(r =>
        r.klant_order_beschrijving === first.klant_order_beschrijving &&
        r.groen === first.groen &&
        r.rood === first.rood &&
        r.max_bruto === first.max_bruto &&
        r.delta === first.delta &&
        r.is_finished === first.is_finished
    );
}

function hasDeltaMismatch(record: DrukwerkRecord): boolean {
    if (record.groen == null || record.max_bruto == null || !record.max_bruto) return false;
    if (record.delta == null) return false;
    const expected = calcExpectedDelta(record.groen, record.max_bruto);
    if (expected == null) return false;
    return Math.abs(record.delta - expected) > CALC_TOLERANCE;
}

// ─── Column widths ───────────────────────────────────────────────────────────
// Change these to adjust the duplicates table layout
const DUP_COLS = {
    orderNr: 'w-24',      // Order Nr
    naam: '',          // Naam — grows to fill remaining space
    versie: 'w-85',      // Versie
    pers: 'w-20',      // Pers
    datetime: 'w-36',      // Datum / Tijd
    groen: 'w-14',      // Groen
    rood: 'w-14',      // Rood
    voltooid: 'w-24',      // Voltooid
    actie: 'w-36',      // Actie
};

// ─── Component ───────────────────────────────────────────────────────────────

export function DrukwerkenDataChecker() {
    const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([]);
    const [calcIssues, setCalcIssues] = useState<CalcIssue[]>([]);
    const [lingering, setLingering] = useState<LingeringOrder[]>([]);
    const [ignoredDuplicateIds, setIgnoredDuplicateIds] = useState<Set<string>>(new Set());
    const [duplicateFilter, setDuplicateFilter] = useState<'all' | 'empty' | 'exact'>('all');
    const [editingGroup, setEditingGroup] = useState<DuplicateGroup | null>(null);
    const [groupEdits, setGroupEdits] = useState<Record<string, { naam: string; versie: string }>>({});
    const [isSavingGroup, setIsSavingGroup] = useState(false);
    const [ignoredCalcIds, setIgnoredCalcIds] = useState<Set<string>>(new Set());
    const [ignoredLingeringIds, setIgnoredLingeringIds] = useState<Set<string>>(new Set());
    const [editLimitDays, setEditLimitDays] = useState<number>(1);
    const [isScanning, setIsScanning] = useState(false);
    const [hasScanned, setHasScanned] = useState(false);

    const scanData = useCallback(async () => {
        try {
            setIsScanning(true);
            setDuplicates([]);
            setCalcIssues([]);
            setLingering([]);
            setIgnoredDuplicateIds(new Set());
            setIgnoredCalcIds(new Set());
            setIgnoredLingeringIds(new Set());

            // Fetch edit limit from app_settings
            let editLimit = 1;
            try {
                const setting = await pb.collection('app_settings').getFirstListItem('key="drukwerken_edit_limit"');
                editLimit = Number(setting.value) || 1;
            } catch {
                // fallback to 1 day
            }
            setEditLimitDays(editLimit);

            // Fetch all drukwerken records with press expand
            const raw = await pb.collection('drukwerken').getFullList<any>({
                expand: 'pers',
                sort: '-created',
            });

            const records: DrukwerkRecord[] = raw.map((r: any) => ({
                id: r.id,
                order_nummer: r.order_nummer || '',
                klant_order_beschrijving: r.klant_order_beschrijving || '',
                versie: r.versie || '',
                date: r.date || r.created || '',
                created: r.created || '',
                groen: r.groen ?? null,
                rood: r.rood ?? null,
                max_bruto: r.max_bruto ?? null,
                delta: r.delta ?? null,
                delta_percent: r.delta_percent ?? null,
                is_finished: !!r.is_finished,
                pressName: r.expand?.pers?.naam || '—',
            }));

            // ── 1. Duplicates ─────────────────────────────────────────────
            const groupMap = new Map<string, DrukwerkRecord[]>();
            for (const rec of records) {
                const key = `${rec.order_nummer}|||${rec.versie}`;
                if (!groupMap.has(key)) groupMap.set(key, []);
                groupMap.get(key)!.push(rec);
            }

            const foundDuplicates: DuplicateGroup[] = [];
            for (const [key, recs] of groupMap.entries()) {
                if (recs.length > 1) {
                    const [orderNr, versie] = key.split('|||');
                    foundDuplicates.push({
                        key,
                        orderNr,
                        versie,
                        records: recs,
                        ignoredIds: new Set(),
                    });
                }
            }

            // ── 2. Calculation mismatches ─────────────────────────────────
            const foundCalc: CalcIssue[] = [];
            for (const rec of records) {
                if (hasDeltaMismatch(rec)) {
                    foundCalc.push({
                        record: rec,
                        storedDelta: rec.delta,
                        expectedDelta: calcExpectedDelta(rec.groen, rec.max_bruto),
                        ignored: false,
                    });
                }
            }

            // ── 3. Lingering unfinished orders ───────────────────────────
            // Only flag orders that are older than the edit limit — operators can
            // no longer edit them, so they are truly stuck.
            const now = Date.now();
            const foundLingering: LingeringOrder[] = [];
            for (const rec of records) {
                if (!rec.is_finished && (rec.groen ?? 0) === 0 && (rec.rood ?? 0) === 0) {
                    const created = new Date(rec.created).getTime();
                    const daysDiff = Math.floor((now - created) / (1000 * 60 * 60 * 24));
                    // Only flag once the operator edit window has closed
                    if (daysDiff >= editLimit) {
                        foundLingering.push({ record: rec, daysSinceCreated: daysDiff, ignored: false });
                    }
                }
            }

            setDuplicates(foundDuplicates);
            setCalcIssues(foundCalc);
            setLingering(foundLingering);
            setHasScanned(true);

            const total = foundDuplicates.length + foundCalc.length + foundLingering.length;
            if (total === 0) {
                toast.success('Geen problemen gevonden.');
            } else {
                toast.info(`${total} issue(s) gevonden.`);
            }
        } catch (error: any) {
            console.error('Scan failed:', error);
            toast.error(`Scan mislukt: ${error.message}`);
        } finally {
            setIsScanning(false);
        }
    }, []);

    const deleteRecord = useCallback(async (id: string, label: string) => {
        try {
            await pb.collection('drukwerken').delete(id);
            // Remove from duplicates state
            setDuplicates(prev => prev
                .map(g => ({ ...g, records: g.records.filter(r => r.id !== id) }))
                .filter(g => g.records.length > 1)
            );
            // Remove from calc issues & lingering
            setCalcIssues(prev => prev.filter(i => i.record.id !== id));
            setLingering(prev => prev.filter(i => i.record.id !== id));
            toast.success(`Record "${label}" verwijderd.`);
        } catch (error: any) {
            toast.error(`Verwijderen mislukt: ${error.message}`);
        }
    }, []);

    const deleteAllFiltered = useCallback(async () => {
        let toDelete: DrukwerkRecord[] = [];

        if (duplicateFilter === 'empty') {
            toDelete = duplicates
                .flatMap(g => g.records)
                .filter(r => (r.groen ?? 0) === 0 && (r.rood ?? 0) === 0 && !ignoredDuplicateIds.has(r.id));
        } else if (duplicateFilter === 'exact') {
            toDelete = duplicates
                .filter(g => isSameExceptDate(g))
                .flatMap(g => {
                    const sorted = [...g.records]
                        .filter(r => !ignoredDuplicateIds.has(r.id))
                        .sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());
                    return sorted.slice(1);
                });
        }

        if (toDelete.length === 0) return;
        try {
            await Promise.all(toDelete.map(r => pb.collection('drukwerken').delete(r.id)));
            const deletedIds = new Set(toDelete.map(r => r.id));
            setDuplicates(prev => prev
                .map(g => ({ ...g, records: g.records.filter(r => !deletedIds.has(r.id)) }))
                .filter(g => g.records.length > 1)
            );
            setCalcIssues(prev => prev.filter(i => !deletedIds.has(i.record.id)));
            setLingering(prev => prev.filter(i => !deletedIds.has(i.record.id)));
            toast.success(`${toDelete.length} record${toDelete.length > 1 ? 's' : ''} verwijderd.`);
        } catch (error: any) {
            toast.error(`Verwijderen mislukt: ${error.message}`);
        }
    }, [duplicates, ignoredDuplicateIds, duplicateFilter]);

    const openGroupEdit = (group: DuplicateGroup) => {
        const edits: Record<string, { naam: string; versie: string }> = {};
        for (const r of group.records) {
            edits[r.id] = { naam: r.klant_order_beschrijving, versie: r.versie };
        }
        setGroupEdits(edits);
        setEditingGroup(group);
    };

    const saveGroupEdit = useCallback(async () => {
        if (!editingGroup) return;
        setIsSavingGroup(true);
        try {
            await Promise.all(
                editingGroup.records.map(r =>
                    pb.collection('drukwerken').update(r.id, {
                        klant_order_beschrijving: groupEdits[r.id]?.naam ?? r.klant_order_beschrijving,
                        versie: groupEdits[r.id]?.versie ?? r.versie,
                    })
                )
            );
            // Apply edits locally then re-group
            setDuplicates(prev => {
                const allRecords = prev.flatMap(g => g.records).map(r =>
                    groupEdits[r.id]
                        ? { ...r, klant_order_beschrijving: groupEdits[r.id].naam, versie: groupEdits[r.id].versie }
                        : r
                );
                const groupMap = new Map<string, DrukwerkRecord[]>();
                for (const r of allRecords) {
                    const key = `${r.order_nummer}|||${r.versie}`;
                    if (!groupMap.has(key)) groupMap.set(key, []);
                    groupMap.get(key)!.push(r);
                }
                return Array.from(groupMap.values())
                    .filter(recs => recs.length > 1)
                    .map(recs => ({
                        key: `${recs[0].order_nummer}|||${recs[0].versie}`,
                        orderNr: recs[0].order_nummer,
                        versie: recs[0].versie,
                        records: recs,
                        ignoredIds: new Set<string>(),
                    }));
            });
            setEditingGroup(null);
            toast.success('Wijzigingen opgeslagen.');
        } catch (error: any) {
            toast.error(`Opslaan mislukt: ${error.message}`);
        } finally {
            setIsSavingGroup(false);
        }
    }, [editingGroup, groupEdits]);

    const toggleDuplicateIgnore = (id: string) => {
        setIgnoredDuplicateIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const toggleCalcIgnore = (id: string) => {
        setIgnoredCalcIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const toggleLingeringIgnore = (id: string) => {
        setIgnoredLingeringIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    useEffect(() => { scanData(); }, [scanData]);

    const visibleCalcIssues = calcIssues.filter(i => !ignoredCalcIds.has(i.record.id));
    const visibleLingering = lingering.filter(i => !ignoredLingeringIds.has(i.record.id));

    const totalIssues = duplicates.length + visibleCalcIssues.length + visibleLingering.length;

    return (
        <div className="space-y-6 p-4 max-w-[1600px] mx-auto">
            <Card className="border-none shadow-sm bg-white/50 backdrop-blur-sm">
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-7">
                    <div>
                        <CardTitle className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                            <Database className="w-6 h-6 text-blue-600" />
                            Data Checker — Drukwerken
                        </CardTitle>
                        <p className="text-sm text-slate-500 mt-1">
                            Controleert op duplicaten, berekeningsfouten en hangende orders.
                        </p>
                    </div>
                    <Button
                        variant="outline"
                        onClick={scanData}
                        disabled={isScanning}
                        className="bg-white"
                    >
                        {isScanning ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
                        Scan Drukwerken
                    </Button>
                </CardHeader>

                <CardContent>
                    {!hasScanned ? (
                        <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                            {isScanning ? (
                                <div className="flex flex-col items-center gap-3">
                                    <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
                                    <p className="text-slate-500 font-medium">Bezig met scannen...</p>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-3">
                                    <ShieldCheck className="w-12 h-12 text-slate-300" />
                                    <p className="text-slate-500 font-medium font-industrial">Klik op "Scan Drukwerken" om de audit te starten.</p>
                                </div>
                            )}
                        </div>
                    ) : totalIssues === 0 ? (
                        <div className="text-center py-20 border-2 border-dashed border-emerald-200 rounded-2xl bg-emerald-50/30">
                            <div className="flex flex-col items-center gap-3">
                                <ShieldCheck className="w-12 h-12 text-emerald-400" />
                                <p className="text-emerald-600 font-semibold">Alles ziet er goed uit.</p>
                                <p className="text-slate-400 text-sm">Geen duplicaten, berekeningsfouten of hangende orders gevonden.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-10">

                            {/* ── Section 1: Duplicates ── */}
                            {duplicates.length > 0 && (
                                <section className="space-y-3">
                                    <div className="flex items-center justify-between gap-3 px-1">
                                        <div className="flex items-center gap-3">
                                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                                <div className="w-2 h-6 bg-orange-500 rounded-full" />
                                                <Copy className="w-5 h-5 text-orange-500" />
                                                Duplicaten
                                            </h3>
                                            <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                                                {duplicates.length} groep(en)
                                            </Badge>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {/* Tab chooser */}
                                            <div className="w-48">
                                                {duplicateFilter !== 'all' && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 text-xs gap-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 w-full"
                                                        onClick={deleteAllFiltered}
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                        {duplicateFilter === 'exact' ? 'Verwijder oudste duplicaten' : 'Verwijder alle lege'}
                                                    </Button>
                                                )}
                                            </div>
                                            <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5 gap-0.5">
                                                {([
                                                    { value: 'all', label: 'Alles' },
                                                    { value: 'empty', label: '0-orders' },
                                                    { value: 'exact', label: 'Duplicaten' },
                                                ] as const).map(tab => (
                                                    <button
                                                        key={tab.value}
                                                        onClick={() => setDuplicateFilter(tab.value)}
                                                        className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${duplicateFilter === tab.value
                                                            ? 'bg-white text-slate-800 shadow-sm border border-slate-200'
                                                            : 'text-slate-500 hover:text-slate-700'
                                                            }`}
                                                    >
                                                        {tab.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-xs text-slate-400 px-1">
                                        Zelfde ordernummer + versie combinatie meerdere keren gevonden. Verwijder de overbodige rijen handmatig.
                                    </p>

                                    <div className="overflow-hidden rounded-xl border border-slate-200 shadow-sm overflow-x-auto bg-white">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                                                <tr>
                                                    <th className={`px-4 py-3 ${DUP_COLS.orderNr}`}>Order Nr</th>
                                                    <th className={`px-4 py-3 ${DUP_COLS.naam}`}>Naam</th>
                                                    <th className={`px-4 py-3 ${DUP_COLS.versie}`}>Versie</th>
                                                    <th className={`px-4 py-3 ${DUP_COLS.pers}`}>Pers</th>
                                                    <th className={`px-4 py-3 whitespace-nowrap ${DUP_COLS.datetime}`}>Datum / Tijd</th>
                                                    <th className={`px-4 py-3 ${DUP_COLS.groen}`}>Groen</th>
                                                    <th className={`px-4 py-3 ${DUP_COLS.rood}`}>Rood</th>
                                                    <th className={`px-4 py-3 ${DUP_COLS.voltooid}`}>Voltooid</th>
                                                    <th className={`px-4 py-3 text-right ${DUP_COLS.actie}`}>Actie</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {duplicates.filter(group =>
                                                    duplicateFilter !== 'exact' || isSameExceptDate(group)
                                                ).map((group) => {
                                                    // Sort newest first — newest is the "keep" candidate
                                                    const sorted = [...group.records]
                                                        .sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime())
                                                        .filter(r => !ignoredDuplicateIds.has(r.id))
                                                        .filter(r => duplicateFilter !== 'empty' || ((r.groen ?? 0) === 0 && (r.rood ?? 0) === 0));
                                                    if (sorted.length < 2) return null;
                                                    return [
                                                        // Group sub-header with edit button
                                                        <tr key={`header-${group.key}`} className="bg-slate-50 border-t-2 border-orange-200">
                                                            <td colSpan={9} className="px-4 py-2">
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                                                        Order {group.orderNr} — {sorted.length} rijen
                                                                    </span>
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        className="h-7 text-xs gap-1.5 bg-white text-blue-600 border-blue-200 hover:bg-blue-50"
                                                                        onClick={() => openGroupEdit(group)}
                                                                    >
                                                                        <Pencil className="w-3.5 h-3.5" />
                                                                        Bewerken
                                                                    </Button>
                                                                </div>
                                                            </td>
                                                        </tr>,
                                                        ...sorted.map((rec, idx) => {
                                                            const isNewest = idx === 0;
                                                            return (
                                                                <tr
                                                                    key={rec.id}
                                                                    className={`transition-colors ${isNewest
                                                                        ? 'bg-emerald-50/40 hover:bg-emerald-50/70 border-t-2 border-orange-200'
                                                                        : 'hover:bg-slate-50/80 opacity-60'
                                                                        }`}
                                                                >
                                                                    <td className="px-4 py-3 font-mono font-semibold text-slate-900">
                                                                        {rec.order_nummer}
                                                                        {isNewest && (
                                                                            <span className="ml-2 text-[9px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-100 rounded px-1 py-0.5">
                                                                                nieuwste
                                                                            </span>
                                                                        )}
                                                                    </td>
                                                                    <td className="px-4 py-3 max-w-[220px]">
                                                                        <span className="text-slate-600 truncate block">{rec.klant_order_beschrijving}</span>
                                                                    </td>
                                                                    <td className="px-4 py-3">
                                                                        <span className="font-mono text-slate-700">{rec.versie}</span>
                                                                    </td>
                                                                    <td className="px-4 py-3 text-slate-600">{rec.pressName}</td>
                                                                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap font-mono text-xs">
                                                                        {formatDateTime(rec.created)}
                                                                    </td>
                                                                    <td className="px-4 py-3">
                                                                        <span className={`font-medium ${(rec.groen ?? 0) > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                                                                            {rec.groen ?? 0}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-4 py-3">
                                                                        <span className={`font-medium ${(rec.rood ?? 0) > 0 ? 'text-red-500' : 'text-slate-400'}`}>
                                                                            {rec.rood ?? 0}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-4 py-3">
                                                                        {rec.is_finished ? (
                                                                            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] px-1.5">
                                                                                <CheckCircle className="w-3 h-3 mr-1" /> Ja
                                                                            </Badge>
                                                                        ) : (
                                                                            <Badge variant="outline" className="text-slate-400 text-[10px] px-1.5">Nee</Badge>
                                                                        )}
                                                                    </td>
                                                                    <td className="px-4 py-3 text-right">
                                                                        <div className="flex items-center justify-end gap-1">
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="sm"
                                                                                className="h-7 text-slate-400 hover:text-slate-600 px-2"
                                                                                title="Negeren"
                                                                                onClick={() => toggleDuplicateIgnore(rec.id)}
                                                                            >
                                                                                <EyeOff className="w-3.5 h-3.5" />
                                                                            </Button>
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="sm"
                                                                                className="h-7 text-red-400 hover:text-red-600 hover:bg-red-50 px-2 gap-1 text-xs"
                                                                                onClick={() => deleteRecord(rec.id, `${rec.order_nummer} / ${rec.versie}`)}
                                                                            >
                                                                                <Trash2 className="w-3.5 h-3.5" />
                                                                                Verwijder
                                                                            </Button>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })];
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </section>
                            )}

                            {/* ── Section 2: Calculation mismatches ── */}
                            {visibleCalcIssues.length > 0 && (
                                <section className="space-y-3">
                                    <div className="flex items-center gap-3 px-1">
                                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                            <div className="w-2 h-6 bg-red-500 rounded-full" />
                                            <Calculator className="w-5 h-5 text-red-500" />
                                            Berekeningsfouten
                                        </h3>
                                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                            {visibleCalcIssues.length} issue(s)
                                        </Badge>
                                    </div>
                                    <p className="text-xs text-slate-400 px-1">
                                        Opgeslagen Delta (Groen − Max Bruto) komt niet overeen met de verwachte waarde. Mogelijke oorzaak: handmatige aanpassing of parameterfout.
                                    </p>

                                    <div className="overflow-hidden rounded-xl border border-slate-200 shadow-sm overflow-x-auto bg-white">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                                                <tr>
                                                    <th className="px-4 py-3">Order Nr</th>
                                                    <th className="px-4 py-3">Versie</th>
                                                    <th className="px-4 py-3">Pers</th>
                                                    <th className="px-4 py-3">Datum</th>
                                                    <th className="px-4 py-3">Groen</th>
                                                    <th className="px-4 py-3">Max Bruto</th>
                                                    <th className="px-4 py-3">
                                                        <span className="flex items-center gap-1">
                                                            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                                                            Verwacht Δ
                                                        </span>
                                                    </th>
                                                    <th className="px-4 py-3">
                                                        <span className="flex items-center gap-1">
                                                            <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                                                            Opgeslagen Δ
                                                        </span>
                                                    </th>
                                                    <th className="px-4 py-3 text-right">Negeren</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {visibleCalcIssues.map(({ record, storedDelta, expectedDelta }) => (
                                                    <tr key={record.id} className="hover:bg-slate-50/80 transition-colors">
                                                        <td className="px-4 py-3 font-mono font-semibold text-slate-900">{record.order_nummer}</td>
                                                        <td className="px-4 py-3 font-mono text-slate-700">{record.versie}</td>
                                                        <td className="px-4 py-3 text-slate-600">{record.pressName}</td>
                                                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{formatDate(record.date)}</td>
                                                        <td className="px-4 py-3 font-medium text-emerald-700">{record.groen ?? '—'}</td>
                                                        <td className="px-4 py-3 text-slate-700">{record.max_bruto ?? '—'}</td>
                                                        <td className="px-4 py-3 font-medium text-emerald-700">
                                                            {expectedDelta != null ? expectedDelta.toFixed(0) : '—'}
                                                        </td>
                                                        <td className="px-4 py-3 font-medium text-red-600 line-through">
                                                            {storedDelta != null ? storedDelta.toFixed(0) : '—'}
                                                        </td>
                                                        <td className="px-4 py-3 text-right">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-7 text-slate-400 hover:text-slate-600 px-2"
                                                                title="Negeren"
                                                                onClick={() => toggleCalcIgnore(record.id)}
                                                            >
                                                                <EyeOff className="w-3.5 h-3.5" />
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </section>
                            )}

                            {/* ── Section 3: Lingering unfinished orders ── */}
                            {visibleLingering.length > 0 && (
                                <section className="space-y-3">
                                    <div className="flex items-center gap-3 px-1">
                                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                            <div className="w-2 h-6 bg-amber-500 rounded-full" />
                                            <Clock className="w-5 h-5 text-amber-500" />
                                            Hangende Orders
                                        </h3>
                                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                                            {visibleLingering.length} order(s)
                                        </Badge>
                                    </div>
                                    <p className="text-xs text-slate-400 px-1">
                                        Niet-voltooide orders waarbij Groen én Rood nog op 0 staan en ouder zijn dan de bewerkingslimiet ({editLimitDays}d). Operators kunnen deze niet meer bewerken.
                                    </p>

                                    <div className="overflow-hidden rounded-xl border border-slate-200 shadow-sm overflow-x-auto bg-white">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                                                <tr>
                                                    <th className="px-4 py-3">Order Nr</th>
                                                    <th className="px-4 py-3">Versie</th>
                                                    <th className="px-4 py-3">Beschrijving</th>
                                                    <th className="px-4 py-3">Pers</th>
                                                    <th className="px-4 py-3">Aangemaakt</th>
                                                    <th className="px-4 py-3">Dagen oud</th>
                                                    <th className="px-4 py-3 text-right">Acties</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {visibleLingering.map(({ record, daysSinceCreated }) => (
                                                    <tr key={record.id} className="hover:bg-slate-50/80 transition-colors">
                                                        <td className="px-4 py-3 font-mono font-semibold text-slate-900">{record.order_nummer}</td>
                                                        <td className="px-4 py-3 font-mono text-slate-700">{record.versie}</td>
                                                        <td className="px-4 py-3 text-slate-600 max-w-[220px] truncate">{record.klant_order_beschrijving}</td>
                                                        <td className="px-4 py-3 text-slate-600">{record.pressName}</td>
                                                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{formatDate(record.created)}</td>
                                                        <td className="px-4 py-3">
                                                            <Badge
                                                                variant="outline"
                                                                className={`text-[10px] px-1.5 ${daysSinceCreated > editLimitDays
                                                                    ? 'bg-red-50 text-red-700 border-red-200'
                                                                    : 'bg-amber-50 text-amber-700 border-amber-200'
                                                                    }`}
                                                            >
                                                                {daysSinceCreated}d
                                                            </Badge>
                                                        </td>
                                                        <td className="px-4 py-3 text-right flex items-center justify-end gap-1">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-7 text-slate-400 hover:text-slate-600 px-2"
                                                                title="Negeren"
                                                                onClick={() => toggleLingeringIgnore(record.id)}
                                                            >
                                                                <EyeOff className="w-3.5 h-3.5" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-7 text-red-400 hover:text-red-600 hover:bg-red-50 px-2 gap-1 text-xs"
                                                                onClick={() => deleteRecord(record.id, `${record.order_nummer} / ${record.versie}`)}
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                                Verwijder
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </section>
                            )}

                        </div>
                    )}
                </CardContent>
            </Card>

            {/* ── Group Edit Dialog ── */}
            <Dialog open={!!editingGroup} onOpenChange={open => { if (!open) setEditingGroup(null); }}>
                <DialogContent className="!max-w-[1000px] sm:!max-w-[1000px] max-h-[90vh] overflow-y-auto" style={{ maxWidth: '1000px' }}>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Pencil className="w-4 h-4 text-blue-500" />
                            Bewerken — Order {editingGroup?.orderNr}
                        </DialogTitle>
                        <p className="text-sm text-slate-500 mt-1">
                            Pas de naam en versie aan per rij. Na opslaan worden de duplicaten opnieuw berekend.
                        </p>
                    </DialogHeader>

                    <div className="py-2 space-y-2">
                        {/* Column headers */}
                        <div className="grid grid-cols-[1fr_400px_160px] gap-3 px-2 pb-1 border-b border-slate-100">
                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Naam</span>
                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Versie</span>
                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">Aangemaakt</span>
                        </div>

                        {editingGroup && [...editingGroup.records]
                            .sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime())
                            .map((rec, idx) => (
                                <div key={rec.id} className={`grid grid-cols-[1fr_400px_160px] gap-3 items-center px-2 py-2 rounded-lg ${idx === 0 ? 'bg-emerald-50 border border-emerald-200' : 'bg-slate-50 border border-slate-200'}`}>
                                    <input
                                        className="w-full border border-blue-200 rounded px-2.5 py-1.5 text-sm text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                                        value={groupEdits[rec.id]?.naam ?? rec.klant_order_beschrijving}
                                        onChange={e => setGroupEdits(prev => ({ ...prev, [rec.id]: { ...prev[rec.id], naam: e.target.value } }))}
                                    />
                                    <input
                                        className="w-full border border-blue-200 rounded px-2.5 py-1.5 text-sm font-mono text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                                        value={groupEdits[rec.id]?.versie ?? rec.versie}
                                        onChange={e => setGroupEdits(prev => ({ ...prev, [rec.id]: { ...prev[rec.id], versie: e.target.value } }))}
                                    />
                                    <div className="flex flex-col items-end gap-1">
                                        <span className="text-xs font-mono text-slate-600">{formatDate(rec.created)}</span>
                                        <span className="text-xs font-mono text-slate-400">{format(new Date(rec.created), 'HH:mm:ss')}</span>
                                        <div className="flex items-center gap-1 flex-wrap justify-end mt-0.5">
                                            {idx === 0 && (
                                                <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 rounded px-1.5 py-0.5">
                                                    nieuwste
                                                </span>
                                            )}
                                            {rec.is_finished ? (
                                                <span className="text-[9px] font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5">✓ voltooid</span>
                                            ) : (
                                                <span className="text-[9px] text-slate-400 bg-slate-100 rounded px-1.5 py-0.5">niet voltooid</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        }
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingGroup(null)}>
                            Annuleren
                        </Button>
                        <Button
                            onClick={saveGroupEdit}
                            disabled={isSavingGroup}
                            className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
                        >
                            {isSavingGroup
                                ? <Loader2 className="w-4 h-4 animate-spin" />
                                : <Save className="w-4 h-4" />
                            }
                            Wijzigingen Opslaan
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
