import { useState, useMemo, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import { PageHeader } from '../layout/PageHeader';
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
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar } from '../ui/calendar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { toast } from 'sonner';
import {
  Plus,
  Edit,
  Trash2,
  CalendarDays,
  Settings2,
  CalendarOff,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ArrowRight,
  Archive,
  Plane,
} from 'lucide-react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { pb } from '../../lib/pocketbase';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Sluitingsdag {
  id: string;
  datum: Date;
  omschrijving: string;
  type?: string;
}

interface OperatorItem {
  id: string;
  naam: string;
  presses: string[];
}

interface PloegItem {
  id: string;
  naam: string;
  leden: string[];   // operator IDs
  presses: string[]; // press names
}

interface RotationPatternItem {
  id: string;
  pers: string;
  patroon: Record<string, { shifts: Array<{ ploegType: string; teamId: string }> }>;
}

type VerlofType = 'Verlof' | 'Recup' | 'Ziek';

interface VerlofItem {
  id: string;
  operator_id: string;
  operator_naam: string;
  van: Date;
  tot: Date;
  type: VerlofType;
  opmerking: string;
}

// ─── Verlof type config ───────────────────────────────────────────────────────

const VERLOF_TYPES: { value: VerlofType; label: string; badgeClass: string }[] = [
  { value: 'Verlof', label: 'Verlof',  badgeClass: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'Recup',  label: 'Recup',   badgeClass: 'bg-amber-50 text-amber-700 border-amber-200' },
  { value: 'Ziek',   label: 'Ziekte',  badgeClass: 'bg-red-50 text-red-700 border-red-200' },
];

function verlofTypeConfig(type: VerlofType) {
  return VERLOF_TYPES.find(t => t.value === type) ?? VERLOF_TYPES[VERLOF_TYPES.length - 1];
}

function aantalDagen(van: Date, tot: Date): number {
  return Math.max(1, Math.round((tot.getTime() - van.getTime()) / (1000 * 60 * 60 * 24)) + 1);
}

// ─── Belgian Holiday Calculation ─────────────────────────────────────────────

interface BelgianHoliday {
  datum: Date;
  naam: string;
}

function getEasterDate(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1;
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month, day);
}

