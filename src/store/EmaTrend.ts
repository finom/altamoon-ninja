import * as api from 'altamoon-binance-api';
import { listenChange } from 'use-change';

type EnhancedCandle = api.FuturesChartCandle & { emaTrendDirection?: 'UP' | 'DOWN' | 'UPISH' | 'DOWNISH' | null };

export interface EmaTrendDatum {
  symbol: string;
  interval: api.CandlestickChartInterval;
  balanceRatioBidPercent: number;
}

const EMA_1 = 5; // 9;
const EMA_2 = 9; // 21;
const EMA_3 = 21; // 55;

export default class EmaTrend {
  public strategySymbols: string[] = [];

  #store: EnhancedRootStore;

  public backtestResult: null | number = null; 

  #unsubscribe?: () => void;

  #lastTickTime: Record<string, number> = {};

  #collectedBackTest: Record<`${string}_${api.CandlestickChartInterval}`, number> = {};

  public backtestStat = 0;

  constructor(store: EnhancedRootStore) {
    this.#store = store;

    listenChange(store.persistent, 'interval', this.#requestAndBacktest);
    listenChange(store.persistent, 'symbol', this.#requestAndBacktest);
    void this.#requestAndBacktest();

    listenChange(store.ninja.persistent, 'emaTrendItems', this.#subscribe);
    this.#subscribe();
  }

  public createEmaTrendItem = () => {
    const { symbol, interval } = this.#store.persistent;
    const { emaTrendItems } = this.#store.ninja.persistent;
    const balanceRatioBidPercent = +this.#store.ninja.persistent
      .emaTrendBalanceRatioBidPercentStr;
    if (!balanceRatioBidPercent || emaTrendItems.some((item) => item.symbol === symbol)) return;
    this.#store.ninja.persistent.emaTrendItems = [
      ...emaTrendItems,
      {
        symbol,
        interval,
        balanceRatioBidPercent,
      },
    ];
  };

  public removeEmaTrendItem = (symbol: string) => {
    this.#store.ninja.persistent.emaTrendItems = this.#store.ninja.persistent.emaTrendItems
      .filter((item) => item.symbol !== symbol);
  };

  #subscribe = () => {
    const data: Record<string, api.FuturesChartCandle[]> = {};
    const { emaTrendItems } = this.#store.ninja.persistent;

    this.#unsubscribe?.();

    if (!emaTrendItems.length) return;

    for (const { symbol, interval } of emaTrendItems) {
      void api.futuresCandles({
        symbol, interval, limit: 1000,
      }).then((candles) => {
        data[symbol] = candles;
      });
    }

    const subscriptionPairs = emaTrendItems.map(
      ({ symbol, interval }) => [symbol, interval] as [string, api.CandlestickChartInterval],
    );

    this.#unsubscribe = api.futuresCandlesSubscribe(subscriptionPairs, (candle) => {
      const { symbol, time } = candle;
      if (!data[symbol]) return;
      if (time === data[symbol][data[symbol].length - 1].time) {
        Object.assign(data[symbol][data[symbol].length - 1], candle);
      } else {
        data[symbol].push(candle);
      }

      const now = Date.now();

      if (!this.#lastTickTime[symbol] || this.#lastTickTime[symbol] < now - 5_000) {
        this.#lastTickTime[symbol] = now;
        void this.#process(candle.symbol, [...data[candle.symbol]]);
      }
    });
  };

  #process = async (symbol: string, candles: api.FuturesChartCandle[]) => {
    const enhancedCandles = this.#calcTrend(candles);
    const { openPositions } = this.#store.trading;
    const position = openPositions.find((pos) => pos.symbol === symbol);
    const datum = this.#store.ninja.persistent.emaTrendItems
      .find((item) => item.symbol === symbol);

    if (!datum) return;

    const directon = enhancedCandles[enhancedCandles.length - 1].emaTrendDirection;
    const prevDirecton = enhancedCandles[enhancedCandles.length - 2].emaTrendDirection;
    const quantity = this.#store.trading.calculateQuantity({
      symbol,
      price: candles[candles.length - 1].close,
      size: (datum.balanceRatioBidPercent / 100)
        * this.#store.account.totalWalletBalance
        * (+this.#store.trading.allSymbolsPositionRisk[symbol]?.leverage || 1),
    });

    if (directon !== prevDirecton) {
      if (directon === 'UP') {
        if (position) {
          if (position.side === 'SELL') {
            await this.#store.trading.closePosition(symbol);
            await this.#store.trading.marketOrder({ side: 'BUY', quantity, symbol });
          }
        } else {
          await this.#store.trading.marketOrder({ side: 'BUY', quantity, symbol });
        }
      } else if (directon === 'DOWN') {
        if (position) {
          if (position.side === 'BUY') {
            await this.#store.trading.closePosition(symbol);
            await this.#store.trading.marketOrder({ side: 'SELL', quantity, symbol });
          }
        } else {
          await this.#store.trading.marketOrder({ side: 'SELL', quantity, symbol });
        }
      } else if (directon === 'UPISH') {
        if (position) {
          if (position.side === 'SELL') {
            await this.#store.trading.closePosition(symbol);
          }
        }
      } else if (directon === 'DOWNISH') {
        if (position) {
          if (position.side === 'BUY') {
            await this.#store.trading.closePosition(symbol);
          }
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
      symbol, interval: actualInterval, limit: 1500,
    });
    // eslint-disable-next-line no-console
    console.log('Ninja EMA Trend: Backtesting', symbol, interval);
    this.#backtest(candles);
  };

  #backtest = (candles: api.FuturesChartCandle[]) => {
    const enhancedCandles = this.#calcTrend(candles);

    const fee = 0.04 / 100;
    let result = 0;
    let pos: { side: api.OrderSide; entryPrice: number; } | null = null;

    for (let i = 500; i < enhancedCandles.length; i += 1) {
      const candle = enhancedCandles[i];
      const prevCandle = enhancedCandles[i - 1];

      if (prevCandle.emaTrendDirection !== candle.emaTrendDirection) {
        const sideNum = pos ? (pos?.side === 'BUY' ? 1 : -1) : 0;
        const entryPrice = pos?.entryPrice ?? 0;

        if (prevCandle.emaTrendDirection === 'UP' || prevCandle.emaTrendDirection === 'UPISH') {
          if (candle.emaTrendDirection === 'DOWN') {
            if (pos) {
              result += (sideNum * (candle.close - entryPrice)) / candle.close;
              result -= fee;
            }
            pos = { side: 'SELL', entryPrice: candle.close };
            result -= fee;
          } else if (candle.emaTrendDirection === 'DOWNISH') {
            if (pos) {
              result += (sideNum * (candle.close - entryPrice)) / candle.close;
              result -= fee;
            }
            pos = null;
          }
        } else if (prevCandle.emaTrendDirection === 'DOWN' || prevCandle.emaTrendDirection === 'DOWNISH') {
          if (candle.emaTrendDirection === 'UP') {
            if (pos) {
              result += (sideNum * (candle.close - entryPrice)) / candle.close;
              result -= fee;
            }
            pos = { side: 'BUY', entryPrice: candle.close };
            result -= fee;
          } else if (candle.emaTrendDirection === 'UPISH') {
            if (pos) {
              result += (sideNum * (candle.close - entryPrice)) / candle.close;
              result -= fee;
            }
            pos = null;
          }
        }
      }
    }

    this.#collectedBackTest[`${candles[0].symbol}_${candles[0].interval as api.CandlestickChartInterval}`] = result;

    const allResults =  Object.values(this.#collectedBackTest);
    
    this.backtestStat = (allResults.reduce((a, c) => a + c, 0) / allResults.length) * 100;
    this.backtestResult = result * 100;
  };

  #calcTrend = (   
    candles: api.FuturesChartCandle[],
  ) => {

    const result: EnhancedCandle[] = [];
    const ema1 = this.#calcEma(candles, EMA_1);
    const ema2 = this.#calcEma(candles, EMA_2);
    const ema3 = this.#calcEma(candles, EMA_3);

    for (let i = 0; i < candles.length; i += 1) {
      const candle = candles[i];

      const a = ema1[i];
      const b = ema2[i];
      const c = ema3[i];

      let emaTrendDirection: EnhancedCandle['emaTrendDirection'];

      if (a < b && b < c) {
        emaTrendDirection = 'DOWN';
      } else if (c < b && b < a) {
        emaTrendDirection = 'UP';
      } else if (a < b) {
        emaTrendDirection = 'DOWNISH'; 
      } else if (b < a) {
        emaTrendDirection = 'UPISH'; 
      } else {
        emaTrendDirection = result[i - 1]?.emaTrendDirection ?? null;
      }

      result.push({
        ...candle,
        emaTrendDirection,
      });
    }
    return result;
  };

  #calcEma = (candles: api.FuturesChartCandle[], N: number) => {
    let ema = 0;
    const k = 2 / (N + 1);

    const result: number[] = [];

    for (let i = 0; i < candles.length; i += 1) {
      ema = candles[i].close * k + ema * (1 - k);

      result.push(ema);
    }

    return result;
  };
}
