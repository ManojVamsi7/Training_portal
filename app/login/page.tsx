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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-slate-100 p-6">
      <div className="bg-white rounded-2xl p-10 w-full max-w-md shadow-[0_24px_80px_rgba(0,0,0,0.1)] flex flex-col items-center gap-6 text-center">
        
        <div className="flex flex-col items-center gap-2">
          <ShieldCheck size={40} className="text-indigo-600" />
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Portal Login</h1>
          <p className="text-sm text-slate-500">Sign in to access your dashboard</p>
        </div>

        <form className="w-full flex flex-col gap-4" onSubmit={handleSubmit}>
          <div>
            <input
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
            />
          </div>
          <div>
            <input
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          
          {error && <p className="text-sm text-red-500 font-medium">{error}</p>}
          
          <button 
            type="submit" 
            className="w-full mt-2 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors flex justify-center items-center gap-2"
          >
            <User size={18} /> Sign In
          </button>
        </form>

      </div>
    </div>
  );
}
