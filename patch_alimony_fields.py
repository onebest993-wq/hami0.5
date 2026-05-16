#!/usr/bin/env python3
"""
Patch Script: Add Past Alimony Amount Input Fields
Adds input fields for pastWifeAlimonyAmount and pastChildrenAlimonyAmount
"""

# Read the file
with open('/src/app/components/lawyer/ExecutionCreationView.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Field template for Wife
wife_field = '''                                                        
                                                        <div>
                                                            <label className="text-xs font-bold text-rose-400 mb-2 block">💰 مقدار النفقة الماضية المحكوم بها (دينار)</label>
                                                            <input
                                                                type="number"
                                                                value={pastWifeAlimonyAmount}
                                                                onChange={(e) => setPastWifeAlimonyAmount(e.target.value)}
                                                                className="w-full bg-rose-950/10 border-2 border-rose-700 text-white p-3 rounded-lg focus:border-rose-500 outline-none font-bold text-lg"
                                                                placeholder="أدخل المبلغ المتراكم المحكوم به..."
                                                            />
                                                            <p className="text-gray-500 text-[10px] mt-1 flex items-center gap-1">
                                                                ℹ️ المبلغ الإجمالي للنفقة المتراكمة المحكوم بها للزوجة
                                                            </p>
                                                        </div>
'''

# Field template for Children
children_field = '''                                                        
                                                        <div>
                                                            <label className="text-xs font-bold text-rose-400 mb-2 block">💰 مقدار النفقة الماضية المحكوم بها (دينار)</label>
                                                            <input
                                                                type="number"
                                                                value={pastChildrenAlimonyAmount}
                                                                onChange={(e) => setPastChildrenAlimonyAmount(e.target.value)}
                                                                className="w-full bg-rose-950/10 border-2 border-rose-700 text-white p-3 rounded-lg focus:border-rose-500 outline-none font-bold text-lg"
                                                                placeholder="أدخل المبلغ المتراكم المحكوم به..."
                                                            />
                                                            <p className="text-gray-500 text-[10px] mt-1 flex items-center gap-1">
                                                                ℹ️ المبلغ الإجمالي للنفقة المتراكمة المحكوم بها للأولاد
                                                            </p>
                                                        </div>
'''

# Find and insert - looking for lines 1808 and 2025 (after date fields)
modified_lines = []
insertions_done = 0

for i, line in enumerate(lines):
    modified_lines.append(line)
    
    # Check if this is line 1808 or 2025 (closing </div> after date field)
    if i == 1807:  # Line 1808 (0-indexed = 1807)
        if '</div>' in line and insertions_done == 0:
            modified_lines.append(wife_field)
            insertions_done += 1
            print(f"✅ Inserted wife field after line {i+1}")
    
    elif i == 2024:  # Line 2025 (0-indexed = 2024) - adjusted for already added lines
        if '</div>' in line and insertions_done == 1:
            modified_lines.append(children_field)
            insertions_done += 1
            print(f"✅ Inserted children field after line {i+1}")

# Write back
with open('/src/app/components/lawyer/ExecutionCreationView.tsx', 'w', encoding='utf-8') as f:
    f.writelines(modified_lines)

print(f"\n✅ DONE: {insertions_done} fields added successfully!")
print("📊 Wife field: pastWifeAlimonyAmount")
print("📊 Children field: pastChildrenAlimonyAmount")
