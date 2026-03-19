import PocketBase from 'pocketbase';
import { APP_URL } from '../config';

// In production, PB is exposed externally on port 8090 on the same host.
// We dynamically build the URL using the browser's current hostname to guarantee
// we hit the correct PB instance without CORS preflight failures caused by IP/Domain mismatch.
const computedUrl = typeof window !== 'undefined' 
  ? `${window.location.protocol}//${window.location.hostname}:8090`
  : 'http://127.0.0.1:8090';

const URL = APP_URL || import.meta.env.VITE_POCKETBASE_URL || computedUrl;

console.log(`[PocketBase] Connecting to: ${URL}`);

export const pb = new PocketBase(URL);
export const client = pb;
pb.autoCancellation(false);
