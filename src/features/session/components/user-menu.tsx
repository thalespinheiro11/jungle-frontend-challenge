import { Link } from '@tanstack/react-router'
import { ChevronDown, LogOut, User, Wallet } from 'lucide-react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { SessionUser } from '@/lib/api/contracts'

import { useLogout } from '../hooks'

export function UserAvatar({ user, className }: { user: SessionUser; className?: string }) {
  return (
    <Avatar className={className}>
      {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt="" />}
      <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
        {user.name.slice(0, 2).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  )
}

export function UserMenu({ user }: { user: SessionUser }) {
  const logout = useLogout()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="hover:bg-secondary ml-3 flex items-center gap-2 rounded-md py-1 pr-2 pl-1"
        aria-label={`Menu da conta de ${user.name}`}
      >
        <UserAvatar user={user} className="size-8" />
        <span className="max-w-[140px] truncate text-sm">{user.username}</span>
        <ChevronDown className="size-4" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="truncate font-normal">
          <span className="block font-medium">{user.name}</span>
          <span className="text-subtle-foreground block text-xs">{user.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/account/profile">
            <User aria-hidden /> Meu perfil
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/account/wallets">
            <Wallet aria-hidden /> Carteiras
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={logout.isPending} onSelect={() => logout.mutate()}>
          <LogOut aria-hidden /> Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
