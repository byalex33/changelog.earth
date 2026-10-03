import { writeFileSync, renameSync, readFileSync, existsSync, mkdirSync, openSync, closeSync, unlinkSync, statSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CLASSIFICATION_PROMPT_VERSION } from './classification-prompt.mjs';
import { CLASSIFICATION_FIELDS } from './classification-records.mjs';
import { isChangeType, isDomain, isEvidenceStatus, isPlainText, isScope, isSignificance, isSlug } from './taxonomy.mjs';

export const STORE_VERSION = 1;
export const STORE_PATH = new URL('../data/classifications.json', import.meta.url);

// Merging and replacing have to be one critical section: two writers that each merge the same
// stale base still lose a batch between the merge read and the rename. Exclusive create is the
// lock, and a lock older than a minute belongs to a process that died holding it.
const LOCK_WAIT_MS = 10_000;
const LOCK_STALE_MS = 60_000;
const RENAME_WAIT_MS = 5_000;
// A file another process still holds open refuses a rename over its target. The writer has already
// paid for the model call by this point, so a transient refusal is retried rather than fatal.
const isBusy = error => error.code === 'EPERM' || error.code === 'EBUSY' || error.code === 'EACCES';
function acquireLock(lock) {
 const wait = new Int32Array(new SharedArrayBuffer(4));
 const started = Date.now();
 for (;;) {
  try { return openSync(lock, 'wx'); }
  catch (error) {
   if (error.code !== 'EEXIST') throw error;
   // The holder can release the lock between this failed create and the stat below, so a vanished
   // lock is not an error: it is the signal to create it again immediately.
   let heldSince;
   try { heldSince = statSync(lock).mtimeMs; } catch { continue; }
   if (Date.now() - heldSince > LOCK_STALE_MS) { try { unlinkSync(lock); } catch {} continue; }
   if (Date.now() - started > LOCK_WAIT_MS) throw new Error('Timed out waiting for the classification store lock');
   Atomics.wait(wait, 0, 0, 25);
  }
 }
}

// The atomic replace itself, retried while the target is transiently held open.
function renameWithRetry(from, to) {
 const wait = new Int32Array(new SharedArrayBuffer(4));
 const started = Date.now();
 for (;;) {
  try { renameSync(from, to); return; }
  catch (error) {
   if (!isBusy(error) || Date.now() - started > RENAME_WAIT_MS) throw error;
   Atomics.wait(wait, 0, 0, 25);
  }
 }
}

// Derived data with its own provenance. It is keyed by source URL so the join is a map lookup
// per article, and it never replaces or rewrites the published archive.
export function emptyStore() {
 return {version:STORE_VERSION, promptVersion:CLASSIFICATION_PROMPT_VERSION, retrospective:true, model:null, createdAt:null, updatedAt:null, records:{}};
}

// Throws unless every record is complete, inside the taxonomy and carries its provenance.
export function validateStore(store) {
 if (!store || typeof store !== 'object') throw new Error('Invalid classification store');
 if (!Number.isSafeInteger(store.version) || store.version < 1) throw new Error('Invalid classification store version');
 if (typeof store.records !== 'object' || store.records === null) throw new Error('Invalid classification records');
 for (const [url, record] of Object.entries(store.records)) {
  try { new URL(url); } catch { throw new Error('Invalid classification source URL'); }
  if (!record || !CLASSIFICATION_FIELDS.every(field => field in record)) throw new Error('Incomplete classification record');
  if (!isDomain(record.domain) || !isChangeType(record.changeType) || !isScope(record.scope) || !isSignificance(record.significance) || !isEvidenceStatus(record.evidenceStatus)) throw new Error('Stored classification outside the taxonomy');
  if (!['high','medium','low'].includes(record.significanceConfidence)) throw new Error('Invalid classification confidence');
  if (!isPlainText(record.significanceReason, 300) || !isPlainText(record.subject, 80) || !isPlainText(record.claim, 400) || !isSlug(record.clusterKey)) throw new Error('Invalid stored classification text');
  if (typeof record.whyItMatters !== 'string' || record.whyItMatters.length > 300) throw new Error('Invalid stored classification whyItMatters');
  if (record.method !== 'ai' || typeof record.classifiedAt !== 'string' || !Number.isFinite(Date.parse(record.classifiedAt))) throw new Error('Stored classification lacks provenance');
  // Any positive version loads, including older ones: a prompt upgrade must stay resumable, and
  // needsClassification decides which records are stale instead of the store refusing to open.
  if (!Number.isSafeInteger(record.promptVersion) || record.promptVersion < 1) throw new Error('Stored classification lacks a usable prompt version');
  if (typeof record.sourceTitle !== 'string' || !record.sourceTitle.length) throw new Error('Stored classification lacks its source headline');
 }
 return store;
}

// Nothing classified yet is a normal state, so a missing store reads as empty.
export function readStore(path = STORE_PATH) {
 if (!existsSync(path)) return emptyStore();
 const store = JSON.parse(readFileSync(path, 'utf8'));
 return validateStore(store);
}

// Atomic replace so an interrupted run never leaves a half-written artifact behind, merged with
// whatever is on disk at write time so two overlapping runs cannot lose each other's batch: a
// record another process committed after this store was read stays in the file instead of being
// overwritten by a snapshot that never saw it.
export function writeStore(store, path = STORE_PATH, now = Date.now()) {
 validateStore(store);
 // The default path is a URL, so it stays relative to this module. dirname only accepts strings,
 // and interpolating a URL would build a "file:///..." path the filesystem cannot write; a writer
 // that throws after the model call would drop the whole batch.
 const file = path instanceof URL ? fileURLToPath(path) : path;
 mkdirSync(dirname(file), {recursive:true});
 const lock = `${file}.lock`;
 const held = acquireLock(lock);
 try {
  const existing = readStore(file);
  const createdAt = existing.createdAt ?? store.createdAt ?? new Date(now).toISOString();
  const stamped = {...store, version:STORE_VERSION, records:{...existing.records, ...store.records}, updatedAt:new Date(now).toISOString(), createdAt};
  // One temporary file per writer, so two runs never overwrite each other's half-written file.
  const temporary = `${file}.${process.pid}.tmp`;
  try {
   writeFileSync(temporary, `${JSON.stringify(stamped, null, 2)}\n`);
   renameWithRetry(temporary, file);
  } catch (error) {
   // A rename that never happened leaves its temporary file behind, and the next run of this
   // process reuses the same name, so the debris is cleared rather than left in the data directory.
   try { unlinkSync(temporary); } catch {}
   throw error;
  }
  return stamped;
 } finally {
  closeSync(held);
  try { unlinkSync(lock); } catch {}
 }
}

// A new store with the batch merged in by source URL; the store passed in is never mutated.
export function putRecords(store, records, model) {
 const next = {...store, records:{...store.records}};
 for (const [url, record] of records) next.records[url] = record;
 if (model) next.model = model;
 return next;
}

// Counts for the run summary: records, methods, prompt version and model.
export function storeStats(store) {
 const methods = {};
 for (const record of Object.values(store.records ?? {})) methods[record.method] = (methods[record.method] ?? 0) + 1;
 return {records:Object.keys(store.records ?? {}).length, methods, promptVersion:store.promptVersion, model:store.model, updatedAt:store.updatedAt};
}