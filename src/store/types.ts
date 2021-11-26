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

export interface MinMaxSignal {
  symbol: string;
  timeISO: string;
  price: number;
  type: 'MIN' | 'MAX';
}
