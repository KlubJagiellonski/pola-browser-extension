/**
 * Testy E2E — wykrywanie EAN na prawdziwych stronach sklepów.
 *
 * Jak to działa:
 * 1. Playwright otwiera prawdziwą przeglądarkę (Chromium headless)
 * 2. Nawiguje na stronę produktu w sklepie internetowym
 * 3. Wstrzykuje mock chrome.runtime.sendMessage (żeby przechwycić wynik)
 * 4. Wstrzykuje lib/validateEAN.js (definicja funkcji walidacji)
 * 5. Wstrzykuje content_scripts/pola.js (logika skanowania)
 * 6. Sprawdza czy content script znalazł oczekiwany kod EAN
 */

const { test, expect } = require('@playwright/test');
const path = require('path');

/**
 * Helper: wstrzykuje content script na stronę i zwraca przechwycone wiadomości.
 *
 * Krok po kroku:
 * 1. Definiuje globalny mock `chrome.runtime.sendMessage` który zapisuje wywołania
 * 2. Ładuje lib/validateEAN.js (definiuje funkcję validateEAN)
 * 3. Ładuje content_scripts/pola.js (skanuje stronę i wywołuje sendMessage)
 * 4. Zwraca tablicę wiadomości które content script "wysłał"
 */
async function injectContentScript(page) {
    // Mock chrome.runtime.sendMessage — content script wywoła tę funkcję z wynikiem
    await page.evaluate(() => {
        window.__capturedMessages = [];
        window.chrome = {
            runtime: {
                sendMessage: (msg) => {
                    window.__capturedMessages.push(msg);
                }
            }
        };
    });

    // Wstrzyknij validateEAN (musi być pierwszy, bo content script go używa)
    await page.addScriptTag({ path: path.join(__dirname, '..', 'lib', 'validateEAN.js') });

    // Wstrzyknij content script (skanuje stronę i wywołuje chrome.runtime.sendMessage)
    await page.addScriptTag({ path: path.join(__dirname, '..', 'content_scripts', 'pola.js') });

    // Pobierz przechwycone wiadomości
    return await page.evaluate(() => window.__capturedMessages);
}

// ============================================================================
// TESTY
// ============================================================================

const productPages = [
    {
        store: 'frisco.pl',
        product: 'Makłowicz i Synowie oliwa z oliwek extra virgin',
        ean: '5905644030022',
        url: 'https://www.frisco.pl/pid,145610/n,maklowicz-i-synowie-oliwa-z-oliwek-extra-vergine/stn,product',
    },
    {
        store: 'erli.pl',
        product: 'Szklany dzbanek filtrujący Dafi CRYSTAL 2l biały',
        ean: '5900950928254',
        url: 'https://erli.pl/produkt/szklany-dzbanek-filtrujacy-dafi-crystal-2l-bialy,159105253',
    },
    {
        store: 'dodomku.pl',
        product: 'Maluta Masło ekstra',
        ean: '5904467191316',
        url: 'https://dodomku.pl/Maluta_Maslo_ekstra/61218_2435341_552.html',
    },
    {
        store: 'megasam24.pl',
        product: 'Baton mango bez dodatku cukru 35 g',
        ean: '4820287102619',
        url: 'https://megasam24.pl/baton-mango-bez-dodatku-cukru-35-g',
    },
    {
        store: 'leclerc-online.pl',
        product: 'Dolina Noteci Premium Sterilised Danie z kaczki dla kota 85g',
        ean: '5902921303213',
        url: 'https://leclerc-online.pl/dolina-noteci-premium-sterilised-danie-z-kaczki-dla-kota-85g',  
    }
];

test.describe('EAN detection on real product pages', () => {

    for (const { store, product, ean, url } of productPages) {
        test(`${store} — ${product} → EAN ${ean}`, async ({ page }) => {
            await page.goto(url, { waitUntil: 'domcontentloaded' });

            const messages = await injectContentScript(page);

            const eanMessage = messages.find(m => m.type === 'ean');
            const multipleMessage = messages.find(m => m.type === 'multiple');

            if (eanMessage) {
                expect(eanMessage.result).toBe(ean);
            } else if (multipleMessage) {
                expect(multipleMessage.result).toContain(ean);
            } else {
                throw new Error(
                    `Content script nie znalazł EAN ${ean} na stronie ${store}. ` +
                    `Przechwycone wiadomości: ${JSON.stringify(messages)}`
                );
            }
        });
    }
});
