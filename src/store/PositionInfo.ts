import { times } from 'lodash';
import weightedMean from 'weighted-mean';

const LEN = 20;

const WEIGTHS = times(LEN, (index) => index + 1);

type Risk = 'low' | 'moderate' | 'significant' | 'high';

export default class PositionInfo {
  #store: EnhancedRootStore;

  #pnls: Record<string, number[]> = {};

  public info: { symbol: string; risk: Risk }[] = [];

  constructor(store: EnhancedRootStore) {
    this.#store = store;

    setInterval(this.#check, 500);
  }

  #check = () => {
    const { openPositions } = this.#store.trading;
    const info: PositionInfo['info'] = [];
    // collect PNLs
    for (const { symbol, pnlPositionPercent } of openPositions) {
      const pnls = this.#pnls[symbol] || [];
      pnls.push(pnlPositionPercent);
      this.#pnls[symbol] = pnls.slice(-LEN);
    }

    for (const { symbol } of openPositions) {
      const pnls = this.#pnls[symbol];
      const diffs = [];

      for (let i = 1; i < pnls.length; i += 1) {
        const prev = pnls[i - 1];
        const curr = pnls[i];

        diffs.push(Math.abs(prev - curr));
      }

      const mean = weightedMean(diffs.map((diff, i) => [diff, WEIGTHS[i]]));

      let risk: Risk;

      if (mean > 1) risk = 'high';
      else if (mean > 0.1) risk = 'moderate';
      else risk = 'low';

      info.push({ symbol, risk });
    }

    this.info = info;
  };
}
