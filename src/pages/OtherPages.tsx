import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ArrowRight, Plus, Search, Filter, BarChart2, Truck, Users, ShoppingBag, ReceiptText, Settings, Edit, Edit3, Trash2, Eye, Download, Upload, X, Building2, MapPin, DollarSign, CheckSquare, Square, Trash, StickyNote, Save, Package, UserPlus, BadgeCheck, Star, Crown, AlertTriangle, ShieldAlert, Ban, FileDown, User, Phone as PhoneIcon, Mail, FileText, DownloadCloud, Lock, Shield, Store, Phone, ChevronDown } from 'lucide-react';
import FloatingInput from '../components/FloatingInput';
import FloatingSelect from '../components/FloatingSelect';
import FloatingTextarea from '../components/FloatingTextarea';
import { AnimatePresence, motion } from 'motion/react';
import { useApp } from '../context/AppContext';
import { exportToExcel, importFromExcel, downloadTemplate, formatGovernoratesCell, parseGovernoratesCell } from '../utils/excel';
import { FormattedDate, normDigits } from '../components/FormattedDate';
import { syncShippingToSystem, syncCustomerToSystem, syncSupplierToSystem, getFromStorage, saveToStorage } from '../utils/sync';
import { supabase } from '../utils/supabase';

interface GovernoratePricing {
  name: string;
  originalPrice: number;
  customerPrice: number;
}

interface ShippingCompany {
  id: string;
  name: string;
  governorates: GovernoratePricing[];
  createdAt: string;
}

const EGYPT_GOVS = [
  'القاهرة', 'الإسكندرية', 'الجيزة', 'الشرقية', 'الدقهلية',
  'البحيرة', 'المنيا', 'القليوبية', 'سوهاج', 'كفر الشيخ',
  'أسوان', 'أسيوط', 'الغربية', 'المنوفية', 'الأقصر',
  'بني سويف', 'قنا', 'الفيوم', 'دمياط', 'الإسماعيلية',
  'بورسعيد', 'السويس', 'مرسى مطروح', 'شمال سيناء', 'جنوب سيناء',
  'الوادي الجديد', 'البحر الأحمر',
];

