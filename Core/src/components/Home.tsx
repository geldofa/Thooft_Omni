import { useAuth, Permission } from './AuthContext';
import { LogOut, ClipboardList, Printer, FileBarChart, CheckSquare, Users, ExternalLink, Wrench, FileText, MessageSquare } from 'lucide-react';
import { Card } from './ui/card';

import { Press } from './AuthContext';

interface HomeProps {
    setActiveTab: (tab: string) => void;
    activePresses?: Press[];
}

export function Home({ setActiveTab, activePresses = [] }: HomeProps) {
    const { user, logout, hasPermission } = useAuth();

    if (!user) return null;

    const menuItems: {
        id: string,
        label: string,
        icon: any,
        description: string,
        permission: Permission,
        color: string,
        subtabs?: { label: string, permission?: Permission, path?: string }[]
    }[] = [
            {
                id: '/Taken',
                label: 'Onderhoudstaken',
                icon: ClipboardList,
                description: 'Beheer en update onderhoudstaken',
                permission: 'tasks_view',
                color: 'bg-blue-600',
                subtabs: activePresses.map(p => ({ label: p.name, path: `/Taken/${p.name}` }))
            },
            {
                id: '/Drukwerken',
                label: 'Drukwerken',
                icon: Printer,
                description: 'Beheer drukwerk opdrachten',
                permission: 'drukwerken_view',
                color: 'bg-orange-600',
                subtabs: [
                    { label: 'Nieuw Order', permission: 'drukwerken_create', path: '/Drukwerken/Nieuw' },
                    { label: 'Gedrukt', permission: 'drukwerken_view', path: '/Drukwerken/Gedrukt' }
                ]
            },
            {
                id: '/Rapport',
                label: 'Rapporten',
                icon: FileBarChart,
                description: 'Bekijk onderhoudsgeschiedenis en analyses',
                permission: 'reports_view',
                color: 'bg-purple-600'
            },
            {
                id: '/Checklist',
                label: 'Checklist',
                icon: CheckSquare,
                description: 'Dagelijkse en wekelijkse checklists',
                permission: 'checklist_view',
                color: 'bg-green-600'
            },
            {
                id: '/Extern',
                label: 'Externe Taken',
                icon: ExternalLink,
                description: 'Overzicht van externe onderhoudstaken',
                permission: 'extern_view',
                color: 'bg-indigo-600'
            },
            {
                id: '/Beheer',
                label: 'Beheer',
                icon: Users,
                description: 'Beheer personeel, categorieën, persen en meer',
                permission: 'management_access',
                color: 'bg-teal-600',
                subtabs: [
                    { label: 'Personeel', permission: 'manage_personnel', path: '/Beheer/Personeel' },
                    { label: 'Categorieën', permission: 'manage_categories', path: '/Beheer/Categorie' },
                    { label: 'Persen', permission: 'manage_presses', path: '/Beheer/Persen' },
                    { label: 'Accounts', permission: 'manage_accounts', path: '/Beheer/Accounts' },
                    { label: 'Parameters', permission: 'manage_parameters', path: '/Beheer/Parameters' },
                    { label: 'Rechten', permission: 'manage_permissions', path: '/Beheer/Rechten' },
                    { label: 'Tags', permission: 'manage_tags', path: '/Beheer/Tags' }
                ]
            },
            {
                id: '/Toolbox',
                label: 'Toolbox',
                icon: Wrench,
                description: 'Gereedschap en instellingen',
                permission: 'toolbox_access',
                color: 'bg-slate-600',
                subtabs: [
                    { label: 'Tools', permission: 'toolbox_access', path: '/Toolbox/Tools' },
                    { label: 'Import', permission: 'toolbox_access', path: '/Toolbox/Import' },
                    { label: 'Export', permission: 'toolbox_access', path: '/Toolbox/Export' },
                    { label: 'Sync', permission: 'toolbox_access', path: '/Toolbox/Sync' }
                ]
            },
            {
                id: '/Logboek',
                label: 'Logboek',
                icon: FileText,
                description: 'Systeem activiteit logboek',
                permission: 'logs_view',
                color: 'bg-gray-500'
            },
            {
                id: '/Feedback',
                label: 'Feedback',
                icon: MessageSquare,
                description: 'Bekijk feedback en suggesties',
                permission: 'feedback_view',
                color: 'bg-pink-600'
            }
        ];

    const filteredItems = menuItems.filter(item => {
        // 1. Core items
        if (item.id === '/Taken') return true;

        // 2. Middle Section items (Admin/Meestergast only)
        const isAdminSection = ['/Rapport', '/Checklist', '/Extern', '/Beheer', '/Toolbox'].some(path => item.id.startsWith(path));
        if (isAdminSection) {
            if (user.role !== 'admin' && user.role !== 'meestergast') return false;
            return hasPermission(item.permission);
        }

        // 3. Other items (Drukwerken, Logboek, Feedback)
        return hasPermission(item.permission);
    });

    return (
        <div className="min-h-screen bg-slate-50 p-8 flex flex-col items-center justify-center">
            <div className="w-full max-w-7xl">
                {/* Header Section */}
                <div className="text-center mb-12">
                    <h1 className="text-5xl font-black text-slate-900 mb-4 tracking-tight italic">
                        T'HOOFT <span className="text-blue-600">OMNI</span>
                    </h1>
                    <p className="text-xl text-slate-500">
                        Welkom terug, <span className="font-bold text-slate-700">{user.name || user.username}</span>
                    </p>
                </div>

                {/* Grid Layout */}
                <div className="grid grid-cols-[repeat(auto-fill,minmax(350px,1fr))] gap-6 w-full">
                    {filteredItems.map((item) => {
                        const Icon = item.icon;
                        const availableSubtabs = item.subtabs?.filter(sub => !sub.permission || hasPermission(sub.permission)) || [];

                        return (
                            <Card
                                key={item.id}
                                className="group relative overflow-hidden cursor-pointer hover:shadow-xl transition-all duration-300 border-none shadow-md bg-white p-6 flex flex-col min-h-[11rem] justify-between"
                                onClick={() => setActiveTab(item.id)}
                            >
                                <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110 duration-500`}>
                                    <Icon className={`w-36 h-36 ${item.color.replace('bg-', 'text-')}`} />
                                </div>

                                <div className="flex-1">
                                    <div className="flex items-center gap-4 mb-3">
                                        <div className={`${item.color} w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform duration-300 shrink-0`}>
                                            <Icon className="w-6 h-6" />
                                        </div>
                                        <h3 className="text-xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors leading-tight">
                                            {item.label}
                                        </h3>
                                    </div>

                                    <p className="text-sm text-slate-500 font-medium line-clamp-2">
                                        {item.description}
                                    </p>
                                </div>

                                {availableSubtabs.length > 0 && (
                                    <div className="mt-3 flex flex-wrap gap-1.5 z-10">
                                        {availableSubtabs.map((sub, i) => (
                                            <span
                                                key={i}
                                                onClick={(e) => {
                                                    if (sub.path) {
                                                        e.stopPropagation();
                                                        setActiveTab(sub.path);
                                                    }
                                                }}
                                                className="px-2 py-0.5 bg-slate-100 text-[12px] font-bold text-slate-600 rounded-md border border-slate-200 hover:bg-blue-600 hover:text-white hover:border-blue-700 transition-all font-sans"
                                            >
                                                {sub.label}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </Card>
                        );
                    })}
                </div>

                {/* Logout Button */}
                <div className="mt-12 text-center">
                    <button
                        onClick={logout}
                        className="text-slate-400 hover:text-red-500 font-bold flex items-center gap-2 mx-auto transition-colors"
                    >
                        <LogOut className="w-5 h-5" />
                        Uitloggen
                    </button>
                </div>
            </div>
        </div >
    );
}
