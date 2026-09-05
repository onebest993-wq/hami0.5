import type { ReactNode } from 'react';
import { archiveGridClassForColumnCount } from '../archiveGridGeometry';
import { resolveLinkedClusterInnerColumns } from '../groupLinkedLawsuitArchiveFiles';
import { LAWSUIT_VAULT_TEST_IDS } from '@/app/components/lawyer/smart-modal/smartFile/lawsuitVaultTestIds';

export type LinkedLawsuitDossierClusterProps = {
    memberCount: number;
    hostColumnCount?: number;
    children: ReactNode;
};

/**
 * إطار خفيف لإضابير مترابطة في المخزن — يكبر/يصغر مع العدد دون تغيير شكل البطاقة.
 */
export function LinkedLawsuitDossierCluster({
    memberCount,
    hostColumnCount = 2,
    children,
}: LinkedLawsuitDossierClusterProps) {
    const cols = resolveLinkedClusterInnerColumns(memberCount, hostColumnCount);
    const innerGrid = archiveGridClassForColumnCount(cols);

    return (
        <section
            className="col-span-full w-full min-w-0 rounded-2xl border border-[#E6C673]/22 bg-[#E6C673]/[0.035] p-2 sm:p-2.5"
            data-testid={LAWSUIT_VAULT_TEST_IDS.linkedDossierCluster}
            aria-label={`إضابير مترابطة، ${memberCount}`}
        >
            <div className="mb-2 flex items-center justify-between gap-2 px-0.5">
                <p className="text-[11px] font-bold text-[#E6C673]/85">إضابير مترابطة</p>
                <span className="inline-flex min-h-[22px] min-w-[22px] items-center justify-center rounded-full border border-[#E6C673]/30 bg-[#E6C673]/10 px-1.5 text-[10px] font-black text-[#E6C673]">
                    {memberCount}
                </span>
            </div>
            <div className={innerGrid}>{children}</div>
        </section>
    );
}
