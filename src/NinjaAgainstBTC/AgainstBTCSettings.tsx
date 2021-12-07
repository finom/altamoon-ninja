import React, { Dispatch, ReactElement } from 'react';
import { Input } from 'reactstrap';
import * as api from 'altamoon-binance-api';

import Intervals from '../components/Intervals';

interface Props {
  soundsOn: boolean;
  setSoundsOn: Dispatch<boolean>;
  candlesThreshold: number;
  setCandlesThreshold: Dispatch<number>;
  candlesInterval: api.CandlestickChartInterval;
  setCandlesInterval: Dispatch<api.CandlestickChartInterval>;
}

const AgainstBTCSettings = ({
  soundsOn, setSoundsOn, candlesThreshold, setCandlesThreshold, candlesInterval, setCandlesInterval,
}: Props): ReactElement => (
  <>
    <div className="form-check mb-3">
      <input
        className="form-check-input"
        type="checkbox"
        checked={soundsOn}
        onChange={({ target }) => setSoundsOn(target.checked)}
        id="ninjaAgainstBTCSoundsOn"
      />
      {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
      <label className="form-check-label" htmlFor="ninjaAgainstBTCSoundsOn">
        Sounds on
      </label>
    </div>
    <div>
      <label className="mb-1">
        # of candles (use 0 to disable)
      </label>
      <Input
        type="number"
        value={candlesThreshold}
        onChange={({ target }) => setCandlesThreshold(+target.value || 0)}
        id="ninjaAgainstBTCTop"
      />
    </div>
    <div className="mt-3">
      <Intervals value={candlesInterval} onChange={setCandlesInterval} />
    </div>
  </>
);

export default AgainstBTCSettings;
