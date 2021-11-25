import * as t from 'altamoon-types';
import React from 'react';
import { Provider } from 'use-change';
import { render } from 'react-dom';
import NinjaBouncingOrders from './NinjaBouncingOrders/NinjaBouncingOrders';
import NinjaStore from './store';
import LastUsedSymbols from './LastUsedSymbols';
import CompoundInterestCalculator from './CompoundInterestCalculator';

window.altamoonPlugin((store: t.RootStore & { ninja: NinjaStore }) => {
  const { currentScript } = document;
  if (!currentScript) throw new Error('Unable to detect currentScript');
  const ninjaWidget = store.customization.createWidget({
    id: 'altamoon_ninja_bouncing_order',
    hasSettings: true,
    title: 'Bouncing order',
    currentScript,
    layout: { h: 6, w: 4, minH: 5 },
  });

  const lastUsedSymbolsWidget = store.customization.createWidget({
    id: 'altamoon_ninja_last_used',
    hasSettings: false,
    title: 'Last used symbols',
    currentScript,
    layout: { h: 3, w: 4, minH: 1 },
  });

  const compoundICWidget = store.customization.createWidget({
    id: 'altamoon_ninja_cic',
    hasSettings: false,
    title: 'Compound interest calculator',
    currentScript,
    layout: { h: 3, w: 4, minH: 1 },
  });

  if (!ninjaWidget.settingsElement) throw new Error('Settings element is missing even though "hasSettings" is "true"');

  // eslint-disable-next-line no-param-reassign
  store.ninja = new NinjaStore(store);

  render((
    <Provider value={store}>
      <NinjaBouncingOrders
        settingsElement={ninjaWidget.settingsElement}
        listenSettingsSave={ninjaWidget.listenSettingsSave}
        listenSettingsCancel={ninjaWidget.listenSettingsCancel}
      />
    </Provider>
  ), ninjaWidget.element);

  render((
    <Provider value={store}>
      <LastUsedSymbols />
    </Provider>
  ), lastUsedSymbolsWidget.element);

  render((
    <Provider value={store}>
      <CompoundInterestCalculator />
    </Provider>
  ), compoundICWidget.element);
});
