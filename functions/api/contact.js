function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
}

export async function onRequestPost({ request }) {
  let name, email, message;
  try {
    const body = await request.json();
    name    = (body.name    || '').trim();
    email   = (body.email   || '').trim();
    message = (body.message || '').trim();
  } catch {
    return json({ error: 'Invalid request.' }, 400);
  }

  if (!name || !email || !message) return json({ error: 'All fields are required.' }, 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'Invalid email address.' }, 400);

  await fetch('https://api.mailchannels.net/tx/v1/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: 'hoabot@pm.me', name: 'ResumeBuzz' }] }],
      from: { email: 'noreply@buzzresume.com', name: 'ResumeBuzz' },
      reply_to: { email: email, name: name },
      subject: 'New Message from ' + name,
      content: [{
        type: 'text/html',
        value: [
          '<div style="font-family:sans-serif;font-size:15px;color:#111;max-width:560px;">',
          '<h2 style="color:#C9A84C;margin-bottom:20px;">ResumeBuzz - New Message</h2>',
          '<p><strong>Name:</strong> ' + esc(name) + '</p>',
          '<p><strong>Email:</strong> <a href="mailto:' + esc(email) + '" style="color:#C9A84C;">' + esc(email) + '</a></p>',
          '<p style="margin-top:16px;"><strong>Message:</strong></p>',
          '<p style="background:#1B1B1B;color:#EBEBEB;padding:14px;border-radius:8px;border-left:3px solid #C9A84C;">' + esc(message).replace(/\n/g, '<br>') + '</p>',
          '</div>'
        ].join('')
      }]
    })
  }).catch(() => {});

  return json({ ok: true });
}
