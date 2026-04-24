import { useState, useEffect, useCallback, Fragment } from 'react';
import { pb, useAuth } from './AuthContext';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from './ui/table';
import {
    FileText,
    RefreshCw,
    Search,
    X,
    ChevronDown,
    ChevronRight,
    Printer,
    User,
    Clock,
    Package,
    AlertCircle,
    Trash2,
    Settings,
    Plus,
} from 'lucide-react';
import { cn } from './ui/utils';
import { formatDisplayDate } from '../utils/dateUtils';
import { ConfirmationModal } from './ui/ConfirmationModal';
import { JdfNameFilter, VersionLabelFilter, newVersionLabelFilter } from '../utils/jdf-filter-utils';

interface JdfVersion {
    version: string;
    langPrefix: string;
    versionLabel: string;
    partVersion: string;
    oplage?: number;
    wissel?: string;
}

interface JdfKatern {
    sectionId: string;
    signatureId: string;
    volgorde: number | null;
    pagination: number;
    wissel: string;
    press: string;
    oplage: number | null;
    extern: boolean;
    vouwwijze: string;
    exOmw: string;
    papier: string;
    kilo: number | null;
    versies: string[];
}

interface JdfOrderRecord {
    id: string;
    order_nummer: string;
    order_naam: string;
    klant: string;
    pers_device_id: string;
    pers: string;
    ex_omw: string;
    paginas: number;
    versies: JdfVersion[];
    katernen: JdfKatern[];
    aantal_versies: number;
    deadline: string;
    target_print_date: string;
    csr: string;
    papier: string;
    totaal_oplage: number;
    kleuren_voor: string;
    kleuren_achter: string;
    vouwwijze: string;
    bruto_breedte: string;
    bruto_hoogte: string;
    jdf_bestandsnaam: string;
    jdf_grootte: number;
    created: string;
    updated: string;
    expand?: {
        pers?: { naam: string };
    };
}

const LANG_CHIP_COLORS: Record<string, { bg: string; text: string; border: string }> = {
    NL: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
    FR: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
    DE: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
    EN: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
};

