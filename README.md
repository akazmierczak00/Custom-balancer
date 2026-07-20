# Custom Balancer

Aplikacja webowa do balansowania składów League of Legends w grupie znajomych. Real-time lobby, głosowania, losowanie teamów i osłabień Adriana.

## Stack

- **Next.js 16** + TypeScript + Tailwind CSS
- **Firebase Auth** (email/hasło + Google)
- **Cloud Firestore** (real-time)
- **Vercel** (hosting)

## Uruchomienie lokalne

1. Utwórz projekt w [Firebase Console](https://console.firebase.google.com/)
2. Włącz Authentication: Email/Password i Google
3. Utwórz bazę Firestore
4. Skopiuj `.env.example` do `.env.local` i uzupełnij dane Firebase
5. Ustaw `NEXT_PUBLIC_ADMIN_EMAILS` na swój email (rola administratora)
6. Zainstaluj zależności i uruchom:

```bash
npm install
npm run dev
```

7. Wdróż reguły Firestore:

```bash
firebase deploy --only firestore:rules
```

## Deploy na Vercel

1. Połącz repozytorium z Vercel
2. Dodaj zmienne środowiskowe z `.env.example`
3. W Firebase Console dodaj domenę Vercel do Authorized domains
4. Deploy

### Riot API (opcjonalnie)

1. Utwórz klucz na [Riot Developer Portal](https://developer.riotgames.com/) (Production key dla produkcji)
2. Dodaj do Vercel / `.env.local`:
   - `RIOT_API_KEY`
   - `FIREBASE_SERVICE_ACCOUNT_JSON` (JSON service account Firebase, jedna linia)
   - `CRON_SECRET` (losowy sekret dla cron joba)
3. Cron `/api/cron/sync-riot-ranks` uruchamia się codziennie o 6:00 UTC i aktualizuje rangi użytkowników z podpiętym kontem Riot (pomija profile z ręczną rangą lub wyłączonym auto-sync)

## Role

- **Admin** — tworzy lobby, zarządza osłabieniami, wybiera zwycięzcę, ustawia cooldown
- **User** — profil, zapis do lobby, głosowania, wybór osłabień (jeśli wyznaczony)

Admin jest przypisywany automatycznie przy pierwszym logowaniu, jeśli email jest na liście `NEXT_PUBLIC_ADMIN_EMAILS`.

## Fazy lobby

1. Zapis 10 graczy → akceptacja (20s)
2. Losowanie teamów i ról → reveal (5s per rola)
3. Głosowanie nad składem / zmiana składów
4. Osłabienia Adriana (losowanie + wybór za punkty)
5. Gra → wynik → cooldown → kolejna runda
