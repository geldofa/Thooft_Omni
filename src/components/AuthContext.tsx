import { createContext, useContext, useState, ReactNode } from 'react';

export interface GroupedTask {
  id: string;
  taskName: string;
  taskSubtext: string;
  category: string;
  press: PressType;
  subtasks: Subtask[];
}

export interface Subtask {
  id: string;
  subtaskName: string;
  subtext: string;
  lastMaintenance: Date | null;
  nextMaintenance: Date;
  maintenanceInterval: number;
  maintenanceIntervalUnit: 'days' | 'weeks' | 'months';
  assignedTo: string;
  comment: string;
  commentDate: Date | null;
}

export interface MaintenanceTask {
  id: string;
  task: string;
  taskSubtext: string;
  category: string;
  press: PressType;
  lastMaintenance: Date | null;
  nextMaintenance: Date;
  maintenanceInterval: number;
  maintenanceIntervalUnit: 'days' | 'weeks' | 'months';
  assignedTo: string; // Deprecated: kept for backward compatibility
  assignedToIds?: string[]; // New: Array of IDs (ploeg, operator, or external entity)
  assignedToTypes?: ('ploeg' | 'operator' | 'external')[]; // Corresponding types
  opmerkingen: string;
  commentDate: Date | null;
  created: string;
  updated: string;
}

export type UserRole = 'admin' | 'press' | 'meestergast' | null;
export type PressType = string;

interface User {
  username: string;
  name?: string;
  role: UserRole;
  press?: PressType;
}

export interface Operator {
  id: string;
  employeeId: string;
  name: string;
  presses: PressType[];
  active: boolean;
  canEditTasks: boolean;
  canAccessOperatorManagement: boolean;
}

export interface ExternalEntity {
  id: string;
  name: string;
  presses: PressType[];
  active: boolean;
}

export interface Ploeg {
  id: string;
  name: string;
  operatorIds: string[]; // Ordered list of 2-3 operator IDs
  presses: PressType[];
  active: boolean;
}

export interface Category {
  id: string;
  name: string;
  presses: PressType[];
  active: boolean;
}

export interface ActivityLog {
  id: string;
  timestamp: Date;
  user: string;
  action: string;
  entity: string;
  entityId: string;
  entityName: string;
  details: string;
  oldValue?: string;
  newValue?: string;
  press?: PressType;
}

export interface Press {
  id: string;
  name: PressType;
  active: boolean;
  archived: boolean;
}

