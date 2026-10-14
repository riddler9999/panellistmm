import {describe,it,expect} from 'vitest';
import {hashPasscode,verifyPasscode,cookieToken,sessionCookie} from './passcodeAuth';
describe('admin-provisioned passcodes',()=>{
 it('hashes a four-digit passcode and rejects wrong values',()=>{
  const hash=hashPasscode('1234');
  expect(hash).not.toContain('1234');
  expect(verifyPasscode('1234',hash)).toBe(true);
  expect(verifyPasscode('0000',hash)).toBe(false);
  expect(verifyPasscode('12345',hash)).toBe(false);
 });
 it('rejects invalid passcodes',()=>expect(()=>hashPasscode('abcd')).toThrow());
 it('accepts only correctly shaped session cookies',()=>{
  expect(cookieToken({cookie:sessionCookie('a'.repeat(64))})).toBe('a'.repeat(64));
  expect(cookieToken({cookie:'pocket_hr_session=forged'})).toBe(null);
 });
});
