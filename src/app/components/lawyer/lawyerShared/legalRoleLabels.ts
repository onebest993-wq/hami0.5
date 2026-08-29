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
        if (stage.includes('اعتراض على الحكم الغيابي') && !stage.includes('الغير')) {
            if (partyType === 1) {
                if (count === 1) return 'المعترض على الحكم الغيابي';
                return 'المعترضون على الحكم الغيابي';
            }
            if (count === 1) return 'المعترض عليه بالحكم الغيابي';
            return 'المعترض عليهم بالحكم الغيابي';
        }
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
