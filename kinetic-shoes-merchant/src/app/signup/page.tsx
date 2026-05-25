// src/app/signup/page.tsx
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { ArrowRight, Lock, Mail, AlertCircle, ShoppingBag } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function SignupPage() {
  const { signup } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      // Perform signup using auth context
      await signup(email, password);
      // Signup success leads to /dashboard/create-store (or dashboard layout checks)
      router.push('/dashboard/create-store');
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to create merchant account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F5F7FA] px-4 py-12 sm:px-6 lg:px-8 font-sans">
      <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-2xl border border-[#EEEEEE] shadow-sm">
        
        {/* Brand/Logo Header */}
        <div className="flex flex-col items-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#F0FBF3] text-[#13B734] mb-4">
            <ShoppingBag className="h-6 w-6" />
          </div>
          <h2 className="text-3xl font-extrabold text-[#111111] tracking-tight">
            Create Partner Account
          </h2>
          <p className="mt-2 text-sm text-[#9BA5B4]">
            Start selling on Doorstep
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-red-50 p-4 text-sm text-red-600 border border-red-100">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-[#111111] uppercase tracking-wider mb-1">
                Email Address
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[#9BA5B4]">
                  <Mail className="h-5 w-5" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full rounded-xl border border-[#EEEEEE] bg-[#F0F3F9] py-3 pl-10 pr-4 text-[#111111] placeholder-[#9BA5B4] focus:border-[#13B734] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#13B734] sm:text-sm transition-all"
                  placeholder="name@company.com"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-[#111111] uppercase tracking-wider mb-1">
                Password
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[#9BA5B4]">
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-xl border border-[#EEEEEE] bg-[#F0F3F9] py-3 pl-10 pr-4 text-[#111111] placeholder-[#9BA5B4] focus:border-[#13B734] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#13B734] sm:text-sm transition-all"
                  placeholder="Minimum 6 characters"
                />
              </div>
            </div>

            {/* Confirm Password Field */}
            <div>
              <label htmlFor="confirmPassword" className="block text-xs font-semibold text-[#111111] uppercase tracking-wider mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[#9BA5B4]">
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="block w-full rounded-xl border border-[#EEEEEE] bg-[#F0F3F9] py-3 pl-10 pr-4 text-[#111111] placeholder-[#9BA5B4] focus:border-[#13B734] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#13B734] sm:text-sm transition-all"
                  placeholder="Confirm your password"
                />
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative flex w-full justify-center rounded-xl bg-[#13B734] px-4 py-3 text-sm font-semibold text-white hover:bg-[#109E2B] focus:outline-none focus:ring-2 focus:ring-[#13B734] focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Creating account...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Create Merchant Account
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </span>
              )}
            </button>
          </div>
        </form>

        <div className="text-center mt-6">
          <p className="text-sm text-[#9BA5B4]">
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-[#13B734] hover:text-[#109E2B] transition-colors">
              Sign In
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}
