import React, { useState, useEffect } from 'react';
import { ArrowRight, Save, Plus, Trash2, X, Building2, MapPin, DollarSign, Hash, Tag } from 'lucide-react';
import { useApp } from '../context/AppContext';
import FloatingInput from '../components/FloatingInput';

interface GovernoratePricing {
  name: string;
  originalPrice: number;
  customerPrice: number;
}

interface ShippingCompany {
  id: string;
  name: string;
  governorates: GovernoratePricing[];
  createdAt: string;
}

const EGYPT_GOVS = [
  'القاهرة', 'الإسكندرية', 'الجيزة', 'الشرقية', 'الدقهلية',
  'البحيرة', 'المنيا', 'القليوبية', 'سوهاج', 'كفر الشيخ',
  'أسوان', 'أسيوط', 'الغربية', 'المنوفية', 'الأقصر',
  'بني سويف', 'قنا', 'الفيوم', 'دمياط', 'الإسماعيلية',
  'بورسعيد', 'السويس', 'مرسى مطروح', 'شمال سيناء', 'جنوب سيناء',
  'الوادي الجديد', 'البحر الأحمر',
];

const STORAGE_KEY = 'my_shipping_companies';

interface AddShippingCompanyProps {
  setActivePage: (page: any) => void;
  isEditing?: boolean;
}

