import time
import requests
from typing import List, Dict, Any, Optional
from backend.config import TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, BASE_DIR
from backend.db import DatabaseManager
from backend.technical_analysis import TechnicalAnalysisEngine

class TelegramBotService:
    """
    Telegram Bildirim ve Etkileşim Servisi (@Devran30_bot).
    Tüm BIST 30 hisselerinin analizini eksiksiz iletir.
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

        # Telegram 4096 karakter sınırını aşmamak için güvenli bölme
        MAX_LEN = 3800
        if len(text) <= MAX_LEN:
            chunks = [text]
        else:
            chunks = []
            curr = ""
            for line in text.split("\n"):
                if len(curr) + len(line) + 1 > MAX_LEN:
                    chunks.append(curr)
                    curr = line + "\n"
                else:
                    curr += line + "\n"
            if curr:
                chunks.append(curr)

        success = True
        url = cls.get_api_url("sendMessage")
        for chunk in chunks:
            try:
                payload = {
                    "chat_id": str(target_chat),
                    "text": chunk,
                    "parse_mode": parse_mode,
                    "disable_web_page_preview": True
                }
                resp = requests.post(url, json=payload, timeout=10)
                if resp.status_code != 200:
                    success = False
                time.sleep(0.3)
            except Exception as e:
                print(f"[Telegram Gönderim Hatası]: {e}")
                success = False

        return success

    @classmethod
    def send_all_bist30_report(cls, market_regime: Dict[str, Any], signals: List[Dict[str, Any]], timeframe: str = "Günlük", chat_id: Optional[str] = None):
        """
        Tüm BIST 30 hisselerinin (30/31 hisse) durumunu eksiksiz gönderir.
        """
        regime_emoji = "🟢" if market_regime.get("regime") == "BULLISH" else ("🔴" if market_regime.get("regime") == "BEARISH" else "🟡")
        
        # 1. MESAJ: Piyasa Durumu & Güçlü Alımlar
        msg1 = f"📊 <b>BIST 30 {timeframe.upper()} TAM TARAMA RAPORU ({len(signals)} Hisse)</b>\n"
        msg1 += f"────────────────────────\n"
        msg1 += f"{regime_emoji} <b>Piyasa Rejimi:</b> {market_regime.get('summary', '')}\n"
        msg1 += f"📈 <b>BIST 100:</b> %{market_regime.get('bist100_change', 0.0)} | <b>Liderler:</b> {market_regime.get('heavyweight_bullish_count', 0)}/{market_regime.get('heavyweight_total', 8)} Pozitif\n\n"

        strong_buys = [s for s in signals if s.get("signal_type") in ["GUCLU_AL", "AL"]]
        sells = [s for s in signals if s.get("signal_type") in ["GUCLU_SAT", "SAT"]]
        neutrals = [s for s in signals if s.get("signal_type") == "NOTR"]

        msg1 += f"🔥 <b>ALIM SİNYALİ VERENLER ({len(strong_buys)} Hisse):</b>\n"
        if strong_buys:
            for s in strong_buys:
                sym = s.get("symbol")
                curr = float(s.get("current_price", 0))
                t1 = float(s.get("target_price_1") or s.get("target_1") or curr)
                stop = float(s.get("stop_loss", 0))
                vol = s.get("volume_ratio", 1.0)
                conf = s.get("ai_confidence", 80)
                change = s.get("price_change_pct", 0)
                upside = round(((t1 - curr) / (curr + 1e-9)) * 100, 1)

                msg1 += f"\n💎 <b>{sym}</b> — <b>{s.get('signal_type')}</b> (AI Güven: %{conf})\n"
                msg1 += f"• Güncel: <b>{curr:.2f} TL</b> (Bugün: %{change:+.2f})\n"
                msg1 += f"• Hedef 1: <b>{t1:.2f} TL</b> (Potansiyel: +%{upside})\n"
                msg1 += f"• Stop-Loss: <b>{stop:.2f} TL</b> | Hacim Katı: <b>{vol}x</b>\n"
                if s.get("ai_summary"):
                    msg1 += f"• <i>{s.get('ai_summary')[:120]}...</i>\n"
        else:
            msg1 += "<i>Filtrelere takılan agresif alım sinyali yok.</i>\n"

        cls.send_message(msg1, chat_id=chat_id)

        # 2. MESAJ: Satış Baskısındakiler ve Nötr İzleme Listesi (Kalan Tüm Hisseler)
        msg2 = f"📋 <b>BIST 30 KALAN TÜM HİSSELERİN DURUMU:</b>\n"
        msg2 += f"────────────────────────\n"

        if sells:
            msg2 += f"⚠️ <b>SATIŞ / DÜZELTME BASKISINDAKİLER ({len(sells)} Hisse):</b>\n"
            for s in sells:
                curr = float(s.get("current_price", 0))
                stop = float(s.get("stop_loss", 0))
                chg = s.get("price_change_pct", 0)
                msg2 += f"• <b>{s.get('symbol')}</b>: {curr:.2f} TL (%{chg:+.2f}) | Stop: {stop:.2f} TL | {s.get('signal_type')}\n"
            msg2 += "\n"

        if neutrals:
            msg2 += f"⚪ <b>NÖTR / KONSOLİDASYONDAKİLER ({len(neutrals)} Hisse):</b>\n"
            for s in neutrals:
                curr = float(s.get("current_price", 0))
                chg = s.get("price_change_pct", 0)
                rsi = s.get("rsi_14", 50)
                vol = s.get("volume_ratio", 1.0)
                msg2 += f"• <b>{s.get('symbol')}</b>: {curr:.2f} TL (%{chg:+.2f}) | RSI: {rsi} | Hacim: {vol}x\n"

        msg2 += f"\n────────────────────────\n"
        msg2 += f"💡 <i>Web Paneli: https://frontend-delta-tan-31.vercel.app</i>"

        cls.send_message(msg2, chat_id=chat_id)

    @classmethod
    def send_portfolio_summary(cls, chat_id: Optional[str] = None):
        portfolio = DatabaseManager.get_portfolio(status="OPEN")
        if not portfolio:
            cls.send_message("📂 Portföyünüzde henüz açık pozisyon bulunmuyor.", chat_id=chat_id)
            return

        total_cost = 0.0
        total_current_value = 0.0
        msg = "💼 <b>PORTFÖYÜM & GÜNCEL KÂR/ZARAR</b>\n"
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
            advice = "🟢 KORU"
            if analysis:
                if stop and curr_price <= stop:
                    advice = "🚨 STOP OL! Destek kırıldı."
                elif pct >= 12:
                    advice = "💰 KÂR AL (%12+ kârda)"

            msg += f"\n{emoji} <b>{sym}</b> ({qty:.0f} Lot)\n"
            msg += f"• Maliyet: <b>{buy_price:.2f} TL</b> | Güncel: <b>{curr_price:.2f} TL</b>\n"
            msg += f"• Net K/Z: <b>{diff:+.2f} TL (%{pct:+.2f})</b>\n"
            msg += f"• AI Tavsiyesi: <b>{advice}</b>\n"

        total_diff = total_current_value - total_cost
        total_pct = round((total_diff / (total_cost + 1e-9)) * 100, 2)
        total_emoji = "🚀" if total_diff >= 0 else "📉"

        msg += "\n────────────────────────\n"
        msg += f"{total_emoji} <b>Toplam Portföy Değeri:</b> {total_current_value:,.2f} TL\n"
        msg += f"<b>Toplam Kâr/Zarar:</b> {total_diff:+,.2f} TL (%{total_pct:+.2f})\n"

        cls.send_message(msg, chat_id=chat_id)

    @classmethod
    def check_for_incoming_messages_and_save_chat_id(cls) -> Optional[str]:
        try:
            url = cls.get_api_url("getUpdates")
            resp = requests.get(url, timeout=5).json()
            if resp.get("ok") and resp.get("result"):
                last_update = resp["result"][-1]
                message = last_update.get("message", {})
                chat_id = str(message.get("chat", {}).get("id"))
                if chat_id:
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
