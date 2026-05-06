// frontend/src/components/StatCard.tsx
import { Card, Stat, Skeleton } from '@chakra-ui/react'
import Surface from './Surface'

interface StatCardProps {
  label: string
  value: string | number | null | undefined
  helpText?: string
  loading?: boolean
}

export default function StatCard({ label, value, helpText, loading }: StatCardProps) {
  return (
    <Surface>
      <Card.Body>
        <Stat.Root>
          <Stat.Label color="gray.400" fontSize="sm">{label}</Stat.Label>
          <Skeleton loading={!!loading} mt={1}>
            <Stat.ValueText fontSize="2xl" color="accent.blue">
              {value ?? '—'}
            </Stat.ValueText>
          </Skeleton>
          {helpText && <Stat.HelpText color="gray.500">{helpText}</Stat.HelpText>}
        </Stat.Root>
      </Card.Body>
    </Surface>
  )
}
