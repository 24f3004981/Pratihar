import type { PoolConfig } from "pg";

/**
 * Tiger Cloud URIs carry `sslmode=require`, which current `pg` turns into full certificate
 * verification against Node's bundled CAs, and that fails on some machines ("self-signed
 * certificate in chain", usually a proxy or antivirus re-signing TLS). We keep TLS on and
 * verify by default; set TIGER_SSL_VERIFY=false only if your network re-signs certificates.
 */
export function tigerPoolConfig(uri: string): PoolConfig {
  const u = new URL(uri);
  u.searchParams.delete("sslmode");
  const verify = (process.env.TIGER_SSL_VERIFY ?? "true").toLowerCase() !== "false";
  return { connectionString: u.toString(), max: 4, ssl: { rejectUnauthorized: verify }, connectionTimeoutMillis: 10_000 };
}
