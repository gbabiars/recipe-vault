export type RateLimitPolicy = { limit: number; windowMs: number };
export type RateLimitResult = { allowed: boolean; retryAfterSeconds: number };

export interface RateLimiter {
  check(key: string, policy: RateLimitPolicy, now?: number): RateLimitResult;
}

/**
 * Development fallback only. It is process-local and therefore not suitable for
 * enforcing production limits across Vercel serverless instances.
 */
export class InMemoryRateLimiter implements RateLimiter {
  private readonly buckets = new Map<string, number[]>();

  check(key: string, policy: RateLimitPolicy, now = Date.now()): RateLimitResult {
    const start = now - policy.windowMs;
    const events = (this.buckets.get(key) ?? []).filter((event) => event > start);
    if (events.length >= policy.limit) {
      this.buckets.set(key, events);
      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, Math.ceil((events[0] + policy.windowMs - now) / 1000)),
      };
    }
    events.push(now);
    this.buckets.set(key, events);
    return { allowed: true, retryAfterSeconds: 0 };
  }
}

export const defaultRateLimiter = new InMemoryRateLimiter();
export const recipeReadLimit = { limit: 120, windowMs: 60_000 } as const;
export const recipeWriteLimit = { limit: 30, windowMs: 60_000 } as const;
