import { ANSWER_FIXTURES } from './answerFixtures';
import type { HRAnswer } from '../domain/hrAnswer';
const KEY=/^phr_sbx_[a-f0-9]{24}$/;
export const isValidSandboxAnswerKey=(value:string)=>KEY.test(value);
export function getSandboxAnswer(answerKey:string):HRAnswer|null { if(!isValidSandboxAnswerKey(answerKey)) return null; return ANSWER_FIXTURES[answerKey] ?? null; }
