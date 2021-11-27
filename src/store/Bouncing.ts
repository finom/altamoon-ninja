import * as api from 'altamoon-binance-api';
import { without } from 'lodash';
import { listenChange } from 'use-change';
import { BouncingOrder, BouncingOrderId } from './types';

// https://themushroomkingdom.net/media/smb/wav
const jumpSound = new Audio('https://themushroomkingdom.net/sounds/wav/smb/smb_bump.wav');

export default class NinjaBouncing {
  #subscriptions: Record<BouncingOrderId, () => void> = {};

  #store: EnhancedRootStore;

  constructor(store: EnhancedRootStore) {
    this.#store = store;

    store.ninja.persistent.bouncingOrders.map(({ id }) => this.#subscribe(id));

    listenChange(store.persistent, 'symbol', this.#onSymbolChange);

    this.#onSymbolChange();
  }

  #onSymbolChange = () => {
    const { symbol } = this.#store.persistent;
    this.#store.ninja.persistent.lastUsedSymbols = [symbol].concat(
      without(this.#store.ninja.persistent.lastUsedSymbols, symbol),
    ).slice(0, 30);
  };

  public createBouncingOrder = () => {
    const id = new Date().toISOString();
    const bouncingOrder: BouncingOrder = {
      id,
      isEnabled: false,
      symbol: this.#store.persistent.symbol,
      side: 'BUY',
      candlesInterval: this.#store.persistent.interval,
      reduceOnly: false,
      valueStr: '',
    };

    this.#store.ninja.persistent.bouncingOrders = [
      ...this.#store.ninja.persistent.bouncingOrders, bouncingOrder,
    ];

    this.#subscribe(id);
  };

  public deleteBouncingOrder = (id: BouncingOrderId) => {
    this.#unsubscribe(id);

    this.#store.ninja.persistent.bouncingOrders = this.#store.ninja.persistent.bouncingOrders
      .filter((o) => o.id !== id);
  };

  public resubscribe = (id: string) => {
    this.#unsubscribe(id);
    this.#subscribe(id);
  };

  #unsubscribe = (id: BouncingOrderId) => {
    this.#subscriptions[id]();
    delete this.#subscriptions[id];
  };

  #subscribe = (id: BouncingOrderId) => {
    const bouncingOrder = this.#store.ninja.persistent.bouncingOrders.find((o) => o.id === id);

    if (!bouncingOrder) throw new Error(`Unable to find bouncing order ${id}`);

    const { symbol, candlesInterval } = bouncingOrder;

    const unsubscribe = api.futuresChartSubscribe({
      symbol,
      interval: candlesInterval,
      callback: (origCandles) => this.#subscriptionCallback(id, origCandles),
      limit: 99,
      firstTickFromCache: false,
    });

    this.#subscriptions[id] = unsubscribe;
  };

  #subscriptionCallback = (id: BouncingOrderId, origCandles: api.FuturesChartCandle[]) => {
    const bouncingOrder = this.#store.ninja.persistent.bouncingOrders.find((o) => o.id === id);

    if (!bouncingOrder) throw new Error(`Unable to find bouncing order ${id}`);

    if (!bouncingOrder.isEnabled) return;
    const candles = NinjaBouncing.smoozCandles(origCandles);
    const lastCandle = candles[candles.length - 1];

    const {
      symbol, side, reduceOnly, valueStr,
    } = bouncingOrder;
    const price = lastCandle.close;
    const size = this.#store.trading.calculateSizeFromString(
      symbol, valueStr,
    );

    if (!lastCandle || !size || !price) return;

    const quantity = this.#store.trading.calculateQuantity({
      symbol, price, size,
    });

    const { direction, time } = lastCandle;

    // ignore fresh candles
    if (time + 3000 > Date.now()) return;

    if ((side === 'BUY' && direction === 'UP') || (side === 'SELL' && direction === 'DOWN')) {
      // eslint-disable-next-line no-console
      console.info('BOUNCED ORDER TRIGGERED', lastCandle);
      void this.#store.trading.marketOrder({
        side, reduceOnly, quantity, symbol,
      });

      if (this.#store.ninja.persistent.bouncingSoundsOn) void jumpSound.play();

      this.#store.ninja.persistent.bouncingOrders = this.#store.ninja.persistent.bouncingOrders.map(
        (o) => (o.id === id ? { ...o, isEnabled: false } : o),
      );
    }
  };

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  private static candlesToHeikinAshi = (candles: api.FuturesChartCandle[]) => {
    const newCandles: api.FuturesChartCandle[] = [];
    for (let i = 0; i < candles.length; i += 1) {
      const {
        open, close, high, low,
      } = candles[i];
      const previous = newCandles[i - 1] as api.FuturesChartCandle | undefined;

      const newClose = (+open + +close + +high + +low) / 4;
      const newOpen = previous
        ? (+previous.open + +previous.close) / 2
        : (+open + +close) / 2;
      const newHigh = Math.max(high, newOpen, newClose);
      const newLow = Math.min(low, newOpen, newClose);

      newCandles[i] = {
        ...candles[i],
        close: newClose,
        open: newOpen,
        high: newHigh,
        low: newLow,
        direction: +newOpen <= +newClose ? 'UP' : 'DOWN',
      };
    }

    return newCandles;
  };

  /**
   * Returns an array of smoothed candles.
   * (Based on heikin ashi candles, but keeps the real high & low)
   */
  private static smoozCandles = (
    candles: api.FuturesChartCandle[],
  ): api.FuturesChartCandle[] => {
    const newCandles: api.FuturesChartCandle[] = [];

    for (let i = 0; i < candles.length; i += 1) {
      const {
        open, close, high, low,
      } = candles[i];
      const previous = newCandles[i - 1] as api.FuturesChartCandle | undefined;

      let newOpen = previous
        ? (+previous.open + +previous.close) / 2
        : (open + close) / 2;
      let newClose = (open + close + high + low) / 4;

      const newDirection = (newOpen <= newClose)
        ? 'UP' : 'DOWN';

      // Clamp new open to low/high
      newOpen = newDirection === 'UP'
        ? Math.max(newOpen, low)
        : Math.min(newOpen, high);

      // Keep last candle close as vanilla (to visually keep track of price)
      if (i === candles.length - 1) {
        newClose = +close;
      }

      newCandles.push({
        ...candles[i],
        direction: newDirection,
        open: newOpen,
        close: newClose,
      });

      // Adjust close/open of previous candle, we don't want gaps
      if (previous) {
        if (newDirection === previous.direction) {
          previous.close = (previous.direction === 'UP')
            ? Math.max(previous.close, newOpen)
            : Math.min(previous.close, newOpen);
        } else {
          previous.open = (previous.direction === 'DOWN')
            ? Math.max(previous.open, newOpen)
            : Math.min(previous.open, newOpen);
        }
      }
    }

    return newCandles;
  };
}
