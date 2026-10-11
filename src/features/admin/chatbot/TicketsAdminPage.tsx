import { useTranslation } from 'react-i18next'

import { AdminPageHeader, AdminPanel } from '@/components/admin-kit'
import { QueryState } from '@/components/ui/QueryState'

import type { SupportTicketRow } from './api'
import { useSupportTickets } from './useModelAdmin'

export const TicketsAdminPage = (): React.JSX.Element => {
  const { t } = useTranslation()
  const { tickets, isLoading, error } = useSupportTickets()

  return (
    <section className="flex flex-col gap-4">
      <AdminPageHeader icon="chatbot-tickets" title={t('chatbotAdmin:ticketsTitle')} />
      <QueryState
        isLoading={isLoading}
        error={error}
        isEmpty={!isLoading && error === null && tickets.length === 0}
        emptyMessage={t('chatbotAdmin:emptyTickets')}
      >
        <ul className="flex flex-col gap-3">
          {tickets.map((ticket) => (
            <li key={ticket.id}>
              <TicketCard ticket={ticket} />
            </li>
          ))}
        </ul>
      </QueryState>
    </section>
  )
}

const TicketCard = ({ ticket }: { readonly ticket: SupportTicketRow }): React.JSX.Element => {
  const { t } = useTranslation()

  return (
    <AdminPanel>
      <p>{ticket.question}</p>
      <p className="mt-2 text-sm">
        {t('chatbotAdmin:askedBy')} {ticket.actor}
      </p>
      <p className="text-sm">
        <time dateTime={ticket.createdAt}>{ticket.createdAt}</time>
      </p>
      {ticket.view !== null ? (
        <p className="text-sm text-muted">
          {t('chatbotAdmin:view')} {ticket.view}
        </p>
      ) : null}
    </AdminPanel>
  )
}
