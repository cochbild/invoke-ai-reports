// frontend/src/pages/SettingsPage.tsx
import {
  VStack, Heading, Card, CardBody, CardHeader, Input, Button,
  Text, HStack, useToast,
  Table, Tbody, Tr, Td,
} from '@chakra-ui/react'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchSettings, updateSettings, clearData, fetchSyncStatus } from '../api/client'
import type { AppSettings, SyncStatus } from '../api/client'

export default function SettingsPage() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null)
  const [newPath, setNewPath] = useState('')
  const [saving, setSaving] = useState(false)
  const [clearing, setClearing] = useState(false)
  const navigate = useNavigate()
  const toast = useToast()

  useEffect(() => {
    fetchSettings().then((s: AppSettings) => { setNewPath(s.invoke_path || '') })
    fetchSyncStatus().then(setSyncStatus)
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const result = await updateSettings(newPath)
      setNewPath(result.invoke_path)
      toast({ title: 'Settings saved', status: 'success', duration: 3000 })
    } catch {
      toast({ title: 'Failed to save', status: 'error', duration: 3000 })
    } finally {
      setSaving(false)
    }
  }

  const handleClear = async () => {
    if (!confirm('This will delete all imported data. You will need to re-import. Continue?')) return
    setClearing(true)
    try {
      await clearData()
      toast({ title: 'Data cleared', status: 'info', duration: 3000 })
      setTimeout(() => navigate('/setup'), 1000)
    } catch {
      toast({ title: 'Failed to clear data', status: 'error', duration: 3000 })
    } finally {
      setClearing(false)
    }
  }

  return (
    <VStack spacing={6} align="stretch">
      <Heading size="lg">Settings</Heading>

      <Card>
        <CardHeader><Heading size="sm">InvokeAI Installation Path</Heading></CardHeader>
        <CardBody>
          <HStack>
            <Input
              value={newPath}
              onChange={e => setNewPath(e.target.value)}
              placeholder="Path to InvokeAI installation"
              bg="surface.card" borderColor="surface.border"
            />
            <Button colorScheme="blue" onClick={handleSave} isLoading={saving}>
              Save
            </Button>
          </HStack>
        </CardBody>
      </Card>

      <Card>
        <CardHeader><Heading size="sm">Sync Status</Heading></CardHeader>
        <CardBody>
          {syncStatus ? (
            <Table variant="simple" size="sm">
              <Tbody>
                <Tr>
                  <Td color="gray.400" fontWeight="medium">Last Sync</Td>
                  <Td>{syncStatus.last_sync || 'Never'}</Td>
                </Tr>
                <Tr>
                  <Td color="gray.400" fontWeight="medium">Source Path</Td>
                  <Td>{syncStatus.source_path || '—'}</Td>
                </Tr>
                <Tr>
                  <Td color="gray.400" fontWeight="medium">Images Imported</Td>
                  <Td>{syncStatus.images_imported?.toLocaleString() ?? '—'}</Td>
                </Tr>
                <Tr>
                  <Td color="gray.400" fontWeight="medium">Queue Items</Td>
                  <Td>{syncStatus.queue_items_imported?.toLocaleString() ?? '—'}</Td>
                </Tr>
              </Tbody>
            </Table>
          ) : (
            <Text color="gray.500">Loading...</Text>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader><Heading size="sm" color="red.300">Danger Zone</Heading></CardHeader>
        <CardBody>
          <VStack align="start" spacing={3}>
            <Text color="gray.400">
              Clear all imported data and return to the setup screen.
              Your InvokeAI database is not affected.
            </Text>
            <Button colorScheme="red" variant="outline" onClick={handleClear} isLoading={clearing}>
              Clear All Data
            </Button>
          </VStack>
        </CardBody>
      </Card>
    </VStack>
  )
}
