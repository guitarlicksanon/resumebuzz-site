import { clearSessionCookie, json } from './lib.js';

export async function onRequestPost({ request, env }) {
  const cookie = request.headers.get('Cookie') || '';
  const match = cookie.match(/rb_jb_session=([a-f0-9]{64})/);
  if (match) {
    await env.JD_STORE.delete('jbsession:' + match[1]);
  }
  return json({ ok: true }, 200, { 'Set-Cookie': clearSessionCookie() });
}
