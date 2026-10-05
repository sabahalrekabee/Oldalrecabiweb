import React, { useState, useEffect } from 'react';
import { BookOpen, Sparkles, User, Info, Library, ShieldCheck, Cloud, CloudCheck } from 'lucide-react';
import { sheikhPortrait } from '../data/initialBooks.ts';
import { SheikhBioModal } from './SheikhBioModal.tsx';
import { subscribeToSettings, updateAppSettings } from '../services/settingsService.ts';

interface HeaderProps {
  booksCount: number;
  isAdminUnlocked?: boolean;
  isCloudConnected?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  booksCount,
  isAdminUnlocked = false,
  isCloudConnected = true,
}) => {
  const [isBioModalOpen, setIsBioModalOpen] = useState(false);
  const [currentAvatar, setCurrentAvatar] = useState<string>(sheikhPortrait);

  useEffect(() => {
    const unsubscribe = subscribeToSettings((settings) => {
      if (settings.sheikhAvatarUrl) {
        setCurrentAvatar(settings.sheikhAvatarUrl);
      } else {
        // Fallback to local storage or default if cloud has no avatar yet
        const savedAvatar = localStorage.getItem('sheikh_custom_avatar');
        setCurrentAvatar(savedAvatar || sheikhPortrait);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleAvatarUpdated = async (newUrl: string) => {
    // Optimistic local update
    setCurrentAvatar(newUrl);
    localStorage.setItem('sheikh_custom_avatar', newUrl);
    
    // Sync to cloud
    try {
      if (newUrl === sheikhPortrait) {
         // Assuming this is a reset to default
         await updateAppSettings({ sheikhAvatarUrl: '' });
      } else {
         await updateAppSettings({ sheikhAvatarUrl: newUrl });
      }
    } catch (err) {
      console.error('Failed to sync avatar to cloud', err);
    }
  };

  return (
    <header className="relative bg-gradient-to-b from-stone-900 via-stone-900 to-stone-950 text-stone-100 border-b border-amber-800/40 shadow-xl">
      {/* Subtle geometric pattern banner */}
      <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#d4af37_1px,transparent_1px)] [background-size:16px_16px]"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 relative z-10">
        {/* Main top header row: Branding on Right (RTL start), Sheikh Portrait on Upper Left (RTL end) */}
        <div className="flex items-center justify-between gap-3 sm:gap-6">
          
          {/* Right Side (الجهة اليمنى): Library Branding & Title */}
          <div className="flex items-center gap-3 sm:gap-4 text-right flex-1 min-w-0">
            <div className="hidden sm:flex w-12 h-12 rounded-xl bg-amber-950/80 border border-amber-600/50 items-center justify-center text-amber-400 shadow-md shrink-0">
              <Library className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              {isAdminUnlocked && (
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="flex items-center gap-1 text-[11px] sm:text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700/60 whitespace-nowrap">
                    <ShieldCheck className="w-3 h-3" />
                    <span>وضع الإدارة نشط</span>
                  </span>
                  {isCloudConnected && (
                    <span className="flex items-center gap-1 text-[11px] sm:text-xs font-medium px-2 py-0.5 rounded-full bg-amber-950/80 text-amber-300 border border-amber-800/60 whitespace-nowrap">
                      <Cloud className="w-3 h-3 text-amber-400" />
                      <span>مزامنة Firebase السحابية نشطة</span>
                    </span>
                  )}
                </div>
              )}
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold font-heading leading-snug tracking-wide bg-gradient-to-l from-amber-100 via-amber-200 to-amber-400 bg-clip-text text-transparent drop-shadow-[0_2px_14px_rgba(245,158,11,0.3)] filter">
                مؤلفات وبحوث الشيخ صباح الركابي
              </h1>
            </div>
          </div>

          {/* Upper Left Side (الجهة العليا اليسرى لواجهة الموقع): Circular Portrait of Sheikh Sabah Al-Rikabi */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              id="sheikh-portrait-header-btn"
              onClick={() => setIsBioModalOpen(true)}
              className="group relative flex items-center gap-2 sm:gap-3 p-1 sm:p-1.5 sm:pr-3 rounded-full bg-stone-800/90 hover:bg-stone-800 border-2 border-amber-500/60 hover:border-amber-400 transition-all duration-300 shadow-xl hover:shadow-amber-500/20"
              title="سماحة الشيخ صباح الركابي - انقر لعرض السيرة أو تكبير الصورة"
            >
              {/* Circular Portrait with Islamic Golden Frame */}
              <div className="relative">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden border-2 border-amber-400 shadow-md ring-2 ring-amber-900/60 group-hover:scale-105 transition-transform duration-300 bg-stone-900">
                  <img
                    src={currentAvatar}
                    alt="سماحة الشيخ صباح الركابي"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                {/* Active indicator dot */}
                <span className="absolute bottom-0 left-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-stone-900 shadow"></span>
              </div>

              {/* Text label beside the circular image on the left */}
              <div className="text-right hidden md:block pl-2">
                <div className="text-[11px] text-amber-400 font-medium leading-tight">المؤلف والباحث</div>
                <div className="text-sm font-bold text-amber-100 group-hover:text-amber-300 transition-colors whitespace-nowrap">
                  الشيخ صباح الركابي
                </div>
                <div className="text-[10px] text-stone-400 flex items-center gap-1 mt-0.5">
                  <Info className="w-3 h-3 text-amber-400" />
                  <span>نبذة وسيرة</span>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Sheikh Biography Modal */}
      <SheikhBioModal
        isOpen={isBioModalOpen}
        onClose={() => setIsBioModalOpen(false)}
        booksCount={booksCount}
        currentAvatar={currentAvatar}
        onAvatarUpdated={handleAvatarUpdated}
        isAdminUnlocked={isAdminUnlocked}
      />
    </header>
  );
};
