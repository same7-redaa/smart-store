import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ArrowRight, Save, Plus, Trash2, Search, X, Package, Minus, User, Phone, MapPin, Map, Flag, CreditCard, StickyNote, Building2, DollarSign, AlertCircle, CheckCircle2, ShoppingBag, Clock } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { adjustStockForOrderStatus, recalculateCustomerStats } from '../utils/sync';
import FloatingInput from '../components/FloatingInput';
import FloatingTextarea from '../components/FloatingTextarea';

interface AddOrderProps {
  setActivePage: (page: any) => void;
  isEditing?: boolean;
}

interface OrderItem {
  productId: string;
  variantName: string;
  productName: string;
  sku: string;
  quantity: number;
  price: number;
  total: number;
  stock: number;
}

export const AddOrder: React.FC<AddOrderProps> = ({ setActivePage, isEditing }) => {
  const { notify } = useApp();

  const editData = isEditing ? JSON.parse(localStorage.getItem('edit_order') || 'null') : null;

  const [customerName, setCustomerName] = useState(editData?.customer || '');
  const [phone, setPhone] = useState(editData?.phone || '');
  const [phone2, setPhone2] = useState(editData?.phone2 || '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (field: string, value: string): string => {
    switch (field) {
      case 'customerName': {
        if (!value.trim()) return 'الرجاء إدخال اسم العميل';
        return '';
      }
      case 'phone':
        if (!value) return '';
        if (!/^(010|011|012|015)\d{8}$/.test(value.trim())) return 'رقم الهاتف غير صحيح';
        return '';
      case 'phone2':
        if (!value) return '';
        if (!/^(010|011|012|015)\d{8}$/.test(value.trim())) return 'رقم الهاتف غير صحيح';
        return '';
      default:
        return '';
    }
  };

  const setField = (field: string, value: string, setter: (v: string) => void) => {
    setter(value);
    if (field === 'customerName') {
      setErrors(prev => ({ ...prev, [field]: validate(field, value) }));
    } else if (field === 'phone' || field === 'phone2') {
      if (value.length === 11) {
        setErrors(prev => ({ ...prev, [field]: validate(field, value) }));
      } else if (value.length > 11) {
        setErrors(prev => ({ ...prev, [field]: 'رقم الهاتف غير صحيح' }));
      } else {
        setErrors(prev => ({ ...prev, [field]: '' }));
      }
    }
  };
  const handleBlur = (field: string, value: string) => {
    if (field === 'phone' || field === 'phone2') {
      if (value && value.length !== 11) {
        setErrors(prev => ({ ...prev, [field]: 'رقم الهاتف غير صحيح' }));
      } else {
        setErrors(prev => ({ ...prev, [field]: validate(field, value) }));
      }
    } else {
      setErrors(prev => ({ ...prev, [field]: validate(field, value) }));
    }
  };
  const [governorate, setGovernorate] = useState(editData?.governorate || '');
  const [district, setDistrict] = useState(editData?.district || '');
  const [address, setAddress] = useState(editData?.address || '');
  const [landmark, setLandmark] = useState(editData?.landmark || '');
  const [paymentMethod, setPaymentMethod] = useState(editData?.paymentMethod || 'cod');
  const [prepaid, setPrepaid] = useState(editData?.prepaid?.toString() || '');
  const [discountType, setDiscountType] = useState<'none' | 'percentage' | 'fixed'>(editData?.discountType || 'none');
  const [discountValue, setDiscountValue] = useState(editData?.discountValue?.toString() || '');
  const [notes, setNotes] = useState(editData?.notes || '');
  const [items, setItems] = useState<OrderItem[]>(editData?.items || []);
  const [isSaving, setIsSaving] = useState(false);

  // Customer lookup
  const [existingCustomer, setExistingCustomer] = useState<any>(null);
  const [showCustomerResults, setShowCustomerResults] = useState(false);
  const customerSearchRef = useRef<HTMLDivElement>(null);

  const allCustomers: any[] = JSON.parse(localStorage.getItem('my_customers') || '[]');
  const filteredCustomers = customerName.trim()
    ? allCustomers.filter((c: any) =>
        c.name?.toLowerCase().includes(customerName.trim().toLowerCase()) ||
        c.phone?.includes(customerName.trim())
      )
    : [];

  useEffect(() => {
    if (!phone && !customerName) { setExistingCustomer(null); return; }
    const found = allCustomers.find((c: any) => (phone && c.phone === phone) || (!phone && c.name === customerName));
    setExistingCustomer(found || null);
  }, [phone, customerName]);

  const selectCustomer = (c: any) => {
    setCustomerName(c.name);
    setPhone(c.phone || '');
    setPhone2(c.phone2 || '');
    setAddress(c.address || '');
    setGovernorate(c.governorate || '');
    setDistrict(c.district || '');
    setLandmark(c.landmark || '');
    if (c.address && c.governorate) setNotes(c.notes || '');
    setShowCustomerResults(false);
    setExistingCustomer(c);
    setErrors(prev => ({ ...prev, customerName: '', phone: '', phone2: '' }));
  };

  const customerScore = existingCustomer ? (() => {
    const cancelled = existingCustomer.cancelledOrders || 0;
    const ordersCount = existingCustomer.ordersCount || 0;
    if (cancelled > 0) return { level: 'red', label: 'غير موثوق' };
    if (ordersCount >= 3) return { level: 'green', label: 'ممتاز' };
    if (ordersCount >= 1) return { level: 'yellow', label: 'متوسط' };
    return { level: 'yellow', label: 'جديد' };
  })() : null;

  const lastOrder = existingCustomer ? (() => {
    const orders = JSON.parse(localStorage.getItem('my_orders') || '[]');
    return orders.filter((o: any) => o.phone === existingCustomer.phone || o.customer === existingCustomer.name).sort((a: any, b: any) => new Date(b.date || '').getTime() - new Date(a.date || '').getTime())[0];
  })() : null;

  // Shipping
  const [shippingCompany, setShippingCompany] = useState<any>(null);
  const [shippingSearch, setShippingSearch] = useState('');
  const [showShippingResults, setShowShippingResults] = useState(false);
  const [shippingGovSearch, setShippingGovSearch] = useState('');
  const [showGovResults, setShowGovResults] = useState(false);
  const [shippingCost, setShippingCost] = useState<{ originalPrice: number; customerPrice: number } | null>(null);
  const shippingSearchRef = useRef<HTMLDivElement>(null);
  const govSearchRef = useRef<HTMLDivElement>(null);

  const companies = JSON.parse(localStorage.getItem('my_shipping_companies') || '[]');

  useEffect(() => {
    if (editData?.shippingCompany) {
      const found = companies.find((c: any) => c.name === editData.shippingCompany);
      if (found) {
        setShippingCompany(found);
        setShippingSearch(found.name);
        if (editData.governorate) {
          const gov = found.governorates.find((g: any) => g.name === editData.governorate);
          if (gov) setShippingCost({ originalPrice: gov.originalPrice, customerPrice: gov.customerPrice });
        }
      }
    }
  }, []);

  const filteredCompanies = companies.filter((c: any) =>
    c.name?.toLowerCase().includes(shippingSearch.trim().toLowerCase())
  );

  const availableGovernorates = shippingCompany
    ? shippingCompany.governorates.filter((g: any) =>
        g.name?.toLowerCase().includes(shippingGovSearch.trim().toLowerCase())
      )
    : [];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (shippingSearchRef.current && !shippingSearchRef.current.contains(e.target as Node)) {
        setShowShippingResults(false);
      }
      if (govSearchRef.current && !govSearchRef.current.contains(e.target as Node)) {
        setShowGovResults(false);
      }
      if (customerSearchRef.current && !customerSearchRef.current.contains(e.target as Node)) {
        setShowCustomerResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectShippingCompany = (company: any) => {
    setShippingCompany(company);
    setShippingSearch(company.name);
    setShowShippingResults(false);
    setGovernorate('');
    setShippingGovSearch('');
    setShippingCost(null);
  };

  const selectGovernorate = (gov: any) => {
    setGovernorate(gov.name);
    setShippingGovSearch(gov.name);
    setShowGovResults(false);
    setShippingCost({ originalPrice: gov.originalPrice, customerPrice: gov.customerPrice });
  };

  // Product search
  const [searchQuery, setSearchQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const products = JSON.parse(localStorage.getItem('my_products') || '[]');

  const allProductItems = useMemo(() => {
    return products.flatMap((p: any) => {
      if (p.hasVariants && p.variants?.length > 0) {
        return p.variants.map((v: any) => ({
          productId: p.id,
          variantName: v.name,
          productName: p.name,
          variantLabel: v.name,
          sku: v.sku || '',
          price: parseInt(v.sellingPrice || p.price?.replace(' ج.م', '') || '0'),
          stock: parseInt(v.quantity || '0'),
          image: p.images?.[0] || null,
          key: `${p.id}-${v.name}`,
        }));
      }
      return [{
        productId: p.id,
        variantName: '',
        productName: p.name,
        variantLabel: '',
        sku: p.baseSku || p.id,
        price: parseInt(p.price?.replace(' ج.م', '') || '0'),
        stock: parseInt(p.stock || '0'),
        image: p.images?.[0] || null,
        key: p.id,
      }];
    }).filter(Boolean);
  }, [products]);

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return allProductItems;
    return allProductItems.filter(item =>
      item.productName.toLowerCase().includes(q) ||
      (item.variantLabel && item.variantLabel.toLowerCase().includes(q)) ||
      item.sku.toLowerCase().includes(q)
    );
  }, [allProductItems, searchQuery]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const addToOrder = (item: typeof allProductItems[0]) => {
    const existing = items.find(i => i.productId === item.productId && i.variantName === item.variantName);
    if (existing) {
      const newQty = existing.quantity + 1;
      if (newQty > item.stock) {
        notify('error', `لا يمكن إضافة أكثر من المخزون المتاح (${item.stock} قطعة)`);
        return;
      }
      setItems(items.map(i => i === existing ? { ...i, quantity: newQty, total: newQty * i.price } : i));
    } else {
      if (item.stock <= 0) {
        notify('error', 'هذا المنتج غير متوفر في المخزون حالياً');
        return;
      }
      setItems([...items, {
        productId: item.productId,
        variantName: item.variantName,
        productName: item.variantLabel ? `${item.productName} - ${item.variantLabel}` : item.productName,
        sku: item.sku,
        quantity: 1,
        price: item.price,
        total: item.price,
        stock: item.stock,
      }]);
    }
  };

  const updateQty = (index: number, delta: number) => {
    setItems(items.map((i, idx) => {
      if (idx !== index) return i;
      const maxStock = i.stock ?? Infinity;
      const qty = Math.max(1, Math.min(maxStock, i.quantity + delta));
      if (delta > 0 && i.quantity >= maxStock) {
        notify('error', `لا يمكن تجاوز المخزون المتاح (${maxStock} قطعة)`);
      }
      return { ...i, quantity: qty, total: qty * i.price };
    }));
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, idx) => idx !== index));
  };

  const totalAmount = items.reduce((sum, i) => sum + i.total, 0);
  const shippingFee = shippingCost?.customerPrice || 0;
  const totalWithShipping = totalAmount + shippingFee;
  const discountAmount = discountType === 'percentage'
    ? Math.round((totalWithShipping * (parseFloat(discountValue) || 0)) / 100)
    : discountType === 'fixed'
      ? (parseFloat(discountValue) || 0)
      : 0;
  const afterDiscount = Math.max(0, totalWithShipping - discountAmount);
  const prepaidAmount = parseInt(prepaid) || 0;
  const remainingAmount = Math.max(0, afterDiscount - prepaidAmount);

  const handleSave = () => {
    const errs: Record<string, string> = {
      customerName: validate('customerName', customerName),
      phone: validate('phone', phone),
      phone2: validate('phone2', phone2),
    };
    setErrors(errs);
    const firstError = Object.values(errs).find(Boolean);
    if (firstError) { notify('error', firstError); return; }
    if (items.length === 0) { notify('error', 'الرجاء إضافة منتج واحد على الأقل'); return; }
    setIsSaving(true);
    const orders = JSON.parse(localStorage.getItem('my_orders') || '[]');

    const order = {
      id: editData?.id || `#${orders.length > 0 ? parseInt(orders[0].id.replace('#', '')) + 1 : 1001}`,
      customer: customerName,
      phone,
      phone2,
      governorate,
      district,
      address,
      landmark,
      date: editData?.date || new Date().toLocaleDateString('ar-EG-u-nu-latn', { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      total: `${totalWithShipping.toLocaleString('en-US')} ج.م`,
      subtotal: totalAmount,
      discountType,
      discountValue: discountType !== 'none' ? parseFloat(discountValue) || 0 : 0,
      discountAmount,
      afterDiscount,
      prepaid: prepaidAmount,
      remaining: remainingAmount,
      status: editData?.status || 'قيد المعالجة',
      payment: editData?.payment || 'بانتظار الدفع',
      paymentMethod,
      notes,
      items,
      shippingCompany: shippingCompany?.name || '',
      shippingCost: shippingFee,
    };

    // Restore old stock if editing, then deduct new stock
    if (editData && editData.status !== 'ملغي') {
      adjustStockForOrderStatus(editData, 'add');
    }
    if (order.status !== 'ملغي') {
      adjustStockForOrderStatus(order, 'remove');
    }

    if (editData) {
      const idx = orders.findIndex((o: any) => o.id === editData.id);
      if (idx > -1) orders[idx] = order;
      else orders.unshift(order);
    } else {
      orders.unshift(order);
    }
    localStorage.setItem('my_orders', JSON.stringify(orders));

    // Auto-save/update customer with badge and stats
    recalculateCustomerStats(phone, customerName);
    if (editData && (editData.phone !== phone || editData.customer !== customerName)) {
      recalculateCustomerStats(editData.phone, editData.customer);
    }

    notify('success', `تم ${editData ? 'تعديل' : 'حفظ'} الطلب بنجاح`);
    setTimeout(() => {
      setIsSaving(false);
      setActivePage('orders');
    }, 300);
  };

  return (
    <div className="flex flex-col w-full pb-10">
      {/* Top Bar */}
      <div className="flex items-center justify-between gap-3 bg-white p-3 px-5 rounded-xl shadow-sm border border-gray-100 mb-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setActivePage('orders')} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors">
            <ArrowRight size={20} />
          </button>
          <h1 className="text-lg font-bold text-gray-800">إضافة طلب جديد</h1>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-5 py-1.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-hover transition-colors shadow-sm disabled:opacity-50"
        >
          <Save size={16} />
          <span>{isSaving ? 'جاري الحفظ...' : 'حفظ الطلب'}</span>
        </button>
      </div>

      {/* Customer Info */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-4">
        <h2 className="text-sm font-bold text-gray-800 mb-3 pb-2 border-b">معلومات العميل</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div ref={customerSearchRef} className="sm:col-span-2 md:col-span-4 relative">
            <FloatingInput label="الاسم" value={customerName} onChange={e => { setField('customerName', e.target.value, setCustomerName); setShowCustomerResults(true); }} onBlur={() => handleBlur('customerName', customerName)} required icon={<User size={16} />} placeholder="اسم العميل" error={errors.customerName} />
            {showCustomerResults && filteredCustomers.length > 0 && (
              <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                {filteredCustomers.map((c: any) => (
                  <button key={c.id} onClick={() => selectCustomer(c)} className="w-full flex items-center justify-between gap-2 px-3 py-2.5 hover:bg-gray-50 border-b border-gray-50 last:border-0 text-right transition-colors text-sm">
                    <span className="font-medium">{c.name}</span>
                    <span className="text-xs text-gray-400" dir="ltr">{c.phone || '—'}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <FloatingInput label="رقم الهاتف" value={phone} onChange={e => setField('phone', e.target.value, setPhone)} onBlur={() => handleBlur('phone', phone)} required icon={<Phone size={16} />} placeholder="01xxxxxxxxx" error={errors.phone} />
          <FloatingInput label="رقم هاتف إضافي" value={phone2} onChange={e => setField('phone2', e.target.value, setPhone2)} onBlur={() => handleBlur('phone2', phone2)} icon={<Phone size={16} />} placeholder="01xxxxxxxxx" error={errors.phone2} />

          <FloatingInput label="عنوان المنزل" value={address} onChange={e => setAddress(e.target.value)} icon={<MapPin size={16} />} placeholder="الشارع، المبنى، الشقة" className="sm:col-span-2" />
          <FloatingInput label="علامة مميزة" value={landmark} onChange={e => setLandmark(e.target.value)} icon={<Flag size={16} />} placeholder="بجانب، مقابل..." className="sm:col-span-2" />
        </div>
      </div>

      {/* Customer Status */}
      {existingCustomer && (() => {
        const isRed    = customerScore?.level === 'red';
        const isGreen  = customerScore?.level === 'green';
        const colorCls = isRed
          ? 'bg-red-50   border-red-200'
          : isGreen
          ? 'bg-green-50 border-green-200'
          : 'bg-amber-50 border-amber-200';
        const dotCls   = isRed ? 'bg-red-500' : isGreen ? 'bg-primary' : 'bg-amber-500';
        const labelCls = isRed ? 'bg-red-100 text-red-700' : isGreen ? 'bg-primary/10 text-primary' : 'bg-amber-100 text-amber-700';
        return (
          <div className={`mb-4 rounded-xl border ${colorCls} overflow-hidden`}>
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              {/* Left: name + score */}
              <div className="flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${dotCls}`} />
                <div>
                  <p className="text-sm font-bold text-gray-800">{existingCustomer.name}</p>
                  {existingCustomer.phone && (
                    <p className="text-xs text-gray-400 font-sans mt-0.5" dir="ltr">{existingCustomer.phone}</p>
                  )}
                </div>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${labelCls}`}>
                  {customerScore?.label}
                </span>
              </div>

              {/* Right: last order */}
              {lastOrder && (
                <div className="flex items-center gap-2 text-xs">
                  <ShoppingBag size={13} className="text-gray-400 shrink-0" />
                  <span className="text-gray-500">آخر طلب:</span>
                  <span className="font-bold text-gray-700">{lastOrder.id}</span>
                  {lastOrder.status === 'ملغي' ? (
                    <span className="flex items-center gap-1 bg-red-100 text-red-600 font-medium px-2 py-0.5 rounded-full">
                      <AlertCircle size={10} />
                      ملغي
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 bg-green-100 text-green-600 font-medium px-2 py-0.5 rounded-full">
                      <CheckCircle2 size={10} />
                      {lastOrder.status || 'مكتمل'}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Notes strip */}
            {existingCustomer.notes && (
              <div className="px-4 py-2 bg-white/60 border-t border-dashed border-gray-200 text-xs text-gray-500">
                <span className="font-medium text-gray-600">ملاحظة: </span>{existingCustomer.notes}
              </div>
            )}
          </div>
        );
      })()}

      {/* Shipping */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-4">
        <h2 className="text-sm font-bold text-gray-800 mb-3 pb-2 border-b">معلومات الشحن</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div ref={shippingSearchRef} className="relative sm:col-span-2 z-30">
            <FloatingInput label="شركة الشحن" value={shippingSearch} onChange={e => { setShippingSearch(e.target.value); setShowShippingResults(true); if (!e.target.value) setShippingCompany(null); }} icon={<Building2 size={16} />} placeholder="ابحث عن شركة شحن..." />
            {showShippingResults && filteredCompanies.length > 0 && (
              <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-xl max-h-40 overflow-y-auto">
                {filteredCompanies.map((c: any) => (
                  <button key={c.id} onClick={() => selectShippingCompany(c)} className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-gray-50 border-b border-gray-50 last:border-0 text-right transition-colors text-sm">
                    {c.name}
                  </button>
                ))}
              </div>
            )}
            {showShippingResults && shippingSearch && filteredCompanies.length === 0 && (
              <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-xl p-3 text-center text-gray-400 text-xs">لا توجد شركات شحن تطابق البحث</div>
            )}
          </div>

          <div ref={govSearchRef} className="relative">
            <label className="block text-xs font-medium text-gray-700 mb-0.5">المحافظة</label>
            <div className="relative">
              <span className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-gray-400"><Map size={14} /></span>
              <input
                type="text"
                value={shippingGovSearch}
                onChange={e => { setShippingGovSearch(e.target.value); setShowGovResults(true); if (!e.target.value) { setGovernorate(''); setShippingCost(null); }}}
                onFocus={() => shippingCompany && setShowGovResults(true)}
                disabled={!shippingCompany}
                className="w-full py-2 pr-9 pl-3 border border-gray-200 rounded-lg outline-none focus:border-primary transition-all text-sm disabled:bg-gray-50 disabled:text-gray-400"
                placeholder={shippingCompany ? 'اختر محافظة...' : 'اختر الشركة أولاً'}
              />
            </div>
            {showGovResults && shippingCompany && availableGovernorates.length > 0 && (
              <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg max-h-40 overflow-y-auto">
                {availableGovernorates.map((g: any, idx: number) => (
                  <button key={idx} onClick={() => selectGovernorate(g)} className="w-full flex items-center justify-between gap-2 px-3 py-2.5 hover:bg-gray-50 border-b border-gray-50 last:border-0 text-right transition-colors text-sm">
                    <span>{g.name}</span>
                    {g.originalPrice && <span className="text-xs text-gray-500">{g.originalPrice} ج.م</span>}
                  </button>
                ))}
              </div>
            )}
            {showGovResults && shippingCompany && availableGovernorates.length === 0 && (
              <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-center text-gray-400 text-xs">لا توجد محافظات تطابق البحث</div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-0.5">سعر الشحن</label>
            <div className="relative">
              <span className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-gray-400"><DollarSign size={14} /></span>
              <div className={`w-full py-2 pr-9 pl-3 border border-gray-200 rounded-lg text-sm flex items-center gap-1 ${shippingCost ? 'text-gray-800' : 'text-gray-400'}`}>
                {shippingCost ? (
                  <><span className="font-bold text-primary">{shippingCost.customerPrice} ج.م</span><span className="text-xs text-gray-400 mr-1">(الأصلي: {shippingCost.originalPrice} ج.م)</span></>
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </div>
            </div>
          </div>

          <FloatingInput label="المركز / القسم" value={district} onChange={e => setDistrict(e.target.value)} icon={<MapPin size={16} />} placeholder="مدينة نصر" />
        </div>
      </div>

      {/* Products */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-4">
        <h2 className="text-sm font-bold text-gray-800 mb-3 pb-2 border-b">منتجات الطلب</h2>

        <div className="relative mb-3">
          <span className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-gray-400">
            <Search size={15} />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full py-2 pr-9 pl-3 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none text-sm"
            placeholder="ابحث عن منتج من المخزون..."
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-gray-400 hover:text-gray-600">
              <X size={13} />
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-4 max-h-64 overflow-y-auto pr-1">
          {searchResults.length > 0 ? (
            searchResults.map((item: any) => {
              const addedItem = items.find(i => i.productId === item.productId && i.variantName === item.variantName);
              const isOutOfStock = item.stock <= 0;
              return (
                <div
                  key={item.key}
                  onClick={() => !isOutOfStock && addToOrder(item)}
                  className={`relative p-3 rounded-xl border flex flex-col items-center justify-center text-center transition-all ${
                    isOutOfStock
                      ? 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
                      : 'border-gray-200 bg-white hover:border-primary hover:shadow-sm cursor-pointer'
                  }`}
                >
                  {addedItem && (
                    <div className="absolute top-2 right-2 bg-primary text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center z-10">
                      {addedItem.quantity}
                    </div>
                  )}
                  {item.image ? (
                    <img src={item.image} alt={item.productName} className="w-12 h-12 object-cover rounded-lg mb-2" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-gray-100 text-gray-400 flex items-center justify-center mb-2">
                      <Package size={20} />
                    </div>
                  )}
                  <div className="text-xs font-bold text-gray-800 line-clamp-2 leading-snug mb-1 min-h-[2rem]">
                    {item.variantLabel ? `${item.productName} - ${item.variantLabel}` : item.productName}
                  </div>
                  <div className="text-[10px] text-gray-500 mb-1">{item.sku || '—'}</div>
                  <div className="text-xs font-bold text-primary mb-1">{item.price} ج.م</div>
                  <div className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                    isOutOfStock ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'
                  }`}>
                    {isOutOfStock ? 'نفذت الكمية' : `مخزون: ${item.stock}`}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-full py-6 text-center text-gray-400 text-sm">
              لا توجد منتجات تطابق البحث
            </div>
          )}
        </div>

        {items.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Package size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">لم يتم إضافة أي منتجات بعد. ابحث عن منتج من المخزون أعلاه.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="w-full text-right text-sm border-collapse">
                <thead className="bg-gray-50 text-gray-600 border-b">
                  <tr>
                    <th className="p-2 font-medium text-center">المنتج</th>
                    <th className="p-2 font-medium text-center">الكود</th>
                    <th className="p-2 font-medium w-28 text-center">الكمية</th>
                    <th className="p-2 font-medium w-20 text-center">السعر</th>
                    <th className="p-2 font-medium w-20 text-center">الإجمالي</th>
                    <th className="p-2 font-medium w-12 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((item, idx) => (
                    <tr key={`${item.productId}-${item.variantName}`} className="hover:bg-gray-50">
                      <td className="p-2 text-center font-medium text-gray-800 text-sm">
                        <div>
                          <div>{item.productName}</div>
                          {item.stock !== undefined && (
                            <div className={`text-[10px] mt-0.5 font-normal ${
                              item.quantity >= item.stock 
                                ? 'text-red-500 font-semibold' 
                                : item.stock <= 3 
                                  ? 'text-orange-400' 
                                  : 'text-gray-400'
                            }`}>
                              {item.quantity >= item.stock 
                                ? '⚠️ وصلت للحد الأقصى' 
                                : `مخزون: ${item.stock} قطعة`}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-2 text-center text-xs text-gray-500 font-mono">{item.sku || '—'}</td>
                      <td className="p-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => updateQty(idx, -1)} className="w-6 h-6 flex items-center justify-center rounded border border-gray-200 hover:bg-gray-100 text-gray-600 transition-colors"><Minus size={12} /></button>
                          <span className={`w-7 text-center font-bold text-sm ${
                            item.stock !== undefined && item.quantity >= item.stock 
                              ? 'text-red-500' 
                              : 'text-gray-800'
                          }`}>{item.quantity}</span>
                          <button
                            onClick={() => updateQty(idx, 1)}
                            disabled={item.stock !== undefined && item.quantity >= item.stock}
                            className={`w-6 h-6 flex items-center justify-center rounded border transition-colors ${
                              item.stock !== undefined && item.quantity >= item.stock
                                ? 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed'
                                : 'border-gray-200 hover:bg-gray-100 text-gray-600'
                            }`}
                          ><Plus size={12} /></button>
                        </div>
                      </td>
                      <td className="p-2 text-center font-medium text-gray-800 text-sm">{item.price}</td>
                      <td className="p-2 text-center font-bold text-gray-800 text-sm">{item.total}</td>
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

            <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100">
              <span className="text-xs text-gray-500">المنتجات: {items.length} · القطع: {items.reduce((s, i) => s + i.quantity, 0)}</span>
              <div className="flex items-center gap-2 flex-wrap justify-end">
                <span className="text-xs text-gray-500">{totalAmount.toLocaleString('en-US')} ج.م</span>
                {shippingFee > 0 && (
                  <span className="text-xs text-blue-600">شحن: +{shippingFee.toLocaleString('en-US')} ج.م</span>
                )}
                {discountAmount > 0 && (
                  <span className="text-xs text-red-500">خصم: -{discountAmount.toLocaleString('en-US')} ج.م</span>
                )}
                {prepaidAmount > 0 && (
                  <span className="text-xs text-green-600">مدفوع: {prepaidAmount.toLocaleString('en-US')} ج.م</span>
                )}
                <div className="text-base font-bold text-gray-800">
                  {(prepaidAmount > 0 || discountAmount > 0 || shippingFee > 0) ? 'المتبقي: ' : 'الإجمالي: '}
                  <span className="text-primary">{remainingAmount.toLocaleString('en-US')} ج.م</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Payment */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-4">
        <h2 className="text-sm font-bold text-gray-800 mb-3 pb-2 border-b">طريقة الدفع</h2>
        <div className="flex flex-wrap gap-3 mb-3">
          {[
            { value: 'cod', label: 'الدفع عند الاستلام' },
            { value: 'online', label: 'الدفع الإلكتروني' },
          ].map(m => (
            <label key={m.value} className={`flex items-center gap-2 px-4 py-2 border rounded-lg cursor-pointer transition-colors text-sm ${paymentMethod === m.value ? 'border-primary bg-primary-light text-primary font-medium' : 'border-gray-200 hover:bg-gray-50 text-gray-700'}`}>
              <input type="radio" name="payment" value={m.value} checked={paymentMethod === m.value} onChange={e => setPaymentMethod(e.target.value)} className="w-4 h-4 text-primary" />
              <span>{m.label}</span>
            </label>
          ))}
        </div>

        {/* Discount */}
        <div className="flex items-center gap-3 mb-3 pt-3 border-t border-gray-100">
          <label className="text-xs font-medium text-gray-700 whitespace-nowrap">خصم</label>
          <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg p-0.5">
            {(['none', 'percentage', 'fixed'] as const).map(t => (
              <button
                key={t}
                onClick={() => { setDiscountType(t); if (t === 'none') setDiscountValue(''); }}
                className={`px-2.5 py-1 text-xs rounded-md transition-colors ${discountType === t ? 'bg-white text-primary font-medium shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {t === 'none' ? 'بدون' : t === 'percentage' ? 'نسبة %' : 'قيمة'}
              </button>
            ))}
          </div>
          {discountType !== 'none' && (
            <div className="relative">
              <input type="number" value={discountValue} onChange={e => setDiscountValue(e.target.value)} className="w-20 py-1.5 pr-2 pl-7 border border-gray-200 rounded-lg outline-none focus:border-primary transition-all text-sm text-center" placeholder="0" />
              <span className="absolute inset-y-0 left-0 flex items-center pl-1.5 text-xs text-gray-500">{discountType === 'percentage' ? '%' : 'ج.م'}</span>
            </div>
          )}
          {discountAmount > 0 && (
            <span className="text-xs text-red-500 font-medium">-{discountAmount.toLocaleString('en-US')} ج.م</span>
          )}
        </div>

        {/* Prepaid */}
        <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
          <label className="text-xs font-medium text-gray-700 whitespace-nowrap">مدفوع مسبقاً</label>
          <div className="relative">
            <span className="absolute inset-y-0 right-0 flex items-center pr-2 text-gray-400"><CreditCard size={13} /></span>
            <input type="number" value={prepaid} onChange={e => setPrepaid(e.target.value)} className="w-32 py-2 pr-8 pl-3 border border-gray-200 rounded-lg outline-none focus:border-primary transition-all text-sm text-center" placeholder="0" />
          </div>
          <span className="text-xs text-gray-500">ج.م</span>
          <button
            onClick={() => setPrepaid(String(afterDiscount))}
            className="px-3 py-1.5 bg-primary text-white text-xs font-medium rounded-lg hover:bg-primary-hover transition-colors"
          >
            مدفوع بالكامل
          </button>
          {prepaidAmount > 0 && (
            <span className="text-xs text-green-600 font-medium">المتبقي: {remainingAmount.toLocaleString('en-US')} ج.م</span>
          )}
        </div>
      </div>

      {/* Notes */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-sm font-bold text-gray-800 mb-3 pb-2 border-b">ملاحظات</h2>
        <FloatingTextarea label="ملاحظات الطلب" value={notes} onChange={e => setNotes(e.target.value)} icon={<StickyNote size={16} />} rows={2} placeholder="ملاحظات الطلب..." />
      </div>
    </div>
  );
};
