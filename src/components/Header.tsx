import { useAuth } from './AuthContext';
import { LogOut, User, Info, LayoutDashboard, ScrollText, ListChecks, Users, HardHat, Printer, KeyRound } from 'lucide-react';
import { Button } from './ui/button';

export function Header() {
  const { user, logout } = useAuth();

  if (!user) return null;

  const navigationModules = [
    { name: 'Taken', icon: Info, href: '#', current: false },
    { name: 'Drukwerken', icon: Printer, href: '#', current: false },
    { name: 'Rapport', icon: ScrollText, href: '#', current: false },
    { name: 'Checklist', icon: ListChecks, href: '#', current: false },
    { name: 'Personeel', icon: Users, href: '#', current: false },
    { name: 'Categorieën', icon: LayoutDashboard, href: '#', current: false },
    { name: 'Persen', icon: HardHat, href: '#', current: false },
    { name: 'Accounts', icon: KeyRound, href: '#', current: false },
    { name: 'Logboek', icon: Info, href: '#', current: true }, // Active link
  ];

  return (
    <header className="bg-white py-5 border-b border-gray-200 sticky top-0 z-50">
      <div className="header-top-row flex justify-between items-center max-w-[1400px] mx-auto px-10 mb-5">
        <span className="logo flex-grow text-center text-2xl font-bold text-gray-800 tracking-tight">Antigravity</span>

        <div className="admin-actions flex flex-col items-end text-sm text-gray-800 leading-tight text-right ml-auto">
          <span>{user.username}</span>
          <a href="#" onClick={logout} className="logout-link no-underline text-gray-800 flex items-center text-base">
            Admin <LogOut className="w-4 h-4 ml-1.5" />
          </a>
        </div>
      </div>

      <div className="header-nav-row flex justify-center">
        <div className="module-block flex items-center bg-gray-100 rounded-lg p-2 shadow-sm">
          {navigationModules.map((module) => (
            <a
              key={module.name}
              href={module.href}
              className={`module-link flex items-center no-underline text-gray-800 text-base font-medium px-4 py-2 mx-1 transition-colors rounded-lg
                ${module.current ? 'bg-white rounded-full shadow-md text-black font-semibold hover:shadow-lg' : 'hover:text-black'}`
              }
            >
              <module.icon className="w-4 h-4 mr-1.5" /> {module.name}
            </a>
          ))}
        </div>
      </div>
    </header>
  );
}
