// frontend/src/pages/ModelsPage.tsx
import { Box, SimpleGrid, Table, Thead, Tbody, Tr, Th, Td } from '@chakra-ui/react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import ChartCard from '../components/ChartCard'
import { useApi } from '../hooks/useApi'
import {
  fetchTopModels, fetchLeastModels, fetchFamilyDistribution, fetchLeaderboard,
} from '../api/client'
import { CHART_COLORS } from '../theme'

export default function ModelsPage() {
  const topModels = useApi(fetchTopModels, { limit: 10 })
  const leastModels = useApi(fetchLeastModels, { limit: 10 })
  const families = useApi(fetchFamilyDistribution)
  const leaderboard = useApi(fetchLeaderboard)

  return (
    <Box>
      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={4} mb={6}>
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
        <Table variant="simple" size="sm">
          <Thead>
            <Tr><Th>Model</Th><Th>Family</Th><Th isNumeric>Count</Th></Tr>
          </Thead>
          <Tbody>
            {(leastModels.data || []).map(m => (
              <Tr key={m.model_name}>
                <Td>{m.model_name}</Td>
                <Td>{m.model_base}</Td>
                <Td isNumeric>{m.count}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </ChartCard>

      <Box mt={4}>
        <ChartCard title="Model Leaderboard" loading={leaderboard.loading} error={leaderboard.error}>
          <Box overflowX="auto">
            <Table variant="simple" size="sm">
              <Thead>
                <Tr>
                  <Th>Model</Th><Th>Family</Th><Th isNumeric>Count</Th>
                  <Th isNumeric>Avg Steps</Th><Th isNumeric>Avg CFG</Th>
                  <Th>Resolution</Th><Th>First Used</Th><Th>Last Used</Th>
                </Tr>
              </Thead>
              <Tbody>
                {(leaderboard.data || []).map(m => (
                  <Tr key={m.model_name}>
                    <Td fontWeight="medium">{m.model_name}</Td>
                    <Td>{m.model_base}</Td>
                    <Td isNumeric>{m.count}</Td>
                    <Td isNumeric>{m.avg_steps ?? '—'}</Td>
                    <Td isNumeric>{m.avg_cfg ?? '—'}</Td>
                    <Td>{m.common_resolution ?? '—'}</Td>
                    <Td>{m.first_used?.split(' ')[0] ?? '—'}</Td>
                    <Td>{m.last_used?.split(' ')[0] ?? '—'}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        </ChartCard>
      </Box>
    </Box>
  )
}
