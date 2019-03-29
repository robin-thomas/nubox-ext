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

const grant = (msgId, args, sender) => {
  // open up the grant popup which asks for user permission.
  const popup = window.open('grant.html', 'extension_popup',
    `width=340,
     height=675,
     top=25,
     left=25,
     toolbar=no,
     location=no,
     status=yes,
     scrollbars=no,
     resizable=no,
     status=no,
     menubar=no,
     directories=no`);

  popup.addEventListener('load', (e) => {
    popup.$('#nubox-grant-bek').val(args[1]);
    popup.$('#nubox-grant-bvk').val(args[2]);
    popup.$('#nubox-grant-exp').val(args[3]);
    popup.$('#card-nubox-url').html(sender.url);
    popup.$('#card-nubox-label').html(args[0]);

    popup.$('#nubox-grant-cancel').on('click', (e) => {
      // If the user rejects it, send back the failure message.
      callbacks[msgId]({
        type: 'failure',
        result: 'User has rejected the grant approval',
      });
      popup.close();
    });
    popup.$('#nubox-grant-confirm').on('click', (e) => {
      // If the user approves, send it to the native host for approval.
      port.postMessage({
        id: msgId,
        cmd: 'grant',
        args: args,
      });
      popup.close();
    });
  }, false);
};

// From the nuBox content/popup script.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log(message);

  const msgId = Math.random().toString(36).substring(7);

  registerCallback(msgId, sendResponse);

  // Read a block of data from a local file,
  // encrypt it using nucypher and return it back.
  // TODO: give option to enable upload it to IPFS too.
  if (message.cmd === 'readBlock') {
    readBlock(message.args.file, message.args.path, message.args.offset, message.args.blockSize);
  } else if (message.cmd === 'grant') {
    grant(msgId, message.args, sender);
  } else {
    port.postMessage({
      id: msgId,
      cmd: message.cmd,
      args: message.args,
    });
  }

  return true;
});
