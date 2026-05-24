import React, { useState, useMemo } from 'react';
import { ArrowRight, User, Package, ShoppingCart, CreditCard, DollarSign, Truck, StickyNote, Clock, RotateCcw, Undo2, XCircle, Search, Plus, Minus, ChevronDown, FileText, CheckCircle, X } from 'lucide-react';
import type { Order, OrderItem, OrderStatus, ItemStatus, TimelineEvent, ReplacementReason, ReturnReason, ReturnType } from '../types/order';

interface ViewOrderProps {
  setActivePage: (page: any) => void;
}

const ORDER_STATUSES: OrderStatus[] = ['جديد', 'مؤكد', 'قيد التجهيز', 'تم الشحن', 'تم التوصيل', 'ملغي'];
const REPLACEMENT_REASONS: ReplacementReason[] = ['عيب مصنعية', 'مقاس خطأ', 'العميل غير راضي', 'خطأ في الطلب', 'أخرى'];
const RETURN_REASONS: ReturnReason[] = ['تلف', 'خطأ في الطلب', 'العميل غير راضي', 'مقاس خطأ', 'أخرى'];
const RETURN_TYPES: ReturnType[] = ['كاش', 'محفظة', 'مسترد للبنك'];

const STATUS_CONFIG: Record<string, { color: string; bg: string; dot: string }> = {
  'جديد': { color: 'text-blue-700', bg: 'bg-blue-100', dot: 'bg-blue-500' },
  'مؤكد': { color: 'text-indigo-700', bg: 'bg-indigo-100', dot: 'bg-indigo-500' },
  'قيد التجهيز': { color: 'text-yellow-700', bg: 'bg-yellow-100', dot: 'bg-yellow-500' },
  'تم الشحن': { color: 'text-orange-700', bg: 'bg-orange-100', dot: 'bg-orange-500' },
  'تم التوصيل': { color: 'text-green-700', bg: 'bg-green-100', dot: 'bg-green-500' },
  'ملغي': { color: 'text-red-700', bg: 'bg-red-100', dot: 'bg-red-500' },
  'مستبدل جزئي': { color: 'text-cyan-700', bg: 'bg-cyan-100', dot: 'bg-cyan-500' },
  'مستبدل كلي': { color: 'text-cyan-700', bg: 'bg-cyan-100', dot: 'bg-cyan-500' },
  'مرتجع جزئي': { color: 'text-amber-700', bg: 'bg-amber-100', dot: 'bg-amber-500' },
  'مرتجع كلي': { color: 'text-amber-700', bg: 'bg-amber-100', dot: 'bg-amber-500' },
};

const ITEM_STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  'عادي': { color: 'text-green-700', bg: 'bg-green-100', label: 'عادي' },
  'مستبدل': { color: 'text-cyan-700', bg: 'bg-cyan-100', label: 'مستبدل' },
  'مرتجع': { color: 'text-amber-700', bg: 'bg-amber-100', label: 'مرتجع' },
};

function migrateOrder(order: any): Order {
  const now = new Date().toISOString();
  return {
    ...order,
    status: order.status || 'جديد',
    timeline: order.timeline || [{ timestamp: order.date || now, action: 'تم إنشاء الطلب', detail: 'بداية الطلب' }],
    relatedOrders: order.relatedOrders || [],
    items: (order.items || []).map((item: any) => ({
      ...item,
      status: item.status || 'عادي',
    })),
  };
}

function getStorage(): Order[] {
  const raw = localStorage.getItem('my_orders');
  const parsed = raw ? JSON.parse(raw) : [];
  return parsed.map(migrateOrder);
}

function saveStorage(orders: Order[]) {
  localStorage.setItem('my_orders', JSON.stringify(orders));
}

function addTimelineEvent(order: Order, action: string, detail?: string): TimelineEvent[] {
  return [...(order.timeline || []), {
    timestamp: new Date().toLocaleString('ar-EG', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'long' }),
    action,
    detail,
  }];
}

