
$(document).ready((e) => {
  $('.offline').css('visibility', 'hidden');
  $('.online').css('visibility', 'hidden');

  const msgId = Math.random().toString(36).substring(7);

  // Check whether the nucypher docker containers are running.
  chrome.runtime.sendMessage({
    msgId: msgId,
    cmd: 'isHostRunning',
    args: [],
  }, (response) => {
    if (!response) {
      $('.offline').css('visibility', 'visible');
    } else if (response.type === 'failure') {
      $('.offline').css('visibility', 'visible');
    } else {
      $('.online').css('visibility', 'visible');
    }
  });

  $('.nav-link').on('click', (e) => {
    e.preventDefault();

    const ele = $(e.currentTarget);
    if (!ele.hasClass('nav-link-active')) {
      const title = ele.find('.dashboard-title').html();
      $('#nubox-content-title').html(title);

      ele.parent().siblings().find('.nav-link').removeClass('nav-link-active');
      ele.addClass('nav-link-active');
    }
  });
});

const callExtension = (cmd, args) => {
  return new Promise((resolve, reject) => {
    const msgId = Math.random().toString(36).substring(7);

    chrome.runtime.sendMessage({
      msgId: msgId,
      cmd: cmd,
      args: args === undefined ? [] : args,
    }, (response) => {
      console.log(response);

      if (!response) {
        reject(null)
      } else if (response.type === 'failure') {
        reject(response.result);
      } else {
        resolve(response.result);
      }
    });
  });
};

const throwError = (error) => {
  chrome.tabs.query({
    active: true,
    currentWindow: true
  }, (tabs) => {
    chrome.tabs.executeScript(
      tabs[0].id,
      { code: 'alert("' + error + '")' }
    );
  });
}
