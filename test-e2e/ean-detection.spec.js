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
        // Cloudflare wystawia challenge page dla IP runnerów GitHub Actions (data center),
        // co blokuje wykrycie EAN. Lokalnie (rezydencjalny IP) przechodzi bez problemu.
        skipOnCI: true,
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
        // Cloudflare (Turnstile) wystawia challenge page z restrykcyjnym CSP dla IP runnerów
        // GitHub Actions, co blokuje wstrzyknięcie inline scriptu. Lokalnie działa poprawnie.
        skipOnCI: true,
    },
    {
        store: 'carrefour.pl',
        product: 'JBB Baldyga — Kiełbaski z filetem z piersi kurczaka 190 g',
        ean: '5907701809046',
        url: 'https://www.carrefour.pl/wedliny-kielbasy/kielbasy/kielbasy-miesne/jbb-baldyga-kielbaski-z-filetem-z-piersi-kurczaka-190-g',
    },
    {
        store: 'szybkikoszyk.pl',
        product: 'Proszek do zmywarek Ludwik 5-funkcyjny 3 kg',
        ean: '5900498026283',
        url: 'https://szybkikoszyk.pl/proszek-do-zmywarek-ludwik-5-funkcyjny-worek-3-kg.html',
    },
    {
        store: 'sklep.brat.pl',
        product: 'Kukurydza prażona Barbecue 200g',
        ean: '5905514507364',
        url: 'https://sklep.brat.pl/przekaski/slone-przekaski/kukurydza-prazona-barbecue-200g',
    },
    {
        store: 'espolem.pl',
        product: 'Frosta — Warzywa na patelnię z bazylią i oregano 400 g',
        ean: '5900972001249',
        url: 'https://www.espolem.pl/towar/frosta-warzywa-na-patelnie-z-bazylia-i-oregano-400-g/535550',
    },
    {
        store: 'auchan.pl',
        product: 'Ser mozzarella w zalewie Galbani 125 g',
        ean: '8000430133035',
        url: 'https://zakupy.auchan.pl/products/ser-mozzarella-w-zalewie-galbani-125-g/00506346',
    },
    {
        store: 'e-spar.com.pl',
        product: 'Wawel Trufle z Wawelu — cukierki kakaowe o smaku rumowym w czekoladzie 245 g',
        ean: '5900102025688',
        url: 'https://e-spar.com.pl/towar/wawel-trufle-z-wawelu-cukierki-kakaowe-o-smaku-rumowym-w-czekoladzie-245-g/303523',
    },
    {
        store: 'pakomarket.pl',
        product: 'Łowicz — Syrop malinowy 400 ml',
        ean: '5900397745780',
        url: 'https://www.pakomarket.pl/produkt/lowicz-syrop-malina-butelka-400ml/',
    },
    {
        store: 'bi1.pl',
        product: 'Alpro Barista Napój owsiano-sojowy o smaku karmelowym 1 l',
        ean: '5411188140863',
        url: 'https://bialystok.esklep.bi1.pl/alpro-barista-napoj-owsiano-sojowy-o-smaku-karmelo/3-139-29220',
    },
    {
        store: 'emmamarket.pl',
        product: 'Ketchup pikantny Codzienny 560 g',
        ean: '5902241747582',
        url: 'https://emmamarket.pl/ketchupy/20384-ketchup-pikantny-codzienny-560g.html',
    },
    {
        store: 'zakupy-eleclerc.pl',
        product: 'Ustronianka Napój gazowany z dodatkiem jodu 1,5 l',
        ean: '5902403944149',
        url: 'https://zakupy-eleclerc.pl/ustronianka-napoj-gazowany-z-dodatkiem-jodu-15-l',
    },
    {
        store: 'bee.pl',
        product: 'Astra — Klej Wikolast 45 g',
        ean: '5901137178103',
        url: 'https://www.bee.pl/astra-klej-wikolast-45-g_p1795929.html',
    },
    {
        store: 'e-prim.pl',
        product: 'Kujawski — Olej Kujawski 2 l',
        ean: '5900012003608',
        url: 'https://e-prim.pl/pl/products/olej-kujawski-2l-11380',
    }
];

test.describe('EAN detection on real product pages', () => {

    for (const { store, product, ean, url, skipOnCI } of productPages) {
        test(`${store} — ${product} → EAN ${ean}`, async ({ page }) => {
            test.skip(!!process.env.CI && !!skipOnCI, 'Zablokowane przez Cloudflare dla IP runnerów CI — patrz komentarz przy definicji strony');

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
