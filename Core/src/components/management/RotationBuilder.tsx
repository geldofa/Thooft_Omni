import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent } from '../ui/card';
import { Alert, AlertTitle, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../ui/alert-dialog';
import { PageHeader } from '../layout/PageHeader';
import { toast } from 'sonner';
import {
  Plus,
  Save,
  Trash2,
  RefreshCw,
  AlertTriangle,
  ChevronRight,
  CalendarRange,
  Users,
  Calendar,
  Play,
} from 'lucide-react';
import { pb } from '../../lib/pocketbase';

// ─── Types ───────────────────────────────────────────────────────────────────

interface WeekAssignment {
  shift: string;       // e.g. "06-14"
  teamId: string;      // id of the team (from ploegen collection)
  pressId: string;     // id of the press (resolved from team or user-picked)
}

interface RotationPattern {
  id: string;
  name: string;
  weeks: number;
  pattern: Record<string, WeekAssignment[]>;
  startDate: string;   // ISO date string — when this rotation goes into effect
  startWeek: number;   // which week in the cycle is the "start" week (1-indexed)
  active: boolean;
}

// ─── Shift types ─────────────────────────────────────────────────────────────

const AVAILABLE_SHIFTS = [
  { value: '06-14', label: 'Ochtendploeg 08u - 06:00-14:00' },
  { value: '14-22', label: 'Middagploeg 08u - 14:00-22:00' },
  { value: '22-06', label: 'Nachtploeg 08u - 22:00-06:00' },
  { value: '06-18', label: 'Ochtendploeg 12u - 06:00-18:00' },
  { value: '18-06', label: 'Nachtploeg 12u - 18:00-06:00' },
];

// ─── DB types ────────────────────────────────────────────────────────────────

interface DBTeam {
  id: string;
  name: string;
  presses: string[];
}

interface DBPress {
  id: string;
  name: string;
}

// ─── Shift colours ───────────────────────────────────────────────────────────

const SHIFT_COLORS: Record<string, string> = {
  '06-14': '#3b82f6', // blue
  '14-22': '#22c55e', // green
  '22-06': '#a855f7', // purple
  '06-18': '#f59e0b', // amber
  '18-06': '#ec4899', // pink
};

function ShiftDot({ value }: { value: string }) {
  return (
    <div
      className="w-3 h-3 rounded-full shrink-0 ring-1 ring-black/10"
      style={{ backgroundColor: SHIFT_COLORS[value] ?? '#94a3b8' }}
    />
  );
}

// ─── Seed data ───────────────────────────────────────────────────────────────

const emptyAssignment = (colIdx: number = 0): WeekAssignment => {
  const shiftDefaults = ['06-14', '14-22', '22-06', '06-18', '18-06'];
  return {
    shift: shiftDefaults[colIdx] ?? AVAILABLE_SHIFTS[0].value,
    teamId: '',
    pressId: '',
  };
};

// ─── Component ───────────────────────────────────────────────────────────────

export function RotationBuilder() {
  const [patterns, setPatterns] = useState<RotationPattern[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [_loading, setLoading] = useState(true);

  // Real teams & presses from DB
  const [teams, setTeams] = useState<DBTeam[]>([]);
  const [presses, setPresses] = useState<DBPress[]>([]);

  // Editor form state
  const [editorName, setEditorName] = useState('');
  const [editorWeeks, setEditorWeeks] = useState(1);
  const [editorCols, setEditorCols] = useState(1);
  const [editorPattern, setEditorPattern] = useState<Record<string, WeekAssignment[]>>({});
  const [editorStartDate, setEditorStartDate] = useState('');
  const [editorStartWeek, setEditorStartWeek] = useState(1);
  const [editorActive, setEditorActive] = useState(true);
  const [isDirty, setIsDirty] = useState(false);

  const [pressPickerOpen, setPressPickerOpen] = useState(false);
  const [pressPickerWeek, setPressPickerWeek] = useState('');
  const [pressPickerCol, setPressPickerCol] = useState(0);
  const [pressPickerTeam, setPressPickerTeam] = useState<DBTeam | null>(null);

  // ── Load teams & presses from PocketBase ───────────────────────────────────
  useEffect(() => {
    async function fetchTeamsAndPresses() {
      try {
        const [ploegRecords, pressRecords] = await Promise.all([
          pb.collection('ploegen').getFullList({ sort: 'naam' }),
          pb.collection('persen').getFullList({ sort: 'naam' }),
        ]);
        setTeams(ploegRecords.map(r => ({
          id: r.id,
          name: r.naam,
          presses: r.presses || [],
        })));
        setPresses(pressRecords.map(r => ({
          id: r.id,
          name: r.naam,
        })));
      } catch (e) {
        console.error('Kon ploegen/persen niet laden:', e);
      }
    }
    fetchTeamsAndPresses();
  }, []);

  // ── Load patterns from PocketBase ─────────────────────────────────────────
  useEffect(() => {
    async function fetchPatterns() {
      try {
        const records = await pb.collection('rotation_patterns').getFullList({
          sort: 'naam',
        });
        const mapped: RotationPattern[] = records.map(r => {
          const patroonData = r.patroon || {};
          let parsedPattern = patroonData.weeks || patroonData;
          
          if (parsedPattern && typeof parsedPattern === 'object') {
            const newPattern: Record<string, WeekAssignment[]> = {};
            Object.keys(parsedPattern).forEach(k => {
              if (Array.isArray(parsedPattern[k])) {
                newPattern[k] = parsedPattern[k];
              } else {
                newPattern[k] = [parsedPattern[k]];
              }
            });
            parsedPattern = newPattern;
          }

          return {
            id: r.id,
            name: r.naam,
            weeks: r.weken,
            pattern: parsedPattern,
            startDate: r.start_datum ? r.start_datum.split('T')[0].split(' ')[0] : '',
            startWeek: patroonData.startWeek || 1,
            active: r.actief ?? false,
          };
        });
        setPatterns(mapped);
        if (mapped.length > 0) setSelectedId(mapped[0].id);
      } catch (error) {
        console.error('Kon rotatie-patronen niet laden:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchPatterns();
  }, []);

  // ── Sync editor with selected pattern ────────────────────────────────────
  useEffect(() => {
    const selected = patterns.find((p) => p.id === selectedId);
    if (selected) {
      setEditorName(selected.name);
      setEditorWeeks(selected.weeks);
      
      let maxCols = 1;
      if (selected.pattern) {
        Object.values(selected.pattern).forEach(arr => {
          if (arr.length > maxCols) maxCols = arr.length;
        });
      }
      setEditorCols(maxCols);
      
      // Ensure pattern has the correct width
      const syncedPattern = JSON.parse(JSON.stringify(selected.pattern));
      for (const k in syncedPattern) {
        while (syncedPattern[k].length < maxCols) {
          syncedPattern[k].push(emptyAssignment(syncedPattern[k].length));
        }
      }
      
      setEditorPattern(syncedPattern);
      setEditorStartDate(selected.startDate);
      setEditorStartWeek(selected.startWeek);
      setEditorActive(selected.active);
      setIsDirty(false);
    }
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleWeeksChange = (newWeeks: number) => {
    if (newWeeks < 1 || newWeeks > 12) return;
    setEditorWeeks(newWeeks);
    setIsDirty(true);

    setEditorPattern((prev) => {
      const next: Record<string, WeekAssignment[]> = {};
      for (let i = 1; i <= newWeeks; i++) {
        next[String(i)] = prev[String(i)] ?? Array(editorCols).fill(null).map((_, idx) => emptyAssignment(idx));
      }
      return next;
    });

    // Clamp startWeek if needed
    if (editorStartWeek > newWeeks) {
      setEditorStartWeek(newWeeks);
    }
  };

  const handleColsChange = (newCols: number) => {
    if (newCols < 1 || newCols > 5) return;
    setEditorCols(newCols);
    setIsDirty(true);

    setEditorPattern(prev => {
      const next = { ...prev };
      for (const k in next) {
        next[k] = [...next[k]];
        if (next[k].length < newCols) {
          while (next[k].length < newCols) next[k].push(emptyAssignment(next[k].length));
        } else if (next[k].length > newCols) {
          next[k] = next[k].slice(0, newCols);
        }
      }
      return next;
    });
  };

  const handleShiftChange = (weekNum: string, colIdx: number, shift: string) => {
    setEditorPattern((prev) => {
      const arr = [...prev[weekNum]];
      arr[colIdx] = { ...arr[colIdx], shift };
      return { ...prev, [weekNum]: arr };
    });
    setIsDirty(true);
  };

  const handleTeamChange = (weekNum: string, colIdx: number, teamId: string) => {
    const team = teams.find((t) => t.id === teamId);
    if (!team) {
      // Clearing team
      setEditorPattern((prev) => {
        const arr = [...prev[weekNum]];
        arr[colIdx] = { ...arr[colIdx], teamId: '', pressId: '' };
        return { ...prev, [weekNum]: arr };
      });
      setIsDirty(true);
      return;
    }

    if (team.presses.length === 1) {
      // Auto-resolve press
      const press = presses.find((p) => p.name === team.presses[0]);
      setEditorPattern((prev) => {
        const arr = [...prev[weekNum]];
        arr[colIdx] = { ...arr[colIdx], teamId, pressId: press?.id ?? '' };
        return { ...prev, [weekNum]: arr };
      });
      setIsDirty(true);
    } else {
      // Multiple presses — open picker
      setPressPickerWeek(weekNum);
      setPressPickerCol(colIdx);
      setPressPickerTeam(team);
      setPressPickerOpen(true);
    }
  };

  const handlePressSelected = (pressId: string) => {
    if (!pressPickerTeam) return;
    setEditorPattern((prev) => {
      const arr = [...prev[pressPickerWeek]];
      arr[pressPickerCol] = { ...arr[pressPickerCol], teamId: pressPickerTeam.id, pressId };
      return { ...prev, [pressPickerWeek]: arr };
    });
    setIsDirty(true);
    setPressPickerOpen(false);
    setPressPickerTeam(null);
    setPressPickerWeek('');
  };

  // ── CRUD handlers ────────────────────────────────────────────────────────

  const handleNew = async () => {
    try {
      const newPatternData = { '1': [emptyAssignment(0)] };
      const record = await pb.collection('rotation_patterns').create({
        naam: 'Nieuw Patroon',
        pers: '-',
        weken: 1,
        patroon: { startWeek: 1, weeks: newPatternData },
        start_datum: new Date().toISOString().split('T')[0] + ' 12:00:00.000Z',
        actief: false,
      });
      const newPattern: RotationPattern = {
        id: record.id,
        name: 'Nieuw Patroon',
        weeks: 1,
        pattern: newPatternData,
        startDate: new Date().toISOString().split('T')[0],
        startWeek: 1,
        active: false,
      };
      setPatterns((prev) => [...prev, newPattern]);
      setSelectedId(newPattern.id);
      toast.success('Nieuw patroon aangemaakt');
    } catch (e) {
      console.error(e);
      toast.error('Fout bij aanmaken patroon');
    }
  };

  const handleSave = async () => {
    if (!selectedId) return;
    if (!editorName.trim()) {
      toast.error('Voer a.u.b. een patroonnaam in');
      return;
    }

    try {
      await pb.collection('rotation_patterns').update(selectedId, {
        naam: editorName.trim(),
        weken: editorWeeks,
        patroon: { startWeek: editorStartWeek, weeks: JSON.parse(JSON.stringify(editorPattern)) },
        start_datum: editorStartDate + ' 12:00:00.000Z',
        actief: editorActive,
      });

      setPatterns((prev) =>
        prev.map((p) =>
          p.id === selectedId
            ? {
                ...p,
                name: editorName.trim(),
                weeks: editorWeeks,
                pattern: JSON.parse(JSON.stringify(editorPattern)),
                startDate: editorStartDate,
                startWeek: editorStartWeek,
                active: editorActive,
              }
            : p
        )
      );
      setIsDirty(false);
      toast.success(`Patroon "${editorName.trim()}" opgeslagen`);
    } catch (e) {
      console.error(e);
      toast.error('Fout bij opslaan patroon');
    }
  };

  const handleDelete = async (id: string) => {
    const toDelete = patterns.find((p) => p.id === id);
    try {
      await pb.collection('rotation_patterns').delete(id);
      setPatterns((prev) => prev.filter((p) => p.id !== id));
      if (selectedId === id) {
        const remaining = patterns.filter((p) => p.id !== id);
        setSelectedId(remaining.length > 0 ? remaining[0].id : null);
      }
      toast.success(`Patroon "${toDelete?.name}" verwijderd`);
    } catch (e) {
      console.error(e);
      toast.error('Fout bij verwijderen patroon');
    }
  };

  const selectedPattern = patterns.find((p) => p.id === selectedId);

  // ── Helper lookups ───────────────────────────────────────────────────────
  const getTeamName = (teamId: string) => teams.find((t) => t.id === teamId)?.name ?? '';
  const getPressName = (pressId: string) => presses.find((p) => p.id === pressId)?.name ?? '';

  // ═══════════════════════════════════════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div className="space-y-4">
      <PageHeader
        title="Rotatie Schema's"
        description="Definieer ploegen-rotatieschema's met team toewijzingen"
        icon={RefreshCw}
        iconColor="text-violet-600"
        iconBgColor="bg-violet-100"
        className="mb-2"
      />

      {/* Warning alert */}
      <Alert className="border-amber-200 bg-amber-50">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertTitle className="text-amber-900">Let op</AlertTitle>
        <AlertDescription className="text-amber-700">
          Het wijzigen van een bestaand patroon heeft geen effect op reeds gegenereerde weken in de kalender.
          Wijzigingen gelden enkel voor toekomstige generaties vanaf de ingestelde startdatum.
        </AlertDescription>
      </Alert>

      {/* Main stacked layout */}
      <div className="flex flex-col gap-6 min-h-[560px]">

        {/* ─── Top: Pattern list (Horizontal Cards) ───────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 rounded-t-xl">
            <h3 className="text-base font-bold text-gray-900">Patronen</h3>
            <Button size="sm" variant="outline" onClick={handleNew} className="gap-1.5 h-8 bg-white">
              <Plus className="w-4 h-4" />
              Nieuw Patroon
            </Button>
          </div>

          <div className="p-4 md:p-6 overflow-y-auto max-h-[500px]">
            {patterns.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center bg-gray-50/50 border border-dashed border-gray-200 rounded-xl">
                <CalendarRange className="w-8 h-8 text-gray-300 mb-2" />
                <p className="text-sm text-gray-500">Geen patronen.</p>
                <p className="text-xs text-gray-400 mt-1">Maak een nieuw patroon aan om te beginnen.</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-5">
                {patterns.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedId(p.id)}
                    className={`w-full text-left p-4 rounded-xl transition-all border ${
                      selectedId === p.id
                        ? 'bg-violet-50 border-violet-200 shadow-[0_2px_10px_-4px_rgba(139,92,246,0.2)] ring-1 ring-violet-50/50'
                        : 'bg-white hover:bg-gray-50 border-gray-200 hover:border-gray-300 hover:shadow-sm text-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <RefreshCw className={`w-4 h-4 shrink-0 ${
                          selectedId === p.id ? 'text-violet-500' : 'text-gray-400'
                        }`} />
                        <span className={`text-base font-bold truncate ${selectedId === p.id ? 'text-violet-900' : 'text-gray-700'}`}>
                          {p.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {p.active ? (
                          <Badge variant="outline" className="text-xs px-2 py-0.5 h-6 bg-green-50 text-green-700 border-green-200">
                            Actief
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs px-2 py-0.5 h-6 bg-gray-50 text-gray-400 border-gray-200">
                            Inactief
                          </Badge>
                        )}
                        <Badge
                          variant="outline"
                          className={`text-xs px-2 py-0.5 h-6 ${
                            selectedId === p.id
                              ? 'bg-violet-100 text-violet-700 border-violet-200'
                              : 'bg-gray-50 text-gray-500 border-gray-200'
                          }`}
                        >
                          {p.weeks}w
                        </Badge>
                        <ChevronRight className={`w-4 h-4 ml-2 transition-transform ${
                          selectedId === p.id
                            ? 'text-violet-400 translate-x-0'
                            : 'text-gray-300 -translate-x-0.5 group-hover:translate-x-0'
                        }`} />
                      </div>
                    </div>
                    {/* Mini preview row */}
                    <div className="flex flex-col gap-2.5 mt-4 ml-[26px]">
                      {Array.from({ length: p.weeks }, (_, i) => {
                        const assignments = p.pattern[String(i + 1)] || [];
                        return (
                          <div key={i} className="flex items-center gap-3 text-xs overflow-hidden">
                            <span className="text-gray-400 font-medium shrink-0 w-6">W{i+1}</span>
                            <div className="flex gap-3 flex-wrap border-l border-gray-200 pl-3">
                              {assignments.map((a, colIdx) => {
                                const teamName = getTeamName(a?.teamId ?? '');
                                return (
                                  <div key={colIdx} className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-md border border-gray-100 shadow-sm">
                                    <ShiftDot value={a?.shift ?? ''} />
                                    <span className="text-gray-600 font-medium truncate max-w-[80px]">
                                      {teamName ? teamName.split(' ').pop() : '-'}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ─── Right: Editor ──────────────────────────────────────────────── */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col">
          {!selectedPattern ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
              <CalendarRange className="w-10 h-10 text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">Geen patroon geselecteerd</p>
              <p className="text-sm text-gray-400 mt-1">
                Selecteer een patroon links, of maak een nieuw patroon aan.
              </p>
              <Button variant="outline" size="sm" onClick={handleNew} className="gap-1.5 mt-4">
                <Plus className="w-4 h-4" />
                Nieuw Patroon
              </Button>
            </div>
          ) : (
            <>
              {/* Editor header */}
              <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  Patroon Editor
                  {isDirty && (
                    <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200 text-[10px] px-1.5 py-0 h-5">
                      Onopgeslagen wijzigingen
                    </Badge>
                  )}
                </h3>
                <div className="flex items-center gap-2">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="gap-1.5 text-red-500 hover:text-red-600 hover:bg-red-50">
                        <Trash2 className="w-3.5 h-3.5" />
                        Verwijderen
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Patroon Verwijderen</AlertDialogTitle>
                        <AlertDialogDescription>
                          Weet u zeker dat u "{selectedPattern.name}" wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuleren</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(selectedPattern.id)}
                          className="bg-red-500 hover:bg-red-600"
                        >
                          Verwijderen
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  <Button size="sm" onClick={handleSave} className="gap-1.5" disabled={!isDirty}>
                    <Save className="w-3.5 h-3.5" />
                    Opslaan
                  </Button>
                </div>
              </div>

              {/* Editor content */}
              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                {/* Row 1: Name + Cycle length */}
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_160px_160px] gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="pattern-name">Patroon Naam</Label>
                    <Input
                      id="pattern-name"
                      placeholder="bijv. Vast 3-Ploegen Lithoman"
                      value={editorName}
                      onChange={(e) => {
                        setEditorName(e.target.value);
                        setIsDirty(true);
                      }}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="cycle-weeks">Cyclus Lengte (weken)</Label>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 shrink-0"
                        onClick={() => handleWeeksChange(editorWeeks - 1)}
                        disabled={editorWeeks <= 1}
                      >
                        −
                      </Button>
                      <Input
                        id="cycle-weeks"
                        type="text"
                        inputMode="numeric"
                        className="text-center font-semibold bg-white"
                        value={editorWeeks}
                        onChange={(e) => {
                          const v = parseInt(e.target.value, 10);
                          if (!isNaN(v)) handleWeeksChange(v);
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 shrink-0"
                        onClick={() => handleWeeksChange(editorWeeks + 1)}
                        disabled={editorWeeks >= 12}
                      >
                        +
                      </Button>
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="cycle-cols">Aantal Ploegen/Kolommen</Label>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 shrink-0"
                        onClick={() => handleColsChange(editorCols - 1)}
                        disabled={editorCols <= 1}
                      >
                        −
                      </Button>
                      <Input
                        id="cycle-cols"
                        type="text"
                        inputMode="numeric"
                        className="text-center font-semibold bg-white"
                        value={editorCols}
                        onChange={(e) => {
                          const v = parseInt(e.target.value, 10);
                          if (!isNaN(v)) handleColsChange(v);
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 shrink-0"
                        onClick={() => handleColsChange(editorCols + 1)}
                        disabled={editorCols >= 5}
                      >
                        +
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Row 2: Activation settings */}
                <div className="bg-slate-50 rounded-lg border border-slate-200 p-4 space-y-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="w-4 h-4 text-slate-500" />
                    <Label className="text-sm font-semibold text-slate-700">Activatie Instellingen</Label>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="start-date" className="text-xs text-slate-600">Startdatum</Label>
                      <Input
                        id="start-date"
                        type="date"
                        value={editorStartDate}
                        onChange={(e) => {
                          setEditorStartDate(e.target.value);
                          setIsDirty(true);
                        }}
                        className="bg-white"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="start-week" className="text-xs text-slate-600">Startweek in cyclus</Label>
                      <Select
                        value={String(editorStartWeek)}
                        onValueChange={(v) => {
                          setEditorStartWeek(parseInt(v, 10));
                          setIsDirty(true);
                        }}
                      >
                        <SelectTrigger className="bg-white h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: editorWeeks }, (_, i) => (
                            <SelectItem key={i + 1} value={String(i + 1)}>
                              Week {i + 1}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-xs text-slate-600">Status</Label>
                      <Button
                        type="button"
                        variant="outline"
                        className={`h-9 gap-2 justify-start ${
                          editorActive
                            ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                            : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
                        }`}
                        onClick={() => {
                          setEditorActive(!editorActive);
                          setIsDirty(true);
                        }}
                      >
                        <Play className={`w-3.5 h-3.5 ${editorActive ? 'text-green-600' : 'text-gray-400'}`} />
                        {editorActive ? 'Actief' : 'Inactief'}
                      </Button>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    De rotatie start op de gekozen datum met de geselecteerde week uit de cyclus. Alle volgende weken worden automatisch gevuld.
                  </p>
                </div>

                {/* Row 3: Dynamic week rows — shift + team per week */}
                <div className="space-y-4">
                  <Label className="text-gray-700 font-semibold text-sm">Ploegen & Teams per week in cyclus</Label>
                  <div className="space-y-4">
                    {Array.from({ length: editorWeeks }, (_, i) => {
                      const weekNum = String(i + 1);
                      const weekAssignments = editorPattern[weekNum] ?? [emptyAssignment(0)];
                      const isStartWeek = i + 1 === editorStartWeek;

                      return (
                        <Card key={weekNum} className={`shadow-sm overflow-hidden ${isStartWeek ? 'border-violet-300 ring-1 ring-violet-200' : 'border-gray-200'}`}>
                          {/* Week header band */}
                          <div className={`px-4 py-2 border-b flex items-center justify-between ${
                            isStartWeek ? 'bg-violet-50 border-violet-100' : 'bg-gray-50 border-gray-100'
                          }`}>
                            <div className="flex items-center gap-2.5">
                              <div className={`w-6 h-6 rounded flex items-center justify-center ${
                                isStartWeek ? 'bg-violet-200 text-violet-800' : 'bg-gray-200 text-gray-700'
                              }`}>
                                <span className="text-xs font-bold">{i + 1}</span>
                              </div>
                              <span className="text-sm font-bold text-gray-800">Week {i + 1}</span>
                              {isStartWeek && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4.5 bg-violet-100 text-violet-700 border-violet-200 ml-1 shadow-sm">
                                  Startweek
                                </Badge>
                              )}
                            </div>
                          </div>

                          <CardContent className="p-4 bg-white">
                            {/* Columns Grid */}
                            <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${editorCols}, minmax(0, 1fr))` }}>
                              {weekAssignments.slice(0, editorCols).map((assignment, colIdx) => {
                                const pressName = getPressName(assignment.pressId);
                                
                                return (
                                  <div key={colIdx} className="bg-slate-50/50 rounded-lg border border-slate-100 p-3 space-y-3 relative group hover:border-slate-300 transition-colors">
                                    <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-100">
                                      <div className="w-5 h-5 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center">
                                        <span className="text-[10px] font-bold text-slate-500">{colIdx + 1}</span>
                                      </div>
                                      <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wide">Ploeg {colIdx + 1}</span>
                                      <div className="ml-auto">
                                        <ShiftDot value={assignment.shift} />
                                      </div>
                                    </div>
                                    
                                    <div className="space-y-3">
                                      <div>
                                        <Label className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 block">Tijdslot</Label>
                                        <Select
                                          value={assignment.shift}
                                          onValueChange={(v) => handleShiftChange(weekNum, colIdx, v)}
                                        >
                                          <SelectTrigger className="h-8 text-xs bg-white border-slate-300 shadow-sm focus:ring-violet-500">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {AVAILABLE_SHIFTS.map((s) => (
                                              <SelectItem key={s.value} value={s.value}>
                                                <div className="flex items-center gap-2">
                                                  <ShiftDot value={s.value} />
                                                  {s.label}
                                                </div>
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>

                                      <div>
                                        <Label className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 block">Team</Label>
                                        <Select
                                          value={assignment.teamId || 'none'}
                                          onValueChange={(v) => handleTeamChange(weekNum, colIdx, v === 'none' ? '' : v)}
                                        >
                                          <SelectTrigger className="h-8 text-xs bg-white border-slate-300 shadow-sm focus:ring-violet-500">
                                            <SelectValue placeholder="Kies team..." />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="none">
                                              <span className="text-slate-400">– Geen team –</span>
                                            </SelectItem>
                                            {teams.map((t) => (
                                              <SelectItem key={t.id} value={t.id}>
                                                <div className="flex items-center gap-2">
                                                  <Users className="w-3 h-3 text-slate-400" />
                                                  {t.name}
                                                  <span className="text-[10px] text-slate-400 ml-1">
                                                    ({t.presses.join(', ')})
                                                  </span>
                                                </div>
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>

                                      <div>
                                        <Label className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 block">Pers</Label>
                                        <div className={`h-8 rounded-md border px-3 flex items-center text-xs shadow-inner ${
                                          pressName
                                            ? 'bg-slate-100 border-slate-200 text-slate-700'
                                            : 'bg-white border-dashed border-slate-300 text-slate-400'
                                        }`}>
                                          {pressName ? (
                                            <div className="flex items-center gap-1.5">
                                              <div className="w-2 h-2 rounded-full bg-blue-500 shadow-sm" />
                                              <span className="font-medium text-blue-900">{pressName}</span>
                                            </div>
                                          ) : (
                                            <span className="italic">Zodra team is gekozen</span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>

                {/* Visual preview */}
                {editorWeeks > 0 && (
                  <div className="space-y-2">
                    <Label className="text-gray-700">Cyclus Preview</Label>
                    <div className="bg-gray-50 rounded-lg border border-gray-100 p-4">
                      <div className="flex gap-1 flex-wrap">
                        {Array.from({ length: editorWeeks * 2 }, (_, i) => {
                          const weekInCycle = ((i + editorStartWeek - 1) % editorWeeks) + 1;
                          const assignments = editorPattern[String(weekInCycle)] || [];
                          const assignment = assignments[0];
                          const value = assignment?.shift ?? '';
                          const team = getTeamName(assignment?.teamId ?? '');
                          const isSecondCycle = i >= editorWeeks;

                          return (
                            <div
                              key={i}
                              className={`flex flex-col items-center gap-1 px-2.5 py-2 rounded-md transition-all ${
                                isSecondCycle ? 'opacity-40' : ''
                              }`}
                            >
                              <span className="text-[10px] text-gray-400 font-medium">
                                W{i + 1}
                              </span>
                              <div
                                className="w-6 h-6 rounded-md shadow-sm"
                                style={{ backgroundColor: SHIFT_COLORS[value] ?? '#e2e8f0' }}
                                title={`${value} — ${team}`}
                              />
                              <span className="text-[9px] text-gray-400">{value || '–'}</span>
                              <span className="text-[8px] text-gray-300 max-w-[50px] truncate">
                                {team ? team.split(' ').pop() : ''}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-200/60 flex-wrap">
                        <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Legenda:</span>
                        {AVAILABLE_SHIFTS.map((s) => (
                          <div key={s.value} className="flex items-center gap-1">
                            <ShiftDot value={s.value} />
                            <span className="text-[10px] text-gray-400">{s.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* JSON preview (dev helper) */}
                <details className="group">
                  <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600 transition-colors select-none">
                    Bekijk datastructuur (JSON)
                  </summary>
                  <pre className="mt-2 bg-gray-50 border border-gray-100 rounded-lg p-3 text-xs text-gray-600 overflow-x-auto font-mono">
                    {JSON.stringify(
                      {
                        id: selectedPattern.id,
                        name: editorName,
                        weeks: editorWeeks,
                        startDate: editorStartDate,
                        startWeek: editorStartWeek,
                        active: editorActive,
                        pattern: editorPattern,
                      },
                      null,
                      2
                    )}
                  </pre>
                </details>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ─── Press Picker Dialog ──────────────────────────────────────────── */}
      <Dialog open={pressPickerOpen} onOpenChange={setPressPickerOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Pers Kiezen</DialogTitle>
            <DialogDescription>
              {pressPickerTeam?.name} is gekoppeld aan meerdere persen. Kies voor welke pers dit team in deze week draait.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-2">
            {pressPickerTeam?.presses.map((pressName) => {
              const press = presses.find((p) => p.name === pressName);
              if (!press) return null;
              return (
                <Button
                  key={press.id}
                  variant="outline"
                  className="justify-start gap-3 h-12"
                  onClick={() => handlePressSelected(press.id)}
                >
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <div className="text-left">
                    <div className="font-medium">{press.name}</div>
                  </div>
                </Button>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPressPickerOpen(false)}>
              Annuleren
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
