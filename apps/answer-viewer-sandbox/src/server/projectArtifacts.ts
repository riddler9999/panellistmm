import type { HRArtifact, HRArtifactType } from '../domain/hrAnswer';
import type { TicketRow } from './ticketRow';

const allowedTypes = new Set<HRArtifactType>(['sop','org_chart','form','file']);

function isSafeHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

function normalizeArtifact(value: unknown): HRArtifact | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  const type = String(raw.type ?? '').trim() as HRArtifactType;
  const title = String(raw.title ?? '').trim();
  const url = String(raw.url ?? '').trim();
  if (!allowedTypes.has(type) || !isSafeHttpsUrl(url)) return null;
  return { type, title: title || 'Document', url };
}

export function projectArtifacts(row: TicketRow): HRArtifact[] {
  if (Array.isArray(row.Artifacts)) {
    return row.Artifacts.map(normalizeArtifact).filter((item): item is HRArtifact => item !== null);
  }

  const type = String(row.Artifact_Type ?? '').trim() as HRArtifactType;
  const url = String(row.Artifact_URL ?? '').trim();
  if (!allowedTypes.has(type) || !isSafeHttpsUrl(url)) return [];
  const title = String(row.Artifact_Title ?? '').trim() || 'Document';
  return [{ type, title, url }];
}
