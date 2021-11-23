import React, { ReactElement, useEffect, useState } from 'react';
import * as api from 'altamoon-binance-api';
import { hot } from 'react-hot-loader/root';
import { Col, Input, Row } from 'reactstrap';
import useChange from 'use-change';
import styled from 'styled-components';
import { createPortal } from 'react-dom';
import Toggle from './Toggle';
import { NINJA } from './store';
import Settings from './Settings';

const Intervals = styled.div`
  padding-bottom: 1rem;
  flex-wrap: nowrap!important;
  overflow: auto;  
`;

const IntervalItem = styled.div`
  & > span {
    padding: 0.5rem 0.75rem;
  }
`;

const EnabledLabel = styled.span<{ enabled: boolean; }>`
  animation: ${({ enabled }) => (enabled ? 'bouncingEnabledBlinker 1s linear infinite' : 'none')};
  background-color: transparent;
    @keyframes bouncingEnabledBlinker {
    50% {
        background-color: var(--bs-warning);
    }
  }
`;

interface Props {
  settingsElement: HTMLElement;
  listenSettingsSave: (handler: () => void) => (() => void);
  listenSettingsCancel: (handler: () => void) => (() => void);
}

const Ninja = ({
  settingsElement, listenSettingsSave, listenSettingsCancel,
}: Props): ReactElement => {
  const [isBouncedOrderEnabled, setIsBouncedOrderEnabled] = useChange(NINJA, 'isBouncedOrderEnabled');
  const [bouncedOrderSide, setBouncedOrderSide] = useChange(NINJA, 'bouncedOrderSide');
  const [bouncedOrderValueStr, setBouncedOrderValueStr] = useChange(NINJA, 'bouncedOrderValueStr');
  const [interval, setChartInterval] = useChange(NINJA, 'candlesInterval');
  const [bouncedOrderReduceOnly, setBouncedOrderReduceOnly] = useChange(NINJA, 'bouncedOrderReduceOnly');
  const [soundsOn, setSoundsOn] = useChange(NINJA, 'soundsOn');
  const [settingsSoundsOn, setSettingsSoundsOn] = useState<boolean>(soundsOn);

  // update pnlType after settings save
  useEffect(() => listenSettingsSave(() => { setSoundsOn(settingsSoundsOn); }));

  // reset pnlType setting after settings change cancel
  useEffect(() => listenSettingsCancel(() => { setSettingsSoundsOn(soundsOn); }));

  return (
    <>
      {createPortal((
        <Settings soundsOn={settingsSoundsOn} setSoundsOn={setSettingsSoundsOn} />
      ), settingsElement)}
      <Row>
        <Col>
          <div className="form-check form-check-inline mb-3">
            <label>
              <Input
                type="checkbox"
                checked={isBouncedOrderEnabled}
                onChange={({ target }) => setIsBouncedOrderEnabled(target.checked)}
              />
              {' '}
              <EnabledLabel enabled={isBouncedOrderEnabled}>
                Bounced order
              </EnabledLabel>
            </label>
          </div>
          <Toggle
            id="ninja_toggle"
            checkedLabel="Buy"
            uncheckedLabel="Sell"
            isChecked={bouncedOrderSide === 'BUY'}
            onChange={(b) => setBouncedOrderSide(b ? 'BUY' : 'SELL')}
          />
          <Intervals className="nav nav-pills mt-3">
            {api.futuresIntervals.map((intervalsItem, index) => (
              <IntervalItem
                role="button"
                tabIndex={index}
                className="nav-item cursor-pointer"
                key={intervalsItem}
                onClick={() => { setChartInterval(intervalsItem); }}
                onKeyDown={() => { setChartInterval(intervalsItem); }}
              >
                <span className={`nav-link ${interval === intervalsItem ? 'active' : ''}`}>
                  {intervalsItem}
                </span>
              </IntervalItem>
            ))}
          </Intervals>
          <div className="form-check form-check-inline">
            <label className="form-check-label">
              <Input
                type="checkbox"
                checked={bouncedOrderReduceOnly}
                onChange={({ target }) => setBouncedOrderReduceOnly(target.checked)}
              />
              {' '}
              Reduce-only
            </label>
          </div>
          <div className="mt-2">
            <label className="mb-1">Size</label>
            <Input placeholder="Value" value={bouncedOrderValueStr} onChange={({ target }) => setBouncedOrderValueStr(target.value)} />
          </div>

        </Col>
        <Col xs={12} />
      </Row>
    </>
  );
};

export default hot(Ninja);
