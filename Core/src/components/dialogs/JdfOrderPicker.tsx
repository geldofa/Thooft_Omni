import { useState, useEffect, useCallback } from 'react';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';
import { FileText, Clock, User, Printer, Package, ChevronRight, AlertCircle, RefreshCw } from 'lucide-react';
import { pb, useAuth } from '../AuthContext';
import { cn } from '../ui/utils';
import { formatDisplayDate } from '../../utils/dateUtils';
import { JdfNameFilter, applyJdfFilter } from '../../utils/jdf-filter-utils';

interface JdfVersion {
    version: string;
    langPrefix: string;
    versionLabel: string;
    partVersion: string;
    oplage?: number;
    wissel?: string;
}

export interface JdfKatern {
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

export interface JdfOrder {
    id: string;
    order_nummer: string;
    order_naam: string;
    klant: string;
    pers_device_id: string;
    pers: string;
    ex_omw: string;
    paginas: number;
    versies: JdfVersion[];
    aantal_versies: number;
    deadline: string;
    csr: string;
    papier: string;
    totaal_oplage: number;
    kleuren_voor: string;
    kleuren_achter: string;
    vouwwijze: string;
    bruto_breedte: string;
    bruto_hoogte: string;
    katernen: JdfKatern[];
    jdf_bestandsnaam: string;
    created: string;
    updated: string;
    target_print_date?: string;
    filtered_versie?: string;
}

interface JdfOrderPickerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    pressId: string;
    pressName: string;
    printedOrderNrs: Set<string>;
    onSelect: (order: JdfOrder, partVersionIds?: string[], pressFilter?: string) => void;
}

const LANG_CHIP_COLORS: Record<string, { bg: string; text: string; border: string }> = {
    NL: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
    FR: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
    DE: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
    EN: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
};