export interface UserAccount {
  username: string;
  password: string;
  role: UserRole;
  press?: PressType;
  operatorId?: string;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => boolean;
  logout: () => void;
  operators: Operator[];
  addOperator: (operator: Omit<Operator, 'id'>) => void;
  updateOperator: (operator: Operator) => void;
  deleteOperator: (id: string) => void;
  categories: Category[];
  addCategory: (category: Omit<Category, 'id'>) => void;
  updateCategory: (category: Category) => void;
  deleteCategory: (id: string) => void;
  categoryOrder: string[];
  updateCategoryOrder: (order: string[]) => void;
  activityLogs: ActivityLog[];
  addActivityLog: (log: Omit<ActivityLog, 'id' | 'timestamp'>) => void;
  presses: Press[];
  addPress: (press: Omit<Press, 'id'>) => void;
  updatePress: (press: Press) => void;
  deletePress: (id: string) => void;
  userAccounts: UserAccount[];
  changePassword: (username: string, newPassword: string) => void;
  getElevatedOperators: () => Operator[];
  tasks: GroupedTask[]; // Added tasks to AuthContextType
  fetchTasks: () => void;
  fetchActivityLogs: () => void;
  fetchUserAccounts: () => void;
  addTask: (task: Omit<MaintenanceTask, 'id' | 'created' | 'updated'>) => void;
  updateTask: (task: MaintenanceTask) => Promise<void>;
  deleteTask: (id: string) => void;
  externalEntities: ExternalEntity[];
  addExternalEntity: (entity: Omit<ExternalEntity, 'id'>) => void;
  updateExternalEntity: (entity: ExternalEntity) => void;
  deleteExternalEntity: (id: string) => void;
  ploegen: Ploeg[];
  addPloeg: (ploeg: Omit<Ploeg, 'id'>) => void;
  updatePloeg: (ploeg: Ploeg) => void;
  deletePloeg: (id: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const INITIAL_USER_ACCOUNTS: UserAccount[] = [
  { username: 'admin', password: 'admin123', role: 'admin' },
  { username: 'lithoman', password: 'litho123', role: 'press', press: 'Lithoman' },
  { username: 'c80', password: 'c80123', role: 'press', press: 'C80' },
  { username: 'c818', password: 'c818123', role: 'press', press: 'C818' }
];

export function AuthProvider({ children, tasks }: { children: ReactNode; tasks: GroupedTask[] }) {
  const [tasksState, setTasksState] = useState<GroupedTask[]>(tasks);
  const [user, setUser] = useState<User | null>(() => {
    // Initialize user from sessionStorage if available
    if (typeof sessionStorage !== 'undefined') {
      try {
        const savedUser = sessionStorage.getItem('user');
        if (savedUser) {
          return JSON.parse(savedUser);
        }
      } catch (e) {
        console.warn('Failed to load user from sessionStorage:', e);
      }
    }
    return null;
  });
  const [userAccounts, setUserAccounts] = useState<UserAccount[]>(INITIAL_USER_ACCOUNTS);

  const [operators, setOperators] = useState<Operator[]>([
    {
      id: '1',
      employeeId: 'EMP001',
      name: 'John Smith',
      presses: ['Lithoman', 'C80'],
      active: true,
      canEditTasks: false,
      canAccessOperatorManagement: false
    },
    {
      id: '2',
      employeeId: 'EMP002',
      name: 'Sarah Johnson',
      presses: ['C80', 'C818'],
      active: true,
      canEditTasks: true,
      canAccessOperatorManagement: false
    },
    {
      id: '3',
      employeeId: 'EMP003',
      name: 'Mike Chen',
      presses: ['Lithoman'],
      active: true,
      canEditTasks: false,
      canAccessOperatorManagement: false
    },
    {
      id: '4',
      employeeId: 'EMP004',
      name: 'David Martinez',
      presses: ['C818'],
      active: true,
      canEditTasks: false,
      canAccessOperatorManagement: false
    }
  ]);

  const [presses, setPresses] = useState<Press[]>([
    { id: '1', name: 'Lithoman', active: true, archived: false },
    { id: '2', name: 'C80', active: true, archived: false },
    { id: '3', name: 'C818', active: true, archived: false }
  ]);

  const [externalEntities, setExternalEntities] = useState<ExternalEntity[]>([
    {
      id: '1',
      name: 'TechSupport Inc.',
      presses: ['Lithoman', 'C80'],
      active: true
    },
    {
      id: '2',
      name: 'CleanCo',
      presses: ['C818'],
      active: true
    }
  ]);

  const [ploegen, setPloegen] = useState<Ploeg[]>([
    {
      id: '1',
      name: 'Team Alpha',
      operatorIds: ['1', '2'],
      presses: ['Lithoman', 'C80'],
      active: true
    },
    {
      id: '2',
      name: 'Team Beta',
      operatorIds: ['3', '4'],
      presses: ['Lithoman', 'C80'],
      active: true
    },
    {
      id: '3',
      name: 'Team Gamma',
      operatorIds: ['1', '3'],
      presses: ['C818'],
      active: true
    }
  ]);

  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);

  const [categories, setCategories] = useState<Category[]>([
    {
      id: '1',
      name: 'Smering',
      presses: ['Lithoman', 'C80', 'C818'],
      active: true
    },
    {
      id: '2',
      name: 'Reiniging',
      presses: ['Lithoman', 'C80'],
      active: true
    },
    {
      id: '3',
      name: 'Controle',
      presses: ['C818'],
      active: true
    }
  ]);

  const [categoryOrder, setCategoryOrder] = useState<string[]>([
    'HVAC', 'Safety', 'Mechanical', 'Electrical', 'Plumbing', 'Building', 'IT', 'Other'
  ]);

  const login = (username: string, password: string): boolean => {
    const foundUser = userAccounts.find(
      u => u.username === username && u.password === password
    );

    if (foundUser) {
      const userData = {
        username: foundUser.username,
        role: foundUser.role,
        press: foundUser.press
      };
      setUser(userData);
      // Persist user login state
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem('user', JSON.stringify(userData));
      }
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
  };

  const addOperator = (operator: Omit<Operator, 'id'>) => {
    const newOperator = {
      ...operator,
      id: Date.now().toString()
    };
    setOperators([...operators, newOperator]);
  };

  const updateOperator = (operator: Operator) => {
    setOperators(operators.map(op => op.id === operator.id ? operator : op));
  };

  const deleteOperator = (id: string) => {
    setOperators(operators.filter(op => op.id !== id));
  };

  const updateCategoryOrder = (order: string[]) => {
    setCategoryOrder(order);
  };

  const addActivityLog = (log: Omit<ActivityLog, 'id' | 'timestamp'>) => {
    const newLog: ActivityLog = {
      ...log,
      id: Date.now().toString(),
      timestamp: new Date()
    };
    setActivityLogs([newLog, ...activityLogs]);
  };

  const addPress = (press: Omit<Press, 'id'>) => {
    const newPress: Press = {
      ...press,
      id: Date.now().toString()
    };
    setPresses([...presses, newPress]);
  };

  const updatePress = (press: Press) => {
    setPresses(presses.map(p => p.id === press.id ? press : p));
  };

  const deletePress = (id: string) => {
    setPresses(presses.filter(p => p.id !== id));
  };

  const addExternalEntity = (entity: Omit<ExternalEntity, 'id'>) => {
    const newEntity = {
      ...entity,
      id: Date.now().toString()
    };
    setExternalEntities([...externalEntities, newEntity]);
  };

  const updateExternalEntity = (entity: ExternalEntity) => {
    setExternalEntities(externalEntities.map(e => e.id === entity.id ? entity : e));
  };

  const deleteExternalEntity = (id: string) => {
    setExternalEntities(externalEntities.filter(e => e.id !== id));
  };

  const addPloeg = (ploeg: Omit<Ploeg, 'id'>) => {
    const newPloeg = {
      ...ploeg,
      id: Date.now().toString()
    };
    setPloegen([...ploegen, newPloeg]);
  };

  const updatePloeg = (ploeg: Ploeg) => {
    setPloegen(ploegen.map(p => p.id === ploeg.id ? ploeg : p));
  };

  const deletePloeg = (id: string) => {
    setPloegen(ploegen.filter(p => p.id !== id));
  };

  const addCategory = (category: Omit<Category, 'id'>) => {
    const newCategory = {
      ...category,
      id: Date.now().toString()
    };
    setCategories([...categories, newCategory]);
  };

  const updateCategory = (category: Category) => {
    setCategories(categories.map(c => c.id === category.id ? category : c));
  };

  const deleteCategory = (id: string) => {
    setCategories(categories.filter(c => c.id !== id));
  };

  const changePassword = (username: string, newPassword: string) => {
    setUserAccounts(userAccounts.map(u =>
      u.username === username ? { ...u, password: newPassword } : u
    ));
  };

  const getElevatedOperators = () => {
    return operators.filter(op => op.canEditTasks || op.canAccessOperatorManagement);
  };

  const fetchTasks = () => {
    // Mock fetch - in a real app this would be an API call
    console.log('Fetching tasks...');
  };

  const fetchActivityLogs = () => {
    // Mock fetch - in a real app this would be an API call
    console.log('Fetching activity logs...');
  };

  const fetchUserAccounts = () => {
    // Mock fetch - in a real app this would be an API call
    console.log('Fetching user accounts...');
  };

  const addTask = (task: Omit<MaintenanceTask, 'id' | 'created' | 'updated'>) => {
    const newGroup: GroupedTask = {
      id: Date.now().toString(),
      taskName: task.task,
      taskSubtext: task.taskSubtext,
      category: task.category,
      press: task.press,
      subtasks: [{
        id: Date.now().toString() + '-1',
        subtaskName: task.task,
        subtext: task.taskSubtext,
        lastMaintenance: task.lastMaintenance,
        nextMaintenance: task.nextMaintenance,
        maintenanceInterval: task.maintenanceInterval,
        maintenanceIntervalUnit: task.maintenanceIntervalUnit,
        assignedTo: task.assignedTo,
        comment: task.opmerkingen,
        commentDate: task.commentDate
      }]
    };
    setTasksState([...tasksState, newGroup]);
  };

  const updateTask = async (task: MaintenanceTask) => {
    setTasksState(prevTasks => prevTasks.map(group => {
      const subtaskIndex = group.subtasks.findIndex(st => st.id === task.id);
      if (subtaskIndex !== -1) {
        const updatedSubtasks = [...group.subtasks];
        updatedSubtasks[subtaskIndex] = {
          ...updatedSubtasks[subtaskIndex],
          subtaskName: task.task,
          subtext: task.taskSubtext,
          lastMaintenance: task.lastMaintenance,
          nextMaintenance: task.nextMaintenance,
          maintenanceInterval: task.maintenanceInterval,
          maintenanceIntervalUnit: task.maintenanceIntervalUnit,
          assignedTo: task.assignedTo,
          comment: task.opmerkingen,
          commentDate: task.commentDate
        };
        return {
          ...group,
          category: task.category,
          press: task.press,
          subtasks: updatedSubtasks
        };
      }
      return group;
    }));
  };

  const deleteTask = (id: string) => {
    setTasksState(prevTasks => prevTasks.map(group => ({
      ...group,
      subtasks: group.subtasks.filter(st => st.id !== id)
    })).filter(group => group.subtasks.length > 0));
  };

  return (
    <AuthContext.Provider value={{
      user,
      login,
      logout,
      operators,
      addOperator,
      updateOperator,
      deleteOperator,
      activityLogs,
      addActivityLog,
      presses,
      addPress,
      updatePress,
      deletePress,
      userAccounts,
      changePassword,
      getElevatedOperators,
      tasks: tasksState,
      fetchTasks,
      fetchActivityLogs,
      fetchUserAccounts,
      addTask,
      updateTask,
      deleteTask,
      externalEntities,
      addExternalEntity,
      updateExternalEntity,
      deleteExternalEntity,
      ploegen,
      addPloeg,
      updatePloeg,
      deletePloeg,
      categories,
      addCategory,
      updateCategory,
      deleteCategory,
      categoryOrder,
      updateCategoryOrder
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
