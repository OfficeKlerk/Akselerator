import { Link } from 'react-router'
import { Logo } from '@/components/Logo'
import { Button } from '@/components/ui/button'
import { useTitle } from '@/lib/use-title'

export function NotFoundPage() {
  useTitle('Страница не найдена')
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 px-6 text-center">
      <Logo />
      <div className="space-y-2">
        <h1 className="text-4xl font-semibold">Страница не найдена</h1>
        <p className="text-muted-foreground">Возможно, ссылка устарела или в адресе опечатка.</p>
      </div>
      <Button asChild className="h-11 px-5 text-base">
        <Link to="/checks">К моим проверкам</Link>
      </Button>
    </main>
  )
}
