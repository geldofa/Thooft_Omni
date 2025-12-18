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
  FileText,
  MessageSquarePlus
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import { startTransition, useState } from 'react';
import { FeedbackDialog } from './FeedbackDialog';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export function Header({ activeTab, setActiveTab }: HeaderProps) {
  const { user, logout } = useAuth();
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

  if (!user) return null;

  /* STYLE NOTES:
     - !h-auto: Overrides default shadcn height.
     - p-2 (List): Uniform 8px padding on all sides.
     - hover:!bg-gray-200: Solid hover color for visibility.
  */


  return (
    <>
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
                <TabsList className="tab-pill-list">
                  <TabsTrigger value="tasks" className="tab-pill-trigger">
                    <ClipboardList className="w-4 h-4" /> Taken
                  </TabsTrigger>

                  <TabsTrigger value="drukwerken" className="tab-pill-trigger">
                    <Printer className="w-4 h-4" /> Drukwerken
                  </TabsTrigger>

                  <TabsTrigger value="reports" className="tab-pill-trigger">
                    <Printer className="w-4 h-4" /> Rapport
                  </TabsTrigger>

                  <TabsTrigger value="checklist" className="tab-pill-trigger">
                    <ListChecks className="w-4 h-4" /> Checklist
                  </TabsTrigger>

                  <TabsTrigger value="operators" className="tab-pill-trigger">
                    <Users className="w-4 h-4" /> Personeel
                  </TabsTrigger>

                  <TabsTrigger value="categories" className="tab-pill-trigger">
                    <Tags className="w-4 h-4" /> Categorieën
                  </TabsTrigger>

                  {user.role === 'admin' && (
                    <TabsTrigger value="presses" className="tab-pill-trigger">
                      <Factory className="w-4 h-4" /> Persen
                    </TabsTrigger>
                  )}

                  {user.role === 'admin' && (
                    <TabsTrigger value="passwords" className="tab-pill-trigger">
                      <Key className="w-4 h-4" /> Accounts
                    </TabsTrigger>
                  )}

                  <TabsTrigger value="logs" className="tab-pill-trigger">
                    <FileText className="w-4 h-4" /> Logboek
                  </TabsTrigger>

                  <TabsTrigger value="feedback-list" className="tab-pill-trigger">
                    <MessageSquarePlus className="w-4 h-4" /> Inbox
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
                </TabsList>
              </Tabs>
            ) : null}
          </div>

          {/* --- RIGHT: USER & LOGOUT --- */}
          <div className="flex-shrink-0 flex items-center gap-6 ml-4">
            <button
              onClick={(e) => {
                e.preventDefault();
                setIsFeedbackOpen(true);
              }}
              className="tab-pill-trigger flex items-center gap-2 cursor-pointer"
            >
              <MessageSquarePlus className="w-4 h-4" />
              Feedback
            </button>

            <div className="text-right sm:block">
              <div className="text-sm font-bold text-[#1A1A1A] leading-tight">
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
              className="group flex items-center gap-2 text-sm font-medium text-[#1A1A1A] hover:text-black active:scale-95 transition-all"
              title="Uitloggen"
            >
              <span className="hidden sm:inline">Uitloggen</span>
              <MoveRight className="w-4 h-4 text-gray-400 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

        </div>
      </header >

      <FeedbackDialog open={isFeedbackOpen} onOpenChange={setIsFeedbackOpen} />
    </>
  );
}