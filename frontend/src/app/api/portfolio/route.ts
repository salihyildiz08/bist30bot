import { NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const LOCAL_DB_PATH = path.resolve(process.cwd(), '..', 'local_db.json');

async function getLiveStockPrice(symbol: string): Promise<number> {
  const ticker = symbol.endsWith('.IS') ? symbol : `${symbol}.IS`;
  try {
    const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?range=2d&interval=1d`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 30 }
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
      return { portfolio: [] };
    }
  }
  return { portfolio: [] };
}

function writeLocalDB(data: any) {
  try {
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error writing local DB:', e);
  }
}

// 1. GET: Portföyü Listele
export async function GET() {
  let portfolioItems: any[] = [];
  let dbSource = 'none';

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('user_portfolio')
        .select('*')
        .eq('status', 'OPEN')
        .order('created_at', { ascending: false });

      if (!error && data) {
        portfolioItems = data;
        dbSource = 'supabase';
      } else if (error) {
        console.error('[Supabase GET Error]:', error);
      }
    } catch (e) {
      console.error('Supabase fetch exception:', e);
    }
  }

  // Sadece Supabase yapılandırılmamışsa local DB'ye bak
  if (portfolioItems.length === 0 && !isSupabaseConfigured) {
    const local = readLocalDB();
    portfolioItems = (local.portfolio || []).filter((p: any) => p.status === 'OPEN');
    dbSource = 'local';
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

      let aiAdvice = '🟢 KORU';
      const stop = Number(item.stop_loss || 0);
      const target = Number(item.target_price || 0);

      if (stop > 0 && livePrice <= stop) {
        aiAdvice = '🚨 STOP OL!';
      } else if (target > 0 && livePrice >= target) {
        aiAdvice = '🎯 HEDEF GÖRÜLDÜ!';
      } else if (profitLossPct >= 12) {
        aiAdvice = '💰 KÂR AL!';
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

  return NextResponse.json({ success: true, source: dbSource, portfolio: enrichedItems });
}

// 2. POST: Yeni Hisse Alımı Kaydet
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { symbol, buy_price, quantity, buy_date, stop_loss, target_price, notes } = body;

    if (!symbol || !buy_price || !quantity) {
      return NextResponse.json({ success: false, error: 'Hisse sembolü, fiyat ve adet zorunludur.' }, { status: 400 });
    }

    const newItem = {
      symbol: symbol.toUpperCase().replace('.IS', ''),
      buy_price: parseFloat(buy_price),
      quantity: parseFloat(quantity),
      buy_date: buy_date || new Date().toISOString().split('T')[0],
      stop_loss: stop_loss ? parseFloat(stop_loss) : null,
      target_price: target_price ? parseFloat(target_price) : null,
      notes: notes || '',
      status: 'OPEN'
    };

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('user_portfolio').insert(newItem).select();
      if (error) {
        console.error('[Supabase INSERT Hatası]:', error);
        return NextResponse.json({
          success: false,
          error: `Supabase Hatası (${error.code}): ${error.message}. Lütfen Supabase SQL Editor'da 'ALTER TABLE user_portfolio DISABLE ROW LEVEL SECURITY;' çalıştırınız.`
        }, { status: 403 });
      }
      if (data && data.length > 0) {
        return NextResponse.json({ success: true, item: data[0] });
      }
    }

    // Supabase yapılandırılmamışsa local DB
    const local = readLocalDB();
    const id = 'local-' + Date.now();
    const saved = { ...newItem, id, created_at: new Date().toISOString() };
    local.portfolio = local.portfolio || [];
    local.portfolio.push(saved);
    writeLocalDB(local);

    return NextResponse.json({ success: true, item: saved });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

// 3. DELETE: Pozisyonu Sil
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID gereklidir.' }, { status: 400 });
    }

    // Mock id kontrolü
    if (id.startsWith('mock-')) {
      return NextResponse.json({ success: true, message: 'Örnek kayıt kaldırıldı.' });
    }

    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('user_portfolio').delete().eq('id', id);
      if (error) {
        console.error('[Supabase DELETE Hatası]:', error);
        return NextResponse.json({
          success: false,
          error: `Supabase Hatası (${error.code}): ${error.message}. Lütfen Supabase SQL Editor'da 'ALTER TABLE user_portfolio DISABLE ROW LEVEL SECURITY;' çalıştırınız.`
        }, { status: 403 });
      }
    }

    const local = readLocalDB();
    local.portfolio = (local.portfolio || []).filter((p: any) => String(p.id) !== String(id));
    writeLocalDB(local);

    return NextResponse.json({ success: true, message: 'Pozisyon silindi.' });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
