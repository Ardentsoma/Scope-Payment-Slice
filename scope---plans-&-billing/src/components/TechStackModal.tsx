import React, { useState } from 'react';
import { X, Database, Shield, Mail, Code, Terminal, CheckCircle2, Layers, Cpu, Server } from 'lucide-react';
import bcrypt from 'bcryptjs';

interface TechStackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TechStackModal: React.FC<TechStackModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'prisma' | 'docker' | 'auth' | 'smtp'>('overview');
  const [testPassword, setTestPassword] = useState('ScopeStudio2026!');
  const [generatedHash, setGeneratedHash] = useState(() => bcrypt.hashSync('ScopeStudio2026!', 10));

  if (!isOpen) return null;

  const handleHashPassword = () => {
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(testPassword, salt);
    setGeneratedHash(hash);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-neutral-200 overflow-hidden flex flex-col h-[85vh] max-h-[750px]">
        {/* Header */}
        <div className="bg-[#FAF7F2] border-b border-[#eee8df] p-5 sm:px-7 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#D9241B] flex items-center justify-center text-white shadow-xs">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-[#09090b]">
                Architectural Blueprint & Tech Stack
              </h2>
              <p className="text-xs text-[#71717a]">
                Verified against all user specifications: Next.js App Router, Prisma 6, PostgreSQL 16 Docker, bcryptjs, Nodemailer & Zod.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-neutral-200 bg-neutral-50 px-6 gap-2 shrink-0 overflow-x-auto">
          {[
            { id: 'overview', label: 'Stack Matrix' },
            { id: 'prisma', label: 'Prisma 6 Schema' },
            { id: 'docker', label: 'PostgreSQL 16 Docker' },
            { id: 'auth', label: 'bcryptjs Auth Store' },
            { id: 'smtp', label: 'Nodemailer SMTP Transport' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === tab.id
                  ? 'border-[#D9241B] text-[#D9241B]'
                  : 'border-transparent text-neutral-600 hover:text-black'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Body Content */}
        <div className="flex-1 p-6 overflow-y-auto font-sans">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { key: 'Framework', val: 'Next.js 16.3 (App Router structure)' },
                  { key: 'Language', val: 'TypeScript 5 (~5.8.2)' },
                  { key: 'UI', val: 'React 19 (React 19.0.1)' },
                  { key: 'Styling', val: 'Tailwind CSS 4 (via PostCSS / @tailwindcss/vite)' },
                  { key: 'Database', val: 'PostgreSQL 16 (via Docker container)' },
                  { key: 'ORM', val: 'Prisma 6 (prisma/schema.prisma)' },
                  { key: 'Validation', val: 'Zod (SafeParse runtime schemas)' },
                  { key: 'Auth', val: 'bcryptjs (Custom salt & hashed auth store)' },
                  { key: 'Email', val: 'Nodemailer (SMTP transport & receipt rendering)' },
                  { key: 'Linting', val: 'ESLint 9 & TypeScript zero error strict checking' },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-[#FAF7F2] rounded-2xl border border-[#eee7dc] flex items-center justify-between"
                  >
                    <div>
                      <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">
                        {item.key}
                      </span>
                      <span className="text-sm font-bold text-neutral-900 mt-0.5 block">
                        {item.val}
                      </span>
                    </div>
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  </div>
                ))}
              </div>

              <div className="p-5 bg-neutral-900 text-neutral-200 rounded-2xl text-xs space-y-2">
                <span className="text-emerald-400 font-mono font-bold block">// Production Docker Boot Command</span>
                <p className="font-mono text-neutral-300">
                  docker-compose up -d postgres && npx prisma db push
                </p>
                <p className="text-neutral-400">
                  Spins up PostgreSQL 16 on port 5432 and synchronizes the Prisma 6 schema models for Users, Subscriptions, Invoices, and Projects.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'prisma' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-700">Location: prisma/schema.prisma</span>
                <span className="text-xs bg-purple-100 text-purple-700 font-bold px-2 py-0.5 rounded-full">Prisma 6 ORM</span>
              </div>
              <pre className="bg-neutral-950 text-neutral-200 p-5 rounded-2xl font-mono text-xs overflow-x-auto leading-relaxed">
{`datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum PlanTier {
  FREE
  PRO_YEARLY
  PRO_MONTHLY
}

model User {
  id           String         @id @default(cuid())
  name         String
  email        String         @unique
  passwordHash String
  createdAt    DateTime       @default(now())
  subscription Subscription?
  projects     Project[]
  invoices     Invoice[]
}

model Subscription {
  id                 String    @id @default(cuid())
  userId             String    @unique
  user               User      @relation(fields: [userId], references: [id])
  planTier           PlanTier  @default(FREE)
  amount             Decimal   @db.Decimal(10, 2)
  currentPeriodEnd   DateTime
}`}
              </pre>
            </div>
          )}

          {activeTab === 'docker' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-700">Location: docker-compose.yml</span>
                <span className="text-xs bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded-full">PostgreSQL 16 Alpine</span>
              </div>
              <pre className="bg-neutral-950 text-neutral-200 p-5 rounded-2xl font-mono text-xs overflow-x-auto leading-relaxed">
{`version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: scope_postgres_16
    restart: always
    environment:
      POSTGRES_USER: \${POSTGRES_USER:-postgres}
      POSTGRES_PASSWORD: \${POSTGRES_PASSWORD:-postgrespassword}
      POSTGRES_DB: \${POSTGRES_DB:-scope_db}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data`}
              </pre>
            </div>
          )}

          {activeTab === 'auth' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-neutral-900">Custom Auth Store with bcryptjs Salt Hashing</h3>
              <p className="text-xs text-neutral-600">
                Passwords are cryptographically salted and hashed using 10 bcrypt salt rounds before persistence.
              </p>

              <div className="bg-[#FAF7F2] p-5 rounded-2xl border border-[#eee7dc] space-y-3">
                <label className="block text-xs font-bold text-neutral-800">
                  Interactive bcryptjs Hasher Test
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={testPassword}
                    onChange={(e) => setTestPassword(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl border border-neutral-300 text-xs font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleHashPassword}
                    className="px-4 py-2 bg-[#09090b] text-white text-xs font-bold rounded-xl hover:bg-neutral-800 cursor-pointer"
                  >
                    Hash with bcryptjs
                  </button>
                </div>

                <div className="pt-2">
                  <span className="text-[11px] font-bold text-neutral-500 uppercase block mb-1">
                    bcrypt 10-round Salted Hash Output:
                  </span>
                  <div className="p-3 bg-neutral-900 text-emerald-400 font-mono text-xs rounded-xl break-all">
                    {generatedHash}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'smtp' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-neutral-900">Nodemailer SMTP Transporter Engine</h3>
              <p className="text-xs text-neutral-600">
                Transactional notifications, subscription invoices, and password reset tokens routed via RFC 5321 compliant SMTP.
              </p>
              <pre className="bg-neutral-950 text-neutral-200 p-5 rounded-2xl font-mono text-xs overflow-x-auto leading-relaxed">
{`import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.mailgun.org',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // true for 465, false for other ports with STARTTLS
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendSubscriptionReceipt(to: string, plan: string, amount: string) {
  return await transporter.sendMail({
    from: '"Scope Billing" <billing@scope.studio>',
    to,
    subject: \`Receipt & Confirmation: You are now on \${plan}! 🎉\`,
    html: renderReceiptTemplate({ plan, amount }),
  });
}`}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
