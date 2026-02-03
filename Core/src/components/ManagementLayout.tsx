import { startTransition, Suspense, lazy } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import { Users, Tags, Factory, Key, Tag, Shield, Calculator } from 'lucide-react';
import { useAuth } from './AuthContext';
import { OperatorManagement } from './OperatorManagement';
import { CategoryManagement } from './CategoryManagement';
import { PressManagement } from './PressManagement';
import { PasswordManagement } from './PasswordManagement';
import { ExternalSummary } from './ExternalSummary';
import { TagManagement } from './TagManagement';
import { PermissionManagement } from './PermissionManagement';
import { Reports } from './Reports';
import { MaintenanceChecklist } from './MaintenanceChecklist';

const ParameterManagement = lazy(() => import('./ParameterManagement').then(m => ({ default: m.ParameterManagement })));

export function ManagementLayout() {
    const { hasPermission, tasks } = useAuth();
    const { subtab } = useParams<{ subtab: string }>();
    const navigate = useNavigate();

    const activeTab = subtab || 'Personeel';

    const tabMapping: Record<string, string> = {
        'Personeel': 'operators',
        'Categorie': 'categories',
        'Tags': 'tags',
        'Persen': 'presses',
        'Parameters': 'parameters',
        'Accounts': 'passwords',
        'Rechten': 'permissions',
        'Extern': 'extern',
        'Rapport': 'reports',
        'Checklist': 'checklist'
    };

    const currentTab = tabMapping[activeTab] || 'operators';

    // Generic header logic removed, components execute their own header


    return (
        <div className="p-2 w-full mx-auto">


            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
                <Tabs
                    value={activeTab}
                    onValueChange={(value) => startTransition(() => navigate(`/Beheer/${value}`))}
                    className="w-full sm:w-auto"
                >
                    <TabsList className="tab-pill-list flex items-center flex-wrap">
                        {hasPermission('manage_personnel') && (
                            <TabsTrigger value="Personeel" className="tab-pill-trigger">
                                <Users className="w-4 h-4 mr-2" /> Personeel
                            </TabsTrigger>
                        )}

                        {hasPermission('manage_categories') && (
                            <TabsTrigger value="Categorie" className="tab-pill-trigger">
                                <Tags className="w-4 h-4 mr-2" /> Categorieën
                            </TabsTrigger>
                        )}

                        {hasPermission('manage_tags') && (
                            <TabsTrigger value="Tags" className="tab-pill-trigger">
                                <Tag className="w-4 h-4 mr-2" /> Tags
                            </TabsTrigger>
                        )}

                        {hasPermission('manage_presses') && (
                            <TabsTrigger value="Persen" className="tab-pill-trigger">
                                <Factory className="w-4 h-4 mr-2" /> Persen
                            </TabsTrigger>
                        )}

                        {(hasPermission('manage_parameters') || true) && (
                            <TabsTrigger value="Parameters" className="tab-pill-trigger">
                                <Calculator className="w-4 h-4 mr-2" /> Parameters
                            </TabsTrigger>
                        )}

                        {hasPermission('manage_accounts') && (
                            <TabsTrigger value="Accounts" className="tab-pill-trigger">
                                <Key className="w-4 h-4 mr-2" /> Accounts
                            </TabsTrigger>
                        )}

                        {hasPermission('manage_permissions') && (
                            <TabsTrigger value="Rechten" className="tab-pill-trigger">
                                <Shield className="w-4 h-4 mr-2" /> Rechten
                            </TabsTrigger>
                        )}


                    </TabsList>
                </Tabs>
            </div>

            <main>
                <Suspense fallback={<div className="p-8 text-center text-gray-500">Laden...</div>}>
                    {currentTab === 'operators' && <OperatorManagement />}
                    {currentTab === 'extern' && <ExternalSummary />}
                    {currentTab === 'categories' && <CategoryManagement />}
                    {currentTab === 'tags' && <TagManagement />}
                    {currentTab === 'presses' && <PressManagement />}
                    {currentTab === 'parameters' && <ParameterManagement />}
                    {currentTab === 'passwords' && <PasswordManagement />}
                    {currentTab === 'permissions' && <PermissionManagement />}
                    {currentTab === 'reports' && <Reports tasks={tasks} />}
                    {currentTab === 'checklist' && <MaintenanceChecklist tasks={tasks} />}
                </Suspense>
            </main>
        </div>
    );
}