function getLangChipColors(prefix: string) {
    return LANG_CHIP_COLORS[prefix] ?? { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200' };
}

const SPECIAL_FOLDS: Record<string, string> = {
    'ILF': 'ILF',
    'DELTA': 'Delta',
    'DP': 'Dubbel Parallel',
    'SPLIT': '2 Trechters',
    'SB': 'Smalle baan aan de buitenkant'
};

function getSpecialFold(vouwwijze: string) {
    if (!vouwwijze) return null;
    const parts = vouwwijze.toUpperCase().split('_');
    for (const part of parts) {
        if (SPECIAL_FOLDS[part]) {
            return SPECIAL_FOLDS[part];
        }
    }
    return null;
}

export function JdfOrderPicker({ open, onOpenChange, pressName, printedOrderNrs, onSelect }: JdfOrderPickerProps) {
    const [orders, setOrders] = useState<JdfOrder[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [lastScan, setLastScan] = useState<string | null>(null);
    const [scanning, setScanning] = useState(false);
    const [filters, setFilters] = useState<JdfNameFilter[]>([]);
    // Per-order selectie van versies (keys = order.id, waarde = set van partVersion-ids)
    const [selectedVersions, setSelectedVersions] = useState<Record<string, Set<string>>>({});
    const { hasPermission } = useAuth();

    const toggleVersion = (orderId: string, partVersion: string) => {
        setSelectedVersions(prev => {
            const set = new Set(prev[orderId] || []);
            if (set.has(partVersion)) set.delete(partVersion);
            else set.add(partVersion);
            return { ...prev, [orderId]: set };
        });
    };

    const handleExpand = (order: JdfOrder) => {
        setExpandedId(expandedId === order.id ? null : order.id);
    };

    const loadFilters = useCallback(async () => {
        try {
            const rec = await pb.collection('app_settings').getFirstListItem('key = "jdf_name_filters"');
            const val = rec?.value;
            if (Array.isArray(val) && val.length > 0) setFilters(val as JdfNameFilter[]);
        } catch { /* no filters saved yet */ }
    }, []);

    const fetchOrders = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            let filter = '';
            if (pressName) filter = `pers_device_id = "${pressName}"`;
            const records = await pb.collection('jdf_orders').getFullList({ filter, sort: '-created' });
            setOrders(records as unknown as JdfOrder[]);

            try {
                const scanSetting = await pb.collection('app_settings').getFirstListItem('key = "jdf_last_scan"');
                if (scanSetting?.value) {
                    const val = scanSetting.value as any;
                    setLastScan(val.timestamp || null);
                }
            } catch { /* No scan info yet */ }
        } catch (e: any) {
            if (e?.status === 404) {
                setError('JDF Orders collectie niet gevonden. Voer eerst de migratie uit.');
            } else {
                setError('Fout bij ophalen van JDF orders.');
                console.error('[JdfOrderPicker] Fetch error:', e);
            }
        } finally {
            setLoading(false);
        }
    }, [pressName]);

    const forceScan = useCallback(async () => {
        setScanning(true);
        try {
            await pb.send('/api/jdf/scan?force=true', { method: 'POST' });
            await fetchOrders();
        } catch (e) {
            console.error('[JdfOrderPicker] Force scan error:', e);
        } finally {
            setScanning(false);
        }
    }, [fetchOrders]);

    useEffect(() => {
        if (open) {
            fetchOrders();
            loadFilters();
        }
    }, [open, fetchOrders, loadFilters]);

    const availableOrders = orders.filter(o => !printedOrderNrs.has(String(o.order_nummer))).sort((a, b) => {
        const dateA = a.target_print_date || '9999-12-31';
        const dateB = b.target_print_date || '9999-12-31';
        return dateA.localeCompare(dateB);
    });
    // const printedOrders = orders.filter(o => printedOrderNrs.has(String(o.order_nummer)));

    const handleSelect = (order: JdfOrder, partVersionIds?: string[], pressFilter?: string) => {
        const { orderNaam, versie } = applyJdfFilter(order.order_naam, filters);
        const filteredOrder: JdfOrder = {
            ...order,
            order_naam: orderNaam,
            ...(versie !== null ? { filtered_versie: versie } : {}),
        };
        onSelect(filteredOrder, partVersionIds, pressFilter);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[720px] w-full max-h-[90vh] flex flex-col overflow-hidden gap-3">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold flex items-center gap-2">
                        <Package className="w-5 h-5 text-blue-600" />
                        Beschikbare JDF Orders
                    </DialogTitle>
                    <DialogDescription>
                        Orders uit de JDF-map voor {pressName || 'alle persen'}. Klik om te importeren als werkorder.
                    </DialogDescription>
                </DialogHeader>

                {/* Status row */}
                <div className="flex items-center justify-between text-xs text-gray-500 px-1">
                    <div className="flex items-center gap-2">
                        <div className={cn("w-2 h-2 rounded-full", lastScan ? "bg-green-400" : "bg-gray-300")} />
                        <span>
                            {lastScan
                                ? `Laatste scan: ${new Date(lastScan).toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' })}`
                                : 'Nog geen scan uitgevoerd'}
                        </span>
                    </div>
                    <div className="flex items-center gap-3">
                        <span>{availableOrders.length} beschikbaar</span>
                        {/* 
                        {printedOrders.length > 0 && (
                            <span className="text-gray-400">{printedOrders.length} al gedrukt</span>
                        )}
                        */}
                        {hasPermission('werkfiches_filters_instellingen') && (
                            <>
                                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={fetchOrders} disabled={loading || scanning}>
                                    <RefreshCw className={cn("w-3 h-3 mr-1", loading && "animate-spin")} />
                                    Vernieuwen
                                </Button>
                                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-orange-600 hover:text-orange-700" onClick={forceScan} disabled={loading || scanning}>
                                    <RefreshCw className={cn("w-3 h-3 mr-1", scanning && "animate-spin")} />
                                    Herscannen
                                </Button>
                            </>
                        )}
                    </div>
                </div>

                <div className="flex flex-col flex-1 min-h-0 overflow-y-auto pr-1 gap-2">
                    {error && (
                        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            {error}
                        </div>
                    )}

                    {loading && orders.length === 0 && (
                        <div className="flex items-center justify-center py-12 text-gray-400">
                            <RefreshCw className="w-5 h-5 animate-spin mr-2" />
                            Laden...
                        </div>
                    )}

                    {!loading && availableOrders.length === 0 && !error && (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-400 gap-2">
                            <FileText className="w-8 h-8" />
                            <p className="text-sm">Geen nieuwe JDF orders beschikbaar</p>
                            <p className="text-xs">Alle orders zijn al ingevoerd of er staan geen JDF bestanden in de map.</p>
                        </div>
                    )}

                    {availableOrders.map(order => {
                        const isExpanded = expandedId === order.id;
                        const katernen = Array.isArray(order.katernen) && order.katernen.length > 0 ? order.katernen : null;
                        const versies = !katernen && Array.isArray(order.versies) ? order.versies : [];
                        const { orderNaam: filteredNaam, versie: filteredVersie } = applyJdfFilter(order.order_naam, filters);
                        const hasFilter = filteredNaam !== order.order_naam;
                        const singleVersie = order.aantal_versies <= 1;

                        return (
                            <div
                                key={order.id}
                                className={cn(
                                    "border rounded-xl transition-all duration-150",
                                    isExpanded ? "border-blue-300 bg-blue-50/30 shadow-sm" : "border-gray-200 hover:border-blue-200 hover:bg-gray-50/50"
                                )}
                            >
                                {/* Header row */}
                                <div
                                    className="flex items-center gap-3 px-4 py-3 cursor-pointer"
                                    onClick={() => handleExpand(order)}
                                >
                                    <ChevronRight className={cn("w-4 h-4 text-gray-400 transition-transform flex-shrink-0", isExpanded && "rotate-90")} />

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-bold text-sm tabular-nums">DT{order.order_nummer}</span>
                                            <span className="text-sm text-gray-700 truncate">{filteredNaam}</span>
                                            {hasFilter && singleVersie && filteredVersie && (
                                                <Badge variant="outline" className="text-[10px] px-1.5 h-4 font-semibold border-blue-200 bg-blue-50 text-blue-700 flex-shrink-0">
                                                    {filteredVersie}
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                                            {order.target_print_date && (
                                                <span className="flex items-center gap-1 font-medium text-gray-700">
                                                    <Printer className="w-3 h-3" />
                                                    Geplande drukdatum JDF: {formatDisplayDate(order.target_print_date)}
                                                </span>
                                            )}
                                            {order.klant && (
                                                <span className="flex items-center gap-1">
                                                    <User className="w-3 h-3" />
                                                    {order.klant}
                                                </span>
                                            )}
                                            {order.deadline && (
                                                <span className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    Leverdatum: {formatDisplayDate(order.deadline)}
                                                </span>
                                            )}
                                            {hasFilter && (
                                                <span className="text-gray-300 italic truncate">
                                                    {order.order_naam}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        {(() => {
                                            const sf = getSpecialFold(order.vouwwijze);
                                            if (sf) {
                                                return (
                                                    <Badge variant="outline" className="text-[14px] px-2 h-8 font-bold bg-purple-50 text-purple-700 border-purple-200 uppercase tracking-tight flex items-center">
                                                        {sf}
                                                    </Badge>
                                                );
                                            }
                                            return null;
                                        })()}
                                        <Badge variant="outline" className="text-sm px-2.5 h-8 font-medium min-w-[96px] flex justify-end gap-1 tabular-nums">
                                            <span>{order.aantal_versies}</span>
                                            <span className="w-12 text-left">{order.aantal_versies === 1 ? 'versie' : 'versies'}</span>
                                        </Badge>
                                        {order.paginas > 0 && (
                                            <Badge variant="outline" className="text-sm px-2.5 h-8 font-medium min-w-[60px] justify-end tabular-nums">
                                                {order.paginas}p
                                            </Badge>
                                        )}
                                    </div>
                                </div>

                                {/* Expanded content */}
                                {isExpanded && (
                                    <div className="px-4 pb-3 space-y-3 border-t border-blue-100">
                                        {/* Details grid */}
                                        <div className="grid grid-cols-4 gap-3 text-xs pt-3">
                                            <div>
                                                <p className="text-gray-400 uppercase tracking-wider mb-0.5 text-[10px]">Ex/Omw</p>
                                                <p className="font-semibold">{order.ex_omw || '—'}</p>
                                            </div>
                                            <div>
                                                <p className="text-gray-400 uppercase tracking-wider mb-0.5 text-[10px]">Papier</p>
                                                <p className="font-semibold truncate" title={order.papier}>{order.papier || '—'}</p>
                                            </div>
                                            <div>
                                                <p className="text-gray-400 uppercase tracking-wider mb-0.5 text-[10px]">Kleuren</p>
                                                <p className="font-semibold">{order.kleuren_voor || '—'}/{order.kleuren_achter || '—'}</p>
                                            </div>
                                            <div>
                                                <p className="text-gray-400 uppercase tracking-wider mb-0.5 text-[10px]">CSR</p>
                                                <p className="font-semibold truncate" title={order.csr}>{order.csr || '—'}</p>
                                            </div>
                                            {order.vouwwijze && (
                                                <div>
                                                    <p className="text-gray-400 uppercase tracking-wider mb-0.5 text-[10px]">Vouwwijze</p>
                                                    <p className="font-semibold">{order.vouwwijze}</p>
                                                </div>
                                            )}
                                            {order.totaal_oplage > 0 && (
                                                <div>
                                                    <p className="text-gray-400 uppercase tracking-wider mb-0.5 text-[10px]">Totaal oplage</p>
                                                    <p className="font-semibold">{order.totaal_oplage.toLocaleString('nl-BE')}</p>
                                                </div>
                                            )}
                                            {(order.bruto_breedte || order.bruto_hoogte) && (
                                                <div>
                                                    <p className="text-gray-400 uppercase tracking-wider mb-0.5 text-[10px]">Bruto formaat</p>
                                                    <p className="font-semibold">{order.bruto_breedte}×{order.bruto_hoogte}mm</p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Katernen or versies */}
                                        {(katernen || versies.length > 0) && (
                                            <div className="border rounded-lg overflow-hidden bg-white">
                                                <div className="grid grid-cols-[60px_24px_28px_28px_1fr_1fr_1fr_36px_70px] px-3 py-1.5 bg-gray-50 border-b text-[10px] font-bold uppercase tracking-wider text-gray-400 gap-2">
                                                    <span>Drukpers</span>
                                                    <span title="Volgorde">Vlg</span>
                                                    <span title="Katernen (pagina's)">Kat</span>
                                                    <span title="Platen">Plt</span>
                                                    <span>Versie</span>
                                                    <span>Impositie</span>
                                                    <span>Papier</span>
                                                    <span title="Kilogram">Kg</span>
                                                    <span className="text-right">Netto opl.</span>
                                                </div>
                                                <div className="divide-y max-h-[200px] overflow-y-auto">
                                                    {(() => {
                                                        const versionByName: Record<string, typeof order.versies[number]> = {};
                                                        (order.versies || []).forEach(v => {
                                                            if (v.version) versionByName[v.version] = v;
                                                        });
                                                        const orderSel = selectedVersions[order.id];
                                                        return katernen ? katernen.map((k, ki) => {
                                                            const versNames = (k.versies || []).filter(n => n && n !== 'COMM');
                                                            const isThisPress = !k.extern && pressName && k.press === pressName && katernen.some(ok => !ok.extern && ok.press !== pressName);
                                                            return (
                                                                <div key={ki} className={cn("grid grid-cols-[60px_24px_28px_28px_1fr_1fr_1fr_36px_70px] items-start gap-2 px-3 py-1 text-xs", k.extern && "opacity-50", isThisPress && "bg-blue-50/60")}>
                                                                    <span className={cn("font-semibold truncate", k.extern ? "text-gray-400" : "text-gray-800")} title={k.press}>{k.press}</span>
                                                                    <span className="text-gray-400 tabular-nums">{k.volgorde ?? ki + 1}</span>
                                                                    <span className="text-gray-600 tabular-nums">{k.signatureId || k.pagination}</span>
                                                                    <span className="text-gray-600 font-mono text-[10px]">{k.wissel || '—'}</span>
                                                                    <div className="flex flex-col gap-0.5 min-w-0">
                                                                        {versNames.length === 0 && <span className="text-gray-400 text-[10px]">—</span>}
                                                                        {versNames.map(name => {
                                                                            const v = versionByName[name];
                                                                            const pv = v?.partVersion || name;
                                                                            const isChecked = !!orderSel?.has(pv);
                                                                            const colors = v?.langPrefix ? getLangChipColors(v.langPrefix) : null;
                                                                            return (
                                                                                <label key={pv} className={cn("flex items-center gap-1.5 cursor-pointer min-w-0", k.extern && "cursor-not-allowed")}>
                                                                                    <Checkbox
                                                                                        checked={isChecked}
                                                                                        onCheckedChange={() => !k.extern && toggleVersion(order.id, pv)}
                                                                                        disabled={k.extern}
                                                                                        className="h-3 w-3 flex-shrink-0"
                                                                                    />
                                                                                    {colors && v?.langPrefix && (
                                                                                        <Badge variant="outline" className={cn('text-[9px] px-1 h-3.5 font-bold border flex-shrink-0', colors.bg, colors.text, colors.border)}>
                                                                                            {v.langPrefix}
                                                                                        </Badge>
                                                                                    )}
                                                                                    <span className="text-gray-600 truncate text-[10px]" title={name}>{v?.versionLabel || name}</span>
                                                                                </label>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                    <span className="text-gray-600 truncate text-[10px]" title={k.vouwwijze}>{k.vouwwijze || '—'}</span>
                                                                    <span className="text-gray-600 truncate text-[10px]" title={k.papier}>{k.papier || '—'}</span>
                                                                    <span className="text-gray-500 tabular-nums">{k.kilo ?? '—'}</span>
                                                                    <span className="text-gray-700 font-semibold tabular-nums text-right">{k.oplage ? k.oplage.toLocaleString('nl-BE') : '—'}</span>
                                                                </div>
                                                            );
                                                        }) : versies.map((v, i) => {
                                                            const colors = getLangChipColors(v.langPrefix);
                                                            const pv = v.partVersion || v.version;
                                                            const isChecked = !!orderSel?.has(pv);
                                                            return (
                                                                <div key={pv} className="grid grid-cols-[60px_24px_28px_28px_1fr_1fr_1fr_36px_70px] items-center gap-2 px-3 py-1 text-xs">
                                                                    <span className="text-gray-700 font-semibold truncate">{order.pers_device_id || '—'}</span>
                                                                    <span className="text-gray-400 tabular-nums">{i + 1}</span>
                                                                    <span className="text-gray-600 tabular-nums">{order.paginas || '—'}</span>
                                                                    <span className="text-gray-400">—</span>
                                                                    <label className="flex items-center gap-1.5 cursor-pointer min-w-0">
                                                                        <Checkbox
                                                                            checked={isChecked}
                                                                            onCheckedChange={() => toggleVersion(order.id, pv)}
                                                                            className="h-3 w-3 flex-shrink-0"
                                                                        />
                                                                        {v.langPrefix ? (
                                                                            <Badge variant="outline" className={cn('text-[10px] px-1.5 h-4 font-bold border w-fit', colors.bg, colors.text, colors.border)}>
                                                                                {v.langPrefix}
                                                                            </Badge>
                                                                        ) : (
                                                                            <span className="text-gray-600 truncate text-[10px]">
                                                                                {(hasFilter && singleVersie && filteredVersie) ? filteredVersie : v.versionLabel}
                                                                            </span>
                                                                        )}
                                                                    </label>
                                                                    <span className="text-gray-600 truncate text-[10px]">{order.vouwwijze || '—'}</span>
                                                                    <span className="text-gray-600 truncate text-[10px]" title={order.papier}>{order.papier || '—'}</span>
                                                                    <span className="text-gray-400">—</span>
                                                                    <span className="text-gray-700 font-semibold tabular-nums text-right">{v.oplage ? v.oplage.toLocaleString('nl-BE') : '—'}</span>
                                                                </div>
                                                            );
                                                        });
                                                    })()}
                                                </div>
                                            </div>
                                        )}

                                        {/* Action */}
                                        <div className="flex justify-end gap-2 flex-wrap">
                                            {(() => {
                                                const langs = Array.from(new Set(
                                                    (order.versies || [])
                                                        .map(v => v.langPrefix)
                                                        .filter((p): p is string => !!p)
                                                ));
                                                if (langs.length <= 1) return null;
                                                return langs.map(lang => {
                                                    const colors = getLangChipColors(lang);
                                                    const ids = (order.versies || [])
                                                        .filter(v => v.langPrefix === lang)
                                                        .map(v => v.partVersion);
                                                    return (
                                                        <Button
                                                            key={lang}
                                                            size="sm"
                                                            variant="outline"
                                                            className={cn("min-w-[110px]", colors.bg, colors.text, colors.border)}
                                                            onClick={() => handleSelect(order, ids)}
                                                        >
                                                            Importeer {lang}
                                                        </Button>
                                                    );
                                                });
                                            })()}
                                            {(() => {
                                                const sel = selectedVersions[order.id];
                                                const count = sel?.size || 0;
                                                if (count === 0) return null;
                                                return (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="min-w-[180px] bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100"
                                                        onClick={() => handleSelect(order, Array.from(sel!))}
                                                    >
                                                        Importeer selectie ({count})
                                                    </Button>
                                                );
                                            })()}
                                            {(() => {
                                                if (!katernen || !pressName) return null;
                                                const presses = new Set(katernen.filter(k => !k.extern && k.press).map(k => k.press));
                                                if (presses.size <= 1) return null;
                                                if (!katernen.some(k => !k.extern && k.press === pressName)) return null;
                                                return (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="min-w-[180px] bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                                                        onClick={() => handleSelect(order, undefined, pressName)}
                                                    >
                                                        Importeer voor {pressName}
                                                    </Button>
                                                );
                                            })()}
                                            <Button size="sm" onClick={() => handleSelect(order)} className="min-w-[180px]">
                                                Importeer workorder
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {/* Already printed section - Verborgen op verzoek */}
                    {/*
                    {printedOrders.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-gray-100">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2 px-1">
                                Al gedrukt ({printedOrders.length})
                            </p>
                            {printedOrders.map(order => (
                                <div key={order.id} className="flex items-center gap-3 px-4 py-2 rounded-lg bg-gray-50/50 opacity-50 mb-1">
                                    <span className="font-bold text-xs tabular-nums text-gray-400">DT{order.order_nummer}</span>
                                    <span className="text-xs text-gray-400 truncate">{order.order_naam}</span>
                                    <Badge variant="outline" className="text-[10px] px-1.5 h-4 text-gray-400 border-gray-200 ml-auto">
                                        Gedrukt
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    )}
                    */}
                </div>

                <DialogFooter className="border-t pt-3 flex-none">
                    <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Sluiten</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
