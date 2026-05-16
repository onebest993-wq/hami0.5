#!/usr/bin/env node

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 📁 Documentation Organization Script
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Automatically organizes 100+ documentation files into proper structure
 * يقوم بتنظيم ملفات التوثيق تلقائياً
 * 
 * Usage: node scripts/organize-docs.js
 * 
 * @version 1.0.0
 * @author Hami Legal System
 */

const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const ROOT_DIR = path.join(__dirname, '..');
const DOCS_DIR = path.join(ROOT_DIR, 'docs');
const ARCHIVE_DIR = path.join(DOCS_DIR, 'archive');

// Files to keep in root
const KEEP_IN_ROOT = [
    'README.md',
    'CHANGELOG.md',
    'LICENSE',
    'package.json',
    'package-lock.json',
    'tsconfig.json',
    'vite.config.ts',
    '.gitignore',
    '.env.example'
];

// ═══════════════════════════════════════════════════════════════════════════
// FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Create directory if it doesn't exist
 */
function ensureDir(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`✅ Created directory: ${path.relative(ROOT_DIR, dir)}`);
    }
}

/**
 * Check if file should be moved
 */
function shouldMove(filename) {
    // Keep essential files in root
    if (KEEP_IN_ROOT.includes(filename)) {
        return false;
    }
    
    // Move markdown files
    if (filename.endsWith('.md')) {
        return true;
    }
    
    // Move text files
    if (filename.endsWith('.txt')) {
        return true;
    }
    
    return false;
}

/**
 * Organize documentation files
 */
function organizeDocs() {
    console.log('📁 Starting documentation organization...\n');
    
    // Create archive directory
    ensureDir(ARCHIVE_DIR);
    
    // Read root directory
    const files = fs.readdirSync(ROOT_DIR);
    
    let movedCount = 0;
    let skippedCount = 0;
    
    files.forEach(filename => {
        const sourcePath = path.join(ROOT_DIR, filename);
        
        // Skip directories
        if (fs.statSync(sourcePath).isDirectory()) {
            return;
        }
        
        // Check if should move
        if (shouldMove(filename)) {
            const targetPath = path.join(ARCHIVE_DIR, filename);
            
            try {
                fs.renameSync(sourcePath, targetPath);
                console.log(`✅ Moved: ${filename} → docs/archive/`);
                movedCount++;
            } catch (error) {
                console.error(`❌ Error moving ${filename}:`, error.message);
            }
        } else {
            skippedCount++;
        }
    });
    
    console.log('\n═════════════════════════════════════════��═════════════════════');
    console.log('📊 Summary:');
    console.log(`   Moved: ${movedCount} files`);
    console.log(`   Kept in root: ${skippedCount} files`);
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('✅ Documentation organization complete!\n');
}

/**
 * Create index file in archive
 */
function createArchiveIndex() {
    const files = fs.readdirSync(ARCHIVE_DIR);
    
    let indexContent = '# 📚 Documentation Archive\n\n';
    indexContent += 'This directory contains historical documentation files.\n\n';
    indexContent += '## Files\n\n';
    
    files.forEach(filename => {
        if (filename !== 'INDEX.md') {
            indexContent += `- [${filename}](./${filename})\n`;
        }
    });
    
    indexContent += '\n---\n\n';
    indexContent += `Last updated: ${new Date().toISOString()}\n`;
    
    fs.writeFileSync(path.join(ARCHIVE_DIR, 'INDEX.md'), indexContent);
    console.log('✅ Created archive index file\n');
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

try {
    organizeDocs();
    createArchiveIndex();
    
    console.log('🎉 All done! Your project root is now clean and organized.\n');
    console.log('📋 Next steps:');
    console.log('   1. Review docs/archive/ to ensure nothing was lost');
    console.log('   2. Update any scripts that reference old paths');
    console.log('   3. Commit the changes\n');
    
} catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
}
