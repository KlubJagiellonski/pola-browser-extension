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
 *
 * UWAGA: Te testy odpytują prawdziwe strony internetowe, więc:
 * - Mogą być wolniejsze (zależą od sieci)
 * - Mogą się "zepsuć" jeśli sklep zmieni stronę (wtedy trzeba zaktualizować test)
 * - W CI uruchamiamy je z retry=1 i osobnym jobem (allow-failure)
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

test.describe('EAN detection on real product pages', () => {

    test('frisco.pl — Makłowicz oliwa z oliwek → EAN 5905644030022', async ({ page }) => {
        await page.goto(
            'https://www.frisco.pl/pid,145610/n,maklowicz-i-synowie-oliwa-z-oliwek-extra-vergine/stn,product',
            { waitUntil: 'domcontentloaded' }
        );

        const messages = await injectContentScript(page);

        // Content script powinien znaleźć dokładnie 1 EAN i wysłać { type: 'ean', result: '...' }
        // LUB znaleźć wiele i wysłać { type: 'multiple', result: [...] }
        const eanMessage = messages.find(m => m.type === 'ean');
        const multipleMessage = messages.find(m => m.type === 'multiple');

        if (eanMessage) {
            expect(eanMessage.result).toBe('5905644030022');
        } else if (multipleMessage) {
            expect(multipleMessage.result).toContain('5905644030022');
        } else {
            // Jeśli nie znaleziono — test powinien sfailować z czytelnym komunikatem
            throw new Error(
                `Content script nie znalazł EAN 5905644030022 na stronie frisco.pl. ` +
                `Przechwycone wiadomości: ${JSON.stringify(messages)}`
            );
        }
    });

});
