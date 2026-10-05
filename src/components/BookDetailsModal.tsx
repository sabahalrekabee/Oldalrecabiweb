import React, { useState } from 'react';
import { Book } from '../types.ts';
import { X, BookOpen, Download, Calendar, Layers, User, Sparkles, Share2, Check, Trash2, Loader2 } from 'lucide-react';
import { downloadBookPdf } from '../utils/pdfDownload.ts';

interface BookDetailsModalProps {
  book: Book | null;
  isOpen: boolean;
  onClose: () => void;
  onReadPdf: (book: Book) => void;
  isAdminUnlocked?: boolean;
  onDeleteBook?: (bookId: string) => Promise<void> | void;
}

export const BookDetailsModal: React.FC<BookDetailsModalProps> = ({
  book,
  isOpen,
  onClose,
  onReadPdf,
  isAdminUnlocked = false,
  onDeleteBook,
}) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen || !book) return null;

  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      setDownloadError(null);
      const res = await downloadBookPdf(book);
      if (res.success) {
        setDownloadSuccess(true);
        setTimeout(() => setDownloadSuccess(false), 3000);
      } else if (res.message) {
        setDownloadError(res.message);
        setTimeout(() => setDownloadError(null), 5000);
      }
    } catch (err) {
      console.error('Download failed:', err);
      setDownloadError('حدث خطأ أثناء محاولة التنزيل');
      setTimeout(() => setDownloadError(null), 4000);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div
      id="book-details-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="book-details-card"
        className="w-full max-w-4xl bg-stone-900 border border-amber-700/60 rounded-2xl shadow-2xl overflow-hidden text-stone-100 my-auto relative"
      >
        {/* Top gold accent line */}
        <div className="h-1.5 bg-gradient-to-r from-amber-600 via-amber-400 to-amber-600"></div>

        {/* Close button */}
        <button
          id="close-book-details-btn"
          onClick={onClose}
          className="absolute top-4 left-4 z-10 p-2 rounded-xl bg-stone-950/70 hover:bg-stone-800 text-stone-400 hover:text-stone-100 border border-stone-800 transition-colors"
          title="إغلاق"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-5 sm:p-8 max-h-[85vh] overflow-y-auto">
          {/* Header Title & Author */}
          <div className="mb-6 text-right">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-amber-950 text-amber-300 border border-amber-800/80">
                {book.category}
              </span>
              <span className="text-xs text-stone-400">
                المؤلف: {book.author}
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold font-heading text-amber-100">
              {book.title}
            </h2>
            {book.subtitle && (
              <p className="text-sm sm:text-base text-amber-200/80 mt-1">
                {book.subtitle}
              </p>
            )}
          </div>

          {/* DUAL COVERS DISPLAY: الوجه والخلف جنباً إلى جنب */}
          <div className="mb-8">
            <div className="text-xs font-bold text-amber-400 mb-3 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>استعراض وجهي الكتاب (الغلاف الأمامي والغلاف الخلفي):</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-stone-950/70 p-4 sm:p-6 rounded-2xl border border-stone-800">
              
              {/* FRONT COVER */}
              <div className="flex flex-col items-center">
                <div className="relative w-full max-w-[280px] aspect-[3/4] rounded-xl overflow-hidden shadow-2xl border-2 border-amber-600/50 group">
                  <img
                    src={book.frontCoverUrl}
                    alt={`الغلاف الأمامي - ${book.title}`}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-2 right-2 bg-stone-950/80 backdrop-blur-sm text-amber-300 text-xs font-bold px-2.5 py-1 rounded-md border border-amber-600/40">
                    الوجه (الغلاف الأمامي)
                  </div>
                </div>
                <p className="text-xs text-stone-400 mt-2 font-medium">الغلاف الأمامي متضمناً العنوان الرسمي والزخارف</p>
              </div>

              {/* BACK COVER */}
              <div className="flex flex-col items-center">
                <div className="relative w-full max-w-[280px] aspect-[3/4] rounded-xl overflow-hidden shadow-2xl border-2 border-amber-600/50 group">
                  <img
                    src={book.backCoverUrl}
                    alt={`الغلاف الخلفي - ${book.title}`}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-2 right-2 bg-stone-950/80 backdrop-blur-sm text-amber-300 text-xs font-bold px-2.5 py-1 rounded-md border border-amber-600/40">
                    الخلف (الغلاف الخلفي)
                  </div>
                </div>
                <p className="text-xs text-stone-400 mt-2 font-medium">الغلاف الخلفي متضمناً كلمة الناشر والملخص</p>
              </div>

            </div>
          </div>

          {/* Book Metadata & Description */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Description & Back Blurb (2 cols) */}
            <div className="md:col-span-2 space-y-4 text-right">
              <div className="bg-stone-950/60 p-4 rounded-xl border border-stone-800">
                <h4 className="text-sm font-bold text-amber-300 mb-2">نبذة تفصيلية عن الكتاب:</h4>
                <p className="text-sm text-stone-300 leading-relaxed">
                  {book.description}
                </p>
              </div>

              <div className="bg-amber-950/20 p-4 rounded-xl border border-amber-800/40">
                <h4 className="text-sm font-bold text-amber-400 mb-2">مقتطف من كلمة الغلاف الخلفي:</h4>
                <p className="text-sm text-amber-100/90 leading-relaxed italic font-heading">
                  {book.backCoverBlurb}
                </p>
              </div>
            </div>

            {/* Quick Specs (1 col) */}
            <div className="bg-stone-950/60 p-4 rounded-xl border border-stone-800 space-y-3.5 text-right">
              <h4 className="text-xs font-bold text-stone-400 uppercase tracking-wider">بطاقة البيانات</h4>

              <div className="flex items-center justify-between text-xs py-1.5 border-b border-stone-800">
                <span className="text-stone-400">المؤلف:</span>
                <span className="font-semibold text-amber-200">{book.author}</span>
              </div>

              <div className="flex items-center justify-between text-xs py-1.5 border-b border-stone-800">
                <span className="text-stone-400">عدد الصفحات:</span>
                <span className="font-semibold text-stone-200">{book.pages} صفحة</span>
              </div>

              <div className="flex items-center justify-between text-xs py-1.5 border-b border-stone-800">
                <span className="text-stone-400">سنة الإصدار:</span>
                <span className="font-semibold text-stone-200">{book.year || 'غير محدد'}</span>
              </div>

              <div className="flex items-center justify-between text-xs py-1.5 border-b border-stone-800">
                <span className="text-stone-400">التصنيف:</span>
                <span className="font-semibold text-amber-400">{book.category}</span>
              </div>

              <div className="flex items-center justify-between text-xs py-1.5">
                <span className="text-stone-400">صيغة القراءة:</span>
                <span className="font-semibold text-emerald-400">PDF إلكتروني ميسر</span>
              </div>
            </div>

          </div>

          {/* Alerts */}
          {downloadError && (
            <div className="mb-4 p-3 rounded-xl bg-amber-950/70 border border-amber-600/50 text-amber-200 text-xs text-right animate-in fade-in">
              {downloadError}
            </div>
          )}

          {/* Admin Delete Bar if unlocked */}
          {isAdminUnlocked && onDeleteBook && (
            <div className="mb-4 p-3 rounded-xl bg-red-950/40 border border-red-800/40 flex items-center justify-between gap-3 text-xs">
              <span className="text-red-300 font-medium">خيارات الإدارة لهذا الكتاب:</span>
              {confirmDelete ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={async () => {
                      try {
                        setIsDeleting(true);
                        await onDeleteBook(book.id);
                        onClose();
                      } catch (err) {
                        console.error('Failed to delete book:', err);
                      } finally {
                        setIsDeleting(false);
                      }
                    }}
                    disabled={isDeleting}
                    className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold flex items-center gap-1.5 transition-all shadow-md"
                  >
                    {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    <span>تأكيد الحذف النهائي</span>
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 transition-colors"
                  >
                    إلغاء
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="px-3 py-1.5 rounded-lg bg-red-950/80 hover:bg-red-900 border border-red-700/60 text-red-200 flex items-center gap-1.5 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  <span>حذف الكتاب من المكتبة</span>
                </button>
              )}
            </div>
          )}

          {/* Bottom Action Footer */}
          <div className="mt-8 pt-5 border-t border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <button
              onClick={() => {
                onClose();
                onReadPdf(book);
              }}
              className="w-full sm:w-auto flex-1 py-3 px-6 rounded-xl bg-amber-600 hover:bg-amber-500 active:scale-98 text-stone-950 font-bold text-sm shadow-xl flex items-center justify-center gap-2 transition-all"
            >
              <BookOpen className="w-4 h-4" />
              <span>قراءة الكتاب الآن بصيغة PDF</span>
            </button>

            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="w-full sm:w-auto py-3 px-6 rounded-xl bg-stone-800 hover:bg-stone-700 text-amber-300 text-sm border border-stone-700 font-medium flex items-center justify-center gap-2 transition-colors active:scale-98"
              title="تنزيل ملف PDF إلى جهازك"
            >
              {downloadSuccess ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-300 font-bold">تم التحميل بنجاح ✓</span>
                </>
              ) : (
                <>
                  <Download className={`w-4 h-4 ${isDownloading ? 'animate-bounce' : ''}`} />
                  <span>{isDownloading ? 'جاري التنزيل...' : 'تحميل نسخة PDF'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
