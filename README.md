# Pitcher Analytics

Azure Static Web App (Vue) with an Azure Functions API for analyzing pitch tracking data from [PitchTracker](https://github.com/berginj/PitchTracker). Supports uploading session data as JSON or ZIP files, validates against the shared contract schema, and stores sessions/pitches in Azure Table Storage with comprehensive metrics including rotation (RPM), spin efficiency, and trajectory data.

## Features

- **Multiple Upload Formats**: Accepts both JSON (`session_summary.json`) and ZIP exports from PitchTracker
- **Comprehensive Metrics**: Speed, break (run/rise), zone location, rotation (RPM), spin efficiency, spin axis, confidence scores
- **Advanced Analytics**: Strike/ball counts, heatmaps with outside zone tracking, pitch-by-pitch analysis
- **Data Export**: Export to CSV (spreadsheet analysis) or JSON (backup/sharing)
- **Real-time Monitoring**: Azure Application Insights integration for performance tracking
- **Security**: Rate limiting (100 req/min), OData injection protection, Azure Entra ID authentication

## Layout
- `web/`: Vue 3 + Vite UI
- `api/`: Azure Functions (Node.js) API
- `contracts-shared/`: shared contracts submodule

## Data Formats

### Supported Uploads
1. **JSON Format** (`session_summary.json`):
   - Direct upload of session summary with pitch array
   - Supports both snake_case (PitchTracker) and camelCase field names

2. **ZIP Format** (PitchTracker exports):
   - Contains `manifest.json` with session metadata
   - Contains `session_summary.json` with aggregated data
   - Optional: Individual pitch folders with detailed trajectory data
   - Automatically extracts and merges data from all sources

### Supported Metrics
- **Basic**: Speed (mph), horizontal break (run), vertical break (rise), zone coordinates
- **Rotation**: RPM, spin axis (degrees), spin efficiency (%)
- **Trajectory**: Plate crossing coordinates (X/Z), release point (height/side), extension
- **Quality**: Confidence scores for tracking accuracy

## Auth (Entra ID)
Update `staticwebapp.config.json` with your Entra tenant/client values and set the `AAD_CLIENT_SECRET` app setting in Azure Static Web Apps.

## Local development
1. Set the Table Storage connection string.
   - `api/local.settings.json` includes placeholders.
   - Environment variables take precedence.

2. Install dependencies:

```bash
cd web
npm install

cd ..\api
npm install
```

3. Run locally (two terminals):

```bash
cd api
func start
```

```bash
cd web
npm run dev
```

If you want to exercise SWA auth locally, use the SWA CLI and point it at `web` + `api`.

## API

### Endpoints
- `POST /api/sessions`: validate, store session + pitches
- `GET /api/sessions`: list sessions
- `GET /api/sessions/{session_id}`: session details + pitches

### Documentation
Full API documentation is available in OpenAPI 3.0 format: [`api/openapi.yaml`](api/openapi.yaml)

You can view this documentation using:
- [Swagger Editor](https://editor.swagger.io/) - paste the YAML content
- [Redoc](https://github.com/Redocly/redoc) - for beautiful HTML documentation
- Any OpenAPI-compatible tool

### Rate Limiting
- **Limit**: 100 requests per minute per authenticated user
- **Response Headers**: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
- **429 Response**: Returned when limit exceeded with `Retry-After` header

### Security
- All endpoints require Azure Entra ID authentication
- OData injection protection with input validation
- Generic error messages (detailed errors logged server-side only)
- Security headers configured in `staticwebapp.config.json`

## Environment variables

### Required
- `TABLE_CONNECTION_STRING`: Azure Table Storage connection string (or `AzureWebJobsStorage` as fallback)

### Optional
- `SESSION_SCHEMA_PATH`: Override path to session summary JSON schema
- `APPLICATIONINSIGHTS_CONNECTION_STRING`: Azure Application Insights connection string for monitoring
- `NODE_ENV`: Environment mode (`development`, `test`, `production`)

### Development Only
- `LOCAL_DEV_USER_ID`: Bypass authentication for local development (automatically disabled in production)

## Monitoring

Application Insights provides:
- Automatic request/response tracking
- Exception logging
- Custom events (rate limit violations, session uploads)
- Performance metrics
- Dependency tracking (Azure Table Storage calls)

To enable monitoring, set the `APPLICATIONINSIGHTS_CONNECTION_STRING` environment variable.
