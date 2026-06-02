import React from 'react';

// --- UTILS ---
export const normalizeArabic = (text: string) => {
    if (!text) return "";
    return text
        .replace(/[أإآ]/g, 'ا')
        .replace(/ة/g, 'ه')
        .replace(/ى/g, 'ي')
        .replace(/[\u064B-\u065F]/g, '') // Tashkeel
        .replace(/\s+/g, ' ') // Collapse spaces
        .trim();
};

interface HighlightedTextProps {
    text: string | undefined;
    query: string;
    className?: string;
}

export const HighlightedText = ({ text, query, className }: HighlightedTextProps) => {
    if (!query || !text) return <span className={className}>{text || ''}</span>;
    
    // 1. Normalize both text and query for comparison
    const normText = normalizeArabic(text).toLowerCase();
    const normQuery = normalizeArabic(query).toLowerCase();
    
    // 2. If no match found in normalized version, return original
    if (!normText.includes(normQuery)) return <span className={className}>{text}</span>;

    // 3. Find start index of match
    const startIndex = normText.indexOf(normQuery);
    if (startIndex === -1) return <span className={className}>{text}</span>;

    // 4. Slice original text based on indices (Approximation: assumes length parity)
    return (
        <span className={className}>
            {text.split(new RegExp(`(${query.split('').join('.*?')})`, 'gi')).map((part:string, i:number) => {
                 return normalizeArabic(part).includes(normQuery) ? 
                    <span key={i} className="bg-[#E6C673] text-[#0B1021] px-0.5 rounded font-bold">{part}</span> : 
                    part
            })}
        </span>
    );
};

// --- JURISDICTION-BASED PARTY NAMING ENGINE ---
export const getJurisdictionPartyRole = (
    jurisdictionType: 'regular' | 'urgent' | 'acknowledgment',
    urgentSubType: string,
    partyType: 1 | 2,
    count: number = 1
): string => {
    // 1. ACKNOWLEDGMENT (الإقرار)
    if (jurisdictionType === 'acknowledgment') {
        if (partyType === 1) {
            return count === 1 ? 'المُقِر' : 'المُقِرين';
        } else {
            return count === 1 ? 'المُقِر له' : 'المُقِر لهم';
        }
    }

    // 2. URGENT JURISDICTION (القضاء المستعجل)
    if (jurisdictionType === 'urgent') {
        const subType = urgentSubType.toLowerCase();
        
        // الأمر الولائي
        if (subType.includes('الأمر الولائي') || subType.includes('ولائي')) {
            if (partyType === 1) {
                return count === 1 ? 'طالب الأمر الولائي' : 'طالبي الأمر الولائي';
            } else {
                return count === 1 ? 'المطلوب الأمر الولائي ضده' : 'المطلوب الأمر الولائي ضدهم';
            }
        }
        
        // الكشف المستعجل
        if (subType.includes('الكشف المستعجل') || subType.includes('كشف')) {
            if (partyType === 1) {
                return count === 1 ? 'طالب الكشف المستعجل' : 'طالبي الكشف المستعجل';
            } else {
                return count === 1 ? 'المطلوب الكشف المستعجل ضده' : 'المطلوب الكشف المستعجل ضدهم';
            }
        }
        
        // منع السفر
        if (subType.includes('منع السفر') || subType.includes('منع')) {
            if (partyType === 1) {
                return count === 1 ? 'طالب المنع من السفر' : 'طالبي المنع من السفر';
            } else {
                return count === 1 ? 'المطلوب منعه من السفر' : 'المطلوب منعهم من السفر';
            }
        }
        
        // الحراسة القضائية
        if (subType.includes('الحراسة القضائية') || subType.includes('حراسة')) {
            if (partyType === 1) {
                return count === 1 ? 'طالب الحراسة القضائية' : 'طالبي الحراسة القضائية';
            } else {
                return count === 1 ? 'المطلوب الحراسة القضائية ضده' : 'المطلوب الحراسة القضائية ضدهم';
            }
        }
    }

    // 3. REGULAR (دعوى اعتيادية) - Default
    if (partyType === 1) {
        return count === 1 ? 'المدعي' : 'المدعين';
    } else {
        return count === 1 ? 'المدعى عليه' : 'المدعى عليهم';
    }
};

