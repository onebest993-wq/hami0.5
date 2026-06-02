const CREDENTIAL_STORAGE_KEY = 'hami:webauthn-credential-id';

function bufferToBase64Url(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]!);
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBuffer(base64url: string): ArrayBuffer {
    const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes.buffer;
}

export function hasStoredBiometricCredential(): boolean {
    try {
        return Boolean(localStorage.getItem(CREDENTIAL_STORAGE_KEY));
    } catch {
        return false;
    }
}

export function clearStoredBiometricCredential(): void {
    try {
        localStorage.removeItem(CREDENTIAL_STORAGE_KEY);
    } catch {
        /* private mode */
    }
}

function storeCredentialId(rawId: ArrayBuffer): void {
    localStorage.setItem(CREDENTIAL_STORAGE_KEY, bufferToBase64Url(rawId));
}

export function isWebAuthnLockSupported(): boolean {
    return typeof window !== 'undefined' && window.isSecureContext && Boolean(navigator.credentials?.create);
}

/** Register platform authenticator and persist credential id for later unlock. */
export async function registerBiometricCredential(): Promise<boolean> {
    if (!isWebAuthnLockSupported()) return false;

    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);

    const credential = (await navigator.credentials.create({
        publicKey: {
            challenge,
            rp: { name: 'Hami Legal', id: window.location.hostname },
            user: {
                id: crypto.getRandomValues(new Uint8Array(16)),
                name: 'hami-lawyer-lock',
                displayName: 'قفل حامي',
            },
            pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
            authenticatorSelection: {
                authenticatorAttachment: 'platform',
                userVerification: 'required',
                residentKey: 'preferred',
            },
            timeout: 60_000,
        },
    })) as PublicKeyCredential | null;

    if (!credential?.rawId) return false;
    storeCredentialId(credential.rawId);
    return true;
}

/** Verify possession of registered authenticator. */
export async function verifyBiometricUnlock(): Promise<boolean> {
    if (!isWebAuthnLockSupported()) return false;

    const stored = localStorage.getItem(CREDENTIAL_STORAGE_KEY);
    if (!stored) return false;

    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);

    const assertion = await navigator.credentials.get({
        publicKey: {
            challenge,
            rpId: window.location.hostname,
            allowCredentials: [
                {
                    type: 'public-key',
                    id: base64UrlToBuffer(stored),
                    transports: ['internal', 'hybrid'],
                },
            ],
            userVerification: 'required',
            timeout: 60_000,
        },
    });

    return Boolean(assertion);
}
