/**
 * Trade Core Service - Order Execution
 * Handles trade lifecycle from order placement to execution
 */

/**
 * @intent Represents a single trade execution
 * Price precision uses floor rounding for conservative P&L estimates
 */
export interface TradeDto {
  trade_id: string;
  order_id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  
  /**
   * @intent Price precision for rounding calculations
   * Uses floor rounding for conservative P&L estimates
   */
  price_precision: number;
  
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
