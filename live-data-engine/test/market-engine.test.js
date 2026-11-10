import test from 'node:test';
import assert from 'node:assert/strict';
import { ingestMarketEvent, getCandles, getMarketSnapshot, getTrades } from '../src/market-engine.js';

test('normalizes a trade and builds aligned candles', () => {
  const timestamp = Date.UTC(2026, 0, 2, 15, 0, 10);
  const result = ingestMarketEvent({ id: 'test-trade-1', symbol: 'CME_MINI:MNQH6', price: 25000.25, quantity: 3, timestamp, source: 'unit-test' });
  assert.equal(result.ok, true);
  assert.equal(result.event.symbol, 'MNQ');
  const candle = getCandles('MNQ', '1m', 1)[0];
  assert.equal(candle.open, 25000.25);
  assert.equal(candle.close, 25000.25);
  assert.equal(candle.volume, 3);
  assert.equal(getMarketSnapshot('MNQ').latestTrade.id, 'test-trade-1');
});

test('rejects invalid tick increments and crossed quotes', () => {
  assert.equal(ingestMarketEvent({ symbol: 'NQ', price: 100.1, source: 'unit-test' }).ok, false);
  assert.equal(ingestMarketEvent({ type: 'quote', symbol: 'NQ', bid: 101, ask: 100, source: 'unit-test' }).ok, false);
});

test('deduplicates trade IDs', () => {
  const event = { id: 'duplicate-check-1', symbol: 'NQ', price: 20000, quantity: 1, source: 'unit-test' };
  assert.equal(ingestMarketEvent(event).ok, true);
  assert.equal(ingestMarketEvent(event).duplicate, true);
  assert.equal(getTrades('NQ', 5000).filter(t => t.id === event.id).length, 1);
});
