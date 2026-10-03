export type TicketRow = {
  Ticket_ID?: string | null;
  Row_ID?: string | null;
  Ticket_Title?: string | null;
  Ticket_Status?: string | null;
  Final_Answer?: string | null;
  Sheet_AI_Answer?: string | null;
  Consultant_Answer?: string | null;
  Reviewed_By?: string | null;
  Reviewed_At?: string | null;
  Updated_At?: string | null;
  Artifact_Type?: string | null;
  Artifact_Title?: string | null;
  Artifact_URL?: string | null;
  Artifact_Status?: string | null;
  Artifacts?: unknown;
  [key: string]: unknown;
};
