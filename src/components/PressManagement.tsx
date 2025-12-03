import { useState } from 'react';
import { useAuth, Press } from './AuthContext';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';
import { Plus, Edit, Trash2, Archive } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
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
import { toast } from 'sonner';

export function PressManagement() {
  const { presses, addPress, updatePress, deletePress, addActivityLog, user } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPress, setEditingPress] = useState<Press | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    active: true,
    archived: false
  });

  const handleOpenDialog = (press?: Press) => {
    if (press) {
      setEditingPress(press);
      setFormData({
        name: press.name,
        active: press.active,
        archived: press.archived
      });
    } else {
      setEditingPress(null);
      setFormData({
        name: '',
        active: true,
        archived: false
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingPress(null);
    setFormData({
      name: '',
      active: true,
      archived: false
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Please enter press name');
      return;
    }

    if (editingPress) {
      const updatedPress = {
        ...editingPress,
        ...formData
      };
      updatePress(updatedPress);
      toast.success('Press updated successfully');
      
      addActivityLog({
        user: user?.username || 'Unknown',
        action: 'Updated',
        entity: 'Press',
        entityId: editingPress.id,
        entityName: formData.name,
        details: `Updated press: ${formData.name}`
      });
    } else {
      addPress(formData);
      toast.success('Press added successfully');
      
      addActivityLog({
        user: user?.username || 'Unknown',
        action: 'Created',
        entity: 'Press',
        entityId: Date.now().toString(),
        entityName: formData.name,
        details: `Added new press: ${formData.name}`
      });
    }

    handleCloseDialog();
  };

  const handleDelete = (id: string, name: string) => {
    deletePress(id);
    toast.success(`Press "${name}" deleted successfully`);
    
    addActivityLog({
      user: user?.username || 'Unknown',
      action: 'Deleted',
      entity: 'Press',
      entityId: id,
      entityName: name,
      details: `Deleted press: ${name}`
    });
  };

  const handleArchive = (press: Press) => {
    const updatedPress = {
      ...press,
      archived: !press.archived
    };
    updatePress(updatedPress);
    toast.success(`Press "${press.name}" ${updatedPress.archived ? 'archived' : 'unarchived'}`);
    
    addActivityLog({
      user: user?.username || 'Unknown',
      action: 'Updated',
      entity: 'Press',
      entityId: press.id,
      entityName: press.name,
      details: `${updatedPress.archived ? 'Archived' : 'Unarchived'} press: ${press.name}`
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-gray-900">Press Management</h2>
          <p className="text-gray-600 mt-1">
            Manage printing presses in the system
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Press
        </Button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Archived</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {presses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                  No presses found. Add your first press to get started.
                </TableCell>
              </TableRow>
            ) : (
              presses.map((press) => (
                <TableRow key={press.id}>
                  <TableCell>{press.name}</TableCell>
                  <TableCell>
                    {press.active ? (
                      <Badge variant="default">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {press.archived ? (
                      <Badge variant="outline">Archived</Badge>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleArchive(press)}
                        title={press.archived ? 'Unarchive' : 'Archive'}
                      >
                        <Archive className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDialog(press)}
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
                            <AlertDialogTitle>Delete Press</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{press.name}"? This will also affect all tasks associated with this press.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(press.id, press.name)}
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

      <Dialog open={isDialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingPress ? 'Edit Press' : 'Add New Press'}</DialogTitle>
            <DialogDescription>
              {editingPress
                ? 'Update the press details below.'
                : 'Fill in the details for the new press.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Press Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Heidelberg"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="active">Active Status</Label>
                  <p className="text-gray-500">
                    Inactive presses won't appear in task creation
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
                {editingPress ? 'Update Press' : 'Add Press'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
