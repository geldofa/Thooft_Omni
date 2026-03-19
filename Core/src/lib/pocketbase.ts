import PocketBase from 'pocketbase';
import { APP_URL } from '../config';

// In development (localhost), connect directly to PocketBase on port 8090.
// In production, connect to '/' (relative), so Nginx proxies /api/ requests internally 
// and we avoid CORS preflight hangs.
const isLocalDev = typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

const URL = APP_URL || import.meta.env.VITE_POCKETBASE_URL || (isLocalDev ? 'http://127.0.0.1:8090' : '/');

console.log(`[PocketBase] Connecting to: ${URL} (origin: ${typeof window !== 'undefined' ? window.location.origin : 'unknown'})`);

export const pb = new PocketBase(URL);
export const client = pb;
pb.autoCancellation(false);
