import { collection, doc, setDoc, getDocs, writeBatch, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase.ts';
import { savePdfToIndexedDb, getPdfFromIndexedDb } from '../utils/pdfStorage.ts';

// 450 KB chunk size ensures each document stays comfortably below Firestore's 1MB limit
const CHUNK_SIZE = 450000;

export interface CloudPdfResult {
  dataUrl: string;
  fileName: string;
}

/**
 * Converts a data URL (e.g. "data:application/pdf;base64,...") to a standard binary Blob.
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(',');
  const mime = parts[0].match(/:(.*?);/)?.[1] || 'application/pdf';
  const rawBase64 = parts.length > 1 ? parts[1] : parts[0];
  const base64Data = rawBase64.replace(/\s/g, '');
  const binaryString = atob(base64Data);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

/**
 * Uploads a real PDF file to Firestore across chunk documents in the subcollection:
 * `books/{bookId}/pdfChunks/chunk_{index}`
 * This makes the exact uploaded file accessible from any device anywhere in the world!
 */
export async function uploadPdfToCloud(
  bookId: string,
  pdfDataUrl: string,
  fileName: string,
  onProgress?: (percent: number) => void
): Promise<{ totalChunks: number; totalSize: number }> {
  const totalLength = pdfDataUrl.length;
  const totalChunks = Math.ceil(totalLength / CHUNK_SIZE);
  const chunksCollection = collection(db, 'books', bookId, 'pdfChunks');

  // Also cache immediately in local IndexedDB for instant offline access on this device
  try {
    await savePdfToIndexedDb(bookId, pdfDataUrl, fileName);
  } catch (err) {
    console.warn('Could not cache PDF in local IndexedDB:', err);
  }

  // 1. Clear out any previous chunks for this book
  try {
    const existing = await getDocs(chunksCollection);
    if (!existing.empty) {
      const deleteBatch = writeBatch(db);
      existing.forEach((d) => deleteBatch.delete(d.ref));
      await deleteBatch.commit();
    }
  } catch (err) {
    console.warn('Notice while clearing previous chunks:', err);
  }

  // 2. Upload chunks in sequential/small batches
  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE;
    const chunkData = pdfDataUrl.slice(start, start + CHUNK_SIZE);
    const chunkDocRef = doc(db, 'books', bookId, 'pdfChunks', `chunk_${i.toString().padStart(4, '0')}`);

    await setDoc(chunkDocRef, {
      index: i,
      totalChunks,
      data: chunkData,
      fileName,
      updatedAt: Date.now(),
    });

    if (onProgress) {
      const percent = Math.min(99, Math.round(((i + 1) / totalChunks) * 100));
      onProgress(percent);
    }
  }

  if (onProgress) {
    onProgress(100);
  }

  return { totalChunks, totalSize: totalLength };
}

/**
 * Fetches the real PDF chunks from Firestore, reconstructs the full original PDF,
 * and caches it in local IndexedDB on this new device.
 */
export async function fetchPdfFromCloud(
  bookId: string,
  onProgress?: (percent: number) => void
): Promise<CloudPdfResult | null> {
  // 1. Check local IndexedDB first
  try {
    const local = await getPdfFromIndexedDb(bookId);
    if (local && typeof local === 'string' && local.startsWith('data:application/pdf')) {
      return { dataUrl: local, fileName: `${bookId}.pdf` };
    }
  } catch {
    // Continue to cloud
  }

  // 2. Fetch from Firestore subcollection
  try {
    const chunksCollection = collection(db, 'books', bookId, 'pdfChunks');
    const snapshot = await getDocs(chunksCollection);

    if (snapshot.empty) {
      return null;
    }

    const chunks = snapshot.docs.map((d) => d.data() as {
      index: number;
      totalChunks: number;
      data: string;
      fileName?: string;
    });

    chunks.sort((a, b) => a.index - b.index);

    let fullDataUrl = '';
    const total = chunks.length;
    for (let i = 0; i < total; i++) {
      fullDataUrl += chunks[i].data;
      if (onProgress) {
        onProgress(Math.round(((i + 1) / total) * 100));
      }
    }

    const fileName = chunks[0]?.fileName || `${bookId}.pdf`;

    // Cache into local IndexedDB so the next download or view on this device is instant
    try {
      await savePdfToIndexedDb(bookId, fullDataUrl, fileName);
    } catch (cacheErr) {
      console.warn('Could not cache fetched PDF locally:', cacheErr);
    }

    return {
      dataUrl: fullDataUrl,
      fileName,
    };
  } catch (err) {
    console.error('Error fetching PDF from Firestore cloud:', err);
    return null;
  }
}

/**
 * Cleans up PDF chunks when a book is deleted.
 */
export async function deletePdfFromCloud(bookId: string): Promise<void> {
  try {
    const chunksCollection = collection(db, 'books', bookId, 'pdfChunks');
    const snapshot = await getDocs(chunksCollection);
    if (!snapshot.empty) {
      const batch = writeBatch(db);
      snapshot.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
  } catch (err) {
    console.warn('Error deleting PDF chunks from cloud:', err);
  }
}
