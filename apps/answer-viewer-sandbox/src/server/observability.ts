export type ViewerEvent =
  | 'viewer_access_success'
  | 'viewer_access_denied'
  | 'viewer_token_invalid'
  | 'viewer_ticket_not_resolved'
  | 'viewer_ticket_not_found'
  | 'viewer_render_failure';

export interface ViewerLogger {
  event(name: ViewerEvent, metadata?: Record<string, string | number | boolean>): void;
}

export const noopViewerLogger: ViewerLogger = { event() {} };
