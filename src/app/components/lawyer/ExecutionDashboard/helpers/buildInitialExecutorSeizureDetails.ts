/** تفاصيل حجز مبدئي — chunk execution-helpers (بلا اعتماد على execution-dashboard-core) */
export function buildInitialExecutorSeizureDetails(
    actionType: string,
    activeDebtorIsDeceased: boolean,
): Record<string, string> {
    const base =
        actionType === 'salary' && activeDebtorIsDeceased
            ? 'طلب حجز الحوافز والمخصصات (مبدئي) — تُستكمل التفاصيل بعد موافقة منفذ العدل.'
            : 'طلب حجز مبدئي — تُستكمل بيانات التنفيذ بعد موافقة منفذ العدل.';
    return {
        seizureUiKind: actionType,
        employerName: '',
        salaryAmount: '',
        propertyAddress: '',
        propertyLocation: '',
        vehicleDescription: '',
        vehiclePlate: '',
        movableDescription: '',
        movableLocation: '',
        judicialCustodianName: '',
        description: base,
    };
}
