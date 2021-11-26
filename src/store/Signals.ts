import * as api from 'altamoon-binance-api';
import { keyBy } from 'lodash';
import { listenChange } from 'use-change';

// https://themushroomkingdom.net/media/smb/wav
const sound = new Audio('https://themushroomkingdom.net/sounds/wav/smb/smb_fireworks.wav');

export default class NinjaSignals {
  #store: EnhancedRootStore;

  #tickers: Record<string, api.FuturesTicker> = {};

  #aggTradeUnsubscribe?: () => void;

  public exchangeInfo?: api.FuturesExchangeInfo;

  constructor(store: EnhancedRootStore) {
    this.#store = store;
    api.futuresTickerStream((tickers) => {
      Object.assign(this.#tickers, keyBy(tickers, 'symbol'));
    });
    void this.#aggTradeSubscribe();

    listenChange(store.ninja.persistent, 'minMaxTop', this.#aggTradeSubscribe);

    // clear older values
    setInterval(() => {
      this.#store.ninja.persistent.minMax = this.#store.ninja.persistent.minMax
        .filter(({ timeISO }) => new Date(timeISO).getTime() > Date.now() - 1000 * 60 * 60); // 1h
    }, 30_000);
  }

  #aggTradeSubscribe = async () => {
    const exchangeInfo = this.exchangeInfo || await api.futuresExchangeInfo();
    this.exchangeInfo = exchangeInfo;
    const { symbols } = exchangeInfo;

    const listenedSymbols = symbols.filter(({ contractType }) => contractType === 'PERPETUAL')
      .slice(0, this.#store.ninja.persistent.minMaxTop).map(({ symbol }) => symbol);

    // eslint-disable-next-line no-console
    console.info('Min/Max is Listening ', listenedSymbols);
    this.#aggTradeUnsubscribe?.();
    this.#aggTradeUnsubscribe = api.futuresAggTradeStream(
      listenedSymbols,
      this.#check,
    );
  };

  #check = ({ price, symbol }: api.FuturesAggTradeStreamTicker) => {
    const ticker = this.#tickers[symbol];

    if (!ticker) return;

    const { high, low } = ticker;

    if (+high <= +price || +low >= +price) {
      let { minMax } = this.#store.ninja.persistent;

      minMax = minMax.filter((mm) => mm.symbol !== symbol);
      minMax.unshift({
        type: high === price ? 'MAX' : 'MIN',
        symbol,
        price: +high,
        timeISO: new Date().toISOString(),
      });

      if (
        this.#store.ninja.persistent.soundsOn
          && this.#store.ninja.persistent.minMax.length !== minMax.length
      ) {
        void sound.play();
      }

      this.#store.ninja.persistent.minMax = minMax;
    }
  };
}
