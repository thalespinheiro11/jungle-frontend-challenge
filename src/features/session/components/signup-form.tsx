import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'

import { Field, FormError, PasswordInput, TextInput } from '@/components/form/form-field'
import { Button } from '@/components/ui/button'

import { applyApiError } from '../form-errors'
import { useSignup } from '../hooks'
import { signupSchema, type SignupValues } from '../schemas'

export function SignupForm({ submitLabel = 'Criar conta' }: { submitLabel?: string }) {
  const signup = useSignup()
  const [formError, setFormError] = useState<string | null>(null)
  const form = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { username: '', email: '', password: '', confirmPassword: '' },
    mode: 'onTouched',
  })
  const { errors } = form.formState

  const onSubmit = form.handleSubmit(({ username, email, password }) => {
    setFormError(null)
    signup.mutate(
      { username, email, password },
      {
        onError: (error) =>
          setFormError(applyApiError(error, form.setError, ['username', 'email', 'password'])),
      },
    )
  })

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4" aria-label="Criar conta">
      <FormError message={formError} />
      <Field label="Nome de usuário" hideLabel error={errors.username?.message}>
        {({ inputId, describedBy, invalid }) => (
          <TextInput
            id={inputId}
            autoComplete="username"
            placeholder="Nome de usuário"
            aria-invalid={invalid}
            aria-describedby={describedBy}
            {...form.register('username')}
          />
        )}
      </Field>
      <Field label="E-mail" hideLabel error={errors.email?.message}>
        {({ inputId, describedBy, invalid }) => (
          <TextInput
            id={inputId}
            type="email"
            autoComplete="email"
            placeholder="Digite seu e-mail"
            aria-invalid={invalid}
            aria-describedby={describedBy}
            {...form.register('email')}
          />
        )}
      </Field>
      <Field
        label="Senha"
        hideLabel
        error={errors.password?.message}
        hint={errors.password ? undefined : 'Mínimo de 8 caracteres, com letras e números.'}
      >
        {({ inputId, describedBy, invalid }) => (
          <PasswordInput
            id={inputId}
            autoComplete="new-password"
            placeholder="Senha"
            aria-invalid={invalid}
            aria-describedby={describedBy}
            {...form.register('password')}
          />
        )}
      </Field>
      <Field label="Confirmar senha" hideLabel error={errors.confirmPassword?.message}>
        {({ inputId, describedBy, invalid }) => (
          <PasswordInput
            id={inputId}
            autoComplete="new-password"
            placeholder="Confirmar senha"
            aria-invalid={invalid}
            aria-describedby={describedBy}
            {...form.register('confirmPassword')}
          />
        )}
      </Field>
      <Button type="submit" className="mt-2 h-11 w-full text-base font-bold" disabled={signup.isPending}>
        {signup.isPending && <Loader2 className="animate-spin" aria-hidden />}
        {signup.isPending ? 'Criando…' : submitLabel}
      </Button>
    </form>
  )
}
