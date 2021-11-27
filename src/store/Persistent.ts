import { listenChange } from 'use-change';
import { BouncingOrder, MinMaxSignal } from './types';

const STORAGE_PREFIX = 'ninja_';

function persist<T>(key: keyof NinjaPersistent, defaultValue: T): T {
  const storageValue = localStorage.getItem(STORAGE_PREFIX + key);
  return storageValue ? JSON.parse(storageValue) as T : defaultValue;
}

export default class NinjaPersistent {
  public bouncingSoundsOn = persist<boolean>('bouncingSoundsOn', false);

  public minMaxSoundsOn = persist<boolean>('minMaxSoundsOn', false);

  public lastUsedSymbols = persist<string[]>('lastUsedSymbols', []);

  public bouncingOrders = persist<BouncingOrder[]>('bouncingOrders', []);

  public minMax = persist<MinMaxSignal[]>('minMax', []);

  public minMaxTop = persist<number>('minMaxTop', 5);

  constructor() {
    Object.getOwnPropertyNames(this).forEach((key) => {
      listenChange(this, key as keyof NinjaPersistent, (value: unknown) => {
        localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
      });
    });
  }
}
