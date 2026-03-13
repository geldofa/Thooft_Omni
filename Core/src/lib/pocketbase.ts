import PocketBase from 'pocketbase';
import { APP_URL } from '../config';

const URL = APP_URL || import.meta.env.VITE_POCKETBASE_URL || `http://${typeof window !== 'undefined' ? (window.location.hostname === 'localhost' ? '127.0.0.1' : window.location.hostname) : '127.0.0.1'}:8090`;

export const pb = new PocketBase(URL);
export const client = pb;
pb.autoCancellation(false);
