import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import PocketBase from 'pocketbase';
import { toast } from 'sonner';

// Initialize PocketBase Client
const PB_URL = import.meta.env.VITE_PB_URL || `http://${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}:8090`;
export const client = new PocketBase(PB_URL); // Export and rename to 'client' if needed, or just `pb`
const pb = client;
pb.autoCancellation(false);

export interface GroupedTask {
  id: string;
  taskName: string;
  taskSubtext: string;
  category: string; // Name for display
  categoryId: string; // ID for relations
  press: PressType; // Name for display
  pressId: string; // ID for relations
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
  category: string; // Name
  categoryId: string; // ID
  press: PressType; // Name
  pressId: string; // ID
  lastMaintenance: Date | null;
  nextMaintenance: Date;
  maintenanceInterval: number;
  maintenanceIntervalUnit: 'days' | 'weeks' | 'months';
  assignedTo: string;
  assignedToIds?: string[];
  assignedToTypes?: ('ploeg' | 'operator' | 'external')[];
  opmerkingen: string;
  commentDate: Date | null;
  subtasks?: { id: string; name: string; subtext: string }[];
  created: string;
  updated: string;
}

export type UserRole = 'admin' | 'press' | 'meestergast' | null;
export type PressType = string;

interface User {
  id: string;
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
  operatorIds: string[];
  presses: PressType[];
  active: boolean;
}

