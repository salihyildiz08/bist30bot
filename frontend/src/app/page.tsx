'use client';

import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  Wallet,
  Newspaper,
  Settings,
  PlusCircle,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Send,
  Trash2,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { StockSignal, PortfolioItem, KapNotification, MarketRegime, Timeframe } from '@/types';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<'signals' | 'portfolio' | 'kap' | 'settings'>('signals');
  const [timeframe, setTimeframe] = useState<Timeframe>('daily');
  const [signalFilter, setSignalFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Data states
  const [signals, setSignals] = useState<StockSignal[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [kapNews, setKapNews] = useState<KapNotification[]>([]);
  const [marketRegime, setMarketRegime] = useState<MarketRegime | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Add Portfolio Modal state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [formData, setFormData] = useState({
    symbol: 'THYAO',
    buy_price: '',
    quantity: '',
    buy_date: '',
    stop_loss: '',
    target_price: '',
    notes: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [sigRes, portRes, kapRes, regRes] = await Promise.all([
        fetch(`/api/signals?timeframe=${timeframe}`).then(r => r.json()),
        fetch('/api/portfolio').then(r => r.json()),
        fetch('/api/kap').then(r => r.json()),
        fetch('/api/market-regime').then(r => r.json())
      ]);

      if (sigRes.signals) setSignals(sigRes.signals);
      if (portRes.portfolio) setPortfolio(portRes.portfolio);
      if (kapRes.news) setKapNews(kapRes.news);
      if (regRes) setMarketRegime(regRes);
    } catch (e) {
      console.error('Veri yükleme hatası:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [timeframe]);

  // Handle Portfolio Form Submit
  const handleAddPortfolio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.symbol || !formData.buy_price || !formData.quantity) return;

    try {
      const res = await fetch('/api/portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.success) {
        setIsModalOpen(false);
        setFormData({
          symbol: 'THYAO',
          buy_price: '',
          quantity: '',
          buy_date: '',
          stop_loss: '',
          target_price: '',
          notes: ''
        });
        // Portföyü yeniden yükle
        const updated = await fetch('/api/portfolio').then(r => r.json());
        if (updated.portfolio) setPortfolio(updated.portfolio);
      } else {
        alert(data.error || 'Hisse eklenirken bir hata oluştu.');
      }
    } catch (e: any) {
      console.error('Ekleme hatası:', e);
      alert('İstek gönderilirken hata oluştu: ' + e.message);
    }
  };

  const handleDeletePortfolio = async (id: string) => {
    if (!confirm('Bu pozisyonu portföyünüzden silmek istediğinize emin misiniz?')) return;
    try {
      const res = await fetch(`/api/portfolio?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setPortfolio(prev => prev.filter(p => String(p.id) !== String(id)));
      } else {
        alert(data.error || 'Pozisyon silinirken hata oluştu.');
      }
    } catch (e: any) {
      console.error('Silme hatası:', e);
      alert('Silme hatası: ' + e.message);
    }
  };

  // Open Add modal with stock pre-filled
  const openModalForStock = (stock: StockSignal) => {
    setFormData({
      symbol: stock.symbol,
      buy_price: String(stock.current_price),
      quantity: '100',
      buy_date: new Date().toISOString().split('T')[0],
      stop_loss: String(stock.stop_loss),
      target_price: String(stock.target_price_1),
      notes: `${stock.timeframe.toUpperCase()} sinyali ile AI tavsiyesi üzerine eklendi.`
    });
    setIsModalOpen(true);
  };

  // Filtered signals
  const filteredSignals = signals.filter(s => {
    const matchesFilter =
      signalFilter === 'ALL' ||
      (signalFilter === 'BUY' && (s.signal_type === 'GUCLU_AL' || s.signal_type === 'AL')) ||
      (signalFilter === 'NEUTRAL' && s.signal_type === 'NOTR') ||
      (signalFilter === 'SELL' && (s.signal_type === 'GUCLU_SAT' || s.signal_type === 'SAT'));

    const matchesSearch = s.symbol.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // Calculate portfolio totals
  const totalPortfolioValue = portfolio.reduce((acc, curr) => acc + (curr.total_value || 0), 0);
  const totalPortfolioCost = portfolio.reduce((acc, curr) => acc + (curr.total_cost || 0), 0);
  const totalProfitLoss = totalPortfolioValue - totalPortfolioCost;
  const totalProfitLossPct = totalPortfolioCost > 0 ? (totalProfitLoss / totalPortfolioCost) * 100 : 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* 1. TOP HEADER & MARKET REGIME BANNER */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center font-bold text-slate-950 shadow-lg shadow-emerald-500/20">
              <TrendingUp className="w-6 h-6 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg font-bold tracking-tight text-white">BIST 30 Yapay Zeka Terminali</h1>
                <span className="text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                  Canlı Motor
                </span>
              </div>
              <p className="text-xs text-slate-400">Teknik Analiz, KAP & Portföy Yönetimi</p>
            </div>
          </div>

          {/* Market Regime Ticker */}
          <div className="flex items-center space-x-3 bg-slate-800/60 border border-slate-700/60 px-3 py-1.5 rounded-lg text-xs">
            <div className="flex items-center space-x-2">
              <span className="text-slate-400">BIST 100:</span>
              <span className={`font-semibold flex items-center ${(marketRegime?.bist100_change || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {(marketRegime?.bist100_change || 0) >= 0 ? <TrendingUp className="w-3.5 h-3.5 mr-1" /> : <TrendingDown className="w-3.5 h-3.5 mr-1" />}
                %{(marketRegime?.bist100_change || 0) > 0 ? '+' : ''}{marketRegime?.bist100_change || '0.00'}
              </span>
            </div>
            <span className="text-slate-600">|</span>
            <div className="flex items-center space-x-1.5">
              <span className="text-slate-400">Rejim:</span>
              <span className={`font-semibold px-2 py-0.5 rounded text-[10px] ${
                marketRegime?.regime === 'BULLISH'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : marketRegime?.regime === 'BEARISH'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              }`}>
                {marketRegime?.regime === 'BULLISH' ? 'BOĞA (YÜKSELİŞ)' : marketRegime?.regime === 'BEARISH' ? 'AYI (DÜŞÜŞ)' : 'YATAY / TEMKİNLİ'}
              </span>
            </div>
          </div>

          {/* Right Action buttons */}
          <div className="flex items-center space-x-2">
            <button
              onClick={fetchData}
              disabled={loading}
              className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-200 px-3 py-2 rounded-lg transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
              <span>Yenile</span>
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-semibold text-xs px-3.5 py-2 rounded-lg shadow-md shadow-emerald-600/20 transition"
            >
              <PlusCircle className="w-4 h-4 text-slate-950" />
              <span>Hisse Alımı Ekle</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 flex space-x-1 border-t border-slate-800/60 pt-1">
          <button
            onClick={() => setActiveTab('signals')}
            className={`flex items-center space-x-2 py-2.5 px-4 text-xs font-medium border-b-2 transition ${
              activeTab === 'signals'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Al/Sat Sinyalleri</span>
            <span className="ml-1 text-[10px] bg-slate-800 px-1.5 py-0.2 rounded-full text-slate-300">
              {signals.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('portfolio')}
            className={`flex items-center space-x-2 py-2.5 px-4 text-xs font-medium border-b-2 transition ${
              activeTab === 'portfolio'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Wallet className="w-4 h-4" />
            <span>Portföyüm & K/Z</span>
            <span className="ml-1 text-[10px] bg-slate-800 px-1.5 py-0.2 rounded-full text-slate-300">
              {portfolio.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('kap')}
            className={`flex items-center space-x-2 py-2.5 px-4 text-xs font-medium border-b-2 transition ${
              activeTab === 'kap'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Newspaper className="w-4 h-4" />
            <span>KAP & Haber Radarı</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center space-x-2 py-2.5 px-4 text-xs font-medium border-b-2 transition ${
              activeTab === 'settings'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Ayarlar & Bot</span>
          </button>
        </div>
      </header>

      {/* 2. MAIN CONTENT AREA */}
      <main className="max-w-7xl mx-auto px-4 py-6 flex-1 w-full">
        {/* ============================================================== */}
        {/* TAB 1: AL / SAT SİNYALLERİ */}
        {/* ============================================================== */}
        {activeTab === 'signals' && (
          <div className="space-y-6">
            {/* Filters Bar */}
            <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl flex flex-wrap items-center justify-between gap-3">
              {/* Timeframe Switcher */}
              <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                <button
                  onClick={() => setTimeframe('daily')}
                  className={`text-xs px-3 py-1.5 rounded-md font-medium transition ${
                    timeframe === 'daily' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Günlük (1G)
                </button>
                <button
                  onClick={() => setTimeframe('weekly')}
                  className={`text-xs px-3 py-1.5 rounded-md font-medium transition ${
                    timeframe === 'weekly' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Haftalık (1H)
                </button>
                <button
                  onClick={() => setTimeframe('monthly')}
                  className={`text-xs px-3 py-1.5 rounded-md font-medium transition ${
                    timeframe === 'monthly' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Aylık (1A)
                </button>
              </div>

              {/* Signal Filter */}
              <div className="flex items-center space-x-1.5 text-xs">
                <span className="text-slate-400 mr-1">Filtre:</span>
                <button
                  onClick={() => setSignalFilter('ALL')}
                  className={`px-2.5 py-1 rounded-md transition ${signalFilter === 'ALL' ? 'bg-slate-700 text-white font-medium' : 'text-slate-400 hover:bg-slate-800'}`}
                >
                  Tümü
                </button>
                <button
                  onClick={() => setSignalFilter('BUY')}
                  className={`px-2.5 py-1 rounded-md transition ${signalFilter === 'BUY' ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 font-medium' : 'text-slate-400 hover:bg-slate-800'}`}
                >
                  Alım Fırsatları
                </button>
                <button
                  onClick={() => setSignalFilter('NEUTRAL')}
                  className={`px-2.5 py-1 rounded-md transition ${signalFilter === 'NEUTRAL' ? 'bg-amber-600/30 text-amber-300 border border-amber-500/40 font-medium' : 'text-slate-400 hover:bg-slate-800'}`}
                >
                  Nötr / Takip
                </button>
                <button
                  onClick={() => setSignalFilter('SELL')}
                  className={`px-2.5 py-1 rounded-md transition ${signalFilter === 'SELL' ? 'bg-rose-600/30 text-rose-300 border border-rose-500/40 font-medium' : 'text-slate-400 hover:bg-slate-800'}`}
                >
                  Satış Baskısı
                </button>
              </div>

              {/* Search Box */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Hisse Ara (Örn: THYAO)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 w-44"
                />
              </div>
            </div>

            {/* Signals Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSignals.map((signal) => {
                const isBuy = signal.signal_type === 'GUCLU_AL' || signal.signal_type === 'AL';
                const isSell = signal.signal_type === 'GUCLU_SAT' || signal.signal_type === 'SAT';

                return (
                  <div
                    key={signal.symbol}
                    className="bg-slate-900/80 border border-slate-800 hover:border-slate-700/80 rounded-xl p-4 flex flex-col justify-between transition-all duration-200 shadow-sm hover:shadow-md"
                  >
                    <div>
                      {/* Top Row: Symbol, Price, Badge */}
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-lg font-bold text-white tracking-wide">{signal.symbol}</span>
                            <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded uppercase font-mono">
                              {signal.timeframe}
                            </span>
                            {signal.volume_ratio >= 1.3 && (
                              <span className="flex items-center text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded font-medium">
                                <Flame className="w-3 h-3 mr-0.5" />
                                {signal.volume_ratio}x Hacim
                              </span>
                            )}
                          </div>
                          <div className="flex items-baseline space-x-2 mt-1">
                            <span className="text-xl font-extrabold text-white">
                              {Number(signal.current_price).toFixed(2)} TL
                            </span>
                            {signal.price_change_pct !== undefined && (
                              <span className={`text-xs font-semibold ${signal.price_change_pct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {signal.price_change_pct >= 0 ? '+' : ''}{signal.price_change_pct}%
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Signal Badge */}
                        <div className={`px-2.5 py-1 rounded-lg text-xs font-bold border tracking-wider ${
                          signal.signal_type === 'GUCLU_AL'
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-sm shadow-emerald-500/20'
                            : signal.signal_type === 'AL'
                            ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                            : isSell
                            ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                            : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}>
                          {signal.signal_type === 'GUCLU_AL'
                            ? 'GÜÇLÜ AL'
                            : signal.signal_type === 'AL'
                            ? 'AL'
                            : signal.signal_type === 'GUCLU_SAT'
                            ? 'GÜÇLÜ SAT'
                            : signal.signal_type === 'SAT'
                            ? 'SAT'
                            : 'NÖTR'}
                        </div>
                      </div>

                      {/* Key Trade Levels (Stop, Hedef 1, Hedef 2) */}
                      <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-800/80 text-xs">
                        <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800">
                          <span className="text-slate-400 block text-[10px]">Stop-Loss:</span>
                          <span className="font-bold text-rose-400">{Number(signal.stop_loss).toFixed(2)} TL</span>
                        </div>
                        <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800">
                          <span className="text-slate-400 block text-[10px]">Hedef 1:</span>
                          <span className="font-bold text-emerald-400">{Number(signal.target_price_1).toFixed(2)} TL</span>
                        </div>
                        <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800">
                          <span className="text-slate-400 block text-[10px]">Risk / Ödül:</span>
                          <span className="font-bold text-teal-300">1 : {signal.risk_reward_ratio || 1.5}</span>
                        </div>
                      </div>

                      {/* Technical Indicators Row */}
                      <div className="flex items-center justify-between text-[11px] text-slate-400 mt-3 px-1">
                        <div>
                          RSI: <span className={`font-semibold ${signal.rsi_14 > 70 ? 'text-rose-400' : signal.rsi_14 < 35 ? 'text-emerald-400' : 'text-slate-200'}`}>{signal.rsi_14}</span>
                        </div>
                        <div>
                          EMA 21: <span className="font-semibold text-slate-200">{Number(signal.ema_21).toFixed(1)} TL</span>
                        </div>
                        <div>
                          EMA 50: <span className="font-semibold text-slate-200">{Number(signal.ema_50).toFixed(1)} TL</span>
                        </div>
                      </div>

                      {/* AI Thesis & Synthesis */}
                      <div className="mt-3 bg-slate-950/50 border border-slate-800/90 rounded-lg p-2.5 text-xs">
                        <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1 font-semibold">
                          <span className="flex items-center text-teal-400">
                            🤖 AI Görüşü & Strateji
                          </span>
                          <span className="text-slate-400 font-mono">Güven: %{signal.ai_confidence || 80}</span>
                        </div>
                        <p className="text-slate-300 leading-relaxed text-[11px]">
                          {signal.ai_summary}
                        </p>
                        {signal.risk_warning && (
                          <div className="mt-1.5 flex items-start text-[10px] text-amber-400/90 bg-amber-500/10 p-1.5 rounded">
                            <AlertTriangle className="w-3.5 h-3.5 mr-1 flex-shrink-0 mt-0.5" />
                            <span>{signal.risk_warning}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom Action: Quick Add to Portfolio */}
                    <div className="mt-4 pt-2 border-t border-slate-800/60 flex items-center justify-between">
                      <span className="text-[10px] text-slate-500">
                        Pozisyon: <strong className="text-slate-300 font-mono">{signal.holder_advice || 'TUT'}</strong>
                      </span>
                      <button
                        onClick={() => openModalForStock(signal)}
                        className="text-xs flex items-center space-x-1 text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 px-2.5 py-1 rounded transition"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>Portföye Ekle</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: PORTFÖYÜM & KÂR/ZARAR TAKİBİ */}
        {/* ============================================================== */}
        {activeTab === 'portfolio' && (
          <div className="space-y-6">
            {/* Portfolio Summary Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
                <span className="text-xs text-slate-400 block">Toplam Portföy Değeri</span>
                <span className="text-2xl font-black text-white mt-1 block">
                  {totalPortfolioValue.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL
                </span>
                <span className="text-[10px] text-slate-500 mt-1 block">Maliyet: {totalPortfolioCost.toLocaleString('tr-TR')} TL</span>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
                <span className="text-xs text-slate-400 block">Toplam Net Kâr / Zarar</span>
                <div className="flex items-baseline space-x-2 mt-1">
                  <span className={`text-2xl font-black ${totalProfitLoss >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {totalProfitLoss >= 0 ? '+' : ''}{totalProfitLoss.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL
                  </span>
                  <span className={`text-xs font-bold ${totalProfitLoss >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    (%{totalProfitLossPct >= 0 ? '+' : ''}{totalProfitLossPct.toFixed(2)})
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">Tüm açık pozisyonlar</span>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
                <span className="text-xs text-slate-400 block">Açık Pozisyon Sayısı</span>
                <span className="text-2xl font-black text-white mt-1 block">
                  {portfolio.length} Hisse
                </span>
                <span className="text-[10px] text-teal-400 mt-1 block">BIST 30 Odaklı</span>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 block">Yeni İşlem Kaydı</span>
                  <span className="text-xs text-slate-200 mt-1 block">Alınan hisseyi ekle</span>
                </div>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-slate-950 p-2.5 rounded-xl font-bold transition shadow-md shadow-emerald-600/20"
                >
                  <PlusCircle className="w-5 h-5 text-slate-950" />
                </button>
              </div>
            </div>

            {/* Portfolio Table */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
              <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
                <h3 className="font-bold text-sm text-white">Açık Hisselerim ve AI Pozisyon Durumu</h3>
                <span className="text-xs text-slate-400">Canlı fiyatlarla anlık hesaplanmaktadır</span>
              </div>

              {portfolio.length === 0 ? (
                <div className="p-12 text-center">
                  <Wallet className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-sm text-slate-300 font-medium">Henüz portföyünüze hisse eklemediniz.</p>
                  <p className="text-xs text-slate-500 mt-1">Al/Sat sinyalleri ekranından veya yukarıdaki "Hisse Alımı Ekle" butonuyla ekleyebilirsiniz.</p>
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="mt-4 bg-emerald-600 hover:bg-emerald-500 text-slate-950 text-xs font-bold px-4 py-2 rounded-lg transition"
                  >
                    İlk Hisseni Ekle
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950/70 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                      <tr>
                        <th className="py-3 px-4">Hisse</th>
                        <th className="py-3 px-4">Alış Fiyatı</th>
                        <th className="py-3 px-4">Güncel Fiyat</th>
                        <th className="py-3 px-4">Adet (Lot)</th>
                        <th className="py-3 px-4">Toplam Tutar</th>
                        <th className="py-3 px-4">Kâr / Zarar</th>
                        <th className="py-3 px-4">Stop / Hedef</th>
                        <th className="py-3 px-4">AI Tavsiyesi</th>
                        <th className="py-3 px-4 text-right">İşlem</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-200">
                      {portfolio.map((item) => {
                        const isProfitable = (item.profit_loss_amount || 0) >= 0;

                        return (
                          <tr key={item.id} className="hover:bg-slate-800/40 transition">
                            <td className="py-3 px-4">
                              <span className="font-bold text-white text-sm">{item.symbol}</span>
                              <span className="block text-[10px] text-slate-500">{item.buy_date}</span>
                            </td>
                            <td className="py-3 px-4 font-mono font-medium">
                              {Number(item.buy_price).toFixed(2)} TL
                            </td>
                            <td className="py-3 px-4 font-mono font-bold text-white">
                              {Number(item.current_price || item.buy_price).toFixed(2)} TL
                            </td>
                            <td className="py-3 px-4 font-mono">
                              {Number(item.quantity).toLocaleString('tr-TR')}
                            </td>
                            <td className="py-3 px-4 font-mono font-medium">
                              {Number(item.total_value || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL
                            </td>
                            <td className="py-3 px-4">
                              <div className={`font-mono font-bold ${isProfitable ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {isProfitable ? '+' : ''}{Number(item.profit_loss_amount || 0).toFixed(2)} TL
                              </div>
                              <div className={`text-[10px] font-semibold ${isProfitable ? 'text-emerald-400' : 'text-rose-400'}`}>
                                (%{isProfitable ? '+' : ''}{Number(item.profit_loss_pct || 0).toFixed(2)})
                              </div>
                            </td>
                            <td className="py-3 px-4 text-[11px]">
                              <div>Stop: <span className="text-rose-400 font-mono">{item.stop_loss ? `${item.stop_loss} TL` : '-'}</span></div>
                              <div>Hedef: <span className="text-emerald-400 font-mono">{item.target_price ? `${item.target_price} TL` : '-'}</span></div>
                            </td>
                            <td className="py-3 px-4">
                              <span className="text-[11px] font-medium bg-slate-950 px-2 py-1 rounded border border-slate-800 block text-slate-200">
                                {item.ai_advice || '🟢 KORU'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                onClick={() => handleDeletePortfolio(item.id)}
                                className="text-slate-500 hover:text-rose-400 p-1.5 rounded transition hover:bg-slate-800"
                                title="Pozisyonu Sil"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 3: KAP & HABER RADARI */}
        {/* ============================================================== */}
        {activeTab === 'kap' && (
          <div className="space-y-4">
            <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center">
                  <Newspaper className="w-4 h-4 mr-2 text-emerald-400" />
                  KAP & Finansal Duygu (Sentiment) Radarı
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">BIST 30 şirketlerinin pay geri alımları, yeni sözleşmeleri ve bilançoları</p>
              </div>
            </div>

            <div className="space-y-3">
              {kapNews.map((news, idx) => (
                <div
                  key={idx}
                  className="bg-slate-900/80 border border-slate-800 hover:border-slate-700 p-4 rounded-xl transition flex flex-col md:flex-row md:items-center justify-between gap-3"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-white bg-slate-800 px-2 py-0.5 rounded text-xs">
                        {news.symbol}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                        news.sentiment === 'POZITIF'
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                          : news.sentiment === 'NEGATIF'
                          ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                          : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}>
                        {news.sentiment}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">{news.category}</span>
                      <span className="text-[10px] text-amber-400">{'★'.repeat(news.impact_score)}</span>
                    </div>

                    <h4 className="text-xs font-semibold text-slate-200 leading-snug">
                      {news.title}
                    </h4>
                    {news.summary && (
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        {news.summary}
                      </p>
                    )}
                  </div>

                  {news.source_url && (
                    <a
                      href={news.source_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs flex items-center space-x-1 text-slate-400 hover:text-emerald-400 self-start md:self-center border border-slate-800 hover:border-slate-700 px-2.5 py-1.5 rounded-lg transition"
                    >
                      <span>KAP'ta Gör</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 4: AYARLAR & TELEGRAM BOT REHBERİ */}
        {/* ============================================================== */}
        {activeTab === 'settings' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-xl space-y-4">
              <h3 className="text-base font-bold text-white flex items-center">
                <Send className="w-5 h-5 mr-2 text-teal-400" />
                Telegram Bildirim Botu Kurulumu
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Telegram botu her gün piyasa kapanışında (18:30) BIST 30 sinyallerini, portföyünüzün kâr/zararını ve kritik KAP haberlerini doğrudan telefonunuza gönderir.
              </p>

              <div className="bg-slate-950 p-4 rounded-lg border border-slate-800/80 space-y-2 text-xs text-slate-300">
                <div className="font-semibold text-emerald-400">3 Adımda Telegram Botunu Bağlama:</div>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-400">
                  <li>Telegram'da <strong className="text-slate-200">@BotFather</strong> ile konuşup <code className="bg-slate-800 px-1 py-0.5 rounded text-slate-200">/newbot</code> komutuyla bot oluşturun ve <strong>Bot Token</strong>'ınızı alın.</li>
                  <li>Telegram'da <strong className="text-slate-200">@userinfobot</strong>'a mesaj atarak kendi sayısal <strong>Chat ID</strong>'nizi öğrenin.</li>
                  <li>Projenin <code className="bg-slate-800 px-1 py-0.5 rounded text-slate-200">.env</code> dosyasına veya Vercel Environment Variables kısmına bu iki değeri ekleyin:
                    <div className="mt-1 font-mono text-[11px] bg-slate-900 p-2 rounded text-emerald-300">
                      TELEGRAM_BOT_TOKEN=123456789:ABCdefGHI...<br />
                      TELEGRAM_CHAT_ID=987654321
                    </div>
                  </li>
                </ol>
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-xl space-y-4">
              <h3 className="text-base font-bold text-white flex items-center">
                <Settings className="w-5 h-5 mr-2 text-emerald-400" />
                Supabase & Vercel Yapılandırması
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Veritabanı tablolarını Supabase projenize tek tıkla yüklemek için projedeki <code className="bg-slate-950 px-1.5 py-0.5 rounded text-emerald-300">supabase/schema.sql</code> dosyasını Supabase SQL Editor alanında çalıştırmanız yeterlidir.
              </p>
              <div className="bg-slate-950 p-4 rounded-lg border border-slate-800/80 text-xs font-mono text-slate-300 space-y-1">
                <div>NEXT_PUBLIC_SUPABASE_URL=https://xyz.supabase.co</div>
                <div>NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...</div>
                <div>GEMINI_API_KEY=AIzaSy...</div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ============================================================== */}
      {/* 3. MODAL: YENİ HİSSE ALIMI EKLE */}
      {/* ============================================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center">
                <PlusCircle className="w-5 h-5 mr-2 text-emerald-400" />
                Satın Aldığım Hisseyi Kaydet
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddPortfolio} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 mb-1 font-medium">Hisse Sembolü (BIST 30)</label>
                <input
                  type="text"
                  required
                  value={formData.symbol}
                  onChange={(e) => setFormData({ ...formData, symbol: e.target.value.toUpperCase() })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-bold focus:border-emerald-500 focus:outline-none"
                  placeholder="Örn: THYAO, ASELS"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-medium">Alış Fiyatı (TL)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.buy_price}
                    onChange={(e) => setFormData({ ...formData, buy_price: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                    placeholder="Örn: 291.50"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-medium">Lot Adedi</label>
                  <input
                    type="number"
                    required
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                    placeholder="Örn: 150"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-medium">Stop-Loss (TL)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.stop_loss}
                    onChange={(e) => setFormData({ ...formData, stop_loss: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-rose-300 font-semibold focus:border-rose-500 focus:outline-none"
                    placeholder="Örn: 275.00"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-medium">Hedef Fiyat (TL)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.target_price}
                    onChange={(e) => setFormData({ ...formData, target_price: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-emerald-300 font-semibold focus:border-emerald-500 focus:outline-none"
                    placeholder="Örn: 320.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">Alış Tarihi</label>
                <input
                  type="date"
                  value={formData.buy_date}
                  onChange={(e) => setFormData({ ...formData, buy_date: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">Strateji / Not</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:border-emerald-500 focus:outline-none"
                  placeholder="Örn: Günlük kırılımla alındı, EMA 21 altı kapanış stop."
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold transition shadow-lg shadow-emerald-600/20"
                >
                  Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
