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

    const msgId = Math.random().toString(36).substring(7);
    const msg = JSON.parse(message);

    registerCallback(msgId, sendResponse);
    port.postMessage({
      id: msgId,
      cmd: msg.cmd,
      args: msg.args,
    });

    return true;
  }
);
