import React, {
  ReactElement, useCallback, useEffect, useState,
} from 'react';
import { hot } from 'react-hot-loader/root';
import {
  Button,
  Col, Input, Row, Table,
} from 'reactstrap';
import useChange, { useSet, useSilent } from 'use-change';
import styled from 'styled-components';
import { RootStore } from 'altamoon-types';
import { createPortal } from 'react-dom';
import { Link45deg, Trash } from 'react-bootstrap-icons';
import Toggle from './components/Toggle';
import { BouncingOrder, NINJA } from './store';
import Settings from './Settings';
import Intervals from './components/Intervals';
import Symbols from './components/Symbols';

const EnabledTr = styled.tr<{ enabled: boolean; }>`
  animation: ${({ enabled }) => (enabled ? 'bouncingEnabledBlinker 2s linear infinite' : 'none')};
  background-color: transparent;
    @keyframes bouncingEnabledBlinker {
    50% {
        background-color: #f39c1240;
    }
  }
`;

interface Props {
  settingsElement: HTMLElement;
  listenSettingsSave: (handler: () => void) => (() => void);
  listenSettingsCancel: (handler: () => void) => (() => void);
}

const NinjaBouncingOrders = ({
  settingsElement, listenSettingsSave, listenSettingsCancel,
}: Props): ReactElement => {
  const [soundsOn, setSoundsOn] = useChange(NINJA, 'soundsOn');
  const [bouncingOrders, setBouncingOrders] = useChange(NINJA, 'bouncingOrders');
  const [settingsSoundsOn, setSettingsSoundsOn] = useState<boolean>(soundsOn);
  const createBouncingOrder = useSilent(NINJA, 'createBouncingOrder');
  const deleteBouncingOrder = useSilent(NINJA, 'deleteBouncingOrder');
  const resubscribe = useSilent(NINJA, 'resubscribe');
  const setSymbol = useSet(({ persistent }: RootStore) => persistent, 'symbol');

  const updateBouncingOrder = useCallback((
    id: string, key: keyof BouncingOrder, value: BouncingOrder[typeof key],
  ) => {
    setBouncingOrders(bouncingOrders.map(
      (o) => (o.id === id ? { ...o, [key]: value } : o),
    ));

    if (key === 'symbol' || key === 'candlesInterval') {
      resubscribe(id);
    }
  }, [bouncingOrders, resubscribe, setBouncingOrders]);

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
          <Table style={{ verticalAlign: 'middle' }}>
            <thead>
              <tr>
                <th>{' '}</th>
                <th>Symbol</th>
                <th>{' '}</th>
                <th>Side</th>
                <th>Value</th>
                <th>Candles Interval</th>
                <th>Reduce</th>
                <th>{' '}</th>
              </tr>
            </thead>
            <tbody>
              {bouncingOrders.map(({
                id, isEnabled, symbol, side, valueStr, candlesInterval, reduceOnly,
              }) => (
                <EnabledTr enabled={isEnabled} key={id}>
                  <td>
                    <label className="text-nowrap">
                      <Input
                        type="checkbox"
                        checked={isEnabled}
                        onChange={({ target }) => updateBouncingOrder(id, 'isEnabled', target.checked)}
                        className="me-1"
                      />
                    </label>
                  </td>
                  <td>
                    <div style={{ width: '160px' }}>
                      <Symbols value={symbol} onChange={(v) => updateBouncingOrder(id, 'symbol', v)} />
                    </div>
                  </td>
                  <td>
                    <Link45deg size={20} className="cursor-pointer" onClick={() => setSymbol(symbol)} />
                  </td>
                  <td>
                    <div style={{ width: '120px' }}>
                      <Toggle
                        id={`ninja_toggle_${id}`}
                        checkedLabel="Buy"
                        uncheckedLabel="Sell"
                        isChecked={side === 'BUY'}
                        onChange={(b) => updateBouncingOrder(id, 'side', b ? 'BUY' : 'SELL')}
                      />
                    </div>
                  </td>
                  <td>
                    <div style={{ width: '100px' }}>
                      <Input placeholder="Value" value={valueStr} onChange={({ target }) => updateBouncingOrder(id, 'valueStr', target.value)} />
                    </div>
                  </td>
                  <td>
                    <div style={{ width: '140px' }}>
                      <Intervals value={candlesInterval} onChange={(v) => updateBouncingOrder(id, 'candlesInterval', v)} />
                    </div>
                  </td>
                  <td>
                    <Input
                      type="checkbox"
                      checked={reduceOnly}
                      onChange={({ target }) => updateBouncingOrder(id, 'reduceOnly', target.checked)}
                    />
                  </td>
                  <td>
                    <Trash size={18} className="cursor-pointer" onClick={() => deleteBouncingOrder(id)} />
                  </td>
                </EnabledTr>
              ))}
            </tbody>
            {!bouncingOrders.length && (
              <tbody><tr><td colSpan={100} className="text-center"><em>No bouncing orders yet</em></td></tr></tbody>
            )}
            <tbody>
              <tr><td colSpan={100}><Button color="primary" onClick={createBouncingOrder}>Create bouncing order</Button></td></tr>
            </tbody>

          </Table>
        </Col>
      </Row>
    </>
  );
};

export default hot(NinjaBouncingOrders);
