// Signed session cookie: base64url(json).hmac  (works in edge middleware + node)
const enc = new TextEncoder();
const secret = () => process.env.SESSION_SECRET || process.env.APP_PASSWORD || 'dev';
const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
async function hmac(data) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret()), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64(await crypto.subtle.sign('HMAC', key, enc.encode(data)));
}
export async function sign(user) {
  const body = b64(enc.encode(JSON.stringify({ u: user.username, r: user.role, n: user.name || user.username })));
  return body + '.' + (await hmac(body));
}
export async function verify(cookie) {
  if (!cookie) return null;
  const [body, sig] = cookie.split('.');
  if (!body || sig !== (await hmac(body))) return null;
  try {
    const j = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(body.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0))));
    return { username: j.u, role: j.r, name: j.n };
  } catch { return null; }
}
