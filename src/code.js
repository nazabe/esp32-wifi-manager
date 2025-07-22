// save some bytes
const gel = (e) => document.getElementById(e);

const wifi_div = gel("wifi");
const connect_div = gel("connect");
const connect_manual_div = gel("connect_manual");
const connect_wait_div = gel("connect-wait");
const connect_details_div = gel("connect-details");

function docReady(fn) {
  // see if DOM is already available
  if (
    document.readyState === "complete" ||
    document.readyState === "interactive"
  ) {
    // call on next available tick
    setTimeout(fn, 1);
  } else {
    document.addEventListener("DOMContentLoaded", fn);
  }

  // --- Logic for Credits ---

  const credits_div = gel("credits");
  const licensesLink = gel("view-licenses-link");

  licensesLink.addEventListener('click', (event) => {
    event.preventDefault();
    wifi_div.style.display = 'none';
    credits_div.style.display = 'block';
  });

  gel('ok-credits').addEventListener('click', () => {
    credits_div.style.display = 'none';
    wifi_div.style.display = 'block';
  });
}

var selectedSSID = "";
var refreshAPInterval = null;
var checkStatusInterval = null;

function stopCheckStatusInterval() {
  if (checkStatusInterval != null) {
    clearInterval(checkStatusInterval);
    checkStatusInterval = null;
  }
}

function stopRefreshAPInterval() {
  if (refreshAPInterval != null) {
    clearInterval(refreshAPInterval);
    refreshAPInterval = null;
  }
}

function startCheckStatusInterval() {
  checkStatusInterval = setInterval(checkStatus, 950);
}

function startRefreshAPInterval() {
  refreshAPInterval = setInterval(refreshAP, 3800);
}

// Función para el toggle de la contraseña
function setupPasswordToggle(toggleBtnId, passwordInputId) {
  const toggleBtn = gel(toggleBtnId);
  const passwordInput = gel(passwordInputId);

  toggleBtn.addEventListener('click', () => {
    // Toggle el tipo de input
    const isPassword = passwordInput.type === 'password';
    passwordInput.type = isPassword ? 'text' : 'password';

    // Toggle la clase del icono
    toggleBtn.classList.toggle('toggle-password-eye');
    toggleBtn.classList.toggle('toggle-password-eye-slash');
  });
}


docReady(async function () {
  gel("wifi-status").addEventListener(
    "click",
    () => {
      wifi_div.style.display = "none";
      document.getElementById("connect-details").style.display = "block";
    },
    false
  );

  gel("manual_add").addEventListener(
    "click",
    (e) => {
      selectedSSID = e.target.innerText;

      gel("ssid-pwd").textContent = selectedSSID;
      wifi_div.style.display = "none";
      connect_manual_div.style.display = "block";
      connect_div.style.display = "none";

      gel("connect-success").display = "none";
      gel("connect-fail").display = "none";
    },
    false
  );

  gel("wifi-list").addEventListener(
    "click",
    (e) => {
      if (e.target.closest('.ape')) {
        selectedSSID = e.target.closest('.ape').querySelector('div > div > div').innerText;
        gel("ssid-pwd").textContent = selectedSSID;
        connect_div.style.display = "block";
        wifi_div.style.display = "none";
      }
    },
    false
  );


  function cancel() {
    selectedSSID = "";
    connect_div.style.display = "none";
    connect_manual_div.style.display = "none";
    wifi_div.style.display = "block";
  }

  gel("cancel").addEventListener("click", cancel, false);

  gel("manual_cancel").addEventListener("click", cancel, false);

gel("join").addEventListener("click", () => {
    const errorContainer = gel("connect-error");
    errorContainer.style.display = "none";

    const password = gel("pwd").value;

    if (password.length < 8) {
        errorContainer.textContent = "La contraseña debe tener al menos 8 caracteres.";
        errorContainer.style.display = "block";
        return;
    }

    performConnect();
});

  gel("manual_join").addEventListener("click", (e) => {
    const errorContainer = gel("manual-connect-error");
    errorContainer.style.display = "none";

    const ssid = gel("manual_ssid").value.trim();
    const password = gel("manual_pwd").value;

    if (ssid === "") {
      errorContainer.textContent = "Por favor, introduce el nombre de la red.";
      errorContainer.style.display = "block";
      return;
    }

    if (password.length < 8) {
      errorContainer.textContent = "La contraseña debe tener al menos 8 caracteres.";
      errorContainer.style.display = "block";
      return;
    }

    performConnect("manual");
  });

  // Configurar los toggles de contraseña
  setupPasswordToggle('toggle_pwd', 'pwd');
  setupPasswordToggle('manual_toggle_pwd', 'manual_pwd');


  gel("ok-details").addEventListener(
    "click",
    () => {
      connect_details_div.style.display = "none";
      wifi_div.style.display = "block";
    },
    false
  );

  gel("ok-connect").addEventListener(
    "click",
    () => {
      connect_wait_div.style.display = "none";
      wifi_div.style.display = "block";
    },
    false
  );

  gel("disconnect").addEventListener(
    "click",
    async () => {
      stopCheckStatusInterval();
      selectedSSID = "";

      await fetch("connect.json", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ timestamp: Date.now() }),
      });

      startCheckStatusInterval();

      connect_details_div.style.display = "none";
      wifi_div.style.display = "block";
    }
  );


  //first time the page loads: attempt get the connection status and start the wifi scan
  await refreshAP();
  startCheckStatusInterval();
  startRefreshAPInterval();
});

