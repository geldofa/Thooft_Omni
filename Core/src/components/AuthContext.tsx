import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { pb, client } from '../lib/pocketbase';
export { pb, client };

import { toast } from 'sonner';
import { APP_VERSION } from '../config';
import { drukwerkenCache } from '../services/DrukwerkenCache';

export interface GroupedTask {
  id: string;
  taskName: string;
  taskSubtext: string;
  category: string; // Name for display
  categoryId: string; // ID for relations
  press: string; // Name for display
  pressId: string; // ID for relations
  subtasks: Subtask[];
  isHighlightGroup?: boolean;
  highlightColor?: string;
}

export interface Subtask {
  id: string;
  subtaskName: string;
  subtext: string;
  lastMaintenance: Date | null;
  nextMaintenance: Date;
  maintenanceInterval: number;
  maintenanceIntervalUnit: 'days' | 'weeks' | 'months' | 'years';
  assignedTo: string;
  assignedToIds?: string[];
  assignedToTypes?: ('ploeg' | 'operator' | 'external')[];
  comment: string;
  commentDate: Date | null;
  sort_order: number;
  opmerkingen?: string;
  isExternal?: boolean;
  tagIds?: string[];
  isHighlight?: boolean;
  highlightColor?: string;
  highlightTag?: string;
}

export interface MaintenanceTask {
  id: string;
  task: string; // Group Name
  subtaskName?: string; // Specific item name
  taskSubtext: string;
  subtaskSubtext?: string; // Specific item subtext
  category: string; // Name
  categoryId: string; // ID
  press: PressType; // Name
  pressId: string; // ID
  lastMaintenance: Date | null;
  nextMaintenance: Date;
  maintenanceInterval: number;
  maintenanceIntervalUnit: 'days' | 'weeks' | 'months' | 'years';
  assignedTo: string;
  assignedToIds?: string[];
  assignedToTypes?: ('ploeg' | 'operator' | 'external')[];
  opmerkingen: string;
  comment: string;
  commentDate: Date | null;
  sort_order: number;
  subtasks?: { id: string; name: string; subtext: string; opmerkingen?: string; commentDate?: Date | null; sort_order: number; isExternal?: boolean; tagIds?: string[] }[];
  isExternal: boolean;
  tagIds?: string[];
  created: string;
  updated: string;
}

export type UserRole = string | null;
export type PressType = string;

export type Permission =
  | 'tasks_view'
  | 'tasks_edit'
  | 'drukwerken_view'
  | 'drukwerken_view_all'
  | 'drukwerken_create'
  | 'reports_view'
  | 'reports_archive_view'
  | 'checklist_view'
  | 'extern_view'
  | 'management_access'
  | 'manage_personnel'
  | 'manage_categories'
  | 'manage_tags'
  | 'manage_presses'
  | 'manage_parameters'
  | 'manage_accounts'
  | 'manage_permissions'
  | 'toolbox_access'
  | 'logs_view'
  | 'logs_view_all'
  | 'feedback_view'
  | 'feedback_manage'
  | 'manage_themes'
  | 'manage_notifications'
  | 'manage_system_tasks'
  | 'werkfiches_bekijken_eigen'
  | 'werkfiches_bekijken_alle'
  | 'werkfiches_importeren'
  | 'werkfiches_filters_instellingen'
  | 'production_analytics_view'
  | 'maintenance_analytics_view'
  | 'manage_ticker'
  | 'data_checker_view'
  | 'activity_ticker_view'
  | 'osint_view'
  | 'drukwerken_trash_view'
  | 'planning_view'
  | 'planning_edit'
  | 'planning_settings'
  | 'papier_bekijken'
  | 'papier_aanpassen'
  | 'werkorders_instellingen'
  | 'densiteiten_bekijken_eigen'
  | 'densiteiten_bekijken_alle';


export interface RolePermissions {
  role: UserRole;
  permissions: Permission[];
}

export interface User {
  id: string;
  username: string;
  name?: string;
  role: UserRole;
  press?: PressType;
  pressId?: string;
  operator_id?: string;
}

export interface Operator {
  id: string;
  employeeId: string;
  name: string;
  presses: PressType[];
  active: boolean;
  canEditTasks: boolean;
  canAccessOperatorManagement: boolean;
  dienstverband?: 'Intern' | 'Extern';
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
  subtexts?: Record<string, string>; // Maps press ID to subtext
  pressIds: string[];
  active: boolean;
}

export interface FeedbackItem {
  id: string;
  type: 'bug' | 'feature' | 'other';
  message: string;
  user_agent?: string;
  url?: string;
  created: string;
  username?: string;
  ip?: string;
  contact_operator?: string;
  status?: 'pending' | 'planned' | 'in_progress' | 'completed' | 'rejected';
  admin_comment?: string;
  archived?: boolean;
  show_on_roadmap?: boolean;
  roadmap_status?: 'planned' | 'in_progress' | 'completed';
  roadmap_title?: string;
  completed_version?: string;
  completed_at?: string | null;
  use_message_as_title?: boolean;
}

export const EXTERNAL_TAG_NAME = 'Extern';

export interface Tag {
  id: string;
  naam: string;
  kleur?: string;
  active: boolean;
  system_managed?: boolean;
  highlights?: {
    enabled: boolean;
    days: number[]; // 0-6 (Sun-Sat)
    allDay: boolean;
    startTime: string; // "HH:mm"
    endTime: string; // "HH:mm"
    method: 'category' | 'dot';
    cutoffDays?: number | null;
  }[];
}

export interface ActivityLog {
  id: string;
  timestamp: Date;
  user: string;
  action: string;
  entity: string;
  entityId?: string;
  entityName: string;
  details: string;
  oldValue?: string;
  newValue?: string;
  press?: PressType;
}

export interface BackupInfo {
  key: string;
  size: number;
  modified: string;
}

export interface BackupSettings {
  enabled: boolean;
  cron: string;
  cronMaxKeep: number;
  s3: {
    enabled: boolean;
    bucket: string;
    region: string;
    endpoint: string;
    accessKey: string;
    secretKey: string;
    forcePathStyle: boolean;
  };
}

export interface CloudSyncStatus {
  configured: boolean;
  path?: string;
}

export interface Press {
  id: string;
  name: PressType;
  active: boolean;
  archived: boolean;
  category_order?: any;
}

