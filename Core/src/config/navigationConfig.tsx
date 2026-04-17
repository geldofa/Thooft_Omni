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
    category?: string;
}

export interface NavItemConfig {
    id: string;
    label: string;
    icon: any;
    description: string;
    permission: Permission;
    anyPermission?: Permission[];
    color: string;
    isTall?: boolean;
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
        permission: 'reports_archive_view',
        anyPermission: ['reports_archive_view', 'reports_view', 'checklist_view', 'drukwerken_view', 'maintenance_analytics_view', 'production_analytics_view'],
        color: 'bg-purple-600',
        subtabs: (_activePresses, hasPermission) => [
            // Group: Rapporten
            ...(hasPermission('reports_view') || hasPermission('reports_archive_view') ? [{ label: 'Onderhoud', path: '/Analyses/Rapport', category: 'Rapporten' }] : []),
            ...(hasPermission('drukwerken_view') ? [{ label: 'Drukwerken', path: '/Analyses/Drukwerken', category: 'Rapporten' }] : []),
            ...(hasPermission('checklist_view') ? [{ label: 'Checklist', path: '/Analyses/Checklist', category: 'Rapporten' }] : []),
            // Group: Statistieken
            ...(hasPermission('maintenance_analytics_view') ? [{ label: 'Onderhoud', path: '/Analyses/statistieken/onderhoud', category: 'Statistieken' }] : []),
            ...(hasPermission('production_analytics_view') ? [{ label: 'Productie', path: '/Analyses/statistieken/productie', category: 'Statistieken' }] : []),
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
            // Group: Organisatie
            ...(hasPermission('manage_personnel') ? [{ label: 'Personeel', path: '/Beheer/Personeel', category: 'Organisatie' }] : []),
            ...(hasPermission('manage_categories') ? [{ label: 'Categorieën', path: '/Beheer/Categorie', category: 'Organisatie' }] : []),
            ...(hasPermission('manage_tags') ? [{ label: 'Tags', path: '/Beheer/Tags', category: 'Organisatie' }] : []),
            ...(hasPermission('manage_presses') ? [{ label: 'Persen', path: '/Beheer/Persen', category: 'Organisatie' }] : []),
            ...(hasPermission('manage_parameters') ? [{ label: 'Parameters', path: '/Beheer/Parameters', category: 'Organisatie' }] : []),
            
            // Group: Geavanceerd (Replaces individual items for Toegang & Stijl and Systeem & Tools)
            ...(hasPermission('management_access') ? [{ label: 'Geavanceerd', path: '/Beheer/Rechten' }] : []),
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


