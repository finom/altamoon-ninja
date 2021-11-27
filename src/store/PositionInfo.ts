import { times } from 'lodash';
import weightedMean from 'weighted-mean';

const LEN = 20;

const WEIGTHS = times(LEN, (index) => index + 1);

type Risk = 'low' | 'moderate' | 'significant' | 'high';

export default class PositionInfo {
  #store: EnhancedRootStore;

  #pnls: Record<string, number[]> = {};

  public risks: { symbol: string; risk: Risk }[] = [];

  constructor(store: EnhancedRootStore) {
    this.#store = store;

    setInterval(this.#check, 500);
  }

  #check = () => {
    const { openPositions } = this.#store.trading;
    const risks: PositionInfo['risks'] = [];
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

      if (mean > 0.3) risk = 'high';
      else if (mean > 0.05) risk = 'moderate';
      else risk = 'low';

      risks.push({ symbol, risk });
    }

    this.risks = risks;
  };
}
