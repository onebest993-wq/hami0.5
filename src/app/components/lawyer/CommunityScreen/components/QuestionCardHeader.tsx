import { formatRelativeTime } from '../utils';
import { QuestionCardMoreMenu } from './QuestionCardMoreMenu';
import { QuestionCardAuthorPopup } from './QuestionCardAuthorPopup';
import { QuestionCardEditHistory } from './QuestionCardEditHistory';
import { QuestionCardHeaderAvatar, QuestionCardHeaderIdentity } from './QuestionCardHeaderIdentity';
import type { QuestionCardHeaderProps } from './QuestionCardHeader.types';

export type { QuestionCardHeaderProps } from './QuestionCardHeader.types';

export function QuestionCardHeader(props: QuestionCardHeaderProps) {
    const authorId = props.post.authorId || props.post.author_id || '';

    return (
        <div className="mb-3 flex items-start gap-2 min-w-0">
            <QuestionCardHeaderAvatar isAnonymous={props.isAnonymous} authorId={authorId} />

            <div className="relative min-w-0 flex-1">
                <QuestionCardHeaderIdentity
                    displayName={props.displayName}
                    isAnonymous={props.isAnonymous}
                    canFollow={props.canFollow}
                    isFollowing={props.isFollowing}
                    onOpenAuthor={(event) => {
                        event.stopPropagation();
                        if (props.isAnonymous) return;
                        if (props.onOpenProfile) {
                            props.onOpenProfile(authorId, props.post.authorName);
                            return;
                        }
                        props.setShowUserPopup(!props.showUserPopup);
                    }}
                    onFollow={(event) => {
                        event.stopPropagation();
                        props.onFollow(authorId);
                    }}
                />

                <div className="mt-0.5 flex items-center gap-2 min-w-0">
                    <span className="text-gray-500 text-xs shrink-0">{formatRelativeTime(props.post.createdAt)}</span>
                    {props.isEdited ? (
                        <QuestionCardEditHistory
                            post={props.post}
                            editCount={props.editCount}
                            showEditInfo={props.showEditInfo}
                            setShowEditInfo={props.setShowEditInfo}
                        />
                    ) : null}
                </div>

                {props.showUserPopup && !props.isAnonymous ? (
                    <QuestionCardAuthorPopup
                        displayName={props.displayName}
                        isAdmin={props.isAdmin}
                        isFollowing={props.isFollowing}
                        canFollow={props.canFollow}
                        followerCount={props.followerCount}
                        postCount={props.postCount}
                        authorId={authorId}
                        authorName={props.post.authorName}
                        onFollow={props.onFollow}
                        onOpenProfile={props.onOpenProfile}
                        onClose={() => props.setShowUserPopup(false)}
                    />
                ) : null}
            </div>

            <QuestionCardMoreMenu
                post={props.post}
                currentUserId={props.currentUserId}
                isOwner={props.isOwner}
                isAdmin={props.isAdmin}
                isAnonymous={props.isAnonymous}
                isPinned={props.isPinned}
                isLocked={props.isLocked}
                isThreadFollowing={props.isThreadFollowing}
                canLockUnlock={props.canLockUnlock}
                onToggleLock={props.onToggleLock}
                onCopyPostText={props.onCopyPostText}
                onSaveToVault={props.onSaveToVault}
                onToggleThreadFollow={props.onToggleThreadFollow}
                onMuteUser={props.onMuteUser}
                onTogglePin={props.onTogglePin}
                onEdit={props.onEdit}
                onDelete={props.onDelete}
                onReport={props.onReport}
            />
        </div>
    );
}
