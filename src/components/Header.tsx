import { useAuth } from './AuthContext';
import {
  ClipboardList,
  Users,
  FileText,
  Key,
  Printer,
  ListChecks,
  Factory,
  Tags,
  MoveRight
} from 'lucide-react';
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
    <header className="bg-white pt-6 pb-4 border-b border-gray-100 flex flex-col gap-4 sticky top-0 z-50">
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8">

        {/* --- ROW 1: LOGO & ADMIN ACTIONS --- */}
        <div className="relative flex items-center justify-center mb-4">

          {/* Centered Logo */}
          <h1 className="text-2xl font-bold text-[#1A1A1A] tracking-tight absolute left-1/2 -translate-x-1/2">
            Press Manager 2.0
          </h1>

          {/* Right: User Profile & Logout */}
          <div className="flex-1 flex justify-end items-center gap-6">
            <div className="text-right sm:block">
              <div className="text-sm font-bold text-[#1A1A1A] leading-tight">
                {user.name || 'admin'}
              </div>
              <div className="text-xs text-gray-500 capitalize leading-tight">
                {user.role}
              </div>
            </div>

            <button
              onClick={logout}
              className="group flex items-center gap-2 text-sm font-medium text-[#1A1A1A] hover:text-black transition-colors"
              title="Logout"
            >
              <span className="hidden sm:inline">admin</span>
              <MoveRight className="w-4 h-4 text-gray-400 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

        {/* --- ROW 2: NAVIGATION TABS --- */}
        <div className="flex justify-center w-full overflow-x-auto pb-1"> {/* pb-1 handles overflow scrollbar spacing if needed */}
          {user.role === 'admin' || user.role === 'meestergast' ? (
            <Tabs
              value={activeTab}
              onValueChange={(value) => startTransition(() => setActiveTab(value))}
              className="w-auto"
            >
              {/* The Gray Pill Container */}
              <TabsList className="bg-[#F5F5F5] h-auto p-1.5 rounded-full gap-1 border border-transparent inline-flex">

                <TabsTrigger
                  value="tasks"
                  className="rounded-full px-4 py-2 transition-all text-gray-600 hover:text-black data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:shadow-sm gap-2"
                >
                  <ClipboardList className="w-4 h-4" />
                  Taken
                </TabsTrigger>

                <TabsTrigger
                  value="drukwerken"
                  className="rounded-full px-4 py-2 transition-all text-gray-600 hover:text-black data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:shadow-sm gap-2"
                >
                  <Printer className="w-4 h-4" />
                  Drukwerken
                </TabsTrigger>

                <TabsTrigger
                  value="reports"
                  className="rounded-full px-4 py-2 transition-all text-gray-600 hover:text-black data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:shadow-sm gap-2"
                >
                  <Printer className="w-4 h-4" />
                  Rapport
                </TabsTrigger>

                <TabsTrigger
                  value="checklist"
                  className="rounded-full px-4 py-2 transition-all text-gray-600 hover:text-black data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:shadow-sm gap-2"
                >
                  <ListChecks className="w-4 h-4" />
                  Checklist
                </TabsTrigger>

                <TabsTrigger
                  value="operators"
                  className="rounded-full px-4 py-2 transition-all text-gray-600 hover:text-black data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:shadow-sm gap-2"
                >
                  <Users className="w-4 h-4" />
                  Personeel
                </TabsTrigger>

                <TabsTrigger
                  value="categories"
                  className="rounded-full px-4 py-2 transition-all text-gray-600 hover:text-black data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:shadow-sm gap-2"
                >
                  <Tags className="w-4 h-4" />
                  Categorieën
                </TabsTrigger>

                {user.role === 'admin' && (
                  <TabsTrigger
                    value="presses"
                    className="rounded-full px-4 py-2 transition-all text-gray-600 hover:text-black data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:shadow-sm gap-2"
                  >
                    <Factory className="w-4 h-4" />
                    Persen
                  </TabsTrigger>
                )}

                {user.role === 'admin' && (
                  <TabsTrigger
                    value="passwords"
                    className="rounded-full px-4 py-2 transition-all text-gray-600 hover:text-black data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:shadow-sm gap-2"
                  >
                    <Key className="w-4 h-4" />
                    Accounts
                  </TabsTrigger>
                )}

                <TabsTrigger
                  value="logs"
                  className="rounded-full px-4 py-2 transition-all text-gray-600 hover:text-black data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:shadow-sm gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Logboek
                </TabsTrigger>

              </TabsList>
            </Tabs>
          ) : user.role === 'press' ? (
            /* Press Role View - Simplified using same styles */
            <Tabs
              value={activeTab}
              onValueChange={(value) => startTransition(() => setActiveTab(value))}
              className="w-auto"
            >
              <TabsList className="bg-[#F5F5F5] h-auto p-1.5 rounded-full gap-1 border border-transparent inline-flex">
                <TabsTrigger
                  value="tasks"
                  className="rounded-full px-4 py-2 transition-all text-gray-600 hover:text-black data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:shadow-sm gap-2"
                >
                  <ClipboardList className="w-4 h-4" />
                  Taken
                </TabsTrigger>
                <TabsTrigger
                  value="drukwerken"
                  className="rounded-full px-4 py-2 transition-all text-gray-600 hover:text-black data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:shadow-sm gap-2"
                >
                  <Printer className="w-4 h-4" />
                  Drukwerken
                </TabsTrigger>
              </TabsList>
            </Tabs>
          ) : null}
        </div>

      </div>
    </header>
  );
}