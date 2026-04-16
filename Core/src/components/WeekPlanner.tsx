import { useState, useMemo, useEffect, useRef, Fragment } from 'react';
import { ChevronLeft, ChevronRight, MessageSquare, Plus, Settings, CalendarIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';
import { pb } from '../lib/pocketbase';
import { useAuth } from './AuthContext';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';

export type AfwezigReden = 'Verlof' | 'Recup' | 'Ziek';

export interface Shift {
  id: string;
  medewerkerNaam: string;
  pers: string;
  ploegType: string;
  startTijd: Date;
  eindTijd: Date;
  opmerking?: string;
  isFeestdag?: boolean;
  afwezigReden?: AfwezigReden;
  isVerplaatst?: boolean;
  typePrefix?: 'INTERIM' | 'STUDENT';
  sortIndex?: number;
}

export interface PlannerContextType {
  patternRecords: any[];
  ploegMap: Record<string, { naam: string; leden: string[]; presses: string[]; persId: string }>;
  operatorMap: Record<string, string>;
  reverseOperatorMap: Record<string, string>;
  pressMap: Record<string, string>;
}

export interface MergedShift {
  id: string;
  ploegType: string;
  startTijd: Date;
  eindTijd: Date;
  presses: Array<{
    pers: string;
    medewerkerNamen: string[];
    originalIds: string[];
  }>;
}

interface VerlofRecord {
  id: string;
  operatorId: string;
  operatorNaam: string;
  van: Date;
  tot: Date;
  type: AfwezigReden;
  opmerking?: string;
}

const PERS_COLORS: Record<string, { bg: string; header: string; headerText: string; border: string; accent: string }> = {
  Lithoman: {
    bg: 'bg-blue-50/40',
    header: 'bg-gradient-to-r from-blue-400 to-blue-500',
    headerText: 'text-white',
    border: 'border-blue-700',
    accent: 'blue',
  },
  C818: {
    bg: 'bg-emerald-50/40',
    header: 'bg-gradient-to-r from-emerald-400 to-emerald-500',
    headerText: 'text-white',
    border: 'border-emerald-700',
    accent: 'emerald',
  },
  C80: {
    bg: 'bg-purple-50/40',
    header: 'bg-gradient-to-r from-purple-400 to-purple-500',
    headerText: 'text-white',
    border: 'border-purple-700',
    accent: 'purple',
  },
};

// --- LAYOUT CONFIGURATION ---
const COL_WIDTHS = {
  LABEL: 100,          // Breedte van de linker 'PloegType' kolom (px)
  DAY: 175,           // Breedte per werkdag/weekenddag (px)
  DAY_MIN: 175,       // Minimale breedte per dag als we in elkaar schuiven (px)
  OPMERKINGEN_MIN: 200, // Minimale breedte van de opmerkingen kolom (vult verder de restruimte) (px)
};

const SHIFT_ROW_STYLES_BY_ACCENT: Record<string, Record<string, { bg: string; text: string; border: string; label: string }>> = {
  blue: {
    '06-14': { bg: 'bg-blue-50', text: 'text-blue-900', border: 'border-blue-700', label: 'Vroege 08u' },
    '14-22': { bg: 'bg-blue-100', text: 'text-blue-900', border: 'border-blue-700', label: 'Late 08u' },
    '22-06': { bg: 'bg-blue-200', text: 'text-blue-900', border: 'border-blue-700', label: 'Nacht 08u' },
    '06-18': { bg: 'bg-blue-300', text: 'text-blue-950', border: 'border-blue-700', label: 'Vroege 12u' },
    '18-06': { bg: 'bg-blue-400', text: 'text-blue-950', border: 'border-blue-700', label: 'Nacht 12u' },
    'Afwezig': { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-stone-700', label: 'Afwezig' },
  },
  emerald: {
    '06-14': { bg: 'bg-emerald-50', text: 'text-emerald-900', border: 'border-emerald-700', label: 'Vroege 08u' },
    '14-22': { bg: 'bg-emerald-100', text: 'text-emerald-900', border: 'border-emerald-700', label: 'Late 08u' },
    '22-06': { bg: 'bg-emerald-200', text: 'text-emerald-900', border: 'border-emerald-700', label: 'Nacht 08u' },
    '06-18': { bg: 'bg-emerald-300', text: 'text-emerald-950', border: 'border-emerald-700', label: 'Vroege 12u' },
    '18-06': { bg: 'bg-emerald-400', text: 'text-emerald-950', border: 'border-emerald-700', label: 'Nacht 12u' },
    'Afwezig': { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-stone-700', label: 'Afwezig' },
  },
  purple: {
    '06-14': { bg: 'bg-purple-50', text: 'text-purple-900', border: 'border-purple-700', label: 'Vroege 08u' },
    '14-22': { bg: 'bg-purple-100', text: 'text-purple-900', border: 'border-purple-700', label: 'Late 08u' },
    '22-06': { bg: 'bg-purple-200', text: 'text-purple-900', border: 'border-purple-700', label: 'Nacht 08u' },
    '06-18': { bg: 'bg-purple-300', text: 'text-purple-950', border: 'border-purple-700', label: 'Vroege 12u' },
    '18-06': { bg: 'bg-purple-400', text: 'text-purple-950', border: 'border-purple-700', label: 'Nacht 12u' },
    'Afwezig': { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-stone-700', label: 'Afwezig' },
  },
  gray: {
    '06-14': { bg: 'bg-stone-100', text: 'text-stone-900', border: 'border-stone-700', label: 'Vroege 08u' },
    '14-22': { bg: 'bg-stone-100', text: 'text-stone-900', border: 'border-stone-700', label: 'Late 08u' },
    '22-06': { bg: 'bg-stone-100', text: 'text-stone-900', border: 'border-stone-700', label: 'Nacht 08u' },
    '06-18': { bg: 'bg-stone-300', text: 'text-stone-950', border: 'border-stone-700', label: 'Vroege 12u' },
    '18-06': { bg: 'bg-stone-400', text: 'text-stone-950', border: 'border-stone-700', label: 'Nacht 12u' },
    'Afwezig': { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-stone-700', label: 'Afwezig' },
  }
};

const AFWEZIG_REDENEN: AfwezigReden[] = ['Verlof', 'Recup', 'Ziek'];
const AFWEZIG_LABEL_COLORS: Record<AfwezigReden, string> = {
  Verlof: 'text-rose-500',
  Recup: 'text-amber-600',
  Ziek: 'text-gray-500',
};

const PLOEG_TYPES = ["06-14", "14-22", "22-06", "06-18", "18-06", "Afwezig"];

// Fallback used before persen are loaded from DB
const DEFAULT_PERSEN = ["Lithoman", "C818", "C80"];

// Default shift types shown for every press (can be overridden per press if needed)
const DEFAULT_ROSTER_SHIFTS = ['06-14', '06-18', '14-22', '18-06', '22-06', 'Afwezig'];

const PERS_COLORS_FALLBACK = {
  bg: 'bg-stone-50/40',
  header: 'bg-gradient-to-r from-stone-400 to-stone-500',
  headerText: 'text-white',
  border: 'border-stone-700',
  accent: 'gray',
};

// ── Date utilities ───────────────────────────────────────────────────────
function getStartOfWeek(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday start
  return new Date(d.setDate(diff));
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function getWeekNumber(d: Date) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function formatWeekHeader(start: Date) {
  const end = addDays(start, 4); // Mon-Fri
  const weekNo = getWeekNumber(start);
  const startDay = start.getDate().toString().padStart(2, '0');
  const endDay = end.getDate().toString().padStart(2, '0');

  if (start.getMonth() === end.getMonth()) {
    return `Week ${weekNo}  ·  ${startDay}–${endDay} ${start.toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' })}`;
  }
  return `Week ${weekNo}  ·  ${startDay} ${start.toLocaleDateString('nl-NL', { month: 'short' })} – ${endDay} ${end.toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' })}`;
}

function formatDayHeader(date: Date) {
  return date.toLocaleDateString('nl-NL', { weekday: 'long' }).replace(/^\w/, c => c.toUpperCase());
}

function formatDaySubheader(date: Date) {
  return date.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' });
}

function parsePloegType(ploegType: string, baseDate: Date): { start: Date; end: Date } {
  if (ploegType === 'Afwezig') {
    const start = new Date(baseDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(baseDate);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }
  const [startHour, endHour] = ploegType.split('-').map(Number);
  const start = new Date(baseDate);
  start.setHours(startHour, 0, 0, 0);
  const end = new Date(baseDate);
  if (endHour <= startHour) end.setDate(end.getDate() + 1);
  end.setHours(endHour, 0, 0, 0);
  return { start, end };
}

function getLocalDayString(date: Date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}



const DAYS_OF_WEEK = ["Zondag", "Maandag", "Dinsdag", "Woensdag", "Donderdag", "Vrijdag", "Zaterdag"];


// ═════════════════════════════════════════════════════════════════════════════
// Component
// ═════════════════════════════════════════════════════════════════════════════

export function WeekPlanner() {
  const navigate = useNavigate();
  const { hasPermission, user } = useAuth();
  const canEdit = hasPermission('planning_edit');
  const canSettings = hasPermission('planning_settings');
  const scrollRef = useRef<HTMLDivElement>(null);
  const [currentWeekStart, setCurrentWeekStart] = useState(() => getStartOfWeek(new Date()));
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [verlofRecords, setVerlofRecords] = useState<VerlofRecord[]>([]);

  const [plannerContext, setPlannerContext] = useState<PlannerContextType | null>(null);

  // ── Load Planner Context (Once) ──
  useEffect(() => {
    const loadContext = async () => {
      try {
        const [patterns, ploegen, operators, persen] = await Promise.all([
          pb.collection('rotation_patterns').getFullList({ filter: 'actief=true' }),
          pb.collection('ploegen').getFullList({ sort: 'naam' }),
          pb.collection('operatoren').getFullList({ sort: 'naam' }),
          pb.collection('persen').getFullList({ sort: 'naam' }),
        ]);

        const oMap: Record<string, string> = {};
        const rMap: Record<string, string> = {};
        operators.forEach(op => { oMap[op.id] = op.naam; rMap[op.naam] = op.id; });

        const pMap: Record<string, string> = {};
        persen.forEach(p => { pMap[p.id] = p.naam; });

        const plMap: Record<string, { naam: string; leden: string[]; presses: string[]; persId: string }> = {};
        ploegen.forEach(pl => {
          plMap[pl.id] = {
            naam: pl.naam,
            leden: pl.leden || [],
            presses: pl.presses || [],
            persId: pl.pers,
          };
        });

        setPlannerContext({
          patternRecords: patterns,
          ploegMap: plMap,
          operatorMap: oMap,
          reverseOperatorMap: rMap,
          pressMap: pMap,
        });
      } catch (err) {
        console.error("Failed to load planner context:", err);
      }
    };
    loadContext();
  }, []);



  const [persNamen, setPersNamen] = useState<string[]>(DEFAULT_PERSEN);
  const [activePresses, setActivePresses] = useState<Record<string, boolean>>({
    Lithoman: true,
    C818: true,
    C80: true,
  });
  const [usePressColors, setUsePressColors] = useState(true);

  // Opmerkingen state (per press, per week)
  const [opmerkingen, setOpmerkingen] = useState<Record<string, string>>({});
  const [currentFridayModes, setCurrentFridayModes] = useState<Record<string, string>>({});

  // Edit dialog
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [editPloegType, setEditPloegType] = useState<string>("");
  const [editPers, setEditPers] = useState<string>("");
  const [editDays, setEditDays] = useState<boolean[]>(Array(7).fill(false));

  // Absence-specific state
  const [editAfwezigReden, setEditAfwezigReden] = useState<AfwezigReden>('Verlof');
  const [editAfwezigVan, setEditAfwezigVan] = useState<string>('');
  const [editAfwezigTot, setEditAfwezigTot] = useState<string>('');
  const [vanPopoverOpen, setVanPopoverOpen] = useState(false);
  const [totPopoverOpen, setTotPopoverOpen] = useState(false);

  const isAfwezig = editPloegType === 'Afwezig';

  // Team edit state
  const [editHelePloeg, setEditHelePloeg] = useState(false);
  const [teamMembers, setTeamMembers] = useState<string[]>([]);

  // External worker (Interim/Student) state
  const [isExternalDialogOpen, setIsExternalDialogOpen] = useState(false);
  const [externalName, setExternalName] = useState("");
  const [externalType, setExternalType] = useState<'NONE' | 'INTERIM' | 'STUDENT' | 'MEDEDELING'>('INTERIM');
  const [externalComment, setExternalComment] = useState("");
  const [externalDays, setExternalDays] = useState<boolean[]>(Array(7).fill(false));
  const [externalContext, setExternalContext] = useState<{ pers: string, shiftType: string, date: Date } | null>(null);

  // Sluitingsdagen from DB
  const [sluitingsdagen, setSluitingsdagen] = useState<Date[]>([]);
  const [sluitingsdagenLabels, setSluitingsdagenLabels] = useState<Record<string, string>>({});

  // Fetch sluitingsdagen
  useEffect(() => {
    async function fetchSluitingsdagen() {
      try {
        const records = await pb.collection('sluitingsdagen').getFullList({ sort: 'datum' });
        const dates = records.map(r => new Date(r.datum));
        const labels: Record<string, string> = {};
        records.forEach(r => {
          const d = new Date(r.datum);
          const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
          labels[key] = r.omschrijving;
        });
        setSluitingsdagen(dates);
        setSluitingsdagenLabels(labels);
      } catch (e) {
        console.error('Kon sluitingsdagen niet laden:', e);
      }
    }
    fetchSluitingsdagen();
  }, []);

  // Load persen from DB once on mount
  useEffect(() => {
    async function fetchPersen() {
      try {
        const records = await pb.collection('persen').getFullList({ sort: 'naam' });
        const namen = records.map(r => r.naam as string);
        if (namen.length > 0) {
          setPersNamen(namen);
          setActivePresses(prev => {
            const next = { ...prev };
            namen.forEach(n => { if (!(n in next)) next[n] = true; });
            return next;
          });
        }
      } catch (e) {
        console.warn('Kon persen niet laden, gebruik standaardlijst:', e);
      }
    }
    fetchPersen();
  }, []);

  const getRotationShifts = (targetWeekStart: Date, context: PlannerContextType, fridayModes: Record<string, string> = {}): Shift[] => {
    const { patternRecords, ploegMap, operatorMap, pressMap } = context;
    const shiftMap = new Map<string, Shift>();

    for (const rec of patternRecords) {
      const patroonData = rec.patroon || {};
      const weeks = patroonData.weeks || patroonData;
      const startWeek = patroonData.startWeek || 1;
      const totalWeeks = rec.weken || Object.keys(weeks).length;
      const startDateStr = rec.start_datum ? rec.start_datum.split('T')[0].split(' ')[0] : '';

      if (!startDateStr || totalWeeks < 1) continue;

      const patternStartDate = new Date(startDateStr + 'T00:00:00');
      const diffMs = targetWeekStart.getTime() - getStartOfWeek(patternStartDate).getTime();
      const diffWeeks = Math.round(diffMs / (7 * 24 * 60 * 60 * 1000));

      const SHIFT_CYCLES: Record<string, string[]> = {
        '3-8u': ['06-14', '22-06', '14-22'],
        '2-12u': ['06-18', '18-06'],
        '2-8u': ['06-14', '14-22'],
      };

      const usedShifts = new Set<string>();
      Object.values(weeks).forEach(w => {
        const arr = Array.isArray(w) ? w : [w];
        arr.forEach((a: any) => { if (a && a.shift) usedShifts.add(a.shift); });
      });

      let cycleType = '3-8u';
      if (usedShifts.has('06-18') || usedShifts.has('18-06')) cycleType = '2-12u';
      else if (!usedShifts.has('22-06') && usedShifts.has('06-14') && usedShifts.has('14-22')) cycleType = '2-8u';

      const shiftRotation = SHIFT_CYCLES[cycleType] || ['06-14'];
      const isExplicit = Object.values(weeks).some(w => Array.isArray(w) && w.length > 1);

      if (isExplicit) {
        const targetWeekIndex = ((diffWeeks % totalWeeks) + totalWeeks) % totalWeeks;
        const currentPatternWeekStr = String(targetWeekIndex + 1);
        const temp = weeks[currentPatternWeekStr];
        const currentAssignments = Array.isArray(temp) ? temp : (temp ? [temp] : []);

        currentAssignments.forEach(assignment => {
          if (!assignment || !assignment.teamId || !assignment.shift) return;
          const finalShiftType = assignment.shift;
          const team = ploegMap[assignment.teamId];
          if (!team) return;
          const pressName = assignment.pressId ? (pressMap[assignment.pressId] || team.presses[0]) : team.presses[0];
          if (!pressName) return;

          for (let dayIdx = 0; dayIdx < 5; dayIdx++) {
            const date = addDays(targetWeekStart, dayIdx);
            const { start, end } = parsePloegType(finalShiftType, date);

            if (dayIdx === 4) {
              const pressMode = fridayModes[pressName] || '8u'; // Default is 8u
              if (pressMode === '5u') {
                if (finalShiftType === '06-14') end.setHours(11, 0, 0, 0);
                else if (finalShiftType === '14-22') { start.setHours(11, 0, 0, 0); end.setHours(16, 0, 0, 0); }
                else if (finalShiftType === '22-06') { start.setHours(16, 0, 0, 0); end.setDate(start.getDate()); end.setHours(21, 0, 0, 0); }
              }
            }

            for (const operatorId of team.leden) {
              const operatorName = operatorMap[operatorId];
              if (!operatorName) continue;
              const shiftId = `rot-${rec.id}-${operatorId}-${dayIdx}-${targetWeekStart.getTime()}`;
              shiftMap.set(shiftId, {
                id: shiftId,
                medewerkerNaam: operatorName,
                pers: pressName,
                ploegType: finalShiftType,
                startTijd: start,
                eindTijd: end,
                sortIndex: team.leden.indexOf(operatorId),
              });
            }
          }
        });
      } else {
        Object.keys(weeks).forEach(baseWeekStr => {
          const temp = weeks[baseWeekStr];
          const baseAssignments = Array.isArray(temp) ? temp : [temp];

          baseAssignments.forEach(assignment => {
            if (!assignment || !assignment.teamId || !assignment.shift) return;
            const baseWeekNum = parseInt(baseWeekStr, 10);
            const targetWeekNum = diffWeeks + startWeek;
            const offset = targetWeekNum - baseWeekNum;
            const baseShiftIndex = shiftRotation.indexOf(assignment.shift);
            let finalShiftType = assignment.shift;

            if (baseShiftIndex !== -1) {
              const m = shiftRotation.length;
              const newIndex = (((baseShiftIndex + offset) % m) + m) % m;
              finalShiftType = shiftRotation[newIndex];
            }

            const team = ploegMap[assignment.teamId];
            if (!team) return;
            const pressName = assignment.pressId ? (pressMap[assignment.pressId] || team.presses[0]) : team.presses[0];
            if (!pressName) return;

            for (let dayIdx = 0; dayIdx < 5; dayIdx++) {
              const date = addDays(targetWeekStart, dayIdx);
              const { start, end } = parsePloegType(finalShiftType, date);

              if (dayIdx === 4) {
                const pressMode = fridayModes[pressName] || '8u';
                if (pressMode === '5u') {
                  if (finalShiftType === '06-14') end.setHours(11, 0, 0, 0);
                  else if (finalShiftType === '14-22') { start.setHours(11, 0, 0, 0); end.setHours(16, 0, 0, 0); }
                  else if (finalShiftType === '22-06') { start.setHours(16, 0, 0, 0); end.setDate(start.getDate()); end.setHours(21, 0, 0, 0); }
                }
              }

              for (const operatorId of team.leden) {
                const operatorName = operatorMap[operatorId];
                if (!operatorName) continue;
                const shiftId = `rot-${rec.id}-${operatorId}-${dayIdx}-${targetWeekStart.getTime()}`;
                shiftMap.set(shiftId, {
                  id: shiftId,
                  medewerkerNaam: operatorName,
                  pers: pressName,
                  ploegType: finalShiftType,
                  startTijd: start,
                  eindTijd: end,
                  sortIndex: team.leden.indexOf(operatorId),
                });
              }
            }
          });
        });
      }
    }
    return Array.from(shiftMap.values());
  };

  // Generate shifts from rotation patterns
  useEffect(() => {
    async function generateFromRotation() {
      if (!plannerContext) return;
      try {
        const opmerkingRecords = await pb.collection('planning_opmerkingen').getFullList({
          filter: `week_start = "${currentWeekStart.toISOString().replace('T', ' ')}"`
        });

        // Load comments into state
        const initialOpm: Record<string, string> = {};
        opmerkingRecords.forEach(r => {
          const key = `${r.pers}|${r.ploeg_type}|${currentWeekStart.toISOString()}`;
          initialOpm[key] = r.tekst;
        });
        setOpmerkingen(initialOpm);
        // Extract Friday modes from comments state
        const fridayModes: Record<string, string> = {};
        persNamen.forEach(p => {
          const key = `friday5u|${p}|${currentWeekStart.toISOString()}`;
          if (initialOpm[key]) {
            fridayModes[p] = initialOpm[key];
          }
        });
        setCurrentFridayModes(fridayModes);

        const shiftMap = new Map<string, Shift>();
        const rotShifts = getRotationShifts(currentWeekStart, plannerContext, fridayModes);
        rotShifts.forEach(s => shiftMap.set(s.id, s));

        // ── Apply planning_dagen overrides ──────────────────────────────
        // For any day+press where a planning_dagen record exists, the stored
        // overrides replace the rotation-generated shifts completely.
        try {
          const weekEndDate = addDays(currentWeekStart, 6);
          const weekStartStr = getLocalDayString(currentWeekStart);
          const weekEndStr = getLocalDayString(weekEndDate);
          const overrideRecords = await pb.collection('planning_dagen').getFullList({
            filter: `datum >= "${weekStartStr} 00:00:00" && datum <= "${weekEndStr} 23:59:59"`,
          });

          for (const record of overrideRecords) {
            const datePart = (record.datum as string).split('T')[0].split(' ')[0];
            const pers = record.pers as string;

            // Remove all rotation-generated shifts for this day+press
            for (const [id, shift] of shiftMap.entries()) {
              const shiftDate = getLocalDayString(shift.startTijd instanceof Date ? shift.startTijd : new Date(shift.startTijd));
              if (shiftDate === datePart && shift.pers === pers) {
                shiftMap.delete(id);
              }
            }

            // Add the saved override shifts — skip 'Afwezig', verlof is now the source of truth
            const overrides: Shift[] = Array.isArray(record.overrides) ? record.overrides : [];
            for (const s of overrides) {
              if (s.ploegType === 'Afwezig') continue;
              const restored: Shift = {
                ...s,
                startTijd: new Date(s.startTijd),
                eindTijd: new Date(s.eindTijd),
              };
              shiftMap.set(restored.id, restored);
            }
          }
        } catch (overrideErr) {
          console.warn('Kon planning_dagen overrides niet laden:', overrideErr);
        }

        // ── Laad verlof records voor deze week ─────────────────────────
        try {
          const weekEndStr = getLocalDayString(addDays(currentWeekStart, 4));
          const weekStartStr = getLocalDayString(currentWeekStart);
          const verlofData = await pb.collection('verlof').getFullList({
            filter: `van <= "${weekEndStr} 23:59:59" && tot >= "${weekStartStr} 00:00:00"`,
            expand: 'operator',
          });
          const weekVerlof: VerlofRecord[] = verlofData.map(r => ({
            id: r.id,
            operatorId: r.operator as string,
            operatorNaam: (r.expand?.operator as any)?.naam ?? '',
            van: new Date((r.van as string).split(' ')[0] + 'T00:00:00'),
            tot: new Date((r.tot as string).split(' ')[0] + 'T00:00:00'),
            type: r.type as AfwezigReden,
            opmerking: r.opmerking as string | undefined,
          }));
          setVerlofRecords(weekVerlof);
        } catch (verlofErr) {
          console.warn('Kon verlof niet laden:', verlofErr);
        }

        setShifts(Array.from(shiftMap.values()));
      } catch (e) {
        console.error('Fout bij laden rooster:', e);
        setShifts([]);
      }
    }

    generateFromRotation();
  }, [currentWeekStart, plannerContext]);

  const weekDays = useMemo(() => {
    // Show Mon (0) to Fri (4) ALWAYS.
    // Sunday (-1) and Saturday (5) conditionally based on shifts.
    const hasSun = shifts.some(s => new Date(s.startTijd).getDay() === 0);
    const hasSat = shifts.some(s => new Date(s.startTijd).getDay() === 6);

    const startOffset = hasSun ? -1 : 0;
    const endOffset = hasSat ? 5 : 4;
    const length = endOffset - startOffset + 1;

    return Array.from({ length }, (_, i) => addDays(currentWeekStart, startOffset + i));
  }, [currentWeekStart, shifts]);

  const preserveScroll = (action: () => void) => {
    const scrollPos = scrollRef.current?.scrollTop;
    action();
    if (scrollPos !== undefined) {
      requestAnimationFrame(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollPos;
      });
    }
  };

  const handlePrev = () => preserveScroll(() => setCurrentWeekStart(addDays(currentWeekStart, -7)));
  const handleNext = () => preserveScroll(() => setCurrentWeekStart(addDays(currentWeekStart, 7)));
  const handleToday = () => preserveScroll(() => setCurrentWeekStart(getStartOfWeek(new Date())));

  const togglePress = (pers: string) => {
    setActivePresses(prev => ({ ...prev, [pers]: !prev[pers] }));
  };

  // ── Persistence for Opmerkingen ──────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(async () => {
      // Find what changed compared to initial load?
      // For simplicity, we compare and upsert modified keys.
      for (const [key, tekst] of Object.entries(opmerkingen)) {
        const [pers, ploeg_type, week_start] = key.split('|');
        if (!pers || !ploeg_type || !week_start) continue;

        try {
          // Check for existing record
          const filter = `pers="${pers}" && ploeg_type="${ploeg_type}" && week_start="${week_start.replace('T', ' ')}"`;
          let existing;
          try {
            existing = await pb.collection('planning_opmerkingen').getFirstListItem(filter);
          } catch {
            existing = null;
          }

          if (existing) {
            if (existing.tekst !== tekst) {
              await pb.collection('planning_opmerkingen').update(existing.id, { tekst });
            }
          } else if (tekst.trim().length > 0) {
            await pb.collection('planning_opmerkingen').create({
              pers,
              ploeg_type,
              week_start: week_start.replace('T', ' '),
              tekst
            });
          }
        } catch (e) {
          console.error('Error saving comment:', e);
        }
      }
    }, 1000); // 1s debounce

    return () => clearTimeout(timer);
  }, [opmerkingen]);

  // Build the roster data: for each press → for each shift type → for each day → list of names
  const rosterData = useMemo(() => {
    const data: Record<string, Record<string, Record<number, Shift[]>>> = {};

    persNamen.forEach(pers => {
      data[pers] = {};
      const shiftTypes = DEFAULT_ROSTER_SHIFTS;
      shiftTypes.forEach((st: string) => {
        data[pers][st] = {};
        for (let d = 0; d < 7; d++) {
          data[pers][st][d] = [];
        }
      });
    });

    shifts.forEach(s => {
      const dayDate = new Date(s.startTijd);
      dayDate.setHours(0, 0, 0, 0);

      // Check if this shift falls within current week (Mon-Sun)
      weekDays.forEach((wd, dayIdx) => {
        const wdStart = new Date(wd);
        wdStart.setHours(0, 0, 0, 0);
        if (dayDate.getTime() === wdStart.getTime()) {
          if (data[s.pers]?.[s.ploegType]?.[dayIdx] !== undefined) {
            data[s.pers][s.ploegType][dayIdx].push(s);
          }
        }
      });
    });

    // ── Verlof overrides (hoogste prioriteit) ──────────────────────────
    // Voor elke verlof-record: verwijder de operator uit alle shift-rijen
    // op de gedekte dagen en voeg hem toe aan de 'Afwezig' rij.
    if (plannerContext) {
      verlofRecords.forEach(vr => {
        // Zoek de pers van de operator via ploegMap
        let operatorPress: string | null = null;
        for (const ploeg of Object.values(plannerContext.ploegMap)) {
          if (ploeg.leden.includes(vr.operatorId)) {
            operatorPress = ploeg.presses[0] ?? null;
            break;
          }
        }
        if (!operatorPress || !data[operatorPress]) return;

        const van = new Date(vr.van); van.setHours(0, 0, 0, 0);
        const tot = new Date(vr.tot); tot.setHours(0, 0, 0, 0);

        weekDays.forEach((wd, dayIdx) => {
          if (wd.getDay() === 0 || wd.getDay() === 6) return; // skip weekend
          const dag = new Date(wd); dag.setHours(0, 0, 0, 0);
          if (dag < van || dag > tot) return;

          // Verwijder operator uit alle niet-Afwezig rijen
          DEFAULT_ROSTER_SHIFTS.forEach(st => {
            if (st === 'Afwezig') return;
            if (data[operatorPress!]?.[st]?.[dayIdx]) {
              data[operatorPress!][st][dayIdx] = data[operatorPress!][st][dayIdx]
                .filter(s => s.medewerkerNaam !== vr.operatorNaam);
            }
          });

          // Voeg toe aan Afwezig rij
          if (data[operatorPress!]['Afwezig']?.[dayIdx] !== undefined) {
            const start = new Date(wd); start.setHours(0, 0, 0, 0);
            const end = new Date(wd); end.setHours(23, 59, 59, 999);
            data[operatorPress!]['Afwezig'][dayIdx].push({
              id: `verlof-${vr.id}-${dayIdx}`,
              medewerkerNaam: vr.operatorNaam,
              pers: operatorPress!,
              ploegType: 'Afwezig',
              startTijd: start,
              eindTijd: end,
              afwezigReden: vr.type,
              opmerking: vr.opmerking,
            });
          }
        });
      });
    }

    Object.values(data).forEach(pressMap => {
      Object.values(pressMap).forEach(typeMap => {
        Object.values(typeMap).forEach(dayArr => {
          dayArr.sort((a, b) => {
            const diff = (a.sortIndex ?? 999) - (b.sortIndex ?? 999);
            if (diff !== 0) return diff;
            return a.medewerkerNaam.localeCompare(b.medewerkerNaam);
          });
        });
      });
    });

    return data;
  }, [shifts, weekDays, persNamen, verlofRecords, plannerContext]);

  const handleEditClick = (shift: Shift, dayIndex: number, currentCellShifts: Shift[] = []) => {
    setEditingShift(shift);
    setEditPloegType(shift.ploegType);
    setEditPers(shift.pers);
    setEditComment(shift.opmerking || "");
    const newDays = Array(7).fill(false);
    newDays[dayIndex + 1] = true;
    setEditDays(newDays);

    const potentialTeam = currentCellShifts.filter(s => s.ploegType !== 'Afwezig').map(s => s.medewerkerNaam);
    setTeamMembers(potentialTeam.length > 0 ? potentialTeam : [shift.medewerkerNaam]);
    setEditHelePloeg(false);

    // Set absence defaults
    if (shift.ploegType === 'Afwezig') {
      setEditAfwezigReden(shift.afwezigReden || 'Verlof');
      const dayStr = getLocalDayString(shift.startTijd);
      setEditAfwezigVan(dayStr);
      setEditAfwezigTot(dayStr);
    } else {
      setEditAfwezigReden('Verlof');
      const dayStr = getLocalDayString(weekDays[dayIndex]);
      setEditAfwezigVan(dayStr);
      setEditAfwezigTot(dayStr);
    }

    setIsEditDialogOpen(true);
  };

  const handleExternalAddClick = (pers: string, shiftType: string, date: Date, dayIndex: number) => {
    setExternalContext({ pers, shiftType, date });
    setExternalName("");
    setExternalComment("");
    setExternalType('INTERIM');
    const newDays = Array(7).fill(false);
    newDays[dayIndex + 1] = true;
    setExternalDays(newDays);
    setIsExternalDialogOpen(true);
  };

  const [editComment, setEditComment] = useState("");

  const executeDiffSync = (prevShifts: Shift[], newShifts: Shift[]) => {
    const affected = new Set<string>();
    const getSig = (s: Shift) => {
      const d = s.startTijd instanceof Date ? s.startTijd : new Date(s.startTijd);
      return `${getLocalDayString(d)}|${s.pers}`;
    };

    prevShifts.forEach(s => {
      const stillExists = newShifts.find(n => n.id === s.id && n.ploegType === s.ploegType && n.pers === s.pers && n.startTijd.getTime() === s.startTijd.getTime() && n.eindTijd.getTime() === s.eindTijd.getTime() && n.opmerking === s.opmerking);
      if (!stillExists) affected.add(getSig(s));
    });

    newShifts.forEach(n => {
      const existed = prevShifts.find(s => s.id === n.id && s.ploegType === n.ploegType && s.pers === n.pers && s.startTijd.getTime() === n.startTijd.getTime() && s.eindTijd.getTime() === n.eindTijd.getTime() && s.opmerking === n.opmerking);
      if (!existed) affected.add(getSig(n));
    });

    executeSync(newShifts, affected);
  };

  const deleteShift = () => {
    if (!editingShift) return;
    setShifts(prevShifts => {
      const newShifts = prevShifts.filter(s => s.id !== editingShift.id);
      executeDiffSync(prevShifts, newShifts);
      return newShifts;
    });
    setIsEditDialogOpen(false);
  };

  const resetShiftToRotation = () => {
    if (!editingShift || !plannerContext) return;
    const rotShifts = getRotationShifts(currentWeekStart, plannerContext, currentFridayModes);
    const editingDate = editingShift.startTijd instanceof Date ? editingShift.startTijd : new Date(editingShift.startTijd);
    const editingDateStr = getLocalDayString(editingDate);
    const rotationShift = rotShifts.find(s => {
      const sDate = s.startTijd instanceof Date ? s.startTijd : new Date(s.startTijd);
      return s.medewerkerNaam === editingShift.medewerkerNaam && getLocalDayString(sDate) === editingDateStr;
    });
    setShifts(prevShifts => {
      const newShifts = prevShifts.filter(s => s.id !== editingShift.id);
      if (rotationShift) newShifts.push(rotationShift);
      executeDiffSync(prevShifts, newShifts);
      return newShifts;
    });
    setIsEditDialogOpen(false);
  };

  const saveEdit = async () => {
    if (!editingShift) return;

    // Absence mode: schrijf naar verlof collectie (bron van waarheid)
    if (isAfwezig) {
      const van = new Date(editAfwezigVan + 'T00:00:00');
      const tot = new Date(editAfwezigTot + 'T00:00:00');
      if (isNaN(van.getTime()) || isNaN(tot.getTime()) || tot < van) {
        return;
      }

      const operatorId = plannerContext?.reverseOperatorMap?.[editingShift.medewerkerNaam];
      if (operatorId) {
        try {
          await pb.collection('verlof').create({
            operator: operatorId,
            van: `${getLocalDayString(van)} 00:00:00.000Z`,
            tot: `${getLocalDayString(tot)} 00:00:00.000Z`,
            type: editAfwezigReden,
            opmerking: editComment.trim(),
          });

          // Herlaad verlof records zodat rosterData direct bijgewerkt wordt
          const weekEndStr = getLocalDayString(addDays(currentWeekStart, 4));
          const weekStartStr = getLocalDayString(currentWeekStart);
          const verlofData = await pb.collection('verlof').getFullList({
            filter: `van <= "${weekEndStr} 23:59:59" && tot >= "${weekStartStr} 00:00:00"`,
            expand: 'operator',
          });
          setVerlofRecords(verlofData.map(r => ({
            id: r.id,
            operatorId: r.operator as string,
            operatorNaam: (r.expand?.operator as any)?.naam ?? '',
            van: new Date((r.van as string).split(' ')[0] + 'T00:00:00'),
            tot: new Date((r.tot as string).split(' ')[0] + 'T00:00:00'),
            type: r.type as AfwezigReden,
            opmerking: r.opmerking as string | undefined,
          })));
        } catch (e) {
          console.warn('Kon verlof niet opslaan:', e);
        }
      }

      setIsEditDialogOpen(false);
      return;
    }

    // Normal shift mode
    setShifts(prevShifts => {
      let newShifts = [...prevShifts];
      const targetNames = editHelePloeg ? teamMembers : [editingShift.medewerkerNaam];

      newShifts = newShifts.filter(s => {
        if (!targetNames.includes(s.medewerkerNaam)) return true;
        const sDay = s.startTijd.getDay();
        const sWeekStart = getStartOfWeek(s.startTijd).getTime();
        const isCurrentWeek = sWeekStart === currentWeekStart.getTime();
        if (isCurrentWeek && editDays[sDay]) return false;
        return true;
      });

      let idCounter = Date.now();
      editDays.forEach((isChecked, dayOfWeekIndex) => {
        if (!isChecked) return;
        const daysFromMon = dayOfWeekIndex - 1; // Sun=-1, Mon=0, etc.
        const baseDate = addDays(currentWeekStart, daysFromMon);
        const { start, end } = parsePloegType(editPloegType, baseDate);

        targetNames.forEach(name => {
          const originalShift = prevShifts.find(s => s.medewerkerNaam === name);

          newShifts.push({
            id: `shift-${idCounter++}`,
            medewerkerNaam: name,
            pers: editPers,
            ploegType: editPloegType,
            startTijd: start,
            eindTijd: end,
            opmerking: editComment,
            sortIndex: originalShift?.sortIndex,
          });
        });

        // Add redirect message if the team moved press
        if (editHelePloeg && editPers !== editingShift.pers) {
          const oldStartEnd = parsePloegType(editingShift.ploegType, baseDate);
          newShifts.push({
            id: `shift-${idCounter++}`,
            medewerkerNaam: `Ploeg ${editingShift.medewerkerNaam.split(' ')[0]} >> ${editPers}`,
            pers: editingShift.pers,
            ploegType: editingShift.ploegType,
            startTijd: oldStartEnd.start,
            eindTijd: oldStartEnd.end,
            isVerplaatst: true,
          });
        }
      });

      executeDiffSync(prevShifts, newShifts);
      return newShifts;
    });
    setIsEditDialogOpen(false);
  };

  const saveExternalWorker = () => {
    if (!externalContext) return;

    // Check if we have enough info to save
    const hasName = externalName.trim().length > 0;
    const hasComment = externalComment.trim().length > 0;
    const hasPrefix = externalType === 'INTERIM' || externalType === 'STUDENT';
    const isOnlyComment = externalType === 'MEDEDELING';

    if (!hasName && !hasPrefix && !isOnlyComment) return;
    if (isOnlyComment && !hasComment) return;

    setShifts(prevShifts => {
      const newShifts = [...prevShifts];
      let idCounter = Date.now();

      externalDays.forEach((isChecked, dayOfWeekIndex) => {
        if (!isChecked) return;
        const daysFromMon = dayOfWeekIndex - 1; // Sun=-1, Mon=0, etc.
        const baseDate = addDays(currentWeekStart, daysFromMon);
        const { start, end } = parsePloegType(externalContext.shiftType, baseDate);

        newShifts.push({
          id: `shift-${idCounter++}`,
          medewerkerNaam: externalType === 'MEDEDELING' ? "" : externalName,
          pers: externalContext.pers,
          ploegType: externalContext.shiftType,
          startTijd: start,
          eindTijd: end,
          typePrefix: (externalType === 'NONE' || externalType === 'MEDEDELING') ? undefined : externalType,
          opmerking: externalComment,
        });
      });

      executeDiffSync(prevShifts, newShifts);
      return newShifts;
    });

    setIsExternalDialogOpen(false);
  };

  const syncDayToDatabase = async (targetDate: Date, press: string, dayShifts: Shift[]) => {
    try {
      const dateStr = getLocalDayString(targetDate);
      const startOfDay = `${dateStr} 00:00:00`;
      const endOfDay = `${dateStr} 23:59:59`;

      const filter = `datum >= "${startOfDay}" && datum <= "${endOfDay}" && pers="${press}"`;
      let existing = null;
      try {
        existing = await pb.collection('planning_dagen').getFirstListItem(filter);
      } catch {
        existing = null;
      }

      if (existing) {
        await pb.collection('planning_dagen').update(existing.id, {
          overrides: dayShifts
        });
      } else {
        await pb.collection('planning_dagen').create({
          datum: `${dateStr} 12:00:00.000Z`,
          pers: press,
          overrides: dayShifts
        });
      }
    } catch (e) {
      console.error('Failed to sync planning_dagen', e);
    }
  };

  const executeSync = (newFullArray: Shift[], affectedComboKeys: Set<string>) => {
    affectedComboKeys.forEach(async key => {
      const [dateStr, press] = key.split('|');
      const targetDate = new Date(`${dateStr}T12:00:00`);

      const externalWeekStart = getStartOfWeek(targetDate);
      const isExternal = externalWeekStart.getTime() !== currentWeekStart.getTime();

      // 'Afwezig' shifts worden niet opgeslagen in planning_dagen — verlof is de bron van waarheid
      let dayShifts = newFullArray.filter(s => s.pers === press && getLocalDayString(new Date(s.startTijd)) === dateStr && s.ploegType !== 'Afwezig');

      if (isExternal && plannerContext) {
        // Gather the names of the operators the user explicitly modified in this external day
        const overriddenNames = dayShifts.map(s => s.medewerkerNaam);

        // Fetch existing DB snapshot for this external date
        const startOfDay = `${dateStr} 00:00:00`;
        const endOfDay = `${dateStr} 23:59:59`;
        const filter = `datum >= "${startOfDay}" && datum <= "${endOfDay}" && pers="${press}"`;
        let existing = null;
        try { existing = await pb.collection('planning_dagen').getFirstListItem(filter); } catch { }

        if (existing && Array.isArray(existing.overrides) && existing.overrides.length > 0) {
          // Merge with existing snapshot
          const merged = existing.overrides
            .map((s: any) => ({ ...s, startTijd: new Date(s.startTijd), eindTijd: new Date(s.eindTijd) }))
            .filter((s: Shift) => !overriddenNames.includes(s.medewerkerNaam));
          merged.push(...dayShifts);
          dayShifts = merged;
        } else {
          // Fetch external fridayModes
          let externalFridayModes: Record<string, string> = {};
          try {
            const externalOpm = await pb.collection('planning_opmerkingen').getFullList({
              filter: `week_start = "${externalWeekStart.toISOString().replace('T', ' ')}" && tekst != ""`
            });
            externalOpm.forEach(r => {
              if (r.ploeg_type === 'friday5u') {
                externalFridayModes[r.pers] = r.tekst;
              }
            });
          } catch { }
          // Generate from rotation for this external day!
          const rotShifts = getRotationShifts(externalWeekStart, plannerContext, externalFridayModes);
          // Filter rotation strictly to this day and press
          const rotDayShifts = rotShifts.filter(s => s.pers === press && getLocalDayString(new Date(s.startTijd)) === dateStr);
          // Merge explicitly modified operators (like Toon) into the full standard rotation
          const merged = rotDayShifts.filter(s => !overriddenNames.includes(s.medewerkerNaam));
          merged.push(...dayShifts);
          dayShifts = merged;
        }
      }

      await syncDayToDatabase(targetDate, press, dayShifts);
    });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)] bg-gray-50/50 text-sm overflow-hidden">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-1 border-b bg-white shadow-sm flex-shrink-0">
        <div className="flex items-center gap-4">
          {/* Nav arrows */}
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={handlePrev}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" className="h-8 px-3 text-xs font-semibold" onClick={handleToday}>
              Vandaag
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleNext}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-gray-800 tracking-tight">
              {formatWeekHeader(currentWeekStart)}
            </h2>
            {canSettings && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-gray-400 hover:text-gray-800"
                onClick={() => navigate('/werkrooster/instellingen')}
                title="Instellingen"
              >
                <Settings className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Press toggles */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 border-r pr-4 py-1 border-gray-200">
            <Label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider cursor-pointer" htmlFor="toggle-color">Pers kleuren</Label>
            <Switch id="toggle-color" checked={usePressColors} onCheckedChange={setUsePressColors} className="scale-75" />
          </div>
          <div className="flex items-center gap-2">
            {persNamen.map((pers: string) => {
              const colors = PERS_COLORS[pers] || PERS_COLORS_FALLBACK;
              return (
                <button
                  key={pers}
                  onClick={() => togglePress(pers)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all border ${activePresses[pers]
                    ? usePressColors ? `${colors.header} ${colors.headerText} border-transparent shadow-md` : 'bg-stone-800 text-stone-50 border-transparent shadow-md'
                    : 'bg-gray-100 text-gray-400 border-gray-200'
                    }`}
                >
                  {pers}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Roster Body ────────────────────────────────────────────────────── */}
      {(() => {
        const activePersNamen = persNamen
          .filter((p: string) => activePresses[p])
          .sort((a: string, b: string) => {
            if (a === user?.press) return -1;
            if (b === user?.press) return 1;
            return 0;
          });
        const activeCount = activePersNamen.length;
        const cardZoom = activeCount === 3 ? 1 : 1.25;

        return (
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
            {activePersNamen.map((pers: string) => {
              const colors = PERS_COLORS[pers] || PERS_COLORS_FALLBACK;
              const shiftTypes = DEFAULT_ROSTER_SHIFTS;

              const currentHeaderClass = usePressColors ? `bg-${colors.accent}-100` : 'bg-stone-200';
              const currentHeaderText = usePressColors ? `text-${colors.accent}-800` : 'text-stone-700';
              const currentHeaderBorder = usePressColors ? `border-${colors.accent}-700` : 'border-stone-700';

              return (
                <div
                  key={pers}
                  style={{ zoom: cardZoom }}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
                >

                  {/* ── Table Container (Scrollable) ─────────────────────────── */}
                  <div className="overflow-x-auto overflow-y-hidden">
                    <table className="w-full border-collapse" style={{ tableLayout: 'fixed', minWidth: `${COL_WIDTHS.LABEL + (weekDays.length * COL_WIDTHS.DAY_MIN) + COL_WIDTHS.OPMERKINGEN_MIN}px` }}>
                      <colgroup>
                        <col style={{ width: `${COL_WIDTHS.LABEL}px` }} />
                        {weekDays.map((_, i) => (
                          <col key={i} style={{ width: `${COL_WIDTHS.DAY}px`, minWidth: `${COL_WIDTHS.DAY_MIN}px` }} />
                        ))}
                        <col style={{ width: 'auto', minWidth: `${COL_WIDTHS.OPMERKINGEN_MIN}px` }} />
                      </colgroup>
                      <thead>
                        <tr>
                          {/* Press name header */}
                          <th
                            className={`${currentHeaderClass} ${currentHeaderText} ${currentHeaderBorder} border-b border-r text-left px-3 py-2.5 font-black text-sm tracking-wide sticky left-0 z-10`}
                          >
                            {pers}
                          </th>

                          {/* Day columns */}
                          {weekDays.map((date, di) => {
                            const today = isToday(date);
                            return (
                              <th
                                key={di}
                                className={`${currentHeaderClass} ${currentHeaderText} ${currentHeaderBorder} border-b border-r text-center px-2 py-2.5 font-bold text-xs uppercase tracking-wider relative 
                              ${today ? 'z-20 shadow-[0_-10px_25px_-5px_rgba(0,0,0,0.1),0_10px_10px_-5px_rgba(0,0,0,0.04)] ring-1 ring-black/5' : ''}`}
                              >
                                {today && (
                                  <div className={`absolute top-0 left-0 right-0 h-1 ${usePressColors ? `bg-${colors.accent}-500` : 'bg-blue-500'}`} />
                                )}
                                <div className="flex flex-col items-center">
                                  <span className={`${today ? (usePressColors ? `bg-${colors.accent}-600 text-white` : 'bg-blue-600 text-white') + ' px-2 py-0.5 rounded-full shadow-sm' : ''}`}>
                                    {formatDayHeader(date)}
                                  </span>
                                  <span className={`text-[10px] font-normal mt-0.5 ${today ? 'opacity-100 font-bold' : 'opacity-70'}`}>
                                    {formatDaySubheader(date)}
                                  </span>
                                </div>

                                {date.getDay() === 5 && canEdit && (
                                  <button
                                    onClick={() => {
                                      const key = `friday5u|${pers}|${currentWeekStart.toISOString()}`;
                                      const c = opmerkingen[key] || '8u';
                                      setOpmerkingen(prev => ({ ...prev, [key]: c === '8u' ? '5u' : '8u' }));
                                    }}
                                    className={`absolute bottom-1 right-1 px-1 rounded text-[9px] font-black tracking-tighter shadow-sm border transition-colors ${(opmerkingen[`friday5u|${pers}|${currentWeekStart.toISOString()}`] || '8u') === '5u'
                                      ? 'bg-gray-800 text-white border-gray-900 border-b-2 hover:bg-gray-900'
                                      : 'bg-black/5 text-gray-400 hover:bg-black/10 border-black/10'
                                      }`}
                                    title="Toggle Vrijdag Uren (5u/8u)"
                                  >
                                    5U
                                  </button>
                                )}
                              </th>
                            );
                          })}

                          {/* Opmerkingen column */}
                          <th
                            className={`${currentHeaderClass} ${currentHeaderText} ${currentHeaderBorder} border-b text-center px-3 py-2.5 font-bold text-xs uppercase tracking-wider`}
                          >
                            <div className="flex items-center justify-center gap-1.5">
                              <MessageSquare className="w-3.5 h-3.5" />
                              Opmerkingen
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {shiftTypes.map((shiftType, stIdx) => {
                          const is8uShift = ['06-14', '14-22', '22-06'].includes(shiftType);
                          const baseAccent = usePressColors ? colors.accent : 'stone';

                          const pressStyles = SHIFT_ROW_STYLES_BY_ACCENT[usePressColors ? colors.accent : 'gray'] || SHIFT_ROW_STYLES_BY_ACCENT.blue;
                          const style = pressStyles[shiftType] || pressStyles['06-14'];
                          const isLast = stIdx === shiftTypes.length - 1;
                          const isRowEmpty = weekDays.every((_, dayIdx) => (rosterData[pers]?.[shiftType]?.[dayIdx] || []).length === 0);
                          const tdPadding = isRowEmpty ? 'p-0' : 'py-1.5 px-2';
                          const minHeight = isRowEmpty ? 'h-[16px]' : 'min-h-[40px]';

                          return (
                            <tr
                              key={shiftType}
                              className={`${is8uShift ? '' : style.bg} ${style.text} ${!isLast ? `border-b ${style.border}` : ''} group/row transition-colors hover:brightness-[0.97]`}
                            >
                              {/* Shift type label */}
                              <td className={`px-2 ${isRowEmpty ? 'py-0 h-[18px]' : 'py-2.5'} align-middle border-r ${style.border} sticky left-0 z-10 ${is8uShift ? `bg-${baseAccent}-100` : style.bg}`}>
                                <div className="flex flex-col items-center justify-center text-center">
                                  <span className={`${isRowEmpty ? 'text-[9px]' : 'text-sm'} font-black tracking-wide leading-none`}>{shiftType}</span>
                                  {style.label !== 'Afwezig' && !isRowEmpty && (
                                    <span className="text-[10px] font-bold opacity-75 mt-0.5">{style.label}</span>
                                  )}
                                </div>
                              </td>

                              {/* Day cells */}
                              {weekDays.map((date, dayIdx) => {
                                const cellShifts = rosterData[pers]?.[shiftType]?.[dayIdx] || [];
                                const sluitingKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
                                const isSluitingsdag = sluitingsdagen.some(sd =>
                                  sd.getFullYear() === date.getFullYear() &&
                                  sd.getMonth() === date.getMonth() &&
                                  sd.getDate() === date.getDate()
                                );
                                const sluitingLabel = sluitingsdagenLabels[sluitingKey];
                                const today = isToday(date);

                                // Sluitingsdag: span all shift rows with rowSpan
                                if (isSluitingsdag) {
                                  // Only the first shift row renders the merged cell
                                  if (stIdx === 0) {
                                    return (
                                      <td
                                        key={dayIdx}
                                        rowSpan={shiftTypes.length}
                                        className="align-middle relative overflow-hidden bg-gradient-to-b from-red-50 to-orange-50/50"
                                        style={{ outline: '1.5px solid #e5e7eb' }}
                                      >
                                        <div className="flex flex-col items-center justify-center h-full py-4 px-2 text-center">
                                          <div className="text-2xl mb-1.5">🔒</div>
                                          <div className="text-[10px] font-black text-red-600 uppercase tracking-widest leading-tight">
                                            Drukkerij gesloten
                                          </div>
                                          {sluitingLabel && (
                                            <div className="text-[10px] font-semibold text-red-400 mt-1 italic">
                                              {sluitingLabel}
                                            </div>
                                          )}
                                        </div>
                                      </td>
                                    );
                                  }
                                  // Other shift rows: skip this td (already covered by rowSpan)
                                  return null;
                                }

                                const hasFeestdag = cellShifts.some(s => s.isFeestdag);

                                return (
                                  <td
                                    key={dayIdx}
                                    className={`${tdPadding} border-r ${style.border} align-middle ${minHeight} relative overflow-hidden
                                  ${today ? 'z-20 shadow-[15px_0_15px_-15px_rgba(0,0,0,0.08),-15px_0_15px_-15px_rgba(0,0,0,0.08)] bg-white/95' : ''}
                                  ${!today && is8uShift ? (dayIdx % 2 === 0 ? `bg-${baseAccent}-100` : `bg-${baseAccent}-200`) : ''}`}
                                  >
                                    {hasFeestdag && (
                                      <div className="text-red-500 font-black text-[10px] uppercase tracking-wider mb-0.5">
                                        Feestdag
                                      </div>
                                    )}
                                    <div className={`space-y-0.1 flex flex-col items-center justify-center h-full relative group/cell ${cellShifts.some(s => !s.medewerkerNaam && !s.typePrefix && s.ploegType !== 'Afwezig' && s.opmerking) ? 'pb-6' : ''}`}>
                                      {dayIdx === 4 && (opmerkingen[`friday5u|${pers}|${currentWeekStart.toISOString()}`] === '5u') && ['06-14', '14-22', '22-06'].includes(shiftType) && !isRowEmpty && (
                                        <div className="absolute left-1 top-0 bottom-0 flex items-center text-[10px] font-bold text-red-700 tracking-tighter pointer-events-none select-none">
                                          {shiftType === '06-14' ? '06-11' : shiftType === '14-22' ? '11-16' : '16-21'}
                                        </div>
                                      )}
                                      {cellShifts.filter(s => s.medewerkerNaam || s.typePrefix || s.ploegType === 'Afwezig').map((shift) => {
                                        const isAbsence = shift.ploegType === 'Afwezig';
                                        const redenColor = isAbsence && shift.afwezigReden
                                          ? AFWEZIG_LABEL_COLORS[shift.afwezigReden]
                                          : '';
                                        const shiftContent = (
                                          <div
                                            onClick={() => canEdit && !shift.isVerplaatst && handleEditClick(shift, dayIdx, cellShifts)}
                                            className={`text-[11px] font-semibold leading-tight px-1 flex flex-col items-center justify-center w-full ${shift.isVerplaatst ? 'opacity-50 italic pointer-events-none' : canEdit ? 'cursor-pointer hover:bg-black/5 hover:rounded-[3px]' : 'cursor-default'}`}
                                            title={isAbsence ? undefined : (shift.isVerplaatst ? 'Verhuisd' : `${shift.medewerkerNaam} — ${shift.ploegType} (${pers})`)}
                                          >
                                            <div className="relative inline-flex flex-col items-center justify-center w-full">
                                              {(shift.medewerkerNaam || shift.typePrefix) ? (
                                                <div className="flex items-center justify-center gap-1 w-full flex-wrap px-1">
                                                  <span className="truncate">
                                                    {shift.typePrefix && (
                                                      <span className={`${shift.medewerkerNaam ? 'text-[9px]' : 'text-[10px]'} font-black mr-1 opacity-80`}>{shift.typePrefix}</span>
                                                    )}
                                                    {shift.medewerkerNaam && (
                                                      <span>
                                                        {shift.isVerplaatst
                                                          ? shift.medewerkerNaam
                                                          : shift.medewerkerNaam.split(' ').map(n => n.toUpperCase()).join(' ')}
                                                      </span>
                                                    )}
                                                  </span>
                                                  {isAbsence && shift.afwezigReden && (
                                                    <span className={`text-[9px] font-bold ${redenColor}`}>
                                                      {shift.afwezigReden.toUpperCase()}
                                                    </span>
                                                  )}
                                                </div>
                                              ) : null}
                                              {shift.opmerking && shift.medewerkerNaam && !isAbsence && (
                                                <div className="text-[9px] font-medium italic opacity-60 leading-none mt-0.5 truncate max-w-full text-center">
                                                  {shift.opmerking}
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        );
                                        if (isAbsence) {
                                          return (
                                            <Tooltip key={shift.id} delayDuration={300}>
                                              <TooltipTrigger asChild>
                                                {shiftContent}
                                              </TooltipTrigger>
                                              <TooltipContent side="top" className="max-w-[220px] text-center">
                                                <p className="font-bold">{shift.afwezigReden ?? 'Afwezig'}</p>
                                                {shift.opmerking && (
                                                  <p className="opacity-75 mt-0.5 text-[11px] font-normal">{shift.opmerking}</p>
                                                )}
                                              </TooltipContent>
                                            </Tooltip>
                                          );
                                        }
                                        return <Fragment key={shift.id}>{shiftContent}</Fragment>;
                                      })}
                                      {/* Quick Add Button (Square/Bottom-Right) — alleen voor editors */}
                                      {canEdit && (
                                        <button
                                          onClick={() => handleExternalAddClick(pers, shiftType, date, dayIdx)}
                                          className="absolute bottom-0.5 right-0.5 p-0.5 rounded-sm bg-white/60 text-gray-500 hover:text-gray-900 hover:bg-white shadow-sm opacity-0 group-hover/cell:opacity-100 transition-all z-10 border border-gray-200"
                                        >
                                          <Plus className="w-3 h-3" />
                                        </button>
                                      )}
                                    </div>
                                    {cellShifts.length === 0 && (
                                      <div className={`${isRowEmpty ? 'text-[8px] text-gray-300/40' : 'text-[10px] text-gray-300 mt-2'} italic select-none text-center w-full`}>—</div>
                                    )}
                                    {/* Mededelingen — rode strip verankerd onderaan de <td> */}
                                    {cellShifts.filter(s => !s.medewerkerNaam && !s.typePrefix && s.ploegType !== 'Afwezig' && s.opmerking).map((shift) => (
                                      <div
                                        key={shift.id}
                                        onClick={() => canEdit && handleEditClick(shift, dayIdx, cellShifts)}
                                        className={`absolute bottom-0 left-0 right-0 bg-red-600 text-white text-[10px] font-bold text-center py-0.5 px-1 leading-tight ${canEdit ? 'cursor-pointer hover:bg-red-700' : 'cursor-default'}`}
                                        title={shift.opmerking}
                                      >
                                        {shift.opmerking}
                                      </div>
                                    ))}
                                  </td>
                                );
                              })}

                              {/* Opmerkingen cell per rijtje */}
                              <td className={`px-2 ${tdPadding} align-middle border-l ${style.border} ${is8uShift ? `bg-${baseAccent}-100` : ''}`}>
                                <input
                                  type="text"
                                  placeholder="-"
                                  value={opmerkingen[`${pers}|${shiftType}|${currentWeekStart.toISOString()}`] || ''}
                                  onChange={(e) => {
                                    const key = `${pers}|${shiftType}|${currentWeekStart.toISOString()}`;
                                    setOpmerkingen(prev => ({ ...prev, [key]: e.target.value }));
                                  }}
                                  className={`w-full bg-transparent border-0 focus:outline-none focus:ring-0 placeholder:text-current font-medium ${isRowEmpty ? 'text-[9px] h-[16px] placeholder-transparent' : 'text-[11px] placeholder:opacity-40'} ${style.text}`}
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* ── Edit Shift Dialog ──────────────────────────────────────────────── */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="!max-w-[620px]" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Planning wijzigen
              {editingShift && (
                <Badge variant="outline" className="font-medium">
                  {editingShift.medewerkerNaam}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-5 py-3">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</Label>
                <Select value={editPloegType} onValueChange={(v) => setEditPloegType(v)}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Kies type" />
                  </SelectTrigger>
                  <SelectContent>
                    {PLOEG_TYPES.map(pt => (
                      <SelectItem key={pt} value={pt}>
                        {pt === 'Afwezig' ? '🚫 Afwezig (Verlof/Recup/Ziek)' : pt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Pers</Label>
                <Select value={editPers} onValueChange={setEditPers}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Kies pers" />
                  </SelectTrigger>
                  <SelectContent>
                    {persNamen.map((p: string) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {teamMembers.length > 1 && !isAfwezig && (
              <div className="bg-amber-50/50 rounded-lg border border-amber-100 p-3 flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-xs font-semibold text-amber-800">Hele ploeg verplaatsen</Label>
                  <p className="text-[10px] text-amber-600/80">Pas toe op {teamMembers.length} medewerkers: <span className="font-semibold">{teamMembers.map(n => n.split(' ')[0]).join(', ')}</span></p>
                </div>
                <Switch
                  checked={editHelePloeg}
                  onCheckedChange={setEditHelePloeg}
                />
              </div>
            )}

            {/* Absence-specific fields */}
            {isAfwezig && (
              <div className="bg-rose-50 rounded-lg border border-rose-200 p-4 space-y-3">
                <Label className="text-xs font-semibold text-rose-600 uppercase tracking-wider">Afwezigheid Details</Label>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] text-rose-500 font-medium">Reden</Label>
                    <div className="flex bg-white rounded-md border border-rose-200 p-0.5 w-full">
                      {AFWEZIG_REDENEN.map(r => (
                        <button
                          key={r}
                          onClick={() => setEditAfwezigReden(r)}
                          className={`flex-1 px-2 py-1 text-[10px] font-bold rounded transition-all ${editAfwezigReden === r
                            ? 'bg-rose-500 text-white shadow-sm'
                            : 'text-rose-400 hover:bg-rose-50'
                            }`}
                        >
                          {r.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] text-rose-500 font-medium">Van</Label>
                    <Popover open={vanPopoverOpen} onOpenChange={setVanPopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="h-8 w-full justify-start text-xs font-normal bg-white border-rose-200 px-2">
                          <CalendarIcon className="mr-1.5 h-3 w-3 text-rose-400 shrink-0" />
                          {editAfwezigVan ? new Date(editAfwezigVan + 'T00:00:00').toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' }) : 'Kies datum'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={editAfwezigVan ? new Date(editAfwezigVan + 'T00:00:00') : undefined}
                          onSelect={(date) => { if (date) setEditAfwezigVan(getLocalDayString(date)); setVanPopoverOpen(false); }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] text-rose-500 font-medium">Tot</Label>
                    <Popover open={totPopoverOpen} onOpenChange={setTotPopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="h-8 w-full justify-start text-xs font-normal bg-white border-rose-200 px-2">
                          <CalendarIcon className="mr-1.5 h-3 w-3 text-rose-400 shrink-0" />
                          {editAfwezigTot ? new Date(editAfwezigTot + 'T00:00:00').toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' }) : 'Kies datum'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={editAfwezigTot ? new Date(editAfwezigTot + 'T00:00:00') : undefined}
                          onSelect={(date) => { if (date) setEditAfwezigTot(getLocalDayString(date)); setTotPopoverOpen(false); }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                <p className="text-[10px] text-rose-400">
                  De afwezigheid wordt ingevuld voor elke werkdag in de gekozen periode.
                </p>
              </div>
            )}

            {/* Day checkboxes (only for regular shifts) */}
            {!isAfwezig && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Dagen</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[10px] font-bold text-blue-600 hover:text-blue-700"
                    onClick={() => {
                      const newDays = Array(7).fill(false);
                      for (let i = 1; i <= 5; i++) newDays[i] = true;
                      setEditDays(newDays);
                    }}
                  >
                    Ma–Vr selecteren
                  </Button>
                </div>
                <div className="flex bg-gray-50 p-1.5 rounded-lg border border-gray-200">
                  {DAYS_OF_WEEK.map((day, idx) => {
                    const shortName = day.substring(0, 2);
                    return (
                      <div key={day} className="flex flex-col items-center justify-center flex-1 py-1 gap-1.5 border-r last:border-r-0 border-gray-200">
                        <label
                          htmlFor={`day-${idx}`}
                          className="text-[10px] uppercase font-bold text-gray-400 tracking-wider cursor-pointer select-none"
                        >
                          {shortName}
                        </label>
                        <Checkbox
                          id={`day-${idx}`}
                          checked={editDays[idx]}
                          onCheckedChange={(checked) => {
                            const newDays = [...editDays];
                            newDays[idx] = checked as boolean;
                            setEditDays(newDays);
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Extra Mededeling</Label>
              <Input
                placeholder="Bijv. 'Training', 'Stand-by'..."
                value={editComment}
                onChange={(e) => setEditComment(e.target.value)}
                className="h-9"
              />
            </div>
          </div>

          <DialogFooter className="sm:justify-between">
            <div className="flex gap-2">
              <Button variant="outline" onClick={deleteShift} className="text-red-500 hover:text-red-600 hover:bg-red-50 border-red-200">
                Shift wissen
              </Button>
              {editingShift && !editingShift.id.startsWith('rot-') && !editingShift.typePrefix && (
                <Button variant="outline" onClick={resetShiftToRotation} disabled={!plannerContext} className="text-orange-500 hover:text-orange-600 hover:bg-orange-50 border-orange-200">
                  Aanpassing wissen
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Annuleren</Button>
              <Button onClick={saveEdit}>Toepassen</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Add External Worker Dialog ─────────────────────────────────────── */}
      <Dialog open={isExternalDialogOpen} onOpenChange={setIsExternalDialogOpen}>
        <DialogContent className="sm:max-w-lg" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Interim of Student toevoegen</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-3">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Naam</Label>
                <Input
                  placeholder={externalType === 'MEDEDELING' ? "(Niet nodig voor bericht)" : "Naam medewerker..."}
                  value={externalType === 'MEDEDELING' ? "" : externalName}
                  onChange={(e) => setExternalName(e.target.value)}
                  disabled={externalType === 'MEDEDELING'}
                  className="h-9 disabled:opacity-50 disabled:bg-gray-50"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</Label>
                <div className="flex flex gap-1 pt-1">
                  {[
                    { id: 'INTERIM', label: 'INTERIM' },
                    { id: 'STUDENT', label: 'STUDENT' },
                    { id: 'MEDEDELING', label: 'BERICHT' }
                  ].map(t => (
                    <button
                      key={t.id}
                      onClick={() => setExternalType(t.id as any)}
                      className={`px-3 py-1.5 text-[10px] font-black rounded-md border transition-all ${externalType === t.id
                        ? 'bg-blue-600 text-white border-blue-700 shadow-sm'
                        : 'bg-white text-gray-400 border-gray-200 hover:border-blue-400 hover:text-blue-500'
                        }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Mededeling</Label>
              <Input
                placeholder={externalType === 'MEDEDELING' ? "Voer mededeling in..." : "Bijv. 'Eerste dag', 'Ervaren'..."}
                value={externalComment}
                onChange={(e) => setExternalComment(e.target.value)}
                className="h-9"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Dagen</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[10px] font-bold text-blue-600 hover:text-blue-700"
                  onClick={() => {
                    const newDays = Array(7).fill(false);
                    for (let i = 1; i <= 5; i++) newDays[i] = true;
                    setExternalDays(newDays);
                  }}
                >
                  Ma–Vr selecteren
                </Button>
              </div>
              <div className="flex bg-gray-50 p-1.5 rounded-lg border border-gray-200">
                {DAYS_OF_WEEK.map((day, idx) => {
                  const shortName = day.substring(0, 2);
                  return (
                    <div key={day} className="flex flex-col items-center justify-center flex-1 py-1 gap-1.5 border-r last:border-r-0 border-gray-200">
                      <label
                        htmlFor={`ext-day-${idx}`}
                        className="text-[10px] uppercase font-bold text-gray-400 tracking-wider cursor-pointer select-none"
                      >
                        {shortName}
                      </label>
                      <Checkbox
                        id={`ext-day-${idx}`}
                        checked={externalDays[idx]}
                        onCheckedChange={(checked) => {
                          const newDays = [...externalDays];
                          newDays[idx] = checked as boolean;
                          setExternalDays(newDays);
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsExternalDialogOpen(false)}>Annuleren</Button>
            <Button
              onClick={saveExternalWorker}
              disabled={
                externalType === 'MEDEDELING'
                  ? !externalComment
                  : (externalType === 'NONE' ? !externalName : false)
              }
            >
              {externalType === 'MEDEDELING' ? 'Bericht plaatsen' : 'Toevoegen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
