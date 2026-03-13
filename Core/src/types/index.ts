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

export type UserRole = 'admin' | 'press' | 'meestergast' | null;
export type PressType = string;

export type Permission =
  | 'tasks_view'
  | 'tasks_edit'
  | 'drukwerken_view'
  | 'drukwerken_view_all'
  | 'drukwerken_create'
  | 'reports_view'
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
  | 'manage_system_tasks';

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
