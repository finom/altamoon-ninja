import { RootStore } from 'altamoon-types';
import React, { useState } from 'react';
import { hot } from 'react-hot-loader/root';
import { Input } from 'reactstrap';
import { useValue } from 'use-change';

const CompoundInterestCalculator = () => {
  const totalWalletBalance = useValue(({ account }: RootStore) => account, 'totalWalletBalance');
  const dailyPnlPercent = useValue(({ stats }: RootStore) => stats, 'dailyPnlPercent');
  const [perDay, setPerDay] = useState(dailyPnlPercent);
  const [initial, setInitial] = useState(totalWalletBalance);
  const getResult = (days: number) => {
    let balance = initial;
    for (let i = 0; i <= days; i += 1) {
      balance *= (perDay / 100) + 1;
    }
    return balance;
  };

  const calcPercent = (b: number) => (((b / initial - 1) * 100 || 0).toFixed(2)).toLocaleString();
  const formatNumber = (n: number) => (+n.toFixed(2)).toLocaleString();

  const week = getResult(7);
  const month = getResult(30);
  const season = getResult(90);
  const halfYear = getResult(180);
  const year = getResult(365);

  return (
    <div>
      <label className="mb-1">% per day</label>
      <Input type="number" className="mb-3" value={perDay} onChange={({ target }) => setPerDay(+target.value || 0)} />
      <label className="mb-1">Initial balance $</label>
      <Input type="number" className="mb-3" value={initial} onChange={({ target }) => setInitial(+target.value || 0)} />

      <ul>
        <li>
          <label>7 days:</label>
          {' '}
          <span>{formatNumber(week)}</span>
          {' '}
          (+
          <span>{calcPercent(week)}</span>
          %)
        </li>
        <li>
          <label>30 days:</label>
          {' '}
          <span>{formatNumber(month)}</span>
          {' '}
          (+
          <span>{calcPercent(month)}</span>
          %)
        </li>
        <li>
          <label>90 days:</label>
          {' '}
          <span>{formatNumber(season)}</span>
          {' '}
          (+
          <span>{calcPercent(season)}</span>
          %)
        </li>
        <li>
          <label>180 days:</label>
          {' '}
          <span>{formatNumber(halfYear)}</span>
          {' '}
          (+
          <span>{calcPercent(halfYear)}</span>
          %)
        </li>
        <li>
          <label>365 days:</label>
          {' '}
          <span>{formatNumber(year)}</span>
          {' '}
          (+
          <span>{calcPercent(year)}</span>
          %)
        </li>
      </ul>
    </div>
  );
};

export default hot(CompoundInterestCalculator);
