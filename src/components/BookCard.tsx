import React, { useState } from 'react';
import { Book } from '../types.ts';
import { BookOpen, RefreshCw, Download, FileText, Eye, Sparkles, Check } from 'lucide-react';
import { downloadBookPdf } from '../utils/pdfDownload.ts';

interface BookCardProps {
  book: Book;
  onReadPdf: (book: Book) => void;
  onViewDetails: (book: Book) => void;
}

export const BookCard: React.FC<BookCardProps> = ({
  book,
  onReadPdf,
  onViewDetails,
}) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [downloadNotice, setDownloadNotice] = useState<string | null>(null);

  const toggleFlip = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFlipped(!isFlipped);
  };

  const handleReadClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onReadPdf(book);
  };

  const handleDetailsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onViewDetails(book);
  };

  const handleDownloadClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setIsDownloading(true);
      setDownloadNotice(null);
      const res = await downloadBookPdf(book);
      if (res.success) {
        setDownloadSuccess(true);
        setTimeout(() => setDownloadSuccess(false), 3000);
      } else {
        setDownloadNotice('لم يُرفع PDF بعد');
        setTimeout(() => setDownloadNotice(null), 3000);
      }
    } catch (err) {
      console.error('Download error:', err);
      setDownloadNotice('تعذر التنزيل');
      setTimeout(() => setDownloadNotice(null), 3000);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div
      id={`book-card-${book.id}`}
      className="group bg-stone-900/90 rounded-2xl p-4 sm:p-5 border border-amber-900/40 hover:border-amber-600/60 transition-all duration-300 shadow-xl hover:shadow-2xl flex flex-col justify-between"
    >
      {/* Top Meta Bar */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-800/60">
          {book.category}
        </span>
        <div className="flex items-center gap-1.5">
          {book.year && (
            <span className="text-[11px] text-stone-400">
              {book.year}
            </span>
          )}
          <span className="text-stone-600">•</span>
          <span className="text-[11px] text-stone-400">
            {book.pages} صفحة
          </span>
        </div>
      </div>

      {/* 3D Flippable Book Container */}
      <div className="relative w-full aspect-[3/4] my-2 perspective-1000 cursor-pointer select-none">
        <div
          onClick={toggleFlip}
          className={`relative w-full h-full duration-700 transform-style-3d transition-transform rounded-xl ${
            isFlipped ? 'rotate-y-180' : ''
          }`}
          title="انقر لقلب الغلاف بين الوجه والخلف"
        >
          {/* FRONT COVER (الوجه) */}
          <div className="absolute inset-0 w-full h-full backface-hidden rounded-xl overflow-hidden shadow-2xl border-2 border-amber-600/40 bg-stone-950 flex flex-col">
            <img
              src={book.frontCoverUrl}
              alt={`الغلاف الأمامي - ${book.title}`}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            {/* Realistic spine shadow effect on the right in RTL */}
            <div className="absolute top-0 right-0 bottom-0 w-4 bg-gradient-to-l from-black/60 to-transparent pointer-events-none"></div>
            {/* Glossy light reflection */}
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent pointer-events-none"></div>

            {/* Floating indicator: Front cover label */}
            <div className="absolute top-3 left-3 bg-stone-950/80 backdrop-blur-sm text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-md border border-amber-600/40">
              الوجه (الغلاف الأمامي)
            </div>

            {/* Quick action button overlay on hover */}
            <div className="absolute inset-0 bg-stone-950/75 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-4 text-center">
              <button
                onClick={handleReadClick}
                className="w-full py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shadow-lg flex items-center justify-center gap-2 transform translate-y-1 group-hover:translate-y-0 transition-all"
              >
                <BookOpen className="w-4 h-4" />
                <span>قراءة الكتاب الآن</span>
              </button>
              <button
                onClick={handleDownloadClick}
                disabled={isDownloading}
                className="w-full py-2 px-3 rounded-xl bg-amber-950/90 hover:bg-amber-900 text-amber-200 border border-amber-600/50 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all"
              >
                {downloadSuccess ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-300">تم التحميل بنجاح ✓</span>
                  </>
                ) : (
                  <>
                    <Download className={`w-3.5 h-3.5 ${isDownloading ? 'animate-bounce' : ''}`} />
                    <span>{isDownloading ? 'جاري التنزيل...' : 'تحميل نسخة PDF'}</span>
                  </>
                )}
              </button>
              <button
                onClick={toggleFlip}
                className="w-full py-1.5 px-3 rounded-xl bg-stone-900/90 hover:bg-stone-800 text-stone-300 text-[11px] border border-stone-700 flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-3 h-3" />
                <span>اقلب لرؤية الغلاف الخلفي</span>
              </button>
            </div>
          </div>

          {/* BACK COVER (الخلف) */}
          <div className="absolute inset-0 w-full h-full backface-hidden rotate-y-180 rounded-xl overflow-hidden shadow-2xl border-2 border-amber-600/40 bg-stone-950 flex flex-col">
            <img
              src={book.backCoverUrl}
              alt={`الغلاف الخلفي - ${book.title}`}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            {/* Realistic spine shadow effect on the left for back cover */}
            <div className="absolute top-0 left-0 bottom-0 w-4 bg-gradient-to-r from-black/60 to-transparent pointer-events-none"></div>

            {/* Floating indicator: Back cover label */}
            <div className="absolute top-3 right-3 bg-stone-950/80 backdrop-blur-sm text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-md border border-amber-600/40">
              الخلف (الغلاف الخلفي)
            </div>

            {/* Overlay summary for back cover */}
            <div className="absolute inset-x-3 bottom-3 p-3 rounded-lg bg-stone-950/90 backdrop-blur-md border border-amber-700/50 text-right">
              <div className="text-[10px] font-bold text-amber-300 mb-1 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                <span>من كلمة الغلاف الخلفي:</span>
              </div>
              <p className="text-[11px] text-stone-200 line-clamp-3 leading-relaxed">
                {book.backCoverBlurb}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Flip Toggle Button Bar */}
      <div className="flex items-center justify-between text-xs my-2">
        <button
          onClick={toggleFlip}
          className="flex items-center gap-1.5 text-amber-400 hover:text-amber-300 font-medium py-1 px-2 rounded-lg hover:bg-amber-950/50 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 transition-transform duration-500 ${isFlipped ? 'rotate-180 text-amber-300' : ''}`} />
          <span>{isFlipped ? 'عرض الغلاف الأمامي (الوجه)' : 'عرض الغلاف الخلفي (الظهر)'}</span>
        </button>
        <span className="text-[11px] text-stone-500">
          {isFlipped ? 'الخلف' : 'الوجه'}
        </span>
      </div>

      {/* Book Title & Info */}
      <div className="mt-1 mb-4 text-right">
        <h3
          onClick={handleDetailsClick}
          className="text-lg font-bold font-heading text-amber-100 hover:text-amber-300 cursor-pointer line-clamp-1 transition-colors"
          title={book.title}
        >
          {book.title}
        </h3>
        {book.subtitle && (
          <p className="text-xs text-amber-200/70 line-clamp-1 mt-0.5">
            {book.subtitle}
          </p>
        )}
        <p className="text-xs text-stone-400 line-clamp-2 mt-2 leading-relaxed">
          {book.description}
        </p>
      </div>

      {/* Primary Action Buttons */}
      <div className="space-y-2 pt-2 border-t border-stone-800">
        <div className="grid grid-cols-2 gap-2">
          <button
            id={`read-pdf-btn-${book.id}`}
            onClick={handleReadClick}
            className="py-2.5 px-3 rounded-xl bg-amber-600 hover:bg-amber-500 active:scale-98 text-stone-950 font-bold text-xs shadow-md flex items-center justify-center gap-1.5 transition-all"
          >
            <BookOpen className="w-3.5 h-3.5 shrink-0" />
            <span>قراءة الكتاب</span>
          </button>

          <button
            id={`download-pdf-btn-${book.id}`}
            onClick={handleDownloadClick}
            disabled={isDownloading}
            className="py-2.5 px-3 rounded-xl bg-amber-950/70 hover:bg-amber-900 active:scale-98 text-amber-200 text-xs border border-amber-600/50 flex items-center justify-center gap-1.5 transition-all font-medium"
            title="تنزيل نسخة PDF إلى جهازك"
          >
            {downloadSuccess ? (
              <>
                <Check className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                <span className="text-emerald-300 font-bold">تم التحميل ✓</span>
              </>
            ) : downloadNotice ? (
              <span className="text-amber-300 text-[11px] font-medium animate-in fade-in">{downloadNotice}</span>
            ) : (
              <>
                <Download className={`w-3.5 h-3.5 shrink-0 text-amber-400 ${isDownloading ? 'animate-bounce' : ''}`} />
                <span>{isDownloading ? 'جاري التحميل...' : 'تحميل PDF'}</span>
              </>
            )}
          </button>
        </div>

        <button
          onClick={handleDetailsClick}
          className="w-full py-2 px-3 rounded-xl bg-stone-900/90 hover:bg-stone-800 active:scale-98 text-stone-300 hover:text-stone-100 text-xs border border-stone-800 flex items-center justify-center gap-1.5 transition-all"
        >
          <Eye className="w-3.5 h-3.5 shrink-0 text-amber-400" />
          <span>استعراض بطاقة وتفاصيل الوجهين</span>
        </button>
      </div>
    </div>
  );
};
