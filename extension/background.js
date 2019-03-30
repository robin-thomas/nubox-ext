const port = chrome.runtime.connectNative('com.google.chrome.nubox');

// to keep track of encrypted returns from nucypher
// (for uploads to ipfs).
let ipfsEncrypts = {};

let callbacks = {};
const registerCallback = (id, callback) => {
  callbacks[id] = callback;
};

port.onMessage.addListener((response) => {
  console.log(response);

  if (response.id !== undefined &&
      callbacks[response.id] !== undefined) {

    const msgId = response.id;

    // Check whether its an encrypt request.
    if (ipfsEncrypts[msgId] !== undefined &&
        response.type === 'success') {
      // delete it from the request.
      delete ipfsEncrypts[msgId];

      // Upload it to IPFS.
      const ipfs = IpfsHttpClient('ipfs.infura.io', '5001', { protocol: 'https' });
      const content = IpfsHttpClient.Buffer.from(response.result);

      ipfs.add(content).then((results) => {
        callbacks[response.id]({
          type: 'success',
          result: results[0].hash,
        });

        delete callbacks[response.id];
      }).catch((err) => {
        callbacks[response.id]({
          type: 'failure',
          result: err.message,
        });

        delete callbacks[response.id];
      });

    } else {
      callbacks[response.id]({
        type: response.type,
        result: response.result,
      });

      delete callbacks[response.id];
    }
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

const readBlock = (msgId, blob, path, ipfsUpload) => {
  const xhr = new XMLHttpRequest();
  xhr.open('GET', blob, true);
  xhr.responseType = 'blob';
  xhr.onload = function(e) {
    if (this.status == 200) {
      const blobContent = this.response;

      const r = new FileReader();
      r.onload = function(e) {
        const label = IpfsHttpClient.Buffer.from(path).toString('hex');
        const blockB64 = IpfsHttpClient.Buffer.from(r.result).toString('base64');

        // Encrypt it using host protocol.
        if (ipfsUpload) {
          ipfsEncrypts[msgId] = msgId;
        }
        port.postMessage({
          id: msgId,
          cmd: 'encrypt',
          args: [blockB64, label],
        });
      };

      r.readAsArrayBuffer(blobContent);
    }
  };
  xhr.send();
};

const grant = (msgId, args, sender) => {
  // Validate user input.
  if (!(moment(args[3], 'YYYY-MM-DD HH:mm:ss', true).isValid())) {
    callbacks[msgId]({
      type: 'failure',
      result: 'Invalid expiration date string (not ISO 8601)',
    });
    return;
  }
  if (moment().isAfter(args[3])) {
    callbacks[msgId]({
      type: 'failure',
      result: 'Expiration date string is in the past',
    });
    return;
  }
  args[3] = moment(args[3]).format('YYYY-MM-DDTHH:mm:ss') + '.445418Z';

  // open up the grant popup which asks for user permission.
  const popup = window.open('grant.html', 'extension_popup',
    `width=340,
     height=705,
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
        result: 'User has rejected the grant request',
      });
      popup.close();
    });
    popup.$('#nubox-grant-confirm').on('click', (e) => {
      // If the user approves, send it to the native host for approval.
      args[0] = IpfsHttpClient.Buffer.from(args[0]).toString('hex');

      port.postMessage({
        id: msgId,
        cmd: 'grant',
        args: args,
      });

      popup.close();
    });
  }, false);
};

const revoke = (msgId, args, sender) => {
  // open up the grant popup which asks for user permission.
  const popup = window.open('revoke.html', 'extension_popup',
    `width=315,
     height=455,
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
    popup.$('#card-nubox-url').html(sender.url);
    popup.$('#card-nubox-label').html(args[0]);

    popup.$('#nubox-grant-cancel').on('click', (e) => {
      // If the user rejects it, send back the failure message.
      callbacks[msgId]({
        type: 'failure',
        result: 'User has rejected the revoke request',
      });
      popup.close();
    });
    popup.$('#nubox-grant-confirm').on('click', (e) => {
      // If the user approves, send it to the native host for approval.
      port.postMessage({
        id: msgId,
        cmd: 'revoke',
        args: args,
      });
      popup.close();
    });
  }, false);
};

// From the nuBox content/popup script.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log(message);

  const msgId = message.msgId;
  registerCallback(msgId, sendResponse);

  // Read a block of data from a local file,
  // encrypt it using nucypher and return it back.
  // option to upload it to IPFS too.
  if (message.cmd === 'readBlock') {
    readBlock(msgId, message.args.blob, message.args.path, message.args.ipfs);
  } else if (message.cmd === 'grant') {
    grant(msgId, message.args, sender);
  } else if (message.cmd === 'revoke') {
    revoke(msgId, message.args, sender);
  } else {
    if (message.cmd === 'encrypt') {
      if (message.args[2] === true /* ipfs */) {
        ipfsEncrypts[msgId] = msgId;
      }
      message.args[0] = IpfsHttpClient.Buffer.from(message.args[0]).toString('base64');
      message.args[1] = IpfsHttpClient.Buffer.from(message.args[1]).toString('hex');

    } else if (message.cmd === 'decrypt') {
      message.args[1] = IpfsHttpClient.Buffer.from(message.args[1]).toString('hex');

      if (message.args[2] === true) {
        const ipfs = IpfsHttpClient('ipfs.infura.io', '5001', { protocol: 'https' });
        ipfs.get(message.args[0]).then((results) => {
          // TODO: how to handle error.

          const encrypted = results[0].content.toString();

          console.log(encrypted);

          port.postMessage({
            id: msgId,
            cmd: message.cmd,
            args: [encrypted, message.args[1]],
          });
        });
        return;
      }
    }

    port.postMessage({
      id: msgId,
      cmd: message.cmd,
      args: message.args,
    });
  }

  return true;
});
