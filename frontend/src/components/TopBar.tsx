// frontend/src/components/TopBar.tsx
import {
  Box, Flex, Heading, HStack, Select, Button, Input, IconButton,
  useToast, Tabs, TabList, Tab,
} from '@chakra-ui/react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useFilters } from '../context/FilterContext'
import { fetchUsers, triggerSync, fetchSettings } from '../api/client'
import type { UserInfo } from '../api/client'

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
  const toast = useToast()

  useEffect(() => {
    fetchUsers().then(setUsers).catch(() => {})
    fetchSettings().then(s => setInvokePath(s.invoke_path)).catch(() => {})
  }, [])

  const currentTab = NAV_ITEMS.findIndex(n => n.path === location.pathname)

  const handleSync = async () => {
    if (!invokePath) return
    setSyncing(true)
    try {
      const result = await triggerSync(invokePath)
      toast({
        title: 'Sync complete',
        description: `Imported ${result.images_imported} images, ${result.queue_items_imported} queue items`,
        status: 'success', duration: 4000,
      })
      navigate(0) // refresh current route
    } catch {
      toast({ title: 'Sync failed', status: 'error', duration: 4000 })
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
    <Box bg="surface.bg" borderBottom="1px" borderColor="surface.border" px={6} py={2}>
      <Flex align="center" justify="space-between">
        <HStack spacing={6}>
          <Heading size="md" color="accent.blue" cursor="pointer" onClick={() => navigate('/')}>
            InvokeAI Reports
          </Heading>
          <Tabs
            variant="line"
            index={currentTab >= 0 ? currentTab : undefined}
            onChange={i => navigate(NAV_ITEMS[i].path)}
            size="sm"
          >
            <TabList borderBottomColor="surface.border">
              {NAV_ITEMS.map(n => <Tab key={n.path}>{n.label}</Tab>)}
            </TabList>
          </Tabs>
        </HStack>

        <HStack spacing={3}>
          <Select
            size="sm" w="160px"
            value={filters.user_id || ''}
            onChange={e => setUserId(e.target.value || undefined)}
            bg="surface.card" borderColor="surface.border"
          >
            <option value="">All Users</option>
            {users.map(u => (
              <option key={u.user_id} value={u.user_id}>
                {u.display_name || u.user_id} ({u.image_count})
              </option>
            ))}
          </Select>

          <HStack spacing={1}>
            {DATE_PRESETS.map(p => (
              <Button key={p.label} size="xs"
                variant={activePreset === p.days ? 'solid' : 'outline'}
                colorScheme="blue"
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
            size="sm" colorScheme="blue" variant="outline"
            onClick={handleSync} isLoading={syncing}
            isDisabled={!invokePath}
          >
            Sync
          </Button>
          <IconButton
            aria-label="Settings" size="sm" variant="ghost"
            icon={<Box as="span" fontSize="lg">&#9881;</Box>}
            onClick={() => navigate('/settings')}
          />
        </HStack>
      </Flex>
    </Box>
  )
}
