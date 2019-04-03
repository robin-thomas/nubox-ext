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

    if (callbacks[response.id].resolve !== undefined) {
      if (response.type === 'success') {
        callbacks[response.id].resolve(response.result);
      } else {
        callbacks[response.id].reject(response.result);
      }

      delete callbacks[response.id];
      return;
    }

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
      result: 'Expiration date string is in the past or today',
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

  const popupGrantCloseHandler = (e) => {
    callbacks[msgId]({
      type: 'failure',
      result: 'User has rejected the grant request',
    });
  };
  popup.addEventListener('beforeunload', popupGrantCloseHandler);

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
    popup.$('#nubox-grant-confirm').on('click', () => {
      // Cancel the popup event handler.
      popup.removeEventListener('beforeunload', popupGrantCloseHandler, false);

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

  const popupRevokeCloseHandler = (e) => {
    callbacks[msgId]({
      type: 'failure',
      result: 'User has rejected the revoke request',
    });
  };
  popup.addEventListener('beforeunload', popupRevokeCloseHandler);

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
      // Cancel the popup event handler.
      popup.removeEventListener('beforeunload', popupRevokeCloseHandler, false);

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
        return true;
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


const Worker = {
  getNextBlock: (hash, path) => {
    return new Promise((resolve, reject) => {
      const msgId = Math.random().toString(36).substring(7);

      registerCallback(msgId, {
        resolve: resolve,
        reject: reject,
      });

      const ipfs = IpfsHttpClient('ipfs.infura.io', '5001', { protocol: 'https' });
      ipfs.get(hash).then((results) => {
        const encrypted = results[0].content.toString();

        path = IpfsHttpClient.Buffer.from(path).toString('hex');

        port.postMessage({
          id: msgId,
          cmd: 'decrypt',
          args: [encrypted, path],
        });
      });
    });
  },

  downloadFile: async (ipfsList, fileName, path) => {
    let writer = null;

    try {
      // Create the writeable stream.
      const fileStream = streamSaver.createWriteStream(fileName);
      writer = fileStream.getWriter();

      // Read all the blocks from ipfs and join them.
      for (const hash of ipfsList) {
        const decryptedB64 = await Worker.getNextBlock(hash, path);
        const decrypted = IpfsHttpClient.Buffer.from(decryptedB64, 'base64');
        writer.write(decrypted);
      }

      // Close the stream.
      writer.close();

    } catch (err) {
      if (writer !== null) {
        writer.abort();
      }
      console.log(err);
    }
  },
};

const responseListener = (details) => {
  const headers = details.responseHeaders;

  // get the ipfs hashes from the headers.
  let data = null;
  let nubox = false;
  for (let i = 0; i < headers.length; i++) {
    if (headers[i].name === 'nubox-file') {
      data = JSON.parse(headers[i].value);
      if (data.ipfs.length > 0) {
        nubox = true;
      }
      break;
    }
  }

  // Trigger download.
  if (nubox) {
    console.log(data);
    Worker.downloadFile(data.ipfs, data.filename, data.path);
  }
};

chrome.webRequest.onCompleted.addListener(responseListener, {
  urls: ["http://localhost:4000/download/*"] /* filter */
}, ['responseHeaders']);
