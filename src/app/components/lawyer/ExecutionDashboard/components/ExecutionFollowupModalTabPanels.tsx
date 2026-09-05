import type { ExecutionFollowupModalPortalController } from '../hooks/useExecutionFollowupModalPortalController';
import { ExecutionFollowupModalPersonalCoercivePanels } from './ExecutionFollowupModalPersonalCoercivePanels';
import { ExecutionFollowupModalMidPanels } from './ExecutionFollowupModalMidPanels';
import { ExecutionFollowupModalLatePanels } from './ExecutionFollowupModalLatePanels';

/** Keep-alive tab panels for followup modal — split by panel groups. */
export function ExecutionFollowupModalTabPanels({
    c,
}: {
    c: ExecutionFollowupModalPortalController;
}) {
    const p = c.panelsToRender;
    return (
        <>
            {p.has('personal') || p.has('coercive') ? (
                <ExecutionFollowupModalPersonalCoercivePanels c={c} />
            ) : null}
            {p.has('other_party') || p.has('seizure_requests') ? (
                <ExecutionFollowupModalMidPanels c={c} />
            ) : null}
            {p.has('correspondences') || p.has('dossier_controls') || p.has('admin') ? (
                <ExecutionFollowupModalLatePanels c={c} />
            ) : null}
        </>
    );
}
