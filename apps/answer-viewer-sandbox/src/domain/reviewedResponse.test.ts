import {describe,it,expect} from 'vitest';
import {encodeResponse,decodeResponse,parseDraftResponse,validateOptions} from './reviewedResponse';
describe('reviewed response contract',()=>{
 it('preserves legacy text and escapes marker-prefixed user text',()=>{
  for(const text of ['Plain advice','POCKET_HR_RESPONSE_V1\n{}'])expect(decodeResponse(encodeResponse({text,options:[],attachments:[]})).text).toBe(text);
 });
 it('binds choices and files to the immutable snapshot',()=>{
  const response={text:'Which applies?',options:['Permanent','Contract'],attachments:[{id:'00000000-0000-4000-8000-000000000001',name:'Form.xlsx',mime:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',size:300}]};
  expect(decodeResponse(encodeResponse(response))).toEqual(response);
 });
 it('accepts explicit AI clarification JSON but never guesses choices from prose',()=>{
  expect(parseDraftResponse('{"kind":"clarification","question":"Employment type?","options":["Full-time","Part-time"]}')).toEqual({text:'Employment type?',options:['Full-time','Part-time'],attachments:[]});
  expect(parseDraftResponse('1. Full-time\n2. Part-time').options).toEqual([]);
 });
 it('rejects duplicated, blank and oversized choices',()=>{
  expect(validateOptions(['Yes','Yes'])).toBeNull();expect(validateOptions([' '])).toBeNull();expect(validateOptions(Array(9).fill('x'))).toBeNull();
 });
});
