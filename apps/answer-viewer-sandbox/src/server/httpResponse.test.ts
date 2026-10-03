import { describe, expect, it } from 'vitest';
import { answerJsonResponse, unavailableJsonResponse } from './httpResponse';

describe('protected response headers', () => {
  it('uses private no-store headers for successful answers', () => {
    const response = answerJsonResponse({ ticketId: 't1' });
    expect(response.status).toBe(200);
    expect(response.headers['Cache-Control']).toContain('private');
    expect(response.headers['Cache-Control']).toContain('no-store');
    expect(response.headers.Pragma).toBe('no-cache');
  });

  it('returns the same generic unavailable body for denied states', () => {
    expect(unavailableJsonResponse()).toMatchObject({
      status: 404,
      body: { error: 'answer_unavailable' },
    });
  });
});
