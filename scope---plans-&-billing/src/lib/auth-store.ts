import bcrypt from 'bcryptjs';
import { PlanId, UserProfile, Invoice } from '../types';

const AUTH_STORAGE_KEY = 'scope_auth_user_v1';
const INVOICES_STORAGE_KEY = 'scope_invoices_v1';

// Seed demo user with bcrypt hashed password
const DEMO_PASSWORD = 'Password123!';
const DEMO_SALT = bcrypt.genSaltSync(10);
const DEMO_HASH = bcrypt.hashSync(DEMO_PASSWORD, DEMO_SALT);

const DEFAULT_USER: UserProfile = {
  id: 'usr_scope_demo_987',
  name: 'Nancy Mesoma',
  email: 'nmesomanancy2020@gmail.com',
  passwordHash: DEMO_HASH,
  currentPlan: 'free',
  subscribedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString(),
  subscriptionRenewsAt: undefined,
  projectsCount: 2,
  maxProjects: 3,
  briefConversionsUsed: 4,
  maxBriefConversions: 5,
};

const DEFAULT_INVOICES: Invoice[] = [
  {
    id: 'INV-2026-001',
    date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toLocaleDateString(),
    planName: 'Scope Free Plan',
    amount: 0,
    currency: 'NGN',
    status: 'paid',
    paymentMethod: 'Free Tier',
  },
];

export class AuthStore {
  private static user: UserProfile | null = null;
  private static subscribers: Array<(user: UserProfile | null) => void> = [];

  public static initialize(): UserProfile {
    if (typeof window === 'undefined') return DEFAULT_USER;

    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        this.user = JSON.parse(stored);
        return this.user!;
      }
    } catch (e) {
      console.warn('Failed to load user from localStorage', e);
    }

    this.user = DEFAULT_USER;
    this.saveUser(DEFAULT_USER);
    return DEFAULT_USER;
  }

  public static getUser(): UserProfile {
    if (!this.user) {
      return this.initialize();
    }
    return this.user;
  }

  public static subscribe(callback: (user: UserProfile | null) => void): () => void {
    this.subscribers.push(callback);
    callback(this.getUser());
    return () => {
      this.subscribers = this.subscribers.filter((cb) => cb !== callback);
    };
  }

  private static notify() {
    this.subscribers.forEach((cb) => cb(this.user));
  }

  private static saveUser(user: UserProfile) {
    this.user = user;
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    } catch (e) {
      console.warn('LocalStorage save failed', e);
    }
    this.notify();
  }

  public static login(email: string, plainPassword: string): { success: boolean; error?: string } {
    const current = this.getUser();
    if (current.email.toLowerCase() !== email.toLowerCase()) {
      return { success: false, error: 'User with this email not found in custom auth store.' };
    }

    const isValid = bcrypt.compareSync(plainPassword, current.passwordHash);
    if (!isValid) {
      return { success: false, error: 'Invalid password. Try "Password123!"' };
    }

    this.saveUser(current);
    return { success: true };
  }

  public static register(name: string, email: string, plainPassword: string): { success: boolean; error?: string } {
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(plainPassword, salt);

    const newUser: UserProfile = {
      id: 'usr_' + Math.random().toString(36).substring(2, 9),
      name,
      email,
      passwordHash: hash,
      currentPlan: 'free',
      subscribedAt: new Date().toISOString(),
      projectsCount: 0,
      maxProjects: 3,
      briefConversionsUsed: 0,
      maxBriefConversions: 5,
    };

    this.saveUser(newUser);
    return { success: true };
  }

  public static updatePlan(planId: PlanId): UserProfile {
    const current = this.getUser();
    const isPro = planId === 'pro_yearly' || planId === 'pro_monthly';

    const renewsDate = new Date();
    if (planId === 'pro_yearly') {
      renewsDate.setFullYear(renewsDate.getFullYear() + 1);
    } else if (planId === 'pro_monthly') {
      renewsDate.setMonth(renewsDate.getMonth() + 1);
    }

    const updated: UserProfile = {
      ...current,
      currentPlan: planId,
      subscribedAt: new Date().toISOString(),
      subscriptionRenewsAt: isPro ? renewsDate.toISOString() : undefined,
      maxProjects: isPro ? 'unlimited' : 3,
      maxBriefConversions: isPro ? 'unlimited' : 5,
    };

    // Record invoice
    if (isPro) {
      const amount = planId === 'pro_yearly' ? 99000 : 12000;
      const invoice: Invoice = {
        id: `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        planName: planId === 'pro_yearly' ? 'Scope Pro Yearly' : 'Scope Pro Monthly',
        amount,
        currency: 'NGN',
        status: 'paid',
        paymentMethod: 'Mastercard •••• 4242',
      };
      this.addInvoice(invoice);
    }

    this.saveUser(updated);
    return updated;
  }

  public static addProject(title: string, clientName: string): { success: boolean; message?: string } {
    const current = this.getUser();
    if (current.maxProjects !== 'unlimited' && current.projectsCount >= current.maxProjects) {
      return {
        success: false,
        message: `You have reached the limit of ${current.maxProjects} client projects on the Free plan. Upgrade to Pro for unlimited client projects.`,
      };
    }

    const updated = {
      ...current,
      projectsCount: current.projectsCount + 1,
    };
    this.saveUser(updated);
    return { success: true };
  }

  public static recordBriefConversion(): { success: boolean; message?: string; remaining?: number | 'unlimited' } {
    const current = this.getUser();
    if (current.maxBriefConversions !== 'unlimited' && current.briefConversionsUsed >= current.maxBriefConversions) {
      return {
        success: false,
        message: `Monthly limit of ${current.maxBriefConversions} AI brief conversions reached on Free. Upgrade to Pro for unlimited conversions.`,
        remaining: 0,
      };
    }

    const updated = {
      ...current,
      briefConversionsUsed: current.briefConversionsUsed + 1,
    };
    this.saveUser(updated);
    const remaining = updated.maxBriefConversions === 'unlimited' ? 'unlimited' : updated.maxBriefConversions - updated.briefConversionsUsed;
    return { success: true, remaining };
  }

  public static getInvoices(): Invoice[] {
    try {
      const stored = localStorage.getItem(INVOICES_STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.warn('Invoices load failed', e);
    }
    return DEFAULT_INVOICES;
  }

  public static addInvoice(invoice: Invoice) {
    const list = this.getInvoices();
    list.unshift(invoice);
    try {
      localStorage.setItem(INVOICES_STORAGE_KEY, JSON.stringify(list));
    } catch (e) {}
  }

  public static resetDemo() {
    this.saveUser(DEFAULT_USER);
    try {
      localStorage.setItem(INVOICES_STORAGE_KEY, JSON.stringify(DEFAULT_INVOICES));
    } catch (e) {}
  }
}
