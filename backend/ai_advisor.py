import os
import json
from typing import Dict, Any, List
from backend.config import GEMINI_API_KEY

class AIAdvisor:
    """
    Gemini LLM Destekli BIST 30 Yatırım Danışmanı ve Sentez Motoru.
    Ali Perşembe risk disiplini, kurumsal bülten bakışı ve KAP haberlerini birleştirir.
    """

    @classmethod
    def generate_stock_verdict(
        cls,
        technical_data: Dict[str, Any],
        market_regime: Dict[str, Any],
        kap_news: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Teknik veriler, endeks rejimi ve KAP haberlerini sentezler.
        Eğer GEMINI_API_KEY mevcutsa Gemini 2.5 Flash / 1.5 Flash çağırır,
        yoksa akıllı kural tabanlı profesyonel analist motorunu çalıştırır.
        """
        symbol = technical_data.get("symbol", "")
        price = technical_data.get("current_price", 0.0)
        signal = technical_data.get("signal_type", "NOTR")
        rsi = technical_data.get("rsi_14", 50.0)
        vol_ratio = technical_data.get("volume_ratio", 1.0)
        stop_loss = technical_data.get("stop_loss", 0.0)
        target_1 = technical_data.get("target_1", 0.0)
        target_2 = technical_data.get("target_2", 0.0)
        reasons = technical_data.get("reasons", [])
        
        regime_type = market_regime.get("regime", "SIDEWAYS")
        regime_summary = market_regime.get("summary", "")

        # Haber özet metni
        news_summary_text = "Son dönemde kritik KAP bildirimi bulunmuyor."
        if kap_news:
            news_items = [f"[{n.get('sentiment')}] {n.get('title')} ({n.get('category')})" for n in kap_news[:3]]
            news_summary_text = " | ".join(news_items)

        # Eğer Gemini API Anahtarı girilmişse LLM ile derin sentez
        if GEMINI_API_KEY and GEMINI_API_KEY != "your-gemini-api-key":
            try:
                from google import genai
                client = genai.Client(api_key=GEMINI_API_KEY)

                prompt = f"""
Sen Borsa İstanbul (BIST 30) alanında uzmanlaşmış, Ali Perşembe'nin disiplinli risk yönetimi ilkelerine ve SPK lisanslı aracı kurum bülteni ciddiyetine sahip bir Baş Yatırım Danışmanısın.

Aşağıdaki verileri analiz et ve JSON formatında yanıt ver:
Hisse: {symbol}
Güncel Fiyat: {price} TL
Teknik Sinyal: {signal}
RSI (14): {rsi}
Hacim Katı (20G Ortalamaya göre): {vol_ratio}x
Teknik Gerekçeler: {', '.join(reasons)}
Hesaplanan Stop-Loss: {stop_loss} TL
Hesaplanan Hedef 1: {target_1} TL | Hedef 2: {target_2} TL
Piyasa Rejimi (BIST Endeksi): {regime_type} ({regime_summary})
İlgili KAP & Finans Haberleri: {news_summary_text}

GEREKLİLİKLER:
1. Endeks rejimi 'BEARISH' ise ve bu hisse endekse ters yönde güçlü bir habere sahip değilse AL sinyalini temkinli yorumla.
2. Hacim 1.3x altında ise kırılımın sahte (tuzak) olma riskine dikkat çek.
3. Elinde hissesi olanlar için aksiyon öner (TUT / KÂR AL / STOP OL).

Lütfen SADECE aşağıdaki JSON şemasında çıktı ver (başka yazı ekleme):
{{
  "ai_confidence": (0 ile 100 arasında bir tamsayı),
  "final_signal": ("GUCLU_AL", "AL", "NOTR", "SAT", "GUCLU_SAT"),
  "holder_advice": ("TUT", "KISMI_KAR_AL", "STOP_OL", "POZISYON_AC"),
  "ai_summary": "Türkçe 2-3 cümlelik derin teknik ve haber sentezi.",
  "risk_warning": "En kritik risk faktörü (Örn: Endeks satış baskısı veya direnç testinde hacim yetersizliği)."
}}
"""
                response = client.models.generate_content(
                    model="gemini-2.5-flash",
                    contents=prompt
                )
                text = response.text.strip()
                # Markdown kod bloklarını temizle
                if text.startswith("```"):
                    text = text.split("```")[1]
                    if text.startswith("json"):
                        text = text[4:]
                text = text.strip()
                parsed = json.loads(text)
                return {
                    "ai_confidence": parsed.get("ai_confidence", 75),
                    "final_signal": parsed.get("final_signal", signal),
                    "holder_advice": parsed.get("holder_advice", "TUT"),
                    "ai_summary": parsed.get("ai_summary", ""),
                    "risk_warning": parsed.get("risk_warning", "Volatiliteye dikkat edilmeli.")
                }
            except Exception as e:
                print(f"Gemini API hatası ({symbol}), yerel kural motoruna geçiliyor: {e}")

        # --- YEREL AKILLI KURAL VE FİNANSAL SENTEZ MOTORU (FALLBACK) ---
        confidence = 65
        final_signal = signal
        holder_advice = "TUT"
        risk_warning = "Piyasa genel dalgalanmalarına karşı stop-loss seviyesine sadık kalınmalıdır."

        # Endeks filtresi
        if regime_type == "BEARISH":
            if signal in ["GUCLU_AL", "AL"]:
                final_signal = "NOTR"
                confidence = 55
                risk_warning = "BIST 100 ana trendi satıcılı olduğu için tekil hissede yükselişler satış fırsatı olarak kullanılabilir."
        elif regime_type == "BULLISH":
            if signal in ["GUCLU_AL", "AL"]:
                confidence = 85

        # Hacim filtresi
        if vol_ratio >= 1.3 and price > stop_loss:
            confidence = min(95, confidence + 10)
        elif vol_ratio < 0.8:
            confidence = max(40, confidence - 15)
            risk_warning = "Hacim 20 günlük ortalamanın altında kaldı; hareket hacimle teyit edilmedi."

        # Portföyde tutanlar için tavsiye
        if rsi >= 72:
            holder_advice = "KISMI_KAR_AL"
            ai_summary = f"{symbol} için teknik momentum güçlü ancak RSI ({rsi}) aşırı alım bölgesinde. Stop seviyesi ({stop_loss} TL) yükseltilerek kısmi kâr realizasyonu planlanabilir."
        elif price <= stop_loss * 1.01:
            holder_advice = "STOP_OL"
            ai_summary = f"{symbol} kritik destek ve stop seviyesi olan {stop_loss} TL bandına yaklaştı. Trend bozulma emareleri gösteriyor."
        elif final_signal in ["GUCLU_AL", "AL"]:
            holder_advice = "POZISYON_AC"
            ai_summary = f"{symbol} EMA ortalamaları ve hacim artışı ({vol_ratio}x) ile pozitif trend görünümünü teyit ediyor. Hedef: {target_1} TL, Stop: {stop_loss} TL."
        else:
            holder_advice = "TUT"
            ai_summary = f"{symbol} mevcut seviyelerinde konsolide oluyor. Net bir trend kırılımı teyit edilene kadar mevcut pozisyonlar {stop_loss} TL stopuyla korunabilir."

        if kap_news:
            top_news = kap_news[0]
            ai_summary += f" Son KAP: {top_news.get('title')} ({top_news.get('sentiment')})."

        return {
            "ai_confidence": confidence,
            "final_signal": final_signal,
            "holder_advice": holder_advice,
            "ai_summary": ai_summary,
            "risk_warning": risk_warning
        }
