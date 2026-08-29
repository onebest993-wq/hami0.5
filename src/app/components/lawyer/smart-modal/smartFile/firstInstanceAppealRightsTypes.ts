export type FirstInstanceAppealAction =
    | 'wait_opponent'
    | 'self_appeal'
    | 'finalize_non_merit'
    | 'archive_void'
    | 'both_paths'
    | 'none';

export type FirstInstanceAppealRights = {
    action: FirstInstanceAppealAction;
    hint: string;
};
