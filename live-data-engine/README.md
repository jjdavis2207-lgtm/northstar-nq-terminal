# Northstar Live Data Engine

A separate, provider-neutral NQ/MNQ market processing service. It runs independently from the main Northstar terminal.

## What is implemented

- Authenticated HTTP ingestion for normalized trade and quote events
- NQ/MNQ symbol normalization and 0.25-point tick validation
- Trade ID deduplication
- In-memory rolling trade history (up to 50,000 trades per symbol)
- UTC-aligned 1-minute, 5-minute, and 15-minute OHLCV candles
- Latest trade/quote snapshots
- REST replay and candle endpoints
- Symbol-filtered WebSocket broadcasting
- Health/status metrics and input validation
- Automated Node.js tests for normalization, candle generation, quote validation, and deduplication

This is a processing engine. It does not create prices, generate exchange transactions, or include a market-data subscription.

## Render deployment

- Repository: `jjdavis2207-lgtm/northstar-nq-terminal`
- Branch: `northstar-live-data-engine`
- Root Directory: `live-data-engine`
- Build Command: `npm install`
- Start Command: `npm start`

The main Northstar website/service is not modified by this branch.

## Render environment variables

Required to enable ingestion:

- `NORTHSTAR_INGEST_TOKEN`: a long random secret. Send it as `Authorization: Bearer <token>` or `x-api-key: <token>`. Do not put it in browser code or commit it to GitHub.

Required before public market-data output:

- `PUBLIC_LIVE_DISTRIBUTION_APPROVED=true`: leave unset/false until the upstream data provider explicitly authorizes Northstar's intended public distribution. This controls public REST market endpoints and WebSocket broadcasts.

No provider credentials, paid service, or CME entitlement are included or created by this code.

## Ingestion contract

Endpoint: `POST /api/ingest/event`

Headers:
- `Content-Type: application/json`
- `Authorization: Bearer YOUR_NORTHSTAR_INGEST_TOKEN`

Trade example:
```json
{
  "id": "provider-trade-unique-id",
  "type": "trade",
  "symbol": "MNQ",
  "timestamp": 1794321000000,
  "price": 25000.25,
  "quantity": 2,
  "side": "buy",
  "source": "authorized-provider-name"
}
```

Quote example:
```json
{
  "id": "provider-quote-unique-id",
  "type": "quote",
  "symbol": "NQ",
  "timestamp": 1794321000000,
  "bid": 25000.00,
  "ask": 25000.25,
  "bidSize": 12,
  "askSize": 8,
  "source": "authorized-provider-name"
}
```

A successful ingest returns HTTP 202. A duplicate trade ID is ignored. Prices must align to the 0.25-point NQ/MNQ tick. Quote events require a valid non-crossed bid/ask. Timestamps may be ISO strings, Unix seconds, or Unix milliseconds.

## Read endpoints

- `GET /health`
- `GET /api/status`
- `GET /api/market/NQ` or `GET /api/market/MNQ`
- `GET /api/candles/NQ?interval=1m&limit=500`
- `GET /api/candles/MNQ?interval=5m&limit=500`
- `GET /api/replay/NQ?limit=500`
- `GET /api/replay/MNQ?limit=500`
- WebSocket: `/ws?symbol=NQ` or `/ws?symbol=MNQ`

The read endpoints and WebSocket broadcasting return/stream market data only when `PUBLIC_LIVE_DISTRIBUTION_APPROVED=true`. Health and status remain readable.

## Important limitations

- No live data provider is connected by default. `/api/status` reports `dataSource: none connected` until an authorized provider is integrated.
- Ingestion data and replay history are in memory and reset on restart/redeploy. This is not durable historical storage.
- Candle intervals are UTC-aligned. They are not yet exchange-session-aware and do not implement settlement, rollover, or holiday calendars.
- This version does not calculate aggressor side from quotes, footprint/delta, MBO, DOM, heatmaps, or institutional order-flow metrics. Those require the corresponding raw provider fields and a verified decoder.
- CME Pub/Sub/SBE is not connected in this version. Its entitlement, schema mapping, decoder, cloud subscription, and distribution approval must be completed against the actual CME product.
- TradingView's private feed is not extracted or scraped. TradingView alert messages are not a substitute for a complete exchange tick/order-book feed.
- No synthetic or sample prices are emitted as live market data.

## Local checks

```bash
npm install
npm run check
npm test
```
