/**
 * Демо-набор для мок-режима. Участки, зоны и выводы УСЛОВНЫЕ и не относятся
 * к реальным объектам — нужны, чтобы показать интерфейс до готовности бэкенда.
 * Ссылки на нормы указывают на реальные акты, но без цитат: цитаты в отчёт
 * подставляет RAG-поиск на бэкенде.
 */
import type { Citation, Parcel, Purpose, Risk, RiskLevel, Zone } from '@/api/types'
import type { Polygon } from 'geojson'

/** Прямоугольник размером wM×hM метров с центром в (lat, lng), смещённый на dx/dy метров */
function rect(lat: number, lng: number, wM: number, hM: number, dxM = 0, dyM = 0): Polygon {
  const mPerDegLat = 111_320
  const mPerDegLng = 111_320 * Math.cos((lat * Math.PI) / 180)
  const cLat = lat + dyM / mPerDegLat
  const cLng = lng + dxM / mPerDegLng
  const dLat = hM / 2 / mPerDegLat
  const dLng = wM / 2 / mPerDegLng
  return {
    type: 'Polygon',
    coordinates: [
      [
        [cLng - dLng, cLat - dLat],
        [cLng + dLng, cLat - dLat],
        [cLng + dLng, cLat + dLat],
        [cLng - dLng, cLat + dLat],
        [cLng - dLng, cLat - dLat],
      ],
    ],
  }
}

const cite = (document: string, article: string | null = null): Citation => ({
  document,
  article,
  quote: null,
  url: null,
})

const GRK = 'Градостроительный кодекс РФ'
const ZK = 'Земельный кодекс РФ'
const VRI = 'Классификатор видов разрешённого использования (приказ Росреестра от 10.11.2020 № П/0412)'
const LEP =
  'Правила установления охранных зон объектов электросетевого хозяйства (постановление Правительства РФ от 24.02.2009 № 160)'
const LAW_172 = 'Федеральный закон от 21.12.2004 № 172-ФЗ «О переводе земель или земельных участков из одной категории в другую»'
const VK = 'Водный кодекс РФ'
const OKN = 'Федеральный закон от 25.06.2002 № 73-ФЗ «Об объектах культурного наследия»'

export interface DemoParcel {
  parcel: Parcel
  center: [number, number]
  zones: Zone[]
  risks: Record<Purpose, Omit<Risk, 'id'>[]>
}

// ---------------------------------------------------------------- Участок 1: склад в производственной зоне
const p1c: [number, number] = [55.902, 37.418]
const p1: DemoParcel = {
  center: p1c,
  parcel: {
    cadastral_number: '50:10:0010317:1234',
    address: 'Московская обл., г.о. Химки, промзона «Северная» (демо)',
    area_m2: 21_600,
    land_category: 'Земли населённых пунктов',
    permitted_use: 'Склад (код 6.9)',
    cadastral_value_rub: 48_600_000,
    geometry: rect(...p1c, 180, 120),
  },
  zones: [
    {
      id: 'z1-p1',
      kind: 'territorial',
      type_label: 'Территориальная зона П-1',
      name: 'Производственная зона (демо)',
      registry_number: '50:10-7.123',
      overlap_area_m2: 21_600,
      overlap_pct: 100,
      geometry: rect(...p1c, 620, 480, 40, 20),
    },
    {
      id: 'z1-lep',
      kind: 'zouit',
      type_label: 'Охранная зона ЛЭП',
      name: 'Охранная зона ВЛ 110 кВ (демо)',
      registry_number: '50:10-6.456',
      overlap_area_m2: 7_200,
      overlap_pct: 33,
      geometry: rect(...p1c, 900, 40, 0, -40),
    },
  ],
  risks: {
    warehouse: [
      {
        level: 'low',
        title: 'Вид разрешённого использования подходит для склада',
        finding:
          'ВРИ участка — «Склад» (6.9); склады входят в основные виды разрешённого использования зоны П-1.',
        basis: [cite(GRK, 'ст. 37'), cite(VRI, 'код 6.9'), cite('ПЗЗ г.о. Химки (демо)', 'регламент зоны П-1')],
        recommendation: 'Можно проектировать склад без изменения ВРИ.',
        zone_ids: ['z1-p1'],
      },
      {
        level: 'medium',
        title: 'Треть участка в охранной зоне ЛЭП',
        finding:
          'Южная часть участка (около 7 200 м², 33 %) попадает в охранную зону воздушной линии 110 кВ.',
        basis: [cite(LEP, 'пп. 8–10'), cite(ZK, 'ст. 105–107')],
        recommendation:
          'Не размещать здания в границах зоны: использовать её под проезды и стоянки. Строительные работы рядом с линией согласовать с сетевой организацией.',
        zone_ids: ['z1-lep'],
      },
    ],
    izhs: [
      {
        level: 'high',
        title: 'Жилой дом не предусмотрен регламентом зоны',
        finding: 'Зона П-1 — производственная; индивидуальное жилищное строительство (2.1) в ней не разрешено.',
        basis: [cite(GRK, 'ст. 37'), cite('ПЗЗ г.о. Химки (демо)', 'регламент зоны П-1')],
        recommendation:
          'Строительство ИЖС возможно только после изменения ПЗЗ (смена территориальной зоны) — длительная процедура с непредсказуемым итогом. Рекомендуется выбрать другой участок.',
        zone_ids: ['z1-p1'],
      },
      {
        level: 'medium',
        title: 'Треть участка в охранной зоне ЛЭП',
        finding: 'Южная часть участка (33 %) попадает в охранную зону воздушной линии 110 кВ.',
        basis: [cite(LEP, 'пп. 8–10')],
        recommendation: 'Жилые постройки в границах зоны не размещать.',
        zone_ids: ['z1-lep'],
      },
    ],
    mkd: [
      {
        level: 'high',
        title: 'Многоквартирный дом не предусмотрен регламентом зоны',
        finding: 'Зона П-1 — производственная; жилая застройка (2.5, 2.6) в ней не разрешена.',
        basis: [cite(GRK, 'ст. 37'), cite(GRK, 'ст. 33'), cite('ПЗЗ г.о. Химки (демо)', 'регламент зоны П-1')],
        recommendation:
          'Нужно изменение ПЗЗ и, как правило, документация по планировке территории. Без этого проект МКД невозможен.',
        zone_ids: ['z1-p1'],
      },
      {
        level: 'medium',
        title: 'Треть участка в охранной зоне ЛЭП',
        finding: 'Южная часть участка (33 %) попадает в охранную зону воздушной линии 110 кВ.',
        basis: [cite(LEP, 'пп. 8–10')],
        recommendation: 'Учесть зону при планировке: здания в её границах не размещать.',
        zone_ids: ['z1-lep'],
      },
    ],
  },
}

