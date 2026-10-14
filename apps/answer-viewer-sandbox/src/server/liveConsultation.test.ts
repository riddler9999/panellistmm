import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadLiveConsultations } from './liveConsultation';
import { readTickets, readProofs } from './pocketHrData';

vi.mock('./pocketHrData', () => ({ readTickets: vi.fn(), readProofs: vi.fn() }));
const sheetRows = [
  { 'Row ID': 'A-001', Owner_Email: 'a@example.com', Ticket_Title: 'Leave request', Ticket_Status: 'Awaiting Review', AI_Answer: 'PRIVATE AI DRAFT', Final_Answer: 'UNVERIFIED SHEET ANSWER' },
  { 'Row ID': 'B-001', Owner_Email: 'b@example.com', Ticket_Title: 'Policy request', Ticket_Status: 'Approved', Final_Answer: 'UNVERIFIED SHEET ANSWER' },
];
describe('live consultation integration boundary', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(readTickets).mockResolvedValue(sheetRows);
    vi.mocked(readProofs).mockResolvedValue(new Map());
  });
  it('rejects absent principals before any Sheet or DB request', async () => {
    await expect(loadLiveConsultations(null as never)).rejects.toThrow('verified_principal_required');
    expect(readTickets).not.toHaveBeenCalled();
  });
  it('filters owners before proof lookup and excludes private drafts', async () => {
    const rows = await loadLiveConsultations({ email: 'a@example.com', role: 'User' });
    expect(rows.map(row => row.ticketId)).toEqual(['A-001']);
    expect(readProofs).toHaveBeenCalledWith(['A-001']);
    expect(JSON.stringify(rows)).not.toContain('PRIVATE AI DRAFT');
    expect(JSON.stringify(rows)).not.toContain('UNVERIFIED SHEET ANSWER');
  });
  it('does not publish an approved Sheet status without delivery proof', async () => {
    const rows = await loadLiveConsultations({ email: 'b@example.com', role: 'User' });
    expect(rows[0].status).toBe('Approved');
    expect(rows[0].finalAnswer).toBeUndefined();
  });
  it('publishes only immutable approved content with matching successful delivery proof', async () => {
    vi.mocked(readProofs).mockResolvedValue(new Map([['B-001', {
      approval: { requestId: 'B-001', revision: 2, approvedContent: 'RELEASED SNAPSHOT', approvedByAccountId: 'consultant-1', approvedAt: '2026-10-14T08:00:00Z' },
      delivery: { requestId: 'B-001', revision: 2, result: 'success', deliveredAt: '2026-10-14T08:01:00Z' },
    }]]));
    const rows = await loadLiveConsultations({ email: 'b@example.com', role: 'User' });
    expect(rows[0].finalAnswer).toBe('RELEASED SNAPSHOT');
    expect(rows[0].finalAnswer).not.toBe('UNVERIFIED SHEET ANSWER');
  });
  it('keeps failed delivery inaccessible', async () => {
    vi.mocked(readProofs).mockResolvedValue(new Map([['B-001', {
      approval: { requestId: 'B-001', revision: 2, approvedContent: 'PRIVATE', approvedByAccountId: 'consultant-1', approvedAt: '2026-10-14T08:00:00Z' },
      delivery: { requestId: 'B-001', revision: 2, result: 'failed', deliveredAt: null },
    }]]));
    const rows = await loadLiveConsultations({ email: 'b@example.com', role: 'User' });
    expect(rows[0].finalAnswer).toBeUndefined();
  });
});
