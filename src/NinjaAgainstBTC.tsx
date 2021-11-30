import { isEmpty } from 'lodash';
import React, { ReactElement } from 'react';
import { Button } from 'reactstrap';
import { useSilent, useValue } from 'use-change';
import { NINJA_AGAINST_BTC } from './store';

const NinjaAgainstBTC = () : ReactElement => {
  const allCandles = useValue(NINJA_AGAINST_BTC, 'allCandles');
  const backtest = useSilent(NINJA_AGAINST_BTC, 'backtest');
  return (
    <Button color="primary" disabled={isEmpty(allCandles)} onClick={backtest}>Backtest</Button>
  );
};

export default NinjaAgainstBTC;
