import { useState, useMemo, useCallback, useEffect } from 'react';
import { MaintenanceTask, pb, Category, Press } from './AuthContext';
import { useAuth, PressType } from './AuthContext';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Clock, FileText, ChevronRight, Download, Loader2, ClipboardCheck } from 'lucide-react';
import { Checkbox } from './ui/checkbox';
import { Textarea } from './ui/textarea';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import { formatNumber } from '../utils/formatNumber';
import { PDFViewer, PDFDownloadLink } from '@react-pdf/renderer';
import { ChecklistPDF, ChecklistTask } from './pdf/ChecklistPDF';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from './ui/card';
import { Input } from './ui/input';
import { cn } from './ui/utils';

interface MaintenanceChecklistProps {
  tasks?: MaintenanceTask[];
  presses?: Press[];
  categories?: Category[];
}

export function MaintenanceChecklist({ tasks: initialTasks, presses: initialPresses, categories: initialCategories }: MaintenanceChecklistProps) {
  const { } = useAuth();
  const [tasks, setTasks] = useState<MaintenanceTask[]>(initialTasks || []);
  const [presses, setPresses] = useState<Press[]>(initialPresses || []);
  const [categories, setCategories] = useState<Category[]>(initialCategories || []);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (initialTasks) setTasks(initialTasks);
  }, [initialTasks]);

  useEffect(() => {
    if (initialPresses) setPresses(initialPresses);
  }, [initialPresses]);

  useEffect(() => {
    if (initialCategories) setCategories(initialCategories);
  }, [initialCategories]);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [records, pressRecords, catRecords] = await Promise.all([
        pb.collection('onderhoud').getFullList({
          sort: 'sort_order,created',
          expand: 'category,pers,assigned_operator,assigned_team,tags',
        }),
        pb.collection('persen').getFullList(),
        pb.collection('categorieen').getFullList()
      ]);

      setPresses(pressRecords.map((r: any) => ({
        id: r.id,
        name: r.naam,
        active: r.active !== false,
        archived: r.archived === true
      })));

      setCategories(catRecords.map((r: any) => ({
        id: r.id,
        name: r.naam,
        pressIds: Array.isArray(r.pers_ids) ? r.pers_ids : [],
        active: r.active !== false,
        subtexts: typeof r.subtexts === 'object' ? r.subtexts : {}
      })));

      const flattened: MaintenanceTask[] = records.map((record: any) => {
        const categoryName = record.expand?.category?.naam || 'Uncategorized';
        const pressName = record.expand?.pers?.naam || 'Unknown';

        return {
          id: record.id,
          task: record.task,
          subtaskName: record.subtask,
          taskSubtext: record.task_subtext,
          subtaskSubtext: record.subtask_subtext,
          category: categoryName,
          categoryId: record.category,
          press: pressName,
          pressId: record.pers,
          lastMaintenance: record.last_date ? new Date(record.last_date) : null,
          nextMaintenance: record.next_date ? new Date(record.next_date) : new Date(),
          maintenanceInterval: record.interval,
          maintenanceIntervalUnit: record.interval_unit === 'Dagen' ? 'days' :
            record.interval_unit === 'Weken' ? 'weeks' :
              record.interval_unit === 'Maanden' ? 'months' :
                record.interval_unit === 'Jaren' ? 'years' : 'days',
          assignedTo: [
            ...(record.expand?.assigned_operator?.map((o: any) => o.naam) || []),
            ...(record.expand?.assigned_team?.map((t: any) => t.name) || [])
          ].join(', '),
          opmerkingen: record.opmerkingen || '',
          comment: record.comment || '',
          commentDate: record.commentDate ? new Date(record.commentDate) : null,
          sort_order: record.sort_order || 0,
          isExternal: record.is_external || false,
          tagIds: record.tags || [],
          created: record.created,
          updated: record.updated
        };
      });

      setTasks(flattened);
    } catch (e) {
      console.error("Failed to fetch data in MaintenanceChecklist", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initialTasks || !initialPresses || !initialCategories) {
      fetchData();
    }
  }, [fetchData, initialTasks, initialPresses, initialCategories]);

  const [selectedPress, setSelectedPress] = useState<PressType | ''>('');
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]); // State for task IDs to print
  const [supervisorGuidance, setSupervisorGuidance] = useState(''); // New state for supervisor guidance
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [fontSize, setFontSize] = useState(9);
  const [marginH, setMarginH] = useState(30);
  const [marginV, setMarginV] = useState(10);

  const today = useMemo(() => {
    const d = new Date();
    // Normalize to start of day for accurate overdue check
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }, []);

  const formatDate = (date: Date | null): string => {
    if (!date) return 'N.v.t.';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}/${month}/${day}`;
  };

  const activePresses = presses.filter(p => p.active && !p.archived);

  // Helper to get subtext for the current press and category
  const getCategorySubtext = (categoryName: string) => {
    if (!selectedPress) return null;
    const press = activePresses.find(p => p.name === selectedPress);
    if (!press) return null;

    const category = categories.find(c => c.name === categoryName);
    return category?.subtexts?.[press.id] || null;
  };

  // Tasks for the currently selected press (unfiltered)
  const allPressTasks = selectedPress
    ? tasks.filter(task => task.press === selectedPress)
    : [];

  const isTaskOverdue = (task: MaintenanceTask): boolean => {
    if (!task.nextMaintenance) return false;
    const nextDue = new Date(task.nextMaintenance);
    // Use the start of the day for comparison
    const nextDueStart = new Date(nextDue.getFullYear(), nextDue.getMonth(), nextDue.getDate());
    return nextDueStart < today;
  };

  const handleAddAllOverdue = () => {
    const overdueIds = allPressTasks
      .filter(isTaskOverdue)
      .map(task => task.id);
    // Merge new overdue tasks, preventing duplicates
    setSelectedTasks(prev => [...new Set([...prev, ...overdueIds])]);
  };

  const handleToggleTask = (taskId: string, isChecked: boolean) => {
    setSelectedTasks(prev =>
      isChecked ? [...prev, taskId] : prev.filter(id => id !== taskId)
    );
  };

  const handleToggleCategory = (category: string, isChecked: boolean) => {
    const categoryTaskIds = allTasksGrouped[category].map(t => t.id);
    setSelectedTasks(prev => {
      if (isChecked) {
        return [...new Set([...prev, ...categoryTaskIds])];
      } else {
        return prev.filter(id => !categoryTaskIds.includes(id));
      }
    });
  };

  // Group ALL tasks for the UI list
  const allTasksGrouped = allPressTasks.reduce((acc, task) => {
    if (!acc[task.category]) {
      acc[task.category] = [];
    }
    acc[task.category].push(task);
    return acc;
  }, {} as Record<string, MaintenanceTask[]>);

  const allCategories = Object.keys(allTasksGrouped).sort();

  // Selected tasks mapped for PDF
  const checklistPdfTasks: ChecklistTask[] = allPressTasks
    .filter(task => selectedTasks.includes(task.id))
    .map(task => ({
      id: task.id,
      task: task.task,
      subtaskName: task.subtaskName,
      taskSubtext: task.taskSubtext,
      subtaskSubtext: task.subtaskSubtext,
      category: task.category,
      nextMaintenance: task.nextMaintenance,
      lastMaintenance: task.lastMaintenance,
      opmerkingen: task.opmerkingen,
      isOverdue: isTaskOverdue(task)
    }));

  // Subtexts mapped for PDF
  const pdfCategorySubtexts = Object.fromEntries(
    allCategories.map(cat => [cat, getCategorySubtext(cat)])
  );


  return (
    <div className="w-full h-full mx-auto flex flex-col gap-6 overflow-hidden">
      {isLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/50 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
            <p className="font-medium text-indigo-900 text-lg">Laden...</p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between shrink-0">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <ClipboardCheck className="w-6 h-6 text-indigo-600" /> Checklist Genereren
        </h1>
      </div>

      <div className="flex flex-row gap-6 items-start w-full h-[calc(100vh-170px)]">
        {/* Left Panel - Configuration */}
        <div className="flex-1 min-w-[400px] h-full">
          <Card className="flex flex-col h-full border-indigo-100 shadow-sm overflow-hidden flex-1 shrink-0">
            <CardHeader className="pb-4 shrink-0">
              <CardTitle className="text-base">Checklist Informatie</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 flex-1 overflow-y-auto min-h-0 custom-scrollbar pb-6 pr-4">
              <div className="space-y-3">
                <Label className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">Pers Selecteren</Label>
                <div className="flex flex-wrap gap-2">
                  {activePresses.filter(p => p.name && p.name.trim() !== '').map((press) => (
                    <Button
                      key={press.id}
                      variant={selectedPress === press.name ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setSelectedPress(press.name as PressType);
                        setSelectedTasks([]); // Clear selection when press changes
                      }}
                      className={cn(
                        "rounded-full px-4 h-8 text-xs transition-all",
                        selectedPress === press.name ? "bg-indigo-600 border-indigo-600 shadow-sm" : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      )}
                    >
                      {press.name}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <Label htmlFor="supervisor-guidance" className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">Instructies / Opmerkingen</Label>
                <Textarea
                  id="supervisor-guidance"
                  placeholder="Voeg specifieke instructies, waarschuwingen of begeleiding toe voor de operator..."
                  value={supervisorGuidance}
                  onChange={(e) => setSupervisorGuidance(e.target.value)}
                  rows={2}
                  className="resize-none"
                />
              </div>

              {selectedPress ? (
                <div className="space-y-3 pt-4 border-t">
                  <div className="flex justify-between items-center mb-2">
                    <Label className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">Selecteer Taken</Label>
                    <Button
                      variant="outline"
                      onClick={handleAddAllOverdue}
                      className="gap-1.5 h-7 text-[10px] px-2"
                      title="Voeg alle taken toe waarvan de volgende datum in het verleden ligt."
                    >
                      <Clock className="w-3 h-3" />
                      Alle Achterstallige (+{allPressTasks.filter(isTaskOverdue).filter(t => !selectedTasks.includes(t.id)).length})
                    </Button>
                  </div>

                  <Accordion type="multiple" className="w-full">
                    {allCategories.map((category) => {
                      const categoryTasks = allTasksGrouped[category];
                      const overdueCount = categoryTasks.filter(isTaskOverdue).length;
                      const allSelectedInCategory = categoryTasks.every(t => selectedTasks.includes(t.id));
                      const someSelectedInCategory = categoryTasks.some(t => selectedTasks.includes(t.id)) && !allSelectedInCategory;

                      return (
                        <AccordionItem key={category} value={category} className="border border-slate-200 rounded-lg mb-2 overflow-hidden px-1">
                          <AccordionTrigger className="font-bold py-2 px-3 hover:no-underline hover:bg-slate-50 [&[data-state=open]]:bg-slate-50 rounded-md transition-colors">
                            <div className="flex justify-between w-full items-center mr-2">
                              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                <Checkbox
                                  checked={allSelectedInCategory ? true : someSelectedInCategory ? "indeterminate" : false}
                                  onCheckedChange={(c) => handleToggleCategory(category, c === true)}
                                />
                                <span className="text-sm">{category}</span>
                                <span className="text-slate-400 font-normal text-xs">({formatNumber(categoryTasks.length)})</span>
                              </div>
                              {overdueCount > 0 && (
                                <Badge variant="outline" className="bg-red-50 text-red-600 border-transparent text-[9px] px-1.5 h-4 ml-4 font-bold flex gap-1 items-center">
                                  {formatNumber(overdueCount)} Te laat
                                </Badge>
                              )}
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="pb-2 px-3">
                            <div className="space-y-1.5 pt-2">
                              {categoryTasks.map((task) => (
                                <div key={task.id} className={cn(
                                  "flex items-start justify-between p-2 border rounded-md transition-colors",
                                  selectedTasks.includes(task.id) ? "bg-indigo-50/50 border-indigo-100" : "hover:bg-slate-50 border-transparent"
                                )}>
                                  <div className="flex items-start gap-2.5">
                                    <Checkbox
                                      id={`task-${task.id}`}
                                      checked={selectedTasks.includes(task.id)}
                                      onCheckedChange={(checked) => handleToggleTask(task.id, Boolean(checked))}
                                      className="mt-0.5"
                                    />
                                    <Label htmlFor={`task-${task.id}`} className="cursor-pointer space-y-0.5 font-normal flex flex-col pt-0.5">
                                      <span className="font-medium text-slate-700 text-xs">
                                        {task.subtaskName && task.subtaskName !== task.task
                                          ? `${task.task} -> ${task.subtaskName}`
                                          : task.task}
                                      </span>
                                      {(task.subtaskName && task.subtaskName !== task.task ? task.subtaskSubtext || task.taskSubtext : task.taskSubtext) && (
                                        <span className="text-[10px] text-slate-500 line-clamp-1 pr-2">
                                          {task.subtaskName && task.subtaskName !== task.task ? task.subtaskSubtext || task.taskSubtext : task.taskSubtext}
                                        </span>
                                      )}
                                    </Label>
                                  </div>
                                  <div className={`text-right text-[10px] whitespace-nowrap pt-0.5 font-medium shrink-0 ${isTaskOverdue(task) ? 'text-red-500' : 'text-slate-400'}`}>
                                    {isTaskOverdue(task) && <span className="font-bold mr-1 uppercase tracking-wider">Te Laat</span>}
                                    {formatDate(task.nextMaintenance)}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>
                </div>
              ) : (
                <div className="pt-4 flex flex-col items-center justify-center p-8 text-center border-t border-dashed h-40">
                  <Factory className="w-10 h-10 text-slate-200 mb-2" />
                  <p className="text-sm text-slate-500">Selecteer eerst een pers om taken te kiezen</p>
                </div>
              )}

              <div className="pt-4 border-t mt-4">
                <Button variant="ghost" size="sm" onClick={() => setIsAdvancedOpen(!isAdvancedOpen)} className="w-full justify-between h-8 text-[10px] font-bold uppercase text-slate-400">
                  <span>Extra PDF Opties</span>
                  <ChevronRight className={cn("w-3 h-3 transition-transform", isAdvancedOpen && "rotate-90")} />
                </Button>
                {isAdvancedOpen && (
                  <div className="grid grid-cols-3 gap-2 mt-2 p-2 bg-slate-50 rounded border animate-in fade-in duration-200">
                    <div className="space-y-1"><Label className="text-[9px] uppercase">Font</Label><Input type="number" value={fontSize} onChange={e => setFontSize(Number(e.target.value))} className="h-7 text-[10px]" /></div>
                    <div className="space-y-1"><Label className="text-[9px] uppercase">Marge H</Label><Input type="number" value={marginH} onChange={e => setMarginH(Number(e.target.value))} className="h-7 text-[10px]" /></div>
                    <div className="space-y-1"><Label className="text-[9px] uppercase">Marge V</Label><Input type="number" value={marginV} onChange={e => setMarginV(Number(e.target.value))} className="h-7 text-[10px]" /></div>
                  </div>
                )}
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-2 pt-4 border-t bg-slate-50/50 shrink-0">
              {selectedPress && checklistPdfTasks.length > 0 ? (
                <PDFDownloadLink
                  document={
                    <ChecklistPDF
                      pressName={selectedPress}
                      tasks={checklistPdfTasks}
                      supervisorGuidance={supervisorGuidance}
                      categorySubtexts={pdfCategorySubtexts}
                      fontSize={fontSize}
                      marginH={marginH}
                      marginV={marginV}
                    />
                  }
                  fileName={`checklist-${selectedPress.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.pdf`}
                  className="w-full"
                >
                  {({ loading }) => (
                    <Button className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-2" disabled={loading}>
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                      {loading ? 'Document genereren...' : `Download PDF (${checklistPdfTasks.length} taken)`}
                    </Button>
                  )}
                </PDFDownloadLink>
              ) : (
                <Button disabled className="w-full h-10 font-bold gap-2">
                  <Download className="w-4 h-4" /> Download PDF
                </Button>
              )}
            </CardFooter>
          </Card>
        </div>

        {/* Right Panel - Live Preview */}
        <div className="h-full shrink-0 flex justify-center bg-transparent">
          <div className="relative h-full bg-slate-100 rounded-xl border border-indigo-100 overflow-hidden shadow-sm flex items-center justify-center" style={{ aspectRatio: '1 / 1.414' }}>
            {selectedPress && checklistPdfTasks.length > 0 ? (
              <PDFViewer width="100%" height="100%" className="border-none">
                <ChecklistPDF
                  pressName={selectedPress}
                  tasks={checklistPdfTasks}
                  supervisorGuidance={supervisorGuidance}
                  categorySubtexts={pdfCategorySubtexts}
                  fontSize={fontSize}
                  marginH={marginH}
                  marginV={marginV}
                />
              </PDFViewer>
            ) : (
              <div className="text-center p-8">
                <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-400 font-medium">Selecteer een pers en ten minste één taak om de preview te bekijken.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Ensure Factory is imported
import { Factory } from 'lucide-react';
import { Badge } from './ui/badge';