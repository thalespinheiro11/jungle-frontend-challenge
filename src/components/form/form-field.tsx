import { ChevronDown, Eye, EyeOff } from 'lucide-react'
import { useId, useState, type ComponentProps, type ReactNode } from 'react'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface FieldProps {
  label: string
  /** Visually hide the label (layouts that only show placeholders) while keeping it for AT. */
  hideLabel?: boolean
  /** Shows the Figma asterisk; inputs should set aria-required from the render args. */
  required?: boolean
  error?: string
  hint?: ReactNode
  className?: string
  children: (ids: {
    inputId: string
    describedBy: string | undefined
    invalid: boolean
    required: boolean
  }) => ReactNode
}

/** Label + control + error wired with ids, aria-invalid and aria-describedby. */
export function Field({ label, hideLabel, required = false, error, hint, className, children }: FieldProps) {
  const inputId = useId()
  const errorId = `${inputId}-error`
  const hintId = `${inputId}-hint`
  const describedBy = [error && errorId, hint && hintId].filter(Boolean).join(' ') || undefined

  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={inputId} className={cn(hideLabel && 'sr-only')}>
        {label}
        {required && <Required />}
      </Label>
      {children({ inputId, describedBy, invalid: Boolean(error), required })}
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

/** Native select styled like the inputs (keyboard and screen-reader behaviour for free). */
export function SelectInput({ className, children, ...props }: ComponentProps<'select'>) {
  return (
    <div className="relative">
      <select
        className={cn(
          inputClass,
          'border-input w-full appearance-none rounded-md border px-3 pr-9 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="text-subtle-foreground pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2" aria-hidden />
    </div>
  )
}

export function TextArea({ className, ...props }: ComponentProps<'textarea'>) {
  return (
    <textarea
      className={cn(
        'border-input bg-background placeholder:text-subtle-foreground aria-invalid:border-destructive focus-visible:border-primary min-h-[150px] w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
        className,
      )}
      {...props}
    />
  )
}

/** Required marker as in the Figma (orange asterisk). Inputs convey it with aria-required. */
export function Required() {
  return (
    <span aria-hidden className="text-destructive ml-0.5">
      *
    </span>
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
