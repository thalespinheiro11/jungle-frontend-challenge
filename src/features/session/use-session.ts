import { useQuery } from '@tanstack/react-query'

import { sessionQuery } from './api'

export function useSession() {
  const query = useQuery(sessionQuery())
  return { session: query.data ?? null, user: query.data?.user ?? null, isPending: query.isPending }
}
