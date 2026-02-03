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
import { Plus, Edit, Trash2, Archive, Factory } from 'lucide-react';
import { PageHeader } from './PageHeader';
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
      toast.error('Voer a.u.b. de naam van de pers in');
      return;
    }

    if (editingPress) {
      const updatedPress = {
        ...editingPress,
        ...formData
      };
      updatePress(updatedPress);
      toast.success('Pers succesvol bijgewerkt');

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
      toast.success('Pers succesvol toegevoegd');

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
    toast.success(`Pers "${name}" succesvol verwijderd`);

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
      <PageHeader
        title="Pers Beheer"
        description="Beheer drukpersen in het systeem"
        icon={Factory}
        className="mb-2"
        actions={
          <Button onClick={() => handleOpenDialog()} className="gap-2">
            <Plus className="w-4 h-4" />
            Pers Toevoegen
          </Button>
        }
      />

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Naam</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Gearchiveerd</TableHead>
              <TableHead className="text-right">Acties</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {presses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                  Geen persen gevonden. Voeg uw eerste pers toe om te beginnen.
                </TableCell>
              </TableRow>
            ) : (
              presses.map((press) => (
                <TableRow key={press.id}>
                  <TableCell>{press.name}</TableCell>
                  <TableCell>
                    {press.active ? (
                      <Badge variant="default">Actief</Badge>
                    ) : (
                      <Badge variant="secondary">Inactief</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {press.archived ? (
                      <Badge variant="outline">Gearchiveerd</Badge>
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
                        title={press.archived ? 'Dearchiveren' : 'Archiveren'}
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
                            <AlertDialogTitle>Pers Verwijderen</AlertDialogTitle>
                            <AlertDialogDescription>
                              Weet u zeker dat u "{press.name}" wilt verwijderen? Dit heeft ook invloed op alle taken die aan deze pers zijn gekoppeld.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuleren</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(press.id, press.name)}
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

      <Dialog open={isDialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingPress ? 'Pers Bewerken' : 'Nieuwe Pers Toevoegen'}</DialogTitle>
            <DialogDescription>
              {editingPress
                ? 'Werk de details van de pers hieronder bij.'
                : 'Vul de details in voor de nieuwe pers.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Pers Naam *</Label>
                <Input
                  id="name"
                  placeholder="bijv., Heidelberg"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="active">Actieve Status</Label>
                  <p className="text-gray-500">
                    Inactieve persen verschijnen niet bij het aanmaken van taken
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
                Annuleren
              </Button>
              <Button type="submit">
                {editingPress ? 'Pers Bijwerken' : 'Pers Toevoegen'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
