import React, { Dispatch, ReactElement } from 'react';
import { Input } from 'reactstrap';
import * as api from 'altamoon-binance-api';
import Intervals from '../components/Intervals';

interface Props {
  soundsOn: boolean;
  setSoundsOn: Dispatch<boolean>;
  tallerTimes: number;
  setTallerTimes: Dispatch<number>;
  candlesInterval: api.CandlestickChartInterval;
  setCandlesInterval: Dispatch<api.CandlestickChartInterval>;
}

const TallCandlesSettings = ({
  soundsOn, setSoundsOn, tallerTimes, setTallerTimes, candlesInterval, setCandlesInterval,
}: Props): ReactElement => (
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
        How many times a candle should be higher than average candle size
      </label>
      <Input
        type="number"
        value={tallerTimes}
        onChange={({ target }) => setTallerTimes(+target.value || 0)}
        id="ninjaTallerTimes"
      />
    </div>
    <div className="mt-3">
      <Intervals value={candlesInterval} onChange={setCandlesInterval} />
    </div>
  </>
);

export default TallCandlesSettings;
