# Northstar Live Data Engine

A separate Node.js service for Northstar, designed to run alongside the existing Northstar terminal as its own Render Web Service.

## Selected data architecture

Primary target: **CME Group Data Services real-time data through Google Cloud Pub/Sub**. CME documents this service as supporting trades and up to the full order book. This is the preferred architecture for advanced NQ/MNQ order-flow work, rather than the simpler CME WebSocket API's one-deep top-of-book feed.

Official entry points:
- https://dataservices.cmegroup.com/pages/home
- https://www.cmegroup.com/market-data/real-time-futures-and-options-data-api.html

## Render deployment

Create a second Render Web Service from the same GitHub repository:

- Branch: `northstar-live-data-engine`
- Root Directory: `live-data-engine`
- Build Command: `npm install`
- Start Command: `npm start`

The existing Northstar service remains on its current branch/service and is not replaced by this service.

## Required environment

- `GOOGLE_CLOUD_PROJECT`: Google Cloud project ID receiving the CME Pub/Sub feed.
- `CME_PUBSUB_SUBSCRIPTION`: Pub/Sub subscription name provisioned for the CME data product.
- `GOOGLE_APPLICATION_CREDENTIALS`: path to a Google service-account credential file, or configure Render's supported secret-file mechanism / workload identity. Never commit credentials.
- `PUBLIC_LIVE_DISTRIBUTION_APPROVED`: leave `false` until CME confirms in writing that Northstar may redistribute the selected live data and derived displays to its intended public audience. Set to `true` only after approval.

## Endpoints

- `GET /health`
- `GET /api/status`
- `WS /ws?symbol=NQ`
- `WS /ws?symbol=MNQ`

The service preserves the original JSON message payload. CME's actual Pub/Sub schema and the provisioned topic format must be confirmed against the specific data product before writing final field-level trade, MBO, footprint, or DOM decoders. It deliberately does not fabricate price, aggressor side, order IDs, depth, or timestamps.

## Current limitations

This is the independent service scaffold and Pub/Sub subscriber. It does not create CME entitlements, a Google Cloud subscription, API credentials, or redistribution rights. Until those are provisioned, the service reports that it is waiting and does not claim to be live. Public WebSocket broadcasting is disabled by default.
