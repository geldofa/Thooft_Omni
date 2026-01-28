import { useAuth } from './AuthContext';
import {
    ClipboardList,
    FileBarChart,
    Wrench,
    Users,
    LogOut,
    Printer,
    CheckSquare,
    Shield,
    Database,
    MessageSquare,
    ExternalLink,
    FileText,
    Factory
} from 'lucide-react';
import { Card } from './ui/card';

interface HomeProps {
    setActiveTab: (tab: string) => void;
}

export function Home({ setActiveTab }: HomeProps) {
    const { user, logout } = useAuth();

    if (!user) return null;

    const menuItems = [
        {
            id: 'tasks',
            label: 'Onderhoudstaken',
            icon: ClipboardList,
            description: 'Beheer en update onderhoudstaken',
            roles: ['admin', 'meestergast', 'press'],
            color: 'bg-blue-600'
        },
        {
            id: 'drukwerken',
            label: 'Drukwerken',
            icon: Printer,
            description: 'Beheer drukwerk opdrachten',
            roles: ['admin', 'meestergast', 'press'],
            color: 'bg-orange-600'
        },
        {
            id: 'reports',
            label: 'Rapporten',
            icon: FileBarChart,
            description: 'Bekijk onderhoudsgeschiedenis en analyses',
            roles: ['admin', 'meestergast'],
            color: 'bg-purple-600'
        },
        {
            id: 'checklist',
            label: 'Checklist',
            icon: CheckSquare,
            description: 'Dagelijkse en wekelijkse checklists',
            roles: ['admin', 'meestergast'],
            color: 'bg-green-600'
        },
        {
            id: 'operators',
            label: 'Operators',
            icon: Users,
            description: 'Beheer gebruikers en rechten',
            roles: ['admin', 'meestergast'],
            color: 'bg-teal-600'
        },
        {
            id: 'extern',
            label: 'Externe Taken',
            icon: ExternalLink,
            description: 'Overzicht van externe onderhoudstaken',
            roles: ['admin', 'meestergast'],
            color: 'bg-indigo-600'
        },
        {
            id: 'categories',
            label: 'Categorieën',
            icon: Database,
            description: 'Beheer onderhoudscategorieën',
            roles: ['admin', 'meestergast'],
            color: 'bg-cyan-600'
        },
        {
            id: 'presses',
            label: 'Persen',
            icon: Factory,
            description: 'Beheer persen configuratie',
            roles: ['admin'],
            color: 'bg-amber-600'
        },
        {
            id: 'passwords',
            label: 'Accounts',
            icon: Shield,
            description: 'Beheer systeem wachtwoorden',
            roles: ['admin'],
            color: 'bg-red-600'
        },
        {
            id: 'toolbox',
            label: 'Admin Toolbox',
            icon: Wrench,
            description: 'Gereedschap en instellingen',
            roles: ['admin', 'meestergast'],
            color: 'bg-slate-600'
        },
        {
            id: 'logs',
            label: 'Logboek',
            icon: FileText,
            description: 'Systeem activiteit logboek',
            roles: ['admin', 'meestergast'],
            color: 'bg-gray-500'
        },
        {
            id: 'feedback-list',
            label: 'Feedback',
            icon: MessageSquare,
            description: 'Bekijk feedback en suggesties',
            roles: ['admin', 'meestergast', 'press'],
            color: 'bg-pink-600'
        }
    ];

    const filteredItems = menuItems.filter(item => item.roles.includes(user.role || 'press'));

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
                <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-6 w-full">
                    {filteredItems.map((item) => {
                        const Icon = item.icon;
                        return (
                            <Card
                                key={item.id}
                                className="group relative overflow-hidden cursor-pointer hover:shadow-xl transition-all duration-300 border-none shadow-md bg-white p-6 flex flex-col h-48 justify-between"
                                onClick={() => setActiveTab(item.id)}
                            >
                                <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110 duration-500`}>
                                    <Icon className={`w-36 h-36 ${item.color.replace('bg-', 'text-')}`} />
                                </div>

                                <div className={`${item.color} w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg mb-4 group-hover:scale-110 transition-transform duration-300`}>
                                    <Icon className="w-8 h-8" />
                                </div>

                                <div>
                                    <h3 className="text-xl font-bold text-slate-900 mb-1 group-hover:text-blue-600 transition-colors">
                                        {item.label}
                                    </h3>
                                    <p className="text-sm text-slate-500 font-medium line-clamp-2">
                                        {item.description}
                                    </p>
                                </div>
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
        </div>
    );
}
