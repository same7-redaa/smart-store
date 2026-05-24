import React, { useState, useRef, useEffect } from 'react';
import { ArrowRight, Save, Plus, Trash2, Search, X, Package, DollarSign, Minus, Building2, FileText, Barcode, Tag, AlertTriangle, Folder, Hash } from 'lucide-react';
import FloatingInput from '../components/FloatingInput';
import FloatingSelect from '../components/FloatingSelect';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../context/AppContext';

interface PurchaseProductsProps {
  setActivePage: (page: any) => void;
}

interface PurchaseItem {
  name: string;
  sku: string;
  barcode: string;
  category: string;
  sellingPrice: number;
  costPrice: number;
  quantity: number;
  variant: string;
  isNew: boolean;
}

const CATEGORIES = ['إلكترونيات', 'مواد تعبئة', 'متنوع', 'إكسسوارات', 'مواد خام', 'خدمات', 'ملابس', 'مواد غذائية'];

export const PurchaseProducts: React.FC<PurchaseProductsProps> = ({ setActivePage }) => {
  const { notify } = useApp();
  const supplier = JSON.parse(localStorage.getItem('purchase_supplier') || 'null');

  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [search, setSearch] = useState('');
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Quick add / edit form
  const [showForm, setShowForm] = useState(false);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [fName, setFName] = useState('');
  const [fSku, setFSku] = useState('');
  const [fBarcode, setFBarcode] = useState('');
  const [fCategory, setFCategory] = useState('');
  const [fSell, setFSell] = useState('');
  const [fCost, setFCost] = useState('');
  const [fQty, setFQty] = useState('1');
  const [fVariant, setFVariant] = useState('');

  const products: any[] = JSON.parse(localStorage.getItem('my_products') || '[]');
  const filtered = search.trim()
    ? products.filter((p: any) =>
        p.name?.toLowerCase().includes(search.trim().toLowerCase()) ||
        p.sku?.toLowerCase().includes(search.trim().toLowerCase())
      )
    : [];

  useEffect(() => {
    if (!supplier) setActivePage('purchases');
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowResults(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const selectProduct = (p: any) => {
    setFName(p.name || '');
    setFSku(p.sku || '');
    setFBarcode(p.barcode || '');
    setFCategory(p.category || '');
    setFSell(p.sellingPrice?.toString() || '');
    setFCost(p.costPrice?.toString() || '');
    setFQty('1');
    setFVariant('');
    setSearch('');
    setShowResults(false);
    setEditIdx(null);
    setShowForm(true);
  };

  const resetForm = () => {
    setFName(''); setFSku(''); setFBarcode(''); setFCategory('');
    setFSell(''); setFCost(''); setFQty('1'); setFVariant('');
    setEditIdx(null); setShowForm(false);
  };

  const addItem = () => {
    if (!fName.trim()) { notify('error', 'الرجاء إدخال اسم المنتج'); return; }
    const qty = Number(fQty) || 1;

    if (editIdx !== null) {
      setItems(items.map((item, i) => i === editIdx ? {
        ...item,
        name: fName.trim(),
        sku: fSku.trim(),
        barcode: fBarcode.trim(),
        category: fCategory,
        sellingPrice: Number(fSell) || 0,
        costPrice: Number(fCost) || 0,
        quantity: qty,
        variant: fVariant.trim(),
      } : item));
    } else {
      setItems([...items, {
        name: fName.trim(),
        sku: fSku.trim(),
        barcode: fBarcode.trim(),
        category: fCategory,
        sellingPrice: Number(fSell) || 0,
        costPrice: Number(fCost) || 0,
        quantity: qty,
        variant: fVariant.trim(),
        isNew: !products.some((p: any) => p.sku === fSku.trim() && p.sku),
      }]);
    }
    resetForm();
  };

  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));
  const editItem = (idx: number) => {
    const item = items[idx];
    setFName(item.name); setFSku(item.sku); setFBarcode(item.barcode);
    setFCategory(item.category); setFSell(String(item.sellingPrice));
    setFCost(String(item.costPrice)); setFQty(String(item.quantity));
    setFVariant(item.variant); setEditIdx(idx); setShowForm(true);
  };

  const updateQty = (idx: number, delta: number) => {
    setItems(items.map((item, i) => i === idx ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item));
  };

  const total = items.reduce((sum, i) => sum + i.quantity * i.costPrice, 0);

  const handleSave = () => {
    if (items.length === 0) { notify('error', 'الرجاء إضافة منتجات للشراء'); return; }
    setIsSaving(true);

    // Update/create products in inventory
    const myProducts: any[] = JSON.parse(localStorage.getItem('my_products') || '[]');
    items.forEach(item => {
      const existing = myProducts.findIndex((p: any) => p.sku === item.sku && item.sku);
      if (existing > -1) {
        myProducts[existing].stock = (myProducts[existing].stock || 0) + item.quantity;
        if (item.costPrice) myProducts[existing].costPrice = item.costPrice;
        if (item.sellingPrice) myProducts[existing].sellingPrice = item.sellingPrice;
      } else {
        myProducts.push({
          id: `PRD-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name: item.name,
          sku: item.sku || `SKU-${Date.now()}`,
          barcode: item.barcode,
          category: item.category,
          sellingPrice: item.sellingPrice,
          costPrice: item.costPrice,
          stock: item.quantity,
          status: 'متوفر',
          createdAt: new Date().toLocaleDateString('ar-EG-u-nu-latn'),
        });
      }
    });
    localStorage.setItem('my_products', JSON.stringify(myProducts));

    // Record purchase invoice under supplier
    if (supplier) {
      const suppliers: any[] = JSON.parse(localStorage.getItem('my_suppliers') || '[]');
      const idx = suppliers.findIndex((s: any) => s.id === supplier.id);
      if (idx > -1) {
        if (!suppliers[idx].invoices) suppliers[idx].invoices = [];
        suppliers[idx].invoices.push({
          id: `INV-${Date.now()}`,
          date: new Date().toLocaleDateString('ar-EG-u-nu-latn'),
          items: items.map(i => ({
            productName: i.name,
            variantName: i.variant,
            sku: i.sku,
            quantity: i.quantity,
            price: i.costPrice,
            total: i.quantity * i.costPrice,
          })),
          total,
          paid: 0,
          notes: 'مشتريات',
        });
        suppliers[idx].supplied = (suppliers[idx].supplied || 0) + items.reduce((s, i) => s + i.quantity, 0);
        suppliers[idx].dues = (suppliers[idx].dues || 0) + total;
        suppliers[idx].totalInvoices = (suppliers[idx].totalInvoices || 0) + 1;
        localStorage.setItem('my_suppliers', JSON.stringify(suppliers));
      }
    }

    setIsSaving(false);
    notify('success', `تم شراء ${items.length} منتجات وإضافتها للمخزون`);
    setActivePage('purchases');
  };

  if (!supplier) return null;

  return (
    <div className="flex flex-col w-full pb-10">
      {/* Top Bar */}
      <div className="flex items-center justify-between gap-3 bg-white p-3 px-5 rounded-xl shadow-sm border border-gray-100 mb-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setActivePage('purchases')} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"><ArrowRight size={20} /></button>
          <div>
            <h1 className="text-lg font-bold text-gray-800">شراء منتجات</h1>
            <p className="text-xs text-gray-500">من <strong className="text-primary">{supplier.name}</strong></p>
          </div>
        </div>
        <button onClick={handleSave} disabled={isSaving || items.length === 0}
          className="flex items-center gap-2 px-4 py-1.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-hover transition-colors shadow-sm disabled:opacity-50">
          <Save size={16} />
          <span>{isSaving ? 'جاري الحفظ...' : 'حفظ المشتريات'}</span>
        </button>
      </div>

      {/* Product Search */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-4">
        <div ref={searchRef} className="relative mb-3">
          <label className="block text-xs font-medium text-gray-700 mb-1">البحث عن منتج موجود</label>
          <div className="relative">
            <span className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-gray-400"><Search size={14} /></span>
            <input type="text" value={search} onChange={e => { setSearch(e.target.value); setShowResults(true); }} onFocus={() => search && setShowResults(true)}
              className="w-full py-2 pr-9 pl-3 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:border-primary transition-all outline-none text-sm" placeholder="ابحث بالاسم أو الكود..." />
          </div>
          {showResults && filtered.length > 0 && (
            <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
              {filtered.map((p: any, i: number) => (
                <button key={i} onClick={() => selectProduct(p)} className="w-full flex items-center justify-between gap-2 px-3 py-2.5 hover:bg-gray-50 border-b border-gray-50 last:border-0 text-right transition-colors text-sm">
                  <div className="flex items-center gap-2">
                    <Package size={14} className="text-gray-400" />
                    <span className="font-medium">{p.name}</span>
                    {p.sku && <span className="text-[10px] text-gray-400 font-mono">{p.sku}</span>}
                  </div>
                  <span className="text-xs text-gray-400">المخزون: {p.stock ?? 0}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <button onClick={() => { resetForm(); setShowForm(true); }}
          className="flex items-center gap-2 text-sm text-primary font-medium hover:text-primary-hover transition-colors">
          <Plus size={16} /> إضافة منتج جديد
        </button>
      </div>

      {/* Product Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden mb-4">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-3 pb-2 border-b">
                <h2 className="text-sm font-bold text-gray-800">{editIdx !== null ? 'تعديل المنتج' : 'إضافة منتج جديد'}</h2>
                <button onClick={resetForm} className="p-1 text-gray-400 hover:text-gray-600"><X size={16} /></button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <FloatingInput label="اسم المنتج" value={fName} onChange={e => setFName(e.target.value)} icon={<Tag size={14} />} required className="sm:col-span-2 md:col-span-4" />
                <FloatingInput label="SKU" value={fSku} onChange={e => setFSku(e.target.value)} icon={<Hash size={14} />} placeholder="كود المنتج" />
                <FloatingInput label="باركود" value={fBarcode} onChange={e => setFBarcode(e.target.value)} icon={<Barcode size={14} />} placeholder="باركود" />
                <FloatingSelect label="التصنيف" value={fCategory} onChange={e => setFCategory(e.target.value)} icon={<Folder size={14} />}>
                  <option value="">اختر</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </FloatingSelect>
                <FloatingInput label="المقاس / اللون" value={fVariant} onChange={e => setFVariant(e.target.value)} placeholder="المقاس / اللون" />
                <FloatingInput label="سعر التكلفة" value={fCost} onChange={e => setFCost(e.target.value)} type="number" icon={<DollarSign size={14} />} endAdornment={<span>ج.م</span>} />
                <FloatingInput label="سعر البيع" value={fSell} onChange={e => setFSell(e.target.value)} type="number" icon={<DollarSign size={14} />} endAdornment={<span>ج.م</span>} />
                <FloatingInput label="الكمية المشتراة" value={fQty} onChange={e => setFQty(e.target.value)} type="number" icon={<Package size={14} />} required />
              </div>
              <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                <button onClick={addItem} className="flex-1 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-hover transition-colors">
                  {editIdx !== null ? 'تحديث المنتج' : 'إضافة للقائمة'}
                </button>
                <button onClick={resetForm} className="px-4 py-2 bg-gray-100 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors">إلغاء</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Purchase Items List */}
      {items.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="overflow-x-auto">
            <table className="w-full text-center border-collapse">
              <thead className="sticky top-0 bg-gray-50">
                <tr className="text-gray-500 text-xs border-b border-gray-100">
                  <th className="p-2.5 font-medium">المنتج</th>
                  <th className="p-2.5 font-medium">SKU</th>
                  <th className="p-2.5 font-medium">المقاس</th>
                  <th className="p-2.5 font-medium">التكلفة</th>
                  <th className="p-2.5 font-medium">البيع</th>
                  <th className="p-2.5 font-medium">الكمية</th>
                  <th className="p-2.5 font-medium">الإجمالي</th>
                  <th className="p-2.5 font-medium w-20"></th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-gray-50">
                {items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="p-2.5 font-medium text-gray-800">{item.name}</td>
                    <td className="p-2.5 text-xs text-gray-500 font-mono">{item.sku || '—'}</td>
                    <td className="p-2.5 text-gray-500">{item.variant || '—'}</td>
                    <td className="p-2.5 text-gray-700">{item.costPrice.toLocaleString('en-US')}</td>
                    <td className="p-2.5 text-gray-700">{item.sellingPrice.toLocaleString('en-US')}</td>
                    <td className="p-2.5">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => updateQty(idx, -1)} className="w-6 h-6 flex items-center justify-center rounded border border-gray-200 hover:bg-gray-100 text-gray-600"><Minus size={12} /></button>
                        <span className="w-7 text-center font-bold text-gray-800">{item.quantity}</span>
                        <button onClick={() => updateQty(idx, 1)} className="w-6 h-6 flex items-center justify-center rounded border border-gray-200 hover:bg-gray-100 text-gray-600"><Plus size={12} /></button>
                      </div>
                    </td>
                    <td className="p-2.5 font-bold text-gray-800">{(item.quantity * item.costPrice).toLocaleString('en-US')}</td>
                    <td className="p-2.5">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => editItem(idx)} className="p-1 text-primary hover:bg-primary-light rounded transition-colors"><Package size={14} /></button>
                        <button onClick={() => removeItem(idx)} className="p-1 text-primary hover:bg-primary-light rounded transition-colors"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-3 border-t border-gray-100 flex items-center justify-between text-sm">
            <span className="text-gray-500">إجمالي المشتريات</span>
            <span className="font-bold text-gray-800">{total.toLocaleString('en-US')} ج.م</span>
          </div>
        </div>
      )}

      {items.length === 0 && !showForm && (
        <div className="py-12 text-center text-gray-400">
          <Package size={48} className="mx-auto mb-3 opacity-50" />
          <p className="text-sm">ابحث عن منتج موجود أو أضف منتج جديد لبدء عملية الشراء</p>
        </div>
      )}
    </div>
  );
};
