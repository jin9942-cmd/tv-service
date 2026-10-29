import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppProvider } from './state/app';
import { Layout } from './components/Layout';
import { ChannelRedirect, EventPage, EventsPage, HighlightsPage, LivePage, MyListPage, SchedulePage, TagPage, WatchPage } from './v4/pages';
import { DetailProvider } from './v4/detail';
import { TvHome, TvHowToWatch, TvShowDetail, TvShows } from './pages/tv';
import { TvClassic } from './pages/poker';
import { SeriesList } from './pages/Series';
import { Players, PlayerProfile } from './pages/Players';
import { Hands } from './pages/Hands';
import { Account } from './pages/Account';
import { NotFound } from './pages/NotFound';
import { GGPassFlow } from './features/auth/GGPassFlow';
import { Plans } from './features/auth/Plans';
import { Devices } from './features/auth/Devices';
import { Search } from './pages/Search';
import { MembershipCheck, WsopPlusJoin } from './features/membership/WsopPlus';

// Hash routing keeps deep links working on static hosting (GitHub Pages sub-path) without a server fallback.
export default function App() {
  return (
    <AppProvider>
      <HashRouter>
        <DetailProvider>
        <Routes>
          {/* External-domain mock, full screen and outside the app shell. */}
          <Route path="/auth/ggpass" element={<GGPassFlow />} />
          <Route path="/wsop-plus/join" element={<WsopPlusJoin />} />
          <Route element={<Layout />}>
            <Route index element={<TvHome />} />
            <Route path="live" element={<LivePage />} />
            <Route path="live/channels" element={<ChannelRedirect />} />
            <Route path="live/channels/:channelId" element={<ChannelRedirect />} />
            <Route path="watch/:dayId" element={<WatchPage />} />
            <Route path="tag/:slug" element={<TagPage />} />
            <Route path="schedule" element={<SchedulePage />} />
            <Route path="shows" element={<TvShows />} />
            <Route path="shows/:showId" element={<TvShowDetail />} />
            <Route path="video" element={<Hands />} />
            <Route path="how-to-watch" element={<TvHowToWatch />} />
            <Route path="series" element={<SeriesList />} />
            <Route path="events" element={<EventsPage />} />
            <Route path="events/:eventId" element={<EventPage />} />
            <Route path="players" element={<Players />} />
            <Route path="players/:playerId" element={<PlayerProfile />} />
            <Route path="hands" element={<Hands />} />
            <Route path="archive" element={<Navigate to="/events" replace />} />
            <Route path="highlights" element={<HighlightsPage />} />
            <Route path="classics/:classicId" element={<TvClassic />} />
            <Route path="account" element={<Account />} />
            <Route path="plans" element={<Plans />} />
            <Route path="devices" element={<Devices />} />
            <Route path="search" element={<Search />} />
            <Route path="my-list" element={<MyListPage />} />
            <Route path="membership/check" element={<MembershipCheck />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
        </DetailProvider>
      </HashRouter>
    </AppProvider>
  );
}