// --- LEGAL GRAMMAR ENGINE ---
export const getLegalRole = (stageName: string = '', partyType: 1 | 2, count: number = 1, extraordinaryAppealType?: string): string => {
    // Normalize stage name
    const stage = (stageName || 'بداءة').trim();

    // ───────────────────────────────────────────────────────────────
    // ⚠️ PRIORITY 0: EXTRAORDINARY APPEALS OVERRIDE
    // ───────────────────────────────────────────────────────────────
    if (extraordinaryAppealType && extraordinaryAppealType.includes("اعتراض")) {
        // Special Case: Third Party Objection
        if (extraordinaryAppealType.includes('الغير') || extraordinaryAppealType.includes('Third Party')) {
            if (partyType === 1) {
                if (count === 1) return 'المعترض اعتراض الغير';
                if (count === 2) return 'المعترضان اعتراض الغير';
                return 'المعترضون اعتراض الغير';
            } else {
                if (count === 1) return 'المعترض عليه اعتراض الغير';
                if (count === 2) return 'المعترض عليهما اعتراض الغير';
                return 'المعترض عليهم اعتراض الغير';
            }
        }
        
        // Standard Objection (Default Judgment)
        if (partyType === 1) return count === 1 ? 'المعترض' : count === 2 ? 'المعترضان' : 'المعترضين';
        if (partyType === 2) return count === 1 ? 'المعترض عليه' : count === 2 ? 'المعترض عليهما' : 'المعترض عليهم';
    }

    if (extraordinaryAppealType && (extraordinaryAppealType.includes("إعادة") || extraordinaryAppealType.includes("Retrial"))) {
        if (partyType === 1) return count === 1 ? 'طالب إعادة المحاكمة' : count === 2 ? 'طالبا إعادة المحاكمة' : 'طالبو إعادة المحاكمة';
        if (partyType === 2) return count === 1 ? 'المطلوب إعادة المحاكمة ضده' : count === 2 ? 'المطلوب إعادة المحاكمة ضدهما' : 'المطلوب إعادة المحاكمة ضدهم';
    }

    // PRIORITY 1: Objection (الاعتراض) - Must be checked BEFORE First Instance/Appeal
    // Covers both "Objection to Default Judgment" & "Third Party Objection"
    if (stage.includes('اعتراض') || stage.includes('Objection')) {
        // Special Case: Third Party Objection
        if (stage.includes('الغير') || stage.includes('Third Party')) {
            if (partyType === 1) {
                if (count === 1) return 'المعترض اعتراض الغير';
                if (count === 2) return 'المعترضان اعتراض الغير';
                return 'المعترضون اعتراض الغير';
            } else {
                if (count === 1) return 'المعترض عليه اعتراض الغير';
                if (count === 2) return 'المعترض عليهما اعتراض الغير';
                return 'المعترض عليهم اعتراض الغير';
            }
        }
        
        // Standard Objection (Default Judgment)
        if (partyType === 1) { // Objector
            if (count === 1) return 'المعترض';
            if (count === 2) return 'المعترضان';
            return 'المعترضين';
        } else { // Objected Against
            if (count === 1) return 'المعترض عليه';
            if (count === 2) return 'المعترض عليهما';
            return 'المعترض عليهم';
        }
    }

    // PRIORITY 2: Retrial (إعادة المحاكمة) - Must be checked BEFORE base stages
    if (stage.includes('إعادة المحاكمة') || stage.includes('Retrial')) {
        if (partyType === 1) { 
            if (count === 1) return 'طالب إعادة المحاكمة';
            if (count === 2) return 'طالبا إعادة المحاكمة';
            return 'طالبو إعادة المحاكمة';
        } else { 
            if (count === 1) return 'المطلوب إعادة المحاكمة ضده';
            if (count === 2) return 'المطلوب إعادة المحاكمة ضدهما';
            return 'المطلوب إعادة المحاكمة ضدهم';
        }
    }

    // PRIORITY 3: Correction (تصحيح)
    if (stage.includes('تصحيح') || stage.includes('Correction')) {
        if (partyType === 1) { // Correction Applicant
            if (count === 1) return 'طالب التصحيح';
            if (count === 2) return 'طالبا التصحيح';
            return 'طالبو التصحيح';
        } else { // Correction Respondent
            if (count === 1) return 'المطلوب التصحيح ضده';
            if (count === 2) return 'المطلوب التصحيح ضدهما';
            return 'المطلوب التصحيح ضدهم';
        }
    }

    // PRIORITY 4: Cassation (التمييز / النقض)
    if (stage.includes('تمييز') || stage.includes('نقض') || stage.includes('Cassation')) {
        if (partyType === 1) { // Cassator
            if (count === 1) return 'المميز';
            if (count === 2) return 'المميزان';
            return 'المميزين';
        } else { // Cassator Against
            if (count === 1) return 'المميز عليه';
            if (count === 2) return 'المميز عليهما';
            return 'المميز عليهم';
        }
    }

    // PRIORITY 5: Appeal (الاستئناف)
    if (stage.includes('استئناف') || stage.includes('Appeal')) {
        if (partyType === 1) { // Appellant
            if (count === 1) return 'المستأنف';
            if (count === 2) return 'المستأنفان';
            return 'المستأنفين';
        } else { // Appellee
            if (count === 1) return 'المستأنف عليه';
            if (count === 2) return 'المستأنف عليهما';
            return 'المستأنف عليهم';
        }
    }

    // PRIORITY 6: First Instance (البداءة) - Base case
    if (stage.includes('بداءة') || stage.includes('First Instance')) {
        if (partyType === 1) { // Plaintiff
            if (count === 1) return 'المدعي';
            if (count === 2) return 'المدعيان';
            return 'المدعين';
        } else { // Defendant
            if (count === 1) return 'المدعى عليه';
            if (count === 2) return 'المدعى عليهما';
            return 'المدعى عليهم';
        }
    }

    // Default Fallback
    if (partyType === 1) {
        if (count === 1) return 'الطرف الأول';
        if (count === 2) return 'الطرفان الأولان';
        return 'الأطراف الأولى';
    } else {
        if (count === 1) return 'الطرف الثاني';
        if (count === 2) return 'الطرفان الثانيان';
        return 'الأطراف الثانية';
    }
};


