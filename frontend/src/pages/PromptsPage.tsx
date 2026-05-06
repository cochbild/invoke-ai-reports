// frontend/src/pages/PromptsPage.tsx
import { Box, SimpleGrid, Wrap, Text } from '@chakra-ui/react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts'
import ChartCard from '../components/ChartCard'
import { useFiltered } from '../hooks/useFiltered'
import { fetchTopTokens, fetchLengthDistribution } from '../api/client'
import { CHART_COLORS } from '../theme'

export default function PromptsPage() {
  const topTokens = useFiltered(fetchTopTokens, { limit: 20 })
  const cloudTokens = useFiltered(fetchTopTokens, { limit: 100 })
  const lengths = useFiltered(fetchLengthDistribution)

  const maxCount = Math.max(...(cloudTokens.data || []).map(t => t.count), 1)

  return (
    <Box>
      <ChartCard title="Token Word Cloud" loading={cloudTokens.loading} error={cloudTokens.error} height="250px">
        <Wrap gap={2} justify="center" p={4}>
          {(cloudTokens.data || []).map((t, i) => {
            const size = 12 + (t.count / maxCount) * 28
            return (
              <Text
                key={t.token}
                fontSize={`${size}px`}
                color={CHART_COLORS[i % CHART_COLORS.length]}
                fontWeight={size > 24 ? 'bold' : 'normal'}
                title={`${t.token}: ${t.count}`}
                cursor="default"
              >
                {t.token}
              </Text>
            )
          })}
        </Wrap>
      </ChartCard>

      <SimpleGrid columns={{ base: 1, lg: 2 }} gap={4} mt={4}>
        <ChartCard title="Top 20 Tokens" loading={topTokens.loading} error={topTokens.error}>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={topTokens.data || []} layout="vertical" margin={{ left: 100 }}>
              <XAxis type="number" stroke="#718096" />
              <YAxis type="category" dataKey="token" stroke="#718096" width={140} tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#16213e', border: '1px solid #2a2d4a' }} />
              <Bar dataKey="count" fill={CHART_COLORS[1]} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Prompt Length Distribution" loading={lengths.loading} error={lengths.error}>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={lengths.data || []}>
              <XAxis dataKey="bucket" stroke="#718096" tick={{ fontSize: 11 }} />
              <YAxis stroke="#718096" />
              <Tooltip contentStyle={{ background: '#16213e', border: '1px solid #2a2d4a' }} />
              <Bar dataKey="count" fill={CHART_COLORS[4]} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </SimpleGrid>
    </Box>
  )
}
