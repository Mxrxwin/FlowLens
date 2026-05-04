# Финальный контракт события

## JSON-пример

События отправляются в `/ingest` с публичным ключом проекта из DSN:

```http
POST /ingest
X-FlowLens-Project-Key: pk_demo
Content-Type: application/json
```

Ключ можно передать и через query-параметр DSN: `/ingest?project_key=pk_demo`.
Backend валидирует ключ по `FLOWLENS_PROJECT_KEYS` и сохраняет его в `events.project_key`.

### Event: `error`
```json
{
  "type": "error",
  "project_key": "pk_demo",
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": 1710000000000,
  "user_agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 ...",
  "region": "Москва",
  "error": {
    "message": "TypeError: cannot read properties of undefined",
    "stack": "TypeError: cannot read properties of undefined\n    at pay (checkout.tsx:42)\n    ...",
    "endpoint": "/api/checkout"
  },
  "preceding_actions": [
    { "type": "click", "target": "button#pay-now" },
    { "type": "navigation", "from": "/catalog", "to": "/checkout" }
  ]
}
```

### Event: `performance`
```json
{
  "type": "performance",
  "project_key": "pk_demo",
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": 1710000000000,
  "user_agent": "Mozilla/5.0 ...",
  "performance": {
    "endpoint": "/api/checkout",
    "lcp": 2400,
    "fid": 120,
    "ttfb": 800,
    "api_response_time": 3100,
    "is_error": false
  }
}
```

### Event: `navigation`
```json
{
  "type": "navigation",
  "project_key": "pk_demo",
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": 1710000000000,
  "user_agent": "Mozilla/5.0 ...",
  "navigation": {
    "from": "/catalog",
    "to": "/checkout"
  }
}
```

---

## Базовые поля (общие для всех событий)

| Поле | Тип | Обязательное | Описание |
|---|---|---|---|
| `type` | `string` enum: `error` \| `performance` \| `navigation` | да | Дискриминатор типа события. Определяет какой блок payload присутствует |
| `project_key` | `string` | нет | Ключ проекта. SDK обычно передаёт его в заголовке `X-FlowLens-Project-Key`, backend проставляет поле сам |
| `session_id` | `string` (UUID v4) | да | Анонимный ID сессии из `localStorage` SDK |
| `timestamp` | `int64` (unix ms) | да | Момент события на клиенте. Конвертируется в `TIMESTAMPTZ` при записи в `events.timestamp` |
| `user_agent` | `string` | да | UA-строка браузера. Парсится на бэке сервиса 2 в `device_type` / `browser` / `os` |
| `region` | `string` | нет | Регион. Резолвится на бэке сервиса 1 через GeoIP+Redis. Симулятор передаёт явно — тогда GeoIP пропускается |

---

## Блок `error` (обязателен при `type=error`)

| Поле | Тип | Обязательное | Описание |
|---|---|---|---|
| `error.message` | `string` | да | Текст исключения. Ключ для группировки в корреляциях |
| `error.stack` | `string` | нет | Stack trace. Может отсутствовать у `unhandledrejection` без Error-объекта |
| `error.endpoint` | `string` | нет | URL запроса, который привёл к ошибке (для сетевых ошибок) или текущий route SPA |

→ маппинг: `errors.message`, `errors.stack_trace`, `errors.endpoint`

---

## Блок `performance` (обязателен при `type=performance`)

| Поле | Тип | Обязательное | Описание |
|---|---|---|---|
| `performance.endpoint` | `string` | да | URL запроса либо route SPA для Web Vitals |
| `performance.lcp` | `int` (мс) | нет | Largest Contentful Paint. Только для navigation-batch |
| `performance.fid` | `int` (мс) | нет | First Input Delay. Только для navigation-batch |
| `performance.ttfb` | `int` (мс) | нет | Time to First Byte. Только для navigation-batch |
| `performance.api_response_time` | `int` (мс) | нет | Длительность axios-запроса. Только для API-events |
| `performance.is_error` | `bool` | нет | `true` если axios-запрос завершился ошибкой. Default `false` |

→ маппинг 1:1 в `performance_metrics`. Хотя бы одна метрика должна присутствовать.

---

## Блок `navigation` (обязателен при `type=navigation`)

| Поле | Тип | Обязательное | Описание |
|---|---|---|---|
| `navigation.from` | `string` | да | Предыдущий route SPA |
| `navigation.to` | `string` | да | Новый route SPA |

→ хранится только в `events.payload` JSONB, отдельной таблицы нет.

---

## Блок `preceding_actions` (только при `type=error`)

Массив длины ≤ 2 (скользящий буфер SDK).

| Поле | Тип | Обязательное | Описание |
|---|---|---|---|
| `preceding_actions[].type` | `string` enum: `click` \| `navigation` | да | Тип действия |
| `preceding_actions[].target` | `string` | да для `click` | CSS-селектор элемента (`button#pay-now`) |
| `preceding_actions[].from` | `string` | да для `navigation` | Откуда перешли |
| `preceding_actions[].to` | `string` | да для `navigation` | Куда перешли |

→ записывается as-is в `errors.preceding_actions` JSONB.

---

## Соответствие БД

| Поле события | Таблица.колонка |
|---|---|
| `type`, `project_key`, `session_id`, `timestamp`, `user_agent`, `region` | `events.*` |
| `user_agent` → парсинг | `events.device_type`, `events.browser`, `events.os` |
| весь JSON события | `events.payload` |
| `error.*` | `errors.message` / `stack_trace` / `endpoint` |
| `preceding_actions` | `errors.preceding_actions` |
| `performance.*` | `performance_metrics.*` (1:1) |
| `navigation.*` | только `events.payload` |

## Транспорт через Redis Streams

В Stream `monitoring-events` пишется тот же JSON как одно поле `data`:
```
XADD monitoring-events * data '{"type":"error",...}'
```
Сервис 2 делает `XREAD BLOCK 0`, парсит `data`, и идёт в processor. Никакой дополнительной обёртки — событие самодостаточно.
