import { useAuth } from './AuthContext';
import {
  MoveRight,
  ClipboardList,
  Printer,
  ListChecks,
  Users,
  Tags,
  Factory,
  Key,
  FileText
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

  /* STYLE NOTES:
     - !h-auto: Overrides default shadcn height.
     - p-2 (List): Uniform 8px padding on all sides.
     - hover:!bg-gray-200: Solid hover color for visibility.
  */
  const tabTriggerClass = `
    rounded-lg px-4 py-2 gap-2 font-medium transition-all duration-200 ease-in-out
    !h-auto
    !text-gray-500
    hover:!text-black hover:!bg-gray-200
    active:scale-95
    data-[state=active]:!bg-white
    data-[state=active]:!text-black
    data-[state=active]:!shadow-md
  `;

  return (
    <header className="border-b border-gray-100 sticky top-0 z-50 h-20 flex items-center bg-white">
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">

        {/* --- LEFT: NAVIGATION TABS --- */}
        <div className="flex-1 overflow-x-auto no-scrollbar py-2">
          {user.role === 'admin' || user.role === 'meestergast' ? (
            <Tabs
              value={activeTab}
              onValueChange={(value) => startTransition(() => setActiveTab(value))}
              className="w-auto inline-block"
            >
              {/* UNIFORM PADDING: p-2 */}
              <TabsList
                style={{ height: 'auto' }}
                className="bg-gray-100 !h-auto p-2 rounded-xl gap-1 border border-transparent inline-flex items-center"
              >

                <TabsTrigger value="tasks" className={tabTriggerClass}>
                  <ClipboardList className="w-4 h-4" /> Taken
                </TabsTrigger>

                <TabsTrigger value="drukwerken" className={tabTriggerClass}>
                  <Printer className="w-4 h-4" /> Drukwerken
                </TabsTrigger>

                <TabsTrigger value="reports" className={tabTriggerClass}>
                  <Printer className="w-4 h-4" /> Rapport
                </TabsTrigger>

                <TabsTrigger value="checklist" className={tabTriggerClass}>
                  <ListChecks className="w-4 h-4" /> Checklist
                </TabsTrigger>

                <TabsTrigger value="operators" className={tabTriggerClass}>
                  <Users className="w-4 h-4" /> Personeel
                </TabsTrigger>

                <TabsTrigger value="categories" className={tabTriggerClass}>
                  <Tags className="w-4 h-4" /> Categorieën
                </TabsTrigger>

                {user.role === 'admin' && (
                  <TabsTrigger value="presses" className={tabTriggerClass}>
                    <Factory className="w-4 h-4" /> Persen
                  </TabsTrigger>
                )}

                {user.role === 'admin' && (
                  <TabsTrigger value="passwords" className={tabTriggerClass}>
                    <Key className="w-4 h-4" /> Accounts
                  </TabsTrigger>
                )}

                <TabsTrigger value="logs" className={tabTriggerClass}>
                  <FileText className="w-4 h-4" /> Logboek
                </TabsTrigger>

              </TabsList>
            </Tabs>
          ) : user.role === 'press' ? (
            <Tabs
              value={activeTab}
              onValueChange={(value) => startTransition(() => setActiveTab(value))}
              className="w-auto inline-block"
            >
              <TabsList
                style={{ height: 'auto' }}
                className="bg-gray-100 !h-auto p-2 rounded-xl gap-1 border border-transparent inline-flex items-center"
              >
                <TabsTrigger value="tasks" className={tabTriggerClass}>
                  <ClipboardList className="w-4 h-4" /> Taken
                </TabsTrigger>
                <TabsTrigger value="drukwerken" className={tabTriggerClass}>
                  <Printer className="w-4 h-4" /> Drukwerken
                </TabsTrigger>
              </TabsList>
            </Tabs>
          ) : null}
        </div>

        {/* --- RIGHT: USER & LOGOUT --- */}
        <div className="flex-shrink-0 flex items-center gap-6 ml-4">
          <div className="text-right sm:block">
            <div className="text-sm font-bold text-[#1A1A1A] leading-tight">
              {user.name || 'Admin'}
            </div>
            <div className="text-xs text-gray-500 capitalize leading-tight">
              {user.role}
            </div>
          </div>

          <button
            onClick={logout}
            className="group flex items-center gap-2 text-sm font-medium text-[#1A1A1A] hover:text-black active:scale-95 transition-all"
            title="Logout"
          >
            <span className="hidden sm:inline">admin</span>
            <MoveRight className="w-4 h-4 text-gray-400 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

      </div>
    </header>
  );
}