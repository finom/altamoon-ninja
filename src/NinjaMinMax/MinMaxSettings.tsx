import React, { Dispatch, ReactElement } from 'react';
import { Input } from 'reactstrap';
import { useValue } from 'use-change';
import { NINJA_SIGNALS } from '../store';

interface Props {
  minMaxTop: number;
  setMinMaxTop: Dispatch<number>;
}

const MinMaxSettings = ({ minMaxTop, setMinMaxTop }: Props): ReactElement => {
  const exchangeInfo = useValue(NINJA_SIGNALS, 'exchangeInfo');
  return (
    <div>
      <label className="mb-1">
        # of listened symbols (max
        {' '}
        {exchangeInfo?.symbols.length ?? 'unknown'}
        )
      </label>
      <Input
        type="number"
        value={minMaxTop}
        onChange={({ target }) => setMinMaxTop(+target.value || 0)}
        id="ninjaMinMaxTop"
      />
    </div>
  );
};

export default MinMaxSettings;
