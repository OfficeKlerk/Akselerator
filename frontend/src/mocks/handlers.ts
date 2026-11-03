import { delay, http, HttpResponse } from 'msw'
import { API_BASE } from '@/api/client'
import type { CreateCheckPayload, LoginPayload, Purpose, RegisterPayload } from '@/api/types'
import { CADASTRAL_RE } from '@/lib/cadastral'
import { findDemoParcel, findDemoParcelNear } from './demo-data'
import { newId, publicUser, toCheck, withDb } from './db'
import { buildStubPdf } from './pdf'

const api = (path: string) => `${API_BASE}${path}`
const detail = (status: number, message: string) =>
  HttpResponse.json({ detail: message }, { status })

const currentUser = () =>
  withDb((db) => db.users.find((u) => u.id === db.session_user_id) ?? null)

const PURPOSES: Purpose[] = ['warehouse', 'izhs', 'mkd']

export const handlers = [
  // ------------------------------------------------------------ auth
  http.get(api('/auth/me'), async () => {
    await delay(150)
    const user = currentUser()
    return user ? HttpResponse.json(publicUser(user)) : detail(401, 'Не авторизован')
  }),

  http.post(api('/auth/login'), async ({ request }) => {
    await delay(400)
    const { email, password } = (await request.json()) as LoginPayload
    return withDb((db) => {
      const user = db.users.find((u) => u.email === email.toLowerCase() && u.password === password)
      if (!user) return detail(401, 'Неверный email или пароль')
      db.session_user_id = user.id
      return HttpResponse.json(publicUser(user))
    })
  }),

  http.post(api('/auth/register'), async ({ request }) => {
    await delay(500)
    const body = (await request.json()) as RegisterPayload
    if (body.pd_consent !== true) return detail(422, 'Нужно согласие на обработку персональных данных')
    return withDb((db) => {
      const email = body.email.toLowerCase()
      if (db.users.some((u) => u.email === email)) {
        return detail(409, 'Пользователь с таким email уже зарегистрирован')
      }
      const user = {
        id: `u-${Math.random().toString(36).slice(2, 10)}`,
        email,
        password: body.password,
        full_name: body.full_name,
        company: body.company,
      }
      db.users.push(user)
      db.session_user_id = user.id
      return HttpResponse.json(publicUser(user), { status: 201 })
    })
  }),

  http.post(api('/auth/logout'), () => {
    withDb((db) => {
      db.session_user_id = null
    })
    return new HttpResponse(null, { status: 204 })
  }),

  // ------------------------------------------------------------ parcels
  http.get(api('/parcels'), async ({ request }) => {
    await delay(700)
    const cadastral = new URL(request.url).searchParams.get('cadastral_number') ?? ''
    if (!CADASTRAL_RE.test(cadastral)) return detail(422, 'Неверный формат кадастрового номера')
    const demo = findDemoParcel(cadastral)
    return demo
      ? HttpResponse.json(demo.parcel)
      : detail(404, 'Участок не найден в НСПД. Проверьте номер.')
  }),

  http.get(api('/parcels/at-point'), async ({ request }) => {
    await delay(500)
    const q = new URL(request.url).searchParams
    const demo = findDemoParcelNear(Number(q.get('lat')), Number(q.get('lng')))
    return demo
      ? HttpResponse.json(demo.parcel)
      : detail(404, 'В этой точке участок не найден')
  }),

  // ------------------------------------------------------------ checks
  http.get(api('/checks'), async () => {
    await delay(300)
    const user = currentUser()
    if (!user) return detail(401, 'Не авторизован')
    const list = withDb((db) =>
      db.checks
        .filter((c) => c.user_id === user.id)
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .map(toCheck)
        .map(({ report: _r, stage_message: _s, error: _e, ...summary }) => summary),
    )
    return HttpResponse.json(list)
  }),

  http.post(api('/checks'), async ({ request }) => {
    await delay(400)
    const user = currentUser()
    if (!user) return detail(401, 'Не авторизован')
    const body = (await request.json()) as CreateCheckPayload
    if (!CADASTRAL_RE.test(body.cadastral_number)) return detail(422, 'Неверный формат кадастрового номера')
    if (!PURPOSES.includes(body.purpose)) return detail(422, 'Неизвестная цель покупки')
    const check = {
      id: newId(),
      user_id: user.id,
      cadastral_number: body.cadastral_number,
      purpose: body.purpose,
      created_at: new Date().toISOString(),
    }
    withDb((db) => {
      db.checks.push(check)
    })
    return HttpResponse.json({ id: check.id, status: 'queued' }, { status: 202 })
  }),

  http.get(api('/checks/:id'), async ({ params }) => {
    await delay(200)
    const user = currentUser()
    if (!user) return detail(401, 'Не авторизован')
    const check = withDb((db) => db.checks.find((c) => c.id === params.id && c.user_id === user.id))
    return check ? HttpResponse.json(toCheck(check)) : detail(404, 'Проверка не найдена')
  }),

  http.get(api('/checks/:id/report.pdf'), async ({ params }) => {
    await delay(600)
    const user = currentUser()
    if (!user) return detail(401, 'Не авторизован')
    const stored = withDb((db) => db.checks.find((c) => c.id === params.id && c.user_id === user.id))
    if (!stored) return detail(404, 'Проверка не найдена')
    const check = toCheck(stored)
    if (check.status !== 'done') return detail(409, 'Отчёт ещё не готов')
    const pdf = buildStubPdf([
      'PRAVOZOR - demo report',
      `Cadastral number: ${check.cadastral_number}`,
      `Purpose: ${check.purpose}`,
      `Overall risk: ${check.overall_level}`,
      `Risks found: ${check.report?.risks.length ?? 0}`,
      '',
      'This is a placeholder generated by the mock API.',
      'The real PDF is rendered by the backend (Jinja2 + WeasyPrint)',
      'from the same template as the report page.',
    ])
    return new HttpResponse(pdf, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="pravozor-${check.cadastral_number.replaceAll(':', '-')}.pdf"`,
      },
    })
  }),
]

