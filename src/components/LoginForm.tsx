import { useState } from 'react';
import { useAuth } from './AuthContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Lock } from 'lucide-react';

export function LoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username || !password) {
      setError('Please enter both username and password');
      return;
    }

    const success = login(username, password);
    if (!success) {
      setError('Invalid username or password');
    }
  };

  const handleDemoLogin = (demoUsername: string, demoPassword: string) => {
    setError('');
    setUsername(demoUsername);
    setPassword(demoPassword);
    const success = login(demoUsername, demoPassword);
    if (!success) {
      setError('Failed to log in with demo credentials.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
              <Lock className="w-6 h-6 text-white" />
            </div>
          </div>
          <CardTitle className="text-center">Maintenance Planning</CardTitle>
          <CardDescription className="text-center">
            Sign in to access the maintenance planning system
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="bg-gray-50 p-3 rounded-md border border-gray-200">
              <p className="text-gray-600 mb-2">Demo Credentials:</p>
              <div className="grid grid-cols-2 gap-2">
                {Object.values(DEMO_USERS).map((user) => (
                  <Button
                    key={user.username}
                    variant="outline"
                    onClick={() => handleDemoLogin(user.username, user.password)}
                    className="justify-start"
                  >
                    <span className="font-medium capitalize">{user.username}:</span> {user.password}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full">
              Sign In
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

const DEMO_USERS = {
  ADMIN: { username: 'admin', password: 'admin123' },
  TOM: { username: 'tom', password: 'tom123' },
  LITHOMAN: { username: 'lithoman', password: 'litho123' },
  C80: { username: 'c80', password: 'c80123' },
  C818: { username: 'c818', password: 'c818123' },
};
