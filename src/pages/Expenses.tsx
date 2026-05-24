import React, { useState, useMemo, useRef } from 'react';
import { Plus, Search, Filter, BarChart2, ReceiptText, Edit, Trash2, Download, Upload, X, FileDown, ArrowUpDown, CheckSquare, Square, Trash } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useApp } from '../context/AppContext';
import { exportToExcel, importFromExcel, downloadTemplate } from '../utils/excel';
import { FormattedDate, normDigits } from '../components/FormattedDate';

const EXPENSE_CATEGORIES = [
  'إيجار', 'رواتب', 'شحن وتوصيل', 'تسويق وإعلانات',
  'صيانة', 'مرافق (كهرباء/مياه/غاز)', 'فواتير واشتراكات',
  'مصروفات إدارية', 'متنوع',
];

const PAYMENT_METHODS = ['نقدي', 'تحويل بنكي', 'بطاقة ائتمان', 'شيك', 'آجل'];

const STORAGE_KEY = 'my_expenses';

interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  paymentMethod: string;
  notes: string;
  createdAt: string;
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

interface ExpensesProps {
  setActivePage?: (page: any) => void;
}

export const Expenses: React.FC<ExpensesProps> = ({ setActivePage }) => {
  const { notify, confirm } = useApp();
  const [showStats, setShowStats] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterPayment, setFilterPayment] = useState('');
  const [datePreset, setDatePreset] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortField, setSortField] = useState<'date' | 'amount'>('date');
  const [sortDir, setSortDir] = useState<'ASC' | 'DESC'>('DESC');
  const fileRef = useRef<HTMLInputElement>(null);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  });

  const saveExpenses = (list: Expense[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    setExpenses(list);
  };

  const filtered = useMemo(() => {
    let result = [...expenses];
    const effectiveFrom = datePreset !== 'custom' && datePreset !== 'all' ? getPresetRange(datePreset)?.from || dateFrom : dateFrom;
    const effectiveTo = datePreset !== 'custom' && datePreset !== 'all' ? getPresetRange(datePreset)?.to || dateTo : dateTo;
    if (effectiveFrom || effectiveTo) {
      const fromDate = effectiveFrom ? new Date(effectiveFrom + 'T00:00:00') : null;
      const toDate = effectiveTo ? new Date(effectiveTo + 'T23:59:59') : null;
      result = result.filter(e => {
        const d = parseDate(e.date);
        if (!d) return true;
        if (fromDate && d < fromDate) return false;
        if (toDate && d > toDate) return false;
        return true;
      });
    }
    const q = searchQuery.trim().toLowerCase();
    if (q) result = result.filter(e => e.description.toLowerCase().includes(q) || e.category.includes(q));
    if (filterCategory) result = result.filter(e => e.category === filterCategory);
    if (filterPayment) result = result.filter(e => e.paymentMethod === filterPayment);
    result.sort((a, b) => {
      const dir = sortDir === 'ASC' ? 1 : -1;
      if (sortField === 'amount') return (a.amount - b.amount) * dir;
      return (a.date || '').localeCompare(b.date || '') * dir;
    });
    return result;
  }, [expenses, searchQuery, filterCategory, filterPayment, sortField, sortDir, datePreset, dateFrom, dateTo]);

  const thisMonth = useMemo(() => {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    return expenses.filter(e => {
      const d = new Date(e.date);
      return d.getMonth() === month && d.getFullYear() === year;
    });
  }, [expenses]);

  const totalAll = expenses.reduce((s, e) => s + e.amount, 0);
  const totalMonth = thisMonth.reduce((s, e) => s + e.amount, 0);

  const categoryTotals = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach(e => { map[e.category] = (map[e.category] || 0) + e.amount; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [expenses]);

  // --- Selection helpers ---
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length && filtered.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(e => e.id)));
    }
  };

  const clearSelection = () => setSelectedIds(new Set());

  const handleBulkDelete = () => {
    if (!selectedIds.size) return;
    confirm({
      title: 'حذف المصروفات المحددة',
      message: `هل أنت متأكد من حذف ${selectedIds.size} مصروف؟`,
      onConfirm: () => {
        saveExpenses(expenses.filter(e => !selectedIds.has(e.id)));
        notify('success', `تم حذف ${selectedIds.size} مصروف`);
        setSelectedIds(new Set());
      },
    });
  };

  const openAdd = () => setActivePage?.('add-expense');

  const openEdit = (e: Expense) => {
    localStorage.setItem('edit_expense', JSON.stringify(e));
    setActivePage?.('edit-expense');
  };

  const handleDelete = (e: Expense) => {
    confirm({
      title: 'حذف المصروف',
      message: `هل أنت متأكد من حذف "${e.description}"؟`,
      onConfirm: () => {
        saveExpenses(expenses.filter(x => x.id !== e.id));
        notify('success', 'تم حذف المصروف');
      },
    });
  };

  const handleExport = () => {
    if (!expenses.length) { notify('info', 'لا توجد مصروفات للتصدير'); return; }
    const data = expenses.map(e => ({
      'رقم المصروف': e.id,
      'الوصف': e.description,
      'التصنيف': e.category,
      'المبلغ': e.amount,
      'طريقة الدفع': e.paymentMethod,
      'التاريخ': e.date,
      'ملاحظات': e.notes,
      'تاريخ التسجيل': e.createdAt,
    }));
    exportToExcel(data, [
      { key: 'رقم المصروف', header: 'رقم المصروف', width: 18 },
      { key: 'الوصف', header: 'الوصف', width: 30 },
      { key: 'التصنيف', header: 'التصنيف', width: 20 },
      { key: 'المبلغ', header: 'المبلغ', width: 15 },
      { key: 'طريقة الدفع', header: 'طريقة الدفع', width: 15 },
      { key: 'التاريخ', header: 'التاريخ', width: 15 },
      { key: 'ملاحظات', header: 'ملاحظات', width: 30 },
      { key: 'تاريخ التسجيل', header: 'تاريخ التسجيل', width: 20 },
    ], 'expenses');
    notify('success', `تم تصدير ${expenses.length} مصروف`);
  };

  const handleDownloadTemplate = () => {
    downloadTemplate([
      { key: 'description', header: 'الوصف', width: 30 },
      { key: 'category', header: 'التصنيف', width: 20 },
      { key: 'amount', header: 'المبلغ', width: 15 },
      { key: 'paymentMethod', header: 'طريقة الدفع', width: 15 },
      { key: 'date', header: 'التاريخ', width: 15 },
    ], 'expenses-template');
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = await importFromExcel(file);
    if (!result.success) { notify('error', result.errors[0]?.message || 'خطأ في قراءة الملف'); e.target.value = ''; return; }
    if (!result.data.length) { notify('error', 'الملف فارغ'); e.target.value = ''; return; }

    let created = 0, errors = 0;
    for (const row of result.data) {
      const r = row as Record<string, any>;
      if (!r['الوصف'] && !r['description']) { errors++; continue; }
      expenses.unshift({
        id: `EXP-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        description: String(r['الوصف'] || r['description'] || ''),
        amount: Number(r['المبلغ'] || r['amount'] || 0),
        category: String(r['التصنيف'] || r['category'] || 'متنوع'),
        date: String(r['التاريخ'] || r['date'] || new Date().toLocaleDateString('ar-EG-u-nu-latn')),
        paymentMethod: String(r['طريقة الدفع'] || r['paymentMethod'] || 'نقدي'),
        notes: String(r['ملاحظات'] || r['notes'] || ''),
        createdAt: new Date().toLocaleDateString('ar-EG-u-nu-latn'),
      });
      created++;
    }
    saveExpenses([...expenses]);
    const msg = `تم استيراد ${result.data.length} مصروف | إنشاء: ${created}${errors ? ` | أخطاء: ${errors}` : ''}`;
    notify(errors > 0 ? 'error' : 'success', msg);
    e.target.value = '';
  };

  const toggleSort = (field: 'date' | 'amount') => {
    if (sortField === field) setSortDir(d => d === 'ASC' ? 'DESC' : 'ASC');
    else { setSortField(field); setSortDir('DESC'); }
  };

  const allSelected = filtered.length > 0 && selectedIds.size === filtered.length;

  return (
    <div className="flex flex-col">
      <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} />

      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-3 shrink-0 bg-white p-3 rounded-xl shadow-sm border border-gray-100 mb-4">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button onClick={() => setShowStats(!showStats)}
            className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm font-medium transition-colors ${showStats ? 'bg-primary-light border-primary-light text-primary' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            <BarChart2 size={16} /><span>الإحصائيات</span>
          </button>
          <button onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm font-medium transition-colors ${showFilters ? 'bg-primary-light border-primary-light text-primary' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            <Filter size={16} /><span>تصفية</span>
          </button>
          <button onClick={handleExport} className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">
            <Download size={16} className="text-[#00c950]" /><span>تصدير</span>
          </button>
          <button onClick={handleDownloadTemplate} className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">
            <FileDown size={16} /><span>نموذج</span>
          </button>
          <button onClick={() => fileRef.current?.click()} className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">
            <Upload size={16} /><span>استيراد</span>
          </button>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400"><Search size={16} /></span>
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="ابحث في المصروفات..." className="w-full py-2 pr-10 pl-4 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none text-sm" />
          </div>
          <button onClick={openAdd} className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white font-medium rounded-lg hover:bg-primary-hover transition-colors shadow-sm w-full sm:w-auto">
            <Plus size={20} /><span>إضافة مصروف</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <AnimatePresence>
        {showStats && (
          <motion.div initial={{ height: 0, opacity: 0, marginBottom: 0 }} animate={{ height: 'auto', opacity: 1, marginBottom: 16 }} exit={{ height: 0, opacity: 0, marginBottom: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden shrink-0">
            <div className="p-1 pb-2">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                  <p className="text-gray-500 font-medium">إجمالي المصروفات (شامل)</p>
                  <h3 className="text-2xl font-bold text-red-500">{totalAll.toLocaleString('en-US')} ج.م</h3>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                  <p className="text-gray-500 font-medium">مصروفات هذا الشهر</p>
                  <h3 className="text-2xl font-bold text-orange-500">{totalMonth.toLocaleString('en-US')} ج.م</h3>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                  <p className="text-gray-500 font-medium">عدد العمليات</p>
                  <h3 className="text-2xl font-bold text-gray-800">{expenses.length}</h3>
                </div>
              </div>
              {categoryTotals.length > 0 && (
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                  <h4 className="text-sm font-bold text-gray-700 mb-3">المصروفات حسب التصنيف</h4>
                  <div className="space-y-2">
                    {categoryTotals.map(([cat, total]) => (
                      <div key={cat} className="flex items-center gap-3">
                        <span className="text-xs text-gray-600 min-w-[120px]">{cat}</span>
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${Math.min(100, (total / totalAll) * 100)}%` }} />
                        </div>
                        <span className="text-xs font-bold text-gray-700 min-w-[80px] text-left">{total.toLocaleString('en-US')} ج.م</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div initial={{ height: 0, opacity: 0, marginBottom: 0 }} animate={{ height: 'auto', opacity: 1, marginBottom: 16 }} exit={{ height: 0, opacity: 0, marginBottom: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden shrink-0">
            <div className="p-1 pb-2">
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap gap-4">
                <div className="flex-1 min-w-[180px]">
                  <label className="block text-xs text-gray-500 mb-1">التصنيف</label>
                  <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="w-full p-2 border border-gray-200 rounded-lg bg-gray-50 text-sm outline-none focus:border-primary">
                    <option value="">الكل</option>
                    {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="flex-1 min-w-[180px]">
                  <label className="block text-xs text-gray-500 mb-1">طريقة الدفع</label>
                  <select value={filterPayment} onChange={e => setFilterPayment(e.target.value)} className="w-full p-2 border border-gray-200 rounded-lg bg-gray-50 text-sm outline-none focus:border-primary">
                    <option value="">الكل</option>
                    {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div className="w-full">
                  <label className="block text-xs text-gray-500 mb-1.5">الفترة الزمنية</label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {DATE_PRESETS.map(p => (
                      <button key={p.id}
                        onClick={() => { setDatePreset(p.id); if (p.id === 'all') { setDateFrom(''); setDateTo(''); } }}
                        className={`px-3 py-1 text-xs font-medium rounded-lg border transition-colors ${datePreset === p.id ? 'bg-primary border-primary text-white' : 'bg-white border-gray-200 text-gray-600 hover:border-primary hover:text-primary'}`}
                      >{p.label}</button>
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
              <span className="text-sm font-medium text-primary">{selectedIds.size} مصروف محدد</span>
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
                <th className="px-4 py-2.5 font-medium">التاريخ
                  <button onClick={() => toggleSort('date')} className="mr-1 inline-flex align-middle">
                    <ArrowUpDown size={12} className={`transition-colors ${sortField === 'date' ? 'text-primary' : 'text-gray-300'}`} />
                  </button>
                </th>
                <th className="px-6 py-2.5 font-medium">الوصف</th>
                <th className="px-4 py-2.5 font-medium">التصنيف</th>
                <th className="px-4 py-2.5 font-medium">المبلغ
                  <button onClick={() => toggleSort('amount')} className="mr-1 inline-flex align-middle">
                    <ArrowUpDown size={12} className={`transition-colors ${sortField === 'amount' ? 'text-primary' : 'text-gray-300'}`} />
                  </button>
                </th>
                <th className="px-4 py-2.5 font-medium">طريقة الدفع</th>
                <th className="px-4 py-2.5 font-medium text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-gray-400">
                    <ReceiptText size={48} className="mx-auto mb-3 opacity-50" />
                    <p className="text-lg font-medium">{expenses.length === 0 ? 'لا توجد مصروفات بعد' : 'لا توجد نتائج للبحث'}</p>
                    {expenses.length === 0 && <button onClick={openAdd} className="mt-3 px-4 py-2 bg-primary text-white rounded-lg text-sm">إضافة مصروف</button>}
                  </td>
                </tr>
              ) : filtered.map((expense) => (
                <tr key={expense.id} className={`hover:bg-gray-50 transition-colors group ${selectedIds.has(expense.id) ? 'bg-primary/5' : ''}`}>
                  <td className="px-3 py-2.5">
                    <button onClick={() => toggleSelect(expense.id)} className={`transition-colors ${selectedIds.has(expense.id) ? 'text-primary' : 'text-gray-300 hover:text-gray-400'}`}>
                      {selectedIds.has(expense.id) ? <CheckSquare size={16} /> : <Square size={16} />}
                    </button>
                  </td>
                  <td className="px-4 py-2.5 text-xs"><FormattedDate dateStr={expense.date} /></td>
                  <td className="px-6 py-2.5 font-medium text-gray-800 text-right">{expense.description}</td>
                  <td className="px-4 py-2.5">
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-md text-xs">{expense.category}</span>
                  </td>
                  <td className="px-4 py-2.5 font-bold text-red-500">{expense.amount.toLocaleString('en-US')} ج.م</td>
                  <td className="px-4 py-2.5 text-gray-500 text-xs">{expense.paymentMethod}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => openEdit(expense)} className="p-1.5 text-primary bg-primary-light hover:bg-primary hover:text-white rounded-md transition-colors" title="تعديل">
                        <Edit size={16} />
                      </button>
                      <button onClick={() => handleDelete(expense)} className="p-1.5 text-primary bg-primary-light hover:bg-primary hover:text-white rounded-md transition-colors" title="حذف">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500 shrink-0">
          <div>إجمالي {filtered.length} {expenses.length !== filtered.length ? `(من ${expenses.length}) ` : ''}مصروف — <strong className="text-red-500">{filtered.reduce((s, e) => s + e.amount, 0).toLocaleString('en-US')} ج.م</strong></div>
        </div>
      </div>


    </div>
  );
};
