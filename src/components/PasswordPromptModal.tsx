import React, { useState, useEffect, useRef } from 'react';
import { Lock, KeyRound, X, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react';

interface PasswordPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const PasswordPromptModal: React.FC<PasswordPromptModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setError(null);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const trimmed = password.trim();
    // Check for "Recabi" (exact or case-insensitive for smooth user experience)
    if (trimmed.toLowerCase() === 'recabi') {
      setTimeout(() => {
        setIsSubmitting(false);
        onSuccess();
      }, 300);
    } else {
      setTimeout(() => {
        setIsSubmitting(false);
        setError('كلمة المرور غير صحيحة. يرجى التأكد وإعادة المحاولة.');
        inputRef.current?.select();
      }, 300);
    }
  };

  return (
    <div
      id="password-prompt-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="password-prompt-card"
        className="w-full max-w-md bg-stone-900 border border-amber-700/50 rounded-2xl shadow-2xl p-6 text-stone-100 relative overflow-hidden"
      >
        {/* Decorative Islamic border accent */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-600 via-amber-400 to-amber-600"></div>

        {/* Close button */}
        <button
          id="close-password-prompt-btn"
          onClick={onClose}
          className="absolute top-4 left-4 p-1.5 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-colors"
          title="إغلاق"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Icon */}
        <div className="flex flex-col items-center text-center mt-2 mb-6">
          <div className="w-14 h-14 rounded-full bg-amber-950/80 border border-amber-600/40 flex items-center justify-center text-amber-400 mb-3 shadow-inner">
            <Lock className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-bold font-heading text-amber-200">
            منطقة إدارة ورفع الكتب
          </h3>
          <p className="text-sm text-stone-400 mt-1">
            هذه الصفحة مخصصة لرفع وتعديل كتب سماحة الشيخ صباح الركابي
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-300 mb-1.5">
              كلمة مرور الإدارة
            </label>
            <div className="relative">
              <input
                ref={inputRef}
                id="admin-password-input"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="أدخل كلمة المرور..."
                className="w-full px-4 py-3 pl-11 bg-stone-950/80 border border-stone-700 rounded-xl text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all text-left font-mono"
                dir="ltr"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-200"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Error notice */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-950/50 border border-red-800/60 text-red-200 text-xs animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2 pt-2">
            <button
              id="submit-password-btn"
              type="submit"
              disabled={isSubmitting || !password.trim()}
              className="flex-1 py-3 px-4 bg-amber-600 hover:bg-amber-500 disabled:bg-stone-800 disabled:text-stone-500 text-stone-950 font-bold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-stone-950 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>دخول إلى صفحة الرفع</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="py-3 px-4 bg-stone-800 hover:bg-stone-700 text-stone-300 font-medium rounded-xl transition-colors"
            >
              إلغاء
            </button>
          </div>
        </form>

        {/* Discreet hint for the user who prompted the prompt */}
        <div className="mt-5 pt-4 border-t border-stone-800/80 text-center">
          <p className="text-[11px] text-stone-400">
            تم فتح هذه النافذة بالنقر المزدوج (دبل كليك) على الزاوية اليمنى العليا
          </p>
        </div>
      </div>
    </div>
  );
};
