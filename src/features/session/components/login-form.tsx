import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

import { Field, FormError, PasswordInput, TextInput } from '@/components/form/form-field'
import { Button } from '@/components/ui/button'

import { applyApiError } from '../form-errors'
import { useLogin } from '../hooks'
import { loginSchema, type LoginValues } from '../schemas'

export function LoginForm() {
  const login = useLogin()
  const [formError, setFormError] = useState<string | null>(null)
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
    // Validate on submit, then live: blur validation shifts the layout under the pointer.
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  })
  const { errors } = form.formState

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null)
    login.mutate(values, {
      onError: (error) => setFormError(applyApiError(error, form.setError, ['email', 'password'])),
    })
  })

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4" aria-label="Entrar">
      <FormError message={formError} />
      <Field label="E-mail" hideLabel error={errors.email?.message}>
        {({ inputId, describedBy, invalid }) => (
          <TextInput
            id={inputId}
            type="email"
            autoComplete="email"
            placeholder="contato@email.com"
            aria-invalid={invalid}
            aria-describedby={describedBy}
            {...form.register('email')}
          />
        )}
      </Field>
      <Field label="Senha" hideLabel error={errors.password?.message}>
        {({ inputId, describedBy, invalid }) => (
          <PasswordInput
            id={inputId}
            autoComplete="current-password"
            placeholder="Senha"
            aria-invalid={invalid}
            aria-describedby={describedBy}
            {...form.register('password')}
          />
        )}
      </Field>
      <div className="flex justify-end">
        <button
          type="button"
          className="text-primary text-sm underline-offset-4 hover:underline"
          onClick={() => toast.info('A recuperação de senha não está disponível nesta demonstração.')}
        >
          Esqueceu a senha?
        </button>
      </div>
      <Button type="submit" className="h-11 w-full text-base font-bold" disabled={login.isPending}>
        {login.isPending && <Loader2 className="animate-spin" aria-hidden />}
        {login.isPending ? 'Entrando…' : 'Entrar'}
      </Button>
    </form>
  )
}
