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
    presses
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
  const resetForm = () => {
    setFormData({
      username: '',
      name: '',
      role: 'press',
      press: presses[0]?.name || 'Lithoman',
      password: ''
    });
    setEditingUser(null);
  };

  const activePresses = presses.filter(p => !p.archived && p.active);

  // --- HANDLERS ---

  const handleAddUser = () => {
    resetForm();
    setIsUserDialogOpen(true);
  };

  const handleEditUser = (account: UserAccount) => {
    setEditingUser(account.username);
    setFormData({
      username: account.username,
      name: account.name || '',
      role: account.role,
      press: account.press || activePresses[0]?.name || 'Lithoman',
    });
    setIsUserDialogOpen(true);
  };

  const handleSaveUser = () => {
    // Validation
    if (!formData.username) {
      toast.error('Username is required');
      return;
    }

    if (editingUser) {
      // Update existing
      updateUserAccount(editingUser, {
        name: formData.name,
        role: formData.role,
        press: formData.role === 'press' ? formData.press : undefined
      });
      toast.success(`User ${editingUser} updated`);
      addActivityLog({
        user: user?.username || 'Unknown',
        action: 'Updated',
        entity: 'User Account',
        entityId: editingUser,
        entityName: editingUser,
        details: `Updated account details for ${editingUser}`
      });
    } else {
      // Create new
      if (!formData.password || formData.password.length < 6) {
        toast.error('Password is required and must be at least 6 characters');
        return;
      }
      // Check if username exists
      if (userAccounts.some(u => u.username === formData.username)) {
        toast.error('Username already exists');
        return;
      }

      addUserAccount({
        username: formData.username,
        name: formData.name,
        password: formData.password,
        role: formData.role,
        press: formData.role === 'press' ? formData.press : undefined
      });
      toast.success(`User ${formData.username} created`);
      addActivityLog({
        user: user?.username || 'Unknown',
        action: 'Created',
        entity: 'User Account',
        entityId: formData.username,
        entityName: formData.username,
        details: `Created new user account: ${formData.username}`
      });
    }
    setIsUserDialogOpen(false);
  };

  const handleDeleteUser = () => {
    if (!deletingUser) return;
    deleteUserAccount(deletingUser);
    toast.success(`User ${deletingUser} deleted`);
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
      toast.error('Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    changePassword(passwordUser, newPassword);
    toast.success('Password changed successfully');

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
          <h2 className="text-gray-900 font-bold text-xl">Account Management</h2>
          <p className="text-gray-600 mt-1">
            Manage users, roles, and passwords
          </p>
        </div>
        {user?.role === 'admin' && (
          <Button onClick={handleAddUser} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Account
          </Button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/50">
              <TableHead>Username</TableHead>
              <TableHead>Display Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Press</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {userAccounts.map((account) => (
              <TableRow key={account.username}>
                <TableCell className="font-medium">{account.username}</TableCell>
                <TableCell>{account.name || '-'}</TableCell>
                <TableCell>
                  <Badge variant={account.role === 'admin' ? 'default' : account.role === 'meestergast' ? 'secondary' : 'outline'}>
                    {account.role}
                  </Badge>
                </TableCell>
                <TableCell>
                  {account.press ? <Badge variant="outline">{account.press}</Badge> : '-'}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    {/* EDIT DETAILS */}
                    {user?.role === 'admin' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditUser(account)}
                        title="Edit Details"
                      >
                        <Pencil className="w-4 h-4 text-gray-500" />
                      </Button>
                    )}

                    {/* CHANGE PASSWORD */}
                    {(user?.role === 'admin' || user?.username === account.username) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setPasswordUser(account.username)}
                        title="Change Password"
                      >
                        <Key className="w-4 h-4 text-gray-500" />
                      </Button>
                    )}

                    {/* DELETE USER */}
                    {user?.role === 'admin' && account.username !== user.username && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeletingUser(account.username)}
                        className="hover:text-red-600 hover:bg-red-50"
                        title="Delete User"
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
      <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Edit Account' : 'Create Account'}</DialogTitle>
            <DialogDescription>
              {editingUser ? `Updating details for ${editingUser}` : 'Add a new user to the system'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Username (Locked if editing) */}
            <div className="grid gap-2">
              <Label htmlFor="username">Username *</Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                disabled={!!editingUser}
                placeholder="jdoe"
              />
            </div>

            {/* Display Name */}
            <div className="grid gap-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="John Doe"
              />
            </div>

            {/* Role Selection */}
            <div className="grid gap-2">
              <Label>Role *</Label>
              <Select
                value={formData.role || 'press'}
                onValueChange={(val: string) => setFormData({ ...formData, role: val as UserRole })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
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
                <Label>Assigned Press *</Label>
                <Select
                  value={formData.press || activePresses[0]?.name}
                  onValueChange={(val) => setFormData({ ...formData, press: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select press" />
                  </SelectTrigger>
                  <SelectContent>
                    {activePresses.map(p => (
                      <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Password (Only if creating) */}
            {!editingUser && (
              <div className="grid gap-2">
                <Label htmlFor="initialPassword">Password *</Label>
                <Input
                  id="initialPassword"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Minimum 6 characters"
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUserDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveUser}>{editingUser ? 'Save Changes' : 'Create Account'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- CHANGE PASSWORD DIALOG --- */}
      <Dialog open={!!passwordUser} onOpenChange={(open) => !open && setPasswordUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Set a new password for {passwordUser}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="newPassword">New Password *</Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirmPassword">Confirm Password *</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPasswordUser(null)}>Cancel</Button>
            <Button onClick={handleChangePassword}>Update Password</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- DELETE CONFIRMATION DIALOG --- */}
      <Dialog open={!!deletingUser} onOpenChange={(open) => !open && setDeletingUser(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Account</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deletingUser}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingUser(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteUser}>Delete Account</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
