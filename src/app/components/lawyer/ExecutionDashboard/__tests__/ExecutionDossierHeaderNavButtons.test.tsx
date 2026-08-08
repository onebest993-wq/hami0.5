import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { ExecutionDossierHeaderNavButtons } from '../components/ExecutionDossierHeaderNavButtons';
import { EXECUTION_DOSSIER_TEST_IDS } from '../executionDossierTestIds';

describe('ExecutionDossierHeaderNavButtons', () => {
    it('يعرض زر الإغلاق فقط في الوضع النافذي', () => {
        render(<ExecutionDossierHeaderNavButtons onExit={vi.fn()} />);
        expect(screen.queryByTestId(EXECUTION_DOSSIER_TEST_IDS.back)).toBeNull();
        expect(screen.getByTestId(EXECUTION_DOSSIER_TEST_IDS.close)).toBeInTheDocument();
    });

    it('يعرض زر الرجوع فقط عند التنقل المتداخل', () => {
        render(
            <ExecutionDossierHeaderNavButtons
                onBack={vi.fn()}
                onExit={vi.fn()}
                nestedNavigation
            />,
        );
        expect(screen.getByTestId(EXECUTION_DOSSIER_TEST_IDS.back)).toBeInTheDocument();
        expect(screen.queryByTestId(EXECUTION_DOSSIER_TEST_IDS.close)).toBeNull();
    });
});
