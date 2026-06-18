import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Search from './pages/Search'
import Podcast from './pages/Podcast'
import Episode from './pages/Episode'
import Login from './pages/Login'
import Register from './pages/Register'
import AuthCallback from './pages/AuthCallback'
import Account from './pages/Account'
import Library from './pages/Library'
import SavedPodcasts, { Bookmarks, Progress } from './pages/SavedPodcasts'
import Onboarding from './pages/Onboarding'
import NotFound from './pages/NotFound'
import { Privacy, Terms } from './pages/Legal'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="search" element={<Search />} />
        <Route path="podcast/:id" element={<Podcast />} />
        <Route path="episode/:id" element={<Episode />} />
        <Route path="library" element={<Library />} />
        <Route path="library/saved" element={<SavedPodcasts />} />
        <Route path="library/bookmarks" element={<Bookmarks />} />
        <Route path="library/progress" element={<Progress />} />
        <Route path="auth/login" element={<Login />} />
        <Route path="auth/register" element={<Register />} />
        <Route path="auth/callback/github" element={<AuthCallback />} />
        <Route path="account" element={<Account />} />
        <Route path="onboarding" element={<Onboarding />} />
        <Route path="privacy" element={<Privacy />} />
        <Route path="terms" element={<Terms />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
