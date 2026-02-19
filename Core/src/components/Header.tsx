import { useAuth } from './AuthContext';
import { APP_VERSION, APP_NAME } from '../config';
import {
  MoveRight,
  ClipboardList,
  Printer,
  ListChecks,
  Users,
  FileText,
  Wrench,
  FileBarChart,
  Rocket,
  Download
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import { startTransition } from 'react';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export function Header({ activeTab, setActiveTab }: HeaderProps) {
  const { user, logout, hasPermission, updateAvailable, latestVersion, setShowUpdateDialog } = useAuth();

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
          <button
            onClick={() => setActiveTab('/')}
            className="flex items-center gap-3 flex-shrink-0 group cursor-pointer hover:opacity-80 transition-opacity focus:outline-none"
          >
            <div
              className="p-1 bg-white rounded-xl shadow-lg ring-1 ring-slate-100 group-hover:rotate-6 transition-transform duration-300 overflow-hidden"
            >
              <img src="/favicon.png" alt="Omni Logo" className="w-8 h-8 object-contain" />
            </div>
            <div className="flex flex-col text-left">
              <h1
                className="text-xl font-black italic tracking-tighter text-slate-900 leading-none"
                style={{ fontWeight: 900 }}
              >
                {APP_NAME}
              </h1>
              <span className="text-[8px] font-bold text-blue-600 tracking-[0.2em] uppercase mt-0.5">{APP_VERSION}</span>
            </div>
          </button>

          {/* --- CENTER: NAVIGATION TABS --- */}
          <div className="flex-1 overflow-x-auto no-scrollbar py-2">
            <div className="flex items-center gap-1.5 p-1.5 bg-slate-50 border border-slate-100 rounded-lg inline-flex">
              <Tabs
                value={activeTab.split('/')[1] ? '/' + activeTab.split('/')[1] : activeTab}
                onValueChange={(value) => startTransition(() => setActiveTab(value))}
              >
                <TabsList className="bg-transparent p-0 gap-1.5 h-auto flex items-center">

                  {/* Common Tabs */}
                  <TabsTrigger value="/Taken" className="tab-pill-trigger data-[state=active]:!bg-blue-600 data-[state=active]:!text-white data-[state=active]:shadow-lg data-[state=active]:shadow-blue-100">
                    <ClipboardList className="w-4 h-4" /> Taken
                  </TabsTrigger>

                  {hasPermission('drukwerken_view') && (
                    <TabsTrigger value="/Drukwerken" className="tab-pill-trigger data-[state=active]:!bg-blue-600 data-[state=active]:!text-white data-[state=active]:shadow-lg data-[state=active]:shadow-blue-100">
                      <Printer className="w-4 h-4" /> Drukwerken
                    </TabsTrigger>
                  )}

                  {/* Admin/Meestergast Only Middle Section */}
                  {(user.role === 'admin' || user.role === 'meestergast') && (
                    <>
                      {/* DIVIDER 1: Between Core and Analysis */}
                      {(hasPermission('reports_view') || hasPermission('checklist_view') || hasPermission('extern_view')) && (
                        <div className="w-px h-6 bg-slate-200 mx-1" />
                      )}

                      {hasPermission('reports_view') && (
                        <TabsTrigger value="/Rapport" className="tab-pill-trigger data-[state=active]:!bg-blue-600 data-[state=active]:!text-white data-[state=active]:shadow-lg data-[state=active]:shadow-blue-100">
                          <FileBarChart className="w-4 h-4" /> Rapport
                        </TabsTrigger>
                      )}

                      {hasPermission('checklist_view') && (
                        <TabsTrigger value="/Checklist" className="tab-pill-trigger data-[state=active]:!bg-blue-600 data-[state=active]:!text-white data-[state=active]:shadow-lg data-[state=active]:shadow-blue-100">
                          <ListChecks className="w-4 h-4" /> Checklist
                        </TabsTrigger>
                      )}

                      {hasPermission('extern_view') && (
                        <TabsTrigger value="/Extern" className="tab-pill-trigger data-[state=active]:!bg-blue-600 data-[state=active]:!text-white data-[state=active]:shadow-lg data-[state=active]:shadow-blue-100">
                          <Users className="w-4 h-4" /> Extern
                        </TabsTrigger>
                      )}

                      {/* DIVIDER 2: Between Analysis and Management/Admin */}
                      {(hasPermission('management_access') || hasPermission('toolbox_access')) && (
                        <div className="w-px h-6 bg-slate-200 mx-1" />
                      )}

                      {hasPermission('management_access') && (
                        <TabsTrigger value="/Beheer" className="tab-pill-trigger data-[state=active]:!bg-blue-600 data-[state=active]:!text-white data-[state=active]:shadow-lg data-[state=active]:shadow-blue-100">
                          <Users className="w-4 h-4" /> Beheer
                        </TabsTrigger>
                      )}

                      {hasPermission('toolbox_access') && (
                        <TabsTrigger value="/Toolbox" className="tab-pill-trigger data-[state=active]:!bg-blue-600 data-[state=active]:!text-white data-[state=active]:shadow-lg data-[state=active]:shadow-blue-100">
                          <Wrench className="w-4 h-4" /> Toolbox
                        </TabsTrigger>
                      )}
                    </>
                  )}

                  {/* Common End Section */}
                  <div className="w-px h-6 bg-slate-200 mx-1" />

                  {hasPermission('logs_view') && (
                    <TabsTrigger value="/Logboek" className="tab-pill-trigger data-[state=active]:!bg-blue-600 data-[state=active]:!text-white data-[state=active]:shadow-lg data-[state=active]:shadow-blue-100">
                      <FileText className="w-4 h-4" /> Logboek
                    </TabsTrigger>
                  )}

                  <TabsTrigger value="/Roadmap" className="tab-pill-trigger data-[state=active]:!bg-blue-600 data-[state=active]:!text-white data-[state=active]:shadow-lg data-[state=active]:shadow-blue-100">
                    <Rocket className="w-4 h-4" /> Roadmap
                  </TabsTrigger>

                </TabsList>
              </Tabs>
            </div>
          </div>

          {/* --- RIGHT: USER & LOGOUT --- */}
          <div className="flex-shrink-0 flex items-center gap-6 ml-4">

            {/* Update Indicator */}
            {updateAvailable && (
              <button
                onClick={() => setShowUpdateDialog(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-amber-100 text-amber-700 rounded-full hover:bg-amber-200 transition-colors animate-pulse cursor-pointer border border-amber-200"
                title={`Update beschikbaar: ${latestVersion}`}
              >
                <Download className="w-4 h-4" />
                <span className="text-xs font-bold hidden xl:inline">Update Beschikbaar</span>
              </button>
            )}
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
                setActiveTab('/');
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