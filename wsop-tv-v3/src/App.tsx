import { HashRouter, Route, Routes } from 'react-router-dom';
import { AppProvider } from './state/app';
import { Layout } from './components/Layout';
import { Live, LiveChannels, WatchRoute } from './pages/Live';
import { TvHome, TvHowToWatch, TvSchedule, TvShowDetail, TvShows } from './pages/tv';
import { TvArchive, TvHighlights } from './pages/poker';
import { TvEventDetail } from './pages/ott';
import { SeriesList } from './pages/Series';
import { Players, PlayerProfile } from './pages/Players';
import { Hands } from './pages/Hands';
import { Account } from './pages/Account';
import { NotFound } from './pages/NotFound';
import { GGPassFlow } from './features/auth/GGPassFlow';
import { Plans } from './features/auth/Plans';
import { Devices } from './features/auth/Devices';
import { Search } from './pages/Search';
import { MyListPage } from './features/library/MyList';
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
            <Route path="live" element={<Live />} />
            <Route path="live/channels" element={<LiveChannels />} />
            <Route path="live/channels/:channelId" element={<LiveChannels />} />
            <Route path="watch/:dayId" element={<WatchRoute />} />
            <Route path="schedule" element={<TvSchedule />} />
            <Route path="shows" element={<TvShows />} />
            <Route path="shows/:showId" element={<TvShowDetail />} />
            <Route path="video" element={<Hands />} />
            <Route path="how-to-watch" element={<TvHowToWatch />} />
            <Route path="series" element={<SeriesList />} />
            <Route path="events/:eventId" element={<TvEventDetail />} />
            <Route path="players" element={<Players />} />
            <Route path="players/:playerId" element={<PlayerProfile />} />
            <Route path="hands" element={<Hands />} />
            <Route path="archive" element={<TvArchive />} />
            <Route path="highlights" element={<TvHighlights />} />
            <Route path="account" element={<Account />} />
            <Route path="plans" element={<Plans />} />
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
