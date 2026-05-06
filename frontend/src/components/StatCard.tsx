// frontend/src/components/StatCard.tsx
import { Card, Stat, Skeleton } from '@chakra-ui/react'

interface StatCardProps {
  label: string
  value: string | number | null | undefined
  helpText?: string
  loading?: boolean
}

export default function StatCard({ label, value, helpText, loading }: StatCardProps) {
  return (
    <Card.Root bg="surface.bg" borderColor="surface.border" borderWidth="1px" borderRadius="lg">
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
    </Card.Root>
  )
}
