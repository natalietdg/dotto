/**
 * Clearing Service - Settlement & Reconciliation
 * Processes trade settlements and maintains ledger
 */

import { TradeDto } from '../trade-core/TradeDto';

/**
 * @intent Settlement instruction for clearing house
 * Depends on TradeDto for price precision calculations
 */
export interface ClearingDto {
  clearing_id: string;
  trade_id: string;
  
  // References TradeDto fields
  symbol: string;
  quantity: number;
  price: number;
  price_precision: number; // CRITICAL: Uses TradeDto.price_precision
  
  settlement_date: Date;
  settlement_amount: number;
  currency: string;
  
  clearing_house: string;
  status: 'PENDING' | 'CLEARED' | 'FAILED';
  
  fees: {
    clearing_fee: number;
    exchange_fee: number;
    regulatory_fee: number;
  };
}

/**
 * @intent Daily settlement batch
 */
export interface SettlementBatchDto {
  batch_id: string;
  settlement_date: Date;
  clearings: ClearingDto[];
  total_amount: number;
  currency: string;
  status: 'OPEN' | 'SUBMITTED' | 'SETTLED';
}

/**
 * @intent Reconciliation report for audit
 */
export interface ReconciliationDto {
  recon_id: string;
  date: Date;
  expected_settlements: number;
  actual_settlements: number;
  discrepancies: Array<{
    clearing_id: string;
    expected: number;
    actual: number;
    difference: number;
  }>;
  status: 'MATCHED' | 'DISCREPANCY' | 'INVESTIGATING';
}
