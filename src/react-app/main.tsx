import '@persona-id/design-tokens/css/variables.css'
import '@persona-id/design-tokens/css/colors.css'
import theme from '@persona-id/design-system/theme'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider } from 'styled-components'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
  {/* @ts-expect-error - styled-components v5 types have minor incompatibility with React types */}
    <ThemeProvider theme={theme}>
      <App />
    </ThemeProvider>
  </StrictMode>,
)