export const AddShippingCompany: React.FC<AddShippingCompanyProps> = ({ setActivePage, isEditing }) => {
  const { notify } = useApp();
  const [formName, setFormName] = useState('');
  const [formId, setFormId] = useState('');
  const [formGovs, setFormGovs] = useState<GovernoratePricing[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [bulkOriginal, setBulkOriginal] = useState('');
  const [bulkCustomer, setBulkCustomer] = useState('');
  const [errors, setErrors] = useState<{ name?: string; govs?: string }>({});

  const [useSpecialFees, setUseSpecialFees] = useState(false);
  const [specialFees, setSpecialFees] = useState({
    failedDelivery: { type: 'percentage' as 'flat' | 'percentage', value: 50 },
    exchangeDelivery: { type: 'percentage' as 'flat' | 'percentage', value: 150 },
    returnCollection: { type: 'flat' as 'flat' | 'percentage', value: 30 },
  });

  useEffect(() => {
    if (isEditing) {
      const data = localStorage.getItem('edit_shipping');
      if (data) {
        try {
          const c = JSON.parse(data);
          setFormName(c.name || '');
          setFormId(c.id || '');
          const govs = c.governorates?.map((g: any) => ({ ...g })) || [];
          setFormGovs(govs);
          if (c.specialFees) {
            setUseSpecialFees(true);
            setSpecialFees({
              failedDelivery: c.specialFees.failedDelivery || { type: 'percentage', value: 50 },
              exchangeDelivery: c.specialFees.exchangeDelivery || { type: 'percentage', value: 150 },
              returnCollection: c.specialFees.returnCollection || { type: 'flat', value: 30 },
            });
          }
        } catch (e) { /* ignore */ }
      }
    }
  }, [isEditing]);

  const addGovRow = () => setFormGovs([{ name: '', originalPrice: 0, customerPrice: 0 }, ...formGovs]);

  const removeGovRow = (i: number) => setFormGovs(formGovs.filter((_, idx) => idx !== i));

  const updateGov = (i: number, field: keyof GovernoratePricing, value: string | number) => {
    const copy = [...formGovs];
    (copy[i] as any)[field] = value;
    setFormGovs(copy);
  };

  const handleSave = () => {
    const newErrors: typeof errors = {};
    if (!formName.trim()) newErrors.name = 'يرجى إدخال اسم الشركة';
    if (!formGovs.length) newErrors.govs = 'يرجى إضافة محافظة واحدة على الأقل';
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }
    setIsSaving(true);
    const govs = formGovs.map(g => ({
      name: g.name,
      originalPrice: Number(g.originalPrice) || 0,
      customerPrice: Number(g.customerPrice) || 0,
    }));
    const companies = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const feesToSave = useSpecialFees ? specialFees : undefined;
    if (isEditing) {
      const idx = companies.findIndex((c: any) => c.id === formId);
      if (idx > -1) companies[idx] = { ...companies[idx], name: formName.trim(), governorates: govs, specialFees: feesToSave };
      else companies.unshift({ id: formId, name: formName.trim(), governorates: govs, specialFees: feesToSave, createdAt: new Date().toLocaleDateString('ar-EG-u-nu-latn') });
    } else {
      const id = `CMP-${String(companies.length + 1).padStart(3, '0')}`;
      companies.unshift({ id, name: formName.trim(), governorates: govs, specialFees: feesToSave, createdAt: new Date().toLocaleDateString('ar-EG-u-nu-latn') });
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(companies));
    setTimeout(() => {
      setIsSaving(false);
      notify('success', isEditing ? 'تم تعديل الشركة بنجاح' : 'تم إضافة الشركة بنجاح');
      setActivePage('shipping');
    }, 300);
  };

  return (
    <div className="flex flex-col w-full pb-10 select-none">
      {/* Top Bar */}
      <div className="flex items-center justify-between gap-3 bg-white p-3 px-5 rounded-xl shadow-sm border border-gray-100 mb-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setActivePage('shipping')} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors">
            <ArrowRight size={20} />
          </button>
          <h1 className="text-lg font-bold text-gray-800">{isEditing ? 'تعديل شركة الشحن' : 'إضافة شركة شحن جديدة'}</h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-1.5 bg-[#00c950] text-white text-sm font-semibold rounded-xl hover:bg-[#00b548] transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
          >
            <Save size={16} />
            <span>{isSaving ? 'جاري الحفظ...' : (isEditing ? 'حفظ التعديلات' : 'حفظ الشركة')}</span>
          </button>
        </div>
      </div>

      {/* Basic Info */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-4">
        <h2 className="text-sm font-bold text-gray-800 mb-3 pb-2 border-b">المعلومات الأساسية</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div className="sm:col-span-2 md:col-span-4">
            <FloatingInput label="اسم شركة الشحن" value={formName} onChange={e => { setFormName(e.target.value); setErrors(p => ({ ...p, name: '' })); }} required icon={<Building2 size={16} />} placeholder="اسم شركة الشحن" error={errors.name} />
          </div>
        </div>
      </div>

      {/* Special Status Pricing Card */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-4">
        <div className="flex items-center justify-between pb-2 border-b mb-4">
          <div className="flex items-center gap-2">
            <Tag className="text-[#00c950]" size={18} />
            <h2 className="text-sm font-bold text-gray-800">سياسة تسعير الحالات الخاصة (المرتجعات والاستبدال)</h2>
          </div>
          {/* iOS-style toggle switch */}
          <button
            type="button"
            onClick={() => setUseSpecialFees(!useSpecialFees)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none cursor-pointer ${
              useSpecialFees ? 'bg-[#00c950]' : 'bg-gray-200'
            }`}
            aria-label="تفعيل سياسة التسعير الخاصة"
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                useSpecialFees ? 'translate-x-1.5' : '-translate-x-4'
              }`}
              style={{ transform: useSpecialFees ? 'translateX(22px)' : 'translateX(3px)' }}
            />
          </button>
        </div>

        {useSpecialFees && (
          <div className="space-y-4 animate-fadeIn">
            <p className="text-xs text-gray-500 leading-5">
              حدد طريقة حساب تكلفة التوصيل التي تفرضها شركة الشحن في الحالات غير المكتملة (نسبة مئوية من سعر توصيل المحافظة الأصلي، أو سعر ثابت موحد).
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Failed Delivery */}
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 flex flex-col justify-between">
                <div className="mb-2">
                  <h4 className="text-xs font-bold text-gray-700">1. شحن المرتجع الفاشل / الملغي بعد الشحن</h4>
                  <p className="text-[10px] text-gray-400 mt-0.5">عند رفض العميل استلام الشحنة عند الباب</p>
                </div>
                <div className="flex gap-2 items-center mb-3">
                  <button
                    type="button"
                    onClick={() => setSpecialFees(p => ({ ...p, failedDelivery: { ...p.failedDelivery, type: 'percentage' } }))}
                    className={`flex-1 py-1 text-[10px] font-semibold border rounded-lg transition-all cursor-pointer ${
                      specialFees.failedDelivery.type === 'percentage'
                        ? 'bg-[#00c950] border-[#00c950] text-white'
                        : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    نسبة مئوية
                  </button>
                  <button
                    type="button"
                    onClick={() => setSpecialFees(p => ({ ...p, failedDelivery: { ...p.failedDelivery, type: 'flat' } }))}
                    className={`flex-1 py-1 text-[10px] font-semibold border rounded-lg transition-all cursor-pointer ${
                      specialFees.failedDelivery.type === 'flat'
                        ? 'bg-[#00c950] border-[#00c950] text-white'
                        : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    مبلغ ثابت
                  </button>
                </div>
                <FloatingInput
                  label={specialFees.failedDelivery.type === 'percentage' ? "النسبة من السعر الأصلي" : "مبلغ ثابت"}
                  value={String(specialFees.failedDelivery.value)}
                  onChange={e => {
                    const val = parseFloat(e.target.value) || 0;
                    setSpecialFees(p => ({ ...p, failedDelivery: { ...p.failedDelivery, value: val } }));
                  }}
                  type="number"
                  endAdornment={specialFees.failedDelivery.type === 'percentage' ? <span>%</span> : <span>ج.م</span>}
                />
              </div>

              {/* Exchange Delivery */}
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 flex flex-col justify-between">
                <div className="mb-2">
                  <h4 className="text-xs font-bold text-gray-700">2. شحن الاستبدال</h4>
                  <p className="text-[10px] text-gray-400 mt-0.5">تسليم منتج جديد واستلام منتج مرتجع في نفس الوقت</p>
                </div>
                <div className="flex gap-2 items-center mb-3">
                  <button
                    type="button"
                    onClick={() => setSpecialFees(p => ({ ...p, exchangeDelivery: { ...p.exchangeDelivery, type: 'percentage' } }))}
                    className={`flex-1 py-1 text-[10px] font-semibold border rounded-lg transition-all cursor-pointer ${
                      specialFees.exchangeDelivery.type === 'percentage'
                        ? 'bg-[#00c950] border-[#00c950] text-white'
                        : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    نسبة مئوية
                  </button>
                  <button
                    type="button"
                    onClick={() => setSpecialFees(p => ({ ...p, exchangeDelivery: { ...p.exchangeDelivery, type: 'flat' } }))}
                    className={`flex-1 py-1 text-[10px] font-semibold border rounded-lg transition-all cursor-pointer ${
                      specialFees.exchangeDelivery.type === 'flat'
                        ? 'bg-[#00c950] border-[#00c950] text-white'
                        : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    مبلغ ثابت
                  </button>
                </div>
                <FloatingInput
                  label={specialFees.exchangeDelivery.type === 'percentage' ? "النسبة من السعر الأصلي" : "مبلغ ثابت"}
                  value={String(specialFees.exchangeDelivery.value)}
                  onChange={e => {
                    const val = parseFloat(e.target.value) || 0;
                    setSpecialFees(p => ({ ...p, exchangeDelivery: { ...p.exchangeDelivery, value: val } }));
                  }}
                  type="number"
                  endAdornment={specialFees.exchangeDelivery.type === 'percentage' ? <span>%</span> : <span>ج.م</span>}
                />
              </div>

              {/* Return Collection */}
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 flex flex-col justify-between">
                <div className="mb-2">
                  <h4 className="text-xs font-bold text-gray-700">3. شحن استرجاع لاحق</h4>
                  <p className="text-[10px] text-gray-400 mt-0.5">استرجاع منتج من العميل بعد فترة من التوصيل الفعلي</p>
                </div>
                <div className="flex gap-2 items-center mb-3">
                  <button
                    type="button"
                    onClick={() => setSpecialFees(p => ({ ...p, returnCollection: { ...p.returnCollection, type: 'percentage' } }))}
                    className={`flex-1 py-1 text-[10px] font-semibold border rounded-lg transition-all cursor-pointer ${
                      specialFees.returnCollection.type === 'percentage'
                        ? 'bg-[#00c950] border-[#00c950] text-white'
                        : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    نسبة مئوية
                  </button>
                  <button
                    type="button"
                    onClick={() => setSpecialFees(p => ({ ...p, returnCollection: { ...p.returnCollection, type: 'flat' } }))}
                    className={`flex-1 py-1 text-[10px] font-semibold border rounded-lg transition-all cursor-pointer ${
                      specialFees.returnCollection.type === 'flat'
                        ? 'bg-[#00c950] border-[#00c950] text-white'
                        : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    مبلغ ثابت
                  </button>
                </div>
                <FloatingInput
                  label={specialFees.returnCollection.type === 'percentage' ? "النسبة من السعر الأصلي" : "مبلغ ثابت"}
                  value={String(specialFees.returnCollection.value)}
                  onChange={e => {
                    const val = parseFloat(e.target.value) || 0;
                    setSpecialFees(p => ({ ...p, returnCollection: { ...p.returnCollection, value: val } }));
                  }}
                  type="number"
                  endAdornment={specialFees.returnCollection.type === 'percentage' ? <span>%</span> : <span>ج.م</span>}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Governorates & Pricing */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="flex flex-col gap-2 mb-3 pb-2 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-bold text-gray-800">المحافظات المدعومة وأسعار الشحن</h2>
              <button onClick={() => { setFormGovs(EGYPT_GOVS.map(g => ({ name: g, originalPrice: 0, customerPrice: 0 }))); setBulkOriginal(''); setBulkCustomer(''); }} className="flex items-center gap-1 px-2.5 py-1 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors whitespace-nowrap cursor-pointer">
                <Plus size={12} /> إضافة كل المحافظات
              </button>
            </div>
              <button onClick={addGovRow} className="flex items-center gap-1 px-3 py-1.5 bg-[#00c950] text-white text-xs font-semibold rounded-xl hover:bg-[#00b548] transition-colors cursor-pointer">
                <Plus size={14} /> إضافة محافظة
              </button>
          </div>
          {errors.govs && <p className="text-xs text-red-500 mb-2">{errors.govs}</p>}
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-medium text-gray-500 whitespace-nowrap">تطبيق السعر على الكل:</span>
            <FloatingInput label="السعر الأصلي" value={bulkOriginal} onChange={e => setBulkOriginal(e.target.value)} type="number" icon={<DollarSign size={16} />} placeholder="السعر الأصلي" className="w-36" />
            <FloatingInput label="سعر العميل" value={bulkCustomer} onChange={e => setBulkCustomer(e.target.value)} type="number" icon={<DollarSign size={16} />} placeholder="سعر العميل" className="w-36" />
            <button
              onClick={() => {
                const orig = parseFloat(bulkOriginal);
                const cust = parseFloat(bulkCustomer);
                if (isNaN(orig) && isNaN(cust)) { notify('error', 'الرجاء إدخال سعر واحد على الأقل'); return; }
                setFormGovs(formGovs.map(g => ({
                  ...g,
                  originalPrice: !isNaN(orig) ? orig : g.originalPrice,
                  customerPrice: !isNaN(cust) ? cust : g.customerPrice,
                })));
                notify('success', 'تم تطبيق الأسعار على جميع المحافظات');
              }}
              disabled={formGovs.length === 0}
              className="flex items-center gap-1 px-3 py-1.5 bg-[#00c950] text-white text-xs font-semibold rounded-xl hover:bg-[#00b548] transition-colors disabled:opacity-40 cursor-pointer"
            >
              تطبيق
            </button>
          </div>
        </div>

        {formGovs.length === 0 && (
          <div className="py-6 text-center text-gray-400">
            <MapPin size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">لم يتم إضافة أي محافظة بعد. اضغط على "إضافة محافظة" للبدء.</p>
          </div>
        )}

        <div className="space-y-2">
          {formGovs.map((gov, i) => (
            <div key={i} className="flex flex-col sm:flex-row items-start sm:items-center gap-2 p-3 bg-gray-50 rounded-xl border border-gray-200">
              <FloatingInput label="المحافظة" value={gov.name} onChange={e => updateGov(i, 'name', e.target.value)} icon={<MapPin size={16} />} placeholder="اسم المحافظة" className="flex-1 w-full sm:w-auto" />
              <FloatingInput label="سعر الشحن الأصلي" value={gov.originalPrice || ''} onChange={e => updateGov(i, 'originalPrice', e.target.value)} type="number" icon={<DollarSign size={16} />} placeholder="السعر الأصلي" endAdornment={<span>ج.م</span>} className="w-full sm:w-40" />
              <FloatingInput label="سعر الشحن للعميل" value={gov.customerPrice || ''} onChange={e => updateGov(i, 'customerPrice', e.target.value)} type="number" icon={<DollarSign size={16} />} placeholder="سعر العميل" endAdornment={<span>ج.م</span>} className="w-full sm:w-40" />
              <button onClick={() => removeGovRow(i)} className="p-2 text-[#00c950] hover:bg-emerald-50 rounded-lg transition-colors shrink-0 mt-4 sm:mt-0 cursor-pointer">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
