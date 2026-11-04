import time
import requests
from typing import List, Dict, Any, Optional
from backend.config import TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, BASE_DIR
from backend.db import DatabaseManager
from backend.technical_analysis import TechnicalAnalysisEngine

class TelegramBotService:
    """
    Telegram Bildirim ve Etkileşim Servisi (@Devran30_bot).
    BIST 30 sinyallerini, portföy kâr/zarar raporunu ve acil alarmları iletir.
    """

    @classmethod
    def get_api_url(cls, method: str) -> str:
        return f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/{method}"

    @classmethod
    def send_message(cls, text: str, chat_id: Optional[str] = None, parse_mode: str = "HTML") -> bool:
        target_chat = chat_id or TELEGRAM_CHAT_ID
        if not TELEGRAM_BOT_TOKEN or not target_chat:
            print(f"[Telegram Konsol]:\n{text}\n")
            return False

        try:
            url = cls.get_api_url("sendMessage")
            payload = {
                "chat_id": str(target_chat),
                "text": text,
                "parse_mode": parse_mode,
                "disable_web_page_preview": True
            }
            resp = requests.post(url, json=payload, timeout=8)
            return resp.status_code == 200
        except Exception as e:
            print(f"[Telegram Hatası]: {e}")
            return False

    @classmethod
    def send_market_and_signals_report(cls, market_regime: Dict[str, Any], signals: List[Dict[str, Any]], timeframe: str = "Günlük", chat_id: Optional[str] = None):
        regime_emoji = "🟢" if market_regime.get("regime") == "BULLISH" else ("🔴" if market_regime.get("regime") == "BEARISH" else "🟡")
        
        msg = f"📊 <b>BIST 30 {timeframe.upper()} YAPAY ZEKA BÜLTENİ</b>\n"
        msg += f"────────────────────────\n"
        msg += f"{regime_emoji} <b>Piyasa Rejimi:</b> {market_regime.get('summary', 'Analiz edildi.')}\n"
        msg += f"📈 <b>BIST 100 Değişim:</b> %{market_regime.get('bist100_change', 0.0)}\n\n"

        strong_buys = [s for s in signals if s.get("signal_type") in ["GUCLU_AL", "AL"]]
        strong_sells = [s for s in signals if s.get("signal_type") in ["GUCLU_SAT", "SAT"]]

        msg += f"🔥 <b>ÖNE ÇIKAN ALIM FIRSATLARI:</b>\n"
        if strong_buys:
            for s in strong_buys[:5]:
                sym = s.get("symbol")
                price = s.get("current_price")
                target1 = s.get("target_price_1") or s.get("target_1")
                stop = s.get("stop_loss")
                vol = s.get("volume_ratio", 1.0)
                conf = s.get("ai_confidence", 80)
                msg += f"\n💎 <b>{sym}</b> — <b>{s.get('signal_type')}</b> (AI Güven: %{conf})\n"
                msg += f"• Fiyat: <b>{price} TL</b> | Hacim: <b>{vol}x</b>\n"
                msg += f"• Hedef 1: <b>{target1} TL</b> | Stop: <b>{stop} TL</b>\n"
                if s.get("ai_summary"):
                    msg += f"• <i>{s.get('ai_summary')[:130]}...</i>\n"
        else:
            msg += "<i>Şu an filtrelere uyan agresif alım sinyali bulunmuyor. Piyasa temkinli modda.</i>\n"

        if strong_sells:
            msg += f"\n⚠️ <b>DİKKAT (SATIŞ BASKISI):</b>\n"
            for s in strong_sells[:3]:
                msg += f"• <b>{s.get('symbol')}</b> ({s.get('current_price')} TL) — Destek kırılımı.\n"

        msg += f"\n────────────────────────\n"
        msg += f"💡 <i>Ali Perşembe Disiplini: Kesin Stop-Loss olmadan işlem açmayınız. Yatırım tavsiyesi değildir.</i>"

        cls.send_message(msg, chat_id=chat_id)

    @classmethod
    def send_portfolio_summary(cls, chat_id: Optional[str] = None):
        portfolio = DatabaseManager.get_portfolio(status="OPEN")
        if not portfolio:
            cls.send_message("📂 Portföyünüzde henüz açık pozisyon bulunmuyor. Web panelinden (http://localhost:3000) hisse ekleyebilirsiniz.", chat_id=chat_id)
            return

        total_cost = 0.0
        total_current_value = 0.0
        msg = "💼 <b>PORTFÖY DURUM RAPORU & AI TAVSİYELERİ</b>\n"
        msg += "────────────────────────\n"

        for item in portfolio:
            sym = item.get("symbol")
            buy_price = float(item.get("buy_price", 0.0))
            qty = float(item.get("quantity", 0.0))
            cost = buy_price * qty
            total_cost += cost

            analysis = TechnicalAnalysisEngine.analyze_ticker(sym, timeframe="daily")
            curr_price = analysis.get("current_price", buy_price) if analysis else buy_price
            curr_val = curr_price * qty
            total_current_value += curr_val

            diff = curr_val - cost
            pct = round(((curr_price - buy_price) / (buy_price + 1e-9)) * 100, 2)
            emoji = "🟢" if diff >= 0 else "🔴"

            stop = item.get("stop_loss") or (analysis.get("stop_loss") if analysis else 0.0)
            advice = "TUT"
            if analysis:
                if stop and curr_price <= stop:
                    advice = "🚨 STOP OL!"
                elif pct >= 12:
                    advice = "💰 KÂR AL!"
                elif analysis.get("signal_type") in ["GUCLU_AL", "AL"]:
                    advice = "📈 KORU (Trend Güçlü)"

            msg += f"\n{emoji} <b>{sym}</b> ({qty:.0f} Lot)\n"
            msg += f"• Maliyet: <b>{buy_price} TL</b> | Güncel: <b>{curr_price} TL</b>\n"
            msg += f"• K/Z: <b>{diff:+.2f} TL (%{pct:+.2f})</b>\n"
            msg += f"• AI Tavsiyesi: <b>{advice}</b>\n"

        total_diff = total_current_value - total_cost
        total_pct = round((total_diff / (total_cost + 1e-9)) * 100, 2)
        total_emoji = "🚀" if total_diff >= 0 else "📉"

        msg += "\n────────────────────────\n"
        msg += f"{total_emoji} <b>Toplam Portföy:</b> {total_current_value:,.2f} TL\n"
        msg += f"<b>Net Kâr/Zarar:</b> {total_diff:+,.2f} TL (%{total_pct:+.2f})\n"

        cls.send_message(msg, chat_id=chat_id)

    @classmethod
    def check_for_incoming_messages_and_save_chat_id(cls) -> Optional[str]:
        """
        Kullanıcı botta /start'a bastığında chat_id'sini yakalar ve .env dosyasına otomatik kaydeder.
        """
        try:
            url = cls.get_api_url("getUpdates")
            resp = requests.get(url, timeout=5).json()
            if resp.get("ok") and resp.get("result"):
                last_update = resp["result"][-1]
                message = last_update.get("message", {})
                chat_id = str(message.get("chat", {}).get("id"))
                if chat_id:
                    # .env dosyasına TELEGRAM_CHAT_ID güncelle
                    env_file = BASE_DIR / ".env"
                    if env_file.exists():
                        content = env_file.read_text(encoding="utf-8")
                        if "TELEGRAM_CHAT_ID=" in content:
                            new_content = ""
                            for line in content.splitlines():
                                if line.startswith("TELEGRAM_CHAT_ID="):
                                    new_content += f"TELEGRAM_CHAT_ID={chat_id}\n"
                                else:
                                    new_content += line + "\n"
                            env_file.write_text(new_content, encoding="utf-8")
                    return chat_id
        except Exception as e:
            print(f"Chat ID kontrol hatası: {e}")
        return None
