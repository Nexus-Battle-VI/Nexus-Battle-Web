import { Link } from 'react-router'

import { Card } from '@/components/ui/Card'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { POLICY_META, POLICY_SECTIONS, type PolicySection } from './content'

/**
 * Politica de Privacidad y Tratamiento de Datos Personales (EN-011, CA-01).
 *
 * Ruta publica, alcanzable con o sin sesion: no vive dentro de `RequireSession`
 * (excluiria a quien todavia no tiene cuenta, que es justo quien mas necesita
 * leerla antes de registrarse) ni dentro de `PublicOnlyRoute` (una persona ya
 * autenticada tambien puede querer consultarla).
 *
 * El contenido es estatico -ver `./content.ts`-, no se gestiona ninguna
 * "version aplicable" en runtime: la Politica es un documento del proyecto,
 * no una entidad funcional del juego.
 */
export const PrivacyPolicyPage = (): React.JSX.Element => (
  <div className="min-h-dvh text-ink">
    <div className="mx-auto w-full max-w-3xl px-4 py-5 sm:px-6">
      <div className="flex items-center justify-between gap-3">
        <Link to="/" className="text-sm font-medium text-muted hover:text-ink">
          ← Volver al menú
        </Link>

        <ThemeToggle />
      </div>

      <header className="mt-4">
        <h1 className="text-xl font-semibold text-ink">
          Política de Privacidad y Tratamiento de Datos Personales
        </h1>
        <p className="mt-1 text-sm text-muted">{POLICY_META.product}</p>
        <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted">
          <div className="flex gap-1">
            <dt className="font-medium text-ink">Organización responsable:</dt>
            <dd>{POLICY_META.organization}</dd>
          </div>
          <div className="flex gap-1">
            <dt className="font-medium text-ink">Versión:</dt>
            <dd>{POLICY_META.version}</dd>
          </div>
          <div className="flex gap-1">
            <dt className="font-medium text-ink">Fecha del documento fuente:</dt>
            <dd>{POLICY_META.sourceDate}</dd>
          </div>
        </dl>
      </header>

      <main className="mt-6 space-y-4 pb-10">
        {POLICY_SECTIONS.map((section) => (
          <PolicySectionCard key={section.id} section={section} />
        ))}
      </main>
    </div>
  </div>
)

const PolicySectionCard = ({ section }: { readonly section: PolicySection }): React.JSX.Element => (
  <Card title={section.heading}>
    <div className="space-y-3 text-sm text-ink">
      {section.paragraphs.map((paragraph, index) => (
        <p key={index}>{paragraph}</p>
      ))}

      {section.list !== undefined && (
        <ul className="list-disc space-y-1.5 pl-5">
          {section.list.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      )}

      {section.subsections?.map((subsection) => (
        <div key={subsection.heading}>
          <h3 className="text-sm font-semibold text-ink">{subsection.heading}</h3>
          <div className="mt-1.5 space-y-2">
            {subsection.paragraphs.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
        </div>
      ))}
    </div>
  </Card>
)
