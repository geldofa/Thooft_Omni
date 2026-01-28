import { useState } from 'react';
import { useAuth, UserAccount, UserRole, PressType } from './AuthContext';
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
import { Key, Plus, Pencil, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { toast } from 'sonner';

export function PasswordManagement() {
  const {
    user,
    userAccounts,
    changePassword,
    addUserAccount,
    updateUserAccount,
    deleteUserAccount,
    addActivityLog,
    presses,
    hasPermission
  } = useAuth();

  // --- DELETE CONFIRMATION STATE ---
  const [deletingUser, setDeletingUser] = useState<string | null>(null);

  // --- PASSWORD CHANGE STATE ---
  const [passwordUser, setPasswordUser] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // --- ADD/EDIT USER STATE ---
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<string | null>(null); // Username if editing, null if adding
  const [formData, setFormData] = useState<{
    username: string;
    name: string;
    role: UserRole;
    press: PressType;
    password?: string; // Only for adding
  }>({
    username: '',
    name: '',
    role: 'press',
    press: 'Lithoman',
    password: ''
  });

  // --- HELPERS ---

  const activePresses = presses.filter(p => !p.archived && p.active);

  // --- HANDLERS ---

  const handleOpenUserDialog = (account?: UserAccount) => {
    if (account) {
      setEditingUser(account.username);
      setFormData({
        username: account.username,
        name: account.name || '',
        role: account.role,
        press: account.press || activePresses[0]?.name || 'Lithoman',
      });
    } else {
      setFormData({
        username: '',
        name: '',
        role: 'press',
        press: activePresses[0]?.name || 'Lithoman',
        password: ''
      });
      setEditingUser(null);
    }
    setIsUserDialogOpen(true);
  };

  const handleCloseUserDialog = () => {
    setIsUserDialogOpen(false);
    setTimeout(() => {
      setEditingUser(null);
      setFormData({
        username: '',
        name: '',
        role: 'press',
        press: activePresses[0]?.name || 'Lithoman',
        password: ''
      });
    }, 200); // Small delay to prevent title/field flash during close animation
  };

  const handleSaveUser = async () => {
    // Validation
    if (!formData.username) {
      toast.error('Gebruikersnaam is verplicht');
      return;
    }

    if (editingUser) {
      // Update existing
      const success = await updateUserAccount(editingUser, {
        name: formData.name,
        role: formData.role,
        press: formData.role === 'press' ? formData.press : undefined
      });

      if (success) {
        toast.success(`Gebruiker ${editingUser} bijgewerkt`);
        addActivityLog({
          user: user?.username || 'Unknown',
          action: 'Updated',
          entity: 'User Account',
          entityId: editingUser,
          entityName: editingUser,
          details: `Updated account details for ${editingUser}`
        });
        setIsUserDialogOpen(false);
      }
    } else {
      // Create new
      if (!formData.password || formData.password.length < 6) {
        toast.error('Wachtwoord is verplicht en moet minimaal 6 tekens bevatten');
        return;
      }
      // Check if username exists
      if (userAccounts.some(u => u.username === formData.username)) {
        toast.error('Gebruikersnaam bestaat al');
        return;
      }

      const success = await addUserAccount({
        id: Math.random().toString(36).substr(2, 9),
        username: formData.username,
        name: formData.name,
        password: formData.password,
        role: formData.role,
        press: formData.role === 'press' ? formData.press : undefined
      });

      if (success) {
        toast.success(`Gebruiker ${formData.username} aangemaakt`);
        addActivityLog({
          user: user?.username || 'Unknown',
          action: 'Created',
          entity: 'User Account',
          entityId: formData.username,
          entityName: formData.username,
          details: `Created new user account: ${formData.username}`
        });
        setIsUserDialogOpen(false);
      }
    }
  };

  const handleDeleteUser = () => {
    if (!deletingUser) return;
    deleteUserAccount(deletingUser);
    toast.success(`Gebruiker ${deletingUser} verwijderd`);
    addActivityLog({
      user: user?.username || 'Unknown',
      action: 'Deleted',
      entity: 'User Account',
      entityId: deletingUser,
      entityName: deletingUser,
      details: `Deleted user account: ${deletingUser}`
    });
    setDeletingUser(null);
  };

  const handleChangePassword = () => {
    if (!passwordUser) return;

    if (newPassword.length < 6) {
      toast.error('Wachtwoord moet minimaal 6 tekens bevatten');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Wachtwoorden komen niet overeen');
      return;
    }

    changePassword(passwordUser, newPassword);
    toast.success('Wachtwoord succesvol gewijzigd');

    addActivityLog({
      user: user?.username || 'Unknown',
      action: 'Updated',
      entity: 'Password',
      entityId: passwordUser,
      entityName: passwordUser,
      details: `Changed password for ${passwordUser}`
    });

    setPasswordUser(null);
    setNewPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-gray-900 font-bold text-xl">Accountbeheer</h2>
          <p className="text-gray-600 mt-1">
            Beheer gebruikers, rollen en wachtwoorden
          </p>
        </div>
        {user?.role === 'admin' && (
          <Button onClick={() => handleOpenUserDialog()} className="gap-2">
            <Plus className="w-4 h-4" />
            Account Toevoegen
          </Button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/50">
              <TableHead>Gebruikersnaam</TableHead>
              <TableHead>Naam</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Pers</TableHead>
              <TableHead className="text-right">Acties</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {userAccounts.map((account) => (
              <TableRow key={account.username}>
                <TableCell className="font-medium">{account.username}</TableCell>
                <TableCell>{account.name || '-'}</TableCell>
                <TableCell>
                  <Badge variant={account.role === 'admin' ? 'default' : account.role === 'meestergast' ? 'secondary' : 'outline'}>
                    {account.role === 'admin' ? 'Admin' : account.role === 'meestergast' ? 'Meestergast' : 'Pers'}
                  </Badge>
                </TableCell>
                <TableCell>
                  {account.press ? <Badge variant="outline">{account.press}</Badge> : '-'}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    {/* EDIT DETAILS */}
                    {hasPermission('manage_accounts') && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenUserDialog(account)}
                        title="Gegevens Bewerken"
                      >
                        <Pencil className="w-4 h-4 text-gray-500" />
                      </Button>
                    )}

                    {/* CHANGE PASSWORD */}
                    {(hasPermission('manage_accounts') || user?.username === account.username) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setPasswordUser(account.username)}
                        title="Wachtwoord Wijzigen"
                      >
                        <Key className="w-4 h-4 text-gray-500" />
                      </Button>
                    )}

                    {/* DELETE USER */}
                    {hasPermission('manage_accounts') && account.username !== user?.username && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeletingUser(account.username)}
                        className="hover:text-red-600 hover:bg-red-50"
                        title="Account Verwijderen"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* --- ADD / EDIT USER DIALOG --- */}
      <Dialog open={isUserDialogOpen} onOpenChange={(open) => !open && handleCloseUserDialog()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Account Bewerken' : 'Account Aanmaken'}</DialogTitle>
            <DialogDescription>
              {editingUser ? `Details bijwerken voor ${editingUser}` : 'Een nieuwe gebruiker toevoegen aan het systeem'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Username (Locked if editing) */}
            <div className="grid gap-2">
              <Label htmlFor="username">Gebruikersnaam *</Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                disabled={!!editingUser}
                placeholder="gebruikersnaam"
              />
            </div>

            {/* Display Name */}
            <div className="grid gap-2">
              <Label htmlFor="displayName">Naam</Label>
              <Input
                id="displayName"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Jan Janssen"
              />
            </div>

            {/* Role Selection */}
            <div className="grid gap-2">
              <Label>Rol *</Label>
              <Select
                value={formData.role || 'press'}
                onValueChange={(val: string) => setFormData({ ...formData, role: val as UserRole })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="meestergast">Meestergast</SelectItem>
                  <SelectItem value="press">Pers (Press Operator)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Press Selection (Only if role is 'press') */}
            {formData.role === 'press' && (
              <div className="grid gap-2">
                <Label>Toegewezen Pers *</Label>
                <Select
                  value={formData.press || activePresses[0]?.name}
                  onValueChange={(val) => setFormData({ ...formData, press: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecteer pers" />
                  </SelectTrigger>
                  <SelectContent>
                    {activePresses.filter(p => p.id && p.id.trim() !== '' && p.name && p.name.trim() !== '').map((p) => (
                      <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Password (Only if creating) */}
            {!editingUser && (
              <div className="grid gap-2">
                <Label htmlFor="initialPassword">Wachtwoord *</Label>
                <Input
                  id="initialPassword"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Minimaal 6 tekens"
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseUserDialog}>Annuleren</Button>
            <Button onClick={handleSaveUser}>{editingUser ? 'Wijzigingen Opslaan' : 'Account Aanmaken'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- CHANGE PASSWORD DIALOG --- */}
      <Dialog open={!!passwordUser} onOpenChange={(open) => !open && setPasswordUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Wachtwoord Wijzigen</DialogTitle>
            <DialogDescription>
              Stel een nieuw wachtwoord in voor {passwordUser}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="newPassword">Nieuw Wachtwoord *</Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="Voer nieuw wachtwoord in"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirmPassword">Bevestig Wachtwoord *</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Bevestig nieuw wachtwoord"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPasswordUser(null)}>Annuleren</Button>
            <Button onClick={handleChangePassword}>Wachtwoord Bijwerken</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- DELETE CONFIRMATION DIALOG --- */}
      <Dialog open={!!deletingUser} onOpenChange={(open) => !open && setDeletingUser(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Account Verwijderen</DialogTitle>
            <DialogDescription>
              Weet u zeker dat u <strong>{deletingUser}</strong> wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingUser(null)}>Annuleren</Button>
            <Button variant="destructive" onClick={handleDeleteUser}>Account Verwijderen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
