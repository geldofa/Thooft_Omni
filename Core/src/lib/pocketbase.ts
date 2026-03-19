import PocketBase from 'pocketbase';
import { APP_URL } from '../config';

const computedUrl = typeof window !== 'undefined' 
  ? `http://${window.location.hostname === 'localhost' ? '127.0.0.1' : window.location.hostname}:8090` 
  : 'http://127.0.0.1:8090';

const URL = APP_URL || import.meta.env.VITE_POCKETBASE_URL || computedUrl;

console.log(`[PocketBase] Connecting directly to: ${URL}`);

export const pb = new PocketBase(URL);
export const client = pb;
pb.autoCancellation(false);
