import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Home from './pages/Home'
import Chat from './pages/Chat'
import Admin from './pages/Admin'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/modules/:id" element={<Chat />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </BrowserRouter>
  )
}
