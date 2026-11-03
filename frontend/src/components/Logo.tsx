import { cn } from '@/lib/utils'

/** Знак: граница участка (контур) с отметкой проверки */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <svg viewBox="0 0 32 32" aria-hidden className="size-8 shrink-0">
        <rect width="32" height="32" rx="8" className="fill-primary" />
        <path d="M8 21.5 11 9l12 2.5L24.5 23 8 21.5Z" fill="none" stroke="white" strokeWidth="2" strokeLinejoin="round" />
        <path d="m12.5 16 2.5 2.5 5-5" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="font-heading text-xl font-semibold tracking-wide text-foreground">ПРАВОЗОР</span>
    </span>
  )
}
