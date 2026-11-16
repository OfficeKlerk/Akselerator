# ПРАВОЗОР — фронтенд

Личный кабинет: проверка земельного участка по кадастровому номеру → отчёт о рисках со светофором,
основаниями и путями решения.

**Стек** (по ТЗ «Конспект: техническая часть»): TypeScript, React + Vite, React Router, TanStack Query,
Tailwind CSS + shadcn/ui, React Hook Form + Zod, Leaflet + react-leaflet (GeoJSON, подложка OpenStreetMap).
Дизайн-система — [`design-system/pravozor/MASTER.md`](../design-system/pravozor/MASTER.md).

## Запуск

```bash
npm install
npm run dev
```

Пока бэкенда нет, в dev-режиме API отвечает мок (MSW): запросы уходят обычным `fetch`, их
перехватывает Service Worker. Демо-учётка подставляется в форму входа сама
(`src/mocks/credentials.ts`); демо-участки — кнопками на форме новой проверки.
Сбросить мок-данные: `localStorage.removeItem('pravozor-mock-db')` в консоли браузера.

## Подключение к бэкенду (FastAPI)

Бэкенд поднимается из корня репозитория (`docker compose up`, см. корневой README) и слушает порт 8000.

```bash
VITE_USE_MOCKS=false npm run dev
```

Запросы `/api` проксируются на `http://localhost:8000` (другой адрес — переменная `API_URL`).
В продакшн-сборке (`npm run build`) моков нет: Nginx отдаёт `dist/` и проксирует `/api` на бэкенд —
фронт и API на одном домене, поэтому cookie авторизации работает без CORS.

## Контракт API

Типы — [`src/api/types.ts`](src/api/types.ts) (snake_case, как отдаёт Pydantic). Ошибки — стандартный
формат FastAPI `{ "detail": "текст" }`; текст `detail` показывается пользователю как есть, поэтому он
должен быть на русском.

| Метод | Путь | Ответ | Примечание |
|---|---|---|---|
| `POST` | `/api/auth/register` | `User` (201) | `RegisterPayload`, `pd_consent: true` обязателен (152-ФЗ); ставит cookie |
| `POST` | `/api/auth/login` | `User` | ставит httpOnly-cookie с JWT; 401 — неверный логин |
| `POST` | `/api/auth/logout` | 204 | сбрасывает cookie |
| `GET` | `/api/auth/me` | `User` | 401, если сессии нет |
| `GET` | `/api/parcels?cadastral_number=` | `Parcel` | предпросмотр из НСПД; 404 — не найден |
| `GET` | `/api/parcels/at-point?lat=&lng=` | `Parcel` | участок под точкой на карте; 404 — нет участка |
| `GET` | `/api/checks` | `CheckSummary[]` | проверки пользователя, новые сверху |
| `POST` | `/api/checks` | `CreateCheckResponse` (202) | ставит задачу в Celery и сразу отвечает |
| `GET` | `/api/checks/{id}` | `Check` | фронт опрашивает каждые 2 с, пока `status` не `done`/`failed` |
| `GET` | `/api/checks/{id}/report.pdf` | `application/pdf` | WeasyPrint; 409 — отчёт ещё не готов |

Статусы проверки: `queued → collecting → analyzing → done | failed`. В `stage_message` можно отдавать
текущий шаг для пользователя («Запрашиваем данные НСПД»), в `error` — причину `failed`.
Геометрии (`Parcel.geometry`, `Zone.geometry`) — GeoJSON `Polygon`/`MultiPolygon` в WGS 84 (EPSG:4326):
`ST_AsGeoJSON(ST_Transform(geom, 4326))`.

## Структура

```
src/
  api/          клиент, типы контракта, хуки TanStack Query
  components/   общие компоненты (карта, светофор, каркас) и ui/ из shadcn
  pages/        вход/регистрация, список проверок, новая проверка, отчёт
  lib/          справочники, форматирование, валидация кадастрового номера
  mocks/        мок-API (MSW) и демо-данные — только для разработки
```
