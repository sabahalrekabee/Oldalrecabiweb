import React, { useState } from 'react';
import { Book } from '../types.ts';
import { 
  X, Upload, Plus, Trash2, Edit3, CheckCircle2, AlertCircle, 
  FileText, Image as ImageIcon, BookOpen, Lock, LogOut, RotateCcw, 
  Sparkles, Layers, Loader2
} from 'lucide-react';
import { compressImage } from '../utils/imageCompressor.ts';
import { attachPdfToBook } from '../services/bookService.ts';
import greenFront from '../assets/images/book_cover_front_1789243050765.jpg';
import greenBack from '../assets/images/book_cover_back_1789243063176.jpg';
import burgundyFront from '../assets/images/cover_burgundy_front_1789243103990.jpg';
import burgundyBack from '../assets/images/cover_burgundy_back_1789243122982.jpg';
import blueFront from '../assets/images/cover_blue_front_1789243135691.jpg';
import blueBack from '../assets/images/cover_blue_back_1789243148075.jpg';

interface AdminUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  books: Book[];
  onAddBook: (newBook: Book, onProgress?: (percent: number) => void) => Promise<void> | void;
  onDeleteBook: (bookId: string) => Promise<void> | void;
  onResetDefaultBooks: () => Promise<void> | void;
  onLogout: () => void;
}

const PRESET_COVERS = [
  { name: 'جلد أخضر ملكي إسلامي', front: greenFront, back: greenBack },
  { name: 'جلد عودي فاخر مذهب', front: burgundyFront, back: burgundyBack },
  { name: 'جلد أزرق ملكي مزخرف', front: blueFront, back: blueBack },
];

