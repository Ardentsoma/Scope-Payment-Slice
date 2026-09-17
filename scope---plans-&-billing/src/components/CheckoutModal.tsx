import React, { useState } from 'react';
import { X, Lock, CheckCircle, ShieldCheck, Mail, CreditCard, Sparkles } from 'lucide-react';
import { checkoutSchema, CheckoutFormData, PlanId } from '../types';
import { AuthStore } from '../lib/auth-store';
import { EmailService } from '../lib/email-service';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  planId: PlanId;
  onSuccess: (emailId: string) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  planId,
  onSuccess,
}) => {
  const user = AuthStore.getUser();

  const [formData, setFormData] = useState<CheckoutFormData>({
    cardholderName: user.name || 'Nancy Mesoma',
    cardNumber: '4242 4242 4242 4242',
    expiryDate: '12/28',
    cvv: '888',
    billingEmail: user.email || 'nmesomanancy2020@gmail.com',
    companyName: 'Scope Studio Design Ltd',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof CheckoutFormData, string>>>({});
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const isYearly = planId === 'pro_yearly';
  const planTitle = isYearly ? 'Pro Yearly' : 'Pro Monthly';
  const planPrice = isYearly ? '₦99,000' : '₦12,000';
  const rawAmount = isYearly ? 99000 : 12000;
  const billingCycle = isYearly ? 'Annual billing (Includes 33% discount)' : 'Billed monthly, cancel anytime';

  const handleChange = (field: keyof CheckoutFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const result = checkoutSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof CheckoutFormData, string>> = {};
      result.error.issues.forEach((issue) => {
        if (issue.path[0]) {
          fieldErrors[issue.path[0] as keyof CheckoutFormData] = issue.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setIsProcessing(true);

    setTimeout(() => {
      // 1. Update Auth Store with plan
      AuthStore.updatePlan(planId);

      // 2. Dispatch SMTP confirmation email via Nodemailer service
      const sentEmail = EmailService.sendSubscriptionConfirmation({
        toEmail: formData.billingEmail,
        userName: formData.cardholderName,
        planId,
        amount: rawAmount,
        currency: 'NGN',
      });

      setIsProcessing(false);
      onSuccess(sentEmail.id);
      onClose();
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-neutral-200 overflow-hidden my-8">
        {/* Modal Header */}
        <div className="bg-[#FAF7F2] border-b border-[#eee8df] p-6 sm:p-7 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold tracking-wider text-[#D9241B] uppercase">
              Secure Checkout • Zod Validated
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-[#09090b] mt-0.5">
              Subscribe to {planTitle}
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

        {/* Plan Summary Strip */}
        <div className="bg-[#FFF8F7] border-b border-[#FEE2E2] px-6 sm:px-7 py-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-[#18181b]">{planTitle}</span>
              {isYearly && (
                <span className="bg-[#FDE8E8] text-[#D9241B] text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Save 33% Applied
                </span>
              )}
            </div>
            <p className="text-xs text-[#71717a] mt-0.5">{billingCycle}</p>
          </div>
          <div className="text-right">
            <span className="text-2xl font-black text-[#D9241B]">{planPrice}</span>
            <span className="text-xs text-[#71717a] block">/Month</span>
          </div>
        </div>

        {/* Checkout Form */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-7 space-y-5">
          {/* Cardholder Name */}
          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1">
              Cardholder Name
            </label>
            <input
              type="text"
              value={formData.cardholderName}
              onChange={(e) => handleChange('cardholderName', e.target.value)}
              placeholder="e.g. Nancy Mesoma"
              className={`w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none transition-colors ${
                errors.cardholderName
                  ? 'border-red-500 bg-red-50/30'
                  : 'border-neutral-300 focus:border-black'
              }`}
            />
            {errors.cardholderName && (
              <p className="text-xs text-red-600 mt-1 font-medium">{errors.cardholderName}</p>
            )}
          </div>

          {/* Billing Email */}
          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1">
              Billing & Receipt Email (Nodemailer SMTP Target)
            </label>
            <div className="relative">
              <input
                type="email"
                value={formData.billingEmail}
                onChange={(e) => handleChange('billingEmail', e.target.value)}
                placeholder="name@example.com"
                className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm focus:outline-none transition-colors ${
                  errors.billingEmail
                    ? 'border-red-500 bg-red-50/30'
                    : 'border-neutral-300 focus:border-black'
                }`}
              />
              <Mail className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
            </div>
            {errors.billingEmail && (
              <p className="text-xs text-red-600 mt-1 font-medium">{errors.billingEmail}</p>
            )}
          </div>

          {/* Card Number */}
          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1">
              Card Number (Demo Sandbox)
            </label>
            <div className="relative">
              <input
                type="text"
                value={formData.cardNumber}
                onChange={(e) => handleChange('cardNumber', e.target.value)}
                placeholder="4242 4242 4242 4242"
                maxLength={19}
                className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm font-mono focus:outline-none transition-colors ${
                  errors.cardNumber
                    ? 'border-red-500 bg-red-50/30'
                    : 'border-neutral-300 focus:border-black'
                }`}
              />
              <CreditCard className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
            </div>
            {errors.cardNumber && (
              <p className="text-xs text-red-600 mt-1 font-medium">{errors.cardNumber}</p>
            )}
          </div>

          {/* Expiry & CVV */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">
                Expiry Date (MM/YY)
              </label>
              <input
                type="text"
                value={formData.expiryDate}
                onChange={(e) => handleChange('expiryDate', e.target.value)}
                placeholder="12/28"
                maxLength={5}
                className={`w-full px-4 py-2.5 rounded-xl border text-sm font-mono focus:outline-none transition-colors ${
                  errors.expiryDate
                    ? 'border-red-500 bg-red-50/30'
                    : 'border-neutral-300 focus:border-black'
                }`}
              />
              {errors.expiryDate && (
                <p className="text-xs text-red-600 mt-1 font-medium">{errors.expiryDate}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">
                CVV / CVC
              </label>
              <input
                type="password"
                value={formData.cvv}
                onChange={(e) => handleChange('cvv', e.target.value)}
                placeholder="888"
                maxLength={4}
                className={`w-full px-4 py-2.5 rounded-xl border text-sm font-mono focus:outline-none transition-colors ${
                  errors.cvv
                    ? 'border-red-500 bg-red-50/30'
                    : 'border-neutral-300 focus:border-black'
                }`}
              />
              {errors.cvv && (
                <p className="text-xs text-red-600 mt-1 font-medium">{errors.cvv}</p>
              )}
            </div>
          </div>

          {/* Trust badge */}
          <div className="flex items-center gap-2 p-3 bg-neutral-50 rounded-xl text-xs text-neutral-600">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>256-bit SSL encrypted • Unlimited projects unlock immediately</span>
          </div>

          {/* Submit Button */}
          <button
            id="btn-confirm-payment"
            type="submit"
            disabled={isProcessing}
            className="w-full py-4 px-6 rounded-xl bg-[#D9241B] hover:bg-[#B91C1C] text-white font-bold text-base shadow-md transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75"
          >
            {isProcessing ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Authorizing & Sending SMTP Email...</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                <span>Confirm & Pay {planPrice}</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
