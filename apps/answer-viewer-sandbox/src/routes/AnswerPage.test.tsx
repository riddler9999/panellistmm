import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AnswerPage } from './AnswerPage';
import type { HRAnswer } from '../domain/hrAnswer';
import { fetchProductionAnswer } from '../data/productionAnswerClient';

vi.mock('../data/productionAnswerClient', () => ({ fetchProductionAnswer: vi.fn() }));
vi.mock('../components/SafeAnswerContent', async importOriginal => {
  const actual = await importOriginal<typeof import('../components/SafeAnswerContent')>();
  return {
    ...actual,
    SafeAnswerContent: ({ content }: { content: string }) => {
      if (content === '__THROW_RENDER__') throw new Error('synthetic renderer failure');
      return <actual.SafeAnswerContent content={content} />;
    },
  };
});

const mockedFetch = vi.mocked(fetchProductionAnswer);
const resolved: HRAnswer = {
  answerKey: 'safe-token',
  ticketId: 'ticket-123',
  title: 'Leave request',
  status: 'resolved',
  finalAnswer: 'အတည်ပြုပြီးသော HR အဖြေ',
  artifacts: [],
  reviewedBy: 'Consultant',
  reviewedAt: '2026-09-25T08:00:00.000Z',
  updatedAt: '2026-09-25T08:10:00.000Z',
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function view(token = 'safe-token') {
  return render(
    <MemoryRouter initialEntries={[`/answer/${token}`]}>
      <Routes>
        <Route path="/answer/:answerKey" element={<AnswerPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('AnswerPage production contract', () => {
  it('shows only the approved server projection', async () => {
    mockedFetch.mockResolvedValue(resolved);
    view();
    expect(screen.getByText('Loading Answer', { selector: 'strong' })).toBeInTheDocument();
    expect(await screen.findByText("HR Consultant's Answer", { selector: '.eyebrow' })).toBeInTheDocument();
    expect(screen.getByText('အတည်ပြုပြီးသော HR အဖြေ')).toBeInTheDocument();
  });

  it('uses the same safe state for invalid, expired, pending, and unavailable access', async () => {
    mockedFetch.mockResolvedValue(null);
    view('tampered-token');
    expect(await screen.findByText('Answer Unavailable', { selector: 'strong' })).toBeInTheDocument();
    expect(screen.queryByText(/AI draft/i)).not.toBeInTheDocument();
  });

  it('renders projected artifacts and preserves HTTPS-only artifact behavior', async () => {
    mockedFetch.mockResolvedValue({
      ...resolved,
      artifacts: [
        { type: 'sop', title: 'Leave SOP', url: 'https://example.com/leave.drawio' },
        { type: 'file', title: 'Unsafe', url: 'javascript:alert(1)' },
      ],
    });
    view();
    expect(await screen.findByText('Related Documents')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View Diagram' })).toHaveAttribute('href', 'https://example.com/leave.drawio');
    expect(screen.queryByRole('link', { name: 'Open Attachment' })).not.toBeInTheDocument();
  });

  it('contains rich-renderer failures behind a safe state', async () => {
    mockedFetch.mockResolvedValue({ ...resolved, finalAnswer: '__THROW_RENDER__' });
    view();
    await waitFor(() => expect(screen.getByText('Answer Unavailable', { selector: 'strong' })).toBeInTheDocument());
  });
});
