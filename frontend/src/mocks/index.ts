import { DEMO_USER } from './credentials'
import { DEMO_PARCELS } from './demo-data'

/** Мок-режим включён в dev, пока не задано VITE_USE_MOCKS=false (бэкенд готов) */
export const MOCKS_ENABLED = import.meta.env.DEV && import.meta.env.VITE_USE_MOCKS !== 'false'

export async function enableMocks() {
  if (!MOCKS_ENABLED) return
  const { network } = await import('virtual:msw')
  const { handlers } = await import('./handlers')
  network.configure({ handlers, onUnhandledFrame: 'bypass' })
  await network.enable()
}

/** Номера демо-участков — подсказка на форме в мок-режиме */
export const DEMO_CADASTRAL_NUMBERS = MOCKS_ENABLED
  ? DEMO_PARCELS.map((p) => p.parcel.cadastral_number)
  : []

/** Предзаполнение формы входа в мок-режиме; в продакшн-сборке вырезается */
export const DEMO_LOGIN = MOCKS_ENABLED ? DEMO_USER : null
