// frontend/src/pages/ModelsPage.tsx
import { Box, SimpleGrid, Table, HStack, Button, Input, Text } from '@chakra-ui/react'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import ChartCard from '../components/ChartCard'
import { useFiltered } from '../hooks/useFiltered'
import {
  fetchTopModels, fetchLeastModels, fetchFamilyDistribution, fetchLeaderboard,
  fetchUnusedModels,
} from '../api/client'
import { CHART_COLORS } from '../theme'

const UNUSED_TYPES = [
  { key: 'all', label: 'All', filter: undefined },
  { key: 'main', label: 'Main', filter: 'main' },
  { key: 'lora', label: 'LoRA', filter: 'lora' },
] as const

const ROW_LIMITS = [10, 25, 50, Infinity] as const
type RowLimit = typeof ROW_LIMITS[number]
const ROW_LIMIT_LABEL = (n: RowLimit) => (n === Infinity ? 'All' : String(n))

function formatBytes(bytes: number | null): string {
  if (bytes == null) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`
}

export default function ModelsPage() {
  const topModels = useFiltered(fetchTopModels, { limit: 10 })
  const leastModels = useFiltered(fetchLeastModels, { limit: 10 })
  const families = useFiltered(fetchFamilyDistribution)
  const leaderboard = useFiltered(fetchLeaderboard)

  const [rowLimit, setRowLimit] = useState<RowLimit>(10)
  const leaderboardRows = (leaderboard.data || []).slice(
    0, rowLimit === Infinity ? undefined : rowLimit,
  )

  const [typeFilter, setTypeFilter] = useState<typeof UNUSED_TYPES[number]['key']>('all')
  const [search, setSearch] = useState('')
  const activeFilter = UNUSED_TYPES.find(t => t.key === typeFilter)?.filter
  const unused = useQuery({
    queryKey: ['fetchUnusedModels', activeFilter, search],
    queryFn: () => fetchUnusedModels({ type: activeFilter, search: search || undefined }),
  })
  // Visibility is gated on whether ANY never-used models exist (any type, no
  // search) so toggling the inner filter doesn't make the section vanish.
  const unusedAny = useQuery({
    queryKey: ['fetchUnusedModels', undefined, ''],
    queryFn: () => fetchUnusedModels(),
  })
  const unusedRows = unused.data || []
  const unusedTotalSize = unusedRows.reduce((acc, m) => acc + (m.file_size || 0), 0)
  const showUnusedSection = (unusedAny.data?.length ?? 0) > 0

  return (
    <Box>
      <SimpleGrid columns={{ base: 1, lg: 2 }} gap={4} mb={6}>
        <ChartCard title="Most Used Models" loading={topModels.loading} error={topModels.error}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topModels.data || []} layout="vertical" margin={{ left: 100 }}>
              <XAxis type="number" stroke="#718096" />
              <YAxis type="category" dataKey="model_name" stroke="#718096" width={140} tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#16213e', border: '1px solid #2a2d4a' }} />
              <Bar dataKey="count" fill={CHART_COLORS[0]} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Model Family Distribution" loading={families.loading} error={families.error}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={families.data || []}>
              <XAxis dataKey="model_base" stroke="#718096" />
              <YAxis stroke="#718096" />
              <Tooltip contentStyle={{ background: '#16213e', border: '1px solid #2a2d4a' }} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {(families.data || []).map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </SimpleGrid>

      <ChartCard title="Model Leaderboard" loading={leaderboard.loading} error={leaderboard.error}>
        <HStack mb={3} gap={2} flexWrap="wrap">
          <Text fontSize="sm" color="gray.400">Show:</Text>
          {ROW_LIMITS.map(n => (
            <Button
              key={n} size="sm"
              variant={rowLimit === n ? 'solid' : 'outline'}
              colorPalette="blue"
              onClick={() => setRowLimit(n)}
            >
              {ROW_LIMIT_LABEL(n)}
            </Button>
          ))}
          <Text fontSize="sm" color="gray.500" ml="auto">
            {leaderboardRows.length} of {(leaderboard.data || []).length}
          </Text>
        </HStack>
        <Box overflowX="auto">
          <Table.Root size="sm">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>Model</Table.ColumnHeader><Table.ColumnHeader>Family</Table.ColumnHeader><Table.ColumnHeader textAlign="end">Count</Table.ColumnHeader>
                <Table.ColumnHeader textAlign="end">Avg Steps</Table.ColumnHeader><Table.ColumnHeader textAlign="end">Avg CFG</Table.ColumnHeader>
                <Table.ColumnHeader>Resolution</Table.ColumnHeader><Table.ColumnHeader>First Used</Table.ColumnHeader><Table.ColumnHeader>Last Used</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {leaderboardRows.map(m => (
                <Table.Row key={m.model_name}>
                  <Table.Cell fontWeight="medium">{m.model_name}</Table.Cell>
                  <Table.Cell>{m.model_base}</Table.Cell>
                  <Table.Cell textAlign="end">{m.count}</Table.Cell>
                  <Table.Cell textAlign="end">{m.avg_steps ?? '—'}</Table.Cell>
                  <Table.Cell textAlign="end">{m.avg_cfg ?? '—'}</Table.Cell>
                  <Table.Cell>{m.common_resolution ?? '—'}</Table.Cell>
                  <Table.Cell>{m.first_used?.split(' ')[0] ?? '—'}</Table.Cell>
                  <Table.Cell>{m.last_used?.split(' ')[0] ?? '—'}</Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </Box>
      </ChartCard>

      {showUnusedSection && (
        <Box mt={4}>
          <ChartCard
            title="Never-Used Models"
            loading={unused.isPending}
            error={unused.error ? (unused.error as Error).message : null}
          >
            <HStack mb={3} gap={2} flexWrap="wrap">
              {UNUSED_TYPES.map(t => (
                <Button
                  key={t.key} size="sm"
                  variant={typeFilter === t.key ? 'solid' : 'outline'}
                  colorPalette="blue"
                  onClick={() => setTypeFilter(t.key)}
                >
                  {t.label}
                </Button>
              ))}
              <Input
                placeholder="Search by name…"
                size="sm" maxW="280px" ml={2}
                value={search}
                onChange={e => setSearch(e.target.value)}
                bg="surface.card" borderColor="surface.border"
              />
            </HStack>
            <Text mb={3} fontSize="sm" color="gray.400">
              {unusedRows.length} model{unusedRows.length === 1 ? '' : 's'} never used
              {unusedTotalSize > 0 && ` · ${formatBytes(unusedTotalSize)} on disk`}
            </Text>
            <Box overflowX="auto">
              <Table.Root size="sm">
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeader>Name</Table.ColumnHeader>
                    <Table.ColumnHeader>Family</Table.ColumnHeader>
                    <Table.ColumnHeader>Type</Table.ColumnHeader>
                    <Table.ColumnHeader textAlign="end">Size</Table.ColumnHeader>
                    <Table.ColumnHeader>Source</Table.ColumnHeader>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {unusedRows.length === 0 && !unused.isPending && (
                    <Table.Row>
                      <Table.Cell colSpan={5} textAlign="center" color="gray.500" py={6}>
                        No matching models for the current filter.
                      </Table.Cell>
                    </Table.Row>
                  )}
                  {unusedRows.map(m => (
                    <Table.Row key={m.key}>
                      <Table.Cell fontWeight="medium">{m.name}</Table.Cell>
                      <Table.Cell>{m.base ?? '—'}</Table.Cell>
                      <Table.Cell>{m.type ?? '—'}</Table.Cell>
                      <Table.Cell textAlign="end">{formatBytes(m.file_size)}</Table.Cell>
                      <Table.Cell maxW="320px" overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap" title={m.source ?? ''}>
                        {m.source ?? '—'}
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>
            </Box>
          </ChartCard>
        </Box>
      )}

      <Box mt={4}>
        <ChartCard title="Least Used Models" loading={leastModels.loading} error={leastModels.error}>
          <Table.Root size="sm">
            <Table.Header>
              <Table.Row><Table.ColumnHeader>Model</Table.ColumnHeader><Table.ColumnHeader>Family</Table.ColumnHeader><Table.ColumnHeader textAlign="end">Count</Table.ColumnHeader></Table.Row>
            </Table.Header>
            <Table.Body>
              {(leastModels.data || []).map(m => (
                <Table.Row key={m.model_name}>
                  <Table.Cell>{m.model_name}</Table.Cell>
                  <Table.Cell>{m.model_base}</Table.Cell>
                  <Table.Cell textAlign="end">{m.count}</Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </ChartCard>
      </Box>
    </Box>
  )
}
