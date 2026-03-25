import {
    ClipboardList,
    Printer,
    FileBarChart,
    Users,
    FileText,
    MessageSquare,
    Radio
} from 'lucide-react';

import { Permission, Press } from '../components/AuthContext';

export interface SubtabConfig {
    label: string;
    path: string;
    permission?: Permission;
}

export interface NavItemConfig {
    id: string;
    label: string;
    icon: any;
    description: string;
    permission: Permission;
    color: string;
    subtabs?: (activePresses: Press[], hasPermission: (p: Permission) => boolean) => SubtabConfig[];
}

export const NAVIGATION_CONFIG: NavItemConfig[] = [
    {
        id: '/Taken',
        label: 'Onderhoudstaken',
        icon: ClipboardList,
        description: 'Beheer en update onderhoudstaken',
        permission: 'tasks_view',
        color: 'bg-blue-600',
        subtabs: (activePresses, hasPermission) => [
            ...activePresses.map(p => ({
                label: p.name,
                path: `/Taken/${encodeURIComponent(p.name)}`
            })),
            ...(hasPermission('extern_view') ? [{
                label: 'Extern',
                path: '/Taken/Extern'
            }] : [])
        ]
    },
    {
        id: '/Drukwerken',
        label: 'Drukwerken',
        icon: Printer,
        description: 'Beheer drukwerk opdrachten',
        permission: 'drukwerken_view',
        color: 'bg-orange-600',
        subtabs: (_activePresses, hasPermission) => [
            ...(hasPermission('drukwerken_create') ? [{ label: 'Nieuw Order', path: '/Drukwerken/Nieuw' }] : []),
            { label: 'Gedrukt', path: '/Drukwerken/Gedrukt' }
        ]
    },
    {
        id: '/Analyses',
        label: 'Analyses',
        icon: FileBarChart,
        description: 'Bekijk onderhoudsgeschiedenis en analyses',
        permission: 'reports_view',
        color: 'bg-purple-600',
        subtabs: (_activePresses, hasPermission) => [
            ...(hasPermission('reports_view') ? [{ label: 'Onderhoud', path: '/Analyses/Rapport' }] : []),
            ...(hasPermission('drukwerken_view') ? [{ label: 'Drukwerken', path: '/Analyses/Drukwerken' }] : []),
            ...(hasPermission('checklist_view') ? [{ label: 'Checklist', path: '/Analyses/Checklist' }] : []),
            ...(hasPermission('reports_view') ? [{ label: 'Statistieken > Onderhoud (BETA)', path: '/analyses/statistieken/onderhoud' }] : []),
        ]
    },
    {
        id: '/Beheer',
        label: 'Beheer',
        icon: Users,
        description: 'Systeeminstellingen en organisatie',
        permission: 'management_access',
        color: 'bg-teal-600',
        subtabs: (_activePresses, hasPermission) => [
            ...(hasPermission('manage_personnel') ? [{ label: 'Personeel', path: '/Beheer/Personeel' }] : []),
            ...(hasPermission('manage_categories') ? [{ label: 'Categorieën', path: '/Beheer/Categorie' }] : []),
            ...(hasPermission('manage_tags') ? [{ label: 'Tags', path: '/Beheer/Tags' }] : []),
            ...(hasPermission('manage_presses') ? [{ label: 'Persen', path: '/Beheer/Persen' }] : []),
            ...(hasPermission('manage_accounts') ? [{ label: 'Accounts', path: '/Beheer/Accounts' }] : []),
            ...(hasPermission('manage_permissions') ? [{ label: 'Rechten', path: '/Beheer/Rechten' }] : []),
            ...(hasPermission('manage_themes') ? [{ label: 'Thema', path: '/Beheer/Thema' }] : []),
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
    },
    {
        id: '/Overzicht',
        label: 'Overzicht',
        icon: Radio,
        description: 'Live productie monitoring dashboard',
        permission: 'osint_view',
        color: 'bg-green-600'
    }
];


