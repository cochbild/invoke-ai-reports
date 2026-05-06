// frontend/src/components/ChartCard.tsx
import { Card, Heading, Skeleton, Text } from '@chakra-ui/react'
import type { ReactNode } from 'react'
import Surface from './Surface'

interface ChartCardProps {
  title: string
  children: ReactNode
  loading?: boolean
  error?: string | null
  height?: string
}

export default function ChartCard({ title, children, loading, error, height = '300px' }: ChartCardProps) {
  return (
    <Surface>
      <Card.Header pb={0}>
        <Heading size="sm" color="gray.300">{title}</Heading>
      </Card.Header>
      <Card.Body>
        {error ? (
          <Text color="red.300">Error: {error}</Text>
        ) : loading ? (
          <Skeleton height={height} borderRadius="md" />
        ) : (
          children
        )}
      </Card.Body>
    </Surface>
  )
}