export interface UserAccount {
  id: string;
  username: string;
  name?: string;
  password?: string;
  role: UserRole;
  press?: PressType;
  operator_id?: string;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  fetchActivityLogs: () => Promise<void>;
  activityLogs: ActivityLog[];
  addActivityLog: (log: Omit<ActivityLog, 'id' | 'timestamp'>) => Promise<void>;
  userAccounts: UserAccount[];
  presses: Press[];
  fetchUserAccounts: () => Promise<void>;
  sendFeedback: (type: string, message: string, context?: any, additionalData?: Partial<FeedbackItem>) => Promise<boolean>;
  fetchFeedback: () => Promise<any[]>;
  resolveFeedback?: (id: string) => Promise<boolean>;
  updateFeedback?: (id: string, data: any) => Promise<boolean>;
  deleteFeedback?: (id: string) => Promise<boolean>;
  archiveFeedback?: (id: string) => Promise<boolean>;
  fetchParameters: () => Promise<Record<string, any>>;
  isFirstRun: boolean;
  onboardingDismissed: boolean;
  setOnboardingDismissed: (val: boolean) => void;
  testingMode: boolean;
  setTestingMode: (val: boolean) => Promise<void>;
  checkFirstRun: () => Promise<void>;
  hasPermission: (permission: Permission) => boolean;
  rolePermissions: RolePermissions[];
  updateRolePermissions: (role: UserRole, permissions: Permission[]) => Promise<void>;
  createRole: (name: string) => Promise<boolean>;
  deleteRole: (role: string) => Promise<boolean>;
  // Backup functions
  listBackups: () => Promise<BackupInfo[]>;
  createBackup: (name?: string) => Promise<boolean>;
  downloadBackup: (key: string) => Promise<string>;
  deleteBackup: (key: string) => Promise<boolean>;
  restoreBackup: (key: string) => Promise<boolean>;
  uploadBackup: (file: File) => Promise<boolean>;
  getBackupSettings: () => Promise<BackupSettings | null>;
  updateBackupSettings: (settings: Partial<BackupSettings>) => Promise<boolean>;
  getCloudSyncStatus: () => Promise<CloudSyncStatus | null>;
  cloudSyncStatus: CloudSyncStatus | null;
  refreshCloudSyncStatus: () => Promise<void>;
  configureCloudSync: (type: 'gdrive' | 'onedrive' | 'local', config: any) => Promise<boolean>;
  verifyCloudBackups: (filenames: string[]) => Promise<Record<string, boolean>>;
  isSuperuser: boolean;
  authenticateSuperuser: (email: string, password: string) => Promise<boolean>;
  getSystemSetting: (key: string, defaultValue: any) => any;
  updateSystemSetting: (key: string, value: any) => Promise<boolean>;
  refreshTriggeredAt: string | null;
  triggerGlobalRefresh: () => Promise<boolean>;
  isLoading: boolean;
  updateAvailable: boolean;
  latestVersion: string | null;
  showUpdateDialog: boolean;
  setShowUpdateDialog: (val: boolean) => void;
  isUpdating: boolean;
  setIsUpdating: (val: boolean) => void;
  checkForUpdates: () => Promise<void>;
  performUpdate: () => Promise<{ success: boolean; message: string; output?: string }>;
  recentCommits: string[];
  fetchRecentCommits: () => Promise<void>;
  appStartTime: number;
  simulatedRole: string | null;
  setSimulatedRole: (role: string | null) => void;
  effectiveRole: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [userAccounts, setUserAccounts] = useState<UserAccount[]>([]);
  const [rolePermissions, setRolePermissions] = useState<RolePermissions[]>([]);
  const [simulatedRole, setSimulatedRoleState] = useState<string | null>(() =>
    sessionStorage.getItem('simulated_role') || null
  );

