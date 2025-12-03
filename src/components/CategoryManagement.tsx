import { useState, useEffect } from 'react';
import { useAuth, Category, PressType } from './AuthContext';
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

    // Get active presses for columns
    const activePresses = presses
        .filter(p => p.active && !p.archived)
        .map(p => p.name);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        presses: [] as PressType[],
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
        toast.success('Changes saved successfully');
        setEditMode(false);
    };

    const handleOpenDialog = (category?: Category) => {
        if (category) {
            setEditingCategory(category);
            setFormData({
                name: category.name,
                presses: category.presses,
                active: category.active
            });
        } else {
            setEditingCategory(null);
            setFormData({
                name: '',
                presses: [],
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
            presses: [],
            active: true
        });
    };

    const handlePressToggle = (press: PressType) => {
        setFormData(prev => ({
            ...prev,
            presses: prev.presses.includes(press)
                ? prev.presses.filter(p => p !== press)
                : [...prev.presses, press]
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name.trim()) {
            toast.error('Please enter category name');
            return;
        }

        if (formData.presses.length === 0) {
            toast.error('Please select at least one press');
            return;
        }

        if (editingCategory) {
            const updatedCategory = {
                ...editingCategory,
                ...formData
            };
            updateCategory(updatedCategory);
            toast.success('Category updated successfully');

            addActivityLog({
                user: user?.username || 'Unknown',
                action: 'Updated',
                entity: 'Category',
                entityId: editingCategory.id,
                entityName: formData.name,
                details: `Updated category presses: ${formData.presses.join(', ')}`
            });
        } else {
            addCategory(formData);
            toast.success('Category added successfully');

            addActivityLog({
                user: user?.username || 'Unknown',
                action: 'Created',
                entity: 'Category',
                entityId: 'new',
                entityName: formData.name,
                details: `Added new category with presses: ${formData.presses.join(', ')}`
            });
        }

        handleCloseDialog();
    };

    const handleDelete = (id: string, name: string) => {
        deleteCategory(id);
        toast.success(`Category "${name}" deleted successfully`);

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
                    <h2 className="text-gray-900">Category Management</h2>
                    <p className="text-gray-600 mt-1">
                        Manage maintenance task categories
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
                        {showInactive ? 'Showing Inactive' : 'Show Inactive'}
                    </Button>
                </div>
                <div className="flex gap-2">
                    {editMode && (
                        <Button onClick={handleSaveChanges}>Save Changes</Button>
                    )}
                    <Button onClick={() => setEditMode(!editMode)} variant="outline">
                        {editMode ? 'Cancel' : 'Edit Mode'}
                    </Button>
                    <Button onClick={() => handleOpenDialog()} className="gap-2">
                        <Plus className="w-4 h-4" />
                        Add Category
                    </Button>
                </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-gray-50 hover:bg-gray-50">
                            <TableHead className="border-r border-gray-200 font-semibold text-gray-900">Name</TableHead>
                            <TableHead className="w-[100px] text-center border-r border-gray-200 font-semibold text-gray-900">Lithoman</TableHead>
                            <TableHead className="w-[100px] text-center border-r border-gray-200 font-semibold text-gray-900">C80</TableHead>
                            <TableHead className="w-[100px] text-center border-r border-gray-200 font-semibold text-gray-900">C818</TableHead>
                            <TableHead className="w-[100px] text-center border-r border-gray-200 font-semibold text-gray-900">Status</TableHead>
                            {!editMode && <TableHead className="text-right w-[100px] font-semibold text-gray-900">Actions</TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {(editMode ? editedCategories : filteredCategories).length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={editMode ? 5 : 6} className="text-center py-12 text-gray-500">
                                    No categories found.
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
                                    {activePresses.map(press => (
                                        <TableCell key={press} className="border-r border-gray-200 p-0">
                                            <div className="flex justify-center items-center h-full py-2">
                                                {editMode ? (
                                                    <Checkbox
                                                        checked={category.presses.includes(press)}
                                                        onCheckedChange={(checked) => {
                                                            const newPresses = checked
                                                                ? [...category.presses, press]
                                                                : category.presses.filter(p => p !== press);
                                                            handleEditChange(category.id, 'presses', newPresses);
                                                        }}
                                                    />
                                                ) : (
                                                    category.presses.includes(press) ? (
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
                                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Active</Badge>
                                            ) : (
                                                <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200">Inactive</Badge>
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
                                                            <AlertDialogTitle>Delete Category</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                Are you sure you want to delete "{category.name}"? This action cannot be undone.
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
                        <DialogTitle>{editingCategory ? 'Edit Category' : 'Add New Category'}</DialogTitle>
                        <DialogDescription>
                            {editingCategory
                                ? 'Update the category details below.'
                                : 'Fill in the details for the new category.'}
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit}>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="categoryName">Name *</Label>
                                <Input
                                    id="categoryName"
                                    placeholder="e.g., Smering"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>

                            <div className="grid gap-3">
                                <Label>Available Presses *</Label>
                                <div className="space-y-2 border rounded-md p-3">
                                    {activePresses.map((press) => (
                                        <div key={press} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`category-${press}`}
                                                checked={formData.presses.includes(press)}
                                                onCheckedChange={() => handlePressToggle(press)}
                                            />
                                            <label
                                                htmlFor={`category-${press}`}
                                                className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                            >
                                                {press}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex items-center justify-between border rounded-md p-3">
                                <div className="space-y-0.5">
                                    <Label htmlFor="categoryActive">Active Status</Label>
                                    <p className="text-xs text-gray-500">
                                        Inactive categories won't appear in task lists
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
                                Cancel
                            </Button>
                            <Button type="submit">
                                {editingCategory ? 'Update Category' : 'Add Category'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
