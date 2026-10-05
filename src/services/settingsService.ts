import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase.ts';

const SETTINGS_DOC = 'settings/main';

export interface AppSettings {
  sheikhAvatarUrl?: string;
}

/**
 * Subscribes to global app settings from Firestore.
 */
export function subscribeToSettings(
  onUpdate: (settings: AppSettings) => void
): () => void {
  const settingsRef = doc(db, SETTINGS_DOC);
  return onSnapshot(settingsRef, (docSnap) => {
    if (docSnap.exists()) {
      onUpdate(docSnap.data() as AppSettings);
    } else {
      onUpdate({});
    }
  });
}

/**
 * Updates the global app settings in Firestore.
 */
export async function updateAppSettings(newSettings: Partial<AppSettings>): Promise<void> {
  try {
    const settingsRef = doc(db, SETTINGS_DOC);
    await setDoc(settingsRef, newSettings, { merge: true });
  } catch (err) {
    console.error('Error updating app settings:', err);
    throw err;
  }
}
