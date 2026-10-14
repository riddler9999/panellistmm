import {describe,it,expect} from 'vitest';
import {cookieToken,sessionCookie} from './passcodeAuth';
describe('admin-provisioned passcodes',()=>{
 it('accepts only correctly shaped session cookies',()=>{
  expect(cookieToken({cookie:sessionCookie('a'.repeat(64))})).toBe('a'.repeat(64));
  expect(cookieToken({cookie:'pocket_hr_session=forged'})).toBe(null);
 });
});
