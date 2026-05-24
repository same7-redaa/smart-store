export interface SystemUser {
  id: string;
  name: string;
  username: string;
  password: string;
  role: string;
  permissions: string[];
  active: boolean;
  createdAt: string;
  lastLogin?: string;
}

export const ALL_PAGES = [
  { id: 'dashboard', label: 'اللوحة العامة' },
  { id: 'orders', label: 'إدارة الطلبات' },
  { id: 'inventory', label: 'إدارة المخزون' },
  { id: 'shipping', label: 'إدارة الشحن' },
  { id: 'customers', label: 'إدارة العملاء' },
  { id: 'purchases', label: 'إدارة الموردين' },
  { id: 'expenses', label: 'إدارة المصروفات' },
  { id: 'system', label: 'إدارة النظام' },
];

function migrateUser(u: any): SystemUser {
  if (!u.permissions) {
    if (u.role === 'مدير') u.permissions = ALL_PAGES.map(p => p.id);
    else if (u.role === 'مشرف') u.permissions = ['dashboard', 'orders', 'inventory', 'shipping', 'customers', 'expenses'];
    else if (u.role === 'موظف طلبات') u.permissions = ['orders', 'shipping', 'customers'];
    else if (u.role === 'موظف مخزون') u.permissions = ['inventory', 'purchases'];
    else if (u.role === 'محاسب') u.permissions = ['dashboard', 'expenses', 'purchases'];
    else u.permissions = ALL_PAGES.map(p => p.id);
  }
  return u as SystemUser;
}

export function getUsers(): SystemUser[] {
  const raw = localStorage.getItem('my_system_users');
  if (raw) {
    const parsed = JSON.parse(raw);
    return parsed.map(migrateUser);
  }
  const defaultUsers: SystemUser[] = [{
    id: 'admin-1',
    name: 'مدير النظام',
    username: 'admin',
    password: 'admin',
    role: 'مدير النظام',
    permissions: ALL_PAGES.map(p => p.id),
    active: true,
    createdAt: new Date().toISOString(),
  }];
  localStorage.setItem('my_system_users', JSON.stringify(defaultUsers));
  return defaultUsers;
}

export function saveUsers(users: SystemUser[]) {
  localStorage.setItem('my_system_users', JSON.stringify(users));
}

export function hasPermission(session: { username: string } | null, pageId: string): boolean {
  if (!session) return false;
  const users = getUsers();
  const user = users.find(u => u.username === session.username);
  if (!user) return false;
  return user.permissions.includes(pageId);
}
