import React, { Dispatch, ReactElement } from 'react';
import { Input } from 'reactstrap';
import { useValue } from 'use-change';
import { NINJA_SIGNALS } from '../store';

interface Props {
  soundsOn: boolean;
  setSoundsOn: Dispatch<boolean>;
  minMaxTop: number;
  setMinMaxTop: Dispatch<number>;
}

const MinMaxSettings = ({
  soundsOn, setSoundsOn, minMaxTop, setMinMaxTop,
}: Props): ReactElement => {
  const exchangeInfo = useValue(NINJA_SIGNALS, 'exchangeInfo');
  return (
    <>
      <div className="form-check mb-3">
        <input
          className="form-check-input"
          type="checkbox"
          checked={soundsOn}
          onChange={({ target }) => setSoundsOn(target.checked)}
          id="ninjaMinMaxSoundsOn"
        />
        {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
        <label className="form-check-label" htmlFor="ninjaMinMaxSoundsOn">
          Sounds on
        </label>
      </div>
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
    </>
  );
};

export default MinMaxSettings;
