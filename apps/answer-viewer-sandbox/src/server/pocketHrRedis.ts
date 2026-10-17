/** Server-side only. Never expose the Upstash REST token to the browser. */
export async function redisCommand<T = unknown>(command: Array<string | number>): Promise<T> {
 const url = process.env.UPSTASH_REDIS_REST_URL;
 const token = process.env.UPSTASH_REDIS_REST_TOKEN;
 if (!url || !token || !/^https:\/\//.test(url)) throw new Error('redis_not_configured');
 const response = await fetch(url.replace(/\/$/, ''), {
  method: 'POST',
  headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
  body: JSON.stringify(command),
  cache: 'no-store',
 });
 if (!response.ok) throw new Error('redis_request_failed');
 const data = await response.json() as { result?: T; error?: string };
 if (data.error || !Object.prototype.hasOwnProperty.call(data,'result')) throw new Error('redis_command_failed');
 return data.result as T;
}
/** Atomic distributed sliding-window attempt counter; failure denies authentication. */
export async function allowAttempt(key:string,limit:number,windowSeconds:number):Promise<boolean>{
 const script = "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]) end; return n";
 const count = await redisCommand<number>(['EVAL',script,1,key,windowSeconds]);
 if (!Number.isSafeInteger(count)) throw new Error('redis_invalid_counter');
 return count <= limit;
}
