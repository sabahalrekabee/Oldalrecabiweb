import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  getDocs,
  getDoc,
  writeBatch
} from 'firebase/firestore';
import { db } from '../lib/firebase.ts';
import { Book } from '../types.ts';
import { INITIAL_BOOKS } from '../data/initialBooks.ts';
import { getStoredBooks, saveBooks } from '../utils/storage.ts';
import { compressImage } from '../utils/imageCompressor.ts';
import { uploadPdfToCloud, deletePdfFromCloud } from './pdfCloudService.ts';
import { getPdfFromIndexedDb, savePdfToIndexedDb } from '../utils/pdfStorage.ts';

const BOOKS_COLLECTION = 'books';

/**
 * Strips all `undefined` values and unsupported properties recursively.
 * Firebase Firestore throws an immediate fatal error if any field is `undefined`.
 */
export function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return '' as unknown as T;
  }
  if (Array.isArray(data)) {
    return data.map((item) => sanitizeForFirestore(item)) as unknown as T;
  }
  if (typeof data === 'object') {
    const clean: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      if (value !== undefined) {
        clean[key] = sanitizeForFirestore(value);
      }
    }
    return clean as T;
  }
  return data;
}

/**
 * Prepares a book for Firestore storage:
 * 1. Resizes and compresses base64 cover images to ~50KB-80KB using HTML5 Canvas.
 * 2. Clears raw base64 PDF from the main document (since it's stored in cloud chunks).
 * 3. Recursively removes any `undefined` values.
 */
export async function prepareBookForStorage(book: Book): Promise<Book> {
  const prepared: Book = { ...book };

  // 1. Compress front cover
  if (prepared.frontCoverUrl && prepared.frontCoverUrl.startsWith('data:image')) {
    try {
      prepared.frontCoverUrl = await compressImage(prepared.frontCoverUrl, 850, 0.82);
    } catch (err) {
      console.warn('Could not compress front cover:', err);
    }
  }

  // 2. Compress back cover
  if (prepared.backCoverUrl && prepared.backCoverUrl.startsWith('data:image')) {
    try {
      prepared.backCoverUrl = await compressImage(prepared.backCoverUrl, 850, 0.82);
    } catch (err) {
      console.warn('Could not compress back cover:', err);
    }
  }

  // 3. If PDF is base64, save to IndexedDB cache and remove from root document
  if (prepared.pdfUrl && prepared.pdfUrl.startsWith('data:application/pdf')) {
    const fileName = prepared.pdfFileName || `${prepared.title}.pdf`;
    try {
      await savePdfToIndexedDb(prepared.id, prepared.pdfUrl, fileName);
    } catch (err) {
      console.warn('Failed to cache PDF to IndexedDB:', err);
    }
    // Main book document stays small (<100KB)
    prepared.pdfUrl = '';
  }

  return sanitizeForFirestore(prepared);
}

/**
 * Initializes Firestore books collection if it's brand new and never seeded.
 * If the user has deleted all books, this will NOT re-seed them, leaving the library empty.
 */
export async function seedInitialBooksIfEmpty(): Promise<void> {
  try {
    const catalogRef = doc(db, 'settings', 'catalog');
    const catalogSnap = await getDoc(catalogRef);
    
    // If the database has already been initialized, NEVER re-seed!
    if (catalogSnap.exists() && catalogSnap.data()?.initialized) {
      return;
    }

    const booksCol = collection(db, BOOKS_COLLECTION);
    const snapshot = await getDocs(booksCol);
    if (snapshot.empty) {
      console.log('Brand new database detected: Seeding INITIAL_BOOKS...');
      const batch = writeBatch(db);
      for (const book of INITIAL_BOOKS) {
        const cleanBook = sanitizeForFirestore(book);
        const bookRef = doc(db, BOOKS_COLLECTION, book.id);
        batch.set(bookRef, cleanBook);
      }
      batch.set(catalogRef, { initialized: true, seededAt: new Date().toISOString() }, { merge: true });
      await batch.commit();
      console.log('Seeded INITIAL_BOOKS successfully to Firestore.');
    } else {
      // Books already exist, just mark catalog as initialized
      await setDoc(catalogRef, { initialized: true }, { merge: true });
    }
  } catch (err) {
    console.warn('Notice while checking catalog initialization:', err);
  }
}

/**
 * Subscribes to real-time updates from Firestore.
 * Changes on any device will immediately update all connected devices.
 * If all books are deleted, dispatches [] so all devices reflect the empty state.
 */
