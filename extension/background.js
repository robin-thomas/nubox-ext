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

chrome.declarativeContent.onPageChanged.removeRules(undefined, function() {
  chrome.declarativeContent.onPageChanged.addRules([{
    conditions: [new chrome.declarativeContent.PageStateMatcher({
      pageUrl: {urlMatches: '(localhost:4000)|nubox.herokuapp.com'},
    })],
    actions: [new chrome.declarativeContent.ShowPageAction()]
  }]);
});

const readBlock = (file, path, offset, blockSize) => {
  const blob = file.slice(offset, blockSize + offset);

  const r = new FileReader();
  r.onload = function(e) {
    const block = r.result;
    const blockB64 = Buffer.from(block).toString('base64');

    const label = path;

    // Encrypt it using host protocol.
    port.postMessage({
      id: msgId,
      cmd: 'encrypt',
      args: [blockB64, label],
    });
  };

  r.readAsArrayBuffer(blob);
};

chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  console.log(message);

  const msg = JSON.parse(message);

  const msgId = Math.random().toString(36).substring(7);
  registerCallback(msgId, sendResponse);

  if (msg.cmd === 'readBlock') {
    readBlock(msg.args.file, msg.args.path, msg.args.offset, msg.args.blockSize);
  } else {
    port.postMessage({
      id: msgId,
      cmd: msg.cmd,
      args: msg.args,
    });
  }

  return true;
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log(message);

  const msgId = Math.random().toString(36).substring(7);

  registerCallback(msgId, sendResponse);
  port.postMessage({
    id: msgId,
    cmd: message.cmd,
    args: message.args,
  });

  return true;
});
