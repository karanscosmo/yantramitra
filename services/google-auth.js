const { OAuth2Client } = require('google-auth-library');

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL;

let oauth2Client = null;

function getOAuth2Client() {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return null;
  }
  if (!oauth2Client) {
    oauth2Client = new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALLBACK_URL);
  }
  return oauth2Client;
}

function getGoogleAuthUrl() {
  const client = getOAuth2Client();
  if (!client) return null;
  return client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'select_account',
    scope: [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
    ],
  });
}

async function exchangeCodeForTokens(code) {
  const client = getOAuth2Client();
  if (!client) throw new Error('Google OAuth not configured');
  const { tokens } = await client.getToken(code);
  return tokens;
}

async function verifyGoogleToken(idToken) {
  const client = getOAuth2Client();
  if (!client) throw new Error('Google OAuth not configured');
  const ticket = await client.verifyIdToken({
    idToken,
    audience: GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  if (!payload || !payload.email) {
    throw new Error('Invalid Google token: no email in payload');
  }
  return {
    googleId: payload.sub,
    email: payload.email,
    name: payload.name || payload.email.split('@')[0],
    avatar: payload.picture || null,
    emailVerified: payload.email_verified === true,
  };
}

function isConfigured() {
  return !!(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET);
}

module.exports = {
  getGoogleAuthUrl,
  exchangeCodeForTokens,
  verifyGoogleToken,
  isConfigured,
};
