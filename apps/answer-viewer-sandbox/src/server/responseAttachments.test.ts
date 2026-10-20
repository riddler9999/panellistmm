// @vitest-environment node
import {describe,it,expect,vi} from 'vitest';
import sharp from 'sharp';
import {zipSync,strToU8} from 'fflate';
import {validateAttachment,selectAttachments,storeAttachment} from './responseAttachments';
import {db} from './pocketHrData';
vi.mock('./pocketHrData',()=>({db:vi.fn()}));
describe('private response attachment validation',()=>{
 it('decodes and rewrites a real PNG',async()=>{
  const png=await sharp({create:{width:2,height:2,channels:3,background:'white'}}).png().toBuffer();
  const file=await validateAttachment('Chart.png',png.toString('base64'));
  expect(file.mime).toBe('image/png');expect((await sharp(file.bytes).metadata()).width).toBe(2);
 });
 it('rejects a renamed executable and truncated PNG',async()=>{
  await expect(validateAttachment('chart.png',Buffer.from('MZfake').toString('base64'))).rejects.toThrow();
  await expect(validateAttachment('chart.png',Buffer.from([137,80,78,71,13,10,26,10]).toString('base64'))).rejects.toThrow();
 });
 it('accepts an OOXML workbook and rejects macro payloads and zip bombs',async()=>{
  const entries={'[Content_Types].xml':strToU8('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml'),'xl/workbook.xml':strToU8('<workbook/>'),'_rels/.rels':strToU8('<Relationships/>')};
  expect((await validateAttachment('form.xlsx',Buffer.from(zipSync(entries)).toString('base64'))).mime).toContain('spreadsheetml');
  await expect(validateAttachment('form.xlsx',Buffer.from(zipSync({...entries,'xl/vbaProject.bin':strToU8('macro')})).toString('base64'))).rejects.toThrow();
  await expect(validateAttachment('form.xlsx',Buffer.from(zipSync({...entries,'xl/bomb.xml':new Uint8Array(21*1024*1024)})).toString('base64'))).rejects.toThrow();
 });
 it('rejects traversal names and more than five files',async()=>{
  await expect(validateAttachment('../file.pdf',Buffer.from('%PDF-1.7\n%%EOF').toString('base64'))).rejects.toThrow();
  await expect(selectAttachments('A',Array(6).fill('x'))).rejects.toThrow();
 });
 it('cannot attach a file belonging to another ticket',async()=>{
  vi.mocked(db).mockResolvedValue([{id:'00000000-0000-4000-8000-000000000001',request_id:'B'}]);
  await expect(selectAttachments('A',['00000000-0000-4000-8000-000000000001'])).rejects.toThrow('invalid_attachments');
 });
 it('removes a private Storage object if the Supabase file metadata write fails',async()=>{
  vi.stubEnv('SUPABASE_URL','https://storage.example.test');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY','synthetic-secret');
  const fetchMock=vi.fn<typeof fetch>(async()=>new Response('{}',{status:200}));
  vi.stubGlobal('fetch',fetchMock);
  vi.mocked(db).mockRejectedValueOnce(new Error('metadata_unavailable'));
  try {
   await expect(storeAttachment('request-1','consultant@example.com',{
    name:'test.pdf',mime:'application/pdf',bytes:Buffer.from('%PDF-1.7\\n%%EOF'),
   })).rejects.toThrow('metadata_unavailable');
   expect(fetchMock).toHaveBeenCalledTimes(2);
   expect(fetchMock.mock.calls[0][1]?.method).toBe('POST');
   expect(fetchMock.mock.calls[1][1]?.method).toBe('DELETE');
  } finally {
   vi.unstubAllEnvs();
   vi.unstubAllGlobals();
  }
 });

});
