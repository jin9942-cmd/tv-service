import { HashRouter, Route, Routes } from 'react-router-dom';
import { AppProvider } from './state/app';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { Live, WatchRoute } from './pages/Live';
import { Schedule } from './pages/Schedule';
import { SeriesList, EventDetail } from './pages/Series';
import { Players, PlayerProfile } from './pages/Players';
import { Hands } from './pages/Hands';
import { Archive } from './pages/Archive';
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
            <Route index element={<Home />} />
            <Route path="live" element={<Live />} />
            <Route path="watch/:dayId" element={<WatchRoute />} />
            <Route path="schedule" element={<Schedule />} />
            <Route path="series" element={<SeriesList />} />
            <Route path="events/:eventId" element={<EventDetail />} />
            <Route path="players" element={<Players />} />
            <Route path="players/:playerId" element={<PlayerProfile />} />
            <Route path="hands" element={<Hands />} />
            <Route path="archive" element={<Archive />} />
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
