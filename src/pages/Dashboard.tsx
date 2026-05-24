import React, { useState, useMemo } from 'react';
import { 
  ShoppingCart, Package, Users, TrendingUp, DollarSign, 
  Clock, AlertCircle, CheckCircle, XCircle,
  BarChart3, RefreshCw, ChevronDown, Calendar, 
  Download, Eye, Banknote, ShoppingBag,
  Printer, Truck, Store, CreditCard, ScanBarcode, ChartPie, 
  Zap, AlertTriangle, TrendingDown, MessageSquare, UserPlus,
  MousePointerClick, Smartphone, MapPin, RefreshCw as RefreshIcon,
  ChevronRight, ChevronLeft, OctagonAlert, Search, Filter,   ArrowUpDown, ArrowDownRight,
  EyeOff, MoreHorizontal, Edit3, Trash2, Plus, FileSpreadsheet,
  Upload, FileDown, Settings, ArrowRight, ArrowLeft, X, DownloadCloud,
  Sparkles
} from 'lucide-react';



// ── Types ────────────────────────────────────────────────────────
interface OrderItem {
  productId: string;
  variantName?: string;
  productName: string;
  sku?: string;
  quantity: number;
  price: number;
  total: number;
}

interface Order {
  id: string;
  customer: string;
  phone: string;
  governorate: string;
  date: string;
  total: string;
  status: string;
  items: OrderItem[];
  shippingCompany?: string;
  shippingCost?: number;
}

interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  costPrice?: string | number;
  quantity: number;
  lowStockAlert?: number;
  variants?: any[];
}

