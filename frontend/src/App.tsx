import { Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { EmptyState } from '@/components/ui/Bits';
import { Button, Spinner } from '@/components/ui/Button';
import { HomePage } from '@/pages/HomePage';
import { ExplorePage } from '@/pages/ExplorePage';
import { SearchPage } from '@/pages/SearchPage';
import { SavedPage } from '@/pages/SavedPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { AuthPage } from '@/pages/AuthPage';
import { TripDetailPage } from '@/pages/TripDetailPage';
import { PlacePage } from '@/pages/PlacePage';
import { PostDetailPage } from '@/pages/PostDetailPage';
import { FollowListPage, ProfilePage } from '@/pages/ProfilePage';
import { CreateTripPage } from '@/pages/wizard/CreateTripPage';
import { ComposePostPage } from '@/pages/ComposePostPage';
import { useAuth } from '@/store/auth';

export function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<HomePage />} />
        <Route path="explore" element={<ExplorePage />} />
        <Route path="search" element={<SearchPage />} />

        <Route path="trips/:idOrSlug" element={<TripDetailPage />} />
        <Route path="places/:idOrSlug" element={<PlacePage />} />
        <Route path="posts/:id" element={<PostDetailPage />} />

        {/* `/@username` reads better than `/users/<uuid>`, and the API accepts both. */}
        <Route path=":username" element={<UsernameRoute />} />
        <Route path=":username/followers" element={<FollowListPage kind="followers" />} />
        <Route path=":username/following" element={<FollowListPage kind="following" />} />

        <Route path="create" element={<RequireAuth><CreateTripPage /></RequireAuth>} />
        <Route path="posts/new" element={<RequireAuth><ComposePostPage /></RequireAuth>} />
        <Route path="trips/:id/edit" element={<RequireAuth><CreateTripPage /></RequireAuth>} />
        <Route path="saved" element={<RequireAuth><SavedPage /></RequireAuth>} />
        <Route path="settings" element={<RequireAuth><SettingsPage /></RequireAuth>} />

        <Route path="login" element={<RedirectIfAuthed><AuthPage mode="login" /></RedirectIfAuthed>} />
        <Route path="register" element={<RedirectIfAuthed><AuthPage mode="register" /></RedirectIfAuthed>} />

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

/** Only `/@handle` is a profile; anything else at the root is a 404. */
function UsernameRoute() {
  const { username } = useParams();
  if (!username?.startsWith('@')) return <NotFound />;
  return <ProfilePage />;
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { signedIn, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner className="h-6 w-6 text-brand" />
      </div>
    );
  }
  if (!signedIn) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  return <>{children}</>;
}

function RedirectIfAuthed({ children }: { children: React.ReactNode }) {
  const { signedIn, loading } = useAuth();
  if (loading) return null;
  if (signedIn) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function NotFound() {
  return (
    <EmptyState
      icon="compass"
      title="Nothing here"
      body="This page does not exist, or whoever made it keeps it private."
      action={<Button to="/explore">Explore trips</Button>}
    />
  );
}
