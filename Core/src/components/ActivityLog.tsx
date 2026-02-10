import { useState, useMemo, useEffect, useCallback } from 'react';
import { useAuth, pb } from './AuthContext';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Search, Calendar, Activity, Info } from 'lucide-react';
import { Button } from './ui/button';
import { PageHeader } from './PageHeader';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';

export function ActivityLog() {
  const { user, hasPermission } = useAuth();
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAction, setFilterAction] = useState<string>('all');
  const [filterPress, setFilterPress] = useState<string>('all');
  const [filterEntity, setFilterEntity] = useState<string>('all');
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  const fetchLogs = useCallback(async () => {
    try {
      const records = await pb.collection('activity_logs').getFullList({
        sort: '-created'
      });
      setActivityLogs(records.map((r: any) => ({
        id: r.id,
        timestamp: new Date(r.created),
        user: r.user || 'Systeem',
        action: r.action || '',
        entity: r.entity || '',
        entityId: r.entity_id || r.entityId || r.entityid || '',
        entityName: r.entity_name || r.entityName || r.entityname || '',
        details: r.details || '',
        press: r.press || '',
        oldValue: r.old_value || r.oldValue || r.oldvalue || '',
        newValue: r.new_value || r.newValue || r.newvalue || ''
      })));
    } catch (e) {
      console.error("Failed to fetch activity logs", e);
    }
  }, []);

  useEffect(() => {
    fetchLogs();

    let isSubscribed = true;
    const subscribe = async () => {
      try {
        await pb.collection('activity_logs').subscribe('*', () => {
          if (isSubscribed) fetchLogs();
        });
      } catch (err) {
        console.error("Logs subscription failed:", err);
      }
    };

    subscribe();

    return () => {
      isSubscribed = false;
      pb.collection('activity_logs').unsubscribe('*').catch(() => { });
    };
  }, [fetchLogs]);

  const formatDateTime = (date: Date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'Created':
        return <Badge className="bg-green-500">Aangemaakt</Badge>;
      case 'Updated':
        return <Badge className="bg-blue-500">Bijgewerkt</Badge>;
      case 'Deleted':
        return <Badge className="bg-red-500">Verwijderd</Badge>;
      default:
        return <Badge variant="secondary">{action}</Badge>;
    }
  };

  const filteredLogs = useMemo(() => {
    return activityLogs.filter(log => {
      const matchesSearch =
        searchQuery === '' ||
        (log.user || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (log.entityName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (log.details || '').toLowerCase().includes(searchQuery.toLowerCase());

      const matchesAction = filterAction === 'all' || log.action === filterAction;

      // Permission Logic
      // 1. If user has 'logs_view_all', they can see everything (subject to other filters like press)
      // 2. If user ONLY has 'logs_view', they can see their own logs AND logs for their press
      let matchesPermission = true;
      if (hasPermission('logs_view_all')) {
        matchesPermission = true;
      } else if (hasPermission('logs_view')) {
        const isOwnLog = log.user === user?.username || log.user === user?.name;
        const isRelatedPress = user?.press && log.press === user.press;
        matchesPermission = !!(isOwnLog || isRelatedPress);
      } else {
        matchesPermission = false;
      }

      // Press filter logic
      let matchesPress = true;
      if (hasPermission('logs_view_all')) {
        matchesPress = filterPress === 'all' || log.press === filterPress;
      } else {
        // For restricted users, matchesPermission already handled press relevance
        matchesPress = true;
      }

      const matchesEntity = filterEntity === 'all' || log.entity === filterEntity;

      return matchesPermission && matchesSearch && matchesAction && matchesPress && matchesEntity;
    });
  }, [activityLogs, searchQuery, filterAction, filterPress, filterEntity, user, hasPermission]);

  const handleClearFilters = () => {
    setSearchQuery('');
    setFilterAction('all');
    setFilterPress('all');
    setFilterEntity('all');
  };

  const parseChanges = (oldStr: string, newStr: string) => {
    if (!oldStr && !newStr) return [];

    // Check if using the new structured separator |||
    if (oldStr.includes('|||') || newStr.includes('|||')) {
      const oldParts = oldStr.split('|||');
      const newParts = newStr.split('|||');

      const changes: { field: string; old: string; new: string }[] = [];
      const fieldNames = new Set<string>();

      // Map old values by field name
      const oldMap = new Map<string, string>();
      oldParts.forEach(part => {
        const colonIndex = part.indexOf(': ');
        if (colonIndex !== -1) {
          const field = part.substring(0, colonIndex);
          const val = part.substring(colonIndex + 2);
          oldMap.set(field, val);
          fieldNames.add(field);
        }
      });

      // Map new values by field name
      const newMap = new Map<string, string>();
      newParts.forEach(part => {
        const colonIndex = part.indexOf(': ');
        if (colonIndex !== -1) {
          const field = part.substring(0, colonIndex);
          const val = part.substring(colonIndex + 2);
          newMap.set(field, val);
          fieldNames.add(field);
        }
      });

      // Combine them
      Array.from(fieldNames)
        .forEach(field => {
          changes.push({
            field,
            old: oldMap.get(field) || '-',
            new: newMap.get(field) || '-'
          });
        });

      return changes;
    }

    // Fallback for older logs or simple logs: split by ' · '
    const oldParts = oldStr.split(' · ');
    const newParts = newStr.split(' · ');

    // If they have field names like "Field: Value", try to match them
    if (oldStr.includes(': ') || newStr.includes(': ')) {
      const changes: { field: string; old: string; new: string }[] = [];
      const fieldNames = new Set<string>();

      const parsePart = (part: string) => {
        const colonIndex = part.indexOf(': ');
        if (colonIndex !== -1) {
          return { field: part.substring(0, colonIndex), val: part.substring(colonIndex + 2) };
        }
        return { field: 'Gevallen', val: part };
      };

      const oldMap = new Map<string, string>();
      oldParts.forEach(p => {
        const { field, val } = parsePart(p);
        oldMap.set(field, val);
        fieldNames.add(field);
      });

      const newMap = new Map<string, string>();
      newParts.forEach(p => {
        const { field, val } = parsePart(p);
        newMap.set(field, val);
        fieldNames.add(field);
      });

      Array.from(fieldNames)
        .forEach(f => {
          changes.push({ field: f, old: oldMap.get(f) || '-', new: newMap.get(f) || '-' });
        });
      return changes;
    }

    // Very simple fallback: just pairs correctly if possible
    const maxLen = Math.max(oldParts.length, newParts.length);
    const result = [];
    for (let i = 0; i < maxLen; i++) {
      result.push({
        field: `Item ${i + 1}`,
        old: oldParts[i] || '-',
        new: newParts[i] || '-'
      });
    }
    return result;
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Activiteitenlogboek"
        description="Volg alle wijzigingen en activiteiten in het systeem"
        icon={Activity}
      />

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="md:col-span-2">
            <Label htmlFor="search" className="mb-2 block">Zoeken</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                id="search"
                placeholder="Zoeken op gebruiker, taak of details..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="mb-2 pl-10"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="filterAction" className="mb-2 block">Actie</Label>
            <Select value={filterAction} onValueChange={setFilterAction}>
              <SelectTrigger id="filterAction">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Acties</SelectItem>
                <SelectItem value="Created">Aangemaakt</SelectItem>
                <SelectItem value="Updated">Bijgewerkt</SelectItem>
                <SelectItem value="Deleted">Verwijderd</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Hide Press Filter for Press Role */}
          {hasPermission('logs_view_all') && (
            <div>
              <Label htmlFor="filterPress" className="mb-2 block">Pers</Label>
              <Select value={filterPress} onValueChange={setFilterPress}>
                <SelectTrigger id="filterPress">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Persen</SelectItem>
                  <SelectItem value="Lithoman">Lithoman</SelectItem>
                  <SelectItem value="C80">C80</SelectItem>
                  <SelectItem value="C818">C818</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label htmlFor="filterEntity" className="mb-2 block">Entiteit</Label>
            <Select value={filterEntity} onValueChange={setFilterEntity}>
              <SelectTrigger id="filterEntity">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Entiteiten</SelectItem>
                <SelectItem value="Task">Taak</SelectItem>
                <SelectItem value="FinishedJob">Drukwerk</SelectItem>
                <SelectItem value="Operator">Operator</SelectItem>
                <SelectItem value="Role">Rol</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {(searchQuery || filterAction !== 'all' || (hasPermission('logs_view_all') && filterPress !== 'all') || filterEntity !== 'all') && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-gray-600">
              Toont {filteredLogs.length} van {activityLogs.length} activiteiten
            </p>
            <button
              onClick={handleClearFilters}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Filters Wissen
            </button>
          </div>
        )}
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/50">
              <TableHead className="w-[180px]">Tijdstip</TableHead>
              <TableHead>Naam</TableHead>
              <TableHead>Actie</TableHead>
              <TableHead>Entiteit</TableHead>
              <TableHead>Taak</TableHead>
              <TableHead>Pers</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLogs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                  {activityLogs.length === 0
                    ? 'Nog geen activiteitenlogs. Begin met het aanbrengen van wijzigingen om ze hier te zien.'
                    : 'Geen logs die overeenkomen met uw filters.'}
                </TableCell>
              </TableRow>
            ) : (
              filteredLogs.map((log) => (
                <TableRow
                  key={log.id}
                  className="cursor-pointer hover:bg-gray-50/80 transition-colors group"
                  onClick={() => setSelectedLog(log)}
                >
                  <TableCell className="text-gray-600">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {formatDateTime(log.timestamp)}
                    </div>
                  </TableCell>
                  <TableCell>{log.user}</TableCell>
                  <TableCell>{getActionBadge(log.action)}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{log.entity}</Badge>
                  </TableCell>
                  <TableCell>{log.entityName}</TableCell>
                  <TableCell>
                    {log.press && <Badge variant="secondary">{log.press}</Badge>}
                  </TableCell>
                  <TableCell className="max-w-md">
                    <div className="flex flex-col gap-1.5">
                      {log.action === 'Updated' ? (
                        parseChanges(log.oldValue || '', log.newValue || '')
                          .filter(change => !change.field.toLowerCase().includes('volgend onderhoud') && !change.field.toLowerCase().includes('volgende datum'))
                          .map((change, idx) => (
                            <div key={idx} className="text-xs flex items-baseline gap-1.5 flex-wrap">
                              <span className="font-bold text-gray-900 shrink-0">{change.field}:</span>
                              {change.old !== '-' && (
                                <>
                                  <span className="text-gray-400 italic line-through font-normal">{change.old}</span>
                                  <span className="text-gray-400">→</span>
                                </>
                              )}
                              <span className="text-blue-700 font-medium">{change.new}</span>
                            </div>
                          ))
                      ) : (
                        <div className="text-gray-900 font-medium flex items-center justify-between">
                          <span>{log.details}</span>
                          <Info className="w-4 h-4 text-gray-300 group-hover:text-blue-400 transition-colors" />
                        </div>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Log Details Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-600" />
              Activiteit Details
            </DialogTitle>
            <div className="text-sm text-gray-500">
              {selectedLog && (
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm">
                  <span>Gebruiker: <strong>{selectedLog.user}</strong></span>
                  <span>Pers: <strong>{selectedLog.press || '-'}</strong></span>
                  <span>Tijd: <strong>{formatDateTime(selectedLog.timestamp)}</strong></span>
                </div>
              )}
            </div>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-100">
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Entiteit</h4>
                  <p className="text-sm font-medium text-gray-900">{selectedLog.entity} | {selectedLog.entityName}</p>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Actie</h4>
                  <div className="flex items-center gap-2">
                    {getActionBadge(selectedLog.action)}
                    {selectedLog.action !== 'Updated' && (
                      <span className="text-sm text-gray-700">{selectedLog.details}</span>
                    )}
                  </div>
                </div>
              </div>

              {(selectedLog.oldValue || selectedLog.newValue) && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Search className="w-4 h-4 text-blue-500" />
                    Wijzigingenoverzicht
                  </h3>
                  <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm space-y-3">
                    {parseChanges(selectedLog.oldValue || '', selectedLog.newValue || '')
                      .filter(change => !change.field.toLowerCase().includes('volgend onderhoud') && !change.field.toLowerCase().includes('volgende datum'))
                      .map((change, idx) => {
                        const oldVal = change.old.length > 100 ? change.old.substring(0, 97) + '...' : change.old;
                        const newVal = change.new.length > 100 ? change.new.substring(0, 97) + '...' : change.new;

                        return (
                          <div key={idx} className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2 border-b border-gray-50 last:border-0 pb-2 last:pb-0">
                            <span className="font-bold text-gray-900 shrink-0">{change.field}:</span>
                            <div className="flex flex-wrap items-center gap-1.5">
                              {change.old !== '-' && (
                                <>
                                  <span className="text-gray-400 italic line-through font-normal">{oldVal}</span>
                                  <span className="text-gray-400">→</span>
                                </>
                              )}
                              <span className="text-blue-700 font-medium">{newVal}</span>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* History Section */}
              {selectedLog.entityId && selectedLog.entityId !== 'new' && (
                <div className="space-y-3 pt-2 border-t border-gray-100">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    Activiteitshistorie (Vorige wijzigingen)
                  </h3>
                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50/80">
                          <TableHead className="w-[120px] font-semibold text-gray-900">Datum</TableHead>
                          <TableHead className="font-semibold text-gray-900">Taak</TableHead>
                          <TableHead className="font-semibold text-gray-900">Laatste onderhoud</TableHead>
                          <TableHead className="font-semibold text-gray-900">Volgende onderhoud</TableHead>
                          <TableHead className="font-semibold text-gray-900">Operators</TableHead>
                          <TableHead className="font-semibold text-gray-900">Opmerkingen</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {activityLogs
                          .filter(l => l.entity === selectedLog.entity && l.entityId === selectedLog.entityId)
                          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                          .map((histLog) => {
                            const histChanges = parseChanges(histLog.oldValue || '', histLog.newValue || '');
                            const lastMaintenance = histChanges.find(c => {
                              const f = c.field.toLowerCase();
                              return f.includes('laatste onderhoud') || f.includes('datum') || f === 'last_date';
                            })?.new || '-';
                            const nextMaintenance = histChanges.find(c => {
                              const f = c.field.toLowerCase();
                              return f.includes('volgend onderhoud') || f.includes('volgende datum') || f === 'next_date';
                            })?.new || '-';
                            const operators = histChanges.find(c => {
                              const f = c.field.toLowerCase();
                              return f.includes('operator') || f.includes('toegewezen') || f.includes('assigned_operator');
                            })?.new || '-';
                            const opmerkingen = histChanges.find(c => {
                              const f = c.field.toLowerCase();
                              return f.includes('opmerking');
                            })?.new || '-';

                            return (
                              <TableRow key={histLog.id} className={histLog.id === selectedLog.id ? "bg-blue-50/30" : ""}>
                                <TableCell className="text-xs text-gray-500 whitespace-nowrap">
                                  {formatDateTime(histLog.timestamp)}
                                </TableCell>
                                <TableCell className="text-xs font-medium text-gray-700">
                                  {histLog.entityName}
                                </TableCell>
                                <TableCell className="text-xs text-gray-600">
                                  {lastMaintenance}
                                </TableCell>
                                <TableCell className="text-xs text-gray-600">
                                  {nextMaintenance}
                                </TableCell>
                                <TableCell className="text-xs text-gray-600">
                                  {operators}
                                </TableCell>
                                <TableCell className="text-xs text-gray-600 italic max-w-xs truncate">
                                  {opmerkingen}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}


            </div>
          )}

          <div className="flex justify-end mt-1">
            <Button variant="outline" onClick={() => setSelectedLog(null)}>Sluiten</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
