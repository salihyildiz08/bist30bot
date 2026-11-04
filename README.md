# 📈 BIST 30 Yapay Zeka Destekli Analiz & Portföy Yönetim Terminali

Borsa İstanbul **BIST 30** hisseleri için teknik indikatörler, KAP haberleri, endeks trend rejimi ve Google Gemini yapay zekasını bir araya getiren kurumsal kalitede al-sat ve portföy takip sistemi.

---

## 🌟 Temel Yetenekler

1. **Çoklu Zaman Dilimli Al/Sat Sinyalleri (Günlük, Haftalık, Aylık):**
   - EMA (9, 21, 50, 200), RSI (14), MACD, ATR, Bollinger Bantları ve Destek/Direnç hesaplamaları.
   - **Hacim Onayı (Volume Confirmation):** 20 günlük ortalama hacmin 1.3x katı ve üzeri kırılımları tespit eden "Hacim Patlaması (Volume Spike)" filtresi.
   - **Kesin Risk Disiplini (Ali Perşembe Kuralı):** Otomatik Stop-Loss, Hedef 1 ve Hedef 2 seviyeleri (Risk/Ödül Oranı en az 1:1.5 - 1:2.5).

2. **Piyasa & Endeks Trend Rejimi Filtresi:**
   - Tekil hisselerde ters yönde agresif pozisyon açılmasını engeller.
   - BIST 100 / BIST 30 endeks trendi ve ağır sıklet liderlerin (THYAO, TUPRS, AKBNK, BIMAS, KCHOL, ASELS, ISCTR, GARAN) yönünü teyit eder.

3. **KAP (Kamuyu Aydınlatma Platformu) & Finansal Duygu Radarı:**
   - Pay geri alımları, yeni sözleşmeler/ihaleler, temettüler ve bilançoları yakalar.
   - Yapay zeka ile haberleri pozitif/nötr/negatif olarak etiketler ve etki derecesi (1-5 yıldız) verir.

4. **Portföyüm & Canlı Kâr/Zarar Takibi (Satın Aldıklarım):**
   - Satın aldığınız hisseleri (Fiyat, Adet, Tarih, Not, Stop-Loss, Hedef) kaydedebilirsiniz.
   - Canlı piyasa fiyatlarıyla anlık Kâr/Zarar (TL ve %) otomatik hesaplanır.
   - **Yapay Zeka Pozisyon Danışmanı:** Hissenin gidişatına göre dinamik aksiyon üretir (*🟢 Koru / 💰 Kısmi Kâr Al / 🚨 Stop Ol*).

5. **Telegram Bildirim Botu Entegrasyonu:**
   - Günlük kapanış sonrası özet bülten.
   - Açık portföyünüzün kâr/zarar ve risk durumu.
   - Kritik KAP bildirimleri düştüğünde anında cep telefonu uyarısı.

6. **%100 Ücretsiz Altyapı (0 TL / Ay):**
   - **Frontend:** Vercel (Hobby Free)
   - **Veritabanı:** Supabase (Free Tier)
   - **Yapay Zeka:** Google Gemini 2.5 Flash / 1.5 Flash (Free Tier)
   - **Borsa Verisi:** Yahoo Finance Chart API (Ücretsiz ve yüksek hızlı)
   - **Otomasyon:** GitHub Actions (Ayda 2000 dk ücretsiz cron)

---

## 🏗️ Proje Mimarisi

