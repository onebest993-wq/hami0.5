import React, { useMemo, useState } from 'react';
import { HqChip, HqChipRow, HqGhostButton } from '@/app/components/admin/hqChrome';
import { composeLawyerDirectoryName, type AdminUser } from '@/app/domain/admin/AdminUser';
import { isHqUserMutationLocked } from '@/app/domain/admin/hqUserActions';
import { matchesHqUserQuery } from '@/app/components/admin/hqUserFilters';
import { cn } from '@/app/components/ui/utils';

const TITLE_MAX = 200;
const MESSAGE_MAX = 2000;

export function HqSystemNotifyComposer({
    users,
    query = '',
    busy = false,
    onSend,
}: {
    users: AdminUser[];
    query?: string;
    busy?: boolean;
    onSend: (input: {
        scope: 'all' | 'users';
        userIds: string[];
        title: string;
        message: string;
    }) => Promise<boolean>;
}) {
    const [scope, setScope] = useState<'all' | 'users'>('users');
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [selected, setSelected] = useState<Record<string, boolean>>({});
    const [sending, setSending] = useState(false);

    const candidates = useMemo(
        () => users.filter((user) => !isHqUserMutationLocked(user) && !user.isDeleted && matchesHqUserQuery(user, query)),
        [users, query],
    );
    const selectedIds = useMemo(
        () => candidates.filter((user) => selected[user.id]).map((user) => user.id),
        [candidates, selected],
    );

    const canSend =
        title.trim().length > 0 &&
        message.trim().length > 0 &&
        !busy &&
        !sending &&
        (scope === 'all' || selectedIds.length > 0);

    const toggle = (userId: string) => {
        setSelected((prev) => ({ ...prev, [userId]: !prev[userId] }));
    };

    const submit = async () => {
        if (!canSend) return;
        setSending(true);
        try {
            const ok = await onSend({
                scope,
                userIds: selectedIds,
                title: title.trim(),
                message: message.trim(),
            });
            if (ok) {
                setTitle('');
                setMessage('');
                setSelected({});
            }
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="hq-dir-notify" data-testid="hq-system-notify">
            <HqChipRow>
                <HqChip active={scope === 'all'} onClick={() => setScope('all')}>
                    للكل
                </HqChip>
                <HqChip active={scope === 'users'} onClick={() => setScope('users')}>
                    لمحددين
                </HqChip>
            </HqChipRow>
            <input
                type="text"
                value={title}
                maxLength={TITLE_MAX}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="عنوان الإشعار"
                className="hq-dir-field"
                aria-label="عنوان إشعار النظام"
                data-testid="hq-system-notify-title"
            />
            <textarea
                value={message}
                maxLength={MESSAGE_MAX}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="نص الإشعار"
                rows={3}
                className="hq-dir-field hq-dir-textarea"
                aria-label="نص إشعار النظام"
                data-testid="hq-system-notify-message"
            />
            {scope === 'users' ? (
                <>
                    {selectedIds.length > 0 ? (
                        <p className="hq-dir-notify-count">{selectedIds.length} محدد للإرسال</p>
                    ) : null}
                    <div className="hq-dir-notify-list">
                        {candidates.length === 0 ? (
                            <p className="hq-dir-empty">
                                {query.trim() ? 'لا مطابقات للبحث الحالي' : 'لا حسابات في القائمة الحالية'}
                            </p>
                        ) : (
                            candidates.map((user) => {
                                const name = composeLawyerDirectoryName(user.fullName, user.familyName, user.email);
                                const on = Boolean(selected[user.id]);
                                return (
                                    <button
                                        key={user.id}
                                        type="button"
                                        aria-pressed={on}
                                        onClick={() => toggle(user.id)}
                                        className={cn('hq-dir-notify-user', on && 'hq-dir-notify-user-on')}
                                        data-testid={`hq-system-notify-user-${user.id}`}
                                    >
                                        <span className="hq-dir-notify-name">{name}</span>
                                        <span className="hq-dir-notify-meta">{on ? 'محدد' : 'اختيار'}</span>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </>
            ) : (
                <p className="hq-dir-notify-hint">
                    يُرسل لكل الحسابات المحمّلة في قائمة المقر (عدا حسابات الإدارة).
                </p>
            )}
            <HqGhostButton
                disabled={!canSend}
                onClick={() => void submit()}
                data-testid="hq-system-notify-send"
            >
                {sending ? 'جاري الإرسال…' : 'إرسال إشعار النظام'}
            </HqGhostButton>
        </div>
    );
}
