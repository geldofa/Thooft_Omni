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
import { Search, Calendar, Activity } from 'lucide-react';
import { Button } from './ui/button';
import { PageHeader } from './PageHeader';

export function ActivityLog() {
  const { user, hasPermission } = useAuth();
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAction, setFilterAction] = useState<string>('all');
  const [filterPress, setFilterPress] = useState<string>('all');
  const [filterEntity, setFilterEntity] = useState<string>('all');

  const fetchLogs = useCallback(async () => {
    try {
      setIsLoading(true);
      const records = await pb.collection('activity_logs').getFullList({
        sort: '-created'
      });
      setActivityLogs(records.map((r: any) => ({
        id: r.id,
        timestamp: new Date(r.created),
        user: r.user,
        action: r.action,
        entity: r.entity,
        entityId: r.entityId,
        entityName: r.entityName,
        details: r.details,
        press: r.press,
        oldValue: r.old_value,
        newValue: r.new_value
      })));
    } catch (e) {
      console.error("Failed to fetch activity logs", e);
    } finally {
      setIsLoading(false);
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
        log.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.entityName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.details.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesAction = filterAction === 'all' || log.action === filterAction;

      // Permission Logic
      // 1. If user has 'logs_view_all', they can see everything (subject to other filters like press)
      // 2. If user ONLY has 'logs_view', they can only see their OWN logs
      let matchesPermission = true;
      if (hasPermission('logs_view_all')) {
        matchesPermission = true;
      } else if (hasPermission('logs_view')) {
        matchesPermission = log.user === user?.username;
      } else {
        matchesPermission = false; // Should not happen if route is protected, but safe fallback
      }

      // Press filter logic (Only relevant if they can see more than just their own, or if they want to filter their own by press)
      let matchesPress = true;
      if (hasPermission('logs_view_all')) {
        matchesPress = filterPress === 'all' || log.press === filterPress;
      } else {
        // If restricted to own logs, we don't really need press filter (it's hidden in UI), 
        // but if it were visible, logic remains simple.
        // However, the original code had specific logic for press role users. 
        // Let's keep it consistent: strictly own logs for 'logs_view'.
        matchesPress = true;
      }

      const matchesEntity = filterEntity === 'all' || log.entity === filterEntity;

      return matchesPermission && matchesSearch && matchesAction && matchesPress && matchesEntity;
    });
  }, [activityLogs, searchQuery, filterAction, filterPress, filterEntity, user]);

  const handleClearFilters = () => {
    setSearchQuery('');
    setFilterAction('all');
    setFilterPress('all');
    setFilterEntity('all');
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
          {hasPermission('logs_view') && (
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
                <SelectItem value="Operator">Operator</SelectItem>
                <SelectItem value="Role">Rol</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {(searchQuery || filterAction !== 'all' || filterPress !== 'all' || filterEntity !== 'all') && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-gray-600">
              Toont {filteredLogs.length} van {activityLogs.length} activiteiten
            </p>
            <Button variant="outline" size="sm" onClick={handleClearFilters}>
              Filters Wissen
            </Button>
          </div>
        )}
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
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
                <TableRow key={log.id}>
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
                    <div className="text-gray-900 font-medium">{log.details}</div>
                    {(log.oldValue || log.newValue) && (
                      <div className="text-sm mt-1 flex items-center gap-2 flex-wrap">
                        {log.oldValue && (
                          <span className="text-gray-400 line-through decoration-gray-400">
                            {log.oldValue}
                          </span>
                        )}
                        {log.oldValue && log.newValue && (
                          <span className="text-gray-400">→</span>
                        )}
                        {log.newValue && (
                          <span className="text-gray-700 font-medium bg-blue-50 px-1 rounded">
                            {log.newValue}
                          </span>
                        )}
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