export interface Category {
  id: string;
  name: string;
  pressIds: string[];
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
  id: string;
  username: string;
  name?: string;
  password?: string;
  role: UserRole;
  press?: PressType;
  operatorId?: string;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  operators: Operator[];
  addOperator: (operator: Omit<Operator, 'id'>) => Promise<void>;
  updateOperator: (operator: Operator) => Promise<void>;
  deleteOperator: (id: string) => Promise<void>;
  categories: Category[];
  addCategory: (category: Omit<Category, 'id'>) => Promise<void>;
  updateCategory: (category: Category) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  categoryOrder: string[];
  updateCategoryOrder: (order: string[]) => void;
  activityLogs: ActivityLog[];
  addActivityLog: (log: Omit<ActivityLog, 'id' | 'timestamp'>) => Promise<void>;
  presses: Press[];
  addPress: (press: Omit<Press, 'id'>) => Promise<void>;
  updatePress: (press: Press) => Promise<void>;
  deletePress: (id: string) => Promise<void>;
  userAccounts: UserAccount[];
  changePassword: (username: string, newPassword: string) => Promise<void>;
  addUserAccount: (account: UserAccount) => Promise<void>;
  updateUserAccount: (username: string, updates: Partial<UserAccount>) => Promise<void>;
  deleteUserAccount: (username: string) => Promise<void>;
  getElevatedOperators: () => Operator[];
  tasks: GroupedTask[];
  fetchTasks: () => Promise<void>;
  fetchActivityLogs: () => Promise<void>;
  fetchUserAccounts: () => Promise<void>;
  addTask: (task: Omit<MaintenanceTask, 'id' | 'created' | 'updated'>) => Promise<void>;
  updateTask: (task: MaintenanceTask) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  externalEntities: ExternalEntity[];
  addExternalEntity: (entity: Omit<ExternalEntity, 'id'>) => Promise<void>;
  updateExternalEntity: (entity: ExternalEntity) => Promise<void>;
  deleteExternalEntity: (id: string) => Promise<void>;
  ploegen: Ploeg[];
  addPloeg: (ploeg: Omit<Ploeg, 'id'>) => Promise<void>;
  updatePloeg: (ploeg: Ploeg) => Promise<void>;
  deletePloeg: (id: string) => Promise<void>;
  sendFeedback: (type: string, message: string, context?: any) => Promise<boolean>;
  fetchFeedback: () => Promise<any[]>;
  resolveFeedback?: (id: string) => Promise<boolean>;
  fetchParameters: () => Promise<Record<string, any>>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode; tasks: GroupedTask[] }) {
  const [user, setUser] = useState<User | null>(null);
  const [tasksState, setTasksState] = useState<GroupedTask[]>([]);
  const [presses, setPresses] = useState<Press[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]); // Preserved unused var for now

  // Placeholders for things we haven't migrated schemas for yet or are keeping local for now
  const [operators, setOperators] = useState<Operator[]>([]);
  const [externalEntities, setExternalEntities] = useState<ExternalEntity[]>([]);
  const [ploegen, setPloegen] = useState<any[]>([]); // Define proper type if needed
  const [categoryOrder, setCategoryOrder] = useState<string[]>([]);
  const [userAccounts, setUserAccounts] = useState<UserAccount[]>([]);

  // 1. Initialize Auth
  useEffect(() => {
    // Check if valid auth token exists
    if (pb.authStore.isValid) {
      const model = pb.authStore.model;
      if (model) {
        setUser({
          id: model.id,
          username: model.username,
          name: model.name,
          role: 'admin', // Default to admin for the superuser
          press: model.press
        });
      }
    }
  }, []);




  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      if (!username || !password) return false;

      const isEmail = username.includes('@');

      // 1. Identity is an email -> Try Admin (Superuser) first, then User collection
      if (isEmail) {
        try {
          const authData: any = await pb.admins.authWithPassword(username, password);
          if (pb.authStore.isValid && authData.admin) {
            setUser({
              id: authData.admin.id,
              username: authData.admin.email,
              name: 'Admin',
              role: 'admin'
            });
            return true;
          }
        } catch (e) {
          // Admin failed, try user collection as fallback for email-based login
          try {
            const authData = await pb.collection('users').authWithPassword(username, password);
            if (pb.authStore.isValid && authData.record) {
              setUser({
                id: authData.record.id,
                username: authData.record.username,
                name: authData.record.name,
                role: authData.record.role || 'press',
                press: authData.record.press
              });
              return true;
            }
          } catch (e2) { /* both failed */ }
        }
      } else {
        // 2. Identity is a username -> ONLY try User collection
        // (PocketBase Admins MUST use email, so we skip trying them to avoid console noise)
        try {
          const authData = await pb.collection('users').authWithPassword(username, password);
          if (pb.authStore.isValid && authData.record) {
            setUser({
              id: authData.record.id,
              username: authData.record.username,
              name: authData.record.name,
              role: authData.record.role || 'press',
              press: authData.record.press
            });
            return true;
          }
        } catch (e) { /* failed */ }
      }

      return false;
    } catch (e) {
      return false;
    }
  };

  const logout = () => {
    pb.authStore.clear();
    setUser(null);
  };

  // --- Data Mapping Logic ---

  const fetchTasks = useCallback(async () => {
    try {
      const records = await pb.collection('onderhoud').getFullList({
        expand: 'category,pers'
      });

      // Client-side sort
      records.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());

      const groups: Record<string, GroupedTask> = {};

      records.forEach((record: any) => {
        const groupKey = `${record.category}-${record.pers}-${record.task}`; // Unique group key

        if (!groups[groupKey]) {
          groups[groupKey] = {
            id: record.id + '_group',
            taskName: record.task,
            taskSubtext: record.task_subtext || '',
            category: record.expand?.category?.naam || record.category,
            categoryId: record.category,
            press: record.expand?.pers?.naam || record.pers,
            pressId: record.pers,
            subtasks: []
          };
        }

        groups[groupKey].subtasks.push({
          id: record.id,
          subtaskName: record.subtask || record.task,
          subtext: record.subtask_subtext || record.task_subtext || '',
          lastMaintenance: record.last_date ? new Date(record.last_date) : null,
          nextMaintenance: record.next_date ? new Date(record.next_date) : new Date(),
          maintenanceInterval: record.interval || 0,
          maintenanceIntervalUnit: record.interval_unit === 'Dagen' ? 'days' :
            record.interval_unit === 'Weken' ? 'weeks' :
              record.interval_unit === 'Maanden' ? 'months' : 'days',
          assignedTo: record.assigned_operator || '',
          comment: record.comment || record.notes || '',
          commentDate: record.updated ? new Date(record.updated) : null
        });
      });

      setTasksState(Object.values(groups));

    } catch (e) {
      console.error("Fetch tasks failed:", e);
    }
  }, []);

  const addTask = async (task: Omit<MaintenanceTask, 'id' | 'created' | 'updated'>) => {
    try {
      if (task.subtasks && task.subtasks.length > 0) {
        // Handle Grouped Task: Create a record for each subtask
        const promises = task.subtasks.map(subtask =>
          pb.collection('onderhoud').create({
            task: task.task,
            task_subtext: task.taskSubtext,
            subtask: subtask.name,
            subtask_subtext: subtask.subtext,
            category: task.categoryId,
            pers: task.pressId,
            last_date: task.lastMaintenance,
            next_date: task.nextMaintenance,
            interval: task.maintenanceInterval,
            interval_unit: task.maintenanceIntervalUnit === 'days' ? 'Dagen' :
              task.maintenanceIntervalUnit === 'weeks' ? 'Weken' :
                task.maintenanceIntervalUnit === 'months' ? 'Maanden' : 'Dagen',
            assigned_operator: task.assignedTo,
            comment: task.opmerkingen
          })
        );
        await Promise.all(promises);
      } else {
        // Handle Single Task
        await pb.collection('onderhoud').create({
          task: task.task,
          task_subtext: task.taskSubtext,
          category: task.categoryId,
          pers: task.pressId,
          last_date: task.lastMaintenance,
          next_date: task.nextMaintenance,
          interval: task.maintenanceInterval,
          interval_unit: task.maintenanceIntervalUnit === 'days' ? 'Dagen' :
            task.maintenanceIntervalUnit === 'weeks' ? 'Weken' :
              task.maintenanceIntervalUnit === 'months' ? 'Maanden' : 'Dagen',
          assigned_operator: task.assignedTo,
          comment: task.opmerkingen
        });
      }
      await fetchTasks(); // Refresh list after adding
    } catch (e) {
      console.error("Add task failed:", e);
      alert("Failed to save to server");
    }
  };

  const updateTask = async (task: MaintenanceTask) => {
    try {
      await pb.collection('onderhoud').update(task.id, {
        task: task.task,
        task_subtext: task.taskSubtext,
        category: task.categoryId,
        pers: task.pressId,
        last_date: task.lastMaintenance,
        next_date: task.nextMaintenance,
        interval: task.maintenanceInterval,
        interval_unit: task.maintenanceIntervalUnit === 'days' ? 'Dagen' :
          task.maintenanceIntervalUnit === 'weeks' ? 'Weken' :
            task.maintenanceIntervalUnit === 'months' ? 'Maanden' : 'Dagen',
        assigned_operator: task.assignedTo,
        comment: task.opmerkingen
      });
    } catch (e) {
      console.error("Update task failed:", e);
    }
  };

  const deleteTask = async (id: string) => {
    try {
      await pb.collection('onderhoud').delete(id);
    } catch (e) {
      console.error("Delete task failed:", e);
    }
  };

  const sendFeedback = async (type: string, message: string, context?: any): Promise<boolean> => {
    try {
      await pb.collection('feedback').create({
        type,
        message,
        user: user?.username || 'Anonymous',
        status: 'new',
        context
      });
      return true;
    } catch (e) {
      console.error("Failed to send feedback:", e);
      return false;
    }
  };

  const resolveFeedback = async (id: string) => {
    try {
      await pb.collection('feedback').update(id, {
        status: 'closed'
      });
      return true;
    } catch (e) {
      console.error("Resolve feedback failed", e);
      return false;
    }
  };

  const fetchFeedback = useCallback(async (): Promise<any[]> => {
    try {
      const records = await pb.collection('feedback').getList(1, 100);

      // Client-side sort
      records.items.sort((a: any, b: any) => new Date(b.created).getTime() - new Date(a.created).getTime());

      return records.items.map((r: any) => ({
        id: r.id,
        type: r.type,
        message: r.message,
        username: r.user,
        // Fallback or multiple access attempts for date
        created: r.created || r.updated || (r.context && r.context.timestamp) || new Date().toISOString(),
        status: r.status,
        url: r.context?.url,
        ip: r.context?.ip,
        contact_operator: r.context?.operator
      }));
    } catch (e) {
      console.error("Failed to fetch feedback:", e);
      return [];
    }
  }, []);

  // --- Stubs for other entities ---
  const addOperator = async () => { };
  const updateOperator = async () => { };
  const deleteOperator = async () => { };

  const addCategory = async (category: Omit<Category, 'id'>) => {
    try {
      await pb.collection('categorieen').create({
        naam: category.name,
        presses: category.pressIds,
        active: category.active
      });
      await loadData();
    } catch (e: any) {
      console.error("Add category failed", e);
      toast.error(`Failed to add category: ${e.message || e}`);
    }
  };

  const updateCategory = async (category: Category) => {
    try {
      await pb.collection('categorieen').update(category.id, {
        naam: category.name,
        presses: category.pressIds,
        active: category.active
      });
      await loadData();
    } catch (e: any) {
      console.error("Update category failed", e);
      toast.error(`Failed to update category: ${e.message || e}`);
    }
  };

  const deleteCategory = async (id: string) => {
    try {
      await pb.collection('categorieen').delete(id);
      await loadData();
    } catch (e: any) {
      console.error("Delete category failed", e);
      toast.error(`Failed to delete category: ${e.message || e}`);
    }
  };
  const updateCategoryOrder = async () => { };

  const addActivityLog = async (log: any) => {
    try {
      await pb.collection('activity_logs').create({
        action: log.action,
        entity: log.entity,
        details: log.details,
        user: log.user
      });
    } catch (e) {/* ignore */ }
  };

  const addPress = async (press: Omit<Press, 'id'>) => {
    try {
      await pb.collection('persen').create({
        naam: press.name,
        status: press.active ? 'actief' : 'niet actief'
      });
    } catch (e: any) {
      console.error("Add press failed", e);
      toast.error(`Failed to add press: ${e.message || e}`);
    }
  };


  const updatePress = async (press: Press) => {
    try {
      await pb.collection('persen').update(press.id, {
        naam: press.name,
        status: press.active ? 'actief' : 'niet actief'
      });
    } catch (e) {
      console.error("Update press failed", e);
    }
  };
  const deletePress = async () => { };
  const fetchActivityLogs = useCallback(async () => { }, []);

  // Role mapping helpers
  const mapDbRoleToUi = (dbRole: string): UserRole => {
    const roleMap: Record<string, UserRole> = {
      'Admin': 'admin',
      'Meestergast': 'meestergast',
      'Operator': 'press'
    };
    return roleMap[dbRole] || 'press';
  };

  const mapUiRoleToDb = (uiRole: UserRole): string => {
    const roleMap: Record<string, string> = {
      'admin': 'Admin',
      'meestergast': 'Meestergast',
      'press': 'Operator'
    };
    return roleMap[uiRole || 'press'] || 'Operator';
  };

  const fetchUserAccounts = useCallback(async () => {
    try {
      const records = await pb.collection('users').getFullList({ sort: 'username' });
      const accounts = records.map((r: any) => ({
        id: r.id,
        username: r.username,
        name: r.name,
        role: mapDbRoleToUi(r.role),
        press: r.press,
        operatorId: r.operatorId
      }));
      setUserAccounts(accounts);

      // Populate operators for the dropdown
      setOperators(accounts.map(a => ({
        id: a.id,
        name: a.name || a.username,
        employeeId: a.id,
        presses: [],
        active: true,
        canEditTasks: false,
        canAccessOperatorManagement: false
      })));
    } catch (e: any) {
      console.error("Fetch users failed", e);
    }
  }, []);

  // 2. Fetch Initial Data
  const loadData = useCallback(async () => {
    try {
      console.log('Loading Data from PocketBase...');

      // Load Presses
      const pressesResult = await pb.collection('persen').getFullList();
      setPresses(pressesResult.map((p: any) => ({
        id: p.id,
        name: p.naam,
        active: p.status === 'actief',
        archived: false
      })));

      // Load Categories
      const categoriesResult = await pb.collection('categorieen').getFullList();
      setCategories(categoriesResult.map((c: any) => ({
        id: c.id,
        name: c.naam,
        pressIds: c.presses || [],
        active: c.active !== false // Default to true if not specified
      })));

      await fetchTasks();
      await fetchUserAccounts(); // Pre-load users/operators

    } catch (error) {
      console.error('Error loading initial data:', error);
    }
  }, [fetchTasks, fetchUserAccounts]);

  useEffect(() => {
    if (user) {
      loadData();
    }

    // 3. Realtime Subscriptions
    const subscribe = async () => {
      await pb.collection('onderhoud').subscribe('*', function (e) {
        console.log('Realtime task update:', e);
        fetchTasks();
      });

      await pb.collection('persen').subscribe('*', () => { loadData() });
      await pb.collection('categorieen').subscribe('*', () => { loadData() });
    };

    if (user) {
      subscribe();
    }

    return () => {
      pb.collection('onderhoud').unsubscribe('*');
      pb.collection('persen').unsubscribe('*');
      pb.collection('categorieen').unsubscribe('*');
    };
  }, [user, loadData, fetchTasks]);

  const addUserAccount = async (account: UserAccount) => {
    try {
      await pb.collection('users').create({
        username: account.username,
        email: `${account.username}@example.com`,
        name: account.name,
        password: account.password,
        passwordConfirm: account.password,
        role: mapUiRoleToDb(account.role),
        press: account.press
      });
      await fetchUserAccounts();
      toast.success(`User ${account.username} created`);
    } catch (e: any) {
      console.error("Add user failed", e);
      toast.error(`Failed to add user: ${e.message || e}`);
    }
  };

  const updateUserAccount = async (username: string, updates: Partial<UserAccount>) => {
    try {
      const user = userAccounts.find(u => u.username === username);
      if (!user) throw new Error("User not found");

      await pb.collection('users').update(user.id, {
        name: updates.name,
        role: mapUiRoleToDb(updates.role || user.role),
        press: updates.press
      });
      await fetchUserAccounts();
      toast.success(`User ${username} updated`);
    } catch (e: any) {
      console.error("Update user failed", e);
      toast.error(`Failed to update user: ${e.message || e}`);
    }
  };

  const deleteUserAccount = async (username: string) => {
    try {
      const user = userAccounts.find(u => u.username === username);
      if (!user) throw new Error("User not found");

      await pb.collection('users').delete(user.id);
      await fetchUserAccounts();
      toast.success(`User ${username} deleted`);
    } catch (e: any) {
      console.error("Delete user failed", e);
      toast.error(`Failed to delete user: ${e.message || e}`);
    }
  };

  const changePassword = async (username: string, newPw: string) => {
    try {
      const user = userAccounts.find(u => u.username === username);
      if (!user) throw new Error("User not found");

      await pb.collection('users').update(user.id, {
        password: newPw,
        passwordConfirm: newPw
      });
      toast.success(`Password updated for ${username}`);
    } catch (e: any) {
      console.error("Change password failed", e);
      toast.error(`Failed to change password: ${e.message || e}`);
    }
  };

  const addExternalEntity = async () => { };
  const updateExternalEntity = async () => { };
  const deleteExternalEntity = async () => { };
  const addPloeg = async () => { };
  const updatePloeg = async () => { };
  const deletePloeg = async () => { };

  const getElevatedOperators = () => [];

  const fetchParameters = useCallback(async () => { return {}; }, []);

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
      addUserAccount,
      updateUserAccount,
      deleteUserAccount,
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
      updateCategoryOrder,
      sendFeedback,
      fetchFeedback,
      resolveFeedback,
      fetchParameters
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
