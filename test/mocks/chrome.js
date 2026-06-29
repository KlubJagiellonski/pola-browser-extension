function createChromeMock() {
    const storage = {};

    const chrome = {
        runtime: {
            lastError: null,
            onMessage: {
                addListener: jest.fn(),
                removeListener: jest.fn(),
            },
            sendMessage: jest.fn(),
        },
        tabs: {
            query: jest.fn((queryInfo, callback) => {
                callback([{ id: 1, url: 'https://example.com' }]);
            }),
        },
        scripting: {
            executeScript: jest.fn((details, callback) => {
                if (callback) callback();
            }),
        },
        storage: {
            local: {
                get: jest.fn((key, callback) => {
                    if (typeof key === 'string') {
                        callback(storage[key] !== undefined ? { [key]: storage[key] } : {});
                    } else {
                        callback(storage);
                    }
                }),
                set: jest.fn((items, callback) => {
                    Object.assign(storage, items);
                    if (callback) callback();
                }),
                remove: jest.fn((keys, callback) => {
                    for (const key of (Array.isArray(keys) ? keys : [keys])) {
                        delete storage[key];
                    }
                    if (callback) callback();
                }),
            },
        },
    };

    return chrome;
}

module.exports = { createChromeMock };
