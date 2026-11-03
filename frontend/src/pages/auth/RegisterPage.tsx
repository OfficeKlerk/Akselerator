import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { Controller, useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router'
import { z } from 'zod'
import { useRegister } from '@/api/auth'
import { PasswordField, TextField } from '@/components/TextField'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { AuthLayout } from './AuthLayout'

const schema = z.object({
  full_name: z.string().trim().min(2, 'Укажите имя и фамилию'),
  email: z.email('Введите корректный email'),
  company: z.string().trim().optional(),
  password: z.string().min(8, 'Минимум 8 символов'),
  pd_consent: z.boolean().refine((v) => v, 'Без согласия мы не можем создать аккаунт'),
})
type Values = z.infer<typeof schema>

export function RegisterPage() {
  const navigate = useNavigate()
  const registerUser = useRegister()
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { full_name: '', email: '', company: '', password: '', pd_consent: false },
  })

  const onSubmit = (v: Values) =>
    registerUser.mutate(
      {
        full_name: v.full_name,
        email: v.email.trim(),
        password: v.password,
        company: v.company || null,
        pd_consent: true,
      },
      { onSuccess: () => navigate('/checks/new', { replace: true }) },
    )

  return (
    <AuthLayout
      title="Регистрация"
      subtitle={
        <>
          Уже есть аккаунт?{' '}
          <Link to="/login" className="font-medium text-primary underline-offset-4 hover:underline">
            Войти
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
        {registerUser.isError && (
          <Alert variant="destructive" role="alert">
            <AlertDescription>{registerUser.error.message}</AlertDescription>
          </Alert>
        )}
        <FieldGroup>
          <TextField id="full_name" label="Имя и фамилия" autoComplete="name" error={errors.full_name} {...register('full_name')} />
          <TextField
            id="email"
            label="Рабочий email"
            type="email"
            autoComplete="email"
            inputMode="email"
            error={errors.email}
            {...register('email')}
          />
          <TextField
            id="company"
            label={
              <>
                Компания <span className="font-normal text-muted-foreground">(необязательно)</span>
              </>
            }
            autoComplete="organization"
            error={errors.company}
            {...register('company')}
          />
          <PasswordField
            id="password"
            label="Пароль"
            autoComplete="new-password"
            description="Не короче 8 символов"
            error={errors.password}
            {...register('password')}
          />
          <Controller
            control={control}
            name="pd_consent"
            render={({ field, fieldState }) => (
              <Field orientation="horizontal" data-invalid={fieldState.invalid}>
                <Checkbox
                  id="pd_consent"
                  ref={field.ref}
                  checked={field.value}
                  onCheckedChange={(v) => field.onChange(v === true)}
                  onBlur={field.onBlur}
                  aria-invalid={fieldState.invalid}
                  aria-describedby={fieldState.error ? 'pd_consent-error' : undefined}
                  className="mt-0.5"
                />
                <div className="space-y-1">
                  <FieldLabel htmlFor="pd_consent" className="leading-snug font-normal">
                    Даю согласие на обработку персональных данных в соответствии с 152-ФЗ
                  </FieldLabel>
                  <FieldError id="pd_consent-error" errors={[fieldState.error]} />
                </div>
              </Field>
            )}
          />
        </FieldGroup>
        <Button type="submit" className="h-11 w-full text-base" disabled={registerUser.isPending}>
          {registerUser.isPending && <Loader2 aria-hidden className="animate-spin" />}
          Создать аккаунт
        </Button>
      </form>
    </AuthLayout>
  )
}
