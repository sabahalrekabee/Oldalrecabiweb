import React, { useRef, useState } from 'react';
import { X, BookOpen, Award, Sparkles, GraduationCap, MapPin, Camera, Upload, RotateCcw, Check } from 'lucide-react';
import { sheikhPortrait } from '../data/initialBooks.ts';
import { compressImage } from '../utils/imageCompressor.ts';

interface SheikhBioModalProps {
  isOpen: boolean;
  onClose: () => void;
  booksCount: number;
  currentAvatar?: string;
  onAvatarUpdated?: (newUrl: string) => void;
  isAdminUnlocked?: boolean;
}

export const SheikhBioModal: React.FC<SheikhBioModalProps> = ({
  isOpen,
  onClose,
  booksCount,
  currentAvatar = sheikhPortrait,
  onAvatarUpdated,
  isAdminUnlocked = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [justUpdated, setJustUpdated] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        setIsCompressing(true);
        // Compress image to a reasonable size for a profile picture (e.g. max 500px)
        const compressedBase64 = await compressImage(file, 500, 0.8);
        onAvatarUpdated?.(compressedBase64);
        setJustUpdated(true);
        setTimeout(() => setJustUpdated(false), 3000);
      } catch (err) {
        console.error('Failed to compress avatar:', err);
      } finally {
        setIsCompressing(false);
      }
    }
  };

  const handleResetAvatar = () => {
    localStorage.removeItem('sheikh_custom_avatar');
    onAvatarUpdated?.(sheikhPortrait);
    setJustUpdated(true);
    setTimeout(() => setJustUpdated(false), 3000);
  };

  return (
    <div
      id="sheikh-bio-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="sheikh-bio-card"
        className="w-full max-w-xl bg-stone-900 border border-amber-700/50 rounded-2xl shadow-2xl p-6 text-stone-100 relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-600 via-amber-400 to-amber-600"></div>

        <button
          id="close-sheikh-bio-btn"
          onClick={onClose}
          className="absolute top-4 left-4 p-1.5 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-colors"
          title="إغلاق"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col sm:flex-row items-center gap-5 mt-2 mb-6">
          <div className="relative group">
            <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden border-3 border-amber-400/90 shadow-2xl ring-4 ring-amber-950/80 bg-stone-950">
              <img
                src={currentAvatar}
                alt="سماحة الشيخ صباح الركابي"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            
            {/* Upload/Change photo overlay button */}
            {isAdminUnlocked && (
              <>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-amber-300 transition-opacity duration-200 cursor-pointer text-xs font-semibold"
                  title="تغيير أو رفع صورة جديدة للشيخ"
                >
                  <Camera className="w-6 h-6 mb-1" />
                  <span>تغيير الصورة</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </>
            )}

            <div className="absolute bottom-1 right-1 bg-amber-500 text-stone-950 p-1.5 rounded-full border-2 border-stone-900 shadow">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="text-center sm:text-right">
            <span className="inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-950/90 text-amber-300 border border-amber-800/60 mb-1">
              عالم وباحث إسلامي
            </span>
            <h2 className="text-2xl font-bold font-heading text-amber-100">
              سماحة الشيخ صباح الركابي
            </h2>
            <p className="text-sm text-stone-400 mt-1 flex items-center justify-center sm:justify-start gap-1">
              <MapPin className="w-3.5 h-3.5 text-amber-500" />
              <span>الحوزة العلمية • مؤلفات وبحوث فكرية وفقهية</span>
            </p>

            {/* Quick action buttons for avatar */}
            {isAdminUnlocked && (
              <div className="mt-3 flex items-center justify-center sm:justify-start gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-300 border border-stone-700 transition-colors"
                  disabled={isCompressing}
                >
                  <Upload className="w-3 h-3" />
                  <span>{isCompressing ? 'جاري الرفع...' : 'رفع صورة من الجهاز'}</span>
                </button>
                {currentAvatar !== sheikhPortrait && (
                  <button
                    onClick={handleResetAvatar}
                    className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-stone-200 border border-stone-700 transition-colors"
                    title="استعادة الصورة الأصلية"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>استعادة الأصلية</span>
                  </button>
                )}
              </div>
            )}
            
            {justUpdated && (
              <div className="text-xs text-emerald-400 flex items-center gap-1 mt-1.5 justify-center sm:justify-start">
                <Check className="w-3.5 h-3.5" />
                <span>تم تحديث صورة الواجهة بنجاح</span>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4 text-sm leading-relaxed text-stone-300">
          <div className="p-4 rounded-xl bg-stone-950/70 border border-stone-800">
            <h4 className="font-bold text-amber-300 mb-2 flex items-center gap-2">
              <GraduationCap className="w-4 h-4" />
              <span>عن الشيخ والمكتبة الرقمية</span>
            </h4>
            <p className="text-stone-300 text-xs sm:text-sm">
              يُعد سماحة الشيخ صباح الركابي من الباحثين والخطباء الذين أثروا المكتبة الإسلامية بدراسات وبحوث معمقة في حقول الفقه والعقائد والسيرة والأخلاق. تهدف هذه المنصة والمكتبة الإلكترونية إلى إتاحة مؤلفاته وكتبه للباحثين والقرّاء في شتى أرجاء العالم بصيغة رقمية ميسّرة للوجهين وتصفح مباشر بصيغة PDF.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-stone-800/50 border border-stone-700/50 text-center">
              <div className="text-2xl font-bold text-amber-400 font-heading">
                {booksCount}
              </div>
              <div className="text-xs text-stone-400 mt-0.5">مؤلفات منشورة بالمكتبة</div>
            </div>
            <div className="p-3 rounded-xl bg-stone-800/50 border border-stone-700/50 text-center">
              <div className="text-2xl font-bold text-emerald-400 font-heading">
                PDF
              </div>
              <div className="text-xs text-stone-400 mt-0.5">قراءة مباشرة وتحميل مجاني</div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-sm transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
