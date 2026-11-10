# Northstar API

Northstar runs its own Node API alongside the Vite-built app.

## Run locally

```bash
npm install
npm run dev
```

In a second terminal:

```bash
npm run start
```

The Vite development server proxies `/api` and `/ws` to the API on port 8787.

## API routes

- `GET /api/health` — service health.
- `GET /api/market-data/status` — whether an authorized publisher has sent a recent bar.
- `GET /api/market-data/history?symbol=MNQ&timeframe=5m` — recent stored candles.
- `POST /api/market-data/ingest` — authenticated candle ingestion.
- `/ws/market-data?symbol=MNQ&timeframe=5m` — live candle and connection-status stream.

## Secure feed ingestion

Set `NORTHSTAR_INGEST_TOKEN` as a private environment variable on the API host. Never put it in React/Vite code, a public GitHub file, or a chat message.

An authorized provider-side adapter can publish a validated candle:

```bash
curl -X POST "https://YOUR-NORTHSTAR-HOST/api/market-data/ingest" \
  -H "Authorization: Bearer $NORTHSTAR_INGEST_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "AUTHORIZED_PROVIDER",
    "symbol": "MNQ",
    "timeframe": "5m",
    "bar": {
      "time": 1794312000,
      "open": 25000,
      "high": 25010,
      "low": 24995,
      "close": 25005,
      "volume": 120
    }
  }'
```

The sample values above are illustrative test payload values, not live market prices. Do not publish them to a live trading workspace.

## Important provider limitation

This API is the Northstar-owned receiving layer. It does not itself grant Lucid, Tradeify, Tradovate, CQG, or CME market-data permissions. A firm-approved provider adapter and credentials/authorization are still required to publish real data. The API intentionally displays no invented prices and does not expose order-routing endpoints.

For production, set `NORTHSTAR_ALLOWED_ORIGINS` to the exact Northstar website origin(s), comma-separated. Configure secrets in the hosting provider's private environment settings only.
