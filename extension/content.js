// Inject API to web page
const s = document.createElement('script');
s.src = chrome.extension.getURL('nubox.js');
s.onload = function() {
  this.parentNode.removeChild(this);
};
(document.head||document.documentElement).appendChild(s);

// Add listener to wait for events from the injected script.
document.addEventListener('nuBox.api.request', (data) => {
  const msg = data.detail;

  // Grant request if coming for Bob in same machine
  // and requested for no popup.
  if (msg.cmd === 'grant' && msg.args[4] === true) {
    // Get Bob keys.
    const msgId = Math.random().toString(36).substring(7);
    const newMsg = {
      msgId: msgId,
      cmd: 'bob_keys',
      args: [],
    };

    msg.args[4] = false; // noPopup will be turned on if security check passes.
    chrome.runtime.sendMessage(newMsg, (response) => {
      if (response.type === 'success') {
        const bob = response.result;
        if (msg.args[1] === bob.bek &&
            msg.args[2] === bob.bvk) {
          // Its bob in same machine.
          msg.args[4] = true;
        }
      }

      chrome.runtime.sendMessage(msg, (response) => {
        sendResponse(msg.msgId, response);
      });
    });
  } else {
    msg.args[4] = false; // noPopup turned off.
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
