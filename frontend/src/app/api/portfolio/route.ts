import { NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import fs from 'fs';
import path from 'path';

const LOCAL_DB_PATH = path.resolve(process.cwd(), '..', 'local_db.json');

async function getLiveStockPrice(symbol: string): Promise<number> {
  const ticker = symbol.endsWith('.IS') ? symbol : `${symbol}.IS`;
  try {
    const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?range=2d&interval=1d`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 60 } // 1 dk cache
    });
    if (res.ok) {
      const json = await res.json();
      const quote = json?.chart?.result?.[0]?.indicators?.quote?.[0];
      const closes = quote?.close?.filter((c: any) => c !== null);
      if (closes && closes.length > 0) {
        return Number(closes[closes.length - 1].toFixed(2));
      }
    }
  } catch (e) {
    console.error(`Live price fetch error for ${symbol}:`, e);
  }
  return 0;
}

function readLocalDB() {
  if (fs.existsSync(LOCAL_DB_PATH)) {
    try {
      return JSON.parse(fs.readFileSync(LOCAL_DB_PATH, 'utf-8'));
    } catch (e) {
      return { portfolio: [], signals: [], kap_news: [] };
    }
  }
  return { portfolio: [], signals: [], kap_news: [] };
}

function writeLocalDB(data: any) {
  try {
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error writing local DB:', e);
  }
}

// 1. GET: Portföyü ve Anlık K/Z Değerlerini Listele
export async function GET() {
  let portfolioItems: any[] = [];

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('user_portfolio')
        .select('*')
        .eq('status', 'OPEN')
        .order('created_at', { ascending: false });

      if (!error && data) {
        portfolioItems = data;
      }
    } catch (e) {
      console.error('Supabase portfolio fetch error:', e);
    }
  }

  if (portfolioItems.length === 0) {
    const local = readLocalDB();
    portfolioItems = (local.portfolio || []).filter((p: any) => p.status === 'OPEN');
  }

  // Eğer hiç kayıt yoksa başlangıç için örnek kayıt ekleyelim
  if (portfolioItems.length === 0) {
    portfolioItems = [
      {
        id: 'mock-1',
        symbol: 'THYAO',
        buy_price: 275.0,
        quantity: 100,
        buy_date: '2026-10-28',
        stop_loss: 265.0,
        target_price: 320.0,
        notes: '200 günlük EMA desteğinden kırılımla alındı',
        status: 'OPEN',
        created_at: new Date().toISOString()
      },
      {
        id: 'mock-2',
        symbol: 'ASELS',
        buy_price: 340.0,
        quantity: 50,
        buy_date: '2026-11-01',
        stop_loss: 330.0,
        target_price: 380.0,
        notes: 'Yeni savunma ihalesi beklentisi',
        status: 'OPEN',
        created_at: new Date().toISOString()
      }
    ];
  }

  // Her hisse için anlık fiyat ve K/Z hesapla
  const enrichedItems = await Promise.all(
    portfolioItems.map(async (item) => {
      const livePrice = (await getLiveStockPrice(item.symbol)) || Number(item.buy_price);
      const buyPrice = Number(item.buy_price);
      const qty = Number(item.quantity);
      const totalCost = buyPrice * qty;
      const totalValue = livePrice * qty;
      const profitLossAmount = Number((totalValue - totalCost).toFixed(2));
      const profitLossPct = Number((((livePrice - buyPrice) / (buyPrice || 1)) * 100).toFixed(2));

      // AI Danışman Tavsiyesi
      let aiAdvice = 'TUT';
      const stop = Number(item.stop_loss || 0);
      const target = Number(item.target_price || 0);

      if (stop > 0 && livePrice <= stop) {
        aiAdvice = '🚨 STOP OL! Fiyat stop seviyesini kırdı.';
      } else if (target > 0 && livePrice >= target) {
        aiAdvice = '🎯 HEDEF GÖRÜLDÜ! Kâr realizasyonu yap.';
      } else if (profitLossPct >= 12) {
        aiAdvice = '💰 KISMİ KÂR AL (%12+ primde, stopu yukarı taşı).';
      } else if (profitLossPct <= -4) {
        aiAdvice = '⚠️ DİKKAT: Zarar büyüyor, stop seviyesine sadık kal.';
      } else {
        aiAdvice = '🟢 KORU: Trend destekleri korunuyor.';
      }

      return {
        ...item,
        current_price: livePrice,
        total_cost: totalCost,
        total_value: totalValue,
        profit_loss_amount: profitLossAmount,
        profit_loss_pct: profitLossPct,
        ai_advice: aiAdvice
      };
    })
  );

  return NextResponse.json({ success: true, portfolio: enrichedItems });
}

// 2. POST: Yeni Hisse Alımı Kaydet
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { symbol, buy_price, quantity, buy_date, stop_loss, target_price, notes } = body;

    if (!symbol || !buy_price || !quantity) {
      return NextResponse.json({ success: false, error: 'Hisse sembolü, alış fiyatı ve adet zorunludur.' }, { status: 400 });
    }

    const newItem = {
      symbol: symbol.toUpperCase().replace('.IS', ''),
      buy_price: parseFloat(buy_price),
      quantity: parseFloat(quantity),
      buy_date: buy_date || new Date().toISOString().split('T')[0],
      stop_loss: stop_loss ? parseFloat(stop_loss) : null,
      target_price: target_price ? parseFloat(target_price) : null,
      notes: notes || '',
      status: 'OPEN',
      created_at: new Date().toISOString()
    };

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('user_portfolio').insert(newItem).select();
      if (!error && data) {
        return NextResponse.json({ success: true, item: data[0] });
      }
    }

    // Local DB'ye yaz
    const local = readLocalDB();
    const id = 'local-' + Date.now();
    const saved = { ...newItem, id };
    local.portfolio = local.portfolio || [];
    local.portfolio.push(saved);
    writeLocalDB(local);

    return NextResponse.json({ success: true, item: saved });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

// 3. DELETE: Pozisyonu Sil veya Kapat
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID gereklidir.' }, { status: 400 });
    }

    if (isSupabaseConfigured && supabase) {
      await supabase.from('user_portfolio').delete().eq('id', id);
    }

    const local = readLocalDB();
    local.portfolio = (local.portfolio || []).filter((p: any) => String(p.id) !== String(id));
    writeLocalDB(local);

    return NextResponse.json({ success: true, message: 'Pozisyon silindi.' });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
