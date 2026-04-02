import React, { useState, useRef, useCallback } from 'react';
import { useAuth, UserRole, Permission } from '../AuthContext';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '../ui/table';
import { Checkbox } from '../ui/checkbox';
import { Shield, Info, Settings, ClipboardList, Printer, Wrench, FileText, MessageSquare, BarChart2 } from 'lucide-react';
import { PageHeader } from '../layout/PageHeader';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '../ui/tooltip';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Button } from '../ui/button';

interface PermissionGroup {
    id: string;
    label: string;
    icon: any;
    permissions: { key: Permission; label: string; description: string }[];
}

const PERMISSION_GROUPS: PermissionGroup[] = [
    {
        id: 'taken',
        label: 'Taken',
        icon: ClipboardList,
        permissions: [
            { key: 'tasks_view', label: 'Taken Bekijken', description: 'Toegang tot de hoofdtabel met taken.' },
            { key: 'tasks_edit', label: 'Taken Bewerken', description: 'Mogelijkheid om taken aan te maken, te bewerken en te verwijderen.' },
            { key: 'extern_view', label: 'Extern', description: 'Toegang tot het Extern overzicht.' },
        ]
    },
    {
        id: 'drukwerken',
        label: 'Drukwerken',
        icon: Printer,
        permissions: [
            { key: 'drukwerken_view', label: 'Drukwerken Bekijken', description: 'Toegang tot de Drukwerken sectie.' },
            { key: 'drukwerken_view_all', label: 'Alle Drukwerken Zien', description: 'Mogelijkheid om drukwerken van alle persen te zien.' },
            { key: 'drukwerken_create', label: 'Drukwerken Aanmaken', description: 'Mogelijkheid om nieuwe werkorders toe te voegen.' },
            { key: 'drukwerken_trash_view', label: 'Prullenbak Bekijken', description: 'Toegang tot verwijderde drukwerken en herstelmogelijkheden.' },
        ]
    },
    {
        id: 'analyse',
        label: 'Analyse',
        icon: BarChart2,
        permissions: [
            { key: 'reports_view', label: 'PDF Rapporten', description: 'Toegang tot de Rapportage sectie (PDF hubs).' },
            { key: 'checklist_view', label: 'Checklist', description: 'Toegang tot de Checklist sectie.' },
            { key: 'maintenance_analytics_view', label: 'Onderhoud Statistieken', description: 'Interactieve charts voor onderhoud.' },
            { key: 'production_analytics_view', label: 'Productie Statistieken', description: 'Interactieve charts voor productie.' },
            { key: 'osint_view', label: 'OSINT Live Command', description: 'Toegang tot het real-time productie dashboard.' },
        ]

    },
    {
        id: 'beheer',
        label: 'Beheer',
        icon: Wrench,
        permissions: [
            { key: 'management_access', label: 'Beheer Sectie', description: 'Toegang tot de Beheer sectie (vereist voor alle sub-tabs).' },
            { key: 'manage_personnel', label: 'Personeel', description: 'Beheer operators en teams.' },
            { key: 'manage_categories', label: 'Categorieën', description: 'Beheer taakcategorieën.' },
            { key: 'manage_tags', label: 'Tags', description: 'Beheer van tags.' },
            { key: 'manage_presses', label: 'Persen', description: 'Beheer van drukpersen.' },
            { key: 'manage_parameters', label: 'Parameters', description: 'Beheer parameters en formules.' },
            { key: 'manage_accounts', label: 'Accounts', description: 'Beheer gebruikersaccounts.' },
            { key: 'manage_permissions', label: 'Rechten', description: 'Beheer van rollen en rechten.' },
            { key: 'manage_ticker', label: 'Activiteit Ticker Settings', description: 'Instellingen voor de ticker in de header.' },
            { key: 'activity_ticker_view', label: 'Activiteit Ticker Zien', description: 'Mogelijkheid om de ticker te zien in de header.' },
            { key: 'data_checker_view', label: 'Data Checker', description: 'Toegang tot de Data Checker tool.' },
            { key: 'toolbox_access', label: 'Toolbox', description: 'Toegang tot de Toolbox sectie (Import/Tools/Backup).' },
        ]
    },
    {
        id: 'configuratie',
        label: 'Configuratie',
        icon: Settings,
        permissions: [
            { key: 'manage_themes', label: 'Thema', description: 'Beheer het uiterlijk van de applicatie.' },
            { key: 'manage_notifications', label: 'Notificaties', description: 'Beheer e-mail templates en SMTP-instellingen.' },
            { key: 'manage_system_tasks', label: 'Systeem Taken', description: 'Beheer geplande rapporten en systeemtaken.' },
        ]
    },
    {
        id: 'logboek',
        label: 'Logboek',
        icon: FileText,
        permissions: [
            { key: 'logs_view', label: 'Logboek Bekijken (Eigen)', description: 'Toegang tot eigen acties in het logboek.' },
            { key: 'logs_view_all', label: 'Alle Logs Bekijken', description: 'Toegang tot alle acties in het logboek.' },
        ]
    },
    {
        id: 'feedback',
        label: 'Feedback',
        icon: MessageSquare,
        permissions: [
            { key: 'feedback_view', label: 'Feedback Bekijken', description: 'Toegang tot feedback.' },
            { key: 'feedback_manage', label: 'Feedback Beheren', description: 'Handel feedback af.' },
        ]
    }
];

