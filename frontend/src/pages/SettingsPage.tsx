// frontend/src/pages/SettingsPage.tsx
import {
  VStack, Heading, Card, Input, Button, Text, HStack, Table,
} from '@chakra-ui/react'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchSettings, updateSettings, clearData, fetchSyncStatus } from '../api/client'
import type { AppSettings, SyncStatus } from '../api/client'
import { toaster } from '../toaster'

const cardStyle = {
  bg: 'surface.bg',
  borderColor: 'surface.border',
  borderWidth: '1px',
  borderRadius: 'lg',
} as const

export default function SettingsPage() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null)
  const [newPath, setNewPath] = useState('')
  const [saving, setSaving] = useState(false)
  const [clearing, setClearing] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    fetchSettings().then((s: AppSettings) => { setNewPath(s.invoke_path || '') })
    fetchSyncStatus().then(setSyncStatus)
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const result = await updateSettings(newPath)
      setNewPath(result.invoke_path)
      toaster.create({ title: 'Settings saved', type: 'success', duration: 3000 })
    } catch {
      toaster.create({ title: 'Failed to save', type: 'error', duration: 3000 })
    } finally {
      setSaving(false)
    }
  }

  const handleClear = async () => {
    if (!confirm('This will delete all imported data. You will need to re-import. Continue?')) return
    setClearing(true)
    try {
      await clearData()
      toaster.create({ title: 'Data cleared', type: 'info', duration: 3000 })
      setTimeout(() => navigate('/setup'), 1000)
    } catch {
      toaster.create({ title: 'Failed to clear data', type: 'error', duration: 3000 })
    } finally {
      setClearing(false)
    }
  }

  return (
    <VStack gap={6} align="stretch">
      <Heading size="lg">Settings</Heading>

      <Card.Root {...cardStyle}>
        <Card.Header><Heading size="sm">InvokeAI Installation Path</Heading></Card.Header>
        <Card.Body>
          <HStack>
            <Input
              value={newPath}
              onChange={e => setNewPath(e.target.value)}
              placeholder="Path to InvokeAI installation"
              bg="surface.card" borderColor="surface.border"
            />
            <Button colorPalette="blue" onClick={handleSave} loading={saving}>
              Save
            </Button>
          </HStack>
        </Card.Body>
      </Card.Root>

      <Card.Root {...cardStyle}>
        <Card.Header><Heading size="sm">Sync Status</Heading></Card.Header>
        <Card.Body>
          {syncStatus ? (
            <Table.Root size="sm">
              <Table.Body>
                <Table.Row>
                  <Table.Cell color="gray.400" fontWeight="medium">Last Sync</Table.Cell>
                  <Table.Cell>{syncStatus.last_sync || 'Never'}</Table.Cell>
                </Table.Row>
                <Table.Row>
                  <Table.Cell color="gray.400" fontWeight="medium">Source Path</Table.Cell>
                  <Table.Cell>{syncStatus.source_path || '—'}</Table.Cell>
                </Table.Row>
                <Table.Row>
                  <Table.Cell color="gray.400" fontWeight="medium">Images Imported</Table.Cell>
                  <Table.Cell>{syncStatus.images_imported?.toLocaleString() ?? '—'}</Table.Cell>
                </Table.Row>
                <Table.Row>
                  <Table.Cell color="gray.400" fontWeight="medium">Queue Items</Table.Cell>
                  <Table.Cell>{syncStatus.queue_items_imported?.toLocaleString() ?? '—'}</Table.Cell>
                </Table.Row>
              </Table.Body>
            </Table.Root>
          ) : (
            <Text color="gray.500">Loading...</Text>
          )}
        </Card.Body>
      </Card.Root>

      <Card.Root {...cardStyle}>
        <Card.Header><Heading size="sm" color="red.300">Danger Zone</Heading></Card.Header>
        <Card.Body>
          <VStack align="start" gap={3}>
            <Text color="gray.400">
              Clear all imported data and return to the setup screen.
              Your InvokeAI database is not affected.
            </Text>
            <Button colorPalette="red" variant="outline" onClick={handleClear} loading={clearing}>
              Clear All Data
            </Button>
          </VStack>
        </Card.Body>
      </Card.Root>
    </VStack>
  )
}
