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

## Independent live CME feed (Databento)

Northstar includes an optional Databento worker so the terminal can receive CME data without logging in to Lucid or Tradeify. The worker subscribes to the CME Globex MDP 3.0 dataset using parent symbols for NQ and MNQ, requests MBP-10 market depth plus definitions, and publishes normalized trade/depth events into Northstar.

### Create a Render Background Worker

Create a **Background Worker** from this same GitHub repository (leave the existing Northstar Web Service in place):

- Runtime: Python
- Build command: `pip install -r requirements.txt`
- Start command: `python server/databento_feed.py`

Set these private environment variables on the Background Worker:

- `DATABENTO_API_KEY` — your Databento API key
- `NORTHSTAR_API_URL` — `https://northstar-nq-terminal-uo6z.onrender.com`
- `NORTHSTAR_INGEST_TOKEN` — exactly the same secret configured on the Northstar Web Service
- `DATABENTO_DATASET` — `GLBX.MDP3`
- `DATABENTO_SCHEMA` — `mbp-10`
- `DATABENTO_SYMBOLS` — `NQ.FUT,MNQ.FUT`

On the existing Northstar Web Service, also set `NORTHSTAR_INGEST_TOKEN` and `NORTHSTAR_ALLOWED_ORIGINS` as described above. Keep the Databento key only on the Background Worker; never add it to Vite/React variables or GitHub.

The worker uses Databento definition records to map changing front-month instrument IDs to NQ/MNQ. It forwards trade prints (with exchange aggressor side) and top-ten aggregated book levels. Northstar then displays them in the Deep Flow workspace.

### Data subscription and licensing

Databento currently lists its Standard plan at $199/month. Its pricing page lists live CME data and personal-use licensing for up to two devices with license fees included on Standard; confirm that your account's CME entitlement explicitly includes the live MBP-10 schema before relying on the Level II panel. The $125 new-account credits are for historical data, not a free live feed. If you plan to display or redistribute live data to students or other users, obtain the appropriate external-distribution rights first; Standard personal-use access is not a student redistribution license.

References: https://databento.com/pricing/ and https://databento.com/docs/api-live

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

The current API keeps its recent candle cache in server memory. It is intended for live streaming and short-session chart history; a Render restart clears that cache. Durable multi-year history requires an authorized historical-data source and persistent storage.

## Important provider limitation

This API is the Northstar-owned receiving layer. It does not itself grant Lucid, Tradeify, Tradovate, CQG, or CME market-data permissions. A firm-approved provider adapter and credentials/authorization are still required to publish real data. The API intentionally displays no invented prices and does not expose order-routing endpoints.

For production, set `NORTHSTAR_ALLOWED_ORIGINS` to the exact Northstar website origin(s), comma-separated. Configure secrets in the hosting provider's private environment settings only.


## TradingView chart integration

Northstar includes an official TradingView Advanced Chart embed for CME_MINI:NQ1! and CME_MINI:MNQ1!. TradingView's hosted widgets use TradingView's own data. TradingView states that paid exchange real-time data subscriptions do not carry over to embedded widgets, so CME data in this embed may be delayed. Use the full TradingView website for data entitlements tied to your TradingView account.

The embedded widget is chart-only. It does not authenticate to Lucid/Tradeify, expose broker balances, or route orders. Northstar's own live chart receives data only from the authenticated `/api/market-data/tick` or `/api/market-data/ingest` routes.

TradingView Advanced Charts (the self-hosted library) is a separate product that requires TradingView approval and its own library license. The library files must not be committed to a public GitHub repository. It also does not include market data; it needs a provider datafeed. Northstar continues to use the open-source Lightweight Charts library for its own live-feed chart.
