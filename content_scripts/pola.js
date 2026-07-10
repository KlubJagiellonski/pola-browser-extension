{
    let domain = document.location.hostname || '';
    let result = null;
    let exceptions = {
        'lisek.app': ['link[rel="canonical"][href]', 'href', /^.*\/(\d{13}|\d{8})$/i],
    };
    if (exceptions.hasOwnProperty(domain)) {
        let e = exceptions[domain];
        let tmp = document.querySelector(e[0]);
        if (tmp !== null) {
            tmp = tmp.getAttribute(e[1]).replace(e[2], '$1');
            if (validateEAN(tmp)) {
                result = [tmp];
            }
        }
    }

    if (result === null) {
        let text = document.body.innerHTML;
        text = text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ');
        text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ');
        text = text.replace(/<[^>]+>/gi, ' ');
        // Granice (?<!\d)/(?!\d) wykluczają fragmenty dłuższych ciągów cyfr,
        // np. 13-cyfrowy prefiks 14-cyfrowego kodu wewnętrznego sklepu.
        result = text.match(/(?<!\d)(?:\d{13}|\d{8})(?!\d)/g);
        let gtin13 = document.querySelectorAll('meta[itemprop="gtin13"][content]');
        let gtin8 = document.querySelectorAll('meta[itemprop="gtin8"][content]');
        let flix = document.querySelectorAll('script[data-flix-ean]');
        if (result === null && (gtin13.length > 0 || gtin8.length > 0 || flix.length > 0)) {
            result = [];
        }
        for (let elem of gtin13) {
            result.push(elem.getAttribute('content'));
        }
        for (let elem of gtin8) {
            result.push(elem.getAttribute('content'));
        }
        for (let elem of flix) {
            result.push(elem.getAttribute('data-flix-ean'));
        }
        // Kody w danych strukturalnych schema.org (JSON-LD) — generyczny skan
        // ich nie widzi, bo usuwa wszystkie bloki <script>.
        let ldjson = document.querySelectorAll('script[type="application/ld+json"]');
        for (let elem of ldjson) {
            for (let m of elem.textContent.matchAll(/"gtin(?:13|8)?"\s*:\s*"(\d{13}|\d{8})(?=")/g)) {
                if (result === null) {
                    result = [];
                }
                result.push(m[1]);
            }
        }
    }
    if (result !== null) {
        result = result.filter((v, i, a) => a.indexOf(v) === i);
        result = result.filter(validateEAN);
        // Krótkie kody wewnętrzne sklepów bywają błędnie łapane jako EAN-8;
        // jeśli obok nich jest dokładnie jeden EAN-13, uznaj go za właściwy kod.
        if (result.length > 1) {
            let ean13 = result.filter((v) => v.length === 13);
            if (ean13.length === 1) {
                result = ean13;
            }
        }
    }
    if (result !== null && result.length === 1) {
        chrome.runtime.sendMessage({
            type: 'ean',
            result: result[0]
        });
    } else if (result !== null && result.length > 1) {
        chrome.runtime.sendMessage({
            type: 'multiple',
            result: result
        });
    } else {
        chrome.runtime.sendMessage({
            type: 'null'
        });
    }
}