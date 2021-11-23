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
    const candles = NinjaStore.candlesToHeikinAshi(origCandles);
    const lastCandle = candles[candles.length - 1];
    const { symbol } = this.#store.persistent;

    const { bouncedOrderSide: side, isBouncedOrderEnabled: isEnabled } = this;
    const price = this.#store.market.currentSymbolLastPrice;

    const size = this.#store.trading.calculateSizeFromString(
      this.#store.persistent.symbol, this.bouncedOrderValueStr,
    );

    if (!isEnabled || !lastCandle || !size || !price) return;

    const quantity = this.#store.trading.calculateQuantity({
      symbol, price, size,
    });

    if ((side === 'BUY' && lastCandle.open < lastCandle.close) || (side === 'SELL' && lastCandle.open > lastCandle.close)) {
      // eslint-disable-next-line no-console
      console.info('BOUNCED ORDER TRIGGERED', lastCandle);
      void this.#store.trading.marketOrder({
        side, reduceOnly: false, quantity, symbol,
      });

      if (this.soundsOn) void jumpSound.play();
      this.isBouncedOrderEnabled = false;
    }
  };

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
}

export const NINJA = ({ ninja }: RootStore & { ninja: NinjaStore }): NinjaStore => ninja;
