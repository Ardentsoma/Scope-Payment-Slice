import React, { useState } from 'react';
import {
  FolderKanban,
  Sparkles,
  Plus,
  ArrowUpRight,
  ShieldCheck,
  AlertCircle,
  FileText,
  CheckCircle,
  Briefcase,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { UserProfile, PlanId } from '../types';
import { AuthStore } from '../lib/auth-store';

interface ScopeDashboardProps {
  user: UserProfile;
  onOpenPricing: () => void;
  onOpenEmailViewer: () => void;
}

export const ScopeDashboard: React.FC<ScopeDashboardProps> = ({
  user,
  onOpenPricing,
  onOpenEmailViewer,
}) => {
  const [briefInput, setBriefInput] = useState('');
  const [briefTitle, setBriefTitle] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedResult, setGeneratedResult] = useState<string | null>(null);
  const [quotaError, setQuotaError] = useState<string | null>(null);

  // New project state
  const [newProjectClient, setNewProjectClient] = useState('');
  const [newProjectTitle, setNewProjectTitle] = useState('');
  const [showAddProject, setShowAddProject] = useState(false);
  const [projectError, setProjectError] = useState<string | null>(null);

  const isPro = user.currentPlan === 'pro_yearly' || user.currentPlan === 'pro_monthly';
  const planDisplay =
    user.currentPlan === 'pro_yearly'
      ? 'Pro Yearly (₦99,000/Month)'
      : user.currentPlan === 'pro_monthly'
      ? 'Pro Monthly (₦12,000/Month)'
      : 'Free Tier (₦0/Month)';

  const sampleBriefs = [
    {
      title: 'Fintech Payments App',
      text: 'Client wants an iOS/Android mobile wallet enabling micro-merchants in Lagos to accept instant QR code payments with automated tax receipts and daily settlement.',
    },
    {
      title: 'E-commerce Brand Scoping',
      text: 'Luxury apparel brand requires a head-less Shopify storefront with custom interactive 3D product previews and localized multi-currency checkout.',
    },
  ];

  const handleConvertBrief = (e: React.FormEvent) => {
    e.preventDefault();
    if (!briefInput.trim()) return;

    setQuotaError(null);
    setIsGenerating(true);

    setTimeout(() => {
      const res = AuthStore.recordBriefConversion();
      if (!res.success) {
        setIsGenerating(false);
        setQuotaError(res.message || 'Brief conversion quota reached.');
        return;
      }

      // Generate scope deliverables
      const generated = `### Scope of Work: ${briefTitle || 'Client Deliverable'}\n` +
        `**1. Executive Overview:** Translation of client requirements into phased technical milestones.\n` +
        `**2. Deliverables List:**\n` +
        `   • Information architecture and user flow diagram\n` +
        `   • High-fidelity interactive prototype\n` +
        `   • API schema contracts & database entity relationship diagram\n` +
        `   • QA test matrices & acceptance criteria sign-off\n` +
        `**3. Projected Timeline:** 4 Sprints (8 Weeks)\n` +
        `**4. Risk Mitigation:** Automated regression test suite & staging container environment.`;

      setGeneratedResult(generated);
      setIsGenerating(false);
    }, 750);
  };

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectClient || !newProjectTitle) return;

    const res = AuthStore.addProject(newProjectTitle, newProjectClient);
    if (!res.success) {
      setProjectError(res.message || 'Project quota reached.');
      return;
    }

    setNewProjectClient('');
    setNewProjectTitle('');
    setShowAddProject(false);
    setProjectError(null);
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Top Banner with User Status */}
      <div className="bg-[#FAF7F2] border border-[#eee7dc] rounded-3xl p-6 sm:p-8 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[#D9241B]">
              Scope Workspace
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                isPro ? 'bg-[#D9241B] text-white' : 'bg-[#EAE7E1] text-[#71717a]'
              }`}
            >
              {isPro ? 'PRO ACTIVE' : 'FREE PLAN'}
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-[#09090b]">
            Hello, {user.name}
          </h2>
          <p className="text-sm text-[#71717a] mt-1">
            Current Tier: <strong className="text-[#18181b]">{planDisplay}</strong> • Linked to {user.email}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onOpenPricing}
            className="px-5 py-2.5 rounded-xl bg-[#09090b] text-white text-sm font-bold hover:bg-neutral-800 transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            {isPro ? 'Change Plan' : 'Upgrade to Pro'}
          </button>
          <button
            type="button"
            onClick={onOpenEmailViewer}
            className="px-4 py-2.5 rounded-xl bg-white border border-neutral-300 text-neutral-800 text-sm font-semibold hover:bg-neutral-50 transition-colors flex items-center gap-2 cursor-pointer"
          >
            <span>SMTP Invoices & Logs</span>
          </button>
        </div>
      </div>

      {/* Quota & Usage Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Card 1: Client Projects */}
        <div className="bg-white border border-neutral-200 rounded-3xl p-6 sm:p-7 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-800">
                <FolderKanban className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-neutral-900">Client Projects</h3>
                <p className="text-xs text-neutral-500">Active client workspaces</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowAddProject(!showAddProject)}
              className="p-2 rounded-lg bg-[#FAF7F2] hover:bg-neutral-200/70 text-neutral-800 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Project
            </button>
          </div>

          <div className="space-y-2">
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-neutral-600">Current Usage:</span>
              <span className="font-bold text-neutral-900">
                {user.projectsCount} / {user.maxProjects === 'unlimited' ? '∞ Unlimited' : user.maxProjects}
              </span>
            </div>
            {user.maxProjects !== 'unlimited' && (
              <div className="w-full bg-neutral-100 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-[#D9241B] h-full rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, (user.projectsCount / (user.maxProjects as number)) * 100)}%` }}
                />
              </div>
            )}
            {user.maxProjects === 'unlimited' && (
              <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" /> Unlimited client projects unlocked by your Pro plan!
              </p>
            )}
          </div>

          {/* Add project form */}
          {showAddProject && (
            <form onSubmit={handleCreateProject} className="mt-4 pt-4 border-t border-neutral-100 space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-neutral-600 mb-1">Client Name</label>
                <input
                  type="text"
                  placeholder="e.g. Apex Global Logistics"
                  value={newProjectClient}
                  onChange={(e) => setNewProjectClient(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-neutral-300 text-xs focus:outline-none focus:border-black"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-neutral-600 mb-1">Project Scope Title</label>
                <input
                  type="text"
                  placeholder="e.g. Enterprise CRM Redesign"
                  value={newProjectTitle}
                  onChange={(e) => setNewProjectTitle(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-neutral-300 text-xs focus:outline-none focus:border-black"
                />
              </div>
              {projectError && (
                <div className="p-2.5 bg-red-50 text-red-700 text-xs rounded-lg flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{projectError}</span>
                </div>
              )}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddProject(false)}
                  className="px-3 py-1.5 rounded-lg text-xs text-neutral-600 hover:bg-neutral-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-[#D9241B] text-white text-xs font-bold hover:bg-[#B91C1C] cursor-pointer"
                >
                  Save Project
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Card 2: AI Brief Conversions */}
        <div className="bg-white border border-neutral-200 rounded-3xl p-6 sm:p-7 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-[#D9241B]">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-neutral-900">AI Brief Conversions</h3>
                <p className="text-xs text-neutral-500">Transform client briefs into specs</p>
              </div>
            </div>
            {isPro && (
              <span className="bg-red-100 text-[#D9241B] text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                Unlimited
              </span>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-neutral-600">Monthly Conversions:</span>
              <span className="font-bold text-neutral-900">
                {user.briefConversionsUsed} / {user.maxBriefConversions === 'unlimited' ? '∞ Unlimited' : user.maxBriefConversions}
              </span>
            </div>
            {user.maxBriefConversions !== 'unlimited' && (
              <div className="w-full bg-neutral-100 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-[#D9241B] h-full rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, (user.briefConversionsUsed / (user.maxBriefConversions as number)) * 100)}%` }}
                />
              </div>
            )}
            {user.maxBriefConversions === 'unlimited' ? (
              <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" /> Unlimited AI conversions enabled!
              </p>
            ) : (
              <p className="text-xs text-neutral-500">
                {Math.max(0, (user.maxBriefConversions as number) - user.briefConversionsUsed)} conversion(s) remaining this billing cycle.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Interactive AI Brief Converter Tool */}
      <div className="bg-white border border-neutral-200 rounded-3xl p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-[#FDE8E8] text-[#D9241B] text-xs font-bold px-2 py-0.5 rounded-md">
                Scope Engine
              </span>
              <h3 className="text-xl font-bold text-neutral-900">
                Convert Client Brief into Scoped Deliverables
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-neutral-500 mt-1">
              Test how Scope parses messy client emails into clean, itemized project scopes.
            </p>
          </div>

          {/* Sample quick fill */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-400">Try preset:</span>
            {sampleBriefs.map((b, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setBriefTitle(b.title);
                  setBriefInput(b.text);
                }}
                className="text-xs bg-[#FAF7F2] hover:bg-neutral-200/60 text-neutral-800 font-semibold px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
              >
                {b.title}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleConvertBrief} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1">
              Project Title
            </label>
            <input
              type="text"
              placeholder="e.g. Lagos Micro-Merchant Payments App"
              value={briefTitle}
              onChange={(e) => setBriefTitle(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-neutral-300 text-sm focus:outline-none focus:border-black"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1">
              Raw Client Brief / Notes
            </label>
            <textarea
              rows={3}
              placeholder="Paste raw notes from client meetings or RFP emails..."
              value={briefInput}
              onChange={(e) => setBriefInput(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-sm focus:outline-none focus:border-black"
            />
          </div>

          {quotaError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-700">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-[#D9241B]" />
              <div className="flex-1">
                <p className="text-sm font-bold text-[#D9241B]">Free Plan Conversion Limit Exceeded</p>
                <p className="text-xs text-red-600 mt-0.5">{quotaError}</p>
                <button
                  type="button"
                  onClick={onOpenPricing}
                  className="mt-2 text-xs font-bold text-white bg-[#D9241B] hover:bg-[#B91C1C] px-3.5 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1 cursor-pointer"
                >
                  Upgrade to Pro for Unlimited Conversions <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isGenerating || !briefInput.trim()}
              className="py-3 px-6 rounded-xl bg-[#D9241B] hover:bg-[#B91C1C] text-white font-bold text-sm shadow-sm transition-all duration-200 flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              {isGenerating ? 'Converting Brief...' : 'Generate Project Scope'}
            </button>
          </div>
        </form>

        {generatedResult && (
          <div className="mt-6 pt-6 border-t border-neutral-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                <CheckCircle className="w-4 h-4" /> Scope Successfully Generated
              </span>
              <span className="text-xs text-neutral-400">1 credit deducted / logged</span>
            </div>
            <div className="bg-neutral-50 p-5 rounded-2xl border border-neutral-200 font-sans text-sm text-neutral-800 whitespace-pre-wrap leading-relaxed">
              {generatedResult}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
