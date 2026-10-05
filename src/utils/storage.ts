import { Book } from '../types.ts';
import { INITIAL_BOOKS } from '../data/initialBooks.ts';

const STORAGE_KEY = 'sheikh_sabah_books_v1';
const AUTH_KEY = 'sheikh_sabah_admin_auth';

export function getStoredBooks(): Book[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data !== null) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error loading books from storage:', err);
  }
  return [];
}

export function saveBooks(books: Book[]): void {
  try {
    const lightweightBooks = books.map(book => {
      const b = { ...book };
      // Do not store massive base64 PDFs in localStorage
      if (b.pdfUrl && b.pdfUrl.startsWith('data:')) {
        b.pdfUrl = ''; 
      }
      // Do not store massive base64 cover images in localStorage (limit to ~100KB)
      if (b.frontCoverUrl && b.frontCoverUrl.startsWith('data:') && b.frontCoverUrl.length > 130000) {
        b.frontCoverUrl = '';
      }
      if (b.backCoverUrl && b.backCoverUrl.startsWith('data:') && b.backCoverUrl.length > 130000) {
        b.backCoverUrl = '';
      }
      return b;
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lightweightBooks));
  } catch (err) {
    console.error('Error saving books to storage:', err);
  }
}

export function isUserAuthenticated(): boolean {
  try {
    return sessionStorage.getItem(AUTH_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setUserAuthenticated(status: boolean): void {
  try {
    if (status) {
      sessionStorage.setItem(AUTH_KEY, 'true');
    } else {
      sessionStorage.removeItem(AUTH_KEY);
    }
  } catch (err) {
    console.error('Error updating auth state:', err);
  }
}
