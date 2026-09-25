import { describe, expect, it } from 'vitest';
import { canRenderFinalAnswer, type HRAnswer } from './hrAnswer';

const base: HRAnswer = { answerKey:'phr_sbx_a4f19c82d7e641b39a60c52e', ticketId:'ticket-sbx-001', title:'Leave policy consultation', status:'resolved', finalAnswer:'Approved answer', artifacts:[], updatedAt:'2026-09-25T09:00:00Z' };

describe('HITL final-answer boundary', () => {
  it('allows only resolved answers with final content', () => {
    expect(canRenderFinalAnswer(base)).toBe(true);
    expect(canRenderFinalAnswer({...base,status:'pending_review'})).toBe(false);
    expect(canRenderFinalAnswer({...base,status:'expired'})).toBe(false);
    expect(canRenderFinalAnswer({...base,finalAnswer:null})).toBe(false);
  });
  it('keeps the public contract free of AI draft fields', () => {
    expect(Object.keys(base)).not.toContain('Sheet_AI_Answer');
    expect(Object.keys(base)).not.toContain('aiDraft');
  });
});
