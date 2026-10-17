import { describe,expect,it } from 'vitest';
import { messageParts } from './messageParts';

describe('messageParts',()=>{
 it('links reviewed HTTPS downloads and keeps surrounding text',()=>{
  expect(messageParts('XLSX: https://files.example/a.xlsx\nPNG: https://files.example/a.png')).toEqual([
   {type:'text',value:'XLSX: '},{type:'link',value:'https://files.example/a.xlsx'},
   {type:'text',value:'\nPNG: '},{type:'link',value:'https://files.example/a.png'},
  ]);
 });
 it('does not turn non-HTTPS content into a link',()=>{
  expect(messageParts('Open javascript:alert(1) or http://example.com')).toEqual([{type:'text',value:'Open javascript:alert(1) or http://example.com'}]);
 });
});
