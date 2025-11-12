/**
 * Risk Engine - Real-time P&L and Exposure Calculation
 * Monitors trading positions and calculates risk metrics
 */

import { TradeDto } from '../trade-core/TradeDto';

/**
 * @intent Real-time P&L calculation for a position
 * CRITICAL: Uses TradeDto.price_precision for rounding
 */
export interface RiskCalculationDto {
  calculation_id: number;
  position_id: string;
  symbol: string;
  
  // Trade data
  quantity: number;
  avg_entry_price: number;
  current_market_price: number;
  price_precision: number; // CRITICAL: Copied from TradeDto
  
  // P&L metrics
  unrealized_pnl: number;
  realized_pnl: number;
  total_pnl: number;
  
  // Risk metrics
  var_95: number; // Value at Risk 95%
  expected_shortfall: number;
  
  timestamp: Date;
}

/**
 * @intent Position exposure across all trades
 */
export interface ExposureDto {
  exposure_id: string;
  symbol: string;
  net_position: number;
  gross_position: number;
  market_value: number;
  notional_value: number;
  
  risk_limits: {
    position_limit: number;
    loss_limit: number;
    var_limit: number;
  };
  
  utilization: {
    position_pct: number;
    loss_pct: number;
    var_pct: number;
  };
  
  breaches: string[];
  timestamp: Date;
}

/**
 * @intent Portfolio-level risk metrics
 */
export interface PortfolioRiskDto {
  portfolio_id: string;
  total_exposure: number;
  total_pnl: number;
  portfolio_var: number;
  sharpe_ratio: number;
  max_drawdown: number;
  
  exposures: ExposureDto[];
  
  risk_status: 'NORMAL' | 'WARNING' | 'BREACH';
  timestamp: Date;
}

/**
 * @intent VaR calculation parameters
 */
export interface VaRDto {
  var_id: string;
  portfolio_id: string;
  confidence_level: number; // e.g., 0.95 for 95%
  time_horizon_days: number;
  methodology: 'HISTORICAL' | 'PARAMETRIC' | 'MONTE_CARLO';
  var_amount: number;
  calculated_at: Date;
}
