import React, { useState } from 'react';
import { hot } from 'react-hot-loader/root';
import { Input } from 'reactstrap';

/*
function handler() {
  const percentPerDay = +form.percentPerDay.value || 0;
  const initialBalance = +form.balance.value || 0;
  let balance = initialBalance;
  const calcPercent = (b) => ((b / initialBalance - 1) * 100)

  for(let i = 0; i <= 365; i++) {
    balance *= (percentPerDay / 100) + 1;
    if(i === 7) {
      form.result7.value = balance;
      form.result7Percent.value = calcPercent(balance);
    }

    if(i === 30) {
      form.result30.value = balance;
      form.result30Percent.value = calcPercent(balance);
    }

    if(i === 90) {
      form.result90.value = balance;
      form.result90Percent.value = calcPercent(balance);
    }

    if(i === 180) {
      form.result180.value = balance;
      form.result180Percent.value = calcPercent(balance);
    }

    if(i === 365) {
      form.resultYear.value = balance;
      form.resultYearPercent.value = calcPercent(balance);
    }
  }
*/

const CompoundInterestCalculator = () => {
  const [perDay, setPerDay] = useState(2);
  const [initial, setInitial] = useState(100);
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

  console.log('week', week);

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
