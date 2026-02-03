import { useState } from 'react';
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
import { Shield, Info } from 'lucide-react';
import { PageHeader } from './PageHeader';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from './ui/tooltip';

const ALL_PERMISSIONS: { key: Permission; label: string; description: string }[] = [
    { key: 'tasks_view', label: 'Taken Bekijken', description: 'Toegang tot de hoofdtabel met taken.' },
    { key: 'tasks_edit', label: 'Taken Bewerken', description: 'Mogelijkheid om taken aan te maken, te bewerken en te verwijderen.' },
    { key: 'drukwerken_view', label: 'Drukwerken Bekijken', description: 'Toegang tot de Drukwerken sectie.' },
    { key: 'drukwerken_view_all', label: 'Alle Drukwerken Zien', description: 'Mogelijkheid om drukwerken van alle persen te zien in plaats van alleen de eigen pers.' },
    { key: 'drukwerken_create', label: 'Drukwerken Aanmaken', description: 'Mogelijkheid om nieuwe werkorders toe te voegen.' },
    { key: 'reports_view', label: 'Rapporten Bekijken', description: 'Toegang tot de Rapportage sectie.' },
    { key: 'checklist_view', label: 'Checklist Bekijken', description: 'Toegang tot de Checklist sectie.' },
    { key: 'extern_view', label: 'Extern Bekijken', description: 'Toegang tot het Extern overzicht.' },
    { key: 'management_access', label: 'Beheer Toegang', description: 'Toegang tot de Beheer (Management) sectie.' },
    { key: 'manage_personnel', label: 'Personeel Beheren', description: 'Beheer van operators, teams en externe entiteiten.' },
    { key: 'manage_categories', label: 'Categorieën Beheren', description: 'Beheer van taakcategorieën.' },
    { key: 'manage_tags', label: 'Tags Beheren', description: 'Beheer van tags.' },
    { key: 'manage_presses', label: 'Persen Beheren', description: 'Beheer van drukpersen.' },
    { key: 'manage_parameters', label: 'Parameters Beheren', description: 'Beheer van drukwerk parameters en formules.' },
    { key: 'manage_accounts', label: 'Accounts Beheren', description: 'Beheer van gebruikersaccounts en wachtwoorden.' },
    { key: 'manage_permissions', label: 'Rechten Beheren', description: 'Mogelijkheid om deze rol-gebaseerde rechten aan te passen.' },
    { key: 'toolbox_access', label: 'Toolbox', description: 'Toegang tot de Toolbox functionaliteiten.' },
    { key: 'logs_view', label: 'Logs Bekijken', description: 'Toegang tot het Logboek.' },
    { key: 'feedback_view', label: 'Feedback Bekijken', description: 'Toegang tot de binnengekomen feedback.' },
    { key: 'feedback_manage', label: 'Feedback Beheren', description: 'Mogelijkheid om feedback af te handelen of te verwijderen.' },
];

const ROLES: { key: UserRole; label: string }[] = [
    { key: 'admin', label: 'Admin' },
    { key: 'meestergast', label: 'Meestergast' },
    { key: 'press', label: 'Operator' },
];

export function PermissionManagement() {
    const { rolePermissions, updateRolePermissions } = useAuth();
    const [loading, setLoading] = useState<string | null>(null);

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

    return (
        <div className="space-y-4">
            <PageHeader
                title="Rollen & Rechten Beheer"
                description="Configureer welke functionaliteiten beschikbaar zijn voor elke gebruikersrol."
                icon={Shield}
                className="mb-2"
            />

            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                <TooltipProvider>
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-50 hover:bg-gray-50">
                                <TableHead className="border-r border-gray-200 font-semibold text-gray-900 w-[300px]">Functionaliteit</TableHead>
                                {ROLES.map(role => (
                                    <TableHead key={role.key} className="text-center font-semibold text-gray-900 border-r border-gray-200 last:border-r-0">
                                        {role.label}
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {ALL_PERMISSIONS.map((perm) => (
                                <TableRow key={perm.key} className="hover:bg-gray-50/50">
                                    <TableCell className="border-r border-gray-200 font-medium py-3">
                                        <div className="flex items-center gap-2">
                                            {perm.label}
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <button className="text-gray-400 hover:text-gray-600">
                                                        <Info className="w-4 h-4" />
                                                    </button>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p className="max-w-xs">{perm.description}</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </div>
                                    </TableCell>
                                    {ROLES.map(role => {
                                        const isGranted = rolePermissions.find(rp => rp.role === role.key)?.permissions.includes(perm.key);
                                        const isLoading = loading === `${role.key}-${perm.key}`;

                                        return (
                                            <TableCell key={role.key} className="text-center border-r border-gray-200 last:border-r-0">
                                                <div className="flex justify-center items-center">
                                                    <Checkbox
                                                        checked={isGranted}
                                                        disabled={isLoading || (role.key === 'admin' && perm.key === 'manage_permissions')} // Prevent locking out admin from permissions
                                                        onCheckedChange={() => togglePermission(role.key, perm.key)}
                                                        className={isLoading ? 'opacity-50' : ''}
                                                    />
                                                </div>
                                            </TableCell>
                                        );
                                    })}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TooltipProvider>
            </div>
        </div>
    );
}
