import * as t from 'altamoon-types';
import React from 'react';
import { Provider } from 'use-change';
import { createPortal, render } from 'react-dom';
import NinjaBouncingOrders from './NinjaBouncingOrders';
import NinjaStore from './store';
import LastUsedSymbols from './LastUsedSymbols';
import NijaPositionInfo from './NijaPositionInfo';
import NinjaRecommendations from './NinjaRecommendations';
import NinjaAgainstBTC from './NinjaAgainstBTC';
import NinjaTallCandles from './NinjaTallCandles';
import NinjaSupertrend from './NinjaSupertrend';
import NinjaEmaTrend from './NinjaEmaTrend';
import NinjaTopCoins from './NinjaTopCoins';

window.altamoonPlugin((store: t.RootStore & { ninja: NinjaStore }) => {
  const { currentScript } = document;
  if (!currentScript) throw new Error('Unable to detect currentScript');
  const ninjaWidget = store.customization.createWidget({
    id: 'altamoon_ninja_bouncing_order',
    hasSettings: true,
    title: 'Bouncing order',
    currentScript,
    layout: {},
  });

  const lastUsedSymbolsWidget = store.customization.createWidget({
    id: 'altamoon_ninja_last_used',
    hasSettings: false,
    title: 'Last used symbols',
    currentScript,
    layout: {},
  });

  const positionInfoWidget = store.customization.createWidget({
    id: 'altamoon_ninja_position_info',
    hasSettings: false,
    title: 'PNL volatility',
    currentScript,
    layout: {},
  });

  const recommendationsWidget = store.customization.createWidget({
    id: 'altamoon_ninja_recommendations',
    hasSettings: false,
    title: 'Recommendations',
    currentScript,
    layout: {},
  });

  const againstBTCWidget = store.customization.createWidget({
    id: 'altamoon_ninja_againstbtc',
    hasSettings: true,
    title: 'Against BTC',
    currentScript,
    layout: {},
  });

  const tallCandlesWidget = store.customization.createWidget({
    id: 'altamoon_ninja_tall_candles',
    hasSettings: true,
    title: 'Tall candles',
    currentScript,
    layout: {},
  });

  const supertrendWidget = store.customization.createWidget({
    id: 'altamoon_ninja_supertrend',
    hasSettings: false,
    title: 'Supertrend',
    currentScript,
    layout: {},
  });

  const emaWidget = store.customization.createWidget({
    id: 'altamoon_ninja_ema_trend',
    hasSettings: false,
    title: 'EMA Trend',
    currentScript,
    layout: {},
  });

  const topCoinsWidget = store.customization.createWidget({
    id: 'altamoon_top_coins',
    hasSettings: false,
    title: 'Top Coins',
    currentScript,
    layout: {},
  });


  if (!ninjaWidget.settingsElement) throw new Error('Settings element is missing even though "hasSettings" is "true"');
  if (!againstBTCWidget.settingsElement) throw new Error('Settings element is missing even though "hasSettings" is "true"');
  if (!tallCandlesWidget.settingsElement) throw new Error('Settings element is missing even though "hasSettings" is "true"');

  // eslint-disable-next-line no-new
  new NinjaStore(store);

  render((
    <Provider value={store}>
      <NinjaBouncingOrders
        settingsElement={ninjaWidget.settingsElement}
        listenSettingsSave={ninjaWidget.listenSettingsSave}
        listenSettingsCancel={ninjaWidget.listenSettingsCancel}
      />
      {createPortal(<LastUsedSymbols />, lastUsedSymbolsWidget.element)}
      {createPortal(<NijaPositionInfo />, positionInfoWidget.element)}
      {createPortal(<NinjaRecommendations />, recommendationsWidget.element)}
      {createPortal(<NinjaSupertrend />, supertrendWidget.element)}
      {createPortal(<NinjaEmaTrend />, emaWidget.element)}
      {createPortal(<NinjaTopCoins />, topCoinsWidget.element)}
      {createPortal(<NinjaAgainstBTC
        settingsElement={againstBTCWidget.settingsElement}
        listenSettingsSave={againstBTCWidget.listenSettingsSave}
        listenSettingsCancel={againstBTCWidget.listenSettingsCancel}
      />, againstBTCWidget.element)}
      {createPortal(<NinjaTallCandles
        settingsElement={tallCandlesWidget.settingsElement}
        listenSettingsSave={tallCandlesWidget.listenSettingsSave}
        listenSettingsCancel={tallCandlesWidget.listenSettingsCancel}
      />, tallCandlesWidget.element)}
    </Provider>
  ), ninjaWidget.element);
});
