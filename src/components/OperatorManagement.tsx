import { useState } from 'react';
import { useAuth, Operator, PressType } from './AuthContext';
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
import { Edit, Trash2, Plus } from 'lucide-react';
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

const PRESSES: PressType[] = ['Lithoman', 'C80', 'C818'];

export function OperatorManagement() {
  const { operators, addOperator, updateOperator, deleteOperator, addActivityLog, user } = useAuth();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingOperator, setEditingOperator] = useState<Operator | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    presses: [] as PressType[],
    active: true
  });

  const handleOpenDialog = (operator?: Operator) => {
    if (operator) {
      setEditingOperator(operator);
      setFormData({
        name: operator.name,
        presses: operator.presses,
        active: operator.active
      });
    } else {
      setEditingOperator(null);
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
    setEditingOperator(null);
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
      toast.error('Please enter operator name');
      return;
    }

    if (formData.presses.length === 0) {
      toast.error('Please select at least one press');
      return;
    }

    if (editingOperator) {
      const updatedOperator = {
        ...editingOperator,
        ...formData
      };
      updateOperator(updatedOperator);
      toast.success('Operator updated successfully');

      addActivityLog({
        user: user?.username || 'Unknown',
        action: 'Updated',
        entity: 'Operator',
        entityId: editingOperator.id,
        entityName: formData.name,
        details: `Updated operator presses: ${formData.presses.join(', ')}`
      });
    } else {
      const newOp = { ...formData, id: Date.now().toString() };
      addOperator({
        ...formData,
        canEditTasks: false,
        canAccessOperatorManagement: false
      });
      toast.success('Operator added successfully');

      addActivityLog({
        user: user?.username || 'Unknown',
        action: 'Created',
        entity: 'Operator',
        entityId: newOp.id,
        entityName: formData.name,
        details: `Added new operator with presses: ${formData.presses.join(', ')}`
      });
    }

    handleCloseDialog();
  };

  const handleDelete = (id: string, name: string) => {
    deleteOperator(id);
    toast.success(`Operator "${name}" deleted successfully`);

    addActivityLog({
      user: user?.username || 'Unknown',
      action: 'Deleted',
      entity: 'Operator',
      entityId: id,
      entityName: name,
      details: `Deleted operator`
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-gray-900">Operator Management</h2>
          <p className="text-gray-600 mt-1">
            Manage operators who can perform maintenance tasks
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Operator
        </Button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Lithoman</TableHead>
              <TableHead>C80</TableHead>
              <TableHead>C818</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {operators.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-gray-500">
                  No operators found. Add your first operator to get started.
                </TableCell>
              </TableRow>
            ) : (
              operators.map((operator) => (
                <TableRow key={operator.id}>
                  <TableCell>{operator.name}</TableCell>
                  <TableCell>
                    <div className="flex justify-center">
                      {operator.presses.includes('Lithoman') ? (
                        <Badge variant="default" className="bg-green-500">✓</Badge>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-center">
                      {operator.presses.includes('C80') ? (
                        <Badge variant="default" className="bg-green-500">✓</Badge>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-center">
                      {operator.presses.includes('C818') ? (
                        <Badge variant="default" className="bg-green-500">✓</Badge>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {operator.active ? (
                      <Badge variant="default">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDialog(operator)}
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
                            <AlertDialogTitle>Delete Operator</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{operator.name}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(operator.id, operator.name)}
                              className="bg-red-500 hover:bg-red-600"
                            >
                              Delete
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

      <Dialog open={isAddDialogOpen || !!editingOperator} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingOperator ? 'Edit Operator' : 'Add New Operator'}</DialogTitle>
            <DialogDescription>
              {editingOperator
                ? 'Update the operator details below.'
                : 'Fill in the details for the new operator.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., John Smith"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="grid gap-3">
                <Label>Available Presses *</Label>
                <div className="space-y-2">
                  {PRESSES.map((press) => (
                    <div key={press} className="flex items-center space-x-2">
                      <Checkbox
                        id={press}
                        checked={formData.presses.includes(press)}
                        onCheckedChange={() => handlePressToggle(press)}
                      />
                      <label
                        htmlFor={press}
                        className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {press}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="active">Active Status</Label>
                  <p className="text-gray-500">
                    Inactive operators won't appear in assignment lists
                  </p>
                </div>
                <Switch
                  id="active"
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
                {editingOperator ? 'Update Operator' : 'Add Operator'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
