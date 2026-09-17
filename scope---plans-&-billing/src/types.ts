import { z } from 'zod';

export type PlanId = 'free' | 'pro_yearly' | 'pro_monthly';

export interface PlanFeature {
  text: string;
  included: boolean;
}

export interface PricingPlan {
  id: PlanId;
  name: string;
  price: number;
  currency: string;
  period: string;
  formattedPrice: string;
  description: string;
  buttonText: string;
  isCurrent?: boolean;
  isRecommended?: boolean;
  discountBadge?: string;
  features: string[];
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  currentPlan: PlanId;
  subscribedAt?: string;
  subscriptionRenewsAt?: string;
  projectsCount: number;
  maxProjects: number | 'unlimited';
  briefConversionsUsed: number;
  maxBriefConversions: number | 'unlimited';
}

export interface SentEmail {
  id: string;
  to: string;
  from: string;
  subject: string;
  html: string;
  text: string;
  sentAt: string;
  smtpTransport: {
    host: string;
    port: number;
    secure: boolean;
    auth: { user: string };
    messageId: string;
  };
}

export interface Invoice {
  id: string;
  date: string;
  planName: string;
  amount: number;
  currency: string;
  status: 'paid' | 'pending' | 'failed';
  paymentMethod: string;
}

// Zod Validation Schemas
export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Must contain at least one number'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const checkoutSchema = z.object({
  cardholderName: z.string().min(3, 'Cardholder name is required'),
  cardNumber: z
    .string()
    .regex(/^(\d{4}\s?){4}$/, 'Enter a valid 16-digit card number'),
  expiryDate: z
    .string()
    .regex(/^(0[1-9]|1[0-2])\/\d{2}$/, 'Expiration date must be MM/YY format'),
  cvv: z.string().regex(/^\d{3,4}$/, 'CVV must be 3 or 4 digits'),
  billingEmail: z.string().email('Valid billing email required'),
  companyName: z.string().optional(),
});

export type RegisterFormData = z.infer<typeof registerSchema>;
export type LoginFormData = z.infer<typeof loginSchema>;
export type CheckoutFormData = z.infer<typeof checkoutSchema>;