export function JdfOverview() {
    const { hasPermission, user } = useAuth();
    const legacy = hasPermission('jdf_gebruiken');
    const canSeeAll = hasPermission('jdf_bekijken_alle') || legacy;
    const canSeeOwn = hasPermission('jdf_bekijken_eigen');
    const canEditFilters = hasPermission('jdf_filters_bewerken') || legacy;

    const [orders, setOrders] = useState<JdfOrderRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [lastScan, setLastScan] = useState<any>(null);
    const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
    const [scanning, setScanning] = useState(false);

    // --- Consolidated filter state ---
    const [nameFilters, setNameFilters] = useState<JdfNameFilter[]>([]);
    const [versionFilters, setVersionFilters] = useState<VersionLabelFilter[]>([]);
    const [filterPanelOpen, setFilterPanelOpen] = useState(false);
    const [filtersDirty, setFiltersDirty] = useState(false);
    const [savingFilters, setSavingFilters] = useState(false);

    useEffect(() => {
        pb.collection('app_settings').getFirstListItem('key = "jdf_name_filters"')
            .then(rec => { if (Array.isArray(rec?.value)) setNameFilters(rec.value as JdfNameFilter[]); })
            .catch(() => {});
        pb.collection('app_settings').getFirstListItem('key = "version_label_filters"')
            .then(rec => { if (Array.isArray(rec?.value)) setVersionFilters(rec.value as VersionLabelFilter[]); })
            .catch(() => {});
    }, []);

    const saveSetting = async (key: string, value: any) => {
        let rec;
        try { rec = await pb.collection('app_settings').getFirstListItem(`key = "${key}"`); } catch { /* not found */ }
        if (rec) await pb.collection('app_settings').update(rec.id, { value });
        else await pb.collection('app_settings').create({ key, value });
    };

    const saveFilters = async () => {
        setSavingFilters(true);
        try {
            await saveSetting('jdf_name_filters', nameFilters);
            await saveSetting('version_label_filters', versionFilters);
            setFiltersDirty(false);
        } catch (e) {
            console.error('[JdfOverview] Save filters error:', e);
        } finally {
            setSavingFilters(false);
        }
    };

    const updateNameFilter = (id: string, patch: Partial<JdfNameFilter>) => {
        setNameFilters(prev => prev.map(f => f.id === id ? { ...f, ...patch } : f));
        setFiltersDirty(true);
    };
    const removeNameFilter = (id: string) => {
        setNameFilters(prev => prev.filter(f => f.id !== id));
        setFiltersDirty(true);
    };
    const updateVersionFilter = (id: string, patch: Partial<VersionLabelFilter>) => {
        setVersionFilters(prev => prev.map(f => f.id === id ? { ...f, ...patch } : f));
        setFiltersDirty(true);
    };
    const removeVersionFilter = (id: string) => {
        setVersionFilters(prev => prev.filter(f => f.id !== id));
        setFiltersDirty(true);
    };

    const getFilterPreview = (f: VersionLabelFilter): string | null => {
        if (!f.versionMatch) return null;
        const match = f.versionMatch.toLowerCase();
        for (const order of orders) {
            const katernen = order.katernen ?? [];
            if (f.requireMultiple && katernen.length <= 1) continue;
            const allMatch = katernen.every(k => k.versies?.some(v => v.toLowerCase() === match));
            if (f.requireAllMatch && !allMatch) continue;
            const katern = katernen.find(k => k.versies?.some(v => v.toLowerCase() === match));
            if (!katern) continue;
            return f.template
                .replace('{signatureId}', String(katern.signatureId ?? ''))
                .replace('{exOmw}', String(katern.exOmw ?? ''))
                .replace('{pages}', String(katern.pagination ?? ''));
        }
        return null;
    };

    const fetchOrders = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const pressFilter = (!canSeeAll && user?.press)
                ? `pers_device_id = "${user.press}"`
                : '';
            const records = await pb.collection('jdf_orders').getFullList({
                sort: 'target_print_date,-created',
                expand: 'pers',
                ...(pressFilter ? { filter: pressFilter } : {}),
            });
            setOrders(records as unknown as JdfOrderRecord[]);

            try {
                const scanSetting = await pb.collection('app_settings').getFirstListItem('key = "jdf_last_scan"');
                if (scanSetting?.value) setLastScan(scanSetting.value);
            } catch { /* no scan info yet */ }
        } catch (e: any) {
            if (e?.status === 404) {
                setError('JDF Orders collectie niet gevonden. Voer eerst de migratie uit.');
            } else {
                setError('Fout bij ophalen van JDF orders.');
                console.error('[JdfOverview] Fetch error:', e);
            }
        } finally {
            setLoading(false);
        }
    }, [canSeeAll, user?.press]);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    const forceScan = useCallback(async () => {
        setScanning(true);
        try {
            await pb.send('/api/jdf/scan?force=true', { method: 'POST' });
            await fetchOrders();
        } catch (e) {
            console.error('[JdfOverview] Force scan error:', e);
        } finally {
            setScanning(false);
        }
    }, [fetchOrders]);

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            await pb.collection('jdf_orders').delete(deleteTarget.id);
            setOrders(prev => prev.filter(o => o.id !== deleteTarget.id));
            setDeleteTarget(null);
        } catch (e) {
            console.error('[JdfOverview] Delete error:', e);
        }
    };

    const filtered = orders.filter(o => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
            o.order_nummer.toLowerCase().includes(q) ||
            o.order_naam.toLowerCase().includes(q) ||
            o.klant.toLowerCase().includes(q) ||
            o.pers_device_id.toLowerCase().includes(q) ||
            o.jdf_bestandsnaam.toLowerCase().includes(q) ||
            o.csr.toLowerCase().includes(q)
        );
    });

    if (!canSeeAll && !canSeeOwn && !hasPermission('jdf_importeren')) {
        return (
            <div className="flex items-center justify-center min-h-[60vh] text-gray-400">
                <AlertCircle className="w-6 h-6 mr-2" />
                Geen toegang
            </div>
        );
    }

    return (
        <div className="space-y-4 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <FileText className="w-6 h-6 text-blue-600" />
                        JDF Orders
                    </h1>
                    <p className="text-sm text-gray-500 mt-0.5">
                        Overzicht van alle geparseerde JDF bestanden in de database
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {/* Scan status */}
                    <div className="flex flex-col items-end text-xs text-gray-400">
                        <div className="flex items-center gap-1.5">
                            <div className={cn(
                                "w-2 h-2 rounded-full",
                                lastScan?.timestamp ? "bg-green-400" : "bg-gray-300"
                            )} />
                            {lastScan?.timestamp
                                ? `Laatste scan: ${new Date(lastScan.timestamp).toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' })}`
                                : 'Nog geen scan'
                            }
                        </div>
                        {lastScan && (
                            <span className="text-[10px]">
                                {lastScan.files_found || 0} bestanden, {lastScan.new_records || 0} nieuw, {lastScan.updated_records || 0} bijgewerkt
                            </span>
                        )}
                    </div>
                    <Button variant="outline" size="sm" onClick={fetchOrders} disabled={loading || scanning}>
                        <RefreshCw className={cn("w-4 h-4 mr-1", loading && "animate-spin")} />
                        Vernieuwen
                    </Button>
                    <Button variant="outline" size="sm" onClick={forceScan} disabled={loading || scanning} className="text-orange-600 border-orange-200 hover:text-orange-700 hover:bg-orange-50">
                        <RefreshCw className={cn("w-4 h-4 mr-1", scanning && "animate-spin")} />
                        Herscannen
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className={cn(filterPanelOpen && "bg-gray-100")}
                        onClick={() => setFilterPanelOpen(p => !p)}
                    >
                        <Settings className="w-4 h-4 mr-1" />
                        Filters{(nameFilters.length + versionFilters.length) > 0 && ` (${nameFilters.length + versionFilters.length})`}
                    </Button>
                </div>
            </div>

            {/* Consolidated filter panel */}
            {filterPanelOpen && (
                <div className="border border-gray-200 rounded-lg bg-gray-50/50 px-3 py-3 space-y-4">

                    {/* --- Naamfilters --- */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Naamfilters</span>
                            {canEditFilters && (
                                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => {
                                    setNameFilters(prev => [...prev, { id: Date.now().toString(), prefix: '', separator: ' - ', splitOn: 'last' }]);
                                    setFiltersDirty(true);
                                }}>
                                    <Plus className="w-3 h-3 mr-1" />Toevoegen
                                </Button>
                            )}
                        </div>
                        {nameFilters.length === 0 && (
                            <p className="text-xs text-gray-400">Geen naamfilters. {canEditFilters ? 'Voeg een regel toe om ordernamen automatisch te splitsen.' : ''}</p>
                        )}
                        {nameFilters.length > 0 && (
                            <div className="space-y-1.5">
                                <div className="grid grid-cols-[1fr_80px_100px_28px] gap-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400 px-1">
                                    <span>Prefix (begint met)</span><span>Scheiding</span><span>Splitsen op</span><span />
                                </div>
                                {nameFilters.map(f => (
                                    <div key={f.id} className="grid grid-cols-[1fr_80px_100px_28px] gap-2 items-center">
                                        <input value={f.prefix} onChange={e => updateNameFilter(f.id, { prefix: e.target.value })} placeholder="bv. PS, Etalage" className="h-7 text-xs border border-gray-200 rounded px-2 bg-white disabled:bg-gray-50 disabled:text-gray-400" disabled={!canEditFilters} />
                                        <input value={f.separator} onChange={e => updateNameFilter(f.id, { separator: e.target.value })} className="h-7 text-xs border border-gray-200 rounded px-2 bg-white font-mono disabled:bg-gray-50 disabled:text-gray-400" disabled={!canEditFilters} />
                                        <div className="flex rounded-md border border-gray-200 overflow-hidden text-[11px] font-medium">
                                            <button className={cn("flex-1 px-2 py-1 transition-colors", f.splitOn === 'first' ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50", !canEditFilters && "pointer-events-none opacity-60")} onClick={() => canEditFilters && updateNameFilter(f.id, { splitOn: 'first' })}>Eerste</button>
                                            <button className={cn("flex-1 px-2 py-1 transition-colors border-l border-gray-200", f.splitOn === 'last' ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50", !canEditFilters && "pointer-events-none opacity-60")} onClick={() => canEditFilters && updateNameFilter(f.id, { splitOn: 'last' })}>Laatste</button>
                                        </div>
                                        {canEditFilters ? (
                                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-gray-400 hover:text-red-500" onClick={() => removeNameFilter(f.id)}><Trash2 className="w-3 h-3" /></Button>
                                        ) : <span />}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="border-t border-gray-200" />

                    {/* --- Versielabel filters --- */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Versielabel filters</span>
                            {canEditFilters && (
                                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => {
                                    setVersionFilters(prev => [...prev, newVersionLabelFilter()]);
                                    setFiltersDirty(true);
                                }}>
                                    <Plus className="w-3 h-3 mr-1" />Toevoegen
                                </Button>
                            )}
                        </div>
                        {versionFilters.length === 0 && (
                            <p className="text-xs text-gray-400">Geen versielabelfilters. {canEditFilters ? 'Voeg een regel toe om versienamen te hernoemen bij import.' : ''}</p>
                        )}
                        {versionFilters.length > 0 && (
                            <div className="space-y-1.5">
                                <div className="grid grid-cols-[100px_1fr_80px_80px_28px] gap-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400 px-1">
                                    <span>Versienaam</span><span>Template</span><span>Meerdere</span><span>Alle</span><span />
                                </div>
                                {versionFilters.map(f => {
                                    const preview = getFilterPreview(f);
                                    return (
                                        <div key={f.id} className="space-y-1">
                                            <div className="grid grid-cols-[100px_1fr_80px_80px_28px] gap-2 items-center">
                                                <input value={f.versionMatch} onChange={e => updateVersionFilter(f.id, { versionMatch: e.target.value })} placeholder="bv. common" className="h-7 text-xs border border-gray-200 rounded px-2 bg-white disabled:bg-gray-50 disabled:text-gray-400" disabled={!canEditFilters} />
                                                <input value={f.template} onChange={e => updateVersionFilter(f.id, { template: e.target.value })} placeholder='Katern "{signatureId}" - "{exOmw}" x "{pages}" Blz' className="h-7 text-xs border border-gray-200 rounded px-2 bg-white font-mono disabled:bg-gray-50 disabled:text-gray-400" disabled={!canEditFilters} />
                                                <button className={cn("h-7 rounded text-[11px] font-medium border transition-colors", f.requireMultiple ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50", !canEditFilters && "pointer-events-none opacity-60")} onClick={() => canEditFilters && updateVersionFilter(f.id, { requireMultiple: !f.requireMultiple })}>{f.requireMultiple ? 'Ja' : 'Nee'}</button>
                                                <button className={cn("h-7 rounded text-[11px] font-medium border transition-colors", f.requireAllMatch ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50", !canEditFilters && "pointer-events-none opacity-60")} onClick={() => canEditFilters && updateVersionFilter(f.id, { requireAllMatch: !f.requireAllMatch })}>{f.requireAllMatch ? 'Ja' : 'Nee'}</button>
                                                {canEditFilters ? (
                                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-gray-400 hover:text-red-500" onClick={() => removeVersionFilter(f.id)}><Trash2 className="w-3 h-3" /></Button>
                                                ) : <span />}
                                            </div>
                                            {preview != null && (
                                                <div className="ml-1 text-[11px] text-gray-400">
                                                    Voorbeeld: <span className="font-medium text-gray-600">{preview}</span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {filtersDirty && canEditFilters && (
                        <div className="flex justify-end pt-1 border-t border-gray-200">
                            <Button size="sm" className="h-7 text-xs" onClick={saveFilters} disabled={savingFilters}>
                                {savingFilters ? 'Opslaan...' : 'Opslaan'}
                            </Button>
                        </div>
                    )}
                </div>
            )}

            {/* Search + stats */}
            <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <Input
                        placeholder="Zoeken op DT nr, naam, klant, pers..."
                        className="pl-10 pr-8 h-9 text-sm"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-2 top-2.5 h-4 w-4 text-gray-400 hover:text-gray-600"
                        >
                            <X className="h-3 w-3" />
                        </button>
                    )}
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span><strong>{orders.length}</strong> records totaal</span>
                    {searchQuery && <span><strong>{filtered.length}</strong> gevonden</span>}
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {error}
                </div>
            )}

            {/* Loading */}
            {loading && orders.length === 0 && (
                <div className="flex items-center justify-center py-12 text-gray-400">
                    <RefreshCw className="w-5 h-5 animate-spin mr-2" />
                    Laden...
                </div>
            )}

            {/* Empty */}
            {!loading && orders.length === 0 && !error && (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-2">
                    <Package className="w-10 h-10" />
                    <p className="text-sm font-medium">Geen JDF orders in de database</p>
                    <p className="text-xs">De watcher hook scant elke 5 minuten de jdf/ map.</p>
                </div>
            )}

            {/* Table */}
            {filtered.length > 0 && (
                <Card>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="text-xs">
                                    <TableHead className="w-8"></TableHead>
                                    <TableHead className="w-[90px]">DT Nr</TableHead>
                                    <TableHead>Order</TableHead>
                                    <TableHead className="w-[140px]">Klant</TableHead>
                                    <TableHead className="w-[100px]">Pers</TableHead>
                                    <TableHead className="w-[60px] text-center">Versies</TableHead>
                                    <TableHead className="w-[50px] text-center">Pag.</TableHead>
                                    <TableHead className="w-[100px]">Drukdatum</TableHead>
                                    <TableHead className="w-[100px]">Bestand</TableHead>
                                    <TableHead className="w-[60px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filtered.map(order => {
                                    const isExpanded = expandedId === order.id;
                                    const katernen = Array.isArray(order.katernen) && order.katernen.length > 0 ? order.katernen : null;
                                    const versies = !katernen && Array.isArray(order.versies) ? order.versies : [];
                                    const presses = katernen
                                        ? [...new Set(katernen.filter(k => !k.extern && k.press).map(k => k.press))]
                                        : [order.expand?.pers?.naam || order.pers_device_id].filter(Boolean);

                                    return (
                                        <Fragment key={order.id}>
                                            <TableRow
                                                className={cn(
                                                    "cursor-pointer transition-colors text-xs",
                                                    isExpanded ? "bg-blue-50/50" : "hover:bg-gray-50"
                                                )}
                                                onClick={() => setExpandedId(isExpanded ? null : order.id)}
                                            >
                                                <TableCell className="px-2">
                                                    {isExpanded
                                                        ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                                                        : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                                                    }
                                                </TableCell>
                                                <TableCell className="font-bold tabular-nums">DT{order.order_nummer}</TableCell>
                                                <TableCell className="truncate max-w-[200px]" title={order.order_naam}>{order.order_naam}</TableCell>
                                                <TableCell className="truncate" title={order.klant}>
                                                    {order.klant || '—'}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-1">
                                                        <Printer className="w-3 h-3 text-gray-400 flex-shrink-0" />
                                                        <div className="flex flex-col leading-tight">
                                                            {presses.length > 0 ? presses.map(p => (
                                                                <span key={p}>{p}</span>
                                                            )) : '—'}
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Badge variant="outline" className="text-[10px] px-1.5 h-4">
                                                        {katernen ? katernen.length : order.aantal_versies}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-center">{order.paginas || '—'}</TableCell>
                                                <TableCell>
                                                    {order.target_print_date ? (
                                                        <div className="flex items-center gap-1">
                                                            <Clock className="w-3 h-3 text-gray-400" />
                                                            {formatDisplayDate(order.target_print_date)}
                                                        </div>
                                                    ) : '—'}
                                                </TableCell>
                                                <TableCell className="truncate text-[10px] text-gray-400 max-w-[100px]" title={order.jdf_bestandsnaam}>
                                                    {order.jdf_bestandsnaam}
                                                </TableCell>
                                                <TableCell>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-6 w-6 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setDeleteTarget({ id: order.id, name: `DT${order.order_nummer} - ${order.order_naam}` });
                                                        }}
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>

                                            {/* Expanded detail row */}
                                            {isExpanded && (
                                                <TableRow key={`${order.id}-detail`} className="bg-blue-50/30">
                                                    <TableCell colSpan={10} className="p-4">
                                                        <div className="grid grid-cols-6 gap-4 text-xs mb-4">
                                                            <div>
                                                                <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Ex/Omw</p>
                                                                <p className="font-semibold">{order.ex_omw || '—'}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Papier</p>
                                                                <p className="font-semibold truncate" title={order.papier}>{order.papier || '—'}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Kleuren V/A</p>
                                                                <p className="font-semibold">{order.kleuren_voor || '—'}/{order.kleuren_achter || '—'}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">CSR</p>
                                                                <p className="font-semibold flex items-center gap-1">
                                                                    {order.csr ? <><User className="w-3 h-3 text-gray-400" />{order.csr}</> : '—'}
                                                                </p>
                                                            </div>
                                                            <div>
                                                                <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Totaal oplage</p>
                                                                <p className="font-semibold">{order.totaal_oplage ? order.totaal_oplage.toLocaleString('nl-BE') : '—'}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Vouwwijze</p>
                                                                <p className="font-semibold">{order.vouwwijze || '—'}</p>
                                                            </div>
                                                            {(order.bruto_breedte || order.bruto_hoogte) && (
                                                                <div>
                                                                    <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Bruto formaat</p>
                                                                    <p className="font-semibold">{order.bruto_breedte}×{order.bruto_hoogte}mm</p>
                                                                </div>
                                                            )}
                                                            <div>
                                                                <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Bestandsgrootte</p>
                                                                <p className="font-semibold">{order.jdf_grootte ? `${(order.jdf_grootte / 1024).toFixed(1)} KB` : '—'}</p>
                                                            </div>
                                                            {order.deadline && (
                                                                <div>
                                                                    <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Leveringsdatum</p>
                                                                    <p className="font-semibold">{formatDisplayDate(order.deadline)}</p>
                                                                </div>
                                                            )}
                                                            <div>
                                                                <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Aangemaakt</p>
                                                                <p className="font-semibold">{formatDisplayDate(order.created)}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Bijgewerkt</p>
                                                                <p className="font-semibold">{formatDisplayDate(order.updated)}</p>
                                                            </div>
                                                        </div>

                                                        {/* Katernen or versies — one unified list, columns match order PDF */}
                                                        {(katernen || versies.length > 0) && (
                                                            <div className="border rounded-lg overflow-hidden bg-white">
                                                                <div className="grid grid-cols-[70px_28px_32px_32px_1fr_1fr_1fr_40px_80px] px-3 py-1.5 bg-gray-50 border-b text-[10px] font-bold uppercase tracking-wider text-gray-400 gap-2">
                                                                    <span>Drukpers</span>
                                                                    <span title="Volgorde">Vlg</span>
                                                                    <span title="Katern (signature_id)">Kat</span>
                                                                    <span title="Platen">Plt</span>
                                                                    <span>Versie</span>
                                                                    <span>Impositie</span>
                                                                    <span>Papier</span>
                                                                    <span title="Kilogram" className="text-right">Kg</span>
                                                                    <span className="text-right">Netto opl.</span>
                                                                </div>
                                                                <div className="divide-y max-h-[200px] overflow-y-auto">
                                                                    {katernen ? katernen.map((k, ki) => (
                                                                        <div key={ki} className={cn("grid grid-cols-[70px_28px_32px_32px_1fr_1fr_1fr_40px_80px] items-center gap-2 px-3 py-1 text-xs", k.extern && "opacity-50")}>
                                                                            <span className={cn("font-semibold truncate", k.extern ? "text-gray-400" : "text-gray-800")} title={k.press}>{k.press}</span>
                                                                            <span className="text-gray-400 tabular-nums">{k.volgorde ?? ki + 1}</span>
                                                                            <span className="text-gray-600 tabular-nums">{k.signatureId || '—'}</span>
                                                                            <span className="text-gray-600 font-mono text-[10px]">{k.wissel || '—'}</span>
                                                                            <span className="text-gray-600 truncate text-[10px]" title={k.versies?.join(', ')}>{k.versies?.join(', ') || '—'}</span>
                                                                            <span className="text-gray-600 truncate text-[10px]" title={k.vouwwijze}>{k.vouwwijze || '—'}</span>
                                                                            <span className="text-gray-600 truncate text-[10px]" title={k.papier}>{k.papier || '—'}</span>
                                                                            <span className="text-gray-500 tabular-nums text-right">{k.kilo != null ? k.kilo.toLocaleString('nl-BE') : '—'}</span>
                                                                            <span className="text-gray-700 font-semibold tabular-nums text-right">{k.oplage ? k.oplage.toLocaleString('nl-BE') : '—'}</span>
                                                                        </div>
                                                                    )) : versies.map((v, i) => {
                                                                        const colors = LANG_CHIP_COLORS[v.langPrefix] ?? { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200' };
                                                                        return (
                                                                            <div key={v.partVersion || i} className="grid grid-cols-[70px_28px_32px_32px_1fr_1fr_1fr_40px_80px] items-center gap-2 px-3 py-1 text-xs">
                                                                                <span className="font-semibold truncate text-gray-800">{order.pers_device_id || '—'}</span>
                                                                                <span className="text-gray-400 tabular-nums">{i + 1}</span>
                                                                                <span className="text-gray-600 tabular-nums">{order.paginas || '—'}</span>
                                                                                <span className="text-gray-400">—</span>
                                                                                {v.langPrefix ? (
                                                                                    <Badge variant="outline" className={cn('text-[10px] px-1.5 h-4 font-bold border w-fit', colors.bg, colors.text, colors.border)}>
                                                                                        {v.langPrefix}
                                                                                    </Badge>
                                                                                ) : <span className="text-gray-600 truncate text-[10px]">{v.versionLabel || v.version}</span>}
                                                                                <span className="text-gray-600 truncate text-[10px]">{order.vouwwijze || '—'}</span>
                                                                                <span className="text-gray-600 truncate text-[10px]" title={order.papier}>{order.papier || '—'}</span>
                                                                                <span className="text-gray-400 text-right">—</span>
                                                                                <span className="text-gray-700 font-semibold tabular-nums text-right">{v.oplage != null ? v.oplage.toLocaleString('nl-BE') : '—'}</span>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </Fragment>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}

            <ConfirmationModal
                open={!!deleteTarget}
                onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
                onConfirm={handleDelete}
                title="JDF Record verwijderen"
                description={`Weet je zeker dat je "${deleteTarget?.name}" wil verwijderen uit de database?`}
                confirmText="Verwijderen"
                variant="destructive"
            />
        </div>
    );
}

export default JdfOverview;
