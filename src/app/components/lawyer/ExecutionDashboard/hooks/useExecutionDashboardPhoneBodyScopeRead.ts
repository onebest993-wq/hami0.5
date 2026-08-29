/** Read phone-body scope + fallback + raw prop destructure */
import {
    readExecutionPhoneBodyScope,
    useExecutionPhoneBodyScopeRef,
} from './executionPhoneBodyScope';
import { withPhoneBodyScopeFallback } from '../components/executionDashboardPhoneBodyScopeFallback';
import { pickExecutionPhoneBodyScopeReadBag } from './pickExecutionPhoneBodyScopeReadBag';

export function useExecutionDashboardPhoneBodyScopeRead(renderFingerprint?: string) {
    const scopeRef = useExecutionPhoneBodyScopeRef();
    const props = withPhoneBodyScopeFallback({
        ...readExecutionPhoneBodyScope(scopeRef),
        renderFingerprint,
    }) as Record<string, unknown>;
    return {
        scopeRef,
        props,
        ...pickExecutionPhoneBodyScopeReadBag(props),
    };
}
