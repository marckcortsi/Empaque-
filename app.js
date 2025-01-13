let currentUser = null;
let sessionToken = null;
let disableAutoRefresh = false;

document.addEventListener("DOMContentLoaded", () => {
  const savedToken = localStorage.getItem("revko_token");
  const savedUser = localStorage.getItem("revko_user");
  if (savedToken && savedUser) {
    sessionToken = savedToken;
    currentUser = JSON.parse(savedUser);
    document.getElementById("login-section").style.display = "none";
    document.getElementById("main-content").style.display = "block";
    document.getElementById("sidebar").classList.add("show");
    setupMenuByRole(currentUser.tipo);
    mostrarFotoYNombre(currentUser);
    refreshAllSections();
  }

  const toggleSidebarBtn = document.getElementById("toggleSidebarBtn");
  if (toggleSidebarBtn) {
    toggleSidebarBtn.addEventListener("click", () => {
      document.getElementById("sidebar").classList.toggle("show");
    });
  }

  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const usuario = document.getElementById("usuario").value.trim();
      const password = document.getElementById("password").value.trim();
      try {
        const resp = await fetch("/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ usuario, password }),
        });
        const data = await resp.json();
        if (data.ok) {
          currentUser = data.user;
          sessionToken = btoa(usuario + ":" + password + ":" + Date.now());
          localStorage.setItem("revko_token", sessionToken);
          localStorage.setItem("revko_user", JSON.stringify(currentUser));
          document.getElementById("login-section").style.display = "none";
          document.getElementById("main-content").style.display = "block";
          document.getElementById("sidebar").classList.add("show");
          setupMenuByRole(currentUser.tipo);
          mostrarFotoYNombre(currentUser);
          refreshAllSections();
        } else {
          document.getElementById("flash-messages").innerHTML = `<p class="error">${data.msg}</p>`;
        }
      } catch {}
    });
  }

  const btnLogout = document.getElementById("btnLogout");
  if (btnLogout) {
    btnLogout.addEventListener("click", async () => {
      try {
        const resp = await fetch("/api/logout", { method: "POST" });
        const data = await resp.json();
        if (data.ok) {
          sessionToken = null;
          currentUser = null;
          localStorage.removeItem("revko_token");
          localStorage.removeItem("revko_user");
          document.getElementById("login-section").style.display = "block";
          document.getElementById("main-content").style.display = "none";
          document.getElementById("sidebar").classList.remove("show");
          document.getElementById("flash-messages").innerHTML = "<p>SESIÓN CERRADA</p>";
        }
      } catch {}
    });
  }

  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".section-container").forEach((sec) => {
        sec.style.display = "none";
      });
      const target = btn.getAttribute("data-target");
      document.getElementById(target).style.display = "block";
      document.getElementById("sidebar").classList.remove("show");
    });
  });

  document.getElementById("btnRegistrarPedido")?.addEventListener("click", async () => {
    const nuevoPedido = document.getElementById("pedido-nuevo").value.trim();
    if (!nuevoPedido) return;
    if (!confirm(`REGISTRAR PEDIDO ${nuevoPedido}?`)) return;
    try {
      const resp = await fetch("/api/pedidos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ numero: nuevoPedido }),
      });
      const data = await resp.json();
      alert(data.msg);
      document.getElementById("pedido-nuevo").value = "";
      refreshPedidos();
      refreshSurtido();
    } catch {}
  });

  let trackingIdSurtido = null;
  const btnComenzarSurtido = document.getElementById("btnComenzarSurtido");
  const surtidoForm = document.getElementById("surtido-form");
  const surtidoPedidoNum = document.getElementById("surtido-pedido-num");
  const surtidoFechaHoraIni = document.getElementById("surtido-fecha-hora-ini");
  const surtidoObservaciones = document.getElementById("surtido-observaciones");
  const btnFinalizarSurtido = document.getElementById("btnFinalizarSurtido");

  btnComenzarSurtido?.addEventListener("click", async () => {
    const numeroPedido = prompt("INGRESA EL NÚMERO DE PEDIDO A SURTIR:");
    if (!numeroPedido) return;
    if (!confirm(`¿ESTÁS SEGURO DE COMENZAR EL PEDIDO ${numeroPedido}?`)) return;
    try {
      const ahora = new Date();
      const resp = await fetch("/api/surtido/comenzar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pedido_numero: numeroPedido }),
      });
      const data = await resp.json();
      alert(data.msg);
      if (data.ok) {
        surtidoForm.style.display = "block";
        surtidoPedidoNum.innerText = numeroPedido;
        surtidoFechaHoraIni.innerText = ahora.toLocaleString();
        surtidoObservaciones.value = "";
        refreshSurtido();
        refreshPedidos();
      }
    } catch {}
  });

  btnFinalizarSurtido?.addEventListener("click", async () => {
    if (!trackingIdSurtido) {
      alert("NO SE ENCONTRÓ TRACKING_ID EN PROGRESO.");
      return;
    }
    if (!confirm("¿FINALIZAR Y ENTREGAR PEDIDO AL ÁREA DE EMPAQUE?")) return;
    const obs = surtidoObservaciones.value.trim();
    try {
      const resp = await fetch("/api/surtido/finalizar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tracking_id: trackingIdSurtido, observaciones: obs }),
      });
      const data = await resp.json();
      alert(data.msg);
      surtidoForm.style.display = "none";
      refreshSurtido();
      refreshPedidos();
      refreshEmpaque();
    } catch {}
  });

  let trackingIdEmpaque = null;
  const btnComenzarEmpaque = document.getElementById("btnComenzarEmpaque");
  const empaqueForm = document.getElementById("empaque-form");
  const empaquePedidoNum = document.getElementById("empaque-pedido-num");
  const empaqueFechaHoraIni = document.getElementById("empaque-fecha-hora-ini");
  const empaqueCajas = document.getElementById("empaque-cajas");
  const empaquePallets = document.getElementById("empaque-pallets");
  const empaqueEstatus = document.getElementById("empaque-estatus");
  const empaqueObservaciones = document.getElementById("empaque-observaciones");
  const btnFinalizarEmpaque = document.getElementById("btnFinalizarEmpaque");

  btnComenzarEmpaque?.addEventListener("click", async () => {
    const numeroPedido = prompt("INGRESA EL NÚMERO DE PEDIDO A EMPACAR:");
    if (!numeroPedido) return;
    if (!confirm(`¿COMENZAR EMPAQUE DEL PEDIDO ${numeroPedido}?`)) return;
    try {
      const ahora = new Date();
      const resp = await fetch("/api/empaque/comenzar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pedido_numero: numeroPedido }),
      });
      const data = await resp.json();
      alert(data.msg);
      if (data.ok) {
        empaqueForm.style.display = "block";
        empaquePedidoNum.innerText = numeroPedido;
        empaqueFechaHoraIni.innerText = ahora.toLocaleString();
        empaqueCajas.value = "0";
        empaquePallets.value = "0";
        empaqueEstatus.value = "COMPLETO";
        empaqueObservaciones.value = "";
        refreshEmpaque();
      }
    } catch {}
  });

  btnFinalizarEmpaque?.addEventListener("click", async () => {
    if (!trackingIdEmpaque) {
      alert("NO SE ENCONTRÓ TRACKING_ID EN PROGRESO.");
      return;
    }
    if (!confirm("¿FINALIZAR EL EMPAQUE DE ESTE PEDIDO?")) return;
    const cajas = empaqueCajas.value.trim() || "0";
    const pallets = empaquePallets.value.trim() || "0";
    const estatus = empaqueEstatus.value;
    const observ = empaqueObservaciones.value.trim();
    try {
      const resp = await fetch("/api/empaque/finalizar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tracking_id: trackingIdEmpaque,
          cajas,
          pallets,
          estatus,
          observaciones: observ
        }),
      });
      const data = await resp.json();
      alert(data.msg);
      empaqueForm.style.display = "none";
      refreshEmpaque();
      manualRefreshEmbarque();
    } catch {}
  });

  let trackingIdEmbarque = null;
  const embarqueForm = document.getElementById("embarque-form");
  const embarqueEntregaLocal = document.getElementById("embarque-entrega-local");
  const embarquePedidoNum = document.getElementById("embarque-pedido-num");
  const embarquePedidoNum2 = document.getElementById("embarque-pedido-num-2");
  const embarqueTipoSalida = document.getElementById("embarque-tipo-salida");
  const embarqueFechaCita = document.getElementById("embarque-fecha-cita");
  const embarqueObservaciones = document.getElementById("embarque-observaciones");
  const btnConfirmarSalida = document.getElementById("btnConfirmarSalida");
  const embarqueLocalExtra = document.getElementById("embarque-local-extra");
  const embarqueObsEntrega = document.getElementById("embarque-observaciones-entrega");
  const btnConfirmarEntregaLocal = document.getElementById("btnConfirmarEntregaLocal");

  embarqueTipoSalida?.addEventListener("change", () => {
    if (embarqueTipoSalida.value.toLowerCase() === "local") {
      embarqueLocalExtra.style.display = "block";
    } else {
      embarqueLocalExtra.style.display = "none";
    }
  });

  btnConfirmarSalida?.addEventListener("click", async () => {
    if (!trackingIdEmbarque) {
      alert("NO SE ENCONTRÓ TRACKING_ID EN EMBARQUE.");
      return;
    }
    const tipo_salida = embarqueTipoSalida.value.toLowerCase();
    const obs_sal = embarqueObservaciones.value.trim();
    const f_cita = embarqueFechaCita.value || "";
    try {
      const resp = await fetch("/api/embarque/confirmar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tracking_id: trackingIdEmbarque,
          tipo_salida,
          observaciones_salida: obs_sal,
          fecha_cita: f_cita
        }),
      });
      const data = await resp.json();
      alert(data.msg);
      embarqueForm.style.display = "none";
      manualRefreshEmbarque();
    } catch {}
  });

  btnConfirmarEntregaLocal?.addEventListener("click", async () => {
    if (!trackingIdEmbarque) {
      alert("NO SE ENCONTRÓ TRACKING_ID LOCAL PENDIENTE.");
      return;
    }
    const obsEnt = embarqueObsEntrega.value.trim();
    try {
      const resp = await fetch("/api/embarque/entrega_local", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tracking_id: trackingIdEmbarque,
          observaciones_entrega: obsEnt
        }),
      });
      const data = await resp.json();
      alert(data.msg);
      embarqueEntregaLocal.style.display = "none";
      manualRefreshEmbarque();
    } catch {}
  });

  setInterval(() => {
    if (currentUser && !disableAutoRefresh) {
      refreshPedidos();
      refreshSurtido();
      refreshEmpaque();
      refreshDashboard();
      refreshConfigUsuarios();
    }
  }, 3000);

  function refreshAllSections() {
    refreshPedidos();
    refreshSurtido();
    refreshEmpaque();
    refreshDashboard();
    refreshConfigUsuarios();
    manualRefreshEmbarque();
  }

  function manualRefreshEmbarque() {
    refreshEmbarque();
  }

  async function refreshPedidos() {
    try {
      const resp = await fetch("/api/pedidos");
      const data = await resp.json();
      const cont = document.getElementById("pedidos-lista");
      if (!cont) return;
      let html = "<h3>LISTADO DE PEDIDOS</h3>";
      if (data.length===0) {
        html += "<p>NO HAY PEDIDOS REGISTRADOS</p>";
      } else {
        html += `<div class="table-wrapper"><table>
          <tr><th>PEDIDO</th><th>USUARIO</th><th>FECHA</th><th>HORA</th></tr>`;
        data.forEach((p) => {
          html += `<tr>
            <td>${p.numero}</td>
            <td>${p.usuario_registro}</td>
            <td>${p.fecha_registro}</td>
            <td>${p.hora_registro}</td>
          </tr>`;
        });
        html += "</table></div>";
      }
      cont.innerHTML = html;
    } catch {}
  }

  async function refreshSurtido() {
    try {
      const resp = await fetch("/api/surtido/disponibles");
      const data = await resp.json();
      const cont = document.getElementById("surtido-disponibles");
      if (!cont) return;
      let html = "<h3>PEDIDOS DISPONIBLES PARA SURTIR</h3>";
      if (data.length===0) {
        html += "<p>NO HAY PEDIDOS REGISTRADOS PARA SURTIR</p>";
      } else {
        html += `<div class="table-wrapper"><table>
          <tr><th>PEDIDO</th><th>FECHA</th><th>HORA</th></tr>`;
        data.forEach((p) => {
          html += `<tr>
            <td>${p.numero}</td>
            <td>${p.fecha_registro}</td>
            <td>${p.hora_registro}</td>
          </tr>`;
        });
        html += "</table></div>";
      }
      cont.innerHTML = html;
    } catch {}

    try {
      const resp = await fetch("/api/surtido/enprogreso");
      const data = await resp.json();
      const cont = document.getElementById("surtido-enprogreso");
      if (!cont) return;
      let html = "<h3>PEDIDOS EN PROGRESO DE SURTIDO</h3>";
      if (data.length===0) {
        html += "<p>NO TIENES PEDIDOS EN PROGRESO DE SURTIDO</p>";
        trackingIdSurtido = null;
      } else {
        html += `<div class="table-wrapper"><table>
          <tr><th>TRACKINGID</th><th>PEDIDO</th><th>INICIO</th><th>OBSERVACIONES</th></tr>`;
        data.forEach((sp) => {
          html += `<tr>
            <td>${sp.tracking_id}</td>
            <td>${sp.numero}</td>
            <td>${sp.fecha_inicio} ${sp.hora_inicio}</td>
            <td>${sp.observaciones||""}</td>
          </tr>`;
          trackingIdSurtido = sp.tracking_id;
        });
        html += "</table></div>";
      }
      cont.innerHTML = html;
    } catch {}
  }

  async function refreshEmpaque() {
    try {
      const resp = await fetch("/api/empaque/disponibles");
      const data = await resp.json();
      const cont = document.getElementById("empaque-disponibles");
      if (!cont) return;
      let html = "<h3>PEDIDOS PARA EMPACAR</h3>";
      if (data.length===0) {
        html += "<p>NO HAY PEDIDOS POR EMPACAR</p>";
      } else {
        html += `<div class="table-wrapper"><table>
          <tr><th>PEDIDO</th><th>FIN SURTIDO</th></tr>`;
        data.forEach((e) => {
          html += `<tr>
            <td>${e.numero}</td>
            <td>${e.fecha_fin} ${e.hora_fin}</td>
          </tr>`;
        });
        html += "</table></div>";
      }
      cont.innerHTML = html;
    } catch {}

    try {
      const resp = await fetch("/api/empaque/enprogreso");
      const data = await resp.json();
      const cont = document.getElementById("empaque-enprogreso");
      if (!cont) return;
      let html = "<h3>PEDIDOS EN PROGRESO DE EMPAQUE</h3>";
      if (data.length===0) {
        html += "<p>NO TIENES PEDIDOS EN PROGRESO DE EMPAQUE</p>";
        trackingIdEmpaque = null;
      } else {
        html += `<div class="table-wrapper"><table>
          <tr><th>TRACKINGID</th><th>PEDIDO</th><th>INICIO</th><th>CAJAS</th><th>PALLETS</th><th>ESTATUS</th><th>OBSERVACIONES</th></tr>`;
        data.forEach((ep) => {
          html += `<tr>
            <td>${ep.tracking_id}</td>
            <td>${ep.numero}</td>
            <td>${ep.fecha_inicio} ${ep.hora_inicio}</td>
            <td>${ep.cajas}</td>
            <td>${ep.pallets}</td>
            <td>${ep.estatus}</td>
            <td>${ep.observaciones||""}</td>
          </tr>`;
          trackingIdEmpaque = ep.tracking_id;
        });
        html += "</table></div>";
      }
      cont.innerHTML = html;
    } catch {}
  }

  async function refreshEmbarque() {
    try {
      const resp = await fetch("/api/embarque/disponibles");
      const data = await resp.json();
      const cont = document.getElementById("embarque-pendientes");
      if (!cont) return;
      let html = "<h3>PEDIDOS PENDIENTES POR CONFIRMAR SALIDA/ENTREGA</h3>";
      if (data.length===0) {
        html += "<p>NO HAY PEDIDOS PENDIENTES POR CONFIRMAR SALIDA</p>";
      } else {
        html += `<div class="table-wrapper"><table>
          <tr><th>TRACKINGID</th><th>PEDIDO</th><th>FIN EMPAQUE</th><th>CAJAS</th><th>PALLETS</th><th>ESTATUS</th><th>OBS EMPAQUE</th><th>ACCIÓN</th></tr>`;
        data.forEach((de) => {
          html += `<tr>
            <td>${de.tracking_id}</td>
            <td>${de.numero}</td>
            <td>${de.fecha_fin} ${de.hora_fin}</td>
            <td>${de.cajas}</td>
            <td>${de.pallets}</td>
            <td>${de.estatus}</td>
            <td>${de.observaciones||""}</td>
            <td>
              ${(!de.tipo_salida || de.tipo_salida==="") 
                ? `<button class="btn" onclick="seleccionarEmbarque(${de.tracking_id},'${de.numero}')">CONFIRMAR SALIDA</button>` 
                : ""}
              ${de.tipo_salida==='local-pendiente' 
                ? `<button class="btn" onclick="seleccionarEntregaLocal(${de.tracking_id},'${de.numero}')">CONFIRMA ENTREGA</button>` 
                : ""}
            </td>
          </tr>`;
        });
        html += "</table></div>";
      }
      cont.innerHTML = html;
    } catch {}
  }

  window.seleccionarEmbarque = function(tid, numero) {
    trackingIdEmbarque = tid;
    embarquePedidoNum.innerText = numero;
    embarqueForm.style.display = "block";
    embarqueEntregaLocal.style.display = "none";
  };

  window.seleccionarEntregaLocal = function(tid, numero) {
    trackingIdEmbarque = tid;
    embarquePedidoNum2.innerText = numero;
    embarqueForm.style.display = "none";
    embarqueEntregaLocal.style.display = "block";
  };

  async function refreshReportes() {
    const pedido = document.getElementById("filtro-pedido").value.trim();
    const fechaIni = document.getElementById("filtro-fecha-inicial").value;
    const fechaFin = document.getElementById("filtro-fecha-final").value;
    const usuario = document.getElementById("filtro-usuario").value;
    try {
      const params = new URLSearchParams({
        pedido,
        fecha_ini: fechaIni,
        fecha_fin: fechaFin,
        usuario
      });
      const resp = await fetch(`/api/reportes?${params.toString()}`);
      const data = await resp.json();
      const cont = document.getElementById("reportes-container");
      if (!cont) return;
      let html = "<h3>RESULTADOS DE REPORTE</h3>";
      if (data.length===0) {
        html += "<p>NO HAY RESULTADOS</p>";
      } else {
        html += `<div class="table-wrapper"><table>
          <tr>
            <th>PEDIDO</th><th>IMPRESIÓN</th><th>SURTIDOR</th><th>SURTIDO INICIO</th><th>SURTIDO FIN</th><th>TIEMPO SURTIDO</th><th>OBS SURTIDO</th>
            <th>EMPAQUE USER</th><th>EMPAQUE INICIO</th><th>EMPAQUE FIN</th><th>TIEMPO EMPAQUE</th><th>CAJAS</th><th>PALLETS</th>
            <th>ESTATUS</th><th>OBS EMPAQUE</th><th>SALIDA FECHA/HORA</th><th>TIPO SALIDA</th><th>OBS SALIDA</th><th>TIEMPO TOTAL</th>
          </tr>`;
        data.forEach((r) => {
          html += `<tr>
            <td>${r.pedido}</td>
            <td>${r.impresion_fecha}</td>
            <td>${r.surtidor}</td>
            <td>${r.surtido_inicio}</td>
            <td>${r.surtido_fin}</td>
            <td>${r.surtido_tiempo}</td>
            <td>${r.surtido_observ}</td>
            <td>${r.empaque_user}</td>
            <td>${r.empaque_inicio}</td>
            <td>${r.empaque_fin}</td>
            <td>${r.empaque_tiempo}</td>
            <td>${r.empaque_cajas}</td>
            <td>${r.empaque_pallets}</td>
            <td>${r.empaque_estatus}</td>
            <td>${r.empaque_observ}</td>
            <td>${r.salida_fecha}</td>
            <td>${r.salida_tipo}</td>
            <td>${r.salida_observ}</td>
            <td>${r.tiempo_total||""}</td>
          </tr>`;
        });
        html += "</table></div>";
      }
      cont.innerHTML = html;
    } catch {}
  }

  function exportarReportesCSV() {
    const cont = document.getElementById("reportes-container");
    if (!cont) return;
    const rows = Array.from(cont.querySelectorAll("table tr"));
    let csv = [];
    rows.forEach((row) => {
      let cols = Array.from(row.querySelectorAll("th, td")).map((cell) =>
        cell.innerText.replace(/,/g, " ")
      );
      csv.push(cols.join(","));
    });
    let csvContent = "data:text/csv;charset=utf-8," + csv.join("\n");
    let encodedUri = encodeURI(csvContent);
    let link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "reportes_revko.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  async function refreshDashboard() {
    const now = new Date();
    const dias = ["DOMINGO","LUNES","MARTES","MIÉRCOLES","JUEVES","VIERNES","SÁBADO"];
    const meses = ["ENERO","FEBRERO","MARZO","ABRIL","MAYO","JUNIO","JULIO","AGOSTO","SEPTIEMBRE","OCTUBRE","NOVIEMBRE","DICIEMBRE"];
    const diaSemana = dias[now.getDay()];
    const diaNum = now.getDate();
    const mes = meses[now.getMonth()];
    const anio = now.getFullYear();
    document.getElementById("fecha-actual").innerText = `${diaSemana} ${diaNum} DE ${mes} DEL ${anio}`;
    document.getElementById("hora-actual").innerText = now.toLocaleTimeString();
    try {
      const resp = await fetch("/api/dashboard");
      const data = await resp.json();
      const cont = document.getElementById("dashboard-info");
      if (!cont) return;
      let html = `
        <ul style="list-style:none; padding:0;">
          <li><strong>TOTAL PEDIDOS:</strong> ${data.total_pedidos}</li>
      `;
      let pendSurtirClass = data.pendientes_surtir===0 ? "color-verde" : "color-rojo";
      let pendEmpaqueClass = data.pendientes_empaque===0 ? "color-verde" : "color-rojo";
      let pendEmbarcarClass = data.pendientes_embarcar===0 ? "color-verde" : "color-rojo";
      html += `
          <li style="font-weight:bold; font-size:1.1rem;" class="${pendSurtirClass}">
            PENDIENTES SURTIR: ${data.pendientes_surtir}
          </li>
          <li style="font-weight:bold; font-size:1.1rem;" class="${pendEmpaqueClass}">
            PENDIENTES EMPACAR: ${data.pendientes_empaque}
          </li>
          <li style="font-weight:bold; font-size:1.1rem;" class="${pendEmbarcarClass}">
            PENDIENTES EMBARCAR: ${data.pendientes_embarcar}
          </li>
        </ul>
        <h4>SURTIDORES</h4>
        <div class="table-wrapper">
          <table>
            <tr><th>USUARIO</th><th>FOTO</th><th>PEDIDOS SURTIDOS</th><th>INCIDENCIAS</th><th>TIEMPO PROMEDIO</th></tr>
      `;
      data.surtidores.forEach((s) => {
        const foto = s.foto ? `<img src="/fotos/${s.foto}" style="width:40px; height:40px; border-radius:50%; object-fit:cover;" />` : "";
        html += `<tr>
          <td>${s.usuario}</td>
          <td>${foto}</td>
          <td>${s.cantidad}</td>
          <td>${s.incidencias||0}</td>
          <td>${s.tiempo_promedio||"0:00"}</td>
        </tr>`;
      });
      html += `</table></div>
        <h4>EMPACADORES</h4>
        <div class="table-wrapper">
          <table>
            <tr><th>USUARIO</th><th>FOTO</th><th>PEDIDOS EMPACADOS</th><th>CAJAS</th><th>PALLETS</th><th>TIEMPO PROMEDIO</th></tr>
      `;
      data.empacadores.forEach((e) => {
        const foto = e.foto ? `<img src="/fotos/${e.foto}" style="width:40px; height:40px; border-radius:50%; object-fit:cover;" />` : "";
        html += `<tr>
          <td>${e.usuario}</td>
          <td>${foto}</td>
          <td>${e.cantidad}</td>
          <td>${e.sum_cajas||0}</td>
          <td>${e.sum_pallets||0}</td>
          <td>${e.tiempo_promedio||"0:00"}</td>
        </tr>`;
      });
      html += `</table></div>`;
      cont.innerHTML = html;
      const ctx = document.getElementById("dashboardChart");
      if (ctx) {
        new Chart(ctx, {
          type: "pie",
          data: {
            labels: ["PEND. SURTIR", "PEND. EMPACAR", "PEND. EMBARCAR"],
            datasets: [{
              data: [
                data.pendientes_surtir,
                data.pendientes_empaque,
                data.pendientes_embarcar
              ],
              backgroundColor: ["#ff6384", "#36a2eb", "#ffce56"]
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false
          }
        });
      }
      const dashExtra = document.getElementById("dashboard-extra");
      if (dashExtra) {
        dashExtra.innerHTML = `
          <h3>TIEMPO PROMEDIO (REGISTRO → SALIDA) EN ESTE MES</h3>
          <p>${data.tiempo_promedio_global}</p>
          <h3>PORCENTAJE DE CUMPLIMIENTO (<24H) ESTE MES</h3>
          <p>${data.cumplimiento_porcentaje}%</p>
        `;
      }
    } catch {}
  }

  document.getElementById("btnCrearUsuario")?.addEventListener("click", async () => {
    const nombre = document.getElementById("nuevo-usuario-nombre").value.trim();
    const pass = document.getElementById("nuevo-usuario-pass").value.trim();
    const tipo = document.getElementById("nuevo-usuario-tipo").value;
    const fileInput = document.getElementById("nuevo-usuario-foto");
    if (!nombre || !pass || !tipo) {
      alert("FALTAN CAMPOS");
      return;
    }
    try {
      let formData = new FormData();
      formData.append("nombre", nombre);
      formData.append("password", pass);
      formData.append("tipo", tipo);
      if (fileInput.files.length > 0) {
        formData.append("foto", fileInput.files[0]);
      }
      const resp = await fetch("/api/config/crear_usuario", {
        method: "POST",
        body: formData
      });
      const data = await resp.json();
      alert(data.msg);
      refreshConfigUsuarios();
    } catch {}
  });

  document.getElementById("btnDescargarDB")?.addEventListener("click", () => {
    window.open("/api/config/download_db", "_blank");
  });

  async function refreshConfigUsuarios() {
    if (disableAutoRefresh) return;
    try {
      const resp = await fetch("/api/config/usuarios");
      const data = await resp.json();
      const cont = document.getElementById("config-usuarios-lista");
      if (!cont) return;
      let html = "<h3>USUARIOS EXISTENTES</h3>";
      if (data.length===0) {
        html += "<p>NO HAY USUARIOS</p>";
      } else {
        html += `<div class="table-wrapper"><table>
          <tr><th>ID</th><th>NOMBRE</th><th>TIPO</th><th>FOTO</th><th>ACCIONES</th></tr>`;
        data.forEach((u) => {
          const foto = u.foto ? `<img src="/fotos/${u.foto}" style="width:40px; height:40px; border-radius:50%; object-fit:cover;" />` : "";
          html += `<tr>
            <td>${u.id}</td>
            <td>${u.nombre}</td>
            <td>${u.tipo}</td>
            <td>${foto}</td>
            <td>
              ${u.nombre!=="master" ? `
                <button class="btn" onclick="eliminarUsuario(${u.id})">ELIMINAR</button>
                <button class="btn" onclick="mostrarEditarUsuario(${u.id}, '${u.nombre}', '${u.tipo}', '${u.foto||''}')">EDITAR</button>
              ` : ""}
            </td>
          </tr>`;
        });
        html += "</table></div>";
        html += `
          <div id="edit-user-form" style="display:none; margin-top:1rem;">
            <h4>EDITAR USUARIO</h4>
            <input type="hidden" id="edit-user-id" />
            <label>NOMBRE:</label>
            <input type="text" id="edit-user-nombre" style="text-transform:none;" />
            <label>CONTRASEÑA:</label>
            <input type="text" id="edit-user-pass" style="text-transform:none;" />
            <label>TIPO:</label>
            <select id="edit-user-tipo">
              <option value="ADMINISTRATIVO">ADMINISTRATIVO</option>
              <option value="SURTIDO">SURTIDO</option>
              <option value="EMPAQUE">EMPAQUE</option>
              <option value="SUPERVISOR">SUPERVISOR</option>
              <option value="GERENTE">GERENTE</option>
            </select>
            <br />
            <label>NUEVA FOTO (.JPG):</label>
            <input type="file" id="edit-user-foto" accept="image/jpeg" style="text-transform:none;" />
            <br />
            <button class="btn" onclick="guardarEdicionUsuario()">GUARDAR CAMBIOS</button>
            <button class="btn" onclick="cancelarEdicionUsuario()">CANCELAR</button>
          </div>
        `;
      }
      cont.innerHTML = html;
    } catch {}
  }

  window.eliminarUsuario = async function(id) {
    if (!confirm("¿SEGURO QUE DESEAS ELIMINAR ESTE USUARIO?")) return;
    try {
      const resp = await fetch("/api/config/eliminar_usuario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: id }),
      });
      const data = await resp.json();
      alert(data.msg);
      refreshConfigUsuarios();
    } catch {}
  };

  window.mostrarEditarUsuario = function(id, nombre, tipo, foto) {
    disableAutoRefresh = true;
    document.getElementById("edit-user-form").style.display = "block";
    document.getElementById("edit-user-id").value = id;
    document.getElementById("edit-user-nombre").value = nombre;
    document.getElementById("edit-user-tipo").value = tipo;
    document.getElementById("edit-user-pass").value = "";
  };

  window.cancelarEdicionUsuario = function() {
    document.getElementById("edit-user-form").style.display = "none";
    disableAutoRefresh = false;
  };

  window.guardarEdicionUsuario = async function() {
    const id = document.getElementById("edit-user-id").value;
    const nombre = document.getElementById("edit-user-nombre").value.trim();
    const pass = document.getElementById("edit-user-pass").value.trim();
    const tipo = document.getElementById("edit-user-tipo").value;
    const fileInput = document.getElementById("edit-user-foto");
    if (!nombre) {
      alert("EL NOMBRE ES REQUERIDO.");
      return;
    }
    try {
      let formData = new FormData();
      formData.append("user_id", id);
      formData.append("nombre", nombre);
      formData.append("password", pass);
      formData.append("tipo", tipo);
      if (fileInput.files.length > 0) {
        formData.append("foto", fileInput.files[0]);
      }
      const resp = await fetch("/api/config/editar_usuario", {
        method: "POST",
        body: formData
      });
      const data = await resp.json();
      alert(data.msg);
      if (data.ok) {
        document.getElementById("edit-user-form").style.display = "none";
        disableAutoRefresh = false;
        refreshConfigUsuarios();
      }
    } catch {}
  };

  function setupMenuByRole(tipo) {
    document.getElementById("menu-pedidos").style.display = "none";
    document.getElementById("menu-surtido").style.display = "none";
    document.getElementById("menu-empaque").style.display = "none";
    document.getElementById("menu-embarque").style.display = "none";
    document.getElementById("menu-reportes").style.display = "none";
    document.getElementById("menu-dashboard").style.display = "none";
    document.getElementById("menu-config").style.display = "none";

    if (["master","gerente","administrativo"].includes(tipo.toLowerCase())) {
      document.getElementById("menu-pedidos").style.display = "block";
    }
    if (["master","gerente","supervisor","surtido"].includes(tipo.toLowerCase())) {
      document.getElementById("menu-surtido").style.display = "block";
    }
    if (["master","gerente","supervisor","surtido","empaque"].includes(tipo.toLowerCase())) {
      document.getElementById("menu-empaque").style.display = "block";
    }
    if (["master","gerente","supervisor"].includes(tipo.toLowerCase())) {
      document.getElementById("menu-embarque").style.display = "block";
    }
    if (["master","gerente","surtido","empaque","administrativo","supervisor"].includes(tipo.toLowerCase())) {
      document.getElementById("menu-reportes").style.display = "block";
      document.getElementById("menu-dashboard").style.display = "block";
    }
    if (tipo.toLowerCase()==="master") {
      document.getElementById("menu-config").style.display = "block";
    }
  }

  function mostrarFotoYNombre(user) {
    const userFotoElem = document.getElementById("userFoto");
    const userNombreElem = document.getElementById("userNombre");
    if (!userFotoElem || !userNombreElem) return;
    userFotoElem.style.display = "none";
    userFotoElem.src = "";
    userNombreElem.innerText = user.nombre.toUpperCase();
    if (user.foto) {
      userFotoElem.src = "/fotos/" + user.foto;
      userFotoElem.style.display = "block";
    }
  }

  document.getElementById("btnFiltrarReportes")?.addEventListener("click", () => {
    refreshReportes();
  });

  document.getElementById("btnLimpiarFiltro")?.addEventListener("click", () => {
    document.getElementById("filtro-pedido").value = "";
    document.getElementById("filtro-fecha-inicial").value = "";
    document.getElementById("filtro-fecha-final").value = "";
    document.getElementById("filtro-usuario").value = "";
    refreshReportes();
  });

  document.getElementById("btnExportarExcel")?.addEventListener("click", () => {
    exportarReportesCSV();
  });
});
