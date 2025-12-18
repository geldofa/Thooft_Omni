import { useState, useEffect } from 'react';
import { useAuth, Category } from './AuthContext';
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
import { Edit, Trash2, Plus, Check } from 'lucide-react';
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
import { Checkbox } from './ui/checkbox';
import { toast } from 'sonner';

export function CategoryManagement() {
    const { categories, addCategory, updateCategory, deleteCategory, addActivityLog, user, presses } = useAuth();

    // Get active presses for columns and selectors
    const activePressRecords = presses.filter(p => p.active && !p.archived);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        pressIds: [] as string[],
        active: true
    });
    const [showInactive, setShowInactive] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [editedCategories, setEditedCategories] = useState<Category[]>([]);

    useEffect(() => {
        if (editMode) {
            setEditedCategories(categories);
        }
    }, [editMode, categories]);

    const handleEditChange = (id: string, field: keyof Category, value: any) => {
        setEditedCategories(prev =>
            prev.map(cat => (cat.id === id ? { ...cat, [field]: value } : cat))
        );
    };

    const handleSaveChanges = () => {
        editedCategories.forEach(editedCategory => {
            const originalCategory = categories.find(cat => cat.id === editedCategory.id);
            if (originalCategory && JSON.stringify(originalCategory) !== JSON.stringify(editedCategory)) {
                updateCategory(editedCategory);
            }
        });
        toast.success('Wijzigingen succesvol opgeslagen');
        setEditMode(false);
    };

    const handleOpenDialog = (category?: Category) => {
        if (category) {
            setEditingCategory(category);
            setFormData({
                name: category.name,
                pressIds: category.pressIds,
                active: category.active
            });
        } else {
            setEditingCategory(null);
            setFormData({
                name: '',
                pressIds: [],
                active: true
            });
            setIsAddDialogOpen(true);
        }
    };

    const handleCloseDialog = () => {
        setIsAddDialogOpen(false);
        setEditingCategory(null);
        setFormData({
            name: '',
            pressIds: [],
            active: true
        });
    };

    const handlePressToggle = (pressId: string) => {
        setFormData(prev => ({
            ...prev,
            pressIds: prev.pressIds.includes(pressId)
                ? prev.pressIds.filter(id => id !== pressId)
                : [...prev.pressIds, pressId]
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name.trim()) {
            toast.error('Voer a.u.b. de categorienaam in');
            return;
        }

        if (formData.pressIds.length === 0) {
            toast.error('Selecteer a.u.b. ten minste één pers');
            return;
        }

        if (editingCategory) {
            const updatedCategory: Category = {
                ...editingCategory,
                name: formData.name,
                pressIds: formData.pressIds,
                active: formData.active
            };
            updateCategory(updatedCategory);
            toast.success('Categorie succesvol bijgewerkt');

            addActivityLog({
                user: user?.username || 'Unknown',
                action: 'Updated',
                entity: 'Category',
                entityId: editingCategory.id,
                entityName: formData.name,
                details: `Updated category presses count: ${formData.pressIds.length}`
            });
        } else {
            addCategory(formData);
            toast.success('Categorie succesvol toegevoegd');

            addActivityLog({
                user: user?.username || 'Unknown',
                action: 'Created',
                entity: 'Category',
                entityId: 'new',
                entityName: formData.name,
                details: `Added new category with ${formData.pressIds.length} presses`
            });
        }

        handleCloseDialog();
    };

    const handleDelete = (id: string, name: string) => {
        deleteCategory(id);
        toast.success(`Categorie "${name}" succesvol verwijderd`);

        addActivityLog({
            user: user?.username || 'Unknown',
            action: 'Deleted',
            entity: 'Category',
            entityId: id,
            entityName: name,
            details: `Deleted category`
        });
    };

    const filteredCategories = categories.filter(cat => showInactive ? true : cat.active);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-gray-900">Categorie Beheer</h2>
                    <p className="text-gray-600 mt-1">
                        Beheer categorieën voor onderhoudstaken
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
                <div className="flex gap-2">
                    {editMode && (
                        <Button onClick={handleSaveChanges}>Wijzigingen Opslaan</Button>
                    )}
                    <Button onClick={() => setEditMode(!editMode)} variant="outline">
                        {editMode ? 'Annuleren' : 'Bewerkmodus'}
                    </Button>
                    <Button onClick={() => handleOpenDialog()} className="gap-2">
                        <Plus className="w-4 h-4" />
                        Categorie Toevoegen
                    </Button>
                </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-gray-50 hover:bg-gray-50">
                            <TableHead className="border-r border-gray-200 font-semibold text-gray-900">Naam</TableHead>
                            {activePressRecords.map(press => (
                                <TableHead key={press.id} className="w-[100px] text-center border-r border-gray-200 font-semibold text-gray-900">{press.name}</TableHead>
                            ))}
                            <TableHead className="w-[100px] text-center border-r border-gray-200 font-semibold text-gray-900">Status</TableHead>
                            {!editMode && <TableHead className="text-right w-[100px] font-semibold text-gray-900">Actions</TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {(editMode ? editedCategories : filteredCategories).length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={editMode ? 5 : 6} className="text-center py-12 text-gray-500">
                                    Geen categorieën gevonden.
                                </TableCell>
                            </TableRow>
                        ) : (
                            (editMode ? editedCategories : filteredCategories).map((category) => (
                                <TableRow key={category.id} className="hover:bg-gray-50/50">
                                    <TableCell className="border-r border-gray-200 font-medium">
                                        {editMode ? (
                                            <Input
                                                value={category.name}
                                                onChange={(e) => handleEditChange(category.id, 'name', e.target.value)}
                                                className="h-8"
                                            />
                                        ) : (
                                            category.name
                                        )}
                                    </TableCell>
                                    {activePressRecords.map(press => (
                                        <TableCell key={press.id} className="border-r border-gray-200 p-0">
                                            <div className="flex justify-center items-center h-full py-2">
                                                {editMode ? (
                                                    <Checkbox
                                                        checked={category.pressIds.includes(press.id)}
                                                        onCheckedChange={(checked) => {
                                                            const newPressIds = checked
                                                                ? [...category.pressIds, press.id]
                                                                : category.pressIds.filter(id => id !== press.id);
                                                            handleEditChange(category.id, 'pressIds', newPressIds);
                                                        }}
                                                    />
                                                ) : (
                                                    category.pressIds.includes(press.id) ? (
                                                        <Check className="w-5 h-5 text-green-600" />
                                                    ) : (
                                                        <span className="text-gray-300">-</span>
                                                    )
                                                )}
                                            </div>
                                        </TableCell>
                                    ))}
                                    <TableCell className="border-r border-gray-200 text-center">
                                        {editMode ? (
                                            <div className="flex justify-center">
                                                <Switch
                                                    checked={category.active}
                                                    onCheckedChange={(checked) => handleEditChange(category.id, 'active', checked)}
                                                />
                                            </div>
                                        ) : (
                                            category.active ? (
                                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Actief</Badge>
                                            ) : (
                                                <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200">Inactief</Badge>
                                            )
                                        )}
                                    </TableCell>
                                    {!editMode && (
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleOpenDialog(category)}
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </Button>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="ghost" size="sm">
                                                            <Trash2 className="w-4 h-4 text-red-500" />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Categorie Verwijderen</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                Weet u zeker dat u "{category.name}" wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction
                                                                onClick={() => handleDelete(category.id, category.name)}
                                                                className="bg-red-500 hover:bg-red-600"
                                                            >
                                                                Delete
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={isAddDialogOpen || !!editingCategory} onOpenChange={handleCloseDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>{editingCategory ? 'Categorie Bewerken' : 'Nieuwe Categorie Toevoegen'}</DialogTitle>
                        <DialogDescription>
                            {editingCategory
                                ? 'Werk de details van de categorie hieronder bij.'
                                : 'Vul de details in voor de nieuwe categorie.'}
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit}>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="categoryName">Naam *</Label>
                                <Input
                                    id="categoryName"
                                    placeholder="bijv., Smering"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>

                            <div className="grid gap-3">
                                <Label>Beschikbare Persen *</Label>
                                <div className="space-y-2 border rounded-md p-3">
                                    {activePressRecords.map((press) => (
                                        <div key={press.id} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`category-${press.id}`}
                                                checked={formData.pressIds.includes(press.id)}
                                                onCheckedChange={() => handlePressToggle(press.id)}
                                            />
                                            <label
                                                htmlFor={`category-${press.id}`}
                                                className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                            >
                                                {press.name}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex items-center justify-between border rounded-md p-3">
                                <div className="space-y-0.5">
                                    <Label htmlFor="categoryActive">Actieve Status</Label>
                                    <p className="text-xs text-gray-500">
                                        Inactieve categorieën verschijnen niet in de takenlijsten
                                    </p>
                                </div>
                                <Switch
                                    id="categoryActive"
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
                                {editingCategory ? 'Categorie Bijwerken' : 'Categorie Toevoegen'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
