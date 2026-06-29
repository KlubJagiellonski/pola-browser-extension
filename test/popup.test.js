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
    const popupPath = path.resolve(__dirname, '..', 'popup', 'pola.js');
    delete require.cache[popupPath];

    // Load the module (it exports Pola class instead of instantiating it in test env)
    Pola = require('../popup/pola.js').Pola;
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
        test('renders company data correctly', () => {
            const pola = new Pola();
            const json = {
                code: '5900000000008',
                companies: [{
                    name: 'Firma Testowa',
                    plScore: 75,
                    plCapital: 100,
                    plWorkers: 100,
                    plRnD: 100,
                    plRegistered: 100,
                    plNotGlobEnt: 100,
                    description: 'Opis firmy testowej'
                }]
            };

            pola.setResult(json);

            expect(document.getElementById('result').style.display).toBe('block');
            expect(document.getElementById('result-name').textContent).toBe('Firma Testowa');
            expect(document.getElementById('result-points-bar').style.width).toBe('75%');
            expect(document.getElementById('result-points-text').textContent).toBe('75 pkt.');
            expect(document.getElementById('result-assets-bar').style.width).toBe('100%');
            expect(document.getElementById('result-assets-text').textContent).toBe('100%');
            expect(document.getElementById('result-description').textContent).toBe('Opis firmy testowej');
        });

        test('renders checkboxes correctly when all values are 100', () => {
            const pola = new Pola();
            const json = {
                companies: [{
                    name: 'Test',
                    plScore: 50,
                    plCapital: 50,
                    plWorkers: 100,
                    plRnD: 100,
                    plRegistered: 100,
                    plNotGlobEnt: 100,
                    description: ''
                }]
            };

            pola.setResult(json);

            expect(document.getElementById('result-checkbox-production').checked).toBe(true);
            expect(document.getElementById('result-checkbox-rnd').checked).toBe(true);
            expect(document.getElementById('result-checkbox-registered').checked).toBe(true);
            expect(document.getElementById('result-checkbox-corp').checked).toBe(true);
        });

        test('shows "?" for null values', () => {
            const pola = new Pola();
            const json = {
                companies: [{
                    name: 'Test',
                    plScore: null,
                    plCapital: null,
                    plWorkers: null,
                    plRnD: null,
                    plRegistered: null,
                    plNotGlobEnt: null,
                    description: ''
                }]
            };

            pola.setResult(json);

            expect(document.getElementById('result-points-text').textContent).toBe('?');
            expect(document.getElementById('result-assets-text').textContent).toBe('?');
            expect(document.getElementById('result-checkbox-production').className).toBe('question');
            expect(document.getElementById('result-checkbox-rnd').className).toBe('question');
            expect(document.getElementById('result-checkbox-registered').className).toBe('question');
            expect(document.getElementById('result-checkbox-corp').className).toBe('question');
        });

        test('handles missing company (no companies array)', () => {
            const pola = new Pola();
            const json = {
                name: 'Produkt bez firmy',
                altText: 'Nie znaleziono informacji'
            };

            pola.setResult(json);

            expect(document.getElementById('result-name').textContent).toBe('Produkt bez firmy');
            expect(document.getElementById('result-points-text').textContent).toBe('?');
            expect(document.getElementById('result-assets-text').textContent).toBe('?');
            expect(document.getElementById('result-description').textContent).toBe('Nie znaleziono informacji');
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
