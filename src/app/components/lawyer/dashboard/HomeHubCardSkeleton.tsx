import React from 'react';
import { HOME_HUB_FULLY_EMPTY_COPY, HOME_HUB_PANEL_LABELS } from '@/app/services/alerts/homeHubCardLogic';
import { peekHomeHubBootHasItems } from './peekHomeHubBootHasItems';
import { HomeHubEmptyState } from './HomeHubEmptyState';

/**
 * هيكل مركز الأوامر — نفس تبويبات/جسم البطاقة الحية قبل تحميل المقطع
 * حتى لا يظهر صندوق مختلف ثم تقفز الشبكة.
 */
export function HomeHubCardSkeleton({
    className = '',
    onActivate,
}: {
    className?: string;
    onActivate?: () => void;
} = {}): React.ReactElement {
    const interactive = Boolean(onActivate);
    const hasItems = peekHomeHubBootHasItems();
    return (
        <section
            data-hami-block="alerts"
            data-testid="home-hub-card-skeleton"
            data-hub-state="loading"
            data-hub-boot-settling="1"
            data-hub-has-items={hasItems ? '1' : '0'}
            data-hub-layout-mode="feed"
            className={`relative flex flex-col min-h-0 gap-1${className ? ` ${className}` : ''}${interactive ? ' touch-manipulation' : ''}`}
            aria-busy="true"
            aria-label={interactive ? 'التنبيهات والتثبيت' : 'جاري تحميل مركز الأوامر'}
            role={interactive ? 'button' : undefined}
            tabIndex={interactive ? 0 : undefined}
            onClick={interactive ? onActivate : undefined}
            onKeyDown={
                interactive
                    ? (event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              onActivate?.();
                          }
                      }
                    : undefined
            }
            dir="rtl"
        >
            <div className="hami-hub-tabs" aria-hidden>
                <span className="hami-hub-tab" data-active="true">
                    <span className="hami-hub-tab__pill" aria-hidden />
                    <span className="hami-hub-tab__label">{HOME_HUB_PANEL_LABELS.alerts}</span>
                    <span className="hami-hub-tab__badge hami-hub-tab__badge--reserved">{'\u00a0'}</span>
                </span>
                <span className="hami-hub-tab" data-active="false">
                    <span className="hami-hub-tab__label">{HOME_HUB_PANEL_LABELS.pins}</span>
                    <span className="hami-hub-tab__badge hami-hub-tab__badge--reserved">{'\u00a0'}</span>
                </span>
            </div>
            <div
                className="hami-hub-readable-panels hami-hub-card-body--feed"
                data-testid="home-hub-skeleton-empty"
            >
                <HomeHubEmptyState
                    message={HOME_HUB_FULLY_EMPTY_COPY}
                    testId="home-hub-skeleton-empty-copy"
                    compact
                />
            </div>
        </section>
    );
}
