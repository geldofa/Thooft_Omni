import { useState, useEffect } from 'react';
import { useAuth, pb } from './AuthContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Rocket } from 'lucide-react';
import { APP_VERSION, APP_NAME } from '../config';

export function LoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
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

  const [searchingId, setSearchingId] = useState<string | null>(null);

  const handleQuickLogin = async (acc: any) => {
    setError('');
    setSearchingId(acc.id);
    setUsername(acc.username);
    setPassword('');
    console.log(`[QuickLogin] Starting for ${acc.username}...`);

    let workingPw = acc.password; // Use stored password if available

    if (!workingPw) {
      const passwordsToTry = [
        acc.username,
        `${acc.username}123`,
        `${acc.username}1234`, // 9 chars
        `${acc.username}12345`,
        `${acc.name}12345`,
        `${acc.name}123`,
        'admin123',
        'admin1234', // 9 chars
        'admin12345'
      ];

      const tempPb = new (pb.constructor as any)(pb.baseUrl);

      for (const pw of passwordsToTry) {
        if (!pw) continue;
        try {
          const records = await tempPb.collection('users').getList(1, 1, {
            filter: `username = "${acc.username}" || email = "${acc.username}"`
          });

          let identity = acc.username;
          if (records.totalItems > 0) {
            const record = records.items[0];
            identity = (record.email && record.email.includes('@') && record.email !== 'undefined')
              ? record.email
              : (record.username || acc.username);
          }

          await tempPb.collection('users').authWithPassword(identity, pw);
          if (tempPb.authStore.isValid) {
            workingPw = pw;
            break;
          }
        } catch (e) {
          // Failures here cause the 400 errors in console if no password works
        }
      }
    }

    setSearchingId(null);

    if (workingPw) {
      // Typing effect
      for (let i = 1; i <= workingPw.length; i++) {
        setPassword(workingPw.substring(0, i));
        await new Promise(resolve => setTimeout(resolve, 80));
      }

      await new Promise(resolve => setTimeout(resolve, 400));
      setIsLoggingIn(true);
      const success = await login(acc.username, workingPw);
      setIsLoggingIn(false);

      if (!success) {
        setError(`Automatisch inloggen mislukt voor ${acc.username}. Controleer het wachtwoord.`);
      }
    } else {
      setPassword('');
      setError(`Kon geen geldig wachtwoord vinden voor ${acc.username}. Vul het handmatig in.`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
      <Card className={`w-full ${testingMode && userAccounts.length > 0 ? 'max-w-4xl' : 'max-w-md'} overflow-hidden rounded-[2.5rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.15)] border-none bg-white transition-all duration-500`}>
        <div className="h-2 bg-blue-600" style={{ backgroundColor: '#2563eb' }} />

        <div className="flex flex-row">
          {/* Left Column: Traditional Login */}
          <div className="flex-1 min-w-0">
            <CardHeader className="pt-12 pb-6 space-y-4">
              <div className="flex flex-col items-center justify-center">
                <div
                  className="p-4 bg-blue-600 rounded-3xl shadow-xl shadow-blue-100 mb-6 rotate-3 hover:rotate-0 transition-transform duration-500"
                  style={{ backgroundColor: '#2563eb' }}
                >
                  <Rocket className="w-10 h-10 text-white" />
                </div>
                <h1
                  className="text-4xl font-black italic tracking-tighter text-slate-900 leading-none"
                  style={{ fontWeight: 900 }}
                >
                  {APP_NAME}
                </h1>
                <span className="text-[10px] font-bold text-blue-600 tracking-[0.2em] uppercase mt-2">Maintenance OS</span>
                <span className="text-[8px] font-bold text-blue-600 tracking-[0.2em] uppercase mt-0.5">{APP_VERSION}</span>
              </div>
              <CardDescription className="text-center text-slate-500 pt-2">
                Log in op het onderhoudssysteem
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4 px-8 pb-8">
                {error && (
                  <Alert variant="destructive" className="bg-red-50 border-red-200 text-red-800 rounded-xl">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-slate-600 ml-1">Gebruikersnaam</Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="Naam"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="h-12 rounded-xl bg-slate-50 border-slate-100 placeholder:text-slate-300"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-slate-600 ml-1">Wachtwoord</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 rounded-xl bg-slate-50 border-slate-100 placeholder:text-slate-300"
                  />
                </div>
              </CardContent>

              <CardFooter className="px-8 pb-12">
                <div className="w-full space-y-6">
                  <Button
                    type="submit"
                    disabled={isLoggingIn}
                    className="w-full h-14 text-lg font-black bg-blue-600 hover:bg-blue-700 text-white rounded-2xl shadow-xl shadow-blue-100 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    style={{ backgroundColor: '#2563eb', color: 'white' }}
                  >
                    {isLoggingIn ? 'Bezig met inloggen...' : 'Inloggen'}
                  </Button>

                  {!testingMode || userAccounts.length === 0 ? (
                    <div className="text-center">
                      <span className="text-[10px] font-bold text-slate-300 tracking-[0.2em] uppercase">Powered by T'Hooft Engineering</span>
                    </div>
                  ) : null}
                </div>
              </CardFooter>
            </form>
          </div>

          {/* Right Column: Quick Access */}
          {testingMode && userAccounts.length > 0 && (
            <div className="w-80 bg-slate-50/50 border-l border-slate-100 flex flex-col flex-shrink-0">
              <div className="p-8 flex-1 flex flex-col">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6 px-1 text-center">Quick Access (Test Mode)</p>
                <div className="grid grid-cols-1 gap-2 overflow-y-auto max-h-[600px] pr-1">
                  {userAccounts.map((acc) => (
                    <Button
                      key={acc.id}
                      type="button"
                      variant="outline"
                      onClick={() => handleQuickLogin(acc)}
                      disabled={searchingId !== null}
                      className="justify-start h-auto py-3 px-4 border-slate-100 rounded-xl hover:border-blue-200 hover:bg-blue-50 transition-all text-left block group"
                    >
                      <div className="font-bold text-slate-700 text-xs group-hover:text-blue-700">
                        {searchingId === acc.id ? 'Zoeken...' : acc.username}
                      </div>
                      <div className="text-[9px] text-slate-400 uppercase tracking-tight group-hover:text-blue-400">{acc.role || 'user'}</div>
                    </Button>
                  ))}
                </div>

                <div className="mt-auto pt-8 text-center pb-4">
                  <span className="text-[10px] font-bold text-slate-300 tracking-[0.2em] uppercase">Powered by T'Hooft Engineering</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
