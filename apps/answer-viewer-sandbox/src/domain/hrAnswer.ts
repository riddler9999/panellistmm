export type HRAnswerStatus = 'pending_review' | 'resolved' | 'expired';
export type HRArtifactType = 'sop' | 'org_chart' | 'form' | 'file';
export type HRArtifact = { type: HRArtifactType; title: string; url: string };
export type HRAnswer = { answerKey:string; ticketId:string; title:string; status:HRAnswerStatus; finalAnswer:string|null; artifacts:HRArtifact[]; reviewedBy?:string; reviewedAt?:string; updatedAt:string };
export function canRenderFinalAnswer(answer: HRAnswer): boolean { return answer.status === 'resolved' && typeof answer.finalAnswer === 'string' && answer.finalAnswer.trim().length > 0; }