export const AdminUploadModal: React.FC<AdminUploadModalProps> = ({
  isOpen,
  onClose,
  books,
  onAddBook,
  onDeleteBook,
  onResetDefaultBooks,
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'manage'>('upload');
  
  // Form State
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [category, setCategory] = useState('عقائد وكلام');
  const [author, setAuthor] = useState('سماحة الشيخ صباح الركابي');
  const [pages, setPages] = useState<number>(300);
  const [year, setYear] = useState('1446 هـ / 2025 م');
  const [description, setDescription] = useState('');
  const [backCoverBlurb, setBackCoverBlurb] = useState('');
  
  // Cover images (custom or presets)
  const [frontCoverUrl, setFrontCoverUrl] = useState(greenFront);
  const [backCoverUrl, setBackCoverUrl] = useState(greenBack);
  const [frontCoverName, setFrontCoverName] = useState<string | null>(null);
  const [backCoverName, setBackCoverName] = useState<string | null>(null);

  // PDF File
  const [pdfUrl, setPdfUrl] = useState<string>('');
  const [pdfFileName, setPdfFileName] = useState<string>('');

  // Status
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isCompressingFront, setIsCompressingFront] = useState(false);
  const [isCompressingBack, setIsCompressingBack] = useState(false);

  // Manage tab update state
  const [updatingBookId, setUpdatingBookId] = useState<string | null>(null);
  const [updatingProgress, setUpdatingProgress] = useState<number | null>(null);

  // Deleting and reset confirmation states
  const [confirmDeleteBookId, setConfirmDeleteBookId] = useState<string | null>(null);
  const [deletingBookId, setDeletingBookId] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  if (!isOpen) return null;

  // Handle Front Cover File Upload with automatic Canvas compression
  const handleFrontCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setErrorMessage('يرجى اختيار ملف صورة صالح (JPG, PNG, WebP)');
        return;
      }
      try {
        setIsCompressingFront(true);
        setErrorMessage(null);
        const compressed = await compressImage(file, 850, 0.82);
        setFrontCoverUrl(compressed);
        setFrontCoverName(`${file.name} (تم التحسين للويب ✓)`);
      } catch (err) {
        console.error('Error processing front cover image:', err);
        setErrorMessage('حدث خطأ أثناء معالجة صورة الغلاف الأمامي');
      } finally {
        setIsCompressingFront(false);
      }
    }
  };

  // Handle Back Cover File Upload with automatic Canvas compression
  const handleBackCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setErrorMessage('يرجى اختيار ملف صورة صالح (JPG, PNG, WebP)');
        return;
      }
      try {
        setIsCompressingBack(true);
        setErrorMessage(null);
        const compressed = await compressImage(file, 850, 0.82);
        setBackCoverUrl(compressed);
        setBackCoverName(`${file.name} (تم التحسين للويب ✓)`);
      } catch (err) {
        console.error('Error processing back cover image:', err);
        setErrorMessage('حدث خطأ أثناء معالجة صورة الغلاف الخلفي');
      } finally {
        setIsCompressingBack(false);
      }
    }
  };

  // Handle PDF File Upload
  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        setErrorMessage('يرجى اختيار ملف بصيغة PDF فقط');
        return;
      }
      setPdfFileName(file.name);
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setPdfUrl(reader.result);
          setSuccessMessage(`تم اختيار ملف PDF بنجاح: ${file.name}`);
          setTimeout(() => setSuccessMessage(null), 4000);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSelectPreset = (preset: typeof PRESET_COVERS[0]) => {
    setFrontCoverUrl(preset.front);
    setBackCoverUrl(preset.back);
    setFrontCoverName(preset.name);
    setBackCoverName(preset.name);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!title.trim()) {
      setErrorMessage('يرجى كتابة عنوان الكتاب');
      return;
    }
    if (!description.trim()) {
      setErrorMessage('يرجى كتابة نبذة عن الكتاب');
      return;
    }

    try {
      setIsSubmitting(true);
      setUploadProgress(null);

      const newBook: Book = {
        id: `book-${Date.now()}`,
        title: title.trim(),
        subtitle: subtitle.trim() || '',
        category,
        author: author.trim() || 'سماحة الشيخ صباح الركابي',
        pages: Number(pages) || 200,
        year: year.trim() || '1446 هـ / 2025 م',
        description: description.trim(),
        backCoverBlurb: backCoverBlurb.trim() || `كتاب ${title.trim()} لسماحة الشيخ صباح الركابي.`,
        frontCoverUrl,
        backCoverUrl,
        pdfUrl: pdfUrl || '',
        pdfFileName: pdfFileName || `${title.trim()}.pdf`,
        createdAt: new Date().toISOString(),
        fullContent: {
          chapters: [
            {
              title: 'مقدمة الكتاب والمدخل العام',
              pages: [
                `بسم الله الرحمن الرحيم\n\nنضع بين يدي القارئ الكريم كتاب «${title.trim()}» لسماحة الشيخ صباح الركابي.\n\n${description.trim()}`,
                `نبذة من الغلاف الخلفي:\n\n${backCoverBlurb.trim() || 'نسأل الله أن ينفع بهذا الأثر العلمي ويجعله ذخراً لطالبي المعرفة واليقين.'}`
              ]
            }
          ]
        }
      };

      await onAddBook(newBook, (progress) => {
        setUploadProgress(progress);
      });

      setSuccessMessage(`تم رفع ونشر كتاب «${title.trim()}» وحفظه في السحابة بنجاح!`);
      
      // Reset form fields
      setTitle('');
      setSubtitle('');
      setDescription('');
      setBackCoverBlurb('');
      setPdfUrl('');
      setPdfFileName('');
      setFrontCoverName(null);
      setBackCoverName(null);
      setUploadProgress(null);

      setTimeout(() => {
        setSuccessMessage(null);
        setActiveTab('manage');
      }, 1500);
    } catch (err) {
      console.error('Error adding book:', err);
      setErrorMessage(`تعذر حفظ الكتاب: ${err instanceof Error ? err.message : 'حدث خطأ في الاتصال بقاعدة البيانات'}`);
    } finally {
      setIsSubmitting(false);
      setUploadProgress(null);
    }
  };

  // Handle attaching or updating real PDF for an existing book in Firestore
  const handleAttachPdf = async (bookId: string, bookTitle: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setErrorMessage('يرجى اختيار ملف بصيغة PDF فقط');
      return;
    }

    try {
      setUpdatingBookId(bookId);
      setUpdatingProgress(0);
      setErrorMessage(null);

      const reader = new FileReader();
      reader.onload = async () => {
        if (typeof reader.result === 'string') {
          try {
            await attachPdfToBook(bookId, reader.result, file.name, (pct) => {
              setUpdatingProgress(pct);
            });
            setSuccessMessage(`تم رفع وتحديث ملف PDF الأصلي لكتاب «${bookTitle}» بنجاح!`);
            setTimeout(() => setSuccessMessage(null), 5000);
          } catch (uploadErr) {
            console.error('Failed to attach PDF to existing book:', uploadErr);
            setErrorMessage('فشل رفع ملف الـ PDF إلى السحابة، يرجى المحاولة ثانية');
          } finally {
            setUpdatingBookId(null);
            setUpdatingProgress(null);
          }
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Error reading PDF file:', err);
      setUpdatingBookId(null);
      setUpdatingProgress(null);
    }
  };

  return (
    <div
      id="admin-upload-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
    >
      <div
        id="admin-upload-card"
        className="w-full max-w-4xl bg-stone-900 border border-amber-600/70 rounded-2xl shadow-2xl overflow-hidden text-stone-100 my-auto relative flex flex-col max-h-[92vh]"
      >
        {/* Header Ribbon */}
        <div className="h-1.5 bg-gradient-to-r from-amber-600 via-amber-400 to-amber-600"></div>

        {/* Top Header Bar */}
        <div className="bg-stone-950 px-6 py-4 border-b border-stone-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-950/90 border border-amber-600/60 flex items-center justify-center text-amber-400 shadow">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-amber-100 font-heading">
                  لوحة إدارة ورفع كتب الشيخ صباح الركابي
                </h3>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700/60">
                  كلمة المرور صحيحة ✓
                </span>
              </div>
              <p className="text-xs text-stone-400">
                منطقة خاصة لإضافة الكتب بأغلفتها الأمامية والخلفية وملفات الـ PDF
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onLogout}
              className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-red-300 text-xs flex items-center gap-1.5 transition-colors border border-stone-700"
              title="قفل وتسجيل الخروج"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>قفل الجلسة</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-stone-100 transition-colors"
              title="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs Bar */}
        <div className="bg-stone-900/90 px-6 py-2 border-b border-stone-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('upload')}
              className={`px-4 py-2 rounded-xl font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'upload'
                  ? 'bg-amber-600 text-stone-950 shadow-md'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>رفع كتاب جديد</span>
            </button>
            <button
              onClick={() => setActiveTab('manage')}
              className={`px-4 py-2 rounded-xl font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'manage'
                  ? 'bg-amber-600 text-stone-950 shadow-md'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>إدارة الكتب المنشورة ({books.length})</span>
            </button>
          </div>

          <button
            onClick={() => {
              setShowResetConfirm(true);
              setErrorMessage(null);
            }}
            className="text-[11px] text-stone-400 hover:text-amber-300 flex items-center gap-1 transition-colors px-2 py-1 rounded-lg hover:bg-stone-850"
            title="استعادة الكتب الافتراضية الأصلية لسماحة الشيخ"
          >
            <RotateCcw className="w-3 h-3" />
            <span>استعادة الكتب الافتراضية</span>
          </button>
        </div>

        {/* Reset Confirmation Banner */}
        {showResetConfirm && (
          <div className="mx-6 mt-4 p-4 rounded-xl bg-amber-950/90 border border-amber-600/70 text-amber-100 text-xs flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-amber-400 shrink-0" />
              <span>هل تريد استعادة الكتب الافتراضية الأصلية ومزامنتها لجميع الأجهزة؟</span>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                onClick={async () => {
                  try {
                    setIsResetting(true);
                    await onResetDefaultBooks();
                    setShowResetConfirm(false);
                    setSuccessMessage('تم استعادة الكتب الافتراضية بنجاح إلى قاعدة البيانات.');
                    setTimeout(() => setSuccessMessage(null), 4000);
                  } catch {
                    setErrorMessage('حدث خطأ أثناء استعادة الكتب الافتراضية.');
                  } finally {
                    setIsResetting(false);
                  }
                }}
                disabled={isResetting}
                className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs flex items-center gap-1 transition-all"
              >
                {isResetting && <Loader2 className="w-3 h-3 animate-spin" />}
                <span>نعم، استعادة الكتب</span>
              </button>
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        )}

        {/* Alerts */}
        {successMessage && (
          <div className="mx-6 mt-4 p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-600/70 text-emerald-200 text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-semibold">{successMessage}</span>
          </div>
        )}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3.5 rounded-xl bg-red-950/80 border border-red-600/70 text-red-200 text-xs flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span className="font-semibold">{errorMessage}</span>
          </div>
        )}

        {/* Tab 1: Upload Form */}
        {activeTab === 'upload' && (
          <div className="flex-1 overflow-y-auto p-6 text-right">
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Row 1: Title & Subtitle */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-300 mb-1.5">
                    عنوان الكتاب <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="مثال: بحوث في العقيدة والتوحيد..."
                    className="w-full px-4 py-2.5 bg-stone-950 border border-stone-700 rounded-xl text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500 text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-300 mb-1.5">
                    العنوان الفرعي أو موضوع البحث
                  </label>
                  <input
                    type="text"
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                    placeholder="مثال: دراسة استدلالية مقارنة..."
                    className="w-full px-4 py-2.5 bg-stone-950 border border-stone-700 rounded-xl text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500 text-sm"
                  />
                </div>
              </div>

              {/* Row 2: Category, Author, Pages, Year */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-300 mb-1.5">
                    التصنيف
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2.5 bg-stone-950 border border-stone-700 rounded-xl text-stone-100 focus:outline-none focus:border-amber-500 text-sm"
                  >
                    <option value="عقائد وكلام">عقائد وكلام</option>
                    <option value="فقه وأصول">فقه وأصول</option>
                    <option value="سيرة وتاريخ">سيرة وتاريخ</option>
                    <option value="أخلاق وتزكية">أخلاق وتزكية</option>
                    <option value="بحوث معاصرة">بحوث معاصرة</option>
                    <option value="خطب ومحاضرات">خطب ومحاضرات</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-300 mb-1.5">
                    المؤلف
                  </label>
                  <input
                    type="text"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    className="w-full px-3 py-2.5 bg-stone-950 border border-stone-700 rounded-xl text-stone-100 focus:outline-none focus:border-amber-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-300 mb-1.5">
                    عدد الصفحات
                  </label>
                  <input
                    type="number"
                    value={pages}
                    onChange={(e) => setPages(Number(e.target.value))}
                    min="1"
                    className="w-full px-3 py-2.5 bg-stone-950 border border-stone-700 rounded-xl text-stone-100 focus:outline-none focus:border-amber-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-300 mb-1.5">
                    سنة الإصدار
                  </label>
                  <input
                    type="text"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    placeholder="1446 هـ / 2025 م"
                    className="w-full px-3 py-2.5 bg-stone-950 border border-stone-700 rounded-xl text-stone-100 focus:outline-none focus:border-amber-500 text-sm"
                  />
                </div>
              </div>

              {/* Row 3: Descriptions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-300 mb-1.5">
                    نبذة عن الكتاب <span className="text-amber-400">*</span>
                  </label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="ملخص محتوى الكتاب وأهم المحاور التي يتناولها..."
                    className="w-full px-4 py-2.5 bg-stone-950 border border-stone-700 rounded-xl text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500 text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-300 mb-1.5">
                    كلمة الغلاف الخلفي للكتاب (الظهر)
                  </label>
                  <textarea
                    rows={3}
                    value={backCoverBlurb}
                    onChange={(e) => setBackCoverBlurb(e.target.value)}
                    placeholder="النص المكتوب على ظهر الغلاف، مقتطف بارز أو كلمة الناشر..."
                    className="w-full px-4 py-2.5 bg-stone-950 border border-stone-700 rounded-xl text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500 text-sm"
                  />
                </div>
              </div>

              {/* Row 4: COVERS SECTION (الوجه والخلف) */}
              <div className="p-4 rounded-xl bg-stone-950/80 border border-stone-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-amber-300 flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" />
                    <span>أغلفة الكتاب: الوجه (الأمامي) والخلف (الظهري)</span>
                  </h4>

                  {/* Preset Selector */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-stone-400">أو اختر تصميماً إسلامياً جاهزاً:</span>
                    {PRESET_COVERS.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectPreset(preset)}
                        className="px-2 py-1 rounded bg-stone-800 hover:bg-stone-700 text-amber-300 text-[11px] border border-amber-900/40"
                      >
                        {preset.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Front Cover Input */}
                  <div className="border border-dashed border-stone-700 rounded-xl p-3 flex flex-col items-center text-center bg-stone-900/40">
                    <span className="text-xs font-bold text-amber-200 mb-2">صورة الغلاف الأمامي (الوجه)</span>
                    <div className="w-20 aspect-[3/4] rounded-lg overflow-hidden border border-amber-600/40 mb-2 shadow">
                      <img
                        src={frontCoverUrl}
                        alt="معاينة الغلاف الأمامي"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <label className="cursor-pointer px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-xs text-stone-300 border border-stone-600 transition-colors">
                      <span>{frontCoverName ? 'تغيير الصورة' : 'رفع صورة من جهازك'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFrontCoverUpload}
                        className="hidden"
                      />
                    </label>
                    <input
                      type="text"
                      value={frontCoverUrl.startsWith('data:') ? '' : frontCoverUrl}
                      onChange={(e) => setFrontCoverUrl(e.target.value)}
                      placeholder="أو أدخل رابط صورة خارجي..."
                      className="w-full mt-2 px-2.5 py-1 text-xs bg-stone-950 border border-stone-800 rounded text-stone-300 text-left"
                      dir="ltr"
                    />
                  </div>

                  {/* Back Cover Input */}
                  <div className="border border-dashed border-stone-700 rounded-xl p-3 flex flex-col items-center text-center bg-stone-900/40">
                    <span className="text-xs font-bold text-amber-200 mb-2">صورة الغلاف الخلفي (الخلف)</span>
                    <div className="w-20 aspect-[3/4] rounded-lg overflow-hidden border border-amber-600/40 mb-2 shadow">
                      <img
                        src={backCoverUrl}
                        alt="معاينة الغلاف الخلفي"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <label className="cursor-pointer px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-xs text-stone-300 border border-stone-600 transition-colors">
                      <span>{backCoverName ? 'تغيير الصورة' : 'رفع صورة من جهازك'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleBackCoverUpload}
                        className="hidden"
                      />
                    </label>
                    <input
                      type="text"
                      value={backCoverUrl.startsWith('data:') ? '' : backCoverUrl}
                      onChange={(e) => setBackCoverUrl(e.target.value)}
                      placeholder="أو أدخل رابط صورة خارجي..."
                      className="w-full mt-2 px-2.5 py-1 text-xs bg-stone-950 border border-stone-800 rounded text-stone-300 text-left"
                      dir="ltr"
                    />
                  </div>
                </div>
              </div>

              {/* Row 5: PDF FILE UPLOAD */}
              <div className="p-4 rounded-xl bg-stone-950/80 border border-stone-800 space-y-3">
                <h4 className="text-sm font-bold text-amber-300 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  <span>ملف الكتاب الإلكتروني بصيغة PDF</span>
                </h4>
                <p className="text-xs text-stone-400">
                  ارفع ملف PDF من جهازك ليتمكن الزوار من قراءته مباشرة وتحميله
                </p>

                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <label className="w-full sm:w-auto cursor-pointer px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs flex items-center justify-center gap-2 transition-colors">
                    <Upload className="w-4 h-4" />
                    <span>{pdfFileName ? `تم اختيار: ${pdfFileName}` : 'رفع ملف PDF من جهازك'}</span>
                    <input
                      type="file"
                      accept="application/pdf,.pdf"
                      onChange={handlePdfUpload}
                      className="hidden"
                    />
                  </label>

                  <span className="text-stone-500 text-xs">أو</span>

                  <input
                    type="url"
                    value={pdfUrl.startsWith('data:') ? '' : pdfUrl}
                    onChange={(e) => {
                      setPdfUrl(e.target.value);
                      setPdfFileName('book-document.pdf');
                    }}
                    placeholder="أدخل رابط مباشر لملف PDF (URL)..."
                    className="flex-1 w-full px-3 py-2 bg-stone-900 border border-stone-700 rounded-xl text-xs text-stone-200 text-left font-mono"
                    dir="ltr"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="submit"
                  disabled={isSubmitting || isCompressingFront || isCompressingBack}
                  className="py-3 px-8 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-60 disabled:cursor-not-allowed text-stone-950 font-bold text-sm shadow-xl flex items-center gap-2 transition-all active:scale-98"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-stone-950" />
                      <span>
                        {uploadProgress !== null
                          ? `جاري رفع ملف الـ PDF سحابياً (${uploadProgress}%)...`
                          : 'جاري حفظ ومزامنة الكتاب بالسحابة...'}
                      </span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>نشر وحفظ الكتاب في المكتبة</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>
        )}

        {/* Tab 2: Manage Books */}
        {activeTab === 'manage' && (
          <div className="flex-1 overflow-y-auto p-6 text-right space-y-3">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-bold text-stone-300">
                الكتب الحالية في المكتبة ({books.length} كتاب)
              </h4>
              <span className="text-xs text-stone-400">
                يمكنك تحديث أو إرفاق ملفات PDF الأصلية لأي كتاب مباشرة لمزامنته سحابياً
              </span>
            </div>

            {books.length === 0 ? (
              <div className="py-12 text-center bg-stone-950/40 rounded-xl border border-stone-850 p-6">
                <BookOpen className="w-10 h-10 text-stone-600 mx-auto mb-2" />
                <h5 className="font-bold text-stone-300 text-sm">المكتبة فارغة حالياً</h5>
                <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
                  تم حذف جميع الكتب أو لم تتم إضافة أي كتب بعد. يمكنك رفع كتاب جديد أو استعادة الكتب الافتراضية.
                </p>
                <button
                  onClick={() => setShowResetConfirm(true)}
                  className="mt-3 px-3 py-1.5 rounded-lg bg-amber-600/90 hover:bg-amber-600 text-stone-950 font-bold text-xs transition-colors"
                >
                  استعادة الكتب الافتراضية
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {books.map((b) => (
                  <div
                    key={b.id}
                    className="p-3.5 rounded-xl bg-stone-950/70 border border-stone-800 hover:border-amber-700/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 aspect-[3/4] rounded-lg overflow-hidden border border-stone-700 shrink-0">
                        <img
                          src={b.frontCoverUrl}
                          alt={b.title}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div>
                        <h5 className="font-bold text-amber-200 text-sm">{b.title}</h5>
                        <div className="text-xs text-stone-400 mt-1 flex flex-wrap items-center gap-2">
                          <span>{b.category}</span>
                          <span>•</span>
                          <span>{b.pages} صفحة</span>
                          <span>•</span>
                          {b.hasUploadedPdf ? (
                            <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>PDF سحابي مزامن ✓</span>
                            </span>
                          ) : (
                            <span className="text-amber-400/90 font-medium">لم يُرفع PDF بعد</span>
                          )}
                          {b.pdfFileName && (
                            <span className="text-stone-500 font-mono text-[11px]">({b.pdfFileName})</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      {/* Attach / Update PDF button */}
                      <label
                        className={`cursor-pointer px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                          updatingBookId === b.id
                            ? 'bg-amber-600/30 border-amber-500 text-amber-300'
                            : 'bg-stone-900 hover:bg-stone-800 text-amber-300 border-amber-600/40'
                        }`}
                        title="رفع أو تحديث ملف PDF الأصلي لهذا الكتاب وحفظه سحابياً"
                      >
                        {updatingBookId === b.id ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                            <span>جاري رفع الـ PDF ({updatingProgress || 0}%)...</span>
                          </>
                        ) : (
                          <>
                            <Upload className="w-3.5 h-3.5 text-amber-400" />
                            <span>{b.hasUploadedPdf ? 'تحديث ملف PDF' : 'إرفاق ملف PDF'}</span>
                          </>
                        )}
                        <input
                          type="file"
                          accept="application/pdf,.pdf"
                          disabled={updatingBookId === b.id}
                          onChange={(e) => handleAttachPdf(b.id, b.title, e)}
                          className="hidden"
                        />
                      </label>

                      {/* Delete Book button with inline confirmation (no window.confirm) */}
                      {confirmDeleteBookId === b.id ? (
                        <div className="flex items-center gap-1.5 bg-red-950/90 p-1 rounded-lg border border-red-700 animate-in fade-in">
                          <button
                            onClick={async () => {
                              setDeletingBookId(b.id);
                              setConfirmDeleteBookId(null);
                              try {
                                await onDeleteBook(b.id);
                                setSuccessMessage(`تم حذف كتاب «${b.title}» بنجاح من قاعدة البيانات.`);
                                setTimeout(() => setSuccessMessage(null), 4000);
                              } catch (err) {
                                setErrorMessage('حدث خطأ أثناء حذف الكتاب من قاعدة البيانات.');
                              } finally {
                                setDeletingBookId(null);
                              }
                            }}
                            disabled={deletingBookId === b.id}
                            className="px-2.5 py-1.5 rounded-md bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center gap-1 shadow-md transition-all active:scale-95"
                            title="تأكيد حذف هذا الكتاب نهائياً"
                          >
                            {deletingBookId === b.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                            <span>تأكيد الحذف</span>
                          </button>
                          <button
                            onClick={() => setConfirmDeleteBookId(null)}
                            className="px-2 py-1.5 rounded-md bg-stone-850 hover:bg-stone-700 text-stone-300 text-xs transition-colors"
                          >
                            إلغاء
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setConfirmDeleteBookId(b.id);
                            setErrorMessage(null);
                          }}
                          disabled={deletingBookId === b.id}
                          className="p-2 rounded-lg bg-stone-900 hover:bg-red-950/80 text-stone-400 hover:text-red-300 border border-stone-800 hover:border-red-800/60 text-xs transition-colors flex items-center gap-1.5"
                          title="حذف الكتاب"
                        >
                          <Trash2 className="w-4 h-4 text-red-400/90" />
                          <span className="text-red-300/80 text-xs">حذف</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
