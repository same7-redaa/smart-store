import React, { useState, useMemo, useRef } from 'react';
import { Search, Filter, Eye, Edit, Trash2, BarChart2, Plus, X, MapPin, Phone, User, FileText, Package, Download, Upload, CheckSquare, Square, Trash, ChevronDown, Printer, FileDown, Truck, Clock, CheckCircle, RotateCcw, Star, Layers } from 'lucide-react';
import { FormattedDate, normDigits } from '../components/FormattedDate';
import { AnimatePresence, motion } from 'motion/react';
import { useApp } from '../context/AppContext';
import { exportToExcel, importFromExcel, downloadTemplate, formatItemsCell, parseItemsCell } from '../utils/excel';
import { syncOrderToSystem, getFromStorage, saveToStorage, adjustStockForTransition, recalculateCustomerStats } from '../utils/sync';
import { OrderFinancialWizard } from '../components/OrderFinancialWizard';


interface OrderItem {
  productId: string;
  variantName: string;
  productName: string;
  sku: string;
  quantity: number;
  price: number;
  total: number;
}

interface Order {
  id: string;
  customer: string;
  phone: string;
  phone2: string;
  governorate: string;
  district: string;
  address: string;
  landmark: string;
  date: string;
  total: string;
  discountType: string;
  discountValue: number;
  discountAmount: number;
  afterDiscount: number;
  prepaid: number;
  remaining: number;
  status: string;
  payment: string;
  paymentMethod: string;
  notes: string;
  items: OrderItem[];
  cancelReason?: string;
}

const CANCEL_REASONS = [
  'العميل ألغى الطلب',
  'لم يتم الرد على الهاتف',
  'عنوان غير صحيح',
  'عميل غير مرغوب فيه (Spam)',
  'نفاذ من المخزون',
  'تأخير في التوصيل',
  'أخرى',
];

export const Orders: React.FC<{ setActivePage?: (page: any) => void }> = ({ setActivePage }) => {
  const [showStats, setShowStats] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const { confirm, notify } = useApp();
  const fileRef = useRef<HTMLInputElement>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('الكل');
  const [paymentFilter, setPaymentFilter] = useState('الكل');
  const [productFilter, setProductFilter] = useState('الكل');
  const [governorateFilter, setGovernorateFilter] = useState('الكل');
  const [activeTab, setActiveTab] = useState('الكل');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  const [datePreset, setDatePreset] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pendingStatusOrder, setPendingStatusOrder] = useState<string | null>(null);
  const [pendingCancel, setPendingCancel] = useState<{ target: 'bulk' | string } | null>(null);
  const [wizardOrder, setWizardOrder] = useState<{ order: any; targetStatus: 'ملغي بعد الشحن' | 'مرتجع كلي' | 'مرتجع جزئي' | 'استبدال' } | null>(null);

  const statusPopupRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (statusPopupRef.current && !statusPopupRef.current.contains(e.target as Node)) {
        setPendingStatusOrder(null);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery, statusFilter, paymentFilter, productFilter, governorateFilter, datePreset, dateFrom, dateTo]);

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

