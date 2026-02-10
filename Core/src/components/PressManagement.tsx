import { useState, useEffect, useCallback } from 'react';
import { pb, useAuth, Press } from './AuthContext';
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
  const { user, addActivityLog } = useAuth();
  const [presses, setPresses] = useState<Press[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchPresses = useCallback(async () => {
    try {
      setIsLoading(true);
      const records = await pb.collection('persen').getFullList({
        sort: 'naam'
      });
      setPresses(records.map((r: any) => ({
        id: r.id,
        name: r.naam,
        active: r.active !== false,
        archived: r.archived === true,
        category_order: r.category_order
      })));
    } catch (e) {
      console.error("Failed to fetch presses", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPresses();
    pb.collection('persen').subscribe('*', () => fetchPresses());
    return () => {
      pb.collection('persen').unsubscribe('*');
    };
  }, [fetchPresses]);

  const addPressLocal = async (press: Omit<Press, 'id'>) => {
    try {
      await pb.collection('persen').create({
        naam: press.name,
        active: press.active,
        archived: press.archived
      });
      fetchPresses();
      return true;
    } catch (e) {
      console.error("Add press failed", e);
      return false;
    }
  };

  const updatePressLocal = async (press: Press) => {
    try {
      await pb.collection('persen').update(press.id, {
        naam: press.name,
        active: press.active,
        archived: press.archived
      });
      fetchPresses();
      return true;
    } catch (e) {
      console.error("Update press failed", e);
      return false;
    }
  };

  const deletePressLocal = async (id: string) => {
    try {
      await pb.collection('persen').delete(id);
      fetchPresses();
      return true;
    } catch (e) {
      console.error("Delete press failed", e);
      return false;
    }
  };

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Voer a.u.b. de naam van de pers in');
      return;
    }

    if (editingPress) {
      const success = await updatePressLocal({
        ...editingPress,
        ...formData
      });

      if (success) {
        toast.success('Pers succesvol bijgewerkt');
        addActivityLog({
          user: user?.username || 'Unknown',
          action: 'Updated',
          entity: 'Press',
          entityId: editingPress.id,
          entityName: formData.name,
          details: `Updated press: ${formData.name}`,
          oldValue: `Naam: ${editingPress.name}|||Status: ${editingPress.active ? 'Actief' : 'Inactief'}`,
          newValue: `Naam: ${formData.name}|||Status: ${formData.active ? 'Actief' : 'Inactief'}`
        });
        handleCloseDialog();
      } else {
        toast.error('Bijwerken van pers mislukt');
      }
    } else {
      const success = await addPressLocal(formData);

      if (success) {
        toast.success('Pers succesvol toegevoegd');
        addActivityLog({
          user: user?.username || 'Unknown',
          action: 'Created',
          entity: 'Press',
          entityId: 'new',
          entityName: formData.name,
          details: `Added new press: ${formData.name}`,
          newValue: `Naam: ${formData.name}|||Status: ${formData.active ? 'Actief' : 'Inactief'}`
        });
        handleCloseDialog();
      } else {
        toast.error('Toevoegen van pers mislukt');
      }
    }
  };

  const handleDelete = async (id: string, name: string) => {
    const success = await deletePressLocal(id);
    if (success) {
      toast.success(`Pers "${name}" succesvol verwijderd`);
      addActivityLog({
        user: user?.username || 'Unknown',
        action: 'Deleted',
        entity: 'Press',
        entityId: id,
        entityName: name,
        details: `Deleted press: ${name}`,
        oldValue: `Naam: ${name}`
      });
    } else {
      toast.error(`Verwijderen van pers "${name}" mislukt`);
    }
  };

  const handleArchive = async (press: Press) => {
    const updatedPress = {
      ...press,
      archived: !press.archived
    };
    const success = await updatePressLocal(updatedPress);

    if (success) {
      toast.success(`Press "${press.name}" ${updatedPress.archived ? 'archived' : 'unarchived'}`);
      addActivityLog({
        user: user?.username || 'Unknown',
        action: 'Updated',
        entity: 'Press',
        entityId: press.id,
        entityName: press.name,
        details: `${updatedPress.archived ? 'Archived' : 'Unarchived'} press: ${press.name}`,
        oldValue: `Gearchiveerd: ${press.archived ? 'Ja' : 'Nee'}`,
        newValue: `Gearchiveerd: ${updatedPress.archived ? 'Ja' : 'Nee'}`
      });
    } else {
      toast.error(`Archiveren van pers "${press.name}" mislukt`);
    }
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

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
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
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8">Laden...</TableCell>
              </TableRow>
            ) : presses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                  Geen persen gevonden. Voeg uw eerste pers toe om te beginnen.
                </TableCell>
              </TableRow>
            ) : (
              presses.map((press) => (
                <TableRow key={press.id}>
                  <TableCell className="font-medium">{press.name}</TableCell>
                  <TableCell>
                    {press.active ? (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Actief</Badge>
                    ) : (
                      <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200">Inactief</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {press.archived ? (
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Gearchiveerd</Badge>
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

              <div className="flex items-center justify-between border rounded-md p-3">
                <div className="space-y-0.5">
                  <Label htmlFor="active">Actieve Status</Label>
                  <p className="text-xs text-gray-500">
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
