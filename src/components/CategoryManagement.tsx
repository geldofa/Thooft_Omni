import { useState } from 'react';
import { useAuth } from './AuthContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { toast } from 'sonner';

export function CategoryManagement() {
    const { categoryOrder, updateCategoryOrder } = useAuth();
    const [newCategory, setNewCategory] = useState('');
    const [editingCategory, setEditingCategory] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');
    const [draggedItem, setDraggedItem] = useState<string | null>(null);

    const handleAddCategory = () => {
        if (newCategory.trim() && !categoryOrder.includes(newCategory.trim())) {
            updateCategoryOrder([...categoryOrder, newCategory.trim()]);
            setNewCategory('');
            toast.success('Category added successfully');
        }
    };

    const handleDeleteCategory = (category: string) => {
        const updatedCategories = categoryOrder.filter(cat => cat !== category);
        updateCategoryOrder(updatedCategories);
        toast.success('Category deleted successfully');
    };

    const handleStartEdit = (category: string) => {
        setEditingCategory(category);
        setEditValue(category);
    };

    const handleSaveEdit = () => {
        if (editValue.trim() && editingCategory) {
            const updatedCategories = categoryOrder.map(cat =>
                cat === editingCategory ? editValue.trim() : cat
            );
            updateCategoryOrder(updatedCategories);
            setEditingCategory(null);
            toast.success('Category updated successfully');
        }
    };

    const handleDragStart = (e: React.DragEvent, category: string) => {
        setDraggedItem(category);
        e.dataTransfer.setData('text/plain', category);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDrop = (e: React.DragEvent, targetCategory: string) => {
        e.preventDefault();
        if (draggedItem && draggedItem !== targetCategory) {
            const draggedIndex = categoryOrder.indexOf(draggedItem);
            const targetIndex = categoryOrder.indexOf(targetCategory);

            if (draggedIndex !== -1 && targetIndex !== -1) {
                const newOrder = [...categoryOrder];
                newOrder.splice(draggedIndex, 1);
                newOrder.splice(targetIndex, 0, draggedItem);
                updateCategoryOrder(newOrder);
            }
        }
        setDraggedItem(null);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Category Management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex gap-2">
                    <Input
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        placeholder="New category name"
                        className="flex-1"
                    />
                    <Button onClick={handleAddCategory} className="gap-2">
                        <Plus className="w-4 h-4" />
                        Add Category
                    </Button>
                </div>

                <div className="space-y-2">
                    {categoryOrder.map((category) => (
                        <div
                            key={category}
                            draggable
                            onDragStart={(e) => handleDragStart(e, category)}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, category)}
                            className={`flex items-center gap-3 p-3 border rounded-lg cursor-move hover:bg-gray-50 transition-colors ${draggedItem === category ? 'bg-blue-50 border-blue-200' : ''
                                }`}
                        >
                            <GripVertical className="w-4 h-4 text-gray-400 cursor-move" />
                            {editingCategory === category ? (
                                <Input
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    onBlur={handleSaveEdit}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
                                    autoFocus
                                    className="flex-1"
                                />
                            ) : (
                                <span
                                    className="flex-1 cursor-pointer"
                                    onClick={() => handleStartEdit(category)}
                                >
                                    {category}
                                </span>
                            )}
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteCategory(category)}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>
                    ))}
                </div>

                <p className="text-sm text-gray-500">
                    Drag and drop categories to reorder them. This affects how tasks are displayed in the system.
                </p>
            </CardContent>
        </Card>
    );
}
