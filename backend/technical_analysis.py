import datetime
import requests
import pandas as pd
import numpy as np
from typing import Dict, Any, Optional

class TechnicalAnalysisEngine:
    """
    BIST hisseleri için ultra hızlı ve bağımsız teknik analiz motoru.
    EMA, RSI, MACD, Bollinger, ATR, Hacim Ortalaması ve Destek/Direnç hesaplar.
    """

    HEADERS = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    }

    @classmethod
    def fetch_ohlcv(cls, ticker_symbol: str, range_param: str = "6mo", interval_param: str = "1d") -> Optional[pd.DataFrame]:
        url = f"https://query1.finance.yahoo.com/v8/finance/chart/{ticker_symbol}?range={range_param}&interval={interval_param}"
        try:
            resp = requests.get(url, headers=cls.HEADERS, timeout=10)
            if resp.status_code != 200:
                return None
            data = resp.json()
            results = data.get("chart", {}).get("result")
            if not results:
                return None
            chart_res = results[0]
            timestamps = chart_res.get("timestamp", [])
            indicators = chart_res.get("indicators", {}).get("quote", [])
            if not timestamps or not indicators:
                return None
            
            quote = indicators[0]
            dates = [datetime.datetime.fromtimestamp(t) for t in timestamps]
            df = pd.DataFrame({
                "Open": quote.get("open", []),
                "High": quote.get("high", []),
                "Low": quote.get("low", []),
                "Close": quote.get("close", []),
                "Volume": quote.get("volume", [])
            }, index=dates)

            df = df.dropna()
            return df
        except Exception as e:
            print(f"Veri çekme hatası ({ticker_symbol}): {e}")
            return None

    @staticmethod
    def calculate_rsi(series: pd.Series, period: int = 14) -> pd.Series:
        delta = series.diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
        rs = gain / (loss + 1e-9)
        rsi = 100 - (100 / (1 + rs))
        return rsi

    @staticmethod
    def calculate_atr(df: pd.DataFrame, period: int = 14) -> pd.Series:
        high = df['High']
        low = df['Low']
        close = df['Close']
        tr1 = high - low
        tr2 = (high - close.shift()).abs()
        tr3 = (low - close.shift()).abs()
        tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
        atr = tr.rolling(window=period).mean()
        return atr

    @staticmethod
    def calculate_macd(series: pd.Series, fast: int = 12, slow: int = 26, signal: int = 9):
        ema_fast = series.ewm(span=fast, adjust=False).mean()
        ema_slow = series.ewm(span=slow, adjust=False).mean()
        macd_line = ema_fast - ema_slow
        signal_line = macd_line.ewm(span=signal, adjust=False).mean()
        histogram = macd_line - signal_line
        return macd_line, signal_line, histogram

    @classmethod
    def analyze_ticker(cls, symbol: str, timeframe: str = "daily") -> Optional[Dict[str, Any]]:
        """
        symbol: Örn: 'THYAO.IS' veya 'THYAO'
        timeframe: 'daily', 'weekly', 'monthly'
        """
        if not symbol.endswith(".IS"):
            ticker_symbol = f"{symbol}.IS"
            clean_symbol = symbol
        else:
            ticker_symbol = symbol
            clean_symbol = symbol.replace(".IS", "")

        param_map = {
            "daily": ("6mo", "1d"),
            "weekly": ("2y", "1wk"),
            "monthly": ("5y", "1mo")
        }
        range_param, interval_param = param_map.get(timeframe, ("6mo", "1d"))

        df = cls.fetch_ohlcv(ticker_symbol, range_param, interval_param)
        if df is None or len(df) < 25:
            return None

        close = df['Close']
        volume = df['Volume']

        # Üssel Hareketli Ortalamalar (EMA)
        df['EMA_9'] = close.ewm(span=9, adjust=False).mean()
        df['EMA_21'] = close.ewm(span=21, adjust=False).mean()
        df['EMA_50'] = close.ewm(span=50, adjust=False).mean()
        df['EMA_200'] = close.ewm(span=200, adjust=False).mean() if len(df) >= 200 else pd.Series(np.nan, index=df.index)

        # RSI & MACD
        df['RSI_14'] = cls.calculate_rsi(close, 14)
        macd_line, signal_line, macd_hist = cls.calculate_macd(close)
        df['MACD'] = macd_line
        df['MACD_Signal'] = signal_line
        df['MACD_Hist'] = macd_hist

        # ATR (Volatilite ve Stop-Loss için)
        df['ATR'] = cls.calculate_atr(df, 14)

        # 20 Günlük Hacim Ortalaması ve Hacim Katı
        df['Vol_SMA_20'] = volume.rolling(window=20).mean()
        df['Vol_Ratio'] = volume / (df['Vol_SMA_20'] + 1e-9)

        # Bollinger Bantları
        sma_20 = close.rolling(window=20).mean()
        std_20 = close.rolling(window=20).std()
        df['BB_Upper'] = sma_20 + (std_20 * 2)
        df['BB_Lower'] = sma_20 - (std_20 * 2)

        latest = df.iloc[-1]
        prev = df.iloc[-2]

        current_price = float(latest['Close'])
        prev_price = float(prev['Close'])
        price_change_pct = round(((current_price - prev_price) / prev_price) * 100, 2)

        ema_9 = float(latest['EMA_9'])
        ema_21 = float(latest['EMA_21'])
        ema_50 = float(latest['EMA_50'])
        ema_200 = float(latest['EMA_200']) if not np.isnan(latest['EMA_200']) else None
        rsi = round(float(latest['RSI_14']), 2) if not np.isnan(latest['RSI_14']) else 50.0
        vol_ratio = round(float(latest['Vol_Ratio']), 2) if not np.isnan(latest['Vol_Ratio']) else 1.0
        atr = float(latest['ATR']) if not np.isnan(latest['ATR']) else (current_price * 0.02)

        # Destek ve Dirençler (Son 20 periyottaki en yüksek ve en düşükler)
        recent_high = float(df['High'].iloc[-20:].max())
        recent_low = float(df['Low'].iloc[-20:].min())

        # Stop-loss ve Hedef Hesaplama (Ali Perşembe Disiplini: Kesin Stop & R:R >= 2.0)
        atr_stop = current_price - (1.5 * atr)
        ema_stop = ema_21 * 0.985
        stop_loss = round(max(atr_stop, ema_stop), 2)
        if stop_loss >= current_price:
            stop_loss = round(current_price * 0.96, 2)

        risk_amount = current_price - stop_loss
        target_1 = round(current_price + (risk_amount * 1.5), 2)
        target_2 = round(current_price + (risk_amount * 2.5), 2)
        risk_reward = round((target_1 - current_price) / (risk_amount + 1e-9), 2)

        # Kural Tabanlı Ham Sinyal Üretimi
        score = 0
        reasons = []

        if ema_9 > ema_21:
            score += 2
            reasons.append("Kısa vadeli trend pozitif (EMA 9 > EMA 21)")
        else:
            score -= 2
            reasons.append("Kısa vadeli zayıflık (EMA 9 < EMA 21)")

        if current_price > ema_50:
            score += 1
            reasons.append("Orta vadeli trend desteği üstünde (Fiyat > EMA 50)")
        else:
            score -= 1

        if 40 <= rsi <= 65 and latest['RSI_14'] > prev['RSI_14']:
            score += 2
            reasons.append(f"RSI pozitif momentum bölgesinde ({rsi})")
        elif rsi > 70:
            score -= 1
            reasons.append(f"RSI aşırı alım bölgesinde ({rsi}), kâr satışı riski")
        elif rsi < 30:
            score += 1
            reasons.append(f"RSI aşırı satım bölgesinde ({rsi}), tepki potansiyeli")

        # Hacim Onayı (Volume Confirmation - 1.3x üzeri kırılım)
        if vol_ratio >= 1.3 and price_change_pct > 0:
            score += 3
            reasons.append(f"Güçlü hacim onayı! (20G ortalamanın {vol_ratio}x katı hacim)")
        elif vol_ratio < 0.7:
            reasons.append(f"Düşük hacimli hareket ({vol_ratio}x), teyit zayıf")

        if latest['MACD'] > latest['MACD_Signal'] and prev['MACD'] <= prev['MACD_Signal']:
            score += 3
            reasons.append("MACD taze al sinyali üretti (Kesişim)")
        elif latest['MACD'] > latest['MACD_Signal']:
            score += 1
            reasons.append("MACD pozitif bölgede")

        if score >= 5:
            signal_type = "GUCLU_AL"
        elif score >= 2:
            signal_type = "AL"
        elif score <= -4:
            signal_type = "GUCLU_SAT"
        elif score <= -1:
            signal_type = "SAT"
        else:
            signal_type = "NOTR"

        return {
            "symbol": clean_symbol,
            "ticker": ticker_symbol,
            "timeframe": timeframe,
            "current_price": current_price,
            "price_change_pct": price_change_pct,
            "signal_type": signal_type,
            "score": score,
            "reasons": reasons,
            "target_1": target_1,
            "target_2": target_2,
            "stop_loss": stop_loss,
            "risk_reward": risk_reward,
            "rsi_14": rsi,
            "ema_9": round(ema_9, 2),
            "ema_21": round(ema_21, 2),
            "ema_50": round(ema_50, 2),
            "ema_200": round(ema_200, 2) if ema_200 else None,
            "volume_ratio": vol_ratio,
            "recent_high": recent_high,
            "recent_low": recent_low,
            "bb_upper": round(float(latest['BB_Upper']), 2),
            "bb_lower": round(float(latest['BB_Lower']), 2)
        }
