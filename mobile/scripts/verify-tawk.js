/**
 * Verify Tawk.to live chat configuration and endpoint reachability.
 * Run: node scripts/verify-tawk.js
 */
const PROPERTY_ID = process.env.EXPO_PUBLIC_TAWK_PROPERTY_ID || '6a38286a0f2eba1d56794e32';
const WIDGET_ID = process.env.EXPO_PUBLIC_TAWK_WIDGET_ID || '1jrllrok0';

const CHAT_URL = `https://tawk.to/chat/${PROPERTY_ID}/${WIDGET_ID}`;
const EMBED_URL = `https://embed.tawk.to/${PROPERTY_ID}/${WIDGET_ID}`;

async function check(label, url) {
  try {
    const res = await fetch(url, { method: 'GET', redirect: 'follow' });
    const ok = res.status >= 200 && res.status < 400;
    console.log(`${ok ? '✓' : '✗'} ${label}: HTTP ${res.status} — ${url}`);
    return ok;
  } catch (err) {
    console.log(`✗ ${label}: ${err.message} — ${url}`);
    return false;
  }
}

async function main() {
  console.log('Pingload Tawk.to verification\n');
  console.log(`Property ID: ${PROPERTY_ID}`);
  console.log(`Widget ID:   ${WIDGET_ID}\n`);

  const results = await Promise.all([
    check('Chat page', CHAT_URL),
    check('Embed script', EMBED_URL),
  ]);

  const allOk = results.every(Boolean);
  console.log(allOk ? '\nAll Tawk endpoints reachable.' : '\nSome endpoints failed — check network or credentials.');
  process.exit(allOk ? 0 : 1);
}

main();
