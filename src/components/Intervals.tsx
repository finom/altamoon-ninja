import React, { ReactElement } from 'react';
import * as api from 'altamoon-binance-api';
import styled from 'styled-components';

const IntervalsWrapper = styled.div`
  padding-bottom: 1rem;
  flex-wrap: nowrap!important;
  overflow: auto;  
`;

const IntervalItem = styled.div`
  & > span {
    padding: 0.5rem 0.75rem;
  }
`;

interface Props {
  value: api.CandlestickChartInterval;
  onChange: (v: api.CandlestickChartInterval) => void;
}

const Intervals = ({ value, onChange }: Props): ReactElement => (
  <IntervalsWrapper className="nav nav-pills mt-3">
    {api.futuresIntervals.map((intervalsItem, index) => (
      <IntervalItem
        role="button"
        tabIndex={index}
        className="nav-item cursor-pointer"
        key={intervalsItem}
        onClick={() => { onChange(intervalsItem); }}
        onKeyDown={() => { onChange(intervalsItem); }}
      >
        <span className={`nav-link ${intervalsItem === value ? 'active' : ''}`}>
          {intervalsItem}
        </span>
      </IntervalItem>
    ))}
  </IntervalsWrapper>
);

export default Intervals;
