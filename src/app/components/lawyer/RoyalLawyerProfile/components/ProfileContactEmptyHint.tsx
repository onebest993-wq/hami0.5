import React from 'react';

export function ProfileContactEmptyHint({ isEditing }: { isEditing: boolean }): React.ReactElement {
    return (
        <p className="text-xs text-white/35 text-center py-4">
            {isEditing ? 'اختر نوع القناة أعلاه لإضافتها.' : 'أضف قنوات التواصل من «تعديل».'}
        </p>
    );
}
