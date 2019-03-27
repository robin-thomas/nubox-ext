const getKeysButton = document.getElementById('get-keys');

const getBobsKeys = () => {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({
      cmd: "bob_keys",
      args: [],
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

getKeysButton.onclick = async (ele) => {
  try {
    $('#popup-bek').val('');
    $('#popup-bvk').val('');

    const output = await getBobsKeys();

    $('#popup-bek').val(output.bek);
    $('#popup-bvk').val(output.bvk);

  } catch (err) {
    chrome.tabs.query({
      active: true,
      currentWindow: true
    }, (tabs) => {
      chrome.tabs.executeScript(
        tabs[0].id,
        { code: 'alert("' + err + '")' }
      );
    });
  }
};
