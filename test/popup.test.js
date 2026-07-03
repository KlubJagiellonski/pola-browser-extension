const fs = require('fs');
const path = require('path');
const { createChromeMock } = require('./mocks/chrome');

// Load popup HTML for jsdom
const popupHtml = fs.readFileSync(
    path.join(__dirname, '..', 'popup', 'pola.html'),
    'utf8'
);

let Pola;
let chromeMock;

beforeEach(() => {
    // Set up DOM from popup HTML
    document.documentElement.innerHTML = popupHtml;

    // Set up Chrome API mock
    chromeMock = createChromeMock();
    global.chrome = chromeMock;

    // Clear module cache so popup/pola.js re-executes with fresh mocks
    const popupModulePath = require.resolve('../popup/pola.js');
    delete require.cache[popupModulePath];

    // Load the module (it exports Pola class instead of instantiating it in test env)
    Pola = require(popupModulePath).Pola;
});

afterEach(() => {
    delete global.chrome;
    jest.restoreAllMocks();
});

describe('Pola popup', () => {
    describe('hideAll()', () => {
        test('hides all sections', () => {
            const pola = new Pola();
            pola.hideAll();

            expect(document.getElementById('loading').style.display).toBe('none');
            expect(document.getElementById('null').style.display).toBe('none');
            expect(document.getElementById('result').style.display).toBe('none');
            expect(document.getElementById('multiple').style.display).toBe('none');
            expect(document.getElementById('error').style.display).toBe('none');
        });
    });

    describe('setNull()', () => {
        test('shows only the null section', () => {
            const pola = new Pola();
            pola.setNull();

            expect(document.getElementById('null').style.display).toBe('block');
            expect(document.getElementById('loading').style.display).toBe('none');
            expect(document.getElementById('result').style.display).toBe('none');
        });
    });

    describe('setLoading()', () => {
        test('shows only the loading section', () => {
            const pola = new Pola();
            pola.setLoading();

            expect(document.getElementById('loading').style.display).toBe('block');
            expect(document.getElementById('null').style.display).toBe('none');
            expect(document.getElementById('result').style.display).toBe('none');
        });
    });

    describe('setError()', () => {
        test('shows only the error section', () => {
            const pola = new Pola();
            pola.setError();

            expect(document.getElementById('error').style.display).toBe('block');
            expect(document.getElementById('loading').style.display).toBe('none');
            expect(document.getElementById('result').style.display).toBe('none');
        });
    });

    describe('setMultiple()', () => {
        test('creates a button for each EAN', () => {
            const pola = new Pola();
            pola.setMultiple(['5900000000008', '5901234123457']);

            expect(document.getElementById('multiple').style.display).toBe('block');
            const buttons = document.querySelectorAll('#multiple-ul button');
            expect(buttons.length).toBe(2);
            expect(buttons[0].textContent).toBe('5900000000008');
            expect(buttons[1].textContent).toBe('5901234123457');
        });

        test('clears previous buttons before adding new ones', () => {
            const pola = new Pola();
            pola.setMultiple(['1111111111116']);
            pola.setMultiple(['2222222222222']);

            const buttons = document.querySelectorAll('#multiple-ul button');
            expect(buttons.length).toBe(1);
            expect(buttons[0].textContent).toBe('2222222222222');
        });
    });

    describe('setResult()', () => {
        const makeCompany = (overrides = {}) => ({
            name: 'Firma Testowa',
            plScore: 75,
            plCapital: 100,
            plWorkers: 100,
            plRnD: 100,
            plRegistered: 100,
            plNotGlobEnt: 100,
            description: 'Opis firmy testowej',
            ...overrides
        });

        test('renders company data correctly', () => {
            const pola = new Pola();
            const json = {
                code: '5900000000008',
                companies: [makeCompany()]
            };

            pola.setResult(json);

            expect(document.getElementById('result').style.display).toBe('block');
            expect(document.getElementById('result-name').textContent).toBe('Firma Testowa');
            expect(document.getElementById('result-score-value').textContent).toBe('75');
            expect(document.getElementById('result-score-fill').style.width).toBe('75%');
            expect(document.getElementById('result-score-placeholder').hidden).toBe(true);
            expect(document.getElementById('result-gauge-label').textContent).toBe('100 %');
            expect(document.getElementById('result-gauge-value-path').style.strokeDashoffset).toBe('0');
            expect(document.getElementById('result-description-text').textContent).toBe('Opis firmy testowej');
        });

        test('marks criteria as met when all values are 100', () => {
            const pola = new Pola();
            pola.setResult({ companies: [makeCompany()] });

            for (const id of ['result-criterion-production', 'result-criterion-rnd', 'result-criterion-registered', 'result-criterion-corp']) {
                const el = document.getElementById(id);
                expect(el.classList.contains('met')).toBe(true);
                expect(el.dataset.state).toBeUndefined();
            }
        });

        test('renders unknown state for null values', () => {
            const pola = new Pola();
            const json = {
                companies: [makeCompany({
                    plScore: null,
                    plCapital: null,
                    plWorkers: null,
                    plRnD: null,
                    plRegistered: null,
                    plNotGlobEnt: null,
                    description: ''
                })]
            };

            pola.setResult(json);

            expect(document.getElementById('result-score-value').textContent).toBe('-');
            expect(document.getElementById('result-score-fill').style.width).toBe('0%');
            expect(document.getElementById('result-score-placeholder').hidden).toBe(false);
            expect(document.getElementById('result-gauge-label').textContent).toBe('—');
            expect(document.getElementById('result-gauge-value-path').style.strokeDashoffset).toBe('254.469');
            for (const id of ['result-criterion-production', 'result-criterion-rnd', 'result-criterion-registered', 'result-criterion-corp']) {
                const el = document.getElementById(id);
                expect(el.classList.contains('met')).toBe(false);
                expect(el.dataset.state).toBe('unknown');
            }
        });

        test('computes gauge dashoffset from plCapital', () => {
            const pola = new Pola();
            pola.setResult({ companies: [makeCompany({ plCapital: 50 })] });

            expect(document.getElementById('result-gauge-label').textContent).toBe('50 %');
            expect(document.getElementById('result-gauge-value-path').style.strokeDashoffset).toBe(String(0.5 * 254.469));
        });

        test('handles missing company (no companies array)', () => {
            const pola = new Pola();
            const json = {
                name: 'Produkt bez firmy',
                altText: 'Nie znaleziono informacji'
            };

            pola.setResult(json);

            expect(document.getElementById('result-name').textContent).toBe('Produkt bez firmy');
            expect(document.getElementById('result-score-value').textContent).toBe('-');
            expect(document.getElementById('result-score-placeholder').hidden).toBe(false);
            expect(document.getElementById('result-gauge-label').textContent).toBe('—');
            expect(document.getElementById('result-description-text').textContent).toBe('Nie znaleziono informacji');
            expect(document.getElementById('result-friend-banner').hidden).toBe(true);
            expect(document.getElementById('result-logo-link').hidden).toBe(true);
            expect(document.getElementById('result-brands-section').hidden).toBe(true);
        });

        test('shows friend banner only when is_friend is true', () => {
            const pola = new Pola();

            pola.setResult({ companies: [makeCompany({ is_friend: true })] });
            expect(document.getElementById('result-friend-banner').hidden).toBe(false);

            pola.setResult({ companies: [makeCompany({ is_friend: false })] });
            expect(document.getElementById('result-friend-banner').hidden).toBe(true);

            pola.setResult({ companies: [makeCompany()] });
            expect(document.getElementById('result-friend-banner').hidden).toBe(true);
        });

        test('shows russia info box for codes with prefix 46 or 481', () => {
            const pola = new Pola();

            pola.setResult({ code: '4601234567890', companies: [makeCompany()] });
            expect(document.getElementById('result-russia-box').hidden).toBe(false);

            pola.setResult({ code: '4811234567890', companies: [makeCompany()] });
            expect(document.getElementById('result-russia-box').hidden).toBe(false);

            pola.setResult({ code: '5901234123457', companies: [makeCompany()] });
            expect(document.getElementById('result-russia-box').hidden).toBe(true);
        });
    });

    describe('description read-more', () => {
        const longText = 'A'.repeat(200);

        test('truncates long description and shows toggle', () => {
            const pola = new Pola();
            pola.setResult({ companies: [{ name: 'Test', description: longText }] });

            const textEl = document.getElementById('result-description-text');
            const toggle = document.getElementById('result-description-toggle');
            expect(textEl.textContent.endsWith('…')).toBe(true);
            expect(textEl.textContent.length).toBeLessThanOrEqual(151);
            expect(toggle.hidden).toBe(false);
            expect(toggle.textContent).toBe('Czytaj więcej');
        });

        test('toggle expands and collapses description', () => {
            const pola = new Pola();
            pola.setResult({ companies: [{ name: 'Test', description: longText }] });

            const textEl = document.getElementById('result-description-text');
            const toggle = document.getElementById('result-description-toggle');

            toggle.click();
            expect(textEl.textContent).toBe(longText);
            expect(toggle.textContent).toBe('Pokaż mniej');

            toggle.click();
            expect(textEl.textContent.endsWith('…')).toBe(true);
            expect(toggle.textContent).toBe('Czytaj więcej');
        });

        test('new setResult resets expanded state', () => {
            const pola = new Pola();
            pola.setResult({ companies: [{ name: 'Test', description: longText }] });
            document.getElementById('result-description-toggle').click();

            pola.setResult({ companies: [{ name: 'Test', description: longText }] });
            expect(document.getElementById('result-description-text').textContent.endsWith('…')).toBe(true);
            expect(document.getElementById('result-description-toggle').textContent).toBe('Czytaj więcej');
        });

        test('short description has no toggle', () => {
            const pola = new Pola();
            pola.setResult({ companies: [{ name: 'Test', description: 'Krótki opis' }] });

            expect(document.getElementById('result-description-text').textContent).toBe('Krótki opis');
            expect(document.getElementById('result-description-toggle').hidden).toBe(true);
        });
    });

    describe('company logo', () => {
        test('shows logo linked to real official_url', () => {
            const pola = new Pola();
            pola.setResult({
                companies: [{
                    name: 'Test',
                    logotype_url: 'https://cdn.example.org/logo.png',
                    official_url: 'https://firma.pl/'
                }]
            });

            const link = document.getElementById('result-logo-link');
            expect(link.hidden).toBe(false);
            expect(link.getAttribute('href')).toBe('https://firma.pl/');
            expect(document.getElementById('result-logo-img').getAttribute('src')).toBe('https://cdn.example.org/logo.png');
        });

        test('does not link logo for placeholder official_url', () => {
            const pola = new Pola();
            pola.setResult({
                companies: [{
                    name: 'Test',
                    logotype_url: 'https://cdn.example.org/logo.png',
                    official_url: 'https://example.pl/'
                }]
            });

            const link = document.getElementById('result-logo-link');
            expect(link.hidden).toBe(false);
            expect(link.getAttribute('href')).toBeNull();
        });

        test('hides logo when logotype_url is missing', () => {
            const pola = new Pola();
            pola.setResult({ companies: [{ name: 'Test' }] });

            expect(document.getElementById('result-logo-link').hidden).toBe(true);
        });

        test('hides logo on image load error and restores it on next render', () => {
            const pola = new Pola();
            const company = {
                name: 'Test',
                logotype_url: 'https://cdn.example.org/logo.png',
                official_url: 'https://firma.pl/'
            };
            pola.setResult({ companies: [company] });

            document.getElementById('result-logo-img').dispatchEvent(new Event('error'));
            expect(document.getElementById('result-logo-link').hidden).toBe(true);

            pola.setResult({ companies: [company] });
            expect(document.getElementById('result-logo-link').hidden).toBe(false);
        });
    });

    describe('brands', () => {
        test('renders only brands with logotype_url', () => {
            const pola = new Pola();
            pola.setResult({
                companies: [{
                    name: 'Test',
                    brands: [
                        { name: 'Marka A', logotype_url: 'https://cdn.example.org/a.png', website_url: 'https://marka-a.pl/' },
                        { name: 'Marka B', logotype_url: null, website_url: 'example.pl' },
                        { name: 'Marka C' }
                    ]
                }]
            });

            expect(document.getElementById('result-brands-section').hidden).toBe(false);
            const tiles = document.querySelectorAll('#result-brands-grid .brand-tile');
            expect(tiles.length).toBe(1);
            const anchor = tiles[0].querySelector('a');
            expect(anchor).not.toBeNull();
            expect(anchor.getAttribute('href')).toBe('https://marka-a.pl/');
            expect(anchor.getAttribute('target')).toBe('_blank');
        });

        test('renders unlinked tile for placeholder website_url', () => {
            const pola = new Pola();
            pola.setResult({
                companies: [{
                    name: 'Test',
                    brands: [
                        { name: 'Marka A', logotype_url: 'https://cdn.example.org/a.png', website_url: 'example.pl' }
                    ]
                }]
            });

            const tiles = document.querySelectorAll('#result-brands-grid .brand-tile');
            expect(tiles.length).toBe(1);
            expect(tiles[0].querySelector('a')).toBeNull();
            expect(tiles[0].querySelector('img').getAttribute('src')).toBe('https://cdn.example.org/a.png');
        });

        test('hides section when no brand has a logo', () => {
            const pola = new Pola();
            pola.setResult({
                companies: [{
                    name: 'Test',
                    brands: [{ name: 'Marka B', logotype_url: null }]
                }]
            });

            expect(document.getElementById('result-brands-section').hidden).toBe(true);
        });

        test('does not accumulate tiles across renders', () => {
            const pola = new Pola();
            const json = {
                companies: [{
                    name: 'Test',
                    brands: [
                        { name: 'Marka A', logotype_url: 'https://cdn.example.org/a.png' }
                    ]
                }]
            };

            pola.setResult(json);
            pola.setResult(json);

            expect(document.querySelectorAll('#result-brands-grid .brand-tile').length).toBe(1);
        });
    });

    describe('setCache()', () => {
        test('parses JSON, stores in chrome.storage, and calls setResult', () => {
            const pola = new Pola();
            const data = JSON.stringify({
                code: '5900000000008',
                companies: [{
                    name: 'Cached Company',
                    plScore: 80,
                    plCapital: 60,
                    plWorkers: null,
                    plRnD: null,
                    plRegistered: 100,
                    plNotGlobEnt: null,
                    description: ''
                }]
            });

            pola.setCache(data);

            // Verify storage was called
            expect(chromeMock.storage.local.set).toHaveBeenCalledWith(
                { '5900000000008': data }
            );
            // Verify result is rendered
            expect(document.getElementById('result-name').textContent).toBe('Cached Company');
        });

        test('shows error on invalid JSON', () => {
            const pola = new Pola();
            pola.setCache('this is not json{{{');

            expect(document.getElementById('error').style.display).toBe('block');
        });
    });

    describe('fetchFromApi()', () => {
        test('constructs correct API URL', async () => {
            global.fetch = jest.fn(() =>
                Promise.resolve({
                    ok: true,
                    text: () => Promise.resolve(JSON.stringify({
                        code: '5900000000008',
                        companies: [{ name: 'API Company', plScore: 50, plCapital: 50, plWorkers: null, plRnD: null, plRegistered: null, plNotGlobEnt: null, description: '' }]
                    }))
                })
            );

            const pola = new Pola();
            pola.fetchFromApi('5900000000008');

            expect(global.fetch).toHaveBeenCalledWith(
                'https://www.pola-app.pl/a/v4/get_by_code?code=5900000000008&device_id=we',
                { referrer: 'no-referrer', referrerPolicy: 'no-referrer' }
            );

            delete global.fetch;
        });

        test('shows error on API failure', async () => {
            global.fetch = jest.fn(() =>
                Promise.resolve({ ok: false, status: 500 })
            );

            const pola = new Pola();
            pola.fetchFromApi('5900000000008');

            // Wait for promise chain to resolve
            await new Promise(resolve => setTimeout(resolve, 0));

            expect(document.getElementById('error').style.display).toBe('block');

            delete global.fetch;
        });
    });

    describe('notify()', () => {
        test('dispatches "ean" message to setEan', () => {
            const pola = new Pola();
            // mockImplementation prevents setEan from actually running
            // (which would trigger fetch, chrome.storage, etc.)
            const spy = jest.spyOn(pola, 'setEan').mockImplementation(() => {});

            pola.notify({ type: 'ean', result: '5900000000008' });

            expect(spy).toHaveBeenCalledWith('5900000000008');
        });

        test('dispatches "multiple" message to setMultiple', () => {
            const pola = new Pola();
            const spy = jest.spyOn(pola, 'setMultiple');
            const eans = ['5900000000008', '5901234123457'];

            pola.notify({ type: 'multiple', result: eans });

            expect(spy).toHaveBeenCalledWith(eans);
        });

        test('dispatches "null" message to setNull', () => {
            const pola = new Pola();
            const spy = jest.spyOn(pola, 'setNull');

            pola.notify({ type: 'null' });

            expect(spy).toHaveBeenCalled();
        });

        test('dispatches unknown type to setNull (default case)', () => {
            const pola = new Pola();
            const spy = jest.spyOn(pola, 'setNull');

            pola.notify({ type: 'unknown_type' });

            expect(spy).toHaveBeenCalled();
        });
    });
});
