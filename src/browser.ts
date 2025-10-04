declare const browser: typeof chrome;

const browserAPI = typeof chrome !== 'undefined' ? chrome : browser;
export default browserAPI;
