import { SecureAPIClient } from '@/app/services/SecureAPIClient';
import type {
    CaseShareRecord,
    CaseShareVisibleFields,
    DossierShareSource,
} from './caseShareTypes';
import { CaseShareRepository } from './caseShareRepository';
import { assertRecipientInNetwork } from './caseShareNetworkGuard';
import { listNetworkColleagues } from './lawyerNetworkRepository';
import {
    assertShareSourceOwnedByUser,
    ShareSourceOwnershipError,
} from './caseShareDossierOwnership';
import { registerCriminalCaseOwnershipOnServer } from './caseShareCriminalOwnershipApi';

type ApiOk<T> = { ok: true } & T;

async function postJson<T>(path: string, body: Record<string, unknown>): Promise<T> {
    return SecureAPIClient.fetchSecure<T>(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
}

export class CaseShareApiService {
    static async listNetworkColleagues(userId: string) {
        return listNetworkColleagues(userId);
    }

    static async listShares(userId: string): Promise<CaseShareRecord[]> {
        try {
            const res = await SecureAPIClient.fetchSecure<ApiOk<{ shares: CaseShareRecord[] }>>(
                '/api/case-share',
                { method: 'GET' },
            );
            if (Array.isArray(res.shares)) return res.shares;
            if (import.meta.env.PROD) return [];
        } catch {
            if (import.meta.env.PROD) return [];
            /* DEV: repository fallback below */
        }
        return CaseShareRepository.listForUser(userId, { summary: true });
    }

    static async getShareDetail(shareId: string, userId: string): Promise<CaseShareRecord | null> {
        try {
            const res = await SecureAPIClient.fetchSecure<ApiOk<{ share: CaseShareRecord }>>(
                `/api/case-share/detail?shareId=${encodeURIComponent(shareId)}`,
                { method: 'GET' },
            );
            if (res.share) return res.share;
            if (import.meta.env.PROD) return null;
        } catch {
            if (import.meta.env.PROD) return null;
            /* DEV: repository fallback below */
        }
        return CaseShareRepository.getById(shareId, userId);
    }

    static async listIncoming(userId: string): Promise<CaseShareRecord[]> {
        const all = await this.listShares(userId);
        return all.filter((s) => s.recipientId === userId);
    }

    static async createShare(params: {
        recipientId: string;
        recipientName: string;
        source: DossierShareSource;
        visibleFields: CaseShareVisibleFields;
        ownerId: string;
        ownerName: string;
        sessionDurationMinutes?: number;
    }): Promise<CaseShareRecord> {
        const inNetwork = await assertRecipientInNetwork(params.ownerId, params.recipientId);
        if (!inNetwork) {
            throw new Error('RECIPIENT_NOT_IN_NETWORK');
        }
        try {
            if (params.source.module === 'criminal') {
                await assertShareSourceOwnedByUser(params.ownerId, params.source);
                await registerCriminalCaseOwnershipOnServer(params.source.dossierId);
            }
            const res = await postJson<ApiOk<{ share: CaseShareRecord }>>('/api/case-share', {
                action: 'create',
                recipientId: params.recipientId,
                recipientName: params.recipientName,
                source: params.source,
                visibleFields: params.visibleFields,
                ownerName: params.ownerName,
                sessionDurationMinutes: params.sessionDurationMinutes,
            });
            if (res.share) return res.share;
            throw new Error('CREATE_SHARE_EMPTY');
        } catch (err) {
            if (err instanceof ShareSourceOwnershipError) throw err;
            if (import.meta.env.PROD) {
                throw err;
            }
            return CaseShareRepository.createShare(params);
        }
    }

    static async respond(shareId: string, action: 'accept' | 'decline', userId: string): Promise<void> {
        try {
            const res = await postJson<ApiOk<{ share: CaseShareRecord }>>('/api/case-share', {
                action,
                shareId,
            });
            if (!res.share) throw new Error('RESPOND_FAILED');
            return;
        } catch (err) {
            if (import.meta.env.PROD) {
                throw err;
            }
            const updated = await CaseShareRepository.updateStatus(
                shareId,
                userId,
                action === 'accept' ? 'accepted' : 'declined',
            );
            if (!updated) throw new Error('SHARE_NOT_FOUND');
        }
    }

    static async endSession(shareId: string, userId: string): Promise<CaseShareRecord | null> {
        try {
            const res = await postJson<ApiOk<{ share: CaseShareRecord }>>('/api/case-share', {
                action: 'end',
                shareId,
            });
            if (res.share) return res.share;
            throw new Error('END_SESSION_EMPTY');
        } catch (err) {
            if (import.meta.env.PROD) {
                throw err;
            }
            return CaseShareRepository.endSession(shareId, userId);
        }
    }
}
