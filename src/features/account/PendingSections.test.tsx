import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'

import { SubscriptionsSection } from './SubscriptionsSection'
import { PaymentMethodsSection } from './PaymentMethodsSection'

describe('Secciones pendientes de "Mi cuenta"', () => {
  it('Suscripciones declara su estado sin inventar plan, precio ni fechas', () => {
    render(<SubscriptionsSection />)

    expect(screen.getByRole('heading', { name: 'Suscripciones' })).toBeInTheDocument()
    expect(screen.getByText(/Todavia no disponible/u)).toBeInTheDocument()
    expect(screen.queryByText(/\$/u)).not.toBeInTheDocument()
  })

  it('Metodos de pago declara su estado y no pide ni muestra datos financieros', () => {
    render(<PaymentMethodsSection />)

    expect(screen.getByRole('heading', { name: 'Metodos de pago' })).toBeInTheDocument()
    expect(screen.getByText(/Todavia no disponible/u)).toBeInTheDocument()
    // Nada de una tarjeta ficticia tipo "**** 4242".
    expect(screen.queryByText(/4242/u)).not.toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })
})
