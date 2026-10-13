import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { ConsultationDashboard } from './ConsultationDashboard';
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
describe('Glide dashboard scaffold', () => {
  it('fails closed when secure handoff is unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 403 })));
    render(<ConsultationDashboard />);
    expect(await screen.findByText('Account Verification')).toBeInTheDocument();
    expect(screen.queryByText('All Tickets')).not.toBeInTheDocument();
  });
  it('renders responsive ticket cards from server projection', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => url.includes('pocket-hr-session') ? ({ ok: true, json: async () => ({ email: 'a@example.com', role: 'User' }) }) : ({ ok: true, json: async () => ({role:'User',tickets:[{ticketId:'test',title:'My HR Request',status:'Resolved',history:[]}]}) })));
    render(<ConsultationDashboard />);
    expect(await screen.findByText('My HR Request')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /New Request/i })).toBeDisabled();
  });
});
