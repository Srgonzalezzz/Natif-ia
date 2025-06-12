
const memoryStore = new Map();

const stateStore = {
    async get(key) {
        return memoryStore.get(key) || {};
    },

    async set(key, value) {
        memoryStore.set(key, value);
    },

    async delete(key) {
        memoryStore.delete(key);
    },

    async has(key) {
        return memoryStore.has(key);
    },

    async updateTimeout(key, timeout) {
        const current = memoryStore.get(key) || {};
        memoryStore.set(key, { ...current, timeout });
    }
};

export default stateStore;