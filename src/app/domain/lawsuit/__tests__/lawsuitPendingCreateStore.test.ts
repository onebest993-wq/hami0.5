import { beforeEach, describe, expect, it } from 'vitest';
import type { FileData } from '../lawsuitFileTypes';
import SecureStoreService from '@/app/services/SecureStoreService';
import {
    LAWSUIT_PENDING_CREATES_KEY,
    clearLawsuitPendingCreatesForTests,
    clearPendingLawsuitCreate,
    listPendingLawsuitCreates,
    mergePendingLawsuitCreatesInto,
    stagePendingLawsuitCreate,
} from '../lawsuitPendingCreateStore';

const file = (id: number): FileData =>
    ({
        id,
        type: 'lawsuit',
        status: 'active',
        caseNo: `x/${id}`,
        court: 'أحوال',
        parties: [],
        history: [],
        notes: [],
        images: [],
        date: '2026-01-01',
    }) as FileData;

describe('lawsuitPendingCreateStore', () => {
    beforeEach(() => {
        clearLawsuitPendingCreatesForTests();
    });

    it('stages and merges pending creates in SecureStore and clears leftover plaintext', () => {
        localStorage.setItem(LAWSUIT_PENDING_CREATES_KEY, JSON.stringify([]));
        sessionStorage.setItem(LAWSUIT_PENDING_CREATES_KEY, JSON.stringify([]));
        stagePendingLawsuitCreate(file(9));
        expect(listPendingLawsuitCreates()).toHaveLength(1);
        expect(localStorage.getItem(LAWSUIT_PENDING_CREATES_KEY)).toBeNull();
        expect(sessionStorage.getItem(LAWSUIT_PENDING_CREATES_KEY)).toBeNull();
        expect(SecureStoreService.getItemSync(LAWSUIT_PENDING_CREATES_KEY)).toContain('"id":9');
        const merged = mergePendingLawsuitCreatesInto([file(1)]);
        expect(merged.map((f) => Number(f.id)).sort((a, b) => a - b)).toEqual([1, 9]);
        clearPendingLawsuitCreate(9);
        expect(listPendingLawsuitCreates()).toHaveLength(0);
    });

    it('drains leftover localStorage and sessionStorage into SecureStore', () => {
        localStorage.setItem(LAWSUIT_PENDING_CREATES_KEY, JSON.stringify([file(11)]));
        sessionStorage.setItem(LAWSUIT_PENDING_CREATES_KEY, JSON.stringify([file(12)]));
        const listed = listPendingLawsuitCreates();
        expect(listed.map((f) => Number(f.id)).sort((a, b) => a - b)).toEqual([11, 12]);
        expect(localStorage.getItem(LAWSUIT_PENDING_CREATES_KEY)).toBeNull();
        expect(sessionStorage.getItem(LAWSUIT_PENDING_CREATES_KEY)).toBeNull();
        expect(SecureStoreService.getItemSync(LAWSUIT_PENDING_CREATES_KEY)).toContain('"id":11');
        expect(SecureStoreService.getItemSync(LAWSUIT_PENDING_CREATES_KEY)).toContain('"id":12');
    });

    it('does not wipe unread ciphertext with an empty write', () => {
        const cipher = 'hami_enc_v2:pending-cold';
        SecureStoreService.setItemSync(LAWSUIT_PENDING_CREATES_KEY, cipher);
        SecureStoreService.clearDecryptedMemoryCache();
        expect(SecureStoreService.isUnreadSync(LAWSUIT_PENDING_CREATES_KEY)).toBe(true);
        expect(listPendingLawsuitCreates()).toHaveLength(0);
        clearPendingLawsuitCreate(1);
        expect(SecureStoreService.isUnreadSync(LAWSUIT_PENDING_CREATES_KEY)).toBe(true);
        const raw = SecureStoreService.getItemSync(LAWSUIT_PENDING_CREATES_KEY);
        expect(raw == null || raw === cipher).toBe(true);
    });
});
