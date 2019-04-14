
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
      // Check whether a download is already happening.
      if ($('.account-dashboard .nav-link-active .dashboard-title').html().toUpperCase() === 'DOWNLOAD FILE' &&
          $('.download-file-card #download-file').val().trim().length > 0) {
        if (!confirm('Pending download going on. Are you sure you want to cancel it?')) {
          return;
        }
      }

      // Change the title.
      const title = ele.find('.dashboard-title').html();
      $('#nubox-content-title').html(title);
      $('#nubox-content-content').html('');

      switch (title.toUpperCase()) {
        case 'DOWNLOAD FILE':
          showDownloadFile();
          break;

        case 'LOGGING':
          showLogs();
          break;
      }

      ele.parent().siblings().find('.nav-link').removeClass('nav-link-active');
      ele.addClass('nav-link-active');
    }
  });

  const showDownloadFile = () => {
    const downloadDiv = `<div class="card" style="width:35%">
                          <div class="card-header">
                            <h6>Download files that are shared with you</h6>
                          </div>
                          <div class="card-body">
                            <p style="text-align:justify">
                              Upload the nuBox file shared with you, and nuBox will take care of downloading everything
                              from IPFS, decrypting it, and then construct the file!
                            </p>
                          </div>
                        </div>
                        <br />
                        <div class="card download-file-card" style="width:35%">
                          <div class="card-body">
                            <div class="row no-gutters">
                              <div class="col-auto">
                                <input type="file" id="download-file" accept=".json" hidden />
                                <button type="button" class="btn btn-danger" id="download-file-fake">Upload nuBox file</button>
                              </div>
                              <div class="col-md-5 ml-auto download-status" style="visibility:hidden"></div>
                              <div class="col-md-1 ml-auto download-spinner" style="visibility:hidden">
                                <i class="fas fa-spinner fa-spin" style="color:#dc3545;font-size:38px"></i>
                              </div>
                            </div>
                          </div>
                          <ul class="list-group list-group-flush"></ul>
                        </div>`;

    $('#nubox-content-content').html(downloadDiv);
  };

  $('#nubox-content-content').on('change', '#download-file', async function(e) {
    const file = e.target.files[0];

    // Validate that the file name matches "nuBox.json"
    try {
      nuBoxFile.validateFilename(file);
    } catch (error) {
      $(this).val('');
      return;
    }

    // Upload and parse the file.
    let fileContents = null;
    try {
      $('#nubox-content-content .download-status').html('<p>Uploading</p>').css('visibility', 'visible');
      $('#nubox-content-content .download-spinner').css('visibility', 'visible');

      fileContents = await nuBoxFile.readnuBoxFile(file);
    } catch (error) {
      $(this).val('');
      return;
    }

    // Download the chunks from IPFS.
    try {
      await nuBoxFile.ipfsDownload(fileContents);
    } catch (error) {
      $(this).val('');
      return;
    }

  });

  const nuBoxFile = {
    validateFilename: (file) => {
      // Validate that the file name matches "nuBox.json"
      if (file.name !== 'nuBox.json') {
        const err = `<li class="list-group-item">
                      Is this <b>really</b> the "nuBox.json" file shared with you?
                    </li>`;
        $('#nubox-content-content .download-file-card > .list-group-flush').html(err);
        $(this).val('');

        throw new Error('invalid filename');
      }
    },

    readnuBoxFile: (file) => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          $('#nubox-content-content .download-status').html('<p>Parsing</p>');
          const content = e.target.result;

          try {
            const json = JSON.parse(content);

            if (json.label === undefined ||
                json.ipfs === undefined ||
                json.name === undefined) {
              throw new Error('invalid nuBox file');
            }

            resolve(json);
          } catch (error) {
            const err = `<li class="list-group-item">
                          Is this <b>really</b> the "nuBox.json" file shared with you? <b>Really</b>??!
                        </li>`;
            $('#nubox-content-content .download-file-card > .list-group-flush').html(err);
            $('#nubox-content-content .download-status').html('').css('visibility', 'hidden');
            $('#nubox-content-content .download-spinner').css('visibility', 'hidden');

            reject(error);
          }
        }
        reader.onerror = (e) => {
          reader.abort();

          const err = `<li class="list-group-item">
                        <b>Something<b> went wrong with uploading the file!
                      </li>`;
          $('#nubox-content-content .download-file-card > .list-group-flush').html(err);
          $('#nubox-content-content .download-status').html('').css('visibility', 'hidden');
          $('#nubox-content-content .download-spinner').css('visibility', 'hidden');

          reject(e);
        }
        reader.readAsText(file);
      });
    },

    ipfsDownload: async (fileContents) => {
      $('#nubox-content-content .download-status').html('<p>Decrypting</p>');

      const ipfs = IpfsHttpClient('ipfs.infura.io', '5001', { protocol: 'https' });

      // Open a stream.
      const fileStream = streamSaver.createWriteStream(fileContents.name);
      writer = fileStream.getWriter();

      try {
        for (const hash of fileContents.ipfs) {
          const results = await ipfs.get(hash);
          const encrypted = results[0].content.toString();

          const decryptedB64 = await callExtension('decrypt', {
            encrypted: encrypted,
            label: fileContents.label,
          });
          const decrypted = IpfsHttpClient.Buffer.from(decryptedB64, 'base64');

          // Put to stream.
          writer.write(decrypted);
        }

        // Close the stream.
        writer.close();

      } catch (error) {
        // Abort the stream.
        if (writer !== null) {
          writer.abort();
        }

        const err = `<li class="list-group-item">
                      Opps! Failed to download from IPFS!!
                    </li>`;
        $('#nubox-content-content .download-file-card > .list-group-flush').html(err);
        $('#nubox-content-content .download-status').html('').css('visibility', 'hidden');
        $('#nubox-content-content .download-spinner').css('visibility', 'hidden');

        throw error;
      }
    },
  };

  $('#nubox-content-content').on('click', '#download-file-fake', () => {
    $('#nubox-content-content #download-file').click();
    $('#nubox-content-content .download-file-card > .list-group-flush').html('');
    $('#nubox-content-content .download-status').html('').css('visibility', 'hidden');
    $('#nubox-content-content .download-spinner').css('visibility', 'hidden');
  });

  const showLogs = async () => {
    try {
      const logs = await callExtension('getLogs');

      let trows = '';
      for (const log of logs) {
        let message = log.message;
        try {
          for (arg of Object.keys(message)) {
            if (message[arg].length > 100) {
              const val = message[arg];
              message[arg] = val.substr(0, 50) + ' <b>...</b> ' + val.substr(val.length - 50);
            }
          }

          message = JSON.stringify(message);
          message = message.replace (/(^")|("$)/g, '');

          if (log.cmd === 'encrypt' && message.length > 100) {
            message = message.substr(0, 50) + ' <b>...</b> ' + message.substr(message.length - 50);
          }

        } catch (err) {
          message = log.message;
        };

        let args = log.args;
        try {
          for (arg of Object.keys(args)) {
            if (args[arg].length > 100) {
              const val = args[arg];
              args[arg] = val.substr(0, 50) + ' <b>...</b> ' + val.substr(val.length - 50);
            }
          }

          args = JSON.stringify(args);
        } catch (err) {
          args = log.args;
        };
        args = args === undefined ? '-' : args;

        trows += `<tr>
                    <td>${log.cmd}</td>
                    <td>${args}</td>
                    <td>${log.type.toUpperCase() === 'FAILURE' ? '<span style="color:#dc3545">FAILURE</span>' : '<span style="color:#28a745">SUCCESS</span>'}</td>
                    <td>${message}</td>
                    <td>${log.datetime}</td>
                  </tr>`;
      }

      const table = `<div style="font-size:14px">
                      <table class="table" style="table-layout:fixed;word-wrap:break-word">
                        <thead class="thead-dark">
                          <tr>
                            <th scope="col">Request</th>
                            <th scope="col">Input</th>
                            <th scope="col">Result</th>
                            <th scope="col">Response</th>
                            <th scope="col">Date</th>
                          </tr>
                        </thead>
                      </table>
                    </div>
                    <div style="font-size:14px;height:70vh">
                      <table class="table table-striped table-bordered table-hover"
                             style="table-layout:fixed;word-wrap:break-word">
                        <tbody>${trows}</tbody>
                      </table>
                    </div>`;

      $('#nubox-content-content').html(table);
      new SimpleBar($('#nubox-content-content > div').last()[0]);

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
