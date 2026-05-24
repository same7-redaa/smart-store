import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Edit, Trash2, Save, X, Tag, Search, Folder as FolderIcon, CheckSquare, Square, Trash } from 'lucide-react';
import FloatingInput from '../components/FloatingInput';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../context/AppContext';

const STORAGE_KEY = 'my_categories';

interface Category {
  id: string;
  name: string;
  createdAt: string;
}

const defaultCategories: Category[] = [
  { id: 'electronics', name: 'إلكترونيات', createdAt: '2025-01-01' },
  { id: 'clothing', name: 'ملابس', createdAt: '2025-01-01' },
  { id: 'shoes', name: 'أحذية', createdAt: '2025-01-01' },
];

export const Categories: React.FC<{ setActivePage?: (p: any) => void }> = ({ setActivePage }) => {
  const { confirm, notify } = useApp();
  const [list, setList] = useState<Category[]>(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultCategories));
    return defaultCategories;
  });
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<Category | null>(null);
  const [formName, setFormName] = useState('');
  const [formId, setFormId] = useState('');
  const [showStats, setShowStats] = useState(false);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(c => c.name.toLowerCase().includes(q) || c.id.toLowerCase().includes(q));
  }, [list, search]);

  const save = (newList: Category[]) => {
    setList(newList);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newList));
  };

  const openAdd = () => {
    setEditItem(null);
    setFormName('');
    setFormId('');
    setShowForm(true);
  };

  const openEdit = (c: Category) => {
    setEditItem(c);
    setFormName(c.name);
    setFormId(c.id);
    setShowForm(true);
  };

  const handleSave = () => {
    const name = formName.trim();
    if (!name) { notify('error', 'الرجاء إدخال اسم الفئة'); return; }

    if (editItem) {
      const updated = list.map(c => c.id === editItem.id ? { ...c, name } : c);
      save(updated);
      notify('success', 'تم تعديل الفئة');
    } else {
      const id = formId.trim() || name.toLowerCase().replace(/\s+/g, '-');
      if (list.find(c => c.id === id)) {
        notify('error', 'هذا المعرف موجود بالفعل');
        return;
      }
      save([...list, { id, name, createdAt: new Date().toLocaleDateString('ar-EG-u-nu-latn') }]);
      notify('success', 'تم إضافة الفئة');
    }
    setShowForm(false);
    setEditItem(null);
  };

  const handleDelete = (c: Category) => {
    confirm({
      title: 'حذف الفئة',
      message: `هل أنت متأكد من حذف "${c.name}"؟`,
      onConfirm: () => {
        save(list.filter(x => x.id !== c.id));
        notify('success', 'تم حذف الفئة');
      },
    });
  };

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
      setSelectedIds(new Set(filtered.map(c => c.id)));
    }
  };

  const clearSelection = () => setSelectedIds(new Set());

  const handleBulkDelete = () => {
    if (!selectedIds.size) return;
    confirm({
      title: 'حذف الفئات المحددة',
      message: `هل أنت متأكد من حذف ${selectedIds.size} فئة؟`,
      onConfirm: () => {
        save(list.filter(c => !selectedIds.has(c.id)));
        notify('success', `تم حذف ${selectedIds.size} فئة`);
        setSelectedIds(new Set());
      },
    });
  };

  const getProductCount = (catId: string) => {
    const products: any[] = JSON.parse(localStorage.getItem('my_products') || '[]');
    return products.filter(p => p.category === catId).length;
  };

  const allSelected = filtered.length > 0 && selectedIds.size === filtered.length;

  return (
    <div className="flex flex-col h-full">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-3 shrink-0 bg-white p-3 rounded-xl shadow-sm border border-gray-100 mb-4">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button onClick={() => setShowStats(!showStats)}
            className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm font-medium transition-colors ${showStats ? 'bg-primary-light border-primary-light text-primary' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
          ><FolderIcon size={16} /><span>الإحصائيات</span></button>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400"><Search size={16} /></span>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="ابحث عن فئة..." className="w-full py-2 pr-10 pl-4 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none text-sm" />
          </div>
          <button onClick={() => setActivePage?.('add-category')} className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white font-medium rounded-lg hover:bg-primary-hover transition-colors shadow-sm w-full sm:w-auto">
            <Plus size={20} /><span>إضافة فئة</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <AnimatePresence>
        {showStats && (
          <motion.div initial={{ height: 0, opacity: 0, marginBottom: 0 }} animate={{ height: 'auto', opacity: 1, marginBottom: 16 }} exit={{ height: 0, opacity: 0, marginBottom: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden shrink-0">
            <div className="p-1 pb-2">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                  <p className="text-gray-500 font-medium">إجمالي الفئات</p>
                  <h3 className="text-2xl font-bold text-gray-800">{list.length}</h3>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                  <p className="text-gray-500 font-medium">منتجات مرتبطة</p>
                  <h3 className="text-2xl font-bold text-primary">{list.reduce((s, c) => s + getProductCount(c.id), 0)}</h3>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                  <p className="text-gray-500 font-medium">متوسط المنتجات لكل فئة</p>
                  <h3 className="text-2xl font-bold text-gray-800">{list.length ? Math.round(list.reduce((s, c) => s + getProductCount(c.id), 0) / list.length) : 0}</h3>
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
              <span className="text-sm font-medium text-primary">{selectedIds.size} فئة محددة</span>
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
                <th className="px-3 py-3 w-10">
                  <button onClick={toggleSelectAll} className={`transition-colors ${allSelected ? 'text-primary' : 'text-gray-300 hover:text-gray-400'}`}>
                    {allSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                  </button>
                </th>
                <th className="px-6 py-3 font-medium">المعرف</th>
                <th className="px-6 py-3 font-medium">اسم الفئة</th>
                <th className="px-6 py-3 font-medium">عدد المنتجات</th>
                <th className="px-6 py-3 font-medium">تاريخ الإضافة</th>
                <th className="px-6 py-3 font-medium text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="py-16 text-center text-gray-400">
                  <FolderIcon size={48} className="mx-auto mb-3 opacity-50" />
                  <p className="text-lg font-medium">{list.length === 0 ? 'لا توجد فئات بعد' : 'لا توجد نتائج للبحث'}</p>
                  {list.length === 0 && <button onClick={() => setActivePage?.('add-category')} className="mt-3 px-4 py-2 bg-primary text-white rounded-lg text-sm">إضافة فئة</button>}
                </td></tr>
              ) : filtered.map((c) => (
                <tr key={c.id} className={`hover:bg-gray-50 transition-colors group ${selectedIds.has(c.id) ? 'bg-primary/5' : ''}`}>
                  <td className="px-3 py-3">
                    <button onClick={() => toggleSelect(c.id)} className={`transition-colors ${selectedIds.has(c.id) ? 'text-primary' : 'text-gray-300 hover:text-gray-400'}`}>
                      {selectedIds.has(c.id) ? <CheckSquare size={16} /> : <Square size={16} />}
                    </button>
                  </td>
                  <td className="px-6 py-3 font-mono text-xs text-primary font-bold">{c.id}</td>
                  <td className="px-6 py-3 font-medium text-gray-800">{c.name}</td>
                  <td className="px-6 py-3">
                    <span className="px-2.5 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">{getProductCount(c.id)}</span>
                  </td>
                  <td className="px-6 py-3 text-gray-500">{c.createdAt}</td>
                  <td className="px-6 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => openEdit(c)} className="p-1.5 text-primary bg-primary-light hover:bg-primary hover:text-white rounded-md transition-colors" title="تعديل">
                        <Edit size={16} />
                      </button>
                      <button onClick={() => handleDelete(c)} className="p-1.5 text-primary bg-primary-light hover:bg-primary hover:text-white rounded-md transition-colors" title="حذف">
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
          <div>إجمالي {filtered.length} {list.length !== filtered.length ? `(من ${list.length}) ` : ''}فئة</div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4" onClick={() => setShowForm(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} transition={{ type: 'spring', duration: 0.3 }} className="bg-white rounded-2xl shadow-xl border border-gray-100 w-full max-w-md" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-4 border-b border-gray-100">
                <h2 className="text-sm font-bold text-gray-800">{editItem ? 'تعديل الفئة' : 'إضافة فئة جديدة'}</h2>
                <button onClick={() => setShowForm(false)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"><X size={16} /></button>
              </div>
              <div className="p-4 space-y-3">
                <FloatingInput label="اسم الفئة" value={formName} onChange={e => setFormName(e.target.value)} required icon={<Tag size={16} />} placeholder="اسم الفئة" />
                {!editItem && (
                  <div>
                    <FloatingInput label="المعرف الداخلي" value={formId} onChange={e => setFormId(e.target.value)} placeholder="identifier (مثال: electronics)" />
                    <p className="text-[10px] text-gray-400 mt-1">سيتم استخدام المعرف تلقائياً في النظام. اتركه فارغاً لاستخدام اسم الفئة.</p>
                  </div>
                )}
              </div>
              <div className="flex gap-2 p-4 border-t border-gray-100">
                <button onClick={handleSave} className="flex items-center justify-center gap-2 flex-1 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-hover transition-colors">
                  <Save size={16} /> {editItem ? 'حفظ التعديلات' : 'إضافة الفئة'}
                </button>
                <button onClick={() => setShowForm(false)} className="flex-1 py-2 bg-gray-100 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors">إلغاء</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>


    </div>
  );
};
