import { useTranslation } from 'react-i18next'

import { Card } from '@/components/ui/Card'
import { QueryState } from '@/components/ui/QueryState'

import type { SupportTicketRow } from './api'
import { useSupportTickets } from './useModelAdmin'

import './chatbot-admin.css'

export const TicketsAdminPage = (): React.JSX.Element => {
  const { t } = useTranslation()
  const { tickets, isLoading, error } = useSupportTickets()

  return (
    <section className="cb-page flex flex-col gap-4">
      <h1 className="text-xl font-semibold">{t('chatbotAdmin:ticketsTitle')}</h1>
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
    <Card>
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
    </Card>
  )
}
