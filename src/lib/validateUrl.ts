import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export type UrlRejection =
  | "invalid"
  | "scheme"
  | "credentials"
  | "port"
  | "private_host"
  | "dns";

export type UrlCheck =
  | { ok: true; url: URL }
  | { ok: false; reason: UrlRejection; messageBg: string };

type Resolver = (hostname: string) => Promise<string[]>;

const REJECTION_BG: Record<UrlRejection, string> = {
  invalid: "Моля, въведете валиден адрес на сайт.",
  scheme: "Можем да проверяваме само сайтове с адрес http или https.",
  credentials: "Моля, въведете адреса без потребителско име и парола.",
  port: "Този адрес не може да бъде проверен.",
  private_host: "Този адрес не може да бъде проверен.",
  dns: "Не можахме да намерим този сайт. Проверете дали адресът е правилен.",
};

const reject = (reason: UrlRejection): UrlCheck => ({
  ok: false,
  reason,
  messageBg: REJECTION_BG[reason],
});

const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:\/\//i;
const NON_HTTP_SCHEME = /^(javascript|data|file|ftp|mailto|tel|vbscript|about|blob):/i;
const BLOCKED_SUFFIXES = [".local", ".localhost", ".internal", ".lan", ".home", ".corp"];

/** Sync, pure: normalize user input to a URL and reject anything that is not a plain public-looking http(s) address. */
export function normalizeUrl(input: string): UrlCheck {
  const trimmed = input.trim();
  if (trimmed === "" || /\s/.test(trimmed)) return reject("invalid");
  if (NON_HTTP_SCHEME.test(trimmed)) return reject("scheme");

  let url: URL;
  try {
    url = new URL(HAS_SCHEME.test(trimmed) ? trimmed : `https://${trimmed}`);
  } catch {
    return reject("invalid");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") return reject("scheme");
  if (url.username !== "" || url.password !== "") return reject("credentials");
  // Only default ports: stops the checker being used to probe internal services.
  if (url.port !== "" && url.port !== "80" && url.port !== "443") return reject("port");

  const hostname = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (isIP(hostname) !== 0) {
    return isPrivateIp(hostname) ? reject("private_host") : { ok: true, url };
  }
  if (hostname === "localhost" || BLOCKED_SUFFIXES.some((s) => hostname.endsWith(s))) {
    return reject("private_host");
  }
  // A real public site has at least "name.tld"; single labels are intranet names.
  if (!hostname.includes(".")) return reject("invalid");

  return { ok: true, url };
}

/** True for loopback, private, link-local, CGNAT, multicast, reserved and other non-public addresses. */
export function isPrivateIp(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) return isPrivateIpv4(ip.split(".").map(Number));
  if (version === 6) return isPrivateIpv6(ip);
  return true; // unparseable: treat as unsafe
}

function isPrivateIpv4([a, b, c]: number[]): boolean {
  return (
    a === 0 ||
    a === 10 ||
    (a === 100 && b >= 64 && b <= 127) ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0 && c === 0) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224 // multicast + reserved + broadcast
  );
}

function parseIpv6(ip: string): number[] | null {
  let text = ip.toLowerCase().split("%")[0]; // drop zone id
  const dotted = text.match(/(\d+\.\d+\.\d+\.\d+)$/);
  if (dotted) {
    const [a, b, c, d] = dotted[1].split(".").map(Number);
    text = text.slice(0, -dotted[1].length) + `${((a << 8) | b).toString(16)}:${((c << 8) | d).toString(16)}`;
  }
  const halves = text.split("::");
  if (halves.length > 2) return null;
  const head = halves[0] === "" ? [] : halves[0].split(":");
  const tail = halves.length === 2 && halves[1] !== "" ? halves[1].split(":") : [];
  const missing = 8 - head.length - tail.length;
  if (halves.length === 1 ? missing !== 0 : missing < 1) return null;
  const groups = [...head, ...Array<string>(halves.length === 2 ? missing : 0).fill("0"), ...tail].map((g) => parseInt(g, 16));
  return groups.length === 8 && groups.every((g) => g >= 0 && g <= 0xffff) ? groups : null;
}

function isPrivateIpv6(ip: string): boolean {
  const g = parseIpv6(ip);
  if (!g) return true;
  const embeddedV4 = [g[6] >> 8, g[6] & 255, g[7] >> 8, g[7] & 255];
  const first5Zero = g.slice(0, 5).every((x) => x === 0);
  if (first5Zero && g[5] === 0) return true; // ::, ::1 and deprecated IPv4-compatible forms
  if (first5Zero && g[5] === 0xffff) return isPrivateIpv4(embeddedV4); // IPv4-mapped
  if (g[0] === 0x64 && g[1] === 0xff9b && g.slice(2, 6).every((x) => x === 0)) return isPrivateIpv4(embeddedV4); // NAT64
  if ((g[0] & 0xfe00) === 0xfc00) return true; // fc00::/7 unique local
  if ((g[0] & 0xffc0) === 0xfe80) return true; // fe80::/10 link-local
  if ((g[0] & 0xff00) === 0xff00) return true; // multicast
  if (g[0] === 0x2001 && g[1] === 0x0db8) return true; // documentation
  return false;
}

const systemResolver: Resolver = async (hostname) =>
  (await lookup(hostname, { all: true })).map((r) => r.address);

/**
 * Resolve the host and reject if ANY address is non-public.
 * Known limit: fetch() resolves again itself, so a DNS-rebinding host can still race this check.
 */
export async function assertPublicHost(url: URL, resolve: Resolver = systemResolver): Promise<UrlCheck> {
  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  if (isIP(hostname) !== 0) {
    return isPrivateIp(hostname) ? reject("private_host") : { ok: true, url };
  }
  let addresses: string[];
  try {
    addresses = await resolve(hostname);
  } catch {
    return reject("dns");
  }
  if (addresses.length === 0) return reject("dns");
  return addresses.some(isPrivateIp) ? reject("private_host") : { ok: true, url };
}

/** Full validation used before any network call: normalize, then DNS check. */
export async function validateUrl(input: string, resolve?: Resolver): Promise<UrlCheck> {
  const normalized = normalizeUrl(input);
  return normalized.ok ? assertPublicHost(normalized.url, resolve) : normalized;
}