// --- THEME & CONFIG ---
export const THEMES = {
    gold: { name: 'الذهبي الملكي', primary: '#E6C673', secondary: '#D4B360', bg: '#0B1021' },
    navy: { name: 'الكحلي الرسمي', primary: '#3B82F6', secondary: '#1D4ED8', bg: '#0F172A' },
    crimson: { name: 'الأحمر القرمزي', primary: '#EF4444', secondary: '#B91C1C', bg: '#280505' },
    emerald: { name: 'الأخضر الزمردي', primary: '#10B981', secondary: '#047857', bg: '#022C22' },
    black: { name: 'الأسود الفاحم', primary: '#9CA3AF', secondary: '#4B5563', bg: '#000000' },
    silver: { name: 'الفضي المعدني', primary: '#E2E8F0', secondary: '#94A3B8', bg: '#1E293B' },
    sky: { name: 'الأزرق السماوي', primary: '#38BDF8', secondary: '#0EA5E9', bg: '#0C4A6E' },
    brown: { name: 'البني الجلدي', primary: '#D97706', secondary: '#B45309', bg: '#451A03' },
    purple: { name: 'البنفسجي الداكن', primary: '#A855F7', secondary: '#7E22CE', bg: '#3B0764' },
    bronze: { name: 'البرونزي العتيق', primary: '#CD7F32', secondary: '#A0522D', bg: '#291508' },
};

export const SHAPES = {
    square: 'rounded-none',
    rounded: 'rounded-xl',
    pill: 'rounded-2xl',
    circle: 'rounded-[3rem]',
};

// --- TYPES ---
export type CaseType = 'lawsuit' | 'transaction' | 'execution';
export type ThemeKey = keyof typeof THEMES;
export type ShapeKey = keyof typeof SHAPES;

export interface FileData {
    id: number;
    type: CaseType;
    status: 'active' | 'archived' | 'archived_stage' | 'deleted' | 'paused';
    stayReason?: string;
    stayDate?: string;
    stayReviewDate?: string;
    deletedAt?: number;
    // Structured Case Number
    caseNoParts?: { year: string; type: string; seq: string };
    caseNo: string; // Compiled string for display
    court: string; 
    judge?: string;
    docType?: string; // Type of lawsuit (e.g. Tamleek)
    subInfo?: string; 
    parties: Party[];
    currentStage?: string;
    history: { id: number; stage: string; result: string; date: string }[];
    notes: { id: number; text: string; meta: string; stageCtx: string; date: string; apptDate?: string; isPinned?: boolean }[];
    images: { url: string; name: string }[];
    date: string;
    nextDate?: string;
    isPinned?: boolean;
    tasks?: Task[];
    incidentalCases?: IncidentalCase[];
    feesTotal?: number | string;
    feesPaid?: number | string;
    clientPhone?: string;
    /** اختصاص الدعوى عند الإنشاء (القضاء المدني أو الأحوال الشخصية) — لفلترة مخزن الإضابير */
    lawsuitJurisdiction?: 'civil' | 'personal';
}

export interface Party {
    id: number;
    name: string;
    role: string; 
    isClient: boolean;
    phone?: string;
    address?: string;
    side?: 'right' | 'left';
    lawyer?: {
        name: string;
        phone: string;
        isMyOffice: boolean;
    };
}

export interface Alert {
    id: number;
    title: string;
    subtitle: string;
    time: string;
    urgent: boolean;
}

export const useThemeStyles = (activeTheme: ThemeKey, activeShape: ShapeKey) => {
    // التحقق من أن المفاتيح صالحة
    const themeKey = Object.keys(THEMES).includes(activeTheme) ? activeTheme : 'gold';
    const shapeKey = Object.keys(SHAPES).includes(activeShape) ? activeShape : 'pill';
    
    const theme = THEMES[themeKey];
    const shapeClass = SHAPES[shapeKey];
    
    return {
        theme,
        shapeClass,
        glass: `bg-[${theme.bg}]/60 backdrop-blur-md border border-[${theme.primary}]/20`,
    };
};

