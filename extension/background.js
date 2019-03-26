const port = chrome.runtime.connectNative('com.google.chrome.nubox');

let callbacks = {};
const registerCallback = (id, callback) => {
  callbacks[id] = callback;
};

port.onMessage.addListener((response) => {
  console.log(response);

  if (response.id !== undefined &&
      callbacks[response.id] !== undefined) {
    callbacks[response.id]({
      type: response.type,
      result: response.result,
    });

    delete callbacks[response.id];
  }
});

chrome.runtime.onMessageExternal.addListener(
  (message, sender, sendResponse) => {
    console.log(message);

    switch (message) {
      case 'isHostRunning':
        const msgId = Math.random().toString(36).substring(7);

        registerCallback(msgId, sendResponse);
        port.postMessage({
          id: msgId,
          cmd: message,
        });

        return true;
    }
  }
);
