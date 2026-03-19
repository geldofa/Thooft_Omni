import PocketBase from 'pocketbase';
import { APP_URL } from '../config';

// In production, nginx proxies /api/ to PocketBase — use same origin (no port needed).
// In development (localhost), connect directly to PocketBase on port 8090.
const isLocalDev = typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

const URL = APP_URL
  || import.meta.env.VITE_POCKETBASE_URL
  || (isLocalDev ? 'http://127.0.0.1:8090' : window.location.origin);

console.log(`[PocketBase] Connecting to: ${URL}`);

export const pb = new PocketBase(URL);
export const client = pb;
pb.autoCancellation(false);