const ROLES: { key: UserRole; label: string }[] = [
    { key: 'admin', label: 'Admin' },
    { key: 'meestergast', label: 'Meestergast' },
    { key: 'press', label: 'Operator' },
    { key: 'waarnemer', label: 'Waarnemer' },
];

// Permissions that are always locked for admins
const ADMIN_LOCKED: Permission[] = ['manage_permissions'];

export function PermissionManagement() {
    const { rolePermissions, updateRolePermissions, getSystemSetting, updateSystemSetting } = useAuth();
    const [loading, setLoading] = useState<string | null>(null);
    const [editLimit, setEditLimit] = useState(getSystemSetting('drukwerken_edit_limit', 1));
    const [splitPct, setSplitPct] = useState(50); // percentage for left panel
    const containerRef = useRef<HTMLDivElement>(null);
    const isDragging = useRef(false);

    const onDragStart = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        isDragging.current = true;
        const onMove = (ev: MouseEvent) => {
            if (!isDragging.current || !containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            const pct = ((ev.clientX - rect.left) / rect.width) * 100;
            setSplitPct(Math.min(Math.max(pct, 20), 80)); // clamp 20%–80%
        };
        const onUp = () => {
            isDragging.current = false;
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    }, []);

    const getPermissionsForRole = (role: UserRole): Permission[] => {
        return rolePermissions.find(rp => rp.role === role)?.permissions || [];
    };

    const togglePermission = async (role: UserRole, permission: Permission) => {
        const currentPermissions = getPermissionsForRole(role);
        const newPermissions = currentPermissions.includes(permission)
            ? currentPermissions.filter(p => p !== permission)
            : [...currentPermissions, permission];

        setLoading(`${role}-${permission}`);
        await updateRolePermissions(role, newPermissions);
        setLoading(null);
    };

    const toggleGroup = async (role: UserRole, group: PermissionGroup) => {
        const currentPermissions = getPermissionsForRole(role);
        const groupKeys = group.permissions.map(p => p.key);
        // Filter out always-locked keys for non-admin roles or always-locked ones
        const toggleableKeys = role === 'admin'
            ? groupKeys.filter(k => !ADMIN_LOCKED.includes(k))
            : groupKeys;

        const allPresent = toggleableKeys.every(k => currentPermissions.includes(k));

        const newPermissions: Permission[] = allPresent
            ? currentPermissions.filter(p => !toggleableKeys.includes(p))
            : Array.from(new Set([...currentPermissions, ...toggleableKeys])) as Permission[];

        setLoading(`${role}-${group.id}-all`);
        await updateRolePermissions(role, newPermissions);
        setLoading(null);
    };

    const handleSaveLimit = async () => {
        await updateSystemSetting('drukwerken_edit_limit', Number(editLimit));
    };

    return (
        <div className="space-y-4">
            <PageHeader
                title="Systeembeheer"
                description="Configureer rollen, rechten en systeemparameters."
                icon={Shield}
                className="mb-2"
            />

            <div ref={containerRef} className="flex gap-0 items-start select-none">
                {/* Left Card: Permissions */}
                <div className="min-w-0 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col" style={{ width: `${splitPct}%` }}>
                    <div className="p-4 border-b border-gray-100 flex items-center gap-2 bg-gray-50/50">
                        <Shield className="w-5 h-5 text-blue-600" />
                        <h2 className="font-semibold text-gray-900">Rollen & Rechten</h2>
                        <span className="ml-auto text-xs text-gray-400">Klik op categorienaam om alles te selecteren</span>
                    </div>

                    <div className="overflow-auto flex-grow" style={{ maxHeight: '70vh' }}>
                        <TooltipProvider>
                            <Table>
                                <TableHeader className="sticky top-0 z-10">
                                    <TableRow className="bg-white hover:bg-white shadow-sm">
                                        <TableHead className="w-[180px] font-medium text-gray-500 bg-white">Functionaliteit</TableHead>
                                        {ROLES.map(role => (
                                            <TableHead key={role.key} className="text-center font-medium text-gray-500 w-[80px] bg-white">
                                                {role.label}
                                            </TableHead>
                                        ))}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {PERMISSION_GROUPS.map((group) => {
                                        return (
                                            <React.Fragment key={group.id}>
                                                {/* Group header row with select-all checkboxes */}
                                                <TableRow className="bg-gray-50/60 hover:bg-gray-100/60 border-t border-gray-100">
                                                    <TableCell className="py-2">
                                                        <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider">
                                                            <group.icon className="w-3.5 h-3.5" />
                                                            {group.label}
                                                        </div>
                                                    </TableCell>
                                                    {ROLES.map(role => {
                                                        const perms = getPermissionsForRole(role.key);
                                                        const groupKeys = group.permissions.map(p => p.key);
                                                        const toggleableKeys = role.key === 'admin'
                                                            ? groupKeys.filter(k => !ADMIN_LOCKED.includes(k as Permission))
                                                            : groupKeys;
                                                        const allChecked = toggleableKeys.every(k => perms.includes(k as Permission));
                                                        const someChecked = toggleableKeys.some(k => perms.includes(k as Permission));
                                                        const isGroupLoading = loading === `${role.key}-${group.id}-all`;

                                                        return (
                                                            <TableCell key={role.key} className="text-center py-2">
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <div className="flex items-center justify-center">
                                                                            <Checkbox
                                                                                checked={allChecked}
                                                                                data-state={!allChecked && someChecked ? 'indeterminate' : undefined}
                                                                                disabled={isGroupLoading}
                                                                                onCheckedChange={() => toggleGroup(role.key, group)}
                                                                                className="border-gray-400"
                                                                            />
                                                                        </div>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>
                                                                        <p className="text-xs">{allChecked ? 'Alles deselecteren' : 'Alles selecteren'} voor {role.label}</p>
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            </TableCell>
                                                        );
                                                    })}
                                                </TableRow>

                                                {/* Individual permission rows */}
                                                {group.permissions.map((perm) => (
                                                    <TableRow key={perm.key} className="hover:bg-gray-50/50">
                                                        <TableCell className="pl-8 py-2.5">
                                                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                                                {perm.label}
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <button className="text-gray-300 hover:text-gray-500 flex-shrink-0">
                                                                            <Info className="w-3.5 h-3.5" />
                                                                        </button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>
                                                                        <p className="max-w-xs text-xs">{perm.description}</p>
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            </div>
                                                        </TableCell>
                                                        {ROLES.map(role => {
                                                            const perms = getPermissionsForRole(role.key);
                                                            const isGranted = perms.includes(perm.key);
                                                            const isItemLoading = loading === `${role.key}-${perm.key}`;
                                                            const isLocked = role.key === 'admin' && ADMIN_LOCKED.includes(perm.key);
                                                            return (
                                                                <TableCell key={role.key} className="text-center">
                                                                    <Checkbox
                                                                        checked={isGranted}
                                                                        disabled={isItemLoading || isLocked}
                                                                        onCheckedChange={() => togglePermission(role.key, perm.key)}
                                                                    />
                                                                </TableCell>
                                                            );
                                                        })}
                                                    </TableRow>
                                                ))}
                                            </React.Fragment>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </TooltipProvider>
                    </div>
                </div>

                {/* Drag handle */}
                <div
                    className="flex-shrink-0 w-3 mx-1 flex items-center justify-center cursor-col-resize group self-stretch"
                    onMouseDown={onDragStart}
                >
                    <div className="w-0.5 h-full bg-gray-200 rounded-full group-hover:bg-blue-400 transition-colors" />
                </div>

                {/* Right Card: System values */}
                <div className="min-w-0 flex-shrink-0 space-y-6" style={{ width: `calc(${100 - splitPct}% - 20px)` }}>
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-gray-100 flex items-center gap-2 bg-gray-50/50">
                            <Settings className="w-5 h-5 text-gray-600" />
                            <h2 className="font-semibold text-gray-900">Systeemwaarden</h2>
                        </div>

                        <div className="p-6 space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="editLimit" className="text-sm font-medium text-gray-700">
                                    Edit limit voor drukwerken (persen)
                                </Label>
                                <div className="flex gap-3">
                                    <div className="relative flex-grow max-w-[200px]">
                                        <Input
                                            id="editLimit"
                                            type="number"
                                            value={editLimit}
                                            onChange={(e) => setEditLimit(e.target.value)}
                                            className="pr-12"
                                        />
                                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-400 text-sm">
                                            dagen
                                        </div>
                                    </div>
                                    <Button onClick={handleSaveLimit} className="bg-blue-600 hover:bg-blue-700">
                                        Opslaan
                                    </Button>
                                </div>
                                <p className="text-xs text-gray-500">
                                    Het aantal dagen dat een Operator een drukwerk kan bewerken nadat deze is aangemaakt.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