// SmartFileModal Types
export type EventType =
    | 'appointment'
    | 'note'
    | 'document'
    | 'decision'
    | 'expert'
    | 'milestone'
    | 'alert'
    | 'action';
export type AppointmentType = 'pleading' | 'investigation' | 'witness' | 'verdict' | 'other';
export type DocumentCategory = 'agency' | 'regulations' | 'identity' | 'evidence' | 'decision';
export type IncidentalType = 'joined' | 'counter' | 'thirdParty' | 'joinder_appeal' | 'counter_appeal';
export type IncidentalStatus = 'active' | 'resolved' | 'rejected';
export type NotificationStatus = 'pending' | 'in_person' | 'via_media' | 'publication';

export interface TimelineEvent {
    id: string;
    type: EventType;
    subType?: AppointmentType;
    date: string;
    time?: string;
    title: string;
    details?: string;
    isNew?: boolean;
    isDeleted?: boolean;
    docCategory?: DocumentCategory;
    isSystemLog?: boolean;
    tags?: string[]; // 🔥 New: Evidence Tags
    isStayed?: boolean; // 🔥 New: Stay of Proceedings
    isSessionRecord?: boolean; // 🔥 New: To distinguish session records
    evidentiaryWeight?: 'official' | 'ordinary' | 'beginning' | 'other'; // 🔥 New: Smart Evidence Portfolio
    color?: string;
    isAttachment?: boolean;
    attachmentStatus?: string;
    isFastTrack?: boolean;
    fastTrackStatus?: string;
    description?: string;
    icon?: string;
    text?: string;
    isPause?: boolean;
}

export interface ProvisionalOrder {
    id: string;
    type: string;
    targetParty: string;
    date: string;
}

export interface ThirdParty {
    id: string;
    name: string;
    role: string;
}

export interface CaseStage {
    id: string;
    name: string;
    status: 'locked' | 'active' | 'completed' | 'abandoned' | 'future' | 'voided';
    defendantNotificationStatus?: NotificationStatus;
    hasCrossAppeal?: boolean;
    incidentalCases?: IncidentalCase[];
    timeline?: TimelineEvent[];
    stageName?: string;
    extraordinaryAppealType?: string;
    // 🎯 CRITICAL: First Instance Data Preservation for Appellate Stages
    firstInstanceCaseNumber?: string;
    firstInstanceCourt?: string;
    appealCaseNumber?: string;
    appealCourtName?: string;
    // New Features
    provisionalOrders?: ProvisionalOrder[];
    thirdParties?: ThirdParty[];
    lastJudgmentType?: 'حضوري' | 'غيابي';
    // Abandonment Logic
    abandonmentDate?: string;
    abandonmentCount?: number;
    isVoided?: boolean;
    /** Smart File — بيانات المرحلة النشطة */
    caseNo?: string;
    court?: string;
    judge?: string;
    parties?: Array<Party & { notificationStatus?: NotificationStatus }>;
    tasks?: Task[];
    createdDate?: string;
    finalDecision?: string | null;
    decisionDate?: string | null;
    type?: string;
    isPleadingsClosed?: boolean;
    appealDeadline?: string;
    judgmentForm?: string;
    wasReopened?: boolean;
    isUnderObjection?: boolean;
    interruptionDate?: string;
    consolidatedWith?: string;
    fastTrackPetitions?: unknown[];
    attachments?: unknown[];
    legalTimers?: {
        appealDeadline?: string;
        cassationDeadline?: string;
        reviewDeadline?: string;
        finalAppealDeadline?: string;
        defaultObjectionDeadline?: string;
    };
    previousCaseNumber?: string;
    appealMetadata?: {
        appealType?: string;
        appellant?: string;
        filingDate?: string;
        previousCaseNumber?: string;
        previousStage?: string;
        hasCrossAppeal?: boolean;
        crossAppealDate?: string;
        crossAppealReceipt?: string;
    };
    isJudgeRecusalPending?: boolean;
    judgeRecusalData?: { reason: string; requestDate: string };
    isAttorneyResigned?: boolean;
    resignationData?: Record<string, unknown>;
    isInExecution?: boolean;
    executionData?: Record<string, unknown>;
    stayReason?: string;
}

export interface Task {
    id: string;
    title: string;
    details?: string;
    dueDate?: string;
    isCompleted: boolean;
    priority?: string;
    isNew?: boolean;
}

export interface IncidentalCase {
    id: string;
    type: IncidentalType;
    partyName: string;
    partyRole?: string;
    date: string;
    status: IncidentalStatus;
    details?: string;
}
