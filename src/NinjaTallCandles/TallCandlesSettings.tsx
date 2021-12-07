import React, { Dispatch, ReactElement } from 'react';
import { Input } from 'reactstrap';
import { useValue } from 'use-change';
import { NINJA_SIGNALS } from '../store';

interface Props {
  soundsOn: boolean;
  setSoundsOn: Dispatch<boolean>;
  tallerTimes: number;
  setTallerTimes: Dispatch<number>;
}

const TallCandlesSettings = ({
  soundsOn, setSoundsOn, tallerTimes, setTallerTimes,
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
          id="ninjaTallerTimesSoundsOn"
        />
        {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
        <label className="form-check-label" htmlFor="ninjaTallerTimesSoundsOn">
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
          value={tallerTimes}
          onChange={({ target }) => setTallerTimes(+target.value || 0)}
          id="ninjaTallerTimes"
        />
      </div>
    </>
  );
};

export default TallCandlesSettings;
