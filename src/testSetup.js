import '@testing-library/jest-dom/vitest';
import { JSDOM } from 'jsdom';
// Node 25 exposes a native localStorage that can shadow Vitest's browser storage.
// Use actual jsdom Storage instances so session semantics remain browser-like.
const storageWindow = new JSDOM('', { url: 'http://localhost' }).window;
Object.defineProperty(window, 'localStorage', { configurable: true, value: storageWindow.localStorage });
Object.defineProperty(window, 'sessionStorage', { configurable: true, value: storageWindow.sessionStorage });
