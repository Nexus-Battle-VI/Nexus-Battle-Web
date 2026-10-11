import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { renderWithProviders } from '@/test/render'

import {
  AdminBadge,
  AdminDialog,
  AdminPanel,
  AdminTable,
  AdminTabs,
  AdminTd,
  AdminTh,
  AdminTile,
} from './index'

describe('kit de la Consola del Consejo (EN-031)', () => {
  describe('AdminTabs', () => {
    const tabs = [
      { id: 'a', label: 'General', content: <p>Contenido general</p> },
      { id: 'b', label: 'Combate', content: <p>Contenido de combate</p> },
      { id: 'c', label: 'JSON', content: <p>Contenido JSON</p> },
    ]

    it('solo la pestana activa entra en el orden de tabulacion y su panel esta enlazado', () => {
      renderWithProviders(<AdminTabs label="Secciones" tabs={tabs} />)

      const general = screen.getByRole('tab', { name: 'General' })
      expect(general).toHaveAttribute('aria-selected', 'true')
      expect(general).toHaveAttribute('tabindex', '0')
      expect(screen.getByRole('tab', { name: 'Combate' })).toHaveAttribute('tabindex', '-1')
      const panel = screen.getByRole('tabpanel', { name: 'General' })
      expect(panel).toHaveTextContent('Contenido general')
      expect(general).toHaveAttribute('aria-controls', panel.id)
    })

    it('las flechas, Home y End mueven el foco y activan, dando la vuelta', async () => {
      const user = userEvent.setup()
      renderWithProviders(<AdminTabs label="Secciones" tabs={tabs} />)
      screen.getByRole('tab', { name: 'General' }).focus()

      await user.keyboard('{ArrowRight}')
      expect(screen.getByRole('tab', { name: 'Combate' })).toHaveFocus()
      expect(screen.getByRole('tabpanel')).toHaveTextContent('Contenido de combate')

      await user.keyboard('{ArrowLeft}{ArrowLeft}')
      expect(screen.getByRole('tab', { name: 'JSON' })).toHaveFocus()

      await user.keyboard('{Home}')
      expect(screen.getByRole('tab', { name: 'General' })).toHaveAttribute('aria-selected', 'true')

      await user.keyboard('{End}')
      expect(screen.getByRole('tab', { name: 'JSON' })).toHaveAttribute('aria-selected', 'true')
    })

    it('controladas: avisan la seleccion y muestran la que diga quien las usa', async () => {
      const user = userEvent.setup()
      const onSelect = vi.fn()
      renderWithProviders(
        <AdminTabs label="Secciones" tabs={tabs} selected="c" onSelect={onSelect} />,
      )

      expect(screen.getByRole('tabpanel')).toHaveTextContent('Contenido JSON')
      await user.click(screen.getByRole('tab', { name: 'General' }))
      expect(onSelect).toHaveBeenCalledWith('a')
    })
  })

  describe('AdminDialog', () => {
    const Harness = (): React.JSX.Element => {
      const [open, setOpen] = useState(false)
      return (
        <>
          <button
            type="button"
            onClick={() => {
              setOpen(true)
            }}
          >
            Eliminar producto
          </button>
          <AdminDialog
            open={open}
            title="¿Eliminar el producto?"
            onClose={() => {
              setOpen(false)
            }}
          >
            <button type="button">Confirmar</button>
            <button
              type="button"
              onClick={() => {
                setOpen(false)
              }}
            >
              Cancelar
            </button>
          </AdminDialog>
        </>
      )
    }

    it('abre modal con su titulo, mete el foco y lo atrapa', async () => {
      const user = userEvent.setup()
      renderWithProviders(<Harness />)

      await user.click(screen.getByRole('button', { name: 'Eliminar producto' }))

      const dialog = screen.getByRole('dialog', { name: '¿Eliminar el producto?' })
      expect(dialog).toHaveAttribute('aria-modal', 'true')
      expect(within(dialog).getByRole('button', { name: 'Confirmar' })).toHaveFocus()

      await user.tab()
      expect(within(dialog).getByRole('button', { name: 'Cancelar' })).toHaveFocus()
      await user.tab()
      expect(within(dialog).getByRole('button', { name: 'Confirmar' })).toHaveFocus()
      await user.tab({ shift: true })
      expect(within(dialog).getByRole('button', { name: 'Cancelar' })).toHaveFocus()
    })

    it('Escape y el velo cierran, y el foco vuelve al boton que lo abrio', async () => {
      const user = userEvent.setup()
      renderWithProviders(<Harness />)
      const trigger = screen.getByRole('button', { name: 'Eliminar producto' })

      await user.click(trigger)
      await user.keyboard('{Escape}')
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(trigger).toHaveFocus()

      await user.click(trigger)
      await user.click(screen.getByTestId('admin-dialog-scrim'))
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  it('AdminTable es una tabla semantica nombrada por su caption', () => {
    renderWithProviders(
      <AdminTable caption="Productos">
        <thead>
          <tr>
            <AdminTh>Nombre</AdminTh>
          </tr>
        </thead>
        <tbody>
          <tr>
            <AdminTd>Espada</AdminTd>
          </tr>
        </tbody>
      </AdminTable>,
    )

    const table = screen.getByRole('table', { name: 'Productos' })
    expect(within(table).getByRole('columnheader', { name: 'Nombre' })).toHaveAttribute(
      'scope',
      'col',
    )
    expect(within(table).getByRole('cell', { name: 'Espada' })).toBeInTheDocument()
  })

  it('AdminPanel es una region nombrada por su titulo', () => {
    renderWithProviders(
      <AdminPanel title="Resumen">
        <p>Hola</p>
      </AdminPanel>,
    )

    expect(screen.getByRole('region', { name: 'Resumen' })).toHaveTextContent('Hola')
  })

  it('AdminBadge anuncia su significado y desaparece con 0', () => {
    const { rerender } = renderWithProviders(<AdminBadge count={3} label="3 pendientes" />)
    expect(screen.getByRole('img', { name: '3 pendientes' })).toHaveTextContent('3')

    rerender(<AdminBadge count={0} label="0 pendientes" />)
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('AdminTile es un enlace con titulo y pista', () => {
    renderWithProviders(
      <AdminTile to="/admin/roles" icon="roles" title="Gestionar roles" hint="Asigna roles" />,
    )

    expect(screen.getByRole('link', { name: /Gestionar roles/u })).toHaveAttribute(
      'href',
      '/admin/roles',
    )
  })
})
