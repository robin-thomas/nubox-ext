// Inject API to web page
const s = document.createElement('script');
s.src = chrome.extension.getURL('nubox.js');
s.onload = function() {
  this.parentNode.removeChild(this);
};
(document.head||document.documentElement).appendChild(s);
