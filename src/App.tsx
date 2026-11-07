import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { auth } from './firebase'
import Login from './pages/Login'
import List from './pages/List'
import ShipmentForm from './pages/ShipmentForm'
import Detail from './pages/Detail'

export default function App() {
  const [user, setUser] = useState<User | null>()
  useEffect(() => onAuthStateChanged(auth, setUser), [])

  if (user === undefined) return null
  if (!user) return <Login />
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<List />} />
        <Route path="/new" element={<ShipmentForm />} />
        <Route path="/s/:id" element={<Detail />} />
        <Route path="/s/:id/edit" element={<ShipmentForm />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
