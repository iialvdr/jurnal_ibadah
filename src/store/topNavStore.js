// src/store/topNavStore.js
export const topNavStore = (() => {
    let state = {
        leftNode: null,
        titleNode: null,
        rightNode: null,
        extraNode: null,
        className: '',
        hide: false,
    };
    const listeners = new Set();
    
    return {
        getState: () => state,
        setState: (newState) => {
            state = { ...state, ...newState };
            listeners.forEach(listener => listener());
        },
        subscribe: (listener) => {
            listeners.add(listener);
            return () => listeners.delete(listener);
        }
    };
})();
