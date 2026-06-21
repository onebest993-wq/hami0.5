/**
 * In-memory crypto wrap credential for BFF (HttpOnly) sessions.
 * لا يُخزَّن في localStorage/sessionStorage — يُمسح عند logout.
 */
let inMemoryWrapCredential: string | null = null;

export function setBffCryptoWrapCredential(credential: string | null | undefined): void {
    const normalized = credential?.trim() ?? '';
    inMemoryWrapCredential = normalized || null;
}

export function getBffCryptoWrapCredential(): string | null {
    return inMemoryWrapCredential;
}

export function hasBffCryptoSession(): boolean {
    return Boolean(inMemoryWrapCredential);
}

export function clearBffCryptoWrapCredential(): void {
    inMemoryWrapCredential = null;
}
