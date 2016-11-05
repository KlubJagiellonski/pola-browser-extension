{
    class Pola {
        constructor() {
            this.setLoading();
            window.chrome.runtime.onMessage.addListener(this.notify.bind(this));
            window.chrome.tabs.executeScript(null, {
                file: '/content_scripts/pola.js',
                runAt: 'document_end'
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
        setResult(json) {
            let plScore = json.plScore || 0;
            let plCapital = json.plCapital || 0;
            this.hideAll();
            document.getElementById('result').style.display = 'block';
            document.getElementById('result-name').textContent = json.name;
            document.getElementById('result-points-bar').style.width = plScore.toString() + '%';
            document.getElementById('result-points-text').textContent = (json.plScore === null ? '?' : plScore.toString() + ' pkt.');
            document.getElementById('result-assets-bar').style.width = plCapital.toString() + '%';
            document.getElementById('result-assets-text').textContent = (json.plCapital === null ? '?' : plCapital.toString() + '%');
            document.getElementById('result-checkbox-production').checked = (json.plWorkers === 100);
            if (json.plWorkers === null) {
                document.getElementById('result-checkbox-production').className = 'question';
            }
            document.getElementById('result-checkbox-rnd').checked = (json.plRnD === 100);
            if (json.plRnD === null) {
                document.getElementById('result-checkbox-rnd').className = 'question';
            }
            document.getElementById('result-checkbox-registered').checked = (json.plRegistered === 100);
            if (json.plRegistered === null) {
                document.getElementById('result-checkbox-registered').className = 'question';
            }
            document.getElementById('result-checkbox-corp').checked = (json.plNotGlobEnt === 100);
            if (json.plNotGlobEnt === null) {
                document.getElementById('result-checkbox-corp').className = 'question';
            }
            document.getElementById('result-description').textContent = json.description || json.altText || '';
        }
        setCache(text) {
            try {
                let json = window.JSON.parse(text);
                window.chrome.storage.local.set({[json.code]: text});
                this.setResult(json);
            } catch (e) {
                this.setError();
            }
        }
        getCache(ean) {
            window.chrome.storage.local.get('lastClear', result => {
                if (!window.chrome.runtime.lastError) {
                    if (result.hasOwnProperty(('lastClear'))) {
                        if (result.lastClear < window.Date.now() - 86400) {
                            window.chrome.storage.local.get(null, result => {
                                if (!window.chrome.runtime.lastError) {
                                    let toDelete = [];
                                    for (let elem of window.Object.getOwnPropertyNames(result)) {
                                        if ((elem.length === 13 || elem.length === 8) && !isNaN(elem)) {
                                            toDelete.push(elem);
                                        }
                                    }
                                    window.chrome.storage.local.remove(toDelete);
                                    window.chrome.storage.local.set({lastClear: window.Date.now()});
                                }
                            });
                        }
                    } else {
                        window.chrome.storage.local.set({lastClear: window.Date.now()});
                    }
                }
            });
            window.chrome.storage.local.get(ean, text => {
                if (window.chrome.runtime.lastError) {
                    this.setEan2(ean);
                } else if (text.hasOwnProperty(ean)) {
                    this.setResult(window.JSON.parse(text[ean]));
                } else {
                    this.setEan2(ean);
                }
            });
        }
        setEan(ean) {
            this.setLoading();
            this.getCache(ean);
        }
        setEan2(ean) {
            if (window.navigator.userAgent.indexOf('Edge') !== -1) {
                let req = new window.XMLHttpRequest();
                req.open('GET', 'https://www.pola-app.pl/a/v2/get_by_code?code=' + ean + '&device_id=we', false);
                req.send(null);
                if (req.status === 200) {
                    this.setCache(req.responseText);
                } else {
                    this.setError();
                }
            } else {
                window.fetch('https://www.pola-app.pl/a/v2/get_by_code?code=' + ean + '&device_id=we', {
                    referrer: 'no-referrer',
                    referrerPolicy: 'no-referrer'
                }).then(response => {
                    if (response.status === 200) {
                        return response.text();
                    }
                    throw new window.Error('err');
                }).then(text => {
                    this.setCache(text);
                }).catch(() => {
                    this.setError();
                });
            }
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