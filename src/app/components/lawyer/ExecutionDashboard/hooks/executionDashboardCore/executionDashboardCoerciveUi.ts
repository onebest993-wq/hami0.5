export type BuildExecutionCoerciveUiFlagsInput = {
    executionPaused: boolean;
    isPaused: boolean;
    stayOfExecutionActive: boolean;
    activeDebtorSolidary: boolean;
    allDebtorsUnifiedLength: number;
    activeDebtorCleared: boolean;
    dossierStatus: string | null | undefined;
};

export type ExecutionCoerciveUiFlags = {
    coerciveUiLocked: boolean;
    dividedActiveDebtorCleared: boolean;
    executionCoerciveButtonDisabled: boolean;
    dossierStatusUi: string;
    coerciveDossierLocked: boolean;
};

/** أعلام قفل/تعطيل الإجراءات الجبرية داخل محضر المتابعة */
export function buildExecutionCoerciveUiFlags(
    input: BuildExecutionCoerciveUiFlagsInput,
): ExecutionCoerciveUiFlags {
    const coerciveUiLocked =
        input.executionPaused || input.isPaused || input.stayOfExecutionActive;
    const dividedActiveDebtorCleared =
        !input.activeDebtorSolidary &&
        input.allDebtorsUnifiedLength > 1 &&
        input.activeDebtorCleared;
    const dossierStatusUi = input.dossierStatus ?? 'active';

    return {
        coerciveUiLocked,
        dividedActiveDebtorCleared,
        executionCoerciveButtonDisabled: coerciveUiLocked || dividedActiveDebtorCleared,
        dossierStatusUi,
        coerciveDossierLocked: dossierStatusUi !== 'active',
    };
}
