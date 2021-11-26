import { RootStore } from 'altamoon-types';
import NinjaBouncing from './Bouncing';
import NinjaPersistent from './Persistent';
import NinjaSignals from './Signals';

export default class NinjaStore {
  public rootStore: RootStore;

  public persistent: NinjaPersistent;

  public bouncing: NinjaBouncing;

  public signals: NinjaSignals;

  constructor(rootStore: EnhancedRootStore) {
    this.rootStore = rootStore;

    // eslint-disable-next-line no-param-reassign
    rootStore.ninja = this;

    this.persistent = new NinjaPersistent();
    this.bouncing = new NinjaBouncing(rootStore);
    this.signals = new NinjaSignals(rootStore);
  }
}

// allow to use it at class members
declare global { type EnhancedRootStore = RootStore & { ninja: NinjaStore }; }

export const ROOT = (store: EnhancedRootStore): EnhancedRootStore => store;
export const NINJA = ({ ninja }: EnhancedRootStore): NinjaStore => ninja;
export const NINJA_PERSISTENT = ({ ninja }: EnhancedRootStore): NinjaStore['persistent'] => ninja.persistent;
export const NINJA_BOUNCING = ({ ninja }: EnhancedRootStore): NinjaStore['bouncing'] => ninja.bouncing;
export const NINJA_SIGNALS = ({ ninja }: EnhancedRootStore): NinjaStore['signals'] => ninja.signals;