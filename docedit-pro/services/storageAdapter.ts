export const StorageAdapter = {
  saveSetting: (key: string, value: string): void => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(`docedit_${key}`, value);
      }
    } catch (error) {
      console.error('Failed to save to local storage', error);
    }
  },

  getSetting: (key: string): string | null => {
    try {
      if (typeof window !== 'undefined') {
        return localStorage.getItem(`docedit_${key}`);
      }
    } catch (error) {
      console.error('Failed to read from local storage', error);
    }
    return null;
  }
};