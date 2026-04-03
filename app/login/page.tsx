'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, User } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const { login, currentUser, loading } = useAuth();
  const router = useRouter();

  // If already logged in, redirect
  useEffect(() => {
    if (!loading && currentUser) {
      if (currentUser.role === 'admin') router.push('/admin');
      else router.push('/');
    }
  }, [currentUser, loading, router]);

  if (loading || currentUser) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center">Loading...</div>;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please enter both username and password.');
      return;
    }

    const user = login(username, password);
    if (!user) {
      setError('Invalid username or password.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col p-6 bg-gradient-to-b from-[#ffffff] via-[#fff5f0] to-[#ffdcd0]">

      <div className="flex-1 flex flex-col justify-center items-center w-full mt-[-80px]">

        <div className="w-full max-w-[400px] flex flex-col">

          {/* Header Section */}
          <div className="flex flex-col items-center justify-center text-center gap-2 mb-16">
            <ShieldCheck size={48} strokeWidth={2.5} className="text-[#4f46e5] mb-1" />
            <h1 className="text-[32px] font-extrabold text-[#0f172a] tracking-tight">
              Training Portal
            </h1>
            <p className="text-[15px] font-medium text-slate-500">
              Sign in to access your dashboard
            </p>
          </div>

          <form className="w-full flex flex-col gap-5" onSubmit={handleSubmit}>

            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-slate-800">Email or username</label>
              <input
                className="w-full px-4 py-3.5 bg-white border-2 border-transparent rounded-lg focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none transition-all text-[15px] text-slate-900 shadow-sm"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-slate-800">Password</label>
              <input
                className="w-full px-4 py-3.5 bg-white border-2 border-transparent rounded-lg focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none transition-all text-[15px] text-slate-900 shadow-sm"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && <p className="text-[14px] text-red-600 font-medium bg-red-50 p-2 rounded-md">{error}</p>}

            <button
              type="submit"
              className="w-full mt-2 py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold text-[15px] transition-colors shadow-md"
            >
              SIGN IN
            </button>

          </form>

        </div>
      </div>
    </div>
  );
}
