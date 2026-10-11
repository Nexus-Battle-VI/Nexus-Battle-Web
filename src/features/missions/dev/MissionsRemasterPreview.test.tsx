import { screen } from '@testing-library/react'
import { Route, Routes } from 'react-router'
import { describe, expect, it } from 'vitest'

import { renderWithProviders } from '@/test/render'

import { MissionBoardPage } from '../MissionBoardPage'
import { MissionContentEditorPage } from '../MissionContentEditorPage'
import { MissionDetailPage } from '../MissionDetailPage'
import { MissionHistoryPage } from '../MissionHistoryPage'
import { MissionProgressPage } from '../MissionProgressPage'
import { MissionReportPage } from '../MissionReportPage'
import { MissionsRemasterPreview } from './MissionsRemasterPreview'

const renderAt = (route: string) =>
  renderWithProviders(
    <Routes>
      <Route path="/__dev/missions" element={<MissionsRemasterPreview />}>
        <Route index element={<MissionBoardPage />} />
        <Route path="m/:missionId" element={<MissionDetailPage />} />
        <Route path="progress/:enrollmentId" element={<MissionProgressPage />} />
        <Route path="history" element={<MissionHistoryPage />} />
        <Route path="reports/:enrollmentId" element={<MissionReportPage />} />
        <Route path="admin" element={<MissionContentEditorPage />} />
      </Route>
    </Routes>,
    { route },
  )

/**
 * La vista previa del remaster (EN-031) monta las paginas REALES con datos de
 * ejemplo: cada pantalla tiene que llegar a su contenido, no quedarse cargando
 * ni mostrar un error.
 */
describe('vista previa del remaster de Misiones (EN-031)', () => {
  it('el tablon muestra las misiones de ejemplo dentro del armazon de Misiones', async () => {
    const { container } = renderAt('/__dev/missions')

    expect(await screen.findByRole('article', { name: 'El Templo Olvidado' })).toBeInTheDocument()
    expect(container.querySelector('main')).toHaveClass('missions-main')
    expect(screen.getByRole('button', { name: 'Oscuro' })).toBeInTheDocument()
  })

  it.each([
    ['/__dev/missions/m/msn_templo_olvidado', 'Jefe final: El Guardián Eterno'],
    ['/__dev/missions/progress/matricula-vista-previa', 'Comienza el encuentro 1.'],
    ['/__dev/missions/history', 'Historial de misiones'],
    ['/__dev/missions/reports/matricula-informe', 'Reporte: El Templo Olvidado'],
  ])('%s llega a su contenido', async (route, text) => {
    renderAt(route)

    expect(await screen.findByText(text)).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('el editor de administracion abre con la mision de ejemplo', async () => {
    renderAt('/__dev/missions/admin')

    expect(await screen.findByRole('button', { name: /El templo olvidado/u })).toBeInTheDocument()
  })
})
