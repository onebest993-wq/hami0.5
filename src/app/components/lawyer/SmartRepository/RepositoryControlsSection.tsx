import React, { memo } from 'react';
import { VaultSearchFilterHub } from '@/app/components/lawyer/SmartVaultModal/VaultSearchFilterHub';
import type { SmartVaultDoc } from '@/app/services/vault/vaultTypes';
import type { useSmartVault } from '@/app/components/lawyer/hooks/useSmartVault';
import {
    REPO_CONTROLS_SHELL,
} from './smartRepositoryTheme';
import { RepositoryCustomCategoryRow } from './RepositoryCustomCategoryRow';
import { RepositoryActionToolbar } from './RepositoryActionToolbar';
import type { RepositoryFeedLayoutId } from './repositoryFeedLayout';

type VaultControls = Pick<
    ReturnType<typeof useSmartVault>,
    | 'searchQuery'
    | 'setSearchQuery'
    | 'handleSearchSubmit'
    | 'searchInputRef'
    | 'activeFilter'
    | 'setActiveFilter'
    | 'customCategories'
    | 'addVaultCategory'
    | 'removeVaultCategory'
    | 'imageInputRef'
    | 'pdfInputRef'
    | 'handleImageUploadSelect'
    | 'handlePdfUploadSelect'
>;

type RepositoryControlsSectionProps = {
    vault: VaultControls;
    unboundVaultDocs: SmartVaultDoc[];
    feedLayout: RepositoryFeedLayoutId;
    actionToolbarDisabled?: boolean;
    onFeedLayoutChange: (layout: RepositoryFeedLayoutId) => void;
    onCreateNote: () => void;
    onOpenScanner: () => void;
    onOpenVoice: () => void;
};

export const RepositoryControlsSection = memo(function RepositoryControlsSection({
    vault,
    unboundVaultDocs,
    feedLayout,
    actionToolbarDisabled = false,
    onFeedLayoutChange,
    onCreateNote,
    onOpenScanner,
    onOpenVoice,
}: RepositoryControlsSectionProps) {
    return (
        <div className={REPO_CONTROLS_SHELL}>
            <div className="px-5 pt-3 pb-1 shrink-0">
                <VaultSearchFilterHub
                    searchQuery={vault.searchQuery}
                    onSearchChange={vault.setSearchQuery}
                    onSearchKeyDown={vault.handleSearchSubmit}
                    searchInputRef={vault.searchInputRef}
                    isSearching={false}
                    onAISearch={() => undefined}
                    liveSearch
                    searchOnly
                    activeFilter={vault.activeFilter}
                    onFilterChange={vault.setActiveFilter}
                    customCategories={vault.customCategories}
                    onAddCategory={vault.addVaultCategory}
                    onRemoveCategory={(name) => void vault.removeVaultCategory(name)}
                    docs={unboundVaultDocs}
                />
            </div>

            <RepositoryCustomCategoryRow
                activeFilter={vault.activeFilter}
                customCategories={vault.customCategories}
                docs={unboundVaultDocs}
                onFilterChange={vault.setActiveFilter}
                onAddCategory={vault.addVaultCategory}
                onRemoveCategory={(name) => void vault.removeVaultCategory(name)}
            />

            <RepositoryActionToolbar
                feedLayout={feedLayout}
                onFeedLayoutChange={onFeedLayoutChange}
                onCreateNote={onCreateNote}
                onOpenScanner={onOpenScanner}
                onOpenVoice={onOpenVoice}
                disabled={actionToolbarDisabled}
                imageInputRef={vault.imageInputRef}
                pdfInputRef={vault.pdfInputRef}
                onImageSelect={(e) => void vault.handleImageUploadSelect(e)}
                onPdfSelect={(e) => void vault.handlePdfUploadSelect(e)}
            />
        </div>
    );
});
