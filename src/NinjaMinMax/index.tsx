import React, {
  memo, ReactElement, useEffect, useState,
} from 'react';
import { RootStore } from 'altamoon-types';
import useChange, { useSet, useValue } from 'use-change';
import Moment from 'react-moment';
import { ArrowDown, ArrowUp } from 'react-bootstrap-icons';

import { createPortal } from 'react-dom';
import { NINJA_PERSISTENT } from '../store';
import MinMaxSettings from './MinMaxSettings';

interface Props {
  settingsElement: HTMLElement;
  listenSettingsSave: (handler: () => void) => (() => void);
  listenSettingsCancel: (handler: () => void) => (() => void);
}

const NinjaMinMax = ({
  settingsElement, listenSettingsSave, listenSettingsCancel,
}: Props): ReactElement => {
  const setSymbol = useSet(({ persistent }: RootStore) => persistent, 'symbol');
  const minMax = useValue(NINJA_PERSISTENT, 'minMax');
  const [minMaxTop, setMinMaxTop] = useChange(NINJA_PERSISTENT, 'minMaxTop');
  const [settingsMinMaxTop, setSettingsMinMaxTop] = useState<number>(minMaxTop);

  // update pnlType after settings save
  useEffect(
    () => listenSettingsSave(() => { setMinMaxTop(settingsMinMaxTop); }),
    [listenSettingsSave, setMinMaxTop, settingsMinMaxTop],
  );

  // reset pnlType setting after settings change cancel
  useEffect(
    () => listenSettingsCancel(() => { setSettingsMinMaxTop(minMaxTop); }),
    [listenSettingsCancel, minMaxTop],
  );

  return (
    <>
      {createPortal((
        <MinMaxSettings minMaxTop={settingsMinMaxTop} setMinMaxTop={setSettingsMinMaxTop} />
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

export default memo(NinjaMinMax);
