# Tanishuv Chat

Username orqali odam qidirib, u bilan matnli xabar almashish mumkin bo'lgan oddiy messenjer.

## Texnologiyalar

- **Frontend**: Next.js (App Router) + Tailwind CSS + React Query + Socket.IO client + emoji-picker-react + lucide-react
- **Backend**: Node.js + Express + Socket.IO + SQLite3

## Ishga tushirish

Ikki terminalda alohida ishga tushiring:

```bash
cd backend
npm install
npm run dev
```

```bash
cd frontend
npm install
npm run dev
```

Frontend: http://localhost:3000
Backend: http://localhost:4000

## Qanday ishlaydi

1. Bosh sahifada ikkita tab bor: **Ro'yxatdan o'tish** (username, parol, ism, familiya, yosh, shahar — `POST /api/auth/register`, parol bcrypt bilan xeshlanib saqlanadi) va **Kirish** (username + parol — `POST /api/auth/login`).
2. Bir marta ro'yxatdan o'tgan foydalanuvchi keyingi safar shu username/parol bilan istalgancha kirib chiqishi mumkin.
3. `/messages` sahifasida Socket.IO orqali serverga ulanadi va real vaqtli xabar almashish, online holat kuzatuvi ishga tushadi.
4. Chapdagi qidiruv maydoniga username yozib boshqa foydalanuvchilarni topish mumkin (`GET /api/users/search?q=...`).
5. Foydalanuvchi tanlanganda o'sha kishi bilan bo'lgan xabarlar tarixi yuklanadi (`GET /api/messages/:otherUserId`) va yangi xabarlar Socket.IO orqali real vaqtda uzatiladi (`send_message` / `message` eventlari).
6. Chapdagi ro'yxatda oldingi suhbatlar oxirgi xabar bilan birga ko'rsatiladi (`GET /api/messages/conversations`).
7. Online/oflayn holat `presence` va `get_online_ids` eventlari orqali kuzatiladi.
8. "Chiqish" tugmasi bosilganda localStorage tozalanadi, socket uziladi va bosh sahifaga qaytariladi.

## Eslatma

- Barcha foydalanuvchi profillari (parol xesh bilan) va xabarlar SQLite faylida (`backend/data/app.db`) saqlanadi.
- Username 3-20 belgi, faqat harf/raqam/pastki chiziq bo'lishi kerak va unikal bo'lishi shart. Parol kamida 6 belgi.
- Google orqali ro'yxatdan o'tgan akkauntlarda parol bo'lmaydi — ular faqat Google tugmasi orqali kiradi.

## Google orqali kirish (ixtiyoriy)

Bosh sahifada oddiy formadan tashqari "Google bilan davom etish" tugmasi ham chiqishi uchun Google OAuth Client ID kerak:

1. https://console.cloud.google.com/apis/credentials sahifasiga kiring (loyiha yarating yoki mavjudini tanlang).
2. **Create Credentials → OAuth client ID → Web application**.
3. **Authorized JavaScript origins** ga qo'shing: `http://localhost:3000`
4. Yaratilgan Client ID'ni ikkala joyga qo'ying:
   - `frontend/.env.local` faylida `NEXT_PUBLIC_GOOGLE_CLIENT_ID=...`
   - `backend/.env` faylida `GOOGLE_CLIENT_ID=...` (xuddi shu ID)
5. Ikkala serverni qayta ishga tushiring.

Client ID kiritilmagan bo'lsa, Google tugmasi shunchaki ko'rinmaydi va oddiy forma orqali ro'yxatdan o'tish davom etadi — hech narsa buzilmaydi.

Google orqali birinchi marta kirganda, faqat ism/familiya/email keladi — foydalanuvchi username, yosh va shaharni qo'lda to'ldirib profilni yakunlaydi. Keyingi safar xuddi shu Google akkaunt bilan kirsa, to'g'ridan-to'g'ri ichkariga kiradi.

## Emoji va stiker

- Xabar yozish maydonida 😊 tugmasi `emoji-picker-react` paketidagi to'liq emoji tanlagichni ochadi (qidiruv va kategoriyalar bilan) — tanlangan emoji matnga qo'shiladi.
- 🖼️ (stiker) tugmasi kattaroq stiker to'plamini ochadi — biror stiker bosilganda darhol alohida xabar sifatida yuboriladi (pufakchasiz, katta hajmda ko'rinadi, xuddi Telegram stikerlaridek).
- Barcha sayt ikonkalari (qidiruv, chiqish, yuborish, emoji/stiker tugmalari, forma maydonlari) `lucide-react` paketidan olingan.
