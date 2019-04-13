
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
      $('#nubox-content-content').html('');

      switch (title.toUpperCase()) {
        case 'LOGGING':
          showLogs();
          break;
      }

      ele.parent().siblings().find('.nav-link').removeClass('nav-link-active');
      ele.addClass('nav-link-active');
    }
  });

  const showLogs = async () => {
    try {
      const logs = await callExtension('getLogs');
      console.log(logs);

      let trows = '';
      for (const log of logs) {
        let message = log.message;
        try {
          message = JSON.stringify(message);
        } catch (err) {
          message = log.message;
        };

        trows += `<tr>
                    <td>${log.cmd}</td>
                    <td>${log.type.toUpperCase()}</td>
                    <td>${message}</td>
                    <td>${log.datetime}</td>
                  </tr>`;
      }

      const table = `<table class="table table-dark table-striped table-hover"
                            style="margin-top:15px;font-size:14px;table-layout:fixed;word-wrap:break-word">
                      <thead>
                        <tr>
                          <th scope="col">Request</th>
                          <th scope="col">Result</th>
                          <th scope="col">Response</th>
                          <th scope="col">Date</th>
                        </tr>
                      </thead>
                      <tbody>${trows}</tbody>
                    </table>`;

      $('#nubox-content-content').html(table);

    } catch (err) {

    }
  }
});

const callExtension = (cmd, args) => {
  return new Promise((resolve, reject) => {
    const msgId = Math.random().toString(36).substring(7);

    args = (args === undefined || args === null) ? {} : args;
    args.host = window.location.hostname;

    chrome.runtime.sendMessage({
      msgId: msgId,
      cmd: cmd,
      args: args,
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
