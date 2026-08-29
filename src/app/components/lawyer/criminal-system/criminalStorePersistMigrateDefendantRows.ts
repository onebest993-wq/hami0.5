/**
 * Persist migrate — defendant / draft defendant row normalizers
 */
import { DEFAULT_INVESTIGATION_DEFENDANT_STATUS } from '@/app/types/investigationDefendant';
import { createCriminalId as createId } from './criminalIdUtils';
import { normalizeSocialInquiryReport } from './criminalCaseDraftFactory';
import { normalizeGuarantorDetails } from './criminalGuarantorModel';
import { normalizeSeizedAssets } from './criminalSeizedAssetModel';
import { resolveDefendantFullName } from './criminalUnknownDefendant';
import { normalizeInvestigationDefendantStatus } from './investigationDefendantPurge';
import { asRecord, nestedRecord } from './criminalStorePersistMigrateUtils';
import type { InAbsentiaDetails } from './criminalCaseModel';

type UnknownRecord = Record<string, unknown>;

export function normalizePersistDefendantRow(d: unknown): UnknownRecord {
    const row = asRecord(d);
    return {
        ...row,
        fullName: resolveDefendantFullName(row),
        address: typeof row?.address === 'string' ? row.address : '',
        isJuvenile: typeof row?.isJuvenile === 'boolean' ? row.isJuvenile : false,
        isUnderSeven: typeof row?.isUnderSeven === 'boolean' ? row.isUnderSeven : false,
        birthDate: typeof row?.birthDate === 'string' ? row.birthDate : '',
        guardianName: typeof row?.guardianName === 'string' ? row.guardianName : '',
        guardianRelationship: typeof row?.guardianRelationship === 'string' ? row.guardianRelationship : '',
        socialInquiryReport: normalizeSocialInquiryReport(row?.socialInquiryReport),
        totalDetentionDays: Number.isFinite(Number(row?.totalDetentionDays)) ? Number(row.totalDetentionDays) : 0,
        hasFelonyCourtPermit: row?.hasFelonyCourtPermit === true ? true : false,
        guarantorDetails: normalizeGuarantorDetails(row?.guarantorDetails),
        inAbsentiaDetails:
            row?.inAbsentiaDetails && typeof row.inAbsentiaDetails === 'object'
                ? (() => {
                      const det = asRecord(row.inAbsentiaDetails);
                      const verdictDate = String(det.verdictDate ?? '').trim();
                      const notifiedDate = typeof det.notifiedDate === 'string' ? det.notifiedDate : '';
                      const objectionDeadline =
                          notifiedDate.trim() && typeof det.objectionDeadline === 'string'
                              ? String(det.objectionDeadline)
                              : '';
                      return {
                          verdictDate,
                          objectionDeadline,
                          isObjectionFiled: det.isObjectionFiled === true,
                          notifiedDate: notifiedDate.trim() ? notifiedDate : undefined,
                          notificationMethod:
                              typeof det.notificationMethod === 'string' && String(det.notificationMethod).trim()
                                  ? String(det.notificationMethod)
                                  : undefined,
                      } as InAbsentiaDetails;
                  })()
                : undefined,
        detentionExpiryDate: typeof row?.detentionExpiryDate === 'string' ? row.detentionExpiryDate : '',
        detentionHistoryLog: Array.isArray(row?.detentionHistoryLog)
            ? row.detentionHistoryLog
                  .map((h: unknown) => {
                      const hr = asRecord(h);
                      return {
                          id: String(hr?.id ?? createId()),
                          location: String(hr?.location ?? ''),
                          startDate: String(hr?.startDate ?? ''),
                          endDate: typeof hr?.endDate === 'string' ? hr.endDate : undefined,
                      };
                  })
                  .filter((h) => String(h.startDate ?? '').trim().length > 0)
            : [],
        seizedAssets: normalizeSeizedAssets(row?.seizedAssets),
    };
}

export function normalizeDraftDefendantRow(d: unknown): UnknownRecord {
    const row = asRecord(d);
    return {
        ...row,
        address: typeof row?.address === 'string' ? row.address : '',
        isJuvenile: typeof row?.isJuvenile === 'boolean' ? row.isJuvenile : false,
        isUnderSeven: typeof row?.isUnderSeven === 'boolean' ? row.isUnderSeven : false,
        birthDate: typeof row?.birthDate === 'string' ? row.birthDate : '',
        guardianName: typeof row?.guardianName === 'string' ? row.guardianName : '',
        guardianRelationship: typeof row?.guardianRelationship === 'string' ? row.guardianRelationship : '',
        socialInquiryReport: normalizeSocialInquiryReport(row?.socialInquiryReport),
        totalDetentionDays: Number.isFinite(Number(row?.totalDetentionDays)) ? Number(row.totalDetentionDays) : 0,
        hasFelonyCourtPermit: row?.hasFelonyCourtPermit === true ? true : false,
        guarantorDetails: normalizeGuarantorDetails(row?.guarantorDetails),
        detentionExpiryDate: typeof row?.detentionExpiryDate === 'string' ? row.detentionExpiryDate : '',
        detentionHistoryLog: Array.isArray(row?.detentionHistoryLog)
            ? row.detentionHistoryLog
                  .map((h: unknown) => {
                      const hr = asRecord(h);
                      return {
                          id: String(hr?.id ?? createId()),
                          location: String(hr?.location ?? ''),
                          startDate: String(hr?.startDate ?? ''),
                          endDate: typeof hr?.endDate === 'string' ? hr.endDate : undefined,
                      };
                  })
                  .filter((h) => String(h.startDate ?? '').trim().length > 0)
            : [],
        seizedAssets: normalizeSeizedAssets(row?.seizedAssets),
    };
}