```
├── backend/
│   ├── config.py              # BIST 30 sembolleri, lider hisseler ve ayarlar
│   ├── technical_analysis.py  # EMA, RSI, MACD, Bollinger, ATR, Hacim motoru
│   ├── market_regime.py       # BIST 100 ve Ağır sıklet hisselerin rejim analizi
│   ├── kap_scraper.py         # KAP RSS ve şirket haberleri kazıyıcısı
│   ├── ai_advisor.py          # Gemini LLM ve yerel finansal sentez motoru
│   ├── db.py                  # Supabase & Local JSON veritabanı köprüsü
│   ├── telegram_bot.py        # Telegram bot bildirim ve rapor servisi
│   └── main.py                # CLI tarayıcı ve otomasyon tetikleyicisi
│
├── frontend/                  # Next.js 16 + Tailwind CSS Vercel Arayüzü
│   ├── src/app/
│   │   ├── api/
│   │   │   ├── signals/       # Günlük/Haftalık/Aylık al-sat sinyal endpointi
│   │   │   ├── portfolio/     # Portföy ekleme, silme ve canlı K/Z hesaplama
│   │   │   ├── market-regime/ # Canlı endeks trendi
│   │   │   └── kap/           # KAP duygu radarı endpointi
│   │   ├── page.tsx           # Şık, koyu temalı finansal dashboard
│   │   └── layout.tsx
│   └── package.json
│
├── supabase/
│   └── schema.sql             # Tek tıkla çalıştırılabilir PostgreSQL şeması
│
├── .github/workflows/
│   └── daily_scan.yml         # Her iş günü 18:30'da otomatik çalışan cron botu
└── requirements.txt           # Python bağımlılıkları
```

---

## 🚀 Hızlı Başlangıç

### 1. Python Motoru (Yerel Test)

```powershell
# Sanal ortamı aktive edin (veya venv kullanın)
.\venv\Scripts\activate

# 5 hisselik hızlı test taraması yapın:
python -m backend.main --limit 5 --no-telegram

# Tüm BIST 30 hisselerini taramak için:
python -m backend.main --timeframe daily --limit 31
```

### 2. Frontend Arayüzü (Vercel / Local)

```powershell
cd frontend
npm run dev
```
Tarayıcınızda `http://localhost:3000` adresine gidin.

---

## 🗄️ Supabase Kurulumu

1. [Supabase](https://supabase.com) üzerinde ücretsiz yeni bir proje açın.
2. Sol menüden **SQL Editor** sekmesine gidin.
3. Projedeki `supabase/schema.sql` dosyasının tüm içeriğini yapıştırıp **Run** butonuna basın.
4. Project Settings -> API kısmından **Project URL** ve **Anon Key** değerlerini alın.

---

## 🤖 Telegram Botu Kurulumu

1. Telegram'da **@BotFather**'a gidin, `/newbot` yazarak botunuzu oluşturun ve **API Token**'ı alın.
2. Telegram'da **@userinfobot**'a mesaj atarak sayısal **Id** (Chat ID) değerinizi öğrenin.
3. Proje ana dizinindeki `.env` dosyasına girin:
   ```env
   TELEGRAM_BOT_TOKEN=123456789:ABC...
   TELEGRAM_CHAT_ID=987654321
   ```

---

## ☁️ Vercel'e Dağıtım (Deploy to Vercel)

1. Projeyi GitHub reponuza yükleyin (`git push`).
2. [Vercel](https://vercel.com) paneline gidip **Add New -> Project** seçin ve GitHub reponuzu bağlayın.
3. **Root Directory** olarak `frontend` klasörünü seçin.
4. **Environment Variables** kısmına şu değişkenleri ekleyin:
   - `NEXT_PUBLIC_SUPABASE_URL` = (Supabase URL'iniz)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = (Supabase Anon Key'iniz)
   - `GEMINI_API_KEY` = (Google AI Studio Gemini anahtarınız)
5. **Deploy** butonuna basın. Projeniz canlıya çıkacaktır!

---

## ⏰ Sıfır Maliyetli Günlük Otomasyon (GitHub Actions)

Projenin `.github/workflows/daily_scan.yml` dosyası sayesinde:
- Her iş günü saat **18:30'da (Borsa İstanbul kapanışından sonra)** GitHub sunucuları otomatik uyanır.
- 30 hissenin teknik ve KAP analizini yapar.
- Sonuçları Supabase veritabanınıza kaydeder.
- Telegram üzerinden cebinize günün bültenini ve açık portföyünüzün K/Z raporunu gönderir.
- Bilgisayarınızın açık kalmasına gerek yoktur!
