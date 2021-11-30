import { RootStore } from 'altamoon-types';
import * as api from 'altamoon-binance-api';

import NinjaBouncing from './Bouncing';
import NinjaPersistent from './Persistent';
import NinjaSignals from './Signals';
import NinjaPositionInfo from './PositionInfo';
import Recommendations from './Recommendations';
import AgainstBTC from './AgainstBTC';

export default class NinjaStore {
  public rootStore: RootStore;

  public persistent: NinjaPersistent;

  public bouncing: NinjaBouncing;

  public signals: NinjaSignals;

  public positionsInfo: NinjaPositionInfo;

  public recommendations: Recommendations;

  public againstBTC: AgainstBTC;

  public exchangeInfo?: api.FuturesExchangeInfo;

  constructor(rootStore: EnhancedRootStore) {
    this.rootStore = rootStore;

    // eslint-disable-next-line no-param-reassign
    rootStore.ninja = this;

    this.persistent = new NinjaPersistent();
    this.bouncing = new NinjaBouncing(rootStore);
    this.signals = new NinjaSignals(rootStore);
    this.positionsInfo = new NinjaPositionInfo(rootStore);
    this.recommendations = new Recommendations(rootStore);
    this.againstBTC = new AgainstBTC(rootStore);

    const {
      binanceApiKey, binanceApiSecret, testnetBinanceApiKey, testnetBinanceApiSecret, isTestnet,
    } = rootStore.persistent;

    const apiKey = isTestnet ? testnetBinanceApiKey : binanceApiKey;
    const apiSecret = isTestnet ? testnetBinanceApiSecret : binanceApiSecret;
    if (apiKey && apiSecret) {
      api.setOptions({ apiKey, apiSecret, isTestnet });
    }

    void api.futuresExchangeInfo().then((exchangeInfo) => {
      this.exchangeInfo = exchangeInfo;
    });
  }
}

// allow to use it at class members
declare global { type EnhancedRootStore = RootStore & { ninja: NinjaStore }; }

export const ROOT = (store: EnhancedRootStore): EnhancedRootStore => store;
export const NINJA = ({ ninja }: EnhancedRootStore): NinjaStore => ninja;
export const NINJA_PERSISTENT = ({ ninja }: EnhancedRootStore): NinjaStore['persistent'] => ninja.persistent;
export const NINJA_BOUNCING = ({ ninja }: EnhancedRootStore): NinjaStore['bouncing'] => ninja.bouncing;
export const NINJA_SIGNALS = ({ ninja }: EnhancedRootStore): NinjaStore['signals'] => ninja.signals;
export const NINJA_POSITION_INFO = ({ ninja }: EnhancedRootStore): NinjaStore['positionsInfo'] => ninja.positionsInfo;
export const NINJA_RECOMMENDATIONS = ({ ninja }: EnhancedRootStore): NinjaStore['recommendations'] => ninja.recommendations;
export const NINJA_AGAINST_BTC = ({ ninja }: EnhancedRootStore): NinjaStore['againstBTC'] => ninja.againstBTC;
