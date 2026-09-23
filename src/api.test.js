import { beforeEach, describe, expect, it, vi } from 'vitest';
const { client } = vi.hoisted(() => ({ client: { interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } }, get:vi.fn(), post:vi.fn() } }));
vi.mock('axios', () => ({ default: { create: () => client } }));
const API = await import('./api');
const reject = client.interceptors.response.use.mock.calls[0][1];
beforeEach(() => window.sessionStorage.clear());
describe('authentication error handling', () => {
  it('preserves the session on insufficient permissions', async () => {
    API.setToken('valid'); const error={response:{status:403},config:{headers:{Authorization:'Bearer valid'}}};
    await expect(reject(error)).rejects.toBe(error); expect(API.getToken()).toBe('valid');
  });
  it('clears an expired session and notifies the UI', async () => {
    API.setToken('expired'); const listener=vi.fn(); window.addEventListener('auth-expired',listener);
    const error={response:{status:401},config:{headers:{Authorization:'Bearer expired'}}};
    await expect(reject(error)).rejects.toBe(error); expect(API.getToken()).toBeNull(); expect(listener).toHaveBeenCalledTimes(1);
    window.removeEventListener('auth-expired',listener);
  });
  it('does not invalidate a new login when an old request fails', async () => {
    API.setToken('new'); const error={response:{status:401},config:{headers:{Authorization:'Bearer old'}}};
    await expect(reject(error)).rejects.toBe(error); expect(API.getToken()).toBe('new');
  });
});
