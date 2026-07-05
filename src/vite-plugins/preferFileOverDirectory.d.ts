import type { Plugin } from 'vite';
/**
 * When Foo.tsx and Foo/ coexist (common in this codebase), Node/Vite on Windows
 * may resolve `import './Foo'` to the directory. That breaks dev dynamic imports.
 * Prefer the sibling source file when it exists.
 */
export declare function preferFileOverDirectory(projectRoot: string): Plugin;
