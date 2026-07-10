{
    let domain = document.location.hostname || '';
    let result = null;
    let exceptions = {
        'www.neo24.pl': ['meta[property="og:image"][content]', 'content', /^.*\/(\d{13}|\d{8})..\.[a-z]{3,4}$/i],
        'www.neonet.pl': ['meta[property="og:image"][content]', 'content', /^.*\/(\d{13}|\d{8})..\.[a-z]{3,4}$/i],
        'www.megamarket24.pl': ['meta[property="og:url"][content]', 'content', /^.*\-(\d{13}|\d{8})\.html(?:\?.*)?$/i],
        'aptekasowa.pl': ['meta[property="og:url"][content]', 'content', /^.*\-(\d{13}|\d{8})\.html(?:\?.*)?$/i],
        'yesorganic.pl': ['meta[property="og:url"][content]', 'content', /^.*\-(\d{13}|\d{8})\.html(?:\?.*)?$/i],
        'biomarketcompany.pl': ['meta[property="og:url"][content]', 'content', /^.*\-(\d{13}|\d{8})\.html(?:\?.*)?$/i],
        'www.tvokazje.pl': ['meta[property="og:url"][content]', 'content', /^.*\-(\d{13}|\d{8})\.html(?:\?.*)?$/i],
        'sklepdietetyczny.pl': ['link[rel="canonical"][href]', 'href', /^.*\-(\d{13}|\d{8})\.html$/i],
        'lisek.app': ['link[rel="canonical"][href]', 'href', /^.*\/(\d{13}|\d{8})$/i],
        'studencik.com.pl': ['meta[itemprop="url"][content]', 'content', /^.*\-(\d{13}|\d{8})\.html$/i],
        'polskikoszyk.pl': ['img[class="product-main-thumb"][src]', 'src', /^.*\/(\d{13}|\d{8})\.[a-z]{3,4}$/i],
        'www.leclerc24.pl': ['#productWindow .item-image img[src]', 'src', /^.*\/(\d{13}|\d{8}).*$/i],
        'www.douglas.pl': ['img[id^="addProductToBasketLink_"]', 'id', /^addProductToBasketLink_(\d{13}|\d{8})$/i]
    };
    let exceptions2 = {
        'ezakupy.tesco.pl': [/"gs1:gtin":"(\d{13}|\d{8})(?=")/, document.head],
        'www.electro-outlet.pl': [/"code_extern":"(\d{13}|\d{8})(?=")/, document.body],
        'pyszneeko.pl': [/"code_extern":"(\d{13}|\d{8})(?=")/, document.body],
        'sliv.com.pl': [/"code_producer":"(\d{13}|\d{8})(?=")/, document.body]
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
    if (exceptions2.hasOwnProperty(domain)) {
        let e = exceptions2[domain];
        let tmp = e[0].exec(e[1].innerHTML);
        if (tmp !== null) {
            result = [tmp[1]];
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