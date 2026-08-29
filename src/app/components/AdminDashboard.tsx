import React, { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import '@/styles/deferred-features-admin.css';
import '@/styles/admin-hq-shell.css';
import { Users } from '@/app/components/ui/icons/Users';
import { BarChart3 } from '@/app/components/ui/icons/BarChart3';
import { UserCheck } from '@/app/components/ui/icons/UserCheck';
import { LogOut } from '@/app/components/ui/icons/LogOut';
import { Library } from '@/app/components/ui/icons/Library';
import { Flag } from '@/app/components/ui/icons/Flag';
import { MessageSquare } from '@/app/components/ui/icons/MessageSquare';
import type { LucideIcon } from '@/app/components/ui/lucideIcons';
import { PageWrapper } from './SharedComponents';
import { cn } from '@/app/components/ui/utils';
import { AdminLawyerVerificationRequests } from '@/app/components/admin/AdminLawyerVerificationRequests';
import { HeadquartersPanel } from '@/app/components/admin/HeadquartersPanel';
import { HqCourtStatsPanel } from '@/app/components/admin/HqCourtStatsPanel';
import { HqAuditLogPanel } from '@/app/components/admin/HqAuditLogPanel';
import { HqTrustedDevicesPanel } from '@/app/components/admin/HqTrustedDevicesPanel';
import { HqReportsInbox } from '@/app/components/admin/HqReportsInbox';
import { HqForumAdminPanel } from '@/app/components/admin/HqForumAdminPanel';
import { HqKeepAlivePane } from '@/app/components/admin/HqKeepAlivePane';
import { useHeadquartersStatus } from '@/app/components/admin/useHeadquartersStatus';
import { useHqTabKeepAlive } from '@/app/components/admin/useHqTabKeepAlive';
import {
    HQ_TAB_GROUPS,
    HQ_TABS,
    formatHqBadge,
    isHqShortcutBlocked,
    tabFromShortcut,
    type AdminTabId,
    type HqTabIconMap,
} from '@/app/components/admin/hqTabs';
import { hqCountOrDash, hqReportsTotalOrDash, isHqAdminLiveReady, toHqLiveOverview } from '@/app/components/admin/hqLiveOverview';
import type {
    HqForumPostKind,
    HqForumTab,
    HqJumpOpts,
    HqReportFocus,
    HqVerificationFilter,
} from '@/app/components/admin/hqJump';
import type { HqUserCreatedFilter, HqUserRoleFilter, HqUserStatusFilter } from '@/app/components/admin/hqUserFilters';
import { endHeadquartersTrustedSession } from '@/app/services/admin/endHeadquartersTrustedSession';
import { SmartToast } from '@/app/components/ui/SmartToast';

const LazyAdminLawEntry = React.lazy(() =>
  import('@/app/components/admin/AdminLawEntry').then((m) => ({ default: m.AdminLawEntry })),
);

const ADMIN_HOME_PATH = '/admin';
const ADMIN_LIBRARY_PATH = '/admin/library';

const HQ_TAB_ICONS: HqTabIconMap = {
  monitor: BarChart3,
  users: Users,
  requests: UserCheck,
  reports: Flag,
  forum: MessageSquare,
  laws: Library,
};

function normalizeAdminPath(pathname: string): string {
  return pathname.replace(/\/+$/u, '') || '/';
}

function tabFromPathname(pathname: string): AdminTabId | null {
  const path = normalizeAdminPath(pathname);
  if (path === ADMIN_LIBRARY_PATH) return 'laws';
  if (path === ADMIN_HOME_PATH) return null;
  return null;
}

function pathForTab(tab: AdminTabId): string {
  return tab === 'laws' ? ADMIN_LIBRARY_PATH : ADMIN_HOME_PATH;
}

interface AdminDashboardProps {
  onLogout: () => void;
  /** تبويب ابتدائي عند الدخول الموحّد لمقر القيادة */
  initialTab?: AdminTabId;
  /** تطوير: واجهة فقط بلا نبض خادم */
  skipLiveProbe?: boolean;
}

interface AdminTabProps {
  active: boolean;
  onClick: () => void;
  onWarm?: () => void;
  icon: LucideIcon;
  alert?: boolean;
  badge?: number | string;
  label: string;
  shortcut?: string;
}

function HqHeaderPulse({
  system,
  sessionRequired,
}: {
  system: ReturnType<typeof useHeadquartersStatus>['system'];
  sessionRequired?: boolean;
}) {
  const tone =
    sessionRequired
      ? 'text-amber-400'
      : system === 'connected'
        ? 'text-green-400'
        : system === 'degraded'
          ? 'text-amber-400'
          : system === 'down'
            ? 'text-red-400'
            : 'text-gray-400';
  const dot =
    sessionRequired
      ? 'bg-amber-400'
      : system === 'connected'
        ? 'bg-green-400 animate-pulse'
        : system === 'degraded'
          ? 'bg-amber-400 animate-pulse'
          : system === 'down'
            ? 'bg-red-400'
            : 'bg-gray-500';
  const label =
    sessionRequired
      ? 'بلا جلسة مقر'
      : system === 'connected'
        ? 'متصل بالنظام'
        : system === 'degraded'
          ? 'اتصال متقطع'
          : system === 'down'
            ? 'انقطع الاتصال'
            : 'جاري التحقق...';
  return (
    <span className={cn('text-[10px] flex items-center gap-1', tone)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', dot)} />
      {label}
    </span>
  );
}

export const AdminDashboard = ({ onLogout, initialTab = 'monitor', skipLiveProbe = false }: AdminDashboardProps) => {
  const [activeTab, setActiveTab] = useState<AdminTabId>(() => {
    return tabFromPathname(window.location.pathname) ?? initialTab;
  });
  const [inspectUserId, setInspectUserId] = useState<string | null>(null);
  const [usersStatusFilter, setUsersStatusFilter] = useState<HqUserStatusFilter>('all');
  const [usersRoleFilter, setUsersRoleFilter] = useState<HqUserRoleFilter>('all');
  const [usersCreatedFilter, setUsersCreatedFilter] = useState<HqUserCreatedFilter>('all');
  const [verificationFilter, setVerificationFilter] = useState<HqVerificationFilter>('pending');
  const [forumTab, setForumTab] = useState<HqForumTab>('stats');
  const [forumPostKind, setForumPostKind] = useState<HqForumPostKind>('all');
  const [reportFocus, setReportFocus] = useState<HqReportFocus>('all');
  const [endingSession, setEndingSession] = useState(false);
  const live = useHeadquartersStatus({ skipFetch: skipLiveProbe });
  const liveReady = isHqAdminLiveReady(live, skipLiveProbe);
  const { isMounted, warmTab } = useHqTabKeepAlive(activeTab, { allowWarm: liveReady });
  const mainRef = useRef<HTMLDivElement>(null);
  const liveOverview = toHqLiveOverview(live);
  const pendingReportsDisplay = hqReportsTotalOrDash(live);
  const pendingVerificationDisplay = hqCountOrDash(
    live.pendingVerification,
    live.contentGaps,
    'pendingVerification',
  );

  const selectTab = useCallback((tab: AdminTabId) => {
    setActiveTab(tab);
    if (mainRef.current) mainRef.current.scrollTop = 0;
    const target = pathForTab(tab);
    if (normalizeAdminPath(window.location.pathname) !== target) {
      window.history.pushState({ screen: 'admin', tab }, '', target);
    }
  }, []);

  const clearInspectUser = useCallback(() => setInspectUserId(null), []);

  const jumpTo = useCallback(
    (tab: AdminTabId, opts?: HqJumpOpts) => {
      if (tab === 'users') {
        setUsersStatusFilter(opts?.userStatus ?? 'all');
        setUsersRoleFilter(opts?.userRole ?? 'all');
        setUsersCreatedFilter(opts?.userCreated ?? 'all');
        if (opts?.userId) setInspectUserId(opts.userId);
      }
      if (tab === 'requests') {
        setVerificationFilter(opts?.verificationStatus ?? 'pending');
      }
      if (tab === 'forum') {
        setForumTab(opts?.forumTab ?? 'stats');
        setForumPostKind(opts?.forumPostKind ?? 'all');
      }
      if (tab === 'reports') {
        setReportFocus(opts?.reportFocus ?? 'all');
      }
      selectTab(tab);
    },
    [selectTab],
  );

  const openTab = useCallback(
    (tab: AdminTabId) => {
      if (tab === 'users') {
        setUsersStatusFilter('all');
        setUsersRoleFilter('all');
        setUsersCreatedFilter('all');
      }
      if (tab === 'requests') setVerificationFilter('pending');
      if (tab === 'forum') {
        setForumTab('stats');
        setForumPostKind('all');
      }
      if (tab === 'reports') setReportFocus('all');
      selectTab(tab);
    },
    [selectTab],
  );

  const handleEndSession = useCallback(async () => {
    if (endingSession) return;
    setEndingSession(true);
    try {
      const { revoked } = await endHeadquartersTrustedSession();
      if (!revoked) {
        SmartToast.error('تعذّر إنهاء جلسة المقر على الخادم. أعد المحاولة من هنا حتى يُطلب الرمز في الدخول التالي.');
        return;
      }
      onLogout();
    } finally {
      setEndingSession(false);
    }
  }, [endingSession, onLogout]);

  useEffect(() => {
    const onPopState = () => {
      const fromPath = tabFromPathname(window.location.pathname);
      if (fromPath) {
        setActiveTab(fromPath);
        return;
      }
      if (normalizeAdminPath(window.location.pathname) === ADMIN_HOME_PATH) {
        setActiveTab((prev) => (prev === 'laws' ? 'monitor' : prev));
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isHqShortcutBlocked(event.target)) return;
      const next = tabFromShortcut(event.key);
      if (!next) return;
      event.preventDefault();
      openTab(next);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openTab]);

  const badgeFor = (id: AdminTabId): number | string => {
    if (id === 'requests') return pendingVerificationDisplay;
    if (id === 'reports') return pendingReportsDisplay;
    return 0;
  };

  return (
    <PageWrapper>
      <div className="hami-hq-shell">
        <header className="hami-hq-header">
          <div className="flex min-w-0 items-center gap-3">
              <div className="hami-hq-mark">
                  AD
              </div>
              <div className="min-w-0">
                  <h1 className="text-white font-bold text-lg leading-tight">مقر القيادة</h1>
                  <HqHeaderPulse system={live.system} sessionRequired={live.sessionRequired} />
              </div>
          </div>
          <div className="flex items-center gap-2">
              <button
                type="button"
                className={cn(
                  'hami-hq-chip hidden sm:inline-flex',
                  typeof pendingVerificationDisplay === 'number' &&
                    pendingVerificationDisplay > 0 &&
                    'hami-hq-chip-alert',
                )}
                onClick={() => jumpTo('requests', { verificationStatus: 'pending' })}
              >
                توثيق
                <span className="tabular-nums">{pendingVerificationDisplay}</span>
              </button>
              <button
                type="button"
                className={cn(
                  'hami-hq-chip hidden sm:inline-flex',
                  typeof pendingReportsDisplay === 'number' && pendingReportsDisplay > 0 && 'hami-hq-chip-alert',
                )}
                onClick={() => jumpTo('reports', { reportFocus: 'all' })}
              >
                بلاغات
                <span className="tabular-nums">{pendingReportsDisplay}</span>
              </button>
              <p className="hq-hint">١–٦ للتنقّل</p>
              <button
                type="button"
                onClick={() => void handleEndSession()}
                disabled={endingSession}
                className="hami-hq-logout"
                aria-label="إنهاء الجلسة"
                title="ينسى هذا الجهاز ويطلب الرمز في الدخول التالي للمقر"
                data-testid="hq-end-session"
              >
                  <LogOut className="w-5 h-5" />
                  <span className="text-xs font-bold">إنهاء الجلسة</span>
              </button>
          </div>
        </header>

        <div className="hami-hq-body">
          <nav className="hami-hq-rail" aria-label="أقسام مقر القيادة">
              {HQ_TAB_GROUPS.map((group) => (
                <div key={group.id} className="hami-hq-rail-group">
                  <p className="hami-hq-rail-group-label">{group.label}</p>
                  {HQ_TABS.filter((tab) => tab.group === group.id).map((tab) => {
                    const badge = badgeFor(tab.id);
                    return (
                      <AdminTab
                        key={tab.id}
                        active={activeTab === tab.id}
                        onClick={() => openTab(tab.id)}
                        onWarm={() => warmTab(tab.id)}
                        icon={HQ_TAB_ICONS[tab.id]}
                        alert={typeof badge === 'number' && badge > 0}
                        badge={badge}
                        label={tab.label}
                        shortcut={tab.shortcut}
                      />
                    );
                  })}
                </div>
              ))}
          </nav>

          <div ref={mainRef} className="hami-hq-main">
              {isMounted('monitor') ? (
                <HqKeepAlivePane active={activeTab === 'monitor'}>
                <div className="space-y-4">
                  <HqCourtStatsPanel
                    onJump={jumpTo}
                    liveOverview={liveOverview}
                    mail={live.mail}
                    checking={live.system === 'checking'}
                    gated={!liveReady}
                  />
                  <HqAuditLogPanel gated={!liveReady} />
                  <HqTrustedDevicesPanel gated={!liveReady} />
                </div>
                </HqKeepAlivePane>
              ) : null}
              {isMounted('requests') ? (
                <HqKeepAlivePane active={activeTab === 'requests'}>
                <AdminLawyerVerificationRequests
                  initialStatusFilter={verificationFilter}
                  onInspectUser={(userId) => jumpTo('users', { userId })}
                />
                </HqKeepAlivePane>
              ) : null}
              {isMounted('users') ? (
                <HqKeepAlivePane active={activeTab === 'users'}>
                <HeadquartersPanel
                  focusUserId={inspectUserId}
                  onFocusConsumed={clearInspectUser}
                  initialStatusFilter={usersStatusFilter}
                  initialRoleFilter={usersRoleFilter}
                  initialCreatedFilter={usersCreatedFilter}
                  skipFetch={!liveReady}
                />
                </HqKeepAlivePane>
              ) : null}
              {isMounted('laws') ? (
                <HqKeepAlivePane active={activeTab === 'laws'}>
                  <div className="space-y-6">
                      <div>
                          <p className="hq-kicker">المكتبة</p>
                          <h2 className="hq-title">المكتبة القانونية الذكية</h2>
                          <p className="mt-1 text-sm text-white/45">
                              أدخل النص الحرفي للمواد ليتم تخزينها في المكتبة والبحث داخل التطبيق.
                          </p>
                      </div>
                      <Suspense
                          fallback={
                              <div className="hq-state">
                                  جاري تحميل أدوات القوانين…
                              </div>
                          }
                      >
                          <LazyAdminLawEntry className="w-full shadow-2xl shadow-black/40" />
                      </Suspense>
                  </div>
                </HqKeepAlivePane>
              ) : null}
              {isMounted('reports') ? (
                <HqKeepAlivePane active={activeTab === 'reports'}>
                  <HqReportsInbox initialFocus={reportFocus} />
                </HqKeepAlivePane>
              ) : null}
              {isMounted('forum') ? (
                <HqKeepAlivePane active={activeTab === 'forum'}>
                  <HqForumAdminPanel
                    initialForumTab={forumTab}
                    initialPostKind={forumPostKind}
                    onJumpReports={() => jumpTo('reports', { reportFocus: 'all' })}
                    gated={!liveReady}
                  />
                </HqKeepAlivePane>
              ) : null}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
};

const AdminTab = ({ active, onClick, onWarm, icon: Icon, alert, badge, label, shortcut }: AdminTabProps) => {
    const countLabel = formatHqBadge(badge ?? (alert ? 1 : 0));
    return (
    <button
        type="button"
        onClick={onClick}
        onPointerEnter={onWarm}
        onFocus={onWarm}
        aria-label={label}
        aria-current={active ? 'page' : undefined}
        aria-keyshortcuts={shortcut}
        title={shortcut ? `${label} (${shortcut})` : label}
        className="hami-hq-tab"
    >
        <span className="relative">
            <Icon className="w-5 h-5 shrink-0" />
            {countLabel ? <span className="hami-hq-tab-badge">{countLabel}</span> : null}
        </span>
        <span className="hami-hq-tab-label">{label}</span>
    </button>
    );
};
