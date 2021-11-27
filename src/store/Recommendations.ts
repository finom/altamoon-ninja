import * as api from 'altamoon-binance-api';

export default class Recommendations {
  #store: EnhancedRootStore;

  constructor(store: EnhancedRootStore) {
    this.#store = store;
  }

  public setMarginIsolatedAll = async () => {
    const { exchangeInfo } = this.#store.ninja;
    const { allSymbolsPositionRisk } = this.#store.trading;
    if (!exchangeInfo) return;

    for (const { symbol } of exchangeInfo.symbols) {
      const position = allSymbolsPositionRisk[symbol];
      if (position && position.marginType === 'cross') {
        // eslint-disable-next-line no-await-in-loop
        await api.futuresMarginType(symbol, 'ISOLATED');
      }
    }
  };
}
