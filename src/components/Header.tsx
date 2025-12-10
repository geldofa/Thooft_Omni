import { useAuth } from './AuthContext';
import { LogOut, ClipboardList, Users, FileText, Key, Printer, ListChecks, Factory, Tags } from 'lucide-react';
import { Button } from './ui/button';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import { startTransition } from 'react';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export function Header({ activeTab, setActiveTab }: HeaderProps) {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50 h-20 flex items-center justify-center shadow-sm">
      <div className="relative max-w-7xl w-full px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Left: Navigation Tabs */}
        <div className="flex-1 flex justify-start">
          {user.role === 'admin' || user.role === 'meestergast' ? (
            <Tabs value={activeTab} onValueChange={(value) => startTransition(() => setActiveTab(value))}>
              <TabsList className="bg-transparent h-auto p-0 inline-flex items-center space-x-4">
                <TabsTrigger value="tasks" className="text-gray-700 data-[state=active]:text-black data-[state=active]:font-semibold data-[state=active]:bg-transparent data-[state=active]:shadow-none hover:text-black transition-colors px-3 py-2 rounded-md">
                  <ClipboardList className="w-4 h-4 mr-1" />
                  Taken
                </TabsTrigger>
                <TabsTrigger value="drukwerken" className="text-gray-700 data-[state=active]:text-black data-[state=active]:font-semibold data-[state=active]:bg-transparent data-[state=active]:shadow-none hover:text-black transition-colors px-3 py-2 rounded-md">
                  <Printer className="w-4 h-4 mr-1" />
                  Drukwerken
                </TabsTrigger>
                <TabsTrigger value="reports" className="text-gray-700 data-[state=active]:text-black data-[state=active]:font-semibold data-[state=active]:bg-transparent data-[state=active]:shadow-none hover:text-black transition-colors px-3 py-2 rounded-md">
                  <Printer className="w-4 h-4 mr-1" />
                  Rapport
                </TabsTrigger>
                <TabsTrigger value="checklist" className="text-gray-700 data-[state=active]:text-black data-[state=active]:font-semibold data-[state=active]:bg-transparent data-[state=active]:shadow-none hover:text-black transition-colors px-3 py-2 rounded-md">
                  <ListChecks className="w-4 h-4 mr-1" />
                  Checklist
                </TabsTrigger>
                <TabsTrigger value="operators" className="text-gray-700 data-[state=active]:text-black data-[state=active]:font-semibold data-[state=active]:bg-transparent data-[state=active]:shadow-none hover:text-black transition-colors px-3 py-2 rounded-md">
                  <Users className="w-4 h-4 mr-1" />
                  Personeel
                </TabsTrigger>
                <TabsTrigger value="categories" className="text-gray-700 data-[state=active]:text-black data-[state=active]:font-semibold data-[state=active]:bg-transparent data-[state=active]:shadow-none hover:text-black transition-colors px-3 py-2 rounded-md">
                  <Tags className="w-4 h-4 mr-1" />
                  Categorieën
                </TabsTrigger>
                {user.role === 'admin' && (
                  <TabsTrigger value="presses" className="text-gray-700 data-[state=active]:text-black data-[state=active]:font-semibold data-[state=active]:bg-transparent data-[state=active]:shadow-none hover:text-black transition-colors px-3 py-2 rounded-md">
                    <Factory className="w-4 h-4 mr-1" />
                    Persen
                  </TabsTrigger>
                )}
                {user.role === 'admin' && (
                  <TabsTrigger value="passwords" className="text-gray-700 data-[state=active]:text-black data-[state=active]:font-semibold data-[state=active]:bg-transparent data-[state=active]:shadow-none hover:text-black transition-colors px-3 py-2 rounded-md">
                    <Key className="w-4 h-4 mr-1" />
                    Accounts
                  </TabsTrigger>
                )}
                <TabsTrigger value="logs" className="text-gray-700 data-[state=active]:text-black data-[state=active]:font-semibold data-[state=active]:bg-transparent data-[state=active]:shadow-none hover:text-black transition-colors px-3 py-2 rounded-md">
                  <FileText className="w-4 h-4 mr-1" />
                  Logboek
                </TabsTrigger>
              </TabsList>
            </Tabs>
          ) : user.role === 'press' ? (
            <Tabs value={activeTab} onValueChange={(value) => startTransition(() => setActiveTab(value))}>
              <TabsList className="bg-transparent h-auto p-0 inline-flex items-center space-x-4">
                <TabsTrigger value="tasks" className="text-gray-700 data-[state=active]:text-black data-[state=active]:font-semibold data-[state=active]:bg-transparent data-[state=active]:shadow-none hover:text-black transition-colors px-3 py-2 rounded-md">
                  <ClipboardList className="w-4 h-4 mr-1" />
                  Taken
                </TabsTrigger>
                <TabsTrigger value="drukwerken" className="text-gray-700 data-[state=active]:text-black data-[state=active]:font-semibold data-[state=active]:bg-transparent data-[state=active]:shadow-none hover:text-black transition-colors px-3 py-2 rounded-md">
                  <Printer className="w-4 h-4 mr-1" />
                  Drukwerken
                </TabsTrigger>
              </TabsList>
            </Tabs>
          ) : null}
        </div>

        {/* Center: Logo */}
        <div className="absolute left-1/2 -translate-x-1/2">
          <h1 className="text-2xl font-bold text-[#1A1A1A]">Antigravity</h1>
        </div>

        {/* Right: Admin Actions */}
        <div className="flex-1 flex justify-end items-center gap-4">
          <div className="text-right">
            <div className="text-sm font-medium text-[#1A1A1A]">{user?.name || user?.username}</div>
            <div className="text-xs text-gray-500 capitalize">{user?.role}</div>
          </div>
          <Button variant="ghost" size="icon" onClick={logout} className="hover:bg-gray-100">
            <LogOut className="w-5 h-5 text-gray-500 hover:text-red-600" />
          </Button>
        </div>
      </div>
    </header>
  );
}
