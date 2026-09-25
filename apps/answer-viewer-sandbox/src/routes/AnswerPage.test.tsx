import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { AnswerPage } from './AnswerPage';
import { FIXTURE_KEYS } from '../data/answerFixtures';

afterEach(() => cleanup());

function view(key: string) {
  return render(
    <MemoryRouter initialEntries={[`/answer/${key}`]}>
      <Routes>
        <Route path="/answer/:answerKey" element={<AnswerPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('AnswerPage HITL behavior', () => {
  it('shows resolved final answer', () => {
    view(FIXTURE_KEYS.longBurmese);
    expect(screen.getByText("HR Consultant's Answer", { selector: '.eyebrow' })).toBeInTheDocument();
    expect(screen.getByText(/ဝန်ထမ်း၏ ခွင့်တောင်းဆိုမှု/)).toBeInTheDocument();
  });

  it('never leaks pending finalAnswer', () => {
    view(FIXTURE_KEYS.pending);
    expect(screen.queryByText('THIS MUST NEVER BE VISIBLE TO THE CLIENT')).not.toBeInTheDocument();
    expect(screen.getByText('Pending Review', { selector: 'strong' })).toBeInTheDocument();
  });

  it('never leaks expired finalAnswer', () => {
    view(FIXTURE_KEYS.expired);
    expect(screen.queryByText('EXPIRED CONTENT MUST NEVER BE VISIBLE')).not.toBeInTheDocument();
    expect(screen.getByText('Expired', { selector: 'strong' })).toBeInTheDocument();
  });

  it('shows a rendering-failure state for resolved answers with no final content', () => {
    view(FIXTURE_KEYS.missingFinal);
    expect(screen.getByText('Answer Unavailable', { selector: 'strong' })).toBeInTheDocument();
    expect(screen.queryByText('Expired', { selector: 'strong' })).not.toBeInTheDocument();
    expect(screen.queryByText("HR Consultant's Answer", { selector: '.eyebrow' })).not.toBeInTheDocument();
  });

  it('fails safely for invalid and unknown keys', () => {
    const invalid = view('1');
    expect(screen.getByText(/invalid answer link/i)).toBeInTheDocument();
    invalid.unmount();
    view('phr_sbx_000000000000000000000000');
    expect(screen.getByText(/answer not found/i)).toBeInTheDocument();
  });

  it('shows all safe artifacts and omits empty section', () => {
    const noArtifacts = view(FIXTURE_KEYS.longBurmese);
    expect(screen.queryByText('Related Documents')).not.toBeInTheDocument();
    noArtifacts.unmount();
    view(FIXTURE_KEYS.multiple);
    expect(screen.getByText('Related Documents')).toBeInTheDocument();
    expect(screen.getAllByRole('link')).toHaveLength(3);
  });

  it('does not expose malicious artifact as a link', () => {
    view(FIXTURE_KEYS.malicious);
    expect(screen.queryByRole('link', { name: 'Open Attachment' })).not.toBeInTheDocument();
  });
});
