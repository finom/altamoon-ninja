import * as api from 'altamoon-binance-api';
import { listenChange } from 'use-change';

type EnhancedCandle = api.FuturesChartCandle & { supertrendDirection?: 'UP' | 'DOWN' };

export interface SupertrendDatum {
  symbol: string;
  interval: api.CandlestickChartInterval;
  balanceRatioBidPercent: number;
}

export default class Supertrend {
  public strategySymbols: string[] = [];

  #store: EnhancedRootStore;

  public backtestResult: null | number = null;

  #unsubscribe?: () => void;

  #collectedBackTest: Record<`${string}_${api.CandlestickChartInterval}`, number> = {};

  public backtestStat = 0;

  #trendLastChanged: Record<`${string}_${api.CandlestickChartInterval}`, number> = {};

  constructor(store: EnhancedRootStore) {
    this.#store = store;

    listenChange(store.persistent, 'interval', this.#requestAndBacktest);
    listenChange(store.persistent, 'symbol', this.#requestAndBacktest);
    void this.#requestAndBacktest();

    listenChange(store.ninja.persistent, 'supertrendItems', this.#subscribe);
    this.#subscribe();
  }

  public createSupertrendItem = () => {
    const { symbol, interval } = this.#store.persistent;
    const { supertrendItems } = this.#store.ninja.persistent;
    const balanceRatioBidPercent = +this.#store.ninja.persistent
      .supertrendBalanceRatioBidPercentStr;
    if (!balanceRatioBidPercent || supertrendItems.some((item) => item.symbol === symbol)) return;
    this.#store.ninja.persistent.supertrendItems = [
      ...supertrendItems,
      {
        symbol,
        interval,
        balanceRatioBidPercent,
      },
    ];
  };

  public removeSupertrendItem = (symbol: string) => {
    this.#store.ninja.persistent.supertrendItems = this.#store.ninja.persistent.supertrendItems
      .filter((item) => item.symbol !== symbol);
  };

  #subscribe = () => {
    const data: Record<string, api.FuturesChartCandle[]> = {};
    const { supertrendItems } = this.#store.ninja.persistent;

    this.#unsubscribe?.();

    if (!supertrendItems.length) return;

    for (const { symbol, interval } of supertrendItems) {
      void api.futuresCandles({
        symbol, interval, limit: 1000,
      }).then((candles) => {
        data[symbol] = candles;
      });
    }

    const subscriptionPairs = supertrendItems.map(
      ({ symbol, interval }) => [symbol, interval] as [string, api.CandlestickChartInterval],
    );

    this.#unsubscribe = api.futuresCandlesSubscribe(subscriptionPairs, (candle) => {
      const { symbol, time } = candle;
      if (!data[symbol]) return;
      if (time === data[symbol][data[symbol].length - 1].time) {
        Object.assign(data[symbol][data[symbol].length - 1], candle);
      } else {
        data[symbol].push(candle);

        void this.#process(candle.symbol, [...data[candle.symbol]]);
      }
    });
  };

  #process = async (symbol: string, candles: api.FuturesChartCandle[]) => {
    const enhancedCandles = this.#calcSupertrend(candles);
    const { openPositions } = this.#store.trading;
    const position = openPositions.find((pos) => pos.symbol === symbol);
    const interval = candles[candles.length - 1].interval as api.CandlestickChartInterval;
    const closeTime = candles[candles.length - 1].closeTime;
    const datum = this.#store.ninja.persistent.supertrendItems
      .find((item) => item.symbol === symbol);

    if (!datum) return;

    const { supertrendDirection } = enhancedCandles[enhancedCandles.length - 2];
    const quantity = this.#store.trading.calculateQuantity({
      symbol,
      price: candles[candles.length - 1].close,
      size: (datum.balanceRatioBidPercent / 100)
        * this.#store.account.totalWalletBalance
        * (+this.#store.trading.allSymbolsPositionRisk[symbol]?.leverage || 1),
    });

    if (this.#trendLastChanged[`${symbol}_${interval}`] === closeTime) {
      return;
    }

    if (supertrendDirection === 'UP') {
      if (position) {
        if (position.side === 'SELL') {
          await this.#store.trading.closePosition(symbol);
          await this.#store.trading.marketOrder({ side: 'BUY', quantity, symbol });
          this.#trendLastChanged[`${symbol}_${interval}`] = closeTime;
        }
      } else {
        await this.#store.trading.marketOrder({ side: 'BUY', quantity, symbol });
        this.#trendLastChanged[`${symbol}_${interval}`] = closeTime;
      }
    }

    if (supertrendDirection === 'DOWN') {
      if (position) {
        if (position.side === 'BUY') {
          await this.#store.trading.closePosition(symbol);
          await this.#store.trading.marketOrder({ side: 'SELL', quantity, symbol });
          this.#trendLastChanged[`${symbol}_${interval}`] = closeTime;
        }
      } else {
        await this.#store.trading.marketOrder({ side: 'SELL', quantity, symbol });
        this.#trendLastChanged[`${symbol}_${interval}`] = closeTime;
      }
    }
  };

  #requestAndBacktest = async () => {
    const { symbol, interval } = this.#store.persistent;

    const actualInterval = ({
      '2m': '1m', '10m': '5m', '2d': '1d', '4d': '1d', '2w': '1w', '2M': '1M',
    } as Record<api.ExtendedCandlestickChartInterval, api.CandlestickChartInterval>)[
      interval as api.ExtendedCandlestickChartInterval
    ] ?? interval as api.CandlestickChartInterval;

    this.backtestResult = null;
    const candles = await api.futuresCandles({
      symbol, interval: actualInterval, limit: 1500,
    });

    // eslint-disable-next-line no-console
    console.log('Ninja Supertrend: Backtesting', symbol, interval);
    this.#backtest(candles);
  };

  #backtest = (candles: api.FuturesChartCandle[]) => {
    if (!candles) return;

    const enhancedCandles = this.#calcSupertrend(candles);

    const fee = 0.04 / 100;
    let result = 1;
    let pos: { side: api.OrderSide; entryPrice: number; } | null = null;

    for (let i = 1; i < enhancedCandles.length - 1; i += 1) {
      const candle = enhancedCandles[i];
      const prevCandle = enhancedCandles[i - 1];

      const { supertrendDirection } = prevCandle;

      if (pos) {
        const sideNum = pos.side === 'BUY' ? 1 : -1;

        if (supertrendDirection === 'UP') {
          if (pos.side === 'SELL') {
            result *= 1 + (sideNum * (candle.open - pos.entryPrice)) / candle.open;
            result *= 1 - fee * 2;
            pos = { side: 'BUY', entryPrice: candle.open };
          }
        }

        if (supertrendDirection === 'DOWN') {
          if (pos.side === 'BUY') {
            result *= 1 + (sideNum * (candle.open - pos.entryPrice)) / candle.open;
            result *= 1 - fee * 2;
            pos = { side: 'SELL', entryPrice: candle.open };
          }
        } 
      } else {
        result *= 1 - fee;
        pos = { side: supertrendDirection === 'UP' ? 'BUY' : 'SELL', entryPrice: candle.open };
      }
    }

    if (pos) { // last iteration, close the position
      const sideNum = pos.side === 'BUY' ? 1 : -1;
      const lastCandle = enhancedCandles[enhancedCandles.length - 1];
      result *= 1 + (sideNum * (lastCandle.open - pos.entryPrice)) / lastCandle.open;
      result *= 1 - fee * 2;
      pos = null;
    }

    this.#collectedBackTest[`${candles[0].symbol}_${candles[0].interval as api.CandlestickChartInterval}`] = result - 1;

    const allResults =  Object.values(this.#collectedBackTest);
    
    this.backtestStat = (allResults.reduce((a, c) => a + c, 0) / allResults.length) * 100;

    this.backtestResult = (result - 1) * 100;
  };

  #calcSupertrend = (
    candles: api.FuturesChartCandle[], // , period = 10, multiplier = 3,
  ) => {
    const period = this.#store.persistent.chartSupertrendPeroid;
    const multiplier = this.#store.persistent.chartSupertrendMultiplier;

    let FINAL_UPPERBAND = 0;
    let FINAL_LOWERBAND = 0;
    let SUPERTREND = 0;

    const result: EnhancedCandle[] = [];

    const trueRanges: number[] = [];

    for (let i = 1; i < candles.length; i += 1) {
      const candle = candles[i];
      const prevCandle = candles[i - 1];
      const D1 = candle.high - candle.low;
      const D2 = Math.abs(candle.high - prevCandle.close);
      const D3 = Math.abs(prevCandle.close - candle.low);
      const TR = Math.max(D1, D2, D3);

      trueRanges.push(TR);

      // ATR = ((ATR * (period - 1)) + TR) / period;

      const ATR = trueRanges.slice(-period).reduce((a, c) => a + c, 0)
        / Math.min(period, trueRanges.length);

      const BASIC_UPPERBAND = (candle.high + candle.low) / 2 + multiplier * ATR;
      const BASIC_LOWERBAND = (candle.high + candle.low) / 2 - multiplier * ATR;

      const PREV_FINAL_UPPERBAND = FINAL_UPPERBAND;
      const PREV_FINAL_LOWERBAND = FINAL_LOWERBAND;

      // https://github.com/jigneshpylab/ZerodhaPythonScripts/blob/master/supertrend.py
      FINAL_UPPERBAND = i === 1
        || BASIC_UPPERBAND < FINAL_UPPERBAND
        || prevCandle.close > FINAL_UPPERBAND
        ? BASIC_UPPERBAND
        : FINAL_UPPERBAND;

      FINAL_LOWERBAND = i === 1
        || BASIC_LOWERBAND > FINAL_LOWERBAND
        || prevCandle.close < FINAL_LOWERBAND
        ? BASIC_LOWERBAND
        : FINAL_LOWERBAND;

      let isUpper;

      // https://github.com/jigneshpylab/ZerodhaPythonScripts/blob/master/supertrend.py#L133-L155
      if (!SUPERTREND || SUPERTREND === PREV_FINAL_UPPERBAND) {
        SUPERTREND = candle.close <= FINAL_UPPERBAND ? FINAL_UPPERBAND : FINAL_LOWERBAND;
        isUpper = candle.close <= FINAL_UPPERBAND;
      } else if (SUPERTREND === PREV_FINAL_LOWERBAND) {
        SUPERTREND = candle.close >= FINAL_LOWERBAND ? FINAL_LOWERBAND : FINAL_UPPERBAND;
        isUpper = candle.close < FINAL_LOWERBAND;
      }

      result.push({
        ...candle,
        supertrendDirection: isUpper ? 'DOWN' : 'UP',
      });
    }

    return result;
  };
}
