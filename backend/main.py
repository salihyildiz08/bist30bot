import sys
import time
import argparse

# Windows konsolunda UTF-8 çıktı desteği (emoji ve Türkçe karakterler için)
try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass
from typing import List, Dict, Any
from backend.config import BIST30_SYMBOLS
from backend.technical_analysis import TechnicalAnalysisEngine
from backend.market_regime import MarketRegimeEngine
from backend.kap_scraper import KapAndNewsScraper
from backend.ai_advisor import AIAdvisor
from backend.db import DatabaseManager
from backend.telegram_bot import TelegramBotService

def run_full_scan(timeframe: str = "daily", send_telegram: bool = True, max_stocks: int = 30) -> Dict[str, Any]:
    print(f"\n=======================================================")
    print(f"🚀 BIST 30 YAPAY ZEKA TARAMASI BAŞLATILDI ({timeframe.upper()})")
    print(f"=======================================================\n")

    # 1. Piyasa Rejimi (BIST 100 & Lider Hisseler)
    print("⏳ 1/4 Piyasa rejimi ve BIST endeks trendi değerlendiriliyor...")
    market_regime = MarketRegimeEngine.evaluate_market_regime()
    print(f"   -> Durum: {market_regime['regime']} (BIST 100: %{market_regime['bist100_change']})")
    print(f"   -> Özet: {market_regime['summary']}")

    # 2. KAP Bildirimlerini Çek
    print("\n⏳ 2/4 Güncel KAP bildirimleri ve haberler taranıyor...")
    kap_announcements = KapAndNewsScraper.fetch_latest_kap_announcements(limit=25)
    print(f"   -> {len(kap_announcements)} adet BIST 30 KAP bildirimi bulundu.")
    if kap_announcements:
        DatabaseManager.save_kap_news(kap_announcements)

    # 3. BIST 30 Hisselerinin Teknik ve AI Analizi
    print(f"\n⏳ 3/4 BIST 30 hisseleri taranıyor ({max_stocks} hisse)...")
    signals: List[Dict[str, Any]] = []
    targets = BIST30_SYMBOLS[:max_stocks]

    for i, symbol in enumerate(targets, 1):
        clean_symbol = symbol.replace(".IS", "")
        print(f"   [{i}/{len(targets)}] Analiz ediliyor: {clean_symbol}...", end="", flush=True)

        tech = TechnicalAnalysisEngine.analyze_ticker(clean_symbol, timeframe=timeframe)
        if not tech:
            print(" (Veri alınamadı)")
            continue

        # Hisseye ait KAP haberleri
        stock_kap = [k for k in kap_announcements if k.get("symbol") == clean_symbol]

        # Yapay Zeka Sentezi
        ai_verdict = AIAdvisor.generate_stock_verdict(tech, market_regime, stock_kap)

        # Birleştirilmiş Sinyal Verisi
        combined_signal = {
            "symbol": clean_symbol,
            "timeframe": timeframe,
            "signal_type": ai_verdict.get("final_signal", tech["signal_type"]),
            "current_price": tech["current_price"],
            "target_price_1": tech["target_1"],
            "target_price_2": tech["target_2"],
            "stop_loss": tech["stop_loss"],
            "risk_reward_ratio": tech["risk_reward"],
            "rsi_14": tech["rsi_14"],
            "ema_9": tech["ema_9"],
            "ema_21": tech["ema_21"],
            "ema_50": tech["ema_50"],
            "volume_ratio": tech["volume_ratio"],
            "market_trend": market_regime["regime"],
            "heavyweight_support": market_regime["heavyweight_bullish_count"] >= 4,
            "ai_confidence": ai_verdict.get("ai_confidence", 75),
            "ai_summary": ai_verdict.get("ai_summary", ""),
            "holder_advice": ai_verdict.get("holder_advice", "TUT"),
            "risk_warning": ai_verdict.get("risk_warning", "")
        }

        # Veritabanına kaydet
        DatabaseManager.save_signal(combined_signal)
        signals.append(combined_signal)

        sig_type = combined_signal["signal_type"]
        print(f" -> {sig_type} (Fiyat: {tech['current_price']} TL | Hacim: {tech['volume_ratio']}x)")
        time.sleep(0.15) # Saygılı bekleme

    # 4. Telegram Bülteni
    if send_telegram and signals:
        print("\n⏳ 4/4 Telegram bülteni gönderiliyor...")
        TelegramBotService.send_market_and_signals_report(market_regime, signals, timeframe=timeframe)
        TelegramBotService.send_portfolio_summary()

    print("\n✅ Tarama başarıyla tamamlandı!\n")
    return {
        "market_regime": market_regime,
        "signals_count": len(signals),
        "signals": signals
    }

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="BIST 30 AI Analiz Tarayıcısı")
    parser.add_argument("--timeframe", choices=["daily", "weekly", "monthly"], default="daily", help="Zaman dilimi")
    parser.add_argument("--no-telegram", action="store_true", help="Telegram mesajı gönderme")
    parser.add_argument("--limit", type=int, default=10, help="Test için analiz edilecek hisse sayısı (varsayılan: 10, tam liste için 31)")
    args = parser.parse_args()

    run_full_scan(timeframe=args.timeframe, send_telegram=not args.no_telegram, max_stocks=args.limit)
