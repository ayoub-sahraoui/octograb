import type { Run } from "./model";
let connection: Promise<IDBDatabase> | undefined;
function database() {
  return (connection ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("octograb-runs", 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore("runs", { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  }));
}
export async function saveRun(run: Run) {
  const db = await database();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction("runs", "readwrite");
    transaction.objectStore("runs").put(structuredClone(run));
    transaction.oncomplete = () => resolve();
    transaction.onabort = () =>
      reject(
        transaction.error ??
          new Error("Results could not be saved. Export the available rows."),
      );
    transaction.onerror = () => reject(transaction.error);
  });
}
export async function loadRuns(): Promise<Run[]> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const request = db.transaction("runs").objectStore("runs").getAll();
    request.onsuccess = () =>
      resolve(
        (request.result as Run[]).sort((a, b) =>
          b.createdAt.localeCompare(a.createdAt),
        ),
      );
    request.onerror = () => reject(request.error);
  });
}
// shortcut: each bounded run stores rows with its checkpoint atomically; split rows into a separate store before supporting large datasets.
