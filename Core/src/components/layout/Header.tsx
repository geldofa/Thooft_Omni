import { useAuth } from '../AuthContext';
import { APP_VERSION, APP_NAME } from '../../config';
import {
  Download,
  RotateCcw,
  CalendarCog,
  ChevronDown,
  LogOut,
  User,
  FlaskConical
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';
import { HeaderActivityTicker } from './HeaderActivityTicker';
import { lazy, startTransition, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { NAVIGATION_CONFIG, NavItemConfig } from '../../config/navigationConfig';

const WeekPlannerOverlay = lazy(() => import('../WeekPlanner').then(m => ({ default: m.WeekPlanner })));

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
  const { user, logout, hasPermission, updateAvailable, latestVersion, setShowUpdateDialog, simulatedRole, setSimulatedRole, rolePermissions } = useAuth();
  const isAdmin = user?.role === 'admin';
  const availableRoles = rolePermissions.map(rp => rp.role).filter(r => r !== 'admin');
  const [isFlushModalOpen, setIsFlushModalOpen] = useState(false);
  const [planningOverlayOpen, setPlanningOverlayOpen] = useState(false);

  const canEditPlanning = hasPermission('planning_edit');
  const canViewPlanning = hasPermission('planning_view');

  const handlePlanningClick = () => {
    if (canEditPlanning) {
      startTransition(() => setActiveTab('/werkrooster'));
    } else {
      setPlanningOverlayOpen(prev => !prev);
    }
  };

  const navItems = useMemo<NavItemConfig[]>(() => {
    return NAVIGATION_CONFIG.filter(item => {
      if (item.anyPermission) return item.anyPermission.some(p => hasPermission(p));
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
      <header className="border-b border-gray-100 sticky top-0 z-50 h-20 flex items-center bg-white shadow-sm" onClick={() => setPlanningOverlayOpen(false)}>
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
          <div className="flex-shrink-0 flex items-center gap-3 ml-4">
            <HeaderClock />
            {import.meta.env.DEV && (
              <button
                onClick={() => setIsFlushModalOpen(true)}
                className="flex items-center gap-2 px-4 h-12 bg-rose-50 text-rose-600 rounded-2xl hover:bg-rose-100 transition-all active:scale-95 cursor-pointer border border-rose-100 group shadow-sm"
                title="Flush Cache & Reload (DEV ONLY)"
              >
                <RotateCcw className="w-4 h-4 group-hover:rotate-[-90deg] transition-transform" />
                <span className="text-[10px] font-black uppercase tracking-wider hidden xl:inline">Flush Cache</span>
              </button>
            )}
            {updateAvailable && (
              <button
                onClick={() => setShowUpdateDialog(true)}
                className="flex items-center gap-2 px-4 h-12 bg-amber-100 text-amber-700 rounded-2xl hover:bg-amber-200 transition-colors animate-pulse cursor-pointer border border-amber-200"
                title={`Update beschikbaar: ${latestVersion}`}
              >
                <Download className="w-4 h-4" />
                <span className="text-xs font-bold hidden xl:inline">Update Beschikbaar</span>
              </button>
            )}
            {canViewPlanning && (
              <button
                onClick={(e) => { e.stopPropagation(); handlePlanningClick(); }}
                className={`flex items-center gap-2 px-4 h-12 rounded-2xl transition-all active:scale-150 cursor-pointer border shadow-sm ${(planningOverlayOpen || activeTab.startsWith('/werkrooster'))
                  ? 'bg-violet-600 text-white border-violet-700 shadow-violet-100'
                  : 'bg-violet-50 text-violet-700 border-violet-100 hover:bg-violet-100'
                  }`}
                title="Planning tonen/verbergen"
              >
                <CalendarCog className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-wider hidden xl:inline">Planning</span>
              </button>
            )}

            {isAdmin && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    onClick={(e) => e.stopPropagation()}
                    className={`flex items-center gap-2 px-3 h-12 rounded-2xl transition-all active:scale-95 cursor-pointer border shadow-sm ${
                      simulatedRole
                        ? 'bg-amber-400 text-amber-950 border-amber-500 animate-pulse'
                        : 'bg-slate-50 text-slate-500 border-slate-100 hover:bg-slate-100'
                    }`}
                    title="Rol simuleren"
                  >
                    <FlaskConical className="w-4 h-4" />
                    {simulatedRole && (
                      <div className="text-left">
                        <div className="text-[10px] font-black uppercase tracking-wider leading-tight">Simulatie</div>
                        <div className="text-[10px] leading-tight capitalize font-medium">{simulatedRole}</div>
                      </div>
                    )}
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenuLabel className="text-xs text-slate-500 font-normal">Simuleer als rol</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {availableRoles.map(role => (
                    <DropdownMenuItem
                      key={role}
                      onClick={() => setSimulatedRole(role)}
                      className={`capitalize cursor-pointer ${simulatedRole === role ? 'font-bold text-amber-700 bg-amber-50' : ''}`}
                    >
                      {simulatedRole === role && <FlaskConical className="w-3.5 h-3.5 mr-2 text-amber-600" />}
                      {simulatedRole !== role && <span className="w-3.5 h-3.5 mr-2" />}
                      {role}
                    </DropdownMenuItem>
                  ))}
                  {simulatedRole && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => setSimulatedRole(null)}
                        className="text-slate-500 cursor-pointer"
                      >
                        <span className="w-3.5 h-3.5 mr-2" />
                        Terug naar admin
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 px-3 h-12 bg-slate-50 text-slate-700 rounded-2xl hover:bg-slate-100 transition-all active:scale-95 cursor-pointer border border-slate-100 shadow-sm">
                  <User className="w-4 h-4 text-blue-600" />
                  <div className="text-left">
                    <div className="text-xs font-bold text-blue-600 leading-tight">{user.name || 'Beheerder'}</div>
                    <div className="text-[10px] text-gray-400 capitalize leading-tight">{user.role}</div>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel className="font-normal">
                  <div className="font-bold text-sm text-slate-800">{user.name || 'Beheerder'}</div>
                  <div className="text-xs text-slate-400 capitalize">{user.role}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => { setActiveTab('/'); logout(); }}
                  className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Uitloggen
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header >
      {planningOverlayOpen && !canEditPlanning && (
        <div
          className="fixed top-20 inset-x-0 bottom-0 z-[45] bg-black/30 backdrop-blur-sm"
          onClick={() => setPlanningOverlayOpen(false)}
        >
          {/* Panel — stop propagation so clicks inside don't close */}
          <div
            className="relative mx-auto w-[90%] mt-6 bg-white rounded-2xl shadow-2xl overflow-auto max-h-[calc(100vh-8rem)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 sm:px-6 lg:px-8 py-4">
              <Suspense fallback={<div className="p-4 text-center text-gray-500">Laden...</div>}>
                <WeekPlannerOverlay />
              </Suspense>
            </div>
          </div>
        </div>
      )}

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