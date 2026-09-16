export function requestId(request: Request): string {
  return request.headers.get("x-request-id")?.slice(0, 128) || crypto.randomUUID();
}

export function logApiEvent(event: Record<string, unknown>): void {
  // Deliberately structured and payload-free: never add request headers or recipe bodies here.
  console.info(JSON.stringify({ service: "recipe-vault-api", ...event }));
}
