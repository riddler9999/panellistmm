import {describe,it,expect} from 'vitest';
import {cookieToken,sessionCookie} from './passcodeAuth';
describe('admin-provisioned passcodes',()=>{
 it('accepts only correctly shaped session cookies',()=>{
  expect(cookieToken({cookie:sessionCookie('a'.repeat(64))})).toBe('a'.repeat(64));
  expect(cookieToken({cookie:'pocket_hr_session=forged'})).toBe(null);
 });
});

import {vi,afterEach} from 'vitest';
import {redisCommand} from './pocketHrRedis';
afterEach(()=>{vi.unstubAllGlobals();});
describe('Redis authentication storage',()=>{
 it('fails closed when Redis is not configured',async()=>{
  const oldUrl=process.env.UPSTASH_REDIS_REST_URL;
  const oldToken=process.env.UPSTASH_REDIS_REST_TOKEN;
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  try{await expect(redisCommand(['GET','test'])).rejects.toThrow('redis_not_configured');}
  finally{if(oldUrl!==undefined)process.env.UPSTASH_REDIS_REST_URL=oldUrl;if(oldToken!==undefined)process.env.UPSTASH_REDIS_REST_TOKEN=oldToken;}
 });
 it('rejects upstream failures rather than permitting login',async()=>{
  process.env.UPSTASH_REDIS_REST_URL='https://example.upstash.io';
  process.env.UPSTASH_REDIS_REST_TOKEN='test-token';
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:false,status:503}));
  await expect(redisCommand(['GET','test'])).rejects.toThrow('redis_request_failed');
 });
});
