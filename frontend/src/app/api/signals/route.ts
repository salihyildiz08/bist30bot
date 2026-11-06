import { NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
        return NextResponse.json({ success: true, source: 'supabase', signals: data });
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
        return NextResponse.json({ success: true, source: 'local_db', signals });
      }
    }
  } catch (e) {
    console.error('Local DB read error:', e);
  }

  // 3. Fallback: Örnek BIST 30 canlı sinyalleri
  const mockSignals = [
    {
      symbol: 'THYAO',
      timeframe,
      signal_type: 'GUCLU_AL',
      current_price: 291.25,
      price_change_pct: 4.25,
      target_price_1: 316.30,
      target_price_2: 332.80,
      stop_loss: 274.50,
      risk_reward_ratio: 1.5,
      rsi_14: 61.2,
      ema_9: 276.5,
      ema_21: 268.4,
      ema_50: 259.0,
      volume_ratio: 2.43,
      market_trend: 'BULLISH',
      heavyweight_support: true,
      ai_confidence: 88,
      ai_summary: 'THYAO 20 günlük ortalama hacmin 2.4 katı hacimle güçlü kırılım yaptı. EMA 9 > EMA 21 kesişimi teyitli. Yolcu doluluk oranları pozitif destekliyor.',
      holder_advice: 'POZISYON_AC',
      risk_warning: '300 TL psikolojik direncinde kâr satışları gelebilir.',
      created_at: new Date().toISOString()
    },
    {
      symbol: 'ASELS',
      timeframe,
      signal_type: 'AL',
      current_price: 353.75,
      price_change_pct: 2.4,
      target_price_1: 369.50,
      target_price_2: 380.00,
      stop_loss: 343.20,
      risk_reward_ratio: 1.5,
      rsi_14: 52.45,
      ema_9: 345.9,
      ema_21: 348.5,
      ema_50: 358.5,
      volume_ratio: 1.46,
      market_trend: 'SIDEWAYS',
      heavyweight_support: true,
      ai_confidence: 80,
      ai_summary: 'Savunma sanayi sipariş hacmi güçlü. Hacim katı 1.46x ile ortalamanın üzerinde. 343 TL altı kapanış stop olmak üzere takip edilebilir.',
      holder_advice: 'POZISYON_AC',
      risk_warning: '360 TL bölgesindeki 50 günlük EMA güçlü direnç konumunda.',
      created_at: new Date().toISOString()
    },
    {
      symbol: 'AKBNK',
      timeframe,
      signal_type: 'AL',
      current_price: 66.20,
      price_change_pct: 1.85,
      target_price_1: 71.00,
      target_price_2: 74.50,
      stop_loss: 63.10,
      risk_reward_ratio: 1.55,
      rsi_14: 58.1,
      ema_9: 64.2,
      ema_21: 63.8,
      ema_50: 61.5,
      volume_ratio: 1.71,
      market_trend: 'SIDEWAYS',
      heavyweight_support: true,
      ai_confidence: 82,
      ai_summary: 'Bankacılık endeksinde BofA ve yabancı takas payı yükselişte. Net kâr marjı beklentileri olumlu.',
      holder_advice: 'TUT',
      risk_warning: 'Merkez Bankası faiz kararı öncesi bankacılık sektöründe dalgalanma yaşanabilir.',
      created_at: new Date().toISOString()
    },
    {
      symbol: 'BIMAS',
      timeframe,
      signal_type: 'NOTR',
      current_price: 372.50,
      price_change_pct: 0.15,
      target_price_1: 394.85,
      target_price_2: 409.75,
      stop_loss: 357.60,
      risk_reward_ratio: 1.5,
      rsi_14: 36.24,
      ema_9: 367.0,
      ema_21: 379.5,
      ema_50: 391.9,
      volume_ratio: 1.66,
      market_trend: 'SIDEWAYS',
      heavyweight_support: true,
      ai_confidence: 70,
      ai_summary: 'BIMAS destek seviyelerinde konsolide oluyor. 380 TL direnci aşılmadan yeni alım için beklenmeli.',
      holder_advice: 'TUT',
      risk_warning: 'Perakende sektöründe marj baskısı takip edilmeli.',
      created_at: new Date().toISOString()
    },
    {
      symbol: 'ASTOR',
      timeframe,
      signal_type: 'SAT',
      current_price: 165.70,
      price_change_pct: -1.8,
      target_price_1: 175.60,
      target_price_2: 182.20,
      stop_loss: 159.00,
      risk_reward_ratio: 1.5,
      rsi_14: 39.59,
      ema_9: 162.5,
      ema_21: 177.3,
      ema_50: 216.0,
      volume_ratio: 0.98,
      market_trend: 'SIDEWAYS',
      heavyweight_support: false,
      ai_confidence: 75,
      ai_summary: 'Orta vadeli düşüş kanalı devam ediyor (EMA 21 < EMA 50). Hacim ortalamanın altında, zayıflık sürüyor.',
      holder_advice: 'STOP_OL',
      risk_warning: '159 TL desteğinin altına sarkarsa satışlar hızlanabilir.',
      created_at: new Date().toISOString()
    }
  ];

  return NextResponse.json({ success: true, source: 'fallback', signals: mockSignals });
}