// ---------------------------------------------------------------- Участок 2: сельхозземля у реки
const p2c: [number, number] = [55.645, 37.205]
const agriHigh = (what: string): Omit<Risk, 'id'> => ({
  level: 'high',
  title: 'Категория земель не допускает строительство',
  finding: `Участок относится к землям сельскохозяйственного назначения с ВРИ «Растениеводство». ${what} на таких землях не допускается.`,
  basis: [cite(ZK, 'ст. 77–78'), cite(LAW_172), cite(VRI, 'код 1.1')],
  recommendation:
    'Нужен перевод земель в другую категорию (или включение в границы населённого пункта) и затем смена ВРИ. Процедура долгая и не гарантирована — заложите это в сроки и цену сделки.',
  zone_ids: [],
})
const waterMedium: Omit<Risk, 'id'> = {
  level: 'medium',
  title: 'Часть участка в водоохранной зоне',
  finding: 'Западная часть участка (около 30 %) находится в водоохранной зоне реки.',
  basis: [cite(VK, 'ст. 65')],
  recommendation:
    'В границах зоны действуют ограничения (в том числе по размещению стоянок, складов ГСМ, обращению с отходами). Учесть при планировке.',
  zone_ids: ['z2-water'],
}
const p2: DemoParcel = {
  center: p2c,
  parcel: {
    cadastral_number: '50:20:0040205:567',
    address: 'Московская обл., Одинцовский г.о., у д. Ивановка (демо)',
    area_m2: 50_000,
    land_category: 'Земли сельскохозяйственного назначения',
    permitted_use: 'Растениеводство (код 1.1)',
    cadastral_value_rub: 7_500_000,
    geometry: rect(...p2c, 250, 200),
  },
  zones: [
    {
      id: 'z2-water',
      kind: 'zouit',
      type_label: 'Водоохранная зона',
      name: 'Водоохранная зона р. Ивановка (демо)',
      registry_number: '50:20-6.789',
      overlap_area_m2: 15_000,
      overlap_pct: 30,
      geometry: rect(...p2c, 150, 700, -125, 0),
    },
  ],
  risks: {
    warehouse: [agriHigh('Строительство склада'), waterMedium],
    izhs: [agriHigh('Строительство жилого дома'), waterMedium],
    mkd: [agriHigh('Строительство многоквартирного дома'), waterMedium],
  },
}

