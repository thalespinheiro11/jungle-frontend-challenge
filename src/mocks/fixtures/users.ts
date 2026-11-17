import type { SessionUser } from '@/lib/api/contracts'

/**
 * Seed collectors. Passwords are never stored in clear text: each user keeps a salt and
 * SHA-256(salt + ":" + password). Demo credentials are listed in the README.
 *   ana@kurio.dev   / Kurio@123
 *   bruno@kurio.dev / Kurio@123
 */
export interface MockUser extends SessionUser {
  salt: string
  passwordHash: string
  createdAt: string
}

export function buildUserFixtures(): MockUser[] {
  return [
    {
      id: 'usr_ana',
      name: 'Ana Souza',
      username: 'ana.colecionadora',
      email: 'ana@kurio.dev',
      avatarUrl: null,
      salt: 's4lt-ana-01',
      passwordHash: '6dc229f0d749cf0821133058b238256f86b536ef4b5c18a7e9a7efe59439dd0e',
      createdAt: '2026-10-01T12:00:00.000Z',
    },
    {
      id: 'usr_bruno',
      name: 'Bruno Lima',
      username: 'bruno.nft',
      email: 'bruno@kurio.dev',
      avatarUrl: null,
      salt: 's4lt-bruno-02',
      passwordHash: '35bb74146abc4b980215fb9b943fc2a2db1d4b3a013b7022c717bdea45c4f2c2',
      createdAt: '2026-10-05T12:00:00.000Z',
    },
  ]
}