  const setSimulatedRole = (role: string | null) => {
    setSimulatedRoleState(role);
    if (role) sessionStorage.setItem('simulated_role', role);
    else sessionStorage.removeItem('simulated_role');
  };
  const [onboardingDismissedState, setOnboardingDismissedState] = useState<boolean>(() => {
    return localStorage.getItem('onboarding_dismissed') === 'true';
  });
  const [testingMode, setTestingModeState] = useState<boolean>(false);
  const [isFirstRun, setIsFirstRun] = useState<boolean>(false);
  const [isSuperuser, setIsSuperuser] = useState<boolean>(false);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<CloudSyncStatus | null>(null);
  const [systemSettings, setSystemSettings] = useState<Record<string, any>>({});
  const [refreshTriggeredAt, setRefreshTriggeredAt] = useState<string | null>(null);
  const [presses, setPresses] = useState<Press[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [recentCommits, setRecentCommits] = useState<string[]>([]);
  const [appStartTime] = useState<number>(Date.now());


  const setOnboardingDismissed = (val: boolean) => {
    setOnboardingDismissedState(val);
    localStorage.setItem('onboarding_dismissed', val ? 'true' : 'false');
  };

  const logout = async () => {
    // Unsubscribe from all to prevent 403 mismatch errors during token clearing
    try {
      pb.realtime.unsubscribe();
    } catch (e) {
      console.warn("[Auth] Unsubscribe during logout failed:", e);
    }

    // Purge Dexie IndexedDB cache (await to ensure clean state for next session)
    try {
      await drukwerkenCache.purge();
    } catch (e) {
      console.warn("[Auth] Cache purge failed:", e);
    }

    // Clear session storage (filters, tab states, scroll positions)
    try {
      sessionStorage.clear();
    } catch (e) {
      console.warn("[Auth] sessionStorage clear failed:", e);
    }

    // Clear user-specific localStorage items (keep onboarding_dismissed)
    try {
      localStorage.removeItem('thooft_werkorders');
      localStorage.removeItem('thooft_locked_katernen');
      localStorage.removeItem('superuser_credentials');
    } catch (e) {
      console.warn("[Auth] localStorage cleanup failed:", e);
    }

    pb.authStore.clear();
    setUser(null);
    setIsSuperuser(false);

    // Final guaranteed fresh state: reload the page
    window.location.reload();
  };

  const addActivityLog = async (log: Omit<ActivityLog, 'id' | 'timestamp'>) => {
    try {
      const data = {
        user: log.user || 'System',
        action: log.action || '',
        entity: log.entity || '',
        entity_id: log.entityId || '',
        entityId: log.entityId || '',
        entity_name: log.entityName || '',
        entityName: log.entityName || '',
        press: log.press || '',
        details: log.details || `${log.action} ${log.entityName || ''}`,
        old_value: log.oldValue || '',
        oldValue: log.oldValue || '',
        new_value: log.newValue || '',
        newValue: log.newValue || '',
        // Lowercase variants for extreme compatibility
        entityid: log.entityId || '',
        entityname: log.entityName || '',
        oldvalue: log.oldValue || '',
        newvalue: log.newValue || ''
      };
      await pb.collection('activity_logs').create(data);
    } catch (e: any) {
      console.error('Add log failed:', e.response || e);
    }
  };

  const mapDbRoleToUi = (dbRole: string): UserRole => {
    if (!dbRole) return 'press';
    const lowerRole = dbRole.toLowerCase();
    // Backward-compat mappings for legacy DB values
    if (lowerRole === 'operator') return 'press';
    if (lowerRole === 'observer') return 'waarnemer';
    // Legacy roles stored with capital first letter → normalize to lowercase
    if (lowerRole === 'admin') return 'admin';
    if (lowerRole === 'meestergast') return 'meestergast';
    if (lowerRole === 'waarnemer') return 'waarnemer';
    // Custom roles: preserve original casing from DB (e.g. "CEO" stays "CEO")
    return dbRole;
  };

  const mapUiRoleToDb = (uiRole: UserRole): string => {
    // Fixed mappings for legacy roles that have canonical DB representations
    const legacyMap: Record<string, string> = {
      'press': 'Operator',
      'admin': 'Admin',
      'meestergast': 'Meestergast',
      'waarnemer': 'Waarnemer',
    };
    if (!uiRole) return 'Operator';
    // Custom roles are stored as-is (no transformation)
    return legacyMap[uiRole] ?? uiRole;
  };

  const hasPermission = useCallback((permission: Permission): boolean => {
    if (!user) return false;
    const effectiveRole = simulatedRole || (user.role as string);
    // Admins always have access to manage permissions to prevent lockout — but not when simulating
    if (!simulatedRole && user.role === 'admin' && (permission === 'manage_permissions' || permission === 'management_access')) return true;

    const roleData = rolePermissions.find(rp =>
      rp.role?.toLowerCase() === effectiveRole?.toLowerCase()
    );
    
    // Fallback to coded defaults if no DB record found
    if (!roleData) {
      const codedDefaults: Record<string, Permission[]> = {
        'admin': [
          'tasks_view', 'tasks_edit', 'drukwerken_view', 'drukwerken_view_all', 'drukwerken_create', 'reports_view', 'reports_archive_view', 'checklist_view',
          'extern_view', 'management_access', 'manage_personnel', 'manage_categories',
          'manage_tags', 'manage_presses', 'manage_accounts', 'manage_permissions',
          'toolbox_access', 'logs_view', 'logs_view_all', 'feedback_view', 'feedback_manage',
          'manage_themes', 'manage_notifications', 'manage_system_tasks',
          'production_analytics_view', 'maintenance_analytics_view', 'manage_ticker', 'data_checker_view', 'activity_ticker_view', 'osint_view', 'drukwerken_trash_view',
          'planning_view', 'planning_edit', 'planning_settings',
          'papier_bekijken', 'papier_aanpassen', 'werkorders_instellingen',
          'werkfiches_bekijken_eigen', 'werkfiches_bekijken_alle', 'werkfiches_importeren', 'werkfiches_filters_instellingen',
          'densiteiten_bekijken_eigen', 'densiteiten_bekijken_alle'
        ],
        'meestergast': [
          'tasks_view', 'tasks_edit', 'drukwerken_view', 'drukwerken_view_all', 'checklist_view',
          'extern_view', 'logs_view', 'feedback_view', 'osint_view',
          'planning_view', 'planning_edit',
          'papier_bekijken', 'werkorders_instellingen',
          'werkfiches_bekijken_alle', 'werkfiches_importeren', 'werkfiches_filters_instellingen',
          'densiteiten_bekijken_eigen', 'densiteiten_bekijken_alle'
        ],
        'press': ['tasks_view', 'drukwerken_view', 'drukwerken_create', 'feedback_view', 'planning_view', 'werkfiches_bekijken_eigen', 'densiteiten_bekijken_eigen'],
        'waarnemer': [
          'tasks_view', 'drukwerken_view', 'drukwerken_view_all', 'reports_view', 'reports_archive_view', 'checklist_view',
          'extern_view', 'logs_view', 'feedback_view', 'production_analytics_view',
          'maintenance_analytics_view', 'activity_ticker_view', 'osint_view',
          'planning_view',
          'papier_bekijken', 'werkfiches_bekijken_alle', 'densiteiten_bekijken_alle'
        ]
      };

      const defaultPerms = codedDefaults[effectiveRole?.toLowerCase()] || [];
      if (defaultPerms.includes(permission)) return true;

      // Also support hierarchy in defaults
      if (permission === 'tasks_view' && defaultPerms.includes('tasks_edit')) return true;
      if (permission === 'drukwerken_view' && (defaultPerms.includes('drukwerken_view_all') || defaultPerms.includes('drukwerken_create'))) return true;

      if (user.role && Math.random() < 0.05) {
        if (codedDefaults[effectiveRole?.toLowerCase()]) {
          console.warn(`[Auth] Using coded fallbacks for role: "${user.role}" (DB missing data)`);
        }
      }
      return false;
    }

    // Direct match
    if (roleData.permissions.includes(permission)) return true;

    // Hierarchy: If you have a "stronger" permission, you get the "weaker" one
    if (permission === 'tasks_view' && roleData.permissions.includes('tasks_edit')) return true;
    if (permission === 'drukwerken_view' && (roleData.permissions.includes('drukwerken_view_all') || roleData.permissions.includes('drukwerken_create'))) return true;
    if (permission === 'logs_view' && roleData.permissions.includes('logs_view_all')) return true;
    if (permission === 'feedback_view' && roleData.permissions.includes('feedback_manage')) return true;
    // reports_view implies reports_archive_view
    if (permission === 'reports_archive_view' && roleData.permissions.includes('reports_view')) return true;
    if (permission === 'management_access' && (
      roleData.permissions.includes('manage_personnel') ||
      roleData.permissions.includes('manage_accounts') ||
      roleData.permissions.includes('manage_permissions')
    )) return true;
    if (permission === 'papier_bekijken' && roleData.permissions.includes('papier_aanpassen')) return true;
    if (permission === 'werkfiches_bekijken_eigen' && roleData.permissions.includes('werkfiches_bekijken_alle')) return true;
    if (permission === 'densiteiten_bekijken_eigen' && roleData.permissions.includes('densiteiten_bekijken_alle')) return true;

    return false;
  }, [user, rolePermissions, simulatedRole]);

  // --- Data Fetching ---
  const fetchTestingMode = useCallback(async () => {
    try {
      const record = await pb.collection('app_settings').getFirstListItem('key="testing_mode"');
      // Handle both boolean and string "true"/"false" from JSON
      const isEnabled = record.value === true || record.value === 'true';
      console.log("[Auth] Fetched testing_mode:", isEnabled);
      setTestingModeState(isEnabled);
    } catch (e) {
      setTestingModeState(false);
    }
  }, []);

  const fetchSystemSettings = useCallback(async () => {
    try {
      const records = await pb.collection('app_settings').getFullList();
      const settings: Record<string, any> = {};
      records.forEach(r => {
        settings[r.key] = r.value;
      });
      setSystemSettings(settings);
    } catch (e) {
      console.warn("Failed to fetch system settings", e);
    }
  }, []);

  const getSystemSetting = (key: string, defaultValue: any) => {
    return systemSettings[key] ?? defaultValue;
  };

  const updateSystemSetting = async (key: string, value: any) => {
    try {
      let record;
      try {
        record = await pb.collection('app_settings').getFirstListItem(`key="${key}"`);
      } catch (e) {
        // Not found, create it
      }

      if (record) {
        await pb.collection('app_settings').update(record.id, { value });
      } else {
        await pb.collection('app_settings').create({ key, value });
      }

      setSystemSettings(prev => ({ ...prev, [key]: value }));
      toast.success("Instelling opgeslagen");
      return true;
    } catch (e: any) {
      console.error("Update setting failed:", e);
      toast.error(`Opslaan mislukt: ${e.message}`);
      return false;
    }
  };

  const checkFirstRun = useCallback(async () => {
    try {
      // Use a raw request to check if the users collection is empty
      // and handle potential 400/403 errors gracefully
      const result = await pb.collection('users').getList(1, 1, {
        $cancelKey: 'checkFirstRun'
      });
      setIsFirstRun(result.totalItems === 0);
    } catch (e: any) {
      // 400 Bad Request can happen if the API rule is complex or if the collection is not accessible
      // 403 Forbidden is expected for non-logged in users when listing users
      if (e.status === 403 || e.status === 400) {
        setIsFirstRun(false);
      } else {
        // If it's a 404, the collection might not exist yet (very rare in PB)
        setIsFirstRun(true);
      }
    }
  }, []);

  const fetchPresses = useCallback(async () => {
    try {
      const records = await pb.collection('persen').getFullList({ sort: 'naam' });
      setPresses(records.map((r: any) => ({
        id: r.id,
        name: r.naam,
        active: r.active !== false,
        archived: r.archived === true
      })));
    } catch (e) {
      console.error("Fetch presses failed", e);
    }
  }, []);

  const fetchUserAccounts = useCallback(async () => {
    try {
      const records = await pb.collection('users').getFullList();
      records.sort((a: any, b: any) => (a.username || '').localeCompare(b.username || ''));
      setUserAccounts(records.map((r: any) => ({
        id: r.id, 
        username: r.username, 
        name: r.name, 
        email: r.email,
        role: mapDbRoleToUi(r.role), 
        press: r.press, 
        operator_id: r.operator_id, 
        password: r.plain_password
      })));
    } catch (e) {
      console.error("Fetch users failed", e);
    }
  }, []);

  const fetchActivityLogs = useCallback(async () => {
    try {
      const records = await pb.collection('activity_logs').getFullList({
        sort: '-created',
      });
      records.sort((a: any, b: any) => new Date(b.created).getTime() - new Date(a.created).getTime());
      setActivityLogs(records.map((r: any) => ({
        id: r.id,
        timestamp: new Date(r.created),
        user: r.user,
        action: r.action,
        entity: r.entity,
        entityId: r.entity_id || r.entityId,
        entityName: r.entity_name || r.entityName,
        details: r.details,
        press: r.press,
        oldValue: r.old_value || r.oldValue,
        newValue: r.new_value || r.newValue
      })));
    } catch (e) {
      console.error("Fetch logs failed", e);
    }
  }, []);

  const setTestingMode = async (val: boolean) => {
    try {
      let record;
      try {
        record = await pb.collection('app_settings').getFirstListItem('key="testing_mode"');
        await pb.collection('app_settings').update(record.id, { value: val });
      } catch (e) {
        // Create if doesn't exist
        await pb.collection('app_settings').create({ key: 'testing_mode', value: val });
      }
      setTestingModeState(val);
      toast.success(`Test modus ${val ? 'ingeschakeld' : 'uitgeschakeld'}`);
    } catch (e: any) {
      console.error("Failed to set testing mode:", e);
      toast.error(`Kon test modus niet instellen: ${e.message}`);
    }
  };

  const triggerGlobalRefresh = async () => {
    try {
      const now = new Date().toISOString();
      let record;
      try {
        record = await pb.collection('app_settings').getFirstListItem('key="force_refresh_trigger"');
        await pb.collection('app_settings').update(record.id, { value: now });
      } catch (e) {
        await pb.collection('app_settings').create({ key: 'force_refresh_trigger', value: now });
      }
      console.log("[Auth] Global refresh triggered by user.");
      return true;
    } catch (e) {
      console.error("Failed to trigger global refresh:", e);
      toast.error("Kan globale refresh niet triggeren");
      return false;
    }
  };

  const fetchPermissions = useCallback(async () => {
    console.log("[Auth] --- fetchPermissions diagnostic ---");
    console.log("[Auth] Current user:", user?.id, "Role:", user?.role);
    console.log("[Auth] PB Auth state:", pb.authStore.isValid ? "VALID" : "INVALID", "Token present:", !!pb.authStore.token);
    try {
      let records = await pb.collection('role_permissions').getFullList();
      console.log(`[Auth] fetchPermissions: Got ${records.length} records.`, records.map(r => r.role));
      
      const defaults = [
        {
          role: 'Admin',
          permissions: [
            'tasks_view', 'tasks_edit', 'drukwerken_view', 'drukwerken_view_all', 'drukwerken_create', 'reports_view', 'reports_archive_view', 'checklist_view',
            'extern_view', 'management_access', 'manage_personnel', 'manage_categories',
            'manage_tags', 'manage_presses', 'manage_accounts', 'manage_permissions',
            'toolbox_access', 'logs_view', 'logs_view_all', 'feedback_view', 'feedback_manage',
            'manage_themes', 'manage_notifications', 'manage_system_tasks',
            'production_analytics_view', 'maintenance_analytics_view', 'manage_ticker', 'data_checker_view', 'activity_ticker_view', 'osint_view', 'drukwerken_trash_view'
          ]

        },
        {
          role: 'Meestergast',
          permissions: [
            'tasks_view', 'tasks_edit', 'drukwerken_view', 'drukwerken_view_all', 'checklist_view',
            'extern_view', 'logs_view', 'feedback_view', 'osint_view'
          ]
        },
        {
          role: 'Operator',
          permissions: ['tasks_view', 'drukwerken_view', 'drukwerken_create', 'feedback_view']
        },
        {
          role: 'Waarnemer',
          permissions: [
            'tasks_view', 'drukwerken_view', 'drukwerken_view_all', 'reports_view', 'reports_archive_view', 'checklist_view',
            'extern_view', 'logs_view', 'feedback_view', 'production_analytics_view',
            'maintenance_analytics_view', 'activity_ticker_view', 'osint_view'
          ]
        }
      ];

      const dbRoles = records.map(r => r.role);
      const missingRoles = defaults.filter(d => !dbRoles.includes(d.role));

      if (missingRoles.length > 0 && user?.role === 'admin') {
        console.log("[Auth] Admin detected missing roles, seeding...", missingRoles.map(m => m.role));
        for (const def of missingRoles) {
          try {
            await pb.collection('role_permissions').create(def);
          } catch (e) {
            console.warn(`Failed to seed ${def.role}:`, e);
          }
        }
        // Refetch after seeding
        records = await pb.collection('role_permissions').getFullList();
      }

      // First pass: apply defaults in memory if DB records are corrupted
      const mapped = records.map((r: any) => {
        const def = defaults.find(d => d.role === r.role);
        const isCorrupted = !r.permissions || r.permissions.length < 5;
        return {
          role: mapDbRoleToUi(r.role),
          permissions: ((isCorrupted && def) ? def.permissions : r.permissions) as Permission[]
        };
      });
      setRolePermissions(mapped);

      // Auto-repair for Admins: try to save rescued data to DB
      if (user?.role === 'admin' && records.length > 0) {
        let needsRefetch = false;
        for (const record of records) {
          const def = defaults.find(d => d.role === record.role);
          if (def && (!record.permissions || record.permissions.length < 5)) {
            console.log(`[Auth] Admin repairing corrupted permissions for: ${record.role}`);
            try {
              // Write the full defaults back to the DB to rescue the role
              await pb.collection('role_permissions').update(record.id, { permissions: def.permissions });
              needsRefetch = true;
            } catch (e) {
              console.warn(`[Auth] Failed to repair ${record.role}:`, e);
            }
          }
        }
        if (needsRefetch) {
          const fresh = await pb.collection('role_permissions').getFullList();
          setRolePermissions(fresh.map((r: any) => ({
            role: mapDbRoleToUi(r.role),
            permissions: r.permissions as Permission[]
          })));
        }
      }
    } catch (e) {
      console.error("Fetch permissions failed:", e);
    }
  }, [user?.role]);

  // Set up real-time subscription for permissions
  useEffect(() => {
    fetchPermissions();
    let isSubscribed = false;
    const subscribe = async () => {
      try {
        await pb.collection('role_permissions').subscribe('*', (e) => {
          console.log("[Auth] Role permissions changed, refetching...", e.action);
          fetchPermissions();
        });
        isSubscribed = true;
      } catch (err) {
        console.error("Role permissions subscription failed:", err);
      }
    };
    
    subscribe();
    return () => {
      if (isSubscribed) {
        pb.collection('role_permissions').unsubscribe('*').catch(() => {});
      }
    };
  }, [fetchPermissions]);

  const updateRolePermissions = async (role: UserRole, permissions: Permission[]) => {
    const dbRole = mapUiRoleToDb(role);
    try {
      // Case-insensitive lookup to avoid creating duplicate records
      const all = await pb.collection('role_permissions').getFullList({ fields: 'id,role' });
      const record = all.find(r => r.role?.toLowerCase() === dbRole.toLowerCase());

      if (!record) {
        // Record missing, create it
        await pb.collection('role_permissions').create({ role: dbRole, permissions });
        setRolePermissions(prev => {
          const exists = prev.some(rp => rp.role === role);
          if (exists) return prev.map(rp => rp.role === role ? { ...rp, permissions } : rp);
          return [...prev, { role, permissions }];
        });
        toast.success(`Rechten aangemaakt voor ${role}`);
        return;
      }

      await pb.collection('role_permissions').update(record.id, { permissions });
      setRolePermissions(prev => prev.map(rp => rp.role === role ? { ...rp, permissions } : rp));
      toast.success(`Rechten bijgewerkt voor ${role}`);
    } catch (e: any) {
      console.error("Update permissions fully failed:", e);
      toast.error(`Kon rechten niet bijwerken: ${e.message}`);
    }
  };

  const createRole = async (name: string): Promise<boolean> => {
    const trimmed = name.trim();
    if (!trimmed) return false;
    // Store role name exactly as entered (preserves "CEO", "Manager", etc.)
    const dbRole = trimmed;
    try {
      // Case-insensitive existence check: fetch all and compare lowercase
      const existing = await pb.collection('role_permissions').getFullList({ fields: 'role' });
      const alreadyExists = existing.some(r => r.role?.toLowerCase() === dbRole.toLowerCase());
      if (alreadyExists) {
        toast.error(`Rol "${dbRole}" bestaat al`);
        return false;
      }
      await pb.collection('role_permissions').create({ role: dbRole, permissions: [] });
      toast.success(`Rol "${dbRole}" aangemaakt`);
      return true;
    } catch (e: any) {
      console.error('[createRole] error:', e.status, e.message, JSON.stringify(e.data));
      toast.error(`Kon rol niet aanmaken: ${e.message}`);
      return false;
    }
  };

  const deleteRole = async (uiRole: string): Promise<boolean> => {
    if (uiRole === 'admin') {
      toast.error('De Admin rol kan niet verwijderd worden');
      return false;
    }
    const dbRole = mapUiRoleToDb(uiRole);
    try {
      // Case-insensitive lookup: find the record matching this role
      const all = await pb.collection('role_permissions').getFullList({ fields: 'id,role' });
      const record = all.find(r => r.role?.toLowerCase() === dbRole.toLowerCase());
      if (!record) {
        toast.error(`Rol "${dbRole}" niet gevonden`);
        return false;
      }
      await pb.collection('role_permissions').delete(record.id);
      setRolePermissions(prev => prev.filter(rp => rp.role !== uiRole));
      toast.success(`Rol "${dbRole}" verwijderd`);
      return true;
    } catch (e: any) {
      toast.error(`Kon rol niet verwijderen: ${e.message}`);
      return false;
    }
  };

  const loadData = useCallback(async () => {
    try {
      if (user && user.role === 'press' && (!user.press || !user.pressId)) {
        try {
          const freshUser = await pb.collection('users').getOne(user.id);
          if (freshUser.press || freshUser.pers) {
            setUser(prev => prev ? {
              ...prev,
              press: freshUser.press || prev.press,
              pressId: freshUser.pers || prev.pressId
            } : null);
          }
        } catch (e) {
          console.error("Failed to auto-refresh user record:", e);
        }
      }

      await Promise.all([
        fetchUserAccounts(),
        fetchPermissions(),
        fetchActivityLogs(),
        fetchPresses()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, fetchUserAccounts, fetchPermissions, fetchActivityLogs, fetchPresses]);

  // --- Update Functions ---
  const checkForUpdates = useCallback(async () => {
    // Only check if user is admin/superuser? Or allow check but restrict apply.
    // The requirement says "admin only ... warning".
    // We'll let the context store the state, and UI decides to show it.
    try {
      const response = await fetch(`${pb.baseUrl.replace(/\/$/, '')}/api/custom/update/check`);
      if (response.ok) {
        const data = await response.json();
        // data.latestVersion comes from GitHub tag (e.g. "v1.4.0")
        // APP_VERSION comes from config (e.g. "v 1.3.2")

        if (!data.latestVersion || data.latestVersion === "v0.0.0") {
          setUpdateAvailable(false);
          setLatestVersion(null);
          return;
        }

        const remote = data.latestVersion.toLowerCase().replace(/v\s*/, '').trim();
        const local = APP_VERSION.toLowerCase().replace(/v\s*/, '').trim();

        if (remote !== local && remote !== '0.0.0') {
          setUpdateAvailable(true);
          setLatestVersion(data.latestVersion);
        } else {
          setUpdateAvailable(false);
          setLatestVersion(null);
        }
      }
    } catch (e) {
      console.warn("[Auth] Update check failed:", e);
    }
  }, []);

  const performUpdate = async () => {
    try {
      // Use PB client to handle auth headers automatically
      // But PB JS SDK doesn't have a generic "send" for custom endpoints easily accessible via collection methods
      // We can use fetch with pb.authStore.token

      const response = await fetch(`${pb.baseUrl.replace(/\/$/, '')}/api/custom/update/apply`, {
        method: 'POST',
        headers: {
          'Authorization': pb.authStore.token,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (response.ok) {
        return { success: true, message: data.message || "Update voltooid" };
      } else {
        return { success: false, message: data.message || "Update mislukt" };
      }
    } catch (e) {
      return { success: false, message: e instanceof Error ? e.message : String(e) };
    }
  };

  useEffect(() => {
    if (user && (user.role === 'admin' || isSuperuser)) {
      checkForUpdates();
    }
  }, [user, isSuperuser, checkForUpdates]);


  // --- Backup Functions ---
  const listBackups = async (): Promise<BackupInfo[]> => {
    try {
      const backups = await pb.backups.getFullList();
      return backups.map((b: any) => ({
        key: b.key,
        size: b.size,
        modified: b.modified
      }));
    } catch (e: any) {
      console.error("List backups failed:", e);
      // Only toast if it's NOT a permission error, to avoid spamming normal users
      if (e.status !== 403) {
        toast.error(`Kon backups niet ophalen: ${e.message}`);
      }
      return [];
    }
  };

  const createBackup = async (name?: string): Promise<boolean> => {
    try {
      // PocketBase requires format: [a-z0-9_-].zip
      // We'll clean the name and ensure it's lowercase
      const timestamp = new Date().toISOString()
        .replace(/[:.]/g, '-')
        .replace('T', '_')
        .replace('Z', '')
        .toLowerCase();

      const cleanName = (name || `backup_${timestamp}`)
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .toLowerCase();

      const backupName = `${cleanName}.zip`;

      await pb.backups.create(backupName);

      // Also backup rclone config alongside database
      try {
        await fetch(`${pb.baseUrl.replace(/\/$/, '')}/api/config-backup/save`, {
          method: 'POST',
          body: JSON.stringify({ backupName: cleanName }),
          headers: {
            'Content-Type': 'application/json',
            'Authorization': pb.authStore.token
          }
        });
      } catch (configErr) {
        console.warn('Config backup failed (non-critical):', configErr);
      }

      // Automatically sync to cloud after backup
      try {
        await fetch(`${pb.baseUrl}/api/cloud-sync/sync-now`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': pb.authStore.token
          }
        });
      } catch (syncErr) {
        console.warn('Auto-sync failed (non-critical):', syncErr);
      }

      toast.success(`Backup "${backupName}" aangemaakt en gesynchroniseerd`);
      return true;
    } catch (e: any) {
      console.error("Create backup failed:", e);
      toast.error(`Backup aanmaken mislukt: ${e.message}`);
      return false;
    }
  };

  const downloadBackup = async (key: string): Promise<string> => {
    try {
      const token = await pb.files.getToken();
      const url = pb.backups.getDownloadUrl(token, key);
      return url;
    } catch (e: any) {
      console.error("Get backup URL failed:", e);
      toast.error(`Backup URL ophalen mislukt: ${e.message}`);
      return '';
    }
  };

  const deleteBackup = async (key: string): Promise<boolean> => {
    try {
      await pb.backups.delete(key);
      toast.success(`Backup "${key}" verwijderd`);
      return true;
    } catch (e: any) {
      console.error("Delete backup failed:", e);
      toast.error(`Backup verwijderen mislukt: ${e.message}`);
      return false;
    }
  };

  const restoreBackup = async (key: string): Promise<boolean> => {
    try {
      // First restore rclone config (before server restart)
      const cleanName = key.replace('.zip', '');
      try {
        await fetch(`${pb.baseUrl}/api/config-backup/restore`, {
          method: 'POST',
          body: JSON.stringify({ backupName: cleanName }),
          headers: {
            'Content-Type': 'application/json',
            'Authorization': pb.authStore.token
          }
        });
      } catch (configErr) {
        console.warn('Config restore failed (non-critical):', configErr);
      }

      await pb.backups.restore(key);
      toast.success(`Systeem wordt hersteld van backup "${key}". De server start nu opnieuw op.`);
      // The server will restart, so connection will be lost.
      // We might want to reload the page or logout after a short delay.
      setTimeout(() => {
        window.location.reload();
      }, 3000);
      return true;
    } catch (e: any) {
      console.error("Restore backup failed:", e);
      toast.error(`Herstel mislukt: ${e.message}`);
      return false;
    }
  };

  const uploadBackup = async (file: File): Promise<boolean> => {
    try {
      await pb.backups.upload({ file: file });
      toast.success(`Backup "${file.name}" succesvol geüpload`);
      return true;
    } catch (e: any) {
      console.error("Upload backup failed:", e);
      toast.error(`Upload mislukt: ${e.message}`);
      return false;
    }
  };

  const getBackupSettings = async (): Promise<BackupSettings | null> => {
    try {
      // 1. Get standard PB system settings for cron
      const settings = await pb.settings.getAll();
      const pbBackups = settings.backups || {};

      // 2. Get custom S3 config from app_settings collection
      let s3Config = {
        enabled: false,
        bucket: '',
        region: '',
        endpoint: '',
        accessKey: '',
        secretKey: '',
        forcePathStyle: false
      };

      try {
        const record = await pb.collection('app_settings').getFirstListItem('key="backup_s3_config"');
        if (record.value) {
          s3Config = { ...s3Config, ...record.value };
        }
      } catch (e) {
        // Not found, use defaults
      }

      return {
        // enabled: pbBackups.cron !== '', // Removed duplicate
        // Actually PB backups are always "enabled" if cron is valid.
        // Let's assume we store the "enabled" state by whether cron is empty or not in standard PB, 
        // OR we just obey the `enabled` boolean from our UI state which might be stored in app_settings too?
        // For now, let's map: 
        enabled: !!pbBackups.cron,
        cron: pbBackups.cron || '',
        cronMaxKeep: pbBackups.cronMaxKeep || 3,
        s3: s3Config
      };
    } catch (e: any) {
      console.error("Get backup settings failed:", e);
      // Only toast if it's NOT a permission error
      if (e.status !== 403) {
        toast.error(`Instellingen ophalen mislukt: ${e.message}`);
      }
      return null;
    }
  };

  const updateBackupSettings = async (settings: Partial<BackupSettings>): Promise<boolean> => {
    try {
      // 1. Update PB System Settings (Cron)
      // Only update if these changed or present
      const cronSettings: any = {};
      if (settings.cron !== undefined) cronSettings.cron = settings.enabled ? settings.cron : '';
      if (settings.cronMaxKeep !== undefined) cronSettings.cronMaxKeep = settings.cronMaxKeep;

      // Update S3 settings inside PB backups config for the internal runner
      if (settings.s3) {
        cronSettings.s3 = {
          enabled: settings.s3.enabled,
          bucket: settings.s3.bucket,
          region: settings.s3.region,
          endpoint: settings.s3.endpoint,
          accessKey: settings.s3.accessKey,
          secretKey: settings.s3.secretKey,
          forcePathStyle: settings.s3.forcePathStyle
        };
      }

      // If "enabled" is false, we might want to clear cron to stop it?
      if (settings.enabled === false) {
        cronSettings.cron = '';
      }

      await pb.settings.update({ backups: cronSettings });

      // 2. Update Custom S3 Config in app_settings
      if (settings.s3) {
        try {
          const record = await pb.collection('app_settings').getFirstListItem('key="backup_s3_config"');
          await pb.collection('app_settings').update(record.id, { value: settings.s3 });
        } catch (e) {
          await pb.collection('app_settings').create({ key: 'backup_s3_config', value: settings.s3 });
        }
      }

      toast.success('Backup instellingen succesvol bijgewerkt');
      return true;
    } catch (e: any) {
      console.error("Update backup settings failed:", e);
      // Detailed error log
      if (e.data) console.error("Validation errors:", e.data);
      toast.error(`Instellingen bijwerken mislukt: ${e.message}`);
      return false;
    }
  };

  const getCloudSyncStatus = async (): Promise<CloudSyncStatus | null> => {
    try {
      const status = await pb.send("/api/cloud-sync/status", { method: "GET" });
      setCloudSyncStatus(status);
      return status;
    } catch (e: any) {
      console.error("Get cloud sync status failed:", e);
      return null;
    }
  };

  const refreshCloudSyncStatus = async () => {
    await getCloudSyncStatus();
  };

  const verifyCloudBackups = async (filenames: string[]): Promise<Record<string, boolean>> => {
    if (!isSuperuser || filenames.length === 0) return {};
    try {
      const response = await fetch(`${pb.baseUrl}/api/cloud-sync/verify-batch?token=${encodeURIComponent(pb.authStore.token)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ filenames })
      });

      if (!response.ok) {
        throw new Error(`Verification failed: ${response.status}`);
      }

      return await response.json();
    } catch (e) {
      console.error('Cloud verification failed:', e);
      return {};
    }
  };

  const configureCloudSync = async (type: 'gdrive' | 'onedrive' | 'local', config: any): Promise<boolean> => {
    try {
      await pb.send("/api/cloud-sync/configure", {
        method: "POST",
        body: { type, config }
      });
      toast.success("Opslag succesvol gekoppeld");
      return true;
    } catch (e: any) {
      console.error("Configure cloud sync failed:", e);
      toast.error(`Koppeling mislukt: ${e.message}`);
      return false;
    }
  };

  const authenticateSuperuser = async (email: string, password: string): Promise<boolean> => {
    try {
      const authData = await pb.collection('_superusers').authWithPassword(email, password);
      if (pb.authStore.isValid && authData.record) {
        setIsSuperuser(true);
        toast.success('Superuser authenticatie succesvol');
        return true;
      }
      return false;
    } catch (e: any) {
      console.error("Superuser auth failed:", e);
      toast.error(`Authenticatie mislukt: ${e.message}`);
      return false;
    }
  };

  useEffect(() => {
    checkFirstRun();
    fetchTestingMode();
    fetchSystemSettings();
    if (user && hasPermission('toolbox_access')) {
      getCloudSyncStatus();
    }
  }, [checkFirstRun, fetchTestingMode, fetchSystemSettings, user]);

  // 1. Initialize Auth
  useEffect(() => {
    // Check if valid auth token exists
    if (pb.authStore.isValid) {
      const model = pb.authStore.model;
      if (model) {
        // Detect if we are a superuser (for Backup tab persistence)
        const isSuper = model.collectionName === "_superusers" ||
          model.collectionId === "_superusers" ||
          model.role === "Admin" ||
          model.role === "admin";

        if (isSuper) {
          setIsSuperuser(true);
        }

        // Correctly handle press identification
        let pressId = model.pers;
        let pressName = model.press;

        // If pressId is missing but we have a name, we'll try to resolve it in loadData
        // but for now we set what we have.

        setUser({
          id: model.id,
          username: model.username,
          name: model.name,
          role: model.role ? mapDbRoleToUi(model.role) : 'press',
          press: pressName,
          pressId: pressId,
          operator_id: model.operator_id
        });
        // Note: We do NOT set isLoading(false) here. 
        // We wait for loadData() to finish (triggered by setUser) to ensure permissions/presses are loaded.
      } else {
        // Valid token but no model? Should not happen usually, but treat as not logged in
        setIsLoading(false);
      }
    } else {
      // No valid token, so we are definitely done loading (and not logged in)
      setIsLoading(false);
    }
  }, []);




  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      if (!username || !password) return false;

      // authWithPassword accepts both username and email as identity directly.
      try {
        console.log(`[Auth] Authenticating with identity: ${username} via ${pb.baseUrl}`);
        const authData = await pb.collection('users').authWithPassword(username, password);
        if (pb.authStore.isValid && authData.record) {
          setUser({
            id: authData.record.id,
            username: authData.record.username,
            name: authData.record.name,
            role: authData.record.role ? mapDbRoleToUi(authData.record.role) : 'press',
            press: authData.record.press,
            pressId: authData.record.pers,
            operator_id: authData.record.operator_id
          });
          return true;
        }
      } catch (e: any) {
        console.error("[Auth] User login failed:", e?.status, e?.message, e);
        // Fallback for Admin (Superuser) login
        // In PB 0.23, superusers are in the _superusers collection
        if (username.includes('@')) {
          try {
            const authData: any = await pb.collection('_superusers').authWithPassword(username, password);
            if (pb.authStore.isValid && authData.record) {
              setUser({
                id: authData.record.id,
                username: authData.record.email,
                name: 'Admin',
                role: 'admin'
              });
              setIsSuperuser(true);
              return true;
            }
          } catch (adminError) {
            console.error("[Auth] Superuser login failed:", adminError);
          }
        }
      }

      return false;
    } catch (e) {
      console.error("[Auth] Login process error:", e);
      return false;
    }
  };



  const sendFeedback = async (type: string, message: string, context?: any, additionalData?: Partial<FeedbackItem>): Promise<boolean> => {
    try {
      await pb.collection('feedback').create({
        type,
        message,
        user: user?.username || 'Anonymous',
        status: additionalData?.status || 'pending',
        contact_operator: context?.operator || '',
        context,
        ...additionalData
      });
      return true;
    } catch (e) {
      console.error("Failed to send feedback:", e);
      return false;
    }
  };

  const resolveFeedback = async (id: string) => {
    // Deprecated, use updateFeedback
    return updateFeedback(id, { status: 'completed_success' });
  };

  const fetchFeedback = useCallback(async (): Promise<any[]> => {
    try {
      // Everyone sees all feedback
      const records = await pb.collection('feedback').getFullList({ sort: '-created' });

      return records.map((r: any) => ({
        id: r.id,
        type: r.type,
        message: r.message,
        username: r.user,
        created: r.created,
        status: r.status,
        admin_comment: r.admin_comment,
        archived: r.archived,
        contact_operator: r.context?.operator,
        url: r.context?.url,
        ip: r.context?.ip
      }));
    } catch (e) {
      console.error("Fetch feedback failed", e);
      return [];
    }
  }, [user]);

  const updateFeedback = async (id: string, data: any) => {
    try {
      await pb.collection('feedback').update(id, data);
      return true;
    } catch (e) {
      console.error("Update feedback failed", e);
      return false;
    }
  };

  const deleteFeedback = async (id: string) => {
    try {
      await pb.collection('feedback').delete(id);
      return true;
    } catch (e) {
      console.error("Delete feedback failed", e);
      return false;
    }
  };

  const archiveFeedback = async (id: string) => {
    try {
      await pb.collection('feedback').update(id, { archived: true });
      return true;
    } catch (e) {
      console.error("Archive feedback failed", e);
      return false;
    }
  };

  // --- Stubs for other entities ---


  // --- Stubs for other entities ---
  const fetchParameters = useCallback(async () => { return {}; }, []);

  // 4. Initial Data Load
  useEffect(() => {
    if (user) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]); // Only reload if user identity changes


  useEffect(() => {
    // Realtime subscription for system settings (specifically for forced refresh and testing mode)
    let isSubscribed = false;

    const subscribe = async () => {
      // Remove restricted check - app_settings (specifically testing_mode) needs to be 
      // observable even when not logged in for Quick Login to work.
      try {
        await pb.collection('app_settings').subscribe('*', (e) => {
          if (e.action === 'update' || e.action === 'create') {
            const key = e.record.key;
            const value = e.record.value;

            setSystemSettings(prev => ({ ...prev, [key]: value }));

            if (key === 'force_refresh_trigger') {
              console.log("[Auth] Received force_refresh_trigger update:", value);
              setRefreshTriggeredAt(value);
            }

            if (key === 'testing_mode') {
              const isEnabled = value === true || value === 'true';
              console.log("[Auth] Received testing_mode update:", isEnabled);
              setTestingModeState(isEnabled);
            }
          }
        });
        isSubscribed = true;
      } catch (err) {
        console.error("AuthContext app_settings subscription failed:", err);
      }
    };

    subscribe();
    return () => {
      if (isSubscribed) {
        pb.collection('app_settings').unsubscribe('*').catch((e) => {
          console.warn("[Auth] Unsubscribe from app_settings failed (expected if connection stale):", e);
        });
      }
    };
  }, []); // Remove user dependency to maintain subscription while logged out

  // Polling fallback: check force_refresh_trigger every 60s for clients that miss the SSE event
  useEffect(() => {
    const poll = async () => {
      try {
        const record = await pb.collection('app_settings').getFirstListItem('key="force_refresh_trigger"');
        const value = record?.value as string | undefined;
        if (value) {
          setRefreshTriggeredAt(prev => (prev !== value ? value : prev));
        }
      } catch { /* no record yet or offline */ }
    };
    const id = setInterval(poll, 60_000);
    return () => clearInterval(id);
  }, []);

  const fetchRecentCommits = useCallback(async () => {
    try {
      const response = await fetch(`${pb.baseUrl}/api/custom/git/recent-commits`, {
        method: 'GET',
        headers: {
          'Authorization': pb.authStore.token
        }
      });
      if (response.ok) {
        const data = await response.json();
        setRecentCommits(data);
      }
    } catch (e) {
      console.warn("[Auth] Failed to fetch recent commits:", e);
    }
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      login,
      logout,
      activityLogs,
      addActivityLog,
      fetchActivityLogs,
      userAccounts,
      presses,
      fetchUserAccounts,
      sendFeedback,
      fetchFeedback,
      resolveFeedback,
      updateFeedback,
      deleteFeedback,
      archiveFeedback,
      fetchParameters,
      isFirstRun,
      onboardingDismissed: onboardingDismissedState,
      setOnboardingDismissed,
      testingMode,
      setTestingMode,
      checkFirstRun,
      hasPermission,
      rolePermissions,
      updateRolePermissions,
      createRole,
      deleteRole,
      listBackups,
      createBackup,
      downloadBackup,
      deleteBackup,
      restoreBackup,
      uploadBackup,
      getBackupSettings,
      updateBackupSettings,
      getCloudSyncStatus,
      cloudSyncStatus,
      refreshCloudSyncStatus,
      configureCloudSync,
      verifyCloudBackups,
      isSuperuser,
      authenticateSuperuser,
      getSystemSetting,
      updateSystemSetting,
      refreshTriggeredAt,
      triggerGlobalRefresh,
      isLoading,
      updateAvailable,
      latestVersion,
      checkForUpdates,
      performUpdate,
      showUpdateDialog,
      setShowUpdateDialog,
      isUpdating,
      setIsUpdating,
      recentCommits,
      fetchRecentCommits,
      appStartTime,
      simulatedRole,
      setSimulatedRole,
      effectiveRole: simulatedRole ?? ((user?.role as string) || ''),
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
