/** Jurisdiction-based party naming for regular / urgent / acknowledgment cases. */
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
