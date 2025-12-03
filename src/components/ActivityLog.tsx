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
  const { activityLogs } = useAuth();
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
        return <Badge className="bg-green-500">Created</Badge>;
      case 'Updated':
        return <Badge className="bg-blue-500">Updated</Badge>;
      case 'Deleted':
        return <Badge className="bg-red-500">Deleted</Badge>;
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
      const matchesPress = filterPress === 'all' || log.press === filterPress;
      const matchesEntity = filterEntity === 'all' || log.entity === filterEntity;

      return matchesSearch && matchesAction && matchesPress && matchesEntity;
    });
  }, [activityLogs, searchQuery, filterAction, filterPress, filterEntity]);

  const handleClearFilters = () => {
    setSearchQuery('');
    setFilterAction('all');
    setFilterPress('all');
    setFilterEntity('all');
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-gray-900">Activity Log</h2>
        <p className="text-gray-600 mt-1">
          Track all changes and activities in the system
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="md:col-span-2">
            <Label htmlFor="search" className="mb-2 block">Search</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                id="search"
                placeholder="Search by user, task, or details..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="filterAction" className="mb-2 block">Action</Label>
            <Select value={filterAction} onValueChange={setFilterAction}>
              <SelectTrigger id="filterAction">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="Created">Created</SelectItem>
                <SelectItem value="Updated">Updated</SelectItem>
                <SelectItem value="Deleted">Deleted</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="filterPress" className="mb-2 block">Press</Label>
            <Select value={filterPress} onValueChange={setFilterPress}>
              <SelectTrigger id="filterPress">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Presses</SelectItem>
                <SelectItem value="Lithoman">Lithoman</SelectItem>
                <SelectItem value="C80">C80</SelectItem>
                <SelectItem value="C818">C818</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="filterEntity" className="mb-2 block">Entity</Label>
            <Select value={filterEntity} onValueChange={setFilterEntity}>
              <SelectTrigger id="filterEntity">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Entities</SelectItem>
                <SelectItem value="Task">Task</SelectItem>
                <SelectItem value="Operator">Operator</SelectItem>
                <SelectItem value="Role">Role</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {(searchQuery || filterAction !== 'all' || filterPress !== 'all' || filterEntity !== 'all') && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-gray-600">
              Showing {filteredLogs.length} of {activityLogs.length} activities
            </p>
            <Button variant="outline" size="sm" onClick={handleClearFilters}>
              Clear Filters
            </Button>
          </div>
        )}
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[180px]">Timestamp</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Press</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLogs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                  {activityLogs.length === 0
                    ? 'No activity logs yet. Start making changes to see them here.'
                    : 'No logs match your filters.'}
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
                    <div className="text-gray-600">{log.details}</div>
                    {(log.oldValue || log.newValue) && (
                      <div className="text-gray-500 mt-1">
                        {log.oldValue && <span className="line-through">{log.oldValue}</span>}
                        {log.oldValue && log.newValue && <span className="mx-2">→</span>}
                        {log.newValue && <span className="text-gray-700">{log.newValue}</span>}
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
