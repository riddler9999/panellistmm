import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { ConsultationDashboard } from './ConsultationDashboard';
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
describe('Glide dashboard scaffold', () => {
  it('fails closed when secure handoff is unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 403 })));
    render(<ConsultationDashboard />);
    expect(await screen.findByText('Pocket HR')).toBeInTheDocument();
    expect(screen.queryByText('All Requests')).not.toBeInTheDocument();
  });
  it('renders responsive ticket cards from server projection', async () => {
    // Explicitly enter sample-only preview; no authenticated session is available.
        render(<ConsultationDashboard />);
    screen.getByRole('button', { name: /Preview Reference UI/i }).click();
    expect(await screen.findByText('Leave Policy Consultation')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /New Request/i })).toBeDisabled();
  });
});
