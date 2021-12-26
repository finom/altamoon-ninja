import * as api from 'altamoon-binance-api';

export type BouncingOrderId = string;

export interface BouncingOrder {
  id: BouncingOrderId;
  isEnabled: boolean;
  reduceOnly: boolean;
  symbol: string;
  side: api.OrderSide;
  valueStr: string;
  candlesInterval: api.CandlestickChartInterval;
}
