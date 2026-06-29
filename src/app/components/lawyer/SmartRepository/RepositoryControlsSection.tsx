import React, { memo } from 'react';
import { VaultSearchFilterHub } from '@/app/components/lawyer/SmartVaultModal/VaultSearchFilterHub';
import {
    repositoryFeedFilterLabel,
    REPOSITORY_FEED_FILTERS,
    type RepositoryFeedFilter,
} from '@/app/services/repository/repositoryUnifiedFeed';
import type { SmartVaultDoc } from '@/app/services/lawyer-cloud';
import type { useSmartVault } from '@/app/components/lawyer/hooks/useSmartVault';
import {
    REPO_CONTROLS_SHELL,
    REPO_FILTER_CHIP,
    REPO_FILTER_CHIP_ACTIVE,
    REPO_FILTER_ROW,
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
    activeFilter: RepositoryFeedFilter;
    filterCounts: Record<RepositoryFeedFilter, number>;
    feedLayout: RepositoryFeedLayoutId;
    onSelectMainFilter: (filter: RepositoryFeedFilter) => void;
    onFeedLayoutChange: (layout: RepositoryFeedLayoutId) => void;
    onCreateNote: () => void;
    onOpenScanner: () => void;
    onOpenVoice: () => void;
};

export const RepositoryControlsSection = memo(function RepositoryControlsSection({
    vault,
    unboundVaultDocs,
    activeFilter,
    filterCounts,
    feedLayout,
    onSelectMainFilter,
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

            <div className={REPO_FILTER_ROW} role="tablist" aria-label="تصفية المستودع">
                {REPOSITORY_FEED_FILTERS.map((filter) => {
                    const active = activeFilter === filter;
                    return (
                        <button
                            key={filter}
                            type="button"
                            role="tab"
                            aria-selected={active}
                            data-testid={`repository-filter-${filter}`}
                            onClick={() => onSelectMainFilter(filter)}
                            className={active ? REPO_FILTER_CHIP_ACTIVE : REPO_FILTER_CHIP}
                        >
                            {repositoryFeedFilterLabel(filter)}
                            <span className="mr-1 opacity-70">({filterCounts[filter]})</span>
                        </button>
                    );
                })}
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
                imageInputRef={vault.imageInputRef}
                pdfInputRef={vault.pdfInputRef}
                onImageSelect={(e) => void vault.handleImageUploadSelect(e)}
                onPdfSelect={(e) => void vault.handlePdfUploadSelect(e)}
            />
        </div>
    );
});
