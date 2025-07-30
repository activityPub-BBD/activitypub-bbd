import { jwtVerify, createRemoteJWKSet } from 'jose';


const JWKS = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));

export async function verifyGoogleJwt(jwt: string) {
  try {
    // verify jwt's signature and validate claims
    const { payload } = await jwtVerify(jwt, JWKS, {
      issuer: 'https://accounts.google.com',
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    return payload;

  } catch (err) {
    console.error('Error verifying Google ID token:', err);
    throw new Error('Google token verification failed');
  }
}