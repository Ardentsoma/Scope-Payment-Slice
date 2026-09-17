import React from 'react';
import { UserProfile, SentEmail, PlanId } from '../types';
import { Mail, Sparkles, Layers, User, ChevronDown, CheckCircle, ShieldCheck } from 'lucide-react';
import { AuthStore } from '../lib/auth-store';

interface NavbarProps {
  user: UserProfile;
  activeView: 'pricing' | 'dashboard';
  setActiveView: (view: 'pricing' | 'dashboard') => void;
  onOpenEmailViewer: () => void;
  onOpenTechStack: () => void;
  onOpenAuth: () => void;
  sentEmailCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  activeView,
  setActiveView,
  onOpenEmailViewer,
  onOpenTechStack,
  onOpenAuth,
  sentEmailCount,
}) => {
  const isPro = user.currentPlan === 'pro_yearly' || user.currentPlan === 'pro_monthly';

  const planLabel =
    user.currentPlan === 'pro_yearly'
      ? 'Pro Yearly'
      : user.currentPlan === 'pro_monthly'
      ? 'Pro Monthly'
      : 'Free Plan';

  return (
    <header className="w-full bg-white/85 backdrop-blur-md border-b border-neutral-200/80 sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo and Brand */}
        <div className="flex items-center gap-6">
          <button
            type="button"
            onClick={() => setActiveView('pricing')}
            className="flex items-center gap-2 group text-left cursor-pointer"
          >
            <div className="w-8 h-8 rounded-xl bg-[#D9241B] flex items-center justify-center text-white font-black text-lg tracking-tighter shadow-xs">
              S
            </div>
            <div>
              <span className="text-xl font-extrabold tracking-tight text-[#09090b] block leading-none">
                Scope
              </span>
              <span className="text-[10px] text-[#71717a] font-medium tracking-wide">
                Client Scoping & Billing
              </span>
            </div>
          </button>

          {/* Nav Switcher */}
          <nav className="hidden sm:flex items-center gap-1 bg-[#FAF7F2] p-1 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveView('pricing')}
              className={`px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
                activeView === 'pricing'
                  ? 'bg-white text-black shadow-xs font-bold'
                  : 'text-neutral-600 hover:text-black'
              }`}
            >
              Plans & Pricing
            </button>
            <button
              type="button"
              onClick={() => setActiveView('dashboard')}
              className={`px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeView === 'dashboard'
                  ? 'bg-white text-black shadow-xs font-bold'
                  : 'text-neutral-600 hover:text-black'
              }`}
            >
              <span>Scope Workspace</span>
              {isPro && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#D9241B]" />
              )}
            </button>
          </nav>
        </div>

        {/* Right Tools & Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Tech Stack Blueprint Modal Trigger */}
          <button
            type="button"
            onClick={onOpenTechStack}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-200 hover:border-neutral-400 text-xs font-semibold text-neutral-700 hover:text-black transition-colors cursor-pointer bg-white"
            title="Inspect PostgreSQL 16 Docker, Prisma 6, Next.js, bcryptjs & Zod"
          >
            <Layers className="w-3.5 h-3.5 text-[#D9241B]" />
            <span>Tech Stack</span>
          </button>

          {/* Nodemailer SMTP Outbox Trigger */}
          <button
            type="button"
            onClick={onOpenEmailViewer}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-200 hover:border-neutral-400 text-xs font-semibold text-neutral-700 hover:text-black transition-colors cursor-pointer bg-white relative"
            title="Open Nodemailer SMTP Dispatch Outbox"
          >
            <Mail className="w-3.5 h-3.5 text-neutral-700" />
            <span className="hidden sm:inline">SMTP Outbox</span>
            {sentEmailCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-[#D9241B] text-white text-[10px] font-bold flex items-center justify-center">
                {sentEmailCount}
              </span>
            )}
          </button>

          {/* User Profile / Auth Button */}
          <div className="flex items-center pl-2 border-l border-neutral-200">
            <button
              type="button"
              onClick={onOpenAuth}
              className="flex items-center gap-2 py-1 px-2 rounded-xl hover:bg-neutral-100 transition-colors cursor-pointer text-left"
            >
              <div className="w-7 h-7 rounded-full bg-neutral-900 text-white flex items-center justify-center text-xs font-bold">
                {user.name.charAt(0)}
              </div>
              <div className="hidden lg:block">
                <p className="text-xs font-bold text-neutral-900 leading-none">
                  {user.name}
                </p>
                <div className="flex items-center gap-1 mt-0.5">
                  <span
                    className={`text-[10px] font-semibold ${
                      isPro ? 'text-[#D9241B]' : 'text-neutral-500'
                    }`}
                  >
                    {planLabel}
                  </span>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
