{
    let validateEAN = function (elem) {
        if (isNaN(elem)) {
            return false;
        }
        let sum = 0;
        if (elem.length === 8) {
            sum = (parseInt(elem[0], 10) + parseInt(elem[2], 10)
                    + parseInt(elem[4], 10) + parseInt(elem[6], 10))
                    * 3
                    + parseInt(elem[1], 10)
                    + parseInt(elem[3], 10)
                    + parseInt(elem[5], 10);
        } else {
            sum = (parseInt(elem[1], 10) + parseInt(elem[3], 10)
                    + parseInt(elem[5], 10) + parseInt(elem[7], 10)
                    + parseInt(elem[9], 10) + parseInt(elem[11], 10))
                    * 3
                    + parseInt(elem[0], 10)
                    + parseInt(elem[2], 10)
                    + parseInt(elem[4], 10)
                    + parseInt(elem[6], 10)
                    + parseInt(elem[8], 10) + parseInt(elem[10], 10);
        }
        let num = (10 - (sum % 10)) % 10;
        return num === parseInt(elem[elem.length - 1], 10);
    };
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
        result = text.match(/\d{13}|\d{8}/g);
        let gtin13 = document.querySelectorAll('meta[itemprop="gtin13"][content]');
        let gtin8 = document.querySelectorAll('meta[itemprop="gtin8"][content]');
        let flix = document.querySelectorAll('script[data-flix-ean]');
        if (result === null && (gtin13.length > 0 || gtin8.length > 0 || flix.length > 0)) {
            result = [];
        }
        if (window.navigator.userAgent.indexOf('Edge') !== -1) {
            for (let i = 0; i < gtin13.length; i++) {
                result.push(gtin13[i].getAttribute('content'));
            }
            for (let i = 0; i < gtin8.length; i++) {
                result.push(gtin8[i].getAttribute('content'));
            }
            for (let i = 0; i < flix.length; i++) {
                result.push(flix[i].getAttribute('data-flix-ean'));
            }
        } else {
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
    }
    if (result !== null) {
        result = result.filter((v, i, a) => a.indexOf(v) === i);
        result = result.filter(validateEAN);
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