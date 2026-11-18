/**
 * Lightweight stand-in for `tldts`, aliased in vite.config.ts.
 *
 * MSW keeps a cookie jar (tough-cookie), and tough-cookie imports `getDomain` from `tldts`,
 * which bundles the whole Public Suffix List (~200 KB of source, ~40% of the mock chunk).
 * This app never uses cookies (the session is a bearer token), so the jar only ever sees the
 * page's own host. Returning the last two labels (or the host itself for single-label hosts
 * and IPs) is enough for that and keeps the demo build lean.
 */
export function getDomain(hostname: string): string | null {
  if (!hostname) return null
  const host = hostname.toLowerCase().replace(/\.$/, '')
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(':')) return host
  const labels = host.split('.')
  return labels.length <= 2 ? host : labels.slice(-2).join('.')
}
