import { describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { HttpError } from '@/lib/http'
import { renderWithProviders } from '@/test/render'

import { AuctionMetricsPage } from './AuctionMetricsPage'
import type { fetchAuctionMetricsSummary } from './api'
import { emptySummary, sampleSummary } from './dev/fixtures'
import type { AuctionMetricsSummary } from './types'

const NOW = new Date('2026-10-06T15:20:11.000Z')
const now = (): Date => NOW

type Fetcher = typeof fetchAuctionMetricsSummary

const fetcherReturning = (summary: AuctionMetricsSummary) =>
  vi.fn<Fetcher>().mockResolvedValue(summary)

const renderPage = (onFetch: Fetcher) =>
  renderWithProviders(<AuctionMetricsPage onFetch={onFetch} now={now} />)

const region = (name: string): HTMLElement => screen.getByRole('region', { name })

/** Abre la pestaña de una seccion y devuelve su region (solo una se muestra a la vez). */
const openSection = async (name: string): Promise<HTMLElement> => {
  await userEvent.click(await screen.findByRole('tab', { name }))

  return screen.findByRole('region', { name })
}

const TRENDS = 'Tiempo de cierre y tendencia'
const RANKINGS = 'Productos más subastados y más vendidos'
const PRICES = 'Precios promedio por moneda'

describe('AuctionMetricsPage', () => {
  describe('contenido real (todo viene de la respuesta)', () => {
    it('pide los ultimos 30 dias agrupados por semana, con el limite del contrato', async () => {
      const onFetch = fetcherReturning(sampleSummary())

      renderPage(onFetch)
      await screen.findByRole('tab', { name: 'Volumen y tasa de éxito' })

      expect(onFetch).toHaveBeenCalledTimes(1)
      expect(onFetch.mock.calls[0]?.[0]).toEqual({
        from: '2026-09-06T15:20:11.000Z',
        to: '2026-10-06T15:20:11.000Z',
        granularity: 'WEEK',
        limit: undefined,
      })
    })

    it('muestra las cinco secciones como pestañas, en el orden del diseño', async () => {
      renderPage(fetcherReturning(sampleSummary()))

      await screen.findByRole('tab', { name: 'Volumen y tasa de éxito' })

      expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual([
        'Volumen y tasa de éxito',
        TRENDS,
        RANKINGS,
        PRICES,
        'Usuarios activos y comisiones',
      ])
      expect(screen.getByRole('heading', { level: 1, name: 'Métricas de subasta' })).toBeVisible()
    })

    it('al entrar no hay ningun apartado desplegado: solo se ven los cinco nombres', async () => {
      renderPage(fetcherReturning(sampleSummary()))
      await screen.findByRole('tab', { name: 'Volumen y tasa de éxito' })

      for (const tab of screen.getAllByRole('tab')) {
        expect(tab).toHaveAttribute('aria-selected', 'false')
      }
      expect(screen.queryByRole('tabpanel')).not.toBeInTheDocument()
      expect(screen.queryAllByRole('heading', { level: 2 })).toHaveLength(0)
    })

    it('solo se ve una seccion a la vez y cambia al elegir otra pestaña', async () => {
      const user = userEvent.setup()
      renderPage(fetcherReturning(sampleSummary()))
      await screen.findByRole('tab', { name: 'Volumen y tasa de éxito' })

      await user.click(screen.getByRole('tab', { name: 'Volumen y tasa de éxito' }))
      expect(screen.getByRole('tab', { name: 'Volumen y tasa de éxito' })).toHaveAttribute(
        'aria-selected',
        'true',
      )
      expect(
        screen.getByRole('heading', { name: 'Volumen y tasa de éxito', level: 2 }),
      ).toBeVisible()
      expect(screen.queryByRole('heading', { name: PRICES, level: 2 })).not.toBeInTheDocument()

      await user.click(screen.getByRole('tab', { name: PRICES }))

      expect(screen.getByRole('tab', { name: PRICES })).toHaveAttribute('aria-selected', 'true')
      expect(screen.getByRole('heading', { name: PRICES, level: 2 })).toBeVisible()
      expect(
        screen.queryByRole('heading', { name: 'Volumen y tasa de éxito', level: 2 }),
      ).not.toBeInTheDocument()
      expect(screen.getByRole('tabpanel')).toHaveAttribute(
        'aria-labelledby',
        screen.getByRole('tab', { name: PRICES }).id,
      )
    })

    it('presionar otra vez la pestaña abierta la cierra', async () => {
      const user = userEvent.setup()
      renderPage(fetcherReturning(sampleSummary()))
      const tab = await screen.findByRole('tab', { name: PRICES })

      await user.click(tab)
      expect(tab).toHaveAttribute('aria-selected', 'true')
      expect(screen.getByRole('tabpanel')).toBeVisible()

      await user.click(tab)
      expect(tab).toHaveAttribute('aria-selected', 'false')
      expect(screen.queryByRole('tabpanel')).not.toBeInTheDocument()

      await user.click(tab)
      expect(screen.getByRole('heading', { name: PRICES, level: 2 })).toBeVisible()
    })

    it('las flechas, Inicio y Fin mueven la pestaña activa y su foco', async () => {
      const user = userEvent.setup()
      renderPage(fetcherReturning(sampleSummary()))
      const first = await screen.findByRole('tab', { name: 'Volumen y tasa de éxito' })

      first.focus()
      await user.keyboard('{ArrowRight}')
      expect(screen.getByRole('tab', { name: TRENDS })).toHaveFocus()
      expect(screen.getByRole('tab', { name: TRENDS })).toHaveAttribute('aria-selected', 'true')

      await user.keyboard('{End}')
      expect(screen.getByRole('tab', { name: 'Usuarios activos y comisiones' })).toHaveFocus()

      await user.keyboard('{ArrowRight}')
      expect(screen.getByRole('tab', { name: 'Volumen y tasa de éxito' })).toHaveFocus()

      await user.keyboard('{ArrowLeft}')
      expect(screen.getByRole('tab', { name: 'Usuarios activos y comisiones' })).toHaveFocus()

      await user.keyboard('{Home}')
      expect(screen.getByRole('tab', { name: 'Volumen y tasa de éxito' })).toHaveFocus()
    })

    it('por Tab entra una sola pestaña: la activa, o la primera si no hay ninguna abierta', async () => {
      renderPage(fetcherReturning(sampleSummary()))
      await screen.findByRole('tab', { name: 'Volumen y tasa de éxito' })

      const tabs = screen.getAllByRole('tab')

      expect(tabs.map((tab) => tab.getAttribute('tabindex'))).toEqual(['0', '-1', '-1', '-1', '-1'])
    })

    it('volumen: cifras, tasa con su fraccion y las oficiales sin tasa', async () => {
      renderPage(fetcherReturning(sampleSummary()))

      const volume = within(await openSection('Volumen y tasa de éxito'))

      expect(volume.getByText('120')).toBeVisible()
      expect(volume.getByText('8 activas · 2 por cerrar')).toBeVisible()
      expect(volume.getByText(/63\s?%/)).toBeVisible()
      expect(volume.getByText('63 de 100 cerradas terminaron en venta')).toBeVisible()
      expect(volume.getByText('52 reclamados · 5 pendientes · 6 vencidos')).toBeVisible()
      expect(volume.getByText('Cómo terminaron las 100 subastas cerradas')).toBeVisible()
      expect(volume.getByText('Tasa de éxito: no disponible')).toBeVisible()
      expect(
        volume.getByText(
          'Las subastas oficiales no tienen flujo de cierre, por eso solo se informa el volumen publicado.',
        ),
      ).toBeVisible()
      expect(volume.getByRole('img', { name: /Tasa de éxito 63\s?%/ })).toBeVisible()
    })

    it('precios: creditos con plural y dinero real por moneda, sin mezclarlos', async () => {
      renderPage(fetcherReturning(sampleSummary()))

      const prices = within(await openSection('Precios promedio por moneda'))

      expect(prices.getByText('142,38 créditos')).toBeVisible()
      expect(prices.getByText('promedio de 63 ventas')).toBeVisible()
      expect(prices.getByText('Créditos · precio de venta')).toBeVisible()
      expect(prices.getByText('Dinero real · precio de lista')).toBeVisible()
      expect(prices.getByText('Precio final de venta: no disponible')).toBeVisible()
      expect(prices.getByText('Subasta oficial sin flujo de venta.')).toBeVisible()

      const copRow = prices.getByRole('row', { name: /COP/ })
      expect(copRow).toHaveTextContent(/45\.000,00/)
      expect(copRow).not.toHaveTextContent(/crédito/)
      expect(prices.getByRole('row', { name: /USD/ })).toHaveTextContent('Sin compra inmediata')
    })

    it('un credito se escribe en singular', async () => {
      const summary = sampleSummary()
      const prices = summary.sections.averagePrices

      if (prices.status !== 'AVAILABLE') throw new Error('fixture')

      renderPage(
        fetcherReturning({
          ...summary,
          sections: {
            ...summary.sections,
            averagePrices: {
              status: 'AVAILABLE',
              data: {
                ...prices.data,
                credits: { ...prices.data.credits, min: { unit: 'CREDITS', amount: 1 } },
              },
            },
          },
        }),
      )

      const region = within(await openSection('Precios promedio por moneda'))

      expect(region.getByText('1 crédito')).toBeVisible()
    })

    it('usuarios: id opaco y comisiones no disponibles con su motivo', async () => {
      renderPage(fetcherReturning(sampleSummary()))

      const users = within(await openSection('Usuarios activos y comisiones'))

      expect(users.getByText('Jugador (ID opaco)')).toBeVisible()
      expect(users.getByText('us-east-1:2f1c9a…b7e4')).toBeVisible()
      expect(users.getAllByText('No disponible')).toHaveLength(3)
      expect(users.getByText('No existe una comisión por venta definida.')).toBeVisible()
      expect(users.getByText('Las subastas oficiales no cobran tarifas.')).toBeVisible()
      expect(users.getByText('Wallet aún no expone una lectura de comisiones.')).toBeVisible()
      expect(users.getByText('201 créditos')).toBeVisible()
    })

    it('rankings: nombre, sku y tipo, sin aviso cuando Catalog respondio completo', async () => {
      renderPage(fetcherReturning(sampleSummary()))

      const rankings = within(await openSection('Productos más subastados y más vendidos'))

      expect(rankings.getAllByText('Espada de hierro')).toHaveLength(2)
      expect(rankings.getAllByText('espada-de-hierro · ARMA')).toHaveLength(2)
      expect(rankings.queryByRole('status')).not.toBeInTheDocument()
    })
  })

  describe('tendencia', () => {
    it('el grafico es una imagen accesible y la tabla trae los mismos totales', async () => {
      const user = userEvent.setup()
      renderPage(fetcherReturning(sampleSummary()))

      const trends = within(await openSection('Tiempo de cierre y tendencia'))

      expect(
        trends.getByRole('img', { name: /Evolución semanal de subastas publicadas/ }),
      ).toBeVisible()

      await user.click(trends.getByText('Ver como tabla'))
      const total = trends.getByRole('row', { name: /^Total/ })

      // 28 + 32 + 30 + 30 publicadas; 12+15+14+14 con ganador; 2+2+2+2 compra inmediata.
      expect(
        within(total)
          .getAllByRole('cell')
          // Sin espacios: el motor decide si el porcentaje lleva uno ("63%" o "63 %").
          .map((cell) => cell.textContent.replace(/\s/gu, '')),
      ).toEqual(['Total', '120', '55', '8', '37', '12', '63%', '1d8h'])
    })

    it('"Agrupar por" pide otra granularidad al servicio', async () => {
      const user = userEvent.setup()
      const onFetch = fetcherReturning(sampleSummary())
      renderPage(onFetch)

      await openSection(TRENDS)
      await user.selectOptions(await screen.findByRole('combobox', { name: 'Agrupar por' }), 'Día')

      await waitFor(() => {
        expect(onFetch).toHaveBeenCalledTimes(2)
      })
      expect(onFetch.mock.calls[1]?.[0].granularity).toBe('DAY')
    })

    it('no ofrece "Día" cuando el periodo supera 92 dias', async () => {
      const user = userEvent.setup()
      renderPage(fetcherReturning(sampleSummary()))
      await screen.findByRole('tab', { name: 'Volumen y tasa de éxito' })

      await user.selectOptions(screen.getByRole('combobox', { name: 'Rango' }), 'Personalizado')
      await user.clear(screen.getByLabelText('Desde'))
      await user.type(screen.getByLabelText('Desde'), '2026-05-01')
      await user.clear(screen.getByLabelText('Hasta'))
      await user.type(screen.getByLabelText('Hasta'), '2026-10-01')
      await user.click(screen.getByRole('button', { name: 'Aplicar' }))

      await openSection(TRENDS)
      const select = await screen.findByRole('combobox', { name: 'Agrupar por' })
      expect(within(select).queryByRole('option', { name: 'Día' })).not.toBeInTheDocument()
      expect(within(select).getByRole('option', { name: 'Semana' })).toBeInTheDocument()
    })

    it('el titulo y la tabla siguen la granularidad que responde el servicio', async () => {
      const user = userEvent.setup()
      renderPage(vi.fn<Fetcher>((params) => Promise.resolve(sampleSummary(params.granularity))))

      await openSection(TRENDS)
      await user.selectOptions(await screen.findByRole('combobox', { name: 'Agrupar por' }), 'Mes')

      expect(await screen.findByRole('heading', { name: 'Evolución por mes' })).toBeVisible()
    })
  })

  describe('estados', () => {
    it('cargando: aviso accesible mientras llega la respuesta', () => {
      renderPage(vi.fn<Fetcher>().mockReturnValue(new Promise(() => undefined)))

      const status = screen.getByRole('status')

      expect(status).toHaveTextContent('Cargando...')
      expect(status).toHaveAttribute('aria-live', 'polite')
    })

    it('una seccion DEGRADED muestra su aviso y "Reintentar", y las demas siguen', async () => {
      const user = userEvent.setup()
      const summary = sampleSummary()
      const onFetch = fetcherReturning({
        ...summary,
        sections: {
          ...summary.sections,
          averagePrices: { status: 'DEGRADED', reason: 'SECTION_COMPUTATION_FAILED' },
        },
      })
      renderPage(onFetch)

      // Las demas secciones siguen disponibles: la de volumen (la primera) carga normal.
      expect(await screen.findByRole('tab', { name: 'Volumen y tasa de éxito' })).toBeVisible()
      await user.click(screen.getByRole('tab', { name: PRICES }))

      const failed = await screen.findByText(
        'No se pudo cargar esta sección. Las demás siguen disponibles.',
      )

      expect(failed).toHaveAttribute('role', 'alert')
      expect(screen.getByRole('heading', { name: PRICES })).toBeVisible()
      await user.click(screen.getByRole('tab', { name: 'Usuarios activos y comisiones' }))
      expect(screen.getByRole('heading', { name: 'Usuarios activos y comisiones' })).toBeVisible()
      await user.click(screen.getByRole('tab', { name: PRICES }))

      await user.click(screen.getByRole('button', { name: 'Reintentar' }))

      await waitFor(() => {
        expect(onFetch).toHaveBeenCalledTimes(2)
      })
    })

    it.each(['PARTIAL', 'UNAVAILABLE'] as const)(
      'ranking con enrichment %s avisa y muestra el identificador sin inventar el nombre',
      async (status) => {
        const summary = sampleSummary()
        const rankings = summary.sections.productRankings

        if (rankings.status !== 'AVAILABLE') throw new Error('fixture')

        renderPage(
          fetcherReturning({
            ...summary,
            sections: {
              ...summary.sections,
              productRankings: {
                status: 'AVAILABLE',
                data: {
                  ...rankings.data,
                  enrichment: { status },
                  mostAuctioned: rankings.data.mostAuctioned.map((item, index) =>
                    index === 0 ? { ...item, product: null, productId: 'p-1' } : item,
                  ),
                },
              },
            },
          }),
        )

        await openSection(RANKINGS)
        const notice = await screen.findByText(
          'No pudimos obtener el nombre de algunos productos. Los conteos son correctos; se muestra el identificador en su lugar.',
        )

        expect(notice).toHaveAttribute('role', 'status')
        expect(screen.getByText('Producto sin nombre')).toBeVisible()
        expect(screen.getByText('p-1')).toBeVisible()
      },
    )

    it('periodo sin subastas: mensaje de vacio, no un error, y tasa "—"', async () => {
      renderPage(fetcherReturning(emptySummary()))

      expect(await screen.findByText('No hay subastas en este periodo.')).toBeVisible()
      expect(
        screen.getByText(
          'Prueba con un rango más amplio. Las tasas y promedios no se calculan sin datos y se muestran como "—".',
        ),
      ).toBeVisible()
      expect(screen.getByText('—')).toBeVisible()
      expect(screen.getByText('Sin subastas cerradas')).toBeVisible()
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })

    it('403 del servicio: acceso denegado', async () => {
      renderPage(vi.fn<Fetcher>().mockRejectedValue(new HttpError(403, 'Forbidden', {})))

      expect(await screen.findByRole('heading', { name: 'Acceso denegado' })).toBeVisible()
      expect(
        screen.queryByRole('heading', { name: 'Volumen y tasa de éxito' }),
      ).not.toBeInTheDocument()
    })

    it('503: aviso de metricas no disponibles, sin datos', async () => {
      renderPage(
        vi
          .fn<Fetcher>()
          .mockRejectedValue(new HttpError(503, 'Unavailable', { code: 'METRICS_UNAVAILABLE' })),
      )

      expect(
        await screen.findByText(
          'No se pudieron cargar las métricas. Vuelve a intentarlo en un momento.',
        ),
      ).toHaveAttribute('role', 'alert')
    })

    it('INVALID_PERIOD del servicio: error de campo, no el aviso general', async () => {
      renderPage(
        vi
          .fn<Fetcher>()
          .mockRejectedValue(
            new HttpError(400, 'Bad', { statusCode: 400, code: 'INVALID_PERIOD' }),
          ),
      )

      const error = await screen.findByText(
        'La fecha "Desde" debe ser anterior a "Hasta" y el rango no puede superar 366 días.',
      )

      expect(error).toHaveAttribute('role', 'alert')
      expect(screen.getByLabelText('Desde')).toHaveAttribute('aria-invalid', 'true')
      expect(screen.getByLabelText('Hasta')).toHaveAttribute('aria-invalid', 'true')
      expect(
        screen.queryByText(
          'No se pudieron cargar las métricas. Vuelve a intentarlo en un momento.',
        ),
      ).not.toBeInTheDocument()
    })
  })

  describe('filtros', () => {
    const INVALID =
      'La fecha "Desde" debe ser anterior a "Hasta" y el rango no puede superar 366 días.'

    const applyCustom = async (from: string, to: string): Promise<void> => {
      const user = userEvent.setup()

      await user.selectOptions(screen.getByRole('combobox', { name: 'Rango' }), 'Personalizado')
      await user.clear(screen.getByLabelText('Desde'))
      await user.type(screen.getByLabelText('Desde'), from)
      await user.clear(screen.getByLabelText('Hasta'))
      await user.type(screen.getByLabelText('Hasta'), to)
      await user.click(screen.getByRole('button', { name: 'Aplicar' }))
    }

    it('muestra el periodo resuelto por el servicio y "Datos al" en UTC', async () => {
      renderPage(fetcherReturning(sampleSummary()))

      const info = await screen.findByText(/Datos al/)

      // El formato exacto de fecha lo decide el motor (Chrome y Node difieren en "de" y
      // en la fecha numerica): aqui solo importa periodo, año y hora en UTC.
      expect(info).toHaveTextContent(/Periodo\s+7\D+5\D+oct\D+2026/)
      expect(info).toHaveTextContent(/Datos al\s+6\D.*UTC/)
    })

    it('"Últimos 7 días" y Aplicar piden ese rango, terminado en este instante', async () => {
      const user = userEvent.setup()
      const onFetch = fetcherReturning(sampleSummary())
      renderPage(onFetch)
      await screen.findByRole('tab', { name: 'Volumen y tasa de éxito' })

      await user.selectOptions(screen.getByRole('combobox', { name: 'Rango' }), 'Últimos 7 días')
      expect(screen.getByLabelText('Desde')).toHaveValue('2026-09-29')
      expect(screen.getByLabelText('Hasta')).toHaveValue('2026-10-06')
      await user.click(screen.getByRole('button', { name: 'Aplicar' }))

      await waitFor(() => {
        expect(onFetch).toHaveBeenCalledTimes(2)
      })
      expect(onFetch.mock.calls[1]?.[0]).toMatchObject({
        from: '2026-09-29T15:20:11.000Z',
        to: '2026-10-06T15:20:11.000Z',
      })
    })

    it('un rango personalizado usa las fechas tal cual, a las 00:00 UTC', async () => {
      const onFetch = fetcherReturning(sampleSummary())
      renderPage(onFetch)
      await screen.findByRole('tab', { name: 'Volumen y tasa de éxito' })

      await applyCustom('2026-09-07', '2026-10-05')

      await waitFor(() => {
        expect(onFetch).toHaveBeenCalledTimes(2)
      })
      expect(onFetch.mock.calls[1]?.[0]).toMatchObject({
        from: '2026-09-07T00:00:00.000Z',
        to: '2026-10-05T00:00:00.000Z',
      })
    })

    it.each([
      ['desde igual a hasta', '2026-10-05', '2026-10-05'],
      ['desde posterior a hasta', '2026-10-05', '2026-09-07'],
      ['mas de 366 dias', '2025-01-01', '2026-10-05'],
    ])('rechaza en el cliente %s sin llamar al servicio', async (_name, from, to) => {
      const onFetch = fetcherReturning(sampleSummary())
      renderPage(onFetch)
      await screen.findByRole('tab', { name: 'Volumen y tasa de éxito' })

      await applyCustom(from, to)

      expect(await screen.findByText(INVALID)).toHaveAttribute('role', 'alert')
      expect(screen.getByLabelText('Desde')).toHaveAttribute('aria-invalid', 'true')
      expect(onFetch).toHaveBeenCalledTimes(1)
    })

    it('corregir una fecha quita el error', async () => {
      const user = userEvent.setup()
      renderPage(fetcherReturning(sampleSummary()))
      await screen.findByRole('tab', { name: 'Volumen y tasa de éxito' })
      await applyCustom('2026-10-05', '2026-09-07')
      await screen.findByText(INVALID)

      await user.clear(screen.getByLabelText('Desde'))
      await user.type(screen.getByLabelText('Desde'), '2026-09-01')

      expect(screen.queryByText(INVALID)).not.toBeInTheDocument()
    })

    it('"Actualizar" con un rango predefinido vuelve a pedir hasta el instante actual', async () => {
      const user = userEvent.setup()
      const clock = vi.fn(() => NOW)
      const onFetch = fetcherReturning(sampleSummary())
      renderWithProviders(<AuctionMetricsPage onFetch={onFetch} now={clock} />)
      await screen.findByRole('tab', { name: 'Volumen y tasa de éxito' })

      clock.mockReturnValue(new Date('2026-10-06T16:00:00.000Z'))
      await user.click(screen.getByRole('button', { name: 'Actualizar' }))

      await waitFor(() => {
        expect(onFetch).toHaveBeenCalledTimes(2)
      })
      expect(onFetch.mock.calls[1]?.[0].to).toBe('2026-10-06T16:00:00.000Z')
    })
  })

  describe('accesibilidad', () => {
    it('cada seccion es una region con nombre y los controles tienen etiqueta', async () => {
      renderPage(fetcherReturning(sampleSummary()))
      await screen.findByRole('tab', { name: 'Volumen y tasa de éxito' })

      expect(region('Periodo de consulta')).toBeInTheDocument()
      expect(screen.getByRole('tablist', { name: 'Secciones de métricas' })).toBeInTheDocument()
      for (const name of [
        'Volumen y tasa de éxito',
        TRENDS,
        RANKINGS,
        PRICES,
        'Usuarios activos y comisiones',
      ]) {
        expect(await openSection(name)).toBeInTheDocument()
      }
      for (const label of ['Rango', 'Desde', 'Hasta']) {
        expect(screen.getByLabelText(label)).toBeInTheDocument()
      }
      await openSection(TRENDS)
      expect(screen.getByLabelText('Agrupar por')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Aplicar' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Actualizar' })).toBeInTheDocument()
    })

    it('la miga de pan lleva a Inicio y a Subastas', async () => {
      renderPage(fetcherReturning(sampleSummary()))
      await screen.findByRole('tab', { name: 'Volumen y tasa de éxito' })

      expect(screen.getByRole('link', { name: 'Inicio' })).toHaveAttribute('href', '/')
      expect(screen.getByRole('link', { name: 'Subastas' })).toHaveAttribute('href', '/auction')
    })
  })
})