const toISODate = (d: Date): string => d.toISOString().split('T')[0];
const startOfDay = (d: Date): Date => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const endOfDay = (d: Date): Date => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);

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
    case 'today': {
      const today = startOfDay(now);
      return { from: toISODate(today), to: toISODate(today) };
    }
    case 'week': {
      const dayOfWeek = now.getDay();
      const monday = new Date(y, m, d - ((dayOfWeek + 6) % 7));
      const sunday = new Date(y, m, monday.getDate() + 6);
      return { from: toISODate(monday), to: toISODate(sunday) };
    }
    case 'month': {
      const first = new Date(y, m, 1);
      const last = new Date(y, m + 1, 0);
      return { from: toISODate(first), to: toISODate(last) };
    }
    case 'year': {
      const first = new Date(y, 0, 1);
      const last = new Date(y, 11, 31);
      return { from: toISODate(first), to: toISODate(last) };
    }
    default: return null;
  }
};

  const [orders, setOrders] = useState<Order[]>(() => {
    const raw = localStorage.getItem('my_orders');
    return raw ? JSON.parse(raw) : [];
  });

  const getCustomerScore = (customerName: string, phone: string) => {
    const customerOrders = orders.filter((o: any) => o.phone === phone || o.customer === customerName);
    const cancelledCount = customerOrders.filter((o: any) => o.status === 'ملغي').length;
    const count = customerOrders.length;
    if (cancelledCount > 0) return { level: 'red', label: 'غير موثوق' };
    if (count >= 3) return { level: 'green', label: 'ممتاز' };
    if (count >= 1) return { level: 'yellow', label: 'متوسط' };
    return { level: 'yellow', label: 'جديد' };
  };

  const isNewOrder = (dateStr: string, status: string) => {
    if (status !== 'قيد المعالجة') return false;
    const d = parseDate(dateStr);
    if (!d) return false;
    const diffHours = (new Date().getTime() - d.getTime()) / (1000 * 60 * 60);
    return diffHours <= 48 && diffHours >= 0;
  };

  const filteredOrders = useMemo(() => {
    let result = orders;

    // Apply preset or custom date range
    const effectiveFrom = datePreset !== 'custom' && datePreset !== 'all'
      ? getPresetRange(datePreset)?.from || dateFrom
      : dateFrom;
    const effectiveTo = datePreset !== 'custom' && datePreset !== 'all'
      ? getPresetRange(datePreset)?.to || dateTo
      : dateTo;

    if (effectiveFrom || effectiveTo) {
      const fromDate = effectiveFrom ? new Date(effectiveFrom + 'T00:00:00') : null;
      const toDate = effectiveTo ? new Date(effectiveTo + 'T23:59:59') : null;
      result = result.filter(o => {
        const od = parseDate(o.date);
        if (!od) return true;
        if (fromDate && od < fromDate) return false;
        if (toDate && od > toDate) return false;
        return true;
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(o =>
        o.id.toLowerCase().includes(q) ||
        o.customer.toLowerCase().includes(q) ||
        o.phone?.includes(q)
      );
    }
    
    if (activeTab !== 'الكل') {
      if (activeTab === 'جديد') {
        result = result.filter(o => o.status === 'قيد المعالجة' && isNewOrder(o.date, o.status));
      } else if (activeTab === 'قيد المعالجة') {
        result = result.filter(o => o.status === 'قيد المعالجة' && !isNewOrder(o.date, o.status));
      } else if (activeTab === 'جاري التوصيل') {
        result = result.filter(o => o.status === 'جاري التوصيل');
      } else if (activeTab === 'مكتمل') {
        result = result.filter(o => o.status === 'مكتمل');
      } else if (activeTab === 'مرتجع ومشاكل') {
        result = result.filter(o => ['ملغي', 'ملغي بعد الشحن', 'مرتجع كلي', 'مرتجع جزئي', 'استبدال'].includes(o.status));
      }
    } else if (statusFilter !== 'الكل') {
      result = result.filter(o => o.status === statusFilter);
    }

    if (paymentFilter !== 'الكل') {
      result = result.filter(o => o.payment === paymentFilter);
    }

    if (productFilter !== 'الكل') {
      result = result.filter(o =>
        o.items?.some((item: any) => item.productName === productFilter)
      );
    }

    if (governorateFilter !== 'الكل') {
      result = result.filter(o => o.governorate === governorateFilter);
    }

    result.sort((a, b) => {
      const da = parseDate(a.date)?.getTime() || 0;
      const db = parseDate(b.date)?.getTime() || 0;
      return db - da; 
    });

    return result;
  }, [orders, searchQuery, statusFilter, paymentFilter, productFilter, governorateFilter, datePreset, dateFrom, dateTo, activeTab]);

  const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE) || 1;
  const currentOrders = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredOrders.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredOrders, currentPage]);

  const handleExport = () => {
    if (!orders.length) { notify('info', 'لا توجد طلبات للتصدير'); return; }
    const data = orders.map(o => ({
      'رقم الطلب': o.id,
      'العميل': o.customer,
      'الهاتف': o.phone,
      'الهاتف 2': o.phone2 || '',
      'المحافظة': o.governorate || '',
      'المركز': o.district || '',
      'العنوان': o.address || '',
      'المعلم': o.landmark || '',
      'التاريخ': normDigits(o.date),
      'المنتجات': formatItemsCell(o.items || []),
      'شركة الشحن': o.shippingCompany || '',
      'سعر الشحن': o.shippingCost || 0,
      'الإجمالي': o.total,
      'الإجمالي الفرعي': o.subtotal || '',
      'نوع الخصم': o.discountType || 'none',
      'قيمة الخصم': o.discountValue || 0,
      'مبلغ الخصم': o.discountAmount || 0,
      'بعد الخصم': o.afterDiscount || '',
      'مدفوع مسبقاً': o.prepaid || 0,
      'المتبقي': o.remaining || '',
      'حالة الطلب': o.status,
      'حالة الدفع': o.payment,
      'طريقة الدفع': o.paymentMethod || '',
      'ملاحظات': o.notes || '',
    }));
    exportToExcel(data, [
      { key: 'رقم الطلب', header: 'رقم الطلب', width: 15 },
      { key: 'العميل', header: 'العميل', width: 20 },
      { key: 'الهاتف', header: 'الهاتف', width: 15 },
      { key: 'الهاتف 2', header: 'الهاتف 2', width: 15 },
      { key: 'المحافظة', header: 'المحافظة', width: 15 },
      { key: 'المركز', header: 'المركز', width: 15 },
      { key: 'العنوان', header: 'العنوان', width: 25 },
      { key: 'المعلم', header: 'المعلم', width: 20 },
      { key: 'التاريخ', header: 'التاريخ', width: 20 },
      { key: 'المنتجات', header: 'المنتجات (SKU|اسم|كمية|سعر|إجمالي)', width: 50 },
      { key: 'شركة الشحن', header: 'شركة الشحن', width: 15 },
      { key: 'سعر الشحن', header: 'سعر الشحن', width: 12 },
      { key: 'الإجمالي', header: 'الإجمالي', width: 15 },
      { key: 'الإجمالي الفرعي', header: 'الإجمالي الفرعي', width: 15 },
      { key: 'نوع الخصم', header: 'نوع الخصم', width: 12 },
      { key: 'قيمة الخصم', header: 'قيمة الخصم', width: 12 },
      { key: 'مبلغ الخصم', header: 'مبلغ الخصم', width: 12 },
      { key: 'بعد الخصم', header: 'بعد الخصم', width: 15 },
      { key: 'مدفوع مسبقاً', header: 'مدفوع مسبقاً', width: 12 },
      { key: 'المتبقي', header: 'المتبقي', width: 15 },
      { key: 'حالة الطلب', header: 'حالة الطلب', width: 15 },
      { key: 'حالة الدفع', header: 'حالة الدفع', width: 15 },
      { key: 'طريقة الدفع', header: 'طريقة الدفع', width: 12 },
      { key: 'ملاحظات', header: 'ملاحظات', width: 25 },
    ], 'orders');
    notify('success', `تم تصدير ${orders.length} طلب بنجاح`);
  };

  const handleDownloadTemplate = () => {
    downloadTemplate([
      { key: 'id', header: 'رقم الطلب', width: 15 },
      { key: 'customer', header: 'العميل', width: 20 },
      { key: 'phone', header: 'الهاتف', width: 15 },
      { key: 'governorate', header: 'المحافظة', width: 15 },
      { key: 'address', header: 'العنوان', width: 25 },
      { key: 'products', header: 'المنتجات (SKU|اسم|كمية|سعر|إجمالي)', width: 50 },
      { key: 'shippingCompany', header: 'شركة الشحن', width: 15 },
      { key: 'total', header: 'الإجمالي', width: 15 },
      { key: 'status', header: 'حالة الطلب', width: 15 },
      { key: 'payment', header: 'حالة الدفع', width: 15 },
    ], 'orders-template');
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
      const orderId = String(r['رقم الطلب'] || r['id'] || `#${Date.now()}`);
      const items = parseItemsCell(r['المنتجات'] || r['products'] || '');

      // Check if order already exists
      const existingOrders = getFromStorage('my_orders');
      const existingIdx = existingOrders.findIndex((o: any) => o.id === orderId);

      const orderData = {
        id: orderId,
        customer: String(r['العميل'] || r['customer'] || ''),
        phone: String(r['الهاتف'] || r['phone'] || ''),
        phone2: String(r['الهاتف 2'] || r['phone2'] || ''),
        governorate: String(r['المحافظة'] || r['governorate'] || ''),
        district: String(r['المركز'] || r['district'] || ''),
        address: String(r['العنوان'] || r['address'] || ''),
        landmark: String(r['المعلم'] || r['landmark'] || ''),
        date: String(r['التاريخ'] || r['date'] || new Date().toLocaleDateString('ar-EG-u-nu-latn')),
        total: String(r['الإجمالي'] || r['total'] || '0 ج.م'),
        subtotal: Number(r['الإجمالي الفرعي'] || r['subtotal'] || 0),
        discountType: String(r['نوع الخصم'] || r['discountType'] || 'none'),
        discountValue: Number(r['قيمة الخصم'] || r['discountValue'] || 0),
        discountAmount: Number(r['مبلغ الخصم'] || r['discountAmount'] || 0),
        afterDiscount: Number(String(r['بعد الخصم'] || r['afterDiscount'] || '0').replace(/[^0-9.-]/g, '')) || 0,
        prepaid: Number(r['مدفوع مسبقاً'] || r['prepaid'] || 0),
        remaining: Number(String(r['المتبقي'] || r['remaining'] || '0').replace(/[^0-9.-]/g, '')) || 0,
        status: String(r['حالة الطلب'] || r['status'] || 'قيد المعالجة'),
        payment: String(r['حالة الدفع'] || r['payment'] || 'بانتظار الدفع'),
        paymentMethod: String(r['طريقة الدفع'] || r['paymentMethod'] || 'cod'),
        notes: String(r['ملاحظات'] || r['notes'] || ''),
        items,
        shippingCompany: String(r['شركة الشحن'] || r['shippingCompany'] || ''),
        shippingCost: Number(r['سعر الشحن'] || r['shippingCost'] || 0),
      };

      if (!orderData.customer || !orderData.phone) {
        totalErrors++;
        continue;
      }

      if (existingIdx > -1) {
        existingOrders[existingIdx] = orderData;
        totalUpdated++;
      } else {
        existingOrders.unshift(orderData);
        totalCreated++;
      }
      saveToStorage('my_orders', existingOrders);

      // Sync to system (customer, stock, shipping)
      const syncResult = syncOrderToSystem(orderData);
      allDetails.push(...syncResult.details);
      totalErrors += syncResult.errors.length;
    }

    setOrders(getFromStorage('my_orders'));

    let msg = `تم استيراد ${result.data.length} طلب`;
    if (totalCreated > 0) msg += ` | إنشاء: ${totalCreated}`;
    if (totalUpdated > 0) msg += ` | تحديث: ${totalUpdated}`;
    if (totalErrors > 0) msg += ` | أخطاء: ${totalErrors}`;
    notify(totalErrors > 0 ? 'error' : 'success', msg);

    if (allDetails.length > 0) {
      console.log('تفاصيل الاستيراد:', allDetails);
    }
    e.target.value = '';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'مكتمل': return 'bg-green-100 text-green-700';
      case 'قيد المعالجة': return 'bg-yellow-100 text-yellow-700';
      case 'جاري التوصيل': return 'bg-primary-light text-primary';
      case 'ملغي': return 'bg-red-100 text-red-700';
      case 'ملغي بعد الشحن': return 'bg-red-200 text-red-800 font-semibold';
      case 'مرتجع كلي': return 'bg-orange-100 text-orange-700 border border-orange-200';
      case 'مرتجع جزئي': return 'bg-orange-50 text-orange-600 border border-orange-100';
      case 'استبدال': return 'bg-blue-100 text-blue-700 border border-blue-200';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getPaymentColor = (payment: string) => {
    switch (payment) {
      case 'مدفوع': return 'text-green-600';
      case 'بانتظار الدفع': return 'text-yellow-600';
      case 'مسترد': return 'text-gray-500';
      default: return 'text-gray-700';
    }
  };

  const deleteOrder = (id: string) => {
    confirm({
      title: 'حذف الطلب',
      message: 'هل أنت متأكد من حذف هذا الطلب؟',
      onConfirm: () => {
        const orderToDelete = orders.find(o => o.id === id);
        if (orderToDelete) {
          adjustStockForTransition(orderToDelete, orderToDelete.status, 'ملغي');
        }
        const updated = orders.filter(o => o.id !== id);
        localStorage.setItem('my_orders', JSON.stringify(updated));
        setOrders(updated);
        setSelectedIds(prev => { const next = new Set(prev); next.delete(id); return next; });
        if (orderToDelete) {
          recalculateCustomerStats(orderToDelete.phone, orderToDelete.customer);
        }
        notify('success', 'تم حذف الطلب بنجاح');
      }
    });
  };

  const updateCustomerCancelCount = (customerName: string, phone: string, increment: boolean) => {
    const customers = JSON.parse(localStorage.getItem('my_customers') || '[]');
    const idx = customers.findIndex((c: any) => c.phone === phone || c.name === customerName);
    if (idx > -1) {
      customers[idx].cancelledOrders = (customers[idx].cancelledOrders || 0) + (increment ? 1 : -1);
      const c = customers[idx];
      if (!['vip', 'suspicious', 'banned'].includes(c.badge)) {
        const cancelled = c.cancelledOrders || 0;
        const ordersCount = c.ordersCount || 0;
        if (cancelled > 0) c.badge = 'troubled';
        else if (ordersCount >= 10) c.badge = 'excellent';
        else if (ordersCount >= 3) c.badge = 'trusted';
        else c.badge = 'new';
      }
      localStorage.setItem('my_customers', JSON.stringify(customers));
    }
  };

  const printLabels = () => {
    const selected = orders.filter(o => selectedIds.has(o.id));
    if (!selected.length) { notify('info', 'لم يتم تحديد أي طلبات'); return; }
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) { notify('error', 'الرجاء السماح بفتح النوافذ المنبثقة'); return; }

    const storeData = {
      name: localStorage.getItem('store_name') || 'سمارت ستور',
      phone: localStorage.getItem('store_phone') || '',
      address: localStorage.getItem('store_address') || '',
    };

    printWindow.document.write(`
      <html dir="rtl">
      <head><meta charset="utf-8"><title>بوالص الشحن</title>
      <style>
        @page { margin: 0; size: auto; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Arial, sans-serif; background: #fff; font-size: 10pt; line-height: 1.7; }
        .label { width: 100%; padding: 3mm 4mm; page-break-after: always; text-align: center; }
        .label:last-child { page-break-after: auto; }
        hr { border: none; border-top: 0.5px solid #222; margin: 1.5mm 0; }
        hr.thick { border-top-width: 1.5px; }
        .title { font-size: 11pt; font-weight: bold; }
        .order-id { font-size: 10pt; font-weight: bold; }
        .row { margin: 0.8mm 0; font-size: 9pt; }
        .lbl { color: #666; }
        .val { font-weight: bold; }
        .phone { direction: ltr; display: inline-block; letter-spacing: 0.3px; font-size: 9pt; }
        table { width: 100%; margin: 2mm 0; border-collapse: collapse; font-size: 8pt; }
        th { padding: 0.8mm 1mm; border-bottom: 0.5px solid #222; text-align: center; font-size: 7pt; color: #555; }
        td { padding: 0.8mm 1mm; border-bottom: 0.5px solid #ccc; text-align: center; }
        tr:last-child td { border-bottom: none; }
        .products-title { font-weight: bold; font-size: 8pt; margin: 2mm 0 0.5mm; }
        .footer { font-size: 6pt; color: #999; }
        @media print { .label { padding: 2mm 3mm; } }
      </style>
      </head><body>
      ${selected.map(o => {
        const hasVariants = o.items?.some((i: any) => i.variantName);
        const itemsHtml = o.items?.length > 0 ? `
          <table>
            <tr><th>المنتج</th>${hasVariants ? '<th>المقاس</th>' : ''}<th>الكمية</th><th>السعر</th></tr>
            ${o.items.map((i: any) => `<tr><td>${i.productName}</td>${hasVariants ? `<td>${i.variantName || '—'}</td>` : ''}<td>${i.quantity}</td><td>${i.price}</td></tr>`).join('')}
          </table>` : '';
        return `<div class="label">
          <div class="title">${storeData.name}</div>
          ${storeData.phone ? `<div style="font-size:8pt;color:#555;margin:0.3mm 0">${storeData.phone}</div>` : ''}
          ${storeData.address ? `<div style="font-size:8pt;color:#555;margin:0.3mm 0">${storeData.address}</div>` : ''}
          <hr class="thick">
          <div class="order-id"># ${o.id}</div>
          <hr class="thick">

          <div class="row"><span class="lbl">العميل </span><span class="val">${o.customer}</span></div>
          <div class="row"><span class="lbl">الهاتف </span><span class="val phone">${o.phone || '—'}${o.phone2 ? ` - ${o.phone2}` : ''}</span></div>
          <hr>
          <div class="row"><span class="lbl">المحافظة </span><span class="val">${o.governorate || '—'}</span></div>
          ${o.district ? `<div class="row"><span class="lbl">المركز </span><span class="val">${o.district}</span></div>` : ''}
          <div class="row"><span class="lbl">العنوان </span><span class="val">${o.address || '—'}${o.landmark ? ` (${o.landmark})` : ''}</span></div>
          <hr>
          ${o.items?.length > 0 ? `<div class="products-title">المنتجات</div>${itemsHtml}` : ''}
          <div class="row"><span class="lbl">الإجمالي </span><span class="val">${o.total} ج.م</span></div>
          <div class="row"><span class="lbl">المدفوع </span><span class="val">${o.prepaid} ج.م</span></div>
          ${o.notes ? `<div class="row"><span class="lbl">ملاحظات </span><span class="val">${o.notes}</span></div>` : ''}
          <hr>
          <div class="footer">${normDigits(o.date)}</div>
        </div>`;
      }).join('')}
      <script>
        window.onload = function() { setTimeout(function() { window.print(); window.close(); }, 300); };
      <\/script>
      </body></html>
    `);
    printWindow.document.close();
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredOrders.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredOrders.map(o => o.id)));
    }
  };

  const deleteSelected = () => {
    if (!selectedIds.size) return;
    confirm({
      title: 'حذف المحدد',
      message: `هل أنت متأكد من حذف ${selectedIds.size} طلب؟`,
      onConfirm: () => {
        const selectedOrders = orders.filter(o => selectedIds.has(o.id));
        selectedOrders.forEach(o => {
          adjustStockForTransition(o, o.status, 'ملغي');
        });
        const updated = orders.filter(o => !selectedIds.has(o.id));
        localStorage.setItem('my_orders', JSON.stringify(updated));
        setOrders(updated);

        const uniqueCustomerKeys = Array.from(new Set(selectedOrders.map(o => `${o.phone}|||${o.customer}`)));
        uniqueCustomerKeys.forEach((k: string) => {
          const [phone, customer] = k.split('|||');
          recalculateCustomerStats(phone, customer);
        });

        setSelectedIds(new Set());
        notify('success', `تم حذف ${selectedIds.size} طلب بنجاح`);
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
          <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleImport} className="hidden" />
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400">
              <Search size={16} />
            </span>
            <input 
              type="text" 
              placeholder="ابحث برقم الطلب، العميل..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full py-2 pr-10 pl-4 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none text-sm"
            />
          </div>
          <button
            onClick={() => setActivePage && setActivePage('add-order')}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white font-medium rounded-lg hover:bg-primary-hover transition-colors shadow-sm w-full sm:w-auto"
          >
            <Plus size={20} />
            <span>إضافة طلب</span>
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
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                <p className="text-gray-500 font-medium">إجمالي الطلبات</p>
                <h3 className="text-2xl font-bold text-gray-800">{orders.length}</h3>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                <p className="text-gray-500 font-medium">قيد المعالجة</p>
                <h3 className="text-2xl font-bold text-yellow-600">{orders.filter(o => o.status === 'قيد المعالجة').length}</h3>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                <p className="text-gray-500 font-medium">جاري التوصيل</p>
                <h3 className="text-2xl font-bold text-primary">{orders.filter(o => o.status === 'جاري التوصيل').length}</h3>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                <p className="text-gray-500 font-medium">مكتملة</p>
                <h3 className="text-2xl font-bold text-green-600">{orders.filter(o => o.status === 'مكتمل').length}</h3>
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

                {/* Row 1: Status + Payment + Product + Governorate */}
                <div className="flex flex-wrap gap-4 w-full">
                  <div className="flex-1 min-w-[180px]">
                    <label className="block text-xs text-gray-500 mb-1">حالة الطلب</label>
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full p-2 border border-gray-200 rounded-lg bg-gray-50 text-sm outline-none focus:border-primary">
                      <option>الكل</option>
                      <option>مكتمل</option>
                      <option>قيد المعالجة</option>
                      <option>جاري التوصيل</option>
                      <option>ملغي</option>
                      <option>ملغي بعد الشحن</option>
                      <option>مرتجع كلي</option>
                      <option>مرتجع جزئي</option>
                      <option>استبدال</option>
                    </select>
                  </div>
                  <div className="flex-1 min-w-[180px]">
                    <label className="block text-xs text-gray-500 mb-1">حالة الدفع</label>
                    <select value={paymentFilter} onChange={e => setPaymentFilter(e.target.value)} className="w-full p-2 border border-gray-200 rounded-lg bg-gray-50 text-sm outline-none focus:border-primary">
                      <option>الكل</option>
                      <option>مدفوع</option>
                      <option>بانتظار الدفع</option>
                      <option>مسترد</option>
                    </select>
                  </div>
                  <div className="flex-1 min-w-[180px]">
                    <label className="block text-xs text-gray-500 mb-1">المنتج</label>
                    <select
                      value={productFilter}
                      onChange={e => setProductFilter(e.target.value)}
                      className="w-full p-2 border border-gray-200 rounded-lg bg-gray-50 text-sm outline-none focus:border-primary"
                    >
                      <option value="الكل">الكل</option>
                      {Array.from(
                        new Set(
                          orders.flatMap(o => (o.items || []).map((item: any) => item.productName)).filter(Boolean)
                        )
                      ).sort().map(name => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1 min-w-[180px]">
                    <label className="block text-xs text-gray-500 mb-1">المحافظة</label>
                    <select
                      value={governorateFilter}
                      onChange={e => setGovernorateFilter(e.target.value)}
                      className="w-full p-2 border border-gray-200 rounded-lg bg-gray-50 text-sm outline-none focus:border-primary"
                    >
                      <option value="الكل">الكل</option>
                      {Array.from(
                        new Set(orders.map(o => o.governorate).filter(Boolean))
                      ).sort().map(gov => (
                        <option key={gov} value={gov}>{gov}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Row 2: Date Range */}
                <div className="w-full">
                  <label className="block text-xs text-gray-500 mb-1.5">الفترة الزمنية</label>
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

                {/* Reset All Filters */}
                {(statusFilter !== 'الكل' || paymentFilter !== 'الكل' || productFilter !== 'الكل' || governorateFilter !== 'الكل' || datePreset !== 'all' || dateFrom || dateTo) && (
                  <div className="w-full flex justify-end">
                    <button
                      onClick={() => {
                        setStatusFilter('الكل');
                        setPaymentFilter('الكل');
                        setProductFilter('الكل');
                        setGovernorateFilter('الكل');
                        setDatePreset('all');
                        setDateFrom('');
                        setDateTo('');
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      <X size={12} />
                      مسح كل الفلاتر
                    </button>
                  </div>
                )}

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
            className="shrink-0 relative z-20"
          >
            <div className="flex items-center justify-between bg-primary/5 border border-primary/20 rounded-xl px-4 py-2.5">
              <span className="text-sm font-medium text-primary">{selectedIds.size} طلب محدد</span>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <button
                    onClick={() => setPendingStatusOrder('__bulk__')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-xs font-medium rounded-lg hover:bg-primary-hover transition-colors"
                  >
                    تغيير الحالة
                  </button>
                  <AnimatePresence>
                    {pendingStatusOrder === '__bulk__' && (
                      <motion.div
                        initial={{ opacity: 0, y: -4, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -4, scale: 0.97 }}
                        transition={{ duration: 0.15, ease: 'easeInOut' }}
                        onMouseDown={e => e.stopPropagation()} className="absolute z-50 top-full mt-1 left-0"
                      >
                        <div className="bg-white border border-gray-200 rounded-xl shadow-lg py-1 min-w-[130px]">
                          {['قيد المعالجة', 'جاري التوصيل', 'مكتمل', 'ملغي'].map(s => (
                            <button
                              key={s}
                              onClick={() => {
                                  setPendingStatusOrder(null);
                                  const selected = orders.filter(o => selectedIds.has(o.id));
                                  if (s === 'ملغي') {
                                    setPendingCancel({ target: 'bulk' });
                                  } else {
                                    selected.forEach(o => {
                                      adjustStockForTransition(o, o.status, s);
                                    });
                                    const updated = orders.map(o => selectedIds.has(o.id) ? { ...o, status: s, cancelReason: o.status === 'ملغي' ? undefined : o.cancelReason } : o);
                                    localStorage.setItem('my_orders', JSON.stringify(updated));
                                    setOrders(updated);
                                    
                                    const uniqueCustomerKeys = Array.from(new Set(selected.map(o => `${o.phone}|||${o.customer}`)));
                                    uniqueCustomerKeys.forEach((k: string) => {
                                      const [phone, customer] = k.split('|||');
                                      recalculateCustomerStats(phone, customer);
                                    });

                                    setSelectedIds(new Set());
                                    notify('success', `تم تغيير حالة ${selectedIds.size} طلب`);
                                  }
                              }}
                              className={`w-full text-right px-3 py-2 text-xs font-medium hover:bg-primary-light transition-colors ${s === 'ملغي' ? 'text-primary' : s === 'مكتمل' ? 'text-primary' : 'text-gray-700'}`}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <button onClick={printLabels} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-xs font-medium rounded-lg hover:bg-primary-hover transition-colors">
                  <Printer size={14} /> بوالص الشحن
                </button>
                <button onClick={deleteSelected} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-xs font-medium rounded-lg hover:bg-primary-hover transition-colors">
                  <Trash size={14} /> حذف المحدد
                </button>
                <button onClick={() => { setSelectedIds(new Set()); setPendingStatusOrder(null); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-200 transition-colors">
                  <X size={14} /> إلغاء التحديد
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Status Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-4 hide-scrollbar">
        {[
          { id: 'الكل', label: 'الكل', icon: Layers },
          { id: 'جديد', label: 'جديد', icon: Star },
          { id: 'قيد المعالجة', label: 'قيد المعالجة', icon: Clock },
          { id: 'جاري التوصيل', label: 'جاري التوصيل', icon: Truck },
          { id: 'مكتمل', label: 'مكتمل', icon: CheckCircle },
          { id: 'مرتجع ومشاكل', label: 'مرتجع ومشاكل', icon: RotateCcw }
        ].map(tab => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          let count = 0;
          if (tab.id === 'الكل') count = orders.length;
          else if (tab.id === 'جديد') count = orders.filter(o => o.status === 'قيد المعالجة' && isNewOrder(o.date, o.status)).length;
          else if (tab.id === 'قيد المعالجة') count = orders.filter(o => o.status === 'قيد المعالجة' && !isNewOrder(o.date, o.status)).length;
          else if (tab.id === 'مرتجع ومشاكل') count = orders.filter(o => ['ملغي', 'ملغي بعد الشحن', 'مرتجع كلي', 'مرتجع جزئي', 'استبدال'].includes(o.status)).length;
          else count = orders.filter(o => o.status === tab.id).length;
              
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm whitespace-nowrap transition-all ${
                isActive 
                  ? 'bg-primary text-white shadow-md shadow-primary/20' 
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {Icon && <Icon size={16} className={isActive ? 'text-white' : tab.id === 'جديد' ? 'text-yellow-500' : 'text-gray-400'} />}
              <span>{tab.label}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] ${isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-center border-collapse">
            <thead className="sticky top-0 bg-gray-50 z-10">
              <tr className="text-gray-500 text-sm border-b border-gray-100">
                <th className="px-3 py-2.5 w-10">
                  <button onClick={toggleSelectAll} className="text-gray-400 hover:text-primary transition-colors">
                    {selectedIds.size === filteredOrders.length && filteredOrders.length > 0 ? <CheckSquare size={16} /> : <Square size={16} />}
                  </button>
                </th>
                <th className="px-6 py-2.5 font-medium">رقم الطلب</th>
                <th className="px-6 py-2.5 font-medium">العميل</th>
                <th className="px-6 py-2.5 font-medium w-20">التقييم</th>
                <th className="px-6 py-2.5 font-medium">التاريخ</th>
                <th className="px-6 py-2.5 font-medium">الإجمالي</th>
                <th className="px-6 py-2.5 font-medium">حالة الطلب</th>
                <th className="px-6 py-2.5 font-medium text-center">الإجراءات</th>
              </tr>
            </thead>
            {currentOrders.length === 0 ? (
              <tbody>
                <tr>
                  <td colSpan={8} className="py-16 text-center text-gray-400">
                    <Package size={48} className="mx-auto mb-3 opacity-50" />
                    <p className="text-lg font-medium">{orders.length === 0 ? 'لا توجد طلبات حتى الآن' : 'لا توجد نتائج للبحث'}</p>
                    {orders.length === 0 && <button onClick={() => setActivePage && setActivePage('add-order')} className="mt-3 px-4 py-2 bg-primary text-white rounded-lg text-sm">
                      إضافة طلب جديد
                    </button>}
                  </td>
                </tr>
              </tbody>
            ) : (
              <tbody className="text-sm divide-y divide-gray-100">
                {currentOrders.map((order, index) => (
                  <React.Fragment key={index}>
                  <tr className={`hover:bg-gray-50 transition-colors group ${selectedIds.has(order.id) ? 'bg-primary/5' : ''}`}>
                    <td className="px-3 py-2.5">
                      <button onClick={() => toggleSelect(order.id)} className={`transition-colors ${selectedIds.has(order.id) ? 'text-primary' : 'text-gray-300 hover:text-gray-400'}`}>
                        {selectedIds.has(order.id) ? <CheckSquare size={16} /> : <Square size={16} />}
                      </button>
                    </td>
                    <td className="px-6 py-2.5 font-bold text-primary">
                      <div className="flex flex-col items-center gap-1">
                        <span>{order.id}</span>
                        {isNewOrder(order.date, order.status) && (
                          <span className="bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold animate-pulse">جديد</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-2.5 font-medium text-gray-800">{order.customer}</td>
                    <td className="px-6 py-2.5">{(() => {
                      const score = getCustomerScore(order.customer, order.phone);
                      const scoreColors: Record<string, string> = { green: 'bg-green-100 text-green-700', yellow: 'bg-yellow-100 text-yellow-700', red: 'bg-red-100 text-red-700' };
                      return <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium inline-block whitespace-nowrap ${scoreColors[score.level]}`}>{score.label}</span>;
                    })()}</td>
                    <td className="px-6 py-2.5"><FormattedDate dateStr={order.date} /></td>
                    <td className="px-6 py-2.5 font-bold text-gray-800">{order.total}</td>
                    <td className="px-6 py-2.5">
                      <div className="flex items-center justify-center gap-1">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium inline-block ${getStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                        <button
                          onMouseDown={e => e.stopPropagation()}
                          onClick={e => { e.stopPropagation(); setPendingStatusOrder(pendingStatusOrder === order.id ? null : order.id); }}
                          className={`p-1 rounded transition-all ${pendingStatusOrder === order.id ? 'bg-primary/10 text-primary' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                          <ChevronDown size={14} className={`transition-transform ${pendingStatusOrder === order.id ? 'rotate-180' : ''}`} />
                        </button>
                      </div>
                      {order.cancelReason && <div className="text-[10px] text-red-500 mt-0.5 text-center">{order.cancelReason}</div>}
                    </td>
                    <td className="px-6 py-2.5">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => {
                            localStorage.setItem('view_order', JSON.stringify(order));
                            setActivePage && setActivePage('view-order');
                          }}
                          className="p-1.5 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                          title="عرض التفاصيل"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => {
                            localStorage.setItem('edit_order_id', order.id);
                            setActivePage && setActivePage('edit-order');
                          }}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="تعديل الطلب"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => deleteOrder(order.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="حذف الطلب"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>

                  <AnimatePresence>
                    {pendingStatusOrder === order.id && (
                      <motion.tr
                        key={`status-row-${order.id}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.12 }}
                        className="bg-gray-50/50"
                      >
                        <td colSpan={8} className="p-4 border-t border-gray-100">
                          <motion.div
                            initial={{ opacity: 0, y: -6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            transition={{ duration: 0.1 }}
                            className="flex flex-col gap-2 w-full"
                          >
                            <div className="flex flex-wrap justify-center gap-1.5 p-1.5 bg-gray-100 rounded-xl">
                              {['قيد المعالجة', 'جاري التوصيل', 'مكتمل', 'ملغي', 'ملغي بعد الشحن', 'مرتجع كلي', 'مرتجع جزئي', 'استبدال'].map(s => {
                                const isActive = order.status === s;
                                return (
                                  <button
                                    key={s}
                                    onClick={() => {
                                      const prevStatus = order.status;
                                      if (s === prevStatus) { setPendingStatusOrder(null); return; }
                                      
                                      if (['ملغي بعد الشحن', 'مرتجع كلي', 'مرتجع جزئي', 'استبدال'].includes(s)) {
                                        setPendingStatusOrder(null);
                                        setWizardOrder({ order, targetStatus: s as any });
                                      } else if (s === 'ملغي') {
                                        setPendingStatusOrder(null);
                                        setPendingCancel({ target: order.id });
                                      } else {
                                        setPendingStatusOrder(null);
                                        adjustStockForTransition(order, prevStatus, s);
                                        const updated = orders.map(o => o.id === order.id ? { ...o, status: s, cancelReason: undefined } : o);
                                        localStorage.setItem('my_orders', JSON.stringify(updated));
                                        setOrders(updated);
                                        recalculateCustomerStats(order.phone, order.customer);
                                        notify('success', 'تم تغيير حالة الطلب');
                                      }
                                    }}
                                    className={`px-4 py-2 text-xs font-medium rounded-lg transition-all whitespace-nowrap ${isActive ? 'bg-white text-primary shadow-sm border border-gray-200' : 'text-gray-600 hover:text-primary hover:bg-white hover:shadow-sm'}`}
                                  >
                                    {s}
                                  </button>
                                );
                              })}
                            </div>
                          </motion.div>
                        </td>
                      </motion.tr>
                    )}
                  </AnimatePresence>
                  </React.Fragment>
                ))}
              </tbody>
            )}
          </table>
        </div>
        <div className="p-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-gray-500 shrink-0">
          <div>إجمالي {filteredOrders.length} {orders.length !== filteredOrders.length ? `(من ${orders.length}) ` : ''}طلب</div>
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

      {/* Cancel reason modal */}
      <AnimatePresence>
        {pendingCancel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed top-0 left-0 bottom-0 right-0 lg:right-[var(--sidebar-width)] z-[100] p-4 sm:p-6 flex flex-col bg-black/40 backdrop-blur-md"
            onClick={() => setPendingCancel(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ type: 'spring', duration: 0.35 }}
              className="max-w-xl w-full mx-auto my-auto bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl p-6 sm:p-10 overflow-y-auto max-h-full"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 pb-6 border-b border-gray-100 mb-6">
                <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                  <X size={24} className="text-red-500" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800">إلغاء الطلب</h3>
                  <p className="text-sm text-gray-500">اختر سبب الإلغاء</p>
                </div>
                <button onClick={() => setPendingCancel(null)} className="mr-auto p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-2">
                {CANCEL_REASONS.map(r => (
                  <button
                    key={r}
                    onClick={() => {
                      setPendingCancel(null);
                      if (pendingCancel.target === 'bulk') {
                        const count = selectedIds.size;
                        const selectedOrders = orders.filter(o => selectedIds.has(o.id));
                        selectedOrders.forEach(o => {
                          adjustStockForTransition(o, o.status, 'ملغي');
                        });
                        const updated = orders.map(o => selectedIds.has(o.id) ? { ...o, status: 'ملغي', payment: 'مسترد', cancelReason: r } : o);
                        localStorage.setItem('my_orders', JSON.stringify(updated));
                        setOrders(updated);
                        selectedOrders.forEach(o => {
                          recalculateCustomerStats(o.phone, o.customer);
                        });
                        setSelectedIds(new Set());
                        notify('success', `تم إلغاء ${count} طلب`);
                      } else {
                        const targetOrder = orders.find(o => o.id === pendingCancel.target);
                        if (targetOrder) {
                          adjustStockForTransition(targetOrder, targetOrder.status, 'ملغي');
                        }
                        const updated = orders.map(o => o.id === pendingCancel.target ? { ...o, status: 'ملغي', payment: 'مسترد', cancelReason: r } : o);
                        localStorage.setItem('my_orders', JSON.stringify(updated));
                        setOrders(updated);
                        if (targetOrder) {
                          recalculateCustomerStats(targetOrder.phone, targetOrder.customer);
                        }
                        notify('success', 'تم إلغاء الطلب');
                      }
                    }}
                    className="w-full text-right px-3.5 py-3 text-sm text-gray-700 hover:bg-primary-light hover:text-primary rounded-lg transition-colors border border-transparent hover:border-primary/20"
                  >
                    {r}
                  </button>
                ))}
              </div>
              <div className="px-4 pb-3">
                <button
                  onClick={() => setPendingCancel(null)}
                  className="w-full py-2.5 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  رجوع
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Order financial wizard */}
      {wizardOrder && (
        <OrderFinancialWizard 
          order={wizardOrder.order}
          targetStatus={wizardOrder.targetStatus}
          onClose={() => setWizardOrder(null)}
          onConfirm={(updatedOrder) => {
            const updated = orders.map(o => o.id === updatedOrder.id ? updatedOrder : o);
            localStorage.setItem('my_orders', JSON.stringify(updated));
            setOrders(updated);
            recalculateCustomerStats(updatedOrder.phone, updatedOrder.customer);
            setWizardOrder(null);
          }}
        />
      )}
    </div>
  );
};

