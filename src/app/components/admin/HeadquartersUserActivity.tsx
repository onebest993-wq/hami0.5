import React from 'react';
import { formatHqDateTime } from '@/app/components/admin/hqFormat';
import type { HqAccountActivity } from '@/app/domain/admin/HqAccountActivity';

function fact(value: number | string | null | undefined, empty = '—'): string {
    if (value == null || value === '') return empty;
    return String(value);
}

export function HeadquartersUserActivity({
    activity,
    loading,
    error,
}: {
    activity: HqAccountActivity | null;
    loading: boolean;
    error: boolean;
}) {
    if (loading) {
        return <p className="mt-4 text-xs text-white/40">جاري جلب السجل الحي…</p>;
    }
    if (error || !activity) {
        return <p className="mt-4 text-xs text-red-300">تعذّر جلب السجل من الخادم — لا تُعرض أرقام تقديرية.</p>;
    }

    return (
        <div className="mt-5 space-y-3 border-t border-white/10 pt-4">
            <p className="text-sm font-semibold text-[#E6C673]">سجل حقيقي</p>
            <p className="text-xs text-white/45">
                من قاعدة البيانات وجلسات التوثيق. تسجيل الخروج لا يُحفظ كحدث مستقل — يُعرض آخر نشاط للجلسة إن وُجد.
            </p>
            <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                <div>
                    <dt className="text-xs text-gray-500">تاريخ الإنشاء</dt>
                    <dd className="text-white">{activity.createdAt ? formatHqDateTime(activity.createdAt) : '—'}</dd>
                </div>
                <div>
                    <dt className="text-xs text-gray-500">آخر دخول</dt>
                    <dd className="text-white">{activity.lastSignInAt ? formatHqDateTime(activity.lastSignInAt) : '—'}</dd>
                </div>
                <div>
                    <dt className="text-xs text-gray-500">جلسات حيّة</dt>
                    <dd className="text-white">{fact(activity.sessionCount)}</dd>
                </div>
                <div>
                    <dt className="text-xs text-gray-500">نوع الجهاز</dt>
                    <dd className="text-white">{activity.lastDevice || '—'}</dd>
                </div>
                <div>
                    <dt className="text-xs text-gray-500">عنوان الشبكة</dt>
                    <dd className="text-white" dir="ltr">
                        {activity.lastIp || '—'}
                    </dd>
                </div>
                <div>
                    <dt className="text-xs text-gray-500">مكان الشبكة</dt>
                    <dd className="text-white">{activity.lastPlace || '—'}</dd>
                </div>
                <div>
                    <dt className="text-xs text-gray-500">منشورات المنتدى</dt>
                    <dd className="text-white">{fact(activity.forumPosts)}</dd>
                </div>
                <div>
                    <dt className="text-xs text-gray-500">تعليقات المنتدى</dt>
                    <dd className="text-white">{fact(activity.forumComments)}</dd>
                </div>
                <div>
                    <dt className="text-xs text-gray-500">حظر المنتدى</dt>
                    <dd className="text-white">
                        {activity.forumBanned == null ? '—' : activity.forumBanned ? 'ساري' : 'لا'}
                    </dd>
                </div>
            </dl>
            {activity.connections?.length ? (
                <ol className="space-y-2">
                    {activity.connections.map((row, index) => (
                        <li
                            key={`${row.at}-${row.ip ?? 'ip'}-${index}`}
                            className="rounded-lg border border-white/10 px-3 py-2"
                            data-testid="hq-connection-row"
                        >
                            <p className="text-xs text-white/40">{formatHqDateTime(row.at)}</p>
                            <p className="text-sm text-white">{row.deviceLabel}</p>
                            <p className="mt-1 truncate text-xs text-white/50" dir="ltr">
                                {[row.ip, row.place].filter(Boolean).join(' · ')}
                            </p>
                        </li>
                    ))}
                </ol>
            ) : null}
            {activity.gaps.length > 0 ? (
                <p className="text-xs text-amber-400">تعذّر مصدر: {activity.gaps.join('، ')}</p>
            ) : null}
            {activity.timeline.length === 0 ? (
                <p className="text-xs text-white/40">لا أحداث مسجّلة بعد.</p>
            ) : (
                <ol className="max-h-56 space-y-2 overflow-y-auto overscroll-contain">
                    {activity.timeline.map((item, index) => (
                        <li key={`${item.at}-${item.kind}-${index}`} className="rounded-lg border border-white/10 px-3 py-2">
                            <p className="text-xs text-white/40">{formatHqDateTime(item.at)}</p>
                            <p className="text-sm text-white">{item.label}</p>
                            {item.detail ? (
                                <p className="mt-1 truncate text-xs text-white/50">{item.detail}</p>
                            ) : null}
                        </li>
                    ))}
                </ol>
            )}
        </div>
    );
}
