// frontend/src/components/ChartCard.tsx
import { Card, CardBody, CardHeader, Heading, Skeleton, Text } from '@chakra-ui/react'
import type { ReactNode } from 'react'

interface ChartCardProps {
  title: string
  children: ReactNode
  loading?: boolean
  error?: string | null
  height?: string
}

export default function ChartCard({ title, children, loading, error, height = '300px' }: ChartCardProps) {
  return (
    <Card>
      <CardHeader pb={0}>
        <Heading size="sm" color="gray.300">{title}</Heading>
      </CardHeader>
      <CardBody>
        {error ? (
          <Text color="red.300">Error: {error}</Text>
        ) : loading ? (
          <Skeleton height={height} borderRadius="md" />
        ) : (
          children
        )}
      </CardBody>
    </Card>
  )
}
