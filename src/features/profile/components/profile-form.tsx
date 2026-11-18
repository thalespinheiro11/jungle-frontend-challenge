import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useForm, type Path } from 'react-hook-form'
import { toast } from 'sonner'

import { Field, FormError, PasswordInput, TextInput } from '@/components/form/form-field'
import { Button } from '@/components/ui/button'
import { applyApiError } from '@/features/session/form-errors'
import type { Profile } from '@/lib/api/contracts'

import { useChangePassword, useUpdateProfile } from '../api'
import { profileFormSchema, type ProfileFormValues } from '../schemas'
import { AvatarField } from './avatar-field'

const PROFILE_FIELDS: Path<ProfileFormValues>[] = ['displayName', 'username', 'email', 'ensName', 'walletNickname']
const PASSWORD_FIELDS: Path<ProfileFormValues>[] = ['currentPassword', 'newPassword']

function valuesOf(profile: Profile): ProfileFormValues {
  return {
    displayName: profile.displayName,
    username: profile.username,
    email: profile.email,
    ensName: profile.ensName,
    walletNickname: profile.walletNickname,
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  }
}

/**
 * "Perfil do colecionador" (Figma frame 08). One "Salvar" as in the layout: it saves the
 * profile when it changed and changes the password when that block is filled — two API
 * calls, each reporting its own result and field errors.
 */
export function ProfileForm({ profile }: { profile: Profile }) {
  const updateProfile = useUpdateProfile()
  const changePassword = useChangePassword()
  const [formError, setFormError] = useState<string | null>(null)
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: valuesOf(profile),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  })
  const { errors, isSubmitting } = form.formState

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null)
    const { dirtyFields } = form.formState
    const profileChanged = PROFILE_FIELDS.some((f) => dirtyFields[f as keyof typeof dirtyFields])
    const passwordRequested = Boolean(values.currentPassword || values.newPassword)

    if (!profileChanged && !passwordRequested) {
      toast.info('Nenhuma alteração para salvar.')
      return
    }

    if (profileChanged) {
      try {
        const saved = await updateProfile.mutateAsync({
          displayName: values.displayName,
          username: values.username,
          email: values.email,
          ensName: values.ensName,
          walletNickname: values.walletNickname,
        })
        // Saved values become the new baseline (keeps the password block as typed).
        form.reset({ ...valuesOf(saved), currentPassword: values.currentPassword, newPassword: values.newPassword, confirmPassword: values.confirmPassword })
        toast.success('Perfil atualizado.')
      } catch (error) {
        setFormError(applyApiError(error, form.setError, PROFILE_FIELDS))
        return
      }
    }

    if (passwordRequested) {
      try {
        await changePassword.mutateAsync({ currentPassword: values.currentPassword, newPassword: values.newPassword })
        form.resetField('currentPassword', { defaultValue: '' })
        form.resetField('newPassword', { defaultValue: '' })
        form.resetField('confirmPassword', { defaultValue: '' })
        toast.success('Senha alterada.')
      } catch (error) {
        setFormError(applyApiError(error, form.setError, PASSWORD_FIELDS))
      }
    }
  })

  const text = (name: Path<ProfileFormValues>, label: string, extra: { type?: string; autoComplete?: string; prefix?: ReactNode } = {}) => (
    <Field label={label} required error={errors[name as keyof typeof errors]?.message}>
      {({ inputId, describedBy, invalid, required }) => {
        const input = (
          <TextInput
            id={inputId}
            type={extra.type ?? 'text'}
            autoComplete={extra.autoComplete ?? 'off'}
            aria-invalid={invalid}
            aria-required={required}
            aria-describedby={describedBy}
            {...form.register(name)}
          />
        )
        return extra.prefix ? (
          <div className="flex gap-2">
            {extra.prefix}
            <div className="flex-1">{input}</div>
          </div>
        ) : (
          input
        )
      }}
    </Field>
  )

  const password = (name: Path<ProfileFormValues>, label: string, autoComplete: string) => (
    <Field label={label} error={errors[name as keyof typeof errors]?.message}>
      {({ inputId, describedBy, invalid }) => (
        <PasswordInput
          id={inputId}
          autoComplete={autoComplete}
          aria-invalid={invalid}
          aria-describedby={describedBy}
          {...form.register(name)}
        />
      )}
    </Field>
  )

  return (
    <form onSubmit={onSubmit} noValidate aria-labelledby="profile-title" className="space-y-8">
      <h2 id="profile-title" className="font-bold">
        Perfil do colecionador
      </h2>
      <FormError message={formError} />

      <div className="grid gap-x-7 gap-y-6 md:grid-cols-2">
        {text('displayName', 'Nome de exibição', { autoComplete: 'name' })}
        {text('username', 'Nome de usuário', { autoComplete: 'username' })}
        {text('email', 'E-mail', { type: 'email', autoComplete: 'email' })}
        {text('ensName', 'Nome ENS', {
          prefix: (
            <span aria-hidden className="border-input text-muted-foreground grid h-11 place-items-center rounded-md border px-3 text-sm">
              .eth
            </span>
          ),
        })}
        {text('walletNickname', 'Apelido da carteira')}
        <AvatarField profile={profile} />
      </div>

      <fieldset className="max-w-[417px] space-y-5">
        <legend className="mb-4 font-bold">Alterar senha</legend>
        <p className="text-subtle-foreground -mt-2 text-xs">
          Preencha apenas se quiser trocar a senha. Mínimo de 8 caracteres, com letras e números.
        </p>
        {password('currentPassword', 'Senha atual', 'current-password')}
        {password('newPassword', 'Nova senha', 'new-password')}
        {password('confirmPassword', 'Confirmar nova senha', 'new-password')}
      </fieldset>

      <Button type="submit" className="h-10 w-[130px] font-bold" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="animate-spin" aria-hidden />}
        Salvar
      </Button>
    </form>
  )
}
