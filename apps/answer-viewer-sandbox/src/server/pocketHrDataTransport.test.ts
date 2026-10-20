import { afterEach, describe, expect, it, vi } from 'vitest';
import { db } from './pocketHrData';

afterEach(() => {
 vi.unstubAllEnvs();
 vi.unstubAllGlobals();
});

describe('Supabase PostgREST transport', () => {
 it('accepts a successful empty response from the void save-conversation RPC', async () => {
  vi.stubEnv('SUPABASE_URL', 'https://supabase.example.test');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-secret');
  const fetchMock = vi.fn<typeof fetch>(async () => new Response(null, { status: 204 }));
  vi.stubGlobal('fetch', fetchMock);
  await expect(db<void>('rpc/pocket_hr_save_conversation', 'POST', {
   p_state: { request_id: 'synthetic-request' },
  })).resolves.toBeUndefined();
  expect(fetchMock).toHaveBeenCalledOnce();
 });

 it('still decodes JSON RPC results and does not swallow storage failures', async () => {
  vi.stubEnv('SUPABASE_URL', 'https://supabase.example.test');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-secret');
  vi.stubGlobal('fetch', vi.fn<typeof fetch>(async () => Response.json(1)));
  await expect(db<number>('rpc/pocket_hr_approve_snapshot', 'POST', {})).resolves.toBe(1);
  vi.stubGlobal('fetch', vi.fn<typeof fetch>(async () => Response.json(
   { code: 'P0001' }, { status: 409 },
  )));
  await expect(db('rpc/pocket_hr_save_conversation', 'POST', {}))
   .rejects.toThrow('storage_request_failed');
 });
});
