export type Timeframe = 'daily' | 'weekly' | 'monthly';

export type SignalType = 'GUCLU_AL' | 'AL' | 'NOTR' | 'SAT' | 'GUCLU_SAT';

export interface StockSignal {
  id?: string;
  symbol: string;
  timeframe: Timeframe;
  signal_type: SignalType;
  current_price: number;
  price_change_pct?: number;
  target_price_1: number;
  target_price_2: number;
  stop_loss: number;
  risk_reward_ratio: number;
  rsi_14: number;
  ema_9: number;
  ema_21: number;
  ema_50: number;
  volume_ratio: number;
  market_trend: 'BULLISH' | 'BEARISH' | 'SIDEWAYS';
  heavyweight_support: boolean;
  ai_confidence: number;
  ai_summary: string;
  holder_advice: 'TUT' | 'KISMI_KAR_AL' | 'STOP_OL' | 'POZISYON_AC';
  risk_warning: string;
  created_at: string;
}

export interface PortfolioItem {
  id: string;
  symbol: string;
  buy_price: number;
  quantity: number;
  buy_date: string;
  stop_loss?: number;
  target_price?: number;
  notes?: string;
  status: 'OPEN' | 'CLOSED';
  current_price?: number;
  total_cost?: number;
  total_value?: number;
  profit_loss_amount?: number;
  profit_loss_pct?: number;
  ai_advice?: string;
  created_at: string;
}

export interface KapNotification {
  id?: string;
  symbol: string;
  title: string;
  category: string;
  summary: string;
  sentiment: 'POZITIF' | 'NOTR' | 'NEGATIF';
  impact_score: number;
  publish_date: string;
  source_url?: string;
}

export interface MarketRegime {
  regime: 'BULLISH' | 'BEARISH' | 'SIDEWAYS';
  score: number;
  bist100_change: number;
  bist30_change: number;
  heavyweight_bullish_count: number;
  heavyweight_total: number;
  summary: string;
}
