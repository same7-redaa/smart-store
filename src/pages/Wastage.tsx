import React, { useState, useMemo, useRef } from 'react';
import { Plus, Search, Filter, Trash2, Download, X, CheckSquare, Square, Trash, ArrowUpDown, Calendar, Info, AlertTriangle, BarChart2, RotateCcw, PackageMinus } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useApp } from '../context/AppContext';
import { exportToExcel } from '../utils/excel';
import { FormattedDate } from '../components/FormattedDate';


const STORAGE_KEY_WASTAGE = 'my_wastage';
const STORAGE_KEY_PRODUCTS = 'my_products';

interface WastageLog {
  id: string;
  productId: string;
  productName: string;
  variantName?: string;
  sku: string;
  quantity: number;
  unitCost: number;
  totalLoss: number;
  reason: string; // 'damaged_return' or 'تلف مخزني' | 'فقدان مخزني' | 'آخر'
  notes?: string;
  createdAt: string;
}

const REASONS_MAP: Record<string, string> = {
  'damaged_return': 'مرتجع تالف (من الطلبات)',
  'تلف مخزني': 'تلف مخزني',
  'فقدان مخزني': 'فقدان مخزني',
  'آخر': 'آخر',
};

const DATE_PRESETS = [
  { id: 'today', label: 'اليوم' },
  { id: 'week', label: 'هذا الأسبوع' },
  { id: 'month', label: 'هذا الشهر' },
  { id: 'year', label: 'هذا العام' },
  { id: 'all', label: 'كل الفترات' },
] as const;

const parseDate = (dateStr: string): Date | null => {
  if (!dateStr) return null;
  const cleaned = dateStr.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString());
  const parts = cleaned.split('/');
  if (parts.length === 3) {
    const d = parseInt(parts[0]), m = parseInt(parts[1]) - 1, y = parseInt(parts[2]);
    if (!isNaN(d) && !isNaN(m) && !isNaN(y)) return new Date(y, m, d);
  }
  const date = new Date(cleaned);
  if (!isNaN(date.getTime())) return date;
  return null;
};

const getPresetRange = (preset: string): { from: string; to: string } | null => {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth(), d = now.getDate();
  switch (preset) {
    case 'today': return { from: new Date(y, m, d).toISOString().split('T')[0], to: new Date(y, m, d).toISOString().split('T')[0] };
    case 'week': {
      const dayOfWeek = now.getDay();
      const monday = new Date(y, m, d - ((dayOfWeek + 6) % 7));
      const sunday = new Date(y, m, monday.getDate() + 6);
      return { from: monday.toISOString().split('T')[0], to: sunday.toISOString().split('T')[0] };
    }
    case 'month': return { from: new Date(y, m, 1).toISOString().split('T')[0], to: new Date(y, m + 1, 0).toISOString().split('T')[0] };
    case 'year': return { from: new Date(y, 0, 1).toISOString().split('T')[0], to: new Date(y, 11, 31).toISOString().split('T')[0] };
    default: return null;
  }
};

interface WastageProps {
  setActivePage?: (page: any) => void;
}

