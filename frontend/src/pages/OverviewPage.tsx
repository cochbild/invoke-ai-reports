// frontend/src/pages/OverviewPage.tsx
import { SimpleGrid, Box } from '@chakra-ui/react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area,
} from 'recharts'
import StatCard from '../components/StatCard'
import ChartCard from '../components/ChartCard'
import { useApi } from '../hooks/useApi'
import {
  fetchOverview, fetchTopModels, fetchFamilyDistribution, fetchVolumeTrend,
} from '../api/client'
import { CHART_COLORS } from '../theme'

export default function OverviewPage() {
  const overview = useApi(fetchOverview)
  const topModels = useApi(fetchTopModels, { limit: 5 })
  const families = useApi(fetchFamilyDistribution)
  const volume = useApi(fetchVolumeTrend, { granularity: 'week' })

  return (
    <Box>
      <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4} mb={6}>
        <StatCard label="Total Images" value={overview.data?.total_images?.toLocaleString()} loading={overview.loading} />
        <StatCard label="Models Used" value={overview.data?.models_used} loading={overview.loading} />
        <StatCard label="Favorite Model" value={overview.data?.top_model} loading={overview.loading} />
        <StatCard label="Active Since" value={overview.data?.first_date?.split(' ')[0]} loading={overview.loading} />
      </SimpleGrid>

      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={4} mb={6}>
        <ChartCard title="Top 5 Models" loading={topModels.loading} error={topModels.error}>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={topModels.data || []} layout="vertical" margin={{ left: 80 }}>
              <XAxis type="number" stroke="#718096" />
              <YAxis type="category" dataKey="model_name" stroke="#718096" width={120} tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={{ background: '#16213e', border: '1px solid #2a2d4a' }} />
              <Bar dataKey="count" fill={CHART_COLORS[0]} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Model Family Distribution" loading={families.loading} error={families.error}>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={families.data || []} dataKey="count" nameKey="model_base"
                cx="50%" cy="50%" outerRadius={90} innerRadius={50}
                label={({ model_base, percent }: { model_base?: string; percent?: number }) => `${model_base ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {(families.data || []).map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: '#16213e', border: '1px solid #2a2d4a' }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </SimpleGrid>

      <ChartCard title="Generation Activity" loading={volume.loading} error={volume.error}>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={volume.data || []}>
            <XAxis dataKey="period" stroke="#718096" tick={{ fontSize: 11 }} />
            <YAxis stroke="#718096" />
            <Tooltip contentStyle={{ background: '#16213e', border: '1px solid #2a2d4a' }} />
            <Area type="monotone" dataKey="count" stroke={CHART_COLORS[0]} fill={CHART_COLORS[0]} fillOpacity={0.3} />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>
    </Box>
  )
}
