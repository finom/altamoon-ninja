import { RootStore } from 'altamoon-types';
import * as api from 'altamoon-binance-api';
import React, { ReactElement, useEffect, useState } from 'react';
import { ArrowDown, ArrowUp } from 'react-bootstrap-icons';
import { createPortal } from 'react-dom';
import { hot } from 'react-hot-loader/root';
import Moment from 'react-moment';
import useChange, { useSet, useValue } from 'use-change';

import { NINJA_PERSISTENT } from '../store';
import AgainstBTCSettings from './AgainstBTCSettings';

interface Props {
  settingsElement: HTMLElement;
  listenSettingsSave: (handler: () => void) => (() => void);
  listenSettingsCancel: (handler: () => void) => (() => void);
}

const NinjaAgainstBTC = ({
  settingsElement, listenSettingsSave, listenSettingsCancel,
}: Props): ReactElement => {
  const againstBtcItems = useValue(NINJA_PERSISTENT, 'againstBtcItems');
  const setSymbol = useSet(({ persistent }: RootStore) => persistent, 'symbol');

  const [candlesThreshold, setCandlesThreshold] = useChange(NINJA_PERSISTENT, 'againstBTCCandlesThreshold');
  const [
    settingsCandlesThreshold, setSettingsCandlesThreshold,
  ] = useState<number>(candlesThreshold);

  const [soundsOn, setSoundsOn] = useChange(NINJA_PERSISTENT, 'againstBTCSoundsOn');
  const [settingsSoundsOn, setSettingsSoundsOn] = useState<boolean>(soundsOn);

  const [candlesInterval, setCandlesInterval] = useChange(NINJA_PERSISTENT, 'againstBTCCandlesInterval');
  const [
    settingsCandlesInterval, setSettingsCandlesInterval,
  ] = useState<api.CandlestickChartInterval>(candlesInterval);

  useEffect(
    () => listenSettingsSave(() => {
      setSoundsOn(settingsSoundsOn);
      setCandlesThreshold(settingsCandlesThreshold);
      setCandlesInterval(settingsCandlesInterval);
    }),
    [
      listenSettingsSave, setCandlesInterval, setCandlesThreshold,
      setSoundsOn, settingsCandlesInterval, settingsCandlesThreshold, settingsSoundsOn,
    ],
  );

  // reset pnlType setting after settings change cancel
  useEffect(
    () => listenSettingsCancel(() => {
      setSettingsCandlesThreshold(candlesThreshold);
      setSettingsSoundsOn(soundsOn);
      setSettingsCandlesInterval(candlesInterval);
    }),
    [candlesInterval, candlesThreshold, listenSettingsCancel, soundsOn],
  );

  return (
    <>
      {createPortal((
        <AgainstBTCSettings
          soundsOn={settingsSoundsOn}
          setSoundsOn={setSettingsSoundsOn}
          candlesThreshold={settingsCandlesThreshold}
          setCandlesThreshold={setSettingsCandlesThreshold}
          candlesInterval={settingsCandlesInterval}
          setCandlesInterval={setSettingsCandlesInterval}
        />
      ), settingsElement)}
      {!againstBtcItems.length && <em>No against BTC signals yet</em>}
      <ul>
        {againstBtcItems.map(({
          symbol, timeISO, direction, num,
        }) => (
          <li key={symbol}>
            {direction === 'UP' && <ArrowUp className="text-success" />}

            {direction === 'DOWN' && <ArrowDown className="text-danger" />}
            {' '}
            <span className="link-alike" onClick={() => setSymbol(symbol)}>{symbol}</span>
            {' '}
            {num}
            {' '}
            candles against
            {' '}
            <span className="link-alike" onClick={() => setSymbol('BTCUSDT')}>BTC</span>
            {' '}
            <Moment fromNow>{timeISO}</Moment>
          </li>
        ))}
      </ul>
    </>
  );
};

export default hot(NinjaAgainstBTC);
