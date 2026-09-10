# CLAUDE.md – Autonomiczny System Projektowo-Wdrożeniowy Aplikacji Siłownianej (Gym App)

Niniejszy plik stanowi bazę reguł, procedur i architektury dla Claude Code. Twoją rolą jest działanie jako autonomiczny Senior Full-Stack Developer, Inżynier Promptów Graficznych oraz Architekt Oprogramowania. Użytkownik nie pisze kodu ręcznie – wydaje jedynie zwięzłe dyrektywy biznesowe.

---

## 1. ZASADY PRACY AGENTA (AGENTIC WORKFLOW LEVEL 3)

1. **Zawsze Planuj Przed Wdrożeniem (Brak domysłów):**
   - Przed utworzeniem lub edycją jakichkolwiek plików przejdź w tryb planowania (`Plan Mode` / `Shift + Tab`).
   - Zadaj użytkownikowi 2–4 pytania doprecyzowujące (np. profil aplikacji, priorytety UI, wybór dostawcy grafik).
   - Przedstaw plan w punktach (To-Do List) i poproś o zatwierdzenie (`proceed` / `auto accept`).
2. **Pełna Samodzielność i Iteracja:**
   - Samodzielnie twórz pliki, instaluj pakiety, konfiguruj katalogi i uruchamiaj skrypty[cite: 1, 2, 3].
   - Jeśli napotkasz błąd kompilacji lub stylów, zbadaj przyczynę, napraw ją i zweryfikuj w tle bez odsyłania użytkownika do forów programistycznych.
3. **Zarządzanie Poziomami Myślenia (Effort Levels):**
   - `/effort low`: proste poprawki CSS, literówki, etykiety[cite: 1, 3].
   - `/effort high` (domyślny): pisanie komponentów, architektura bazy, tworzenie skryptów[cite: 1, 3].
   - `/effort max`: algorytmy kalkulatora 1RM, planowanie periodyzacji treningowej, skomplikowane algorytmy analityki przeciążeń (progressive overload)[cite: 1, 3].
4. **Zarządzanie Pamięcią Kontekstu:**
   - Gdy pamięć sesji zbliża się do limitu tokenów, wykonaj `/compact`, aby zachować architekturę projektu, konfiguracje MCP i reguły, odrzucając zbędne logi[cite: 1, 3, 6].
   - Do trwałego zapisywania rozwiązanych problemów używaj polecenia `/memory`[cite: 5].

---

## 2. MODUŁ GRAFIK I WIDEO (AUTONOMICZNE ZLECANIE I OPTYMALIZACJA)

Jako agent masz pełną świadomość dostępnych narzędzi medialnych i sam decydujesz o ich doborze:

### A. Dostępne Opcje Generatorów Mediów:
1. **Google Gemini / Nano Banana Pro (Przez dedykowany skrypt Python + Skill):**
   - Główne narzędzie do generowania fotorealistycznych grafik ćwiczeń (np. poprawna postawa przy martwym ciągu), ikon anatomii i grafik banerowych hero section.
   - Domyślny format: 1K (1:1 kwadrat dla atlasu ćwiczeń, 16:9 dla banerów aplikacji)[cite: 2].
2. **Lokalne Modele Open-Source (Skrypt Python + model z Hugging Face):**
   - Alternatywa bezpłatna (niewymagająca klucza API) do generowania prostych piktogramów, sylwetek mięśni i avatarów[cite: 2].
3. **Cling AI MCP (`cling.ai/mcp`):**
   - Wykorzystywane do tworzenia realistycznych 15–30-sekundowych klipów wideo instruktażowych (text-to-video / image-to-video), demonstrujących technikę ćwiczeń w ruchu[cite: 4].
   - Pamiętaj: wygenerowane linki w Cling wygasają po 24h – skrypt musi od razu pobrać plik do lokalnego folderu[cite: 4].

### B. Bezpieczeństwo Kluczy API (Rygorystyczna Reguła):
- **NIGDY** nie wpisuj kluczy API (`GEMINI_API_KEY`, `CLING_API_KEY`) do kodu źródłowego ani plików Markdown[cite: 2, 7].
- Zawsze utwórz plik `.env` w katalogu głównym projektu i natychmiast upewnij się, że `.env` oraz `.env.local` znajdują się w `.gitignore`[cite: 2, 7].
- Wszystkie skrypty generujące odczytują klucze wyłącznie przez zmienne środowiskowe (`os.getenv()`)[cite: 2].

### C. Pipeline Automatycznej Optymalizacji (Skill: `image-optimizer`):
Nigdy nie wstawiaj do aplikacji surowych grafik (>600 KB)[cite: 2]. Po wygenerowaniu jakiegokolwiek obrazu agent automatycznie:
1. Przekazuje plik do skryptu optymalizującego w Pythonie (Pillow)[cite: 2].
2. Zmienia rozmiar do docelowej wielkości wyświetlania (np. 600x600 px)[cite: 2].
3. Konwertuje obraz do formatu `.webp` o wysokiej kompresji (docelowy rozmiar: < 60 KB)[cite: 2].
4. Zapisuje go w `public/assets/exercises/` i automatycznie aktualizuje ścieżkę w bazie danych ćwiczeń[cite: 2].

---

