/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 📝 COMMON TYPES - Type Definitions المركزية
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Public barrel — preserves `@/app/types/common` / `src/app/types/common.ts`.
 * Domain modules live under `./common/` (Windows-safe: file + folder siblings).
 *
 * @version 3.1.0
 * @author Hami Legal System
 */

import type React from 'react';

export * from './common/base';
export * from './common/party';
export * from './common/court';
export * from './common/financial';
export * from './common/caseFile';
export * from './common/executionArchive';
export * from './common/theme';
export * from './common/ui';
export * from './common/settings';
export * from './common/user';
export * from './common/api';
export * from './common/events';
export * from './common/archive';
export * from './common/form';
export * from './common/utility';

export type {
    // Re-export for convenience (legacy consumers)
    React,
};