// ---------------------------------------------------------------- Участок 3: Москва, жилая зона у ОКН
const p3c: [number, number] = [55.7205, 37.402]
const oknMedium: Omit<Risk, 'id'> = {
  level: 'medium',
  title: 'Участок в зоне охраны объекта культурного наследия',
  finding: 'Около 45 % участка входит в зону регулирования застройки объекта культурного наследия.',
  basis: [cite(OKN, 'ст. 34'), cite(ZK, 'ст. 105')],
  recommendation:
    'В зоне действуют ограничения по высоте и облику зданий. Проект нужно согласовать с органом охраны ОКН (в Москве — Мосгорнаследие).',
  zone_ids: ['z3-okn'],
}
const p3: DemoParcel = {
  center: p3c,
  parcel: {
    cadastral_number: '77:07:0013002:42',
    address: 'г. Москва, Западный АО, район Кунцево (демо)',
    area_m2: 6_300,
    land_category: 'Земли населённых пунктов',
    permitted_use: 'Многоэтажная жилая застройка (код 2.6)',
    cadastral_value_rub: 312_000_000,
    geometry: rect(...p3c, 90, 70),
  },
  zones: [
    {
      id: 'z3-zh',
      kind: 'territorial',
      type_label: 'Территориальная зона Ж',
      name: 'Жилая зона (демо)',
      registry_number: '77:07-7.321',
      overlap_area_m2: 6_300,
      overlap_pct: 100,
      geometry: rect(...p3c, 420, 360, -30, 10),
    },
    {
      id: 'z3-okn',
      kind: 'zouit',
      type_label: 'Зона охраны ОКН',
      name: 'Зона регулирования застройки (демо)',
      registry_number: '77:07-6.654',
      overlap_area_m2: 2_835,
      overlap_pct: 45,
      geometry: rect(...p3c, 300, 260, 0, 115),
    },
  ],
  risks: {
    mkd: [
      {
        level: 'low',
        title: 'Вид разрешённого использования подходит для МКД',
        finding: 'ВРИ участка — «Многоэтажная жилая застройка» (2.6); вид входит в основные для жилой зоны.',
        basis: [cite(GRK, 'ст. 37'), cite(VRI, 'код 2.6'), cite('ПЗЗ г. Москвы (демо)', 'регламент зоны Ж')],
        recommendation: 'Изменение ВРИ не требуется. Проверьте предельные параметры (высота, плотность) в регламенте.',
        zone_ids: ['z3-zh'],
      },
      oknMedium,
    ],
    izhs: [
      {
        level: 'medium',
        title: 'ВРИ участка не совпадает с целью',
        finding: 'ВРИ участка — 2.6 (многоэтажная застройка), для жилого дома нужен ВРИ 2.1.',
        basis: [cite(GRK, 'ст. 37, 39'), cite(VRI, 'коды 2.1, 2.6')],
        recommendation:
          'Проверьте, есть ли ВРИ 2.1 среди основных или условно разрешённых видов зоны. Если условно разрешённый — нужна процедура по ст. 39 ГрК РФ с общественными обсуждениями.',
        zone_ids: ['z3-zh'],
      },
      oknMedium,
    ],
    warehouse: [
      {
        level: 'high',
        title: 'Склад не предусмотрен регламентом жилой зоны',
        finding: 'Участок в жилой зоне; склады (6.9) в ней не разрешены.',
        basis: [cite(GRK, 'ст. 37'), cite('ПЗЗ г. Москвы (демо)', 'регламент зоны Ж')],
        recommendation: 'Для склада рекомендуется выбрать участок в производственной или коммунальной зоне.',
        zone_ids: ['z3-zh'],
      },
      oknMedium,
    ],
  },
}

export const DEMO_PARCELS: DemoParcel[] = [p1, p2, p3]

export const findDemoParcel = (cadastral: string) =>
  DEMO_PARCELS.find((p) => p.parcel.cadastral_number === cadastral)

/** Ближайший демо-участок в радиусе ~400 м от точки */
export function findDemoParcelNear(lat: number, lng: number) {
  return DEMO_PARCELS.find(({ center: [cLat, cLng] }) => {
    const dy = (lat - cLat) * 111_320
    const dx = (lng - cLng) * 111_320 * Math.cos((cLat * Math.PI) / 180)
    return Math.hypot(dx, dy) < 400
  })
}

const SEVERITY: Record<RiskLevel, number> = { low: 0, medium: 1, high: 2 }
export const worstLevel = (levels: RiskLevel[]): RiskLevel =>
  levels.reduce<RiskLevel>((acc, l) => (SEVERITY[l] > SEVERITY[acc] ? l : acc), 'low')
