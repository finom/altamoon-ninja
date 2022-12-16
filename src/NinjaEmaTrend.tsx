import { RootStore } from 'altamoon-types';
import React, { ReactElement } from 'react';
import { Trash } from 'react-bootstrap-icons';
import { hot } from 'react-hot-loader/root';
import { Button, Input, Table } from 'reactstrap';
import useChange, { useSet, useSilent, useValue } from 'use-change';
import { NINJA_EMA_TREND, NINJA_PERSISTENT } from './store';

const NinjaEmaTrend = (): ReactElement => {
  const backtestResult = useValue(NINJA_EMA_TREND, 'backtestResult');
  const backtestStat = useValue(NINJA_EMA_TREND, 'backtestStat');
  const [balanceRatioBidPercentStr, setBalanceRatioBidPercent] = useChange(NINJA_PERSISTENT, 'emaTrendBalanceRatioBidPercentStr');
  const items = useValue(NINJA_PERSISTENT, 'emaTrendItems');
  const createItem = useSilent(NINJA_EMA_TREND, 'createEmaTrendItem');
  const removeItem = useSilent(NINJA_EMA_TREND, 'removeEmaTrendItem');
  const setSymbol = useSet(({ persistent }: RootStore) => persistent, 'symbol');
  const allSymbolsPositionRisk = useValue(({ trading }: RootStore) => trading, 'allSymbolsPositionRisk');

  return (
    <div>
      <p>
        Current backtest result:
        {' '}
        {backtestResult && backtestResult > 0 ? '+' : ''}
        {backtestResult !== null ? `${backtestResult.toFixed(2)}%` : 'loading...'}
      </p>
      <p>
        Collected stat:
        {' '}
        {backtestStat && backtestStat > 0 ? '+' : ''}
        {`${backtestStat.toFixed(2)}%`}
      </p>
      <p>
        <label className="mb-1">Bid balance %</label>
        <Input
          value={balanceRatioBidPercentStr}
          onChange={({ target }) => setBalanceRatioBidPercent(target.value)}
          className="mb-1"
        />
        <Button color="secondary" onClick={createItem}>Create</Button>
      </p>
      <Table>
        <thead>
          <tr>
            <th>Symbol</th>
            <th>Interval</th>
            <th>Bid size</th>
            <th>Leverage</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {items.map(({ symbol, interval, balanceRatioBidPercent }) => (
            <tr key={symbol}>
              <td><span className="link-alike" onClick={() => setSymbol(symbol)}>{symbol}</span></td>
              <td>{interval}</td>
              <td>
                {balanceRatioBidPercent}
                %
              </td>
              <td>{allSymbolsPositionRisk[symbol]?.leverage || 'Unknown'}</td>
              <td>
                <Trash onClick={() => removeItem(symbol)} />
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          {!items.length ? <tr><td colSpan={1000} className="text-center"><em>Not items yet</em></td></tr> : null}
        </tfoot>
      </Table>
    </div>
  );
};

export default hot(NinjaEmaTrend);
