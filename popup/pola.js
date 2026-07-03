{
    class Pola {
        constructor() {
            this.fullDescription = '';
            this.descriptionExpanded = false;
            const toggle = document.getElementById('result-description-toggle');
            if (toggle) {
                toggle.addEventListener('click', this.toggleDescription.bind(this));
            }
            const logoImg = document.getElementById('result-logo-img');
            if (logoImg) {
                logoImg.addEventListener('error', () => {
                    document.getElementById('result-logo-link').hidden = true;
                });
            }
            this.setLoading();
            chrome.runtime.onMessage.addListener(this.notify.bind(this));
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                const tabId = tabs && tabs[0] ? tabs[0].id : null;

                if (!tabId) {

                    this.setNull();

                    return;

                }
                chrome.scripting.executeScript({

                    target: { tabId },

                    files: ['lib/validateEAN.js', 'content_scripts/pola.js']

                }, () => {

                    if (chrome.runtime.lastError) {

                        this.setError();

                    }

                });

            });
        }
        hideAll() {
            document.getElementById('loading').style.display = 'none';
            document.getElementById('null').style.display = 'none';
            document.getElementById('result').style.display = 'none';
            document.getElementById('multiple').style.display = 'none';
            document.getElementById('error').style.display = 'none';
        }
        setNull() {
            this.hideAll();
            document.getElementById('null').style.display = 'block';
        }
        setLoading() {
            this.hideAll();
            document.getElementById('loading').style.display = 'block';
        }
        setError() {
            this.hideAll();
            document.getElementById('error').style.display = 'block';
        }
        setMultiple(eans) {
            this.hideAll();
            document.getElementById('multiple').style.display = 'block';
            let ul = document.getElementById('multiple-ul');
            while (ul.lastChild) {
                ul.removeChild(ul.lastChild);
            }
            for (let ean of eans) {
                let li = document.createElement('li');
                let button = document.createElement('button');
                let t = document.createTextNode(ean);
                button.appendChild(t);
                button.addEventListener('click', this.setEan.bind(this, ean));
                li.appendChild(button);
                ul.appendChild(li);
            }
        }
        isRealUrl(url) {
            if (!url) {
                return false;
            }
            const u = url.toLowerCase();
            return !u.includes('example.pl') && !u.includes('example.com');
        }
        restartAnimation(el) {
            el.classList.remove('animate');
            void el.offsetWidth;
            el.classList.add('animate');
        }
        setCriterion(id, value) {
            const el = document.getElementById(id);
            el.classList.toggle('met', value === 100);
            if (value === null || value === undefined) {
                el.dataset.state = 'unknown';
                el.title = 'brak danych';
            } else {
                delete el.dataset.state;
                el.removeAttribute('title');
            }
        }
        setScore(plScore) {
            const value = document.getElementById('result-score-value');
            const fill = document.getElementById('result-score-fill');
            const placeholder = document.getElementById('result-score-placeholder');
            if (plScore === null || plScore === undefined) {
                value.textContent = '-';
                fill.style.width = '0%';
                fill.classList.remove('animate');
                placeholder.hidden = false;
            } else {
                value.textContent = plScore.toString();
                fill.style.width = plScore.toString() + '%';
                placeholder.hidden = true;
                this.restartAnimation(fill);
            }
        }
        setGauge(plCapital) {
            const label = document.getElementById('result-gauge-label');
            const path = document.getElementById('result-gauge-value-path');
            const arcLength = 254.469;
            if (plCapital === null || plCapital === undefined) {
                label.textContent = '—';
                path.style.strokeDashoffset = arcLength.toString();
                path.classList.remove('animate');
            } else {
                label.textContent = plCapital.toString() + ' %';
                path.style.strokeDashoffset = ((1 - plCapital / 100) * arcLength).toString();
                this.restartAnimation(path);
            }
        }
        renderDescription(text) {
            this.fullDescription = text || '';
            this.descriptionExpanded = false;
            this.updateDescription();
        }
        toggleDescription() {
            this.descriptionExpanded = !this.descriptionExpanded;
            this.updateDescription();
        }
        updateDescription() {
            const textEl = document.getElementById('result-description-text');
            const toggle = document.getElementById('result-description-toggle');
            const text = this.fullDescription;
            if (text.length > 150) {
                toggle.hidden = false;
                if (this.descriptionExpanded) {
                    textEl.textContent = text;
                    toggle.textContent = 'Pokaż mniej';
                } else {
                    textEl.textContent = text.slice(0, 150).trimEnd() + '…';
                    toggle.textContent = 'Czytaj więcej';
                }
            } else {
                textEl.textContent = text;
                toggle.hidden = true;
            }
        }
        renderLogo(company) {
            const link = document.getElementById('result-logo-link');
            const img = document.getElementById('result-logo-img');
            if (!company || !company.logotype_url) {
                link.hidden = true;
                img.removeAttribute('src');
                return;
            }
            link.hidden = false;
            if (this.isRealUrl(company.official_url)) {
                link.href = company.official_url;
            } else {
                link.removeAttribute('href');
            }
            img.src = company.logotype_url;
            img.alt = company.name || '';
        }
        renderBrands(company) {
            const section = document.getElementById('result-brands-section');
            const grid = document.getElementById('result-brands-grid');
            while (grid.lastChild) {
                grid.removeChild(grid.lastChild);
            }
            const brands = (company && company.brands || []).filter(b => b.logotype_url);
            if (brands.length === 0) {
                section.hidden = true;
                return;
            }
            section.hidden = false;
            for (const brand of brands) {
                const tile = document.createElement('div');
                tile.className = 'brand-tile';
                const img = document.createElement('img');
                img.src = brand.logotype_url;
                img.alt = brand.name || '';
                img.addEventListener('error', () => tile.remove());
                if (this.isRealUrl(brand.website_url)) {
                    const a = document.createElement('a');
                    a.href = brand.website_url;
                    a.target = '_blank';
                    a.rel = 'noopener noreferrer';
                    a.appendChild(img);
                    tile.appendChild(a);
                } else {
                    tile.appendChild(img);
                }
                grid.appendChild(tile);
            }
        }
        setResult(json) {
            this.hideAll();
            document.getElementById('result').style.display = 'block';

            const code = String(json.code || '');
            document.getElementById('result-russia-box').hidden = !(code.startsWith('46') || code.startsWith('481'));

            let company = json.companies && json.companies.length > 0 ? json.companies[0] : null;
            if (!company) {
                document.getElementById('result-name').textContent = json.name || 'Nieznany produkt';
                document.getElementById('result-friend-banner').hidden = true;
                this.setScore(null);
                this.setGauge(null);
                this.setCriterion('result-criterion-production', null);
                this.setCriterion('result-criterion-rnd', null);
                this.setCriterion('result-criterion-registered', null);
                this.setCriterion('result-criterion-corp', null);
                this.renderDescription(json.altText || '');
                this.renderLogo(null);
                this.renderBrands(null);
                return;
            }

            document.getElementById('result-name').textContent = company.name;
            document.getElementById('result-friend-banner').hidden = !company.is_friend;
            this.setScore(company.plScore);
            this.setGauge(company.plCapital);
            this.setCriterion('result-criterion-production', company.plWorkers);
            this.setCriterion('result-criterion-rnd', company.plRnD);
            this.setCriterion('result-criterion-registered', company.plRegistered);
            this.setCriterion('result-criterion-corp', company.plNotGlobEnt);
            this.renderDescription(company.description || json.altText || '');
            this.renderLogo(company);
            this.renderBrands(company);
        }
        setCache(text) {
            try {
                let json = JSON.parse(text);
                chrome.storage.local.set({[json.code]: text});
                this.setResult(json);
            } catch (e) {
                this.setError();
            }
        }
        getCache(ean) {
            chrome.storage.local.get('lastClear', result => {
                if (!chrome.runtime.lastError) {
                    if (result.hasOwnProperty(('lastClear'))) {
                        if (result.lastClear < Date.now() - 86400000) {
                            chrome.storage.local.get(null, result => {
                                if (!chrome.runtime.lastError) {
                                    let toDelete = [];
                                    for (let elem of Object.getOwnPropertyNames(result)) {
                                        if ((elem.length === 13 || elem.length === 8) && !isNaN(elem)) {
                                            toDelete.push(elem);
                                        }
                                    }
                                    chrome.storage.local.remove(toDelete);
                                    chrome.storage.local.set({lastClear: Date.now()});
                                }
                            });
                        }
                    } else {
                        chrome.storage.local.set({lastClear: Date.now()});
                    }
                }
            });
            chrome.storage.local.get(ean, text => {
                if (chrome.runtime.lastError) {
                    this.fetchFromApi(ean);
                } else if (text.hasOwnProperty(ean)) {
                    this.setResult(JSON.parse(text[ean]));
                } else {
                    this.fetchFromApi(ean);
                }
            });
        }
        setEan(ean) {
            this.setLoading();
            this.getCache(ean);
        }
        fetchFromApi(ean) {
            fetch('https://www.pola-app.pl/a/v4/get_by_code?code=' + encodeURIComponent(ean) + '&device_id=we', {
                referrer: 'no-referrer',
                referrerPolicy: 'no-referrer'
            }).then(response => {
                if (response.ok) {
                    return response.text();
                }
                throw new Error('API error: ' + response.status);
            }).then(text => {
                this.setCache(text);
            }).catch(() => {
                this.setError();
            });
        }
        notify(message) {
            switch (message.type) {
                case 'multiple':
                    this.setMultiple(message.result);
                    break;
                case 'ean':
                    this.setEan(message.result);
                    break;
                case 'null':
                default:
                    this.setNull();
            }
        }
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { Pola };
    } else {
        new Pola();
    }
}