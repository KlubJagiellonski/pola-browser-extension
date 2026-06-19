{
    class Pola {
        constructor() {
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

                    files: ['content_scripts/pola.js']

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

                const checkboxIds = [
                    'result-checkbox-production',
                    'result-checkbox-rnd',
                    'result-checkbox-registered',
                    'result-checkbox-corp'
                ];
                for (const id of checkboxIds) {
                    const el = document.getElementById(id);
                    el.checked = false;
                    el.className = 'question';
                }

        }
        setResult(json) {
            this.hideAll();
            }
            document.getElementById('result').style.display = 'block';

            let company = json.companies && json.companies.length > 0 ? json.companies[0] : null;
            if (!company) {
                document.getElementById('result-name').textContent = json.name || 'Nieznany produkt';
                document.getElementById('result-points-bar').style.width = '0%';
                document.getElementById('result-points-text').textContent = '?';
                document.getElementById('result-assets-bar').style.width = '0%';
                document.getElementById('result-assets-text').textContent = '?';
                document.getElementById('result-description').textContent = json.altText || '';
                return;
            }

            let plScore = company.plScore || 0;
            let plCapital = company.plCapital || 0;

            document.getElementById('result-name').textContent = company.name;
            document.getElementById('result-points-bar').style.width = plScore.toString() + '%';
            document.getElementById('result-points-text').textContent = (company.plScore === null ? '?' : plScore.toString() + ' pkt.');
            document.getElementById('result-assets-bar').style.width = plCapital.toString() + '%';
            document.getElementById('result-assets-text').textContent = (company.plCapital === null ? '?' : plCapital.toString() + '%');
            document.getElementById('result-checkbox-production').checked = (company.plWorkers === 100);
            if (company.plWorkers === null) {
                document.getElementById('result-checkbox-production').className = 'question';
            }
            document.getElementById('result-checkbox-rnd').checked = (company.plRnD === 100);
            if (company.plRnD === null) {
                document.getElementById('result-checkbox-rnd').className = 'question';
            }
            document.getElementById('result-checkbox-registered').checked = (company.plRegistered === 100);
            if (company.plRegistered === null) {
                document.getElementById('result-checkbox-registered').className = 'question';
            }
            document.getElementById('result-checkbox-corp').checked = (company.plNotGlobEnt === 100);
            if (company.plNotGlobEnt === null) {
                document.getElementById('result-checkbox-corp').className = 'question';
            }
            document.getElementById('result-description').textContent = company.description || json.altText || '';
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

    new Pola();
}