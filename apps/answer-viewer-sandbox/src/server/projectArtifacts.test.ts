import { describe, expect, it } from 'vitest';
import { projectArtifacts } from './projectArtifacts';

describe('projectArtifacts', () => {
  it('returns no artifacts when none are present', () => {
    expect(projectArtifacts({ Ticket_ID: 't1' })).toEqual([]);
  });

  it('maps the legacy single artifact fields', () => {
    expect(projectArtifacts({
      Ticket_ID: 't1',
      Artifact_Type: 'sop',
      Artifact_Title: 'Leave Process',
      Artifact_URL: 'https://example.com/leave.drawio',
    })).toEqual([{ type: 'sop', title: 'Leave Process', url: 'https://example.com/leave.drawio' }]);
  });

  it('maps multiple supported artifacts and defaults missing titles', () => {
    expect(projectArtifacts({
      Ticket_ID: 't1',
      Artifacts: [
        { type: 'org_chart', title: 'Organization Chart', url: 'https://example.com/org.drawio' },
        { type: 'form', title: '', url: 'https://example.com/form.xlsx' },
        { type: 'file', title: 'A'.repeat(300), url: 'https://example.com/file.pdf' },
      ],
    })).toEqual([
      { type: 'org_chart', title: 'Organization Chart', url: 'https://example.com/org.drawio' },
      { type: 'form', title: 'Document', url: 'https://example.com/form.xlsx' },
      { type: 'file', title: 'A'.repeat(300), url: 'https://example.com/file.pdf' },
    ]);
  });

  it('ignores unsupported artifact types or missing URLs', () => {
    expect(projectArtifacts({
      Ticket_ID: 't1',
      Artifacts: [
        { type: 'secret_internal', title: 'Internal', url: 'https://example.com/internal' },
        { type: 'file', title: 'Missing', url: '' },
      ],
    })).toEqual([]);
  });
});