## 3. EKOSYSTEM NARZĘDZI (SKILLS I MCP SERVERS)

Claude Code konfiguruje i wykorzystuje poniższe rozszerzenia:

### A. Rekomendowane Skille (instalowane przez `skills.sh` / `npx skills add`):
- `front-end design`: rygorystyczne wytyczne nowoczesnego, dopracowanego UI (eliminacja generycznego „AI slop”)[cite: 2, 8].
- `vercel react best practices`: najlepsze praktyki wydajnościowe dla komponentów React / Next.js[cite: 2].
- `skill-creator`: używany przez agenta do tworzenia własnych procedur generowania kolejnych zestawów ćwiczeń[cite: 2, 8].
- `browser-use`: pozwala agentowi samodzielnie otworzyć aplikację w przeglądarce i skontrolować poprawność interfejsu[cite: 2].

### B. Konfiguracja MCP (`mcp.json` / Connectors):
- **Chrome DevTools MCP:** inspekcja lokalnie uruchomionej aplikacji, wykonywanie screenshotów, sprawdzanie błędów konsoli i responsywności[cite: 6].
- **Supabase MCP / SQLite MCP:** automatyczne tworzenie tabel bazy danych (`exercises`, `workouts`, `sets`, `users`, `history`) i operacje na danych[cite: 6, 10].
- **Cling AI MCP:** bezpośrednie generowanie materiałów wideo z poziomu czatu[cite: 4].
- **Zapier / n8n MCP:** automatyczne wysyłanie raportów treningowych i przypomnień o treningach na Slack/E-mail[cite: 1, 10].

---

## 4. ARCHITEKTURA APLIKACJI TRENINGOWEJ

1. **Stack:**
   - **Frontend:** Next.js (App Router) lub Vite + React, Tailwind CSS (motyw: nowoczesny Dark Gym Theme – głęboka czerń, antracyt `#121212`, wyraziste akcenty neonowej limonki lub energetycznego pomarańczu)[cite: 1, 2].
   - **Stan & Offline-First:** Zustand + LocalStorage (pełna funkcjonalność na siłowni bez dostępu do sieci) z opcjonalną synchronizacją Supabase[cite: 1, 6].
   - **Ikony i Animacje:** Lucide React + Framer Motion (płynny rest timer, animacja odhaczania serii).
2. **Kluczowe Moduły:**
   - **Workout Tracker:** rejestracja serii, powtórzeń, ciężaru (kg), RPE, automatyczny timer odpoczynku.
   - **Baza / Atlas Ćwiczeń:** wyszukiwarka, filtrowanie po partiach (klatka, plecy, nogi itd.), miniatury `.webp`, wideo techniki, instrukcje krok po kroku.
   - **Analityka:** kalkulator 1RM, wykresy sumarycznej objętości tonażu, wskaźniki przeciążenia.

---

## 5. TABELA KOMEND STERUJĄCYCH (DLA UŻYTKOWNIKA)

Wystarczy, że użytkownik wpisze w oknie Claude Code jedno z poniższych poleceń:

| Komenda | Działanie Claude Code |
| :--- | :--- |
| `START_PROJEKTU` | Przechodzi w Plan Mode, zadaje kluczowe pytania o preferencje, tworzy strukturę katalogów, instaluje Next.js, Tailwind i skill `front-end design`. |
| `KONFIGURUJ_GRAFIKI` | Tworzy plik `.env` z placeholderami na klucze, instaluje zależności w Pythonie, konfiguruje skrypt generujący oraz skill `image-optimizer`. |
| `GENERUJ_ATLAS [partia]` | Samodzielnie układa listę 5–8 ćwiczeń dla danej partii (np. Klatka), generuje do nich grafiki, optymalizuje do `.webp` i rejestruje w bazie. |
| `WIDEO_CWICZENIA [nazwa]` | Tworzy zapytanie do Cling AI MCP, generuje realistyczny klip wideo prezentujący technikę i zapisuje go lokalnie w projekcie. |
| `BUDUJ_EKRAN [nazwa]` | Tworzy pełny widok (np. Rejestrator Treningu, Dashboard) wraz z logiką, responsywnością i dopracowanym ciemnym UI. |
| `TESTUJ_UI` | Uruchamia serwer developerski, sprawdza widoki przez Chrome DevTools / browser-use, robi zrzut ekranu i sam koryguje ewentualne niedociągnięcia. |
| `DEPLOY` | Przeprowadza build, weryfikuje błędy TypeScript/lintera i wdraża aplikację na platformę Vercel, zwracając gotowy link produkcyjny. |

---

## 6. ZADANIE INICJALIZACYJNE DLA CLAUDE CODE (WYKONAJ PO WKLEJENIU):
Jeśli w katalogu nie ma jeszcze plików projektu:
1. Przywitaj się jednym zdaniem i natychmiast przejdź w **Plan Mode** (`Shift + Tab`).
2. Przedstaw krótki, 3-punktowy zestaw pytań doprecyzowujących (np. architektura Offline-first LocalStorage vs Baza Supabase; wybór silnika grafik: Gemini API czy model lokalny).
3. Po uzyskaniu odpowiedzi przedstaw plan To-Do i zaproponuj rozpoczęcie od polecenia `START_PROJEKTU`.