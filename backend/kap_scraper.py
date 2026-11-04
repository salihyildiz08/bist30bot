import xml.etree.ElementTree as ET
import requests
import re
from datetime import datetime
from typing import List, Dict, Any
from backend.config import BIST30_SYMBOLS

class KapAndNewsScraper:
    """
    KAP (Kamuyu Aydınlatma Platformu) ve BIST 30 Şirket Haberleri Takipçisi.
    Pay geri alımları, yeni iş ilişkileri, ihaleler ve bilançoları yakalar.
    """

    KAP_RSS_URL = "https://www.kap.org.tr/tr/rss/bildirimler"

    # Önemli haber anahtar kelimeleri ve etki yönü
    POSITIVE_KEYWORDS = [
        "yeni iş ilişkisi", "ihale", "pay geri alım", "sözleşme imzalan",
        "kapasite artır", "rekor kâr", "temettü dağıtım", "bedelsiz sermaye",
        "satış hasılatı", "sipariş", "onaylandı", "yatırım teşvik"
    ]

    NEGATIVE_KEYWORDS = [
        "dava açıldı", "ceza", "iptal edildi", "zarar açıkladı",
        "faaliyet durdur", "soruşturma", "üretim kısıt", "grev",
        "sermaye azalt", "borç yapılandır"
    ]

    @classmethod
    def clean_text(cls, text: str) -> str:
        if not text:
            return ""
        # HTML etiketlerini ve fazla boşlukları temizle
        clean = re.sub(r'<[^>]+>', ' ', text)
        return " ".join(clean.split())

    @classmethod
    def analyze_headline_sentiment(cls, title: str, summary: str = "") -> Dict[str, Any]:
        combined = f"{title.lower()} {summary.lower()}"
        pos_hits = sum(1 for kw in cls.POSITIVE_KEYWORDS if kw in combined)
        neg_hits = sum(1 for kw in cls.NEGATIVE_KEYWORDS if kw in combined)

        # Kategori tespiti
        category = "Özel Durum Açıklaması"
        if "pay geri alım" in combined:
            category = "Pay Geri Alımı"
        elif "ihale" in combined or "iş ilişkisi" in combined or "sözleşme" in combined:
            category = "Yeni İş İlişkisi / İhale"
        elif "temettü" in combined:
            category = "Temettü Bildirimi"
        elif "finansal rapor" in combined or "bilanço" in combined or "kâr" in combined or "zarar" in combined:
            category = "Finansal Rapor / Bilanço"
        elif "sermaye" in combined:
            category = "Sermaye Piyasası İşlemleri"

        # Duygu (Sentiment) ve Etki Puanı (1-5)
        if pos_hits > neg_hits:
            sentiment = "POZITIF"
            impact_score = min(5, 2 + pos_hits)
        elif neg_hits > pos_hits:
            sentiment = "NEGATIF"
            impact_score = min(5, 2 + neg_hits)
        else:
            sentiment = "NOTR"
            impact_score = 1

        return {
            "category": category,
            "sentiment": sentiment,
            "impact_score": impact_score
        }

    @classmethod
    def fetch_latest_kap_announcements(cls, limit: int = 30) -> List[Dict[str, Any]]:
        """
        KAP RSS beslemesinden BIST 30 ile ilgili en son bildirimleri çeker.
        """
        results = []
        bist30_codes = [s.replace(".IS", "") for s in BIST30_SYMBOLS]

        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }

        try:
            resp = requests.get(cls.KAP_RSS_URL, headers=headers, timeout=10)
            if resp.status_code == 200:
                root = ET.fromstring(resp.content)
                items = root.findall(".//item")

                for item in items:
                    title_elem = item.find("title")
                    link_elem = item.find("link")
                    desc_elem = item.find("description")
                    pub_elem = item.find("pubDate")

                    title = title_elem.text if title_elem is not None else ""
                    link = link_elem.text if link_elem is not None else ""
                    desc = cls.clean_text(desc_elem.text if desc_elem is not None else "")
                    pub_date = pub_elem.text if pub_elem is not None else ""

                    # BIST 30 hisselerinden biriyle eşleşiyor mu?
                    matched_symbol = None
                    for code in bist30_codes:
                        if re.search(rf"\b{code}\b", title, re.IGNORECASE) or re.search(rf"\b{code}\b", desc, re.IGNORECASE):
                            matched_symbol = code
                            break

                    if matched_symbol:
                        meta = cls.analyze_headline_sentiment(title, desc)
                        results.append({
                            "symbol": matched_symbol,
                            "title": title,
                            "summary": desc[:300] + "..." if len(desc) > 300 else desc,
                            "category": meta["category"],
                            "sentiment": meta["sentiment"],
                            "impact_score": meta["impact_score"],
                            "source_url": link,
                            "publish_date": pub_date
                        })

                        if len(results) >= limit:
                            break

        except Exception as e:
            print(f"KAP RSS Hatası: {e}")

        return results

    @classmethod
    def fetch_stock_news(cls, symbol: str, limit: int = 5) -> List[Dict[str, Any]]:
        """
        Belirli bir hisse senedi için Google Finans Haberleri RSS'inden son başlıkları çeker.
        """
        clean_symbol = symbol.replace(".IS", "")
        rss_url = f"https://news.google.com/rss/search?q={clean_symbol}+borsa+hisse&hl=tr&gl=TR&ceid=TR:tr"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
        news_items = []

        try:
            resp = requests.get(rss_url, headers=headers, timeout=8)
            if resp.status_code == 200:
                root = ET.fromstring(resp.content)
                items = root.findall(".//item")[:limit]

                for it in items:
                    t_el = it.find("title")
                    l_el = it.find("link")
                    p_el = it.find("pubDate")
                    title = t_el.text if t_el is not None else ""
                    link = l_el.text if l_el is not None else ""
                    pub = p_el.text if p_el is not None else ""

                    meta = cls.analyze_headline_sentiment(title)
                    news_items.append({
                        "symbol": clean_symbol,
                        "title": title,
                        "category": "Borsa Haberi",
                        "sentiment": meta["sentiment"],
                        "impact_score": meta["impact_score"],
                        "source_url": link,
                        "publish_date": pub
                    })
        except Exception as e:
            print(f"Haber çekme hatası ({clean_symbol}): {e}")

        return news_items
