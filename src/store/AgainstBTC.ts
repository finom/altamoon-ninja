import * as api from 'altamoon-binance-api';
import { listenChange } from 'use-change';
import smoozCandles from '../lib/smoozCandles';

export interface AgainstBtcDatum {
  symbol: string;
  direction: api.FuturesChartCandle['direction'],
  num: number;
  timeISO: string;
}

// https://themushroomkingdom.net/media/smb/wav
const sound = new Audio('https://themushroomkingdom.net/sounds/wav/smb/smb_fireball.wav');

export default class AgainstBTC {
  #store: EnhancedRootStore;

  #allCandlesData: Record<string, api.FuturesChartCandle[]> = {};

  #allSymbolsUnsubscribe?: () => void;

  constructor(store: EnhancedRootStore) {
    this.#store = store;
    listenChange(store.ninja, 'exchangeInfo', (exchangeInfo) => {
      if (!exchangeInfo) return;

      this.#resubscribe();
    });

    listenChange(store.ninja.persistent, 'againstBTCCandlesInterval', () => {
      this.#resubscribe();
    });

    // clear older values
    setInterval(() => {
      this.#store.ninja.persistent.againstBtcItems = this.#store.ninja.persistent.againstBtcItems
        .filter(({ timeISO }) => new Date(timeISO).getTime() > Date.now() - 1000 * 60 * 60); // 1h
    }, 30_000);
  }

  private static tick = (
    symbol: string,
    givenBtcCandles: api.FuturesChartCandle[],
    givenCandles : api.FuturesChartCandle[],
    againstBtcItems: AgainstBtcDatum[],
    againstBTCCandlesThreshold: number,
  ): [false] | [boolean, AgainstBtcDatum[]] => {
    // candles may have different length,
    // that's why we need to reverse and start from index 0 (last candle)
    const candles = smoozCandles(
      givenCandles ?? [],
    ).reverse();
    const btcCandles = smoozCandles(
      givenBtcCandles ?? [],
    ).reverse() ?? [];
    let isChanged = false;

    if (!againstBTCCandlesThreshold) return [false];

    if (
      symbol === 'BTCUSDT' // don't compare BTC symbols to themselves
      || !btcCandles.length // btc had no tick yet
      // both btc and other symbol candles have the same time
      || btcCandles[0].time !== candles[0].time
    ) return [false];

    let upCount = 0;
    let downCount = 0;

    for (let i = 0; i < candles.length; i += 1) {
      const candle = candles[i];
      const btcCandle = btcCandles[i];
      if (btcCandle.direction === 'UP' && candle.direction === 'DOWN') {
        if (upCount !== 0 && i < againstBTCCandlesThreshold) return [false];
        downCount += 1;
      } else if (btcCandle.direction === 'DOWN' && candle.direction === 'UP') {
        if (downCount !== 0 && i < againstBTCCandlesThreshold) return [false];
        upCount += 1;
      } else break;
    }

    if (
      upCount >= againstBTCCandlesThreshold
      && !againstBtcItems.some(
        (item) => item.symbol === symbol && item.num === upCount && item.direction === 'UP',
      )
    ) {
      // eslint-disable-next-line no-param-reassign
      againstBtcItems = againstBtcItems.filter((item) => item.symbol !== symbol);

      againstBtcItems.unshift({
        symbol, direction: 'UP', num: upCount, timeISO: new Date().toISOString(),
      });

      isChanged = true;

      // if (this.#store.ninja.persistent.againstBTCSoundsOn) void sound.play();
    } else if (
      downCount >= againstBTCCandlesThreshold
      && !againstBtcItems.some(
        (item) => item.symbol === symbol && item.num === downCount && item.direction === 'DOWN',
      )
    ) {
      // eslint-disable-next-line no-param-reassign
      againstBtcItems = againstBtcItems.filter((item) => item.symbol !== symbol);

      againstBtcItems.unshift({
        symbol, direction: 'DOWN', num: downCount, timeISO: new Date().toISOString(),
      });

      isChanged = true;
    }

    return [isChanged, againstBtcItems];
  };

