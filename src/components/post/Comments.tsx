import { useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { flatten, keys, useComments } from '@/api/queries';
import { postsApi } from '@/api/endpoints';
import { timeAgo } from '@/lib/format';
import { cn } from '@/lib/cn';
import { Avatar } from '@/components/ui/Bits';
import { Icon } from '@/components/ui/Icon';
import { Spinner } from '@/components/ui/Button';
import { TravelLoader } from '@/components/ui/TravelLoader';
import { ErrorState, LoadMore } from '@/components/layout/States';
import { useAuth } from '@/store/auth';
import { useToast } from '@/components/ui/Toast';
import type { Comment } from '@/api/types';

/** A post's comments with its own loading, empty and error states. Used by the sheet and the post page. */
export function CommentList({ postId, className }: { postId: string; className?: string }) {
  const comments = useComments(postId);
  const list = flatten(comments.data);

  if (comments.isError) {
    return <ErrorState error={comments.error} onRetry={() => comments.refetch()} />;
  }

  if (comments.isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12" role="status">
        <TravelLoader size={64} />
        <p className="text-[13px] text-ink-faint">Loading comments…</p>
      </div>
    );
  }

  if (list.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <span className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-brand/10 text-brand ring-1 ring-inset ring-brand/20">
          <Icon name="comment" size={22} />
        </span>
        <p className="font-display text-[15px] font-semibold">No comments yet</p>
        <p className="mt-1 text-[13px] text-ink-soft">Ask them something about the trip.</p>
      </div>
    );
  }

  return (
    <ul className={cn('space-y-4', className)}>
      {list.map((comment) => <CommentItem key={comment.id} comment={comment} />)}
      <LoadMore
        onVisible={() => comments.fetchNextPage()}
        hasMore={!!comments.hasNextPage}
        loading={comments.isFetchingNextPage}
      />
    </ul>
  );
}

function CommentItem({ comment }: { comment: Comment }) {
  return (
    <li className="flex gap-2.5 animate-fade-up">
      <Avatar user={comment.user} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="flex min-w-0 items-baseline gap-2">
          <Link to={`/@${comment.user.username}`} className="truncate text-[13px] font-semibold hover:text-brand">
            {comment.user.name}
          </Link>
          <time className="shrink-0 text-2xs text-ink-faint" dateTime={comment.createdAt}>
            {timeAgo(comment.createdAt)}
          </time>
        </p>
        <p className="mt-0.5 whitespace-pre-line break-words text-sm leading-relaxed">{comment.body}</p>
        {comment.replyCount > 0 && (
          <p className="tnum mt-1 text-xs text-ink-faint">
            {comment.replyCount} {comment.replyCount === 1 ? 'reply' : 'replies'}
          </p>
        )}
      </div>
    </li>
  );
}

/** Tallest the composer grows before it scrolls, in px — about four lines. */
const MAX_COMPOSER_HEIGHT = 112;

/** One-line composer that grows with its text, with a round send button. */
export function CommentComposer({ postId, autoFocus }: { postId: string; autoFocus?: boolean }) {
  const { signedIn } = useAuth();
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const field = useRef<HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();
  const toast = useToast();

  useLayoutEffect(() => {
    const el = field.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, MAX_COMPOSER_HEIGHT)}px`;
  }, [body]);

  if (!signedIn) {
    return (
      <p className="rounded-xl bg-sunk px-3.5 py-3 text-center text-[13px] text-ink-soft">
        <Link to="/login" className="font-medium text-brand hover:underline">Log in</Link> to join the conversation.
      </p>
    );
  }

  const submit = async (event?: React.FormEvent) => {
    event?.preventDefault();
    if (!body.trim() || busy) return;
    setBusy(true);
    try {
      await postsApi.addComment(postId, body.trim());
      setBody('');
      queryClient.invalidateQueries({ queryKey: keys.comments(postId) });
      queryClient.invalidateQueries({ queryKey: keys.post(postId) });
      // The feed cards carry the comment count too.
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    } catch (error: any) {
      toast(error?.message ?? 'Could not post that', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex items-end gap-2">
      <textarea
        ref={field}
        value={body}
        rows={1}
        autoFocus={autoFocus}
        onChange={(event) => setBody(event.target.value)}
        onKeyDown={(event) => {
          // Enter sends on a keyboard; Shift+Enter keeps a new line.
          if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
            event.preventDefault();
            submit();
          }
        }}
        placeholder="Ask about the trip…"
        aria-label="Write a comment"
        className={cn(
          'min-h-[44px] flex-1 resize-none rounded-[22px] border border-line bg-surface px-4 py-[11px] text-sm leading-snug',
          'placeholder:text-ink-faint transition-colors duration-200',
          'focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20',
        )}
      />
      <button
        type="submit"
        disabled={!body.trim() || busy}
        aria-label="Post comment"
        className={cn(
          'grid h-11 w-11 shrink-0 place-items-center rounded-full text-white gradient-brand',
          'shadow-[0_6px_18px_-6px_rgb(var(--c-brand)/0.9)] transition-all duration-200 ease-spring active:scale-90',
          'disabled:opacity-40 disabled:shadow-none',
        )}
      >
        {busy ? <Spinner className="h-4 w-4" /> : <Icon name="send" size={18} strokeWidth={2} />}
      </button>
    </form>
  );
}
