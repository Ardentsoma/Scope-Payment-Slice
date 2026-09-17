import React, { useState } from 'react';
import { X, Mail, Send, CheckCircle2, Server, Terminal, Code, Eye } from 'lucide-react';
import { SentEmail } from '../types';
import { EmailService } from '../lib/email-service';
import { AuthStore } from '../lib/auth-store';

interface EmailViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  highlightedEmailId?: string;
}

export const EmailViewerModal: React.FC<EmailViewerModalProps> = ({
  isOpen,
  onClose,
  highlightedEmailId,
}) => {
  const [emails, setEmails] = useState<SentEmail[]>(() => EmailService.getSentEmails());
  const [selectedEmail, setSelectedEmail] = useState<SentEmail | null>(() => {
    const list = EmailService.getSentEmails();
    if (highlightedEmailId) {
      const found = list.find((e) => e.id === highlightedEmailId);
      if (found) return found;
    }
    return list[0] || null;
  });
  const [viewMode, setViewMode] = useState<'html' | 'raw'>('html');
  const [testEmailInput, setTestEmailInput] = useState('');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testSentFeedback, setTestSentFeedback] = useState(false);

  // Subscribe to changes in emails
  React.useEffect(() => {
    if (!isOpen) return;
    const unsub = EmailService.subscribe((updated) => {
      setEmails(updated);
      if (highlightedEmailId) {
        const found = updated.find((e) => e.id === highlightedEmailId);
        if (found) setSelectedEmail(found);
      } else if (!selectedEmail && updated.length > 0) {
        setSelectedEmail(updated[0]);
      }
    });
    return unsub;
  }, [isOpen, highlightedEmailId]);

  if (!isOpen) return null;

  const handleSendTestSmtp = (e: React.FormEvent) => {
    e.preventDefault();
    const target = testEmailInput.trim() || AuthStore.getUser().email;
    setIsSendingTest(true);

    setTimeout(() => {
      const user = AuthStore.getUser();
      const sent = EmailService.sendSubscriptionConfirmation({
        toEmail: target,
        userName: user.name,
        planId: user.currentPlan,
        amount: user.currentPlan === 'pro_yearly' ? 99000 : user.currentPlan === 'pro_monthly' ? 12000 : 0,
        currency: 'NGN',
      });
      setIsSendingTest(false);
      setSelectedEmail(sent);
      setTestSentFeedback(true);
      setTimeout(() => setTestSentFeedback(false), 4000);
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-neutral-200 overflow-hidden flex flex-col h-[85vh] max-h-[750px]">
        {/* Header */}
        <div className="bg-[#FAF7F2] border-b border-[#eee8df] p-5 sm:px-7 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#D9241B] flex items-center justify-center text-white shadow-xs">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-extrabold text-[#09090b]">
                  Nodemailer SMTP Transaction Logs
                </h2>
                <span className="bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                  SMTP Ready
                </span>
              </div>
              <p className="text-xs text-[#71717a]">
                Inspect dispatched receipts, subscription confirmation templates, and SMTP transport handshakes.
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

        {/* Content Area: Sidebar + Main Viewer */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left Email Inbox List */}
          <div className="w-full md:w-72 bg-[#FAF8F5] border-r border-[#eee8df] flex flex-col shrink-0 overflow-y-auto">
            <div className="p-3 border-b border-[#e9e3d8]">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#71717a]">
                Outbox Dispatches ({emails.length})
              </span>
            </div>
            <div className="divide-y divide-[#eee8df]">
              {emails.map((email) => {
                const isSelected = selectedEmail?.id === email.id;
                return (
                  <button
                    key={email.id}
                    type="button"
                    onClick={() => setSelectedEmail(email)}
                    className={`w-full text-left p-3.5 transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-white border-l-4 border-[#D9241B] shadow-xs'
                        : 'hover:bg-[#F3EFE9]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-neutral-900 truncate">
                        {email.to}
                      </span>
                      <span className="text-[10px] text-neutral-400">
                        {new Date(email.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-neutral-800 truncate">
                      {email.subject}
                    </p>
                    <p className="text-[11px] text-neutral-500 truncate mt-0.5">
                      {email.smtpTransport.host}:{email.smtpTransport.port}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Quick Test SMTP sender */}
            <div className="p-3.5 mt-auto border-t border-[#eee8df] bg-white">
              <span className="text-xs font-bold text-neutral-800 block mb-1">
                Dispatch Test SMTP Email
              </span>
              <form onSubmit={handleSendTestSmtp} className="space-y-2">
                <input
                  type="email"
                  placeholder="recipient@example.com"
                  value={testEmailInput}
                  onChange={(e) => setTestEmailInput(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-neutral-300 text-xs focus:outline-none focus:border-black"
                />
                <button
                  type="submit"
                  disabled={isSendingTest}
                  className="w-full py-2 px-3 rounded-lg bg-[#09090b] text-white text-xs font-bold hover:bg-neutral-800 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-75"
                >
                  <Send className="w-3.5 h-3.5" />
                  {isSendingTest ? 'Handshaking...' : 'Trigger SMTP Send'}
                </button>
                {testSentFeedback && (
                  <p className="text-[11px] text-emerald-600 font-semibold text-center flex items-center justify-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Dispatched via SMTP!
                  </p>
                )}
              </form>
            </div>
          </div>

          {/* Right Preview Pane */}
          <div className="flex-1 flex flex-col bg-white overflow-y-auto">
            {selectedEmail ? (
              <div className="flex-1 flex flex-col">
                {/* Meta header & View Toggle */}
                <div className="p-4 sm:p-5 border-b border-neutral-200 bg-neutral-50/50 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-neutral-900">
                      {selectedEmail.subject}
                    </h3>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-500 mt-1">
                      <span><strong>From:</strong> {selectedEmail.from}</span>
                      <span><strong>To:</strong> {selectedEmail.to}</span>
                      <span><strong>Time:</strong> {new Date(selectedEmail.sentAt).toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Mode switcher */}
                  <div className="flex items-center gap-1 bg-neutral-200/80 p-1 rounded-xl text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setViewMode('html')}
                      className={`flex items-center gap-1 px-3 py-1 rounded-lg cursor-pointer transition-colors ${
                        viewMode === 'html'
                          ? 'bg-white text-black shadow-xs'
                          : 'text-neutral-600 hover:text-black'
                      }`}
                    >
                      <Eye className="w-3.5 h-3.5" /> Rendered HTML
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('raw')}
                      className={`flex items-center gap-1 px-3 py-1 rounded-lg cursor-pointer transition-colors ${
                        viewMode === 'raw'
                          ? 'bg-white text-black shadow-xs'
                          : 'text-neutral-600 hover:text-black'
                      }`}
                    >
                      <Terminal className="w-3.5 h-3.5" /> SMTP Transport & Raw
                    </button>
                  </div>
                </div>

                {/* SMTP Transport Diagnostic Strip */}
                <div className="px-5 py-2.5 bg-neutral-900 text-neutral-300 text-xs font-mono flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Server className="w-3.5 h-3.5 text-[#D9241B]" />
                    <span>HOST: {selectedEmail.smtpTransport.host}:{selectedEmail.smtpTransport.port} (STARTTLS)</span>
                  </div>
                  <div className="truncate text-neutral-400">
                    ID: {selectedEmail.smtpTransport.messageId}
                  </div>
                </div>

                {/* Body Content */}
                <div className="p-6 flex-1 overflow-y-auto">
                  {viewMode === 'html' ? (
                    <div
                      className="email-render-preview"
                      dangerouslySetInnerHTML={{ __html: selectedEmail.html }}
                    />
                  ) : (
                    <div className="space-y-4">
                      <div className="bg-neutral-950 text-neutral-200 p-4 rounded-xl font-mono text-xs overflow-x-auto">
                        <p className="text-emerald-400 mb-2">// Nodemailer Transport Config & Headers</p>
                        <p>220 {selectedEmail.smtpTransport.host} ESMTP Postfix</p>
                        <p>EHLO scope-app.internal</p>
                        <p>250-STARTTLS</p>
                        <p>250-AUTH PLAIN LOGIN</p>
                        <p>MAIL FROM: &lt;billing@scope.studio&gt;</p>
                        <p>RCPT TO: &lt;{selectedEmail.to}&gt;</p>
                        <p>250 2.1.5 Ok</p>
                        <p>DATA</p>
                        <p>Message-ID: {selectedEmail.smtpTransport.messageId}</p>
                        <p>Date: {selectedEmail.sentAt}</p>
                        <p>From: {selectedEmail.from}</p>
                        <p>To: {selectedEmail.to}</p>
                        <p>Subject: {selectedEmail.subject}</p>
                        <p>Content-Type: text/html; charset=utf-8</p>
                      </div>

                      <div className="bg-neutral-100 p-4 rounded-xl font-mono text-xs overflow-x-auto text-neutral-700 whitespace-pre-wrap">
                        {selectedEmail.text}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-neutral-400 text-sm">
                Select an email to view SMTP payload
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
