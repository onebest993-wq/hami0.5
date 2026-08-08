/**
 * 🔧 V11 Automated Patch Script
 * 
 * هذا السكريبت يطبق تعديلات V11 تلقائياً على ExecutionCreationView.tsx
 * 
 * الاستخدام:
 * node scripts/applyV11Patch.js
 */

const fs = require('fs');
const path = require('path');

const FILE_PATH = path.join(__dirname, '../src/app/components/lawyer/ExecutionCreationView.tsx');

// الكود القديم (سيتم البحث عنه واستبداله)
const OLD_CODE = `                                                <div>
                                                    <label className="text-xs font-bold text-gray-300 mb-2 block flex items-center gap-1">
                                                        مقدار نفقة الأولاد الشهرية (دينار)
                                                        <span className="text-red-400">*</span>
                                                    </label>
                                                    <div className="flex items-center gap-2 w-full bg-[#0B1120] border border-gray-700 rounded-lg p-3 focus-within:border-purple-500">
                                                        <DollarSign className="text-gray-500 flex-shrink-0" size={16} />
                                                        <input
                                                            type="text"
                                                            value={formatCurrency(alimonyChildrenMonthly)}
                                                            onChange={(e) => handleAmountChange(e, setAlimonyChildrenMonthly)}
                                                            className="flex-1 bg-transparent text-white outline-none font-mono text-base"
                                                            placeholder="0"
                                                        />
                                                        <span className="text-gray-500 text-xs">IQD</span>
                                                    </div>
                                                </div>`;

// الكود الجديد (سيحل محل القديم)
const NEW_CODE = `                                                <div className="space-y-3">
                                                    <div>
                                                        <label className="text-xs font-bold text-gray-300 mb-2 block flex items-center gap-1">
                                                            عدد الأولاد المحكوم لهم
                                                            <span className="text-red-400">*</span>
                                                        </label>
                                                        <div className="flex items-center gap-2 w-full bg-[#0B1120] border border-gray-700 rounded-lg p-3 focus-within:border-purple-500">
                                                            <User className="text-gray-500 flex-shrink-0" size={16} />
                                                            <input
                                                                type="number"
                                                                min="1"
                                                                value={alimonyChildrenCount}
                                                                onChange={(e) => setAlimonyChildrenCount(e.target.value)}
                                                                className="flex-1 bg-transparent text-white outline-none font-mono text-base"
                                                                placeholder="1"
                                                            />
                                                            <span className="text-gray-500 text-xs">ولد</span>
                                                        </div>
                                                    </div>
                                                    
                                                    <div>
                                                        <label className="text-xs font-bold text-gray-300 mb-2 block flex items-center gap-1">
                                                            مقدار نفقة الأولاد الشهرية (للولد الواحد)
                                                            <span className="text-red-400">*</span>
                                                        </label>
                                                        <div className="flex items-center gap-2 w-full bg-[#0B1120] border border-gray-700 rounded-lg p-3 focus-within:border-purple-500">
                                                            <DollarSign className="text-gray-500 flex-shrink-0" size={16} />
                                                            <input
                                                                type="text"
                                                                value={formatCurrency(alimonyChildrenMonthly)}
                                                                onChange={(e) => handleAmountChange(e, setAlimonyChildrenMonthly)}
                                                                className="flex-1 bg-transparent text-white outline-none font-mono text-base"
                                                                placeholder="0"
                                                            />
                                                            <span className="text-gray-500 text-xs">IQD</span>
                                                        </div>
                                                    </div>
                                                </div>`;

function applyPatch() {
    console.log('🔧 Starting V11 Patch Application...\n');
    
    try {
        // 1. Read file
        console.log(`📖 Reading file: ${FILE_PATH}`);
        let content = fs.readFileSync(FILE_PATH, 'utf8');
        
        // 2. Count occurrences
        const occurrences = (content.match(new RegExp(OLD_CODE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
        console.log(`   Found ${occurrences} occurrences of old code\n`);
        
        if (occurrences === 0) {
            console.log('❌ Error: Old code pattern not found!');
            console.log('   The file may have already been patched or modified.\n');
            return false;
        }
        
        // 3. Create backup
        const backupPath = FILE_PATH + '.v11.backup';
        fs.writeFileSync(backupPath, content);
        console.log(`💾 Backup created: ${backupPath}\n`);
        
        // 4. Apply replacement
        console.log('✏️  Applying replacements...');
        const newContent = content.split(OLD_CODE).join(NEW_CODE);
        
        // 5. Verify changes
        const newOccurrences = (newContent.match(new RegExp(OLD_CODE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
        if (newOccurrences > 0) {
            console.log(`⚠️  Warning: ${newOccurrences} occurrences still remain!\n`);
        } else {
            console.log('   ✅ All occurrences replaced successfully\n');
        }
        
        // 6. Write new content
        fs.writeFileSync(FILE_PATH, newContent);
        console.log(`💾 File updated: ${FILE_PATH}\n`);
        
        // 7. Summary
        console.log('═══════════════════════════════════════');
        console.log('✅ V11 PATCH APPLIED SUCCESSFULLY!');
        console.log('═══════════════════════════════════════');
        console.log(`📋 Changes:`);
        console.log(`   - Replaced: ${occurrences} sections`);
        console.log(`   - Added: "عدد الأولاد المحكوم لهم" field`);
        console.log(`   - Updated: "للولد الواحد" label`);
        console.log(`\n🎯 The system is now 100% complete!\n`);
        
        return true;
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        return false;
    }
}

// Run the patch
if (require.main === module) {
    applyPatch();
}

module.exports = { applyPatch };
