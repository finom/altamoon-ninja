import * as api from 'altamoon-binance-api';
/**
   * Returns an array of smoothed candles.
   * (Based on heikin ashi candles, but keeps the real high & low)
   */
export default function smoozCandles(
  candles: api.FuturesChartCandle[],
): api.FuturesChartCandle[] {
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
}
