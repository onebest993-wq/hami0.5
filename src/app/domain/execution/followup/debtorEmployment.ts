export type DebtorEmploymentLike = {
    isEmployee?: boolean;
    occupation?: string;
    employmentType?: string;
};

export const isDebtorRowEmployee = (debtor: DebtorEmploymentLike | null | undefined): boolean => {
    if (!debtor) return false;
    if (debtor.isEmployee === true) return true;
    if (debtor.isEmployee === false) return false;
    const occupation = String(debtor.occupation ?? debtor.employmentType ?? '').trim();
    return occupation === 'موظف' || occupation === 'employee' || occupation === 'موظفة';
};

export function inferDebtorEmploymentFlags(debtor: DebtorEmploymentLike | null | undefined) {
    const occupation = String(debtor?.occupation || '').toLowerCase();
    const isGovernmentEmployee =
        isDebtorRowEmployee(debtor) ||
        occupation.includes('موظف') ||
        occupation.includes('حكومي') ||
        occupation === 'موظف';
    const isFreelancer =
        (!isDebtorRowEmployee(debtor) && Boolean(debtor)) ||
        occupation.includes('كاسب') ||
        occupation.includes('خاص') ||
        occupation === 'كاسب';
    const isRetired = occupation.includes('متقاعد') || occupation.includes('تقاعد');

    return {
        occupation,
        isGovernmentEmployee,
        isFreelancer,
        isRetired,
    };
}
