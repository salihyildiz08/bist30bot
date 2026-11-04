import pandas as pd
from typing import Dict, Any
from backend.config import HEAVYWEIGHT_SYMBOLS, MARKET_INDEXES
from backend.technical_analysis import TechnicalAnalysisEngine

class MarketRegimeEngine:
    """
    BIST Endeks Trendi ve Ağır Sıklet Lider Hisse Analizi.
    Endeks yönünü teyit etmeden tekil hisselerde agresif pozisyon açılmasını engeller.
    """

    @classmethod
    def evaluate_market_regime(cls) -> Dict[str, Any]:
        result = {
            "regime": "SIDEWAYS",
            "score": 0,
            "bist100_change": 0.0,
            "bist30_change": 0.0,
            "heavyweight_bullish_count": 0,
            "heavyweight_total": len(HEAVYWEIGHT_SYMBOLS),
            "summary": ""
        }

        try:
            # 1. BIST 100 ve BIST 30 Trendi
            xu100 = TechnicalAnalysisEngine.fetch_ohlcv(MARKET_INDEXES["BIST100"], range_param="1mo", interval_param="1d")
            xu030 = TechnicalAnalysisEngine.fetch_ohlcv(MARKET_INDEXES["BIST30"], range_param="1mo", interval_param="1d")

            bist100_ok = False
            if xu100 is not None and len(xu100) >= 21:
                close = xu100['Close']
                ema_21 = close.ewm(span=21, adjust=False).mean().iloc[-1]
                curr = close.iloc[-1]
                prev = close.iloc[-2]
                result["bist100_change"] = round(((curr - prev) / prev) * 100, 2)
                bist100_ok = curr > ema_21

            if xu030 is not None and len(xu030) >= 2:
                curr30 = xu030['Close'].iloc[-1]
                prev30 = xu030['Close'].iloc[-2]
                result["bist30_change"] = round(((curr30 - prev30) / prev30) * 100, 2)

            # 2. Ağır Sıklet Liderlerin Durumu (THYAO, TUPRS, AKBNK, BIMAS, KCHOL, GARAN, ISCTR, ASELS)
            bullish_heavyweights = 0
            for symbol in HEAVYWEIGHT_SYMBOLS:
                try:
                    df = TechnicalAnalysisEngine.fetch_ohlcv(symbol, range_param="1mo", interval_param="1d")
                    if df is not None and len(df) >= 21:
                        close = df['Close']
                        ema_21 = close.ewm(span=21, adjust=False).mean().iloc[-1]
                        if close.iloc[-1] > ema_21 and close.iloc[-1] >= close.iloc[-2]:
                            bullish_heavyweights += 1
                except Exception:
                    continue

            result["heavyweight_bullish_count"] = bullish_heavyweights
            ratio = bullish_heavyweights / len(HEAVYWEIGHT_SYMBOLS)

            if bist100_ok and ratio >= 0.5:
                result["regime"] = "BULLISH"
                result["score"] = 2
                result["summary"] = f"Piyasa Güçlü Boğa: BIST 100 EMA 21 üstünde. Lider hisselerin %{int(ratio*100)}'ü yükselişi destekliyor."
            elif not bist100_ok and ratio <= 0.35:
                result["regime"] = "BEARISH"
                result["score"] = -2
                result["summary"] = f"Piyasa Ayı Baskısında: BIST 100 EMA 21 altında. Lider hisseler zayıf (%{int(ratio*100)} pozitif). Yeni alımlarda temkinli olunmalı."
            else:
                result["regime"] = "SIDEWAYS"
                result["score"] = 0
                result["summary"] = f"Piyasa Yatay/Düzeltmede: Seçici hisse bazlı hareketler hakim. Liderlerin %{int(ratio*100)}'ü pozitif."

        except Exception as e:
            result["summary"] = f"Piyasa rejimi hesaplanırken hata: {e}"

        return result
