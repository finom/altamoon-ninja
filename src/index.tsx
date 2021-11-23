import * as t from 'altamoon-types';
import React from 'react';
import { Provider } from 'use-change';
import { render } from 'react-dom';
import Ninja from './Ninja';
import NinjaStore from './store';

window.altamoonPlugin((store: t.RootStore & { ninja: NinjaStore }) => {
  const { currentScript } = document;
  if (!currentScript) throw new Error('Unable to detect currentScript');
  const {
    element, settingsElement, listenSettingsSave, listenSettingsCancel,
  } = store.customization.createWidget({
    id: 'altamoon_ninja',
    hasSettings: true,
    title: 'Ninja',
    currentScript,
    layout: { h: 6, w: 4, minH: 5 },
  });

  if (!settingsElement) throw new Error('Settings element is missing even though "hasSettings" is "true"');

  // eslint-disable-next-line no-param-reassign
  store.ninja = new NinjaStore(store);

  render((
    <Provider value={store}>
      <Ninja
        settingsElement={settingsElement}
        listenSettingsSave={listenSettingsSave}
        listenSettingsCancel={listenSettingsCancel}
      />
    </Provider>
  ), element);
});
