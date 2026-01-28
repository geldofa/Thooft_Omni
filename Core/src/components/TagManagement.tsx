import { useState } from 'react';
import { useAuth, Tag } from './AuthContext';
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
import { Edit, Trash2, Plus, Lock } from 'lucide-react';
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
import { toast } from 'sonner';

export function TagManagement() {
    const { tags, addTag, updateTag, deleteTag, addActivityLog, user } = useAuth();

    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [editingTag, setEditingTag] = useState<Tag | null>(null);
    const [formData, setFormData] = useState({
        naam: '',
        kleur: '#3b82f6',
        active: true
    });
    const [showInactive, setShowInactive] = useState(false);

    const handleOpenDialog = (tag?: Tag) => {
        if (tag) {
            setEditingTag(tag);
            setFormData({
                naam: tag.naam,
                kleur: tag.kleur || '#3b82f6',
                active: tag.active
            });
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
            toast.error('Voer a.u.b. de tagnaam in');
            return;
        }

        let success = false;

        if (editingTag) {
            const updatedTag: Tag = {
                ...editingTag,
                naam: formData.naam,
                kleur: formData.kleur,
                active: formData.active
            };
            success = await updateTag(updatedTag);

            if (success) {
                toast.success('Tag succesvol bijgewerkt');
                addActivityLog({
                    user: user?.username || 'Unknown',
                    action: 'Updated',
                    entity: 'Tag',
                    entityId: editingTag.id,
                    entityName: formData.naam,
                    details: `Updated tag: ${formData.naam}`
                });
            }
        } else {
            success = await addTag(formData);

            if (success) {
                toast.success('Tag succesvol toegevoegd');
                addActivityLog({
                    user: user?.username || 'Unknown',
                    action: 'Created',
                    entity: 'Tag',
                    entityId: 'new',
                    entityName: formData.naam,
                    details: `Added new tag: ${formData.naam}`
                });
            }
        }

        if (success) {
            handleCloseDialog();
        }
    };

    const handleDelete = (id: string, name: string) => {
        deleteTag(id);
        toast.success(`Tag "${name}" succesvol verwijderd`);

        addActivityLog({
            user: user?.username || 'Unknown',
            action: 'Deleted',
            entity: 'Tag',
            entityId: id,
            entityName: name,
            details: `Deleted tag`
        });
    };

    const filteredTags = tags.filter(tag => showInactive ? true : tag.active);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-gray-900">Tag Beheer</h2>
                    <p className="text-gray-600 mt-1">
                        Beheer tags voor onderhoudstaken
                    </p>
                </div>
            </div>

            <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-2">
                    <Button
                        variant={showInactive ? 'secondary' : 'outline'}
                        size="sm"
                        onClick={() => setShowInactive(!showInactive)}
                        className={showInactive ? 'bg-gray-200 hover:bg-gray-300 text-gray-900' : 'text-gray-500'}
                    >
                        {showInactive ? 'Inactieve tonen' : 'Inactieve tonen'}
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
                            <TableHead className="text-right w-[100px] font-semibold text-gray-900">Acties</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredTags.length === 0 ? (
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
                                    <TableCell className="text-right">
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

            <Dialog open={isAddDialogOpen || !!editingTag} onOpenChange={handleCloseDialog}>
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
        </div>
    );
}
