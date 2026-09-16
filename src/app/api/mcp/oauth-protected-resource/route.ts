// Next.js route matching is exact, so expose the RFC 9728 metadata subresource
// explicitly while sharing the MCP route's OAuth middleware and configuration.
import { GET as metadata } from "../route";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const GET = metadata;
