export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const secret = '6LdJyUgrAAAAABieDEQlyNxyNauhWyvJSgiGrRCX';
  const token = req.body['g-recaptcha-response'];

  if (!token) {
    return res.status(400).json({ error: 'No CAPTCHA token provided' });
  }

  const verifyURL = `https://www.google.com/recaptcha/api/siteverify?secret=${secret}&response=${token}`;

  const response = await fetch(verifyURL, {
    method: 'POST'
  });

  const data = await response.json();

  if (data.success) {
    return res.status(200).json({ success: true, message: 'CAPTCHA passed!' });
  } else {
    return res.status(400).json({ success: false, error: 'CAPTCHA failed' });
  }
}
