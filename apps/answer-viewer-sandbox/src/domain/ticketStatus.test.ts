import { describe, expect, it } from 'vitest';
import { ticketStatus } from './ticketStatus';

describe('role-specific ticket status labels', () => {
  it('distinguishes delivered answers from clarification requests', () => {
    expect(ticketStatus('Approved', 'admin')).toBe('Response delivered');
    expect(ticketStatus('Approved', 'user')).toBe('Consultant replied');
    expect(ticketStatus('Needs Clarification', 'admin')).toBe('Waiting for user response');
    expect(ticketStatus('Needs Clarification', 'user')).toBe('Your response is needed');
  });
  it('keeps internal review states distinct', () => {
    expect(ticketStatus('Awaiting Review', 'admin')).toBe('Needs approval');
    expect(ticketStatus('Awaiting Review', 'user')).toBe('Consultant reviewing');
    expect(ticketStatus('Closed', 'user')).toBe('Closed');
  });
});
