/**
 * Trade Core Service - Order Execution
 * Handles trade lifecycle from order placement to execution
 * VERSION 2.0 - BREAKING CHANGES
 */

/**
 * @intent Represents a single trade execution
 * Decimal places uses bankers' rounding for accurate settlement
 */
export interface TradeDto {
  trade_id: string;
  order_id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  
  /**
   * @intent Decimal places for price display formatting
   * Uses bankers' rounding (round half to even) for accurate settlement
   */
  decimal_places: number; // RENAMED from price_precision
  
  currency: string;
  execution_time: Date;
  venue: string;
  counterparty?: string;
  
  status: 'PENDING' | 'EXECUTED' | 'FAILED' | 'CANCELLED';
}

/**
 * @intent Order request from client
 */
export interface OrderDto {
  order_id: string;
  client_id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  order_type: 'MARKET' | 'LIMIT' | 'STOP';
  limit_price?: number;
  stop_price?: number;
  time_in_force: 'DAY' | 'GTC' | 'IOC' | 'FOK';
  created_at: Date;
}

/**
 * @intent Execution report sent to client
 */
export interface ExecutionReportDto {
  report_id: string;
  order_id: string;
  trade_id?: string;
  status: 'NEW' | 'PARTIAL' | 'FILLED' | 'REJECTED';
  filled_quantity: number;
  remaining_quantity: number;
  avg_price?: number;
  timestamp: Date;
}
