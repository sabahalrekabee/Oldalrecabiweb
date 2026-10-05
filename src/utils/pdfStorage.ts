/**
 * IndexedDB storage for large PDF documents and cached files.
 * Allows storing large PDF files (even 50MB+) safely on the client side
 * without hitting Firestore's 1MB document limit.
 */

const DB_NAME = 'sheikh_sabah_library_db';
const DB_VERSION = 1;
const PDF_STORE_NAME = 'pdf_documents';

function openIndexedDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(PDF_STORE_NAME)) {
        db.createObjectStore(PDF_STORE_NAME, { keyPath: 'bookId' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function savePdfToIndexedDb(bookId: string, pdfDataUrlOrBlob: string | Blob, fileName: string): Promise<void> {
  try {
    const db = await openIndexedDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([PDF_STORE_NAME], 'readwrite');
      const store = transaction.objectStore(PDF_STORE_NAME);
      const record = {
        bookId,
        data: pdfDataUrlOrBlob,
        fileName,
        updatedAt: Date.now(),
      };
      const putRequest = store.put(record);
      putRequest.onsuccess = () => resolve();
      putRequest.onerror = () => reject(putRequest.error);
    });
  } catch (err) {
    console.warn('Could not save PDF to IndexedDB:', err);
  }
}

export async function getPdfFromIndexedDb(bookId: string): Promise<string | Blob | null> {
  try {
    const db = await openIndexedDb();
    return new Promise((resolve) => {
      const transaction = db.transaction([PDF_STORE_NAME], 'readonly');
      const store = transaction.objectStore(PDF_STORE_NAME);
      const getRequest = store.get(bookId);
      getRequest.onsuccess = () => {
        if (getRequest.result && getRequest.result.data) {
          resolve(getRequest.result.data);
        } else {
          resolve(null);
        }
      };
      getRequest.onerror = () => resolve(null);
    });
  } catch (err) {
    console.warn('Could not retrieve PDF from IndexedDB:', err);
    return null;
  }
}
