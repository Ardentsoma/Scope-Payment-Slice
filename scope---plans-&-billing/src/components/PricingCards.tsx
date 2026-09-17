import React, { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';

export type PlanType = 'free' | 'pro_yearly' | 'pro_monthly';

interface PricingCardsProps {
  onSelectPlan?: (planId: PlanType) => void;
  defaultPlan?: PlanType;
}

export const PricingCards: React.FC<PricingCardsProps> = ({
  onSelectPlan,
  defaultPlan = 'pro_yearly',
}) => {
  const [selectedPlan, setSelectedPlan] = useState<PlanType>(defaultPlan);

  const handleSelect = (plan: PlanType) => {
    setSelectedPlan(plan);
    if (onSelectPlan) {
      onSelectPlan(plan);
    }
  };

  return (
    <div className="w-full max-w-[1160px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 md:py-14 font-work-sans tracking-[-0.02em]">
      {/* Title & Subtitle */}
      <div className="text-center mb-8 sm:mb-10 md:mb-12 lg:mb-14">
        <h1 className="font-dela-gothic text-2xl sm:text-3xl md:text-[34px] lg:text-[40px] tracking-tight text-[#09090b] mb-2 sm:mb-3">
          Choose The Plan Right For You
        </h1>
        <p className="text-sm sm:text-base md:text-lg text-[#5B6070] font-normal tracking-[-0.02em]">
          Use a plan that fits your workflow
        </p>
      </div>

      {/* 3 Pricing Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6 md:gap-4 lg:gap-6 xl:gap-7 items-stretch max-w-[440px] md:max-w-none mx-auto w-full">
        
        {/* ============================================================ */}
        {/* CARD 1: FREE                                                 */}
        {/* ============================================================ */}
        <div
          id="card-free"
          onClick={() => handleSelect('free')}
          className={`relative rounded-[22px] sm:rounded-[26px] p-6 sm:p-7 md:p-5 lg:p-7 xl:p-8 flex flex-col justify-between transition-all duration-200 cursor-pointer h-full min-h-[460px] md:min-h-[500px] lg:min-h-[520px] border ${
            selectedPlan === 'free'
              ? 'border-neutral-300'
              : 'border-transparent hover:border-neutral-200'
          }`}
          style={{ backgroundColor: '#FFFBF0' }}
        >
          <div className="flex-1 flex flex-col justify-between">
            <div>
              {/* Plan Title & Current Plan Badge Row */}
              <div className="flex items-center justify-between mb-3 min-h-[28px]">
                <h3 className="text-[15px] sm:text-[16px] font-semibold text-[#5B6070] font-work-sans tracking-[-0.02em]">
                  Free
                </h3>
                <span className="inline-flex items-center px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full text-[11px] sm:text-xs font-semibold bg-[#FCE8E8] text-[#D9241B] select-none tracking-[-0.02em]">
                  Current plan
                </span>
              </div>

              {/* Price */}
              <div className="flex items-baseline mb-3">
                <span className="font-oswald text-3xl sm:text-4xl md:text-[32px] lg:text-[42px] xl:text-[44px] font-bold tracking-tight text-[#09090b] leading-none">
                  ₦0
                </span>
                <span className="font-work-sans text-sm sm:text-base text-[#5B6070] font-normal ml-1.5 tracking-[-0.02em]">
                  /Month
                </span>
              </div>

              {/* Description */}
              <p className="font-work-sans text-xs sm:text-sm text-[#5B6070] leading-relaxed mb-6 sm:mb-8 tracking-[-0.02em]">
                Everything you need to try Scope with a couple of clients.
              </p>

              {/* Button: Try for free */}
              <div className="mb-6 sm:mb-8">
                <button
                  id="btn-free-plan"
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelect('free');
                  }}
                  className="w-full py-3 sm:py-3.5 px-4 rounded-xl text-xs sm:text-sm font-medium bg-[#ECE7E0] border border-[#D5D0C7] text-[#5B6070] transition-colors hover:bg-[#E4DFD6] active:scale-[0.99] cursor-pointer font-work-sans tracking-[-0.02em]"
                >
                  Try for free
                </button>
              </div>

              {/* Feature List */}
              <ul className="space-y-3 sm:space-y-3.5 lg:space-y-4 text-xs sm:text-[13px] lg:text-sm font-work-sans">
                <li className="flex items-center gap-2.5 sm:gap-3">
                  <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-[#5B6070] shrink-0 stroke-[1.5]" />
                  <span className="text-[#5B6070] tracking-[-0.02em]">Up to 3 client projects</span>
                </li>
                <li className="flex items-center gap-2.5 sm:gap-3">
                  <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-[#5B6070] shrink-0 stroke-[1.5]" />
                  <span className="text-[#5B6070] tracking-[-0.02em]">5 AI brief conversions a month</span>
                </li>
                <li className="flex items-center gap-2.5 sm:gap-3">
                  <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-[#5B6070] shrink-0 stroke-[1.5]" />
                  <span className="text-[#5B6070] tracking-[-0.02em]">Core project tracking</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* CARD 2: PRO YEARLY (RECOMMENDED)                             */}
        {/* ============================================================ */}
        <div
          id="card-pro-yearly"
          onClick={() => handleSelect('pro_yearly')}
          className={`relative rounded-[22px] sm:rounded-[26px] overflow-hidden flex flex-col justify-between transition-all duration-200 cursor-pointer h-full min-h-[460px] md:min-h-[500px] lg:min-h-[520px] ${
            selectedPlan === 'pro_yearly'
              ? 'border-[1.5px] border-[#D9241B]'
              : 'border border-transparent hover:border-neutral-200'
          }`}
          style={{ backgroundColor: '#FFFBF0' }}
        >
          {/* Red Recommended Header Banner */}
          <div className="bg-[#D9241B] text-white text-center py-2 sm:py-2.5 px-4 rounded-t-[22px] sm:rounded-t-[26px]">
            <span className="text-sm sm:text-base font-bold tracking-tight font-work-sans">
              Recommended
            </span>
          </div>

          <div className="p-6 sm:p-7 md:p-5 lg:p-7 xl:p-8 pt-5 sm:pt-6 md:pt-5 lg:pt-6 flex-1 flex flex-col justify-between">
            <div>
              {/* Plan Title & Save 33% Badge Row */}
              <div className="flex items-center justify-between mb-3 min-h-[28px]">
                <h3 className="text-[15px] sm:text-[16px] font-semibold text-[#5B6070] font-work-sans tracking-[-0.02em]">
                  Pro Yearly
                </h3>
                <span className="inline-flex items-center px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full text-[11px] sm:text-xs font-semibold bg-[#FCE8E8] text-[#D9241B] select-none tracking-[-0.02em]">
                  Save 33%
                </span>
              </div>

              {/* Price */}
              <div className="flex items-baseline mb-3">
                <span className="font-oswald text-3xl sm:text-4xl md:text-[32px] lg:text-[42px] xl:text-[44px] font-bold tracking-tight text-[#09090b] leading-none">
                  ₦99,000
                </span>
                <span className="font-work-sans text-sm sm:text-base text-[#5B6070] font-normal ml-1.5 tracking-[-0.02em]">
                  /Month
                </span>
              </div>

              {/* Description */}
              <p className="font-work-sans text-xs sm:text-sm text-[#5B6070] leading-relaxed mb-6 sm:mb-8 tracking-[-0.02em]">
                Everything you need to try Scope with a couple of clients.
              </p>

              {/* Button: Solid Red when active; Outline when Pro Monthly active */}
              <div className="mb-6 sm:mb-8">
                <button
                  id="btn-pro-yearly"
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelect('pro_yearly');
                  }}
                  className={`w-full py-3 sm:py-3.5 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-150 active:scale-[0.99] cursor-pointer font-work-sans tracking-[-0.02em] ${
                    selectedPlan === 'pro_yearly'
                      ? 'bg-[#D9241B] text-white hover:bg-[#C21E15]'
                      : 'bg-transparent border border-black text-black hover:bg-black/5'
                  }`}
                >
                  Get started
                </button>
              </div>

              {/* Feature List */}
              <ul className="space-y-3 sm:space-y-3.5 lg:space-y-4 text-xs sm:text-[13px] lg:text-sm font-work-sans">
                <li className="flex items-center gap-2.5 sm:gap-3">
                  <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-[#5B6070] shrink-0 stroke-[1.5]" />
                  <span className="text-[#5B6070] tracking-[-0.02em]">Unlimited client projects</span>
                </li>
                <li className="flex items-center gap-2.5 sm:gap-3">
                  <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-[#5B6070] shrink-0 stroke-[1.5]" />
                  <span className="text-[#5B6070] tracking-[-0.02em]">Unlimited AI brief conversions a month</span>
                </li>
                <li className="flex items-center gap-2.5 sm:gap-3">
                  <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-[#5B6070] shrink-0 stroke-[1.5]" />
                  <span className="text-[#5B6070] tracking-[-0.02em]">Priority support</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* CARD 3: PRO MONTHLY                                          */}
        {/* ============================================================ */}
        <div
          id="card-pro-monthly"
          onClick={() => handleSelect('pro_monthly')}
          className={`relative rounded-[22px] sm:rounded-[26px] p-6 sm:p-7 md:p-5 lg:p-7 xl:p-8 flex flex-col justify-between transition-all duration-200 cursor-pointer h-full min-h-[460px] md:min-h-[500px] lg:min-h-[520px] ${
            selectedPlan === 'pro_monthly'
              ? 'border-[1.5px] border-[#D9241B]'
              : 'border border-transparent hover:border-neutral-200'
          }`}
          style={{ backgroundColor: '#FFFBF0' }}
        >
          <div className="flex-1 flex flex-col justify-between">
            <div>
              {/* Plan Title Row */}
              <div className="flex items-center justify-between mb-3 min-h-[28px]">
                <h3 className="text-[15px] sm:text-[16px] font-semibold text-[#5B6070] font-work-sans tracking-[-0.02em]">
                  Pro Monthly
                </h3>
              </div>

              {/* Price */}
              <div className="flex items-baseline mb-3">
                <span className="font-oswald text-3xl sm:text-4xl md:text-[32px] lg:text-[42px] xl:text-[44px] font-bold tracking-tight text-[#09090b] leading-none">
                  ₦12,000
                </span>
                <span className="font-work-sans text-sm sm:text-base text-[#5B6070] font-normal ml-1.5 tracking-[-0.02em]">
                  /Month
                </span>
              </div>

              {/* Description */}
              <p className="font-work-sans text-xs sm:text-sm text-[#5B6070] leading-relaxed mb-6 sm:mb-8 tracking-[-0.02em]">
                Everything you need to try Scope with a couple of clients.
              </p>

              {/* Button: Outline when inactive; Solid Red when clicked */}
              <div className="mb-6 sm:mb-8">
                <button
                  id="btn-pro-monthly"
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelect('pro_monthly');
                  }}
                  className={`w-full py-3 sm:py-3.5 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-150 active:scale-[0.99] cursor-pointer font-work-sans tracking-[-0.02em] ${
                    selectedPlan === 'pro_monthly'
                      ? 'bg-[#D9241B] text-white hover:bg-[#C21E15]'
                      : 'bg-transparent border border-black text-black hover:bg-black/5'
                  }`}
                >
                  Get started
                </button>
              </div>

              {/* Feature List */}
              <ul className="space-y-3 sm:space-y-3.5 lg:space-y-4 text-xs sm:text-[13px] lg:text-sm font-work-sans">
                <li className="flex items-center gap-2.5 sm:gap-3">
                  <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-[#5B6070] shrink-0 stroke-[1.5]" />
                  <span className="text-[#5B6070] tracking-[-0.02em]">Unlimited client projects</span>
                </li>
                <li className="flex items-center gap-2.5 sm:gap-3">
                  <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-[#5B6070] shrink-0 stroke-[1.5]" />
                  <span className="text-[#5B6070] tracking-[-0.02em]">Unlimited AI brief conversions a month</span>
                </li>
                <li className="flex items-center gap-2.5 sm:gap-3">
                  <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-[#5B6070] shrink-0 stroke-[1.5]" />
                  <span className="text-[#5B6070] tracking-[-0.02em]">Priority support</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
