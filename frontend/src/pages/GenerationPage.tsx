// frontend/src/pages/GenerationPage.tsx
import { Box, SimpleGrid, Table, Thead, Tbody, Tr, Th, Td } from '@chakra-ui/react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'
import StatCard from '../components/StatCard'
import ChartCard from '../components/ChartCard'
import { useApi } from '../hooks/useApi'
import {
  fetchResolutions, fetchSchedulers, fetchSteps, fetchCfg, fetchLoras, fetchErrors,
} from '../api/client'
import { CHART_COLORS } from '../theme'

export default function GenerationPage() {
  const resolutions = useApi(fetchResolutions)
  const schedulers = useApi(fetchSchedulers)
  const steps = useApi(fetchSteps)
  const cfg = useApi(fetchCfg)
  const loras = useApi(fetchLoras)
  const errors = useApi(fetchErrors)

  return (
    <Box>
      <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4} mb={6}>
        <StatCard label="Images with LoRA" value={loras.data?.total_with_lora} loading={loras.loading}
          helpText={loras.data ? `${loras.data.pct_with_lora}% of all` : undefined} />
        <StatCard label="Total Queue Items" value={errors.data?.total_items} loading={errors.loading} />
        <StatCard label="Failed" value={errors.data?.total_failed} loading={errors.loading}
          helpText={errors.data ? `${errors.data.failure_rate}% failure rate` : undefined} />
        <StatCard label="Top Resolution" value={resolutions.data?.[0]?.resolution} loading={resolutions.loading} />
      </SimpleGrid>

      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={4} mb={6}>
        <ChartCard title="Resolution Distribution" loading={resolutions.loading} error={resolutions.error}>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={(resolutions.data || []).slice(0, 8)}>
              <XAxis dataKey="resolution" stroke="#718096" tick={{ fontSize: 11 }} />
              <YAxis stroke="#718096" />
              <Tooltip contentStyle={{ background: '#16213e', border: '1px solid #2a2d4a' }} />
              <Bar dataKey="count" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Scheduler Usage" loading={schedulers.loading} error={schedulers.error}>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={schedulers.data || []} dataKey="count" nameKey="scheduler"
                cx="50%" cy="50%" outerRadius={90} innerRadius={50}
                label={({ scheduler, percent }: { scheduler?: string; percent?: number }) => `${scheduler ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {(schedulers.data || []).map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: '#16213e', border: '1px solid #2a2d4a' }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </SimpleGrid>

      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={4} mb={6}>
        <ChartCard title="Steps Distribution" loading={steps.loading} error={steps.error}>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={steps.data || []}>
              <XAxis dataKey="steps" stroke="#718096" />
              <YAxis stroke="#718096" />
              <Tooltip contentStyle={{ background: '#16213e', border: '1px solid #2a2d4a' }} />
              <Bar dataKey="count" fill={CHART_COLORS[2]} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="CFG Scale Distribution" loading={cfg.loading} error={cfg.error}>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={cfg.data || []}>
              <XAxis dataKey="cfg_scale" stroke="#718096" />
              <YAxis stroke="#718096" />
              <Tooltip contentStyle={{ background: '#16213e', border: '1px solid #2a2d4a' }} />
              <Bar dataKey="count" fill={CHART_COLORS[3]} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </SimpleGrid>

      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={4}>
        <ChartCard title="Top LoRAs" loading={loras.loading} error={loras.error}>
          <Table variant="simple" size="sm">
            <Thead><Tr><Th>LoRA</Th><Th isNumeric>Used</Th></Tr></Thead>
            <Tbody>
              {(loras.data?.top_loras || []).map(l => (
                <Tr key={l.lora_name}><Td>{l.lora_name}</Td><Td isNumeric>{l.count}</Td></Tr>
              ))}
            </Tbody>
          </Table>
        </ChartCard>

        <ChartCard title="Errors by Type" loading={errors.loading} error={errors.error}>
          <Table variant="simple" size="sm">
            <Thead><Tr><Th>Error Type</Th><Th isNumeric>Count</Th></Tr></Thead>
            <Tbody>
              {(errors.data?.by_error_type || []).map(e => (
                <Tr key={e.error_type}><Td>{e.error_type}</Td><Td isNumeric>{e.count}</Td></Tr>
              ))}
              {(errors.data?.by_error_type || []).length === 0 && (
                <Tr><Td colSpan={2} color="gray.500">No errors</Td></Tr>
              )}
            </Tbody>
          </Table>
        </ChartCard>
      </SimpleGrid>
    </Box>
  )
}
