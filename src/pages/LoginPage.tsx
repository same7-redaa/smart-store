import React, { useState } from 'react';
import { Store, User, Lock, Eye, EyeOff, LogIn, Loader2 } from 'lucide-react';
import { supabase } from '../utils/supabase';
import { getUsers } from './Users';

interface LoginPageProps {
  onLogin: (user: { name: string; username: string; role: string }) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ username?: string; password?: string }>({});

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    if (!username && !password) {
      setErrors({ username: 'يرجى إدخال اسم المستخدم', password: 'يرجى إدخال كلمة المرور' });
      return;
    }
    if (!username) {
      setErrors({ username: 'يرجى إدخال اسم المستخدم' });
      return;
    }
    if (!password) {
      setErrors({ password: 'يرجى إدخال كلمة المرور' });
      return;
    }

    setLoading(true);

    // 1. Try Authenticating via Supabase first
    try {
      const { data: dbUsers, error } = await supabase
        .from('system_users')
        .select('*')
        .eq('username', username.trim());

      if (error) throw error;

      if (dbUsers && dbUsers.length > 0) {
        const dbUser = dbUsers[0];
        if (dbUser.password !== password) {
          setErrors({ password: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
          setLoading(false);
          return;
        }

        // Successfully logged in via Supabase!
        const session = { 
          name: dbUser.name, 
          username: dbUser.username, 
          role: dbUser.role, 
          loginTime: new Date().toISOString() 
        };
        localStorage.setItem('my_session', JSON.stringify(session));

        // Sync local users cache
        const raw = localStorage.getItem('my_system_users');
        const localUsers = raw ? JSON.parse(raw) : [];
        const mappedUser = {
          id: dbUser.id,
          name: dbUser.name,
          username: dbUser.username,
          password: dbUser.password,
          role: dbUser.role,
          permissions: dbUser.permissions || [],
          active: true,
          createdAt: dbUser.created_at || new Date().toISOString(),
          lastLogin: new Date().toISOString()
        };

        const updatedUsers = localUsers.some((u: any) => u.username === username)
          ? localUsers.map((u: any) => u.username === username ? mappedUser : u)
          : [...localUsers, mappedUser];

        localStorage.setItem('my_system_users', JSON.stringify(updatedUsers));

        // Attempt to update last login in Supabase async
        supabase.from('system_users')
          .update({ last_login: new Date().toISOString() })
          .eq('id', dbUser.id)
          .then(() => {});

        setLoading(false);
        onLogin(session);
        return;
      }
    } catch (err) {
      console.warn('تم تعذر الاتصال بـ Supabase، جاري استخدام البيانات المحلية كبديل:', err);
    }

    // 2. Fallback to LocalStorage (for offline mode or first-time admin setup)
    const users = getUsers();

    const user = users.find((u: any) => u.username === username && u.password === password);

    if (!user) {
      setErrors({ password: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
      setLoading(false);
      return;
    }

    if (!user.active) {
      setErrors({ password: 'هذا الحساب غير نشط. تواصل مع مدير النظام' });
      setLoading(false);
      return;
    }

    const session = { name: user.name, username: user.username, role: user.role, loginTime: new Date().toISOString() };
    localStorage.setItem('my_session', JSON.stringify(session));

    user.lastLogin = new Date().toISOString();
    const updatedUsers = users.map((u: any) => u.username === username ? user : u);
    localStorage.setItem('my_system_users', JSON.stringify(updatedUsers));

    setLoading(false);
    onLogin(session);
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 dir-rtl" style={{ fontFamily: 'WellWay, sans-serif' }}>
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-[#00c950] to-emerald-500 rounded-2xl shadow-lg mb-4">
            <Store size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">سمارت ستور</h1>
          <p className="text-sm text-slate-400 mt-1">لوحة تحكم وإدارة المتاجر الإلكترونية</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <h2 className="text-base font-bold text-slate-800 mb-5 text-center">تسجيل الدخول</h2>

          <div className="space-y-4">
            <div>
              <div className="relative">
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <User size={16} />
                </span>
                <input
                  type="text" value={username} onChange={e => { setUsername(e.target.value); setErrors(p => ({ ...p, username: '' })); }}
                  placeholder="اسم المستخدم"
                  className={`w-full pr-10 pl-3 py-2.5 bg-slate-50 border rounded-xl text-sm outline-none focus:bg-white transition-all text-slate-700 ${errors.username ? 'border-red-300 focus:border-red-400' : 'border-slate-200 focus:border-[#00c950]'}`}
                  autoFocus
                />
              </div>
              {errors.username && <p className="text-xs text-red-500 mt-1 mr-1">{errors.username}</p>}
            </div>

            <div>
              <div className="relative">
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <Lock size={16} />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'} value={password} onChange={e => { setPassword(e.target.value); setErrors(p => ({ ...p, password: '' })); }}
                  placeholder="كلمة المرور"
                  className={`w-full pr-10 pl-10 py-2.5 bg-slate-50 border rounded-xl text-sm outline-none focus:bg-white transition-all text-slate-700 ${errors.password ? 'border-red-300 focus:border-red-400' : 'border-slate-200 focus:border-[#00c950]'}`}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-500 mt-1 mr-1">{errors.password}</p>}
            </div>
          </div>

          <button type="submit" disabled={loading}
            className="w-full mt-5 py-2.5 bg-[#00c950] text-white text-sm font-semibold rounded-xl hover:bg-[#00b548] transition-colors flex items-center justify-center gap-2 disabled:opacity-75 disabled:cursor-not-allowed">
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <LogIn size={16} />
            )}
            {loading ? 'جاري التحقق...' : 'دخول'}
          </button>
        </form>
      </div>
    </div>
  );
};
