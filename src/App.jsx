import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Learn from './pages/Learn'
import Visualizer from './pages/Visualizer'
import ProducerPage from './pages/ProducerPage'
import ConsumersPage from './pages/ConsumersPage'
import ScenariosPage from './pages/ScenariosPage'
import AdvancedPage from './pages/AdvancedPage'
import PlaygroundPage from './pages/PlaygroundPage'
import ComparePage from './pages/ComparePage'
import QuizzesPage from './pages/QuizzesPage'
import './index.css'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="learn" element={<Learn />} />
          <Route path="visualizer" element={<Visualizer />} />
          <Route path="producer" element={<ProducerPage />} />
          <Route path="consumers" element={<ConsumersPage />} />
          <Route path="scenarios" element={<ScenariosPage />} />
          <Route path="advanced" element={<AdvancedPage />} />
          <Route path="playground" element={<PlaygroundPage />} />
          <Route path="compare" element={<ComparePage />} />
          <Route path="quizzes" element={<QuizzesPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
