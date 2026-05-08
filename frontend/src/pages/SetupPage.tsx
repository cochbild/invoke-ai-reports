// frontend/src/pages/SetupPage.tsx
import {
  Box, VStack, Heading, Text, Input, Button, Alert, Card, HStack, Stat,
} from '@chakra-ui/react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { validatePath, triggerSync, updateSettings } from '../api/client'
import type { ValidationResult } from '../api/client'
import { toaster } from '../toaster'
import Surface from '../components/Surface'
import { SYNC_STATUS_QUERY_KEY } from '../App'

export default function SetupPage() {
  const [path, setPath] = useState('')
  const [validating, setValidating] = useState(false)
  const [importing, setImporting] = useState(false)
  const [validation, setValidation] = useState<ValidationResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const handleValidate = async () => {
    if (!path.trim()) return
    setValidating(true)
    setError(null)
    setValidation(null)
    try {
      const result = await validatePath(path.trim())
      if (result.valid) {
        setValidation(result)
      } else {
        setError(result.error || 'Invalid path. Make sure this points to your InvokeAI installation folder containing databases/invokeai.db')
      }
    } catch {
      setError('Could not connect to backend. Is the server running?')
    } finally {
      setValidating(false)
    }
  }

  const handleImport = async () => {
    setImporting(true)
    try {
      await updateSettings(path.trim())
      const result = await triggerSync(path.trim())
      // App's setup gate reads sync-status from the query cache; without
      // invalidation it still returns the pre-import (null) value and
      // navigate('/') bounces straight back to /setup.
      await queryClient.invalidateQueries({ queryKey: SYNC_STATUS_QUERY_KEY })
      toaster.create({
        title: 'Import complete!',
        description: `Imported ${result.images_imported} images and ${result.queue_items_imported} queue items.`,
        type: 'success',
        duration: 5000,
      })
      setTimeout(() => navigate('/'), 1500)
    } catch {
      setError('Import failed. Check the server logs for details.')
      setImporting(false)
    }
  }

  return (
    <Box minH="100vh" bg="#1a1a2e" display="flex" alignItems="center" justifyContent="center">
      <Surface maxW="600px" w="full" mx={4}>
        <Card.Body>
          <VStack gap={6} align="stretch">
            <VStack gap={2}>
              <Heading size="lg" color="accent.blue">InvokeAI Reports</Heading>
              <Text color="gray.400" textAlign="center">
                Enter the path to your InvokeAI installation to get started.
              </Text>
            </VStack>

            <VStack gap={3}>
              <Input
                placeholder="e.g., C:\InvokeAI or /home/user/invokeai"
                value={path}
                onChange={e => { setPath(e.target.value); setValidation(null); setError(null) }}
                onKeyDown={e => e.key === 'Enter' && handleValidate()}
                bg="surface.card" borderColor="surface.border"
                size="lg"
              />
              <Button
                colorPalette="blue" w="full"
                onClick={handleValidate}
                loading={validating}
                disabled={!path.trim()}
              >
                Validate Path
              </Button>
            </VStack>

            {error && (
              <Alert.Root status="error" borderRadius="md" bg="red.900">
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Description>{error}</Alert.Description>
                </Alert.Content>
              </Alert.Root>
            )}

            {validation && (
              <VStack gap={4}>
                <Alert.Root status="success" borderRadius="md" bg="green.900">
                  <Alert.Indicator />
                  <Alert.Content>
                    <Alert.Description>Database found! Ready to import.</Alert.Description>
                  </Alert.Content>
                </Alert.Root>
                <HStack gap={4} w="full">
                  <Stat.Root>
                    <Stat.Label color="gray.400">Images</Stat.Label>
                    <Stat.ValueText color="accent.blue">{validation.image_count?.toLocaleString()}</Stat.ValueText>
                  </Stat.Root>
                  <Stat.Root>
                    <Stat.Label color="gray.400">Models</Stat.Label>
                    <Stat.ValueText color="accent.purple">{validation.model_count}</Stat.ValueText>
                  </Stat.Root>
                  <Stat.Root>
                    <Stat.Label color="gray.400">Users</Stat.Label>
                    <Stat.ValueText color="accent.teal">{validation.user_count}</Stat.ValueText>
                  </Stat.Root>
                </HStack>
                <Button
                  colorPalette="green" w="full" size="lg"
                  onClick={handleImport}
                  loading={importing}
                >
                  {importing ? 'Importing...' : 'Import Data'}
                </Button>
              </VStack>
            )}
          </VStack>
        </Card.Body>
      </Surface>
    </Box>
  )
}
