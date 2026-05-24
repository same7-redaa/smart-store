/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';


const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('تحذير: متغيرات البيئة الخاصة بـ Supabase غير مكتملة. يرجى التحقق من ملف .env الخاص بك.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
