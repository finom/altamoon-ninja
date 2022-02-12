import * as api from 'altamoon-binance-api';
import { listenChange } from 'use-change';

export interface TallCandlesDatum {
  symbol: string;
  direction: api.FuturesChartCandle['direction'];
  timeISO: string;
  diff: number;
}

// https://themushroomkingdom.net/media/smb/wav
const sound = new Audio('https://themushroomkingdom.net/sounds/wav/smb/smb_vine.wav');

export default class TallCandles {
  #store: EnhancedRootStore;

  #allCandlesData: Record<string, api.FuturesChartCandle[]> = {};

  #allSymbolsUnsubscribe?: () => void;

  public exchangeInfo?: api.FuturesExchangeInfo;

  constructor(store: EnhancedRootStore) {
    this.#store = store;

    listenChange(store.ninja, 'exchangeInfo', (exchangeInfo) => {
      if (!exchangeInfo) return;

      this.#resubscribe();
    });

    listenChange(store.ninja.persistent, 'tallCandlesInterval', () => {
      this.#resubscribe();
    });

    // clear older values
    setInterval(() => {
      this.#store.ninja.persistent.tallCandlesItems = this.#store.ninja.persistent.tallCandlesItems
        .filter(({ timeISO }) => new Date(timeISO).getTime() > Date.now() - 1000 * 60 * 60); // 1h
    }, 30_000);
  }

  #resubscribe = () => {
    this.#allSymbolsUnsubscribe?.();
    this.#allSymbolsUnsubscribe = this.#allSymbolsSubscribe();
  };

  #check = (symbol: string) => {
    const symbolCandles = this.#allCandlesData[symbol];
    const lastCandle = symbolCandles[symbolCandles.length - 1];
    const candles = symbolCandles.slice(0, -1);
    const avgBodySize = candles.reduce(
      (acc, { open, close }) => acc + Math.abs(open - close), 0,
    ) / candles.length;
    const lastCandleSize = Math.abs(lastCandle.open - lastCandle.close);
    const diff = lastCandleSize / avgBodySize;

    if (diff > this.#store.ninja.persistent.tallCandlesSizeThreshold) {
      const hasItem = this.#store.ninja.persistent.tallCandlesItems
        .some((item) => item.symbol === symbol);
      this.#store.ninja.persistent.tallCandlesItems = [
        {
          symbol,
          timeISO: new Date().toISOString(),
          direction: lastCandle.direction,
          diff,
        },
        ...this.#store.ninja.persistent.tallCandlesItems.filter((item) => item.symbol !== symbol),
      ];

      if (!hasItem && this.#store.ninja.persistent.tallCandlesSoundOn) void sound.play();
    }
  };

  #allSymbolsSubscribe = (): (() => void) => {
    const { exchangeInfo, persistent } = this.#store.ninja;
    if (!exchangeInfo) return () => {}; // noop
    const unsubscribe = this.#store.futuresChartWorkerSubscribe({
      symbols: 'PERPETUAL',
      interval: persistent.againstBTCCandlesInterval,
      exchangeInfo,
      frequency: 2000,
      callback: (symbol, candlesData) => {
        this.#allCandlesData[symbol] = candlesData;
        if (this.#store.persistent.widgetsDisabled.includes('altamoon_ninja_tall_candles')) return;
        this.#check(symbol);
      },
    });

    return unsubscribe;
  };
}
