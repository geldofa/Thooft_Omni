import { useAuth } from './AuthContext';
import { APP_VERSION } from '../config';
import {
  MoveRight,
  ClipboardList,
  Printer,
  ListChecks,
  Users,
  Tags,
  Factory,
  Key,
  FileText,
  MessageSquarePlus,
  Wrench,
  Rocket
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


  return (
    <>
      <header className="border-b border-gray-100 sticky top-0 z-50 h-20 flex items-center bg-white shadow-sm">
        <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-8">

          {/* --- LEFT: BRANDING --- */}
          <div className="flex items-center gap-3 flex-shrink-0 group cursor-default">
            <div
              className="p-2 bg-blue-600 rounded-xl shadow-lg shadow-blue-100 group-hover:rotate-6 transition-transform duration-300"
              style={{ backgroundColor: '#2563eb' }}
            >
              <Rocket className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <h1
                className="text-xl font-black italic tracking-tighter text-slate-900 leading-none"
                style={{ fontWeight: 900 }}
              >
                T'HOOFT OMNI
              </h1>
              <span className="text-[8px] font-bold text-blue-600 tracking-[0.2em] uppercase mt-0.5">{APP_VERSION}</span>
            </div>
          </div>

          {/* --- CENTER: NAVIGATION TABS --- */}
          <div className="flex-1 overflow-x-auto no-scrollbar py-2">
            {user.role === 'admin' || user.role === 'meestergast' ? (
              <Tabs
                value={activeTab}
                onValueChange={(value) => startTransition(() => setActiveTab(value))}
                className="w-auto inline-block"
              >
                <TabsList className="tab-pill-list p-1.5 bg-slate-50 border-slate-100">
                  <TabsTrigger value="tasks" className="tab-pill-trigger data-[state=active]:!bg-blue-600 data-[state=active]:!text-white data-[state=active]:shadow-lg data-[state=active]:shadow-blue-100">
                    <ClipboardList className="w-4 h-4" /> Taken
                  </TabsTrigger>

                  <TabsTrigger value="drukwerken" className="tab-pill-trigger data-[state=active]:!bg-blue-600 data-[state=active]:!text-white data-[state=active]:shadow-lg data-[state=active]:shadow-blue-100">
                    <Printer className="w-4 h-4" /> Drukwerken
                  </TabsTrigger>

                  <TabsTrigger value="reports" className="tab-pill-trigger data-[state=active]:!bg-blue-600 data-[state=active]:!text-white data-[state=active]:shadow-lg data-[state=active]:shadow-blue-100">
                    <Printer className="w-4 h-4" /> Rapport
                  </TabsTrigger>

                  <TabsTrigger value="checklist" className="tab-pill-trigger data-[state=active]:!bg-blue-600 data-[state=active]:!text-white data-[state=active]:shadow-lg data-[state=active]:shadow-blue-100">
                    <ListChecks className="w-4 h-4" /> Checklist
                  </TabsTrigger>

                  <TabsTrigger value="extern" className="tab-pill-trigger data-[state=active]:!bg-blue-600 data-[state=active]:!text-white data-[state=active]:shadow-lg data-[state=active]:shadow-blue-100">
                    <Users className="w-4 h-4" /> Extern
                  </TabsTrigger>

                  <TabsTrigger value="operators" className="tab-pill-trigger data-[state=active]:!bg-blue-600 data-[state=active]:!text-white data-[state=active]:shadow-lg data-[state=active]:shadow-blue-100">
                    <Users className="w-4 h-4" /> Personeel
                  </TabsTrigger>

                  <TabsTrigger value="categories" className="tab-pill-trigger data-[state=active]:!bg-blue-600 data-[state=active]:!text-white data-[state=active]:shadow-lg data-[state=active]:shadow-blue-100">
                    <Tags className="w-4 h-4" /> Categorieën
                  </TabsTrigger>

                  {user.role === 'admin' && (
                    <TabsTrigger value="presses" className="tab-pill-trigger data-[state=active]:!bg-blue-600 data-[state=active]:!text-white data-[state=active]:shadow-lg data-[state=active]:shadow-blue-100">
                      <Factory className="w-4 h-4" /> Persen
                    </TabsTrigger>
                  )}

                  {user.role === 'admin' && (
                    <TabsTrigger value="passwords" className="tab-pill-trigger data-[state=active]:!bg-blue-600 data-[state=active]:!text-white data-[state=active]:shadow-lg data-[state=active]:shadow-blue-100">
                      <Key className="w-4 h-4" /> Accounts
                    </TabsTrigger>
                  )}

                  <TabsTrigger value="logs" className="tab-pill-trigger data-[state=active]:!bg-blue-600 data-[state=active]:!text-white data-[state=active]:shadow-lg data-[state=active]:shadow-blue-100">
                    <FileText className="w-4 h-4" /> Logboek
                  </TabsTrigger>

                  <TabsTrigger value="feedback-list" className="tab-pill-trigger data-[state=active]:!bg-blue-600 data-[state=active]:!text-white data-[state=active]:shadow-lg data-[state=active]:shadow-blue-100">
                    <MessageSquarePlus className="w-4 h-4" /> Inbox
                  </TabsTrigger>

                  <TabsTrigger value="toolbox" className="tab-pill-trigger data-[state=active]:!bg-blue-600 data-[state=active]:!text-white data-[state=active]:shadow-lg data-[state=active]:shadow-blue-100">
                    <Wrench className="w-4 h-4" /> Toolbox
                  </TabsTrigger>

                </TabsList>
              </Tabs>
            ) : user.role === 'press' ? (
              <Tabs
                value={activeTab}
                onValueChange={(value) => startTransition(() => setActiveTab(value))}
                className="w-auto inline-block"
              >
                <TabsList className="tab-pill-list">
                  <TabsTrigger value="tasks" className="tab-pill-trigger">
                    <ClipboardList className="w-4 h-4" /> Taken
                  </TabsTrigger>
                  <TabsTrigger value="drukwerken" className="tab-pill-trigger">
                    <Printer className="w-4 h-4" /> Drukwerken
                  </TabsTrigger>
                  <TabsTrigger value="logs" className="tab-pill-trigger">
                    <FileText className="w-4 h-4" /> Logboek
                  </TabsTrigger>
                  <TabsTrigger value="feedback-list" className="tab-pill-trigger">
                    <MessageSquarePlus className="w-4 h-4" /> Feedback
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            ) : null}
          </div>

          {/* --- RIGHT: USER & LOGOUT --- */}
          <div className="flex-shrink-0 flex items-center gap-6 ml-4">
            <div className="text-right sm:block">
              <div className="text-sm font-bold text-blue-600 leading-tight">
                {user.name || 'Beheerder'}
              </div>
              <div className="text-xs text-gray-500 capitalize leading-tight">
                {user.role}
              </div>
            </div>

            <button
              onClick={(e) => {
                e.preventDefault();
                setActiveTab('tasks');
                logout();
              }}
              className="group flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 active:scale-95 transition-all"
              title="Uitloggen"
            >
              <span className="hidden sm:inline">Uitloggen</span>
              <MoveRight className="w-4 h-4 text-blue-400 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

        </div>
      </header >
    </>
  );
}