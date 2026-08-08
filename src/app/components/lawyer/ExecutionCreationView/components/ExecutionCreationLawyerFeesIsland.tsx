import React, {
    useCallback,
    useEffect,
    useImperativeHandle,
    useState,
    startTransition,
    type MutableRefObject,
    type RefObject,
} from 'react';
import { LawyerFeesToggleCard } from './LawyerFeesToggleCard';
import { PartiesSection } from './PartiesSection';
import {
    formatMoneyIntegerDisplay,
    handleMoneyInputChange,
} from '@/app/utils/moneyInput';

export type ExecutionCreationLawyerFeesSnapshot = {
    includeLawyerFees: boolean;
    lawyerFeesAmount: string;
};

export type ExecutionCreationLawyerFeesIslandHandle = {
    setIncludeLawyerFees: (value: boolean) => void;
    setLawyerFeesAmount: (value: string) => void;
};

type PartiesSectionProps = React.ComponentProps<typeof PartiesSection>;

type ExecutionCreationLawyerFeesIslandProps = {
    showLawyerFeesToggle: boolean;
    showPartiesSection: boolean;
    partiesSectionProps: Omit<PartiesSectionProps, 'includeLawyerFees'>;
    stateRef: MutableRefObject<ExecutionCreationLawyerFeesSnapshot>;
    imperativeRef?: RefObject<ExecutionCreationLawyerFeesIslandHandle | null>;
};

/**
 * يعزل حالة أتعاب المحاماة عن ExecutionCreationView الرئيسي
 * لتفادي إعادة رسم النموذج الكامل (حاسبة النفقة وغيرها) عند تفعيل التبديل.
 */
export const ExecutionCreationLawyerFeesIsland: React.FC<ExecutionCreationLawyerFeesIslandProps> = ({
    showLawyerFeesToggle,
    showPartiesSection,
    partiesSectionProps,
    stateRef,
    imperativeRef,
}) => {
    const [includeLawyerFees, setIncludeLawyerFeesState] = useState(false);
    const [lawyerFeesAmount, setLawyerFeesAmountState] = useState('');

    const setIncludeLawyerFees = useCallback((checked: boolean) => {
        startTransition(() => setIncludeLawyerFeesState(checked));
    }, []);

    const setLawyerFeesAmount = useCallback((value: string) => {
        setLawyerFeesAmountState(value);
    }, []);

    useEffect(() => {
        stateRef.current = { includeLawyerFees, lawyerFeesAmount };
    }, [includeLawyerFees, lawyerFeesAmount, stateRef]);

    useImperativeHandle(
        imperativeRef,
        () => ({
            setIncludeLawyerFees,
            setLawyerFeesAmount,
        }),
        [setIncludeLawyerFees, setLawyerFeesAmount],
    );

    const formatCurrency = formatMoneyIntegerDisplay;

    const handleAmountChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
            handleMoneyInputChange(e.target.value, setter);
        },
        [],
    );

    if (!showLawyerFeesToggle && !showPartiesSection) return null;

    return (
        <>
            {showLawyerFeesToggle ? (
                <LawyerFeesToggleCard
                    includeLawyerFees={includeLawyerFees}
                    onIncludeLawyerFeesChange={setIncludeLawyerFees}
                    lawyerFeesAmount={lawyerFeesAmount}
                    formatCurrency={formatCurrency}
                    handleAmountChange={handleAmountChange}
                    onLawyerFeesAmountChange={setLawyerFeesAmount}
                />
            ) : null}

            {showPartiesSection ? (
                <PartiesSection
                    {...partiesSectionProps}
                    includeLawyerFees={includeLawyerFees}
                />
            ) : null}
        </>
    );
};
