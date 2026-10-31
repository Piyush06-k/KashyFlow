/**
 * Biometric & Vault Security Service
 * Utilizes WebAuthn (navigator.credentials) for Touch ID / Face ID / Windows Hello
 * with graceful PIN fallback.
 */

export async function isBiometricsAvailable(): Promise<boolean> {
  if (
    typeof window !== 'undefined' &&
    window.PublicKeyCredential &&
    typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function'
  ) {
    try {
      return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch {
      return false;
    }
  }
  return false;
}

export async function registerBiometricPasskey(): Promise<boolean> {
  if (!window.PublicKeyCredential) return false;

  try {
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const userId = new Uint8Array(16);
    window.crypto.getRandomValues(userId);

    const credential = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: 'KashFlow Personal Vault', id: window.location.hostname },
        user: {
          id: userId,
          name: 'user@kashflow.local',
          displayName: 'Vault Owner',
        },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 }, // ES256
          { type: 'public-key', alg: -257 }, // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'preferred',
          requireResidentKey: false,
        },
        timeout: 60000,
        attestation: 'none',
      },
    });

    return !!credential;
  } catch (err: any) {
    console.warn('Biometric registration error or cancelled:', err?.message || err);
    return false;
  }
}

export async function authenticateWithBiometrics(): Promise<boolean> {
  if (!window.PublicKeyCredential) return false;

  try {
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        rpId: window.location.hostname,
        userVerification: 'preferred',
        timeout: 60000,
      },
    });

    return !!assertion;
  } catch (err: any) {
    console.warn('Biometric unlock cancelled or failed:', err?.message || err);
    return false;
  }
}
