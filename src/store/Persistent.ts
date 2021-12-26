import { listenChange } from 'use-change';
import * as api from 'altamoon-binance-api';
import { BouncingOrder } from './types';
import { AgainstBtcDatum } from './AgainstBTC';
import { TallCandlesDatum } from './TallCandles';

const STORAGE_PREFIX = 'ninja_';

function persist<T>(key: keyof NinjaPersistent, defaultValue: T): T {
  const storageValue = localStorage.getItem(STORAGE_PREFIX + key);
  return storageValue ? JSON.parse(storageValue) as T : defaultValue;
}

export default class NinjaPersistent {
  public bouncingSoundsOn = persist<boolean>('bouncingSoundsOn', false);

  public lastUsedSymbols = persist<string[]>('lastUsedSymbols', []);

  public bouncingOrders = persist<BouncingOrder[]>('bouncingOrders', []);

  public againstBTCCandlesThreshold = persist<number>('againstBTCCandlesThreshold', 5);

  public againstBTCCandlesInterval = persist<api.CandlestickChartInterval>('againstBTCCandlesInterval', '1m');

  public againstBTCSoundsOn = persist<boolean>('againstBTCSoundsOn', false);

  public againstBtcItems = persist<AgainstBtcDatum[]>('againstBtcItems', []);

  public tallCandlesSizeThreshold = persist<number>('tallCandlesSizeThreshold', 10);

  public tallCandlesInterval = persist<api.CandlestickChartInterval>('tallCandlesInterval', '1m');

  public tallCandlesSoundOn = persist<boolean>('tallCandlesSoundOn', false);

  public tallCandlesItems = persist<TallCandlesDatum[]>('tallCandlesItems', []);

  constructor() {
    Object.getOwnPropertyNames(this).forEach((key) => {
      listenChange(this, key as keyof NinjaPersistent, (value: unknown) => {
        localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
      });
    });
  }
}
