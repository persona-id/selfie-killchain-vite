import { BrowserRouter, Route, Routes } from 'react-router-dom'

import AppShell from './components/AppShell'
import KillchainShellLayout from './components/KillchainShellLayout'
import DeconstructView from './pages/DeconstructView'
import GlobePage from './pages/GlobePage'
import MatrixView from './pages/MatrixView'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route element={<KillchainShellLayout />}>
            <Route element={<GlobePage />} path="/" />
            <Route element={<MatrixView />} path="/matrix" />
            <Route element={<DeconstructView />} path="/deconstruct" />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
