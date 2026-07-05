import { Navigate, Route, Routes, useParams } from 'react-router-dom'
import { Layout } from './components/Layout'
import { CreatePage } from './pages/CreatePage'
import { FaucetPage } from './pages/FaucetPage'
import { MarketplacePage } from './pages/MarketplacePage'
import { PortfolioPage } from './pages/PortfolioPage'
import { SeriesDetailPage } from './pages/SeriesDetailPage'

function SeriesRoute() {
  const { id = '' } = useParams()
  return <SeriesDetailPage optionCoinTypeParam={id} />
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<MarketplacePage />} />
        <Route path="create" element={<CreatePage />} />
        <Route path="portfolio" element={<PortfolioPage />} />
        <Route path="faucet" element={<FaucetPage />} />
        <Route path="series/:id" element={<SeriesRoute />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
