import os
from pathlib import Path
from dotenv import load_dotenv

# .env dosyasını proje kök dizininden yükle
BASE_DIR = Path(__file__).resolve().parent.parent
env_path = BASE_DIR / ".env"
if env_path.exists():
    load_dotenv(dotenv_path=env_path)
else:
    load_dotenv()

# BIST 30 Hisseleri ve Sembolleri
BIST30_SYMBOLS = [
    "AKBNK.IS", "ARCLK.IS", "ASELS.IS", "ASTOR.IS", "BIMAS.IS",
    "BRSAN.IS", "CANTE.IS", "EKGYO.IS", "ENKAI.IS", "EREGL.IS",
    "FROTO.IS", "GARAN.IS", "GUBRF.IS", "HEKTS.IS", "ISCTR.IS",
    "KCHOL.IS", "KONTR.IS", "KOZAL.IS", "KRDMD.IS", "MGROS.IS",
    "OYAKC.IS", "PETKM.IS", "PGSUS.IS", "SAHOL.IS", "SASA.IS",
    "SISE.IS",  "TCELL.IS", "THYAO.IS", "TOASO.IS", "TUPRS.IS",
    "YKBNK.IS"
]

# Endeksi Taşıyan Ağır Sıklet Hisseler
HEAVYWEIGHT_SYMBOLS = [
    "THYAO.IS", "TUPRS.IS", "AKBNK.IS", "BIMAS.IS",
    "KCHOL.IS", "GARAN.IS", "ISCTR.IS", "ASELS.IS"
]

# Piyasa Göstergeleri
MARKET_INDEXES = {
    "BIST100": "XU100.IS",
    "BIST30": "XU030.IS"
}

# Çevre Değişkenleri
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID", "")

# Strateji Parametreleri
VOLUME_SPIKE_RATIO = float(os.getenv("VOLUME_SPIKE_THRESHOLD", "1.3"))
MIN_RR_RATIO = float(os.getenv("MIN_RISK_REWARD_RATIO", "2.0"))
