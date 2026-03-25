import { useAuth } from '../AuthContext';
import { APP_VERSION, APP_NAME } from '../../config';
import {
  MoveRight,
  Download,
  RotateCcw
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';
import { HeaderActivityTicker } from './HeaderActivityTicker';
import { startTransition, useEffect, useMemo, useRef, useState } from 'react';
import { NAVIGATION_CONFIG, NavItemConfig } from '../../config/navigationConfig';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}
import { drukwerkenCache } from '../../services/DrukwerkenCache';
import { ConfirmationModal } from '../ui/ConfirmationModal';

function ClockDigit({ char, flash }: { char: string; flash: boolean }) {
  const [animKey, setAnimKey] = useState(0);

  useEffect(() => {
    if (flash) setAnimKey(k => k + 1);
  }, [char, flash]);

  return (
    <span
      key={animKey}
      className="inline-block tabular-nums"
      style={flash && animKey > 0 ? {
        animation: 'digit-flash 0.6s ease-out',
      } : undefined}
    >
      {char}
    </span>
  );
}

function HeaderClock() {
  const [time, setTime] = useState(new Date());
  const prevRef = useRef('');

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatted = time.toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  const prev = prevRef.current;
  prevRef.current = formatted;

  // Characters: H H : M M : S S  (indices 0-7)
  const flashIndices = new Set([0, 1, 3, 4]);

  return (
    <>
      <style>{`
        @keyframes digit-flash {
          0% { color: rgb(37 99 235); transform: scale(1.2); }
          100% { color: inherit; transform: scale(1); }
        }
      `}</style>
      <div className="flex flex-col items-end">
        <span className="text-[10px] font-medium text-slate-400 tracking-wide">
          {time.toLocaleDateString('nl-BE', { weekday: 'short', day: 'numeric', month: 'long' })}
        </span>
        <span className="font-mono text-xs text-slate-400 tracking-wide">
          {formatted.split('').map((char, i) => (
            <ClockDigit
              key={i}
              char={char}
              flash={flashIndices.has(i) && prev.length > 0 && prev[i] !== char}
            />
          ))}
        </span>
      </div>
    </>
  );
}

export function Header({ activeTab, setActiveTab }: HeaderProps) {
  const { user, logout, hasPermission, updateAvailable, latestVersion, setShowUpdateDialog } = useAuth();
  const [isFlushModalOpen, setIsFlushModalOpen] = useState(false);

  const navItems = useMemo<NavItemConfig[]>(() => {
    return NAVIGATION_CONFIG.filter(item => {
      return hasPermission(item.permission);
    });
  }, [hasPermission]);

  const activeMainTab = useMemo(() => {
    if (activeTab === '/') return '/';
    // Match the longest prefix from navItems
    const match = navItems.find((item: NavItemConfig) => activeTab.startsWith(item.id));
    return match ? match.id : activeTab;
  }, [activeTab, navItems]);

  const confirmFlushCache = async () => {
    localStorage.clear();
    sessionStorage.clear();
    try {
      await drukwerkenCache.purge();
    } catch (e) {
      console.error('Failed to purge Drukwerken cache:', e);
    }
    window.location.reload();
  };

  if (!user) return null;

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
                value={activeMainTab}
                onValueChange={(value) => startTransition(() => setActiveTab(value))}
              >
                <TabsList className="bg-transparent p-0 gap-1.5 h-auto flex items-center">
                  {navItems.map((item: NavItemConfig, idx: number) => {
                    const Icon = item.icon;
                    const needsSeparator = idx > 0 && ['/Analyses', '/Beheer', '/Logboek', '/Feedback'].includes(item.id);

                    return (
                      <div key={item.id} className="flex items-center gap-1.5">
                        {needsSeparator && <div className="w-px h-6 bg-slate-200 mx-1" />}
                        <TabsTrigger
                          value={item.id}
                          className="tab-pill-trigger data-[state=active]:!bg-blue-600 data-[state=active]:!text-white data-[state=active]:shadow-lg data-[state=active]:shadow-blue-100"
                        >
                          <Icon className="w-4 h-4" /> {item.label}
                        </TabsTrigger>
                      </div>
                    );
                  })}
                </TabsList>
              </Tabs>
            </div>
          </div>

          {/* --- CENTER-RIGHT: ACTIVITY TICKER (admin only) --- */}
          <HeaderActivityTicker />

          {/* --- RIGHT: USER & LOGOUT --- */}
          <div className="flex-shrink-0 flex items-center gap-6 ml-4">
            <HeaderClock />
            {import.meta.env.DEV && (
              <button
                onClick={() => setIsFlushModalOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-rose-50 text-rose-600 rounded-full hover:bg-rose-100 transition-all active:scale-95 cursor-pointer border border-rose-100 group shadow-sm"
                title="Flush Cache & Reload (DEV ONLY)"
              >
                <RotateCcw className="w-4 h-4 group-hover:rotate-[-90deg] transition-transform" />
                <span className="text-[10px] font-black uppercase tracking-wider hidden xl:inline">Flush Cache</span>
              </button>
            )}
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
      <ConfirmationModal
        open={isFlushModalOpen}
        onOpenChange={setIsFlushModalOpen}
        onConfirm={confirmFlushCache}
        title="Cache en Data Wissen?"
        description="Weet je zeker dat je alle lokale caches wilt wissen en wilt herladen? Dit forceert een volledige nieuwe synchronisatie (DEV ONLY)."
        confirmText="Ja, Wis Alles"
        cancelText="Annuleren"
        variant="destructive"
      />
    </>
  );
}