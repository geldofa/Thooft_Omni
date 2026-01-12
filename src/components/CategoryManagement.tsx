import { useState, useEffect } from 'react';
import { useAuth, Category } from './AuthContext';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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
import { Edit, Trash2, Plus, Check, Settings2, GripVertical, Save } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "./ui/select";
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
    DialogTrigger,
} from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Checkbox } from './ui/checkbox';
import { toast } from 'sonner';



function SortableItem(props: { id: string, name: string }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: props.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : 1,
        opacity: isDragging ? 0.8 : 1
    };

    return (
        <div ref={setNodeRef} style={style} className="flex items-center p-3 bg-white border border-gray-200 rounded-md mb-2 shadow-sm group hover:border-blue-300 transition-colors">
            <button {...attributes} {...listeners} className="mr-3 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 touch-none">
                <GripVertical className="h-5 w-5" />
            </button>
            <span className="font-medium text-gray-700">{props.name}</span>
        </div>
    );
}

function CategoryOrderConfiguration() {
    const { presses, categories, updatePressCategoryOrder } = useAuth();
    const activePresses = presses.filter(p => p.active && !p.archived);

    // Check if we have presses to configure
    const [selectedPressId, setSelectedPressId] = useState<string>(activePresses.length > 0 ? activePresses[0].id : '');
    const [order, setOrder] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    // Provide sensors for DnD
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    // Load initial order when press changes
    useEffect(() => {
        if (!selectedPressId) return;

        // Get categories linked to this press
        const linkedCategories = categories.filter(c => c.pressIds.includes(selectedPressId) && c.active);
        const linkedIds = linkedCategories.map(c => c.id);

        const currentPress = presses.find(p => p.id === selectedPressId);

        // Saved order is now guaranteed to be an array (or undefined) by AuthContext
        const savedOrder: string[] = currentPress?.category_order || [];

        console.log('[CategoryOrderConfig] Loading for press:', currentPress?.name, 'Saved Order:', savedOrder);
        console.log('[CategoryOrderConfig] Linked IDs:', linkedIds);

        // Merge saved order with current categories
        // 1. Filter saved order to keep only valid linked IDs
        // 2. Add any new linked categories that aren't in saved order
        const validSavedOrder = savedOrder.filter(id => linkedIds.includes(id));
        const newIds = linkedIds.filter(id => !validSavedOrder.includes(id));

        setOrder([...validSavedOrder, ...newIds]);

    }, [selectedPressId, categories, presses, isOpen]);

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setOrder((items) => {
                const oldIndex = items.indexOf(active.id as string);
                const newIndex = items.indexOf(over.id as string);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    const handleSave = async () => {
        if (!selectedPressId) return;
        setIsSaving(true);
        try {
            await updatePressCategoryOrder(selectedPressId, order);
            toast.success("Categorievolgorde opgeslagen");
            setIsOpen(false);
        } catch (error) {
            toast.error("Kon volgorde niet opslaan");
        } finally {
            setIsSaving(false);
        }
    };

    // Helper to get name
    const getCategoryName = (id: string) => categories.find(c => c.id === id)?.name || id;

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                    <Settings2 className="w-4 h-4" />
                    Volgorde Configureren
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Categorievolgorde Configureren</DialogTitle>
                    <DialogDescription>
                        Sleep categorieën om de volgorde voor een specifieke pers te bepalen.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-4 flex-1 overflow-hidden flex flex-col">
                    <div className="space-y-2">
                        <Label>Selecteer Pers</Label>
                        <Select value={selectedPressId} onValueChange={setSelectedPressId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Kies een pers" />
                            </SelectTrigger>
                            <SelectContent>
                                {activePresses.map(p => (
                                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex-1 overflow-y-auto border rounded-md p-4 bg-gray-50/50">
                        {order.length === 0 ? (
                            <div className="text-center text-gray-500 py-8">Geen categorieën gevonden voor deze pers.</div>
                        ) : (
                            <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragEnd={handleDragEnd}
                            >
                                <SortableContext items={order} strategy={verticalListSortingStrategy}>
                                    {order.map(id => (
                                        <SortableItem key={id} id={id} name={getCategoryName(id)} />
                                    ))}
                                </SortableContext>
                            </DndContext>
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)}>Annuleren</Button>
                    <Button onClick={handleSave} disabled={isSaving || !selectedPressId} className="gap-2">
                        {isSaving ? "Opslaan..." : (
                            <>
                                <Save className="w-4 h-4" />
                                Opslaan
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

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

            <div className="flex justify-end">
                <CategoryOrderConfiguration />
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
