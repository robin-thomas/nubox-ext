const port = chrome.runtime.connectNative('com.google.chrome.nubox');

// to keep track of encrypted returns from nucypher
// (for uploads to ipfs).
let ipfsEncrypts = {};

const Logging = {
  key: 'nuBox.logging',

  addLog: (cmd, type, message, args) => {
    return new Promise((resolve) => {
      const datetime = moment().format('YYYY-MM-DD HH:mm:ss');

      // Decode it back for human-readable form.
      if (args.label !== undefined) {
        const label = args.label;
        try {
          args.label = IpfsHttpClient.Buffer.from(label, 'hex').toString();
        } catch (err) {
          args.label = label;
        }
      }
      if (args.plaintext !== undefined) {
        const plaintext = args.plaintext;
        try {
          args.plaintext = IpfsHttpClient.Buffer.from(plaintext, 'base64').toString();
        } catch (err) {
          args.plaintext = plaintext;
        }
      }

      Logging.getLogs().then((logs) => {
        logs.unshift({
          cmd: cmd,
          args: args,
          type: type,
          message: message,
          datetime: datetime,
        });

        chrome.storage.local.remove(Logging.key, () => {
          chrome.storage.local.set({
            'nuBox.logging': logs,
          }, () => resolve(null));
        });

      }).catch(console.log);
    });
  },

  getLogs: () => {
    return new Promise((resolve) => {
      chrome.storage.local.get(Logging.key, function(results) {
        // Not stored in Chrome. Send empty array.
        if (chrome.runtime.lastError ||
            results[Logging.key] === undefined) {
          resolve([]);
        } else {
          resolve(results[Logging.key]);
        }
      });
    });
  }
};

const Approval = {
  key: 'nuBox.approval',

  getAll: () => {
    const items = localStorage.getItem(Approval.key);
    return (items === null || items === undefined) ? [] : JSON.parse(items);
  },

  isApproved: (value, items = null) => {
    if (value === null || value === undefined) {
      return false;
    }

    items = items !== null ? items : Approval.getAll();
    return items.indexOf(value) > -1;
  },

  approve: (value) => {
    let items = Approval.getAll();

    if (!Approval.isApproved(value, items)) {
      items.push(value);

      localStorage.removeItem(Approval.key);
      localStorage.setItem(Approval.key, JSON.stringify(items));
      console.log(items);
      console.log(`approving ${chrome.runtime.id}`);
    }
  },

  reset: () => {
    localStorage.removeItem(Approval.key);
    localStorage.setItem(Approval.key, JSON.stringify([]));
  }
};
Approval.reset();
Approval.approve(chrome.runtime.id);

const Callbacks = {
  callbacks: {},

  registerCallback: (id, callback) => {
    Callbacks.callbacks[id] = callback;
  },

  sendResponse: (msgId, type, msg, cmd, args) => {
    if (Callbacks.callbacks[msgId] !== undefined) {
      Callbacks.callbacks[msgId]({
        type: type,
        result: msg,
      });

      delete Callbacks.callbacks[msgId];

      if (cmd !== 'isHostRunning' && cmd !== 'getLogs') {
        Logging.addLog(cmd, type, msg, args);
      }
    }
  },

  onMessage: (response) => {
    console.log(response);

    if (response.id !== undefined &&
        Callbacks.callbacks[response.id] !== undefined) {

      const msgId = response.id;

      if (Callbacks.callbacks[response.id].resolve !== undefined) {
        if (response.type === 'success') {
          Callbacks.callbacks[response.id].resolve(response.result);
        } else {
          Callbacks.callbacks[response.id].reject(response.result);
        }

        delete Callbacks.callbacks[response.id];
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
          Callbacks.sendResponse(response.id, 'success', results[0].hash, response.cmd, response.args);
        }).catch((err) => {
          Callbacks.sendResponse(response.id, 'failure', err.message, response.cmd, response.args);
        });

      } else {
        Callbacks.sendResponse(response.id, response.type, response.result, response.cmd, response.args);
      }
    }
  },
};

