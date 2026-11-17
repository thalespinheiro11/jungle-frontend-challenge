import { Eye, EyeOff } from 'lucide-react'
import { useId, useState, type ComponentProps, type ReactNode } from 'react'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface FieldProps {
  label: string
  /** Visually hide the label (layouts that only show placeholders) while keeping it for AT. */
  hideLabel?: boolean
  error?: string
  hint?: ReactNode
  className?: string
  children: (ids: { inputId: string; describedBy: string | undefined; invalid: boolean }) => ReactNode
}

/** Label + control + error wired with ids, aria-invalid and aria-describedby. */
export function Field({ label, hideLabel, error, hint, className, children }: FieldProps) {
  const inputId = useId()
  const errorId = `${inputId}-error`
  const hintId = `${inputId}-hint`
  const describedBy = [error && errorId, hint && hintId].filter(Boolean).join(' ') || undefined

  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={inputId} className={cn(hideLabel && 'sr-only')}>
        {label}
      </Label>
      {children({ inputId, describedBy, invalid: Boolean(error) })}
      {hint && (
        <p id={hintId} className="text-subtle-foreground text-xs">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-destructive flex items-start gap-1 text-xs">
          <span aria-hidden>⚠</span>
          {error}
        </p>
      )}
    </div>
  )
}

const inputClass =
  'bg-background h-11 rounded-md border-border placeholder:text-subtle-foreground aria-invalid:border-destructive focus-visible:border-primary'

export function TextInput({ className, ...props }: ComponentProps<typeof Input>) {
  return <Input className={cn(inputClass, className)} {...props} />
}

export function PasswordInput({ className, ...props }: ComponentProps<typeof Input>) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="relative">
      <Input
        type={visible ? 'text' : 'password'}
        className={cn(inputClass, 'pr-11', className)}
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
        aria-pressed={visible}
        className="text-subtle-foreground hover:text-foreground absolute top-1/2 right-2 grid size-8 -translate-y-1/2 place-items-center rounded"
      >
        {visible ? <Eye className="size-4" aria-hidden /> : <EyeOff className="size-4" aria-hidden />}
      </button>
    </div>
  )
}

/** Form-level error (e.g. invalid credentials, network failure), announced to screen readers. */
export function FormError({ message }: { message?: string | null }) {
  if (!message) return null
  return (
    <p
      role="alert"
      className="border-destructive/50 bg-destructive/10 text-foreground rounded-md border px-3 py-2 text-sm"
    >
      {message}
    </p>
  )
}
