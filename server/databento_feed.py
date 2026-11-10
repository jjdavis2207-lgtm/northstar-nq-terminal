"""Databento -> Northstar live CME order-flow bridge.

Run as a Render Background Worker. Keep all API keys in private environment variables.
"""
import os
import queue
import threading
import time
import logging
from datetime import datetime, timezone

import databento as db
import requests

logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"), format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("northstar-databento")

API_URL = os.environ["NORTHSTAR_API_URL"].rstrip("/")
TOKEN = os.environ["NORTHSTAR_INGEST_TOKEN"]
DATABENTO_KEY = os.environ["DATABENTO_API_KEY"]
SYMBOLS = [s.strip().upper() for s in os.getenv("DATABENTO_SYMBOLS", "NQ.FUT,MNQ.FUT").split(",") if s.strip()]
DATASET = os.getenv("DATABENTO_DATASET", "GLBX.MDP3")
SCHEMA = os.getenv("DATABENTO_SCHEMA", "mbp-10")

if not SYMBOLS:
    raise RuntimeError("Set DATABENTO_SYMBOLS, e.g. NQ.FUT,MNQ.FUT")

events = queue.Queue(maxsize=20000)
instrument_symbols = {}
session = requests.Session()
session.headers.update({"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"})

def enum_text(value):
    if isinstance(value, bytes):
        return value.decode("ascii", errors="ignore").upper()
    raw = getattr(value, "value", value)
    if isinstance(raw, bytes):
        return raw.decode("ascii", errors="ignore").upper()
    return str(raw).split(".")[-1].upper()

def scaled_price(value):
    return float(value) / 1_000_000_000

def get_field(record, name, default=0):
    try:
        return getattr(record, name)
    except (AttributeError, TypeError):
        return default

def enqueue_event(payload):
    try:
        events.put_nowait(payload)
    except queue.Full:
        log.error("Northstar publish queue full; dropping event to protect feed process")

def on_record(record):
    # Parent-symbol mapping messages identify each currently listed front-month contract.
    if isinstance(record, db.SymbolMappingMsg):
        parent_symbol = str(getattr(record, "stype_in_symbol", "")).upper()
        instrument_id = int(getattr(record, "instrument_id", 0))
        if instrument_id and parent_symbol.startswith("MNQ"):
            instrument_symbols[instrument_id] = "MNQ"
        elif instrument_id and parent_symbol.startswith("NQ"):
            instrument_symbols[instrument_id] = "NQ"
        log.info("Resolved %s instrument_id=%s", parent_symbol, instrument_id)
        return

    # Databento MBP-10 prices are fixed-point integers with 1e-9 scale.
    ts_ns = int(get_field(record, "ts_event", 0))
    if not ts_ns:
        return
    timestamp_ms = ts_ns // 1_000_000
    instrument_id = int(get_field(record, "instrument_id", 0))
    raw_symbol = enum_text(get_field(record, "raw_symbol", get_field(record, "symbol", "")))
    if raw_symbol and instrument_id:
        if raw_symbol.startswith("MNQ"):
            instrument_symbols[instrument_id] = "MNQ"
        elif raw_symbol.startswith("NQ"):
            instrument_symbols[instrument_id] = "NQ"
    symbol = instrument_symbols.get(instrument_id)
    if symbol is None:
        return

    action = enum_text(get_field(record, "action", ""))
    side = enum_text(get_field(record, "side", ""))
    price_raw = int(get_field(record, "price", 0))
    size = int(get_field(record, "size", 0))

    if action in ("T", "TRADE") and price_raw > 0 and size > 0:
        aggressor = "buy" if side in ("B", "BID") else "sell" if side in ("A", "ASK") else "unknown"
        enqueue_event({
            "kind": "trade", "symbol": symbol, "timestamp": timestamp_ms,
            "price": scaled_price(price_raw), "size": size, "aggressor": aggressor,
            "provider": "Databento CME GLBX.MDP3"
        })

    # Publish the current top 10 aggregated bid/ask levels from MBP-10 records.
    bids, asks = [], []
    for level in range(10):
        bid_px = int(get_field(record, f"bid_px_{level:02d}", 0))
        ask_px = int(get_field(record, f"ask_px_{level:02d}", 0))
        bid_sz = int(get_field(record, f"bid_sz_{level:02d}", 0))
        ask_sz = int(get_field(record, f"ask_sz_{level:02d}", 0))
        if bid_px > 0:
            bids.append({"price": scaled_price(bid_px), "size": bid_sz})
        if ask_px > 0:
            asks.append({"price": scaled_price(ask_px), "size": ask_sz})
    if bids or asks:
        enqueue_event({
            "kind": "book", "symbol": symbol, "timestamp": timestamp_ms,
            "bids": bids, "asks": asks, "provider": "Databento CME GLBX.MDP3"
        })

def publish_loop():
    endpoint = f"{API_URL}/api/orderflow/ingest"
    while True:
        payload = events.get()
        try:
            response = session.post(endpoint, json=payload, timeout=5)
            if response.status_code not in (200, 202):
                log.error("Northstar rejected event (%s): %s", response.status_code, response.text[:300])
            elif payload["kind"] == "trade":
                # The standard candle endpoint receives the same actual trade ticks.
                session.post(f"{API_URL}/api/market-data/tick", json={
                    "provider": "Databento CME GLBX.MDP3",
                    "symbol": payload["symbol"],
                    "price": payload["price"],
                    "size": payload["size"],
                    "timestamp": payload["timestamp"]
                }, timeout=5).raise_for_status()
        except requests.RequestException as exc:
            log.warning("Could not publish to Northstar API: %s", exc)
            time.sleep(0.25)
        finally:
            events.task_done()

def main():
    threading.Thread(target=publish_loop, daemon=True).start()
    client = db.Live(key=DATABENTO_KEY)
    client.subscribe(
        dataset=DATASET,
        schema=SCHEMA,
        stype_in="parent",
        symbols=SYMBOLS,
    )
    client.add_callback(on_record)
    log.info("Subscribing to %s %s for %s", DATASET, SCHEMA, ",".join(SYMBOLS))
    client.start()
    client.block_for_close()

if __name__ == "__main__":
    main()
