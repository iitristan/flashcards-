/**
 * High-capacity browser storage using IndexedDB.
 * Bypasses the 5MB browser localStorage quota limit, supporting hundreds of megabytes
 * of flashcards, decks, and embedded image assets.
 */

const DB_NAME = 'nutrianki_db';
const DB_VERSION = 1;
const STORE_NAME = 'keyval';

class IndexedDbStorage {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private memoryFallback: Map<string, unknown> = new Map();

  private isBrowser(): boolean {
    return typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';
  }

  private getDB(): Promise<IDBDatabase> {
    if (!this.isBrowser()) {
      return Promise.reject(new Error('IndexedDB is only available in browser environment'));
    }

    if (this.dbPromise) {
      return this.dbPromise;
    }

    this.dbPromise = new Promise((resolve, reject) => {
      try {
        const request = window.indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME);
          }
        };

        request.onsuccess = () => {
          resolve(request.result);
        };

        request.onerror = () => {
          console.warn('IndexedDB open error, falling back to memory:', request.error);
          this.dbPromise = null;
          reject(request.error);
        };
      } catch (err) {
        this.dbPromise = null;
        reject(err);
      }
    });

    return this.dbPromise;
  }

  /**
   * Retrieves an item from IndexedDB, with migration fallback from localStorage
   */
  public async getItem<T>(key: string): Promise<T | null> {
    if (!this.isBrowser()) {
      return (this.memoryFallback.get(key) as T) ?? null;
    }

    try {
      const db = await this.getDB();
      const value = await new Promise<T | null>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(key);

        request.onsuccess = () => resolve(request.result ?? null);
        request.onerror = () => reject(request.error);
      });

      if (value !== null) {
        return value;
      }

      // Check legacy localStorage for migration
      try {
        const localData = window.localStorage.getItem(key);
        if (localData) {
          const parsed = JSON.parse(localData) as T;
          // Migrate to IndexedDB
          await this.setItem(key, parsed);
          // Free up localStorage space
          window.localStorage.removeItem(key);
          return parsed;
        }
      } catch {
        // Ignore localStorage parse errors
      }

      return null;
    } catch (err) {
      console.warn(`IndexedDB getItem failed for key "${key}", checking memory fallback:`, err);
      return (this.memoryFallback.get(key) as T) ?? null;
    }
  }

  /**
   * Saves an item to IndexedDB (virtually unlimited capacity)
   */
  public async setItem<T>(key: string, value: T): Promise<void> {
    this.memoryFallback.set(key, value);

    if (!this.isBrowser()) {
      return;
    }

    try {
      const db = await this.getDB();
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(value, key);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (err) {
      console.error(`Failed to write key "${key}" to IndexedDB:`, err);
      // Fall back to memory map
      this.memoryFallback.set(key, value);
    }
  }

  /**
   * Removes an item from IndexedDB
   */
  public async removeItem(key: string): Promise<void> {
    this.memoryFallback.delete(key);

    if (!this.isBrowser()) {
      return;
    }

    try {
      const db = await this.getDB();
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(key);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });

      try {
        window.localStorage.removeItem(key);
      } catch {
        // Ignore
      }
    } catch (err) {
      console.error(`Failed to remove key "${key}" from IndexedDB:`, err);
    }
  }

  /**
   * Clears the store
   */
  public async clear(): Promise<void> {
    this.memoryFallback.clear();

    if (!this.isBrowser()) {
      return;
    }

    try {
      const db = await this.getDB();
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.clear();

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (err) {
      console.error('Failed to clear IndexedDB:', err);
    }
  }
}

export const idbStorage = new IndexedDbStorage();
