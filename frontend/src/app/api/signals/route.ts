import { NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Yahoo Finance üzerinden anlık canlı fiyat ve günlük yüzde değişim çekici
async function fetchLiveQuote(symbol: string) {
  try {
    const clean = symbol.replace('.IS', '');
    const ticker = `${clean}.IS`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?range=2d&interval=1d`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: controller.signal,
      cache: 'no-store'
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const json = await res.json();
      const meta = json?.chart?.result?.[0]?.meta;
      const livePrice = meta?.regularMarketPrice;
      const prevClose = meta?.chartPreviousClose;
      if (typeof livePrice === 'number' && livePrice > 0) {
        const changePct = prevClose ? Number((((livePrice - prevClose) / prevClose) * 100).toFixed(2)) : undefined;
        return { livePrice: Number(livePrice.toFixed(2)), changePct };
      }
    }
  } catch (e) {
    // Zaman aşımı veya ağ hatasında sessizce pas geç
  }
  return null;
}

async function enrichSignalsWithLiveQuotes(signals: any[]) {
  const quotes = await Promise.all(
    signals.map(s => fetchLiveQuote(s.symbol))
  );

  return signals.map((sig, idx) => {
    const quote = quotes[idx];
    if (quote && quote.livePrice) {
      return {
        ...sig,
        current_price: quote.livePrice,
        price_change_pct: quote.changePct !== undefined ? quote.changePct : sig.price_change_pct,
        is_live: true
      };
    }
    return sig;
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const timeframe = searchParams.get('timeframe') || 'daily';

  // 1. Supabase'den çekmeyi dene
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('stock_signals')
        .select('*')
        .eq('timeframe', timeframe)
        .order('created_at', { ascending: false })
        .limit(35);

      if (!error && data && data.length > 0) {
        const enriched = await enrichSignalsWithLiveQuotes(data);
        return NextResponse.json({ success: true, source: 'supabase', signals: enriched });
      }
    } catch (e) {
      console.error('Supabase query error:', e);
    }
  }

  // 2. Proje kökündeki local_db.json dosyasından oku
  try {
    const localDbPath = path.resolve(process.cwd(), '..', 'local_db.json');
    if (fs.existsSync(localDbPath)) {
      const raw = fs.readFileSync(localDbPath, 'utf-8');
      const json = JSON.parse(raw);
      const signals = (json.signals || []).filter((s: any) => s.timeframe === timeframe);
      if (signals.length > 0) {
        const enriched = await enrichSignalsWithLiveQuotes(signals);
        return NextResponse.json({ success: true, source: 'local_db', signals: enriched });
      }
    }
  } catch (e) {
    console.error('Local DB read error:', e);
  }

  // 3. Fallback: Örnek BIST 30 canlı sinyalleri (yine de canlı fiyatla zenginleştirilir)
  const mockSignals = [
    {
      symbol: 'THYAO',
      timeframe,
      signal_type: 'GUCLU_AL',
      current_price: 298.25,
      price_change_pct: 0.42,
      target_price_1: 325.00,
      target_price_2: 345.00,
      stop_loss: 282.50,
      risk_reward_ratio: 1.7,
      rsi_14: 61.2,
      ema_9: 290.5,
      ema_21: 284.4,
      ema_50: 275.0,
      volume_ratio: 2.15,
      market_trend: 'BULLISH',
      heavyweight_support: true,
      ai_confidence: 88,
      ai_summary: 'THYAO 20 günlük ortalama hacmin 2 katı hacimle güçlü seyrini sürdürüyor. EMA 9 > EMA 21 kesişimi teyitli.',
      holder_advice: 'POZISYON_AC',
      risk_warning: '305 TL psikolojik direncinde kâr satışları gelebilir.',
      created_at: new Date().toISOString()
    },
    {
      symbol: 'ASELS',
      timeframe,
      signal_type: 'AL',
      current_price: 329.50,
      price_change_pct: 0.15,
      target_price_1: 355.00,
      target_price_2: 375.00,
      stop_loss: 318.00,
      risk_reward_ratio: 1.6,
      rsi_14: 53.4,
      ema_9: 325.0,
      ema_21: 322.5,
      ema_50: 318.0,
      volume_ratio: 1.45,
      market_trend: 'SIDEWAYS',
      heavyweight_support: true,
      ai_confidence: 82,
      ai_summary: 'Savunma sanayi sipariş hacmi güçlü. Hacim katı 1.45x ile ortalamanın üzerinde. 318 TL altı kapanış stop olmak üzere takip edilebilir.',
      holder_advice: 'POZISYON_AC',
      risk_warning: '345 TL bölgesindeki direnç yakından izlenmeli.',
      created_at: new Date().toISOString()
    },
    {
      symbol: 'AKBNK',
      timeframe,
      signal_type: 'AL',
      current_price: 68.25,
      price_change_pct: 1.56,
      target_price_1: 74.00,
      target_price_2: 78.50,
      stop_loss: 65.00,
      risk_reward_ratio: 1.75,
      rsi_14: 58.1,
      ema_9: 66.2,
      ema_21: 65.1,
      ema_50: 63.5,
      volume_ratio: 1.71,
      market_trend: 'SIDEWAYS',
      heavyweight_support: true,
      ai_confidence: 84,
      ai_summary: 'Bankacılık endeksinde yabancı alımları pozitif. Net kâr marjı beklentileri olumlu.',
      holder_advice: 'TUT',
      risk_warning: 'Merkez Bankası faiz kararı öncesi bankacılık sektöründe dalgalanma yaşanabilir.',
      created_at: new Date().toISOString()
    },
    {
      symbol: 'GARAN',
      timeframe,
      signal_type: 'AL',
      current_price: 142.90,
      price_change_pct: 0.63,
      target_price_1: 155.00,
      target_price_2: 165.00,
      stop_loss: 136.00,
      risk_reward_ratio: 1.75,
      rsi_14: 62.4,
      ema_9: 139.5,
      ema_21: 136.2,
      ema_50: 130.0,
      volume_ratio: 1.55,
      market_trend: 'BULLISH',
      heavyweight_support: true,
      ai_confidence: 85,
      ai_summary: 'Garanti BBVA direnç seviyelerini yüksek hacimle test ediyor. Trend güçlü.',
      holder_advice: 'TUT',
      risk_warning: '150 TL psikolojik seviyesinde kâr realizasyonu olabilir.',
      created_at: new Date().toISOString()
    },
    {
      symbol: 'TUPRS',
      timeframe,
      signal_type: 'AL',
      current_price: 333.50,
      price_change_pct: 0.53,
      target_price_1: 360.00,
      target_price_2: 380.00,
      stop_loss: 320.00,
      risk_reward_ratio: 1.75,
      rsi_14: 56.8,
      ema_9: 328.0,
      ema_21: 324.0,
      ema_50: 315.0,
      volume_ratio: 1.35,
      market_trend: 'BULLISH',
      heavyweight_support: true,
      ai_confidence: 80,
      ai_summary: 'Rafineri marjlarındaki toparlanma fiyatı destekliyor.',
      holder_advice: 'POZISYON_AC',
      risk_warning: 'Ham petrol fiyatlarındaki volatilite yakından takip edilmeli.',
      created_at: new Date().toISOString()
    }
  ];

  const enriched = await enrichSignalsWithLiveQuotes(mockSignals);
  return NextResponse.json({ success: true, source: 'fallback', signals: enriched });
}
