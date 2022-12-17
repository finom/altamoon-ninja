import React from 'react';
import { RootStore } from 'altamoon-types';
import { useSet } from 'use-change';

const NinjaTopCoins = () => {
  const setSymbol = useSet(({ persistent }: RootStore) => persistent, 'symbol');

  const symbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'XRPUSDT', 'DOGEUSDT', 'ADAUSDT', 'MATICUSDT', 'DOTUSDT', 'TRXUSDT', 'LTCUSDT', 'SOLUSDT', '1000SHIBUSDT', 'UNIUSDT', 'AVAXUSDT'];

  return (
        <ul>
            {symbols.map((symbol) => (
                <li key={symbol}><span className="link-alike" onClick={() => setSymbol(symbol)}>{symbol}</span></li>
            ))}
        </ul>
  );
};

export default NinjaTopCoins;