const port = chrome.runtime.connectNative('com.google.chrome.nubox');

let callbacks = {};
const registerCallback = (id, callback) => {
  callbacks[id] = callback;
};

port.onMessage.addListener((response) => {
  if (response.id !== undefined &&
      callbacks[response.id] !== undefined) {
    callbacks[response.id]({
      type: 'success',
    });

    delete callbacks[response.id];
  }
});

chrome.runtime.onMessageExternal.addListener(
  (message, sender, sendResponse) => {
    if (message === 'version') {
      const manifest = chrome.runtime.getManifest();
      sendResponse({
        type: 'success',
        version: manifest.version
      });
      return true;
    } else if (message === 'host') {
      registerCallback('hello', sendResponse);
      port.postMessage({
        id: 'hello',
        cmd: 'more',
      });
      return true;
    }
  }
);
