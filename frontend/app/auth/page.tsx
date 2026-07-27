'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AuthPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!isLogin && password !== confirmPassword) {
      setError('رمزهای عبور مطابقت ندارند');
      setLoading(false);
      return;
    }

    const endpoint = isLogin ? 'http://localhost:8000/api/token/' : 'http://localhost:8000/api/register/';
    
    
    const body = isLogin
      ? { username, password }
      : { username, password, email, password2: password };  // <-- THIS IS THE CHANGE

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        credentials: 'include',
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || data.error || 'خطا در احراز هویت');
      }

      if (isLogin) {
        router.push('/projects');
      } else {
         router.push('/projects');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div dir="rtl" className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Animated background blobs */}
      <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-pulse"></div>
      <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-pulse animation-delay-2000"></div>
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-indigo-300 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-pulse animation-delay-4000"></div>
      
      <div className="relative w-full max-w-md p-8 mx-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 transition-all duration-300 hover:shadow-3xl">
        <div className="flex justify-center space-x-2 bg-gray-100 dark:bg-gray-700/50 p-1 rounded-xl w-fit mx-auto">
          <button
            type="button"
            onClick={() => setIsLogin(true)}
            className={`px-6 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
              isLogin
                ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-md'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            ورود
          </button>
          <button
            type="button"
            onClick={() => setIsLogin(false)}
            className={`px-6 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
              !isLogin
                ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-md'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            ثبت‌نام
          </button>
        </div>

        <h2 className="mt-6 text-3xl font-bold text-center bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
          {isLogin ? 'خوش آمدید' : 'ایجاد حساب کاربری'}
        </h2>
        <p className="mt-2 text-sm text-center text-gray-500 dark:text-gray-400">
          {isLogin ? 'برای دسترسی به وظایف خود وارد شوید' : 'مدیریت پروژه‌های خود را به صورت رایگان شروع کنید'}
        </p>

        {error && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm text-center animate-shake">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block">نام کاربری</label>
            <input
              type="text"
              placeholder="johndoe"
              className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          {!isLogin && (
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block">ایمیل (اختیاری)</label>
              <input
                type="email"
                placeholder="john@example.com"
                className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          )}

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block">رمز عبور</label>
            <input
              type="password"
              placeholder="••••••••"
              className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {!isLogin && (
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block">تکرار رمز عبور</label>
              <input
                type="password"
                placeholder="••••••••"
                className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 mt-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>{isLogin ? 'در حال ورود...' : 'در حال ساخت حساب...'}</span>
              </div>
            ) : (
              <span>{isLogin ? 'ورود' : 'ثبت‌نام'}</span>
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
          {isLogin ? 'حساب کاربری ندارید؟ ' : 'قبلاً ثبت‌نام کرده‌اید؟ '}
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
            }}
            className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline transition-all"
          >
            {isLogin ? 'ثبت‌نام' : 'ورود'}
          </button>
        </p>
      </div>
    </div>
  );
}