import type { SessionUser, WalletList } from '@/lib/api/contracts'

/** Ana has both wallets (as in the mobile payment frame); Bruno has none. */
export function buildWalletFixtures(): Record<string, WalletList> {
  const updatedAt = '2026-10-02T12:00:00.000Z'
  return {
    usr_ana: {
      primary: {
        slot: 'primary',
        displayName: 'Ana Souza',
        nickname: 'Principal',
        network: 'ethereum',
        profileName: 'ana.colecionadora',
        address: '0xA91F3c5d7e2b4a8f9c0d1e2f3a4b5c6d7e8fE82C',
        ensOrSecondary: null,
        provider: 'metamask',
        referralCode: 'KURIO2026',
        email: 'ana@kurio.dev',
        ensName: 'ana',
        updatedAt,
      },
      secondary: {
        slot: 'secondary',
        displayName: 'Ana Souza',
        nickname: 'Reserva',
        network: 'polygon',
        profileName: 'ana.colecionadora',
        address: '0x5B7c0e1D2f3A4b5C6d7E8f9A0b1C2d3E4f5A6b7C',
        ensOrSecondary: 'nova.kurio.eth',
        provider: 'coinbase',
        referralCode: 'KURIO2026',
        email: 'ana@kurio.dev',
        ensName: 'nova',
        updatedAt,
      },
    },
  }
}

/**
 * Seed collectors. Passwords are never stored in clear text: each user keeps a salt and
 * SHA-256(salt + ":" + password). Demo credentials are listed in the README.
 *   ana@kurio.dev   / Kurio@123
 *   bruno@kurio.dev / Kurio@123
 */
export interface MockUser extends SessionUser {
  ensName: string
  walletNickname: string
  updatedAt: string
  salt: string
  passwordHash: string
  createdAt: string
}

export function buildUserFixtures(): MockUser[] {
  return [
    {
      id: 'usr_ana',
      name: 'Ana Souza',
      ensName: 'ana',
      walletNickname: 'Principal',
      updatedAt: '2026-10-01T12:00:00.000Z',
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
      ensName: 'bruno',
      walletNickname: 'Principal',
      updatedAt: '2026-10-05T12:00:00.000Z',
      username: 'bruno.nft',
      email: 'bruno@kurio.dev',
      avatarUrl: null,
      salt: 's4lt-bruno-02',
      passwordHash: '35bb74146abc4b980215fb9b943fc2a2db1d4b3a013b7022c717bdea45c4f2c2',
      createdAt: '2026-10-05T12:00:00.000Z',
    },
  ]
}