const PageTemplate: React.FC<{title: string; subtitle: string; icon: React.ReactNode}> = ({ title, subtitle, icon }) => {
  const [showStats, setShowStats] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  return (
    <div className="flex flex-col h-full">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-3 shrink-0 bg-white p-3 rounded-xl shadow-sm border border-gray-100 mb-4">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button 
            onClick={() => setShowStats(!showStats)}
            className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm font-medium transition-colors ${showStats ? 'bg-primary-light border-primary-light text-primary' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
          >
            <BarChart2 size={16} />
            <span>الإحصائيات</span>
          </button>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm font-medium transition-colors ${showFilters ? 'bg-primary-light border-primary-light text-primary' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
          >
            <Filter size={16} />
            <span>تصفية</span>
          </button>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400">
              <Search size={16} />
            </span>
            <input 
              type="text" 
              placeholder={`ابحث في ${title}...`} 
              className="w-full py-2 pr-10 pl-4 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none text-sm"
            />
          </div>
          <button className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white font-medium rounded-lg hover:bg-primary-hover transition-colors shadow-sm w-full sm:w-auto">
            <Plus size={20} />
            <span>إضافة جديد</span>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showStats && (
          <motion.div
            initial={{ height: 0, opacity: 0, marginBottom: 0 }}
            animate={{ height: 'auto', opacity: 1, marginBottom: 16 }}
            exit={{ height: 0, opacity: 0, marginBottom: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden shrink-0"
          >
            <div className="p-1 pb-2">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                <p className="text-gray-500 font-medium">إجمالي السجلات</p>
                <h3 className="text-2xl font-bold text-gray-800">120</h3>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                <p className="text-gray-500 font-medium">إجراءات معلقة</p>
                <h3 className="text-2xl font-bold text-yellow-600">3</h3>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                <p className="text-gray-500 font-medium">تم الإنجاز اليوم</p>
                <h3 className="text-2xl font-bold text-green-600">15</h3>
              </div>
            </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0, marginBottom: 0 }}
            animate={{ height: 'auto', opacity: 1, marginBottom: 16 }}
            exit={{ height: 0, opacity: 0, marginBottom: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden shrink-0"
          >
            <div className="p-1 pb-2">
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs text-gray-500 mb-1">الترتيب</label>
                <select className="w-full p-2 border border-gray-200 rounded-lg bg-gray-50 text-sm outline-none focus:border-primary">
                  <option>الأحدث أولاً</option>
                  <option>الأقدم أولاً</option>
                </select>
              </div>
            </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 flex flex-col items-center justify-center text-center">
        <div className="text-gray-300 mb-4 opacity-50 space-x-reverse space-x-2">
          {icon}
        </div>
        <h3 className="text-lg font-bold text-gray-700 mb-2">محتوى {title}</h3>
        <p className="text-gray-400 max-w-md">{subtitle}. قم بإدارة وتتبع كافة العمليات المتعلقة بهذه الصفحة من هنا. سيتم عرض البيانات قريباً.</p>
      </div>
    </div>
  );
};

const STORAGE_KEY = 'my_shipping_companies';

const defaultCompanies: ShippingCompany[] = [
  {
    id: 'CMP-001', name: 'ارامكس',
    governorates: EGYPT_GOVS.slice(0, 5).map(g => ({ name: g, originalPrice: 35, customerPrice: 55 })),
    createdAt: '2025-01-15',
  },
  {
    id: 'CMP-002', name: 'فيديكس',
    governorates: EGYPT_GOVS.slice(0, 8).map(g => ({ name: g, originalPrice: 45, customerPrice: 70 })),
    createdAt: '2025-02-01',
  },
];

interface ShippingPageProps {
  setActivePage?: (page: any) => void;
}

const parseDate = (dateStr: string): Date | null => {
  if (!dateStr) return null;
  const cleaned = normDigits(dateStr);
  const parts = cleaned.split('/');
  if (parts.length === 3) {
    const d = parseInt(parts[0]), m = parseInt(parts[1]) - 1, y = parseInt(parts[2]);
    if (!isNaN(d) && !isNaN(m) && !isNaN(y)) return new Date(y, m, d);
  }
  const date = new Date(cleaned);
  if (!isNaN(date.getTime())) return date;
  return null;
};

const formatDateTime = (dateStr: string): string => {
  if (!dateStr) return '—';
  const cleaned = dateStr.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString());
  const parsed = parseDate(cleaned);
  
  if (!parsed || isNaN(parsed.getTime())) {
    const d = new Date(cleaned);
    if (!isNaN(d.getTime())) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hours = d.getHours();
      const ampm = hours >= 12 ? 'م' : 'ص';
      const hours12 = hours % 12 || 12;
      const min = String(d.getMinutes()).padStart(2, '0');
      return `${y}-${m}-${day} ${String(hours12).padStart(2, '0')}:${min} ${ampm}`;
    }
    return normDigits(dateStr);
  }

  const y = parsed.getFullYear();
  const m = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');

  if (cleaned.includes('T') || cleaned.includes(':') || cleaned.includes(' ')) {
    const d = new Date(cleaned);
    if (!isNaN(d.getTime())) {
      const hours = d.getHours();
      const ampm = hours >= 12 ? 'م' : 'ص';
      const hours12 = hours % 12 || 12;
      const min = String(d.getMinutes()).padStart(2, '0');
      return `${y}-${m}-${day} ${String(hours12).padStart(2, '0')}:${min} ${ampm}`;
    }
  }

  return `${y}-${m}-${day}`;
};


const DATE_PRESETS = [
  { id: 'today', label: 'اليوم' },
  { id: 'week', label: 'هذا الأسبوع' },
  { id: 'month', label: 'هذا الشهر' },
  { id: 'year', label: 'هذا العام' },
  { id: 'all', label: 'كل الفترات' },
] as const;

const getPresetRange = (preset: string): { from: string; to: string } | null => {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth(), d = now.getDate();
  switch (preset) {
    case 'today': return { from: new Date(y, m, d).toISOString().split('T')[0], to: new Date(y, m, d).toISOString().split('T')[0] };
    case 'week': {
      const monday = new Date(y, m, d - ((now.getDay() + 6) % 7));
      const sunday = new Date(y, m, monday.getDate() + 6);
      return { from: monday.toISOString().split('T')[0], to: sunday.toISOString().split('T')[0] };
    }
    case 'month': return { from: new Date(y, m, 1).toISOString().split('T')[0], to: new Date(y, m + 1, 0).toISOString().split('T')[0] };
    case 'year': return { from: new Date(y, 0, 1).toISOString().split('T')[0], to: new Date(y, 11, 31).toISOString().split('T')[0] };
    default: return null;
  }
};

export const Shipping: React.FC<ShippingPageProps> = ({ setActivePage }) => {
  const { confirm, notify } = useApp();
  const [showStats, setShowStats] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const fileRef = useRef<HTMLInputElement>(null);

  const [companies, setCompanies] = useState<ShippingCompany[]>(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultCompanies));
    return defaultCompanies;
  });

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return companies;
    return companies.filter(c => c.name.toLowerCase().includes(q) || c.id.toLowerCase().includes(q));
  }, [companies, searchQuery]);

  const saveList = (list: ShippingCompany[]) => {
    setCompanies(list);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  };

  const openAdd = () => setActivePage?.('add-shipping-company');

  const openEdit = (c: ShippingCompany) => {
    localStorage.setItem('edit_shipping', JSON.stringify(c));
    setActivePage?.('edit-shipping-company');
  };

  const handleDelete = (id: string) => {
    confirm({
      title: 'حذف شركة الشحن',
      message: 'هل أنت متأكد من حذف هذه الشركة؟',
      onConfirm: () => {
        saveList(companies.filter(c => c.id !== id));
        notify('success', 'تم حذف الشركة بنجاح');
      },
    });
  };

  const handleExport = () => {
    if (!companies.length) { notify('info', 'لا توجد شركات للتصدير'); return; }
    const data = companies.map(c => ({
      'رقم الشركة': c.id,
      'الاسم': c.name,
      'المحافظات': formatGovernoratesCell(c.governorates || []),
      'تاريخ الإضافة': c.createdAt || '',
    }));
    exportToExcel(data, [
      { key: 'رقم الشركة', header: 'رقم الشركة', width: 15 },
      { key: 'الاسم', header: 'الاسم', width: 20 },
      { key: 'المحافظات', header: 'المحافظات (اسم|سعر_التكلفة|سعر_العميل)', width: 50 },
      { key: 'تاريخ الإضافة', header: 'تاريخ الإضافة', width: 20 },
    ], 'shipping-companies');
    notify('success', `تم تصدير ${companies.length} شركة بنجاح`);
  };

  const handleDownloadTemplate = () => {
    downloadTemplate([
      { key: 'id', header: 'رقم الشركة', width: 15 },
      { key: 'name', header: 'الاسم', width: 20 },
      { key: 'governorates', header: 'المحافظات (اسم|سعر_التكلفة|سعر_العميل)', width: 50 },
    ], 'shipping-companies-template');
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = await importFromExcel(file);
    if (!result.success) {
      notify('error', result.errors[0]?.message || 'خطأ في قراءة الملف');
      e.target.value = '';
      return;
    }
    if (!result.data.length) {
      notify('error', 'الملف فارغ');
      e.target.value = '';
      return;
    }

    let totalCreated = 0, totalUpdated = 0, totalErrors = 0;
    const allDetails: string[] = [];

    for (const row of result.data) {
      const r = row as Record<string, any>;
      const company = {
        id: String(r['رقم الشركة'] || r['id'] || `CMP-${Date.now()}`),
        name: String(r['الاسم'] || r['name'] || ''),
        governorates: parseGovernoratesCell(r['المحافظات'] || r['governorates'] || ''),
        createdAt: String(r['تاريخ الإضافة'] || r['createdAt'] || new Date().toLocaleDateString('ar-EG-u-nu-latn')),
      };

      if (!company.name) {
        totalErrors++;
        continue;
      }

      const syncResult = syncShippingToSystem(company);
      totalCreated += syncResult.created;
      totalUpdated += syncResult.updated;
      allDetails.push(...syncResult.details);
    }

    setCompanies(getFromStorage('my_shipping_companies'));

    let msg = `تم استيراد ${result.data.length} شركة`;
    if (totalCreated > 0) msg += ` | إنشاء: ${totalCreated}`;
    if (totalUpdated > 0) msg += ` | تحديث: ${totalUpdated}`;
    if (totalErrors > 0) msg += ` | أخطاء: ${totalErrors}`;
    notify(totalErrors > 0 ? 'error' : 'success', msg);
    e.target.value = '';
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(c => c.id)));
    }
  };

  const deleteSelected = () => {
    if (!selectedIds.size) return;
    const count = selectedIds.size;
    confirm({
      title: 'حذف المحدد',
      message: `هل أنت متأكد من حذف ${count} شركة؟`,
      onConfirm: () => {
        const updated = companies.filter(c => !selectedIds.has(c.id));
        saveList(updated);
        setSelectedIds(new Set());
        notify('success', `تم حذف ${count} شركة بنجاح`);
      }
    });
  };

  return (
    <div className="flex flex-col">
      <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} />

      <div className="flex flex-col sm:flex-row justify-between items-center gap-3 shrink-0 bg-white p-3 rounded-xl shadow-sm border border-gray-100 mb-4">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setShowStats(!showStats)}
            className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm font-medium transition-colors ${showStats ? 'bg-primary-light border-primary-light text-primary' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
          >
            <BarChart2 size={16} />
            <span>الإحصائيات</span>
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm font-medium transition-colors ${showFilters ? 'bg-primary-light border-primary-light text-primary' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
          >
            <Filter size={16} />
            <span>تصفية</span>
          </button>
          <button onClick={handleExport} className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            <Download size={16} className="text-[#00c950]" />
            <span>تصدير</span>
          </button>
          <button onClick={handleDownloadTemplate} className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            <FileDown size={16} />
            <span>نموذج</span>
          </button>
          <button onClick={() => fileRef.current?.click()} className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            <Upload size={16} />
            <span>استيراد</span>
          </button>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400">
              <Search size={16} />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="ابحث عن شركة..."
              className="w-full py-2 pr-10 pl-4 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none text-sm"
            />
          </div>
          <button onClick={openAdd} className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white font-medium rounded-lg hover:bg-primary-hover transition-colors shadow-sm w-full sm:w-auto">
            <Plus size={20} />
            <span>إضافة شركة</span>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showStats && (
          <motion.div
            initial={{ height: 0, opacity: 0, marginBottom: 0 }}
            animate={{ height: 'auto', opacity: 1, marginBottom: 16 }}
            exit={{ height: 0, opacity: 0, marginBottom: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden shrink-0"
          >
            <div className="p-1 pb-2">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                  <p className="text-gray-500 font-medium">إجمالي الشركات</p>
                  <h3 className="text-2xl font-bold text-gray-800">{companies.length}</h3>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                  <p className="text-gray-500 font-medium">إجمالي المحافظات</p>
                  <h3 className="text-2xl font-bold text-primary">{companies.reduce((s, c) => s + c.governorates.length, 0)}</h3>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                  <p className="text-gray-500 font-medium">متوسط المحافظات لكل شركة</p>
                  <h3 className="text-2xl font-bold text-gray-800">{companies.length ? Math.round(companies.reduce((s, c) => s + c.governorates.length, 0) / companies.length) : 0}</h3>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0, marginBottom: 0 }}
            animate={{ height: 'auto', opacity: 1, marginBottom: 16 }}
            exit={{ height: 0, opacity: 0, marginBottom: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden shrink-0"
          >
            <div className="p-1 pb-2">
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-xs text-gray-500 mb-1">المحافظة</label>
                  <select className="w-full p-2 border border-gray-200 rounded-lg bg-gray-50 text-sm outline-none focus:border-primary">
                    <option>الكل</option>
                    {EGYPT_GOVS.map(g => <option key={g}>{g}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0, marginBottom: 0 }}
            animate={{ height: 'auto', opacity: 1, marginBottom: 12 }}
            exit={{ height: 0, opacity: 0, marginBottom: 0 }}
            transition={{ duration: 0.18, ease: 'easeInOut' }}
            className="overflow-hidden shrink-0"
          >
            <div className="flex items-center justify-between bg-primary/5 border border-primary/20 rounded-xl px-4 py-2.5">
              <span className="text-sm font-medium text-primary">{selectedIds.size} شركة محددة</span>
              <div className="flex items-center gap-2">
                <button onClick={deleteSelected} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-xs font-medium rounded-lg hover:bg-primary-hover transition-colors">
                  <Trash size={14} /> حذف المحدد
                </button>
                <button onClick={() => setSelectedIds(new Set())} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-200 transition-colors">
                  <X size={14} /> إلغاء التحديد
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-center border-collapse">
            <thead className="sticky top-0 bg-gray-50 z-10">
              <tr className="text-gray-500 text-sm border-b border-gray-100">
                <th className="px-3 py-2.5 w-10">
                  {filtered.length > 0 && (
                    <button onClick={toggleSelectAll} className="text-gray-400 hover:text-primary transition-colors">
                      {filtered.every(c => selectedIds.has(c.id)) ? <CheckSquare size={16} /> : <Square size={16} />}
                    </button>
                  )}
                </th>
                <th className="px-6 py-2.5 font-medium">الرمز</th>
                <th className="px-6 py-2.5 font-medium">اسم الشركة</th>
                <th className="px-6 py-2.5 font-medium">المحافظات المدعومة</th>
                <th className="px-6 py-2.5 font-medium">تاريخ الإضافة</th>
                <th className="px-6 py-2.5 font-medium text-center">الإجراءات</th>
              </tr>
            </thead>
            {filtered.length === 0 ? (
              <tbody>
                <tr>
                  <td colSpan={6} className="py-16 text-center text-gray-400">
                    <Building2 size={48} className="mx-auto mb-3 opacity-50" />
                    <p className="text-lg font-medium">{companies.length === 0 ? 'لا توجد شركات شحن بعد' : 'لا توجد نتائج للبحث'}</p>
                    {companies.length === 0 && <button onClick={openAdd} className="mt-3 px-4 py-2 bg-primary text-white rounded-lg text-sm">إضافة شركة</button>}
                  </td>
                </tr>
              </tbody>
            ) : (
              <tbody className="text-sm divide-y divide-gray-100">
                {filtered.map((company) => (
                  <tr key={company.id} className={`hover:bg-gray-50 transition-colors group ${selectedIds.has(company.id) ? 'bg-primary/5' : ''}`}>
                    <td className="px-3 py-2.5">
                      <button onClick={() => toggleSelect(company.id)} className={`transition-colors ${selectedIds.has(company.id) ? 'text-primary' : 'text-gray-300 hover:text-gray-400'}`}>
                        {selectedIds.has(company.id) ? <CheckSquare size={16} /> : <Square size={16} />}
                      </button>
                    </td>
                    <td className="px-6 py-2.5 font-bold text-primary">{company.id}</td>
                    <td className="px-6 py-2.5 font-medium text-gray-800">{company.name}</td>
                    <td className="px-6 py-2.5">
                      <div className="flex flex-wrap gap-1 justify-center">
                        {company.governorates.slice(0, 4).map(g => (
                          <span key={g.name} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-md text-xs">{g.name}</span>
                        ))}
                        {company.governorates.length > 4 && <span className="px-2 py-0.5 bg-primary-light text-primary rounded-md text-xs">+{company.governorates.length - 4}</span>}
                      </div>
                    </td>
                    <td className="px-6 py-2.5 text-xs"><FormattedDate dateStr={company.createdAt} /></td>
                    <td className="px-6 py-2.5">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => openEdit(company)} className="p-1.5 text-primary bg-primary-light hover:bg-primary hover:text-white rounded-md transition-colors" title="تعديل">
                          <Edit size={16} />
                        </button>
                        <button onClick={() => handleDelete(company.id)} className="p-1.5 text-primary bg-primary-light hover:bg-primary hover:text-white rounded-md transition-colors" title="حذف">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            )}
          </table>
        </div>

        <div className="p-4 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500 shrink-0">
          <div>إجمالي {filtered.length} {companies.length !== filtered.length ? `(من ${companies.length}) ` : ''}شركة</div>
        </div>
      </div>
    </div>
  );
};

const MANUAL_BADGES = ['vip', 'suspicious', 'banned'];

const BADGE_CONFIG: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  new: { icon: <UserPlus size={14} />, label: 'جديد', color: 'bg-blue-100 text-blue-700' },
  trusted: { icon: <BadgeCheck size={14} />, label: 'موثوق', color: 'bg-green-100 text-green-700' },
  excellent: { icon: <Star size={14} />, label: 'ممتاز', color: 'bg-emerald-100 text-emerald-700' },
  vip: { icon: <Crown size={14} />, label: 'VIP', color: 'bg-amber-100 text-amber-700' },
  troubled: { icon: <AlertTriangle size={14} />, label: 'متعثر', color: 'bg-orange-100 text-orange-700' },
  suspicious: { icon: <ShieldAlert size={14} />, label: 'مشبوه', color: 'bg-red-100 text-red-700' },
  banned: { icon: <Ban size={14} />, label: 'محظور', color: 'bg-gray-800 text-white' },
};

const autoBadge = (c: any): string => {
  if (MANUAL_BADGES.includes(c.badge)) return c.badge;
  const cancelled = c.cancelledOrders || 0;
  const ordersCount = c.ordersCount || 0;
  if (cancelled > 0) return 'troubled';
  if (ordersCount >= 10) return 'excellent';
  if (ordersCount >= 3) return 'trusted';
  return 'new';
};

export const Customers: React.FC<{ setActivePage?: (page: any) => void }> = ({ setActivePage }) => {
  const { notify, confirm } = useApp();
  const [showStats, setShowStats] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('الكل');
  const [badgeFilter, setBadgeFilter] = useState('');
  const [datePreset, setDatePreset] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const custImportRef = useRef<HTMLInputElement>(null);

  const [customers, setCustomers] = useState<any[]>(() => {
    const raw = localStorage.getItem('my_customers');
    return raw ? JSON.parse(raw) : [];
  });
  const orders: any[] = JSON.parse(localStorage.getItem('my_orders') || '[]');

  const refresh = () => setCustomers(JSON.parse(localStorage.getItem('my_customers') || '[]'));

  const syncFromOrders = () => {
    const raw = localStorage.getItem('my_customers');
    const customers = raw ? JSON.parse(raw) : [];
    const updated = customers.map((c: any) => {
      const customerOrders = orders.filter((o: any) => o.phone === c.phone || o.customer === c.name);
      const cancelledCount = customerOrders.filter((o: any) => o.status === 'ملغي').length;
      const totalSpent = customerOrders.reduce((s: number, o: any) => s + (o.afterDiscount || 0), 0);
      const lastOrder = customerOrders.sort((a: any, b: any) => new Date(b.date || '').getTime() - new Date(a.date || '').getTime())[0];
      const withCounts = { ...c, ordersCount: customerOrders.length, totalSpent, cancelledOrders: cancelledCount, lastOrderDate: lastOrder?.date || c.lastOrderDate };
      return { ...withCounts, badge: autoBadge(withCounts) };
    });
    localStorage.setItem('my_customers', JSON.stringify(updated));
    setCustomers(updated);
    notify('success', 'تمت مزامنة بيانات العملاء مع الطلبات');
  };

  const handleExportCustomers = () => {
    if (!customers.length) { notify('info', 'لا يوجد عملاء للتصدير'); return; }
    const data = customers.map(c => ({
      'رقم العميل': c.id,
      'الاسم': c.name,
      'الهاتف': c.phone,
      'الهاتف 2': c.phone2 || '',
      'المحافظة': c.governorate || '',
      'المركز': c.district || '',
      'العنوان': c.address || '',
      'المعلم': c.landmark || '',
      'إجمالي المشتريات': c.totalSpent || 0,
      'عدد الطلبات': c.ordersCount || 0,
      'الطلبات الملغاة': c.cancelledOrders || 0,
      'الحالة': c.status,
      'الشارة': c.badge || autoBadge(c),
      'ملاحظات': c.notes || '',
      'تاريخ التسجيل': c.createdAt || '',
      'آخر طلب': c.lastOrderDate || '',
    }));
    exportToExcel(data, [
      { key: 'رقم العميل', header: 'رقم العميل', width: 15 },
      { key: 'الاسم', header: 'الاسم', width: 20 },
      { key: 'الهاتف', header: 'الهاتف', width: 15 },
      { key: 'الهاتف 2', header: 'الهاتف 2', width: 15 },
      { key: 'المحافظة', header: 'المحافظة', width: 15 },
      { key: 'المركز', header: 'المركز', width: 15 },
      { key: 'العنوان', header: 'العنوان', width: 25 },
      { key: 'المعلم', header: 'المعلم', width: 20 },
      { key: 'إجمالي المشتريات', header: 'إجمالي المشتريات', width: 15 },
      { key: 'عدد الطلبات', header: 'عدد الطلبات', width: 12 },
      { key: 'الطلبات الملغاة', header: 'الطلبات الملغاة', width: 15 },
      { key: 'الحالة', header: 'الحالة', width: 12 },
      { key: 'الشارة', header: 'الشارة', width: 12 },
      { key: 'ملاحظات', header: 'ملاحظات', width: 25 },
      { key: 'تاريخ التسجيل', header: 'تاريخ التسجيل', width: 20 },
      { key: 'آخر طلب', header: 'آخر طلب', width: 20 },
    ], 'customers');
    notify('success', `تم تصدير ${customers.length} عميل بنجاح`);
  };

  const handleDownloadCustomerTemplate = () => {
    downloadTemplate([
      { key: 'name', header: 'الاسم', width: 20 },
      { key: 'phone', header: 'الهاتف', width: 15 },
      { key: 'governorate', header: 'المحافظة', width: 15 },
      { key: 'address', header: 'العنوان', width: 25 },
    ], 'customers-template');
  };

  const handleImportCustomers = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = await importFromExcel(file);
    if (!result.success) {
      notify('error', result.errors[0]?.message || 'خطأ في قراءة الملف');
      e.target.value = '';
      return;
    }
    if (!result.data.length) {
      notify('error', 'الملف فارغ');
      e.target.value = '';
      return;
    }

    let totalCreated = 0, totalUpdated = 0, totalErrors = 0;

    for (const row of result.data) {
      const r = row as Record<string, any>;
      const customer = {
        id: String(r['رقم العميل'] || r['id'] || `CUS-${Date.now()}`),
        name: String(r['الاسم'] || r['name'] || ''),
        phone: String(r['الهاتف'] || r['phone'] || ''),
        phone2: String(r['الهاتف 2'] || r['phone2'] || ''),
        governorate: String(r['المحافظة'] || r['governorate'] || ''),
        district: String(r['المركز'] || r['district'] || ''),
        address: String(r['العنوان'] || r['address'] || ''),
        landmark: String(r['المعلم'] || r['landmark'] || ''),
        totalSpent: Number(r['إجمالي المشتريات'] || r['totalSpent'] || 0),
        ordersCount: Number(r['عدد الطلبات'] || r['ordersCount'] || 0),
        cancelledOrders: Number(r['الطلبات الملغاة'] || r['cancelledOrders'] || 0),
        status: String(r['الحالة'] || r['status'] || 'جديد'),
        badge: String(r['الشارة'] || r['badge'] || 'new'),
        notes: String(r['ملاحظات'] || r['notes'] || ''),
        createdAt: String(r['تاريخ التسجيل'] || r['createdAt'] || new Date().toLocaleDateString('ar-EG-u-nu-latn')),
        lastOrderDate: String(r['آخر طلب'] || r['lastOrderDate'] || ''),
      };

      if (!customer.name || !customer.phone) {
        totalErrors++;
        continue;
      }

      const syncResult = syncCustomerToSystem(customer);
      totalCreated += syncResult.created;
      totalUpdated += syncResult.updated;
    }

    setCustomers(getFromStorage('my_customers'));

    let msg = `تم استيراد ${result.data.length} عميل`;
    if (totalCreated > 0) msg += ` | إنشاء: ${totalCreated}`;
    if (totalUpdated > 0) msg += ` | تحديث: ${totalUpdated}`;
    if (totalErrors > 0) msg += ` | أخطاء: ${totalErrors}`;
    notify(totalErrors > 0 ? 'error' : 'success', msg);
    e.target.value = '';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'نشط': return 'bg-green-100 text-green-700';
      case 'جديد': return 'bg-blue-100 text-blue-700';
      case 'غير نشط': return 'bg-gray-100 text-gray-500';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const filtered = useMemo(() => {
    const effectiveFrom = datePreset !== 'custom' && datePreset !== 'all' ? getPresetRange(datePreset)?.from || dateFrom : dateFrom;
    const effectiveTo = datePreset !== 'custom' && datePreset !== 'all' ? getPresetRange(datePreset)?.to || dateTo : dateTo;
    const fromDate = effectiveFrom ? new Date(effectiveFrom + 'T00:00:00') : null;
    const toDate = effectiveTo ? new Date(effectiveTo + 'T23:59:59') : null;
    const q = searchQuery.trim().toLowerCase();
    return customers.filter(c => {
      if (statusFilter !== 'الكل' && c.status !== statusFilter) return false;
      if (badgeFilter && (c.badge || autoBadge(c)) !== badgeFilter) return false;
      if (q && !c.name?.toLowerCase().includes(q) && !c.phone?.includes(q) && !c.id?.toLowerCase().includes(q)) return false;
      if (fromDate || toDate) {
        const d = parseDate(c.lastOrderDate);
        if (d) {
          if (fromDate && d < fromDate) return false;
          if (toDate && d > toDate) return false;
        }
      }
      return true;
    });
  }, [customers, searchQuery, statusFilter, badgeFilter, datePreset, dateFrom, dateTo]);

  const totalSpentAll = customers.reduce((s, c) => s + (c.totalSpent || 0), 0);
  const activeCount = customers.filter(c => c.status === 'نشط').length;
  const avgSpent = customers.length ? Math.round(totalSpentAll / customers.length) : 0;

  const customerOrders = selectedCustomer
    ? orders.filter((o: any) => o.phone === selectedCustomer.phone || o.customer === selectedCustomer.name)
    : [];

  if (selectedCustomer) {
    const c = selectedCustomer;
    return (
      <div className="flex flex-col pb-10">
        <div className="flex items-center justify-between gap-3 bg-white p-3 px-5 rounded-xl shadow-sm border border-gray-100 mb-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setSelectedCustomer(null)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors">
              <ArrowRight size={20} />
            </button>
            <h1 className="text-lg font-bold text-gray-800">ملف العميل</h1>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-4">
          <h2 className="text-sm font-bold text-gray-800 mb-3 pb-2 border-b">المعلومات الشخصية</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div><label className="text-xs text-gray-500">الاسم</label><p className="font-medium text-gray-800">{c.name}</p></div>
            <div><label className="text-xs text-gray-500">رقم الهاتف</label><p className="font-medium text-gray-800 text-right" dir="ltr">{c.phone || '—'}</p></div>
            {c.phone2 && <div><label className="text-xs text-gray-500">هاتف إضافي</label><p className="font-medium text-gray-800 text-right" dir="ltr">{c.phone2}</p></div>}
            {c.governorate && <div><label className="text-xs text-gray-500">المحافظة</label><p className="font-medium text-gray-800">{c.governorate}</p></div>}
            {c.district && <div><label className="text-xs text-gray-500">المركز / القسم</label><p className="font-medium text-gray-800">{c.district}</p></div>}
            {c.address && <div className="sm:col-span-2"><label className="text-xs text-gray-500">العنوان</label><p className="font-medium text-gray-800">{c.address}{c.landmark ? ` (${c.landmark})` : ''}</p></div>}
            <div><label className="text-xs text-gray-500">الحالة</label><p><span className={`px-2.5 py-0.5 rounded-full text-xs font-medium inline-block ${getStatusColor(c.status)}`}>{c.status}</span></p></div>
            <div><label className="text-xs text-gray-500">التصنيف</label><p><span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${(BADGE_CONFIG[c.badge] || BADGE_CONFIG.new).color}`}>{(BADGE_CONFIG[c.badge] || BADGE_CONFIG.new).icon} {(BADGE_CONFIG[c.badge] || BADGE_CONFIG.new).label}</span></p></div>
            <div><label className="text-xs text-gray-500">تاريخ التسجيل</label><p className="font-medium text-gray-800">{formatDateTime(c.createdAt || '—')}</p></div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-4">
          <h2 className="text-sm font-bold text-gray-800 mb-3 pb-2 border-b">ملاحظات المسؤول</h2>
          <div className="relative">
            <span className="absolute top-2.5 right-2.5 text-gray-400"><StickyNote size={14} /></span>
            <textarea
              rows={2}
              value={c.notes || ''}
              onChange={e => {
                const list = JSON.parse(localStorage.getItem('my_customers') || '[]');
                const idx = list.findIndex((x: any) => x.id === c.id);
                if (idx > -1) {
                  list[idx].notes = e.target.value;
                  localStorage.setItem('my_customers', JSON.stringify(list));
                  setSelectedCustomer({ ...c, notes: e.target.value });
                  setCustomers(list);
                }
              }}
              className="w-full py-2 pr-9 pl-3 border border-gray-200 rounded-lg outline-none focus:border-primary transition-all resize-none text-sm"
              placeholder="ملاحظات داخلية (تظهر للمسؤول فقط)..."
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
            <p className="text-gray-500 font-medium text-sm">إجمالي الطلبات</p>
            <h3 className="text-2xl font-bold text-gray-800">{(c.ordersCount || 0).toLocaleString('en-US')}</h3>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
            <p className="text-gray-500 font-medium text-sm">إجمالي الإنفاق</p>
            <h3 className="text-2xl font-bold text-primary">{(c.totalSpent || 0).toLocaleString('en-US')} ج.م</h3>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
            <p className="text-gray-500 font-medium text-sm">آخر طلب</p>
            <h3 className="text-sm font-bold text-gray-800"><FormattedDate dateStr={c.lastOrderDate || '—'} className="!text-gray-800" /></h3>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-sm font-bold text-gray-800 p-4 pb-0">طلبات العميل</h2>
          {customerOrders.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">لا توجد طلبات لهذا العميل</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-center border-collapse text-sm">
                <thead className="bg-gray-50">
                  <tr className="text-gray-500 border-b">
                    <th className="px-4 py-2.5 font-medium">رقم الطلب</th>
                    <th className="px-4 py-2.5 font-medium">التاريخ</th>
                    <th className="px-4 py-2.5 font-medium">الإجمالي</th>
                    <th className="px-4 py-2.5 font-medium">المدفوع</th>
                    <th className="px-4 py-2.5 font-medium">المتبقي</th>
                    <th className="px-4 py-2.5 font-medium">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {customerOrders.map((o: any, idx: number) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 font-bold text-primary">{normDigits(o.id)}</td>
                      <td className="px-4 py-2.5"><FormattedDate dateStr={o.date} /></td>
                      <td className="px-4 py-2.5 font-bold text-gray-800">{normDigits(o.total)}</td>
                      <td className="px-4 py-2.5 text-green-600">{normDigits(String(o.prepaid || 0))} ج.م</td>
                      <td className="px-4 py-2.5 font-medium text-gray-800">{normDigits(String(o.remaining || 0))} ج.م</td>
                      <td className="px-4 py-2.5"><span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">{o.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-3 shrink-0 bg-white p-3 rounded-xl shadow-sm border border-gray-100 mb-4">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setShowStats(!showStats)}
            className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm font-medium transition-colors ${showStats ? 'bg-primary-light border-primary-light text-primary' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
          >
            <BarChart2 size={16} />
            <span>الإحصائيات</span>
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm font-medium transition-colors ${showFilters ? 'bg-primary-light border-primary-light text-primary' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
          >
            <Filter size={16} />
            <span>تصفية</span>
          </button>
          <button onClick={syncFromOrders} className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            <Download size={16} /> مزامنة
          </button>
          <button onClick={handleExportCustomers} className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            <Download size={16} className="text-[#00c950]" />
            <span>تصدير</span>
          </button>
          <button onClick={handleDownloadCustomerTemplate} className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            <FileDown size={16} />
            <span>نموذج</span>
          </button>
          <button onClick={() => custImportRef.current?.click()} className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            <Upload size={16} />
            <span>استيراد</span>
          </button>
          <input ref={custImportRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImportCustomers} />
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400">
              <Search size={16} />
            </span>
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="ابحث عن عميل..." className="w-full py-2 pr-10 pl-4 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none text-sm" />
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showStats && (
          <motion.div initial={{ height: 0, opacity: 0, marginBottom: 0 }} animate={{ height: 'auto', opacity: 1, marginBottom: 16 }} exit={{ height: 0, opacity: 0, marginBottom: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden shrink-0">
            <div className="p-1 pb-2">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                  <p className="text-gray-500 font-medium">إجمالي العملاء</p><h3 className="text-2xl font-bold text-gray-800">{customers.length}</h3>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                  <p className="text-gray-500 font-medium">عملاء نشطين</p><h3 className="text-2xl font-bold text-green-600">{activeCount}</h3>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                  <p className="text-gray-500 font-medium">إجمالي الإنفاق</p><h3 className="text-2xl font-bold text-primary">{totalSpentAll.toLocaleString('en-US')} ج.م</h3>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                  <p className="text-gray-500 font-medium">متوسط قيمة العميل</p><h3 className="text-2xl font-bold text-gray-800">{avgSpent.toLocaleString('en-US')} ج.م</h3>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showFilters && (
          <motion.div initial={{ height: 0, opacity: 0, marginBottom: 0 }} animate={{ height: 'auto', opacity: 1, marginBottom: 16 }} exit={{ height: 0, opacity: 0, marginBottom: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden shrink-0">
            <div className="p-1 pb-2">
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-xs text-gray-500 mb-1">الحالة</label>
                  <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full p-2 border border-gray-200 rounded-lg bg-gray-50 text-sm outline-none focus:border-primary">
                    <option>الكل</option>
                    <option>نشط</option>
                    <option>جديد</option>
                    <option>غير نشط</option>
                  </select>
                </div>
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-xs text-gray-500 mb-1">التصنيف</label>
                  <select value={badgeFilter} onChange={e => setBadgeFilter(e.target.value)} className="w-full p-2 border border-gray-200 rounded-lg bg-gray-50 text-sm outline-none focus:border-primary">
                    <option value="">الكل</option>
                    {Object.entries(BADGE_CONFIG).map(([key, cfg]) => (
                      <option key={key} value={key}>{cfg.label}</option>
                    ))}
                  </select>
                </div>
                <div className="w-full">
                  <label className="block text-xs text-gray-500 mb-1.5">آخر طلب</label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {DATE_PRESETS.map(p => (
                      <button key={p.id}
                        onClick={() => {
                          setDatePreset(p.id);
                          if (p.id === 'all') { setDateFrom(''); setDateTo(''); }
                        }}
                        className={`px-3 py-1 text-xs font-medium rounded-lg border transition-colors ${datePreset === p.id ? 'bg-primary border-primary text-white' : 'bg-white border-gray-200 text-gray-600 hover:border-primary hover:text-primary'}`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="date" value={dateFrom}
                      onChange={e => { setDateFrom(e.target.value); setDatePreset('custom'); }}
                      className="flex-1 p-2 border border-gray-200 rounded-lg bg-gray-50 text-sm outline-none focus:border-primary" />
                    <span className="text-xs text-gray-400">إلى</span>
                    <input type="date" value={dateTo}
                      onChange={e => { setDateTo(e.target.value); setDatePreset('custom'); }}
                      className="flex-1 p-2 border border-gray-200 rounded-lg bg-gray-50 text-sm outline-none focus:border-primary" />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selection bar */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0, marginBottom: 0 }}
            animate={{ height: 'auto', opacity: 1, marginBottom: 12 }}
            exit={{ height: 0, opacity: 0, marginBottom: 0 }}
            transition={{ duration: 0.18, ease: 'easeInOut' }}
            className="overflow-hidden shrink-0"
          >
            <div className="flex items-center justify-between bg-primary/5 border border-primary/20 rounded-xl px-4 py-2.5">
              <span className="text-sm font-medium text-primary">تم تحديد <strong>{selectedIds.size}</strong> عميل</span>
              <div className="flex items-center gap-2">
                <button onClick={() => {
                  confirm({ title: 'حذف العملاء المحددين', message: `هل أنت متأكد من حذف ${selectedIds.size} عميل؟`, onConfirm: () => {
                    const list = JSON.parse(localStorage.getItem('my_customers') || '[]');
                    const updated = list.filter((c: any) => !selectedIds.has(c.id));
                    localStorage.setItem('my_customers', JSON.stringify(updated));
                    setCustomers(updated);
                    setSelectedIds(new Set());
                    notify('success', `تم حذف ${selectedIds.size} عميل`);
                  }});
                }} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-xs font-medium rounded-lg hover:bg-primary-hover transition-colors">
                  <Trash size={14} /> حذف المحدد
                </button>
                <button onClick={() => setSelectedIds(new Set())} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-200 transition-colors">
                  <X size={14} /> إلغاء التحديد
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-center border-collapse">
            <thead className="sticky top-0 bg-gray-50 z-10">
              <tr className="text-gray-500 text-sm border-b border-gray-100">
                <th className="px-4 py-3 font-medium w-10">
                  <button onClick={() => {
                    if (selectedIds.size === filtered.length) setSelectedIds(new Set());
                    else setSelectedIds(new Set(filtered.map(c => c.id)));
                  }} className="p-1 text-gray-400 hover:text-primary transition-colors">
                    {selectedIds.size === filtered.length && filtered.length > 0 ? <CheckSquare size={16} /> : <Square size={16} />}
                  </button>
                </th>
                <th className="px-6 py-3 font-medium">الاسم</th>
                <th className="px-6 py-3 font-medium w-20">التصنيف</th>
                <th className="px-6 py-3 font-medium">رقم الهاتف</th>
                <th className="px-6 py-3 font-medium">الطلبات</th>
                <th className="px-6 py-3 font-medium">إجمالي الإنفاق</th>
                <th className="px-6 py-3 font-medium">آخر طلب</th>
                <th className="px-6 py-3 font-medium">الحالة</th>
                <th className="px-6 py-3 font-medium text-center">الإجراءات</th>
              </tr>
            </thead>
            {filtered.length === 0 ? (
              <tbody>
                <tr>
                  <td colSpan={9} className="py-16 text-center text-gray-400">
                    <Users size={48} className="mx-auto mb-3 opacity-50" />
                    <p className="text-lg font-medium">{customers.length === 0 ? 'لا يوجد عملاء بعد' : 'لا توجد نتائج للبحث'}</p>
                    {customers.length === 0 && <p className="text-sm mt-1 text-gray-400">يتم إضافة العملاء تلقائياً عند إنشاء طلب جديد.</p>}
                  </td>
                </tr>
              </tbody>
            ) : (
              <tbody className="text-sm divide-y divide-gray-100">
                {filtered.map((c, idx) => {
                  const badge = BADGE_CONFIG[c.badge] || BADGE_CONFIG[autoBadge(c)] || BADGE_CONFIG.new;
                  const isDanger = c.badge === 'suspicious' || c.badge === 'banned' || c.cancelledOrders > 0;
                  return (
                  <tr key={c.id || idx} className={`hover:bg-gray-50 transition-colors group cursor-pointer ${isDanger ? 'bg-red-50/30' : ''}`} onClick={() => setSelectedCustomer(c)}>
                    <td className="px-4 py-3">
                      <button onClick={e => { e.stopPropagation(); setSelectedIds(prev => { const next = new Set(prev); if (next.has(c.id)) next.delete(c.id); else next.add(c.id); return next; }); }} className="p-1 text-gray-400 hover:text-primary transition-colors">
                        {selectedIds.has(c.id) ? <CheckSquare size={16} /> : <Square size={16} />}
                      </button>
                    </td>
                    <td className="px-6 py-3 font-bold text-gray-800">{c.name}</td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap ${badge.color}`}>{badge.icon} {badge.label}</span>
                    </td>
                    <td className="px-6 py-3 text-gray-600" dir="ltr">{c.phone || '—'}</td>
                    <td className="px-6 py-3 font-medium text-gray-800">{(c.ordersCount || 0).toLocaleString('en-US')}</td>
                    <td className="px-6 py-3 font-bold text-primary">{(c.totalSpent || 0).toLocaleString('en-US')} ج.م</td>
                    <td className="px-6 py-3 text-xs"><FormattedDate dateStr={c.lastOrderDate || '—'} /></td>
                    <td className="px-6 py-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium inline-block ${getStatusColor(c.status)}`}>{c.status}</span>
                    </td>
                    <td className="px-6 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={(e) => { e.stopPropagation(); setSelectedCustomer(c); }} className="p-1.5 text-primary bg-primary-light hover:bg-primary hover:text-white rounded-md transition-colors" title="عرض الملف">
                        <Eye size={16} />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); localStorage.setItem('edit_customer', JSON.stringify(c)); setActivePage?.('edit-customer'); }} className="p-1.5 text-primary bg-primary-light hover:bg-primary hover:text-white rounded-md transition-colors" title="تعديل">
                        <Edit size={16} />
                      </button>
                    </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            )}
          </table>
        </div>

        <div className="p-4 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500 shrink-0">
          <div>إجمالي {filtered.length} {customers.length !== filtered.length ? `(من ${customers.length}) ` : ''}عميل</div>
        </div>
      </div>

    </div>
  );
};

