import { useState, type ComponentProps, type ReactNode } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import type { FieldError as RhfFieldError } from 'react-hook-form'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'

interface TextFieldProps extends ComponentProps<typeof Input> {
  id: string
  label: ReactNode
  error?: RhfFieldError
  description?: ReactNode
}

/** Поле формы: видимая подпись, подсказка и ошибка под полем, связанные через aria-describedby */
export function TextField({ id, label, error, description, className, ...inputProps }: TextFieldProps) {
  const describedBy = [description && `${id}-desc`, error && `${id}-error`].filter(Boolean).join(' ')
  return (
    <Field data-invalid={Boolean(error)} className={className}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy || undefined}
        className="h-11 text-base sm:h-10 sm:text-sm"
        {...inputProps}
      />
      {description && <FieldDescription id={`${id}-desc`}>{description}</FieldDescription>}
      <FieldError id={`${id}-error`} errors={[error]} />
    </Field>
  )
}

/** Пароль с кнопкой «показать»: вставка и менеджеры паролей не блокируются */
export function PasswordField(props: Omit<TextFieldProps, 'type'>) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="relative">
      <TextField {...props} type={visible ? 'text' : 'password'} className="[&_input]:pr-11" />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Скрыть пароль' : 'Показать пароль'}
        aria-pressed={visible}
        aria-controls={props.id}
        className="absolute top-[1.85rem] right-1 flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        {visible ? <EyeOff aria-hidden className="size-4" /> : <Eye aria-hidden className="size-4" />}
      </button>
    </div>
  )
}
