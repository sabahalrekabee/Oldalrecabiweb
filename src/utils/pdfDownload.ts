import { Book } from '../types.ts';
import { getPdfFromIndexedDb, savePdfToIndexedDb } from './pdfStorage.ts';
import { fetchPdfFromCloud, dataUrlToBlob } from '../services/pdfCloudService.ts';

/**
 * Sanitizes book title for a clean, safe filename
 */
export function sanitizeFilename(title: string): string {
  return title
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, '_')
    .slice(0, 60);
}

/**
 * Initiates direct browser download for a Blob
 */
export function triggerBlobDownload(blob: Blob, fileName: string): void {
  const downloadUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(downloadUrl), 15000);
}

/**
 * Downloads the EXACT book PDF file to the user's computer or mobile device across all devices.
 * 
 * 1. Checks local device IndexedDB for instant response.
 * 2. If not local, fetches the real cloud PDF chunks stored in Firestore subcollection.
 * 3. Handles direct remote URLs (e.g. Google Drive, Archive.org).
 * 4. Never generates fake corrupted Latin-1 PDFs.
 */
export async function downloadBookPdf(
  book: Book,
  onProgress?: (percent: number) => void
): Promise<{ success: boolean; message?: string }> {
  const fileName = book.pdfFileName || `${sanitizeFilename(book.title)}.pdf`;

  // Step 1: Check local device IndexedDB cache
  try {
    const cachedData = await getPdfFromIndexedDb(book.id);
    if (cachedData) {
      if (typeof cachedData === 'string') {
        const blob = dataUrlToBlob(cachedData);
        triggerBlobDownload(blob, fileName);
      } else {
        triggerBlobDownload(cachedData, fileName);
      }
      return { success: true };
    }
  } catch (err) {
    console.warn('IndexedDB read error during download:', err);
  }

  // Step 2: If the book has a direct base64 data URL in memory
  if (book.pdfUrl && book.pdfUrl.startsWith('data:application/pdf')) {
    try {
      const blob = dataUrlToBlob(book.pdfUrl);
      triggerBlobDownload(blob, fileName);
      // Cache for future
      savePdfToIndexedDb(book.id, book.pdfUrl, fileName).catch(() => {});
      return { success: true };
    } catch (err) {
      console.warn('Direct dataUrl download error:', err);
    }
  }

  // Step 3: Fetch the real uploaded PDF chunks from Firestore Cloud
  try {
    const cloudPdf = await fetchPdfFromCloud(book.id, onProgress);
    if (cloudPdf && cloudPdf.dataUrl) {
      const targetFileName = cloudPdf.fileName || fileName;
      const blob = dataUrlToBlob(cloudPdf.dataUrl);
      triggerBlobDownload(blob, targetFileName);
      return { success: true };
    }
  } catch (cloudErr) {
    console.error('Error downloading PDF from cloud chunks:', cloudErr);
  }

  // Step 4: If it's an external web URL (Google Drive, Archive.org, direct server link)
  if (
    book.pdfUrl &&
    (book.pdfUrl.startsWith('http://') || book.pdfUrl.startsWith('https://')) &&
    !book.pdfUrl.includes('dummy.pdf')
  ) {
    try {
      const res = await fetch(book.pdfUrl, { mode: 'cors' });
      if (res.ok) {
        const blob = await res.blob();
        triggerBlobDownload(blob, fileName);
        return { success: true };
      }
    } catch {
      // Fallback: Direct anchor click for cross-origin URLs
      const a = document.createElement('a');
      a.href = book.pdfUrl;
      a.download = fileName;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return { success: true };
    }
  }

  // Step 5: If no PDF was ever uploaded for this book
  // We NEVER download random corrupted symbols or test URLs!
  const notFoundMessage = `عفواً، لم يتم رفع ملف PDF أصلي لهذا الكتاب بعد. يمكنك قراءة فصوله ومحتواه كاملاً عبر "قراءة الكتاب"، أو إرفاق ملف الـ PDF من لوحة الإدارة.`;
  return {
    success: false,
    message: notFoundMessage,
  };
}
