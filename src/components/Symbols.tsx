import React, { ReactElement, useMemo } from 'react';
import { RootStore } from 'altamoon-types';
import { Input } from 'reactstrap';
import { useValue } from 'use-change';

interface Props {
  className?: string;
  value: string;
  onChange: (v: string) => void;
}

const Symbols = ({ className, value, onChange }: Props): ReactElement => {
  const futuresExchangeSymbols = useValue(({ market }: RootStore) => market, 'futuresExchangeSymbols');

  const perpetualSymbols = useMemo(() => Object.values(futuresExchangeSymbols)
    .filter(({ contractType }) => contractType === 'PERPETUAL')
    .sort(((a, b) => (a.symbol > b.symbol ? 1 : -1))), [futuresExchangeSymbols]);
  return (
    <Input className={`form-control ${className || ''}`} type="select" value={value} onChange={({ target }) => onChange(target.value)}>
      {perpetualSymbols.length
        ? perpetualSymbols.map(({ symbol: sym, baseAsset, quoteAsset }) => (
          <option key={sym} value={sym}>
            {baseAsset}
            /
            {quoteAsset}
          </option>
        )) : <option>Loading...</option>}
    </Input>
  );
};

export default Symbols;
