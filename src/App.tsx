import React, { useState, useEffect } from 'react';
import { Book } from './types.ts';
import { getStoredBooks, isUserAuthenticated, setUserAuthenticated } from './utils/storage.ts';
import { INITIAL_BOOKS } from './data/initialBooks.ts';
import { 
  subscribeToBooks, 
  addBookToFirestore, 
  deleteBookFromFirestore, 
  resetBooksInFirestore 
} from './services/bookService.ts';
import { Header } from './components/Header.tsx';
import { CornerTrigger } from './components/CornerTrigger.tsx';
import { BookCard } from './components/BookCard.tsx';
import { BookDetailsModal } from './components/BookDetailsModal.tsx';
import { PdfReaderModal } from './components/PdfReaderModal.tsx';
import { PasswordPromptModal } from './components/PasswordPromptModal.tsx';
import { AdminUploadModal } from './components/AdminUploadModal.tsx';
import { BookOpen } from 'lucide-react';

export default function App() {
  const [books, setBooks] = useState<Book[]>(getStoredBooks);
  const [isCloudConnected, setIsCloudConnected] = useState(true);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  
  // Modals state
  const [selectedBookForDetails, setSelectedBookForDetails] = useState<Book | null>(null);
  const [selectedBookForPdf, setSelectedBookForPdf] = useState<Book | null>(null);
  const [isPasswordPromptOpen, setIsPasswordPromptOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(isUserAuthenticated);

  // Subscribe to real-time changes in Firestore so all devices stay in sync
  useEffect(() => {
    const unsubscribe = subscribeToBooks(
      (updatedBooks) => {
        setBooks(updatedBooks);
        setIsInitialLoading(false);
        setIsCloudConnected(true);
      },
      (err) => {
        console.warn('Firestore real-time sync notification:', err);
        setIsInitialLoading(false);
        setIsCloudConnected(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Handle double-click on the top-right corner
  const handleCornerTrigger = () => {
    if (isAdminUnlocked) {
      // Already unlocked in current session
      setIsAdminModalOpen(true);
    } else {
      // Require password "Recabi"
      setIsPasswordPromptOpen(true);
    }
  };

  // Password success handler
  const handlePasswordSuccess = () => {
    setUserAuthenticated(true);
    setIsAdminUnlocked(true);
    setIsPasswordPromptOpen(false);
    setIsAdminModalOpen(true);
  };

  const handleLogout = () => {
    setUserAuthenticated(false);
    setIsAdminUnlocked(false);
    setIsAdminModalOpen(false);
  };

  // Add new book from admin modal and sync to Firestore
  const handleAddBook = async (newBook: Book, onProgress?: (percent: number) => void) => {
    try {
      const savedBook = await addBookToFirestore(newBook, onProgress);
      setBooks((prev) => [savedBook, ...prev.filter((b) => b.id !== savedBook.id)]);
    } catch (err) {
      console.error('Failed to sync new book to Firestore:', err);
      // Keep optimistic local copy
      setBooks((prev) => [newBook, ...prev.filter((b) => b.id !== newBook.id)]);
      throw err;
    }
  };

  // Delete book from Firestore
  const handleDeleteBook = async (bookId: string) => {
    setBooks((prev) => prev.filter((b) => b.id !== bookId));
    try {
      await deleteBookFromFirestore(bookId);
    } catch (err) {
      console.error('Failed to delete book from Firestore:', err);
    }
  };

  // Reset to initial books in Firestore
  const handleResetDefaultBooks = async () => {
    setBooks(INITIAL_BOOKS);
    try {
      await resetBooksInFirestore();
    } catch (err) {
      console.error('Failed to reset books in Firestore:', err);
    }
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col selection:bg-amber-500 selection:text-stone-950">
      
      {/* Top-Right Secret Corner Double-Click Trigger */}
      <CornerTrigger
        onTrigger={handleCornerTrigger}
        isAdminUnlocked={isAdminUnlocked}
      />

      {/* Website Header with Sheikh's Circular Portrait on Left */}
      <Header
        booksCount={books.length}
        isAdminUnlocked={isAdminUnlocked}
        isCloudConnected={isCloudConnected}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Books Grid with 3D Flip Cards or Empty State */}
        {isInitialLoading && books.length === 0 ? (
          <div className="py-20 text-center flex flex-col items-center justify-center">
            <div className="w-10 h-10 border-3 border-amber-600 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-sm text-stone-400">جاري الاتصال بالسحابة ومزامنة الكتب...</p>
          </div>
        ) : books.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {books.map((book) => (
              <BookCard
                key={book.id}
                book={book}
                onReadPdf={(b) => setSelectedBookForPdf(b)}
                onViewDetails={(b) => setSelectedBookForDetails(b)}
              />
            ))}
          </div>
        ) : (
          <div className="py-16 text-center bg-stone-900/40 rounded-2xl border border-stone-800 p-8">
            <BookOpen className="w-12 h-12 text-stone-600 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-stone-300">لا توجد كتب حالياً</h3>
            <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
              المكتبة فارغة حالياً. يمكنك استعادة المجموعة الكاملة لمؤلفات الشيخ أو إضافة كتب جديدة عبر لوحة الإدارة.
            </p>
            <button
              onClick={handleResetDefaultBooks}
              className="mt-4 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs transition-colors"
            >
              استعادة كتب الشيخ صباح الركابي
            </button>
          </div>
        )}

      </main>

      {/* Modals */}
      
      {/* 1. Top-Right Corner Password Prompt (Recabi) */}
      <PasswordPromptModal
        isOpen={isPasswordPromptOpen}
        onClose={() => setIsPasswordPromptOpen(false)}
        onSuccess={handlePasswordSuccess}
      />

      {/* 2. Admin Upload Page/Modal */}
      <AdminUploadModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        books={books}
        onAddBook={handleAddBook}
        onDeleteBook={handleDeleteBook}
        onResetDefaultBooks={handleResetDefaultBooks}
        onLogout={handleLogout}
      />

      {/* 3. Dual Covers Details Modal */}
      <BookDetailsModal
        book={selectedBookForDetails}
        isOpen={!!selectedBookForDetails}
        onClose={() => setSelectedBookForDetails(null)}
        onReadPdf={(book) => {
          setSelectedBookForDetails(null);
          setSelectedBookForPdf(book);
        }}
        isAdminUnlocked={isAdminUnlocked}
        onDeleteBook={handleDeleteBook}
      />

      {/* 4. PDF Reader Modal */}
      <PdfReaderModal
        book={selectedBookForPdf}
        isOpen={!!selectedBookForPdf}
        onClose={() => setSelectedBookForPdf(null)}
      />

      {/* Website Footer */}
      <footer className="mt-12 bg-stone-950/90 border-t border-stone-800/80 py-5 text-center">
        <div className="max-w-7xl mx-auto px-4 flex flex-col items-center justify-center">
          <p className="text-3d-gold text-[11px] sm:text-xs md:text-sm font-normal py-0.5 tracking-wider inline-block">
            المبرمج نادر مصطفى الخواجه
          </p>
        </div>
      </footer>

    </div>
  );
}
