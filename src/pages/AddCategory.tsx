import React, { useState } from 'react';
import { ArrowRight, Save, Tag } from 'lucide-react';
import { useApp } from '../context/AppContext';
import FloatingInput from '../components/FloatingInput';

interface AddCategoryProps {
  setActivePage: (page: any) => void;
}

export const AddCategory: React.FC<AddCategoryProps> = ({ setActivePage }) => {
  const { notify } = useApp();
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const handleSave = () => {
    setError('');
    const trimmed = name.trim();
    if (!trimmed) { setError('يرجى إدخال اسم الفئة'); return; }

    const catId = trimmed.toLowerCase().replace(/\s+/g, '-');
    const all: any[] = JSON.parse(localStorage.getItem('my_categories') || '[]');

    if (all.find(c => c.id === catId)) {
      setError('هذا المعرف موجود بالفعل');
      return;
    }

    all.push({
      id: catId,
      name: trimmed,
      createdAt: new Date().toLocaleDateString('ar-EG-u-nu-latn'),
    });
    localStorage.setItem('my_categories', JSON.stringify(all));
    notify('success', 'تم إضافة الفئة بنجاح');
    setActivePage('categories');
  };

  return (
    <div className="flex flex-col w-full pb-10">
      <div className="flex items-center justify-between gap-3 bg-white p-3 px-5 rounded-xl shadow-sm border border-gray-100 mb-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setActivePage('categories')} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors">
            <ArrowRight size={20} />
          </button>
          <h1 className="text-lg font-bold text-gray-800">إضافة فئة جديدة</h1>
        </div>
        <button onClick={handleSave} className="flex items-center gap-2 px-4 py-1.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-hover transition-colors shadow-sm">
          <Save size={16} />
          <span>حفظ الفئة</span>
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-sm font-bold text-gray-800 mb-3 pb-2 border-b">بيانات الفئة</h2>
        <div className="space-y-3">
          <div>
            <FloatingInput label="اسم الفئة" value={name} onChange={e => { setName(e.target.value); setError(''); }} required icon={<Tag size={16} />} placeholder="اسم الفئة"
              className={error ? 'border-red-300' : ''} />
            {error && <p className="text-xs text-red-500 mt-1 mr-1">{error}</p>}
          </div>
        </div>
      </div>
    </div>
  );
};
