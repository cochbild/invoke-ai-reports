// frontend/src/pages/SetupPage.tsx
import {
  Box, VStack, Heading, Text, Input, Button, Alert, AlertIcon,
  Card, CardBody, HStack, Stat, StatLabel, StatNumber, useToast,
} from '@chakra-ui/react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { validatePath, triggerSync, updateSettings } from '../api/client'
import type { ValidationResult } from '../api/client'

export default function SetupPage() {
  const [path, setPath] = useState('')
  const [validating, setValidating] = useState(false)
  const [importing, setImporting] = useState(false)
  const [validation, setValidation] = useState<ValidationResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  const toast = useToast()

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
      toast({
        title: 'Import complete!',
        description: `Imported ${result.images_imported} images and ${result.queue_items_imported} queue items.`,
        status: 'success', duration: 5000,
      })
      setTimeout(() => navigate('/'), 1500)
    } catch {
      setError('Import failed. Check the server logs for details.')
      setImporting(false)
    }
  }

  return (
    <Box minH="100vh" bg="#1a1a2e" display="flex" alignItems="center" justifyContent="center">
      <Card maxW="600px" w="full" mx={4}>
        <CardBody>
          <VStack spacing={6} align="stretch">
            <VStack spacing={2}>
              <Heading size="lg" color="accent.blue">InvokeAI Reports</Heading>
              <Text color="gray.400" textAlign="center">
                Enter the path to your InvokeAI installation to get started.
              </Text>
            </VStack>

            <VStack spacing={3}>
              <Input
                placeholder="e.g., C:\InvokeAI or /home/user/invokeai"
                value={path}
                onChange={e => { setPath(e.target.value); setValidation(null); setError(null) }}
                onKeyDown={e => e.key === 'Enter' && handleValidate()}
                bg="surface.card" borderColor="surface.border"
                size="lg"
              />
              <Button
                colorScheme="blue" w="full"
                onClick={handleValidate}
                isLoading={validating}
                isDisabled={!path.trim()}
              >
                Validate Path
              </Button>
            </VStack>

            {error && (
              <Alert status="error" borderRadius="md" bg="red.900">
                <AlertIcon />
                {error}
              </Alert>
            )}

            {validation && (
              <VStack spacing={4}>
                <Alert status="success" borderRadius="md" bg="green.900">
                  <AlertIcon />
                  Database found! Ready to import.
                </Alert>
                <HStack spacing={4} w="full">
                  <Stat>
                    <StatLabel color="gray.400">Images</StatLabel>
                    <StatNumber color="accent.blue">{validation.image_count?.toLocaleString()}</StatNumber>
                  </Stat>
                  <Stat>
                    <StatLabel color="gray.400">Models</StatLabel>
                    <StatNumber color="accent.purple">{validation.model_count}</StatNumber>
                  </Stat>
                  <Stat>
                    <StatLabel color="gray.400">Users</StatLabel>
                    <StatNumber color="accent.teal">{validation.user_count}</StatNumber>
                  </Stat>
                </HStack>
                <Button
                  colorScheme="green" w="full" size="lg"
                  onClick={handleImport}
                  isLoading={importing}
                  loadingText="Importing..."
                >
                  Import Data
                </Button>
              </VStack>
            )}
          </VStack>
        </CardBody>
      </Card>
    </Box>
  )
}
