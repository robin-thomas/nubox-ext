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

  chrome.runtime.sendMessage(msg, (response) => {
    sendResponse(msg.msgId, response);
  });
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
