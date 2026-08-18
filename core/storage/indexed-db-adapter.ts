/**
 * IndexedDB adapter for storing large data (tool results, blueprints, etc.)
 * to avoid localStorage quota issues
 */

const DB_NAME = 'octograb_storage';
const DB_VERSION = 1;

interface StoreConfig {
  name: string;
  keyPath: string;
  indexes?: Array<{ name: string; keyPath: string; unique?: boolean }>;
}

const STORES: StoreConfig[] = [
  {
    name: 'tool_results',
    keyPath: 'id',
    indexes: [
      { name: 'conversationId', keyPath: 'conversationId' },
      { name: 'timestamp', keyPath: 'timestamp' },
    ],
  },
  {
    name: 'conversation_data',
    keyPath: 'id',
    indexes: [{ name: 'updatedAt', keyPath: 'updatedAt' }],
  },
];

class IndexedDBAdapter {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    if (this.db) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores
        for (const store of STORES) {
          if (!db.objectStoreNames.contains(store.name)) {
            const objectStore = db.createObjectStore(store.name, {
              keyPath: store.keyPath,
            });

            // Create indexes
            if (store.indexes) {
              for (const index of store.indexes) {
                objectStore.createIndex(index.name, index.keyPath, {
                  unique: index.unique || false,
                });
              }
            }
          }
        }
      };
    });

    return this.initPromise;
  }

  async set(storeName: string, key: string, value: any): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put({ ...value, id: key });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async get<T = any>(storeName: string, key: string): Promise<T | null> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async delete(storeName: string, key: string): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getAll<T = any>(storeName: string): Promise<T[]> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async clear(storeName: string): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async cleanup(storeName: string, maxAge: number = 7 * 24 * 60 * 60 * 1000): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const cutoff = Date.now() - maxAge;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const index = store.index('timestamp');
      const request = index.openCursor(IDBKeyRange.upperBound(cutoff));

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
      request.onerror = () => reject(request.error);
    });
  }
}

// Singleton instance
let instance: IndexedDBAdapter | null = null;

export function getIndexedDBAdapter(): IndexedDBAdapter {
  if (!instance) {
    instance = new IndexedDBAdapter();
  }
  return instance;
}
