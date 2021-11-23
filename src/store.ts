import * as api from 'altamoon-binance-api';
import { RootStore } from 'altamoon-types';
import { listenChange } from 'use-change';

// https://themushroomkingdom.net/media/smb/wav
const jumpSound = new Audio('https://themushroomkingdom.net/sounds/wav/smb/smb_bump.wav');

function getPersistentStorageValue<O, T>(key: keyof O & string, defaultValue: T): T {
  const storageValue = localStorage.getItem(`phlegmatic_${key}`);
  return storageValue ? JSON.parse(storageValue) as T : defaultValue;
}

export default class NinjaStore {
  public isBouncedOrderEnabled = false;

  public bouncedOrderSide: api.OrderSide = 'BUY';

  public bouncedOrderValueStr = '';

  public bouncedOrderReduceOnly = false;

  public candlesInterval: api.CandlestickChartInterval = '3m';

  public candles: api.FuturesChartCandle[] = [];

  public soundsOn = getPersistentStorageValue<NinjaStore, boolean>('soundsOn', false);

  #store: RootStore;

  #chartUnsubscribe?: () => void;

  constructor(store: RootStore) {
    this.#store = store;

    const keysToListen: (keyof NinjaStore)[] = ['soundsOn'];

    keysToListen.forEach((key) => {
      listenChange(this, key, (value: unknown) => {
        localStorage.setItem(`phlegmatic_${key}`, JSON.stringify(value));
      });
    });

    listenChange(store.persistent, 'symbol', this.#onSymbolChange);

    this.#onSymbolChange();
  }

  #onSymbolChange = (): void => {
    this.#chartUnsubscribe?.();
    this.#chartUnsubscribe = api.futuresChartSubscribe({
      symbol: this.#store.persistent.symbol,
      interval: this.candlesInterval,
      callback: this.#handle,
      limit: 4,
      firstTickFromCache: false,
    });
  };

  #handle = (origCandles: api.FuturesChartCandle[]): void => {
    const candles = NinjaStore.smoozCandles(origCandles);
    const lastCandle = candles[candles.length - 1];
    const { symbol } = this.#store.persistent;

    const {
      bouncedOrderReduceOnly: reduceOnly, bouncedOrderSide: side, isBouncedOrderEnabled: isEnabled,
    } = this;
    const price = this.#store.market.currentSymbolLastPrice;

    const size = this.#store.trading.calculateSizeFromString(
      this.#store.persistent.symbol, this.bouncedOrderValueStr,
    );

    if (!isEnabled || !lastCandle || !size || !price) return;

    const quantity = this.#store.trading.calculateQuantity({
      symbol, price, size,
    });

    const { direction } = lastCandle;

    if ((side === 'BUY' && direction === 'UP') || (side === 'SELL' && direction === 'DOWN')) {
      // eslint-disable-next-line no-console
      console.info('BOUNCED ORDER TRIGGERED', lastCandle);
      void this.#store.trading.marketOrder({
        side, reduceOnly, quantity, symbol,
      });

      if (this.soundsOn) void jumpSound.play();
      this.isBouncedOrderEnabled = false;
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

export const NINJA = ({ ninja }: RootStore & { ninja: NinjaStore }): NinjaStore => ninja;
