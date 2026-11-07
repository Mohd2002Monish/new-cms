let AsyncStorage;
try {
  AsyncStorage = require('@react-native-async-storage/async-storage').default;
} catch (_) {
  AsyncStorage = null;
}

const memoryStore = new Map();

export const storage = {
  async getItem(key) {
    try {
      if (AsyncStorage) {
        return await AsyncStorage.getItem(key);
      }
      return memoryStore.get(key) || null;
    } catch (e) {
      return memoryStore.get(key) || null;
    }
  },

  async setItem(key, value) {
    try {
      memoryStore.set(key, value);
      if (AsyncStorage) {
        await AsyncStorage.setItem(key, value);
      }
    } catch (e) {
      // Memory store is already updated
    }
  },

  async removeItem(key) {
    try {
      memoryStore.delete(key);
      if (AsyncStorage) {
        await AsyncStorage.removeItem(key);
      }
    } catch (e) {
      // Memory store is already updated
    }
  },

  async clear() {
    try {
      memoryStore.clear();
      if (AsyncStorage) {
        await AsyncStorage.clear();
      }
    } catch (e) {
      // Memory store is already cleared
    }
  },
};

export default storage;

