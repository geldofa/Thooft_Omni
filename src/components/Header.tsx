import { useAuth } from './AuthContext';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { LogOut, User } from 'lucide-react';

export function Header() {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="px-2.5 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-gray-900">Maintenance Planning</h2>
            {user.role === 'admin' ? (
              <Badge variant="default">Administrator</Badge>
            ) : (
              <Badge variant="secondary">{user.press}</Badge>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-gray-600">
              <User className="w-4 h-4" />
              <span>{user.username}</span>
            </div>
            <Button variant="outline" onClick={logout} className="gap-2">
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