export const Dashboard: React.FC = () => {
  // ── States ──────────────────────────────────────────────────────
  const [datePreset, setDatePreset] = useState<string>('month');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('products');


  // ── Date Presets List ───────────────────────────────────────────
  const presets = [
    { id: 'today', label: 'اليوم' },
    { id: 'yesterday', label: 'أمس' },
    { id: 'week', label: 'آخر 7 أيام' },
    { id: 'month', label: 'آخر 30 يوم' },
    { id: 'this_month', label: 'هذا الشهر' },
    { id: 'year', label: 'هذا العام' },
    { id: 'all', label: 'كل الأوقات' },
    { id: 'custom', label: 'فترة مخصصة' },
  ];

  // ── Helper: String to Number Parser ─────────────────────────────
  const parseNumber = (val: any): number => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    const cleaned = val
      .toString()
      .replace(/[٠-٩]/g, (d: string) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString())
      .replace(/[^0-9.]/g, '');
    return parseFloat(cleaned) || 0;
  };

  // ── Helper: Robust Arabic Date Parser ────────────────────────────
  const parseOrderDate = (dateStr: string): Date | null => {
    if (!dateStr) return null;
    let cleaned = dateStr.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString());
    cleaned = cleaned.replace(/[\u200e\u200f]/g, '').trim();
    
    if (cleaned.includes('-')) {
      const d = new Date(cleaned);
      if (!isNaN(d.getTime())) return d;
    }
    
    const parts = cleaned.split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const yearPart = parts[2].trim().split(/\s+/)[0];
      const year = parseInt(yearPart, 10);
      if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
        return new Date(year, month, day);
      }
    }
    
    const d = new Date(cleaned);
    if (!isNaN(d.getTime())) return d;
    return null;
  };

  // ── Demo Fallback Data Generator ────────────────────────────────
  // ── Load Real Data ──────────────────────────────────────────────
  const rawOrders: Order[] = useMemo(() => {
    const raw = localStorage.getItem('my_orders');
    return raw ? JSON.parse(raw) : [];
  }, []);

  const rawExpenses: Expense[] = useMemo(() => {
    const raw = localStorage.getItem('my_expenses');
    return raw ? JSON.parse(raw) : [];
  }, []);

  const rawProducts: Product[] = useMemo(() => {
    const raw = localStorage.getItem('my_products');
    return raw ? JSON.parse(raw) : [];
  }, []);

  const rawWastage: any[] = useMemo(() => {
    const raw = localStorage.getItem('my_wastage');
    return raw ? JSON.parse(raw) : [];
  }, []);

  // ── Date Range Filtration Logic ──────────────────────────────────
  const activeDateRange = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const d = now.getDate();

    const startOfToday = new Date(y, m, d, 0, 0, 0);
    const endOfToday = new Date(y, m, d, 23, 59, 59);

    switch (datePreset) {
      case 'today':
        return { from: startOfToday, to: endOfToday };
      case 'yesterday': {
        const startOfYest = new Date(y, m, d - 1, 0, 0, 0);
        const endOfYest = new Date(y, m, d - 1, 23, 59, 59);
        return { from: startOfYest, to: endOfYest };
      }
      case 'week': {
        const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        startOfWeek.setHours(0, 0, 0, 0);
        return { from: startOfWeek, to: endOfToday };
      }
      case 'month': {
        const startOfMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        startOfMonth.setHours(0, 0, 0, 0);
        return { from: startOfMonth, to: endOfToday };
      }
      case 'this_month': {
        const startOfThisMonth = new Date(y, m, 1, 0, 0, 0);
        return { from: startOfThisMonth, to: endOfToday };
      }
      case 'year': {
        const startOfThisYear = new Date(y, 0, 1, 0, 0, 0);
        return { from: startOfThisYear, to: endOfToday };
      }
      case 'custom': {
        const fromDate = dateFrom ? new Date(dateFrom + 'T00:00:00') : null;
        const toDate = dateTo ? new Date(dateTo + 'T23:59:59') : null;
        return { from: fromDate, to: toDate };
      }
      case 'all':
      default:
        return { from: null, to: null };
    }
  }, [datePreset, dateFrom, dateTo]);

  // ── Filtering Datasets ──────────────────────────────────────────
  const filteredOrders = useMemo(() => {
    return rawOrders.filter(order => {
      const orderDate = parseOrderDate(order.date);
      if (!orderDate) return true;
      if (activeDateRange.from && orderDate < activeDateRange.from) return false;
      if (activeDateRange.to && orderDate > activeDateRange.to) return false;
      return true;
    });
  }, [rawOrders, activeDateRange]);

  const filteredExpenses = useMemo(() => {
    return rawExpenses.filter(exp => {
      const expDate = parseOrderDate(exp.date);
      if (!expDate) return true;
      if (activeDateRange.from && expDate < activeDateRange.from) return false;
      if (activeDateRange.to && expDate > activeDateRange.to) return false;
      return true;
    });
  }, [rawExpenses, activeDateRange]);

  const filteredWastage = useMemo(() => {
    return rawWastage.filter(item => {
      const itemDate = parseOrderDate(item.createdAt);
      if (!itemDate) return true;
      if (activeDateRange.from && itemDate < activeDateRange.from) return false;
      if (activeDateRange.to && itemDate > activeDateRange.to) return false;
      return true;
    });
  }, [rawWastage, activeDateRange]);

  // ── Calculation helper for Product Cost Price (COGS) ───────────
  const getProductCost = (productId: string, variantName?: string): number => {
    const prod = rawProducts.find(p => p.id === productId || p.name === productId);
    if (!prod) return 0;
    if (variantName && prod.variants && Array.isArray(prod.variants)) {
      const variant = prod.variants.find((v: any) => v.name === variantName);
      if (variant && variant.costPrice) {
        return parseNumber(variant.costPrice);
      }
    }
    if (prod.costPrice) {
      return parseNumber(prod.costPrice);
    }
    // Fallback to 60% of retail price
    const retail = parseNumber(prod.price);
    return retail * 0.6;
  };

  // ── Calculate Main KPIs ──────────────────────────────────────────
  const stats = useMemo(() => {
    let salesTotal = 0;
    let totalCogs = 0;
    let validOrdersCount = 0;

    filteredOrders.forEach(o => {
      const isCancelled = o.status === 'ملغي' || o.status === 'ملغي بعد الشحن' || o.status === 'مرتجع كلي';
      if (!isCancelled) {
        let valTotal = parseNumber(o.total);
        if (o.status === 'مرتجع جزئي' && o.financialImpact?.customerRefund) {
          valTotal -= parseNumber(o.financialImpact.customerRefund);
        }
        salesTotal += Math.max(0, valTotal);
        validOrdersCount++;

        // Calculate COGS
        if (o.items && Array.isArray(o.items)) {
          o.items.forEach(item => {
            const cost = getProductCost(item.productId, item.variantName);
            let itemQty = item.quantity || 1;
            
            if (o.status === 'مرتجع جزئي' && o.financialImpact?.returnedItems) {
              const returnedItem = o.financialImpact.returnedItems.find(
                (ri: any) => ri.productId === item.productId && ri.variantName === item.variantName
              );
              if (returnedItem) {
                itemQty = Math.max(0, itemQty - (returnedItem.quantity || 0));
              }
            }
            totalCogs += cost * itemQty;
          });
        }
      }
    });

    const expensesTotal = filteredExpenses.reduce((sum, e) => sum + parseNumber(e.amount), 0);

    // Sum wastage loss
    let wastageLossTotal = 0;
    filteredWastage.forEach(w => {
      wastageLossTotal += Number(w.totalLoss) || 0;
    });

    // Sum lost shipping
    let lostShippingTotal = 0;
    filteredOrders.forEach(o => {
      if (o.financialImpact && o.financialImpact.lostShippingFee) {
        lostShippingTotal += Number(o.financialImpact.lostShippingFee) || 0;
      }
    });

    const netProfit = salesTotal - totalCogs - expensesTotal - wastageLossTotal - lostShippingTotal;
    const aov = validOrdersCount > 0 ? salesTotal / validOrdersCount : 0;
    const profitMargin = salesTotal > 0 ? (netProfit / salesTotal) * 100 : 0;

    // Count low stock products
    let lowStockCount = 0;
    rawProducts.forEach(p => {
      const alertThreshold = p.lowStockAlert ? Number(p.lowStockAlert) : 5;
      const stock = Number(p.quantity) || 0;
      if (stock <= alertThreshold) {
        lowStockCount++;
      }
    });

    return {
      salesTotal,
      expensesTotal,
      netProfit,
      aov,
      profitMargin,
      lowStockCount,
      validOrdersCount,
      totalCogs,
      wastageLossTotal,
      lostShippingTotal
    };
  }, [filteredOrders, filteredExpenses, rawProducts, filteredWastage]);

  // ── Calculate Expenses Category Distribution ────────────────────
  const expenseCategoriesData = useMemo(() => {
    const catMap: { [key: string]: number } = {};
    let total = 0;

    filteredExpenses.forEach(e => {
      const amt = parseNumber(e.amount);
      if (amt > 0) {
        catMap[e.category] = (catMap[e.category] || 0) + amt;
        total += amt;
      }
    });

    const colors = [
      '#00c950', // WellWay primary green
      '#3b82f6', // blue
      '#8b5cf6', // violet
      '#f59e0b', // amber
      '#ec4899', // pink
      '#14b8a6', // teal
      '#ef4444', // red
      '#6b7280', // gray
      '#06b6d4', // cyan
    ];

    const result = Object.keys(catMap).map((cat, i) => ({
      category: cat,
      amount: catMap[cat],
      percentage: total > 0 ? (catMap[cat] / total) * 100 : 0,
      color: colors[i % colors.length]
    })).sort((a, b) => b.amount - a.amount);

    return { list: result, total };
  }, [filteredExpenses]);

  // ── Tab 1: Top Selling Products ─────────────────────────────────
  const topProducts = useMemo(() => {
    const prodMap: { [key: string]: { name: string; quantity: number; revenue: number; cogs: number } } = {};

    filteredOrders.forEach(o => {
      const isCancelled = o.status === 'ملغي' || o.status === 'ملغي بعد الشحن' || o.status === 'مرتجع كلي';
      if (!isCancelled && o.items) {
        o.items.forEach(item => {
          const key = item.productId || item.productName;
          if (!prodMap[key]) {
            prodMap[key] = { name: item.productName, quantity: 0, revenue: 0, cogs: 0 };
          }
          let itemQty = item.quantity || 1;
          let itemRevenue = parseNumber(item.total || (item.price * itemQty));
          
          if (o.status === 'مرتجع جزئي' && o.financialImpact?.returnedItems) {
            const returnedItem = o.financialImpact.returnedItems.find(
              (ri: any) => ri.productId === item.productId && ri.variantName === item.variantName
            );
            if (returnedItem) {
              const returnedQty = returnedItem.quantity || 0;
              itemQty = Math.max(0, itemQty - returnedQty);
              itemRevenue = Math.max(0, itemRevenue - (parseNumber(item.price) * returnedQty));
            }
          }

          prodMap[key].quantity += itemQty;
          prodMap[key].revenue += itemRevenue;
          prodMap[key].cogs += getProductCost(item.productId, item.variantName) * itemQty;
        });
      }
    });

    return Object.keys(prodMap).map(key => {
      const p = prodMap[key];
      const profit = p.revenue - p.cogs;
      const margin = p.revenue > 0 ? (profit / p.revenue) * 100 : 0;
      // Get current stock
      const inventoryProd = rawProducts.find(ip => ip.id === key || ip.name === p.name);
      const stock = inventoryProd ? inventoryProd.quantity : 0;

      return {
        id: key,
        name: p.name,
        unitsSold: p.quantity,
        revenue: p.revenue,
        profit,
        margin,
        stock
      };
    }).sort((a, b) => b.unitsSold - a.unitsSold);
  }, [filteredOrders, rawProducts]);

  // ── Tab 2: Sales by Governorate ────────────────────────────────
  const governorateSales = useMemo(() => {
    const govMap: { [key: string]: { revenue: number; ordersCount: number; cancelledCount: number; shippingSum: number } } = {};

    filteredOrders.forEach(o => {
      const gov = o.governorate || 'غير محدد';
      if (!govMap[gov]) {
        govMap[gov] = { revenue: 0, ordersCount: 0, cancelledCount: 0, shippingSum: 0 };
      }
      govMap[gov].ordersCount++;
      govMap[gov].shippingSum += parseNumber(o.shippingCost || 0);

      const isCancelled = o.status === 'ملغي' || o.status === 'ملغي بعد الشحن' || o.status === 'مرتجع كلي';
      if (isCancelled) {
        govMap[gov].cancelledCount++;
      } else {
        let valTotal = parseNumber(o.total);
        if (o.status === 'مرتجع جزئي' && o.financialImpact?.customerRefund) {
          valTotal -= parseNumber(o.financialImpact.customerRefund);
        }
        govMap[gov].revenue += Math.max(0, valTotal);
      }
    });

    return Object.keys(govMap).map(gov => {
      const g = govMap[gov];
      const cancelRate = g.ordersCount > 0 ? (g.cancelledCount / g.ordersCount) * 100 : 0;
      const avgShipping = g.ordersCount > 0 ? g.shippingSum / g.ordersCount : 0;
      return {
        name: gov,
        revenue: g.revenue,
        ordersCount: g.ordersCount,
        cancelledCount: g.cancelledCount,
        cancelRate,
        avgShipping
      };
    }).sort((a, b) => b.revenue - a.revenue);
  }, [filteredOrders]);

  // ── Tab 3: Shipping Companies Performance ────────────────────────
  const shippingPerformance = useMemo(() => {
    const shipMap: { [key: string]: { delivered: number; cancelled: number; total: number; costSum: number } } = {};

    filteredOrders.forEach(o => {
      const company = o.shippingCompany || 'بدون شركة شحن';
      if (!shipMap[company]) {
        shipMap[company] = { delivered: 0, cancelled: 0, total: 0, costSum: 0 };
      }
      shipMap[company].total++;
      shipMap[company].costSum += parseNumber(o.shippingCost || 0);

      if (o.status === 'مكتمل' || o.status === 'تم التوصيل' || o.status === 'استبدال' || o.status === 'مرتجع جزئي') {
        shipMap[company].delivered++;
      } else if (o.status === 'ملغي' || o.status === 'ملغي بعد الشحن' || o.status === 'مرتجع كلي') {
        shipMap[company].cancelled++;
      }
    });

    return Object.keys(shipMap).map(name => {
      const s = shipMap[name];
      const successRate = s.total > 0 ? (s.delivered / s.total) * 100 : 0;
      const avgCost = s.total > 0 ? s.costSum / s.total : 0;
      return {
        name,
        totalShipments: s.total,
        successRate,
        avgCost
      };
    }).sort((a, b) => b.totalShipments - a.totalShipments);
  }, [filteredOrders]);

  // ── Tab 4: Customer Loyalty (LTV) ───────────────────────────────
  const customerLoyalty = useMemo(() => {
    const custMap: { [key: string]: { name: string; phone: string; ordersCount: number; spend: number; lastOrderDate: string; lastOrderId: string } } = {};

    filteredOrders.forEach(o => {
      const phoneKey = o.phone || o.customer;
      if (!phoneKey) return;

      if (!custMap[phoneKey]) {
        custMap[phoneKey] = {
          name: o.customer,
          phone: o.phone,
          ordersCount: 0,
          spend: 0,
          lastOrderDate: o.date,
          lastOrderId: o.id
        };
      }

      const isCancelled = o.status === 'ملغي' || o.status === 'ملغي بعد الشحن' || o.status === 'مرتجع كلي';
      if (!isCancelled) {
        let valTotal = parseNumber(o.total);
        if (o.status === 'مرتجع جزئي' && o.financialImpact?.customerRefund) {
          valTotal -= parseNumber(o.financialImpact.customerRefund);
        }
        custMap[phoneKey].ordersCount++;
        custMap[phoneKey].spend += Math.max(0, valTotal);
      }
    });

    return Object.keys(custMap).map(phone => {
      const c = custMap[phone];
      let tier = 'فضّي';
      let badgeColor = 'bg-slate-100 text-slate-700 border-slate-200';
      
      if (c.spend >= 2000 || c.ordersCount >= 4) {
        tier = 'VIP الماسـي';
        badgeColor = 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30';
      } else if (c.spend >= 1000 || c.ordersCount >= 2) {
        tier = 'ذهبي';
        badgeColor = 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30';
      }

      return {
        ...c,
        tier,
        badgeColor
      };
    }).filter(c => c.ordersCount > 0).sort((a, b) => b.spend - a.spend).slice(0, 15);
  }, [filteredOrders]);

  // ── Smart Rule-Based Insights Engine (AI-Style) ───────────────────
  const smartInsights = useMemo(() => {
    const insights: string[] = [];

    // Rule 1: High stock alert on top selling items
    if (topProducts.length > 0) {
      const bestSeller = topProducts[0];
      if (bestSeller.stock <= 5) {
        insights.push(`المنتج الأكثر مبيعاً <strong>"${bestSeller.name}"</strong> مبيعاته مرتفعة جداً ومخزونه الحالي <strong>(${bestSeller.stock} قطع)</strong> فقط! ننصح بالتواصل مع الموردين لإعادة الشحن الفوري لتفادي ضياع المبيعات.`);
      }
    }

    // Rule 2: High cancellation governorates
    const riskyGov = governorateSales.find(g => g.cancelRate >= 20 && g.ordersCount >= 2);
    if (riskyGov) {
      insights.push(`تسجل محافظة <strong>"${riskyGov.name}"</strong> نسبة إلغاء مرتفعة تصل إلى <strong>${riskyGov.cancelRate.toFixed(1)}%</strong>. نقترح الاتصال هاتفياً بالعملاء في هذه المحافظة لتأكيد الطلبات وجدية الشراء قبل تغليفها وإرسالها لشركة الشحن.`);
    }

    // Rule 3: Shipping efficiency
    const topCourier = shippingPerformance.find(s => s.successRate >= 90 && s.totalShipments >= 2);
    if (topCourier) {
      insights.push(`تحقق شركة الشحن <strong>"${topCourier.name}"</strong> نسبة نجاح ممتازة في تسليم الطلبات بلغت <strong>${topCourier.successRate.toFixed(1)}%</strong>. ننصح بتحويل نسبة أكبر من الشحنات إليها لتقليل معدلات المرتجعات.`);
    } else {
      const poorCourier = shippingPerformance.find(s => s.successRate < 75 && s.totalShipments >= 2);
      if (poorCourier) {
        insights.push(`تسجل شركة الشحن <strong>"${poorCourier.name}"</strong> نسبة تسليم منخفضة <strong>(${poorCourier.successRate.toFixed(1)}%)</strong>. ننصح بمراجعة شروط التعاقد معها أو استبدالها بشركات شحن أخرى ذات أداء أفضل.`);
      }
    }

    // Rule 4: Expenses warnings
    if (stats.salesTotal > 0) {
      const expenseRatio = (stats.expensesTotal / stats.salesTotal) * 100;
      if (expenseRatio >= 35) {
        insights.push(`تمثل المصروفات التشغيلية <strong>${expenseRatio.toFixed(1)}%</strong> من إجمالي مبيعاتك خلال الفترة المحددة، وهي نسبة مرتفعة تضغط على صافي الأرباح. يرجى مراجعة وتدقيق تكاليف الإعلانات والمصاريف المتنوعة لرفع الهامش.`);
      }
    }

    // Default Fallbacks if no rule matched
    if (insights.length === 0) {
      insights.push('مؤشرات متوازنة: النظام يعمل بكفاءة جيدة. ننصح بزيادة الميزانية الإعلانية لترويج المنتجات ذات هامش الربح الذي يتجاوز 50% لرفع صافي الأرباح العام.');
      insights.push('توصية مخزون: راقب قائمة المنتجات منخفضة المخزون بانتظام لضمان عدم توقف تدفق شحناتك اليومية.');
    }

    return insights;
  }, [topProducts, governorateSales, shippingPerformance, stats]);

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-y-auto px-4 py-4 md:px-6 dir-rtl" style={{ fontFamily: 'WellWay, sans-serif' }}>
      
      {/* ── Dashboard Top Header ──────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <h2 className="text-2xl font-bold text-slate-800">لوحة التحكم والتقارير</h2>
          </div>
          <p className="text-slate-500 text-sm">
            راجع مبيعاتك، أرباحك، مصروفاتك، وتقارير الأداء
          </p>
        </div>

        {/* Date presets grid */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-xl">
            {presets.map(p => (
              <button
                key={p.id}
                onClick={() => {
                  setDatePreset(p.id);
                  if (p.id !== 'custom') {
                    setDateFrom('');
                    setDateTo('');
                  }
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  datePreset === p.id 
                    ? 'bg-white text-slate-800 shadow-xs border border-slate-200/50' 
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/40'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Custom Date Picker Fields */}
      {datePreset === 'custom' && (
        <div className="bg-white border border-slate-200/60 p-4 rounded-xl shadow-xs mb-6">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="w-full sm:flex-1">
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">تاريخ البداية</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={e => setDateFrom(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#00c950] focus:bg-white transition-all text-slate-700"
                />
              </div>
              <span className="text-slate-400 text-xs sm:mt-6">إلى</span>
              <div className="w-full sm:flex-1">
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">تاريخ النهاية</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={e => setDateTo(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#00c950] focus:bg-white transition-all text-slate-700"
                />
              </div>
            </div>
        </div>
      )}

      {/* ── KPI Stats Cards Grid ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-6">
        
        {/* Card 1: Total Sales */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col justify-between hover:shadow-sm transition-shadow"
        >
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 text-xs font-semibold">إجمالي المبيعات</span>
              <div className="relative group inline-block">
                <span className="text-slate-400 hover:text-slate-600 cursor-help text-[11px] bg-slate-100 hover:bg-slate-200 px-1.5 py-0.2 rounded-full mr-1 transition-colors">؟</span>
                <div className="absolute top-full right-0 mt-2 hidden group-hover:block w-52 bg-slate-900 text-white text-[11px] p-2.5 rounded-xl shadow-lg z-30 leading-relaxed text-right border border-slate-700 font-sans font-normal">
                  كل الفلوس اللي دخلت المحل من بيع المنتجات قبل ما نخصم أي مصاريف أو تكلفة بضاعة.
                </div>
              </div>
            </div>
            <span className="p-2 bg-green-50 text-[#00c950] rounded-xl"><DollarSign size={18} /></span>
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-800 font-sans tracking-tight">
              {stats.salesTotal.toLocaleString('en-US')} <span className="text-xs font-normal">ج.م</span>
            </h3>
            <span className="text-[10px] text-slate-400 mt-1 block">للطلبات غير الملغاة</span>
          </div>
        </div>

        {/* Card 2: Total COGS */}
        <div 

          className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col justify-between"
        >
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 text-xs font-semibold">تكلفة المبيعات (COGS)</span>
              <div className="relative group inline-block">
                <span className="text-slate-400 hover:text-slate-600 cursor-help text-[11px] bg-slate-100 hover:bg-slate-200 px-1.5 py-0.2 rounded-full mr-1 transition-colors">؟</span>
                <div className="absolute top-full right-0 mt-2 hidden group-hover:block w-52 bg-slate-900 text-white text-[11px] p-2.5 rounded-xl shadow-lg z-30 leading-relaxed text-right border border-slate-700 font-sans font-normal">
                  سعر شراء البضاعة اللي أنت بعتها من المورد الأصلي. يعني البضاعة دي واقفة عليك بكام عشان تعرف مكسبك الحقيقي.
                </div>
              </div>
            </div>
            <span className="p-2 bg-slate-100 text-slate-500 rounded-xl"><Package size={18} /></span>
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-700 font-sans tracking-tight">
              {stats.totalCogs.toLocaleString('en-US')} <span className="text-xs font-normal">ج.م</span>
            </h3>
            <span className="text-[10px] text-slate-400 mt-1 block">تكلُفة البضاعة المبيعة فعلياً</span>
          </div>
        </div>

        {/* Card 3: Expenses */}
        <div 

          className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col justify-between"
        >
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 text-xs font-semibold">إجمالي المصروفات</span>
              <div className="relative group inline-block">
                <span className="text-slate-400 hover:text-slate-600 cursor-help text-[11px] bg-slate-100 hover:bg-slate-200 px-1.5 py-0.2 rounded-full mr-1 transition-colors">؟</span>
                <div className="absolute top-full right-0 mt-2 hidden group-hover:block w-52 bg-slate-900 text-white text-[11px] p-2.5 rounded-xl shadow-lg z-30 leading-relaxed text-right border border-slate-700 font-sans font-normal">
                  أي فلوس صرفتها عشان تشغل المحل برة سعر البضاعة، زي الإعلانات الممولة، إيجار المخزن، رواتب العمال، وفواتير الكهرباء والنت.
                </div>
              </div>
            </div>
            <span className="p-2 bg-red-50 text-red-500 rounded-xl"><ArrowDownRight size={18} /></span>
          </div>
          <div>
            <h3 className="text-xl font-bold text-red-600 font-sans tracking-tight">
              {stats.expensesTotal.toLocaleString('en-US')} <span className="text-xs font-normal">ج.م</span>
            </h3>
            <span className="text-[10px] text-slate-400 mt-1 block">إيجارات، تسويق، رواتب، إلخ</span>
          </div>
        </div>

        {/* Card 4: Net Profits */}
        <div 
          className="bg-gradient-to-br from-green-50 via-white to-emerald-50 p-5 rounded-2xl border-2 border-[#00c950]/30 shadow-[0_0_16px_rgba(0,201,80,0.12)] flex flex-col justify-between relative"
        >
          <div className="absolute -top-2 -left-2 w-5 h-5 bg-[#00c950] rounded-full flex items-center justify-center shadow-sm">
            <span className="text-white text-[9px] font-bold">★</span>
          </div>
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-1.5">
              <span className="text-[#00c950] text-xs font-bold">صافي الأرباح</span>
              <div className="relative group inline-block">
                <span className="text-slate-400 hover:text-slate-600 cursor-help text-[11px] bg-slate-100 hover:bg-slate-200 px-1.5 py-0.2 rounded-full mr-1 transition-colors">؟</span>
                <div className="absolute top-full right-0 mt-2 hidden group-hover:block w-52 bg-slate-900 text-white text-[11px] p-2.5 rounded-xl shadow-lg z-30 leading-relaxed text-right border border-slate-700 font-sans font-normal">
                  مكسبك الصافي والحقيقي اللي بيدخل جيبك! بنحسبه كدا: (المبيعات) ناقص (تكلفة البضاعة + المصاريف + خسائر البضاعة التالفة + رسوم الشحن المهدرة). لو طالع باللون الأخضر فأنت بتكسب، لو أحمر خسارة.
                </div>
              </div>
            </div>
            <span className={`p-2.5 rounded-xl ${stats.netProfit >= 0 ? 'bg-[#00c950] text-white shadow-sm' : 'bg-red-50 text-red-500'}`}>
              <TrendingUp size={18} />
            </span>
          </div>
          <div>
            <h3 className={`text-xl font-bold font-sans tracking-tight ${stats.netProfit >= 0 ? 'text-[#00c950]' : 'text-red-500'}`}>
              {stats.netProfit.toLocaleString('en-US')} <span className="text-xs font-normal">ج.م</span>
            </h3>
            <span className="text-[10px] text-emerald-500 mt-1 block font-medium">صافي الأرباح بعد التكلفة والمصروفات والخسائر</span>
            
            <div className="flex flex-col gap-1 mt-2.5 pt-2 border-t border-[#00c950]/15 text-[10px] text-slate-500 font-semibold">
              <div className="flex justify-between items-center">
                <span>خسائر الهالك والتالف:</span>
                <span className="text-red-600 font-sans font-bold">{stats.wastageLossTotal.toLocaleString('en-US')} ج.م</span>
              </div>
              <div className="flex justify-between items-center">
                <span>تكاليف شحن مهدرة:</span>
                <span className="text-amber-600 font-sans font-bold">{stats.lostShippingTotal.toLocaleString('en-US')} ج.م</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 5: AOV & Profit Margin */}
        <div 

          className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col justify-between"
        >
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 text-xs font-semibold">متوسط قيمة الطلب</span>
              <div className="relative group inline-block">
                <span className="text-slate-400 hover:text-slate-600 cursor-help text-[11px] bg-slate-100 hover:bg-slate-200 px-1.5 py-0.2 rounded-full mr-1 transition-colors">؟</span>
                <div className="absolute top-full right-0 mt-2 hidden group-hover:block w-52 bg-slate-900 text-white text-[11px] p-2.5 rounded-xl shadow-lg z-30 leading-relaxed text-right border border-slate-700 font-sans font-normal">
                  الزبون الواحد لما بيشتري منك بيدفع كام في المتوسط للطلبية الواحدة. كل ما الرقم دا يزيد، كل ما أرباحك تزيد بدون مصاريف إعلانات زيادة.
                </div>
              </div>
            </div>
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><Users size={18} /></span>
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-800 font-sans tracking-tight">
              {Math.round(stats.aov).toLocaleString('en-US')} <span className="text-xs font-normal">ج.م</span>
            </h3>
            <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-400">
              <span>هامش الربح:</span>
              <span className={`font-bold font-sans ${stats.profitMargin >= 0 ? 'text-[#00c950]' : 'text-red-500'}`}>
                {stats.profitMargin.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* Card 6: Low Stock Products */}
        <div 

          className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col justify-between"
        >
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 text-xs font-semibold">منخفض المخزون</span>
              <div className="relative group inline-block">
                <span className="text-slate-400 hover:text-slate-600 cursor-help text-[11px] bg-slate-100 hover:bg-slate-200 px-1.5 py-0.2 rounded-full mr-1 transition-colors">؟</span>
                <div className="absolute top-full right-0 mt-2 hidden group-hover:block w-52 bg-slate-900 text-white text-[11px] p-2.5 rounded-xl shadow-lg z-30 leading-relaxed text-right border border-slate-700 font-sans font-normal">
                  منتجات قربت تخلص من مخزنك وباقي منها كميات قليلة جداً. لازم تطلب منها تاني بسرعة عشان مبيعاتك ما تقفش.
                </div>
              </div>
            </div>
            <span className={`p-2 rounded-xl ${stats.lowStockCount > 0 ? 'bg-amber-50 text-amber-600 animate-pulse' : 'bg-slate-50 text-slate-400'}`}>
              <AlertTriangle size={18} />
            </span>
          </div>
          <div>
            <h3 className={`text-xl font-bold font-sans tracking-tight ${stats.lowStockCount > 0 ? 'text-amber-600' : 'text-slate-700'}`}>
              {stats.lowStockCount} <span className="text-xs font-normal">منتجات</span>
            </h3>
            <span className="text-[10px] text-slate-400 mt-1 block">تتطلب مراجعة أو إعادة طلب</span>
          </div>
        </div>
      </div>

      {/* ── Dynamic AI Sparkles Insights Card ─────────────────────────── */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800 text-slate-100 p-5 rounded-2xl shadow-lg mb-6 relative overflow-hidden">
        <div className="absolute -top-12 -left-12 w-32 h-32 bg-[#00c950]/10 rounded-full blur-2xl"></div>
        <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl"></div>
        
        <div className="flex items-center gap-2 mb-3.5 relative z-10">
          <span className="p-2 bg-gradient-to-br from-[#00c950]/20 to-indigo-500/20 text-[#00c950] rounded-xl border border-slate-700">
            <Sparkles size={20} className="animate-spin-slow" />
          </span>
          <div>
            <h4 className="font-bold text-base text-white">توصيات ذكية وتحليلات فورية للنظام</h4>
            <p className="text-slate-400 text-xs">خوارزميات ذكية تقوم بتحليل بيانات المبيعات والمخزون والمرتجعات لتقديم نصائح قابلة للتنفيذ.</p>
          </div>
        </div>
        
        <div className="space-y-2.5 relative z-10">
          {smartInsights.map((insight, idx) => (
            <div key={idx} className="flex items-start gap-2.5 bg-slate-800/40 p-3 rounded-xl border border-slate-700/50 hover:bg-slate-800/60 transition-all">
              <span className="mt-1 text-[#00c950]">•</span>
              <p className="text-xs md:text-sm text-slate-200 leading-relaxed font-normal" dangerouslySetInnerHTML={{ __html: insight }}></p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Quick Stats in Simple Cards ──────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        
        {/* Card 1: Sales Summary */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm lg:col-span-2">
          <div className="flex items-center gap-1.5 mb-5">
            <span className="p-2 bg-green-50 text-[#00c950] rounded-xl"><TrendingUp size={18} /></span>
            <h3 className="text-base font-bold text-slate-800">ملخص المبيعات</h3>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            <div className="bg-green-50/50 p-5 rounded-xl border border-green-100/50">
              <p className="text-[10px] text-slate-500 font-medium mb-1">إجمالي المبيعات</p>
              <p className="text-lg font-bold text-slate-800 font-sans">{stats.salesTotal.toLocaleString()}</p>
              <p className="text-[10px] text-slate-400">ج.م</p>
            </div>
            <div className="relative bg-gradient-to-br from-green-50 via-white to-emerald-50 p-5 rounded-xl border-2 border-[#00c950]/30 shadow-[0_0_16px_rgba(0,201,80,0.12)]">
              <div className="absolute -top-2 -left-2 w-5 h-5 bg-[#00c950] rounded-full flex items-center justify-center shadow-sm">
                <span className="text-white text-[9px] font-bold">★</span>
              </div>
              <p className="text-[10px] text-[#00c950] font-bold mb-1">صافي الربح</p>
              <p className="text-lg font-bold text-[#00c950] font-sans">{stats.netProfit.toLocaleString()}</p>
              <p className="text-[10px] text-emerald-500">ج.م</p>
            </div>
            <div className="bg-amber-50/50 p-5 rounded-xl border border-amber-100/50">
              <p className="text-[10px] text-slate-500 font-medium mb-1">رسوم شحن مهدرة</p>
              <p className="text-lg font-bold text-amber-600 font-sans">{stats.lostShippingTotal.toLocaleString()}</p>
              <p className="text-[10px] text-slate-400">ج.م</p>
            </div>
            <div className="bg-rose-50/50 p-5 rounded-xl border border-rose-100/50">
              <p className="text-[10px] text-slate-500 font-medium mb-1">إجمالي الهالك والتالف</p>
              <p className="text-lg font-bold text-red-600 font-sans">{stats.wastageLossTotal.toLocaleString()}</p>
              <p className="text-[10px] text-slate-400">ج.م</p>
            </div>
            <div className="bg-amber-50/50 p-5 rounded-xl border border-amber-100/50">
              <p className="text-[10px] text-slate-500 font-medium mb-1">متوسط قيمة الطلب</p>
              <p className="text-lg font-bold text-slate-800 font-sans">{stats.aov.toLocaleString()}</p>
              <p className="text-[10px] text-slate-400">ج.م</p>
            </div>
            <div className="bg-blue-50/50 p-5 rounded-xl border border-blue-100/50">
              <p className="text-[10px] text-slate-500 font-medium mb-1">عدد الطلبات</p>
              <p className="text-lg font-bold text-slate-800 font-sans">{stats.validOrdersCount}</p>
              <p className="text-[10px] text-slate-400">طلب</p>
            </div>
            <div className="bg-emerald-50/50 p-5 rounded-xl border border-emerald-100/50">
              <p className="text-[10px] text-slate-500 font-medium mb-1">هامش الربح</p>
              <p className="text-lg font-bold text-slate-800 font-sans">{stats.profitMargin.toFixed(1)}%</p>
              <p className="text-[10px] text-slate-400">نسبة مئوية</p>
            </div>
            <div className="bg-rose-50/50 p-5 rounded-xl border border-rose-100/50">
              <p className="text-[10px] text-slate-500 font-medium mb-1">تكلفة البضائع (COGS)</p>
              <p className="text-lg font-bold text-slate-800 font-sans">{stats.totalCogs.toLocaleString()}</p>
              <p className="text-[10px] text-slate-400">ج.م</p>
            </div>
            <div className="bg-purple-50/50 p-5 rounded-xl border border-purple-100/50">
              <p className="text-[10px] text-slate-500 font-medium mb-1">إجمالي المصروفات</p>
              <p className="text-lg font-bold text-slate-800 font-sans">{stats.expensesTotal.toLocaleString()}</p>
              <p className="text-[10px] text-slate-400">ج.م</p>
            </div>
            <div className="bg-sky-50/50 p-5 rounded-xl border border-sky-100/50">
              <p className="text-[10px] text-slate-500 font-medium mb-1">صافي المبيعات - المصروفات</p>
              <p className="text-lg font-bold text-slate-800 font-sans">{(stats.salesTotal - stats.expensesTotal).toLocaleString()}</p>
              <p className="text-[10px] text-slate-400">ج.م</p>
            </div>
          </div>
        </div>

        {/* Card 2: Expense Summary */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-1.5 mb-5">
            <span className="p-2 bg-red-50 text-red-500 rounded-xl"><DollarSign size={18} /></span>
            <h3 className="text-base font-bold text-slate-800">المصروفات</h3>
          </div>

          {expenseCategoriesData.list.length > 0 ? (
            <div className="space-y-4">
              <div className="bg-red-50/50 p-4 rounded-xl border border-red-100/50">
                <p className="text-[10px] text-slate-500 font-medium mb-1">إجمالي المصروفات</p>
                <p className="text-lg font-bold text-slate-800 font-sans">{expenseCategoriesData.total.toLocaleString()}</p>
                <p className="text-[10px] text-slate-400">ج.م</p>
              </div>

              <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-100/50">
                <p className="text-[10px] text-slate-500 font-medium mb-1">أعلى بند صرف</p>
                <p className="text-base font-bold text-slate-800 truncate">{expenseCategoriesData.list[0].category}</p>
                <p className="text-sm font-sans text-slate-600">{expenseCategoriesData.list[0].amount.toLocaleString()} ج.م ({expenseCategoriesData.list[0].percentage.toFixed(0)}%)</p>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100/50">
                <p className="text-[10px] text-slate-500 font-medium mb-2">جميع المصروفات</p>
                <div className="space-y-2">
                  {expenseCategoriesData.list.slice(0, 4).map((cat, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                        <span className="text-xs text-slate-600 truncate">{cat.category}</span>
                      </div>
                      <span className="text-xs font-bold text-slate-700 font-sans">{cat.amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-slate-400">
              <span className="p-3 bg-slate-50 rounded-full mb-2"><DollarSign size={20} /></span>
              <p className="text-xs">لا توجد مصروفات مسجلة</p>
            </div>
          )}
        </div>
      </div>



      {/* ── Sub-Report Deep Tabular Views (Bottom Section) ──────────────── */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm mb-6">
        
        {/* Tab Controls Header */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-center border-b border-slate-100 pb-4 mb-4 gap-3">
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-lg font-bold text-slate-800">التقارير التفصيلية المتقدمة</h3>
              <div className="relative group inline-block">
                <span className="text-slate-400 hover:text-slate-600 cursor-help text-[11px] bg-slate-100 hover:bg-slate-200 px-1.5 py-0.2 rounded-full transition-colors">؟</span>
                <div className="absolute top-full right-0 mt-2 hidden group-hover:block w-72 bg-slate-900 text-white text-[11px] p-2.5 rounded-xl shadow-lg z-30 leading-relaxed text-right border border-slate-700 font-sans font-normal">
                  تقارير بتفاصيل دقيقة عشان تعرف: المنتجات اللي بتتباع أكتر ومكسبها كام، المحافظات النشطة، شركات الشحن الأسرع، والعملاء الأكثر ولاءً (اللي بيشتروا كتير).
                </div>
              </div>
            </div>
            <p className="text-slate-400 text-xs">اضغط على التبويبات لاستعراض تقارير الأداء الفرعية للنظام</p>
          </div>

          <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('products')}
              className={`px-3 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'products' ? 'bg-white text-[#00c950] shadow-xs' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Package size={14} />
              <span>الأكثر مبيعاً</span>
            </button>
            <button
              onClick={() => setActiveTab('governorates')}
              className={`px-3 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'governorates' ? 'bg-white text-[#00c950] shadow-xs' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <MapPin size={14} />
              <span>المبيعات حسب المحافظات</span>
            </button>
            <button
              onClick={() => setActiveTab('shipping')}
              className={`px-3 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'shipping' ? 'bg-white text-[#00c950] shadow-xs' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Truck size={14} />
              <span>أداء شركات الشحن</span>
            </button>
            <button
              onClick={() => setActiveTab('loyalty')}
              className={`px-3 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'loyalty' ? 'bg-white text-[#00c950] shadow-xs' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Users size={14} />
              <span>العملاء والولاء (LTV)</span>
            </button>
          </div>
        </div>

        {/* Tab Contents */}
        <div className="overflow-x-auto">
          <>
            {activeTab === 'products' && (
              <div
                key="products"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.15 }}
              >
                {topProducts.length === 0 ? (
                  <p className="text-center py-8 text-slate-400 text-sm font-medium">لا توجد مبيعات منتجات مسجلة في هذه الفترة</p>
                ) : (
                  <table className="w-full text-right border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 text-xs font-semibold">
                        <th className="pb-3 pr-2">اسم المنتج</th>
                        <th className="pb-3 text-center">الكمية المباعة</th>
                        <th className="pb-3 text-center">إجمالي المبيعات</th>
                        <th className="pb-3 text-center">صافي الأرباح</th>
                        <th className="pb-3 text-center">هامش الربح</th>
                        <th className="pb-3 pl-2 text-left">المخزون الحالي</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-xs md:text-sm text-slate-700">
                      {topProducts.map((p, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3.5 pr-2 font-medium text-slate-800">{p.name}</td>
                          <td className="py-3.5 text-center font-sans font-bold">{p.unitsSold} قطعة</td>
                          <td className="py-3.5 text-center font-sans font-bold">{p.revenue.toLocaleString()} ج.م</td>
                          <td className="py-3.5 text-center font-sans font-bold text-[#00c950]">{p.profit.toLocaleString()} ج.م</td>
                          <td className="py-3.5 text-center font-sans font-bold text-indigo-600">{p.margin.toFixed(1)}%</td>
                          <td className="py-3.5 pl-2 text-left font-sans">
                            <span className={`px-2 py-1 rounded-md text-[10px] font-bold ${
                              p.stock <= 5 ? 'bg-red-50 text-red-500 border border-red-100' : 'bg-slate-50 text-slate-500'
                            }`}>
                              {p.stock} قطعة {p.stock <= 5 && '⚠️ منخفض'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {activeTab === 'governorates' && (
              <div
                key="governorates"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.15 }}
              >
                {governorateSales.length === 0 ? (
                  <p className="text-center py-8 text-slate-400 text-sm font-medium">لا توجد بيانات شحن للمحافظات</p>
                ) : (
                  <table className="w-full text-right border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 text-xs font-semibold">
                        <th className="pb-3 pr-2">المحافظة</th>
                        <th className="pb-3 text-center">عدد الطلبات المرسلة</th>
                        <th className="pb-3 text-center">المبيعات الصافية</th>
                        <th className="pb-3 text-center">الطلبات الملغاة</th>
                        <th className="pb-3 text-center">نسبة الإلغاء</th>
                        <th className="pb-3 pl-2 text-left">متوسط تكلفة الشحن</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-xs md:text-sm text-slate-700">
                      {governorateSales.map((g, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3.5 pr-2 font-medium text-slate-800 flex items-center gap-1.5">
                            <MapPin size={12} className="text-slate-400" />
                            <span>{g.name}</span>
                          </td>
                          <td className="py-3.5 text-center font-sans font-bold">{g.ordersCount} طلب</td>
                          <td className="py-3.5 text-center font-sans font-bold">{g.revenue.toLocaleString()} ج.م</td>
                          <td className="py-3.5 text-center font-sans font-bold text-red-500">{g.cancelledCount} طلب</td>
                          <td className="py-3.5 text-center font-sans">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              g.cancelRate >= 20 ? 'bg-red-50 text-red-500' : 'bg-slate-50 text-slate-500'
                            }`}>
                              {g.cancelRate.toFixed(1)}%
                            </span>
                          </td>
                          <td className="py-3.5 pl-2 text-left font-sans font-bold text-slate-500">{Math.round(g.avgShipping)} ج.م</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {activeTab === 'shipping' && (
              <div
                key="shipping"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.15 }}
              >
                {shippingPerformance.length === 0 ? (
                  <p className="text-center py-8 text-slate-400 text-sm font-medium">لا توجد بيانات شركات شحن مسجلة</p>
                ) : (
                  <table className="w-full text-right border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 text-xs font-semibold">
                        <th className="pb-3 pr-2">شركة الشحن</th>
                        <th className="pb-3 text-center">إجمالي الشحنات</th>
                        <th className="pb-3 text-center">معدل التوصيل الناجح</th>
                        <th className="pb-3 pl-2 text-left">متوسط سعر الشحن</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-xs md:text-sm text-slate-700">
                      {shippingPerformance.map((s, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3.5 pr-2 font-medium text-slate-800 flex items-center gap-1.5">
                            <Truck size={12} className="text-slate-400" />
                            <span>{s.name}</span>
                          </td>
                          <td className="py-3.5 text-center font-sans font-bold">{s.totalShipments} شحنة</td>
                          <td className="py-3.5 text-center font-sans">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              s.successRate >= 90 ? 'bg-emerald-50 text-[#00c950]' : s.successRate < 75 ? 'bg-red-50 text-red-500' : 'bg-slate-50 text-slate-500'
                            }`}>
                              {s.successRate.toFixed(1)}%
                            </span>
                          </td>
                          <td className="py-3.5 pl-2 text-left font-sans font-bold text-slate-500">{Math.round(s.avgCost)} ج.م</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {activeTab === 'loyalty' && (
              <div
                key="loyalty"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.15 }}
              >
                {customerLoyalty.length === 0 ? (
                  <p className="text-center py-8 text-slate-400 text-sm font-medium">لا توجد عمليات شراء ناجحة للعملاء بعد</p>
                ) : (
                  <table className="w-full text-right border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 text-xs font-semibold">
                        <th className="pb-3 pr-2">اسم العميل</th>
                        <th className="pb-3 text-center">الهاتف</th>
                        <th className="pb-3 text-center">عدد الطلبات الناجحة</th>
                        <th className="pb-3 text-center">إجمالي الإنفاق (LTV)</th>
                        <th className="pb-3 text-center">فئة العميل</th>
                        <th className="pb-3 pl-2 text-left">آخر طلب</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-xs md:text-sm text-slate-700">
                      {customerLoyalty.map((c, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3.5 pr-2 font-medium text-slate-800">{c.name}</td>
                          <td className="py-3.5 text-center font-sans">{c.phone || '—'}</td>
                          <td className="py-3.5 text-center font-sans font-bold">{c.ordersCount} طلبات</td>
                          <td className="py-3.5 text-center font-sans font-bold text-[#00c950]">{c.spend.toLocaleString()} ج.م</td>
                          <td className="py-3.5 text-center font-sans">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${c.badgeColor}`}>
                              {c.tier}
                            </span>
                          </td>
                          <td className="py-3.5 pl-2 text-left font-sans text-xs text-slate-400">
                            #{c.lastOrderId} ({c.lastOrderDate.split(' ')[0]})
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </>
        </div>
      </div>
    </div>
  );
};