export function subscribeToBooks(
  onUpdate: (books: Book[]) => void,
  onError?: (error: Error) => void
): () => void {
  const booksCol = collection(db, BOOKS_COLLECTION);
  const q = query(booksCol);

  // Background check for first-time ever setup (won't re-seed if initialized: true)
  seedInitialBooksIfEmpty();

  const unsubscribe = onSnapshot(
    q,
    async (snapshot) => {
      const fetchedBooks: Book[] = [];
      if (!snapshot.empty) {
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as Book;
          fetchedBooks.push({
            ...data,
            id: docSnap.id,
          });
        });

        // Sort: newest first
        fetchedBooks.sort((a, b) => {
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        });
      }

      // Ensure we don't save giant base64 strings to localStorage
      const safeToSave = fetchedBooks.map(b => ({
        ...b,
        pdfUrl: b.pdfUrl?.startsWith('data:') ? '' : b.pdfUrl
      }));
      saveBooks(safeToSave);
      
      // Update with fetched books (even if empty [])
      onUpdate(fetchedBooks);
    },
    (err) => {
      console.error('Error listening to Firestore books:', err);
      if (onError) onError(err);
      onUpdate(getStoredBooks());
    }
  );

  return unsubscribe;
}

/**
 * Adds or updates a book in Firestore and syncs across all devices.
 * If a PDF file was uploaded, splits and uploads the real PDF to cloud chunks so ANY device can download it!
 */
export async function addBookToFirestore(
  rawBook: Book,
  onProgress?: (percent: number) => void
): Promise<Book> {
  try {
    const rawPdfUrl = rawBook.pdfUrl;
    const hasBase64Pdf = Boolean(rawPdfUrl && rawPdfUrl.startsWith('data:application/pdf'));
    const fileName = rawBook.pdfFileName || `${rawBook.title}.pdf`;

    // 1. If base64 PDF is present, upload real PDF chunks to cloud
    if (hasBase64Pdf && rawPdfUrl) {
      await uploadPdfToCloud(rawBook.id, rawPdfUrl, fileName, onProgress);
    }

    // 2. Prepare book document
    const preparedBook = await prepareBookForStorage(rawBook);
    if (hasBase64Pdf) {
      preparedBook.hasUploadedPdf = true;
      preparedBook.pdfFileName = fileName;
      preparedBook.pdfFileSize = rawPdfUrl?.length || 0;
      preparedBook.pdfUrl = '';
    }

    const bookRef = doc(db, BOOKS_COLLECTION, preparedBook.id);
    await setDoc(bookRef, preparedBook);
    return preparedBook;
  } catch (err) {
    console.error('Error saving book to Firestore:', err);
    throw err;
  }
}

/**
 * Attaches or updates a PDF file for an existing book in Firestore.
 */
export async function attachPdfToBook(
  bookId: string,
  pdfDataUrl: string,
  fileName: string,
  onProgress?: (percent: number) => void
): Promise<void> {
  try {
    // 1. Upload chunks to cloud
    await uploadPdfToCloud(bookId, pdfDataUrl, fileName, onProgress);

    // 2. Update book record
    const bookRef = doc(db, BOOKS_COLLECTION, bookId);
    await setDoc(
      bookRef,
      {
        hasUploadedPdf: true,
        pdfFileName: fileName,
        pdfFileSize: pdfDataUrl.length,
        pdfUrl: '',
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err) {
    console.error('Error attaching PDF to book:', err);
    throw err;
  }
}

/**
 * Deletes a book from Firestore across all devices.
 */
export async function deleteBookFromFirestore(bookId: string): Promise<void> {
  try {
    // Clean up cloud chunks
    await deletePdfFromCloud(bookId);

    const bookRef = doc(db, BOOKS_COLLECTION, bookId);
    await deleteDoc(bookRef);
  } catch (err) {
    console.error('Error deleting book from Firestore:', err);
    throw err;
  }
}

/**
 * Resets Firestore books collection to default INITIAL_BOOKS.
 */
export async function resetBooksInFirestore(): Promise<void> {
  try {
    const booksCol = collection(db, BOOKS_COLLECTION);
    const snapshot = await getDocs(booksCol);
    const batch = writeBatch(db);

    snapshot.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });

    for (const book of INITIAL_BOOKS) {
      const cleanBook = sanitizeForFirestore(book);
      const bookRef = doc(db, BOOKS_COLLECTION, book.id);
      batch.set(bookRef, cleanBook);
    }

    const catalogRef = doc(db, 'settings', 'catalog');
    batch.set(catalogRef, { initialized: true, resetAt: new Date().toISOString() }, { merge: true });

    await batch.commit();
  } catch (err) {
    console.error('Error resetting books in Firestore:', err);
    throw err;
  }
}
