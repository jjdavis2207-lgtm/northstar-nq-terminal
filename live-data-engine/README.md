# Northstar Live Data Engine

A separate Node.js service for Northstar, designed to run alongside the existing Northstar terminal as its own Render Web Service.

## Selected data architecture

Target architecture: **CME Group Data Services SBE real-time via Google Cloud Pub/Sub**. CME documents SBE as supporting Market-by-Order (MBO) or 10-level Market Depth for futures. CME's JSON Pub/Sub feed is easier to integrate but provides only top-of-book or up to 2 price levels. The current service code is only a guarded JSON-message gateway; it does not yet decode CME SBE binary messages or fully map CME JSON fields into trades/books. Therefore it is not yet a working full-depth market-data adapter.

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

## Current limitations and verification status

- The Node service and WebSocket gateway are scaffolding, not a completed CME adapter.
- The current subscriber path expects JSON messages and only performs generic symbol detection. It does not yet implement the CME JSON message schema's field-level trade/book decoding.
- SBE is the intended full-depth/MBO target. The service now refuses to subscribe when `CME_FEED_FORMAT=SBE` because the SBE decoder is not implemented; this prevents binary SBE payloads from being misread as JSON and silently discarded.
- Do not enable public broadcasting until CME has approved the public distribution model and the subscriber authentication/entitlement layer is implemented.
- No CME entitlement, Google Cloud subscription, service-account credentials, or redistribution rights are created by this repository.
- Static syntax/dependency validation and a live Pub/Sub integration test have not yet been completed in this environment.