async function performConnect(conntype) {
  //stop the status refresh. This prevents a race condition where a status
  //request would be refreshed with wrong ip info from a previous connection
  //and the request would automatically shows as succesful.
  stopCheckStatusInterval();

  //stop refreshing wifi list
  stopRefreshAPInterval();

  var pwd;
  if (conntype == "manual") {
    //Grab the manual SSID and PWD
    selectedSSID = gel("manual_ssid").value;
    pwd = gel("manual_pwd").value;
  } else {
    pwd = gel("pwd").value;
  }
  //reset connection
  gel("loading").style.display = "block";
  gel("connect-success").style.display = "none";
  gel("connect-fail").style.display = "none";

  gel("ok-connect").disabled = true;
  gel("ssid-wait").textContent = selectedSSID;
  connect_div.style.display = "none";
  connect_manual_div.style.display = "none";
  connect_wait_div.style.display = "block";

  await fetch("connect.json", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ "ssid": selectedSSID, "password": pwd }),
  });


  //now we can re-set the intervals regardless of result
  startCheckStatusInterval();
  startRefreshAPInterval();
}

function rssiToIcon(rssi) {
  if (rssi >= -60) {
    return "w0";
  } else if (rssi >= -67) {
    return "w1";
  } else if (rssi >= -75) {
    return "w2";
  } else {
    return "w3";
  }
}

async function refreshAP(url = "ap.json") {
  const wifiListSection = gel("wifi-list");
  const noNetworksSection = gel("no-networks-found");

  try {
    const res = await fetch(url);
    const access_points = await res.json();

    // Si se encuentran redes, muéstralas
    if (access_points && access_points.length > 0) {
      wifiListSection.style.display = 'block';
      noNetworksSection.style.display = 'none';

      access_points.sort((a, b) => {
        const x = a["rssi"];
        const y = b["rssi"];
        return x < y ? 1 : x > y ? -1 : 0;
      });
      refreshAPHTML(access_points);
    } else {
      // Si no se encuentran redes, muestra el mensaje de error
      wifiListSection.style.display = 'none';
      noNetworksSection.style.display = 'block';
    }
  } catch (e) {
    // Si hay un error en la comunicación, también muestra el mensaje
    console.info("No se pudo obtener /ap.json o estaba vacío.", e);
    wifiListSection.style.display = 'none';
    noNetworksSection.style.display = 'block';
  }
}

function refreshAPHTML(data) {
  var h = "";
  data.forEach(function (e, idx, array) {
    let ap_class = idx === array.length - 1 ? "" : " brdb";
    let rssicon = rssiToIcon(e.rssi);
    let auth = e.auth == 0 ? "" : "pw";
    h += `<div class="ape${ap_class}"><div class="${rssicon}"><div class="${auth}"><div>${e.ssid}</div></div></div></div>\n`;
  });

  gel("wifi-list").innerHTML = h;
}

async function checkStatus(url = "status.json") {
  try {
    var response = await fetch(url);
    var data = await response.json();
    if (data && data.hasOwnProperty("ssid") && data["ssid"] != "") {
      if (data["ssid"] === selectedSSID && data.hasOwnProperty("urc")) {
        // Attempting connection
        switch (data["urc"]) {
          case 0: // STA_CONNECTED
            console.info("Got connection!");
            gel("connected-to").innerHTML = `<div class="ape brdb"><div class="${rssiToIcon(data.rssi)}"><div class="pw"><div>${data.ssid}</div></div></div></div>`;
            gel("details-ssid").textContent = data["ssid"];
            gel("ip").textContent = data["ip"];
            gel("netmask").textContent = data["netmask"];
            gel("gw").textContent = data["gw"];
            gel("wifi-status").style.display = "block";

            //unlock the wait screen if needed
            gel("ok-connect").disabled = false;

            //update wait screen
            gel("loading").style.display = "none";
            gel("connect-success").style.display = "block";
            gel("connect-fail").style.display = "none";
            break;
          case 1: // STA_CONNECT_FAIL
            console.info("Connection attempt failed!");
            gel("wifi-status").style.display = "none";
            gel("ok-connect").disabled = false;
            gel("loading").style.display = "none";
            gel("connect-fail").style.display = "block";
            gel("connect-success").style.display = "none";
            break;
        }
      } else if (data.hasOwnProperty("urc") && data["urc"] === 0) {
        // ESP32 is already connected to a wifi
        if (gel("wifi-status").style.display === "none") {
          gel("connected-to").innerHTML = `<div class="ape brdb"><div class="${rssiToIcon(data.rssi)}"><div class="pw"><div>${data.ssid}</div></div></div></div>`;
          gel("details-ssid").textContent = data["ssid"];
          gel("ip").textContent = data["ip"];
          gel("netmask").textContent = data["netmask"];
          gel("gw").textContent = data["gw"];
          gel("wifi-status").style.display = "block";
        }
      }
    } else if (data.hasOwnProperty("urc") && data["urc"] === 2) { // STA_DISCONNECTED
      console.log("Station disconnected.");
      if (gel("wifi-status").style.display === "block") {
        gel("wifi-status").style.display = "none";
      }
    }
  } catch (e) {
    console.info("Was not able to fetch /status.json", e);
  }
}