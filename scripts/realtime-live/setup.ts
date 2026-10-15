import '@testing-library/jest-dom/vitest'

import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Sin `src/test/setup.ts` a proposito (ver vitest.live.config.ts): solo lo minimo para montar hooks.
afterEach(() => {
  cleanup()
})
