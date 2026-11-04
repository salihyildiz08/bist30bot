import json
from pathlib import Path
from typing import List, Dict, Any, Optional
from datetime import datetime
from backend.config import SUPABASE_URL, SUPABASE_KEY, BASE_DIR

LOCAL_DB_FILE = BASE_DIR / "local_db.json"

class DatabaseManager:
    """
    Supabase ve Yerel JSON veritabanı yönetim katmanı.
    Supabase anahtarları girilmemişse yerel JSON ile %100 çalışır.
    """

    _supabase_client = None

    @classmethod
    def get_client(cls):
        if cls._supabase_client is None:
            if SUPABASE_URL and SUPABASE_KEY and "your-supabase" not in SUPABASE_URL:
                try:
                    from supabase import create_client
                    cls._supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)
                    print("[DB] Supabase bağlantısı aktif.")
                except Exception as e:
                    print(f"[DB] Supabase bağlantı hatası: {e}")
                    cls._supabase_client = None
        return cls._supabase_client

    @classmethod
    def _read_local_db(cls) -> Dict[str, Any]:
        if not LOCAL_DB_FILE.exists():
            default_data = {
                "portfolio": [],
                "signals": [],
                "kap_news": [],
                "settings": {}
            }
            cls._write_local_db(default_data)
            return default_data
        try:
            with open(LOCAL_DB_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {"portfolio": [], "signals": [], "kap_news": [], "settings": {}}

    @classmethod
    def _write_local_db(cls, data: Dict[str, Any]):
        with open(LOCAL_DB_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2, default=str)

    # --- SİNYALLER (SIGNALS) ---
    @classmethod
    def save_signal(cls, signal_data: Dict[str, Any]) -> bool:
        client = cls.get_client()
        if client:
            try:
                client.table("stock_signals").insert(signal_data).execute()
                return True
            except Exception as e:
                print(f"[DB] Supabase sinyal kaydetme hatası: {e}")

        # Yerel DB'ye yaz
        db = cls._read_local_db()
        # Aynı hisse ve timeframe için en son sinyali güncelle veya ekle
        db["signals"].insert(0, {**signal_data, "created_at": datetime.now().isoformat()})
        db["signals"] = db["signals"][:150] # Son 150 sinyali tut
        cls._write_local_db(db)
        return True

    @classmethod
    def get_latest_signals(cls, timeframe: str = "daily") -> List[Dict[str, Any]]:
        client = cls.get_client()
        if client:
            try:
                res = client.table("stock_signals").select("*").eq("timeframe", timeframe).order("created_at", desc=True).limit(35).execute()
                if res.data:
                    return res.data
            except Exception as e:
                print(f"[DB] Supabase sinyal çekme hatası: {e}")

        db = cls._read_local_db()
        filtered = [s for s in db.get("signals", []) if s.get("timeframe") == timeframe]
        return filtered

    # --- PORTFÖYÜM (PORTFOLIO) ---
    @classmethod
    def add_portfolio_item(cls, symbol: str, buy_price: float, quantity: float, notes: str = "", stop_loss: float = 0.0, target_price: float = 0.0) -> Dict[str, Any]:
        item = {
            "symbol": symbol.upper().replace(".IS", ""),
            "buy_price": float(buy_price),
            "quantity": float(quantity),
            "buy_date": datetime.now().strftime("%Y-%m-%d"),
            "stop_loss": float(stop_loss) if stop_loss else None,
            "target_price": float(target_price) if target_price else None,
            "notes": notes,
            "status": "OPEN",
            "created_at": datetime.now().isoformat()
        }

        client = cls.get_client()
        if client:
            try:
                res = client.table("user_portfolio").insert(item).execute()
                if res.data:
                    return res.data[0]
            except Exception as e:
                print(f"[DB] Supabase portföy ekleme hatası: {e}")

        db = cls._read_local_db()
        import uuid
        item["id"] = str(uuid.uuid4())
        db["portfolio"].append(item)
        cls._write_local_db(db)
        return item

    @classmethod
    def get_portfolio(cls, status: str = "OPEN") -> List[Dict[str, Any]]:
        client = cls.get_client()
        if client:
            try:
                res = client.table("user_portfolio").select("*").eq("status", status).execute()
                if res.data:
                    return res.data
            except Exception as e:
                print(f"[DB] Supabase portföy listeleme hatası: {e}")

        db = cls._read_local_db()
        return [p for p in db.get("portfolio", []) if p.get("status") == status]

    @classmethod
    def remove_portfolio_item(cls, item_id: str) -> bool:
        client = cls.get_client()
        if client:
            try:
                client.table("user_portfolio").delete().eq("id", item_id).execute()
                return True
            except Exception:
                pass

        db = cls._read_local_db()
        db["portfolio"] = [p for p in db.get("portfolio", []) if str(p.get("id")) != str(item_id)]
        cls._write_local_db(db)
        return True

    # --- KAP HABERLERİ ---
    @classmethod
    def save_kap_news(cls, news_list: List[Dict[str, Any]]):
        client = cls.get_client()
        if client and news_list:
            try:
                client.table("kap_notifications").insert(news_list).execute()
            except Exception:
                pass

        db = cls._read_local_db()
        for n in news_list:
            db["kap_news"].insert(0, {**n, "created_at": datetime.now().isoformat()})
        db["kap_news"] = db["kap_news"][:100]
        cls._write_local_db(db)
