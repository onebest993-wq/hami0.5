import { describe, expect, it } from 'vitest';
import { applyIqrarArchiveMigration } from '../migrateIqrarArchive';
import { hydrateCase } from '../hydrateCase';
import { normalizeLoadedCases } from '../normalizeLoadedCases';
import { createCaseFromForm } from '../createCaseFromForm';
import { serializeCaseForStorage } from '../serializeCases';
import type { UrgentCase } from '../types';

describe('urgent domain', () => {
    it('hydrateCase returns null for invalid input', () => {
        expect(hydrateCase(null)).toBeNull();
        expect(hydrateCase('x')).toBeNull();
    });

    it('hydrateCase maps legacy appeal keys to cassation fields', () => {
        const c = hydrateCase({
            id: 'legacy-1',
            type: 'state_order',
            applicantName: 'أحمد',
            court: 'محكمة',
            createdAt: '2026-01-01T00:00:00.000Z',
            appealOutcome: 'filed',
            appealFiledBy: 'client',
        });
        expect(c?.cassationOutcome).toBe('filed');
        expect(c?.cassationFiledBy).toBe('client');
    });

    it('applyIqrarArchiveMigration archives authenticated iqrar', () => {
        const base = {
            id: 'iqr-1',
            type: 'urgent_action' as const,
            actionType: 'إقرار الملكية',
            applicantName: 'علي',
            court: 'محكمة',
            specificActionType: 'إقرار الملكية',
            phase: 'notification_pending' as const,
            status: 'safe' as const,
            createdAt: new Date(),
            archived: false,
            iqrarDeedAuthenticated: true,
        } as UrgentCase & { iqrarDeedAuthenticated: boolean };
        const out = applyIqrarArchiveMigration(base);
        expect(out.archived).toBe(true);
        expect(out.phase).toBe('completed');
        expect(out.status).toBe('completed');
    });

    it('normalizeLoadedCases applies iqrar migration on load', () => {
        const list = normalizeLoadedCases([
            {
                id: 'iqr-2',
                type: 'urgent_action',
                actionType: 'إقرار الدين',
                applicantName: 'سارة',
                court: 'محكمة',
                specificActionType: 'إقرار الدين',
                createdAt: new Date().toISOString(),
                iqrarDeedAuthenticated: true,
                archived: false,
            },
        ]);
        expect(list).toHaveLength(1);
        expect(list[0]?.archived).toBe(true);
    });

    it('createCaseFromForm builds petition_orders with grievance phase', () => {
        const fixed = new Date('2026-05-01T12:00:00.000Z');
        const c = createCaseFromForm(
            {
                actionType: 'state_order',
                specificActionType: 'وضع إشارة عدم التصرف',
                party1Name: 'طالب',
                courtName: 'محكمة بغداد',
                requestDate: '2026-05-01',
            },
            { now: fixed },
        );
        expect(c.procedureCategory).toBe('petition_orders');
        expect(c.phase).toBe('grievance_window');
        expect(c.applicantName).toBe('طالب');
        expect(c.id).toBeTruthy();
    });

    it('createCaseFromForm builds petition_orders for الحجز الاحتياطي', () => {
        const fixed = new Date('2026-05-01T12:00:00.000Z');
        const c = createCaseFromForm(
            {
                specificActionType: 'الحجز الاحتياطي',
                party1Name: 'طالب',
                courtName: 'محكمة بغداد',
                requestDate: '2026-05-01',
            },
            { now: fixed },
        );
        expect(c.procedureCategory).toBe('petition_orders');
        expect(c.type).toBe('state_order');
        expect(c.phase).toBe('grievance_window');
    });

    it('serializeCaseForStorage ISO-dates deadline fields', () => {
        const c = createCaseFromForm(
            {
                actionType: 'state_order',
                specificActionType: 'منع السفر',
                party1Name: 'طالب',
                courtName: 'محكمة',
                requestDate: '2026-05-01',
            },
            { now: new Date('2026-05-01T12:00:00.000Z') },
        );
        const row = serializeCaseForStorage(c);
        expect(typeof row.createdAt).toBe('string');
        expect(row.deadlineDate).toBeTruthy();
    });
});
