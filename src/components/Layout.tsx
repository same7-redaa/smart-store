import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Truck, 
  Users, 
  ShoppingBag, 
  ReceiptText, 
  Settings,
  Menu,
  Bell,
  Search,
  UserCircle,
  CheckCircle2,
  XCircle,
  Info,
  Tags,
  ChevronDown,
  ChevronUp,
  LogOut,
  Cloud,
  CloudOff,
  RefreshCw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../context/AppContext';

export type PageType = 
  | 'dashboard' 
  | 'orders' 
  | 'inventory' 
  | 'shipping' 
  | 'customers' 
  | 'purchases' 
  | 'expenses' 
  | 'system'
  | 'add-product'
  | 'edit-product'
  | 'view-product'
  | 'add-order'
  | 'edit-order'
  | 'view-order'
  | 'add-shipping-company'
  | 'edit-shipping-company'
  | 'edit-customer'
  | 'add-supplier'
  | 'edit-supplier'
  | 'view-supplier'
  | 'categories'
  | 'add-category'
  | 'add-expense'
  | 'edit-expense'
  | 'add-user'
  | 'edit-user'
  | 'wastage'
  | 'add-wastage'
  | 'attributes';

interface SidebarProps {
  activePage: PageType;
  setActivePage: (page: PageType) => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

const navItems: { id: PageType; label: string; icon: React.ReactNode }[] = [
   { id: 'dashboard', label: 'اللوحة العامة', icon: <LayoutDashboard size={20} /> },
   { id: 'orders', label: 'إدارة الطلبات', icon: <ShoppingCart size={20} /> },
   { id: 'inventory', label: 'ادارة المخزون', icon: <Package size={20} /> },
   { id: 'shipping', label: 'ادارة الشحن', icon: <Truck size={20} /> },
   { id: 'customers', label: 'ادارة العملاء', icon: <Users size={20} /> },
   { id: 'purchases', label: 'ادارة الموردين', icon: <ShoppingBag size={20} /> },
   { id: 'expenses', label: 'ادارة المصروفات', icon: <ReceiptText size={20} /> },
    { id: 'system', label: 'ادارة النظام', icon: <Settings size={20} /> },
  ];

const notificationStyles: Record<string, string> = {
  success: 'bg-emerald-100 text-emerald-800 border-emerald-300 shadow-sm',
  error: 'bg-red-100 text-red-800 border-red-300 shadow-sm',
  info: 'bg-blue-100 text-blue-800 border-blue-300 shadow-sm',
};

const notificationIcons: Record<string, React.ReactNode> = {
  success: <CheckCircle2 size={18} />,
  error: <XCircle size={18} />,
  info: <Info size={18} />,
};

const NotificationBadge: React.FC<{ notification: { type: string; message: string } }> = ({ notification }) => (
  <motion.div
    key="notification"
    initial={{ opacity: 0, y: -8, scale: 0.95 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    exit={{ opacity: 0, y: -8, scale: 0.95 }}
    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
    className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium whitespace-nowrap ${notificationStyles[notification.type] || notificationStyles.info}`}
  >
    {notificationIcons[notification.type] || notificationIcons.info}
    <span>{notification.message}</span>
  </motion.div>
);

function getSessionPermissions(username?: string): string[] {
  if (!username) return [];
  try {
    const raw = localStorage.getItem('my_system_users');
    if (!raw) return [];
    const users = JSON.parse(raw).map((u: any) => {
      if (!u.permissions) {
        if (u.role === 'مدير') u.permissions = ['dashboard', 'orders', 'inventory', 'shipping', 'customers', 'purchases', 'expenses', 'users', 'system'];
        else if (u.role === 'مشرف') u.permissions = ['dashboard', 'orders', 'inventory', 'shipping', 'customers', 'expenses'];
        else if (u.role === 'موظف طلبات') u.permissions = ['orders', 'shipping', 'customers'];
        else if (u.role === 'موظف مخزون') u.permissions = ['inventory', 'purchases'];
        else if (u.role === 'محاسب') u.permissions = ['dashboard', 'expenses', 'purchases'];
        else u.permissions = ['dashboard', 'orders', 'inventory', 'shipping', 'customers', 'purchases', 'expenses', 'users', 'system'];
      }
      return u;
    });
    const user = users.find((u: any) => u.username === username);
    return user?.permissions || [];
  } catch { return []; }
}

export const Layout: React.FC<{ children: React.ReactNode; activePage: PageType; setActivePage: (p: PageType) => void; session?: { name: string; role: string; username: string } | null; onLogout?: () => void }> = ({ children, activePage, setActivePage, session, onLogout }) => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isDesktopOpen, setIsDesktopOpen] = useState(true);
  const [expandedSections, setExpandedSections] = useState<string[]>(() => {
    const subPages: PageType[] = ['add-product', 'edit-product', 'view-product', 'categories', 'add-category', 'wastage', 'add-wastage', 'attributes'];
    return subPages.includes(activePage) ? ['inventory'] : [];
  });
  const { currentNotification } = useApp();

  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error'>('synced');

  useEffect(() => {
    const handleSyncStatus = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail === 'synced' || detail === 'syncing' || detail === 'error') {
        setSyncStatus(detail);
      }
    };
    window.addEventListener('supabase-sync-status', handleSyncStatus);
    return () => {
      window.removeEventListener('supabase-sync-status', handleSyncStatus);
    };
  }, []);

  const userPermissions = getSessionPermissions(session?.username);

  const visibleNavItems = navItems.filter(item => {
    if (!session?.username) return false;
    return userPermissions.includes(item.id) || userPermissions.includes('الكل');
  });

  useEffect(() => {
    const subPages: PageType[] = ['add-product', 'edit-product', 'view-product', 'categories', 'add-category', 'wastage', 'add-wastage', 'attributes'];
    if (subPages.includes(activePage)) {
      setExpandedSections(prev => prev.includes('inventory') ? prev : [...prev, 'inventory']);
    }
  }, [activePage]);

  return (
    <div className="flex h-screen overflow-hidden bg-[#f0f2f5] text-gray-800" style={{ '--sidebar-width': isDesktopOpen ? '240px' : '0px' } as any}>
      {/* Mobile Sidebar Overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 z-[55] bg-black/40 backdrop-blur-md lg:hidden" 
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed inset-y-0 right-0 z-[60] bg-white/85 backdrop-blur-xl border-l border-gray-200/50 transition-all duration-300 flex flex-col overflow-hidden shrink-0
          lg:relative lg:translate-x-0
          ${isMobileOpen ? 'translate-x-0 w-[240px]' : 'translate-x-full w-[240px]'}
          ${isDesktopOpen ? 'lg:w-[240px]' : 'lg:w-0 lg:border-none'}
        `}
      >
        <div className="w-[240px] h-full flex flex-col">
          <div className="flex items-center gap-3 px-6 h-[70px] border-b border-gray-200 shrink-0">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-white rounded-sm"></div>
          </div>
          <span className="text-primary font-bold text-xl flex items-center gap-2">سمارت ستور</span>
        </div>

        <div className="overflow-y-auto flex-1 p-4 space-y-1">
          {visibleNavItems.map((item) => (
            <React.Fragment key={item.id}>
              <button
                onClick={() => {
                  if (item.id === 'inventory') {
                    setExpandedSections(prev =>
                      prev.includes('inventory') ? prev.filter(x => x !== 'inventory') : [...prev, 'inventory']
                    );
                  } else {
                    setExpandedSections([]);
                  }
                  setActivePage(item.id);
                  setIsMobileOpen(false);
                }}
  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                   activePage === item.id ||
                   (item.id === 'inventory' && (activePage === 'add-product' || activePage === 'edit-product' || activePage === 'view-product' || activePage === 'categories' || activePage === 'add-category' || activePage === 'wastage' || activePage === 'add-wastage' || activePage === 'attributes')) ||
                   (item.id === 'orders' && (activePage === 'add-order' || activePage === 'edit-order')) ||
                   (item.id === 'shipping' && (activePage === 'add-shipping-company' || activePage === 'edit-shipping-company')) ||
                   (item.id === 'expenses' && (activePage === 'add-expense' || activePage === 'edit-expense')) ||
                   (item.id === 'customers' && activePage === 'edit-customer') ||
                   (item.id === 'purchases' && (activePage === 'add-supplier' || activePage === 'edit-supplier' || activePage === 'view-supplier'))
                     ? 'bg-primary/10 text-primary font-medium' 
                     : 'text-gray-500 hover:bg-gray-50'
                 }`}
              >
                {item.icon}
                <span className="text-sm">{item.label}</span>
                {item.id === 'inventory' && (
                  <span className="mr-auto transition-transform duration-200">
                    {expandedSections.includes('inventory') ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </span>
                )}
              </button>
              <AnimatePresence>
                {item.id === 'inventory' && expandedSections.includes('inventory') && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="mr-6 pr-3 border-r-2 border-gray-200 space-y-0.5">
                      <button
                        onClick={() => { setActivePage('categories'); setIsMobileOpen(false); }}
                        className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors text-sm cursor-pointer ${
                          activePage === 'categories'
                            ? 'bg-primary/10 text-primary font-medium'
                            : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <span className="w-1 h-1 rounded-full bg-current opacity-40 shrink-0" />
                        <span>إدارة الفئات</span>
                      </button>
                      <button
                        onClick={() => { setActivePage('attributes'); setIsMobileOpen(false); }}
                        className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors text-sm cursor-pointer ${
                          activePage === 'attributes'
                            ? 'bg-primary/10 text-primary font-medium'
                            : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <span className="w-1 h-1 rounded-full bg-current opacity-40 shrink-0" />
                        <span>إدارة المتغيرات</span>
                      </button>
                      <button
                        onClick={() => { setActivePage('wastage'); setIsMobileOpen(false); }}
                        className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors text-sm cursor-pointer ${
                          activePage === 'wastage'
                            ? 'bg-primary/10 text-primary font-medium'
                            : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <span className="w-1 h-1 rounded-full bg-current opacity-40 shrink-0" />
                        <span>إدارة الهالك</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </React.Fragment>
          ))}
        </div>
        
        <div className="p-4 border-t border-gray-100 space-y-2">
          <div className="flex items-center w-full gap-3 p-2 rounded-xl bg-gray-50">
            <div className="flex items-center justify-center w-10 h-10 bg-[#00c950] rounded-full text-white shrink-0">
              <UserCircle size={24} />
            </div>
            <div className="text-right truncate flex-1">
              <p className="text-sm font-bold text-gray-800">{session?.name || 'مستخدم'}</p>
              <p className="text-xs text-gray-400">{session?.role || ''}</p>
            </div>
          </div>
          {onLogout && (
            <button onClick={onLogout}
              className="flex items-center w-full gap-3 p-2 text-red-500 rounded-xl hover:bg-red-50 transition-colors text-sm">
              <LogOut size={16} />
              <span>تسجيل الخروج</span>
            </button>
          )}
        </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Topbar */}
        <header className="h-[70px] bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6 z-10 shrink-0">
          <div className="flex items-center gap-4">
            {/* Mobile Toggle */}
            <button 
              className="p-2 rounded-md lg:hidden text-gray-600 hover:bg-gray-100"
              onClick={() => setIsMobileOpen(true)}
            >
              <Menu size={24} />
            </button>
            {/* Desktop Toggle */}
            <button 
              className="p-2 rounded-md hidden lg:block text-gray-600 hover:bg-gray-100"
              onClick={() => setIsDesktopOpen(!isDesktopOpen)}
            >
              <Menu size={24} />
            </button>
            <div className="flex items-center gap-2">
                <span className="text-primary">
                   {(activePage === 'add-product' || activePage === 'edit-product' || activePage === 'view-product' || activePage === 'add-category' || activePage === 'wastage') ? <Package size={20} /> : (activePage === 'add-order' || activePage === 'edit-order') ? <ShoppingCart size={20} /> : activePage === 'view-order' ? <ShoppingCart size={20} /> : activePage === 'edit-customer' ? <Users size={20} /> : activePage === 'view-supplier' || activePage === 'categories' ? <Package size={20} /> : activePage === 'add-user' || activePage === 'edit-user' ? <Settings size={20} /> : navItems.find(item => item.id === activePage)?.icon}
                </span>
                <h1 className="text-lg sm:text-xl font-bold text-gray-800">
                 {activePage === 'add-product' ? 'إضافة منتج جديد' : 
                  activePage === 'edit-product' ? 'تعديل المنتج' :
                  activePage === 'edit-customer' ? 'تعديل بيانات العميل' :
                  activePage === 'view-product' ? 'معاينة المنتج' :
                  activePage === 'add-order' ? 'إضافة طلب جديد' :
                  activePage === 'edit-order' ? 'تعديل الطلب' :
                  activePage === 'view-order' ? 'معاينة الطلب' :
                  activePage === 'add-shipping-company' ? 'إضافة شركة شحن' :
                  activePage === 'edit-shipping-company' ? 'تعديل شركة الشحن' :
                  activePage === 'add-supplier' ? 'إضافة مورد جديد' :
                  activePage === 'edit-supplier' ? 'تعديل المورد' :
                  activePage === 'view-supplier' ? 'معاينة المورد' :
                   activePage === 'add-expense' ? 'إضافة مصروف جديد' :
                   activePage === 'edit-expense' ? 'تعديل المصروف' :
                   activePage === 'add-category' ? 'إضافة فئة جديدة' :
                   activePage === 'categories' ? 'ادارة الفئات' :
                   activePage === 'add-user' ? 'مستخدم جديد' :
                   activePage === 'edit-user' ? 'تعديل مستخدم' :
                   activePage === 'wastage' ? 'إدارة الهالك والتالف' :
                   (navItems.find(item => item.id === activePage)?.label || 'لوحة التحكم')}
                </h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center">
              <AnimatePresence mode="wait">
                {currentNotification ? (
                  <NotificationBadge notification={currentNotification} />
                ) : (
                  <motion.div
                    key="search"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="relative w-64"
                  >
                    <input
                      type="text"
                      placeholder="بحث عن طلب..."
                      className="w-full py-2 px-10 bg-gray-100 border-none rounded-full focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all outline-none text-sm text-right"
                    />
                    <span className="absolute right-3 text-gray-400 top-1/2 -translate-y-1/2">
                      <Search size={16} />
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            {/* Cloud Sync Status Badge */}
            <div className="flex items-center">
              {syncStatus === 'synced' && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full text-xs font-semibold shadow-xs select-none">
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-duration-1000"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <Cloud size={14} className="shrink-0" />
                  <span className="hidden sm:inline">متصل وسحابي تلقائي</span>
                </div>
              )}
              {syncStatus === 'syncing' && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 border border-blue-100 rounded-full text-xs font-semibold shadow-xs select-none">
                  <RefreshCw size={14} className="animate-spin shrink-0" />
                  <span className="hidden sm:inline">جاري الحفظ سحابياً...</span>
                </div>
              )}
              {syncStatus === 'error' && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-600 border border-rose-100 rounded-full text-xs font-semibold shadow-xs select-none">
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75 animate-duration-1000"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                  </span>
                  <CloudOff size={14} className="shrink-0" />
                  <span className="hidden sm:inline">فشل الاتصال - سيتم المحاولة</span>
                </div>
              )}
            </div>

            <button className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors relative">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-gray-100"></span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto p-4 sm:p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activePage}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="w-full min-h-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};
