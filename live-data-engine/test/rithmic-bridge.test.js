import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeRithmicQuote } from '../src/adapters/rithmic-bridge.js';

test('maps an actual Rithmic last-trade and BBO update into Northstar events', () => {
  const events = normalizeRithmicQuote({
    type: 'quote',
    data: {
      symbol: 'MNQU6',
      bidPrice: 25000,
      bidSize: 12,
      askPrice: 25000.25,
      askSize: 8,
      updatedAt: '2026-11-10T15:00:00.000Z',
      raw: {
        templateId: 150,
        ssboe: 1794322800,
        tradePrice: 25000.25,
        tradeSize: 3
      }
    }
  });
  assert.equal(events.length, 2);
  assert.equal(events[0].type, 'trade');
  assert.equal(events[0].symbol, 'MNQ');
  assert.equal(events[0].price, 25000.25);
  assert.equal(events[0].quantity, 3);
  assert.equal(events[1].type, 'quote');
  assert.equal(events[1].bid, 25000);
  assert.equal(events[1].ask, 25000.25);
});

test('does not invent trades from BBO-only updates or unsupported symbols', () => {
  const bboOnly = normalizeRithmicQuote({
    type: 'quote',
    data: { symbol: 'NQZ6', bidPrice: 20000, askPrice: 20000.25, updatedAt: '2026-11-10T15:00:00Z', raw: { templateId: 151 } }
  });
  assert.equal(bboOnly.length, 1);
  assert.equal(bboOnly[0].type, 'quote');
  assert.deepEqual(normalizeRithmicQuote({ type: 'quote', data: { symbol: 'ESZ6', raw: { templateId: 150 } } }), []);
});
