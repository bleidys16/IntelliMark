import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import '@fontsource/manrope/400.css'
import '@fontsource/manrope/500.css'
import '@fontsource/manrope/600.css'
import '@fontsource/manrope/700.css'
import App from './App'
import { ErrorBoundary } from './components/ErrorBoundary'
import './style.css'

const rootElement = document.getElementById('root')
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <StrictMode>
      <ErrorBoundary fallbackTitle="Error en IntelliMark">
        <App />
      </ErrorBoundary>
    </StrictMode>
  )
}
