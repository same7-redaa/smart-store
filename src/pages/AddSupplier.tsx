import React, { useState, useRef, useEffect } from 'react';
import { ArrowRight, Save, Plus, Trash2, Search, X, Package, DollarSign, User, Phone, Mail, MapPin, StickyNote, Building2, Tag, Minus, FileText, AlertTriangle, CheckSquare, Square } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../context/AppContext';
import FloatingInput from '../components/FloatingInput';
import FloatingSelect from '../components/FloatingSelect';
import FloatingTextarea from '../components/FloatingTextarea';

interface AddSupplierProps {
  setActivePage: (page: any) => void;
  isEditing?: boolean;
}

interface InvoiceItem {
  productName: string;
  variantName: string;
  sku: string;
  quantity: number;
  price: number;
  total: number;
}

const CATEGORIES = ['إلكترونيات', 'مواد تعبئة', 'متنوع', 'إكسسوارات', 'مواد خام', 'خدمات', 'ملابس', 'مواد غذائية'];

export const AddSupplier: React.FC<AddSupplierProps> = ({ setActivePage, isEditing }) => {
  const { notify } = useApp();

  const editData = isEditing ? JSON.parse(localStorage.getItem('edit_supplier') || 'null') : null;

  // Supplier fields
  const [name, setName] = useState(editData?.name || '');
  const [category, setCategory] = useState(editData?.category || '');
  const [phone, setPhone] = useState(editData?.phone || '');
  const [email, setEmail] = useState(editData?.email || '');
  const [address, setAddress] = useState(editData?.address || '');
  const [financialStatus, setFinancialStatus] = useState<'مدين' | 'دائن' | 'متوازن'>(editData?.financialStatus || 'متوازن');
  const [financialAmount, setFinancialAmount] = useState(editData?.financialAmount?.toString() || '');
  const [notes, setNotes] = useState(editData?.notes || '');
  const [isSaving, setIsSaving] = useState(false);
  const [savedSupplierId, setSavedSupplierId] = useState(editData?.id || '');

  // Invoice section
  const [showInvoice, setShowInvoice] = useState(!!editData);
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [invSearch, setInvSearch] = useState('');
  const [showInvResults, setShowInvResults] = useState(false);
  const [invPaid, setInvPaid] = useState('');
  const [invNotes, setInvNotes] = useState('');
  const invSearchRef = useRef<HTMLDivElement>(null);
  const [errors, setErrors] = useState<{ name?: string; qaName?: string; invoiceItems?: string; phone?: string }>({});

  // Quick add product
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [qaName, setQaName] = useState('');
  const [qaSku, setQaSku] = useState('');
  const [qaPrice, setQaPrice] = useState('');
  const [qaQty, setQaQty] = useState('');
  const [qaVariant, setQaVariant] = useState('');

  const products: any[] = JSON.parse(localStorage.getItem('my_products') || '[]');
  const filteredInv = invSearch.trim()
    ? products.filter((p: any) =>
        p.name?.toLowerCase().includes(invSearch.trim().toLowerCase()) ||
        p.sku?.toLowerCase().includes(invSearch.trim().toLowerCase())
      )
    : [];

  useEffect(() => {
    if (isEditing && editData) {
      setSavedSupplierId(editData.id);
      setShowInvoice(true);
    }
  }, [isEditing]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (invSearchRef.current && !invSearchRef.current.contains(e.target as Node)) setShowInvResults(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const selectProduct = (p: any) => {
    const existing = invoiceItems.find(i => i.sku === p.sku && i.variantName === '');
    if (existing) {
      setInvoiceItems(invoiceItems.map(i => i === existing ? { ...i, quantity: i.quantity + 1, total: (i.quantity + 1) * i.price } : i));
    } else {
      setInvoiceItems([...invoiceItems, {
        productName: p.name,
        variantName: '',
        sku: p.sku || '',
        quantity: 1,
        price: p.sellingPrice ? Number(p.sellingPrice) : 0,
        total: p.sellingPrice ? Number(p.sellingPrice) : 0,
      }]);
    }
    setInvSearch('');
    setShowInvResults(false);
  };

  const updateItemQty = (idx: number, delta: number) => {
    setInvoiceItems(invoiceItems.map((item, i) => {
      if (i !== idx) return item;
      const qty = Math.max(1, item.quantity + delta);
      return { ...item, quantity: qty, total: qty * item.price };
    }));
  };

  const updateItemPrice = (idx: number, price: number) => {
    setInvoiceItems(invoiceItems.map((item, i) => {
      if (i !== idx) return item;
      return { ...item, price, total: item.quantity * price };
    }));
  };

  const removeItem = (idx: number) => setInvoiceItems(invoiceItems.filter((_, i) => i !== idx));

  const invoiceTotal = invoiceItems.reduce((sum, i) => sum + i.total, 0);

  const addQuickProduct = () => {
    setErrors(p => ({ ...p, qaName: '' }));
    if (!qaName.trim()) { setErrors(p => ({ ...p, qaName: 'يرجى إدخال اسم المنتج' })); return; }
    const price = Number(qaPrice) || 0;
    const qty = Number(qaQty) || 1;
    const sku = qaSku.trim() || `TEMP-${Date.now()}`;
    const variant = qaVariant.trim();

    setInvoiceItems([...invoiceItems, {
      productName: qaName.trim(),
      variantName: variant,
      sku,
      quantity: qty,
      price,
      total: qty * price,
    }]);

    setQaName('');
    setQaSku('');
    setQaPrice('');
    setQaQty('');
    setQaVariant('');
    setShowQuickAdd(false);
  };

  const saveSupplier = () => {
    setErrors({ name: '', phone: '' });
    if (!name.trim()) { setErrors(p => ({ ...p, name: 'يرجى إدخال اسم المورد' })); return; }
    if (phone.trim() && !/^(010|011|012|015)\d{8}$/.test(phone.trim())) {
      setErrors(p => ({ ...p, phone: 'رقم الهاتف غير صحيح' }));
      return;
    }
    setIsSaving(true);

    const suppliers: any[] = JSON.parse(localStorage.getItem('my_suppliers') || '[]');
    const id = savedSupplierId || `SUP-${Date.now()}`;
    const now = new Date().toLocaleDateString('ar-EG-u-nu-latn');

    const amount = Number(financialAmount) || 0;

    if (isEditing && editData) {
      const idx = suppliers.findIndex((s: any) => s.id === editData.id);
      if (idx > -1) {
        suppliers[idx] = {
          ...suppliers[idx],
          name: name.trim(),
          category,
          phone,
          email,
          address,
          financialStatus,
          financialAmount: amount,
          notes,
        };
      }
      localStorage.setItem('my_suppliers', JSON.stringify(suppliers));
      setIsSaving(false);
      notify('success', 'تم تعديل المورد');
      setActivePage('purchases');
      return;
    } else {
      const supplier: any = {
        id,
        name: name.trim(),
        category,
        phone,
        email,
        address,
        financialStatus,
        financialAmount: amount,
        notes,
        supplied: 0,
        dues: 0,
        paid: 0,
        totalInvoices: 0,
        invoices: [],
        createdAt: now,
      };
      suppliers.push(supplier);
      localStorage.setItem('my_suppliers', JSON.stringify(suppliers));
      setSavedSupplierId(id);
      notify('success', 'تم إضافة المورد');
    }

    setIsSaving(false);
    setShowInvoice(true);
  };

  const saveInvoice = () => {
    setErrors(p => ({ ...p, invoiceItems: '' }));
    if (invoiceItems.length === 0) { setErrors(p => ({ ...p, invoiceItems: 'يرجى إضافة منتجات للفاتورة' })); return; }

    const invoice = {
      id: `INV-${Date.now()}`,
      date: new Date().toLocaleDateString('ar-EG-u-nu-latn'),
      items: [...invoiceItems],
      total: invoiceTotal,
      paid: Number(invPaid) || 0,
      notes: invNotes,
    };

    const suppliers: any[] = JSON.parse(localStorage.getItem('my_suppliers') || '[]');
    const idx = suppliers.findIndex((s: any) => s.id === savedSupplierId);
    if (idx > -1) {
      if (!suppliers[idx].invoices) suppliers[idx].invoices = [];
      suppliers[idx].invoices.push(invoice);
      suppliers[idx].supplied = (suppliers[idx].supplied || 0) + invoiceItems.reduce((sum, i) => sum + i.quantity, 0);
      const remaining = invoiceTotal - (Number(invPaid) || 0);
      if (remaining > 0) {
        suppliers[idx].dues = (suppliers[idx].dues || 0) + remaining;
        suppliers[idx].financialStatus = 'مدين';
        suppliers[idx].financialAmount = (suppliers[idx].financialAmount || 0) + remaining;
      }
      if (Number(invPaid) > 0) suppliers[idx].paid = (suppliers[idx].paid || 0) + Number(invPaid);
      suppliers[idx].totalInvoices = (suppliers[idx].totalInvoices || 0) + 1;
      localStorage.setItem('my_suppliers', JSON.stringify(suppliers));
    }

    // Add products to inventory
    const myProducts: any[] = JSON.parse(localStorage.getItem('my_products') || '[]');
    invoiceItems.forEach(item => {
      const existing = myProducts.findIndex((p: any) => p.sku === item.sku);
      if (existing > -1) {
        myProducts[existing].stock = (myProducts[existing].stock || 0) + item.quantity;
      } else {
        myProducts.push({
          id: `PRD-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name: item.productName,
          sku: item.sku,
          sellingPrice: item.price,
          stock: item.quantity,
          status: 'متوفر',
          createdAt: new Date().toLocaleDateString('ar-EG-u-nu-latn'),
        });
      }
    });
    localStorage.setItem('my_products', JSON.stringify(myProducts));

    setInvoiceItems([]);
    setInvPaid('');
    setInvNotes('');
    notify('success', `تم تسجيل الفاتورة وإضافة ${invoiceItems.length} منتجات للمخزون`);
  };

  return (
    <div className="flex flex-col w-full pb-10">
      {/* Top Bar */}
      <div className="flex items-center justify-between gap-3 bg-white p-3 px-5 rounded-xl shadow-sm border border-gray-100 mb-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setActivePage('purchases')} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors">
            <ArrowRight size={20} />
          </button>
          <h1 className="text-lg font-bold text-gray-800">{isEditing ? 'تعديل المورد' : 'إضافة مورد جديد'}</h1>
        </div>
        <button onClick={saveSupplier} disabled={isSaving}
          className="flex items-center gap-2 px-4 py-1.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-hover transition-colors shadow-sm disabled:opacity-50">
          <Save size={16} />
          <span>{isSaving ? 'جاري الحفظ...' : (isEditing ? 'حفظ التعديلات' : 'حفظ المورد')}</span>
        </button>
      </div>

      {/* Supplier Info */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-4">
        <h2 className="text-sm font-bold text-gray-800 mb-3 pb-2 border-b">بيانات المورد</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          <div className="sm:col-span-2 md:col-span-3">
            <FloatingInput label="اسم المورد" value={name} onChange={e => { setName(e.target.value); setErrors(p => ({ ...p, name: '' })); }} icon={<Building2 size={14} />} required placeholder="اسم المورد" error={errors.name} />
          </div>
          <FloatingSelect label="التصنيف" value={category} onChange={e => setCategory(e.target.value)} icon={<Tag size={14} />}>
            <option value="">اختر التصنيف</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </FloatingSelect>
          <FloatingInput label="رقم الهاتف" value={phone} onChange={e => { setPhone(e.target.value); setErrors(p => ({ ...p, phone: '' })); }} icon={<Phone size={14} />} placeholder="01xxxxxxxxx" error={errors.phone} />

          <FloatingInput label="البريد الإلكتروني" value={email} onChange={e => setEmail(e.target.value)} type="email" icon={<Mail size={14} />} placeholder="email@example.com" />
          <FloatingInput label="العنوان" value={address} onChange={e => setAddress(e.target.value)} icon={<MapPin size={14} />} placeholder="العنوان" className="sm:col-span-2 md:col-span-3" />
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-0.5">الحالة المالية</label>
            <div className="flex gap-2">
              {(['متوازن', 'مدين', 'دائن'] as const).map(s => (
                <button key={s} onClick={() => setFinancialStatus(s)}
                  className={`flex-1 py-2 text-xs font-medium rounded-lg border transition-colors ${financialStatus === s ? 'bg-primary-light border-primary text-primary' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>{s}</button>
              ))}
            </div>
          </div>
          <FloatingInput label="المبلغ" value={financialAmount} onChange={e => setFinancialAmount(e.target.value)} type="number" icon={<DollarSign size={14} />} placeholder="0" />
          <FloatingTextarea label="ملاحظات" value={notes} onChange={e => setNotes(e.target.value)} icon={<StickyNote size={14} />} rows={2} className="sm:col-span-2 md:col-span-3" />
        </div>
      </div>

      {/* Purchase Invoice Section */}
      <AnimatePresence>
        {showInvoice && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-4">
              <div className="flex items-center justify-between mb-3 pb-2 border-b">
                <h2 className="text-sm font-bold text-gray-800">فاتورة مشتريات</h2>
                <div className="flex items-center gap-2">
                  <button onClick={() => setShowQuickAdd(!showQuickAdd)} className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-50 transition-colors">
                    <Plus size={14} /> إضافة منتج جديد
                  </button>
                </div>
              </div>

              {/* Quick add product */}
              <AnimatePresence>
                {showQuickAdd && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden mb-3">
                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 grid grid-cols-1 sm:grid-cols-5 gap-2">
                      <div className="sm:col-span-2">
                        <FloatingInput label="اسم المنتج" value={qaName} onChange={e => { setQaName(e.target.value); setErrors(p => ({ ...p, qaName: '' })); }} required placeholder="اسم المنتج" error={errors.qaName} />
                      </div>
                      <FloatingInput label="SKU" value={qaSku} onChange={e => setQaSku(e.target.value)} placeholder="كود" />
                      <FloatingInput label="السعر" value={qaPrice} onChange={e => setQaPrice(e.target.value)} type="number" placeholder="0" />
                      <FloatingInput label="الكمية" value={qaQty} onChange={e => setQaQty(e.target.value)} type="number" placeholder="1" />
                      <div className="sm:col-span-5 flex gap-2 mt-1">
                        <FloatingInput label="المقاس/اللون" value={qaVariant} onChange={e => setQaVariant(e.target.value)} placeholder="المقاس/اللون (اختياري)" className="flex-1" />
                        <button onClick={addQuickProduct} className="px-3 py-1.5 bg-primary text-white text-xs font-medium rounded-lg hover:bg-primary-hover transition-colors">إضافة</button>
                        <button onClick={() => setShowQuickAdd(false)} className="px-3 py-1.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-200 transition-colors">إلغاء</button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Product search */}
              <div ref={invSearchRef} className="relative mb-3">
                <FloatingInput label="ابحث عن منتج" value={invSearch} onChange={e => { setInvSearch(e.target.value); setShowInvResults(true); }} icon={<Search size={14} />} placeholder="ابحث عن منتج من المخزون..." />
                {showInvResults && filteredInv.length > 0 && (
                  <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg max-h-40 overflow-y-auto">
                    {filteredInv.map((p: any, i: number) => (
                      <button key={i} onClick={() => selectProduct(p)} className="w-full flex items-center justify-between gap-2 px-3 py-2.5 hover:bg-gray-50 border-b border-gray-50 last:border-0 text-right transition-colors text-sm">
                        <span className="font-medium">{p.name}</span>
                        <span className="text-xs text-gray-400">{p.sku || ''} | {p.sellingPrice || 0} ج.م</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Invoice items table */}
              {invoiceItems.length > 0 && (
                <div className="overflow-x-auto mb-3">
                  <table className="w-full text-center border-collapse">
                    <thead>
                      <tr className="text-gray-500 text-xs border-b border-gray-100">
                        <th className="p-2 font-medium">المنتج</th>
                        <th className="p-2 font-medium">المقاس</th>
                        <th className="p-2 font-medium">الكود</th>
                        <th className="p-2 font-medium">الكمية</th>
                        <th className="p-2 font-medium">السعر</th>
                        <th className="p-2 font-medium">الإجمالي</th>
                        <th className="p-2 font-medium w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="text-sm divide-y divide-gray-50">
                      {invoiceItems.map((item, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="p-2 text-center font-medium text-gray-800">{item.productName}</td>
                          <td className="p-2 text-center text-gray-500">{item.variantName || '—'}</td>
                          <td className="p-2 text-center text-xs text-gray-500 font-mono">{item.sku || '—'}</td>
                          <td className="p-2 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button onClick={() => updateItemQty(idx, -1)} className="w-6 h-6 flex items-center justify-center rounded border border-gray-200 hover:bg-gray-100 text-gray-600 transition-colors"><Minus size={12} /></button>
                              <span className="w-7 text-center font-bold text-gray-800 text-sm">{item.quantity}</span>
                              <button onClick={() => updateItemQty(idx, 1)} className="w-6 h-6 flex items-center justify-center rounded border border-gray-200 hover:bg-gray-100 text-gray-600 transition-colors"><Plus size={12} /></button>
                            </div>
                          </td>
                          <td className="p-2 text-center">
                            <input type="number" value={item.price} onChange={e => updateItemPrice(idx, Number(e.target.value) || 0)}
                              className="w-20 py-1 px-1.5 border border-gray-200 rounded text-xs text-center outline-none focus:border-primary" />
                          </td>
                          <td className="p-2 text-center font-bold text-gray-800 text-sm">{item.total.toLocaleString('en-US')}</td>
                          <td className="p-2 text-center">
                            <button onClick={() => removeItem(idx)} className="p-1 text-primary hover:bg-primary-light rounded transition-colors">
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Invoice footer */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 border-t border-gray-100">
                <div className="flex items-center gap-3">
                  <FloatingInput label="المدفوع" value={invPaid} onChange={e => setInvPaid(e.target.value)} type="number" icon={<DollarSign size={13} />} placeholder="0" className="w-32" />
                  {invoiceItems.length > 0 && (
                    <>
                      <span className="text-xs text-gray-500">الإجمالي: <strong className="text-gray-800">{invoiceTotal.toLocaleString('en-US')} ج.م</strong></span>
                      {Number(invPaid) > 0 && <span className="text-xs text-red-500">المتبقي: {(invoiceTotal - Number(invPaid)).toLocaleString('en-US')} ج.م</span>}
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <FloatingInput label="ملاحظات الفاتورة" value={invNotes} onChange={e => setInvNotes(e.target.value)} placeholder="ملاحظات الفاتورة" className="flex-1 sm:w-40" />
                  <button onClick={saveInvoice} disabled={invoiceItems.length === 0}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-xs font-medium rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-40">
                    <FileText size={14} /> تسجيل الفاتورة
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