export const ViewOrder: React.FC<ViewOrderProps> = ({ setActivePage }) => {
  const [rawOrder] = useState<any>(() => {
    const data = localStorage.getItem('view_order');
    return data ? JSON.parse(data) : null;
  });

  const [order, setOrder] = useState<Order>(() => rawOrder ? migrateOrder(rawOrder) : null);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [replaceModal, setReplaceModal] = useState<{ itemIndex: number } | null>(null);
  const [returnModal, setReturnModal] = useState<{ itemIndex: number } | null>(null);
  const [cancelModal, setCancelModal] = useState(false);

  const [replaceProduct, setReplaceProduct] = useState('');
  const [replaceQty, setReplaceQty] = useState(1);
  const [replaceReason, setReplaceReason] = useState<ReplacementReason>('العميل غير راضي');
  const [returnQty, setReturnQty] = useState(1);
  const [returnReason, setReturnReason] = useState<ReturnReason>('العميل غير راضي');
  const [returnType, setReturnType] = useState<ReturnType>('كاش');
  const [cancelReason, setCancelReason] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [showStatusConfirm, setShowStatusConfirm] = useState<OrderStatus | null>(null);

  const allProducts = useMemo(() => {
    const raw = localStorage.getItem('my_products');
    return raw ? JSON.parse(raw) : [];
  }, []);

  const filteredProducts = useMemo(() => {
    if (!productSearch) return allProducts.slice(0, 10);
    const q = productSearch.toLowerCase();
    return allProducts.filter((p: any) =>
      p.name?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q)
    ).slice(0, 10);
  }, [productSearch, allProducts]);

  const itemCount = order?.items?.reduce((s, i) => s + (i.quantity || 0), 0) || 0;
  const amount = parseFloat(order?.total?.replace(/[^0-9]/g, '') || '0');

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <Package size={48} className="mb-3 opacity-50" />
        <p className="text-lg font-medium">لم يتم العثور على الطلب</p>
        <button onClick={() => setActivePage('orders')} className="mt-3 px-4 py-2 bg-[#00c950] text-white rounded-lg text-sm">العودة للطلبات</button>
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[order.status] || STATUS_CONFIG['جديد'];

  function changeStatus(newStatus: OrderStatus) {
    const allOrders = getStorage();
    const idx = allOrders.findIndex(o => o.id === order.id);
    if (idx === -1) return;

    const updated = { ...allOrders[idx] };
    updated.status = newStatus;
    updated.timeline = addTimelineEvent(updated, `تم تغيير الحالة إلى "${newStatus}"`);
    if (newStatus === 'ملغي') {
      updated.payment = 'مسترد';
    }
    allOrders[idx] = updated;
    saveStorage(allOrders);
    setOrder(updated);
    localStorage.setItem('view_order', JSON.stringify(updated));
  }

  function handleReplace(itemIndex: number) {
    const item = order.items[itemIndex];
    const replacement = allProducts.find((p: any) =>
      p.name === replaceProduct || p.sku === replaceProduct
    );
    if (!replacement) return;

    const allOrders = getStorage();
    const orderIdx = allOrders.findIndex(o => o.id === order.id);
    if (orderIdx === -1) return;

    const updated = { ...allOrders[orderIdx] };
    const updatedItems = [...updated.items];
    updatedItems[itemIndex] = {
      ...updatedItems[itemIndex],
      status: 'مستبدل' as ItemStatus,
      replacementOrderId: `REP-${Date.now().toString(36).toUpperCase()}`,
      reason: replaceReason,
    };
    updated.items = updatedItems;

    const hasReplaced = updated.items.some(i => i.status === 'مستبدل');
    const allReplaced = updated.items.every(i => i.status === 'مستبدل' || i.status === 'مرتجع');
    updated.status = allReplaced ? 'مستبدل كلي' : hasReplaced ? 'مستبدل جزئي' : updated.status;

    const replacementDetail = `استبدال "${item.productName}" ← "${replacement.name}" (سبب: ${replaceReason})`;
    updated.timeline = addTimelineEvent(updated, replacementDetail);
    if (!updated.relatedOrders.includes(updatedItems[itemIndex].replacementOrderId!)) {
      updated.relatedOrders = [...updated.relatedOrders, updatedItems[itemIndex].replacementOrderId!];
    }

    // Update inventory: return original, deduct replacement
    const invRaw = localStorage.getItem('my_products');
    if (invRaw) {
      const inv = JSON.parse(invRaw);
      const origProduct = inv.find((p: any) => p.id === item.productId);
      if (origProduct) origProduct.quantity = (parseInt(origProduct.quantity) || 0) + item.quantity;
      const replProduct = inv.find((p: any) => p.id === replacement.id);
      if (replProduct) replProduct.quantity = Math.max(0, (parseInt(replProduct.quantity) || 0) - replaceQty);
      localStorage.setItem('my_products', JSON.stringify(inv));
    }

    allOrders[orderIdx] = updated;
    saveStorage(allOrders);
    setOrder(updated);
    localStorage.setItem('view_order', JSON.stringify(updated));
    setReplaceModal(null);
    setReplaceProduct('');
    setReplaceQty(1);
    setReplaceReason('العميل غير راضي');
  }

  function handleReturn(itemIndex: number) {
    const item = order.items[itemIndex];

    const allOrders = getStorage();
    const orderIdx = allOrders.findIndex(o => o.id === order.id);
    if (orderIdx === -1) return;

    const updated = { ...allOrders[orderIdx] };
    const updatedItems = [...updated.items];
    updatedItems[itemIndex] = {
      ...updatedItems[itemIndex],
      status: 'مرتجع' as ItemStatus,
      returnDate: new Date().toISOString(),
      returnType: returnType,
      reason: returnReason,
    };
    updated.items = updatedItems;

    const hasReturn = updated.items.some(i => i.status === 'مرتجع');
    const allReturn = updated.items.every(i => i.status === 'مرتجع' || i.status === 'مستبدل');
    updated.status = allReturn ? 'مرتجع كلي' : hasReturn ? 'مرتجع جزئي' : updated.status;

    const returnDetail = `مرتجع "${item.productName}" بكمية ${returnQty} (سبب: ${returnReason}) - الاسترداد: ${returnType}`;
    updated.timeline = addTimelineEvent(updated, returnDetail);
    updated.payment = returnType === 'مسترد للبنك' || returnType === 'كاش' ? 'مسترد' : updated.payment;

    // Update inventory: return product to stock
    const invRaw = localStorage.getItem('my_products');
    if (invRaw) {
      const inv = JSON.parse(invRaw);
      const prod = inv.find((p: any) => p.id === item.productId);
      if (prod) prod.quantity = (parseInt(prod.quantity) || 0) + returnQty;
      localStorage.setItem('my_products', JSON.stringify(inv));
    }

    allOrders[orderIdx] = updated;
    saveStorage(allOrders);
    setOrder(updated);
    localStorage.setItem('view_order', JSON.stringify(updated));
    setReturnModal(null);
    setReturnQty(1);
    setReturnReason('العميل غير راضي');
    setReturnType('كاش');
  }

  function handleCancel() {
    if (!cancelReason) return;
    changeStatus('ملغي');
    const allOrders = getStorage();
    const idx = allOrders.findIndex(o => o.id === order.id);
    if (idx !== -1) {
      allOrders[idx].cancelReason = cancelReason;
      allOrders[idx].timeline = addTimelineEvent(allOrders[idx], `تم الإلغاء - ${cancelReason}`);
      saveStorage(allOrders);
      setOrder(allOrders[idx]);
      localStorage.setItem('view_order', JSON.stringify(allOrders[idx]));
    }
    setCancelModal(false);
  }

  return (
    <div className="flex flex-col pb-10">
      {/* ── Back + Header ───────────────────────── */}
      <div className="flex items-center justify-between gap-3 bg-white p-3 px-5 rounded-xl shadow-sm border border-slate-100 mb-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setActivePage('orders')} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors">
            <ArrowRight size={20} />
          </button>
          <h1 className="text-lg font-bold text-slate-800">الطلب {order.id}</h1>
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusCfg.bg} ${statusCfg.color}`}>
            {order.status}
          </span>
          {order.cancelReason && <span className="text-xs text-red-500">({order.cancelReason})</span>}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <button onClick={() => setShowStatusDropdown(!showStatusDropdown)} className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
              <Clock size={14} /> تغيير الحالة <ChevronDown size={12} />
            </button>
            {showStatusDropdown && (
              <div className="absolute top-full left-0 mt-1 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-40 min-w-[140px]">
                {ORDER_STATUSES.filter(s => s !== order.status).map(s => (
                  <button key={s} onClick={() => { setShowStatusDropdown(false); setShowStatusConfirm(s); }}
                    className="w-full text-right px-3 py-2 text-xs hover:bg-slate-50 transition-colors flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${STATUS_CONFIG[s]?.dot || 'bg-slate-400'}`} /> {s}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button onClick={() => setCancelModal(true)} className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors">
            <XCircle size={14} /> إلغاء الطلب
          </button>
        </div>
      </div>

      {/* ── Stats Cards ──────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
          <p className="text-xs text-slate-500 font-medium">عدد المنتجات</p>
          <div className="flex items-center gap-1.5">
            <Package size={14} className="text-[#00c950]" />
            <h3 className="text-lg font-bold text-slate-800">{order.items?.length || 0}</h3>
          </div>
        </div>
        <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
          <p className="text-xs text-slate-500 font-medium">إجمالي القطع</p>
          <div className="flex items-center gap-1.5">
            <ShoppingCart size={14} className="text-[#00c950]" />
            <h3 className="text-lg font-bold text-slate-800">{itemCount}</h3>
          </div>
        </div>
        <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
          <p className="text-xs text-slate-500 font-medium">تكلفة الشحن</p>
          <div className="flex items-center gap-1.5">
            <Truck size={14} className="text-[#00c950]" />
            <h3 className="text-lg font-bold text-slate-800">{(order as any).shippingCost || 0} ج.م</h3>
          </div>
        </div>
        <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
          <p className="text-xs text-slate-500 font-medium">المتبقي</p>
          <div className="flex items-center gap-1.5">
            <DollarSign size={14} className="text-[#00c950]" />
            <h3 className="text-lg font-bold text-slate-800">{order.remaining?.toLocaleString('en-US') || 0} ج.م</h3>
          </div>
        </div>
      </div>

      {/* ── Timeline + Info Grid ─────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-4">
        {/* Timeline */}
        <div className="lg:col-span-2 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
          <h2 className="text-sm font-bold text-slate-800 mb-4 pb-2 border-b flex items-center gap-2">
            <Clock size={16} className="text-[#00c950]" /> سجل الحركات
          </h2>
          <div className="space-y-0 relative">
            <div className="absolute right-[7px] top-2 bottom-2 w-0.5 bg-slate-200"></div>
            {order.timeline.map((event, idx) => (
              <div key={idx} className="flex items-start gap-3 pb-4 relative">
                <div className={`w-4 h-4 rounded-full border-2 border-white shrink-0 mt-0.5 z-10 ${idx === order.timeline.length - 1 ? 'bg-[#00c950]' : 'bg-slate-300'}`}></div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-800">{event.action}</p>
                  {event.detail && <p className="text-[10px] text-slate-500 mt-0.5">{event.detail}</p>}
                  <p className="text-[9px] text-slate-400 mt-0.5" dir="ltr">{event.timestamp}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Customer + Order Info */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
            <h2 className="text-sm font-bold text-slate-800 mb-3 pb-2 border-b flex items-center gap-2">
              <User size={16} className="text-[#00c950]" /> معلومات العميل
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-slate-600">
              <div><span className="text-[10px] text-slate-400 block">الاسم</span><span className="font-medium text-slate-800">{order.customer}</span></div>
              <div><span className="text-[10px] text-slate-400 block">رقم الهاتف</span><span className="font-medium text-slate-800" dir="ltr">{order.phone || '—'}</span></div>
              {order.phone2 && <div><span className="text-[10px] text-slate-400 block">هاتف إضافي</span><span className="font-medium text-slate-800" dir="ltr">{order.phone2}</span></div>}
              {order.governorate && <div><span className="text-[10px] text-slate-400 block">المحافظة</span><span className="font-medium text-slate-800">{order.governorate}</span></div>}
              {order.district && <div><span className="text-[10px] text-slate-400 block">المركز</span><span className="font-medium text-slate-800">{order.district}</span></div>}
              {(order as any).shippingCompany && <div className="sm:col-span-2"><span className="text-[10px] text-slate-400 block">شركة الشحن</span><span className="font-medium text-slate-800">{(order as any).shippingCompany}</span></div>}
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
            <h2 className="text-sm font-bold text-slate-800 mb-3 pb-2 border-b flex items-center gap-2">
              <CreditCard size={16} className="text-[#00c950]" /> التفاصيل المالية
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-slate-50 rounded-xl text-center">
                <div className="text-[10px] text-slate-500 mb-1">الإجمالي</div>
                <div className="text-lg font-bold text-slate-800">{amount.toLocaleString('en-US')} ج.م</div>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl text-center">
                <div className="text-[10px] text-slate-500 mb-1">الخصم</div>
                <div className={`text-lg font-bold ${order.discountAmount > 0 ? 'text-red-500' : 'text-slate-400'}`}>{order.discountAmount > 0 ? `-${order.discountAmount.toLocaleString('en-US')} ج.م` : '—'}</div>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl text-center">
                <div className="text-[10px] text-slate-500 mb-1">المدفوع</div>
                <div className={`text-lg font-bold ${order.prepaid > 0 ? 'text-green-600' : 'text-slate-400'}`}>{order.prepaid > 0 ? `${order.prepaid.toLocaleString('en-US')} ج.م` : '—'}</div>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl text-center">
                <div className="text-[10px] text-slate-500 mb-1">المتبقي</div>
                <div className="text-lg font-bold text-slate-800">{order.remaining?.toLocaleString('en-US') || 0} ج.م</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Products Table ────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 mb-4">
        <h2 className="text-sm font-bold text-slate-800 p-4 pb-0 flex items-center gap-2">
          <Package size={16} className="text-[#00c950]" /> المنتجات ({order.items?.length || 0})
        </h2>
        {order.items?.length > 0 ? (
          <div className="overflow-x-auto p-4 pt-3">
            <table className="w-full text-center text-sm border-collapse border border-slate-200 rounded-lg">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="p-2.5 font-medium text-slate-600">#</th>
                  <th className="p-2.5 font-medium text-slate-600">المنتج</th>
                  <th className="p-2.5 font-medium text-slate-600">الكود</th>
                  <th className="p-2.5 font-medium text-slate-600">الكمية</th>
                  <th className="p-2.5 font-medium text-slate-600">السعر</th>
                  <th className="p-2.5 font-medium text-slate-600">الإجمالي</th>
                  <th className="p-2.5 font-medium text-slate-600">الحالة</th>
                  <th className="p-2.5 font-medium text-slate-600">إجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {order.items.map((item, idx) => {
                  const itemCfg = ITEM_STATUS_CONFIG[item.status] || ITEM_STATUS_CONFIG['عادي'];
                  return (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-2.5 text-slate-400 text-xs">{idx + 1}</td>
                      <td className="p-2.5 font-medium text-slate-800 text-right pr-4">{item.productName}</td>
                      <td className="p-2.5 text-xs text-slate-500 font-mono">{item.sku || '—'}</td>
                      <td className="p-2.5 font-bold text-slate-800">{item.quantity}</td>
                      <td className="p-2.5 text-slate-600">{item.price} ج.م</td>
                      <td className="p-2.5 font-bold text-[#00c950]">{item.total} ج.م</td>
                      <td className="p-2.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${itemCfg.bg} ${itemCfg.color}`}>
                          {item.status === 'عادي' && <CheckCircle size={10} />}
                          {item.status === 'مستبدل' && <RotateCcw size={10} />}
                          {item.status === 'مرتجع' && <Undo2 size={10} />}
                          {itemCfg.label}
                        </span>
                      </td>
                      <td className="p-2.5">
                        {item.status === 'عادي' && (
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => { setReplaceModal({ itemIndex: idx }); setReplaceProduct(''); }}
                              className="flex items-center gap-1.5 px-2.5 py-1.5 text-cyan-600 bg-cyan-50 hover:bg-cyan-100 rounded-lg transition-colors text-xs font-semibold" title="استبدال">
                              <RotateCcw size={14} />
                              <span>استبدال</span>
                            </button>
                            <button onClick={() => { setReturnModal({ itemIndex: idx }); setReturnQty(item.quantity); }}
                              className="flex items-center gap-1.5 px-2.5 py-1.5 text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors text-xs font-semibold" title="مرتجع">
                              <Undo2 size={14} />
                              <span>مرتجع</span>
                            </button>
                          </div>
                        )}
                        {item.replacementOrderId && (
                          <span className="text-[10px] text-cyan-600 font-medium">طلب: {item.replacementOrderId}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 border-t border-slate-200 font-bold">
                  <td colSpan={5} className="p-2.5 text-left text-slate-600">الإجمالي الكلي</td>
                  <td className={`p-2.5 font-bold ${order.items.some(i => i.status !== 'عادي') ? 'text-orange-600' : 'text-[#00c950]'}`}>
                    {order.items.reduce((s, i) => s + (i.total || 0), 0)} ج.م
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-slate-400 text-sm">لا توجد منتجات</div>
        )}
      </div>

      {/* ── Notes ─────────────────────────────────── */}
      {order.notes && (
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 mb-4">
          <h2 className="text-sm font-bold text-slate-800 mb-3 pb-2 border-b flex items-center gap-2">
            <StickyNote size={16} className="text-[#00c950]" /> ملاحظات
          </h2>
          <p className="text-sm text-slate-600">{order.notes}</p>
        </div>
      )}

      {/* ── Related Orders ────────────────────────── */}
      {order.relatedOrders.length > 0 && (
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
          <h2 className="text-sm font-bold text-slate-800 mb-3 pb-2 border-b flex items-center gap-2">
            <FileText size={16} className="text-[#00c950]" /> طلبات مرتبطة
          </h2>
          <div className="flex flex-wrap gap-2">
            {order.relatedOrders.map((relId, idx) => (
              <span key={idx} className="px-3 py-1.5 bg-cyan-50 text-cyan-700 rounded-lg text-xs font-medium">
                {relId}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Replace Modal ─────────────────────────── */}
      {replaceModal && (
        <div className="fixed top-0 left-0 bottom-0 right-0 z-[100] p-4 sm:p-6 flex flex-col bg-black/40 backdrop-blur-md" onClick={() => setReplaceModal(null)}>
          <div className="max-w-3xl w-full mx-auto my-auto bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-full" onClick={e => e.stopPropagation()}>
            <div className="p-4 sm:p-5 border-b border-gray-200 flex items-center justify-between bg-gray-50/80 shrink-0">
              <button onClick={() => setReplaceModal(null)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-200 hover:text-gray-700 transition-all cursor-pointer">
                <X size={20} />
              </button>
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                استبدال منتج <RotateCcw size={20} className="text-cyan-600" />
              </h3>
            </div>
            
            <div className="p-6 sm:p-8 flex-1 overflow-y-auto space-y-4">
              <div className="bg-slate-50 p-3 rounded-xl">
                <p className="text-[10px] text-slate-500 mb-1">المنتج الأصلي</p>
                <p className="text-sm font-bold text-slate-800">{order.items[replaceModal.itemIndex].productName}</p>
                <p className="text-xs text-slate-500">الكمية: {order.items[replaceModal.itemIndex].quantity} | السعر: {order.items[replaceModal.itemIndex].price} ج.م</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">اختر منتج بديل</label>
                <div className="relative">
                  <input type="text" value={productSearch} onChange={e => setProductSearch(e.target.value)}
                    placeholder="ابحث عن منتج..."
                    className="w-full p-2.5 pr-9 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-cyan-500 focus:bg-white transition-all"
                  />
                  <Search size={14} className="absolute right-3 top-3 text-slate-400" />
                </div>
                {filteredProducts.length > 0 && (
                  <div className="mt-1.5 max-h-32 overflow-y-auto border border-slate-200 rounded-lg divide-y">
                    {filteredProducts.map((p: any) => (
                      <button key={p.id} onClick={() => { setReplaceProduct(p.name); setProductSearch(p.name); }}
                        className={`w-full text-right px-3 py-2 text-xs hover:bg-cyan-50 transition-colors flex justify-between
                        ${replaceProduct === p.name ? 'bg-cyan-50 text-cyan-700 font-semibold' : 'text-slate-700'}`}>
                        <span>{p.name}</span>
                        <span className="text-slate-400">{p.price} ج.م</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">سبب الاستبدال</label>
                <select value={replaceReason} onChange={e => setReplaceReason(e.target.value as ReplacementReason)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-cyan-500 focus:bg-white transition-all">
                  {REPLACEMENT_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>

            <div className="p-4 sm:p-5 border-t border-gray-100 flex items-center gap-2 bg-gray-50/50 shrink-0">
              <button onClick={() => { setReplaceModal(null); setProductSearch(''); }}
                className="flex-1 px-4 py-2.5 text-sm font-semibold bg-white border border-gray-200 text-slate-600 hover:bg-slate-50 rounded-xl transition-colors">
                إلغاء
              </button>
              <button onClick={() => handleReplace(replaceModal.itemIndex)} disabled={!replaceProduct}
                className="flex-1 px-4 py-2.5 text-sm font-semibold bg-[#00c950] text-white hover:bg-[#00b548] rounded-xl transition-colors disabled:opacity-40 shadow-sm shadow-[#00c950]/20">
                تأكيد الاستبدال
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Return Modal ──────────────────────────── */}
      {returnModal && (
        <div className="fixed top-0 left-0 bottom-0 right-0 z-[100] p-4 sm:p-6 flex flex-col bg-black/40 backdrop-blur-md" onClick={() => setReturnModal(null)}>
          <div className="max-w-3xl w-full mx-auto my-auto bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-full" onClick={e => e.stopPropagation()}>
            <div className="p-4 sm:p-5 border-b border-gray-200 flex items-center justify-between bg-gray-50/80 shrink-0">
              <button onClick={() => setReturnModal(null)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-200 hover:text-gray-700 transition-all cursor-pointer">
                <X size={20} />
              </button>
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                مرتجع منتج <Undo2 size={20} className="text-amber-600" />
              </h3>
            </div>
            
            <div className="p-6 sm:p-8 flex-1 overflow-y-auto space-y-4">
              <div className="bg-slate-50 p-3 rounded-xl">
                <p className="text-[10px] text-slate-500 mb-1">المنتج</p>
                <p className="text-sm font-bold text-slate-800">{order.items[returnModal.itemIndex].productName}</p>
                <p className="text-xs text-slate-500">المتبقي: {order.items[returnModal.itemIndex].quantity} قطعة</p>
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">الكمية المرتجعة</label>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setReturnQty(Math.min(order.items[returnModal.itemIndex].quantity, returnQty + 1))}
                      className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
                      <Plus size={14} />
                    </button>
                    <span className="w-10 text-center font-bold text-slate-800">{returnQty}</span>
                    <button onClick={() => setReturnQty(Math.max(1, returnQty - 1))}
                      className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
                      <Minus size={14} />
                    </button>
                  </div>
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">نوع الاسترداد</label>
                  <select value={returnType} onChange={e => setReturnType(e.target.value as ReturnType)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-amber-500 focus:bg-white transition-all">
                    {RETURN_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">سبب المرتجع</label>
                <select value={returnReason} onChange={e => setReturnReason(e.target.value as ReturnReason)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-amber-500 focus:bg-white transition-all">
                  {RETURN_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl">
                <p className="text-xs text-slate-500">قيمة المسترد: <strong className="text-amber-600 font-sans">{(order.items[returnModal.itemIndex].price * returnQty).toLocaleString()} ج.م</strong></p>
              </div>
            </div>

            <div className="p-4 sm:p-5 border-t border-gray-100 flex items-center gap-2 bg-gray-50/50 shrink-0">
              <button onClick={() => setReturnModal(null)}
                className="flex-1 px-4 py-2.5 text-sm font-semibold bg-white border border-gray-200 text-slate-600 hover:bg-slate-50 rounded-xl transition-colors">
                إلغاء
              </button>
              <button onClick={() => handleReturn(returnModal.itemIndex)}
                className="flex-1 px-4 py-2.5 text-sm font-semibold bg-[#00c950] text-white hover:bg-[#00b548] rounded-xl transition-colors shadow-sm shadow-[#00c950]/20">
                تأكيد المرتجع
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Cancel Modal ──────────────────────────── */}
      {cancelModal && (
        <div className="fixed top-0 left-0 bottom-0 right-0 z-[100] p-4 sm:p-6 flex flex-col bg-black/40 backdrop-blur-md" onClick={() => setCancelModal(false)}>
          <div className="max-w-2xl w-full mx-auto my-auto bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-full" onClick={e => e.stopPropagation()}>
            <div className="p-4 sm:p-5 border-b border-gray-200 flex items-center justify-between bg-gray-50/80 shrink-0">
              <button onClick={() => setCancelModal(false)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-200 hover:text-gray-700 transition-all cursor-pointer">
                <X size={20} />
              </button>
              <h3 className="text-lg font-bold text-red-600 flex items-center gap-2">
                إلغاء الطلب {order.id} <XCircle size={20} />
              </h3>
            </div>
            
            <div className="p-6 sm:p-8 flex-1 overflow-y-auto space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2">سبب الإلغاء</label>
                <div className="space-y-1.5">
                  {['العميل ألغى الطلب', 'لم يتم الرد على الهاتف', 'عنوان غير صحيح', 'نفاذ من المخزون', 'تأخير في التوصيل', 'أخرى'].map(r => (
                    <button key={r} onClick={() => setCancelReason(r)}
                      className={`w-full text-right px-3 py-2 text-xs rounded-lg transition-colors ${cancelReason === r ? 'bg-red-50 text-red-700 border border-red-200 font-semibold' : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-transparent'}`}>
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-5 border-t border-gray-100 flex items-center gap-2 bg-gray-50/50 shrink-0">
              <button onClick={() => setCancelModal(false)}
                className="flex-1 px-4 py-2.5 text-sm font-semibold bg-white border border-gray-200 text-slate-600 hover:bg-slate-50 rounded-xl transition-colors">
                تراجع
              </button>
              <button onClick={handleCancel} disabled={!cancelReason}
                className="flex-1 px-4 py-2.5 text-sm font-semibold bg-red-600 text-white hover:bg-red-700 rounded-xl transition-colors disabled:opacity-40 shadow-sm shadow-red-600/20">
                تأكيد الإلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Status Confirm Modal ──────────────────── */}
      {showStatusConfirm && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-md z-50 flex items-center justify-center">
          <div className="bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold text-slate-800 mb-2">تأكيد تغيير الحالة</h3>
            <p className="text-sm text-slate-500 mb-6">هل أنت متأكد من تغيير حالة الطلب {order.id} إلى <strong className="text-slate-800">{showStatusConfirm}</strong>؟</p>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowStatusConfirm(null)}
                className="flex-1 px-4 py-2.5 text-sm font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl transition-colors">
                تراجع
              </button>
              <button onClick={() => { changeStatus(showStatusConfirm); setShowStatusConfirm(null); }}
                className="flex-1 px-4 py-2.5 text-sm font-semibold bg-[#00c950] text-white hover:bg-[#00b548] rounded-xl transition-colors">
                تأكيد
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
