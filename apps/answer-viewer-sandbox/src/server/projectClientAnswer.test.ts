import { describe, expect, it } from 'vitest';
import { projectClientAnswer } from './projectClientAnswer';
import type { TicketRow } from './ticketRow';

const base: TicketRow = {
  Ticket_ID: 'ticket-123',
  Ticket_Title: 'Leave request',
  Ticket_Status: 'Delivered',
  Final_Answer: 'Approved final answer',
  Sheet_AI_Answer: 'SECRET AI DRAFT',
  Consultant_Answer: 'SECRET CONSULTANT DRAFT',
  Reviewed_By: 'Consultant',
  Reviewed_At: '2026-09-25T08:00:00.000Z',
  Updated_At: '2026-09-25T08:10:00.000Z',
};

describe('projectClientAnswer', () => {
  it('returns null when ticket is not resolved', () => {
    expect(projectClientAnswer({ ...base, Ticket_Status: 'Awaiting Review' })).toBeNull();
  });

  it('returns null when Final_Answer is empty', () => {
    expect(projectClientAnswer({ ...base, Final_Answer: '   ' })).toBeNull();
  });

  it('returns only the approved client projection', () => {
    const result = projectClientAnswer(base);
    expect(result).toEqual({
      answerKey: 'ticket-123',
      ticketId: 'ticket-123',
      title: 'Leave request',
      status: 'resolved',
      finalAnswer: 'Approved final answer',
      artifacts: [],
      reviewedBy: 'Consultant',
      reviewedAt: '2026-09-25T08:00:00.000Z',
      updatedAt: '2026-09-25T08:10:00.000Z',
    });
    const json = JSON.stringify(result);
    expect(json).not.toContain('Sheet_AI_Answer');
    expect(json).not.toContain('SECRET AI DRAFT');
    expect(json).not.toContain('Consultant_Answer');
    expect(json).not.toContain('SECRET CONSULTANT DRAFT');
  });
});
