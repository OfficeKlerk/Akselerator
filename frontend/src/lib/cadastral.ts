import { z } from 'zod'

/** Кадастровый номер участка: округ:район:квартал:номер, например 50:10:0010317:1234 */
export const CADASTRAL_RE = /^\d{2}:\d{2}:\d{6,7}:\d{1,7}$/

export const normalizeCadastral = (v: string) => v.replace(/\s+/g, '').replace(/[;.]/g, ':')

export const cadastralSchema = z
  .string()
  .transform(normalizeCadastral)
  .pipe(
    z
      .string()
      .min(1, 'Введите кадастровый номер')
      .regex(CADASTRAL_RE, 'Формат: 50:10:0010317:1234'),
  )

export const isValidCadastral = (v: string) => CADASTRAL_RE.test(normalizeCadastral(v))
