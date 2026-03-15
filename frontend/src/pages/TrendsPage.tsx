// frontend/src/pages/TrendsPage.tsx
import { Box, SimpleGrid, HStack, Button, Table, Thead, Tbody, Tr, Th, Td } from '@chakra-ui/react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { useState } from 'react'
import ChartCard from '../components/ChartCard'
import { useApi } from '../hooks/useApi'
import { fetchVolumeTrend, fetchParameterTrends, fetchHeatmap } from '../api/client'
import { CHART_COLORS } from '../theme'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function TrendsPage() {
  const [granularity, setGranularity] = useState<'day' | 'week' | 'month'>('week')
  const volume = useApi(fetchVolumeTrend, { granularity })
  const params = useApi(fetchParameterTrends, { granularity })
  const heatmap = useApi(fetchHeatmap)

  // Build heatmap grid
  const heatmapGrid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0))
  for (const cell of heatmap.data || []) {
    heatmapGrid[cell.day_of_week][cell.hour] = cell.count
  }
  const heatMax = Math.max(...(heatmap.data || []).map(c => c.count), 1)

  return (
    <Box>
      <HStack mb={4} spacing={2}>
        {(['day', 'week', 'month'] as const).map(g => (
          <Button key={g} size="sm" variant={granularity === g ? 'solid' : 'outline'}
            colorScheme="blue" onClick={() => setGranularity(g)}>
            {g.charAt(0).toUpperCase() + g.slice(1)}
          </Button>
        ))}
      </HStack>

      <SimpleGrid columns={{ base: 1 }} spacing={4} mb={6}>
        <ChartCard title="Generation Volume" loading={volume.loading} error={volume.error}>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={volume.data || []}>
              <XAxis dataKey="period" stroke="#718096" tick={{ fontSize: 11 }} />
              <YAxis stroke="#718096" />
              <Tooltip contentStyle={{ background: '#16213e', border: '1px solid #2a2d4a' }} />
              <Line type="monotone" dataKey="count" stroke={CHART_COLORS[0]} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Parameter Evolution" loading={params.loading} error={params.error}>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={params.data || []}>
              <XAxis dataKey="period" stroke="#718096" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="steps" stroke={CHART_COLORS[2]} />
              <YAxis yAxisId="cfg" orientation="right" stroke={CHART_COLORS[3]} />
              <Tooltip contentStyle={{ background: '#16213e', border: '1px solid #2a2d4a' }} />
              <Legend />
              <Line yAxisId="steps" type="monotone" dataKey="avg_steps" name="Avg Steps"
                stroke={CHART_COLORS[2]} strokeWidth={2} dot={false} />
              <Line yAxisId="cfg" type="monotone" dataKey="avg_cfg" name="Avg CFG"
                stroke={CHART_COLORS[3]} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </SimpleGrid>

      <ChartCard title="Activity Heatmap" loading={heatmap.loading} error={heatmap.error} height="220px">
        <Box overflowX="auto">
          <Table size="sm" variant="unstyled">
            <Thead>
              <Tr>
                <Th w="60px"></Th>
                {Array.from({ length: 24 }, (_, h) => (
                  <Th key={h} p={1} textAlign="center" fontSize="xs" color="gray.500">
                    {h}
                  </Th>
                ))}
              </Tr>
            </Thead>
            <Tbody>
              {DAYS.map((day, di) => (
                <Tr key={day}>
                  <Td fontSize="xs" color="gray.400" p={1}>{day}</Td>
                  {Array.from({ length: 24 }, (_, h) => {
                    const count = heatmapGrid[di][h]
                    const intensity = count / heatMax
                    return (
                      <Td key={h} p={1}>
                        <Box
                          w="20px" h="20px" borderRadius="sm"
                          bg={count === 0 ? 'surface.border' : `rgba(77, 156, 255, ${0.15 + intensity * 0.85})`}
                          title={`${day} ${h}:00 — ${count} images`}
                        />
                      </Td>
                    )
                  })}
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>
      </ChartCard>
    </Box>
  )
}
