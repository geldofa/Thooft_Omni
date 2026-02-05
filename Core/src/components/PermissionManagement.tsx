import React, { useState } from 'react';
import { useAuth, UserRole, Permission } from './AuthContext';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from './ui/table';
import { Checkbox } from './ui/checkbox';
import { Shield, Info, Settings, ClipboardList, Printer, Wrench, FileText, MessageSquare } from 'lucide-react';
import { PageHeader } from './PageHeader';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from './ui/tooltip';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';

interface PermissionGroup {
    id: string;
    label: string;
    icon: any;
    permissions: { key: Permission; label: string; description: string }[];
    isUnified?: boolean; // If true, one checkbox manages all permissions in this group
}

const PERMISSION_GROUPS: PermissionGroup[] = [
    {
        id: 'taken',
        label: 'Taken',
        icon: ClipboardList,
        permissions: [
            { key: 'tasks_view', label: 'Taken Bekijken', description: 'Toegang tot de hoofdtabel met taken.' },
            { key: 'tasks_edit', label: 'Taken Bewerken', description: 'Mogelijkheid om taken aan te maken, te bewerken en te verwijderen.' },
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
        ]
    },
    {
        id: 'beheer',
        label: 'Beheer',
        icon: Wrench,
        isUnified: true,
        permissions: [
            { key: 'reports_view', label: 'Rapporten', description: 'Toegang tot Rapportage.' },
            { key: 'checklist_view', label: 'Checklist', description: 'Toegang tot Checklist.' },
            { key: 'extern_view', label: 'Extern', description: 'Toegang tot Extern overzicht.' },
            { key: 'management_access', label: 'Management Toegang', description: 'Toegang tot Beheer sectie.' },
            { key: 'manage_personnel', label: 'Personeel', description: 'Beheer operators en teams.' },
            { key: 'manage_categories', label: 'Categorieën', description: 'Beheer taakcategorieën.' },
            { key: 'manage_tags', label: 'Tags', description: 'Beheer van tags.' },
            { key: 'manage_presses', label: 'Persen', description: 'Beheer van drukpersen.' },
            { key: 'manage_parameters', label: 'Parameters', description: 'Beheer parameters en formules.' },
            { key: 'manage_accounts', label: 'Accounts', description: 'Beheer gebruikersaccounts.' },
            { key: 'manage_permissions', label: 'Rechten', description: 'Beheer van rollen en rechten.' },
            { key: 'toolbox_access', label: 'Toolbox', description: 'Toegang tot Toolbox.' },
        ]
    },
    {
        id: 'logboek',
        label: 'Logboek',
        icon: FileText,
        permissions: [
            { key: 'logs_view', label: 'Logs Bekijken (Eigen)', description: 'Toegang tot eigen acties in het logboek.' },
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
];

export function PermissionManagement() {
    const { rolePermissions, updateRolePermissions, getSystemSetting, updateSystemSetting } = useAuth();
    const [loading, setLoading] = useState<string | null>(null);
    const [editLimit, setEditLimit] = useState(getSystemSetting('drukwerken_edit_limit', 1));

    const togglePermission = async (role: UserRole, permission: Permission) => {
        const roleData = rolePermissions.find(rp => rp.role === role);
        const currentPermissions = roleData?.permissions || [];

        let newPermissions: Permission[];
        if (currentPermissions.includes(permission)) {
            newPermissions = currentPermissions.filter(p => p !== permission);
        } else {
            newPermissions = [...currentPermissions, permission];
        }

        setLoading(`${role}-${permission}`);
        await updateRolePermissions(role, newPermissions);
        setLoading(null);
    };

    const toggleUnified = async (role: UserRole, group: PermissionGroup) => {
        const roleData = rolePermissions.find(rp => rp.role === role);
        const currentPermissions = roleData?.permissions || [];
        const groupKeys = group.permissions.map(p => p.key);

        const allPresent = groupKeys.every(k => currentPermissions.includes(k));

        let newPermissions: Permission[];
        if (allPresent) {
            newPermissions = currentPermissions.filter(p => !groupKeys.includes(p));
        } else {
            newPermissions = Array.from(new Set([...currentPermissions, ...groupKeys]));
        }

        setLoading(`${role}-${group.id}`);
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

            <div className="grid grid-cols-1 md:grid-cols-[1fr,350px] gap-6 items-start">
                {/* Left Card: Permissions */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-gray-100 flex items-center gap-2 bg-gray-50/50">
                        <Shield className="w-5 h-5 text-blue-600" />
                        <h2 className="font-semibold text-gray-900">Rollen & Rechten</h2>
                    </div>

                    <div className="overflow-x-auto flex-grow">
                        <TooltipProvider>
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-white hover:bg-white">
                                        <TableHead className="w-[240px] font-medium text-gray-500">Functionaliteit</TableHead>
                                        {ROLES.map(role => (
                                            <TableHead key={role.key} className="text-center font-medium text-gray-500">
                                                {role.label}
                                            </TableHead>
                                        ))}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {PERMISSION_GROUPS.map((group) => (
                                        <React.Fragment key={group.id}>
                                            <TableRow className="bg-gray-50/30">
                                                <TableCell colSpan={ROLES.length + 1} className="py-2">
                                                    <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                                                        <group.icon className="w-3.5 h-3.5" />
                                                        {group.label}
                                                    </div>
                                                </TableCell>
                                            </TableRow>

                                            {group.isUnified ? (
                                                <TableRow key={`${group.id}-unified`} className="hover:bg-gray-50/50">
                                                    <TableCell className="pl-6 py-3">
                                                        <div className="flex items-center gap-2 font-medium text-gray-700">
                                                            Toegang tot {group.label}
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <button className="text-gray-400 hover:text-gray-600">
                                                                        <Info className="w-3.5 h-3.5" />
                                                                    </button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <p className="max-w-xs text-xs">Geeft in één keer toegang tot alle onderdelen onder {group.label}.</p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </div>
                                                    </TableCell>
                                                    {ROLES.map(role => {
                                                        const isAllGranted = group.permissions.every(p =>
                                                            rolePermissions.find(rp => rp.role === role.key)?.permissions.includes(p.key)
                                                        );
                                                        const isLoading = loading === `${role.key}-${group.id}`;
                                                        return (
                                                            <TableCell key={role.key} className="text-center">
                                                                <Checkbox
                                                                    checked={isAllGranted}
                                                                    disabled={isLoading}
                                                                    onCheckedChange={() => toggleUnified(role.key, group)}
                                                                />
                                                            </TableCell>
                                                        );
                                                    })}
                                                </TableRow>
                                            ) : (
                                                group.permissions.map((perm) => (
                                                    <TableRow key={perm.key} className="hover:bg-gray-50/50">
                                                        <TableCell className="pl-6 py-3">
                                                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                                                {perm.label}
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <button className="text-gray-300 hover:text-gray-500">
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
                                                            const isGranted = rolePermissions.find(rp => rp.role === role.key)?.permissions.includes(perm.key);
                                                            const isLoading = loading === `${role.key}-${perm.key}`;
                                                            return (
                                                                <TableCell key={role.key} className="text-center">
                                                                    <Checkbox
                                                                        checked={isGranted}
                                                                        disabled={isLoading || (role.key === 'admin' && perm.key === 'manage_permissions')}
                                                                        onCheckedChange={() => togglePermission(role.key, perm.key)}
                                                                    />
                                                                </TableCell>
                                                            );
                                                        })}
                                                    </TableRow>
                                                ))
                                            )}
                                        </React.Fragment>
                                    ))}
                                </TableBody>
                            </Table>
                        </TooltipProvider>
                    </div>
                </div>

                {/* Right Card: System values */}
                <div className="space-y-6">
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
