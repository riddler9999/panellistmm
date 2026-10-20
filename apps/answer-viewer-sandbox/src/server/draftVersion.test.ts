import { describe, expect, it } from 'vitest';
import { draftVersion } from './draftVersion';

describe('Supabase consultation draft versions', () => {
 it('matches dashboard projection and approval lookup for an unchanged draft', () => {
  // The dashboard builds a sparse TicketRow; the approval API used to supply
  // explicit empty Sheet-only columns for the same request.
  const dashboard = { Request_Text: 'Original HR request' };
  const approval = {
   Request_Text: 'Original HR request',
   Consultant_Answer: '', Clarification_Question: '', AI_Answer: '',
   Sheet_AI_Answer: '', Review_Status: '',
  };
  expect(draftVersion(dashboard, 'AI clarification draft')).toBe(
   draftVersion(approval, 'AI clarification draft')
  );
 });
 it('rejects a changed pending AI draft or a changed original request', () => {
  const row = { Request_Text: 'Original HR request' };
  const current = draftVersion(row, 'AI clarification draft');
  expect(draftVersion(row, 'Changed AI clarification')).not.toBe(current);
  expect(draftVersion({ Request_Text: 'Changed HR request' }, 'AI clarification draft'))
   .not.toBe(current);
 });
});
