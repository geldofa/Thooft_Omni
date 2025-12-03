import { useState } from 'react';
import { useAuth } from './AuthContext';
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
import { Key } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { toast } from 'sonner';

export function PasswordManagement() {
  const { user, userAccounts, changePassword, addActivityLog } = useAuth();
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleChangePassword = () => {
    if (!editingUser) return;

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    changePassword(editingUser, newPassword);
    toast.success('Password changed successfully');

    addActivityLog({
      user: user?.username || 'Unknown',
      action: 'Updated',
      entity: 'Password',
      entityId: editingUser,
      entityName: editingUser,
      details: `Changed password for ${editingUser}`
    });

    setEditingUser(null);
    setNewPassword('');
    setConfirmPassword('');
  };

  const canChangePassword = (username: string) => {
    return user?.role === 'admin' || user?.username === username;
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-gray-900">Password Management</h2>
        <p className="text-gray-600 mt-1">
          Manage passwords for all user accounts
        </p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Username</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Press</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {userAccounts.map((account) => (
              <TableRow key={account.username}>
                <TableCell>{account.username}</TableCell>
                <TableCell>
                  <Badge variant={account.role === 'admin' ? 'default' : 'secondary'}>
                    {account.role}
                  </Badge>
                </TableCell>
                <TableCell>
                  {account.press && <Badge variant="secondary">{account.press}</Badge>}
                </TableCell>
                <TableCell className="text-right">
                  {canChangePassword(account.username) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingUser(account.username)}
                      className="gap-2"
                    >
                      <Key className="w-4 h-4" />
                      Change Password
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Set a new password for {editingUser}
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
            <Button type="button" variant="outline" onClick={() => setEditingUser(null)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleChangePassword}>
              Change Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
