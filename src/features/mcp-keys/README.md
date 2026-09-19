# MCP key feature boundary

This feature provides each authenticated user with a purpose-built compatibility
UI for creating and revoking expiring Clerk API keys for `/api/mcp`. OAuth at
`/mcp` is the default. The UI offers only Recipe Vault scopes and 30-, 90-, or
365-day expirations. Clerk's Backend SDK remains the system of record for opaque
API-key issuance, verification, and revocation.
