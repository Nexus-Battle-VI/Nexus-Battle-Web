import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import '@fontsource-variable/inter/wght.css'

import { App } from './app/App'
import { initLanguage } from './shared/i18n/language'
import { initTheme } from './shared/theme'
import './index.css'

// Fija `data-theme` en <html> antes del primer render: evita un parpadeo de
// tema y deja una sola fuente de verdad (`@/shared/theme`).
initTheme()

const container = document.getElementById('root')

if (container === null) {
  throw new Error('No se encontro el elemento raiz #root en el documento.')
}

// El idioma se resuelve ANTES del primer render (espejo local o español): si
// la persona ya habia elegido otro idioma, su chunk se descarga aqui y la
// interfaz nunca se pinta primero en español. En español no hay espera.
void initLanguage().finally(() => {
  createRoot(container).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
