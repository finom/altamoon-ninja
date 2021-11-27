import React, { ReactElement } from 'react';
import { hot } from 'react-hot-loader/root';
import { Button } from 'reactstrap';
import { useSilent } from 'use-change';
import { NINJA_RECOMMENDATIONS } from './store';

const NinjaRecommendations = (): ReactElement => {
  const setMarginIsolatedAll = useSilent(NINJA_RECOMMENDATIONS, 'setMarginIsolatedAll');
  return (
    <>
      <Button color="primary" className="m-2" onClick={setMarginIsolatedAll}>Set isolated margin for all symbols</Button>
    </>
  );
};

export default hot(NinjaRecommendations);
