import React, {
  ReactElement, useEffect, useState,
} from 'react';
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
  const minMax = useValue(NINJA_PERSISTENT, 'minMax');
  const [tallerTimes, setTallerTimes] = useChange(NINJA_PERSISTENT, 'minMaxTop');
  const [settingsTallerTimes, setSettingsTallerTimes] = useState(tallerTimes);
  const [soundsOn, setSoundsOn] = useChange(NINJA_PERSISTENT, 'minMaxSoundsOn');
  const [settingsSoundsOn, setSettingsSoundsOn] = useState<boolean>(soundsOn);

  // update pnlType after settings save
  useEffect(
    () => listenSettingsSave(() => {
      setSoundsOn(settingsSoundsOn);
      setTallerTimes(settingsTallerTimes);
    }),
    [listenSettingsSave, setSoundsOn, setTallerTimes, settingsSoundsOn, settingsTallerTimes],
  );

  // reset pnlType setting after settings change cancel
  useEffect(
    () => listenSettingsCancel(() => {
      setSettingsTallerTimes(tallerTimes);
      setSettingsSoundsOn(soundsOn);
    }),
    [listenSettingsCancel, soundsOn, tallerTimes],
  );

  return (
    <>
      {createPortal((
        <TallCandlesSettings
          soundsOn={settingsSoundsOn}
          setSoundsOn={setSettingsSoundsOn}
          tallerTimes={settingsTallerTimes}
          setTallerTimes={setSettingsTallerTimes}
        />
      ), settingsElement)}
      {!minMax.length && <em>No min/max signals yet</em>}
      <ul>
        {minMax.map(({
          symbol, timeISO, type, price,
        }) => (
          <li key={symbol}>
            {type === 'MAX' && <ArrowUp className="text-success" />}

            {type === 'MIN' && <ArrowDown className="text-danger" />}
            {' '}
            <span className="link-alike" onClick={() => setSymbol(symbol)}>{symbol}</span>
            {' '}
            at
            {' '}
            {price}
            {' '}
            <Moment fromNow>{timeISO}</Moment>
          </li>
        ))}
      </ul>
    </>
  );
};

export default hot(NinjaTallCandles);
