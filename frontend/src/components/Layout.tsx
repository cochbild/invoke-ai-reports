// frontend/src/components/Layout.tsx
import { Box } from '@chakra-ui/react'
import TopBar from './TopBar'
import type { ReactNode } from 'react'

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <Box minH="100vh" bg="#1a1a2e">
      <TopBar />
      <Box p={6} maxW="1400px" mx="auto">
        {children}
      </Box>
    </Box>
  )
}
