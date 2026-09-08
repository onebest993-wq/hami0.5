import { SecureAPIClient } from '@/app/services/SecureAPIClient';
import {
    assertCollaborationNetworkReachable,
    canReachCollaborationNetwork,
} from '@/app/services/settings/collaborationNetworkGate';
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
import { sanitizeProfilePlainText } from '@/app/services/profile/profileUrlSanitize';

type ApiOk<T> = { ok: true } & T;

const LEGAL_XSS_WHITELIST_OUT = /[^\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFFa-zA-Z0-9\s\,\.\-\(\)\:\@\/\?\&\=\%\#\+\_\u060C\u061B\u061F\u200C-\u200F]/g;
function whitelistOutbound(raw: string): string {
    return String(raw ?? '').replace(LEGAL_XSS_WHITELIST_OUT, '');
}
function safeOutbound(raw: unknown, maxLen: number): string {
    return whitelistOutbound(sanitizeProfilePlainText(raw, maxLen));
}
function sanitizeOutboundObject(obj: unknown, depth = 0): unknown {
    if (depth > 6) return obj;
    if (obj == null) return obj;
    if (typeof obj === 'string') return safeOutbound(obj, 4000);
    if (typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map((item) => sanitizeOutboundObject(item, depth + 1));
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
        out[k] = sanitizeOutboundObject(v, depth + 1);
    }
    return out;
}

async function postJson<T>(path: string, body: Record<string, unknown>): Promise<T> {
    const safeBody = sanitizeOutboundObject(body) as Record<string, unknown>;
    return SecureAPIClient.fetchSecure<T>(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(safeBody),
    });
}

export class CaseShareApiService {
    static async listNetworkColleagues(userId: string) {
        if (!canReachCollaborationNetwork()) return [];
        return listNetworkColleagues(userId);
    }

    static async listShares(userId: string): Promise<CaseShareRecord[]> {
        if (!canReachCollaborationNetwork()) {
            return CaseShareRepository.listForUser(userId, { summary: true });
        }
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
        if (!canReachCollaborationNetwork()) {
            return CaseShareRepository.getById(shareId, userId);
        }
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
        assertCollaborationNetworkReachable();
        const inNetwork = await assertRecipientInNetwork(params.ownerId, params.recipientId);
        if (!inNetwork) {
            throw new Error('[caseshare:api_service:recipient_not_in_network] RECIPIENT_NOT_IN_NETWORK');
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
            throw new Error('[caseshare:api_service:create_share_empty] CREATE_SHARE_EMPTY');
        } catch (err) {
            if (err instanceof ShareSourceOwnershipError) throw err;
            if (import.meta.env.PROD) {
                throw err;
            }
            return CaseShareRepository.createShare(params);
        }
    }

    static async respond(shareId: string, action: 'accept' | 'decline', userId: string): Promise<void> {
        assertCollaborationNetworkReachable();
        try {
            const res = await postJson<ApiOk<{ share: CaseShareRecord }>>('/api/case-share', {
                action,
                shareId,
            });
            if (!res.share) throw new Error('[caseshare:api_service:respond_failed] RESPOND_FAILED');
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
            if (!updated) throw new Error('[caseshare:api_service:share_not_found] SHARE_NOT_FOUND');
        }
    }

    static async endSession(shareId: string, userId: string): Promise<CaseShareRecord | null> {
        assertCollaborationNetworkReachable();
        try {
            const res = await postJson<ApiOk<{ share: CaseShareRecord }>>('/api/case-share', {
                action: 'end',
                shareId,
            });
            if (res.share) return res.share;
            throw new Error('[caseshare:api_service:end_session_empty] END_SESSION_EMPTY');
        } catch (err) {
            if (import.meta.env.PROD) {
                throw err;
            }
            return CaseShareRepository.endSession(shareId, userId);
        }
    }
}
