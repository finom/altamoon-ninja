import { RootStore } from 'altamoon-types';
import React, { ReactElement } from 'react';
import { hot } from 'react-hot-loader/root';
import { useSet, useValue } from 'use-change';
import classNames from 'classnames';
import { NINJA_POSITION_INFO } from './store';

const NijaPositionInfo = () : ReactElement => {
  const risks = useValue(NINJA_POSITION_INFO, 'risks');
  const setSymbol = useSet(({ persistent }: RootStore) => persistent, 'symbol');

  return (
    <ul>
      {risks.map(({ symbol, risk }) => (
        <li key={symbol}>
          <span className="link-alike" onClick={() => setSymbol(symbol)}>{symbol}</span>
          :
          {' '}
          <span className={classNames({
            'text-danger': risk === 'high',
            'text-warning': risk === 'moderate',
            'text-success': risk === 'low',
          })}
          >
            {risk}
          </span>
        </li>
      ))}
    </ul>
  );
};

export default hot(NijaPositionInfo);
