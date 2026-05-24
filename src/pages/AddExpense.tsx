import React, { useState } from 'react';
import { ArrowRight, Save, ReceiptText, DollarSign, Calendar, StickyNote, Tag, CreditCard } from 'lucide-react';
import { useApp } from '../context/AppContext';
import FloatingInput from '../components/FloatingInput';
import FloatingTextarea from '../components/FloatingTextarea';
import FloatingSelect from '../components/FloatingSelect';

const EXPENSE_CATEGORIES = [
  'إيجار', 'رواتب', 'شحن وتوصيل', 'تسويق وإعلانات',
  'صيانة', 'مرافق (كهرباء/مياه/غاز)', 'فواتير واشتراكات',
  'مصروفات إدارية', 'متنوع',
];

const PAYMENT_METHODS = ['نقدي', 'تحويل بنكي', 'بطاقة ائتمان', 'شيك', 'آجل'];

const STORAGE_KEY = 'my_expenses';

interface AddExpenseProps {
  setActivePage: (page: any) => void;
  isEditing?: boolean;
}

interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  paymentMethod: string;
  notes: string;
  createdAt: string;
}

export const AddExpense: React.FC<AddExpenseProps> = ({ setActivePage, isEditing }) => {
  const { notify } = useApp();
  const editData = isEditing ? JSON.parse(localStorage.getItem('edit_expense') || 'null') : null;

  const [description, setDescription] = useState(editData?.description || '');
  const [category, setCategory] = useState(editData?.category || '');
  const [amount, setAmount] = useState(editData?.amount?.toString() || '');
  const [paymentMethod, setPaymentMethod] = useState(editData?.paymentMethod || 'نقدي');
  const [date, setDate] = useState(editData?.date || new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState(editData?.notes || '');
  const [errors, setErrors] = useState<{ description?: string; category?: string; amount?: string }>({});

  const handleSave = () => {
    const newErrors: typeof errors = {};
    if (!description.trim()) newErrors.description = 'يرجى إدخال وصف المصروف';
    if (!category) newErrors.category = 'يرجى اختيار التصنيف';
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) newErrors.amount = 'يرجى إدخال مبلغ صحيح';

    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }

    const expenses: Expense[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const now = new Date().toLocaleDateString('ar-EG-u-nu-latn');

    if (isEditing && editData) {
      const idx = expenses.findIndex((e: any) => e.id === editData.id);
      if (idx > -1) {
        expenses[idx] = {
          ...expenses[idx],
          description: description.trim(),
          category,
          amount: numAmount,
          paymentMethod,
          date,
          notes,
        };
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
      notify('success', 'تم تعديل المصروف');
    } else {
      const expense: Expense = {
        id: `EXP-${Date.now()}`,
        description: description.trim(),
        amount: numAmount,
        category,
        date,
        paymentMethod,
        notes,
        createdAt: now,
      };
      expenses.unshift(expense);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
      notify('success', 'تم إضافة المصروف');
    }

    setActivePage('expenses');
  };

  return (
    <div className="flex flex-col w-full pb-10">
      {/* Top Bar */}
      <div className="flex items-center justify-between gap-3 bg-white p-3 px-5 rounded-xl shadow-sm border border-gray-100 mb-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setActivePage('expenses')} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors">
            <ArrowRight size={20} />
          </button>
          <h1 className="text-lg font-bold text-gray-800">{isEditing ? 'تعديل المصروف' : 'إضافة مصروف جديد'}</h1>
        </div>
        <button onClick={handleSave}
          className="flex items-center gap-2 px-4 py-1.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-hover transition-colors shadow-sm">
          <Save size={16} />
          <span>{isEditing ? 'حفظ التعديلات' : 'حفظ المصروف'}</span>
        </button>
      </div>

      {/* Form */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-sm font-bold text-gray-800 mb-3 pb-2 border-b">بيانات المصروف</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          <div className="sm:col-span-2 md:col-span-3">
            <FloatingInput label="وصف المصروف" value={description} onChange={e => { setDescription(e.target.value); setErrors(p => ({ ...p, description: '' })); }} required icon={<ReceiptText size={16} />} placeholder="مثال: إيجار المخزن - يوليو" className={errors.description ? 'border-red-300' : ''} />
            {errors.description && <p className="text-xs text-red-500 mt-1 mr-1">{errors.description}</p>}
          </div>

          <div>
            <FloatingSelect label="التصنيف" value={category} onChange={e => { setCategory(e.target.value); setErrors(p => ({ ...p, category: '' })); }} required icon={<Tag size={16} />}>
              <option value="">اختر التصنيف</option>
              {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </FloatingSelect>
            {errors.category && <p className="text-xs text-red-500 mt-1 mr-1">{errors.category}</p>}
          </div>

          <div>
            <FloatingInput label="المبلغ" value={amount} onChange={e => { setAmount(e.target.value); setErrors(p => ({ ...p, amount: '' })); }} required type="number" icon={<DollarSign size={16} />} endAdornment={<span>ج.م</span>} placeholder="0.00" className={errors.amount ? 'border-red-300' : ''} />
            {errors.amount && <p className="text-xs text-red-500 mt-1 mr-1">{errors.amount}</p>}
          </div>

          <FloatingSelect label="طريقة الدفع" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} icon={<CreditCard size={16} />}>
            {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
          </FloatingSelect>

          <FloatingInput label="تاريخ المصروف" value={date} onChange={e => setDate(e.target.value)} type="date" icon={<Calendar size={16} />} />

          <FloatingTextarea label="ملاحظات" value={notes} onChange={e => setNotes(e.target.value)} icon={<StickyNote size={16} />} placeholder="أي ملاحظات إضافية..." rows={2} className="sm:col-span-2 md:col-span-3" />
        </div>
      </div>
    </div>
  );
};
