# Icon Platform Backend API Documentation

Version: `v1.0.0`  
Base URL: `/api/v1`

---

## 1. Authentication & Security Headers

- **CORS**: Configured via `FRONTEND_ORIGIN` (credentials allowed, methods `GET, HEAD, OPTIONS`).
- **Security Headers**: Standard Helmet CSP, X-Frame-Options, X-Content-Type-Options.
- **Rate Limit Headers**:
  - `X-RateLimit-Limit`: Maximum requests permitted in window.
  - `X-RateLimit-Remaining`: Remaining quota in current window.
  - `Retry-After`: Seconds to wait before retry when 429 is triggered.

---

## 2. Endpoints

### 2.1 Search Icons
`GET /api/v1/icons/search`

#### Query Parameters:
| Name | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `query` or `q` | `string` | **Yes** | Search keyword (1-100 characters). |
| `limit` | `number` | No | Results per page (1-100, default `40`). |
| `start` | `number` | No | Offset start index (default `0`). |
| `prefix` | `string` | No | Restrict search to specific collection (e.g. `lucide`). |
| `category` | `string` | No | Restrict search to specific category. |

#### Success Response (200 OK):
```json
{
  "icons": [
    "lucide:home",
    "heroicons:home",
    "tabler:home"
  ],
  "total": 420,
  "limit": 40,
  "start": 0,
  "collections": {
    "lucide": {
      "name": "Lucide",
      "total": 1400
    }
  }
}
```

---

### 2.2 List Collections
`GET /api/v1/icons/collections`

#### Query Parameters:
| Name | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `prefixes` | `string` | No | Comma-separated list of collection prefixes to filter. |

#### Success Response (200 OK):
```json
{
  "lucide": {
    "name": "Lucide",
    "total": 1400,
    "author": { "name": "Lucide Contributors" },
    "license": { "title": "ISC", "spdx": "ISC" },
    "samples": ["home", "search", "user"]
  }
}
```

---

### 2.3 Collection Details
`GET /api/v1/icons/collections/:prefix`

#### Path Parameters:
- `prefix`: Lowercase alphanumeric collection key (e.g. `lucide`, `heroicons`, `ph`, `ri`).

#### Success Response (200 OK):
```json
{
  "prefix": "lucide",
  "title": "Lucide",
  "total": 1400,
  "categories": {
    "Arrows": ["arrow-left", "arrow-right"],
    "General": ["home", "settings"]
  },
  "uncategorized": []
}
```

---

### 2.4 Get Icon JSON Data
`GET /api/v1/icons/:prefix/:name`

#### Path Parameters:
- `prefix`: Collection key.
- `name`: Icon identifier.

#### Success Response (200 OK):
```json
{
  "width": 24,
  "height": 24,
  "left": 0,
  "top": 0,
  "body": "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"m3 9l9-7l9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z\"/>"
}
```

---

### 2.5 Get Standalone SVG
`GET /api/v1/icons/:prefix/:name/svg`

#### Query Parameters:
| Name | Type | Description |
| :--- | :--- | :--- |
| `color` | `string` | SVG color (hex, rgb, currentColor). |
| `size` | `number` | Width & height (8-1024). |
| `width` | `number` | Custom width. |
| `height` | `number` | Custom height. |
| `download` | `boolean` | Set `true` to trigger attachment download header. |

#### Success Response (200 OK):
`Content-Type: image/svg+xml; charset=utf-8`
```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
  <path fill="none" stroke="currentColor" .../>
</svg>
```

---

### 2.6 Health & Observability
`GET /health` & `GET /api/v1/health`

#### Success Response (200 OK):
```json
{
  "status": "healthy",
  "timestamp": "2026-11-09T18:00:00.000Z",
  "service": "icon-platform-backend",
  "version": "1.0.0",
  "circuitBreaker": {
    "state": "CLOSED",
    "failures": 0
  },
  "metrics": {
    "uptimeSeconds": 3600,
    "totalRequests": 1250,
    "upstreamRequests": 140,
    "avgLatencyMs": 18
  }
}
```
