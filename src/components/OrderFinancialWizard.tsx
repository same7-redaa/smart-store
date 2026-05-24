import React, { useState, useMemo, useEffect } from 'react';
import { X, AlertTriangle, Truck, DollarSign, Check, Trash2, ShieldAlert } from 'lucide-react';
import { motion } from 'motion/react';
import { useApp } from '../context/AppContext';
import FloatingInput from './FloatingInput';
import FloatingSelect from './FloatingSelect';
import FloatingTextarea from './FloatingTextarea';

interface OrderItem {
  productId: string;
  variantName: string;
  productName: string;
  sku: string;
  quantity: number;
  price: number;
  total: number;
}

interface OrderFinancialWizardProps {
  order: any;
  targetStatus: 'ملغي بعد الشحن' | 'مرتجع كلي' | 'مرتجع جزئي' | 'استبدال';
  onClose: () => void;
  onConfirm: (updatedOrder: any) => void;
}

export const OrderFinancialWizard: React.FC<OrderFinancialWizardProps> = ({
  order,
  targetStatus,
  onClose,
  onConfirm,
}) => {
  const { notify } = useApp();

  // Load products to compute cost price & update stock
  const [products, setProducts] = useState<any[]>(() => {
    return JSON.parse(localStorage.getItem('my_products') || '[]');
  });

  // Load shipping companies to calculate special status fee
  const [companies, setCompanies] = useState<any[]>(() => {
    return JSON.parse(localStorage.getItem('my_shipping_companies') || '[]');
  });

  // State of returned/impacted items in this action
  // For 'مرتجع جزئي' or 'استبدال', the merchant selects which items are actually being returned.
  // For 'مرتجع كلي' or 'ملغي بعد الشحن', all items are assumed returned.
  const [itemStatuses, setItemStatuses] = useState<Record<string, {
    isReturned: boolean; // Is this item part of the return/exchange?
    isHealthy: boolean;  // true = سليم (إعادة للمخزن), false = تالف (هالك)
  }>>({});

  // Pricing inputs
  const [calculatedShippingCost, setCalculatedShippingCost] = useState(0);
  const [adjustedShippingCost, setAdjustedShippingCost] = useState('');
  const [calculatedRefund, setCalculatedRefund] = useState(0);
  const [adjustedRefund, setAdjustedRefund] = useState('');
  const [refundMethod, setRefundMethod] = useState('نقدي');
  const [notes, setNotes] = useState('');

  // Initial calculations and item statuses setup
  useEffect(() => {
    // Determine which items are returned by default based on target status
    const initialStatuses: Record<string, { isReturned: boolean; isHealthy: boolean }> = {};
    order.items.forEach((item: OrderItem) => {
      const key = `${item.productId}-${item.variantName || 'default'}`;
      initialStatuses[key] = {
        isReturned: targetStatus === 'ملغي بعد الشحن' || targetStatus === 'مرتجع كلي',
        isHealthy: true, // Default to Healthy (restock)
      };
    });
    setItemStatuses(initialStatuses);

    // Calculate dynamic special shipping fee
    let baseOriginalFee = 0;
    if (order.shippingCompany && order.governorate) {
      const company = companies.find(c => c.name === order.shippingCompany);
      if (company) {
        const gov = company.governorates?.find((g: any) => g.name === order.governorate);
        if (gov) {
          baseOriginalFee = Number(gov.originalPrice) || 0;
        }

        // Apply special pricing policy
        if (company.specialFees) {
          let policy = null;
          if (targetStatus === 'ملغي بعد الشحن') {
            policy = company.specialFees.failedDelivery;
          } else if (targetStatus === 'مرتجع كلي' || targetStatus === 'مرتجع جزئي') {
            policy = company.specialFees.returnCollection;
          } else if (targetStatus === 'استبدال') {
            policy = company.specialFees.exchangeDelivery;
          }

          if (policy) {
            if (policy.type === 'percentage') {
              baseOriginalFee = (Number(policy.value) / 100) * baseOriginalFee;
            } else if (policy.type === 'flat') {
              baseOriginalFee = Number(policy.value) || 0;
            }
          }
        }
      }
    }
    setCalculatedShippingCost(baseOriginalFee);
    setAdjustedShippingCost(baseOriginalFee.toString());

  }, [order, targetStatus, companies]);

  // Compute product costs of returned items
  const itemCosts = useMemo(() => {
    const costs: Record<string, number> = {};
    order.items.forEach((item: OrderItem) => {
      const key = `${item.productId}-${item.variantName || 'default'}`;
      const product = products.find(p => p.id === item.productId);
      let cost = 0;
      if (product) {
        if (product.hasVariants && product.variants?.length) {
          const v = product.variants.find((variant: any) => variant.name === item.variantName);
          cost = v ? (v.costPrice || product.costPrice || 0) : (product.costPrice || 0);
        } else {
          cost = product.costPrice || 0;
        }
      }
      costs[key] = cost;
    });
    return costs;
  }, [order, products]);

  // Dynamic calculations based on items selected for return
  const stats = useMemo(() => {
    let totalItemsValue = 0;
    let totalItemsCost = 0;
    let itemsReturnedCount = 0;
    let wastedCost = 0;
    let restockedCount = 0;
    let wastedCount = 0;

    order.items.forEach((item: OrderItem) => {
      const key = `${item.productId}-${item.variantName || 'default'}`;
      const status = itemStatuses[key];
      if (status && status.isReturned) {
        totalItemsValue += item.price * item.quantity;
        totalItemsCost += (itemCosts[key] || 0) * item.quantity;
        itemsReturnedCount += item.quantity;
        
        if (status.isHealthy) {
          restockedCount += item.quantity;
        } else {
          wastedCount += item.quantity;
          wastedCost += (itemCosts[key] || 0) * item.quantity;
        }
      }
    });

    // Compute expected customer refund
    // In full return or cancellation, customer usually gets back total money paid minus any shipping fee deductions
    let refund = 0;
    const totalCustomerPaid = Number(order.afterDiscount || order.total) || 0;
    
    if (targetStatus === 'ملغي بعد الشحن' || targetStatus === 'مرتجع كلي') {
      refund = totalCustomerPaid;
    } else if (targetStatus === 'مرتجع جزئي') {
      // Refund the value of returned items
      refund = totalItemsValue;
    } else if (targetStatus === 'استبدال') {
      // In typical exchanges, values are equal so refund is 0, except for shipping costs
      refund = 0;
    }

    return {
      totalItemsValue,
      totalItemsCost,
      itemsReturnedCount,
      wastedCost,
      restockedCount,
      wastedCount,
      suggestedRefund: refund,
    };
  }, [order, itemStatuses, itemCosts, targetStatus]);

  // Set the suggested refund when item statuses change
  useEffect(() => {
    setCalculatedRefund(stats.suggestedRefund);
    setAdjustedRefund(stats.suggestedRefund.toString());
  }, [stats.suggestedRefund]);

  const handleToggleItemReturn = (key: string) => {
    if (targetStatus === 'ملغي بعد الشحن' || targetStatus === 'مرتجع كلي') return; // Cannot toggle in full return
    setItemStatuses(prev => ({
      ...prev,
      [key]: { ...prev[key], isReturned: !prev[key].isReturned }
    }));
  };

  const handleToggleItemHealthy = (key: string) => {
    setItemStatuses(prev => ({
      ...prev,
      [key]: { ...prev[key], isHealthy: !prev[key].isHealthy }
    }));
  };

  const handleConfirmSave = () => {
    const finalShippingFee = Number(adjustedShippingCost) || 0;
    const finalRefund = Number(adjustedRefund) || 0;

    // Validate: for partial return / exchange, at least one item must be selected
    if (targetStatus === 'مرتجع جزئي' || targetStatus === 'استبدال') {
      const anySelected = (Object.values(itemStatuses) as { isReturned: boolean; isHealthy: boolean }[]).some(s => s.isReturned);
      if (!anySelected) {
        notify('error', 'يرجى تحديد منتج واحد على الأقل من القائمة');
        return;
      }
    }

    // 1. Log wastage to localStorage and decrement/increment stocks in my_products
    const wastageLogs: any[] = JSON.parse(localStorage.getItem('my_wastage') || '[]');
    let wastageLoggedCount = 0;

    const updatedProducts = products.map(p => {
      const pCopy = { ...p };
      let productChanged = false;

      order.items.forEach((item: OrderItem) => {
        if (item.productId === pCopy.id) {
          const key = `${item.productId}-${item.variantName || 'default'}`;
          const status = itemStatuses[key];

          if (status && status.isReturned) {
            productChanged = true;
            const qty = item.quantity;
            const cost = itemCosts[key] || 0;

            if (status.isHealthy) {
              // Increment stock of healthy item back to store
              if (pCopy.hasVariants && pCopy.variants?.length) {
                pCopy.variants = pCopy.variants.map((v: any) => {
                  if (v.name === item.variantName) {
                    return { ...v, quantity: (v.quantity || 0) + qty };
                  }
                  return v;
                });
              } else {
                pCopy.stock = (pCopy.stock || 0) + qty;
              }
            } else {
              // Mark as Wasted - Do NOT increment stock, log to my_wastage
              const sku = pCopy.hasVariants 
                ? (pCopy.variants.find((v: any) => v.name === item.variantName)?.sku || pCopy.id)
                : pCopy.id;

              const log = {
                id: 'WST-RET-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
                productId: pCopy.id,
                productName: pCopy.name,
                variantName: pCopy.hasVariants ? item.variantName : undefined,
                sku: sku,
                quantity: qty,
                unitCost: cost,
                totalLoss: qty * cost,
                reason: 'damaged_return',
                notes: `مرتجع تالف من الطلب #${order.id}. ${notes.trim()}`,
                createdAt: new Date().toLocaleDateString('en-GB') + ' ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
              };
              wastageLogs.unshift(log);
              wastageLoggedCount += qty;
            }
          }
        }
      });

      if (productChanged) {
        if (pCopy.hasVariants && pCopy.variants?.length) {
          pCopy.stock = pCopy.variants.reduce((s: number, v: any) => s + (v.quantity || 0), 0);
        }
      }

      return pCopy;
    });

    // Save wastage & updated stocks
    localStorage.setItem('my_products', JSON.stringify(updatedProducts));
    if (wastageLoggedCount > 0) {
      localStorage.setItem('my_wastage', JSON.stringify(wastageLogs));
    }

    // 2. Prepare the updated Order object
    const returnedItems = order.items
      .filter((item: OrderItem) => {
        const key = `${item.productId}-${item.variantName || 'default'}`;
        return itemStatuses[key]?.isReturned;
      })
      .map((item: OrderItem) => {
        const key = `${item.productId}-${item.variantName || 'default'}`;
        return {
          productId: item.productId,
          variantName: item.variantName,
          productName: item.productName,
          sku: item.sku,
          quantity: item.quantity,
          price: item.price,
          isHealthy: itemStatuses[key]?.isHealthy ?? true
        };
      });

    const finalFinancialImpact = {
      status: targetStatus,
      lostShippingFee: finalShippingFee,
      wastageLoss: stats.wastedCost,
      customerRefund: finalRefund,
      refundMethod: refundMethod,
      restockedItemsCount: stats.restockedCount,
      wastedItemsCount: stats.wastedCount,
      notes: notes.trim(),
      createdAt: new Date().toISOString(),
      returnedItems: returnedItems,
    };

    const updatedOrder = {
      ...order,
      status: targetStatus,
      financialImpact: finalFinancialImpact,
      payment: finalRefund > 0 ? 'مسترد جزئياً' : order.payment,
    };

    if (targetStatus === 'مرتجع كلي' || targetStatus === 'ملغي بعد الشحن') {
      updatedOrder.payment = 'مسترد بالكامل';
    }

    notify('success', `تم معالجة الحالة (${targetStatus}) وتحديث المخزون والمالية بنجاح`);
    onConfirm(updatedOrder);
  };

  return (
    <div className="fixed top-0 left-0 bottom-0 right-0 lg:right-[var(--sidebar-width)] z-[100] p-4 sm:p-6 flex flex-col bg-black/40 backdrop-blur-sm animate-fadeIn">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full h-full bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden text-right max-w-5xl mx-auto"
      >
        {/* Header */}
        <div className="p-5 border-b border-gray-200 flex items-center justify-between bg-gray-50/80 sticky top-0 z-10">
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-all cursor-pointer"
          >
            <X size={20} />
          </button>
          <div className="flex items-center gap-3">
            <span className="inline-block px-3 py-1 bg-red-50 text-red-600 rounded-full text-xs font-bold border border-red-200">
              معالج مالي ذكي
            </span>
            <h2 className="text-lg font-bold text-gray-800">
              تأكيد وتحديث حالة الطلب #{order.id} إلى ({targetStatus})
            </h2>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          
          {/* Top Banner Alert */}
          <div className="p-4 bg-orange-50 border border-orange-100 rounded-2xl flex items-start gap-4">
            <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
              <AlertTriangle size={20} />
            </div>
            <div className="text-right flex-1">
              <h4 className="text-sm font-bold text-orange-950">التكامل المحاسبي وحركة المخازن</h4>
              <p className="text-xs text-orange-800 leading-relaxed mt-1">
                تغيير حالة الطلب إلى (مرتجع أو ملغي بعد الشحن) يتطلب تحديد مصير المنتجات بكل قطعة،
                لاحتساب رسوم الشحن المهدرة التي تفرضها شركات الشحن، وخصم تكلفة البضائع التالفة فورياً من أرباحك وتوثيقها بصفحة الهالك.
              </p>
            </div>
          </div>

          {/* Table of Items */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-gray-800 border-r-4 border-[#00c950] pr-2.5">
              حدد المنتجات المرتجعة وحالة كل منتج (سليم أم تالف)
            </h3>
            <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-center border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-400 text-xs font-bold border-b border-gray-200">
                    {(targetStatus === 'مرتجع جزئي' || targetStatus === 'استبدال') && (
                      <th className="p-3 w-16 text-center">المرتجع</th>
                    )}
                    <th className="p-3 text-center">المنتج</th>
                    <th className="p-3 text-center">الكمية</th>
                    <th className="p-3 text-center">سعر البيع</th>
                    <th className="p-3 text-center">تكلفة الشراء</th>
                    <th className="p-3 text-center">مصير المنتج بالمخزن</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                  {order.items.map((item: OrderItem) => {
                    const key = `${item.productId}-${item.variantName || 'default'}`;
                    const status = itemStatuses[key] || { isReturned: false, isHealthy: true };
                    const cost = itemCosts[key] || 0;

                    return (
                      <tr 
                        key={key} 
                        className={`transition-colors ${
                          status.isReturned ? 'bg-emerald-50/20' : 'opacity-60 bg-gray-50/30'
                        }`}
                      >
                        {/* Selector checkbox for partial return / exchange */}
                        {(targetStatus === 'مرتجع جزئي' || targetStatus === 'استبدال') && (
                          <td className="p-3 text-center">
                            <input 
                              type="checkbox"
                              checked={status.isReturned}
                              onChange={() => handleToggleItemReturn(key)}
                              className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                            />
                          </td>
                        )}

                        <td className="p-3 font-semibold text-gray-900 text-center">
                          <div className="flex flex-col items-center justify-center">
                            <p>{item.productName}</p>
                            {item.variantName && (
                              <span className="inline-block mt-0.5 px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-md font-medium">
                                {item.variantName}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="p-3 text-center font-bold">{item.quantity}</td>
                        <td className="p-3 text-center text-gray-500">{item.price.toLocaleString('en-US')} ج.م</td>
                        <td className="p-3 text-center text-gray-400">{cost.toLocaleString('en-US')} ج.م</td>

                        {/* Healthy vs Damaged selection */}
                        <td className="p-3">
                          {status.isReturned ? (
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleToggleItemHealthy(key)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                                  status.isHealthy 
                                    ? 'bg-emerald-50 border-emerald-200 text-[#00c950] shadow-sm'
                                    : 'bg-white border-gray-200 text-gray-400 hover:bg-gray-50'
                                }`}
                              >
                                <span className={`w-2 h-2 rounded-full ${status.isHealthy ? 'bg-[#00c950]' : 'bg-gray-300'}`} />
                                <span>سليم (إعادة للمخزن)</span>
                              </button>
                              <button
                                onClick={() => handleToggleItemHealthy(key)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                                  !status.isHealthy 
                                    ? 'bg-red-50 border-red-200 text-red-600 shadow-sm'
                                    : 'bg-white border-gray-200 text-gray-400 hover:bg-gray-50'
                                }`}
                              >
                                <span className={`w-2 h-2 rounded-full ${!status.isHealthy ? 'bg-red-600' : 'bg-gray-300'}`} />
                                <span>تالف / هالك (لا يُعاد)</span>
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400 block text-center">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pricing Adjustments Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Right Card: Shipping company fees */}
            <div className="p-5 border border-gray-200 rounded-2xl space-y-4 shadow-sm bg-gray-50/20">
              <div className="flex items-center gap-2 text-gray-800 font-bold text-sm">
                <Truck size={18} className="text-[#00c950]" />
                <span>تكلفة شحن مرتجع شركة الشحن (المهدرة)</span>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                يقوم النظام بالتحقق من سياسة التسعير لـ ({order.shippingCompany || 'شركة الشحن'}) ومحافظة ({order.governorate}) واحتساب الرسوم الخاصة بهذه الحالة تلقائياً.
              </p>

              <div className="flex items-center gap-4 bg-emerald-50/50 p-3 rounded-xl border border-emerald-100/60 text-xs">
                <div className="text-right">
                  <span className="text-gray-400 block font-bold">الرسم المقترح تلقائياً:</span>
                  <span className="font-bold text-[#00c950] text-sm mt-0.5 block">{calculatedShippingCost.toLocaleString('en-US')} ج.م</span>
                </div>
              </div>

              <div>
                <FloatingInput 
                  label="تكلفة الشحن المهدرة الفعلية (ج.م)"
                  type="number"
                  value={adjustedShippingCost}
                  onChange={e => setAdjustedShippingCost(e.target.value)}
                  placeholder="أدخل الرسوم المطلوبة لشركة الشحن"
                  required
                />
              </div>
            </div>

            {/* Left Card: Customer Refund */}
            <div className="p-5 border border-gray-200 rounded-2xl space-y-4 shadow-sm bg-gray-50/20">
              <div className="flex items-center gap-2 text-gray-800 font-bold text-sm">
                <DollarSign size={18} className="text-[#00c950]" />
                <span>المبلغ المسترد للعميل</span>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                قيمة المبيعات المستردة للعميل بناءً على المنتجات المرتجعة المحددة أعلاه.
              </p>

              <div className="flex items-center gap-4 bg-emerald-50/50 p-3 rounded-xl border border-emerald-100/60 text-xs">
                <div className="text-right">
                  <span className="text-gray-400 block font-bold">المسترد المقترح:</span>
                  <span className="font-bold text-primary text-sm mt-0.5 block">{calculatedRefund.toLocaleString('en-US')} ج.م</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FloatingInput 
                  label="المبلغ المسترد الفعلي (ج.م)"
                  type="number"
                  value={adjustedRefund}
                  onChange={e => setAdjustedRefund(e.target.value)}
                  placeholder="أدخل المبلغ النهائي المسترد"
                  required
                />
                
                <FloatingSelect
                  label="طريقة استرداد الأموال"
                  value={refundMethod}
                  onChange={e => setRefundMethod(e.target.value)}
                >
                  <option value="نقدي">نقدي</option>
                  <option value="فودافون كاش">فودافون كاش</option>
                  <option value="تحويل بنكي">تحويل بنكي</option>
                  <option value="رصيد متجر">رصيد متجر</option>
                </FloatingSelect>
              </div>
            </div>
          </div>

          {/* Details & Notes */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 p-5 rounded-2xl border border-gray-200 text-xs font-semibold text-gray-700">
            <div className="space-y-1">
              <span className="text-gray-400 block">قطع معادة للمخزن:</span>
              <span className="text-emerald-600 font-bold text-sm">{stats.restockedCount} قطعة</span>
            </div>
            <div className="space-y-1">
              <span className="text-gray-400 block">قطع تالفة (هالكة):</span>
              <span className="text-red-600 font-bold text-sm">{stats.wastedCount} قطعة</span>
            </div>
            <div className="space-y-1">
              <span className="text-gray-400 block">خسائر البضاعة التالفة:</span>
              <span className="text-red-700 font-bold text-sm">{stats.wastedCost.toLocaleString('en-US')} ج.م</span>
            </div>
          </div>

          <div>
            <FloatingTextarea 
              label="سبب الإرجاع / ملاحظات المعالج المالي"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="اكتب أي ملاحظات أو أسباب لإلغاء/إرجاع البضاعة..."
            />
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t border-gray-100 bg-gray-50/80 sticky bottom-0 z-10 flex items-center justify-start gap-3">
          <button 
            onClick={handleConfirmSave}
            className="bg-[#00c950] text-white px-6 py-2.5 rounded-xl hover:bg-emerald-600 transition-all font-bold text-sm cursor-pointer shadow-sm shadow-[#00c950]/20 flex items-center gap-2"
          >
            <Check size={18} />
            <span>تأكيد الحسابات وحفظ</span>
          </button>
          <button 
            onClick={onClose}
            className="border border-gray-200 text-gray-500 bg-white hover:bg-gray-50 px-6 py-2.5 rounded-xl transition-all font-bold text-sm cursor-pointer"
          >
            إلغاء
          </button>
        </div>
      </motion.div>
    </div>
  );
};
