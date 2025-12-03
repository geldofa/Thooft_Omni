import { useState, useEffect } from 'react';
import { useAuth, Operator, ExternalEntity, PressType } from './AuthContext';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Edit, Trash2, Plus, Check } from 'lucide-react';
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
} from './ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Checkbox } from './ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { toast } from 'sonner';

export function OperatorManagement() {
  const {
    operators,
    addOperator,
    updateOperator,
    deleteOperator,
    externalEntities,
    addExternalEntity,
    updateExternalEntity,
    deleteExternalEntity,
    addActivityLog,
    user,
    presses
  } = useAuth();

  // Get active presses for columns
  const activePresses = presses
    .filter(p => p.active && !p.archived)
    .map(p => p.name);

  // Operator State
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingOperator, setEditingOperator] = useState<Operator | null>(null);
  const [operatorFormData, setOperatorFormData] = useState({
    employeeId: '',
    name: '',
    presses: [] as PressType[],
    active: true,
    canEditTasks: false,
    canAccessOperatorManagement: false
  });
  const [showInactive, setShowInactive] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editedOperators, setEditedOperators] = useState<Operator[]>([]);

  // External Entity State
  const [isExternalDialogOpen, setIsExternalDialogOpen] = useState(false);
  const [editingExternal, setEditingExternal] = useState<ExternalEntity | null>(null);
  const [externalFormData, setExternalFormData] = useState({
    name: '',
    presses: [] as PressType[],
    active: true
  });
  const [externalEditMode, setExternalEditMode] = useState(false);
  const [editedExternalEntities, setEditedExternalEntities] = useState<ExternalEntity[]>([]);

  // --- Operator Logic ---
  useEffect(() => {
    if (editMode) {
      setEditedOperators(operators);
    }
  }, [editMode, operators]);

  const handleEditChange = (id: string, field: keyof Operator, value: any) => {
    setEditedOperators(prev =>
      prev.map(op => (op.id === id ? { ...op, [field]: value } : op))
    );
  };

  const filteredOperators = operators.filter(operator => {
    const statusMatch = showInactive ? true : operator.active;
    return statusMatch;
  });

  const handleSaveChanges = () => {
    editedOperators.forEach(editedOperator => {
      const originalOperator = operators.find(op => op.id === editedOperator.id);
      if (originalOperator && JSON.stringify(originalOperator) !== JSON.stringify(editedOperator)) {
        updateOperator(editedOperator);
      }
    });
    toast.success('Changes saved successfully');
    setEditMode(false);
  };

  const handleOpenDialog = (operator?: Operator) => {
    if (operator) {
      setEditingOperator(operator);
      setOperatorFormData({
        employeeId: operator.employeeId,
        name: operator.name,
        presses: operator.presses,
        active: operator.active,
        canEditTasks: operator.canEditTasks,
        canAccessOperatorManagement: operator.canAccessOperatorManagement
      });
    } else {
      setEditingOperator(null);
      setOperatorFormData({
        employeeId: '',
        name: '',
        presses: [],
        active: true,
        canEditTasks: false,
        canAccessOperatorManagement: false
      });
      setIsAddDialogOpen(true);
    }
  };

  const handleCloseDialog = () => {
    setIsAddDialogOpen(false);
    setEditingOperator(null);
    setOperatorFormData({
      employeeId: '',
      name: '',
      presses: [],
      active: true,
      canEditTasks: false,
      canAccessOperatorManagement: false
    });
  };

  const handlePressToggle = (press: PressType) => {
    setOperatorFormData(prev => ({
      ...prev,
      presses: prev.presses.includes(press)
        ? prev.presses.filter(p => p !== press)
        : [...prev.presses, press]
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!operatorFormData.name.trim()) {
      toast.error('Please enter operator name');
      return;
    }

    if (!operatorFormData.employeeId.trim()) {
      toast.error('Please enter employee ID');
      return;
    }

    if (operatorFormData.presses.length === 0) {
      toast.error('Please select at least one press');
      return;
    }

    if (editingOperator) {
      const updatedOperator = {
        ...editingOperator,
        ...operatorFormData
      };
      updateOperator(updatedOperator);
      toast.success('Operator updated successfully');

      addActivityLog({
        user: user?.username || 'Unknown',
        action: 'Updated',
        entity: 'Operator',
        entityId: editingOperator.id,
        entityName: operatorFormData.name,
        details: `Updated operator presses: ${operatorFormData.presses.join(', ')}`
      });
    } else {
      addOperator(operatorFormData);
      toast.success('Operator added successfully');

      addActivityLog({
        user: user?.username || 'Unknown',
        action: 'Created',
        entity: 'Operator',
        entityId: 'new',
        entityName: operatorFormData.name,
        details: `Added new operator with presses: ${operatorFormData.presses.join(', ')}`
      });
    }

    handleCloseDialog();
  };

  const handleDelete = (id: string, name: string) => {
    deleteOperator(id);
    toast.success(`Operator "${name}" deleted successfully`);

    addActivityLog({
      user: user?.username || 'Unknown',
      action: 'Deleted',
      entity: 'Operator',
      entityId: id,
      entityName: name,
      details: `Deleted operator`
    });
  };

  // --- External Entity Logic ---
  useEffect(() => {
    if (externalEditMode) {
      setEditedExternalEntities(externalEntities);
    }
  }, [externalEditMode, externalEntities]);

  const handleExternalEditChange = (id: string, field: keyof ExternalEntity, value: any) => {
    setEditedExternalEntities(prev =>
      prev.map(entity => (entity.id === id ? { ...entity, [field]: value } : entity))
    );
  };

  const handleExternalSaveChanges = () => {
    editedExternalEntities.forEach(editedEntity => {
      const originalEntity = externalEntities.find(e => e.id === editedEntity.id);
      if (originalEntity && JSON.stringify(originalEntity) !== JSON.stringify(editedEntity)) {
        updateExternalEntity(editedEntity);
      }
    });
    toast.success('Changes saved successfully');
    setExternalEditMode(false);
  };

  const handleOpenExternalDialog = (entity?: ExternalEntity) => {
    if (entity) {
      setEditingExternal(entity);
      setExternalFormData({
        name: entity.name,
        presses: entity.presses,
        active: entity.active
      });
    } else {
      setEditingExternal(null);
      setExternalFormData({
        name: '',
        presses: [],
        active: true
      });
      setIsExternalDialogOpen(true);
    }
  };

  const handleCloseExternalDialog = () => {
    setIsExternalDialogOpen(false);
    setEditingExternal(null);
    setExternalFormData({
      name: '',
      presses: [],
      active: true
    });
  };

  const handleExternalPressToggle = (press: PressType) => {
    setExternalFormData(prev => ({
      ...prev,
      presses: prev.presses.includes(press)
        ? prev.presses.filter(p => p !== press)
        : [...prev.presses, press]
    }));
  };

  const handleExternalSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!externalFormData.name.trim()) {
      toast.error('Please enter entity name');
      return;
    }

    if (externalFormData.presses.length === 0) {
      toast.error('Please select at least one press');
      return;
    }

    if (editingExternal) {
      const updatedEntity = {
        ...editingExternal,
        ...externalFormData
      };
      updateExternalEntity(updatedEntity);
      toast.success('External entity updated successfully');

      addActivityLog({
        user: user?.username || 'Unknown',
        action: 'Updated',
        entity: 'External Entity',
        entityId: editingExternal.id,
        entityName: externalFormData.name,
        details: `Updated external entity presses: ${externalFormData.presses.join(', ')}`
      });
    } else {
      addExternalEntity(externalFormData);
      toast.success('External entity added successfully');

      addActivityLog({
        user: user?.username || 'Unknown',
        action: 'Created',
        entity: 'External Entity',
        entityId: 'new',
        entityName: externalFormData.name,
        details: `Added new external entity with presses: ${externalFormData.presses.join(', ')}`
      });
    }

    handleCloseExternalDialog();
  };

  const handleDeleteExternal = (id: string, name: string) => {
    deleteExternalEntity(id);
    toast.success(`External entity "${name}" deleted successfully`);

    addActivityLog({
      user: user?.username || 'Unknown',
      action: 'Deleted',
      entity: 'External Entity',
      entityId: id,
      entityName: name,
      details: `Deleted external entity`
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-gray-900">Personnel Management</h2>
          <p className="text-gray-600 mt-1">
            Manage operators and external entities
          </p>
        </div>
      </div>

      <Tabs defaultValue="operators" className="w-full">
        <TabsList>
          <TabsTrigger value="operators">Operators</TabsTrigger>
          <TabsTrigger value="external">External Entities</TabsTrigger>
        </TabsList>

        {/* OPERATORS TAB */}
        <TabsContent value="operators" className="space-y-4">
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-2">
              <Button
                variant={showInactive ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => setShowInactive(!showInactive)}
                className={showInactive ? 'bg-gray-200 hover:bg-gray-300 text-gray-900' : 'text-gray-500'}
              >
                {showInactive ? 'Showing Inactive' : 'Show Inactive'}
              </Button>
            </div>
            <div className="flex gap-2">
              {editMode && (
                <Button onClick={handleSaveChanges}>Save Changes</Button>
              )}
              <Button onClick={() => setEditMode(!editMode)} variant="outline">
                {editMode ? 'Cancel' : 'Edit Mode'}
              </Button>
              <Button onClick={() => handleOpenDialog()} className="gap-2">
                <Plus className="w-4 h-4" />
                Add Operator
              </Button>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 hover:bg-gray-50">
                  <TableHead className="border-r border-gray-200 font-semibold text-gray-900">ID</TableHead>
                  <TableHead className="border-r border-gray-200 font-semibold text-gray-900">Name</TableHead>
                  {activePresses.map(press => (
                    <TableHead key={press} className="w-[100px] text-center border-r border-gray-200 font-semibold text-gray-900">{press}</TableHead>
                  ))}
                  <TableHead className="w-[100px] text-center border-r border-gray-200 font-semibold text-gray-900">Status</TableHead>
                  {!editMode && <TableHead className="text-right w-[100px] font-semibold text-gray-900">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {(editMode ? editedOperators : filteredOperators).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={editMode ? activePresses.length + 3 : activePresses.length + 4} className="text-center py-12 text-gray-500">
                      No operators found.
                    </TableCell>
                  </TableRow>
                ) : (
                  (editMode ? editedOperators : filteredOperators).map((operator) => (
                    <TableRow key={operator.id} className="hover:bg-gray-50/50">
                      <TableCell className="border-r border-gray-200">
                        {editMode ? (
                          <Input
                            value={operator.employeeId}
                            onChange={(e) => handleEditChange(operator.id, 'employeeId', e.target.value)}
                            className="h-8"
                          />
                        ) : (
                          operator.employeeId
                        )}
                      </TableCell>
                      <TableCell className="border-r border-gray-200 font-medium">
                        {editMode ? (
                          <Input
                            value={operator.name}
                            onChange={(e) => handleEditChange(operator.id, 'name', e.target.value)}
                            className="h-8"
                          />
                        ) : (
                          operator.name
                        )}
                      </TableCell>
                      {activePresses.map(press => (
                        <TableCell key={press} className="border-r border-gray-200 p-0">
                          <div className="flex justify-center items-center h-full py-2">
                            {editMode ? (
                              <Checkbox
                                checked={operator.presses.includes(press)}
                                onCheckedChange={(checked) => {
                                  const newPresses = checked
                                    ? [...operator.presses, press]
                                    : operator.presses.filter(p => p !== press);
                                  handleEditChange(operator.id, 'presses', newPresses);
                                }}
                              />
                            ) : (
                              operator.presses.includes(press) ? (
                                <Check className="w-5 h-5 text-green-600" />
                              ) : (
                                <span className="text-gray-300">-</span>
                              )
                            )}
                          </div>
                        </TableCell>
                      ))}
                      <TableCell className="border-r border-gray-200 text-center">
                        {editMode ? (
                          <div className="flex justify-center">
                            <Switch
                              checked={operator.active}
                              onCheckedChange={(checked) => handleEditChange(operator.id, 'active', checked)}
                            />
                          </div>
                        ) : (
                          operator.active ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Active</Badge>
                          ) : (
                            <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200">Inactive</Badge>
                          )
                        )}
                      </TableCell>
                      {!editMode && (
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenDialog(operator)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Operator</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete "{operator.name}"? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(operator.id, operator.name)}
                                    className="bg-red-500 hover:bg-red-600"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* EXTERNAL ENTITIES TAB */}
        <TabsContent value="external" className="space-y-4">
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-2">
              <Button
                variant={showInactive ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => setShowInactive(!showInactive)}
                className={showInactive ? 'bg-gray-200 hover:bg-gray-300 text-gray-900' : 'text-gray-500'}
              >
                {showInactive ? 'Showing Inactive' : 'Show Inactive'}
              </Button>
            </div>
            <div className="flex gap-2">
              {externalEditMode && (
                <Button onClick={handleExternalSaveChanges}>Save Changes</Button>
              )}
              <Button onClick={() => setExternalEditMode(!externalEditMode)} variant="outline">
                {externalEditMode ? 'Cancel' : 'Edit Mode'}
              </Button>
              <Button onClick={() => handleOpenExternalDialog()} className="gap-2">
                <Plus className="w-4 h-4" />
                Add External Entity
              </Button>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 hover:bg-gray-50">
                  <TableHead className="border-r border-gray-200 font-semibold text-gray-900">Name</TableHead>
                  {activePresses.map(press => (
                    <TableHead key={press} className="w-[100px] text-center border-r border-gray-200 font-semibold text-gray-900">{press}</TableHead>
                  ))}
                  <TableHead className="w-[100px] text-center border-r border-gray-200 font-semibold text-gray-900">Status</TableHead>
                  {!externalEditMode && <TableHead className="text-right w-[100px] font-semibold text-gray-900">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {(externalEditMode ? editedExternalEntities : externalEntities.filter(e => showInactive ? true : e.active)).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={externalEditMode ? activePresses.length + 2 : activePresses.length + 3} className="text-center py-12 text-gray-500">
                      No external entities found.
                    </TableCell>
                  </TableRow>
                ) : (
                  (externalEditMode ? editedExternalEntities : externalEntities.filter(e => showInactive ? true : e.active)).map((entity) => (
                    <TableRow key={entity.id} className="hover:bg-gray-50/50">
                      <TableCell className="border-r border-gray-200 font-medium">
                        {externalEditMode ? (
                          <Input
                            value={entity.name}
                            onChange={(e) => handleExternalEditChange(entity.id, 'name', e.target.value)}
                            className="h-8"
                          />
                        ) : (
                          entity.name
                        )}
                      </TableCell>
                      {activePresses.map(press => (
                        <TableCell key={press} className="border-r border-gray-200 p-0">
                          <div className="flex justify-center items-center h-full py-2">
                            {externalEditMode ? (
                              <Checkbox
                                checked={entity.presses.includes(press)}
                                onCheckedChange={(checked) => {
                                  const newPresses = checked
                                    ? [...entity.presses, press]
                                    : entity.presses.filter(p => p !== press);
                                  handleExternalEditChange(entity.id, 'presses', newPresses);
                                }}
                              />
                            ) : (
                              entity.presses.includes(press) ? (
                                <Check className="w-5 h-5 text-green-600" />
                              ) : (
                                <span className="text-gray-300">-</span>
                              )
                            )}
                          </div>
                        </TableCell>
                      ))}
                      <TableCell className="border-r border-gray-200 text-center">
                        {externalEditMode ? (
                          <div className="flex justify-center">
                            <Switch
                              checked={entity.active}
                              onCheckedChange={(checked) => handleExternalEditChange(entity.id, 'active', checked)}
                            />
                          </div>
                        ) : (
                          entity.active ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Active</Badge>
                          ) : (
                            <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200">Inactive</Badge>
                          )
                        )}
                      </TableCell>
                      {!externalEditMode && (
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenExternalDialog(entity)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Entity</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete "{entity.name}"? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteExternal(entity.id, entity.name)}
                                    className="bg-red-500 hover:bg-red-600"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Operator Dialog */}
      <Dialog open={isAddDialogOpen || !!editingOperator} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingOperator ? 'Edit Operator' : 'Add New Operator'}</DialogTitle>
            <DialogDescription>
              {editingOperator
                ? 'Update the operator details below.'
                : 'Fill in the details for the new operator.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="employeeId">Employee ID *</Label>
                <Input
                  id="employeeId"
                  placeholder="e.g., EMP001"
                  value={operatorFormData.employeeId}
                  onChange={(e) => setOperatorFormData({ ...operatorFormData, employeeId: e.target.value })}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="operatorName">Name *</Label>
                <Input
                  id="operatorName"
                  placeholder="e.g., John Doe"
                  value={operatorFormData.name}
                  onChange={(e) => setOperatorFormData({ ...operatorFormData, name: e.target.value })}
                />
              </div>

              <div className="grid gap-3">
                <Label>Available Presses *</Label>
                <div className="space-y-2 border rounded-md p-3">
                  {activePresses.map((press) => (
                    <div key={press} className="flex items-center space-x-2">
                      <Checkbox
                        id={`press-${press}`}
                        checked={operatorFormData.presses.includes(press)}
                        onCheckedChange={() => handlePressToggle(press)}
                      />
                      <label
                        htmlFor={`press-${press}`}
                        className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {press}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between border rounded-md p-3">
                <div className="space-y-0.5">
                  <Label htmlFor="operatorActive">Active Status</Label>
                  <p className="text-xs text-gray-500">
                    Inactive operators won't appear in assignment lists
                  </p>
                </div>
                <Switch
                  id="operatorActive"
                  checked={operatorFormData.active}
                  onCheckedChange={(checked) => setOperatorFormData({ ...operatorFormData, active: checked })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button type="submit">
                {editingOperator ? 'Update Operator' : 'Add Operator'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* External Entity Dialog */}
      <Dialog open={isExternalDialogOpen || !!editingExternal} onOpenChange={handleCloseExternalDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingExternal ? 'Edit External Entity' : 'Add New External Entity'}</DialogTitle>
            <DialogDescription>
              {editingExternal
                ? 'Update the external entity details below.'
                : 'Fill in the details for the new external entity.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleExternalSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="entityName">Name *</Label>
                <Input
                  id="entityName"
                  placeholder="e.g., TechSupport Inc."
                  value={externalFormData.name}
                  onChange={(e) => setExternalFormData({ ...externalFormData, name: e.target.value })}
                />
              </div>

              <div className="grid gap-3">
                <Label>Available Presses *</Label>
                <div className="space-y-2 border rounded-md p-3">
                  {activePresses.map((press) => (
                    <div key={press} className="flex items-center space-x-2">
                      <Checkbox
                        id={`external-${press}`}
                        checked={externalFormData.presses.includes(press)}
                        onCheckedChange={() => handleExternalPressToggle(press)}
                      />
                      <label
                        htmlFor={`external-${press}`}
                        className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {press}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between border rounded-md p-3">
                <div className="space-y-0.5">
                  <Label htmlFor="externalActive">Active Status</Label>
                  <p className="text-xs text-gray-500">
                    Inactive entities won't appear in assignment lists
                  </p>
                </div>
                <Switch
                  id="externalActive"
                  checked={externalFormData.active}
                  onCheckedChange={(checked) => setExternalFormData({ ...externalFormData, active: checked })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseExternalDialog}>
                Cancel
              </Button>
              <Button type="submit">
                {editingExternal ? 'Update Entity' : 'Add Entity'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
