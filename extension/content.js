// Inject API to web page
const injectnuBox = (name, css = false) => {
  const s = document.createElement(css ? 'style' : 'script');
  if (css) {
    s.innerHTML = name;
  } else {
    s.src = chrome.extension.getURL(name);
    s.onload = function() {
      this.parentNode.removeChild(this);
    };
  }
  (document.head||document.documentElement).appendChild(s);
};
injectnuBox('nubox.js');
injectnuBox('gmail.js');
injectnuBox(`
  .nubox-r-c-btn-r {
    background:#dc3545 !important
  }

  .nubox-r-c-btn-loader {
    border-radius: 50%;
    border-top: 2px solid #fff;
    border-left: 2px solid #fff;
    width: 16px;
    height: 16px;
    animation: nubox-spin 1s linear infinite;
  }

  @keyframes nubox-spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`, true);

// Add listener to wait for events from the injected script.
document.addEventListener('nuBox.api.request', (data) => {
  const msg = data.detail;

  // Grant request if coming for Bob in same machine
  // and requested for no popup.
  if ((msg.cmd === 'grant' || msg.cmd === 'revoke') &&
       msg.args.noPopup === true) {
    // Get Bob keys.
    const msgId = Math.random().toString(36).substring(7);
    const newMsg = {
      msgId: msgId,
      cmd: 'bob_keys',
      args: {
        host: window.location.hostname,
      },
    };

    msg.args.noPopup = false; // noPopup will be turned on if security check passes.
    chrome.runtime.sendMessage(newMsg, (response) => {
      if (response.type === 'success') {
        const bob = response.result;

        switch (msg.cmd) {
          case 'grant':
            if (msg.args.bek === bob.bek &&
                msg.args.bvk === bob.bvk) {
              // Its bob in same machine.
              msg.args.noPopup = true;
            }
            break;

          case 'revoke':
            if (msg.args.bvk === bob.bvk) {
              // Its bob in same machine.
              msg.args.noPopup = true;
            }
            break;
        }
      }

      chrome.runtime.sendMessage(msg, (response) => {
        sendResponse(msg.msgId, response);
      });
    });
  } else {
    chrome.runtime.sendMessage(msg, (response) => {
      sendResponse(msg.msgId, response);
    });
  }
}, false);

const sendResponse = (msgId, response) => {
  const event = new CustomEvent('nuBox.api.response', {
    detail: {
      msgId: msgId,
      response: {
        type: response.type,
        result: response.result,
      },
    },
    bubbles: true,
  });

  document.dispatchEvent(event);
}
