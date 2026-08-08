import { useMemo } from 'react';
import { getExecutionModuleStrategy } from '@/app/utils/executionModuleStrategies';

export function useExecutionModuleStrategy(
    claimType: string | undefined,
    isEvictionClaimFn: (claimType?: string) => boolean,
    parsedDebtAmount: number,
): {
    isNonFinancialClaim: boolean;
    principalDebtAmount: number;
    claimTypeForExecutionModule: string;
    executionModuleStrategy: ReturnType<typeof getExecutionModuleStrategy>;
    isEvictionExecutionModule: boolean;
} {
    const NON_FINANCIAL_CLAIMS = ['مشاهدة', 'استصحاب', 'مبيت', 'تخلية مأجور', 'مطاوعة', 'تسليم طفل', 'تسليم ولد'];
    const isNonFinancialClaim =
        NON_FINANCIAL_CLAIMS.some((type) => claimType?.includes(type)) || isEvictionClaimFn(claimType);

    const principalDebtAmount = isNonFinancialClaim ? 0 : parsedDebtAmount;

    const claimTypeForExecutionModule = useMemo(() => {
        const a = String(claimType || '').trim();
        return a;
    }, [claimType]);

    const executionModuleStrategy = useMemo(
        () => getExecutionModuleStrategy(claimTypeForExecutionModule),
        [claimTypeForExecutionModule]
    );
    const isEvictionExecutionModule = executionModuleStrategy.useEvictionFieldProcedures;

    return {
        isNonFinancialClaim,
        principalDebtAmount,
        claimTypeForExecutionModule,
        executionModuleStrategy,
        isEvictionExecutionModule,
    };
}
