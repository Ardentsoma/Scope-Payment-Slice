import React, { useState } from 'react';
import { X, Lock, Mail, User, CheckCircle2, AlertCircle } from 'lucide-react';
import { loginSchema, registerSchema, LoginFormData, RegisterFormData } from '../types';
import { AuthStore } from '../lib/auth-store';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [loginData, setLoginData] = useState<LoginFormData>({
    email: 'nmesomanancy2020@gmail.com',
    password: 'Password123!',
  });
  const [registerData, setRegisterData] = useState<RegisterFormData>({
    name: 'Nancy Mesoma',
    email: 'nmesomanancy2020@gmail.com',
    password: 'Password123!',
    confirmPassword: 'Password123!',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState(false);

  if (!isOpen) return null;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    const parsed = loginSchema.safeParse(loginData);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      parsed.error.issues.forEach((i) => {
        fieldErrors[i.path[0] as string] = i.message;
      });
      setErrors(fieldErrors);
      return;
    }

    const res = AuthStore.login(loginData.email, loginData.password);
    if (!res.success) {
      setAuthError(res.error || 'Login failed');
      return;
    }

    setAuthSuccess(true);
    setTimeout(() => {
      setAuthSuccess(false);
      onClose();
    }, 600);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    const parsed = registerSchema.safeParse(registerData);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      parsed.error.issues.forEach((i) => {
        fieldErrors[i.path[0] as string] = i.message;
      });
      setErrors(fieldErrors);
      return;
    }

    const res = AuthStore.register(registerData.name, registerData.email, registerData.password);
    if (!res.success) {
      setAuthError(res.error || 'Registration failed');
      return;
    }

    setAuthSuccess(true);
    setTimeout(() => {
      setAuthSuccess(false);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-neutral-200 overflow-hidden my-8">
        {/* Header */}
        <div className="bg-[#FAF7F2] border-b border-[#eee8df] p-6 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-[#D9241B] tracking-wider uppercase">
              bcryptjs Authenticator
            </span>
            <h2 className="text-xl font-black text-[#09090b]">
              {isRegisterMode ? 'Create Scope Account' : 'Sign in to Scope'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {authError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          {authSuccess && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Authenticated with bcrypt hash verification!</span>
            </div>
          )}

          {isRegisterMode ? (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">Full Name</label>
                <div className="relative">
                  <input
                    type="text"
                    value={registerData.name}
                    onChange={(e) => setRegisterData({ ...registerData, name: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-neutral-300 text-xs"
                  />
                  <User className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
                </div>
                {errors.name && <p className="text-[11px] text-red-600 mt-1">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">Email</label>
                <div className="relative">
                  <input
                    type="email"
                    value={registerData.email}
                    onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-neutral-300 text-xs"
                  />
                  <Mail className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
                </div>
                {errors.email && <p className="text-[11px] text-red-600 mt-1">{errors.email}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">Password</label>
                <div className="relative">
                  <input
                    type="password"
                    value={registerData.password}
                    onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-neutral-300 text-xs"
                  />
                  <Lock className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
                </div>
                {errors.password && <p className="text-[11px] text-red-600 mt-1">{errors.password}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">Confirm Password</label>
                <div className="relative">
                  <input
                    type="password"
                    value={registerData.confirmPassword}
                    onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-neutral-300 text-xs"
                  />
                  <Lock className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
                </div>
                {errors.confirmPassword && <p className="text-[11px] text-red-600 mt-1">{errors.confirmPassword}</p>}
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-[#D9241B] hover:bg-[#B91C1C] text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
              >
                Register with bcryptjs
              </button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">Email</label>
                <div className="relative">
                  <input
                    type="email"
                    value={loginData.email}
                    onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-neutral-300 text-xs"
                  />
                  <Mail className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
                </div>
                {errors.email && <p className="text-[11px] text-red-600 mt-1">{errors.email}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">Password</label>
                <div className="relative">
                  <input
                    type="password"
                    value={loginData.password}
                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-neutral-300 text-xs"
                  />
                  <Lock className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
                </div>
                {errors.password && <p className="text-[11px] text-red-600 mt-1">{errors.password}</p>}
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-[#09090b] hover:bg-neutral-800 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
              >
                Sign In & Verify Hash
              </button>
            </form>
          )}

          <div className="mt-5 text-center">
            <button
              type="button"
              onClick={() => {
                setIsRegisterMode(!isRegisterMode);
                setErrors({});
                setAuthError(null);
              }}
              className="text-xs text-[#D9241B] hover:underline font-semibold cursor-pointer"
            >
              {isRegisterMode ? 'Already have an account? Sign in' : "Don't have an account? Create one"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