  #resubscribe = () => {
    this.#allSymbolsUnsubscribe?.();
    this.#allSymbolsUnsubscribe = this.#allSymbolsSubscribe();
  };

  #allSymbolsSubscribe = (): (() => void) => {
    const { exchangeInfo, persistent } = this.#store.ninja;

    if (!exchangeInfo) return () => {}; // noop
    const { unsubscribe } = api.futuresChartWorkerSubscribe({
      exchangeInfo,
      symbols: 'PERPETUAL',
      interval: persistent.againstBTCCandlesInterval,
      frequency: 2000,
      callback: (symbol, candlesData) => {
        this.#allCandlesData[symbol] = candlesData;
        if (this.#store.persistent.widgetsDisabled.includes('altamoon_ninja_againstbtc')) return;
        const [isChanged, newItems] = AgainstBTC.tick(
          symbol,
          this.#allCandlesData.BTCUSDT,
          candlesData,
          persistent.againstBtcItems,
          persistent.againstBTCCandlesThreshold,
        );
        if (isChanged && newItems) {
          persistent.againstBtcItems = newItems;
          if (persistent.againstBTCSoundsOn) void sound.play();
        }
      },
    });

    return unsubscribe;
    /* const { exchangeInfo, persistent } = this.#store.ninja;
    const { againstBTCCandlesInterval: interval } = persistent;

    if (!exchangeInfo) return () => {}; // noop

    const { symbols } = exchangeInfo;

    for (const { symbol } of symbols.filter(
      ({ contractType, symbol: s }) => contractType === 'PERPETUAL' && !['BTCDOMUSDT'].includes(s),
    )) {
      void api.futuresCandles({
        // 499 has weight 3 https://binance-docs.github.io/apidocs/futures/en/#kline-candlestick-data
        symbol, interval, limit: 499, lastCandleFromCache: true,
      }).then((candles) => {
        this.#allCandlesData[symbol] = candles;
      }).catch((e) => {
        // eslint-disable-next-line no-console
        console.error(e);
      });
    }

    const subscriptionPairs = symbols.map(
      ({ symbol }) => [symbol, interval] as [string, api.CandlestickChartInterval],
    );

    return api.futuresCandlesSubscribe(subscriptionPairs, (candle) => {
      const { symbol } = candle;
      const data = this.#allCandlesData[symbol];

      if (!data) return;

      if (candle.time === data[data.length - 1].time) {
        Object.assign(data[data.length - 1], candle);
      } else {
        data.push(candle);
      }

      const candlesData = [...data];

      this.#allCandlesData[symbol] = candlesData;

      const now = Date.now();

      if (!this.#tickTimes[symbol] || this.#tickTimes[symbol] > now - 2000) {
        this.#tickTimes[symbol] = now;
        const [isChanged, newItems] = AgainstBTC.tick(
          symbol,
          this.#allCandlesData.BTCUSDT,
          candlesData,
          this.#store.ninja.persistent.againstBtcItems,
          this.#store.ninja.persistent.againstBTCCandlesThreshold,
        );
        if (isChanged && newItems) {
          this.#store.ninja.persistent.againstBtcItems = newItems;
          if (this.#store.ninja.persistent.againstBTCSoundsOn) void sound.play();
        }
      }
    }); */
  };
}
/*
  protected loadKLines = async (symbol: string): Promise<api.FuturesChartCandle[]> => {
    const interval = this.#store.ninja.persistent.againstBTCCandlesInterval;

    const klines = await api.promiseRequest<(string | number)[][]>('v1/klines', {
      symbol, interval, limit: 499,
    });

    const requestedCandles = klines.map(([
      time, open, high, low, close, volume, closeTime, quoteVolume,
      trades, takerBuyBaseVolume, takerBuyQuoteVolume,
    ]) => {
      const candle: api.FuturesChartCandle = {
        symbol,
        interval,
        time: time as number,
        closeTime: closeTime as number,
        open: +open,
        high: +high,
        low: +low,
        close: +close,
        volume: +volume,
        quoteVolume: +quoteVolume,
        takerBuyBaseVolume: +takerBuyBaseVolume,
        takerBuyQuoteVolume: +takerBuyQuoteVolume,
        trades: trades as number,
        direction: +open <= +close ? 'UP' : 'DOWN',
        closeTimeISOString: new Date(closeTime as number).toISOString(),
        timeISOString: new Date(time as number).toISOString(),
      };

      return candle;
    });

    return requestedCandles;
  };

  // not used
  protected backtest = () => {
    const { allCandles } = this;
    const btcCandles = NinjaBouncing.smoozCandles(allCandles.BTCUSDT);
    const otherCandles = omit(allCandles, ['BTCUSDT', 'BTCDOMUSDT', 'BTCBUSD', 'ETHBUSD']);
    const NUM_CANDLES_MIN_THRESHOLD = 5;
    let numUp = 0;
    let numDown = 0;

    interface SymbolAgainst {
      symbol: string;
      change: number;
      num: number;
      timeISO: string;
      antiDirection: api.FuturesChartCandle['direction']
    }

    type Direction = api.FuturesChartCandle['direction'];

    const searchAgainst = (
      startIndex: number,
      num: number,
      direction: Direction,
    ): SymbolAgainst[] => {
      const symbolsAgainst: SymbolAgainst[] = [];
      for (const [symbol, origCandles] of Object.entries(otherCandles)) {
        const candles = NinjaBouncing.smoozCandles(origCandles);
        let otherNumUp = 0;
        let otherNumDown = 0;
        const initialCandle: api.FuturesChartCandle = candles[startIndex];

        for (let i = startIndex; i <= startIndex + num; i += 1) {
          const candle = candles[i];
          if (!candle) break;
          if (candle.direction === 'UP') {
            otherNumUp += 1;
            otherNumDown = 0;
          } else {
            otherNumUp = 0;
            otherNumDown += 1;
          }

          if (
            (otherNumUp === num && direction === 'DOWN') ||
            (otherNumDown === num && direction === 'UP')) {
            symbolsAgainst.push({
              symbol,
              change: Math.abs((candle.close - initialCandle.open) / initialCandle.open),
              num,
              timeISO: initialCandle.timeISOString,
              antiDirection: direction === 'DOWN' ? 'UP' : 'DOWN',
            });
          }
        }
      }

      return symbolsAgainst;
    };

    const backtestOne = ({
      change, startIndex, symbol, direction,
    }: {
      change: number;
      startIndex: number;
      symbol: string;
      direction: Direction;
    }): [number, number] => {
      const candles = NinjaBouncing.smoozCandles(allCandles[symbol]);
      if (!candles[startIndex]) return [1000, 0];
      const initialPrice = candles[startIndex].open;

      const leverage = Math.abs(1 / change) * 0.15;
      const expectedProfit = 1 / leverage;
      const expectedLoss = 2 / leverage;
      const profitPrice = initialPrice + (1 * expectedProfit) * (direction === 'UP' ? 1 : -1);
      const lossPrice = initialPrice - (1 * expectedLoss) * (direction === 'UP' ? 1 : -1);

      // const leverage = initialPrice / Math.abs(initialPrice - profitPrice)

      let result = 0;

      for (let i = startIndex; i < candles.length; i += 1) {
        const candle = candles[i];
        const lastPrice = candle.close;

        if (direction === 'UP') {
          if (lastPrice >= profitPrice) {
            result = profitPrice / lastPrice - 1;
            break;
          } else if (lastPrice <= lossPrice) {
            result = lossPrice / lastPrice - 1;
            break;
          }
        } else if (lastPrice <= profitPrice) {
          result = profitPrice / lastPrice - 1;
          break;
        } else if (lastPrice >= lossPrice) {
          result = lossPrice / lastPrice - 1;
          break;
        }
      }

      return [leverage, result];
    };
    const pnls = [];
    for (let index = 0; index < btcCandles.length; index += 1) {
      if (btcCandles[index].direction === 'UP') {
        numUp += 1;
        numDown = 0;
      } else {
        numUp = 0;
        numDown += 1;
      }

      if (numUp >= NUM_CANDLES_MIN_THRESHOLD) {
        const found = searchAgainst(index - numUp, numUp, 'UP');
        for (const { symbol, change } of found) {
          const [leverage, pnl] = backtestOne({
            change, startIndex: index + 1, symbol, direction: 'UP',
          });

          if (leverage < 20) {
            pnls.push(pnl * leverage * 100);
          }
        }
      } else if (numDown >= NUM_CANDLES_MIN_THRESHOLD) {
        const found = searchAgainst(index - numDown, numDown, 'DOWN');

        for (const { symbol, change } of found) {
          const [leverage, pnl] = backtestOne({
            change, startIndex: index + 1, symbol, direction: 'DOWN',
          });

          if (leverage < 20) {
            pnls.push(pnl * leverage * 100);
          }
        }
      }
    }

    let sum = 0;
    for (let i = 0; i < pnls.length; i += 1) {
      sum += pnls[i];
    }

    // eslint-disable-next-line no-console
    console.log('RESULT', sum / pnls.length);
  }; */