export const Wastage: React.FC<WastageProps> = ({ setActivePage }) => {
  const { notify, confirm } = useApp();
  const [logs, setLogs] = useState<WastageLog[]>(() => {
    const raw = localStorage.getItem(STORAGE_KEY_WASTAGE);
    return raw ? JSON.parse(raw) : [];
  });

  const [products, setProducts] = useState<any[]>(() => {
    const raw = localStorage.getItem(STORAGE_KEY_PRODUCTS);
    return raw ? JSON.parse(raw) : [];
  });

  const [showStats, setShowStats] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterReason, setFilterReason] = useState('');
  const [datePreset, setDatePreset] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 15;

  // Sorting
  const [sortField, setSortField] = useState<'createdAt' | 'totalLoss'>('createdAt');
  const [sortDir, setSortDir] = useState<'ASC' | 'DESC'>('DESC');

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterReason, datePreset, dateFrom, dateTo, sortField, sortDir]);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredLogs.length && filteredLogs.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredLogs.map(l => l.id)));
    }
  };

  const saveLogs = (newLogs: WastageLog[]) => {
    localStorage.setItem(STORAGE_KEY_WASTAGE, JSON.stringify(newLogs));
    setLogs(newLogs);
  };

  const deleteSelected = () => {
    confirm({
      title: 'حذف السجلات المحددة',
      message: `هل أنت متأكد من حذف ${selectedIds.size} سجل؟ لن يتم استرجاع الكميات تلقائياً.`,
      onConfirm: () => {
        const remaining = logs.filter(l => !selectedIds.has(l.id));
        saveLogs(remaining);
        setSelectedIds(new Set());
        notify('success', `تم حذف ${selectedIds.size} سجل بنجاح`);
      }
    });
  };


  const filteredLogs = useMemo(() => {
    let result = [...logs];

    // Filter by date
    const effectiveFrom = datePreset !== 'custom' && datePreset !== 'all' ? getPresetRange(datePreset)?.from || dateFrom : dateFrom;
    const effectiveTo = datePreset !== 'custom' && datePreset !== 'all' ? getPresetRange(datePreset)?.to || dateTo : dateTo;
    
    if (effectiveFrom || effectiveTo) {
      const fromDate = effectiveFrom ? new Date(effectiveFrom + 'T00:00:00') : null;
      const toDate = effectiveTo ? new Date(effectiveTo + 'T23:59:59') : null;
      result = result.filter(l => {
        const d = parseDate(l.createdAt);
        if (!d) return true;
        if (fromDate && d < fromDate) return false;
        if (toDate && d > toDate) return false;
        return true;
      });
    }

    // Filter by reason
    if (filterReason) {
      result = result.filter(l => l.reason === filterReason);
    }

    // Search by product name or SKU
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter(l => 
        l.productName.toLowerCase().includes(q) || 
        (l.sku && l.sku.toLowerCase().includes(q))
      );
    }

    // Sorting
    result.sort((a, b) => {
      const dir = sortDir === 'ASC' ? 1 : -1;
      if (sortField === 'totalLoss') return (a.totalLoss - b.totalLoss) * dir;
      return (a.createdAt || '').localeCompare(b.createdAt || '') * dir;
    });

    return result;
  }, [logs, searchQuery, filterReason, sortField, sortDir, datePreset, dateFrom, dateTo]);

  const totalPages = Math.ceil(filteredLogs.length / ITEMS_PER_PAGE) || 1;
  const currentLogs = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredLogs.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredLogs, currentPage]);

  // Statistics
  const totalWastedPieces = useMemo(() => {
    return filteredLogs.reduce((acc, curr) => acc + curr.quantity, 0);
  }, [filteredLogs]);

  const totalWastedLoss = useMemo(() => {
    return filteredLogs.reduce((acc, curr) => acc + curr.totalLoss, 0);
  }, [filteredLogs]);

  const affectedProductsCount = useMemo(() => {
    const ids = new Set(filteredLogs.map(l => l.productId));
    return ids.size;
  }, [filteredLogs]);

  const toggleSort = (field: 'createdAt' | 'totalLoss') => {
    if (sortField === field) {
      setSortDir(sortDir === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setSortField(field);
      setSortDir('DESC');
    }
  };

  const handleExport = () => {
    if (!filteredLogs.length) {
      notify('info', 'لا يوجد هالك متاح للتصدير حالياً');
      return;
    }
    const data = filteredLogs.map((l, i) => ({
      'المسلسل': i + 1,
      'المنتج': l.productName,
      'المتغير': l.variantName || '—',
      'كود المخزن SKU': l.sku || '—',
      'الكمية الهالكة': l.quantity,
      'تكلفة القطعة': l.unitCost,
      'إجمالي الخسارة': l.totalLoss,
      'سبب الهالك': REASONS_MAP[l.reason] || l.reason,
      'التاريخ': l.createdAt,
      'ملاحظات': l.notes || '—',
    }));
    exportToExcel(data, [
      { key: 'المسلسل', header: 'م', width: 6 },
      { key: 'المنتج', header: 'اسم المنتج', width: 25 },
      { key: 'المتغير', header: 'المتغير', width: 15 },
      { key: 'كود المخزن SKU', header: 'كود المخزن SKU', width: 15 },
      { key: 'الكمية الهالكة', header: 'الكمية الهالكة', width: 12 },
      { key: 'تكلفة القطعة', header: 'تكلفة القطعة', width: 12 },
      { key: 'إجمالي الخسارة', header: 'إجمالي الخسارة (ج.م)', width: 16 },
      { key: 'سبب الهالك', header: 'سبب الهالك', width: 20 },
      { key: 'التاريخ', header: 'التاريخ والوقت', width: 18 },
      { key: 'ملاحظات', header: 'ملاحظات', width: 25 },
    ], 'wastage_logs');
    notify('success', `تم تصدير سجل الهالك بنجاح`);
  };

  const deleteLog = (id: string) => {
    confirm({
      title: 'حذف سجل الهالك والتاكيد',
      message: 'هل أنت متأكد من حذف هذا السجل؟ لن يتم استرجاع كمية المخزون التالفة تلقائياً تجنباً للمشاكل المحاسبية.',
      onConfirm: () => {
        const filtered = logs.filter(l => l.id !== id);
        saveLogs(filtered);
        notify('success', 'تم حذف سجل الهالك بنجاح');
      }
    });
  };

  return (
    <div className="flex flex-col">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-3 shrink-0 bg-white p-3 rounded-xl shadow-sm border border-gray-100 mb-4">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button 
            onClick={() => setShowStats(!showStats)}
            className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm font-medium transition-colors cursor-pointer ${
              showStats 
                ? 'bg-primary-light border-primary-light text-primary' 
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <BarChart2 size={16} />
            <span>الإحصائيات</span>
          </button>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm font-medium transition-colors cursor-pointer ${
              showFilters || filterReason || datePreset !== 'all'
                ? 'bg-primary-light border-primary-light text-primary' 
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Filter size={16} />
            <span>تصفية</span>
          </button>
          <button 
            onClick={handleExport} 
            className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <Download size={16} className="text-[#00c950]" />
            <span>تصدير</span>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400">
              <Search size={16} />
            </span>
            <input 
              type="text" 
              placeholder="ابحث باسم المنتج أو الـ SKU..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full py-2 pr-10 pl-4 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none text-sm text-right font-medium text-gray-800"
            />
          </div>
          <button
            onClick={() => setActivePage && setActivePage('add-wastage')}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white font-medium rounded-lg hover:bg-primary-hover transition-colors shadow-sm w-full sm:w-auto cursor-pointer"
          >
            <Plus size={20} />
            <span>تسجيل هالك يدوي</span>
          </button>
        </div>
      </div>

      {/* Collapsible Stats Panel */}
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
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Card 1: إجمالي عمليات الهالك */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                  <p className="text-gray-500 font-medium">عدد عمليات الهالك</p>
                  <h3 className="text-2xl font-bold text-gray-800">{filteredLogs.length}</h3>
                </div>
                {/* Card 2: إجمالي القطع الهالكة */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                  <p className="text-gray-500 font-medium">إجمالي القطع الهالكة</p>
                  <h3 className="text-2xl font-bold text-red-500">{totalWastedPieces.toLocaleString('en-US')}</h3>
                </div>
                {/* Card 3: إجمالي خسائر الهالك */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                  <p className="text-gray-500 font-medium">إجمالي خسائر الهالك</p>
                  <h3 className="text-2xl font-bold text-[#00c950]">{totalWastedLoss.toLocaleString('en-US')} ج.م</h3>
                </div>
                {/* Card 4: المنتجات المتأثرة */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                  <p className="text-gray-500 font-medium">المنتجات المتأثرة</p>
                  <h3 className="text-2xl font-bold text-blue-500">{affectedProductsCount.toLocaleString('en-US')}</h3>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Collapsible Filters Panel */}
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
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4">
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-xs text-gray-500 mb-1">سبب الهالك</label>
                  <select 
                    value={filterReason} 
                    onChange={e => setFilterReason(e.target.value)} 
                    className="w-full p-2 border border-gray-200 rounded-lg bg-gray-50 text-sm outline-none focus:border-primary text-right"
                  >
                    <option value="">كل الأسباب</option>
                    <option value="damaged_return">مرتجع تالف من المبيعات</option>
                    <option value="تلف مخزني">تلف مخزني</option>
                    <option value="فقدان مخزني">فقدان مخزني</option>
                    <option value="آخر">آخر</option>
                  </select>
                </div>
                
                <div className="flex-1 min-w-[300px]">
                  <label className="block text-xs text-gray-500 mb-1.5">الفترة الزمنية</label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {DATE_PRESETS.map(p => (
                      <button key={p.id}
                        onClick={() => {
                          setDatePreset(p.id);
                          setDateFrom('');
                          setDateTo('');
                        }}
                        className={`px-3 py-1 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                          datePreset === p.id 
                            ? 'bg-primary border-primary text-white' 
                            : 'bg-white border-gray-200 text-gray-600 hover:border-primary hover:text-primary'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                    <button
                      onClick={() => setDatePreset('custom')}
                      className={`px-3 py-1 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                        datePreset === 'custom' 
                          ? 'bg-primary border-primary text-white' 
                          : 'bg-white border-gray-200 text-gray-600 hover:border-primary hover:text-primary'
                      }`}
                    >
                      تاريخ مخصص
                    </button>
                  </div>
                  {datePreset === 'custom' && (
                    <div className="flex items-center gap-2 animate-fadeIn">
                      <input type="date" value={dateFrom}
                        onChange={e => { setDateFrom(e.target.value); setDatePreset('custom'); }}
                        className="flex-1 p-2 border border-gray-200 rounded-lg bg-gray-50 text-sm outline-none focus:border-primary text-center" />
                      <span className="text-xs text-gray-400">إلى</span>
                      <input type="date" value={dateTo}
                        onChange={e => { setDateTo(e.target.value); setDatePreset('custom'); }}
                        className="flex-1 p-2 border border-gray-200 rounded-lg bg-gray-50 text-sm outline-none focus:border-primary text-center" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk Selection Action Bar */}
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
              <span className="text-sm font-medium text-primary">{selectedIds.size} سجل محدد</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={deleteSelected}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 text-white text-xs font-medium rounded-lg hover:bg-red-600 transition-colors cursor-pointer"
                >
                  <Trash size={14} /> حذف المحدد
                </button>
                <button
                  onClick={() => setSelectedIds(new Set())}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
                >
                  <X size={14} /> إلغاء التحديد
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Container */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
        {/* Wastage Logs Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-gray-50/50 text-gray-400 text-xs font-bold border-b border-gray-200">
                <th className="p-4 w-10 text-center">
                  <button onClick={toggleSelectAll} className="text-gray-400 hover:text-primary transition-colors cursor-pointer">
                    {selectedIds.size === filteredLogs.length && filteredLogs.length > 0 ? <CheckSquare size={16} /> : <Square size={16} />}
                  </button>
                </th>
                <th className="p-4 w-10 text-center">م</th>
                <th className="p-4">المنتج والتفاصيل</th>
                <th className="p-4 text-center cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => toggleSort('totalLoss')}>
                  <div className="flex items-center justify-center gap-1">
                    <span>الكمية والخسارة</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>
                <th className="p-4">السبب والملاحظات</th>
                <th className="p-4 text-center cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => toggleSort('createdAt')}>
                  <div className="flex items-center justify-center gap-1">
                    <span>التاريخ والوقت</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>
                <th className="p-4 w-20 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {currentLogs.length > 0 ? (
                currentLogs.map((l, i) => {
                  const Icon = l.reason === 'damaged_return' ? RotateCcw :
                               l.reason === 'تلف مخزني' ? PackageMinus :
                               l.reason === 'فقدان مخزني' ? AlertTriangle : Info;

                  return (
                  <tr key={l.id} className={`hover:bg-gray-50/40 transition-colors text-sm text-gray-700 ${selectedIds.has(l.id) ? 'bg-primary/5' : ''}`}>
                    <td className="p-4 text-center">
                      <button onClick={() => toggleSelect(l.id)} className={`transition-colors cursor-pointer ${selectedIds.has(l.id) ? 'text-primary' : 'text-gray-300 hover:text-gray-400'}`}>
                        {selectedIds.has(l.id) ? <CheckSquare size={16} /> : <Square size={16} />}
                      </button>
                    </td>
                    <td className="p-4 text-center font-semibold text-gray-400">{(currentPage - 1) * ITEMS_PER_PAGE + i + 1}</td>
                    
                    <td className="p-4 font-semibold text-gray-900">
                      <div>
                        <p>{l.productName}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          {l.variantName && (
                            <span className="inline-block px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-md font-medium">
                              {l.variantName}
                            </span>
                          )}
                          {l.sku && (
                            <span className="inline-block text-xs font-mono text-gray-400">#{l.sku}</span>
                          )}
                        </div>
                      </div>
                    </td>
                    
                    <td className="p-4 text-center">
                      <div className="font-bold text-red-600 text-base">{l.totalLoss.toLocaleString('en-US')} ج.م</div>
                      <div className="text-xs text-gray-400 mt-1 font-medium">{l.quantity} قطع × {l.unitCost.toLocaleString('en-US')} ج.م</div>
                    </td>
                    
                    <td className="p-4">
                      <div className="flex flex-col items-start gap-1">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                          l.reason === 'damaged_return' 
                            ? 'bg-orange-50 text-orange-600 border border-orange-200' 
                            : 'bg-red-50 text-red-600 border border-red-200'
                        }`}>
                          <Icon size={12} />
                          {REASONS_MAP[l.reason] || l.reason}
                        </span>
                        {l.notes && (
                          <span className="text-[11px] text-gray-400 max-w-[200px] truncate" title={l.notes}>
                            {l.notes}
                          </span>
                        )}
                      </div>
                    </td>
                    
                    <td className="p-4 text-center">
                      <FormattedDate dateStr={l.createdAt} />
                    </td>
                    
                    <td className="p-4 text-center">
                      <button 
                        onClick={() => deleteLog(l.id)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                )})
              ) : (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-gray-400 font-bold">
                    لا يوجد أي عمليات هالك مسجلة متطابقة مع البحث
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-gray-500 shrink-0">
          <div>إجمالي {filteredLogs.length} سجل</div>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
              >
                السابق
              </button>
              <div className="px-2 font-medium">
                {currentPage} / {totalPages}
              </div>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
              >
                التالي
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
