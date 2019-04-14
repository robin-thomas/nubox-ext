
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

  const Display = {
    load: (e = null) => {
      if (!e) {
        $('#nubox-content-title').html('MY NUBOX');
        $('#nubox-content-content').html('');
        Display.showMyNuBox();
        return;
      }

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
          case 'MY NUBOX':
            Display.showMyNuBox();
            break;

          case 'DOWNLOAD FILE':
            Display.showDownloadFile();
            break;

          case 'LOGGING':
            Display.showLogs();
            break;
        }

        ele.parent().siblings().find('.nav-link').removeClass('nav-link-active');
        ele.addClass('nav-link-active');
      }
    },

    showMyNuBox: () => {
      const uploadDiv = `<div class="card upload-file-card" style="width:35%">
                          <div class="card-body">
                            <div class="row no-gutters">
                              <div class="col-auto">
                                <input type="file" id="upload-file" hidden />
                                <button type="button" class="btn btn-danger" id="upload-file-fake">Upload file</button>
                              </div>
                              <div class="col-md-5 ml-auto upload-status" style="visibility:hidden"></div>
                              <div class="col-md-1 ml-auto upload-spinner" style="visibility:hidden">
                                <i class="fas fa-spinner fa-spin" style="color:#dc3545;font-size:38px"></i>
                              </div>
                            </div>
                          </div>
                          <ul class="list-group list-group-flush"></ul>
                        </div>
                        <br />
                        <div class="card nubox-files-card" style="width:100%;height:65vh">
                          <div class="card-header">
                            <h6>My nuBox</h6>
                          </div>
                          <div class="card-body" id="nubox-fs"></div>
                        </div>`;

      $('#nubox-content-content').html(uploadDiv);
    },

    showDownloadFile: () => {
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
    },

    showLogs: async () => {
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
    },
  };

  $('.nav-link').on('click', Display.load);
  $('#nubox-content-content').on('change', '#download-file', async function(e) {
    const file = e.target.files[0];
    $('#download-file-fake').prop('disabled', true);

    // Validate that the file name matches "nuBox.json"
    try {
      nuBoxFile.validateFilename(file);
    } catch (error) {
      $(this).val('');
      $('#download-file-fake').prop('disabled', false);
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
      $('#download-file-fake').prop('disabled', false);
      return;
    }

    // Download the chunks from IPFS.
    try {
      await nuBoxFile.ipfsDownload(fileContents);
    } catch (error) {
      $(this).val('');
      $('#download-file-fake').prop('disabled', false);
      return;
    }

    $(this).val('');
    $('#download-file-fake').prop('disabled', false);
  });
  $('#nubox-content-content').on('change', '#upload-file', async function(e) {
    const file = e.target.files[0];

    $('#upload-file-fake').prop('disabled', true);
    $('#nubox-content-content .upload-status').html('<p>Uploading</p>').css('visibility', 'visible');
    $('#nubox-content-content .upload-spinner').css('visibility', 'visible');

    let hashes = [];
    let offset = 0;
    const blockSize = 262144; /* 256 KB */
    try {
      while (offset < file.size) {
        const blob = file.slice(offset, blockSize + offset);
        const blobURL = URL.createObjectURL(blob);

        const hash = await callExtension('readBlock', {
          blob: blobURL,
          label: file.name,
          ipfs: true,
        });
        hashes.push(hash);

        offset += blockSize;
      }

      await FS.saveFile(file, hashes);

    } catch (err) {
      $(this).val('');
      $('#upload-file-fake').prop('disabled', false);
      $('#nubox-content-content .upload-status').html('').css('visibility', 'hidden');
      $('#nubox-content-content .upload-spinner').css('visibility', 'hidden');
      return;
    }

    $(this).val('');
    $('#upload-file-fake').prop('disabled', false);
    $('#nubox-content-content .upload-status').html('').css('visibility', 'hidden');
    $('#nubox-content-content .upload-spinner').css('visibility', 'hidden');
  });

  const ChromeStorage = {
    set: (value) => {
      return new Promise((resolve, reject) => {
        chrome.storage.sync.remove('nuBox.fs', () => {
          chrome.storage.sync.set({
            'nuBox.fs': value,
          }, () => {
            if (chrome.runtime.lastError) {
              reject(null);
            } else {
              resolve(null);
            }
          });
        });
      });
    },

    get: () => {
      return new Promise((resolve) => {
        chrome.storage.sync.get('nuBox.fs', (results) => {
          if (chrome.runtime.lastError ||
              results['nuBox.fs'] === undefined) {
            resolve([]);
          } else {
            resolve(results['nuBox.fs']);
          }
        });
      });
    },
  };

  const FS = {
    init: async () => {
      $('#nubox-fs').html('<div class="container-fluid"></div>');
      new SimpleBar($('#nubox-fs')[0]);

      // Load all the files (just the names).
      try {
        const files = await ChromeStorage.get();

        for (const file of files) {
          FS.drawFile(file);
        }
      } catch (err) {}
    },

    getFileSize: (bytes) => {
      const size = ['B','kB','MB','GB'];
      const factor = Math.floor((bytes.toString().length - 1) / 3);
      return (bytes / Math.pow(1024, factor)).toFixed(2) + size[factor];
    },

    saveFile: async (file, ipfs) => {
      try {
        let files = await ChromeStorage.get();

        files.push({
          name: file.name,
          size: file.size,
          type: file.type,
          created: moment().format('YYYY-MM-DD HH:mm:ss'),
          ipfs: ipfs,
        });

        await ChromeStorage.set(files);

        // Update the UI.
        FS.drawFile(file);

      } catch (err) {
        throw err;
      }
    },

    renameFile: async (e) => {
      try {
        e.preventDefault();

        let ele = $(e.target);
        while (!ele.hasClass('list-group-item')) {
          ele = ele.parent();
        }

        const key = ele.parent().find('.fs-file-key').val();
        const filename = IpfsHttpClient.Buffer.from(key, 'hex').toString();

        let files = await ChromeStorage.get();
        const file = files.filter(e => e.name === filename)[0];
        files = files.filter(e => e.name !== filename);

        let newFileName = null;
        while (true) {
          newFileName = prompt('Rename: ', filename);

          // User hit the cancel button.
          if (newFileName === null) {
            return null;
          }

          // Make sure that the filename matches the name syntax.
          if (newFileName.trim().length < 1 ||
              !/^[0-9_a-zA-Z][_a-zA-Z0-9.]*$/.test(newFileName)) {
            continue;
          }

          // check that this name hasn't been taken in this level.
          if (files.filter(e => e.name === newFileName).length > 0) {
            continue;
          }

          break;
        }

        files.push({
          name: newFileName,
          size: file.size,
          type: file.type,
          ipfs: file.ipfs,
        });

        await ChromeStorage.set(files);

        const newKey = IpfsHttpClient.Buffer.from(newFileName).toString('hex');
        const hidden = $('#nubox-fs').find(`.fs-file-total > input[type="hidden"][value=${key}]`);
        hidden.val(newKey);
        hidden.parent().find('.fs-file-name').html(newFileName);
        hidden.parent().find('[data-toggle="popover"]').popover('dispose');
        hidden.parent().find('[data-toggle="popover"]').popover({
          trigger: 'manual',
          html: true,
          content: function() {
            return `<ul id="popover-content" class="list-group">
                      <input class="fs-file-key" type="hidden" value="${newKey}" />
                      <a href="#" class="fs-download list-group-item"><i class="fas fa-download"></i><span>Download</span></a>
                      <a href="#" class="fs-delete list-group-item"><i class="far fa-trash-alt"></i><span>Delete</span></a>
                      <a href="#" class="fs-rename list-group-item"><i class="far fa-edit"></i><span>Rename</span></a>
                      <a href="#" class="fs-info list-group-item"><i class="fas fa-info-circle"></i><span>Info</span></a>
                      <a href="#" class="fs-share list-group-item"><i class="fas fa-share-alt"></i><span>Share</span></a>
                    </ul>`;
          }
        });

      } catch (err) {
        throw err;
      }
    },

    deleteFile: async (e) => {
      try {
        e.preventDefault();

        let ele = $(e.target);
        while (!ele.hasClass('list-group-item')) {
          ele = ele.parent();
        }

        const key = ele.parent().find('.fs-file-key').val();
        const filename = IpfsHttpClient.Buffer.from(key, 'hex').toString();

        if (confirm(`Are you sure you want to delete "${filename}"?`)) {
          let files = await ChromeStorage.get();
          files = files.filter(e => e.name !== filename);
          await ChromeStorage.set(files);

          $('#nubox-fs').find(`.fs-file-total > input[type="hidden"][value=${key}]`).parent().remove();
        }

      } catch (err) {
        throw err;
      }
    },

    fileInfo: async (e) => {
      e.preventDefault();

      // Get the file.
      let ele = $(e.target);
      while (!ele.hasClass('list-group-item')) {
        ele = ele.parent();
      }
      const key = ele.parent().find('.fs-file-key').val();
      const fileName = IpfsHttpClient.Buffer.from(key, 'hex').toString();

      const files = await ChromeStorage.get();
      const file = files.filter(e => e.name === fileName)[0];

      const rows = `<tr>
                      <th scope="row">Name</th>
                      <td>${fileName}</td>
                    </tr>
                    <tr>
                      <th scope="row">Size</th>
                      <td>${FS.getFileSize(file.size)}</td>
                    </tr>
                    <tr>
                      <th scope="row">Type</th>
                      <td>${file.type}</td>
                    </tr>
                    <tr>
                      <th scope="row">Uploaded on</th>
                      <td>${file.created}</td>
                    </tr>`;

      $('#file-info-dialog').find('.modal-title').html('File Info');
      $('#file-info-dialog').find('table').html(`<tbody>${rows}</tbody>`);
      $('#file-info-dialog').modal('show');
    },

    drawFile: (file) => {
      const fsEle = $('#nubox-fs');

      // Find the last row.
      let row = fsEle.find('.simplebar-content').find('.container-fluid > .row');
      if (row === null || row === undefined || row.length < 1) {
        fsEle.find('.simplebar-content').find('.container-fluid').html('<div class="row no-gutters"></div>');
        row = fsEle.find('.simplebar-content').find('.container-fluid > .row').first();
      } else {
        // Check if enough columns are already present.
        row = row.last();
        if (row.find('.col-md-2').length === 6) {
          fsEle.find('.simplebar-content').find('.container-fluid').append('<div class="row no-gutters"></div>');
          row = fsEle.find('.simplebar-content').find('.container-fluid > .row').last();
        }
      }

      const key = IpfsHttpClient.Buffer.from(file.name).toString('hex');
      const folder = `<div class="fs-file-total col-md-2">
                        <input type="hidden" value="${key}" />
                        <div class="row">
                          <div class="col">
                            <i class="fas fa-file-alt fs-file-icon" data-toggle="popover"></i>
                          </div>
                        </div>
                        <div class="row">
                          <div class="col fs-file-name">${file.name}</div>
                        </div>
                      </div>`;
      row.append(folder);

      $(row).find('[data-toggle="popover"]').last().popover({
        trigger: 'manual',
        html: true,
        content: function() {
          return `<ul id="popover-content" class="list-group">
                    <input class="fs-file-key" type="hidden" value="${key}" />
                    <a href="#" class="fs-download list-group-item"><i class="fas fa-download"></i><span>Download</span></a>
                    <a href="#" class="fs-delete list-group-item"><i class="far fa-trash-alt"></i><span>Delete</span></a>
                    <a href="#" class="fs-rename list-group-item"><i class="far fa-edit"></i><span>Rename</span></a>
                    <a href="#" class="fs-info list-group-item"><i class="fas fa-info-circle"></i><span>Info</span></a>
                    <a href="#" class="fs-share list-group-item"><i class="fas fa-share-alt"></i><span>Share</span></a>
                  </ul>`;
        }
      });

      // const el = new SimpleBar(fsEle[0]);
      // el.recalculate();
    },
  };

  const nuBoxFile = {
    uploadFile: (file, asText = false) => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
          resolve(e.target.result);
        }

        reader.onerror = (e) => {
          reader.abort();
          reject(e);
        }

        if (asText) {
          reader.readAsText(file);
        }
      });
    },

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
        nuBoxFile.uploadFile(file, true /* asText */)
          .then((content) => {
            try {
              const json = JSON.parse(content);

              if (json.label === undefined ||
                  json.ipfs === undefined ||
                  json.name === undefined) {
                throw new Error('Invalid nuBox file');
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
          })
          .catch((error) => {
            const err = `<li class="list-group-item">
                          <b>Something<b> went wrong with uploading the file!
                        </li>`;
            $('#nubox-content-content .download-file-card > .list-group-flush').html(err);
            $('#nubox-content-content .download-status').html('').css('visibility', 'hidden');
            $('#nubox-content-content .download-spinner').css('visibility', 'hidden');

            reject(error);
          });
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

  $(document).on('click', '.popover .fs-info', FS.fileInfo);
  $(document).on('click', '.popover .fs-delete', FS.deleteFile);
  $(document).on('click', '.popover .fs-rename', FS.renameFile);
  $('#nubox-content-content').on('contextmenu', '.fs-file-icon', (e) => {
    e.preventDefault();

    const popover = $(document).find('.popover');
    if (popover.length >= 1) {
      const id = popover.first().attr('id');
      $('#nubox-content-content').find(`[aria-describedBy="${id}"]`).popover('toggle');
    }

    $(e.target).popover('toggle');
  });
  $('#nubox-content-content').on('contextmenu', '#nubox-fs', (e) => {
    e.preventDefault();
  });
  $(document).on('click', () => {
    const popover = $(document).find('.popover');
    if (popover.length >= 1) {
      const id = popover.first().attr('id');
      $('#nubox-content-content').find(`[aria-describedBy="${id}"]`).popover('hide');
    }
  });

  $('#nubox-content-content').on('click', '#download-file-fake', () => {
    $('#nubox-content-content #download-file').click();
    $('#nubox-content-content .download-file-card > .list-group-flush').html('');
    $('#nubox-content-content .download-status').html('').css('visibility', 'hidden');
    $('#nubox-content-content .download-spinner').css('visibility', 'hidden');
  });
  $('#nubox-content-content').on('click', '#upload-file-fake', () => {
    $('#nubox-content-content #upload-file').click();
    $('#nubox-content-content .upload-file-card > .list-group-flush').html('');
    $('#nubox-content-content .upload-status').html('').css('visibility', 'hidden');
    $('#nubox-content-content .upload-spinner').css('visibility', 'hidden');
  });

  // Load initial page.
  Display.load();
  FS.init();
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
