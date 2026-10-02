import { lookup } from "node:dns/promises";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { isIP, type LookupFunction } from "node:net";

const maxBytes = 1_000_000;
const timeoutMs = 10_000;

export class SourceReadError extends Error {}

function publicAddress(address: string): boolean {
  if (isIP(address) === 6) {
    const normalized = address.toLowerCase();
    return /^(2|3)[0-9a-f]{0,3}:/.test(normalized) && !normalized.includes(".");
  }
  if (isIP(address) !== 4) return false;
  const [a, b, c] = address.split(".").map(Number);
  return !(
    a === 0 ||
    a === 10 ||
    a === 127 ||
    a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && (b === 168 || b === 0)) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113)
  );
}

async function checkedAddresses(url: URL) {
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (!host || host.toLowerCase() === "localhost" || /\.(local|localhost|internal)$/i.test(host))
    throw new SourceReadError("blocked_destination");
  const addresses = isIP(host)
    ? [{ address: host, family: isIP(host) }]
    : await lookup(host, { all: true });
  if (!addresses.length || addresses.some(({ address }) => !publicAddress(address)))
    throw new SourceReadError("blocked_destination");
  return addresses.sort((left, right) => left.family - right.family);
}

export function validateSourceUrl(value: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new SourceReadError("invalid_url");
  }
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    value.length > 2_000
  )
    throw new SourceReadError("invalid_url");
  return url;
}

export function pinnedLookup(address: { address: string; family: number }): LookupFunction {
  return (_hostname, options, callback) => {
    if (options.all) callback(null, [address]);
    else callback(null, address.address, address.family);
  };
}

function requestHtml(
  url: URL,
  address: { address: string; family: number },
): Promise<{ html: string; redirect?: string }> {
  return new Promise((resolve, reject) => {
    const request = (url.protocol === "https:" ? httpsRequest : httpRequest)(
      url,
      {
        headers: {
          accept: "text/html,application/xhtml+xml",
          "accept-encoding": "identity",
          "user-agent": "RecipeVault/1.0",
        },
        lookup: pinnedLookup(address),
        timeout: timeoutMs,
      },
      (response) => {
        const status = response.statusCode ?? 0;
        if (status >= 300 && status < 400 && response.headers.location) {
          response.resume();
          resolve({ html: "", redirect: response.headers.location });
          return;
        }
        if (status === 401 || status === 403) {
          response.resume();
          reject(new SourceReadError("access_denied"));
          return;
        }
        if (
          status !== 200 ||
          !/^text\/html\b|^application\/xhtml\+xml\b/i.test(response.headers["content-type"] ?? "")
        ) {
          response.resume();
          reject(new SourceReadError("unreachable"));
          return;
        }
        const chunks: Buffer[] = [];
        let size = 0;
        response.on("data", (chunk: Buffer) => {
          size += chunk.length;
          if (size > maxBytes) {
            response.destroy(new SourceReadError("too_large"));
            return;
          }
          chunks.push(chunk);
        });
        response.on("end", () => resolve({ html: Buffer.concat(chunks).toString("utf8") }));
        response.on("error", reject);
      },
    );
    request.on("timeout", () => request.destroy(new Error("source_timeout")));
    request.on("error", reject);
    request.end();
  });
}

async function fetchHtml(url: URL): Promise<{ html: string; redirect?: string }> {
  const addresses = await checkedAddresses(url);
  for (const address of addresses) {
    try {
      return await requestHtml(url, address);
    } catch (error) {
      if (error instanceof SourceReadError) throw error;
    }
  }
  throw new SourceReadError("unreachable");
}

export function extractSourceText(html: string): string {
  const jsonLd = [
    ...html.matchAll(
      /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
    ),
  ]
    .map((match) => match[1])
    .join("\n")
    .slice(0, 50_000);
  const visible = html
    .replace(/<(script|style|noscript|svg)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&(?:nbsp|#160);/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 50_000);
  return `${jsonLd}\n${visible}`.trim();
}

export async function readSource(value: string): Promise<{ sourceUrl: string; text: string }> {
  let url = validateSourceUrl(value);
  try {
    for (let redirects = 0; redirects <= 3; redirects++) {
      const result = await fetchHtml(url);
      if (result.redirect) {
        url = validateSourceUrl(new URL(result.redirect, url).href);
        continue;
      }
      const text = extractSourceText(result.html);
      if (!text) throw new SourceReadError("no_recipe");
      return { sourceUrl: value, text };
    }
    throw new SourceReadError("unreachable");
  } catch (error) {
    if (error instanceof SourceReadError) throw error;
    throw new SourceReadError("unreachable");
  }
}
