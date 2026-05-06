// frontend/src/components/TopBar.tsx
import {
  Box, Flex, Heading, HStack, NativeSelect, Button, Input, IconButton, Tabs,
} from '@chakra-ui/react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useFilters } from '../context/FilterContext'
import { fetchUsers, triggerSync, fetchSettings } from '../api/client'
import type { UserInfo } from '../api/client'
import { toaster } from '../toaster'

const NAV_ITEMS = [
  { label: 'Overview', path: '/' },
  { label: 'Models', path: '/models' },
  { label: 'Prompts', path: '/prompts' },
  { label: 'Trends', path: '/trends' },
  { label: 'Generation', path: '/generation' },
]

const DATE_PRESETS = [
  { label: '7d', days: 7 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
  { label: 'All', days: 0 },
]

export default function TopBar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { filters, setUserId, setDateRange } = useFilters()
  const [users, setUsers] = useState<UserInfo[]>([])
  const [syncing, setSyncing] = useState(false)
  const [invokePath, setInvokePath] = useState<string | null>(null)
  const [activePreset, setActivePreset] = useState<number>(0) // 0 = All

  useEffect(() => {
    fetchUsers().then(setUsers).catch(() => {})
    fetchSettings().then(s => setInvokePath(s.invoke_path)).catch(() => {})
  }, [])

  const currentPath = NAV_ITEMS.find(n => n.path === location.pathname)?.path

  const handleSync = async () => {
    if (!invokePath) return
    setSyncing(true)
    try {
      const result = await triggerSync(invokePath)
      toaster.create({
        title: 'Sync complete',
        description: `Imported ${result.images_imported} images, ${result.queue_items_imported} queue items`,
        type: 'success',
        duration: 4000,
      })
      navigate(0) // refresh current route
    } catch {
      toaster.create({ title: 'Sync failed', type: 'error', duration: 4000 })
    } finally {
      setSyncing(false)
    }
  }

  const handlePreset = (days: number) => {
    setActivePreset(days)
    if (days === 0) {
      setDateRange(undefined, undefined)
    } else {
      const end = new Date()
      const start = new Date()
      start.setDate(end.getDate() - days)
      setDateRange(start.toISOString().split('T')[0], end.toISOString().split('T')[0])
    }
  }

  return (
    <Box bg="surface.bg" borderBottom="1px solid" borderColor="surface.border" px={6} py={2}>
      <Flex align="center" justify="space-between">
        <HStack gap={6}>
          <Heading size="md" color="accent.blue" cursor="pointer" onClick={() => navigate('/')}>
            InvokeAI Reports
          </Heading>
          <Tabs.Root
            variant="line"
            value={currentPath ?? null}
            onValueChange={(d) => d.value && navigate(d.value)}
            size="sm"
          >
            <Tabs.List borderBottomColor="surface.border">
              {NAV_ITEMS.map(n => (
                <Tabs.Trigger key={n.path} value={n.path}>{n.label}</Tabs.Trigger>
              ))}
            </Tabs.List>
          </Tabs.Root>
        </HStack>

        <HStack gap={3}>
          <NativeSelect.Root size="sm" w="160px">
            <NativeSelect.Field
              value={filters.user_id || ''}
              onChange={e => setUserId(e.target.value || undefined)}
              bg="surface.card"
              borderColor="surface.border"
            >
              <option value="">All Users</option>
              {users.map(u => (
                <option key={u.user_id} value={u.user_id}>
                  {u.display_name || u.user_id} ({u.image_count})
                </option>
              ))}
            </NativeSelect.Field>
            <NativeSelect.Indicator />
          </NativeSelect.Root>

          <HStack gap={1}>
            {DATE_PRESETS.map(p => (
              <Button key={p.label} size="xs"
                variant={activePreset === p.days ? 'solid' : 'outline'}
                colorPalette="blue"
                onClick={() => handlePreset(p.days)}
              >
                {p.label}
              </Button>
            ))}
          </HStack>

          <Input
            type="date" size="sm" w="140px"
            value={filters.start_date || ''}
            onChange={e => setDateRange(e.target.value || undefined, filters.end_date)}
            bg="surface.card" borderColor="surface.border"
          />
          <Input
            type="date" size="sm" w="140px"
            value={filters.end_date || ''}
            onChange={e => setDateRange(filters.start_date, e.target.value || undefined)}
            bg="surface.card" borderColor="surface.border"
          />

          <Button
            size="sm" colorPalette="blue" variant="outline"
            onClick={handleSync} loading={syncing}
            disabled={!invokePath}
          >
            Sync
          </Button>
          <IconButton
            aria-label="Settings" size="sm" variant="ghost"
            onClick={() => navigate('/settings')}
          >
            <Box as="span" fontSize="lg">&#9881;</Box>
          </IconButton>
        </HStack>
      </Flex>
    </Box>
  )
}
