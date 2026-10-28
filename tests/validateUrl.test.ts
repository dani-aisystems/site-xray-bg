import { describe, expect, it } from "vitest";
import { assertPublicHost, isPrivateIp, normalizeUrl, validateUrl } from "@/lib/validateUrl";

describe("normalizeUrl", () => {
  it("adds https:// to a bare domain and trims", () => {
    const r = normalizeUrl("  example.bg  ");
    expect(r.ok && r.url.href).toBe("https://example.bg/");
  });

  it("keeps an explicit http:// or https:// scheme and the path", () => {
    expect(normalizeUrl("http://example.bg/menu")).toMatchObject({ ok: true });
    const r = normalizeUrl("https://www.example.bg/kontakti?x=1");
    expect(r.ok && r.url.pathname).toBe("/kontakti");
  });

  it.each(["", "   ", "not a url", "https://", "http://exa mple.bg"])("rejects invalid input %j", (input) => {
    expect(normalizeUrl(input)).toMatchObject({ ok: false, reason: "invalid" });
  });

  it.each([
    "ftp://example.bg",
    "file:///etc/passwd",
    "javascript:alert(1)",
    "data:text/html,<h1>x</h1>",
    "mailto:a@b.bg",
  ])("rejects non-http(s) scheme %s", (input) => {
    expect(normalizeUrl(input)).toMatchObject({ ok: false, reason: "scheme" });
  });

  it.each([
    "localhost",
    "http://localhost:3000",
    "http://LOCALHOST/",
    "foo.localhost",
    "printer.local",
    "db.internal",
    "intranet",
    "http://127.0.0.1",
    "http://127.1",
    "http://2130706433", // decimal form of 127.0.0.1
    "http://0x7f000001",
    "http://10.0.0.5",
    "http://172.16.0.1",
    "http://172.31.255.255",
    "http://192.168.1.1",
    "http://169.254.169.254/latest/meta-data", // cloud metadata
    "http://100.64.0.1",
    "http://0.0.0.0",
    "http://[::1]",
    "http://[::ffff:127.0.0.1]",
    "http://[fe80::1]",
    "http://[fd00::1]",
  ])("blocks private/internal host %s", (input) => {
    const r = normalizeUrl(input);
    expect(r.ok).toBe(false);
  });

  it("rejects credentials and non-default ports", () => {
    expect(normalizeUrl("https://user:pass@example.bg")).toMatchObject({ ok: false, reason: "credentials" });
    expect(normalizeUrl("https://example.bg:8080")).toMatchObject({ ok: false, reason: "port" });
    expect(normalizeUrl("https://example.bg:443")).toMatchObject({ ok: true });
  });

  it("allows public IP literals", () => {
    expect(normalizeUrl("http://93.184.216.34")).toMatchObject({ ok: true });
  });

  it("gives a Bulgarian message on rejection", () => {
    const r = normalizeUrl("localhost");
    expect(!r.ok && r.messageBg).toMatch(/[а-я]/i);
  });
});

describe("isPrivateIp", () => {
  it.each(["8.8.8.8", "93.184.216.34", "172.15.0.1", "172.32.0.1", "100.63.0.1", "2606:4700:4700::1111"])(
    "treats %s as public",
    (ip) => expect(isPrivateIp(ip)).toBe(false),
  );
  it.each(["::", "::1", "::ffff:10.0.0.1", "::ffff:7f00:1", "64:ff9b::7f00:1", "ff02::1", "2001:db8::1", "fc00::1"])(
    "treats %s as private",
    (ip) => expect(isPrivateIp(ip)).toBe(true),
  );
  it("treats IPv4-mapped public addresses as public", () => {
    expect(isPrivateIp("::ffff:8.8.8.8")).toBe(false);
  });
});

describe("assertPublicHost / validateUrl", () => {
  const url = new URL("https://example.bg");

  it("accepts a host that resolves to public addresses", async () => {
    expect(await assertPublicHost(url, async () => ["93.184.216.34"])).toMatchObject({ ok: true });
  });

  it("rejects a public-looking name that resolves to a private address", async () => {
    expect(await assertPublicHost(url, async () => ["10.0.0.7"])).toMatchObject({ ok: false, reason: "private_host" });
  });

  it("rejects when ANY resolved address is private", async () => {
    expect(await assertPublicHost(url, async () => ["93.184.216.34", "127.0.0.1"])).toMatchObject({ ok: false });
  });

  it("rejects when DNS fails or returns nothing", async () => {
    expect(await assertPublicHost(url, async () => { throw new Error("ENOTFOUND"); })).toMatchObject({ ok: false, reason: "dns" });
    expect(await assertPublicHost(url, async () => [])).toMatchObject({ ok: false, reason: "dns" });
  });

  it("validateUrl never resolves DNS for input that fails normalization", async () => {
    let called = false;
    const r = await validateUrl("http://127.0.0.1", async () => { called = true; return ["8.8.8.8"]; });
    expect(r.ok).toBe(false);
    expect(called).toBe(false);
  });
});
