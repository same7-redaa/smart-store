import React, { useEffect, useState } from 'react';
import { ArrowRight, Edit, Trash2, DollarSign, Plus, X, Save, Package, FileText, Calendar, CheckCircle, AlertTriangle, Hash, Building2, Phone, MapPin, Mail, StickyNote, Receipt, Download, CreditCard, BadgeDollarSign } from 'lucide-react';
import { useApp } from '../context/AppContext';
import FloatingInput from '../components/FloatingInput';
import FloatingTextarea from '../components/FloatingTextarea';
import FloatingSelect from '../components/FloatingSelect';

export const ViewSupplier: React.FC<{ setActivePage: (p: any) => void }> = ({ setActivePage }) => {
  const { confirm, notify } = useApp();
  const [supplier, setSupplier] = useState<any>(null);
  const [showPayModal, setShowPayModal] = useState(false);
  const [payType, setPayType] = useState<'general' | 'invoice'>('general');
  const [payInvoiceId, setPayInvoiceId] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [payNote, setPayNote] = useState('');
  const [savingPay, setSavingPay] = useState(false);
  const [activeTab, setActiveTab] = useState<'invoices' | 'payments'>('invoices');

  useEffect(() => {
    const data = localStorage.getItem('view_supplier');
    if (data) setSupplier(JSON.parse(data));
  }, []);

  const updateSupplier = (updated: any) => {
    const all = JSON.parse(localStorage.getItem('my_suppliers') || '[]');
    const idx = all.findIndex((s: any) => s.id === updated.id);
    if (idx > -1) all[idx] = updated;
    localStorage.setItem('my_suppliers', JSON.stringify(all));
    localStorage.setItem('view_supplier', JSON.stringify(updated));
    setSupplier(updated);
  };

  const getInvoiceRemaining = (inv: any) => (inv.total || 0) - (inv.paid || 0);

  const handlePay = () => {
    const amount = Number(payAmount);
    if (!amount || amount <= 0) { notify('error', 'الرجاء إدخال مبلغ صحيح'); return; }
    if (amount > (supplier.dues || 0)) { notify('error', 'المبلغ أكبر من المتبقي عليك للمورد'); return; }
    if (payType === 'invoice') {
      const inv = (supplier.invoices || []).find((i: any) => i.id === payInvoiceId);
      if (!inv) { notify('error', 'الرجاء اختيار فاتورة'); return; }
      if (amount > getInvoiceRemaining(inv)) { notify('error', 'المبلغ أكبر من المتبقي على هذه الفاتورة'); return; }
    }
    setSavingPay(true);

    const payment: any = {
      id: `PAY-${Date.now()}`,
      date: new Date().toLocaleDateString('ar-EG-u-nu-latn'),
      amount,
      note: payNote.trim(),
      createdAt: new Date().toLocaleDateString('ar-EG-u-nu-latn'),
    };

    const updated = { ...supplier };
    if (payType === 'invoice') {
      payment.invoiceId = payInvoiceId;
      const invLabel = (updated.invoices || []).find((i: any) => i.id === payInvoiceId)?.id || payInvoiceId;
      payment.invoiceLabel = invLabel;
      updated.invoices = (updated.invoices || []).map((inv: any) => {
        if (inv.id === payInvoiceId) {
          return { ...inv, paid: (inv.paid || 0) + amount };
        }
        return inv;
      });
      const totalPaidOnInvoices = updated.invoices.reduce((s: number, inv: any) => s + (inv.paid || 0), 0);
      const totalInvoiced = updated.invoices.reduce((s: number, inv: any) => s + (inv.total || 0), 0);
      updated.paid = totalPaidOnInvoices;
      updated.dues = Math.max(0, totalInvoiced - totalPaidOnInvoices);
    } else {
      updated.paid = (updated.paid || 0) + amount;
      updated.dues = Math.max(0, (updated.dues || 0) - amount);
    }

    if (!updated.payments) updated.payments = [];
    updated.payments.unshift(payment);
    updateSupplier(updated);
    setShowPayModal(false);
    setPayAmount('');
    setPayNote('');
    setPayType('general');
    setPayInvoiceId('');
    setSavingPay(false);
    notify('success', 'تم تسجيل الدفعة بنجاح');
  };

  if (!supplier) return <div className="p-10 text-center text-gray-500">جاري التحميل...</div>;

  const invoices = supplier.invoices || [];
  const payments = supplier.payments || [];
  const totalInvoiced = invoices.reduce((s: number, inv: any) => s + (inv.total || 0), 0);
  const totalPaidOnInvoices = invoices.reduce((s: number, inv: any) => s + (inv.paid || 0), 0);

  return (
    <div className="flex flex-col w-full pb-10">
      {/* Top Bar */}
      <div className="flex items-center justify-between gap-3 bg-white p-3 px-5 rounded-xl shadow-sm border border-gray-100 mb-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setActivePage('purchases')} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors">
            <ArrowRight size={20} />
          </button>
          <h1 className="text-lg font-bold text-gray-800">معاينة المورد</h1>
        </div>
        <div className="flex items-center gap-2">
          {supplier.dues > 0 && (
            <button onClick={() => setShowPayModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition-colors shadow-sm">
              <Plus size={15} /> تسديد دفعة
            </button>
          )}
          <button onClick={() => { localStorage.setItem('edit_supplier', JSON.stringify(supplier)); setActivePage('edit-supplier'); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 text-sm font-medium transition-colors">
            <Edit size={15} /> تعديل
          </button>
          <button onClick={() => { confirm({ title: 'حذف المورد', message: 'هل أنت متأكد من حذف هذا المورد؟', onConfirm: () => { const all = JSON.parse(localStorage.getItem('my_suppliers') || '[]'); const filtered = all.filter((s: any) => s.id !== supplier.id); localStorage.setItem('my_suppliers', JSON.stringify(filtered)); notify('success', 'تم حذف المورد بنجاح'); setActivePage('purchases'); } }); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary/20 bg-primary-light text-primary hover:bg-primary hover:text-white text-sm font-medium transition-colors">
            <Trash2 size={15} /> حذف
          </button>
        </div>
      </div>

      {/* Supplier Info */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 mb-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Building2 size={18} className="text-primary" />
              <h2 className="text-lg font-bold text-gray-800">{supplier.name}</h2>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                supplier.status === 'نشط' ? 'bg-green-100 text-green-700' :
                supplier.status === 'موقوف' ? 'bg-red-100 text-red-700' :
                'bg-yellow-100 text-yellow-700'
              }`}>{supplier.status}</span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-3 text-sm">
          {supplier.category && <div className="flex items-center gap-1.5 text-gray-600"><Hash size={14} className="shrink-0 text-gray-400" /><span>{supplier.category}</span></div>}
          {supplier.phone && <div className="flex items-center gap-1.5 text-gray-600" dir="ltr"><Phone size={14} className="shrink-0 text-gray-400" /><span>{supplier.phone}</span></div>}
          {supplier.email && <div className="flex items-center gap-1.5 text-gray-600"><Mail size={14} className="shrink-0 text-gray-400" /><span>{supplier.email}</span></div>}
          {supplier.address && <div className="flex items-center gap-1.5 text-gray-600 sm:col-span-2 lg:col-span-1"><MapPin size={14} className="shrink-0 text-gray-400" /><span className="truncate">{supplier.address}</span></div>}
        </div>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500">إجمالي الفواتير</span>
            <Receipt size={16} className="text-primary" />
          </div>
          <p className="text-xl font-bold text-gray-800">{supplier.totalInvoices || 0}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500">المنتجات الموردة</span>
            <Package size={16} className="text-primary" />
          </div>
          <p className="text-xl font-bold text-gray-800">{supplier.supplied || 0}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500">المدفوع للمورد</span>
            <CheckCircle size={16} className="text-green-600" />
          </div>
          <p className="text-xl font-bold text-green-600">{(supplier.paid || 0).toLocaleString('en-US')} ج.م</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500">المتبقي عليك للمورد</span>
            <AlertTriangle size={16} className={supplier.dues > 0 ? 'text-red-500' : 'text-green-600'} />
          </div>
          <p className={`text-xl font-bold ${supplier.dues > 0 ? 'text-red-500' : 'text-green-600'}`}>{(supplier.dues || 0).toLocaleString('en-US')} ج.م</p>
        </div>
      </div>

      {/* Tabs: Invoices / Payments */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-4">
        <div className="flex border-b border-gray-100">
          <button onClick={() => setActiveTab('invoices')} className={`flex items-center gap-1.5 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'invoices' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            <FileText size={16} /> المشتريات والفواتير
            {invoices.length > 0 && <span className="bg-primary/10 text-primary text-[10px] px-1.5 py-0.5 rounded-full">{invoices.length}</span>}
          </button>
          <button onClick={() => setActiveTab('payments')} className={`flex items-center gap-1.5 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'payments' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            <CreditCard size={16} /> سجل الدفعات
            {payments.length > 0 && <span className="bg-primary/10 text-primary text-[10px] px-1.5 py-0.5 rounded-full">{payments.length}</span>}
          </button>
        </div>

        {/* Invoices Tab */}
        {activeTab === 'invoices' && (
          <div className="p-4">
            {invoices.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <FileText size={40} className="mx-auto mb-2 opacity-50" />
                <p>لا توجد فواتير مشتريات بعد</p>
                <p className="text-xs mt-1">تظهر فواتير المشتريات تلقائياً عند إضافة منتج وربطه بالمورد</p>
              </div>
            ) : (
              <div className="space-y-4">
                {invoices.map((inv: any, idx: number) => {
                  const remaining = (inv.total || 0) - (inv.paid || 0);
                  return (
                    <div key={inv.id || idx} className="border border-gray-200 rounded-xl overflow-hidden">
                      <div className="bg-gray-50 px-4 py-2.5 flex items-center justify-between border-b border-gray-200">
                        <div className="flex items-center gap-2">
                          <Receipt size={15} className="text-primary" />
                          <span className="font-bold text-sm text-gray-800">{inv.id}</span>
                          <span className="text-xs text-gray-500 flex items-center gap-1"><Calendar size={12} />{inv.date}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${remaining <= 0 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                            {remaining <= 0 ? 'مدفوع بالكامل' : `متبقي ${remaining.toLocaleString('en-US')} ج.م`}
                          </span>
                          <span className="font-bold text-sm text-gray-800">إجمالي: {inv.total.toLocaleString('en-US')} ج.م</span>
                        </div>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm border-collapse">
                          <thead>
                            <tr className="bg-gray-50/50 text-gray-500 text-xs">
                              <th className="px-4 py-2 font-medium text-center">#</th>
                              <th className="px-4 py-2 font-medium text-center">المنتج</th>
                              <th className="px-4 py-2 font-medium text-center">كود (SKU)</th>
                              <th className="px-4 py-2 font-medium text-center">الكمية</th>
                              <th className="px-4 py-2 font-medium text-center">سعر الوحدة</th>
                              <th className="px-4 py-2 font-medium text-center">الإجمالي</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {(inv.items || []).map((item: any, iIdx: number) => (
                              <tr key={iIdx} className="hover:bg-gray-50">
                                <td className="px-4 py-2 text-center text-gray-400">{iIdx + 1}</td>
                                <td className="px-4 py-2 font-medium text-gray-800 text-center">{item.productName}</td>
                                <td className="px-4 py-2 text-xs text-gray-500 font-mono text-center">{item.sku || '—'}</td>
                                <td className="px-4 py-2 text-center font-medium">{item.quantity}</td>
                                <td className="px-4 py-2 text-center">{item.price?.toLocaleString('en-US') || '0'} ج.م</td>
                                <td className="px-4 py-2 text-center font-bold text-gray-800">{(item.total || 0).toLocaleString('en-US')} ج.م</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="bg-gray-50 font-bold text-sm">
                              <td colSpan={4} className="px-4 py-2 text-center text-gray-500">الإجمالي</td>
                              <td className="px-4 py-2 text-center text-gray-800">{inv.items?.reduce((s: number, i: any) => s + (i.quantity || 0), 0) || 0}</td>
                              <td className="px-4 py-2 text-center text-primary">{(inv.total || 0).toLocaleString('en-US')} ج.م</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                      {inv.notes && <div className="px-4 py-2 bg-gray-50/50 border-t border-gray-200 text-xs text-gray-500 flex items-center gap-1"><StickyNote size={12} />{inv.notes}</div>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Payments Tab */}
        {activeTab === 'payments' && (
          <div className="p-4">
            {payments.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <CreditCard size={40} className="mx-auto mb-2 opacity-50" />
                <p>لا توجد دفعات مسجلة بعد</p>
                <p className="text-xs mt-1">سجل دفعة جديدة باستخدام زر "تسديد دفعة"</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-center border-collapse text-sm">
                  <thead className="bg-gray-50">
                    <tr className="text-gray-500 border-b">
                      <th className="px-4 py-2.5 font-medium">رقم الدفعة</th>
                      <th className="px-4 py-2.5 font-medium">التاريخ</th>
                      <th className="px-4 py-2.5 font-medium">الفاتورة</th>
                      <th className="px-4 py-2.5 font-medium">المبلغ</th>
                      <th className="px-4 py-2.5 font-medium">ملاحظات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {payments.map((pay: any, idx: number) => (
                      <tr key={pay.id || idx} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 font-bold text-primary">{pay.id}</td>
                        <td className="px-4 py-2.5 text-gray-600">{pay.date}</td>
                        <td className="px-4 py-2.5 text-gray-600">{pay.invoiceLabel || 'تسديد عام'}</td>
                        <td className="px-4 py-2.5 font-bold text-green-600">{pay.amount.toLocaleString('en-US')} ج.م</td>
                        <td className="px-4 py-2.5 text-gray-500">{pay.note || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50 font-bold">
                      <td colSpan={3} className="px-4 py-2.5 text-left text-gray-600">الإجمالي</td>
                      <td className="px-4 py-2.5 text-green-600">{payments.reduce((s: number, p: any) => s + (p.amount || 0), 0).toLocaleString('en-US')} ج.م</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Notes Section */}
      {supplier.notes && (
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 mb-4">
          <h3 className="text-sm font-bold text-gray-800 mb-2 flex items-center gap-1.5"><StickyNote size={16} className="text-primary" /> ملاحظات</h3>
          <p className="text-sm text-gray-700 whitespace-pre-line">{supplier.notes}</p>
        </div>
      )}

      {/* Footer info */}
      <div className="text-xs text-gray-400 flex items-center gap-2">
        <span>كود المورد: {supplier.id}</span>
        <span>•</span>
        <span>تاريخ التسجيل: {supplier.createdAt}</span>
      </div>

      {/* Payment Modal */}
      {showPayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4" onClick={() => setShowPayModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <BadgeDollarSign size={18} className="text-green-600" />
                <h2 className="text-sm font-bold text-gray-800">تسديد دفعة للمورد</h2>
              </div>
              <button onClick={() => setShowPayModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"><X size={16} /></button>
            </div>
            <div className="p-4 space-y-3">
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm">
                <div className="flex justify-between text-gray-700 mb-1">
                  <span>المتبقي عليك للمورد:</span>
                  <span className="font-bold text-red-600">{(supplier.dues || 0).toLocaleString('en-US')} ج.م</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>إجمالي المدفوع للمورد:</span>
                  <span className="font-bold text-green-600">{(supplier.paid || 0).toLocaleString('en-US')} ج.م</span>
                </div>
              </div>

              {/* Payment Type */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">نوع التسديد</label>
                <div className="flex gap-2">
                  <button onClick={() => { setPayType('general'); setPayInvoiceId(''); }} className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium border transition-colors ${payType === 'general' ? 'bg-primary text-white border-primary' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}>
                    تسديد عام
                  </button>
                  <button onClick={() => setPayType('invoice')} className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium border transition-colors ${payType === 'invoice' ? 'bg-primary text-white border-primary' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}>
                    تسديد لفاتورة
                  </button>
                </div>
              </div>

              {/* Invoice Selector */}
              {payType === 'invoice' && (
                <FloatingSelect label="اختر الفاتورة" value={payInvoiceId} onChange={e => setPayInvoiceId(e.target.value)} required>
                  <option value="">-- اختر فاتورة --</option>
                  {(supplier.invoices || []).filter((inv: any) => getInvoiceRemaining(inv) > 0).map((inv: any) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.id} — المتبقي: {getInvoiceRemaining(inv).toLocaleString('en-US')} ج.م ({inv.date})
                    </option>
                  ))}
                </FloatingSelect>
              )}

              {/* Amount */}
              <div>
                {payType === 'invoice' && payInvoiceId && (() => {
                  const inv = (supplier.invoices || []).find((i: any) => i.id === payInvoiceId);
                  return inv ? <p className="text-[11px] text-gray-400 mb-1">المتبقي عليك: {getInvoiceRemaining(inv).toLocaleString('en-US')} ج.م</p> : null;
                })()}
                <FloatingInput label="المبلغ" value={payAmount} onChange={e => setPayAmount(e.target.value)} required type="number" icon={<DollarSign size={16} />} endAdornment={<span>ج.م</span>} placeholder="0" />
              </div>

              {/* Note */}
              <FloatingTextarea label="ملاحظة (اختياري)" value={payNote} onChange={e => setPayNote(e.target.value)} icon={<StickyNote size={16} />} placeholder="سبب الدفع..." rows={2} />
            </div>
            <div className="flex gap-2 p-4 border-t border-gray-100">
              <button onClick={handlePay} disabled={savingPay}
                className="flex items-center justify-center gap-2 flex-1 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50">
                <Save size={16} /> {savingPay ? 'جاري التسجيل...' : 'تسديد الدفعة'}
              </button>
              <button onClick={() => setShowPayModal(false)} className="flex-1 py-2 bg-gray-100 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors">إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
