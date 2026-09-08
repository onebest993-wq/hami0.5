import { describe, expect, it } from 'vitest';
import {
    canCreateEvent,
    canEditEvent,
    canDeleteEvent,
    canViewConfidentialEvent,
    canSyncNativeCalendar,
    canSyncDossierExecution,
    canSyncVisitation,
    canOverrideConflict,
    canTriggerAlarmAudio,
    canExportIcs,
    canAdminTombstones,
    canViewOthersSchedule,
    type CalendarPermissionContext,
} from '@/app/components/lawyer/SmartLegalRadar/calendarPermissions';

const baseAuth: CalendarPermissionContext = { userId: 'lawyer-001' };
const baseAdmin: CalendarPermissionContext = { userId: 'admin-001', isAdmin: true };

describe('calendarPermissions — 12 canXxx guards', () => {
    it('canCreateEvent يرفض إذا لم يكن هناك مستخدم مصادق عليه', () => {
        expect(canCreateEvent({ userId: undefined })).toBe(false);
    });

    it('canCreateEvent يرفض صاحب الدور intern حتى لو كان مصادقاً', () => {
        expect(canCreateEvent({ userId: 'x', roleTier: 'intern' })).toBe(false);
    });

    it('canCreateEvent يسمح associate أو senior', () => {
        expect(canCreateEvent({ userId: 'x', roleTier: 'associate' })).toBe(true);
        expect(canCreateEvent({ userId: 'x', roleTier: 'senior' })).toBe(true);
    });

    it('canEditEvent يرفض تعديل حدث لا يملكه المستخدم العادي', () => {
        expect(canEditEvent({ ...baseAuth, eventOwnerId: 'other-user' })).toBe(false);
    });

    it('canEditEvent يسمح لمالك الحدث', () => {
        expect(canEditEvent({ ...baseAuth, eventOwnerId: baseAuth.userId })).toBe(true);
    });

    it('canEditEvent يسمح للمشرف حتى لو لم يكن مالكاً', () => {
        expect(canEditEvent({ ...baseAdmin, eventOwnerId: 'anyone' })).toBe(true);
    });

    it('canDeleteEvent يرفض حدثاً لشخص آخر حتى لو كان Senior', () => {
        expect(canDeleteEvent({ userId: 'x', eventOwnerId: 'y', roleTier: 'senior' })).toBe(false);
    });

    it('canDeleteEvent يسمح للـ Partner بحذف أحداث الفريق', () => {
        expect(canDeleteEvent({ userId: 'x', eventOwnerId: 'y', roleTier: 'partner' })).toBe(true);
    });

    it('canViewConfidentialEvent يرفض عرض سري لـ View فقط في الملف', () => {
        expect(
            canViewConfidentialEvent({ ...baseAuth, dossierAccessLevel: 'view', eventOwnerId: 'y' }),
        ).toBe(false);
    });

    it('canViewConfidentialEvent يسمح Edit في الملف', () => {
        expect(
            canViewConfidentialEvent({ ...baseAuth, dossierAccessLevel: 'edit', eventOwnerId: 'y' }),
        ).toBe(true);
    });

    it('canSyncNativeCalendar يعتمد على العلم المفعل في البروفايل', () => {
        expect(canSyncNativeCalendar({ ...baseAuth, nativeSyncEnabled: false })).toBe(false);
        expect(canSyncNativeCalendar({ ...baseAuth, nativeSyncEnabled: true })).toBe(true);
    });

    it('canSyncDossierExecution يرفض View-Level access', () => {
        expect(canSyncDossierExecution({ ...baseAuth, dossierAccessLevel: 'view' })).toBe(false);
        expect(canSyncDossierExecution({ ...baseAuth, dossierAccessLevel: 'edit' })).toBe(true);
        expect(canSyncDossierExecution(baseAdmin)).toBe(true);
    });

    it('canSyncVisitation يقتصر على Senior+ فقط', () => {
        expect(canSyncVisitation({ userId: 'x', roleTier: 'associate' })).toBe(false);
        expect(canSyncVisitation({ userId: 'x', roleTier: 'senior' })).toBe(true);
        expect(canSyncVisitation(baseAdmin)).toBe(true);
    });

    it('canOverrideConflict يقتصر على Admin أو Partner', () => {
        expect(canOverrideConflict({ userId: 'x', roleTier: 'senior' })).toBe(false);
        expect(canOverrideConflict({ userId: 'x', roleTier: 'partner' })).toBe(true);
        expect(canOverrideConflict(baseAdmin)).toBe(true);
    });

    it('canTriggerAlarmAudio يعتمد على علم تفعيل التنبيهات الصوتية', () => {
        expect(canTriggerAlarmAudio({ ...baseAuth, audioAlarmsEnabled: false })).toBe(false);
        expect(canTriggerAlarmAudio({ ...baseAuth, audioAlarmsEnabled: true })).toBe(true);
    });

    it('canExportIcs يعتمد على canShare + مصادقة', () => {
        expect(canExportIcs({ ...baseAuth, canShare: false })).toBe(false);
        expect(canExportIcs({ ...baseAuth, canShare: true })).toBe(true);
    });

    it('canAdminTombstones يقتصر على المشرفين فقط', () => {
        expect(canAdminTombstones({ userId: 'x' })).toBe(false);
        expect(canAdminTombstones({ ...baseAuth, roleTier: 'partner' })).toBe(false);
        expect(canAdminTombstones(baseAdmin)).toBe(true);
    });

    it('canViewOthersSchedule يسمح Senior/Partner/Admin ولا يسمح Associate', () => {
        expect(canViewOthersSchedule({ userId: 'x', roleTier: 'associate' })).toBe(false);
        expect(canViewOthersSchedule({ userId: 'x', roleTier: 'senior' })).toBe(true);
        expect(canViewOthersSchedule({ userId: 'x', roleTier: 'partner' })).toBe(true);
        expect(canViewOthersSchedule(baseAdmin)).toBe(true);
    });
});
