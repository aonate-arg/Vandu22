/* Guarda el mail en una lista de Brevo (función de Vercel: POST /api/suscribir).
   Variables de entorno en Vercel → Settings → Environment Variables:
     BREVO_API_KEY  clave de API de Brevo (SMTP & API → API Keys)
     BREVO_LIST_ID  número de la lista donde se guardan los contactos (Contactos → Listas) */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method' });
  }

  const { email = '', website = '' } = req.body || {};
  // Campo trampa: las personas no lo ven, los bots lo completan
  if (website) return res.status(200).json({ ok: true });

  const clean = String(email).trim().toLowerCase();
  if (!EMAIL_RE.test(clean) || clean.length > 254) {
    return res.status(400).json({ ok: false, error: 'email' });
  }

  const { BREVO_API_KEY, BREVO_LIST_ID } = process.env;
  if (!BREVO_API_KEY || !BREVO_LIST_ID) {
    console.error('Faltan BREVO_API_KEY o BREVO_LIST_ID');
    return res.status(500).json({ ok: false, error: 'config' });
  }

  try {
    const r = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: {
        'api-key': BREVO_API_KEY,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      // updateEnabled: si el mail ya existe, lo suma a la lista en vez de dar error
      body: JSON.stringify({
        email: clean,
        listIds: [Number(BREVO_LIST_ID)],
        updateEnabled: true,
      }),
    });
    if (!r.ok) {
      console.error('Brevo respondió', r.status, await r.text());
      return res.status(502).json({ ok: false, error: 'brevo' });
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('No se pudo conectar con Brevo', err);
    return res.status(502).json({ ok: false, error: 'brevo' });
  }
}
