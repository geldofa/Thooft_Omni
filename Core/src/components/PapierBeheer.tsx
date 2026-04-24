import { useState, useEffect, useMemo } from 'react';
import { pb } from './AuthContext';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Search, Package, Plus, Pencil, Trash2, Save, X, Settings2, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from './ui/utils';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from './ui/dialog';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Checkbox } from './ui/checkbox';
import { ConfirmationModal } from './ui/ConfirmationModal';

interface PapierRecord {
    id: string;
    naam: string;
    klasse: string;
    proef_profiel: string;
    gram_per_m2: number | null;
    fabrikant: string;
    opmerking: string;
    start_front_k: number;
    start_front_c: number;
    start_front_m: number;
    start_front_y: number;
    start_back_k: number;
    start_back_c: number;
    start_back_m: number;
    start_back_y: number;
    actief: boolean;
}

interface KlasseInstelling {
    id: string;
    klasse: string;
    front_k: number;
    front_c: number;
    front_m: number;
    front_y: number;
    back_k: number;
    back_c: number;
    back_m: number;
    back_y: number;
}

export function PapierBeheer() {
    const [papers, setPapers] = useState<PapierRecord[]>([]);
    const [instellingen, setInstellingen] = useState<KlasseInstelling[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [editingPaper, setEditingPaper] = useState<Partial<PapierRecord> | null>(null);
    const [deletePaperId, setDeletePaperId] = useState<string | null>(null);
    const [deleteInstId, setDeleteInstId] = useState<string | null>(null);
    const [newKlasseName, setNewKlasseName] = useState('');
    const [isAddKlasseOpen, setIsAddKlasseOpen] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
    const [bulkEdit, setBulkEdit] = useState<{ klasse?: string; fabrikant?: string; proef_profiel?: string; actief?: boolean }>({});
    const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);

    const fetchAll = async () => {
        setIsLoading(true);
        try {
            const [paperList, instList] = await Promise.all([
                pb.collection('papier').getFullList<PapierRecord>({ sort: 'naam' }),
                pb.collection('papier_klasse_instellingen').getFullList<KlasseInstelling>({ sort: 'klasse' })
            ]);
            setPapers(paperList);
            setInstellingen(instList);
        } catch (error) {
            console.error('[PapierBeheer] Fetch error:', error);
            toast.error('Fout bij ophalen gegevens');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAll();
    }, []);

    const filteredPapers = useMemo(() => {
        const q = searchQuery.toLowerCase();
        return papers
            .filter(p =>
                p.naam.toLowerCase().includes(q) ||
                p.klasse?.toLowerCase().includes(q) ||
                p.fabrikant?.toLowerCase().includes(q)
            )
            .sort((a, b) => {
                if (!!a.actief !== !!b.actief) return a.actief ? -1 : 1;
                return a.naam.localeCompare(b.naam);
            });
    }, [papers, searchQuery]);

    const allVisibleSelected = filteredPapers.length > 0 && filteredPapers.every(p => selectedIds.has(p.id));
    const someVisibleSelected = filteredPapers.some(p => selectedIds.has(p.id));

    const toggleSelectAll = () => {
        if (allVisibleSelected) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredPapers.map(p => p.id)));
        }
    };

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const clearSelection = () => setSelectedIds(new Set());

    const handleSavePaper = async () => {
        if (!editingPaper?.naam) {
            toast.error('Naam is verplicht');
            return;
        }

        try {
            if (editingPaper.id) {
                await pb.collection('papier').update(editingPaper.id, editingPaper);
                toast.success('Papier bijgewerkt');
            } else {
                await pb.collection('papier').create(editingPaper);
                toast.success('Papier toegevoegd');
            }
            setIsEditDialogOpen(false);
            fetchAll();
        } catch (error) {
            console.error('[PapierBeheer] Save error:', error);
            toast.error('Opslaan mislukt');
        }
    };

    const handleDeletePaper = async () => {
        if (!deletePaperId) return;
        try {
            await pb.collection('papier').delete(deletePaperId);
            toast.success('Papier verwijderd');
            setDeletePaperId(null);
            fetchAll();
        } catch (error) {
            console.error('[PapierBeheer] Delete error:', error);
            toast.error('Verwijderen mislukt');
        }
    };

    const ColorInput = ({ label, value, onChange, colorClass }: any) => (
        <div className="flex flex-col gap-1">
            <Label className="text-[10px] uppercase text-gray-400">{label}</Label>
            <Input 
                type="number" 
                step="0.01"
                value={value || 0} 
                onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
                className={cn("h-8 text-xs font-bold", colorClass)}
            />
        </div>
    );

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg">
                        <Package className="text-blue-600 size-6" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">Papier Beheer</h1>
                        <p className="text-sm text-gray-500">Beheer alle papier varianten en standaard densiteiten</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                        <Input 
                            placeholder="Zoek op naam, fabrikant..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 bg-gray-50 border-gray-200 h-9"
                        />
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setIsSettingsOpen(true)}>
                        <Settings2 className="size-4 mr-2" />
                        Instellingen
                    </Button>
                    <Button size="sm" onClick={() => { setEditingPaper({ actief: true }); setIsEditDialogOpen(true); }}>
                        <Plus className="size-4 mr-2" />
                        Nieuw Papier
                    </Button>
                </div>
            </div>

            {selectedIds.size > 0 && (
                <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl px-4 py-2 shadow-sm">
                    <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-blue-900">{selectedIds.size} geselecteerd</span>
                        <Button variant="ghost" size="sm" onClick={clearSelection} className="h-7 text-blue-700 hover:text-blue-900">
                            <X className="size-3.5 mr-1" /> Selectie wissen
                        </Button>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleBulkSetActief(true)}>
                            <CheckCircle2 className="size-4 mr-2 text-green-600" /> Activeren
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleBulkSetActief(false)}>
                            <XCircle className="size-4 mr-2 text-gray-500" /> Deactiveren
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => { setBulkEdit({}); setIsBulkEditOpen(true); }}>
                            <Pencil className="size-4 mr-2" /> Bewerken
                        </Button>
                        <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50" onClick={() => setIsBulkDeleteOpen(true)}>
                            <Trash2 className="size-4 mr-2" /> Verwijderen
                        </Button>
                    </div>
                </div>
            )}

            <Card className="border-none shadow-md overflow-hidden">
                <Table>
                    <TableHeader className="bg-gray-50">
                        <TableRow>
                            <TableHead className="w-[40px]">
                                <Checkbox
                                    checked={allVisibleSelected ? true : (someVisibleSelected ? 'indeterminate' : false)}
                                    onCheckedChange={toggleSelectAll}
                                    aria-label="Selecteer alle papieren"
                                />
                            </TableHead>
                            <TableHead>Fabrikant</TableHead>
                            <TableHead>Product</TableHead>
                            <TableHead>Klasse</TableHead>
                            <TableHead>Proefpreset</TableHead>
                            <TableHead className="text-center">Front KCMY</TableHead>
                            <TableHead className="text-center">Back KCMY</TableHead>
                            <TableHead className="text-center w-[80px]">Status</TableHead>
                            <TableHead className="w-[100px] text-right">Acties</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow><TableCell colSpan={9} className="h-32 text-center text-gray-500">Laden...</TableCell></TableRow>
                        ) : filteredPapers.length === 0 ? (
                            <TableRow><TableCell colSpan={9} className="h-32 text-center text-gray-500">Geen papier gevonden</TableCell></TableRow>
                        ) : (
                            filteredPapers.map(paper => (
                                <TableRow key={paper.id} className={cn("hover:bg-blue-50/30", !paper.actief && "opacity-60")}>
                                    <TableCell>
                                        <Checkbox
                                            checked={selectedIds.has(paper.id)}
                                            onCheckedChange={() => toggleSelect(paper.id)}
                                            aria-label={`Selecteer ${paper.naam}`}
                                        />
                                    </TableCell>
                                    <TableCell className="font-medium text-gray-500">{paper.fabrikant || '—'}</TableCell>
                                    <TableCell className="font-bold">{paper.naam}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="bg-gray-50">{paper.klasse || '—'}</Badge>
                                    </TableCell>
                                    <TableCell className="text-sm text-gray-600">{paper.proef_profiel || '—'}</TableCell>
                                    <TableCell>
                                        <div className="flex justify-center gap-1">
                                            {[paper.start_front_k, paper.start_front_c, paper.start_front_m, paper.start_front_y].map((v, i) => (
                                                <div key={i} className="text-[10px] font-bold px-1 rounded bg-gray-100">{v || 0}</div>
                                            ))}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex justify-center gap-1">
                                            {[paper.start_back_k, paper.start_back_c, paper.start_back_m, paper.start_back_y].map((v, i) => (
                                                <div key={i} className="text-[10px] font-bold px-1 rounded bg-gray-100">{v || 0}</div>
                                            ))}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <button 
                                            onClick={() => handleToggleActief(paper.id, paper.actief)}
                                            className={cn(
                                                "px-2 py-1 rounded-full text-[10px] font-bold transition-colors",
                                                paper.actief ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                                            )}
                                        >
                                            {paper.actief ? 'ACTIEF' : 'INACTIEF'}
                                        </button>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-1">
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingPaper(paper); setIsEditDialogOpen(true); }}>
                                                <Pencil className="size-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600" onClick={() => setDeletePaperId(paper.id)}>
                                                <Trash2 className="size-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </Card>

            {/* Edit Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="sm:max-w-[700px]">
                    <DialogHeader>
                        <DialogTitle>{editingPaper?.id ? 'Papier Bewerken' : 'Nieuw Papier Toevoegen'}</DialogTitle>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-4 py-4">
                        <div className="space-y-4">
                            <div className="grid gap-2">
                                <Label>Fabrikant</Label>
                                <Input value={editingPaper?.fabrikant || ''} onChange={e => setEditingPaper({...editingPaper!, fabrikant: e.target.value})} placeholder="Bijv. Sappi" />
                            </div>
                            <div className="grid gap-2">
                                <Label>Product (Naam)</Label>
                                <Input value={editingPaper?.naam || ''} onChange={e => setEditingPaper({...editingPaper!, naam: e.target.value})} placeholder="Bijv. Galerie Fine" />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="grid gap-2">
                                    <Label>Klasse</Label>
                                    <Input value={editingPaper?.klasse || ''} onChange={e => setEditingPaper({...editingPaper!, klasse: e.target.value})} placeholder="Bijv. 1" />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Gram (g/m²)</Label>
                                    <Input type="number" value={editingPaper?.gram_per_m2 || ''} onChange={e => setEditingPaper({...editingPaper!, gram_per_m2: parseInt(e.target.value) || null})} />
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label>Proefpreset (Profiel)</Label>
                                <Input value={editingPaper?.proef_profiel || ''} onChange={e => setEditingPaper({...editingPaper!, proef_profiel: e.target.value})} placeholder="Bijv. FOGRA51" />
                            </div>
                            <div className="flex items-center gap-2 pt-2">
                                <input 
                                    type="checkbox" 
                                    id="paper-actief"
                                    checked={editingPaper?.actief ?? true} 
                                    onChange={e => setEditingPaper({...editingPaper!, actief: e.target.checked})} 
                                    className="size-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <Label htmlFor="paper-actief" className="cursor-pointer">Dit papier is actief en zichtbaar in lijsten</Label>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div className="grid gap-2">
                                <Label>Start Densiteiten Front (KCMY)</Label>
                                <div className="grid grid-cols-4 gap-2">
                                    <ColorInput label="K" value={editingPaper?.start_front_k} onChange={(v: number) => setEditingPaper({...editingPaper!, start_front_k: v})} colorClass="border-gray-800" />
                                    <ColorInput label="C" value={editingPaper?.start_front_c} onChange={(v: number) => setEditingPaper({...editingPaper!, start_front_c: v})} colorClass="border-cyan-500" />
                                    <ColorInput label="M" value={editingPaper?.start_front_m} onChange={(v: number) => setEditingPaper({...editingPaper!, start_front_m: v})} colorClass="border-pink-500" />
                                    <ColorInput label="Y" value={editingPaper?.start_front_y} onChange={(v: number) => setEditingPaper({...editingPaper!, start_front_y: v})} colorClass="border-yellow-500" />
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label>Start Densiteiten Back (KCMY)</Label>
                                <div className="grid grid-cols-4 gap-2">
                                    <ColorInput label="K" value={editingPaper?.start_back_k} onChange={(v: number) => setEditingPaper({...editingPaper!, start_back_k: v})} colorClass="border-gray-800" />
                                    <ColorInput label="C" value={editingPaper?.start_back_c} onChange={(v: number) => setEditingPaper({...editingPaper!, start_back_c: v})} colorClass="border-cyan-500" />
                                    <ColorInput label="M" value={editingPaper?.start_back_m} onChange={(v: number) => setEditingPaper({...editingPaper!, start_back_m: v})} colorClass="border-pink-500" />
                                    <ColorInput label="Y" value={editingPaper?.start_back_y} onChange={(v: number) => setEditingPaper({...editingPaper!, start_back_y: v})} colorClass="border-yellow-500" />
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label>Opmerking</Label>
                                <Textarea value={editingPaper?.opmerking || ''} onChange={e => setEditingPaper({...editingPaper!, opmerking: e.target.value})} className="h-20" />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Annuleren</Button>
                        <Button onClick={handleSavePaper}>Opslaan</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Settings Dialog (Klasse Instellingen) */}
            <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Standaard Densiteiten per Klasse</DialogTitle>
                        <DialogDescription>Stel de standaard start-densiteiten in voor elke papierklasse.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Klasse</TableHead>
                                    <TableHead>Front KCMY</TableHead>
                                    <TableHead>Back KCMY</TableHead>
                                    <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {instellingen.map(inst => (
                                    <TableRow key={inst.id}>
                                        <TableCell className="font-bold">{inst.klasse}</TableCell>
                                        <TableCell>
                                            <div className="flex gap-1">
                                                <Input className="h-8 w-14 text-[10px]" type="number" step="0.01" value={inst.front_k} onChange={e => handleUpdateInst(inst.id, 'front_k', e.target.value)} />
                                                <Input className="h-8 w-14 text-[10px]" type="number" step="0.01" value={inst.front_c} onChange={e => handleUpdateInst(inst.id, 'front_c', e.target.value)} />
                                                <Input className="h-8 w-14 text-[10px]" type="number" step="0.01" value={inst.front_m} onChange={e => handleUpdateInst(inst.id, 'front_m', e.target.value)} />
                                                <Input className="h-8 w-14 text-[10px]" type="number" step="0.01" value={inst.front_y} onChange={e => handleUpdateInst(inst.id, 'front_y', e.target.value)} />
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex gap-1">
                                                <Input className="h-8 w-14 text-[10px]" type="number" step="0.01" value={inst.back_k} onChange={e => handleUpdateInst(inst.id, 'back_k', e.target.value)} />
                                                <Input className="h-8 w-14 text-[10px]" type="number" step="0.01" value={inst.back_c} onChange={e => handleUpdateInst(inst.id, 'back_c', e.target.value)} />
                                                <Input className="h-8 w-14 text-[10px]" type="number" step="0.01" value={inst.back_m} onChange={e => handleUpdateInst(inst.id, 'back_m', e.target.value)} />
                                                <Input className="h-8 w-14 text-[10px]" type="number" step="0.01" value={inst.back_y} onChange={e => handleUpdateInst(inst.id, 'back_y', e.target.value)} />
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Button variant="ghost" size="icon" onClick={() => setDeleteInstId(inst.id)}><Trash2 className="size-4 text-red-400" /></Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                <TableRow>
                                    <TableCell colSpan={4}>
                                        <Button variant="ghost" size="sm" className="w-full text-blue-600" onClick={() => setIsAddKlasseOpen(true)}>
                                            <Plus className="size-4 mr-2" /> Klasse toevoegen
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </div>
                    <DialogFooter>
                        <Button onClick={() => setIsSettingsOpen(false)}>Sluiten</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ConfirmationModal 
                open={!!deletePaperId} 
                onOpenChange={(open) => !open && setDeletePaperId(null)}
                onConfirm={handleDeletePaper}
                title="Papier verwijderen"
                description="Weet je zeker dat je dit papier wilt verwijderen? Dit kan niet ongedaan worden gemaakt."
                variant="destructive"
            />

            <ConfirmationModal 
                open={!!deleteInstId} 
                onOpenChange={(open) => !open && setDeleteInstId(null)}
                onConfirm={handleDeleteInst}
                title="Klasse verwijderen"
                description="Weet je zeker dat je deze papierklasse wilt verwijderen?"
                variant="destructive"
            />

            <Dialog open={isBulkEditOpen} onOpenChange={(o) => { setIsBulkEditOpen(o); if (!o) setBulkEdit({}); }}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Bulk bewerken ({selectedIds.size} papier{selectedIds.size === 1 ? '' : 'en'})</DialogTitle>
                        <DialogDescription>Alleen aangevinkte velden worden overschreven voor de geselecteerde papieren.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="flex items-start gap-3">
                            <Checkbox
                                className="mt-2"
                                checked={bulkEdit.fabrikant !== undefined}
                                onCheckedChange={(c) => setBulkEdit(b => ({ ...b, fabrikant: c ? '' : undefined }))}
                            />
                            <div className="flex-1 grid gap-1">
                                <Label className="text-xs text-gray-500">Fabrikant</Label>
                                <Input
                                    disabled={bulkEdit.fabrikant === undefined}
                                    value={bulkEdit.fabrikant ?? ''}
                                    onChange={e => setBulkEdit(b => ({ ...b, fabrikant: e.target.value }))}
                                />
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <Checkbox
                                className="mt-2"
                                checked={bulkEdit.klasse !== undefined}
                                onCheckedChange={(c) => setBulkEdit(b => ({ ...b, klasse: c ? '' : undefined }))}
                            />
                            <div className="flex-1 grid gap-1">
                                <Label className="text-xs text-gray-500">Klasse</Label>
                                <Input
                                    disabled={bulkEdit.klasse === undefined}
                                    value={bulkEdit.klasse ?? ''}
                                    onChange={e => setBulkEdit(b => ({ ...b, klasse: e.target.value }))}
                                />
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <Checkbox
                                className="mt-2"
                                checked={bulkEdit.proef_profiel !== undefined}
                                onCheckedChange={(c) => setBulkEdit(b => ({ ...b, proef_profiel: c ? '' : undefined }))}
                            />
                            <div className="flex-1 grid gap-1">
                                <Label className="text-xs text-gray-500">Proefpreset</Label>
                                <Input
                                    disabled={bulkEdit.proef_profiel === undefined}
                                    value={bulkEdit.proef_profiel ?? ''}
                                    onChange={e => setBulkEdit(b => ({ ...b, proef_profiel: e.target.value }))}
                                />
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <Checkbox
                                className="mt-2"
                                checked={bulkEdit.actief !== undefined}
                                onCheckedChange={(c) => setBulkEdit(b => ({ ...b, actief: c ? true : undefined }))}
                            />
                            <div className="flex-1 grid gap-1">
                                <Label className="text-xs text-gray-500">Status</Label>
                                <div className="flex gap-2">
                                    <Button
                                        type="button"
                                        variant={bulkEdit.actief === true ? 'default' : 'outline'}
                                        size="sm"
                                        disabled={bulkEdit.actief === undefined}
                                        onClick={() => setBulkEdit(b => ({ ...b, actief: true }))}
                                    >Actief</Button>
                                    <Button
                                        type="button"
                                        variant={bulkEdit.actief === false ? 'default' : 'outline'}
                                        size="sm"
                                        disabled={bulkEdit.actief === undefined}
                                        onClick={() => setBulkEdit(b => ({ ...b, actief: false }))}
                                    >Inactief</Button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsBulkEditOpen(false)}>Annuleren</Button>
                        <Button onClick={handleBulkEditSave}><Save className="size-4 mr-2" />Toepassen</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ConfirmationModal
                open={isBulkDeleteOpen}
                onOpenChange={setIsBulkDeleteOpen}
                onConfirm={handleBulkDelete}
                title={`${selectedIds.size} papier(en) verwijderen`}
                description="Weet je zeker dat je de geselecteerde papieren wilt verwijderen? Dit kan niet ongedaan worden gemaakt."
                variant="destructive"
            />

            <Dialog open={isAddKlasseOpen} onOpenChange={setIsAddKlasseOpen}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle>Nieuwe Klasse Toevoegen</DialogTitle>
                        <DialogDescription>Voer de naam in voor de nieuwe papierklasse.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Label htmlFor="klasse-name">Klasse Naam</Label>
                        <Input 
                            id="klasse-name" 
                            value={newKlasseName} 
                            onChange={e => setNewKlasseName(e.target.value)} 
                            onKeyDown={e => e.key === 'Enter' && handleAddInst()}
                            autoFocus
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddKlasseOpen(false)}>Annuleren</Button>
                        <Button onClick={handleAddInst}>Toevoegen</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );

    async function handleUpdateInst(id: string, field: string, val: string) {
        const numeric = parseFloat(val) || 0;
        try {
            await pb.collection('papier_klasse_instellingen').update(id, { [field]: numeric });
            setInstellingen(prev => prev.map(i => i.id === id ? { ...i, [field]: numeric } : i));
        } catch (e) {
            toast.error('Update mislukt');
        }
    }

    async function handleAddInst() {
        if (!newKlasseName.trim()) return;
        try {
            const newInst = await pb.collection('papier_klasse_instellingen').create({ 
                klasse: newKlasseName, 
                front_k: 0, front_c: 0, front_m: 0, front_y: 0, 
                back_k: 0, back_c: 0, back_m: 0, back_y: 0 
            });
            setInstellingen([...instellingen, newInst as any]);
            setNewKlasseName('');
            setIsAddKlasseOpen(false);
            toast.success('Klasse toegevoegd');
        } catch (e) {
            toast.error('Toevoegen mislukt');
        }
    }

    async function handleDeleteInst() {
        if (!deleteInstId) return;
        try {
            await pb.collection('papier_klasse_instellingen').delete(deleteInstId);
            setInstellingen(prev => prev.filter(i => i.id !== deleteInstId));
            setDeleteInstId(null);
            toast.success('Klasse verwijderd');
        } catch (e) {
            toast.error('Verwijderen mislukt');
        }
    }

    async function handleToggleActief(id: string, current: boolean) {
        try {
            await pb.collection('papier').update(id, { actief: !current });
            setPapers(prev => prev.map(p => p.id === id ? { ...p, actief: !current } : p));
            toast.success(current ? 'Papier verborgen' : 'Papier geactiveerd');
        } catch (e) {
            toast.error('Status bijwerken mislukt');
        }
    }

    async function handleBulkSetActief(actief: boolean) {
        const ids = Array.from(selectedIds);
        if (ids.length === 0) return;
        try {
            await Promise.all(ids.map(id => pb.collection('papier').update(id, { actief })));
            setPapers(prev => prev.map(p => selectedIds.has(p.id) ? { ...p, actief } : p));
            toast.success(`${ids.length} papier(en) ${actief ? 'geactiveerd' : 'gedeactiveerd'}`);
            clearSelection();
        } catch (e) {
            console.error('[PapierBeheer] Bulk actief error:', e);
            toast.error('Bijwerken mislukt');
        }
    }

    async function handleBulkDelete() {
        const ids = Array.from(selectedIds);
        if (ids.length === 0) return;
        try {
            await Promise.all(ids.map(id => pb.collection('papier').delete(id)));
            toast.success(`${ids.length} papier(en) verwijderd`);
            setIsBulkDeleteOpen(false);
            clearSelection();
            fetchAll();
        } catch (e) {
            console.error('[PapierBeheer] Bulk delete error:', e);
            toast.error('Verwijderen mislukt');
        }
    }

    async function handleBulkEditSave() {
        const ids = Array.from(selectedIds);
        if (ids.length === 0) return;
        const payload: Record<string, any> = {};
        if (bulkEdit.klasse !== undefined) payload.klasse = bulkEdit.klasse;
        if (bulkEdit.fabrikant !== undefined) payload.fabrikant = bulkEdit.fabrikant;
        if (bulkEdit.proef_profiel !== undefined) payload.proef_profiel = bulkEdit.proef_profiel;
        if (bulkEdit.actief !== undefined) payload.actief = bulkEdit.actief;
        if (Object.keys(payload).length === 0) {
            toast.error('Geen velden om bij te werken');
            return;
        }
        try {
            await Promise.all(ids.map(id => pb.collection('papier').update(id, payload)));
            toast.success(`${ids.length} papier(en) bijgewerkt`);
            setIsBulkEditOpen(false);
            setBulkEdit({});
            clearSelection();
            fetchAll();
        } catch (e) {
            console.error('[PapierBeheer] Bulk edit error:', e);
            toast.error('Bijwerken mislukt');
        }
    }
}