const Process = {
  main: (message, sender, sendResponse) => {
    console.log(message);

    // Register the callback for the response from the host.
    const msgId = message.msgId;
    Callbacks.registerCallback(msgId, sendResponse, message.cmd);

    // Check whether host is approved. If not, fail the request.
    if (message.cmd !== 'approve' &&
        message.cmd !== 'isHostRunning') {
      // Not approved.
      if (!Approval.isApproved(message.args.host)) {
        Callbacks.sendResponse(msgId, 'failure', 'Host not approved', message.cmd, message.args);
        return;
      }
    }

    // Convert args to correct encoding.
    if (message.args.label !== undefined) {
      message.args.label = IpfsHttpClient.Buffer.from(message.args.label).toString('hex');
    }
    if (message.args.plaintext !== undefined) {
      message.args.plaintext = IpfsHttpClient.Buffer.from(message.args.plaintext).toString('base64');
    }

    // Operations based on cmd.
    switch (message.cmd) {
      case 'getLogs':
        Process.getLogs(msgId, message.args);
        break;

      case 'bob_keys':
        Process.getBobKeys(msgId);
        break;

      case 'isHostRunning':
        Process.isHostRunning(msgId);
        break;

      case 'approve':
        Process.approve(msgId, message.args);
        break;

      case 'grant':
        Process.grant(msgId, message.args, sender);
        break;

      case 'revoke':
        Process.revoke(msgId, message.args, sender);
        break;

      case 'encrypt':
        Process.encrypt(msgId, message.args);
        break;

      case 'decrypt':
        Process.decrypt(msgId, message.args);
        break;

      case 'readBlock':
        Process.readBlock(msgId, message.args);
        break;
    }
  },

  getLogs: (msgId, args) => {
    if (chrome.runtime.id !== args.host) {
      Callbacks.sendResponse(msgId, 'failure', 'No access to use getLogs API', 'getLogs', args);
    } else {
      Logging.getLogs().then((logs) => {
        Callbacks.sendResponse(msgId, 'success', logs, 'getLogs');
      });
    }
  },

  getBobKeys: (msgId) => {
    port.postMessage({
      id: msgId,
      cmd: 'bob_keys',
      args: {},
    });
  },

  isHostRunning: (msgId) => {
    port.postMessage({
      id: msgId,
      cmd: 'isHostRunning',
      args: {},
    });
  },

  approve: (msgId, args) => {
    const popup = window.open('connect.html', 'extension_popup',
      'width=340,height=614,top=25,left=25,toolbar=no,location=no,scrollbars=no,resizable=no,status=no,menubar=no,directories=no');

    const popupConnectCloseHandler = () => {
      Callbacks.sendResponse(msgId, 'failure', 'User has rejected the connect request', 'approve', args);
    };
    popup.addEventListener('beforeunload', popupConnectCloseHandler);

    popup.addEventListener('load', () => {
      popup.$('#host-title').html(args.title);
      popup.$('.title-letter').html(args.title[0].toUpperCase());
      popup.$('#connect-host').html(args.host);

      // If the user rejects it, send back the failure message.
      popup.$('#nubox-connect-cancel').on('click', () => {
        Callbacks.sendResponse(msgId, 'failure', 'User has rejected the connect request', 'approve', args);
        popup.close();
      });
      popup.$('#nubox-connect-confirm').on('click', () => {
        // Cancel the popup event handler.
        popup.removeEventListener('beforeunload', popupConnectCloseHandler, false);

        // User has approved the host.
        Approval.approve(args.host);
        Callbacks.sendResponse(msgId, 'success', 'Host is approved', 'approve', args);

        popup.close();
      });
    }, false);
  },

  encrypt: (msgId, args) => {
    if (args.ipfs === true) {
      ipfsEncrypts[msgId] = msgId;
    }

    port.postMessage({
      id: msgId,
      cmd: 'encrypt',
      args: args,
    });
  },

  decrypt: (msgId, args) => {
    if (args.ipfs === true) {
      const ipfs = IpfsHttpClient('ipfs.infura.io', '5001', { protocol: 'https' });
      ipfs.get(args.encrypted).then((results) => {
        // TODO: how to handle error.

        const encrypted = results[0].content.toString();

        port.postMessage({
          id: msgId,
          cmd: 'decrypt',
          args: {
            encrypted: encrypted,
            label: args.label
          },
        });
      });
    }

    port.postMessage({
      id: msgId,
      cmd: 'decrypt',
      args: args,
    });
  },

  grant: (msgId, args, sender) => {
    // Validate user input.
    if (!(moment(args.expiration, 'YYYY-MM-DD HH:mm:ss', true).isValid())) {
      Callbacks.sendResponse(msgId, 'failure', 'Invalid expiration date string (not ISO 8601)', 'grant', args);
      return;
    }
    if (moment().isAfter(args.expiration)) {
      Callbacks.sendResponse(msgId, 'failure', 'Expiration date string is in the past or today', 'grant', args);
      return;
    }
    args.expiration = moment(args[3]).format('YYYY-MM-DDTHH:mm:ss') + '.445418Z';

    // noPopup activated.
    if (args.noPopup === true) {
      port.postMessage({
        id: msgId,
        cmd: 'grant',
        args: args,
      });

      return;
    }

    // open up the grant popup which asks for user permission.
    const popup = window.open('grant.html', 'extension_popup',
      'width=340,height=725,top=25,left=25,toolbar=no,location=no,scrollbars=no,resizable=no,status=no,menubar=no,directories=no');

    const popupGrantCloseHandler = (e) => {
      Callbacks.sendResponse(msgId, 'failure', 'User has rejected the grant request', 'grant', args);
    };
    popup.addEventListener('beforeunload', popupGrantCloseHandler);

    popup.addEventListener('load', (e) => {
      popup.$('#nubox-grant-bek').val(args.bek);
      popup.$('#nubox-grant-bvk').val(args.bvk);
      popup.$('#nubox-grant-exp').val(args.expiration);
      popup.$('#card-nubox-url').html(sender.url);
      popup.$('#card-nubox-label').html(args.label);

      // If the user rejects it, send back the failure message.
      popup.$('#nubox-grant-cancel').on('click', (e) => {
        Callbacks.sendResponse(msgId, 'failure', 'User has rejected the grant request', 'grant', args);
        popup.close();
      });
      popup.$('#nubox-grant-confirm').on('click', () => {
        // Cancel the popup event handler.
        popup.removeEventListener('beforeunload', popupGrantCloseHandler, false);

        // If the user approves, send it to the native host for approval.
        port.postMessage({
          id: msgId,
          cmd: 'grant',
          args: args,
        });

        popup.close();
      });
    }, false);
  },

  revoke: (msgId, args, sender) => {
    // open up the grant popup which asks for user permission.
    const popup = window.open('revoke.html', 'extension_popup',
      'width=315,height=555,top=25,left=25,toolbar=no,location=no,scrollbars=no,resizable=no,status=no,menubar=no,directories=no');

    const popupRevokeCloseHandler = (e) => {
      Callbacks.sendResponse(msgId, 'failure', 'User has rejected the revoke request', 'revoke', args);
    };
    popup.addEventListener('beforeunload', popupRevokeCloseHandler);

    popup.addEventListener('load', (e) => {
      popup.$('#card-nubox-url').html(sender.url);
      popup.$('#card-nubox-label').html(args.label);
      popup.$('#nubox-revoke-bvk').val(args.bvk);

      // If the user rejects it, send back the failure message.
      popup.$('#nubox-grant-cancel').on('click', (e) => {
        Callbacks.sendResponse(msgId, 'failure', 'User has rejected the revoke request', 'revoke', args);
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
  },

  readBlock: (msgId, args) => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', args.blob, true);
    xhr.responseType = 'blob';
    xhr.onload = function(e) {
      if (this.status == 200) {
        const blobContent = this.response;

        const r = new FileReader();
        r.onload = function(e) {
          const blockB64 = IpfsHttpClient.Buffer.from(r.result).toString('base64');

          // Encrypt it using host protocol.
          if (args.ipfs) {
            ipfsEncrypts[msgId] = msgId;
          }
          port.postMessage({
            id: msgId,
            cmd: 'encrypt',
            args: {
              plaintext: blockB64,
              label: args.label
            },
          });
        };

        r.readAsArrayBuffer(blobContent);
      }
    };
    xhr.send();
  },
};

const Downloader = {
  getNextBlock: (hash, label) => {
    return new Promise((resolve, reject) => {
      const msgId = Math.random().toString(36).substring(7);

      Callbacks.registerCallback(msgId, {
        resolve: resolve,
        reject: reject,
      });

      const ipfs = IpfsHttpClient('ipfs.infura.io', '5001', { protocol: 'https' });
      ipfs.get(hash).then((results) => {
        const encrypted = results[0].content.toString();

        label = IpfsHttpClient.Buffer.from(label).toString('hex');

        port.postMessage({
          id: msgId,
          cmd: 'decrypt',
          args: [ encrypted, label ],
        });
      });
    });
  },

  downloadFile: async (ipfsList, fileName, label) => {
    let writer = null;

    try {
      // Create the writeable stream.
      const fileStream = streamSaver.createWriteStream(fileName);
      writer = fileStream.getWriter();

      // Read all the blocks from ipfs and join them.
      for (const hash of ipfsList) {
        const decryptedB64 = await Downloader.getNextBlock(hash, label);
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

chrome.declarativeContent.onPageChanged.removeRules(undefined, function() {
  chrome.declarativeContent.onPageChanged.addRules([{
    conditions: [new chrome.declarativeContent.PageStateMatcher({
      pageUrl: {urlMatches: '(localhost:4000)|nubox.herokuapp.com'},
    })],
    actions: [new chrome.declarativeContent.ShowPageAction()]
  }]);
});

port.onMessage.addListener((response) => Callbacks.onMessage(response));

// From the nuBox content/popup script.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  Process.main(message, sender, sendResponse);
  return true;
});

// Listener to detect download links and download.
// Only for nuBox. API not exposed for other websites.
chrome.webRequest.onCompleted.addListener((details) => {
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
    Downloader.downloadFile(data.ipfs, data.filename, data.label);
  }
},
{
  urls: [ /* filter */
    'http://localhost:4000/download/*',
    'https://nubox.herokuapp.com/download/*',
  ]
}, ['responseHeaders']);
