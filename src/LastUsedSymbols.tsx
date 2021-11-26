import React, { memo } from 'react';
import { RootStore } from 'altamoon-types';
import { Button } from 'reactstrap';
import { useSet, useValue } from 'use-change';
import { NINJA_PERSISTENT } from './store';

const LastUsedSymbols = () => {
  const setSymbol = useSet(({ persistent }: RootStore) => persistent, 'symbol');
  const lastUsed = useValue(NINJA_PERSISTENT, 'lastUsedSymbols');

  return (
    <div className="text-nowrap">
      {lastUsed.map((symbol) => (
        <Button key={symbol} onClick={() => setSymbol(symbol)} className="me-2">{symbol}</Button>
      ))}
    </div>
  );
};

export default memo(LastUsedSymbols);
