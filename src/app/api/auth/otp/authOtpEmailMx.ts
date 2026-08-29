import { resolve4, resolveMx } from 'node:dns/promises';
import {
    isTrustedEmailProviderDomain,
    normalizeRegistrationEmail,
} from '../../../services/auth/registrationCredentialsSecurity.ts';

const MX_TIMEOUT_MS = 2500;

async function domainHasMailExchanger(domain: string): Promise<boolean> {
    try {
        const mx = await resolveMx(domain);
        if (mx.length > 0) return true;
    } catch {
        /* NXDOMAIN / ENODATA */
    }
    try {
        const records = await resolve4(domain);
        return records.length > 0;
    } catch {
        return false;
    }
}

/** مزوّد معروف يُعدّ حقيقياً بلا DNS. غيره يُفحص MX/A خلال مهلة قصيرة. */
export async function emailDomainAcceptsMail(email: string): Promise<boolean> {
    const normalized = normalizeRegistrationEmail(email);
    const at = normalized.lastIndexOf('@');
    if (at <= 0) return false;
    const domain = normalized.slice(at + 1);
    if (isTrustedEmailProviderDomain(domain)) return true;
    return Promise.race([
        domainHasMailExchanger(domain),
        new Promise<boolean>((resolve) => {
            setTimeout(() => resolve(false), MX_TIMEOUT_MS);
        }),
    ]);
}
