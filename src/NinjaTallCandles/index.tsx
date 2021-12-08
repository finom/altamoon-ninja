import React, {
  ReactElement, useEffect, useState,
} from 'react';
import * as api from 'altamoon-binance-api';
import { RootStore } from 'altamoon-types';
import useChange, { useSet, useValue } from 'use-change';
import Moment from 'react-moment';
import { ArrowDown, ArrowUp } from 'react-bootstrap-icons';

import { createPortal } from 'react-dom';
import { hot } from 'react-hot-loader/root';
import { NINJA_PERSISTENT } from '../store';
import TallCandlesSettings from './TallCandlesSettings';

interface Props {
  settingsElement: HTMLElement;
  listenSettingsSave: (handler: () => void) => (() => void);
  listenSettingsCancel: (handler: () => void) => (() => void);
}

const NinjaTallCandles = ({
  settingsElement, listenSettingsSave, listenSettingsCancel,
}: Props): ReactElement => {
  const setSymbol = useSet(({ persistent }: RootStore) => persistent, 'symbol');
  const tallCandlesItems = useValue(NINJA_PERSISTENT, 'tallCandlesItems');
  const [tallerTimes, setTallerTimes] = useChange(NINJA_PERSISTENT, 'tallCandlesSizeThreshold');
  const [settingsTallerTimes, setSettingsTallerTimes] = useState(tallerTimes);
  const [soundsOn, setSoundsOn] = useChange(NINJA_PERSISTENT, 'tallCandlesSoundOn');
  const [settingsSoundsOn, setSettingsSoundsOn] = useState<boolean>(soundsOn);
  const [candlesInterval, setCandlesInterval] = useChange(NINJA_PERSISTENT, 'tallCandlesInterval');
  const [
    settingsCandlesInterval, setSettingsCandlesInterval,
  ] = useState<api.CandlestickChartInterval>(candlesInterval);

  // update pnlType after settings save
  useEffect(
    () => listenSettingsSave(() => {
      setSoundsOn(settingsSoundsOn);
      setTallerTimes(settingsTallerTimes);
      setCandlesInterval(settingsCandlesInterval);
    }),
    [
      listenSettingsSave, setCandlesInterval, setSoundsOn,
      setTallerTimes, settingsCandlesInterval, settingsSoundsOn, settingsTallerTimes],
  );

  // reset pnlType setting after settings change cancel
  useEffect(
    () => listenSettingsCancel(() => {
      setSettingsTallerTimes(tallerTimes);
      setSettingsSoundsOn(soundsOn);
      setSettingsCandlesInterval(candlesInterval);
    }),
    [candlesInterval, listenSettingsCancel, soundsOn, tallerTimes],
  );

  return (
    <>
      {createPortal((
        <TallCandlesSettings
          soundsOn={settingsSoundsOn}
          setSoundsOn={setSettingsSoundsOn}
          tallerTimes={settingsTallerTimes}
          candlesInterval={settingsCandlesInterval}
          setCandlesInterval={setSettingsCandlesInterval}
          setTallerTimes={setSettingsTallerTimes}
        />
      ), settingsElement)}
      {!tallCandlesItems.length && <em>No tall candles signals yet</em>}
      <ul>
        {tallCandlesItems.map(({
          symbol, timeISO, direction, diff,
        }) => (
          <li key={symbol}>
            {direction === 'UP' && <ArrowUp className="text-success" />}

            {direction === 'DOWN' && <ArrowDown className="text-danger" />}
            {' '}
            <span className="link-alike" onClick={() => setSymbol(symbol)}>{symbol}</span>
            {' '}
            candle body
            {' '}
            {diff.toFixed(1)}
            {' '}
            times taller than avg
            {' '}
            <Moment fromNow>{timeISO}</Moment>
          </li>
        ))}
      </ul>
    </>
  );
};

export default hot(NinjaTallCandles);