function addDaysToDate(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function getBelgianHolidays(year: number): BelgianHoliday[] {
  const easter = getEasterDate(year);
  return [
    { datum: new Date(year, 0, 1),             naam: 'Nieuwjaarsdag' },
    { datum: addDaysToDate(easter, 1),          naam: 'Paasmaandag' },
    { datum: new Date(year, 4, 1),              naam: 'Dag van de Arbeid' },
    { datum: addDaysToDate(easter, 39),         naam: 'O.L.H. Hemelvaart' },
    { datum: addDaysToDate(easter, 50),         naam: 'Pinkstermaandag' },
    { datum: new Date(year, 6, 21),             naam: 'Nationale Feestdag' },
    { datum: new Date(year, 7, 15),             naam: 'O.L.V. Hemelvaart' },
    { datum: new Date(year, 10, 1),             naam: 'Allerheiligen' },
    { datum: new Date(year, 10, 11),            naam: 'Wapenstilstand' },
    { datum: new Date(year, 11, 25),            naam: 'Kerstmis' },
  ];
}

function getBridgeDay(holiday: BelgianHoliday): BelgianHoliday | null {
  const dayOfWeek = holiday.datum.getDay();
  if (dayOfWeek === 2) return { datum: addDaysToDate(holiday.datum, -1), naam: `Brugdag (${holiday.naam})` };
  if (dayOfWeek === 4) return { datum: addDaysToDate(holiday.datum, 1),  naam: `Brugdag (${holiday.naam})` };
  return null;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

const DAY_NAMES_SHORT = ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za'];

// ─── Component ───────────────────────────────────────────────────────────────

export function PlannerSettings() {

  // ── Sluitingsdagen state ─────────────────────────────────────────────────
  const [sluitingsdagen, setSluitingsdagen] = useState<Sluitingsdag[]>([]);
  const [sluitingsDatum, setSluitingsDatum] = useState<Date | undefined>(undefined);
  const [sluitingsOmschrijving, setSluitingsOmschrijving] = useState('');
  const [datumPickerOpen, setDatumPickerOpen] = useState(false);
  const [editingSluitingsdag, setEditingSluitingsdag] = useState<Sluitingsdag | null>(null);
  const [isSluitingDialogOpen, setIsSluitingDialogOpen] = useState(false);
  const [sluitingEditForm, setSluitingEditForm] = useState({ datum: undefined as Date | undefined, omschrijving: '' });
  const [editDatumPickerOpen, setEditDatumPickerOpen] = useState(false);
  const [suggestieJaar, setSuggestieJaar] = useState(new Date().getFullYear());
  const [isFeestdagenOpen, setIsFeestdagenOpen] = useState(false);
  const [isArchiefOpen, setIsArchiefOpen] = useState(false);

  // ── Verlof state ─────────────────────────────────────────────────────────
  const [verlofItems, setVerlofItems] = useState<VerlofItem[]>([]);
  const [operatoren, setOperatoren] = useState<OperatorItem[]>([]);
  const [ploegen, setPloegen] = useState<PloegItem[]>([]);
  const [rotationPatterns, setRotationPatterns] = useState<RotationPatternItem[]>([]);
  const [verlofJaar, setVerlofJaar] = useState(new Date().getFullYear());
  const [verlofForm, setVerlofForm] = useState<{
    operator_ids: string[];
    van: Date | undefined;
    tot: Date | undefined;
    type: VerlofType;
    opmerking: string;
  }>({
    operator_ids: [],
    van: undefined,
    tot: undefined,
    type: 'Verlof',
    opmerking: '',
  });
  const [verlofVanOpen, setVerlofVanOpen] = useState(false);
  const [verlofTotOpen, setVerlofTotOpen] = useState(false);
  const [editingVerlof, setEditingVerlof] = useState<VerlofItem | null>(null);
  const [isVerlofDialogOpen, setIsVerlofDialogOpen] = useState(false);
  const [verlofEditForm, setVerlofEditForm] = useState<{
    operator_id: string;
    van: Date | undefined;
    tot: Date | undefined;
    type: VerlofType;
    opmerking: string;
  }>({
    operator_id: '',
    van: undefined,
    tot: undefined,
    type: 'Verlof',
    opmerking: '',
  });
  const [verlofEditVanOpen, setVerlofEditVanOpen] = useState(false);
  const [verlofEditTotOpen, setVerlofEditTotOpen] = useState(false);

  // ── Computed: Belgian holidays ───────────────────────────────────────────
  const holidays = useMemo(() => getBelgianHolidays(suggestieJaar), [suggestieJaar]);

  const suggestions = useMemo(() => {
    return holidays.map(h => {
      const alreadyAdded = sluitingsdagen.some(s => isSameDay(s.datum, h.datum));
      const bridge = getBridgeDay(h);
      const bridgeAlreadyAdded = bridge ? sluitingsdagen.some(s => isSameDay(s.datum, bridge.datum)) : false;
      return { holiday: h, alreadyAdded, bridge, bridgeAlreadyAdded };
    });
  }, [holidays, sluitingsdagen]);

  const upcomingSluitingsdagen = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return sluitingsdagen.filter(d => d.datum >= today);
  }, [sluitingsdagen]);

  const archivedSluitingsdagen = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return sluitingsdagen.filter(d => d.datum < today);
  }, [sluitingsdagen]);

  // ── Filtered verlof per jaar ─────────────────────────────────────────────
  const filteredVerlof = useMemo(() => {
    return verlofItems.filter(v =>
      v.van.getFullYear() === verlofJaar || v.tot.getFullYear() === verlofJaar
    );
  }, [verlofItems, verlofJaar]);

  // ── Operators gegroepeerd per pers voor de card-selector ─────────────────
  const persGroepen = useMemo(() => {
    // Build ploegId → press map from active rotation patterns
    const ploegPressMap = new Map<string, string>();
    for (const rp of rotationPatterns) {
      for (const week of Object.values(rp.patroon)) {
        for (const shift of (week.shifts ?? [])) {
          if (shift.teamId && !ploegPressMap.has(shift.teamId)) {
            ploegPressMap.set(shift.teamId, rp.pers);
          }
        }
      }
    }

    // Group each ploeg under exactly one press (from rotation pattern, fallback to first in presses[])
    const pressMap = new Map<string, PloegItem[]>();
    for (const ploeg of ploegen) {
      const press = ploegPressMap.get(ploeg.id) ?? ploeg.presses[0];
      if (!press) continue;
      if (!pressMap.has(press)) pressMap.set(press, []);
      pressMap.get(press)!.push(ploeg);
    }

    // Global overige: operators not in any ploeg AND have at least one press (no external contractors)
    const allPloegOpIds = new Set(ploegen.flatMap(pl => pl.leden));
    const overige = operatoren.filter(
      op => !allPloegOpIds.has(op.id) && op.presses.length > 0
    );

    const groepen = [...pressMap.keys()].sort().map(press => ({
      press,
      ploegen: pressMap.get(press)!,
    }));

    return { groepen, overige };
  }, [ploegen, operatoren, rotationPatterns]);

  const toggleVerlofOperator = (id: string) => {
    setVerlofForm(f => ({
      ...f,
      operator_ids: f.operator_ids.includes(id)
        ? f.operator_ids.filter(x => x !== id)
        : [...f.operator_ids, id],
    }));
  };

  const toggleAllInPloeg = (ploeg: PloegItem) => {
    const validIds = ploeg.leden.filter(id => operatoren.find(o => o.id === id));
    const allChecked = validIds.every(id => verlofForm.operator_ids.includes(id));
    setVerlofForm(f => ({
      ...f,
      operator_ids: allChecked
        ? f.operator_ids.filter(id => !validIds.includes(id))
        : [...new Set([...f.operator_ids, ...validIds])],
    }));
  };

  // ── Data laden ───────────────────────────────────────────────────────────
  useEffect(() => {
    async function fetchSluitingsdagen() {
      try {
        const records = await pb.collection('sluitingsdagen').getFullList({ sort: 'datum' });
        setSluitingsdagen(records.map(r => ({
          id: r.id,
          datum: new Date(r.datum),
          omschrijving: r.omschrijving,
          type: r.type,
        })));
      } catch (error) {
        console.error('Kon sluitingsdagen niet laden:', error);
      }
    }
    fetchSluitingsdagen();
  }, []);

  useEffect(() => {
    async function fetchOperatoren() {
      try {
        const records = await pb.collection('operatoren').getFullList({
          sort: 'naam',
          filter: 'active = true && dienstverband = "Intern"',
        });
        setOperatoren(records.map(r => ({
          id: r.id,
          naam: r.naam,
          presses: Array.isArray(r.presses) ? r.presses : [],
        })));
      } catch (e) {
        console.error('Kon operatoren niet laden:', e);
      }
    }
    fetchOperatoren();
  }, []);

  useEffect(() => {
    async function fetchPloegen() {
      try {
        const records = await pb.collection('ploegen').getFullList({
          sort: 'naam',
          filter: 'active = true',
        });
        setPloegen(records.map(r => ({
          id: r.id,
          naam: r.naam,
          leden: Array.isArray(r.leden) ? r.leden : [],
          presses: Array.isArray(r.presses) ? r.presses : [],
        })));
      } catch (e) {
        console.error('Kon ploegen niet laden:', e);
      }
    }
    fetchPloegen();
  }, []);

  useEffect(() => {
    async function fetchRotationPatterns() {
      try {
        const records = await pb.collection('rotation_patterns').getFullList({
          filter: 'actief = true',
        });
        setRotationPatterns(records.map(r => ({
          id: r.id,
          pers: r.pers,
          patroon: (r.patroon ?? {}) as RotationPatternItem['patroon'],
        })));
      } catch (e) {
        console.warn('Kon rotation_patterns niet laden:', e);
      }
    }
    fetchRotationPatterns();
  }, []);

  useEffect(() => {
    async function fetchVerlof() {
      try {
        const records = await pb.collection('verlof').getFullList({
          sort: 'van',
          expand: 'operator',
        });
        setVerlofItems(records.map(r => ({
          id: r.id,
          operator_id: r.operator,
          operator_naam: r.expand?.operator?.naam ?? '',
          van: new Date(r.van),
          tot: new Date(r.tot),
          type: (r.type as VerlofType) ?? 'andere',
          opmerking: r.opmerking ?? '',
        })));
      } catch (e) {
        // Collectie bestaat mogelijk nog niet — stil falen
        console.warn('Kon verlof niet laden:', e);
      }
    }
    fetchVerlof();
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // Sluitingsdagen handlers
  // ═══════════════════════════════════════════════════════════════════════════

  const addSluitingsdag = async (datum: Date, omschrijving: string, type: string = 'feestdag') => {
    if (sluitingsdagen.some(s => isSameDay(s.datum, datum))) {
      toast.info(`"${omschrijving}" staat al in de lijst`);
      return;
    }
    try {
      const record = await pb.collection('sluitingsdagen').create({
        datum: format(datum, 'yyyy-MM-dd') + ' 12:00:00.000Z',
        omschrijving: omschrijving.trim(),
        type,
      });
      const newDag: Sluitingsdag = {
        id: record.id,
        datum: new Date(record.datum),
        omschrijving: record.omschrijving,
        type: record.type,
      };
      setSluitingsdagen(prev => [...prev, newDag].sort((a, b) => a.datum.getTime() - b.datum.getTime()));
      toast.success(`"${omschrijving}" toegevoegd`);
    } catch (e) {
      console.error(e);
      toast.error('Fout bij opslaan sluitingsdag');
    }
  };

  const handleAddSluitingsdag = () => {
    if (!sluitingsDatum) { toast.error('Selecteer a.u.b. een datum'); return; }
    if (!sluitingsOmschrijving.trim()) { toast.error('Voer a.u.b. een omschrijving in'); return; }
    addSluitingsdag(sluitingsDatum, sluitingsOmschrijving);
    setSluitingsDatum(undefined);
    setSluitingsOmschrijving('');
  };

  const handleAddAllHolidays = async () => {
    let added = 0;
    for (const { holiday, alreadyAdded } of suggestions) {
      if (!alreadyAdded) {
        try {
          const record = await pb.collection('sluitingsdagen').create({
            datum: format(holiday.datum, 'yyyy-MM-dd') + ' 12:00:00.000Z',
            omschrijving: holiday.naam,
            type: 'feestdag',
          });
          const newDag: Sluitingsdag = {
            id: record.id,
            datum: new Date(record.datum),
            omschrijving: record.omschrijving,
            type: record.type,
          };
          setSluitingsdagen(prev => [...prev, newDag].sort((a, b) => a.datum.getTime() - b.datum.getTime()));
          added++;
        } catch (e) { console.error(e); }
      }
    }
    if (added > 0) {
      toast.success(`${added} feestdag${added > 1 ? 'en' : ''} toegevoegd`);
    } else {
      toast.info('Alle feestdagen staan al in de lijst');
    }
  };

  const handleDeleteSluitingsdag = async (id: string, omschrijving: string) => {
    try {
      await pb.collection('sluitingsdagen').delete(id);
      setSluitingsdagen(prev => prev.filter(d => d.id !== id));
      toast.success(`Sluitingsdag "${omschrijving}" verwijderd`);
    } catch (e) {
      console.error(e);
      toast.error('Kan sluitingsdag niet verwijderen');
    }
  };

  const openSluitingEditDialog = (dag: Sluitingsdag) => {
    setEditingSluitingsdag(dag);
    setSluitingEditForm({ datum: dag.datum, omschrijving: dag.omschrijving });
    setIsSluitingDialogOpen(true);
  };

  const closeSluitingEditDialog = () => {
    setIsSluitingDialogOpen(false);
    setEditingSluitingsdag(null);
  };

  const handleSluitingEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sluitingEditForm.datum) { toast.error('Selecteer a.u.b. een datum'); return; }
    if (!sluitingEditForm.omschrijving.trim()) { toast.error('Voer a.u.b. een omschrijving in'); return; }
    if (editingSluitingsdag) {
      try {
        const record = await pb.collection('sluitingsdagen').update(editingSluitingsdag.id, {
          datum: format(sluitingEditForm.datum, 'yyyy-MM-dd') + ' 12:00:00.000Z',
          omschrijving: sluitingEditForm.omschrijving.trim(),
        });
        setSluitingsdagen(prev =>
          prev
            .map(d => d.id === editingSluitingsdag.id
              ? { ...d, datum: new Date(record.datum), omschrijving: record.omschrijving }
              : d)
            .sort((a, b) => a.datum.getTime() - b.datum.getTime())
        );
        toast.success('Sluitingsdag bijgewerkt');
        closeSluitingEditDialog();
      } catch (e) {
        console.error(e);
        toast.error('Fout bij bijwerken sluitingsdag');
      }
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // Verlof handlers
  // ═══════════════════════════════════════════════════════════════════════════

  const resetVerlofForm = () => {
    setVerlofForm({ operator_ids: [], van: undefined, tot: undefined, type: 'Verlof', opmerking: '' });
  };

  const handleAddVerlof = async () => {
    if (verlofForm.operator_ids.length === 0) { toast.error('Selecteer a.u.b. minstens één medewerker'); return; }
    if (!verlofForm.van)  { toast.error('Selecteer a.u.b. een startdatum'); return; }
    if (!verlofForm.tot)  { toast.error('Selecteer a.u.b. een einddatum'); return; }
    if (verlofForm.tot < verlofForm.van) { toast.error('Einddatum moet na startdatum liggen'); return; }

    const newItems: VerlofItem[] = [];
    for (const opId of verlofForm.operator_ids) {
      try {
        const record = await pb.collection('verlof').create({
          operator:  opId,
          van:       format(verlofForm.van, 'yyyy-MM-dd') + ' 00:00:00.000Z',
          tot:       format(verlofForm.tot, 'yyyy-MM-dd') + ' 00:00:00.000Z',
          type:      verlofForm.type,
          opmerking: verlofForm.opmerking.trim(),
        });
        const operator = operatoren.find(o => o.id === opId);
        newItems.push({
          id: record.id,
          operator_id: record.operator,
          operator_naam: operator?.naam ?? '',
          van:  new Date(record.van),
          tot:  new Date(record.tot),
          type: record.type as VerlofType,
          opmerking: record.opmerking ?? '',
        });
      } catch (e) {
        console.error(e);
        toast.error(`Fout bij opslaan verlof`);
      }
    }
    if (newItems.length > 0) {
      setVerlofItems(prev => [...prev, ...newItems].sort((a, b) => a.van.getTime() - b.van.getTime()));
      const n = newItems.length;
      toast.success(n === 1 ? 'Verlof toegevoegd' : `${n} verlofrecords toegevoegd`);
      resetVerlofForm();
    }
  };

  const handleDeleteVerlof = async (id: string) => {
    try {
      await pb.collection('verlof').delete(id);
      setVerlofItems(prev => prev.filter(v => v.id !== id));
      toast.success('Verlof verwijderd');
    } catch (e) {
      console.error(e);
      toast.error('Fout bij verwijderen verlof');
    }
  };

  const openVerlofEditDialog = (item: VerlofItem) => {
    setEditingVerlof(item);
    setVerlofEditForm({
      operator_id: item.operator_id,
      van: item.van,
      tot: item.tot,
      type: item.type,
      opmerking: item.opmerking,
    });
    setIsVerlofDialogOpen(true);
  };

  const closeVerlofEditDialog = () => {
    setIsVerlofDialogOpen(false);
    setEditingVerlof(null);
  };

  const handleVerlofEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verlofEditForm.operator_id) { toast.error('Selecteer a.u.b. een medewerker'); return; }
    if (!verlofEditForm.van)         { toast.error('Selecteer a.u.b. een startdatum'); return; }
    if (!verlofEditForm.tot)         { toast.error('Selecteer a.u.b. een einddatum'); return; }
    if (verlofEditForm.tot < verlofEditForm.van) { toast.error('Einddatum moet na startdatum liggen'); return; }
    if (!editingVerlof) return;

    try {
      const record = await pb.collection('verlof').update(editingVerlof.id, {
        operator:  verlofEditForm.operator_id,
        van:       format(verlofEditForm.van!, 'yyyy-MM-dd') + ' 00:00:00.000Z',
        tot:       format(verlofEditForm.tot!, 'yyyy-MM-dd') + ' 00:00:00.000Z',
        type:      verlofEditForm.type,
        opmerking: verlofEditForm.opmerking.trim(),
      });
      const operator = operatoren.find(o => o.id === verlofEditForm.operator_id);
      setVerlofItems(prev =>
        prev
          .map(v => v.id === editingVerlof.id
            ? {
                ...v,
                operator_id:   record.operator,
                operator_naam: operator?.naam ?? v.operator_naam,
                van:           new Date(record.van),
                tot:           new Date(record.tot),
                type:          record.type as VerlofType,
                opmerking:     record.opmerking ?? '',
              }
            : v)
          .sort((a, b) => a.van.getTime() - b.van.getTime())
      );
      toast.success('Verlof bijgewerkt');
      closeVerlofEditDialog();
    } catch (e) {
      console.error(e);
      toast.error('Fout bij bijwerken verlof');
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div className="space-y-4">
      <PageHeader
        title="Planner Instellingen"
        description="Beheer sluitingsdagen en verlof voor de planner"
        icon={Settings2}
        iconColor="text-indigo-600"
        iconBgColor="bg-indigo-100"
        className="mb-2"
      />

      <Tabs defaultValue="verlof" className="w-full">
        <TabsList className="w-full grid grid-cols-2 h-10">
          <TabsTrigger value="verlof" className="gap-1.5">
            <Plane className="w-4 h-4" />
            Verlof &amp; Afwezigheden
          </TabsTrigger>
          <TabsTrigger value="sluitingsdagen" className="gap-1.5">
            <CalendarOff className="w-4 h-4" />
            Sluitingsdagen
          </TabsTrigger>
        </TabsList>

        {/* ════════════════════════════════════════════════════════════════════
            TAB 1 — Sluitingsdagen
           ════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="sluitingsdagen" className="mt-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Sluitingsdagen</h2>
                <p className="text-sm text-gray-500">Plan sluitingsdagen in en beheer het overzicht.</p>
              </div>
            </div>

            {/* ── Belgian Holiday Suggestions ──────────────────────────────── */}
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-200/80 shadow-sm overflow-hidden">
              {/* Header with year selector */}
              <div
                className="flex items-center justify-between px-5 py-3 border-b border-amber-200/60 cursor-pointer hover:bg-amber-100/30 transition-colors"
                onClick={() => setIsFeestdagenOpen(!isFeestdagenOpen)}
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-bold text-amber-900">Belgische Feestdagen</span>
                </div>
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-amber-700 hover:bg-amber-100"
                    onClick={() => setSuggestieJaar(y => y - 1)}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm font-bold text-amber-800 tabular-nums min-w-[3rem] text-center">
                    {suggestieJaar}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-amber-700 hover:bg-amber-100"
                    onClick={() => setSuggestieJaar(y => y + 1)}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                  <div className="w-px h-5 bg-amber-200 mx-1" />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs font-bold text-amber-700 hover:bg-amber-100 gap-1"
                    onClick={handleAddAllHolidays}
                  >
                    <Plus className="w-3 h-3" />
                    Alle toevoegen
                  </Button>
                  <div className="w-px h-5 bg-amber-200 mx-1" />
                  <button className="text-amber-700 hover:text-amber-900 focus:outline-none flex items-center justify-center p-1">
                    {isFeestdagenOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Holiday list */}
              {isFeestdagenOpen && (
                <div className="divide-y divide-amber-100">
                  {suggestions.map(({ holiday, alreadyAdded, bridge, bridgeAlreadyAdded }) => (
                    <div
                      key={holiday.naam + holiday.datum.toISOString()}
                      className={`flex items-center justify-between px-5 py-2.5 transition-colors ${
                        alreadyAdded ? 'bg-green-50/50' : 'hover:bg-amber-100/40'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex flex-col items-center bg-white rounded-lg border border-amber-200 px-2.5 py-1 min-w-[52px] shadow-sm">
                          <span className="text-[10px] font-bold text-amber-500 uppercase">
                            {DAY_NAMES_SHORT[holiday.datum.getDay()]}
                          </span>
                          <span className="text-sm font-black text-gray-800 leading-tight">
                            {holiday.datum.getDate()}
                          </span>
                          <span className="text-[10px] text-gray-500">
                            {holiday.datum.toLocaleDateString('nl-BE', { month: 'short' })}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <span className={`text-sm font-semibold ${alreadyAdded ? 'text-green-700' : 'text-gray-800'}`}>
                            {holiday.naam}
                          </span>
                          {alreadyAdded && (
                            <span className="ml-2 text-[10px] font-bold text-green-500 uppercase">✓ Toegevoegd</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {bridge && !bridgeAlreadyAdded && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-[11px] font-semibold border-orange-300 text-orange-700 bg-orange-50 hover:bg-orange-100 gap-1.5"
                            onClick={() => addSluitingsdag(bridge.datum, bridge.naam)}
                          >
                            <ArrowRight className="w-3 h-3" />
                            Brugdag toevoegen? ({format(bridge.datum, 'dd/MM')})
                          </Button>
                        )}
                        {bridge && bridgeAlreadyAdded && (
                          <Badge variant="outline" className="text-[10px] bg-green-50 text-green-600 border-green-200">
                            Brugdag ✓
                          </Badge>
                        )}

                        {!alreadyAdded ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs font-semibold border-amber-300 text-amber-800 bg-white hover:bg-amber-50 gap-1"
                            onClick={() => addSluitingsdag(holiday.datum, holiday.naam)}
                          >
                            <Plus className="w-3 h-3" />
                            Toevoegen
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => {
                              const match = sluitingsdagen.find(s => isSameDay(s.datum, holiday.datum));
                              if (match) handleDeleteSluitingsdag(match.id, match.omschrijving);
                            }}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick-add form (manual) */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
              <div className="flex flex-col sm:flex-row gap-3 items-end">
                <div className="grid gap-1.5 flex-1 min-w-[180px]">
                  <Label>Datum</Label>
                  <Popover open={datumPickerOpen} onOpenChange={setDatumPickerOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal h-9">
                        <CalendarDays className="mr-2 h-4 w-4 text-gray-500" />
                        {sluitingsDatum ? (
                          format(sluitingsDatum, 'dd MMMM yyyy', { locale: nl })
                        ) : (
                          <span className="text-muted-foreground">Kies een datum…</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={sluitingsDatum}
                        onSelect={(date) => { setSluitingsDatum(date); setDatumPickerOpen(false); }}
                        locale={nl}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="grid gap-1.5 flex-[2]">
                  <Label>Omschrijving</Label>
                  <Input
                    placeholder="bijv. Koningsdag"
                    value={sluitingsOmschrijving}
                    onChange={(e) => setSluitingsOmschrijving(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddSluitingsdag(); } }}
                  />
                </div>

                <Button onClick={handleAddSluitingsdag} className="gap-2 shrink-0">
                  <Plus className="w-4 h-4" />
                  Toevoegen
                </Button>
              </div>
            </div>

            {/* Sluitingsdagen list */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Datum</TableHead>
                    <TableHead>Omschrijving</TableHead>
                    <TableHead className="text-right">Acties</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {upcomingSluitingsdagen.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-12 text-gray-500">
                        <CalendarOff className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                        Geen aankomende sluitingsdagen gepland.
                      </TableCell>
                    </TableRow>
                  ) : (
                    upcomingSluitingsdagen.map((dag) => (
                      <TableRow key={dag.id}>
                        <TableCell className="font-medium w-48">
                          <div className="flex items-center gap-2">
                            <CalendarDays className="w-4 h-4 text-gray-400 shrink-0" />
                            {format(dag.datum, 'EEEE d MMMM yyyy', { locale: nl })}
                          </div>
                        </TableCell>
                        <TableCell>{dag.omschrijving}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => openSluitingEditDialog(dag)} title="Bewerken">
                              <Edit className="w-4 h-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm" title="Verwijderen">
                                  <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Sluitingsdag Verwijderen</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Weet u zeker dat u "{dag.omschrijving}" ({format(dag.datum, 'dd-MM-yyyy')}) wilt verwijderen?
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Annuleren</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteSluitingsdag(dag.id, dag.omschrijving)}
                                    className="bg-red-500 hover:bg-red-600"
                                  >
                                    Verwijderen
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Archived sluitingsdagen */}
            {archivedSluitingsdagen.length > 0 && (
              <div className="bg-gray-50 rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                <div
                  className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => setIsArchiefOpen(!isArchiefOpen)}
                >
                  <div className="flex items-center gap-2">
                    <Archive className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-semibold text-gray-700">
                      Archief sluitingsdagen ({archivedSluitingsdagen.length})
                    </span>
                  </div>
                  <button className="text-gray-500 hover:text-gray-700 focus:outline-none p-1">
                    {isArchiefOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>

                {isArchiefOpen && (
                  <div className="border-t border-gray-200">
                    <Table>
                      <TableBody>
                        {archivedSluitingsdagen.map((dag) => (
                          <TableRow key={dag.id} className="bg-gray-50/50 hover:bg-gray-100/50">
                            <TableCell className="font-medium w-48 text-gray-500">
                              <div className="flex items-center gap-2">
                                <CalendarDays className="w-4 h-4 text-gray-400 shrink-0" />
                                {format(dag.datum, 'EEEE d MMMM yyyy', { locale: nl })}
                              </div>
                            </TableCell>
                            <TableCell className="text-gray-500">{dag.omschrijving}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button variant="ghost" size="sm" onClick={() => openSluitingEditDialog(dag)} title="Bewerken">
                                  <Edit className="w-4 h-4 text-gray-400" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="sm" title="Verwijderen">
                                      <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Sluitingsdag Verwijderen</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Weet u zeker dat u "{dag.omschrijving}" ({format(dag.datum, 'dd-MM-yyyy')}) wilt verwijderen?
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Annuleren</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleDeleteSluitingsdag(dag.id, dag.omschrijving)}
                                        className="bg-red-500 hover:bg-red-600"
                                      >
                                        Verwijderen
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ════════════════════════════════════════════════════════════════════
            TAB 2 — Verlof & Afwezigheden
           ════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="verlof" className="mt-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Verlof &amp; Afwezigheden</h2>
                <p className="text-sm text-gray-500">Registreer verlof en afwezigheden per medewerker.</p>
              </div>
              {/* Jaar filter */}
              <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-2 py-1 shadow-sm">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-gray-600 hover:bg-gray-100"
                  onClick={() => setVerlofJaar(y => y - 1)}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm font-bold text-gray-800 tabular-nums min-w-[3rem] text-center">
                  {verlofJaar}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-gray-600 hover:bg-gray-100"
                  onClick={() => setVerlofJaar(y => y + 1)}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Quick-add form */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <div className="flex divide-x divide-gray-100">

                {/* ── LEFT: Operator card-selector ── */}
                <div className="flex-1 min-w-0 p-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Medewerker</p>

                  {persGroepen.groepen.length === 0 && persGroepen.overige.length === 0 ? (
                    <p className="text-sm text-gray-400 italic">Geen medewerkers gevonden.</p>
                  ) : (
                    <div className="flex gap-4">
                      {/* Press groups */}
                      <div className="flex-1 space-y-3">
                      {persGroepen.groepen.map(({ press, ploegen: ploegenVoorPers }) => (
                        <div key={press}>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">{press}</p>
                          <div className="flex flex-wrap gap-2">
                            {ploegenVoorPers.map((ploeg: PloegItem) => {
                              const validIds = ploeg.leden.filter(id => operatoren.find(o => o.id === id));
                              const allChecked = validIds.length > 0 && validIds.every(id => verlofForm.operator_ids.includes(id));
                              const someChecked = validIds.some(id => verlofForm.operator_ids.includes(id));
                              return (
                                <div
                                  key={ploeg.id}
                                  className={`border rounded-lg overflow-hidden min-w-[130px] ${
                                    allChecked ? 'border-indigo-300' : someChecked ? 'border-indigo-200' : 'border-gray-200'
                                  }`}
                                >
                                  {/* Clickable header — selects/deselects all */}
                                  <button
                                    type="button"
                                    onClick={() => toggleAllInPloeg(ploeg)}
                                    className={`w-full text-left px-2.5 py-1.5 flex items-center gap-2 transition-colors ${
                                      allChecked
                                        ? 'bg-indigo-50 hover:bg-indigo-100'
                                        : someChecked
                                        ? 'bg-indigo-50/40 hover:bg-indigo-50'
                                        : 'bg-gray-50 hover:bg-gray-100'
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={allChecked}
                                      ref={el => { if (el) el.indeterminate = someChecked && !allChecked; }}
                                      onChange={() => toggleAllInPloeg(ploeg)}
                                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 pointer-events-none"
                                    />
                                    <span className={`text-[10px] font-bold truncate ${allChecked || someChecked ? 'text-indigo-700' : 'text-gray-600'}`}>
                                      {ploeg.naam}
                                    </span>
                                  </button>
                                  {/* Members */}
                                  <div className="p-2 space-y-1 bg-gray-50/40">
                                    {ploeg.leden.map((opId: string) => {
                                      const op = operatoren.find(o => o.id === opId);
                                      if (!op) return null;
                                      const checked = verlofForm.operator_ids.includes(opId);
                                      return (
                                        <label key={opId} className="flex items-center gap-2 cursor-pointer group">
                                          <input
                                            type="checkbox"
                                            checked={checked}
                                            onChange={() => toggleVerlofOperator(opId)}
                                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                                          />
                                          <span className={`text-xs select-none truncate ${checked ? 'font-semibold text-gray-900' : 'text-gray-600 group-hover:text-gray-900'}`}>
                                            {op.naam}
                                          </span>
                                        </label>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                      </div>{/* end flex-1 press groups */}

                      {/* Overige — to the right of press groups */}
                      {persGroepen.overige.length > 0 && (
                        <div className="shrink-0">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Overige</p>
                          <div className="border border-dashed border-gray-200 rounded-lg bg-white p-2.5 flex flex-col gap-1 min-w-[130px]">
                            {persGroepen.overige.map((op: OperatorItem) => {
                              const checked = verlofForm.operator_ids.includes(op.id);
                              return (
                                <label key={op.id} className="flex items-center gap-2 cursor-pointer group">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => toggleVerlofOperator(op.id)}
                                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                                  />
                                  <span className={`text-xs select-none truncate ${checked ? 'font-semibold text-gray-900' : 'text-gray-600 group-hover:text-gray-900'}`}>
                                    {op.naam}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* ── RIGHT: Type / Dates / Opmerking / Button ── */}
                <div className="w-[30rem] shrink-0 p-4 flex flex-col gap-3">

                  {/* Type toggle */}
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</p>
                    <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
                      {VERLOF_TYPES.map(t => (
                        <button
                          key={t.value}
                          type="button"
                          onClick={() => setVerlofForm(f => ({ ...f, type: t.value }))}
                          className={`flex-1 px-2 py-1 text-xs font-bold rounded-md transition-all ${
                            verlofForm.type === t.value
                              ? 'bg-white shadow text-gray-900'
                              : 'text-gray-500 hover:text-gray-700'
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Van */}
                  <div className="space-y-1.5">
                    <Label className="text-xs">Van</Label>
                    <Popover open={verlofVanOpen} onOpenChange={setVerlofVanOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="justify-start text-left font-normal h-9 w-full">
                          <CalendarDays className="mr-2 h-4 w-4 text-gray-500 shrink-0" />
                          {verlofForm.van ? format(verlofForm.van, 'dd/MM/yyyy') : <span className="text-muted-foreground">Startdatum…</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="end">
                        <Calendar
                          mode="single"
                          selected={verlofForm.van}
                          onSelect={(d) => { setVerlofForm(f => ({ ...f, van: d })); setVerlofVanOpen(false); }}
                          locale={nl}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Tot */}
                  <div className="space-y-1.5">
                    <Label className="text-xs">Tot</Label>
                    <Popover open={verlofTotOpen} onOpenChange={setVerlofTotOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="justify-start text-left font-normal h-9 w-full">
                          <CalendarDays className="mr-2 h-4 w-4 text-gray-500 shrink-0" />
                          {verlofForm.tot ? format(verlofForm.tot, 'dd/MM/yyyy') : <span className="text-muted-foreground">Einddatum…</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="end">
                        <Calendar
                          mode="single"
                          selected={verlofForm.tot}
                          disabled={(d) => verlofForm.van ? d < verlofForm.van : false}
                          onSelect={(d) => { setVerlofForm(f => ({ ...f, tot: d })); setVerlofTotOpen(false); }}
                          locale={nl}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Opmerking */}
                  <div className="space-y-1.5 flex-1">
                    <Label className="text-xs">Opmerking <span className="text-gray-400 font-normal">(optioneel)</span></Label>
                    <Input
                      placeholder="bijv. Zomerverlof, week 30-31"
                      value={verlofForm.opmerking}
                      onChange={(e) => setVerlofForm(f => ({ ...f, opmerking: e.target.value }))}
                      className="h-9"
                    />
                  </div>

                  {/* Add button */}
                  <Button onClick={handleAddVerlof} className="gap-2 w-full mt-auto">
                    <Plus className="w-4 h-4" />
                    {verlofForm.operator_ids.length > 1 ? `${verlofForm.operator_ids.length} toevoegen` : 'Toevoegen'}
                  </Button>
                </div>
              </div>
            </div>

            {/* Verlof list */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Medewerker</TableHead>
                    <TableHead>Van</TableHead>
                    <TableHead>Tot</TableHead>
                    <TableHead className="text-center">Dagen</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Opmerking</TableHead>
                    <TableHead className="text-right">Acties</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVerlof.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-gray-500">
                        <Plane className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                        Geen verlof geregistreerd voor {verlofJaar}.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredVerlof.map((item) => {
                      const cfg = verlofTypeConfig(item.type);
                      return (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.operator_naam}</TableCell>
                          <TableCell className="whitespace-nowrap text-sm text-gray-700">
                            {format(item.van, 'dd/MM/yyyy')}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-sm text-gray-700">
                            {format(item.tot, 'dd/MM/yyyy')}
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="text-sm font-semibold tabular-nums text-gray-800">
                              {aantalDagen(item.van, item.tot)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-xs ${cfg.badgeClass}`}>
                              {cfg.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-gray-500 max-w-[200px] truncate">
                            {item.opmerking || '—'}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openVerlofEditDialog(item)}
                                title="Bewerken"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="sm" title="Verwijderen">
                                    <Trash2 className="w-4 h-4 text-red-500" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Verlof Verwijderen</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Weet u zeker dat u het verlof van {item.operator_naam} ({format(item.van, 'dd/MM/yyyy')} – {format(item.tot, 'dd/MM/yyyy')}) wilt verwijderen?
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Annuleren</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteVerlof(item.id)}
                                      className="bg-red-500 hover:bg-red-600"
                                    >
                                      Verwijderen
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* ══════════════════════════════════════════════════════════════════════
          Dialog — Sluitingsdag bewerken
         ══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={isSluitingDialogOpen} onOpenChange={closeSluitingEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Sluitingsdag Bewerken</DialogTitle>
            <DialogDescription>Werk de datum en omschrijving van de sluitingsdag bij.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSluitingEditSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Datum</Label>
                <Popover open={editDatumPickerOpen} onOpenChange={setEditDatumPickerOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal h-9">
                      <CalendarDays className="mr-2 h-4 w-4 text-gray-500" />
                      {sluitingEditForm.datum ? (
                        format(sluitingEditForm.datum, 'dd MMMM yyyy', { locale: nl })
                      ) : (
                        <span className="text-muted-foreground">Kies een datum…</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={sluitingEditForm.datum}
                      onSelect={(date) => { setSluitingEditForm({ ...sluitingEditForm, datum: date }); setEditDatumPickerOpen(false); }}
                      locale={nl}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="sluiting-edit-omschrijving">Omschrijving</Label>
                <Input
                  id="sluiting-edit-omschrijving"
                  placeholder="bijv. Koningsdag"
                  value={sluitingEditForm.omschrijving}
                  onChange={(e) => setSluitingEditForm({ ...sluitingEditForm, omschrijving: e.target.value })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeSluitingEditDialog}>Annuleren</Button>
              <Button type="submit">Bijwerken</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════════════════════════════════════════
          Dialog — Verlof bewerken
         ══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={isVerlofDialogOpen} onOpenChange={closeVerlofEditDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Verlof Bewerken</DialogTitle>
            <DialogDescription>Pas de gegevens van dit verlof aan.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleVerlofEditSubmit}>
            <div className="grid gap-4 py-4">
              {/* Medewerker */}
              <div className="grid gap-2">
                <Label>Medewerker</Label>
                <Select
                  value={verlofEditForm.operator_id}
                  onValueChange={(v) => setVerlofEditForm(f => ({ ...f, operator_id: v }))}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Kies medewerker…" />
                  </SelectTrigger>
                  <SelectContent>
                    {operatoren.map(op => (
                      <SelectItem key={op.id} value={op.id}>{op.naam}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Van & Tot */}
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label>Van</Label>
                  <Popover open={verlofEditVanOpen} onOpenChange={setVerlofEditVanOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal h-9">
                        <CalendarDays className="mr-2 h-4 w-4 text-gray-500" />
                        {verlofEditForm.van ? format(verlofEditForm.van, 'dd/MM/yyyy') : <span className="text-muted-foreground">Startdatum…</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={verlofEditForm.van}
                        onSelect={(d) => { setVerlofEditForm(f => ({ ...f, van: d })); setVerlofEditVanOpen(false); }}
                        locale={nl}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="grid gap-2">
                  <Label>Tot</Label>
                  <Popover open={verlofEditTotOpen} onOpenChange={setVerlofEditTotOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal h-9">
                        <CalendarDays className="mr-2 h-4 w-4 text-gray-500" />
                        {verlofEditForm.tot ? format(verlofEditForm.tot, 'dd/MM/yyyy') : <span className="text-muted-foreground">Einddatum…</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={verlofEditForm.tot}
                        disabled={(d) => verlofEditForm.van ? d < verlofEditForm.van : false}
                        onSelect={(d) => { setVerlofEditForm(f => ({ ...f, tot: d })); setVerlofEditTotOpen(false); }}
                        locale={nl}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Type */}
              <div className="grid gap-2">
                <Label>Type</Label>
                <Select
                  value={verlofEditForm.type}
                  onValueChange={(v) => setVerlofEditForm(f => ({ ...f, type: v as VerlofType }))}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VERLOF_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Opmerking */}
              <div className="grid gap-2">
                <Label>Opmerking <span className="text-gray-400 font-normal">(optioneel)</span></Label>
                <Input
                  placeholder="bijv. Zomerverlof"
                  value={verlofEditForm.opmerking}
                  onChange={(e) => setVerlofEditForm(f => ({ ...f, opmerking: e.target.value }))}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeVerlofEditDialog}>Annuleren</Button>
              <Button type="submit">Bijwerken</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
