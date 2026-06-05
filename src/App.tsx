import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Search from './pages/Search'
import Podcast from './pages/Podcast'
import Episode from './pages/Episode'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="search" element={<Search />} />
        <Route path="podcast/:id" element={<Podcast />} />
        <Route path="episode/:id" element={<Episode />} />
      </Route>
    </Routes>
  )
}
