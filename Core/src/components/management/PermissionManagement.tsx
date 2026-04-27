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
import { Shield, Info, Settings, ClipboardList, Printer, Wrench, FileText, MessageSquare, BarChart2, PlusCircle, Trash2 } from 'lucide-react';
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
            { key: 'werkfiches_bekijken_eigen', label: 'Werkfiches Bekijken (eigen pers)', description: 'Werkfiches-pagina zien, gefilterd op de eigen toegewezen pers.' },
            { key: 'werkfiches_bekijken_alle', label: 'Werkfiches Bekijken (alle persen)', description: 'Werkfiches-pagina zien met orders van alle persen. Impliceert ook eigen.' },
            { key: 'werkfiches_importeren', label: 'Werkfiches Importeren', description: 'Beschikbare werkfiches importeren als geplande werkorder. Vereist een toegewezen pers.' },
            { key: 'werkfiches_filters_instellingen', label: 'Werkfiches Filters & Instellingen', description: 'Naamfilters en versielabelfilters aanmaken, opslaan en instellingen aanpassen.' },
            { key: 'werkorders_instellingen', label: 'Werkorders Instellingen', description: 'Toegang tot de actieskolom, herscannen en filterinstellingen in het werkorderoverzicht.' },
            { key: 'papier_bekijken', label: 'Papier Bekijken', description: 'Toegang tot het papierbeheerscherm.' },
            { key: 'papier_aanpassen', label: 'Papier Aanpassen', description: 'Papiersoorten en -instellingen bewerken. Impliceert ook Papier Bekijken.' },
        ]
    },
    {
        id: 'analyse',
        label: 'Analyse',
        icon: BarChart2,
        permissions: [
            { key: 'reports_view', label: 'PDF Rapporten (Volledig)', description: 'Archief bekijken, rapporten aanmaken én sjablonen aanmaken/bewerken/verwijderen.' },
            { key: 'reports_archive_view', label: 'PDF Rapporten (Archief)', description: 'Archief bekijken, eenmalige exports maken en rapporten genereren via bestaande sjablonen. Geen beheer van sjablonen.' },
            { key: 'checklist_view', label: 'Checklist', description: 'Toegang tot de Checklist sectie.' },
            { key: 'maintenance_analytics_view', label: 'Onderhoud Statistieken', description: 'Interactieve charts voor onderhoud.' },
            { key: 'production_analytics_view', label: 'Productie Statistieken', description: 'Interactieve charts voor productie.' },
            { key: 'osint_view', label: 'OSINT Live Command', description: 'Toegang tot het real-time productie dashboard.' },
            { key: 'densiteiten_bekijken_eigen', label: 'Densiteiten Bekijken (Eigen)', description: 'Eigen densiteitsmetingen bekijken.' },
            { key: 'densiteiten_bekijken_alle', label: 'Densiteiten Bekijken (Alle)', description: 'Densiteitsmetingen van alle gebruikers bekijken. Impliceert ook Eigen.' },
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
    },
    {
        id: 'planning',
        label: 'Planning',
        icon: ClipboardList,
        permissions: [
            { key: 'planning_view', label: 'Planning Bekijken', description: 'Toegang tot het werkrooster.' },
            { key: 'planning_edit', label: 'Planning Bewerken', description: 'Shifts aanpassen in het werkrooster.' },
            { key: 'planning_settings', label: 'Planning Instellingen', description: 'Rotatieschema\'s en plannerinstellingen beheren.' },
        ]
    }
];

// Permissions that are always locked for the admin role
const ADMIN_LOCKED: Permission[] = ['manage_permissions'];

// System roles that cannot be deleted
const SYSTEM_ROLES = ['admin'];

// Display label for a role key
const roleLabel = (role: string): string => {
  const labels: Record<string, string> = { press: 'Operator', admin: 'Admin', meestergast: 'Meestergast', waarnemer: 'Waarnemer' };
  return labels[role] ?? role;
};

