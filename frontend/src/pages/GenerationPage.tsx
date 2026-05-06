// frontend/src/pages/GenerationPage.tsx
import { Box, SimpleGrid, Table } from '@chakra-ui/react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'
import StatCard from '../components/StatCard'
import ChartCard from '../components/ChartCard'
import { useFiltered } from '../hooks/useFiltered'
import {
  fetchResolutions, fetchSchedulers, fetchSteps, fetchCfg, fetchLoras, fetchErrors,
} from '../api/client'
import { CHART_COLORS } from '../theme'

export default function GenerationPage() {
  const resolutions = useFiltered(fetchResolutions)
  const schedulers = useFiltered(fetchSchedulers)
  const steps = useFiltered(fetchSteps)
  const cfg = useFiltered(fetchCfg)
  const loras = useFiltered(fetchLoras)
  const errors = useFiltered(fetchErrors)

  return (
    <Box>
      <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} gap={4} mb={6}>
        <StatCard label="Images with LoRA" value={loras.data?.total_with_lora} loading={loras.loading}
          helpText={loras.data ? `${loras.data.pct_with_lora}% of all` : undefined} />
        <StatCard label="Total Queue Items" value={errors.data?.total_items} loading={errors.loading} />
        <StatCard label="Failed" value={errors.data?.total_failed} loading={errors.loading}
          helpText={errors.data ? `${errors.data.failure_rate}% failure rate` : undefined} />
        <StatCard label="Top Resolution" value={resolutions.data?.[0]?.resolution} loading={resolutions.loading} />
      </SimpleGrid>

      <SimpleGrid columns={{ base: 1, lg: 2 }} gap={4} mb={6}>
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

      <SimpleGrid columns={{ base: 1, lg: 2 }} gap={4} mb={6}>
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

      <SimpleGrid columns={{ base: 1, lg: 2 }} gap={4}>
        <ChartCard title="Top LoRAs" loading={loras.loading} error={loras.error}>
          <Table.Root size="sm">
            <Table.Header><Table.Row><Table.ColumnHeader>LoRA</Table.ColumnHeader><Table.ColumnHeader textAlign="end">Used</Table.ColumnHeader></Table.Row></Table.Header>
            <Table.Body>
              {(loras.data?.top_loras || []).map(l => (
                <Table.Row key={l.lora_name}><Table.Cell>{l.lora_name}</Table.Cell><Table.Cell textAlign="end">{l.count}</Table.Cell></Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </ChartCard>

        <ChartCard title="Errors by Type" loading={errors.loading} error={errors.error}>
          <Table.Root size="sm">
            <Table.Header><Table.Row><Table.ColumnHeader>Error Type</Table.ColumnHeader><Table.ColumnHeader textAlign="end">Count</Table.ColumnHeader></Table.Row></Table.Header>
            <Table.Body>
              {(errors.data?.by_error_type || []).map(e => (
                <Table.Row key={e.error_type}><Table.Cell>{e.error_type}</Table.Cell><Table.Cell textAlign="end">{e.count}</Table.Cell></Table.Row>
              ))}
              {(errors.data?.by_error_type || []).length === 0 && (
                <Table.Row><Table.Cell colSpan={2} color="gray.500">No errors</Table.Cell></Table.Row>
              )}
            </Table.Body>
          </Table.Root>
        </ChartCard>
      </SimpleGrid>
    </Box>
  )
}
