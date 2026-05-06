// frontend/src/components/Surface.tsx
import { Card } from '@chakra-ui/react'
import type { ComponentProps } from 'react'

/**
 * Themed Card.Root for the dashboard's surface treatment. Centralises the
 * background / border / radius styling that was duplicated across pages and
 * components after the v3 migration dropped theme-level Card variants.
 */
type SurfaceProps = ComponentProps<typeof Card.Root>

export default function Surface(props: SurfaceProps) {
  return (
    <Card.Root
      bg="surface.bg"
      borderColor="surface.border"
      borderWidth="1px"
      borderRadius="lg"
      {...props}
    />
  )
}
