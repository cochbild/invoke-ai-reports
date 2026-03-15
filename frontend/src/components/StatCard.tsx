// frontend/src/components/StatCard.tsx
import { Card, CardBody, Stat, StatLabel, StatNumber, StatHelpText, Skeleton } from '@chakra-ui/react'

interface StatCardProps {
  label: string
  value: string | number | null | undefined
  helpText?: string
  loading?: boolean
}

export default function StatCard({ label, value, helpText, loading }: StatCardProps) {
  return (
    <Card>
      <CardBody>
        <Stat>
          <StatLabel color="gray.400" fontSize="sm">{label}</StatLabel>
          <Skeleton isLoaded={!loading} mt={1}>
            <StatNumber fontSize="2xl" color="accent.blue">
              {value ?? '—'}
            </StatNumber>
          </Skeleton>
          {helpText && <StatHelpText color="gray.500">{helpText}</StatHelpText>}
        </Stat>
      </CardBody>
    </Card>
  )
}
