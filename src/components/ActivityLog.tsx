import { useState, useMemo } from 'react';
import { useAuth } from './AuthContext';
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
import { Search, Calendar } from 'lucide-react';
import { Button } from './ui/button';

export function ActivityLog() {
  const { activityLogs, user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAction, setFilterAction] = useState<string>('all');
  const [filterPress, setFilterPress] = useState<string>('all');
  const [filterEntity, setFilterEntity] = useState<string>('all');

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

      // Press filter logic
      let matchesPress = true;
      if (user?.role === 'press' && user.press) {
        // Strict filtering for press users
        matchesPress = log.press === user.press;
      } else {
        // Normal filtering for others
        matchesPress = filterPress === 'all' || log.press === filterPress;
      }

      const matchesEntity = filterEntity === 'all' || log.entity === filterEntity;

      return matchesSearch && matchesAction && matchesPress && matchesEntity;
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
      <div>
        <h2 className="text-gray-900">Activiteitenlogboek</h2>
        <p className="text-gray-600 mt-1">
          Volg alle wijzigingen en activiteiten in het systeem
        </p>
      </div>

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
                className="pl-10"
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
          {user?.role !== 'press' && (
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
