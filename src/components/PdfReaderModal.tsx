import React, { useState, useEffect } from 'react';
import { Book } from '../types.ts';
import { 
  X, Download, ExternalLink, ChevronRight, ChevronLeft, 
  ZoomIn, ZoomOut, Maximize2, Minimize2, BookOpen, FileText, 
  Type, Sun, Moon, Sparkles, Bookmark, Search, RotateCcw, Check, Loader2
} from 'lucide-react';
import { downloadBookPdf } from '../utils/pdfDownload.ts';
import { fetchPdfFromCloud, dataUrlToBlob } from '../services/pdfCloudService.ts';
import { getPdfFromIndexedDb } from '../utils/pdfStorage.ts';

interface PdfReaderModalProps {
  book: Book | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PdfReaderModal: React.FC<PdfReaderModalProps> = ({
  book,
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'text' | 'pdf'>('text');
  const [currentChapterIdx, setCurrentChapterIdx] = useState(0);
  const [currentPageIdx, setCurrentPageIdx] = useState(0);
  const [fontSize, setFontSize] = useState<number>(18);
  const [readerTheme, setReaderTheme] = useState<'sepia' | 'dark' | 'light'>('sepia');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [searchInBook, setSearchInBook] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [pdfViewerUrl, setPdfViewerUrl] = useState<string | null>(null);
  const [pdfSource, setPdfSource] = useState<Blob | string | null>(null);
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);

  const handleDownload = async () => {
    if (!book) return;
    try {
      setIsDownloading(true);
      const res = await downloadBookPdf(book);
      if (res.success) {
        setDownloadSuccess(true);
        setTimeout(() => setDownloadSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Download error:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  useEffect(() => {
    if (book) {
      setCurrentChapterIdx(0);
      setCurrentPageIdx(0);
      setSearchInBook('');
      setPdfSource(null);
      setPdfViewerUrl(null);
      
      if (book.hasUploadedPdf || (book.pdfUrl && book.pdfUrl.startsWith('data:application/pdf'))) {
        setActiveTab('pdf');
      } else {
        setActiveTab('text');
      }
    }
  }, [book]);

  // Load PDF data URL / Blob for the direct PDF tab
  useEffect(() => {
    let active = true;
    let createdBlobUrl: string | null = null;

    async function loadPdf() {
      if (!book) return;

      // Helper to set and track blob url
      const setBlob = (blob: Blob) => {
        if (!active) return;
        createdBlobUrl = URL.createObjectURL(blob);
        setPdfViewerUrl(createdBlobUrl);
        setPdfSource(blob);
      };

      // 1. Direct external URL
      if (book.pdfUrl && (book.pdfUrl.startsWith('http://') || book.pdfUrl.startsWith('https://'))) {
        setPdfViewerUrl(book.pdfUrl);
        setPdfSource(book.pdfUrl);
        return;
      }

      // 2. Direct data URL in memory
      if (book.pdfUrl && book.pdfUrl.startsWith('data:application/pdf')) {
        setBlob(dataUrlToBlob(book.pdfUrl));
        return;
      }

      // 3. Check IndexedDB
      try {
        const local = await getPdfFromIndexedDb(book.id);
        if (local && active) {
          if (typeof local === 'string') {
            setBlob(dataUrlToBlob(local));
          } else {
            setBlob(local);
          }
          return;
        }
      } catch {
        // continue
      }

      // 4. Fetch from Cloud chunks
      if (active) setIsLoadingPdf(true);
      try {
        const cloudResult = await fetchPdfFromCloud(book.id);
        if (cloudResult && cloudResult.dataUrl && active) {
          setBlob(dataUrlToBlob(cloudResult.dataUrl));
        }
      } catch (err) {
        console.warn('Could not load PDF from cloud for reader:', err);
      } finally {
        if (active) setIsLoadingPdf(false);
      }
    }

    loadPdf();

    return () => {
      active = false;
      if (createdBlobUrl) {
        URL.revokeObjectURL(createdBlobUrl);
      }
    };
  }, [book?.id, book?.pdfUrl, book?.hasUploadedPdf]);

  if (!isOpen || !book) return null;

  const chapters = book.fullContent?.chapters || [
    {
      title: 'مقدمة الكتاب',
      pages: [
        `${book.description}\n\nهذا الكتاب لسماحة الشيخ صباح الركابي، يضم بين طياته بحوثاً ودراسات معمقة في هذا الباب، ويتاح هنا للقراءة الميسرة والتحميل بصيغة PDF.`,
        `من كلمة الغلاف الخلفي:\n${book.backCoverBlurb}`
      ]
    }
  ];

  const currentChapter = chapters[currentChapterIdx] || chapters[0];
  const totalPagesInChapter = currentChapter.pages.length;
  const currentPageText = currentChapter.pages[currentPageIdx] || currentChapter.pages[0];

  const handleNextPage = () => {
    if (currentPageIdx < totalPagesInChapter - 1) {
      setCurrentPageIdx(currentPageIdx + 1);
    } else if (currentChapterIdx < chapters.length - 1) {
      setCurrentChapterIdx(currentChapterIdx + 1);
      setCurrentPageIdx(0);
    }
  };

  const handlePrevPage = () => {
    if (currentPageIdx > 0) {
      setCurrentPageIdx(currentPageIdx - 1);
    } else if (currentChapterIdx > 0) {
      setCurrentChapterIdx(currentChapterIdx - 1);
      setCurrentPageIdx(chapters[currentChapterIdx - 1].pages.length - 1);
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const themeClasses = {
    sepia: 'bg-[#f6f1e8] text-[#3d3226] border-[#d8ccb8]',
    dark: 'bg-[#18181b] text-[#e4e4e7] border-[#27272a]',
    light: 'bg-[#ffffff] text-[#1c1917] border-[#e7e5e4]',
  };

  return (
    <div
      id="pdf-reader-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        id="pdf-reader-container"
        className={`w-full bg-stone-900 border border-amber-700/60 rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300 ${
          isFullscreen ? 'h-full max-w-full rounded-none' : 'max-w-5xl h-[92vh]'
        }`}
      >
        {/* Top Control Bar */}
        <div className="bg-stone-950 px-4 py-3 border-b border-stone-800 flex flex-wrap items-center justify-between gap-3 text-stone-200">
          
          {/* Book Title & Badge */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-amber-950 border border-amber-600/40 flex items-center justify-center text-amber-400 shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="min-w-0 text-right">
              <h2 className="text-sm sm:text-base font-bold text-amber-100 truncate font-heading">
                {book.title}
              </h2>
              <div className="text-[11px] text-stone-400 flex items-center gap-2">
                <span>{book.author}</span>
                <span>•</span>
                <span>{book.pages} صفحة</span>
              </div>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center bg-stone-900 p-1 rounded-xl border border-stone-800 text-xs">
            <button
              onClick={() => setActiveTab('text')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors ${
                activeTab === 'text'
                  ? 'bg-amber-600 text-stone-950 font-bold'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <Type className="w-3.5 h-3.5" />
              <span>مطالعة منسقة</span>
            </button>
            <button
              onClick={() => setActiveTab('pdf')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors ${
                activeTab === 'pdf'
                  ? 'bg-amber-600 text-stone-950 font-bold'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>عارض PDF المباشر</span>
            </button>
          </div>

          {/* Utility Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-300 text-xs font-medium border border-stone-700 transition-colors"
              title="تحميل ملف PDF إلى جهازك"
            >
              {downloadSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300">تم التحميل ✓</span>
                </>
              ) : (
                <>
                  <Download className={`w-3.5 h-3.5 ${isDownloading ? 'animate-bounce' : ''}`} />
                  <span className="hidden sm:inline">{isDownloading ? 'جاري التحميل...' : 'تحميل PDF'}</span>
                </>
              )}
            </button>

            <button
              onClick={toggleFullscreen}
              className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-stone-100 transition-colors"
              title={isFullscreen ? 'تصغير الشاشة' : 'ملء الشاشة'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-stone-800 hover:bg-red-900/60 text-stone-400 hover:text-red-200 transition-colors"
              title="إغلاق القارئ"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden relative flex flex-col">
          
          {/* TAB 1: SCHOLARLY READER MODE */}
          {activeTab === 'text' && (
            <div className="flex-1 flex flex-col overflow-hidden bg-stone-950">
              
              {/* Secondary Toolbar (Chapters, Font Size, Themes) */}
              <div className="bg-stone-900/90 px-4 py-2 border-b border-stone-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                
                {/* Chapter selector */}
                <div className="flex items-center gap-2">
                  <span className="text-stone-400">الفصل:</span>
                  <select
                    value={currentChapterIdx}
                    onChange={(e) => {
                      setCurrentChapterIdx(Number(e.target.value));
                      setCurrentPageIdx(0);
                    }}
                    className="bg-stone-950 text-stone-200 border border-stone-700 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-amber-500"
                  >
                    {chapters.map((chap, idx) => (
                      <option key={idx} value={idx}>
                        {chap.title}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Font Size & Theme controls */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 bg-stone-950 p-1 rounded-lg border border-stone-800">
                    <button
                      onClick={() => setFontSize(Math.max(14, fontSize - 2))}
                      className="px-2 py-0.5 text-stone-300 hover:text-white"
                      title="تصغير الخط"
                    >
                      A-
                    </button>
                    <span className="text-stone-400 text-[10px] px-1 font-mono">{fontSize}px</span>
                    <button
                      onClick={() => setFontSize(Math.min(28, fontSize + 2))}
                      className="px-2 py-0.5 text-stone-300 hover:text-white"
                      title="تكبير الخط"
                    >
                      A+
                    </button>
                  </div>

                  {/* Reading Themes */}
                  <div className="flex items-center gap-1 bg-stone-950 p-1 rounded-lg border border-stone-800">
                    <button
                      onClick={() => setReaderTheme('sepia')}
                      className={`w-6 h-5 rounded bg-[#f6f1e8] text-[#3d3226] text-[10px] font-bold ${
                        readerTheme === 'sepia' ? 'ring-2 ring-amber-500' : ''
                      }`}
                      title="نمط الورق الكلاسيكي (سيبيا)"
                    >
                      ورقي
                    </button>
                    <button
                      onClick={() => setReaderTheme('dark')}
                      className={`w-6 h-5 rounded bg-[#18181b] text-white text-[10px] font-bold ${
                        readerTheme === 'dark' ? 'ring-2 ring-amber-500' : ''
                      }`}
                      title="النمط الليلي"
                    >
                      ليلي
                    </button>
                    <button
                      onClick={() => setReaderTheme('light')}
                      className={`w-6 h-5 rounded bg-white text-black text-[10px] font-bold ${
                        readerTheme === 'light' ? 'ring-2 ring-amber-500' : ''
                      }`}
                      title="النمط النهاري"
                    >
                      فاتح
                    </button>
                  </div>
                </div>

              </div>

              {/* Text Page Display Container */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex justify-center">
                <div
                  className={`w-full max-w-3xl rounded-2xl p-6 sm:p-10 shadow-xl border transition-all duration-200 leading-loose text-right ${themeClasses[readerTheme]}`}
                  style={{ fontSize: `${fontSize}px` }}
                >
                  {/* Decorative Header */}
                  <div className="border-b pb-4 mb-6 text-center opacity-80">
                    <div className="text-xs font-semibold uppercase tracking-widest text-amber-700">
                      {book.title}
                    </div>
                    <h3 className="text-xl sm:text-2xl font-bold font-heading mt-1">
                      {currentChapter.title}
                    </h3>
                  </div>

                  {/* Body Text */}
                  <div className="whitespace-pre-line font-serif leading-relaxed text-justify">
                    {currentPageText}
                  </div>

                  {/* Page Footer */}
                  <div className="mt-12 pt-4 border-t flex items-center justify-between text-xs opacity-60">
                    <span>صفحة {currentPageIdx + 1} من {totalPagesInChapter}</span>
                    <span>سماحة الشيخ صباح الركابي</span>
                  </div>
                </div>
              </div>

              {/* Bottom Pagination Bar */}
              <div className="bg-stone-950 px-6 py-3 border-t border-stone-800 flex items-center justify-between text-stone-300">
                <button
                  onClick={handlePrevPage}
                  disabled={currentChapterIdx === 0 && currentPageIdx === 0}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 disabled:opacity-30 disabled:pointer-events-none text-xs font-semibold transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                  <span>الصفحة السابقة</span>
                </button>

                <div className="text-xs text-stone-400 font-mono">
                  فصل {currentChapterIdx + 1}/{chapters.length} • صفحة {currentPageIdx + 1}/{totalPagesInChapter}
                </div>

                <button
                  onClick={handleNextPage}
                  disabled={
                    currentChapterIdx === chapters.length - 1 &&
                    currentPageIdx === totalPagesInChapter - 1
                  }
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 disabled:opacity-30 disabled:pointer-events-none text-xs font-semibold transition-colors"
                >
                  <span>الصفحة التالية</span>
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>

            </div>
          )}

          {/* TAB 2: DIRECT PDF VIEWER EMBED */}
          {activeTab === 'pdf' && (
            <div className="flex-1 w-full h-full bg-stone-950 flex flex-col relative overflow-hidden">
              {isLoadingPdf ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-stone-400">
                  <Loader2 className="w-10 h-10 text-amber-500 animate-spin mb-3" />
                  <h4 className="text-base font-bold text-amber-200">جاري جلب ملف PDF الأصلي من السحابة...</h4>
                  <p className="text-xs text-stone-400 mt-1">يتم الآن تجهيز النسخة الأصلية وعرضها مباشرة بدون حظر</p>
                </div>
              ) : pdfViewerUrl ? (
                <iframe
                  src={pdfViewerUrl}
                  title={`قراءة ${book.title} بصيغة PDF`}
                  className="w-full flex-1 border-0"
                />
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-stone-400">
                  <FileText className="w-16 h-16 text-amber-600/60 mb-3" />
                  <h4 className="text-lg font-bold text-amber-200">لم يتم إرفاق ملف PDF لهذا الكتاب بعد</h4>
                  <p className="text-sm text-stone-400 max-w-md mt-1 mb-4">
                    يمكنك قراءة المحتوى الكامل للكتاب عبر تبويب "مطالعة منسقة"، أو رفع نسخة الـ PDF الأصلية من خلال لوحة الإدارة.
                  </p>
                  <button
                    onClick={() => setActiveTab('text')}
                    className="px-5 py-2.5 rounded-xl bg-amber-600 text-stone-950 font-bold text-xs"
                  >
                    الانتقال للمطالعة المنسقة
                  </button>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
