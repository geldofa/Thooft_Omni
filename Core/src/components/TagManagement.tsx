import { useState, useEffect, useCallback } from 'react';
import { pb, useAuth, Tag } from './AuthContext';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from './ui/table';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Edit, Trash2, Plus, Lock, Tag as TagIcon, Clock } from 'lucide-react';
import { PageHeader } from './PageHeader';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from './ui/alert-dialog';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from './ui/select';
import { toast } from 'sonner';

export function TagManagement() {
    const { user, addActivityLog } = useAuth();
    const [tags, setTags] = useState<Tag[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const fetchTags = useCallback(async () => {
        try {
            setIsLoading(true);
            const records = await pb.collection('tags').getFullList({
                sort: 'naam'
            });
            setTags(records.map((r: any) => ({
                id: r.id,
                naam: r.naam,
                kleur: r.kleur || '#3b82f6',
                active: r.active !== false,
                system_managed: r.system_managed === true,
                highlights: r.highlights || []
            })));
        } catch (e) {
            console.error("Failed to fetch tags", e);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTags();
        pb.collection('tags').subscribe('*', () => fetchTags());
        return () => {
            pb.collection('tags').unsubscribe('*').catch(() => { });
        };
    }, [fetchTags]);

    const addTagLocal = async (tag: Omit<Tag, 'id'>) => {
        try {
            await pb.collection('tags').create({
                naam: tag.naam,
                kleur: tag.kleur,
                active: tag.active
            });
            fetchTags();
            return true;
        } catch (e) {
            console.error("Add tag failed", e);
            return false;
        }
    };

    const updateTagLocal = async (tag: Tag) => {
        try {
            await pb.collection('tags').update(tag.id, {
                naam: tag.naam,
                kleur: tag.kleur,
                active: tag.active,
                highlights: tag.highlights
            });
            fetchTags();
            return true;
        } catch (e) {
            console.error("Update tag failed", e);
            return false;
        }
    };

    const deleteTagLocal = async (id: string) => {
        try {
            await pb.collection('tags').delete(id);
            fetchTags();
            return true;
        } catch (e) {
            console.error("Delete tag failed", e);
            return false;
        }
    };

    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [editingTag, setEditingTag] = useState<Tag | null>(null);
    const [formData, setFormData] = useState({
        naam: '',
        kleur: '#3b82f6',
        active: true
    });
    const [showInactive, setShowInactive] = useState(false);
    const [addRuleSelectKey, setAddRuleSelectKey] = useState(0);

    const handleOpenDialog = (tag?: Tag) => {
        if (tag) {
            setEditingTag(tag);
            setFormData({
                naam: tag.naam,
                kleur: tag.kleur || '#3b82f6',
                active: tag.active
            });
            setIsAddDialogOpen(true);
        } else {
            setEditingTag(null);
            setFormData({
                naam: '',
                kleur: '#3b82f6',
                active: true
            });
            setIsAddDialogOpen(true);
        }
    };

    const handleCloseDialog = () => {
        setIsAddDialogOpen(false);
        setEditingTag(null);
        setFormData({
            naam: '',
            kleur: '#3b82f6',
            active: true
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.naam.trim()) {
            toast.error('Voer a.u. b. de tagnaam in');
            return;
        }

        let success = false;

        if (editingTag) {
            success = await updateTagLocal({
                ...editingTag,
                naam: formData.naam,
                kleur: formData.kleur,
                active: formData.active
            });

            if (success) {
                toast.success('Tag succesvol bijgewerkt');
                addActivityLog({
                    user: user?.username || 'Unknown',
                    action: 'Updated',
                    entity: 'Tag',
                    entityId: editingTag.id,
                    entityName: formData.naam,
                    details: `Updated tag: ${formData.naam}`,
                    oldValue: `Naam: ${editingTag.naam}|||Kleur: ${editingTag.kleur}|||Status: ${editingTag.active ? 'Actief' : 'Inactief'}`,
                    newValue: `Naam: ${formData.naam}|||Kleur: ${formData.kleur}|||Status: ${formData.active ? 'Actief' : 'Inactief'}`
                });
                handleCloseDialog();
            } else {
                toast.error('Bijwerken van tag mislukt');
            }
        } else {
            success = await addTagLocal(formData);

            if (success) {
                toast.success('Tag succesvol toegevoegd');
                addActivityLog({
                    user: user?.username || 'Unknown',
                    action: 'Created',
                    entity: 'Tag',
                    entityId: 'new',
                    entityName: formData.naam,
                    details: `Created new tag: ${formData.naam}`,
                    newValue: `Naam: ${formData.naam}|||Kleur: ${formData.kleur}|||Status: ${formData.active ? 'Actief' : 'Inactief'}`
                });
                handleCloseDialog();
            } else {
                toast.error('Toevoegen van tag mislukt');
            }
        }
    };

    const handleDelete = async (id: string, name: string) => {
        const success = await deleteTagLocal(id);
        if (success) {
            toast.success(`Tag "${name}" succesvol verwijderd`);
            addActivityLog({
                user: user?.username || 'Unknown',
                action: 'Deleted',
                entity: 'Tag',
                entityId: id,
                entityName: name,
                details: `Deleted tag: ${name}`,
                oldValue: `Naam: ${name}`
            });
        } else {
            toast.error(`Verwijderen van tag "${name}" mislukt`);
        }
    };

    const filteredTags = tags.filter(tag => showInactive ? true : tag.active);

    const toggleHighlightRule = async (tag: Tag, index: number, enabled: boolean) => {
        const newHighlights = [...(tag.highlights || [])];
        newHighlights[index] = { ...newHighlights[index], enabled };
        await updateTagLocal({ ...tag, highlights: newHighlights });
    };

    const deleteHighlightRule = async (tag: Tag, index: number) => {
        const newHighlights = [...(tag.highlights || [])];
        newHighlights.splice(index, 1);
        await updateTagLocal({ ...tag, highlights: newHighlights });
    };

    const addHighlightRule = async (tagId: string) => {
        const tag = tags.find(t => t.id === tagId);
        if (!tag) return;

        toast.info(`Regel toevoegen voor ${tag.naam}...`);

        const newRule = {
            enabled: true,
            days: [1, 2, 3, 4, 5],
            allDay: true,
            startTime: '08:00',
            endTime: '17:00',
            method: 'category' as const,
            cutoffDays: null as number | null
        };
        const newHighlights = [...(tag.highlights || []), newRule];
        const success = await updateTagLocal({ ...tag, highlights: newHighlights });

        if (success) {
            toast.success(`Highlight regel toegevoegd voor "${tag.naam}"`);
            setAddRuleSelectKey(prev => prev + 1);
        } else {
            toast.error(`Toevoegen van regel voor "${tag.naam}" mislukt`);
        }
    };

    return (
        <div className="space-y-4">
            <PageHeader
                title="Tag Beheer"
                description="Beheer tags voor onderhoudstaken"
                icon={TagIcon}
                className="mb-2"
            />

            <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-2">
                    <Button
                        variant={showInactive ? 'secondary' : 'outline'}
                        size="sm"
                        onClick={() => setShowInactive(!showInactive)}
                        className={showInactive ? 'bg-gray-200 hover:bg-gray-300 text-gray-900' : 'text-gray-500'}
                    >
                        {showInactive ? 'Inactieve verbergen' : 'Inactieve tonen'}
                    </Button>
                </div>
                <Button onClick={() => handleOpenDialog()} className="gap-2">
                    <Plus className="w-4 h-4" />
                    Tag Toevoegen
                </Button>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-gray-50 hover:bg-gray-50">
                            <TableHead className="border-r border-gray-200 font-semibold text-gray-900">Naam</TableHead>
                            <TableHead className="w-[150px] text-center border-r border-gray-200 font-semibold text-gray-900">Voorbeeld</TableHead>
                            <TableHead className="w-[100px] text-center border-r border-gray-200 font-semibold text-gray-900">Status</TableHead>
                            <TableHead className="text-right w-[100px] font-semibold text-gray-900 pr-4">Acties</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-12">Laden...</TableCell>
                            </TableRow>
                        ) : filteredTags.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-12 text-gray-500">
                                    Geen tags gevonden.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredTags.map((tag) => (
                                <TableRow key={tag.id} className="hover:bg-gray-50/50">
                                    <TableCell className="border-r border-gray-200 font-medium">
                                        <div className="flex items-center gap-2">
                                            {tag.naam}
                                            {tag.system_managed && <Lock className="w-3 h-3 text-gray-400" />}
                                        </div>
                                    </TableCell>
                                    <TableCell className="border-r border-gray-200 text-center">
                                        <Badge
                                            style={{ backgroundColor: tag.kleur || '#3b82f6' }}
                                            className="text-white border-none"
                                        >
                                            {tag.naam}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="border-r border-gray-200 text-center">
                                        {tag.active ? (
                                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Actief</Badge>
                                        ) : (
                                            <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200">Inactief</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right pr-4">
                                        <div className="flex items-center justify-end gap-1">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleOpenDialog(tag)}
                                            >
                                                <Edit className="w-4 h-4" />
                                            </Button>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="sm" disabled={tag.system_managed}>
                                                        <Trash2 className="w-4 h-4 text-red-500" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Tag Verwijderen</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            Weet u zeker dat u "{tag.naam}" wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Annuleren</AlertDialogCancel>
                                                        <AlertDialogAction
                                                            onClick={() => handleDelete(tag.id, tag.naam)}
                                                            className="bg-red-500 hover:bg-red-600"
                                                        >
                                                            Verwijderen
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <div className="mt-8 space-y-4">
                <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-blue-600" />
                    <h2 className="text-xl font-semibold text-gray-900">Highlight Sectie</h2>
                </div>
                <p className="text-sm text-gray-500 max-w-2xl">
                    Configureer wanneer en hoe tags extra opvallen in de takenlijst.
                    Hoogtepunten kunnen verschijnen als een tijdelijke categorie bovenaan of als een gekleurde stip naast de taaknaam.
                </p>

                <div className="grid gap-4">
                    {tags.filter(t => (t.highlights || []).length > 0).map(tag => (
                        <div key={tag.id} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                            <div className="bg-gray-50/80 px-4 py-2 border-b border-gray-200 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Badge style={{ backgroundColor: tag.kleur }} className="text-white border-none">
                                        {tag.naam}
                                    </Badge>
                                    <span className="text-sm font-medium text-gray-700">Regels</span>
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => addHighlightRule(tag.id)}>
                                    <Plus className="w-4 h-4 mr-1" /> Regel Toevoegen
                                </Button>
                            </div>
                            <div className="divide-y divide-gray-100">
                                {tag.highlights?.map((rule, idx) => (
                                    <div key={idx} className="p-4 flex flex-wrap items-center gap-6">
                                        <div className="flex items-center gap-2 min-w-[140px]">
                                            <Switch
                                                checked={rule.enabled}
                                                onCheckedChange={(val) => toggleHighlightRule(tag, idx, val)}
                                            />
                                            <span className="text-sm font-medium">{rule.enabled ? 'Actief' : 'Gepauzeerd'}</span>
                                        </div>

                                        <div className="flex flex-col gap-1 min-w-[200px]">
                                            <Label className="text-[10px] uppercase text-gray-400 font-bold tracking-wider">Wanneer</Label>
                                            <div className="flex flex-wrap gap-1">
                                                {['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za'].map((day, dIdx) => (
                                                    <button
                                                        key={day}
                                                        onClick={() => {
                                                            const newDays = rule.days.includes(dIdx)
                                                                ? rule.days.filter(d => d !== dIdx)
                                                                : [...rule.days, dIdx];
                                                            const newHighlights = [...(tag.highlights || [])];
                                                            newHighlights[idx] = { ...rule, days: newDays };
                                                            updateTagLocal({ ...tag, highlights: newHighlights });
                                                        }}
                                                        className={`text-[10px] w-6 h-6 rounded-full flex items-center justify-center border transition-colors ${rule.days.includes(dIdx)
                                                            ? 'bg-blue-600 border-blue-600 text-white font-bold'
                                                            : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300'
                                                            }`}
                                                    >
                                                        {day}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-1 min-w-[150px]">
                                            <Label className="text-[10px] uppercase text-gray-400 font-bold tracking-wider">Tijdstip</Label>
                                            <div className="flex items-center gap-2">
                                                <Switch
                                                    checked={rule.allDay}
                                                    onCheckedChange={(val) => {
                                                        const newHighlights = [...(tag.highlights || [])];
                                                        newHighlights[idx] = { ...rule, allDay: val };
                                                        updateTagLocal({ ...tag, highlights: newHighlights });
                                                    }}
                                                />
                                                <span className="text-xs">{rule.allDay ? 'Hele dag' : 'Specifiek'}</span>
                                                {!rule.allDay && (
                                                    <div className="flex items-center gap-1 ml-2">
                                                        <input
                                                            type="time"
                                                            value={rule.startTime}
                                                            onChange={(e) => {
                                                                const newHighlights = [...(tag.highlights || [])];
                                                                newHighlights[idx] = { ...rule, startTime: e.target.value };
                                                                updateTagLocal({ ...tag, highlights: newHighlights });
                                                            }}
                                                            className="text-xs border rounded p-1"
                                                        />
                                                        <span className="text-xs">-</span>
                                                        <input
                                                            type="time"
                                                            value={rule.endTime}
                                                            onChange={(e) => {
                                                                const newHighlights = [...(tag.highlights || [])];
                                                                newHighlights[idx] = { ...rule, endTime: e.target.value };
                                                                updateTagLocal({ ...tag, highlights: newHighlights });
                                                            }}
                                                            className="text-xs border rounded p-1"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-1 min-w-[150px]">
                                            <Label className="text-[10px] uppercase text-gray-400 font-bold tracking-wider">Hoe</Label>
                                            <Select
                                                value={rule.method}
                                                onValueChange={(val: any) => {
                                                    const newHighlights = [...(tag.highlights || [])];
                                                    newHighlights[idx] = { ...rule, method: val };
                                                    updateTagLocal({ ...tag, highlights: newHighlights });
                                                }}
                                            >
                                                <SelectTrigger className="h-8 text-xs">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="category">Tijdelijke Categorie</SelectItem>
                                                    <SelectItem value="dot">Gekleurde Stip</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="flex flex-col gap-1 min-w-[100px]">
                                            <Label className="text-[10px] uppercase text-gray-400 font-bold tracking-wider">Deadline</Label>
                                            <div className="flex items-center gap-1">
                                                <span className="text-xs text-gray-500 whitespace-nowrap">&lt;</span>
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    placeholder="∞"
                                                    value={(rule.cutoffDays !== null && rule.cutoffDays !== undefined && !isNaN(rule.cutoffDays)) ? rule.cutoffDays : ''}
                                                    onChange={(e) => {
                                                        const valStr = e.target.value;
                                                        const val = valStr === '' ? null : parseInt(valStr);
                                                        const finalVal = (val === null || isNaN(val)) ? null : val;

                                                        const newHighlights = [...(tag.highlights || [])];
                                                        newHighlights[idx] = { ...rule, cutoffDays: finalVal };
                                                        updateTagLocal({ ...tag, highlights: newHighlights });
                                                    }}
                                                    className="h-8 w-14 text-xs p-1"
                                                />
                                                <span className="text-xs text-gray-500">dg</span>
                                            </div>
                                        </div>

                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="ml-auto text-red-500 hover:text-red-600 hover:bg-red-50"
                                            onClick={() => deleteHighlightRule(tag, idx)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}

                    <div className="bg-blue-50/50 rounded-lg border border-dashed border-blue-200 p-8 flex flex-col items-center justify-center gap-4">
                        <div className="bg-blue-100 p-3 rounded-full">
                            <Clock className="w-6 h-6 text-blue-600" />
                        </div>
                        <div className="text-center">
                            <h3 className="text-sm font-semibold text-gray-900">Nieuwe Highlight Regel</h3>
                            <p className="text-xs text-gray-500 mt-1">Selecteer een tag om een regel aan te maken.</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Select key={addRuleSelectKey} onValueChange={(val) => addHighlightRule(val)}>
                                <SelectTrigger className="w-[200px] h-9 bg-white">
                                    <SelectValue placeholder="Selecteer een tag..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {tags.filter(t => t.active).map(tag => (
                                        <SelectItem key={tag.id} value={tag.id}>{tag.naam}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>
            </div>

            <Dialog open={isAddDialogOpen} onOpenChange={handleCloseDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>{editingTag ? 'Tag Bewerken' : 'Nieuwe Tag Toevoegen'}</DialogTitle>
                        <DialogDescription>
                            {editingTag
                                ? 'Werk de details van de tag hieronder bij.'
                                : 'Vul de details in voor de nieuwe tag.'}
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit}>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="tagName">Naam *</Label>
                                <Input
                                    id="tagName"
                                    placeholder="bijv., Prioriteit"
                                    value={formData.naam}
                                    onChange={(e) => setFormData({ ...formData, naam: e.target.value })}
                                    disabled={editingTag?.system_managed}
                                />
                                {editingTag?.system_managed && (
                                    <p className="text-xs text-gray-500">Systeem tags kunnen niet hernoemd worden.</p>
                                )}
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="tagColor">Kleur</Label>
                                <div className="flex gap-2">
                                    <Input
                                        id="tagColor"
                                        type="color"
                                        className="w-12 h-10 p-1"
                                        value={formData.kleur}
                                        onChange={(e) => setFormData({ ...formData, kleur: e.target.value })}
                                    />
                                    <Input
                                        type="text"
                                        value={formData.kleur}
                                        onChange={(e) => setFormData({ ...formData, kleur: e.target.value })}
                                        placeholder="#000000"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-between border rounded-md p-3">
                                <div className="space-y-0.5">
                                    <Label htmlFor="tagActive">Actieve Status</Label>
                                    <p className="text-xs text-gray-500">
                                        Inactieve tags kunnen niet worden geselecteerd
                                    </p>
                                </div>
                                <Switch
                                    id="tagActive"
                                    checked={formData.active}
                                    onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                                />
                            </div>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={handleCloseDialog}>
                                Annuleren
                            </Button>
                            <Button type="submit">
                                {editingTag ? 'Tag Bijwerken' : 'Tag Toevoegen'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div >
    );
}
