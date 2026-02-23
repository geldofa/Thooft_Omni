import { useState, useEffect, useCallback } from 'react';
import { MaintenanceTask, Press, pb } from './AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card } from './ui/card';
import { PageHeader } from './PageHeader';
import { MaintenanceReportManagerV2 } from './MaintenanceReportManagerV2';
import { AllExportsDialog } from './AllExportsDialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
} from './ui/table';
import {
  FileText,
  Archive,
  Plus,
  Clock,
  Pause,
  Play,
  Settings,
  Download,
  CalendarDays,
  Zap,
  BarChart3,
  AlertTriangle,
  Eye,
} from 'lucide-react';

// ─── Real Data Interfaces ──────────────────────────────────

interface MaintenanceReport {
  id: string;
  name: string;
  press_ids: string[];
  period: 'day' | 'week' | 'month' | 'year';
  auto_generate: boolean;
  schedule_day?: number;
  last_run?: string;
  email_enabled: boolean;
  email_recipients: string;
  email_subject: string;
  is_rolling: boolean;
  period_offset: number;
  schedule_hour?: number;
  schedule_weekdays?: string[];
  schedule_month_type?: string;
  custom_date?: string;
}

interface GeneratedReport {
  id: string;
  name: string;
  configName: string;
  createdAt: string;
  file: string;
  generated_at?: string;
  created?: string;
  expand?: {
    maintenance_report?: {
      name: string;
    };
  };
}

// ─── Helpers ────────────────────────────────────────────────

