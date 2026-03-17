import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { GameProvider } from './store/GameContext'
import { HomePage } from './pages/HomePage'
import { LevelSelectPage } from './pages/LevelSelectPage'
import { GamePage } from './pages/GamePage'
import { WeeklyChallengePage } from './pages/WeeklyChallengePage'
import { PhotoParserPage } from './pages/tools/PhotoParserPage'

export default function App() {
  return (
    <GameProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/levels" element={<LevelSelectPage />} />
          <Route path="/game" element={<GamePage />} />
          <Route path="/weekly" element={<WeeklyChallengePage />} />
          <Route path="/tools/photo-parser" element={<PhotoParserPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </GameProvider>
  )
}
