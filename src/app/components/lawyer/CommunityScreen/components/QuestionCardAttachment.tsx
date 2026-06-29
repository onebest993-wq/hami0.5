import { FileText, ZoomIn, Eye, Loader2 } from 'lucide-react';
import { ImageWithFallback } from '@/app/components/figma/ImageWithFallback';
import type { CommunityPost } from '@/app/services/lawyer-cloud';
import { FORUM_PANEL } from '../forumPlumTheme';

export type QuestionCardAttachmentProps = {
    post: CommunityPost;
    attachmentUrl: string | null;
    attachmentLoading: boolean;
    onImageClick: (url: string) => void;
};

export function QuestionCardAttachment({
    post,
    attachmentUrl,
    attachmentLoading,
    onImageClick,
}: QuestionCardAttachmentProps) {
    if (!post.attachment) return null;

    return (
        <div className="mb-4 mt-2">
            {post.attachment.type === 'image' ? (
                <div
                    className="w-full h-[150px] relative rounded-xl overflow-hidden group/att cursor-pointer border border-[#4A3D52]/50 bg-[#221A28]"
                    onClick={() => attachmentUrl && onImageClick(attachmentUrl)}
                >
                    {attachmentLoading ? (
                        <div className="absolute inset-0 flex items-center justify-center z-10">
                            <Loader2 size={22} className="animate-spin text-white/40" />
                        </div>
                    ) : attachmentUrl ? (
                        <>
                            <div className="absolute inset-0 bg-black/20 group-hover/att:bg-black/10 transition-colors z-10" />
                            <ImageWithFallback
                                src={attachmentUrl}
                                alt={post.attachment.name || 'Attachment'}
                                className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none opacity-0 group-hover/att:opacity-100 transition-opacity">
                                <div className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center border border-white/20">
                                    <ZoomIn size={20} className="text-white" />
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-white/40 text-xs px-4 text-center">
                            تعذّر تحميل الصورة — قد يكون الرابط منتهياً
                        </div>
                    )}
                </div>
            ) : null}

            {post.attachment.type === 'audio' ? (
                <div className={`w-full ${FORUM_PANEL} p-3`}>
                    <p className="text-white/50 text-[10px] mb-2">مقطع صوتي</p>
                    {attachmentLoading ? (
                        <div className="flex items-center gap-2 text-white/40 text-xs">
                            <Loader2 size={14} className="animate-spin" />
                            جاري تحميل المقطع...
                        </div>
                    ) : attachmentUrl ? (
                        <audio src={attachmentUrl} controls preload="metadata" className="w-full h-10" />
                    ) : (
                        <p className="text-white/40 text-xs">تعذّر تحميل المقطع الصوتي</p>
                    )}
                </div>
            ) : null}

            {post.attachment.type === 'document' ? (
                attachmentUrl ? (
                    <a
                        href={attachmentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className={`w-full ${FORUM_PANEL} p-3 flex items-center gap-3 hover:bg-[#342C3E] transition-colors cursor-pointer group/doc`}
                    >
                        <div className="w-10 h-10 rounded-lg bg-[#F0B896]/10 flex items-center justify-center border border-[#F0B896]/25 group-hover/doc:border-[#F0B896]/45 transition-colors">
                            <FileText size={20} className="text-[#F0B896]" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-white/90 text-sm font-medium truncate">{post.attachment.name}</p>
                            <p className="text-white/40 text-[10px]">فتح/تحميل</p>
                        </div>
                        <div className="opacity-0 group-hover/doc:opacity-100 transition-opacity">
                            <Eye size={16} className="text-white/50" />
                        </div>
                    </a>
                ) : (
                    <div className={`w-full ${FORUM_PANEL} p-3 flex items-center gap-3`}>
                        <div className="w-10 h-10 rounded-lg bg-[#F0B896]/10 flex items-center justify-center border border-[#F0B896]/25">
                            <FileText size={20} className="text-[#F0B896]" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-white/90 text-sm font-medium truncate">{post.attachment.name}</p>
                            <p className="text-white/40 text-[10px]">
                                {attachmentLoading ? 'جاري التحميل...' : 'تعذّر فتح الملف'}
                            </p>
                        </div>
                    </div>
                )
            ) : null}
        </div>
    );
}
