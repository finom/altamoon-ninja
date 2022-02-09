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
    let lastCreatedTime = 0;

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
      if (!data[candle.symbol]) return;
      if (candle.time === data[candle.symbol][data[candle.symbol].length - 1].time) {
        Object.assign(data[candle.symbol][data[candle.symbol].length - 1], candle);
      } else {
        data[candle.symbol].push(candle);
      }

      const now = Date.now();

      if (lastCreatedTime < now - 3_000) {
        lastCreatedTime = now;
        void this.#process(candle.symbol, [...data[candle.symbol]]);
      }
    });
  };

  #process = async (symbol: string, candles: api.FuturesChartCandle[]) => {
    const enhancedCandles = this.#calcSupertrend(candles);
    const { openPositions } = this.#store.trading;
    const position = openPositions.find((pos) => pos.symbol === symbol);
    const datum = this.#store.ninja.persistent.supertrendItems
      .find((item) => item.symbol === symbol);

    if (!datum) return;

    const supertrendDirecton = enhancedCandles[enhancedCandles.length - 2].supertrendDirection;
    const prevSupertrendDirecton = enhancedCandles[enhancedCandles.length - 3].supertrendDirection;
    const quantity = this.#store.trading.calculateQuantity({
      symbol,
      price: candles[candles.length - 1].close,
      size: (datum.balanceRatioBidPercent / 100)
        * this.#store.account.totalWalletBalance
        * (+this.#store.trading.allSymbolsPositionRisk[symbol]?.leverage || 1),
    });

    if (supertrendDirecton !== prevSupertrendDirecton) {
      if (supertrendDirecton === 'UP') {
        if (position) {
          if (position.side === 'SELL') {
            await this.#store.trading.closePosition(symbol);
            await this.#store.trading.marketOrder({ side: 'BUY', quantity, symbol });
          }
        } else {
          await this.#store.trading.marketOrder({ side: 'BUY', quantity, symbol });
        }
      }

      if (supertrendDirecton === 'DOWN') {
        if (position) {
          if (position.side === 'BUY') {
            await this.#store.trading.closePosition(symbol);
            await this.#store.trading.marketOrder({ side: 'SELL', quantity, symbol });
          }
        } else {
          await this.#store.trading.marketOrder({ side: 'SELL', quantity, symbol });
        }
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
      symbol, interval: actualInterval, limit: 1000,
    });

    // eslint-disable-next-line no-console
    console.log('Ninja Supertrend: Backtesting', symbol, interval);
    this.#backtest(candles);
  };

  #backtest = (candles: api.FuturesChartCandle[]) => {
    if (!candles) return;

    const enhancedCandles = this.#calcSupertrend(candles);

    const fee = 0.004 * 2;
    let result = 0;
    let pos: { side: api.OrderSide; entryPrice: number; } | null = null;

    for (let i = 1; i < enhancedCandles.length; i += 1) {
      const candle = enhancedCandles[i];
      const prevCandle = enhancedCandles[i - 1];

      if (prevCandle.supertrendDirection !== candle.supertrendDirection) {
        if (pos) {
          const sideNum = pos.side === 'BUY' ? 1 : -1;

          result += (sideNum * (candle.close - pos.entryPrice) * (1 - fee))
            / candle.close;
        }

        pos = { side: candle.supertrendDirection === 'UP' ? 'BUY' : 'SELL', entryPrice: candle.close };
      }
    }

    this.backtestResult = result * 100;
  };

  #calcSupertrend = (
    candles: api.FuturesChartCandle[], period = 10, multiplier = 3,
  ) => {
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
