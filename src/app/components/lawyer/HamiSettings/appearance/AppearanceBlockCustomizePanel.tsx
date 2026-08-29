import React from 'react';
import type { AppearanceBlockCustomize } from './useAppearanceBlockCustomize';
import { AppearanceBlockPicker } from './AppearanceBlockPicker';
import { AppearanceBlockStyleControls } from './AppearanceBlockStyleControls';

export function AppearanceBlockCustomizePanel({
    customize,
    themePrimary,
}: {
    customize: AppearanceBlockCustomize;
    themePrimary: string;
}) {
    return (
        <div className="space-y-4" data-testid="appearance-block-customize-panel">
            <AppearanceBlockPicker customize={customize} />
            <AppearanceBlockStyleControls customize={customize} themePrimary={themePrimary} />
        </div>
    );
}
