import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { z } from 'zod'
import { useLogin } from '@/api/auth'
import { PasswordField, TextField } from '@/components/TextField'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { FieldGroup } from '@/components/ui/field'
import { DEMO_LOGIN } from '@/mocks'
import { AuthLayout } from './AuthLayout'

const schema = z.object({
  email: z.email('Введите корректный email'),
  password: z.string().min(1, 'Введите пароль'),
})
type Values = z.infer<typeof schema>

/** Возврат только на внутренние страницы — защита от open redirect */
const safeNext = (next: string | null) => (next?.startsWith('/') && !next.startsWith('//') ? next : '/checks')

export function LoginPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const login = useLogin()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: DEMO_LOGIN ?? { email: '', password: '' },
  })

  const onSubmit = (v: Values) =>
    login.mutate(
      { email: v.email.trim(), password: v.password },
      { onSuccess: () => navigate(safeNext(params.get('next')), { replace: true }) },
    )

  return (
    <AuthLayout
      title="Вход"
      subtitle={
        <>
          Нет аккаунта?{' '}
          <Link to="/register" className="font-medium text-primary underline-offset-4 hover:underline">
            Зарегистрироваться
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
        {login.isError && (
          <Alert variant="destructive" role="alert">
            <AlertDescription>{login.error.message}</AlertDescription>
          </Alert>
        )}
        <FieldGroup>
          <TextField
            id="email"
            label="Email"
            type="email"
            autoComplete="email"
            inputMode="email"
            error={errors.email}
            {...register('email')}
          />
          <PasswordField
            id="password"
            label="Пароль"
            autoComplete="current-password"
            error={errors.password}
            {...register('password')}
          />
        </FieldGroup>
        <Button type="submit" className="h-11 w-full text-base" disabled={login.isPending}>
          {login.isPending && <Loader2 aria-hidden className="animate-spin" />}
          Войти
        </Button>
        {DEMO_LOGIN && (
          <p className="text-center text-xs text-muted-foreground">
            Демо-режим: поля заполнены тестовой учётной записью.
          </p>
        )}
      </form>
    </AuthLayout>
  )
}
