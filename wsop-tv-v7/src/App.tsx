import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppProvider } from './state/app';
import { Layout } from './components/Layout';
import { ArchiveEventPage, EventChronicle, PlayerPage, YearPage } from './v4/browse';
import { ArchivePage, ChannelRedirect, CollectionPage, EventPage, LivePage, MyListPage, SchedulePage, TagPage, VideosPage, WatchPage } from './v4/pages';
import { TvHome, TvHowToWatch, TvShowDetail, TvShows } from './pages/tv';
import { TvClassic } from './pages/poker';
import { SeriesList } from './pages/Series';
import { Players, PlayerProfile } from './pages/Players';
import { Hands } from './pages/Hands';
import { Account } from './pages/Account';
import { NotFound } from './pages/NotFound';
import { GGPassFlow } from './features/auth/GGPassFlow';
import { Plans } from './features/auth/Plans';
import { WsopPlusPage } from './features/auth/WsopPlusPage';
import { Devices } from './features/auth/Devices';
import { Search } from './pages/Search';
import { MembershipCheck, WsopPlusJoin } from './features/membership/WsopPlus';

// Hash routing keeps deep links working on static hosting (GitHub Pages sub-path) without a server fallback.
export default function App() {
  return (
    <AppProvider>
      <HashRouter>
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
            {/* The schedule is out of the menu (Home's season strip and Live link to it). */}
            <Route path="schedule" element={<SchedulePage />} />
            <Route path="schedule/:seriesId" element={<SchedulePage />} />
            <Route path="schedule/channels" element={<Navigate to="/schedule" replace />} />
            <Route path="tournaments" element={<Navigate to="/schedule" replace />} />
            {/* Browse (as v8): Years, Players; Highlights on its own page; Replays now live under Years. */}
            <Route path="videos" element={<VideosPage tab="years" />} />
            <Route path="videos/players" element={<VideosPage tab="players" />} />
            <Route path="videos/events" element={<Navigate to="/videos" replace />} />
            <Route path="videos/tag/:tag" element={<Navigate to="/videos" replace />} />
            <Route path="videos/highlights" element={<Navigate to="/videos" replace />} />
            <Route path="videos/replays" element={<Navigate to="/videos" replace />} />
            <Route path="videos/year/:year" element={<YearPage />} />
            <Route path="videos/year/:year/:series" element={<YearPage />} />
            <Route path="videos/players/:playerId" element={<PlayerPage />} />
            <Route path="videos/events/:slug" element={<EventChronicle />} />
            <Route path="videos/event/:id" element={<ArchiveEventPage />} />
            <Route path="collections/:id" element={<CollectionPage />} />
            <Route path="archive/:key" element={<ArchivePage />} />
            {/* Shorts are gone: old links land on Browse. */}
            <Route path="videos/shorts" element={<Navigate to="/videos" replace />} />
            <Route path="shorts" element={<Navigate to="/videos" replace />} />
            <Route path="shows" element={<TvShows />} />
            <Route path="shows/:showId" element={<TvShowDetail />} />
            <Route path="video" element={<Hands />} />
            <Route path="how-to-watch" element={<TvHowToWatch />} />
            <Route path="series" element={<SeriesList />} />
            <Route path="events" element={<Navigate to="/videos/replays" replace />} />
            <Route path="events/:eventId" element={<EventPage />} />
            <Route path="players" element={<Players />} />
            <Route path="players/:playerId" element={<PlayerProfile />} />
            <Route path="hands" element={<Hands />} />
            <Route path="archive" element={<Navigate to="/videos/replays?series=classics" replace />} />
            <Route path="highlights" element={<Navigate to="/videos" replace />} />
            <Route path="classics/:classicId" element={<TvClassic />} />
            <Route path="account" element={<Account />} />
            <Route path="plans" element={<Plans />} />
            <Route path="wsop-plus" element={<WsopPlusPage />} />
            <Route path="devices" element={<Devices />} />
            <Route path="search" element={<Search />} />
            <Route path="my-list" element={<MyListPage />} />
            <Route path="membership/check" element={<MembershipCheck />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </HashRouter>
    </AppProvider>
  );
}
