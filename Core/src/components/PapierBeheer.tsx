import { useState, useEffect, useMemo } from 'react';
import { pb, useAuth } from './AuthContext';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Package, Plus, Pencil, Trash2, Save, X, Settings2, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from './ui/utils';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from './ui/dialog';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Checkbox } from './ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
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

interface PapierBeheerProps {
    searchQuery: string;
    isSettingsOpen: boolean;
    setIsSettingsOpen: (open: boolean) => void;
}

export function PapierBeheer({ searchQuery, isSettingsOpen, setIsSettingsOpen }: PapierBeheerProps) {
    const [papers, setPapers] = useState<PapierRecord[]>([]);
    const [instellingen, setInstellingen] = useState<KlasseInstelling[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [editingPaper, setEditingPaper] = useState<Partial<PapierRecord> | null>(null);
    const [deletePaperId, setDeletePaperId] = useState<string | null>(null);
    const [deleteInstId, setDeleteInstId] = useState<string | null>(null);
    const [newKlasseName, setNewKlasseName] = useState('');
    const [newPresetName, setNewPresetName] = useState('');
    const [newPresetType, setNewPresetType] = useState<'Coated' | 'Uncoated'>('Coated');
    const [isAddKlasseOpen, setIsAddKlasseOpen] = useState(false);
    const [isAddPresetOpen, setIsAddPresetOpen] = useState(false);
    const [proefPresets, setProefPresets] = useState<any[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
    const [bulkEdit, setBulkEdit] = useState<{ klasse?: string; fabrikant?: string; proef_profiel?: string; actief?: boolean }>({});
    const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
    const [syncFrontBack, setSyncFrontBack] = useState(true);

    const { hasPermission, effectiveRole } = useAuth();
    const isPress = effectiveRole?.toLowerCase() === 'press';
    const canEdit = hasPermission('papier_aanpassen');

    const fetchAll = async () => {
        setIsLoading(true);
        try {
            const [paperList, instList, presetList] = await Promise.all([
                pb.collection('papier').getFullList<PapierRecord>({ sort: 'naam' }),
                pb.collection('papier_klasse_instellingen').getFullList<any>({ sort: 'klasse' }),
                pb.collection('proef_presets').getFullList<any>({ sort: 'naam' })
            ]);
            setPapers(paperList);
            setInstellingen(instList);
            setProefPresets(presetList);
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
        let list = papers.filter(p =>
            p.naam.toLowerCase().includes(q) ||
            p.klasse?.toLowerCase().includes(q) ||
            p.fabrikant?.toLowerCase().includes(q)
        );

        // Filter for press role: only show active papers
        if (isPress) {
            list = list.filter(p => p.actief);
        }

        return list.sort((a, b) => {
            if (!!a.actief !== !!b.actief) return a.actief ? -1 : 1;
            return a.naam.localeCompare(b.naam);
        });
    }, [papers, searchQuery, isPress]);

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
            setSelectedIds(prev => {
                const next = new Set(prev);
                next.delete(deletePaperId);
                return next;
            });
            setDeletePaperId(null);
            fetchAll();
        } catch (error) {
            console.error('[PapierBeheer] Delete error:', error);
            toast.error('Verwijderen mislukt');
        }
    };



    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-1">
                </div>
                {canEdit && (
                    <Button size="sm" onClick={() => { setEditingPaper({ actief: true }); setIsEditDialogOpen(true); }}>
                        <Plus className="size-4 mr-2" />
                        Nieuw Papier
                    </Button>
                )}
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
                        {canEdit && (
                            <>
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
                            </>
                        )}
                    </div>
                </div>
            )}

            <Card className="border-none shadow-md overflow-hidden">
                <Table>
                    <TableHeader className="bg-gray-50">
                        <TableRow>
                            <TableHead className="w-[40px]">
                                {canEdit && (
                                    <Checkbox
                                        checked={allVisibleSelected ? true : (someVisibleSelected ? 'indeterminate' : false)}
                                        onCheckedChange={toggleSelectAll}
                                        aria-label="Selecteer alle papieren"
                                    />
                                )}
                            </TableHead>
                            <TableHead>Fabrikant</TableHead>
                            <TableHead>Product</TableHead>
                            <TableHead>Klasse</TableHead>
                            <TableHead>Proefpreset</TableHead>
                            <TableHead className="text-center">Front KCMY</TableHead>
                            <TableHead className="text-center">Back KCMY</TableHead>
                            {!isPress && (
                                <>
                                    <TableHead className="text-center w-[80px]">Status</TableHead>
                                    <TableHead className="w-[100px] text-right">Acties</TableHead>
                                </>
                            )}
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
                                        {canEdit && (
                                            <Checkbox
                                                checked={selectedIds.has(paper.id)}
                                                onCheckedChange={() => toggleSelect(paper.id)}
                                                aria-label={`Selecteer ${paper.naam}`}
                                            />
                                        )}
                                    </TableCell>
                                    <TableCell className="font-medium text-gray-500">{paper.fabrikant || '—'}</TableCell>
                                    <TableCell className="font-bold">{paper.naam}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="bg-gray-50">{paper.klasse || '—'}</Badge>
                                    </TableCell>
                                    <TableCell className="text-sm text-gray-600">{paper.proef_profiel || '—'}</TableCell>
                                    <TableCell>
                                        <DensityChips paper={paper} side="front" instellingen={instellingen} />
                                    </TableCell>
                                    <TableCell>
                                        <DensityChips paper={paper} side="back" instellingen={instellingen} />
                                    </TableCell>
                                    {!isPress && (
                                        <>
                                            <TableCell className="text-center">
                                                <button
                                                    disabled={!canEdit}
                                                    onClick={() => handleToggleActief(paper.id, paper.actief)}
                                                    className={cn(
                                                        "px-2 py-1 rounded-full text-[10px] font-bold transition-colors",
                                                        paper.actief ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-gray-100 text-gray-400 hover:bg-gray-200",
                                                        !canEdit && "cursor-default opacity-80"
                                                    )}
                                                >
                                                    {paper.actief ? 'ACTIEF' : 'INACTIEF'}
                                                </button>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {canEdit && (
                                                    <div className="flex justify-end gap-1">
                                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingPaper(paper); setIsEditDialogOpen(true); }}>
                                                            <Pencil className="size-4" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600" onClick={() => setDeletePaperId(paper.id)}>
                                                            <Trash2 className="size-4" />
                                                        </Button>
                                                    </div>
                                                )}
                                            </TableCell>
                                        </>
                                    )}
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
                    <div className="flex flex-col gap-4 py-4">
                        <div className="flex items-center gap-2 px-1">
                            <Checkbox
                                id="sync-paper"
                                checked={syncFrontBack}
                                onCheckedChange={(c) => setSyncFrontBack(!!c)}
                            />
                            <Label htmlFor="sync-paper" className="text-sm font-semibold text-blue-700 cursor-pointer">Front & Back densiteiten koppelen</Label>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-4">
                                <div className="grid gap-2">
                                    <Label>Fabrikant</Label>
                                    <Input value={editingPaper?.fabrikant || ''} onChange={e => setEditingPaper({ ...editingPaper!, fabrikant: e.target.value })} placeholder="Bijv. Sappi" />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Proefpreset (Profiel)</Label>
                                    <Select
                                        value={editingPaper?.proef_profiel || ''}
                                        onValueChange={v => setEditingPaper({ ...editingPaper!, proef_profiel: v })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Kies een proefprofiel..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {proefPresets.map(p => (
                                                <SelectItem key={p.id} value={p.naam}>
                                                    <div className="flex items-center gap-2">
                                                        <span>{p.naam}</span>
                                                        <Badge variant="outline" className={cn(
                                                            "text-[9px] px-1 py-0 h-4",
                                                            p.type === 'Coated' ? "bg-blue-50 text-blue-600 border-blue-200" : "bg-orange-50 text-orange-600 border-orange-200"
                                                        )}>
                                                            {p.type}
                                                        </Badge>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                            {proefPresets.length === 0 && (
                                                <div className="p-2 text-xs text-gray-500 italic text-center">Geen presets gevonden.</div>
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label>Product (Naam)</Label>
                                    <Input value={editingPaper?.naam || ''} onChange={e => setEditingPaper({ ...editingPaper!, naam: e.target.value })} placeholder="Bijv. Galerie Fine" />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="grid gap-2">
                                        <Label>Klasse</Label>
                                        <Input value={editingPaper?.klasse || ''} onChange={e => setEditingPaper({ ...editingPaper!, klasse: e.target.value })} placeholder="Bijv. 1" />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Gram (g/m²)</Label>
                                        <Input type="number" value={editingPaper?.gram_per_m2 || ''} onChange={e => setEditingPaper({ ...editingPaper!, gram_per_m2: parseInt(e.target.value) || null })} />
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 pt-2">
                                    <input
                                        type="checkbox"
                                        id="paper-actief"
                                        checked={editingPaper?.actief ?? true}
                                        onChange={e => setEditingPaper({ ...editingPaper!, actief: e.target.checked })}
                                        className="size-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <Label htmlFor="paper-actief" className="cursor-pointer">Dit papier is actief en zichtbaar in lijsten</Label>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="grid gap-2">
                                    <Label>Start Densiteiten Front (KCMY)</Label>
                                    <div className="grid grid-cols-4 gap-2">
                                        <ColorInput label="K" value={editingPaper?.start_front_k} onChange={(v: number) => handlePaperColorChange('front', 'k', v)} colorClass="border-gray-800" />
                                        <ColorInput label="C" value={editingPaper?.start_front_c} onChange={(v: number) => handlePaperColorChange('front', 'c', v)} colorClass="border-cyan-500" />
                                        <ColorInput label="M" value={editingPaper?.start_front_m} onChange={(v: number) => handlePaperColorChange('front', 'm', v)} colorClass="border-pink-500" />
                                        <ColorInput label="Y" value={editingPaper?.start_front_y} onChange={(v: number) => handlePaperColorChange('front', 'y', v)} colorClass="border-yellow-500" />
                                    </div>
                                </div>
                                <div className="grid gap-2">
                                    <Label>Start Densiteiten Back (KCMY)</Label>
                                    <div className="grid grid-cols-4 gap-2">
                                        <ColorInput label="K" value={editingPaper?.start_back_k} onChange={(v: number) => handlePaperColorChange('back', 'k', v)} colorClass="border-gray-800" />
                                        <ColorInput label="C" value={editingPaper?.start_back_c} onChange={(v: number) => handlePaperColorChange('back', 'c', v)} colorClass="border-cyan-500" />
                                        <ColorInput label="M" value={editingPaper?.start_back_m} onChange={(v: number) => handlePaperColorChange('back', 'm', v)} colorClass="border-pink-500" />
                                        <ColorInput label="Y" value={editingPaper?.start_back_y} onChange={(v: number) => handlePaperColorChange('back', 'y', v)} colorClass="border-yellow-500" />
                                    </div>
                                </div>
                                <div className="grid gap-2">
                                    <Label>Opmerking</Label>
                                    <Textarea value={editingPaper?.opmerking || ''} onChange={e => setEditingPaper({ ...editingPaper!, opmerking: e.target.value })} className="h-20" />
                                </div>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Annuleren</Button>
                        <Button onClick={handleSavePaper}>Opslaan</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Settings Dialog (Papier Instellingen) */}
            <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                <DialogContent className="sm:max-w-[1000px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Papier Instellingen</DialogTitle>
                        <DialogDescription>Beheer de standaard densiteiten en proefpresets.</DialogDescription>
                    </DialogHeader>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-4">
                        {/* Left Card: Densiteiten per Klasse */}
                        <Card className="p-4 space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold flex items-center gap-2">
                                    <Settings2 className="size-4 text-blue-600" />
                                    Densiteiten per Klasse
                                </h3>
                            </div>

                            <div className="flex items-center gap-2 mb-2">
                                <Checkbox
                                    id="sync-settings"
                                    checked={syncFrontBack}
                                    onCheckedChange={(c) => setSyncFrontBack(!!c)}
                                />
                                <Label htmlFor="sync-settings" className="text-[10px] font-semibold text-blue-700 cursor-pointer uppercase">Front & Back koppelen</Label>
                            </div>

                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="text-[10px] uppercase">Klasse</TableHead>
                                            <TableHead className="text-[10px] uppercase">Front</TableHead>
                                            <TableHead className="text-[10px] uppercase">Back</TableHead>
                                            <TableHead className="w-[40px]"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {instellingen.map(inst => (
                                            <TableRow key={inst.id}>
                                                <TableCell className="font-bold text-xs">{inst.klasse}</TableCell>
                                                <TableCell>
                                                    <div className="flex gap-1">
                                                        <ShifterInput value={inst.front_k} onChange={(v: number) => handleUpdateInst(inst.id, 'front_k', v)} />
                                                        <ShifterInput value={inst.front_c} onChange={(v: number) => handleUpdateInst(inst.id, 'front_c', v)} />
                                                        <ShifterInput value={inst.front_m} onChange={(v: number) => handleUpdateInst(inst.id, 'front_m', v)} />
                                                        <ShifterInput value={inst.front_y} onChange={(v: number) => handleUpdateInst(inst.id, 'front_y', v)} />
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex gap-1">
                                                        <ShifterInput value={inst.back_k} onChange={(v: number) => handleUpdateInst(inst.id, 'back_k', v)} />
                                                        <ShifterInput value={inst.back_c} onChange={(v: number) => handleUpdateInst(inst.id, 'back_c', v)} />
                                                        <ShifterInput value={inst.back_m} onChange={(v: number) => handleUpdateInst(inst.id, 'back_m', v)} />
                                                        <ShifterInput value={inst.back_y} onChange={(v: number) => handleUpdateInst(inst.id, 'back_y', v)} />
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500" onClick={() => setDeleteInstId(inst.id)}>
                                                        <Trash2 className="size-3" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {canEdit && (
                                            <TableRow>
                                                <TableCell colSpan={4}>
                                                    <Button variant="ghost" size="sm" className="w-full text-blue-600 text-[10px] h-7" onClick={() => setIsAddKlasseOpen(true)}>
                                                        <Plus className="size-3 mr-1" /> Klasse toevoegen
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </Card>

                        {/* Right Card: Proefpresets */}
                        <Card className="p-4 space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold flex items-center gap-2">
                                    <Package className="size-4 text-purple-600" />
                                    Proefpreset Profielen
                                </h3>
                            </div>

                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="text-[10px] uppercase">Naam</TableHead>
                                            <TableHead className="text-[10px] uppercase">Type</TableHead>
                                            <TableHead className="w-[40px]"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {proefPresets.map(p => (
                                            <TableRow key={p.id}>
                                                <TableCell className="font-bold text-xs">{p.naam}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className={cn(
                                                        "text-[10px] font-medium",
                                                        p.type === 'Coated' ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-orange-50 text-orange-700 border-orange-200"
                                                    )}>
                                                        {p.type}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500" onClick={() => handleDeletePreset(p.id)}>
                                                        <Trash2 className="size-3" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {canEdit && (
                                            <TableRow>
                                                <TableCell colSpan={2}>
                                                    <Button variant="ghost" size="sm" className="w-full text-purple-600 text-[10px] h-7" onClick={() => setIsAddPresetOpen(true)}>
                                                        <Plus className="size-3 mr-1" /> Preset toevoegen
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </Card>
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

            {/* Add Preset Dialog */}
            <Dialog open={isAddPresetOpen} onOpenChange={setIsAddPresetOpen}>
                <DialogContent className="w-[90vw] sm:max-w-[50vw]">
                    <DialogHeader>
                        <DialogTitle>Nieuwe Proefpreset</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label>Preset Naam (Profiel)</Label>
                            <Input value={newPresetName} onChange={e => setNewPresetName(e.target.value)} placeholder="Bijv. FOGRA51" onKeyDown={e => e.key === 'Enter' && handleAddPreset()} />
                        </div>
                        <div className="grid gap-2">
                            <Label>Papiertype</Label>
                            <RadioGroup value={newPresetType} onValueChange={(v: any) => setNewPresetType(v)} className="flex gap-4">
                                <div className="flex items-center gap-2">
                                    <RadioGroupItem value="Coated" id="type-coated" />
                                    <Label htmlFor="type-coated" className="cursor-pointer">Coated</Label>
                                </div>
                                <div className="flex items-center gap-2">
                                    <RadioGroupItem value="Uncoated" id="type-uncoated" />
                                    <Label htmlFor="type-uncoated" className="cursor-pointer">Uncoated</Label>
                                </div>
                            </RadioGroup>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddPresetOpen(false)}>Annuleren</Button>
                        <Button onClick={handleAddPreset}>Toevoegen</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

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

    async function handleUpdateInst(id: string, field: string, numeric: number) {
        try {
            const updateData: any = { [field]: numeric };

            if (syncFrontBack) {
                if (field.startsWith('front_')) {
                    updateData[field.replace('front_', 'back_')] = numeric;
                } else if (field.startsWith('back_')) {
                    updateData[field.replace('back_', 'front_')] = numeric;
                }
            }

            await pb.collection('papier_klasse_instellingen').update(id, updateData);
            setInstellingen(prev => prev.map(i => i.id === id ? { ...i, ...updateData } : i));
        } catch (e) {
            toast.error('Update mislukt');
        }
    }



    const handlePaperColorChange = (side: 'front' | 'back', color: string, value: number) => {
        if (!editingPaper) return;
        const field = `start_${side}_${color}` as keyof PapierRecord;
        const next = { ...editingPaper, [field]: value };

        if (syncFrontBack) {
            const otherSide = side === 'front' ? 'back' : 'front';
            const otherField = `start_${otherSide}_${color}` as keyof PapierRecord;
            (next as any)[otherField] = value;
        }

        setEditingPaper(next);
    };



    async function handleAddPreset() {
        if (!newPresetName.trim()) return;
        try {
            const res = await pb.collection('proef_presets').create({
                naam: newPresetName,
                type: newPresetType
            });
            setProefPresets(prev => [...prev, res].sort((a, b) => a.naam.localeCompare(b.naam)));
            setNewPresetName('');
            setIsAddPresetOpen(false);
            toast.success('Preset toegevoegd');
        } catch (e) {
            toast.error('Toevoegen mislukt');
        }
    }

    async function handleDeletePreset(id: string) {
        if (!confirm('Preset verwijderen?')) return;
        try {
            await pb.collection('proef_presets').delete(id);
            setProefPresets(prev => prev.filter(p => p.id !== id));
            toast.success('Preset verwijderd');
        } catch (e) {
            toast.error('Verwijderen mislukt');
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
        const ids = Array.from(selectedIds).filter(id => papers.some(p => p.id === id));
        if (ids.length === 0) return;

        let successCount = 0;
        let failCount = 0;
        const ghostIds: string[] = [];

        await Promise.all(ids.map(async (id) => {
            try {
                await pb.collection('papier').update(id, { actief });
                successCount++;
            } catch (e: any) {
                if (e.status === 404) {
                    ghostIds.push(id);
                } else {
                    console.error(`[PapierBeheer] Error updating ${id}:`, e);
                    failCount++;
                }
            }
        }));

        if (successCount > 0) {
            toast.success(`${successCount} papier(en) ${actief ? 'geactiveerd' : 'gedeactiveerd'}`);
        }

        if (ghostIds.length > 0) {
            setPapers(prev => prev.filter(p => !ghostIds.includes(p.id)));
            // Distinguish between actually deleted and permission denied
            if (successCount === 0 && failCount === 0) {
                toast.error('Actie mislukt: mogelijk onvoldoende rechten of item reeds verwijderd');
            }
        }

        if (failCount > 0) {
            toast.error(`${failCount} bijwerking(en) mislukt`);
        }

        clearSelection();
        fetchAll();
    }

    async function handleBulkDelete() {
        const ids = Array.from(selectedIds).filter(id => papers.some(p => p.id === id));
        if (ids.length === 0) return;

        let successCount = 0;
        let failCount = 0;
        const ghostIds: string[] = [];

        await Promise.all(ids.map(async (id) => {
            try {
                await pb.collection('papier').delete(id);
                successCount++;
            } catch (e: any) {
                if (e.status === 404) {
                    ghostIds.push(id);
                    successCount++; // Already gone, consider it done
                } else {
                    console.error(`[PapierBeheer] Error deleting ${id}:`, e);
                    failCount++;
                }
            }
        }));

        if (successCount > 0) {
            toast.success(`${successCount} papier(en) verwijderd`);
        }

        if (ghostIds.length > 0) {
            setPapers(prev => prev.filter(p => !ghostIds.includes(p.id)));
        }

        if (failCount > 0) {
            toast.error(`${failCount} verwijdering(en) mislukt`);
        }

        setIsBulkDeleteOpen(false);
        clearSelection();
        fetchAll();
    }

    async function handleBulkEditSave() {
        const ids = Array.from(selectedIds).filter(id => papers.some(p => p.id === id));
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

        let successCount = 0;
        let failCount = 0;
        const ghostIds: string[] = [];

        await Promise.all(ids.map(async (id) => {
            try {
                await pb.collection('papier').update(id, payload);
                successCount++;
            } catch (e: any) {
                if (e.status === 404) {
                    ghostIds.push(id);
                } else {
                    console.error(`[PapierBeheer] Error updating ${id}:`, e);
                    failCount++;
                }
            }
        }));

        if (successCount > 0) {
            toast.success(`${successCount} papier(en) bijgewerkt`);
        }

        if (ghostIds.length > 0) {
            setPapers(prev => prev.filter(p => !ghostIds.includes(p.id)));
        }

        if (failCount > 0) {
            toast.error(`${failCount} bijwerking(en) mislukt`);
        }

        setIsBulkEditOpen(false);
        setBulkEdit({});
        clearSelection();
        fetchAll();
    }
}

interface ColorInputProps {
    label: string;
    value: number | undefined | null;
    onChange: (v: number) => void;
    colorClass?: string;
}

function ColorInput({ label, value, onChange, colorClass }: ColorInputProps) {
    return (
        <div className="flex flex-col gap-1">
            <Label className="text-[10px] uppercase text-gray-400">{label}</Label>
            <Input
                type="text"
                inputMode="numeric"
                value={(value || 0).toFixed(2)}
                onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '');
                    onChange(parseInt(digits || '0') / 100);
                }}
                className={cn("h-8 text-xs font-bold", colorClass)}
            />
        </div>
    );
}

interface ShifterInputProps {
    value: number | undefined | null;
    onChange: (v: number) => void;
    className?: string;
}

function ShifterInput({ value, onChange, className }: ShifterInputProps) {
    return (
        <Input
            className={cn("h-8 w-14 text-[10px]", className)}
            type="text"
            inputMode="numeric"
            value={(value || 0).toFixed(2)}
            onChange={e => {
                const digits = e.target.value.replace(/\D/g, '');
                onChange(parseInt(digits || '0') / 100);
            }}
        />
    );
}

function DensityChips({ paper, side, instellingen }: { paper: PapierRecord, side: 'front' | 'back', instellingen: any[] }) {
    const colors = ['k', 'c', 'm', 'y'];
    const inst = instellingen.find(i => i.klasse === paper.klasse);

    const colorStyles: Record<string, string> = {
        k: "text-gray-900 bg-gray-100/50 border-gray-200",
        c: "text-cyan-700 bg-cyan-50/50 border-cyan-100",
        m: "text-pink-700 bg-pink-50/50 border-pink-100",
        y: "text-amber-700 bg-yellow-50/50 border-yellow-100"
    };

    return (
        <div className="flex justify-center gap-1">
            {colors.map(color => {
                const field = `${side}_${color}`;
                const paperVal = (paper as any)[`start_${field}`];
                const classVal = inst ? (inst as any)[field] : 0;

                const isFallback = !paperVal || paperVal === 0;
                const displayVal = isFallback ? classVal : paperVal;

                return (
                    <div
                        key={color}
                        className={cn(
                            "px-1.5 py-0.5 rounded border text-xs transition-colors",
                            colorStyles[color],
                            isFallback && "italic font-normal opacity-70"
                        )}
                        title={isFallback ? `Standaard voor klasse ${paper.klasse}` : 'Papier-specifieke waarde'}
                    >
                        {(displayVal || 0).toFixed(2)}
                    </div>
                );
            })}
        </div>
    );
}
