import React, { useState, useEffect } from 'react';
import { Sliders, Plus, Trash2, Edit, Save, X, Tag } from 'lucide-react';
import { useApp } from '../context/AppContext';
import FloatingInput from '../components/FloatingInput';
import { motion, AnimatePresence } from 'motion/react';

interface GlobalAttribute {
  id: string;
  name: string;
  values: string[];
}

export const Attributes: React.FC<{ setActivePage?: (p: any) => void }> = () => {
  const { notify, confirm } = useApp();
  const [attributes, setAttributes] = useState<GlobalAttribute[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showStats, setShowStats] = useState(false);
  
  // Temp states for editing/creating
  const [tempName, setTempName] = useState('');
  const [tempValueInput, setTempValueInput] = useState('');
  const [tempValues, setTempValues] = useState<string[]>([]);
  
  useEffect(() => {
    const data = localStorage.getItem('my_attributes');
    if (data) {
      try {
        setAttributes(JSON.parse(data));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const saveToStorage = (newAttrs: GlobalAttribute[]) => {
    setAttributes(newAttrs);
    localStorage.setItem('my_attributes', JSON.stringify(newAttrs));
  };

  const handleAddNew = () => {
    setEditingId('new');
    setTempName('');
    setTempValues([]);
    setTempValueInput('');
  };

  const handleEdit = (attr: GlobalAttribute) => {
    setEditingId(attr.id);
    setTempName(attr.name);
    setTempValues([...attr.values]);
    setTempValueInput('');
  };

  const handleCancel = () => {
    setEditingId(null);
  };

  const handleSave = () => {
    if (!tempName.trim()) {
      notify('error', 'الرجاء إدخال اسم المتغير');
      return;
    }
    if (tempValues.length === 0) {
      notify('error', 'الرجاء إدخال قيمة واحدة على الأقل');
      return;
    }

    if (editingId === 'new') {
      const newAttr = {
        id: `ATTR-${Date.now()}`,
        name: tempName.trim(),
        values: tempValues,
      };
      saveToStorage([...attributes, newAttr]);
      notify('success', 'تمت إضافة المتغير بنجاح');
    } else {
      const updated = attributes.map(a => 
        a.id === editingId 
          ? { ...a, name: tempName.trim(), values: tempValues }
          : a
      );
      saveToStorage(updated);
      notify('success', 'تم تحديث المتغير بنجاح');
    }
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    confirm({
      title: 'حذف المتغير',
      message: 'هل أنت متأكد من حذف هذا المتغير من النظام؟ لن تتأثر المنتجات الحالية التي تستخدمه.',
      onConfirm: () => {
        saveToStorage(attributes.filter(a => a.id !== id));
        notify('success', 'تم الحذف بنجاح');
      }
    });
  };

  const addTempValue = (val: string) => {
    const trimmed = val.trim().replace(',', '');
    if (!trimmed) return;
    if (!tempValues.includes(trimmed)) {
      setTempValues([...tempValues, trimmed]);
    }
    setTempValueInput('');
  };

  const removeTempValue = (val: string) => {
    setTempValues(tempValues.filter(v => v !== val));
  };

  return (
    <div className="flex flex-col h-full pb-10">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-3 shrink-0 bg-white p-3 rounded-xl shadow-sm border border-gray-100 mb-4">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button 
            onClick={() => setShowStats(!showStats)}
            className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm font-medium transition-colors ${
              showStats 
                ? 'bg-primary-light border-primary-light text-primary' 
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Sliders size={16} />
            <span>الإحصائيات</span>
          </button>
        </div>
        <button 
          onClick={handleAddNew}
          disabled={editingId !== null}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white font-medium rounded-lg hover:bg-primary-hover transition-colors shadow-sm disabled:opacity-50 w-full sm:w-auto"
        >
          <Plus size={20} />
          <span>إضافة متغير جديد</span>
        </button>
      </div>

      {/* Stats */}
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                  <p className="text-gray-500 font-medium">إجمالي المتغيرات</p>
                  <h3 className="text-2xl font-bold text-gray-800">{attributes.length}</h3>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                  <p className="text-gray-500 font-medium">إجمالي القيم المسجلة</p>
                  <h3 className="text-2xl font-bold text-primary">
                    {attributes.reduce((sum, a) => sum + a.values.length, 0)}
                  </h3>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                  <p className="text-gray-500 font-medium">متوسط القيم للمتغير</p>
                  <h3 className="text-2xl font-bold text-gray-800">
                    {attributes.length ? Math.round(attributes.reduce((sum, a) => sum + a.values.length, 0) / attributes.length) : 0}
                  </h3>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {editingId && (
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-primary/20 mb-4 animate-fadeIn">
          <h3 className="text-sm font-bold text-gray-800 mb-4 pb-2 border-b">
            {editingId === 'new' ? 'إضافة متغير جديد' : 'تعديل المتغير'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <FloatingInput 
                label="اسم المتغير (مثل: اللون، المقاس)" 
                value={tempName} 
                onChange={e => setTempName(e.target.value)} 
                icon={<Tag size={16} />} 
              />
            </div>
            <div>
              <FloatingInput 
                label="القيم (اضغط Enter للإضافة)" 
                value={tempValueInput} 
                onChange={e => setTempValueInput(e.target.value)} 
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    addTempValue(tempValueInput);
                  }
                }}
                onBlur={() => addTempValue(tempValueInput)}
              />
            </div>
            
            <div className="md:col-span-2">
              {tempValues.length > 0 ? (
                <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-xl border border-gray-100">
                  {tempValues.map(v => (
                    <span key={v} className="flex items-center gap-1.5 bg-white border border-gray-200 text-gray-800 pl-2 pr-3 py-1.5 rounded-lg text-sm shadow-sm font-medium">
                      <span>{v}</span>
                      <button onClick={() => removeTempValue(v)} className="text-gray-400 hover:text-red-500 transition-colors">
                        <X size={14} />
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-gray-400 p-3 bg-gray-50 rounded-xl text-center border border-dashed border-gray-200">
                  لا توجد قيم مضافة بعد
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 mt-5 pt-4 border-t border-gray-50">
            <button onClick={handleCancel} className="px-4 py-2 bg-gray-100 text-gray-600 font-medium rounded-lg hover:bg-gray-200 transition-colors">
              إلغاء
            </button>
            <button onClick={handleSave} className="flex items-center gap-2 px-6 py-2 bg-primary text-white font-medium rounded-lg hover:bg-primary-hover transition-colors shadow-sm">
              <Save size={18} />
              <span>حفظ المتغير</span>
            </button>
          </div>
        </div>
      )}

      {/* Attributes List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {attributes.length > 0 ? (
          attributes.map(attr => (
            <div key={attr.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col hover:border-primary/30 transition-colors">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-50">
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                  <Sliders size={16} className="text-primary" />
                  {attr.name}
                </h3>
                <div className="flex items-center gap-1">
                  <button onClick={() => handleEdit(attr)} className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary-light rounded-lg transition-colors">
                    <Edit size={16} />
                  </button>
                  <button onClick={() => handleDelete(attr.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {attr.values.map(v => (
                  <span key={v} className="bg-gray-50 border border-gray-200 text-gray-600 px-2.5 py-1 rounded-md text-xs font-medium">
                    {v}
                  </span>
                ))}
              </div>
              <div className="mt-auto pt-4 text-xs text-gray-400">
                {attr.values.length} قيم مسجلة
              </div>
            </div>
          ))
        ) : (
          !editingId && (
            <div className="col-span-full bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center py-20">
              <div className="w-16 h-16 rounded-2xl bg-primary/5 flex items-center justify-center mb-4">
                <Sliders size={32} className="text-primary opacity-60" />
              </div>
              <h2 className="text-lg font-bold text-gray-700 mb-2">لا توجد متغيرات مسجلة</h2>
              <p className="text-sm text-gray-400 text-center max-w-sm">
                قم بإضافة متغيرات مثل المقاسات والألوان هنا، لتتمكن من اختيارها بسرعة عند إضافة منتجات جديدة.
              </p>
            </div>
          )
        )}
      </div>
    </div>
  );
};

