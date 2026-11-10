import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { LiveProvider, SessionProvider } from './lib/state';
import { Watch } from './pages/Watch';
import { HandPage, HandsHub } from './pages/Hands';
import { PlayerProfile, PlayersList } from './pages/Players';
import { EventPage, Schedule } from './pages/Schedule';
import { Home, Subscribe } from './pages/Landing';

/**
 * WSOP TV v9: the channel is the tournament.
 *   [T] /watch/:id   Tournament live (also VOD and past-final replays, same frame)
 *   [R] /hands       Hand replay — free key hands
 *   [P] /players/:id Player profile — PAST FINALS lead back to [T] as replays
 *   [S] /schedule    Schedule dashboard (+ /event/:id)
 *   [L] /            Landing for non-subscribers (subscribers go straight to [T])
 *   [W] /subscribe   GGPass subscribe (mock)
 */
export default function App() {
  return (
    <SessionProvider>
      <LiveProvider>
        <HashRouter>
          <Routes>
            <Route index element={<Home />} />
            <Route path="watch/:id" element={<Watch />} />
            <Route path="hands" element={<HandsHub />} />
            <Route path="hands/:id" element={<HandPage />} />
            <Route path="players" element={<PlayersList />} />
            <Route path="players/:pid" element={<PlayerProfile />} />
            <Route path="schedule" element={<Schedule />} />
            <Route path="event/:id" element={<EventPage />} />
            <Route path="subscribe" element={<Subscribe />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </HashRouter>
      </LiveProvider>
    </SessionProvider>
  );
}
