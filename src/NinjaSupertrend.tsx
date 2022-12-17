import { RootStore } from 'altamoon-types';
import React, { ReactElement } from 'react';
import { Trash } from 'react-bootstrap-icons';
import { hot } from 'react-hot-loader/root';
import { Button, Input, Table } from 'reactstrap';
import useChange, { useSet, useSilent, useValue } from 'use-change';
import { NINJA_PERSISTENT, NINJA_SUPERTREND } from './store';

const NinjaSupertrend = (): ReactElement => {
  const backtestResult = useValue(NINJA_SUPERTREND, 'backtestResult');
  const backtestStat = useValue(NINJA_SUPERTREND, 'backtestStat');
  const [balanceRatioBidPercentStr, setBalanceRatioBidPercent] = useChange(NINJA_PERSISTENT, 'supertrendBalanceRatioBidPercentStr');
  const supertrendItems = useValue(NINJA_PERSISTENT, 'supertrendItems');
  const createSupertrendItem = useSilent(NINJA_SUPERTREND, 'createSupertrendItem');
  const removeSupertrendItem = useSilent(NINJA_SUPERTREND, 'removeSupertrendItem');
  const setSymbol = useSet(({ persistent }: RootStore) => persistent, 'symbol');
  const allSymbolsPositionRisk = useValue(({ trading }: RootStore) => trading, 'allSymbolsPositionRisk');

  return (
    <div>
      <p>
        Current backtest result:
        {' '}
        {backtestResult && backtestResult > 0 ? '+' : ''}
        {backtestResult ? `${backtestResult.toFixed(2)}%` : 'loading...'}
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
        <Button color="secondary" onClick={createSupertrendItem}>Create</Button>
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
          {supertrendItems.map(({ symbol, interval, balanceRatioBidPercent }) => (
            <tr key={symbol}>
              <td><span className="link-alike" onClick={() => setSymbol(symbol)}>{symbol}</span></td>
              <td>{interval}</td>
              <td>
                {balanceRatioBidPercent}
                %
              </td>
              <td>{allSymbolsPositionRisk[symbol]?.leverage || 'Unknown'}</td>
              <td>
                <Trash onClick={() => removeSupertrendItem(symbol)} />
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          {!supertrendItems.length ? <tr><td colSpan={1000} className="text-center"><em>Not items yet</em></td></tr> : null}
        </tfoot>
      </Table>
    </div>
  );
};

export default hot(NinjaSupertrend);
