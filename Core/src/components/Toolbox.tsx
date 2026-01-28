import { useState } from 'react';
import { useAuth, MaintenanceTask } from './AuthContext';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Switch } from './ui/switch';
import { ImportTool } from './ImportTool';
import { TooltipProvider } from './ui/tooltip';

export function Toolbox({ onNavigateHome }: { onNavigateHome?: () => void }) {
    return (
        <TooltipProvider>
            <div className="p-6 w-full mx-auto">
                <div className="flex items-center gap-3 mb-8">
                    <div className="p-2 bg-blue-600 rounded-xl shadow-lg shadow-blue-200">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Admin Toolbox</h1>
                        <p className="text-sm text-gray-500 font-medium">Beheer systeeminstellingen en data-onderhoud</p>
                    </div>
                </div>

                <ToolboxContent onNavigateHome={onNavigateHome} />
            </div>
        </TooltipProvider>
    );
}

function ToolboxContent({ onNavigateHome }: { onNavigateHome?: () => void }) {
    const { tasks, updateTask, fetchTasks, testingMode, setTestingMode } = useAuth();
    const [isRecalculating, setIsRecalculating] = useState(false);

    const handleRecalculateDates = async () => {
        if (!confirm('Dit zal alle geplande datums herberekenen op basis van de laatste onderhoudsdatum. Dit corrigeert foutieve "Vandaag" datums door de import. Weet u het zeker?')) return;

        setIsRecalculating(true);
        let count = 0;
        try {
            const updates: Promise<void>[] = [];

            for (const group of tasks) {
                for (const sub of group.subtasks) {
                    if (sub.lastMaintenance && sub.maintenanceInterval) {
                        const last = new Date(sub.lastMaintenance);
                        const unit = (sub.maintenanceIntervalUnit || '').toLowerCase();
                        const interval = sub.maintenanceInterval;

                        const expected = new Date(last);
                        if (unit.includes('maand') || unit.includes('month') || unit === 'months') {
                            expected.setMonth(expected.getMonth() + interval);
                        } else if (unit.includes('jaar') || unit.includes('year') || unit === 'years') {
                            expected.setFullYear(expected.getFullYear() + interval);
                        } else if (unit.includes('week') || unit.includes('weeks')) {
                            expected.setDate(expected.getDate() + (interval * 7));
                        } else {
                            expected.setDate(expected.getDate() + interval);
                        }

                        // Check diff
                        const current = sub.nextMaintenance ? new Date(sub.nextMaintenance) : new Date();
                        const diff = Math.abs(current.getTime() - expected.getTime());

                        if (diff > 86400000) { // > 1 day difference
                            const taskToUpdate: MaintenanceTask = {
                                ...sub,
                                task: group.taskName,
                                taskSubtext: group.taskSubtext,
                                subtaskName: sub.subtaskName,
                                subtaskSubtext: sub.subtext,
                                category: group.category,
                                categoryId: group.categoryId,
                                press: group.press,
                                pressId: group.pressId,
                                nextMaintenance: expected,
                                updated: new Date().toISOString()
                            } as any;

                            updates.push(updateTask(taskToUpdate, false));
                            count++;
                        }
                    }
                }
            }

            if (updates.length > 0) {
                await Promise.all(updates);
                await fetchTasks();
                toast.success(`${count} datums succesvol hersteld.`);
            } else {
                toast.info('Geen datums hoeven te worden aangepast.');
            }

        } catch (e: any) {
            console.error(e);
            toast.error(`Fout bij herstel: ${e.message}`);
        } finally {
            setIsRecalculating(false);
        }
    };

    return (
        <div className="space-y-6">
            <Tabs defaultValue="settings" className="w-full">
                <TabsList className="tab-pill-list mb-6">
                    <TabsTrigger value="settings" className="tab-pill-trigger">Systeem Instellingen</TabsTrigger>
                    <TabsTrigger value="import" className="tab-pill-trigger">Import Wizard</TabsTrigger>
                    <TabsTrigger value="fixes" className="tab-pill-trigger">Database Fixes</TabsTrigger>
                    <TabsTrigger value="backup" className="tab-pill-trigger">Backup & Restore</TabsTrigger>
                </TabsList>

                <TabsContent value="settings" className="space-y-6">
                    <Card className="border-blue-200 bg-blue-50/30">
                        <CardHeader>
                            <CardTitle className="text-blue-800">Test Modus</CardTitle>
                            <CardDescription className="text-blue-700">
                                Beheer globale applicatie instellingen voor ontwikkeling en testen.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-blue-100 shadow-sm">
                                <div className="space-y-1">
                                    <h3 className="font-bold text-gray-900">Snelle Login Knoppen</h3>
                                    <p className="text-sm text-gray-600">
                                        Wanneer ingeschakeld, worden alle geregistreerde accounts als knoppen getoond op de inlogpagina voor snelle toegang.
                                    </p>
                                </div>
                                <Switch
                                    checked={testingMode}
                                    onCheckedChange={setTestingMode}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="import" className="space-y-6">
                    <ImportTool onComplete={onNavigateHome} />
                </TabsContent>

                <TabsContent value="fixes" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Datum Correctie</CardTitle>
                            <CardDescription>
                                Herbereken alle geplande datums op basis van het interval en de laatste onderhoudsdatum.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="p-4 bg-orange-50 border border-orange-100 rounded-lg mb-4">
                                <p className="text-sm text-orange-800 font-medium">
                                    Gebruik dit hulpmiddel als geïmporteerde taken onjuiste "Volgende Datum" waarden hebben gekregen.
                                </p>
                            </div>
                            <Button
                                onClick={handleRecalculateDates}
                                disabled={isRecalculating}
                                variant="outline"
                                className="border-orange-200 text-orange-700 hover:bg-orange-50 hover:text-orange-800"
                            >
                                {isRecalculating ? 'Bezig met herberekenen...' : 'Herbereken Alle Datums'}
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="backup" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Backup & Restore</CardTitle>
                            <CardDescription>Exporteer de volledige database of herstel een eerdere backup.</CardDescription>
                        </CardHeader>
                        <CardContent className="py-12 text-center text-gray-500">
                            <div className="flex flex-col items-center gap-2">
                                <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                </svg>
                                <p className="font-medium">Backup functionaliteit komt binnenkort beschikbaar.</p>
                                <p className="text-xs">Gebruik tot die tijd de PocketBase admin interface voor backups.</p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
