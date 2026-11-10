# Northstar Live Data Engine

A separate, provider-neutral NQ/MNQ market processing service. It runs independently from the main Northstar terminal.

## What is implemented

- Authenticated HTTP ingestion for normalized trade and quote events
- Optional Rithmic R|Protocol bridge adapter (live last-trade and best-bid/offer updates)
- NQ/MNQ symbol normalization and 0.25-point tick validation
- Trade ID deduplication
- In-memory rolling trade history (up to 50,000 trades per symbol)
- UTC-aligned 1-minute, 5-minute, and 15-minute OHLCV candles
- Latest trade/quote snapshots, REST replay, and symbol-filtered WebSocket output
- Health/status metrics and automated Node.js tests

This service processes real events from an upstream provider. It does not create exchange prices or include market-data entitlements.

## Render deployment

- Repository: `jjdavis2207-lgtm/northstar-nq-terminal`
- Branch: `northstar-live-data-engine`
- Root Directory: `live-data-engine`
- Build Command: `npm install`
- Start Command: `npm start`

The main Northstar website/service is not modified by this branch.

## Rithmic connection (optional)

The adapter connects to the open-source [Rithmic Node.js Market Data API](https://github.com/parbhatc/Rithmic), which speaks Rithmic R|Protocol and exposes normalized quote messages over WebSocket.

Run that bridge as a **private service on the same hosting network** as Northstar. Do not expose its unauthenticated `/ws` or REST endpoints to the public internet. The upstream project currently accepts Rithmic credentials in its own environment; keep them there, never in this repository or browser code.

Configure these Northstar environment variables only after you have valid Rithmic API credentials and market-data entitlement:

- `NORTHSTAR_RITHMIC_BRIDGE_HTTP`: private bridge base URL, e.g. `http://rithmic-bridge:4000`
- `NORTHSTAR_RITHMIC_BRIDGE_WS`: private bridge WebSocket URL, e.g. `ws://rithmic-bridge:4000/ws`

The adapter automatically subscribes to `CME:NQ` and `CME:MNQ`, accepts actual Rithmic last-trade messages and best-bid/offer updates, and normalizes them into Northstar events. It does not infer trades from quote changes. The bridge requires a valid Rithmic login, supported Rithmic system, API access, and exchange entitlements. Rithmic allows one concurrent session per login; connecting may disconnect another platform using the same login.

The connector software is open source; this does not make Rithmic market data free. This setup is not enabled until the bridge URLs are configured.

## Render environment variables

Required to enable external HTTP ingestion:

- `NORTHSTAR_INGEST_TOKEN`: a long random secret. Send it as `Authorization: Bearer <token>` or `x-api-key: <token>`. Never put it in browser code or commit it to GitHub.

Required before public market-data output:

- `PUBLIC_LIVE_DISTRIBUTION_APPROVED=true`: leave unset/false until the upstream provider explicitly authorizes Northstar's intended public distribution. This controls public REST market endpoints and WebSocket broadcasts.

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
  "side": "unknown",
  "source": "authorized-provider-name"
}
```

Quote example:
```json
{
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

## Read endpoints

- `GET /health`
- `GET /api/status`
- `GET /api/market/NQ` or `GET /api/market/MNQ`
- `GET /api/candles/NQ?interval=1m&limit=500`
- `GET /api/candles/MNQ?interval=5m&limit=500`
- `GET /api/replay/NQ?limit=500`
- `GET /api/replay/MNQ?limit=500`
- WebSocket: `/ws?symbol=NQ` or `/ws?symbol=MNQ`

Public read endpoints and WebSocket broadcasts stay disabled unless `PUBLIC_LIVE_DISTRIBUTION_APPROVED=true`. Health and status remain readable.

## Important limitations

- No live provider is connected until the Rithmic bridge URLs and valid credentials/entitlements are configured.
- Ingestion and replay history are in memory and reset on restart/redeploy; this is not durable multi-year storage.
- Candle intervals are UTC-aligned, not yet exchange-session-aware; settlement, rollover, and holiday calendars are not implemented.
- This version does not yet calculate aggressor side, footprint/delta, MBO/DOM, heatmaps, or institutional order-flow metrics. Those need the corresponding licensed raw provider fields and a verified decoder.
- CME Pub/Sub/SBE is not connected. Its schema, entitlement, decoder, and licensing still need separate implementation.
- TradingView private feed extraction/scraping is not supported.
- No synthetic or sample prices are emitted as live market data.

## Local checks

```bash
npm install
npm run check
npm test
```
