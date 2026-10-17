/** Explicit release-policy checks; they do not substitute for a database transaction. */
export function validatePinPolicy(policy:{digits:number;requiresIndependentIdentity:boolean}):boolean{
 return policy.requiresIndependentIdentity && Number.isSafeInteger(policy.digits) && policy.digits>=4;
}
export function assessSheetMutation(input:{expectedRevision:number;actualRevision:number;rowIdMatches:boolean}):'ok'|'conflict'|'row_moved'{
 if(!input.rowIdMatches)return 'row_moved';
 if(input.expectedRevision!==input.actualRevision)return 'conflict';
 return 'ok';
}
