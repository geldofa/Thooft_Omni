import { startTransition, Suspense } from 'react';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import { Users, Tags, Factory, Key, Tag, Shield } from 'lucide-react';
import { useAuth } from './AuthContext';
import { OperatorManagement } from './OperatorManagement';
import { CategoryManagement } from './CategoryManagement';
import { PressManagement } from './PressManagement';
import { PasswordManagement } from './PasswordManagement';
import { ExternalSummary } from './ExternalSummary';
import { TagManagement } from './TagManagement';
import { PermissionManagement } from './PermissionManagement';

interface ManagementLayoutProps {
    activeTab: string;
    setActiveTab: (tab: string) => void;
    user: any;
}

export function ManagementLayout({ activeTab, setActiveTab }: ManagementLayoutProps) {
    const { hasPermission } = useAuth();

    // Define the subset of tabs that belong to this layout
    // This component assumes activeTab is already one of these, or we default it?
    // App.tsx controls rendering of this component, so activeTab IS one of these.

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
                <Tabs
                    value={activeTab}
                    onValueChange={(value) => startTransition(() => setActiveTab(value))}
                    className="w-full sm:w-auto"
                >
                    <TabsList className="tab-pill-list flex items-center">
                        {hasPermission('manage_personnel') && (
                            <TabsTrigger value="operators" className="tab-pill-trigger">
                                <Users className="w-4 h-4 mr-2" /> Personeel
                            </TabsTrigger>
                        )}

                        {hasPermission('manage_categories') && (
                            <TabsTrigger value="categories" className="tab-pill-trigger">
                                <Tags className="w-4 h-4 mr-2" /> Categorieën
                            </TabsTrigger>
                        )}

                        {hasPermission('manage_tags') && (
                            <TabsTrigger value="tags" className="tab-pill-trigger">
                                <Tag className="w-4 h-4 mr-2" /> Tags
                            </TabsTrigger>
                        )}

                        {hasPermission('manage_presses') && (
                            <TabsTrigger value="presses" className="tab-pill-trigger">
                                <Factory className="w-4 h-4 mr-2" /> Persen
                            </TabsTrigger>
                        )}

                        {hasPermission('manage_accounts') && (
                            <TabsTrigger value="passwords" className="tab-pill-trigger">
                                <Key className="w-4 h-4 mr-2" /> Accounts
                            </TabsTrigger>
                        )}

                        {hasPermission('manage_permissions') && (
                            <TabsTrigger value="permissions" className="tab-pill-trigger">
                                <Shield className="w-4 h-4 mr-2" /> Rechten
                            </TabsTrigger>
                        )}
                    </TabsList>
                </Tabs>
            </div>

            <main className="bg-white rounded-lg shadow-sm border border-slate-200">
                <Suspense fallback={<div className="p-8 text-center text-gray-500">Laden...</div>}>
                    {activeTab === 'operators' && <OperatorManagement />}
                    {activeTab === 'extern' && <ExternalSummary />}
                    {activeTab === 'categories' && <CategoryManagement />}
                    {activeTab === 'tags' && <TagManagement />}
                    {activeTab === 'presses' && hasPermission('manage_presses') && <PressManagement />}
                    {activeTab === 'passwords' && hasPermission('manage_accounts') && <PasswordManagement />}
                    {activeTab === 'permissions' && hasPermission('manage_permissions') && <PermissionManagement />}
                </Suspense>
            </main>
        </div>
    );
}
