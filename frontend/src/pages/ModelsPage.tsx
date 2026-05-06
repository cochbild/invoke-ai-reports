// frontend/src/pages/ModelsPage.tsx
import { Box, SimpleGrid, Table } from '@chakra-ui/react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import ChartCard from '../components/ChartCard'
import { useFiltered } from '../hooks/useFiltered'
import {
  fetchTopModels, fetchLeastModels, fetchFamilyDistribution, fetchLeaderboard,
} from '../api/client'
import { CHART_COLORS } from '../theme'

export default function ModelsPage() {
  const topModels = useFiltered(fetchTopModels, { limit: 10 })
  const leastModels = useFiltered(fetchLeastModels, { limit: 10 })
  const families = useFiltered(fetchFamilyDistribution)
  const leaderboard = useFiltered(fetchLeaderboard)

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

      <Box mt={4}>
        <ChartCard title="Model Leaderboard" loading={leaderboard.loading} error={leaderboard.error}>
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
                {(leaderboard.data || []).map(m => (
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
      </Box>
    </Box>
  )
}
