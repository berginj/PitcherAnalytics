# Pitcher Analytics

Azure Static Web App (Vue) with an Azure Functions API for ingesting `session_summary.json`, validating against the shared contract schema, and storing sessions/pitches in Azure Table Storage.

## Layout
- `web/`: Vue 3 + Vite UI
- `api/`: Azure Functions (Node.js) API
- `contracts-shared/`: shared contracts submodule

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
- `POST /api/sessions`: validate, store session + pitches
- `GET /api/sessions`: list sessions
- `GET /api/sessions/{session_id}`: session details + pitches

## Environment variables
- `TABLE_CONNECTION_STRING`: Azure Table Storage connection string
- `AzureWebJobsStorage`: fallback for Functions host
- `SESSION_SCHEMA_PATH`: optional override for schema path
- `LOCAL_DEV_USER_ID`: bypass auth for local dev
