import * as t from 'altamoon-types';
import React from 'react';
import { Provider } from 'use-change';
import { render } from 'react-dom';
import Ninja from './Ninja';
import NinjaStore from './store';

window.altamoonPlugin((store: t.RootStore & { ninja: NinjaStore }) => {
  const { currentScript } = document;
  if (!currentScript) throw new Error('Unable to detect currentScript');
  const { element } = store.customization.createWidget({
    id: 'altamoon_ninja',
    hasSettings: false,
    title: 'Ninja',
    currentScript,
    layout: { h: 6, w: 4, minH: 5 },
  });

  // eslint-disable-next-line no-param-reassign
  store.ninja = new NinjaStore(store);

  render((
    <Provider value={store}>
      <Ninja />
    </Provider>
  ), element);
});
