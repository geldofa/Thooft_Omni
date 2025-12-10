import { useAuth } from './AuthContext';
import { LogOut, ClipboardList, Users, FileText, Key, Printer, ListChecks, Factory, Tags } from 'lucide-react';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { startTransition } from 'react';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export function Header({ activeTab, setActiveTab }: HeaderProps) {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50 h-16 flex items-center justify-center">
      <div className="max-w-7xl w-full px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Left: Navigation Tabs */}
        <div className="flex-1 flex justify-start">
          {user.role === 'admin' || user.role === 'meestergast' ? (
            <Tabs value={activeTab} onValueChange={(value) => startTransition(() => setActiveTab(value))}>
              <TabsList className="bg-transparent">
                <TabsTrigger value="tasks" className="gap-2">
                  <ClipboardList className="w-4 h-4" />
                  Taken
                </TabsTrigger>
                <TabsTrigger value="drukwerken" className="gap-2">
                  <Printer className="w-4 h-4" />
                  Drukwerken
                </TabsTrigger>
                <TabsTrigger value="reports" className="gap-2">
                  <Printer className="w-4 h-4" />
                  Rapport
                </TabsTrigger>
                <TabsTrigger value="checklist" className="gap-2">
                  <ListChecks className="w-4 h-4" />
                  Checklist
                </TabsTrigger>
                <TabsTrigger value="operators" className="gap-2">
                  <Users className="w-4 h-4" />
                  Personeel
                </TabsTrigger>
                <TabsTrigger value="categories" className="gap-2">
                  <Tags className="w-4 h-4" />
                  Categorieën
                </TabsTrigger>
                {user.role === 'admin' && (
                  <TabsTrigger value="presses" className="gap-2">
                    <Factory className="w-4 h-4" />
                    Persen
                  </TabsTrigger>
                )}
                {user.role === 'admin' && (
                  <TabsTrigger value="passwords" className="gap-2">
                    <Key className="w-4 h-4" />
                    Accounts
                  </TabsTrigger>
                )}
                <TabsTrigger value="logs" className="gap-2">
                  <FileText className="w-4 h-4" />
                  Logboek
                </TabsTrigger>
              </TabsList>
            </Tabs>
          ) : user.role === 'press' ? (
            <Tabs value={activeTab} onValueChange={(value) => startTransition(() => setActiveTab(value))}>
              <TabsList className="bg-transparent">
                <TabsTrigger value="tasks" className="gap-2">
                  <ClipboardList className="w-4 h-4" />
                  Taken
                </TabsTrigger>
                <TabsTrigger value="drukwerken" className="gap-2">
                  <Printer className="w-4 h-4" />
                  Drukwerken
                </TabsTrigger>
              </TabsList>
            </Tabs>
          ) : null}
        </div>

        {/* Center: Logo */}
        <div className="flex-shrink-0 absolute left-1/2 -translate-x-1/2">
          <h1 className="text-xl font-bold text-[#1A1A1A]">Antigravity</h1>
        </div>

        {/* Right: Admin Actions */}
        <div className="flex-1 flex justify-end items-center gap-3">
          <div className="text-right">
            <div className="text-sm font-medium text-[#1A1A1A]">{user?.name || user?.username}</div>
            <div className="text-xs text-gray-500 capitalize">{user?.role}</div>
          </div>
          <Button variant="ghost" size="icon" onClick={logout}>
            <LogOut className="w-5 h-5 text-gray-500 hover:text-red-600" />
          </Button>
        </div>
      </div>
    </header>
  );
}
