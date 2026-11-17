import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

import { PlaceholderPage } from '@/components/layout/placeholder-page'

export const Route = createFileRoute('/signup')({
  validateSearch: z.object({ redirect: z.string().optional().catch(undefined) }),
  component: () => <PlaceholderPage title="Criar conta" description="Cadastro, validação e conflito de e-mail." />,
})
