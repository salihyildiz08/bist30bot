-- ==============================================================================
-- BIST 30 YAPAY ZEKA DESTEKLİ ANALİZ VE PORTFÖY YÖNETİMİ VERİTABANI ŞEMASI
-- Supabase SQL Editor üzerinden doğrudan çalıştırılabilir.
-- ==============================================================================

-- 1. Hisseler Tablosu (BIST 30 Şirketleri ve Temel Bilgileri)
CREATE TABLE IF NOT EXISTS bist30_stocks (
    symbol VARCHAR(10) PRIMARY KEY,        -- Örn: THYAO, ASELS, CANTE
    name VARCHAR(100) NOT NULL,            -- Örn: Türk Hava Yolları
    sector VARCHAR(50),                    -- Havacılık, Bankacılık, Holding vb.
    weight_in_index NUMERIC(5, 2),         -- BIST 30 içindeki ağırlığı (%)
    is_heavyweight BOOLEAN DEFAULT false,  -- Endeksi sürükleyen ana hisseler (THYAO, TUPRS, AKBNK vb.)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Günlük / Haftalık / Aylık Teknik ve AI Analiz Sinyalleri
CREATE TABLE IF NOT EXISTS stock_signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol VARCHAR(10) REFERENCES bist30_stocks(symbol) ON DELETE CASCADE,
    timeframe VARCHAR(10) NOT NULL,        -- 'daily', 'weekly', 'monthly'
    signal_type VARCHAR(20) NOT NULL,      -- 'GUCLU_AL', 'AL', 'NOTR', 'SAT', 'GUCLU_SAT'
    current_price NUMERIC(10, 2) NOT NULL,
    target_price_1 NUMERIC(10, 2),
    target_price_2 NUMERIC(10, 2),
    stop_loss NUMERIC(10, 2),
    risk_reward_ratio NUMERIC(5, 2),
    
    -- Teknik İndikatör Değerleri
    rsi_14 NUMERIC(5, 2),
    ema_9 NUMERIC(10, 2),
    ema_21 NUMERIC(10, 2),
    ema_50 NUMERIC(10, 2),
    volume_ratio NUMERIC(5, 2),
    vwap NUMERIC(10, 2),
    
    -- Piyasa Rejimi ve Endeks Etkisi
    market_trend VARCHAR(20),
    heavyweight_support BOOLEAN,
    
    -- Yapay Zeka Sentezi
    ai_confidence INT CHECK (ai_confidence BETWEEN 0 AND 100),
    ai_summary TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_signals_symbol_created ON stock_signals(symbol, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_signals_timeframe ON stock_signals(timeframe);

-- 3. Portföyüm Tablosu (Satın Alınan Hisseler ve K/Z Takibi)
CREATE TABLE IF NOT EXISTS user_portfolio (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    symbol VARCHAR(10) REFERENCES bist30_stocks(symbol) ON DELETE CASCADE,
    buy_price NUMERIC(10, 2) NOT NULL,
    quantity NUMERIC(12, 2) NOT NULL,
    buy_date DATE NOT NULL DEFAULT CURRENT_DATE,
    stop_loss NUMERIC(10, 2),
    target_price NUMERIC(10, 2),
    notes TEXT,
    status VARCHAR(20) DEFAULT 'OPEN',
    sold_price NUMERIC(10, 2),
    sold_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_portfolio_user_symbol ON user_portfolio(symbol, status);

-- 4. KAP ve Finansal Haberler Tablosu
CREATE TABLE IF NOT EXISTS kap_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol VARCHAR(10) REFERENCES bist30_stocks(symbol) ON DELETE CASCADE,
    title TEXT NOT NULL,
    category VARCHAR(100),
    summary TEXT,
    sentiment VARCHAR(20),
    impact_score INT CHECK (impact_score BETWEEN 1 AND 5),
    publish_date TIMESTAMP WITH TIME ZONE,
    source_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kap_symbol_date ON kap_notifications(symbol, publish_date DESC);

-- ==============================================================================
-- RLS (ROW LEVEL SECURITY) POLİTİKALARI (Anon ve Web Paneli Erişimi İçin)
-- ==============================================================================
ALTER TABLE bist30_stocks DISABLE ROW LEVEL SECURITY;
ALTER TABLE stock_signals DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_portfolio DISABLE ROW LEVEL SECURITY;
ALTER TABLE kap_notifications DISABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- BIST 30 BAŞLANGIÇ VERİLERİ (SEED)
-- ==============================================================================
INSERT INTO bist30_stocks (symbol, name, sector, is_heavyweight, weight_in_index) VALUES
('AKBNK', 'Akbank T.A.Ş.', 'Bankacılık', true, 6.80),
('ARCLK', 'Arçelik A.Ş.', 'Dayanıklı Tüketim', false, 1.40),
('ASELS', 'Aselsan Elektronik Sanayi', 'Savunma & Teknoloji', true, 5.20),
('ASTOR', 'Astor Enerji A.Ş.', 'Enerji', false, 1.90),
('BIMAS', 'BİM Birleşik Mağazalar', 'Perakende Ticaret', true, 8.50),
('BRSAN', 'Borusan Mannesmann', 'Metal & Sanayi', false, 1.10),
('CANTE', 'Çan2 Termik A.Ş.', 'Enerji', false, 0.80),
('EKGYO', 'Emlak Konut GYO', 'Gayrimenkul', false, 2.10),
('ENKAI', 'Enka İnşaat ve Sanayi', 'İnşaat & Taahhüt', false, 2.70),
('EREGL', 'Ereğli Demir ve Çelik', 'Demir Çelik', true, 4.90),
('FROTO', 'Ford Otomotiv Sanayi', 'Otomotiv', true, 4.30),
('GARAN', 'Garanti BBVA', 'Bankacılık', true, 7.10),
('GUBRF', 'Gübre Fabrikaları', 'Kimya', false, 1.20),
('HEKTS', 'Hektaş Ticaret', 'Kimya & Tarım', false, 0.90),
('ISCTR', 'Türkiye İş Bankası (C)', 'Bankacılık', true, 6.50),
('KCHOL', 'Koç Holding', 'Holding', true, 8.90),
('KONTR', 'Kontrolmatik Teknoloji', 'Teknoloji & Enerji', false, 1.30),
('KOZAL', 'Koza Altın İşletmeleri', 'Madencilik', false, 1.40),
('KRDMD', 'Kardemir (D)', 'Demir Çelik', false, 1.70),
('MGROS', 'Migros Ticaret', 'Perakende Ticaret', false, 2.50),
('OYAKC', 'Oyak Çimento', 'Çimento', false, 1.30),
('PETKM', 'Petkim Petrokimya', 'Kimya', false, 1.80),
('PGSUS', 'Pegasus Hava Taşımacılığı', 'Havacılık', false, 2.40),
('SAHOL', 'Sabancı Holding', 'Holding', true, 4.80),
('SASA',  'Sasa Polyester Sanayi', 'Tekstil & Kimya', false, 2.20),
('SISE',  'Türkiye Şişe ve Cam Fabrikaları', 'Cam & Sanayi', true, 3.80),
('TCELL', 'Turkcell İletişim', 'Telekomünikasyon', true, 4.10),
('THYAO', 'Türk Hava Yolları', 'Havacılık', true, 10.40),
('TOASO', 'Tofaş Türk Otomobil Fabrikası', 'Otomotiv', false, 2.60),
('TUPRS', 'Tüpraş Türkiye Petrol Rafinerileri', 'Petrol & Rafineri', true, 7.50),
('YKBNK', 'Yapı ve Kredi Bankası', 'Bankacılık', true, 5.10)
ON CONFLICT (symbol) DO UPDATE SET 
    name = EXCLUDED.name,
    sector = EXCLUDED.sector,
    is_heavyweight = EXCLUDED.is_heavyweight,
    weight_in_index = EXCLUDED.weight_in_index;