export function PermissionManagement() {
    const { rolePermissions, updateRolePermissions, createRole, deleteRole, getSystemSetting, updateSystemSetting } = useAuth();
    const [loading, setLoading] = useState<string | null>(null);
    const [editLimit, setEditLimit] = useState(getSystemSetting('drukwerken_edit_limit', 1));
    const [splitPct, setSplitPct] = useState(50);
    const containerRef = useRef<HTMLDivElement>(null);
    const isDragging = useRef(false);

    // New-role form state
    const [newRoleName, setNewRoleName] = useState('');
    const [creatingRole, setCreatingRole] = useState(false);
    const [deletingRole, setDeletingRole] = useState<string | null>(null);

    // Derive the role list dynamically from the DB, admin always first
    const roles: { key: UserRole; label: string }[] = [
        ...rolePermissions
            .map(rp => ({ key: rp.role as UserRole, label: roleLabel(rp.role as string) }))
            .sort((a, b) => {
                if (a.key === 'admin') return -1;
                if (b.key === 'admin') return 1;
                return (a.label).localeCompare(b.label);
            })
    ];

    const onDragStart = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        isDragging.current = true;
        const onMove = (ev: MouseEvent) => {
            if (!isDragging.current || !containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            const pct = ((ev.clientX - rect.left) / rect.width) * 100;
            setSplitPct(Math.min(Math.max(pct, 20), 80));
        };
        const onUp = () => {
            isDragging.current = false;
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    }, []);

    const getPermissionsForRole = (role: UserRole): Permission[] =>
        rolePermissions.find(rp => rp.role === role)?.permissions || [];

    const togglePermission = async (role: UserRole, permission: Permission) => {
        const current = getPermissionsForRole(role);
        const next = current.includes(permission)
            ? current.filter(p => p !== permission)
            : [...current, permission];
        setLoading(`${role}-${permission}`);
        await updateRolePermissions(role, next);
        setLoading(null);
    };

    const toggleGroup = async (role: UserRole, group: PermissionGroup) => {
        const current = getPermissionsForRole(role);
        const groupKeys = group.permissions.map(p => p.key);
        const toggleable = role === 'admin'
            ? groupKeys.filter(k => !ADMIN_LOCKED.includes(k))
            : groupKeys;
        const allPresent = toggleable.every(k => current.includes(k));
        const next: Permission[] = allPresent
            ? current.filter(p => !toggleable.includes(p))
            : Array.from(new Set([...current, ...toggleable])) as Permission[];
        setLoading(`${role}-${group.id}-all`);
        await updateRolePermissions(role, next);
        setLoading(null);
    };

    const handleCreateRole = async () => {
        if (!newRoleName.trim()) return;
        setCreatingRole(true);
        const ok = await createRole(newRoleName);
        if (ok) setNewRoleName('');
        setCreatingRole(false);
    };

    const handleDeleteRole = async (role: string) => {
        setDeletingRole(role);
        await deleteRole(role);
        setDeletingRole(null);
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
                {/* Left Card: Permissions matrix */}
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
                                        {roles.map(role => (
                                            <TableHead key={role.key} className="text-center font-medium text-gray-500 w-[80px] bg-white">
                                                {role.label}
                                            </TableHead>
                                        ))}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {PERMISSION_GROUPS.map((group) => (
                                        <React.Fragment key={group.id}>
                                            {/* Group header row */}
                                            <TableRow className="bg-gray-50/60 hover:bg-gray-100/60 border-t border-gray-100">
                                                <TableCell className="py-2">
                                                    <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider">
                                                        <group.icon className="w-3.5 h-3.5" />
                                                        {group.label}
                                                    </div>
                                                </TableCell>
                                                {roles.map(role => {
                                                    const perms = getPermissionsForRole(role.key);
                                                    const groupKeys = group.permissions.map(p => p.key);
                                                    const toggleable = role.key === 'admin'
                                                        ? groupKeys.filter(k => !ADMIN_LOCKED.includes(k as Permission))
                                                        : groupKeys;
                                                    const allChecked = toggleable.every(k => perms.includes(k as Permission));
                                                    const someChecked = toggleable.some(k => perms.includes(k as Permission));
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
                                                    {roles.map(role => {
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
                                    ))}
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

                {/* Right Cards */}
                <div className="min-w-0 flex-shrink-0 space-y-6" style={{ width: `calc(${100 - splitPct}% - 20px)` }}>

                    {/* Rollen beheren */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-gray-100 flex items-center gap-2 bg-gray-50/50">
                            <Shield className="w-5 h-5 text-blue-600" />
                            <h2 className="font-semibold text-gray-900">Rollen Beheren</h2>
                        </div>

                        <div className="p-4 space-y-3">
                            {/* Existing roles */}
                            <div className="space-y-1.5">
                                {roles.map(role => {
                                    const isSystem = SYSTEM_ROLES.includes(role.key as string);
                                    const isDeleting = deletingRole === role.key;
                                    return (
                                        <div key={role.key} className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50 border border-gray-100">
                                            <div className="flex items-center gap-2">
                                                <Shield className="w-3.5 h-3.5 text-gray-400" />
                                                <span className="text-sm font-medium text-gray-700">{role.label}</span>
                                                {isSystem && (
                                                    <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-medium">systeem</span>
                                                )}
                                            </div>
                                            {!isSystem && (
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7 text-gray-400 hover:text-red-500 hover:bg-red-50"
                                                            disabled={isDeleting}
                                                            onClick={() => handleDeleteRole(role.key as string)}
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p className="text-xs">Rol "{role.label}" verwijderen</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Add new role */}
                            <div className="pt-2 border-t border-gray-100">
                                <Label className="text-xs text-gray-500 mb-1.5 block">Nieuwe rol toevoegen</Label>
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="bijv. Supervisor"
                                        value={newRoleName}
                                        onChange={e => setNewRoleName(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleCreateRole()}
                                        className="h-8 text-sm"
                                    />
                                    <Button
                                        size="sm"
                                        className="h-8 px-3 bg-blue-600 hover:bg-blue-700 flex-shrink-0"
                                        disabled={!newRoleName.trim() || creatingRole}
                                        onClick={handleCreateRole}
                                    >
                                        <PlusCircle className="w-3.5 h-3.5 mr-1" />
                                        Toevoegen
                                    </Button>
                                </div>
                                <p className="text-xs text-gray-400 mt-1.5">
                                    Na aanmaken verschijnt de rol direct als kolom in de rechtenmatrix.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Systeemwaarden */}
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
