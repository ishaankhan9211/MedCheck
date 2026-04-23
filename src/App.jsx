import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Checker from './pages/Checker'
import Results from './pages/Results'
import History from './pages/History'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="checker" element={<Checker />} />
        <Route path="results" element={<Results />} />
        <Route path="history" element={<History />} />
      </Route>
    </Routes>
  )
}
