# Książka Kucharska - Recipe Scraper

Nowoczesna aplikacja webowa do zbierania i zarządzania przepisami kulinarnymi z automatycznym scrapingiem z polskich stron kulinarnych.

## ✨ Funkcje

### 🔑 Bezpieczne API
- Ręczne wprowadzanie klucza Claude API
- Klucz przechowywany tylko w pamięci przeglądarki
- Brak trwałego zapisywania kluczy API

### 🤖 Inteligentny Scraping
- **JSON-LD parsing** - najniezawodniejsza metoda
- **Microdata parsing** - schema.org Recipe
- **Claude AI parsing** - inteligentne wyodrębnianie z trudnych stron
- **CORS bypass** - 4 różne serwery proxy
- **Obsługa polskich znaków** - ą,ć,ę,ł,ń,ó,ś,ź,ż

### 📱 Zarządzanie Przepisami
- Dodawanie przepisów przez URL lub ręcznie
- Wyszukiwanie po nazwie i składnikach
- Edytowanie i usuwanie przepisów
- Przechowywanie w localStorage przeglądarki

### 🌐 Obsługiwane Strony
- KwestiaSmaku.com
- AniaGotuje.pl
- AllRecipes.com
- Food.com
- I wiele innych stron z strukturalnymi danymi

## 🛠️ Instalacja

1. Pobierz pliki do lokalnego folderu:
   ```
   index.html
   style.css
   app.js
   README.md
   ```

2. Otwórz `index.html` w przeglądarce lub uruchom lokalny serwer:
   ```bash
   python -m http.server 8000
   # lub
   npx serve .
   ```

3. Uzyskaj klucz Claude API:
   - Idź do https://console.anthropic.com/
   - Stwórz nowy klucz API
   - Wprowadź go w aplikacji (sekcja 🔑)

## 📋 Użytkowanie

### Dodawanie Przepisów przez URL
1. Przejdź do sekcji "➕ Dodaj"
2. Wprowadź klucz Claude API (jeśli nie zrobiono wcześniej)
3. Wklej URL przepisu
4. Kliknij "🚀 Wyodrębnij"
5. Sprawdź wyniki i zapisz

### Ręczne Dodawanie
1. Wypełnij formularz ręcznie
2. Jeden składnik/instrukcja na linię
3. Kliknij "💾 Zapisz przepis"

### Testowanie Scrapera
1. Przejdź do sekcji "🧪 Test"
2. Kliknij "🚀 Uruchom testy"
3. Obserwuj wyniki dla 4 przykładowych przepisów

## 🔧 Techniczne Szczegóły

### Architektura
- **Frontend**: Vanilla JavaScript ES6+
- **Styling**: CSS3 z CSS Custom Properties
- **Storage**: localStorage przeglądarki
- **API**: Claude 3 Haiku dla trudnych przypadków

### Metody Scrapingu
1. **JSON-LD** - parser strukturalnych danych
2. **Microdata** - schema.org Recipe markup
3. **Claude AI** - analiza HTML przez sztuczną inteligencję
4. **Basic HTML** - fallback parsing

### CORS Bypass
```javascript
corsProxies = [
    'https://api.allorigins.win/get?url=',
    'https://cors-anywhere.herokuapp.com/',
    'https://thingproxy.freeboard.io/fetch/',
    'https://api.codetabs.com/v1/proxy?quest='
];
```

## 🐛 Debugowanie

### Problemy z CORS
- Aplikacja próbuje 4 różne proxy serwery
- W przypadku błędów sprawdź konsole przeglądarki
- Niektóre proxy mogą być czasowo niedostępne

### Problemy z Claude API
- Sprawdź poprawność klucza API
- Klucz musi zaczynać się od `sk-ant-`
- Sprawdź limity API w konsoli Anthropic

### Polskie znaki
- Aplikacja automatycznie dekoduje HTML entities
- Obsługuje wszystkie polskie znaki diakrytyczne
- Sprawdź encoding strony (`charset="UTF-8"`)

## 📊 Testowane Strony

Aplikacja została przetestowana z:
- ✅ KwestiaSmaku.com
- ✅ AniaGotuje.pl  
- ✅ AllRecipes.com
- ✅ Food.com

## 🔐 Bezpieczeństwo

- **Klucze API** nie są przechowywane trwale
- **Dane przepisów** pozostają w przeglądarce użytkownika
- **HTTPS** wymagane dla API Anthropic
- **CSP ready** - kompatybilne z Content Security Policy

## 📝 Licencja

MIT License - możesz swobodnie modyfikować i dystrybuować.

## 🤝 Wsparcie

W przypadku problemów:
1. Sprawdź konsolę przeglądarki (F12)
2. Upewnij się, że klucz Claude API jest poprawny
3. Przetestuj z przykładowymi URL-ami
4. Sprawdź połączenie internetowe

---

Made with ❤️ dla miłośników gotowania 👩‍🍳👨‍🍳