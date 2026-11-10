# Northstar API

Northstar runs its own Node API alongside the Vite-built app.

## Deploy on Render

Use the existing Northstar Render service as a **Web Service** (not a Static Site):

- Build command: `npm install && npm run build`
- Start command: `npm start`
- Health check path: `/api/health`

Set these environment variables in Render's private Environment settings:

- `NORTHSTAR_INGEST_TOKEN` — a long random secret shared only with an authorized feed publisher.
- `NORTHSTAR_ALLOWED_ORIGINS` — `https://northstar-nq-terminal-uo6z.onrender.com`
- `NORTHSTAR_MARKET_DATA_PROVIDER` — optional descriptive provider label.

Do not add API keys or tokens to GitHub. A Render service configured with a different start command will continue to run the old process until its Start Command is changed.

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
- `POST /api/market-data/ingest` — authenticated OHLCV candle ingestion.
- `POST /api/market-data/tick` — authenticated trade-tick ingestion; aggregates ticks into 1m, 2m, 5m, 15m, 30m, 1H, 4H, and 1D candles.
- `/ws/market-data?symbol=MNQ&timeframe=5m` — live candle and connection-status stream.

## Secure feed ingestion

Set `NORTHSTAR_INGEST_TOKEN` as a private environment variable on the API host. Never put it in React/Vite code, a public GitHub file, or a chat message.

An authorized provider-side adapter can publish a validated trade tick (preferred; Northstar aggregates it into supported candles):

```bash
curl -X POST "https://YOUR-NORTHSTAR-HOST/api/market-data/tick" \
  -H "Authorization: Bearer $NORTHSTAR_INGEST_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"provider":"AUTHORIZED_PROVIDER","symbol":"MNQ","price":25000,"size":1,"timestamp":1794312000000}'
```

The sample tick values are illustrative test values, not live market data. The timestamp is Unix milliseconds.

An authorized provider-side adapter can also publish a validated candle:

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


## TradingView chart integration

Northstar includes an official TradingView Advanced Chart embed for CME_MINI:NQ1! and CME_MINI:MNQ1!. TradingView's hosted widgets use TradingView's own data. TradingView states that paid exchange real-time data subscriptions do not carry over to embedded widgets, so CME data in this embed may be delayed. Use the full TradingView website for data entitlements tied to your TradingView account.

The embedded widget is chart-only. It does not authenticate to Lucid/Tradeify, expose broker balances, or route orders. Northstar's own live chart receives data only from the authenticated `/api/market-data/tick` or `/api/market-data/ingest` routes.

TradingView Advanced Charts (the self-hosted library) is a separate product that requires TradingView approval and its own library license. The library files must not be committed to a public GitHub repository. It also does not include market data; it needs a provider datafeed. Northstar continues to use the open-source Lightweight Charts library for its own live-feed chart.
