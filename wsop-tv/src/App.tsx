import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { GateProvider } from './state/gate';
import { Landing } from './pages/Landing';
import { WatchIndex, WatchPage } from './pages/Watch';
import { HandsList } from './pages/HandsList';
import { HandDetail } from './pages/HandDetail';
import { PlayerProfile, PlayersList } from './pages/Players';
import { Schedule } from './pages/Schedule';
import { Archive } from './pages/Archive';
import { NotFound } from './pages/NotFound';

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '') || '/'}>
      <GateProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/watch" element={<WatchIndex />} />
            <Route path="/watch/:eventId" element={<WatchPage />} />
            <Route path="/watch/:eventId/:broadcastId" element={<WatchPage />} />
            <Route path="/hands" element={<HandsList />} />
            <Route path="/hands/:handId" element={<HandDetail />} />
            <Route path="/players" element={<PlayersList />} />
            <Route path="/players/:playerId" element={<PlayerProfile />} />
            <Route path="/schedule" element={<Schedule />} />
            <Route path="/archive" element={<Archive />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Layout>
      </GateProvider>
    </BrowserRouter>
  );
}