export const EditCustomer: React.FC<{ setActivePage?: (page: any) => void }> = ({ setActivePage }) => {
  const c = JSON.parse(localStorage.getItem('edit_customer') || 'null');
  const { notify } = useApp();
  const [form, setForm] = useState<any>(c || {});
  const [orders] = useState<any[]>(JSON.parse(localStorage.getItem('my_orders') || '[]'));
  const [errors, setErrors] = useState<{ name?: string; phone?: string; phone2?: string }>({});

  if (!c) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <Users size={64} className="mb-4 opacity-50" />
        <p className="text-lg font-medium">لم يتم تحديد عميل</p>
        <button onClick={() => setActivePage?.('customers')} className="mt-4 px-4 py-2 bg-primary text-white rounded-lg text-sm">العودة للعملاء</button>
      </div>
    );
  }

  const customerOrders = orders.filter((o: any) => o.phone === c.phone || o.customer === c.name);

  const handleSave = () => {
    const newErrors: typeof errors = {};
    if (!form.name || !form.name.trim()) {
      newErrors.name = 'الاسم مطلوب';
    }
    const trimmedPhone = (form.phone || '').trim();
    if (!trimmedPhone) {
      newErrors.phone = 'رقم الهاتف مطلوب';
    } else if (!/^(010|011|012|015)\d{8}$/.test(trimmedPhone)) {
      newErrors.phone = 'رقم الهاتف غير صحيح';
    }
    const trimmedPhone2 = (form.phone2 || '').trim();
    if (trimmedPhone2 && !/^(010|011|012|015)\d{8}$/.test(trimmedPhone2)) {
      newErrors.phone2 = 'رقم الهاتف غير صحيح';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      notify('error', 'يرجى تصحيح الأخطاء في النموذج');
      return;
    }
    setErrors({});

    const list = JSON.parse(localStorage.getItem('my_customers') || '[]');
    const idx = list.findIndex((x: any) => x.id === c.id);
    if (idx > -1) {
      list[idx] = { ...list[idx], ...form };
      localStorage.setItem('my_customers', JSON.stringify(list));
      notify('success', 'تم تحديث بيانات العميل');
    }
  };

  const fields = [
    { key: 'name', label: 'الاسم' },
    { key: 'phone', label: 'رقم الهاتف' },
    { key: 'phone2', label: 'هاتف إضافي' },
    { key: 'governorate', label: 'المحافظة' },
    { key: 'district', label: 'المركز / القسم' },
    { key: 'address', label: 'العنوان' },
    { key: 'landmark', label: 'أقرب معلم' },
  ];

  return (
    <div className="flex flex-col pb-10">
      <div className="flex items-center justify-between gap-3 bg-white p-3 px-5 rounded-xl shadow-sm border border-gray-100 mb-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setActivePage?.('customers')} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors">
            <ArrowRight size={20} />
          </button>
          <h1 className="text-lg font-bold text-gray-800">تعديل بيانات العميل</h1>
        </div>
        <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-hover transition-colors">
          <Save size={16} /> حفظ التعديلات
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-sm font-bold text-gray-800 mb-4 pb-2 border-b">البيانات الشخصية</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FloatingInput label="الاسم" value={form.name || ''} onChange={e => { setForm({ ...form, name: e.target.value }); if(errors.name) setErrors({...errors, name: undefined}); }} icon={<User size={16} />} required error={errors.name} />
            <FloatingInput label="رقم الهاتف" value={form.phone || ''} onChange={e => { setForm({ ...form, phone: e.target.value }); if(errors.phone) setErrors({...errors, phone: undefined}); }} icon={<PhoneIcon size={16} />} required error={errors.phone} />
            <FloatingInput label="هاتف إضافي" value={form.phone2 || ''} onChange={e => { setForm({ ...form, phone2: e.target.value }); if(errors.phone2) setErrors({...errors, phone2: undefined}); }} icon={<PhoneIcon size={16} />} error={errors.phone2} />
            <FloatingSelect label="المحافظة" value={form.governorate || ''} onChange={e => setForm({ ...form, governorate: e.target.value })} icon={<MapPin size={16} />}>
              <option value="">اختر المحافظة</option>
              {EGYPT_GOVS.map(g => <option key={g} value={g}>{g}</option>)}
            </FloatingSelect>
            <FloatingInput label="المركز / القسم" value={form.district || ''} onChange={e => setForm({ ...form, district: e.target.value })} icon={<MapPin size={16} />} />
            <FloatingInput label="العنوان" value={form.address || ''} onChange={e => setForm({ ...form, address: e.target.value })} icon={<MapPin size={16} />} />
            <FloatingInput label="أقرب معلم" value={form.landmark || ''} onChange={e => setForm({ ...form, landmark: e.target.value })} icon={<MapPin size={16} />} />
          </div>

          <h2 className="text-sm font-bold text-gray-800 mb-4 pb-2 border-b mt-6">ملاحظات المسؤول</h2>
          <FloatingTextarea label="ملاحظات داخلية" value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} icon={<StickyNote size={16} />} placeholder="ملاحظات داخلية (تظهر للمسؤول فقط)..." rows={2} />
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 space-y-5">
          <div>
            <h2 className="text-sm font-bold text-gray-800 mb-3 pb-2 border-b">التصنيف</h2>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(BADGE_CONFIG).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => setForm({ ...form, badge: key })}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                    (form.badge || autoBadge(c)) === key
                      ? `${cfg.color} border-current`
                      : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {cfg.icon} {cfg.label}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-gray-400 mt-2">التصنيفات اليدوية (VIP, مشبوه, محظور) لا تتغير تلقائياً.</p>
          </div>

          <div>
            <h2 className="text-sm font-bold text-gray-800 mb-3 pb-2 border-b">إحصائيات</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-gray-50">
                <span className="text-xs text-gray-500">كود العميل</span>
                <span className="text-sm font-bold text-primary">{normDigits(String(c.id))}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-50">
                <span className="text-xs text-gray-500">عدد الطلبات</span>
                <span className="text-sm font-bold">{(c.ordersCount || 0).toLocaleString('en-US')}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-50">
                <span className="text-xs text-gray-500">إجمالي الإنفاق</span>
                <span className="text-sm font-bold text-primary">{(c.totalSpent || 0).toLocaleString('en-US')} ج.م</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-50">
                <span className="text-xs text-gray-500">آخر طلب</span>
                <span className="text-sm font-bold"><FormattedDate dateStr={c.lastOrderDate || '—'} className="!text-gray-800" /></span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-xs text-gray-500">تاريخ التسجيل</span>
                <span className="text-sm font-bold">{formatDateTime(c.createdAt || '—')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {customerOrders.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mt-4">
          <h2 className="text-sm font-bold text-gray-800 p-4 pb-0">طلبات العميل</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-center border-collapse text-sm">
              <thead className="bg-gray-50">
                <tr className="text-gray-500 border-b">
                  <th className="px-4 py-2.5 font-medium">رقم الطلب</th>
                  <th className="px-4 py-2.5 font-medium">التاريخ</th>
                  <th className="px-4 py-2.5 font-medium">الإجمالي</th>
                  <th className="px-4 py-2.5 font-medium">المدفوع</th>
                  <th className="px-4 py-2.5 font-medium">المتبقي</th>
                  <th className="px-4 py-2.5 font-medium">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {customerOrders.map((o: any) => (
                  <tr key={o.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-bold text-primary">{normDigits(String(o.id))}</td>
                    <td className="px-4 py-2.5 text-xs"><FormattedDate dateStr={o.date} /></td>
                    <td className="px-4 py-2.5 font-bold text-gray-800">{normDigits(o.total)}</td>
                    <td className="px-4 py-2.5 text-green-600">{normDigits(String(o.prepaid || 0))} ج.م</td>
                    <td className="px-4 py-2.5 font-medium text-gray-800">{normDigits(String(o.remaining || 0))} ج.م</td>
                    <td className="px-4 py-2.5"><span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">{o.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

interface Supplier {
  id: string;
  name: string;
  category: string;
  phone: string;
  email: string;
  address: string;
  supplied: number;
  dues: number;
  paid: number;
  totalInvoices: number;
  status: 'نشط' | 'موقوف' | 'تحت المراجعة';
  notes: string;
  createdAt: string;
}

const SUPPLIER_CATEGORIES = ['إلكترونيات', 'مواد تعبئة', 'متنوع', 'إكسسوارات', 'مواد خام', 'خدمات'];

const defaultSupplier = (): Supplier => ({
  id: `SUP-${Date.now()}`,
  name: '',
  category: '',
  phone: '',
  email: '',
  address: '',
  supplied: 0,
  dues: 0,
  paid: 0,
  totalInvoices: 0,
  status: 'نشط',
  notes: '',
  createdAt: new Date().toLocaleDateString('ar-EG-u-nu-latn'),
});

export const Purchases: React.FC<{ setActivePage?: (page: any) => void }> = ({ setActivePage }) => {
  const { notify, confirm } = useApp();
  const [showStats, setShowStats] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [datePreset, setDatePreset] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [suppliers, setSuppliers] = useState<Supplier[]>(() => JSON.parse(localStorage.getItem('my_suppliers') || '[]'));
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editSupplier, setEditSupplier] = useState<Supplier | null>(null);
  const [form, setForm] = useState<Supplier>(defaultSupplier());
  const [page, setPage] = useState(1);
  const perPage = 15;

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Reset selection when search/filters/date range change
  useEffect(() => {
    setSelectedIds(new Set());
  }, [search, filterCategory, filterStatus, datePreset, dateFrom, dateTo]);

  // Selection helpers
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const handleBulkDelete = () => {
    if (!selectedIds.size) return;
    confirm({
      title: 'حذف الموردين المحددين',
      message: `هل أنت متأكد من حذف ${selectedIds.size} مورد؟`,
      onConfirm: () => {
        const list = suppliers.filter(s => !selectedIds.has(s.id));
        saveSuppliers(list);
        notify('success', `تم حذف ${selectedIds.size} مورد بنجاح`);
        setSelectedIds(new Set());
      },
    });
  };

  const saveSuppliers = (list: Supplier[]) => {
    localStorage.setItem('my_suppliers', JSON.stringify(list));
    setSuppliers(list);
  };

  const filtered = useMemo(() => {
    let result = [...suppliers];
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(s => s.name.toLowerCase().includes(q) || s.phone.includes(q) || s.category.includes(q));
    }
    if (filterCategory) result = result.filter(s => s.category === filterCategory);
    if (filterStatus) result = result.filter(s => s.status === filterStatus);
    const effectiveFrom = datePreset !== 'custom' && datePreset !== 'all' ? getPresetRange(datePreset)?.from || dateFrom : dateFrom;
    const effectiveTo = datePreset !== 'custom' && datePreset !== 'all' ? getPresetRange(datePreset)?.to || dateTo : dateTo;
    const fromDate = effectiveFrom ? new Date(effectiveFrom + 'T00:00:00') : null;
    const toDate = effectiveTo ? new Date(effectiveTo + 'T23:59:59') : null;
    if (fromDate || toDate) {
      result = result.filter(s => {
        const d = parseDate(s.createdAt);
        if (!d) return true;
        if (fromDate && d < fromDate) return false;
        if (toDate && d > toDate) return false;
        return true;
      });
    }
    return result;
  }, [suppliers, search, filterCategory, filterStatus, datePreset, dateFrom, dateTo]);

  const allSelected = filtered.length > 0 && selectedIds.size === filtered.length;

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length && filtered.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(s => s.id)));
    }
  };

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paged = filtered.slice((page - 1) * perPage, page * perPage);

  const activeCount = suppliers.filter((s: any) => s.status === 'نشط').length;
  const totalDues = suppliers.reduce((sum: number, s: any) => sum + (s.dues || 0), 0);
  const paidCount = suppliers.filter((s: any) => (s.dues || 0) > 0).length;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'نشط': return 'bg-green-100 text-green-700';
      case 'موقوف': return 'bg-red-100 text-red-700';
      case 'تحت المراجعة': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const openAdd = () => {
    setEditSupplier(null);
    setForm(defaultSupplier());
    setShowForm(true);
  };

  const openEdit = (s: Supplier) => {
    setEditSupplier(s);
    setForm({ ...s });
    setShowForm(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) { notify('error', 'الرجاء إدخال اسم المورد'); return; }
    if (editSupplier) {
      const list = suppliers.map(s => s.id === editSupplier.id ? { ...form } : s);
      saveSuppliers(list);
      notify('success', 'تم تعديل المورد');
    } else {
      const list = [...suppliers, { ...form, id: `SUP-${Date.now()}`, createdAt: new Date().toLocaleDateString('ar-EG-u-nu-latn') }];
      saveSuppliers(list);
      notify('success', 'تم إضافة المورد');
    }
    setShowForm(false);
    setEditSupplier(null);
  };

  const handleDelete = (s: Supplier) => {
    confirm({ title: 'حذف المورد', message: `هل أنت متأكد من حذف "${s.name}"؟`, onConfirm: () => {
      const list = suppliers.filter(x => x.id !== s.id);
      saveSuppliers(list);
      notify('success', 'تم حذف المورد');
    }});
  };

  useEffect(() => { setPage(1); }, [search, filterCategory, filterStatus, datePreset, dateFrom, dateTo]);

  const suppImportRef = useRef<HTMLInputElement>(null);

  const handleExportSuppliers = () => {
    if (!suppliers.length) { notify('info', 'لا يوجد موردين للتصدير'); return; }
    const data = suppliers.map(s => ({
      'رقم المورد': s.id,
      'الاسم': s.name,
      'التصنيف': s.category,
      'الهاتف': s.phone,
      'البريد': s.email || '',
      'العنوان': s.address || '',
      'المنتجات الموردة': s.supplied || 0,
      'إجمالي المستحقات': s.dues || 0,
      'المدفوع': s.paid || 0,
      'عدد الفواتير': s.totalInvoices || 0,
      'الحالة': s.status,
      'ملاحظات': (s as any).notes || '',
      'تاريخ التسجيل': s.createdAt,
    }));
    exportToExcel(data, [
      { key: 'رقم المورد', header: 'رقم المورد', width: 15 },
      { key: 'الاسم', header: 'الاسم', width: 25 },
      { key: 'التصنيف', header: 'التصنيف', width: 15 },
      { key: 'الهاتف', header: 'الهاتف', width: 15 },
      { key: 'البريد', header: 'البريد', width: 20 },
      { key: 'العنوان', header: 'العنوان', width: 25 },
      { key: 'المنتجات الموردة', header: 'المنتجات الموردة', width: 15 },
      { key: 'إجمالي المستحقات', header: 'إجمالي المستحقات', width: 15 },
      { key: 'المدفوع', header: 'المدفوع', width: 12 },
      { key: 'عدد الفواتير', header: 'عدد الفواتير', width: 12 },
      { key: 'الحالة', header: 'الحالة', width: 12 },
      { key: 'ملاحظات', header: 'ملاحظات', width: 25 },
      { key: 'تاريخ التسجيل', header: 'تاريخ التسجيل', width: 20 },
    ], 'suppliers');
    notify('success', `تم تصدير ${suppliers.length} مورد بنجاح`);
  };

  const handleDownloadSupplierTemplate = () => {
    downloadTemplate([
      { key: 'name', header: 'الاسم', width: 25 },
      { key: 'category', header: 'التصنيف', width: 15 },
      { key: 'phone', header: 'الهاتف', width: 15 },
    ], 'suppliers-template');
  };

  const handleImportSuppliers = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = await importFromExcel(file);
    if (!result.success) {
      notify('error', result.errors[0]?.message || 'خطأ في قراءة الملف');
      e.target.value = '';
      return;
    }
    if (!result.data.length) {
      notify('error', 'الملف فارغ');
      e.target.value = '';
      return;
    }

    let totalCreated = 0, totalUpdated = 0, totalErrors = 0;

    for (const row of result.data) {
      const r = row as Record<string, any>;
      const supplier = {
        id: String(r['رقم المورد'] || r['id'] || `SUP-${Date.now()}`),
        name: String(r['الاسم'] || r['name'] || ''),
        category: String(r['التصنيف'] || r['category'] || ''),
        phone: String(r['الهاتف'] || r['phone'] || ''),
        email: String(r['البريد'] || r['email'] || ''),
        address: String(r['العنوان'] || r['address'] || ''),
        supplied: Number(r['المنتجات الموردة'] || r['supplied'] || 0),
        dues: Number(r['إجمالي المستحقات'] || r['dues'] || 0),
        paid: Number(r['المدفوع'] || r['paid'] || 0),
        totalInvoices: Number(r['عدد الفواتير'] || r['totalInvoices'] || 0),
        status: (r['الحالة'] || r['status'] || 'نشط') as Supplier['status'],
        notes: String(r['ملاحظات'] || r['notes'] || ''),
        createdAt: String(r['تاريخ التسجيل'] || r['createdAt'] || new Date().toLocaleDateString('ar-EG-u-nu-latn')),
        invoices: (r as any).invoices || [],
        financialStatus: (r as any).financialStatus || '',
        financialAmount: Number((r as any).financialAmount || 0),
      };

      if (!supplier.name) {
        totalErrors++;
        continue;
      }

      const syncResult = syncSupplierToSystem(supplier);
      totalCreated += syncResult.created;
      totalUpdated += syncResult.updated;
    }

    setSuppliers(getFromStorage('my_suppliers'));

    let msg = `تم استيراد ${result.data.length} مورد`;
    if (totalCreated > 0) msg += ` | إنشاء: ${totalCreated}`;
    if (totalUpdated > 0) msg += ` | تحديث: ${totalUpdated}`;
    if (totalErrors > 0) msg += ` | أخطاء: ${totalErrors}`;
    notify(totalErrors > 0 ? 'error' : 'success', msg);
    e.target.value = '';
  };

  return (
    <div className="flex flex-col h-full">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-3 shrink-0 bg-white p-3 rounded-xl shadow-sm border border-gray-100 mb-4">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button onClick={() => setShowStats(!showStats)}
            className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm font-medium transition-colors ${showStats ? 'bg-primary-light border-primary-light text-primary' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
          ><BarChart2 size={16} /><span>الإحصائيات</span></button>
          <button onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm font-medium transition-colors ${showFilters ? 'bg-primary-light border-primary-light text-primary' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
          ><Filter size={16} /><span>تصفية</span></button>
          <button onClick={handleExportSuppliers} className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            <Download size={16} className="text-[#00c950]" />
            <span>تصدير</span>
          </button>
          <button onClick={handleDownloadSupplierTemplate} className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            <FileDown size={16} />
            <span>نموذج</span>
          </button>
          <button onClick={() => suppImportRef.current?.click()} className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            <Upload size={16} />
            <span>استيراد</span>
          </button>
          <input ref={suppImportRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImportSuppliers} />
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400"><Search size={16} /></span>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="ابحث عن مورد..." className="w-full py-2 pr-10 pl-4 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none text-sm" />
          </div>
          <button onClick={() => setActivePage?.('add-supplier')} className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white font-medium rounded-lg hover:bg-primary-hover transition-colors shadow-sm w-full sm:w-auto">
            <Plus size={20} /><span>إضافة مورد</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <AnimatePresence>
        {showStats && (
          <motion.div initial={{ height: 0, opacity: 0, marginBottom: 0 }} animate={{ height: 'auto', opacity: 1, marginBottom: 16 }} exit={{ height: 0, opacity: 0, marginBottom: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden shrink-0">
            <div className="p-1 pb-2">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                  <p className="text-gray-500 font-medium">إجمالي الموردين</p>
                  <h3 className="text-2xl font-bold text-gray-800">{suppliers.length}</h3>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                  <p className="text-gray-500 font-medium">موردين نشطين</p>
                  <h3 className="text-2xl font-bold text-green-600">{activeCount}</h3>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                  <p className="text-gray-500 font-medium">إجمالي المستحقات</p>
                  <h3 className="text-2xl font-bold text-red-500">{totalDues.toLocaleString('en-US')} ج.م</h3>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                  <p className="text-gray-500 font-medium">مستحقات مستحقة</p>
                  <h3 className="text-2xl font-bold text-orange-500">{paidCount}</h3>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div initial={{ height: 0, opacity: 0, marginBottom: 0 }} animate={{ height: 'auto', opacity: 1, marginBottom: 16 }} exit={{ height: 0, opacity: 0, marginBottom: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden shrink-0">
            <div className="p-1 pb-2">
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-xs text-gray-500 mb-1">التصنيف</label>
                  <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="w-full p-2 border border-gray-200 rounded-lg bg-gray-50 text-sm outline-none focus:border-primary">
                    <option value="">الكل</option>
                    {SUPPLIER_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-xs text-gray-500 mb-1">الحالة</label>
                  <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-full p-2 border border-gray-200 rounded-lg bg-gray-50 text-sm outline-none focus:border-primary">
                    <option value="">الكل</option>
                    <option value="نشط">نشط</option>
                    <option value="تحت المراجعة">تحت المراجعة</option>
                    <option value="موقوف">موقوف</option>
                  </select>
                </div>
                <div className="w-full">
                  <label className="block text-xs text-gray-500 mb-1.5">تاريخ التسجيل</label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {DATE_PRESETS.map(p => (
                      <button key={p.id}
                        onClick={() => {
                          setDatePreset(p.id);
                          if (p.id === 'all') { setDateFrom(''); setDateTo(''); }
                        }}
                        className={`px-3 py-1 text-xs font-medium rounded-lg border transition-colors ${datePreset === p.id ? 'bg-primary border-primary text-white' : 'bg-white border-gray-200 text-gray-600 hover:border-primary hover:text-primary'}`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="date" value={dateFrom}
                      onChange={e => { setDateFrom(e.target.value); setDatePreset('custom'); }}
                      className="flex-1 p-2 border border-gray-200 rounded-lg bg-gray-50 text-sm outline-none focus:border-primary" />
                    <span className="text-xs text-gray-400">إلى</span>
                    <input type="date" value={dateTo}
                      onChange={e => { setDateTo(e.target.value); setDatePreset('custom'); }}
                      className="flex-1 p-2 border border-gray-200 rounded-lg bg-gray-50 text-sm outline-none focus:border-primary" />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk Action Bar */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0, marginBottom: 0 }}
            animate={{ height: 'auto', opacity: 1, marginBottom: 12 }}
            exit={{ height: 0, opacity: 0, marginBottom: 0 }}
            transition={{ duration: 0.18, ease: 'easeInOut' }}
            className="overflow-hidden shrink-0"
          >
            <div className="flex items-center justify-between bg-primary/5 border border-primary/20 rounded-xl px-4 py-2.5">
              <span className="text-sm font-medium text-primary">{selectedIds.size} مورد محدد</span>
              <div className="flex items-center gap-2">
                <button onClick={handleBulkDelete} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-xs font-medium rounded-lg hover:bg-primary-hover transition-colors">
                  <Trash size={14} /> حذف المحدد
                </button>
                <button onClick={clearSelection} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-200 transition-colors">
                  <X size={14} /> إلغاء التحديد
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-center border-collapse">
            <thead className="sticky top-0 bg-gray-50 z-10">
              <tr className="text-gray-500 text-sm border-b border-gray-100">
                <th className="px-3 py-2.5 w-10">
                  <button onClick={toggleSelectAll} className={`transition-colors ${allSelected ? 'text-primary' : 'text-gray-300 hover:text-gray-400'}`}>
                    {allSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                  </button>
                </th>
                <th className="px-6 py-3 font-medium">اسم المورد</th>
                <th className="px-6 py-3 font-medium">التصنيف</th>
                <th className="px-6 py-3 font-medium">تاريخ التسجيل</th>
                <th className="px-6 py-3 font-medium">رقم الهاتف</th>
                <th className="px-6 py-3 font-medium">المنتجات الموردة</th>
                <th className="px-6 py-3 font-medium">المستحقات</th>
                <th className="px-6 py-3 font-medium text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-gray-100">
              {paged.length === 0 ? (
                <tr><td colSpan={8} className="py-16 text-center text-gray-400">
                  <ShoppingBag size={48} className="mx-auto mb-3 opacity-50" />
                  <p className="text-lg font-medium">{suppliers.length === 0 ? 'لا يوجد موردين بعد' : 'لا توجد نتائج للبحث'}</p>
                  {suppliers.length === 0 && <p className="text-sm mt-1 text-gray-400">أضف مورد جديد للبدء.</p>}
                </td></tr>
              ) : paged.map((s) => (
                <tr key={s.id} className={`hover:bg-gray-50 transition-colors duration-150 group ${selectedIds.has(s.id) ? 'bg-primary/5' : ''}`}>
                  <td className="px-3 py-2.5">
                    <button onClick={() => toggleSelect(s.id)} className={`transition-colors ${selectedIds.has(s.id) ? 'text-primary' : 'text-gray-300 hover:text-gray-400'}`}>
                      {selectedIds.has(s.id) ? <CheckSquare size={16} /> : <Square size={16} />}
                    </button>
                  </td>
                  <td className="px-6 py-3 font-medium text-gray-800">{s.name}</td>
                  <td className="px-6 py-3 text-gray-600">{s.category || '—'}</td>
                  <td className="px-6 py-3 text-xs"><FormattedDate dateStr={s.createdAt || ''} /></td>
                  <td className="px-6 py-3 text-gray-600" dir="ltr">{s.phone || '—'}</td>
                  <td className="px-6 py-3 font-medium text-gray-800">{s.supplied || 0}</td>
                  <td className="px-6 py-3 font-bold text-red-500">{(s.dues || 0).toLocaleString('en-US')} ج.م</td>
                  <td className="px-6 py-3">
                    <div className="flex items-center justify-center gap-2">
<button onClick={() => { localStorage.setItem('view_supplier', JSON.stringify(s)); setActivePage?.('view-supplier'); }} className="p-1.5 text-primary bg-primary-light hover:bg-primary hover:text-white rounded-md transition-colors" title="عرض التفاصيل">
                         <Eye size={16} />
                       </button>
                      <button onClick={() => { localStorage.setItem('edit_supplier', JSON.stringify(s)); setActivePage?.('edit-supplier'); }} className="p-1.5 text-primary bg-primary-light hover:bg-primary hover:text-white rounded-md transition-colors" title="تعديل">
                        <Edit size={16} />
                      </button>
                      <button onClick={() => handleDelete(s)} className="p-1.5 text-primary bg-primary-light hover:bg-primary hover:text-white rounded-md transition-colors" title="حذف">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500 shrink-0">
            <div>عرض {(page - 1) * perPage + 1}-{Math.min(page * perPage, filtered.length)} من {filtered.length} مورد</div>
            <div className="flex gap-1">
              <button disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))} className="px-3 py-1 border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-50">السابق</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setPage(p)} className={`px-3 py-1 border rounded-md ${p === page ? 'border-primary bg-primary text-white' : 'border-gray-200 hover:bg-gray-50'}`}>{p}</button>
              ))}
              <button disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))} className="px-3 py-1 border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-50">التالي</button>
            </div>
          </div>
        )}
      </div>

      {/* View Supplier Modal */}
      <AnimatePresence>
        {selectedSupplier && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-md p-4" onClick={() => setSelectedSupplier(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} transition={{ type: 'spring', duration: 0.3 }} className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 w-full max-w-lg max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-4 border-b border-gray-100">
                <h2 className="text-sm font-bold text-gray-800">{selectedSupplier.name}</h2>
                <button onClick={() => setSelectedSupplier(null)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"><X size={16} /></button>
              </div>
              <div className="p-4 grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-xs text-gray-500 block">رقم المورد</span><span className="font-bold text-primary">{selectedSupplier.id}</span></div>
                <div><span className="text-xs text-gray-500 block">التصنيف</span><span>{selectedSupplier.category || '—'}</span></div>
                <div><span className="text-xs text-gray-500 block">رقم الهاتف</span><span dir="ltr">{selectedSupplier.phone || '—'}</span></div>
                <div><span className="text-xs text-gray-500 block">البريد الإلكتروني</span><span>{selectedSupplier.email || '—'}</span></div>
                <div><span className="text-xs text-gray-500 block">العنوان</span><span>{selectedSupplier.address || '—'}</span></div>
                <div><span className="text-xs text-gray-500 block">الحالة</span><span className={`px-2 py-0.5 rounded-full text-xs font-medium inline-block ${getStatusColor(selectedSupplier.status)}`}>{selectedSupplier.status}</span></div>
                <div><span className="text-xs text-gray-500 block">المنتجات الموردة</span><span className="font-bold">{selectedSupplier.supplied || 0}</span></div>
                <div><span className="text-xs text-gray-500 block">إجمالي المستحقات</span><span className="font-bold text-red-500">{(selectedSupplier.dues || 0).toLocaleString('en-US')} ج.م</span></div>
                <div><span className="text-xs text-gray-500 block">المدفوع</span><span className="font-bold text-green-600">{(selectedSupplier.paid || 0).toLocaleString('en-US')} ج.م</span></div>
                <div><span className="text-xs text-gray-500 block">إجمالي الفواتير</span><span className="font-bold">{selectedSupplier.totalInvoices || 0}</span></div>
                <div className="col-span-2"><span className="text-xs text-gray-500 block">ملاحظات</span><span>{selectedSupplier.notes || '—'}</span></div>
                <div className="col-span-2"><span className="text-xs text-gray-500 block">تاريخ التسجيل</span><span>{selectedSupplier.createdAt}</span></div>
              </div>
              {/* Invoices list */}
              {selectedSupplier.invoices && selectedSupplier.invoices.length > 0 && (
                <div className="px-4 pb-3">
                  <h3 className="text-sm font-bold text-gray-700 mb-2 border-b pb-1">الفواتير ({selectedSupplier.invoices.length})</h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {[...selectedSupplier.invoices].reverse().map((inv: any) => (
                      <div key={inv.id} className="bg-gray-50 rounded-lg p-3 text-xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-primary">{inv.id}</span>
                          <span className="text-gray-500">{inv.date}</span>
                        </div>
                        <div className="text-gray-600 mb-1">
                          {inv.items?.map((item: any, i: number) => (
                            <span key={i}>{item.productName}{i < inv.items.length - 1 ? '، ' : ''}</span>
                          ))}
                        </div>
                        <div className="flex items-center justify-between text-gray-500">
                          <span>الإجمالي: <strong className="text-gray-800">{(inv.total || 0).toLocaleString('en-US')} ج.م</strong></span>
                          {inv.paid > 0 && <span>مدفوع: <strong className="text-green-600">{(inv.paid || 0).toLocaleString('en-US')} ج.م</strong></span>}
                          {inv.notes && <span className="text-gray-400">{inv.notes}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex gap-2 p-4 border-t border-gray-100">
                <button onClick={() => { localStorage.setItem('edit_supplier', JSON.stringify(selectedSupplier)); setSelectedSupplier(null); setActivePage?.('edit-supplier'); }} className="flex-1 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-hover transition-colors">تعديل</button>
                <button onClick={() => setSelectedSupplier(null)} className="flex-1 py-2 bg-gray-100 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors">إغلاق</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add/Edit Supplier Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-md p-4" onClick={() => setShowForm(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} transition={{ type: 'spring', duration: 0.3 }} className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 w-full max-w-lg max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-4 border-b border-gray-100">
                <h2 className="text-sm font-bold text-gray-800">{editSupplier ? 'تعديل المورد' : 'إضافة مورد جديد'}</h2>
                <button onClick={() => setShowForm(false)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"><X size={16} /></button>
              </div>
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <FloatingInput label="اسم المورد" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} icon={<Building2 size={16} />} required />
                </div>
                <div>
                  <FloatingSelect label="التصنيف" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                    <option value="">اختر التصنيف</option>
                    {SUPPLIER_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </FloatingSelect>
                </div>
                <div>
                  <FloatingSelect label="الحالة" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as Supplier['status'] }))}>
                    <option value="نشط">نشط</option>
                    <option value="تحت المراجعة">تحت المراجعة</option>
                    <option value="موقوف">موقوف</option>
                  </FloatingSelect>
                </div>
                <div>
                  <FloatingInput label="رقم الهاتف" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} icon={<PhoneIcon size={16} />} placeholder="01xxxxxxxxx" />
                </div>
                <div>
                  <FloatingInput label="البريد الإلكتروني" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} icon={<Mail size={16} />} placeholder="email@example.com" type="email" />
                </div>
                <div className="sm:col-span-2">
                  <FloatingInput label="العنوان" value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} icon={<MapPin size={16} />} />
                </div>
                <div>
                  <FloatingInput label="المنتجات الموردة" value={String(form.supplied)} onChange={e => setForm(p => ({ ...p, supplied: parseInt(e.target.value) || 0 }))} icon={<Package size={16} />} type="number" />
                </div>
                <div>
                  <FloatingInput label="المستحقات" value={String(form.dues)} onChange={e => setForm(p => ({ ...p, dues: parseInt(e.target.value) || 0 }))} icon={<DollarSign size={16} />} type="number" endAdornment={<span>ج.م</span>} />
                </div>
                <div>
                  <FloatingInput label="المدفوع" value={String(form.paid)} onChange={e => setForm(p => ({ ...p, paid: parseInt(e.target.value) || 0 }))} icon={<DollarSign size={16} />} type="number" endAdornment={<span>ج.م</span>} />
                </div>
                <div>
                  <FloatingInput label="إجمالي الفواتير" value={String(form.totalInvoices)} onChange={e => setForm(p => ({ ...p, totalInvoices: parseInt(e.target.value) || 0 }))} icon={<FileText size={16} />} type="number" />
                </div>
                <div className="sm:col-span-2">
                  <FloatingTextarea label="ملاحظات" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} icon={<StickyNote size={16} />} rows={2} />
                </div>
              </div>
              <div className="flex gap-2 p-4 border-t border-gray-100">
                <button onClick={handleSave} className="flex-1 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-hover transition-colors">{editSupplier ? 'حفظ التعديلات' : 'إضافة المورد'}</button>
                <button onClick={() => setShowForm(false)} className="flex-1 py-2 bg-gray-100 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors">إلغاء</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const Expenses = () => <PageTemplate title="إدارة المصروفات" subtitle="تسجيل النفقات التشغيلية، الإيجارات، الرواتب والرسوم" icon={<ReceiptText size={32} />} />;
// ═══════════════════════════════════════════════════════════
//  System Management Page (Users, Backup, Settings)
// ═══════════════════════════════════════════════════════════

import { getUsers, saveUsers, ALL_PAGES } from './Users';
import type { SystemUser } from './Users';

const STORAGE_KEYS = ['my_orders', 'my_products', 'my_expenses', 'my_customers', 'my_shipping_companies', 'my_suppliers', 'my_categories', 'my_wastage', 'my_system_users', 'store_name', 'store_phone', 'store_address'];

interface SystemProps {
  setActivePage: (p: any) => void;
}

export const System: React.FC<SystemProps> = ({ setActivePage }) => {
  const { confirm, notify } = useApp();
  const [tab, setTab] = useState<'users' | 'backup' | 'settings'>('users');
  const [users, setUsers] = useState<SystemUser[]>(getUsers);
  const [searchQuery, setSearchQuery] = useState('');
  const [backupLog, setBackupLog] = useState<string[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [isMigrating, setIsMigrating] = useState(false);

  async function handleSupabaseMigration() {
    confirm({
      title: 'ترحيل البيانات السحابية',
      message: 'سيتم رفع كافة البيانات المحلية المتوفرة حالياً في متصفحك (المنتجات، المصروفات، العملاء، الطلبات...) إلى خادم Supabase السحابي. هل تود الاستمرار؟',
      onConfirm: async () => {
        setIsMigrating(true);
        try {
          const { migrateLocalStorageToSupabase } = await import('../utils/supabaseSync');
          const stats = await migrateLocalStorageToSupabase();
          setBackupLog(prev => [
            ...prev,
            `تم ترحيل البيانات سحابياً بنجاح: ${stats.products} منتج، ${stats.orders} طلب، ${stats.customers} عميل ${new Date().toLocaleString('ar-EG')}`
          ]);
          notify('success', `تم ترحيل البيانات بنجاح: تم رفع ${stats.products} منتج، ${stats.orders} طلب، ${stats.customers} عميل سحابياً!`);
        } catch (error: any) {
          console.error(error);
          setBackupLog(prev => [...prev, `فشل ترحيل البيانات سحابياً: ${error.message || 'خطأ غير معروف'}`]);
          notify('error', `فشل الترحيل السحابي: ${error.message || 'يرجى التحقق من إعدادات الجداول في Supabase'}`);
        } finally {
          setIsMigrating(false);
        }
      }
    });
  }

  const [storeForm, setStoreForm] = useState({
    name: localStorage.getItem('store_name') || '',
    phone: localStorage.getItem('store_phone') || '',
    address: localStorage.getItem('store_address') || '',
  });
  const [storeErrors, setStoreErrors] = useState<{ phone?: string }>({});

  const filteredUsers = useMemo(() => {
    if (!searchQuery) return users;
    const q = searchQuery.toLowerCase();
    return users.filter(u => u.name.toLowerCase().includes(q) || u.username.toLowerCase().includes(q));
  }, [users, searchQuery]);

  function handleDelete(id: string) {
    const updated = users.filter(u => u.id !== id);
    saveUsers(updated);
    setUsers(updated);
    setShowDeleteConfirm(null);
  }

  function handleExport() {
    const data: Record<string, any> = {};
    for (const key of STORAGE_KEYS) {
      const raw = localStorage.getItem(key);
      if (raw) data[key] = JSON.parse(raw);
    }
    data._exportedAt = new Date().toISOString();
    data._version = '1.0';

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `store-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setBackupLog(prev => [...prev, `تم تصدير النسخة الاحتياطية ${new Date().toLocaleString('ar-EG')}`]);
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        let count = 0;
        for (const key of STORAGE_KEYS) {
          if (data[key]) {
            localStorage.setItem(key, JSON.stringify(data[key]));
            count++;
          }
        }
        setBackupLog(prev => [...prev, `تم استيراد ${count} جدول من ${file.name} ${new Date().toLocaleString('ar-EG')}`]);
      } catch {
        setBackupLog(prev => [...prev, `فشل استيراد الملف: ${file.name}`]);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  function handleStoreSave() {
    const trimmedPhone = storeForm.phone.trim();
    if (trimmedPhone && !/^(010|011|012|015)\d{8}$/.test(trimmedPhone)) {
      setStoreErrors({ phone: "رقم الهاتف غير صحيح" });
      notify('error', 'رقم الهاتف غير صحيح');
      return;
    }
    setStoreErrors({});
    localStorage.setItem('store_name', storeForm.name);
    localStorage.setItem('store_phone', storeForm.phone);
    localStorage.setItem('store_address', storeForm.address);
    setBackupLog(prev => [...prev, `تم حفظ إعدادات المتجر ${new Date().toLocaleString('ar-EG')}`]);
    notify('success', 'تم حفظ إعدادات المتجر بنجاح');
  }

  async function clearAllData() {
    try {
      // 1. Clear from Supabase first
      const tables = [
        'orders',
        'wastage_logs',
        'products',
        'expenses',
        'customers',
        'shipping_companies',
        'suppliers',
        'categories'
      ];
      
      notify('info', 'جاري مسح البيانات سحابياً من Supabase...');
      
      for (const table of tables) {
        const { error } = await supabase.from(table).delete().not('id', 'is', null);
        if (error) {
          console.warn(`فشل مسح الجدول السحابي ${table}:`, error);
        }
      }

      // 2. Clear from LocalStorage
      let count = 0;
      for (const key of STORAGE_KEYS) {
        if (key !== 'my_system_users') {
          localStorage.removeItem(key);
          count++;
        }
      }

      setBackupLog(prev => [...prev, `تم مسح البيانات نهائياً من المتصفح ومن السحابة ${new Date().toLocaleString('ar-EG')}`]);
      notify('success', 'تم مسح جميع البيانات من السحابة والمتصفح بنجاح! سيتم إعادة تحميل الصفحة لتحديث التطبيق.');
      
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      
    } catch (err: any) {
      console.error('حدث خطأ أثناء مسح البيانات:', err);
      notify('error', `فشل مسح البيانات بالكامل: ${err.message || 'خطأ غير معروف'}`);
    }
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-y-auto px-4 py-4 md:px-6 dir-rtl" style={{ fontFamily: 'WellWay, sans-serif' }}>
      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit mb-6">
        {[
          { id: 'users' as const, label: 'المستخدمين', icon: <User size={14} /> },
          { id: 'backup' as const, label: 'النسخ الاحتياطي', icon: <DownloadCloud size={14} /> },
          { id: 'settings' as const, label: 'الإعدادات', icon: <Settings size={14} /> },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${tab === t.id ? 'bg-white text-[#00c950] shadow-xs' : 'text-slate-500 hover:text-slate-700'}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── Users Tab ────────────────────────────── */}
      {tab === 'users' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between p-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <User size={16} className="text-slate-400" />
              <h3 className="text-sm font-bold text-slate-800">المستخدمين ({users.length})</h3>
            </div>
            <div className="flex items-center gap-2">
              <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder="بحث..."
                className="w-36 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-[#00c950] transition-all"
              />
              <button onClick={() => setActivePage('add-user')}
                className="flex items-center gap-1 px-3 py-2 bg-[#00c950] text-white text-xs font-semibold rounded-lg hover:bg-[#00b548] transition-colors">
                <Plus size={14} /> مستخدم جديد
              </button>
            </div>
          </div>

          {filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-slate-400">
              <User size={36} className="mb-2 opacity-50" />
              <p className="text-sm">لا يوجد مستخدمين</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="p-3 text-right text-[10px] text-slate-500 font-semibold">الاسم</th>
                    <th className="p-3 text-right text-[10px] text-slate-500 font-semibold">اسم المستخدم</th>
                    <th className="p-3 text-right text-[10px] text-slate-500 font-semibold">المسمى</th>
                    <th className="p-3 text-right text-[10px] text-slate-500 font-semibold">الصلاحيات</th>
                    <th className="p-3 text-right text-[10px] text-slate-500 font-semibold">الحالة</th>
                    <th className="p-3 text-right text-[10px] text-slate-500 font-semibold">آخر دخول</th>
                    <th className="p-3 text-center text-[10px] text-slate-500 font-semibold">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredUsers.map(u => (
                    <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-medium text-slate-800">{u.name}</td>
                      <td className="p-3 text-slate-600">{u.username}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-[10px] font-medium">{u.role || '—'}</span>
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {u.permissions.slice(0, 3).map(p => {
                            const page = ALL_PAGES.find(pp => pp.id === p);
                            return <span key={p} className="px-1.5 py-0.5 bg-[#00c950]/10 text-[#00c950] rounded text-[9px] font-medium">{page?.label || p}</span>;
                          })}
                          {u.permissions.length > 3 && (
                            <span className="px-1.5 py-0.5 bg-slate-100 text-slate-400 rounded text-[9px] font-medium">+{u.permissions.length - 3}</span>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <span className={`flex items-center gap-1 text-[10px] font-medium ${u.active ? 'text-green-600' : 'text-slate-400'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${u.active ? 'bg-green-500' : 'bg-slate-300'}`}></span>
                          {u.active ? 'نشط' : 'غير نشط'}
                        </span>
                      </td>
                      <td className="p-3 text-xs text-slate-400">{u.lastLogin ? new Date(u.lastLogin).toLocaleDateString('ar-EG') : '—'}</td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => { localStorage.setItem('edit_user_id', u.id); setActivePage('edit-user'); }}
                            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors" title="تعديل">
                            <Edit3 size={14} />
                          </button>
                          {u.id !== 'admin-1' && (
                            <button onClick={() => setShowDeleteConfirm(u.id)}
                              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="حذف">
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Delete Confirm ────────────────────────── */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-md z-50 flex items-center justify-center">
          <div className="bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold text-red-600 mb-2">حذف مستخدم</h3>
            <p className="text-sm text-slate-500 mb-6">هل أنت متأكد من حذف هذا المستخدم؟</p>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 px-4 py-2.5 text-sm font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl transition-colors">تراجع</button>
              <button onClick={() => handleDelete(showDeleteConfirm)}
                className="flex-1 px-4 py-2.5 text-sm font-semibold bg-red-600 text-white hover:bg-red-700 rounded-xl transition-colors">حذف</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Backup Tab ────────────────────────────── */}
      {tab === 'backup' && (
        <div className="space-y-4">
          {/* Supabase Cloud Auto-Sync Notice Card */}
          <div className="bg-white p-6 rounded-2xl border border-emerald-100 shadow-xs relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full -mr-10 -mt-10 opacity-60"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-50 text-[#00c950]">
                  <DownloadCloud size={20} className="animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">الاتصال والمزامنة السحابية التلقائية (Supabase)</h3>
                  <p className="text-[10px] text-emerald-600 font-semibold mt-0.5 flex items-center gap-1">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    نشط ويعمل تلقائياً بالخلفية
                  </p>
                </div>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed mb-4 font-medium">
                تم ترقية النظام بالكامل ليعمل بنمط المزامنة السحابية اللحظية الفورية (Zero-Click Real-time Sync). أي عملية إدخال أو تعديل للمنتجات، تغيير في المخزون، إضافة مصروفات، تغيير لحالات الطلبات، أو رفع للصور يتم ترحيلها وحفظها في السحابة فوراً بالخلفية دون الحاجة للضغط على أي أزرار أو إجراء أي تداخل يدوي.
              </p>
              
              {/* Advanced Maintenance Panel */}
              <div className="border-t border-slate-100 pt-4 mt-4">
                <details className="group">
                  <summary className="flex items-center justify-between text-xs font-bold text-slate-600 cursor-pointer list-none select-none">
                    <span className="flex items-center gap-1.5 hover:text-[#00c950] transition-colors">
                      <Settings size={14} className="group-open:rotate-45 transition-transform" />
                      أدوات الصيانة المتقدمة ومطابقة البيانات السحابية (للدعم الفني)
                    </span>
                    <span className="text-slate-400 group-open:rotate-180 transition-transform">
                      <ChevronDown size={14} />
                    </span>
                  </summary>
                  
                  <div className="mt-3 bg-slate-50 p-4 rounded-xl space-y-3">
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      هذه الأدوات تُستخدم للمطابقة الكاملة للبيانات السحابية يدوياً أو في حالة ترحيل البيانات لأول مرة من متصفح جديد تماماً إلى خادم Supabase.
                    </p>
                    <button onClick={handleSupabaseMigration} disabled={isMigrating}
                      className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white text-xs font-semibold rounded-xl hover:bg-primary-hover transition-colors disabled:opacity-70 shadow-sm">
                      {isMigrating ? (
                        <span className="flex items-center gap-2">
                          <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                          جاري الرفع والمطابقة السحابية...
                        </span>
                      ) : (
                        <>
                          <Upload size={16} /> مطابقة وترحيل كافة البيانات المحلية سحابياً 🚀
                        </>
                      )}
                    </button>
                  </div>
                </details>
              </div>
            </div>
          </div>

          {/* Export */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <DownloadCloud size={18} className="text-[#00c950]" />
              <h3 className="text-sm font-bold text-slate-800">تصدير نسخة احتياطية</h3>
            </div>
            <p className="text-xs text-slate-500 mb-4">تصدير كل بيانات النظام (الطلبات، المنتجات، العملاء، المصروفات...) إلى ملف JSON واحد.</p>
            <button onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#00c950] text-white text-xs font-semibold rounded-xl hover:bg-[#00b548] transition-colors">
              <FileDown size={16} /> تصدير البيانات
            </button>
          </div>

          {/* Import */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Upload size={18} className="text-[#00c950]" />
              <h3 className="text-sm font-bold text-slate-800">استيراد نسخة احتياطية</h3>
            </div>
            <p className="text-xs text-slate-500 mb-4">استيراد بيانات من ملف JSON تم تصديره سابقاً. البيانات الحالية ستُستبدل.</p>
            <input ref={fileRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
            <button onClick={() => fileRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 transition-colors">
              <Upload size={16} /> اختيار ملف واستيراده
            </button>
          </div>

          {/* Clear Data */}
          <div className="bg-white p-5 rounded-2xl border border-red-100 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle size={18} className="text-red-500" />
              <h3 className="text-sm font-bold text-slate-800">مسح البيانات</h3>
            </div>
            <p className="text-xs text-slate-500 mb-4">مسح كل بيانات النظام (الطلبات، المنتجات، المصروفات...) مع الاحتفاظ بالمستخدمين. يُنصح بتصدير نسخة قبل المسح.</p>
            <button onClick={() => {
              confirm({
                title: 'مسح شامل للبيانات',
                message: 'هل أنت متأكد من مسح جميع بيانات النظام نهائياً؟ هذا الإجراء سيقوم بحذف كافة المنتجات، الطلبات، العملاء، الموردين، المصروفات، الهوالك، وشركات الشحن من المتصفح ومن قاعدة البيانات السحابية (Supabase) بشكل نهائي ولا يمكن التراجع عنه!',
                onConfirm: async () => {
                  await clearAllData();
                }
              });
            }}
              className="flex items-center gap-2 px-4 py-2.5 bg-red-500 text-white text-xs font-semibold rounded-xl hover:bg-red-600 transition-colors">
              <Trash size={16} /> مسح كل البيانات
            </button>
          </div>

          {/* Log */}
          {backupLog.length > 0 && (
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
              <h3 className="text-xs font-bold text-slate-800 mb-3">سجل العمليات</h3>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {backupLog.slice().reverse().map((log, idx) => (
                  <p key={idx} className="text-[10px] text-slate-500">{log}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Settings Tab ──────────────────────────── */}
      {tab === 'settings' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-2 mb-5">
              <Store size={18} className="text-[#00c950]" />
              <h3 className="text-sm font-bold text-slate-800">بيانات المتجر</h3>
            </div>
            <div className="space-y-4 max-w-lg">
              <FloatingInput label="اسم المتجر" value={storeForm.name} onChange={e => setStoreForm(p => ({ ...p, name: e.target.value }))} icon={<Store size={16} />} />
              <FloatingInput label="رقم الهاتف" value={storeForm.phone} onChange={e => { setStoreForm(p => ({ ...p, phone: e.target.value })); if(storeErrors.phone) setStoreErrors({}); }} icon={<Phone size={16} />} error={storeErrors.phone} />
              <FloatingTextarea label="العنوان" value={storeForm.address} onChange={e => setStoreForm(p => ({ ...p, address: e.target.value }))} icon={<MapPin size={16} />} rows={2} />
              <button onClick={handleStoreSave}
                className="px-4 py-2.5 bg-[#00c950] text-white text-xs font-semibold rounded-xl hover:bg-[#00b548] transition-colors">
                حفظ الإعدادات
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
