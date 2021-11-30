import * as api from 'altamoon-binance-api';
import { omit } from 'lodash';
import { listenChange } from 'use-change';
import NinjaBouncing from './Bouncing';

export default class AgainstBTC {
  public allCandles: Record<string, api.FuturesChartCandle[]> = {};

  constructor(store: EnhancedRootStore) {
    listenChange(store.ninja, 'exchangeInfo', async (exchangeInfo) => {
      if (!exchangeInfo) return;

      const allCandles: AgainstBTC['allCandles'] = {};

      await Promise.all(exchangeInfo.symbols.filter(
        ({ contractType }) => contractType === 'PERPETUAL',
      ).map(async ({ symbol }) => {
        allCandles[symbol] = await this.#loadKLines(symbol);
      }));

      this.allCandles = allCandles;
    });
  }

  public backtest = () => {
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
            (otherNumUp === num && direction === 'DOWN') || (otherNumDown === num && direction === 'UP')) {
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
      // console.log(change, leverage)
      const profitPrice = initialPrice + (1 * expectedProfit) * (direction === 'UP' ? 1 : -1);
      const lossPrice = initialPrice - (1 * expectedLoss) * (direction === 'UP' ? 1 : -1);

      // const leverage = initialPrice / Math.abs(initialPrice - profitPrice)
      // console.log('ccc', direction,  profitPrice, lossPrice)

      let result = 0;

      for (let i = startIndex; i < candles.length; i += 1) {
        const candle = candles[i];
        const lastPrice = candle.close;
        // console.log('sosok', direction, lastPrice,  profitPrice, lossPrice)

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
        // console.log('found1', found);
        for (const { symbol, change } of found) {
          const [leverage, pnl] = backtestOne({
            change, startIndex: index + 1, symbol, direction: 'UP',
          });

          if (leverage < 20) {
            // console.log('RUN', change, symbol, leverage, pnl * leverage * 100);
            pnls.push(pnl * leverage * 100);
          }
        }
      } else if (numDown >= NUM_CANDLES_MIN_THRESHOLD) {
        const found = searchAgainst(index - numDown, numDown, 'DOWN');
        // console.log('found2', found);

        for (const { symbol, change } of found) {
          const [leverage, pnl] = backtestOne({
            change, startIndex: index + 1, symbol, direction: 'DOWN',
          });

          if (leverage < 20) {
            // console.log('RUN', change, symbol, leverage, pnl * leverage * 100);
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
  };

  #loadKLines = async (
    symbol: string,
    interval: api.CandlestickChartInterval = '3m',
  ): Promise<api.FuturesChartCandle[]> => {
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
}