const FREQ_LABELS: Record<string, string> = {
  day: 'Dagelijks',
  week: 'Wekelijks',
  month: 'Maandelijks',
  year: 'Jaarlijks',
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString('nl-NL', { day: '2-digit', month: 'short', year: 'numeric' });
  const time = d.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${date} ${time}`;
}

function getBadgeStyle(configName: string): React.CSSProperties {
  if (configName === 'Manueel') {
    return { backgroundColor: '#ede9fe', color: '#6d28d9', borderColor: '#ddd6fe' };
  }
  if (configName.toLowerCase().includes('week')) {
    return { backgroundColor: '#dbeafe', color: '#1d4ed8', borderColor: '#bfdbfe' };
  }
  if (configName.toLowerCase().includes('maand')) {
    return { backgroundColor: '#d1fae5', color: '#047857', borderColor: '#a7f3d0' };
  }
  if (configName.toLowerCase().includes('jaar')) {
    return { backgroundColor: '#fef3c7', color: '#b45309', borderColor: '#fde68a' };
  }
  return { backgroundColor: '#f3f4f6', color: '#374151', borderColor: '#e5e7eb' };
}

// ─── Component ──────────────────────────────────────────────

interface ReportsProps {
  tasks?: MaintenanceTask[];
  presses?: Press[];
}

export function Reports({ tasks = [] }: ReportsProps) {
  const navigate = useNavigate();
  const [manualDialogOpen, setManualDialogOpen] = useState(false);
  const [allExportsOpen, setAllExportsOpen] = useState(false);
  const [configDialogOpen, setConfigDialogOpen] = useState<MaintenanceReport | null>(null);
  const [configs, setConfigs] = useState<MaintenanceReport[]>([]);
  const [presses, setPresses] = useState<Press[]>([]);
  const [generatedReports, setGeneratedReports] = useState<GeneratedReport[]>([]);
  const [selectedConfigId, setSelectedConfigId] = useState<string | null>('new');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoadingReports, setIsLoadingReports] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setIsLoadingReports(true);
      const [reportsData, pressesData, filesData] = await Promise.all([
        pb.collection('maintenance_reports').getFullList<MaintenanceReport>(),
        pb.collection('persen').getFullList({ sort: 'naam' }),
        pb.collection('report_files').getList<GeneratedReport>(1, 10, {
          sort: '-generated_at',
          expand: 'maintenance_report'
        })
      ]);

      setConfigs(reportsData);
      setPresses(pressesData.map((p: any) => ({
        id: p.id,
        name: p.naam,
        active: p.active,
        archived: p.archived,
        category_order: p.category_order
      })));

      setGeneratedReports(filesData.items.map(item => ({
        ...item,
        name: item.file,
        configName: item.expand?.maintenance_report?.name || 'Manueel',
        createdAt: item.generated_at || item.created || '',
      })));
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoadingReports(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getPressName = (report: MaintenanceReport) => {
    if (!report.press_ids || !Array.isArray(report.press_ids) || report.press_ids.length === 0) return 'Alle persen';
    const names = report.press_ids.map(id => presses.find(p => p.id === id)?.name).filter(Boolean);
    if (names.length === 0) return 'Alle persen';
    if (names.length > 2) return `${names[0]}, ${names[1]} +${names.length - 2}`;
    return names.join(', ');
  };

  // Count due tasks for the quick-export button
  const dueTasks = tasks.filter(t => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(t.nextMaintenance) < today;
  });

  const handleCloseConfigDialog = () => {
    setConfigDialogOpen(null);
  };

  return (
    <div className="w-full h-full mx-auto flex flex-col gap-6 overflow-hidden pb-4">
      {/* ─── Header ───────────────────────────────────────── */}
      <PageHeader
        title="Rapport Beheer"
        description="Beheer automatische en handmatige onderhoudsrapportages"
        icon={BarChart3}
        iconColor="text-blue-600"
        iconBgColor="bg-blue-50"
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setAllExportsOpen(true)}
              className="gap-2 shrink-0 bg-white"
            >
              <Archive className="w-4 h-4" />
              Alle Exports
            </Button>
          </div>
        }
        className="mb-0 shrink-0"
      />

      {/* ─── Top Section: Config Cards ────────────────────── */}
      <div className="shrink-0 flex flex-col min-h-0">
        <div className="flex items-center gap-2 mb-3 shrink-0">
          <Settings className="w-4 h-4" style={{ color: '#9ca3af' }} />
          <h2 style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Rapport Configuraties
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 overflow-y-auto pb-2 min-h-[140px]">
          {/* ── New Export Card ── */}
          <Card
            className="overflow-hidden cursor-pointer group"
            style={{
              position: 'relative',
              border: 'none',
              transition: 'all 0.3s',
              minHeight: '140px',
            }}
            onClick={() => setManualDialogOpen(true)}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(135deg, #6366f1, #2563eb, #7c3aed)',
                opacity: 0.9,
              }}
            />
            <div style={{ position: 'relative', padding: '1.25rem', color: 'white' }}>
              <div className="flex items-start justify-between mb-4">
                <div style={{ padding: '0.5rem', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '0.5rem' }}>
                  <Plus className="w-4 h-4" style={{ width: '1.25rem', height: '1.25rem' }} />
                </div>
              </div>
              <h3 style={{ fontWeight: 700, fontSize: '1.125rem', marginBottom: '0.25rem' }}>Nieuwe Export</h3>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem' }}>
                Genereer direct een rapport of gebruik een bestaande configuratie
              </p>
            </div>
          </Card>

          {/* ── Auto Config Cards ── */}
          {configs.map((config) => (
            <Card
              key={config.id}
              className="cursor-pointer group"
              style={{
                borderLeft: `4px solid ${config.auto_generate ? '#3b82f6' : '#d1d5db'}`,
                transition: 'all 0.3s',
              }}
              onClick={() => { setConfigDialogOpen(config); }}
            >
              <div className="p-4" style={{ padding: '1.25rem' }}>
                <div className="flex items-start justify-between mb-3">
                  <div
                    className="rounded-lg"
                    style={{
                      padding: '0.5rem',
                      backgroundColor: config.auto_generate ? '#eff6ff' : '#f9fafb',
                    }}
                  >
                    <CalendarDays
                      className="w-4 h-4"
                      style={{ color: config.auto_generate ? '#2563eb' : '#9ca3af' }}
                    />
                  </div>
                  <div className="flex gap-1" style={{ gap: '0.375rem' }}>
                    <Badge
                      variant="secondary"
                      style={{
                        fontSize: '10px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        fontWeight: 600,
                        backgroundColor: '#eff6ff',
                        color: '#1d4ed8',
                        borderColor: '#dbeafe',
                      }}
                    >
                      {FREQ_LABELS[config.period]}
                    </Badge>
                    {config.auto_generate ? (
                      <Badge
                        variant="secondary"
                        style={{
                          fontSize: '10px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          fontWeight: 600,
                          backgroundColor: '#ecfdf5',
                          color: '#047857',
                          borderColor: '#d1fae5',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                        }}
                      >
                        <Play style={{ width: '0.625rem', height: '0.625rem', fill: 'currentColor' }} />
                        Actief
                      </Badge>
                    ) : (
                      <Badge
                        variant="secondary"
                        style={{
                          fontSize: '10px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          fontWeight: 600,
                          backgroundColor: '#fffbeb',
                          color: '#b45309',
                          borderColor: '#fef3c7',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                        }}
                      >
                        <Pause style={{ width: '0.625rem', height: '0.625rem' }} />
                        Gepauzeerd
                      </Badge>
                    )}
                  </div>
                </div>
                <h3 style={{ fontWeight: 600, color: '#111827', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                  {config.name}
                </h3>
                <p style={{ fontSize: '0.75rem', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Zap style={{ width: '0.75rem', height: '0.75rem' }} />
                  {getPressName(config)}
                </p>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* ─── Bottom Section: Generated Reports ────────────── */}
      <div className="flex-1 min-h-0 flex flex-col">
        <div className="flex items-center justify-between mb-3 shrink-0">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4" style={{ color: '#9ca3af' }} />
            <h2 style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Laatste {generatedReports.length} Rapporten
            </h2>
          </div>
          <Button variant="link" size="sm" className="text-xs text-blue-600 p-0 h-auto" onClick={() => setAllExportsOpen(true)}>
            Bekijk volledige historie
          </Button>
        </div>

        <Card className="flex-1 overflow-auto border flex flex-col">
          {isLoadingReports ? (
            <div className="flex flex-col items-center justify-center p-12 text-gray-400">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent mb-2" />
              <p className="text-[10px] uppercase font-bold tracking-widest">Laden...</p>
            </div>
          ) : (
            <Table className="relative min-w-full">
              <TableHeader className="sticky top-0 bg-gray-50/95 backdrop-blur-sm z-10 shadow-sm">
                <TableRow style={{ backgroundColor: '#f9fafb' }}>
                  <TableHead style={{ width: '180px', fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', borderRight: 'none' }}>Bron</TableHead>
                  <TableHead style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', borderRight: 'none' }}>Rapport</TableHead>
                  <TableHead style={{ width: '180px', fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', borderRight: 'none' }}>Aangemaakt</TableHead>
                  <TableHead style={{ width: '80px', fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right', borderRight: 'none' }}>Actie</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {generatedReports.map((report, idx) => (
                  <TableRow key={report.id} style={{ backgroundColor: idx % 2 === 0 ? 'white' : '#fafafa' }}>
                    <td className="p-2" style={{ borderRight: 'none' }}>
                      <Badge
                        variant="secondary"
                        style={{
                          fontSize: '10px',
                          fontWeight: 600,
                          ...getBadgeStyle(report.configName),
                        }}
                      >
                        {report.configName}
                      </Badge>
                    </td>
                    <td className="p-2" style={{ fontWeight: 500, color: '#111827', fontSize: '0.875rem', borderRight: 'none' }}>
                      <div className="flex items-center gap-2">
                        <FileText style={{ width: '0.875rem', height: '0.875rem', color: '#d1d5db', flexShrink: 0 }} />
                        {report.name}
                      </div>
                    </td>
                    <td className="p-2" style={{ color: '#6b7280', fontSize: '0.75rem', borderRight: 'none' }}>
                      <div className="flex items-center gap-1" style={{ gap: '0.375rem' }}>
                        <Clock style={{ width: '0.75rem', height: '0.75rem', color: '#d1d5db' }} />
                        {formatDate(report.createdAt)}
                      </div>
                    </td>
                    <td className="p-2" style={{ textAlign: 'right', borderRight: 'none' }}>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          style={{ height: '1.75rem', width: '1.75rem', padding: 0, color: '#6b7280' }}
                          onClick={() => window.open(pb.files.getURL(report, report.file), '_blank')}
                        >
                          <Eye style={{ width: '0.875rem', height: '0.875rem' }} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          style={{ height: '1.75rem', width: '1.75rem', padding: 0, color: '#2563eb' }}
                          onClick={() => window.open(pb.files.getURL(report, report.file) + "?download=1", '_blank')}
                        >
                          <Download style={{ width: '0.875rem', height: '0.875rem' }} />
                        </Button>
                      </div>
                    </td>
                  </TableRow>
                ))}

                {generatedReports.length === 0 && (
                  <TableRow>
                    <td colSpan={4} className="p-2" style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af' }}>
                      <FileText style={{ width: '2.5rem', height: '2.5rem', margin: '0 auto 0.75rem', opacity: 0.2 }} />
                      <p style={{ fontWeight: 500 }}>Nog geen rapporten gegenereerd</p>
                    </td>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>

      {/* ─── New Export Dialog ────────────────────────────── */}
      <Dialog open={manualDialogOpen} onOpenChange={(open) => {
        setManualDialogOpen(open);
        if (!open) fetchData();
      }}>
        <DialogContent className="overflow-y-auto p-0" style={{ maxWidth: '64rem', width: '95vw', maxHeight: '90vh' }}>
          {previewUrl ? (
            <div style={{ display: 'flex', flexDirection: 'column', height: '80vh' }}>
              <div style={{ padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Rapport Voorbeeld</h3>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setPreviewUrl(null)}>
                    Terug
                  </Button>
                  <Button onClick={() => {
                    const link = document.createElement('a');
                    link.href = previewUrl + "?download=1";
                    link.download = ""; // Use original filename from server
                    document.body.appendChild(link);
                    link.click();
                    link.remove();
                    setPreviewUrl(null);
                    setManualDialogOpen(false);
                    navigate('/Rapport');
                  }} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
                    <Download className="w-4 h-4" />
                    Download & Terug
                  </Button>
                </div>
              </div>
              <iframe src={previewUrl} style={{ width: '100%', height: '100%', border: 'none' }} title="PDF Preview" />
            </div>
          ) : (
            <>
              <DialogHeader style={{ padding: '1.5rem 1.5rem 0' }}>
                <DialogTitle className="flex items-center gap-2" style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                  <div className="rounded-lg" style={{ padding: '0.375rem', backgroundColor: '#e0e7ff' }}>
                    <Plus className="w-4 h-4" style={{ color: '#4f46e5' }} />
                  </div>
                  Nieuwe Export
                </DialogTitle>
                <DialogDescription style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                  Exporteer alle openstaande taken of gebruik een bestaande configuratie
                </DialogDescription>
              </DialogHeader>

              {/* Quick actions bar */}
              <div style={{ padding: '0 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {/* Due tasks quick export card */}
                  <Card
                    className="cursor-pointer group"
                    style={{
                      borderLeft: `4px solid ${selectedConfigId === 'new' ? '#3b82f6' : (dueTasks.length > 0 ? '#ef4444' : '#d1d5db')}`,
                      transition: 'all 0.3s',
                    }}
                    onClick={() => setSelectedConfigId('new')}
                  >
                    <div className="p-4" style={{ padding: '1.25rem' }}>
                      <div className="flex items-start justify-between mb-3">
                        <div
                          className="rounded-lg"
                          style={{
                            padding: '0.5rem',
                            backgroundColor: selectedConfigId === 'new' ? '#eff6ff' : (dueTasks.length > 0 ? '#fef2f2' : '#f9fafb'),
                          }}
                        >
                          <AlertTriangle
                            className="w-4 h-4"
                            style={{ color: selectedConfigId === 'new' ? '#2563eb' : (dueTasks.length > 0 ? '#ef4444' : '#9ca3af') }}
                          />
                        </div>
                      </div>
                      <h3 style={{ fontWeight: 600, color: '#e03805ff', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                        Onderhoud nu nodig
                      </h3>
                      <p style={{ fontSize: '0.75rem', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Zap style={{ width: '0.75rem', height: '0.75rem' }} />
                        {dueTasks.length > 0
                          ? `${dueTasks.length} ${dueTasks.length === 1 ? 'taak' : 'taken'}`
                          : 'Geen taken'}
                      </p>
                    </div>
                  </Card>

                  {/* Existing configs quick-load cards */}
                  {configs.map(config => (
                    <Card
                      key={config.id}
                      className="cursor-pointer group"
                      style={{
                        borderLeft: `4px solid ${selectedConfigId === config.id ? '#3b82f6' : '#d1d5db'}`,
                        transition: 'all 0.3s',
                      }}
                      onClick={() => setSelectedConfigId(config.id)}
                    >
                      <div className="p-4" style={{ padding: '1.25rem' }}>
                        <div className="flex items-start justify-between mb-3">
                          <div
                            className="rounded-lg"
                            style={{
                              padding: '0.5rem',
                              backgroundColor: selectedConfigId === config.id ? '#eff6ff' : '#f9fafb',
                            }}
                          >
                            <CalendarDays
                              className="w-4 h-4"
                              style={{ color: selectedConfigId === config.id ? '#2563eb' : '#9ca3af' }}
                            />
                          </div>
                          <div className="flex gap-1" style={{ gap: '0.375rem' }}>
                            <Badge
                              variant="secondary"
                              style={{
                                fontSize: '10px',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                fontWeight: 600,
                                backgroundColor: '#eff6ff',
                                color: '#1d4ed8',
                                borderColor: '#dbeafe',
                              }}
                            >
                              {FREQ_LABELS[config.period]}
                            </Badge>
                          </div>
                        </div>
                        <h3 style={{ fontWeight: 600, color: '#111827', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                          {config.name}
                        </h3>
                        <p style={{ fontSize: '0.75rem', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Zap style={{ width: '0.75rem', height: '0.75rem' }} />
                          {getPressName(config)}
                        </p>
                      </div>
                    </Card>
                  ))}
                </div>

                <div style={{ borderTop: '1px solid #e5e7eb', marginTop: '0.5rem' }} />
              </div>

              <div style={{ padding: '0 1.5rem 1.5rem' }}>
                <MaintenanceReportManagerV2
                  key={selectedConfigId || 'new'}
                  configId={selectedConfigId || 'new'}
                  initialName={selectedConfigId === 'new' ? 'Onderhoud nu nodig' : undefined}
                  tasks={tasks}
                  presses={presses}
                  onPreviewReady={(url) => setPreviewUrl(url)}
                  onSave={() => {
                    fetchData();
                  }}
                  onCancel={() => setManualDialogOpen(false)}
                />
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── Config Edit Dialog ──────────────────────────── */}
      <Dialog open={!!configDialogOpen} onOpenChange={(open) => { if (!open) handleCloseConfigDialog(); }}>
        <DialogContent
          className="overflow-y-auto"
          style={{
            maxWidth: '64rem',
            width: '95vw',
            maxHeight: '90vh',
          }}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2" style={{ fontSize: '1.125rem', fontWeight: 700 }}>
              <div className="rounded-lg" style={{ padding: '0.375rem', backgroundColor: '#dbeafe' }}>
                <Settings className="w-4 h-4" style={{ color: '#2563eb' }} />
              </div>
              {configDialogOpen?.name || 'Configuratie'}
            </DialogTitle>
            <DialogDescription style={{ fontSize: '0.875rem', color: '#6b7280' }}>
              Pas de instellingen van deze rapportconfiguratie aan
            </DialogDescription>
          </DialogHeader>

          {/* ── Expanded editing view with MaintenanceReportManager ── */}
          {configDialogOpen && (
            <div>
              <MaintenanceReportManagerV2
                configId={configDialogOpen.id}
                tasks={tasks}
                presses={presses}
                onSave={() => {
                  fetchData();
                  handleCloseConfigDialog();
                }}
                onCancel={handleCloseConfigDialog}
                onDelete={() => {
                  fetchData();
                  handleCloseConfigDialog();
                }}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── All Exports History Dialog ───────────────────── */}
      <AllExportsDialog open={allExportsOpen} onOpenChange={setAllExportsOpen} />
    </div >
  );
}