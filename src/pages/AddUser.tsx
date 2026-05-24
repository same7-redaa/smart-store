import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ArrowRight, User, Lock, Shield, CheckSquare, Square, AlertTriangle, Save, Users, Eye, EyeOff } from 'lucide-react';
import FloatingInput from '../components/FloatingInput';
import { ALL_PAGES, getUsers, saveUsers } from './Users';
import type { SystemUser } from './Users';

interface AddUserProps {
  setActivePage: (p: any) => void;
  editUserId?: string;
}

export const AddUser: React.FC<AddUserProps> = ({ setActivePage, editUserId }) => {
  const allUsers = getUsers();
  const existing = editUserId ? allUsers.find(u => u.id === editUserId) : null;

  const [form, setForm] = useState({
    name: existing?.name || '',
    username: existing?.username || '',
    password: '',
    role: existing?.role || '',
    permissions: existing?.permissions || ALL_PAGES.map(p => p.id),
    active: existing?.active ?? true,
  });
  const [errors, setErrors] = useState<{ name?: string; username?: string; password?: string; permissions?: string }>({});
  const [showPassword, setShowPassword] = useState(false);
  const passwordTimer = useRef<ReturnType<typeof setTimeout>>();

  const isAdmin = existing?.id === 'admin-1';

  function handlePasswordChange(value: string) {
    setForm(prev => ({ ...prev, password: value }));
    setErrors(p => ({ ...p, password: '' }));
    setShowPassword(true);
    if (passwordTimer.current) clearTimeout(passwordTimer.current);
    passwordTimer.current = setTimeout(() => setShowPassword(false), 500);
  }

  function togglePermission(pageId: string) {
    setForm(prev => ({
      ...prev,
      permissions: prev.permissions.includes(pageId)
        ? prev.permissions.filter(p => p !== pageId)
        : [...prev.permissions, pageId],
    }));
    setErrors(p => ({ ...p, permissions: '' }));
  }

  function handleSave() {
    const newErrors: typeof errors = {};
    if (!form.name) newErrors.name = 'يرجى إدخال الاسم';
    if (!form.username) newErrors.username = 'يرجى إدخال اسم المستخدم';
    if (!editUserId && !form.password) newErrors.password = 'يرجى إدخال كلمة المرور';
    if (form.permissions.length === 0) newErrors.permissions = 'يجب تحديد صلاحية صفحة واحدة على الأقل';

    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }

    let updated: SystemUser[];
    if (editUserId) {
      updated = allUsers.map(u => u.id === editUserId
        ? { ...u, name: form.name, username: form.username, role: form.role, permissions: form.permissions, active: form.active, password: form.password || u.password }
        : u
      );
    } else {
      if (allUsers.find(u => u.username === form.username)) { setErrors({ username: 'اسم المستخدم موجود بالفعل' }); return; }
      updated = [...allUsers, { id: `user-${Date.now()}`, name: form.name, username: form.username, password: form.password, role: form.role, permissions: form.permissions, active: form.active, createdAt: new Date().toISOString() }];
    }

    saveUsers(updated);

    const sessionRaw = localStorage.getItem('my_session');
    if (sessionRaw) {
      const session = JSON.parse(sessionRaw);
      if (session.username === form.username) {
        session.name = form.name;
        localStorage.setItem('my_session', JSON.stringify(session));
      }
    }

    setActivePage('system');
  }

  useEffect(() => {
    return () => { if (passwordTimer.current) clearTimeout(passwordTimer.current); };
  }, []);

  return (
    <div className="flex flex-col w-full pb-10">
      {/* Top Bar */}
      <div className="flex items-center justify-between gap-3 bg-white p-3 px-5 rounded-xl shadow-sm border border-gray-100 mb-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setActivePage('system')} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors">
            <ArrowRight size={20} />
          </button>
          <h1 className="text-lg font-bold text-gray-800">{editUserId ? 'تعديل مستخدم' : 'مستخدم جديد'}</h1>
        </div>
        <button onClick={handleSave}
          className="flex items-center gap-2 px-5 py-1.5 bg-[#00c950] text-white text-sm font-medium rounded-lg hover:bg-[#00b548] transition-colors shadow-sm">
          <Save size={16} />
          <span>{editUserId ? 'حفظ' : 'إضافة'}</span>
        </button>
      </div>

      <div className="space-y-5">
        {/* Basic Info */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
            <User size={16} className="text-[#00c950]" /> المعلومات الأساسية
          </h3>
          <div className="space-y-4">
            <div>
              <FloatingInput label="الاسم" value={form.name} onChange={e => { setForm(p => ({ ...p, name: e.target.value })); setErrors(p => ({ ...p, name: '' })); }} icon={<User size={16} />} />
              {errors.name && <p className="text-xs text-red-500 mt-1 mr-1">{errors.name}</p>}
            </div>
            <div>
              <FloatingInput label="اسم المستخدم" value={form.username} onChange={e => { setForm(p => ({ ...p, username: e.target.value })); setErrors(p => ({ ...p, username: '' })); }} icon={<Users size={16} />} />
              {errors.username && <p className="text-xs text-red-500 mt-1 mr-1">{errors.username}</p>}
            </div>
            {/* Password */}
            <div>
              <div className="relative">
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10">
                  <Lock size={16} />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => handlePasswordChange(e.target.value)}
                  placeholder={editUserId ? 'كلمة المرور (اترك فارغاً بدون تغيير)' : 'كلمة المرور'}
                  className={`w-full pr-10 pl-10 py-2.5 bg-slate-50 border rounded-xl text-sm outline-none focus:bg-white transition-all text-slate-700 ${errors.password ? 'border-red-300 focus:border-red-400' : 'border-slate-200 focus:border-[#00c950]'}`}
                />
                <button type="button" onClick={() => setShowPassword(prev => !prev)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-500 mt-1 mr-1">{errors.password}</p>}
            </div>
            <FloatingInput label="المسمى الوظيفي" value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))} icon={<Shield size={16} />} placeholder="مثال: مدير مبيعات" />
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.active} onChange={e => setForm(p => ({ ...p, active: e.target.checked }))}
                className="w-4 h-4 rounded border-slate-300 text-[#00c950] focus:ring-[#00c950]" disabled={isAdmin} />
              <span className="text-xs text-slate-600">حساب نشط</span>
            </label>
          </div>
        </div>

        {/* Permissions */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Shield size={16} className="text-[#00c950]" /> صلاحيات الصفحات
            <span className="text-[10px] text-slate-400 font-normal mr-2">({form.permissions.length} من {ALL_PAGES.length})</span>
          </h3>
          <div className="flex items-center gap-2 mb-4">
            <button type="button" onClick={() => { setForm(p => ({ ...p, permissions: ALL_PAGES.map(x => x.id) })); setErrors(p => ({ ...p, permissions: '' })); }}
              className="px-3 py-1.5 bg-[#00c950]/10 text-[#00c950] text-[11px] font-semibold rounded-lg hover:bg-[#00c950]/20 transition-colors">تحديد الكل</button>
            <button type="button" onClick={() => setForm(p => ({ ...p, permissions: [] }))}
              className="px-3 py-1.5 bg-slate-100 text-slate-500 text-[11px] font-semibold rounded-lg hover:bg-slate-200 transition-colors">إلغاء الكل</button>
          </div>
          {errors.permissions && <p className="text-xs text-red-500 mb-2 mr-1">{errors.permissions}</p>}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {ALL_PAGES.map(page => (
              <label key={page.id}
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  form.permissions.includes(page.id)
                    ? 'border-[#00c950]/30 bg-[#00c950]/5'
                    : 'border-slate-100 bg-slate-50/50 hover:bg-slate-50'
                }`}>
                <button type="button" onClick={() => togglePermission(page.id)} className="shrink-0">
                  {form.permissions.includes(page.id)
                    ? <CheckSquare size={18} className="text-[#00c950]" />
                    : <Square size={18} className="text-slate-300" />
                  }
                </button>
                <span className={`text-sm font-medium ${form.permissions.includes(page.id) ? 'text-slate-800' : 'text-slate-400'}`}>{page.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
