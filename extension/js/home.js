
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

        let args = log.args;
        try {
          args = JSON.stringify(args);
        } catch (err) {
          args = log.args;
        };
        args = args === undefined ? '-' : args;

        trows += `<tr>
                    <td>${log.cmd}</td>
                    <td>${args}</td>
                    <td>${log.type.toUpperCase()}</td>
                    <td>${message}</td>
                    <td>${log.datetime}</td>
                  </tr>`;
      }

      const table = `<div style="font-size:14px;height:calc(100vh - 250px)">
                      <table class="table table-striped table-bordered table-hover"
                             style="table-layout:fixed;word-wrap:break-word">
                        <thead class="thead-dark">
                          <tr>
                            <th scope="col">Request</th>
                            <th scope="col">Input</th>
                            <th scope="col">Result</th>
                            <th scope="col">Response</th>
                            <th scope="col">Date</th>
                          </tr>
                        </thead>
                        <tbody>${trows}</tbody>
                      </table>
                    </div>`;

      $('#nubox-content-content').html(table);
      new SimpleBar($('#nubox-content-content')[0]);

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
