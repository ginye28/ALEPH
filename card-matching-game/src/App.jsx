import { Global } from '@emotion/react'
import { reset } from './styles/reset'
import MainLayout from './components/MainLayout/MainLayout'
import MainRoutes from './routes/MainRoutes'

function App() {

  return (
    <>
      <Global styles={reset} />
      <MainLayout>
        <MainRoutes />
      </MainLayout>
    </>
  )
}

export default App
