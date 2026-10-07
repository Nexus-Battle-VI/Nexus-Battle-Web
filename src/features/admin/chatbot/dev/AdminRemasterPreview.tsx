import { AnalyticsPage } from '../AnalyticsPage'
import { KnowledgeAdminPage } from '../KnowledgeAdminPage'
import { ModelAdminPage } from '../ModelAdminPage'

/** Solo para mirar el marco en local. No entra al producto. */
export const AdminRemasterPreview = (): React.JSX.Element => (
  <div className="flex flex-col gap-8 py-6">
    <ModelAdminPage />
    <KnowledgeAdminPage />
    <AnalyticsPage />
  </div>
)
