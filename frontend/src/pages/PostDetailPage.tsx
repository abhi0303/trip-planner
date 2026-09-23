import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { flatten, keys, useComments, usePost } from '@/api/queries';
import { postsApi } from '@/api/endpoints';
import { timeAgo } from '@/lib/format';
import { Avatar, EmptyState, Skeleton } from '@/components/ui/Bits';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Field';
import { Dropdown } from '@/components/ui/Dropdown';
import { Icon } from '@/components/ui/Icon';
import { ApiError } from '@/api/client';
import { track } from '@/lib/busy';
import { VISIBILITY_META } from '@/lib/labels';
import { VISIBILITY, type Post, type Visibility } from '@/api/types';
import { ErrorState, LoadMore } from '@/components/layout/States';
import { PostCard } from '@/components/post/PostCard';
import { useAuth } from '@/store/auth';
import { useToast } from '@/components/ui/Toast';

const MAX_CAPTION = 2200;

/** Edit and delete live here rather than on the card: the feed stays a feed. */
function OwnerControls({ post, onChanged }: { post: Post; onChanged: () => void }) {
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [caption, setCaption] = useState(post.caption ?? '');
  const [visibility, setVisibility] = useState<Visibility>(post.visibility);
  const [busy, setBusy] = useState(false);

  const refreshFeeds = () => queryClient.invalidateQueries({ queryKey: ['feed'] });

  const save = async () => {
    setBusy(true);
    try {
      await track(postsApi.update(post.id, {
        caption: caption.trim().slice(0, MAX_CAPTION),
        visibility,
      }));
      refreshFeeds();
      onChanged();
      setEditing(false);
      toast('Post updated', 'success');
    } catch (error) {
      toast(error instanceof ApiError ? error.message : 'Could not save that', 'error');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm('Delete this post? The trip itself stays put.')) return;
    setBusy(true);
    try {
      await track(postsApi.remove(post.id));
      refreshFeeds();
      toast('Post deleted', 'success');
      navigate('/', { replace: true });
    } catch (error) {
      toast(error instanceof ApiError ? error.message : 'Could not delete that', 'error');
      setBusy(false);
    }
  };

  if (!editing) {
    return (
      <div className="flex items-center gap-1.5">
        <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
          <Icon name="edit" size={15} /> Edit post
        </Button>
        <Button variant="ghost" size="sm" onClick={remove} loading={busy}>
          <Icon name="trash" size={15} /> Delete
        </Button>
        <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-ink-faint">
          <Icon name={VISIBILITY_META[post.visibility].icon} size={13} />
          {VISIBILITY_META[post.visibility].label}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-card bg-surface p-4 ring-1 ring-inset ring-line-soft">
      <Textarea
        rows={3}
        value={caption}
        maxLength={MAX_CAPTION}
        placeholder="Caption"
        onChange={(event) => setCaption(event.target.value)}
      />
      <Dropdown
        value={visibility}
        onChange={(next) => setVisibility(next as Visibility)}
        options={VISIBILITY.map((value) => ({
          value,
          label: VISIBILITY_META[value].label,
          hint: VISIBILITY_META[value].hint,
          icon: VISIBILITY_META[value].icon,
        }))}
      />
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
        <Button size="sm" onClick={save} loading={busy}>Save</Button>
      </div>
      <p className="text-2xs text-ink-faint">
        Photos come from the trip — change those on the trip itself.
      </p>
    </div>
  );
}

export function PostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const post = usePost(id);
  const comments = useComments(id);
  const list = flatten(comments.data);

  if (post.isLoading) {
    return (
      <div className="mx-auto w-full max-w-[560px] space-y-4">
        <Skeleton className="h-[420px] rounded-card" />
      </div>
    );
  }
  if (post.isError) return <ErrorState error={post.error} onRetry={() => post.refetch()} />;
  if (!post.data) return null;

  return (
    <div className="mx-auto w-full max-w-[560px] space-y-5">
      <PostCard post={post.data} />

      {post.data.isOwner && <OwnerControls post={post.data} onChanged={() => post.refetch()} />}

      <section aria-labelledby="comments-heading">
        <h2 id="comments-heading" className="mb-3 text-base font-semibold">
          Comments
          <span className="tnum ml-1.5 text-sm font-normal text-ink-faint">{post.data.commentCount}</span>
        </h2>

        <CommentComposer postId={post.data.id} />

        {comments.isLoading ? (
          <div className="mt-4 space-y-3">
            {[0, 1].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
          </div>
        ) : list.length === 0 ? (
          <EmptyState icon="comment" title="No comments yet" body="Ask them something about the trip." />
        ) : (
          <ul className="mt-4 space-y-4">
            {list.map((comment) => (
              <li key={comment.id} className="flex gap-2.5">
                <Avatar user={comment.user} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="flex items-baseline gap-2">
                    <Link to={`/@${comment.user.username}`} className="text-[13px] font-semibold hover:text-brand">
                      {comment.user.name}
                    </Link>
                    <time className="text-2xs text-ink-faint" dateTime={comment.createdAt}>
                      {timeAgo(comment.createdAt)}
                    </time>
                  </p>
                  <p className="mt-0.5 whitespace-pre-line text-sm leading-relaxed">{comment.body}</p>
                  {comment.replyCount > 0 && (
                    <p className="tnum mt-1 text-xs text-ink-faint">
                      {comment.replyCount} {comment.replyCount === 1 ? 'reply' : 'replies'}
                    </p>
                  )}
                </div>
              </li>
            ))}
            <LoadMore
              onVisible={() => comments.fetchNextPage()}
              hasMore={!!comments.hasNextPage}
              loading={comments.isFetchingNextPage}
            />
          </ul>
        )}
      </section>
    </div>
  );
}

function CommentComposer({ postId }: { postId: string }) {
  const { signedIn } = useAuth();
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const queryClient = useQueryClient();
  const toast = useToast();

  if (!signedIn) {
    return (
      <p className="rounded-xl bg-sunk px-3.5 py-3 text-[13px] text-ink-soft">
        <Link to="/login" className="font-medium text-brand hover:underline">Log in</Link> to join the conversation.
      </p>
    );
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    try {
      await postsApi.addComment(postId, body.trim());
      setBody('');
      queryClient.invalidateQueries({ queryKey: keys.comments(postId) });
      queryClient.invalidateQueries({ queryKey: keys.post(postId) });
    } catch (error: any) {
      toast(error?.message ?? 'Could not post that', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-2">
      <Textarea
        value={body}
        onChange={(event) => setBody(event.target.value)}
        placeholder="Ask about the trip…"
        rows={2}
      />
      <Button type="submit" size="sm" loading={busy} disabled={!body.trim()} className="ml-auto flex">
        Comment
      </Button>
    </form>
  );
}
