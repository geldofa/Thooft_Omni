import { useState, useEffect } from 'react';
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
  const { login, testingMode, userAccounts, fetchUserAccounts } = useAuth();

  useEffect(() => {
    if (testingMode) {
      fetchUserAccounts();
    }
  }, [testingMode, fetchUserAccounts]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username || !password) {
      setError('Vul a.u.b. zowel gebruikersnaam als wachtwoord in');
      return;
    }

    const success = await login(username, password);
    if (!success) {
      setError('Ongeldige gebruikersnaam of wachtwoord');
    }
  };

  const handleQuickLogin = async (acc: any) => {
    setError('');
    setUsername(acc.username);

    // Try conventions: username, username123, or {name}12345
    const passwordsToTry = [
      acc.username,
      `${acc.username}123`,
      `${acc.name}12345`,
      'admin123'
    ];

    for (const pw of passwordsToTry) {
      if (!pw) continue;
      const success = await login(acc.username, pw);
      if (success) {
        setPassword(pw);
        return;
      }
    }

    setError(`Kon niet automatisch inloggen voor ${acc.username}. Vul handmatig het wachtwoord in.`);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans">
      <Card className="w-full max-w-md shadow-xl border-none">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
              <Lock className="w-8 h-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center font-bold text-gray-900">Omni.Thooft</CardTitle>
          <CardDescription className="text-center text-gray-500">
            Log in op het onderhoudssysteem
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive" className="bg-red-50 border-red-200 text-red-800">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="username">Gebruikersnaam</Label>
              <Input
                id="username"
                type="text"
                placeholder="Gebruikersnaam"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Wachtwoord</Label>
              <Input
                id="password"
                type="password"
                placeholder="Wachtwoord"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11"
              />
            </div>

            {testingMode && userAccounts.length > 0 && (
              <div className="mt-6 pt-6 border-t border-gray-100">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-1">Geregistreerde Accounts (Test Modus):</p>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                  {userAccounts.map((acc) => (
                    <Button
                      key={acc.id}
                      type="button"
                      variant="outline"
                      onClick={() => handleQuickLogin(acc)}
                      className="justify-start h-auto py-2 px-3 border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all text-left block"
                    >
                      <div className="font-semibold text-gray-800 text-sm truncate">{acc.username}</div>
                      <div className="text-[10px] text-gray-500 uppercase tracking-tight">{acc.role || 'user'}</div>
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="pt-2">
            <Button type="submit" className="w-full h-11 text-lg bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-100 transition-all">
              Inloggen
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
