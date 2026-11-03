import { FileCheck2, Layers, Scale } from 'lucide-react'
import type { ReactNode } from 'react'
import { Logo } from '@/components/Logo'

const POINTS = [
  { icon: Layers, title: 'Данные из госисточников', text: 'НСПД, зоны с особыми условиями, ПЗЗ' },
  { icon: Scale, title: 'Вывод со ссылкой на норму', text: 'Каждый риск — с основанием и путём решения' },
  { icon: FileCheck2, title: 'Отчёт за минуты', text: 'Светофор рисков на сайте и в PDF' },
]

export function AuthLayout({ title, subtitle, children }: { title: string; subtitle: ReactNode; children: ReactNode }) {
  return (
    <div className="grid min-h-svh lg:grid-cols-[1fr_1.1fr]">
      <aside className="hidden flex-col justify-between bg-primary p-10 text-primary-foreground lg:flex">
        <Logo className="[&_span]:text-primary-foreground [&_rect]:fill-white/15" />
        <div className="max-w-md space-y-8">
          <h2 className="text-4xl leading-tight font-medium">
            Проверка земельного участка перед покупкой
          </h2>
          <ul className="space-y-5">
            {POINTS.map(({ icon: Icon, title: t, text }) => (
              <li key={t} className="flex gap-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white/10">
                  <Icon aria-hidden className="size-5" />
                </span>
                <span>
                  <span className="block font-medium">{t}</span>
                  <span className="block text-sm text-primary-foreground/75">{text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-primary-foreground/60">
          Отчёт рекомендательный и не заменяет юридическое заключение.
        </p>
      </aside>

      <main className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md space-y-8">
          <Logo className="lg:hidden" />
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold">{title}</h1>
            <p className="text-muted-foreground">{subtitle}</p>
          </div>
          {children}
        </div>
      </main>
    </div>
  )
}
