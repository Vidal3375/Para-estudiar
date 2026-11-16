/* =====================================================================
   AUTODEFINIDO DE HISTORIA DE ESPAÑA · INTERFAZ
   ===================================================================== */
(function () {
  "use strict";

  var DATOS = window.AUTODEFINIDO;
  var CLAVE = "autodefinido_historia_v1";

  var NIVELES = {
    facil:   { nombre: "Fácil",       N: 9,  letras: Infinity, auto: true,  primera: true,  pista: "p",
               texto: "Tablero pequeño. La primera letra de cada palabra ya está puesta y los fallos se marcan al momento." },
    normal:  { nombre: "Normal",      N: 11, letras: 6,        auto: false, primera: false, pista: "p",
               texto: "Pistas sacadas de la definición. 6 letras de ayuda." },
    dificil: { nombre: "Difícil",     N: 13, letras: 3,        auto: false, primera: false, pista: "x",
               texto: "Pistas sacadas del contexto histórico (si el término no tiene contexto, de la definición). 3 letras de ayuda." },
    extremo: { nombre: "Muy difícil", N: 15, letras: 1,        auto: false, primera: false, pista: "x",
               texto: "Tablero grande y lleno, pistas del contexto e imágenes sin pie. Solo 1 letra de ayuda y cada comprobación cuenta." }
  };
  var TAMANOS = [["auto", "Según la dificultad"], ["9", "9 × 9"], ["11", "11 × 11"], ["13", "13 × 13"], ["15", "15 × 15"], ["20", "20 × 20 (pantalla grande)"]];

  var $ = function (s, el) { return (el || document).querySelector(s); };
  function el(tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt !== undefined) e.textContent = txt;
    return e;
  }

  /* ---------- Guardado (solo en este navegador) ---------- */
  function leer() { try { return JSON.parse(localStorage.getItem(CLAVE)) || {}; } catch (e) { return {}; } }
  function guardar() {
    try { localStorage.setItem(CLAVE, JSON.stringify({ opciones: opciones, partida: partida })); } catch (e) {}
  }

  var guardado = leer();
  var opciones = Object.assign({ desde: 0, hasta: DATOS.hojas.length - 1, nivel: "normal", tamano: "auto", imagenes: true },
                               guardado.opciones || {});
  var partida = guardado.partida || null;
  var seleccion = null;   // { e: índice de entrada, pos: índice de letra }
  var reloj = null;

  /* ---------- Letras ---------- */
  function normaliza(ch) {
    if (!ch) return "";
    ch = ch.toUpperCase();
    if (ch === "Ñ") return "Ñ";
    if (ch === "Ç") return "C";
    ch = ch.normalize("NFD").replace(/[̀-ͯ]/g, "");
    return /^[A-Z]$/.test(ch) ? ch : "";
  }
  function letrasDe(r) { return Array.from(r); }

  /* ---------- Crear partida ---------- */
  function terminosEnRango() {
    var a = Math.min(opciones.desde, opciones.hasta), b = Math.max(opciones.desde, opciones.hasta);
    return DATOS.terminos.filter(function (t) { return t.h >= a && t.h <= b; });
  }

  function crearPartida() {
    var nv = NIVELES[opciones.nivel];
    var N = opciones.tamano === "auto" ? nv.N : parseInt(opciones.tamano, 10);
    var lista = terminosEnRango();
    var porId = {};
    lista.forEach(function (t) { porId[t.id] = t; });
    // En el nivel fácil la primera letra viene puesta: las palabras de 2 letras saldrían resueltas.
    var minimo = nv.primera ? 3 : 2;
    lista = lista.filter(function (t) { return letrasDe(t.r).length >= minimo; });
    var palabras = lista.map(function (t) { return { id: t.id, r: letrasDe(t.r) }; });
    var imagenes = [];
    if (opciones.imagenes) {
      Object.keys(DATOS.imagenes).forEach(function (k) {
        var im = DATOS.imagenes[k];
        if (porId[im.termino]) imagenes.push({ id: im.termino, r: letrasDe(porId[im.termino].r), img: k });
      });
    }
    var t = window.GeneradorAutodefinido.generar(palabras, N, imagenes,
      { ms: N >= 15 ? 1400 : 900, rellenar: true });

    // Pasar el tablero a un formato sencillo de guardar.
    var celdas = t.c.map(function (x) {
      if (!x || x.k === "B") return { k: "X" };
      if (x.k === "L") return { k: "L", s: x.ch, v: "", en: x.en };
      if (x.k === "C") return { k: "C", defs: x.defs.slice() };
      return { k: "I", key: x.key, raiz: x.raiz };
    });
    var entradas = t.entradas.map(function (e) {
      var term = porId[e.w.id];
      var im = e.flecha.indexOf("img") === 0 ? DATOS.imagenes[e.w.img] : null;
      var pista;
      if (im) pista = nv.pista === "x" ? im.x : im.p;
      else pista = (nv.pista === "x" && term.x) ? term.x : term.p;
      return { id: term.id, r: e.r, c: e.c, dir: e.dir, flecha: e.flecha, cr: e.cr, cc: e.cc,
               L: letrasDe(term.r).length, pista: pista, img: im ? e.w.img : null };
    });
    // Numerar en orden de lectura de la casilla de definición.
    var orden = entradas.map(function (e, i) { return i; });
    orden.sort(function (a, b) {
      var A = entradas[a], B = entradas[b];
      return (A.cr * N + A.cc) - (B.cr * N + B.cc) || (A.dir === "h" ? -1 : 1);
    });
    orden.forEach(function (i, k) { entradas[i].n = k + 1; });
    // En el nivel fácil, la primera letra viene puesta.
    if (nv.primera) entradas.forEach(function (e) {
      var x = celdas[e.r * N + e.c]; x.v = x.s; x.fija = true;
    });
    partida = { N: N, nivel: opciones.nivel, desde: opciones.desde, hasta: opciones.hasta, celdas: celdas, entradas: entradas,
                ayudas: 0, comprobaciones: 0, segundos: 0, terminada: false, resuelta: false, creada: Date.now() };
    seleccion = null;
    guardar();
    pintarJuego();
    window.scrollTo(0, 0);
  }

  /* ---------- Utilidades del tablero ---------- */
  function celda(r, c) { return partida.celdas[r * partida.N + c]; }
  function posiciones(e) {
    var out = [];
    for (var i = 0; i < e.L; i++) out.push(e.dir === "h" ? [e.r, e.c + i] : [e.r + i, e.c]);
    return out;
  }
  function entradaCompleta(e) {
    return posiciones(e).every(function (p) { var x = celda(p[0], p[1]); return x.v === x.s; });
  }
  function todoBien() {
    return partida.celdas.every(function (x) { return x.k !== "L" || x.v === x.s; });
  }
  function todoLleno() {
    return partida.celdas.every(function (x) { return x.k !== "L" || x.v; });
  }

  /* ---------- Pintar: opciones ---------- */
  function pintarOpciones() {
    var f = $("#opciones");
    var sd = $("#desde", f), sh = $("#hasta", f);
    sd.innerHTML = ""; sh.innerHTML = "";
    DATOS.hojas.forEach(function (h, i) {
      var n = DATOS.terminos.filter(function (t) { return t.h === i; }).length;
      var o1 = el("option", "", h.etiqueta + " (" + n + ")"); o1.value = i;
      var o2 = el("option", "", h.etiqueta + " (" + n + ")"); o2.value = i;
      sd.appendChild(o1); sh.appendChild(o2);
    });
    sd.value = opciones.desde; sh.value = opciones.hasta;

    var niv = $("#niveles", f);
    niv.innerHTML = "";
    Object.keys(NIVELES).forEach(function (k) {
      var b = el("button", "segmento" + (opciones.nivel === k ? " activo" : ""), NIVELES[k].nombre);
      b.type = "button";
      b.setAttribute("aria-pressed", opciones.nivel === k);
      b.addEventListener("click", function () { opciones.nivel = k; guardar(); pintarOpciones(); });
      niv.appendChild(b);
    });
    $("#nivel-texto", f).textContent = NIVELES[opciones.nivel].texto;

    var st = $("#tamano", f);
    st.innerHTML = "";
    TAMANOS.forEach(function (t) { var o = el("option", "", t[1]); o.value = t[0]; st.appendChild(o); });
    st.value = opciones.tamano;
    $("#con-imagenes", f).checked = !!opciones.imagenes;
    actualizarResumen();
  }
  function actualizarResumen() {
    var n = terminosEnRango().length;
    var conImg = Object.keys(DATOS.imagenes).filter(function (k) {
      var id = DATOS.imagenes[k].termino;
      return terminosEnRango().some(function (t) { return t.id === id; });
    }).length;
    var txt = n + " términos en el rango elegido.";
    if (opciones.imagenes) txt += conImg ? " Hay " + conImg + " imágenes disponibles." : " En este rango no hay imágenes (solo las hay hasta 1876).";
    $("#resumen-rango").textContent = txt;
  }

  /* ---------- Pintar: juego ---------- */
  var FLECHA_TXT = { h1: "▸", h2: "↳", v1: "▾", v2: "↴", "img-h": "▸", "img-v": "▾" };

  function pintarJuego() {
    if (!partida) { mostrar("inicio"); return; }
    mostrar("juego");
    var nv = NIVELES[partida.nivel];
    var N = partida.N;
    $("#j-titulo").textContent = nv.nombre + " · " + DATOS.hojas[Math.min(partida.desde, partida.hasta)].etiqueta +
      (partida.desde !== partida.hasta ? " a " + DATOS.hojas[Math.max(partida.desde, partida.hasta)].etiqueta : "");

    var tab = $("#tablero");
    tab.innerHTML = "";
    tab.style.setProperty("--n", N);
    tab.classList.toggle("terminado", partida.terminada);

    // Flechas que llegan a cada primera letra.
    var llegadas = {};
    partida.entradas.forEach(function (e, i) {
      var k = e.r * N + e.c;
      (llegadas[k] = llegadas[k] || []).push(e.flecha);
    });

    partida.celdas.forEach(function (x, p) {
      var r = Math.floor(p / N), c = p % N;
      if (x.k === "I") {
        if (!x.raiz) return;
        var im = DATOS.imagenes[x.key];
        var b = el("button", "celda imagen");
        b.type = "button";
        b.style.gridArea = (r + 1) + " / " + (c + 1) + " / span 2 / span 2";
        var img = el("img");
        img.src = "img/" + im.img;
        img.alt = "Imagen de la pista";
        img.loading = "lazy";
        b.appendChild(img);
        b.addEventListener("click", function () { abrirImagen(x.key); });
        tab.appendChild(b);
        return;
      }
      var d = el("div", "celda");
      d.style.gridArea = (r + 1) + " / " + (c + 1);
      d.dataset.p = p;
      if (x.k === "X") d.classList.add("vacia");
      else if (x.k === "C") {
        d.classList.add("def");
        if (x.defs.length > 1) d.classList.add("doble");
        x.defs.forEach(function (ei) {
          var e = partida.entradas[ei];
          var s = el("span", "def-txt");
          s.dataset.e = ei;
          var num = el("b", "num", e.n);
          s.appendChild(num);
          s.appendChild(el("span", "in", e.pista));
          d.appendChild(s);
        });
        d.addEventListener("click", function () {
          var lista = x.defs;
          var cur = seleccion && lista.indexOf(seleccion.e);
          var sig = (cur === null || cur === -1 || cur === undefined) ? lista[0] : lista[(cur + 1) % lista.length];
          seleccionar(sig, 0);
        });
      } else {
        d.classList.add("letra");
        var v = el("span", "v", x.v || "");
        d.appendChild(v);
        if (x.fija) d.classList.add("fija");
        (llegadas[p] || []).forEach(function (f) {
          d.appendChild(el("i", "flecha f-" + f, FLECHA_TXT[f]));
        });
        d.addEventListener("click", function () { tocarLetra(r, c); });
      }
      tab.appendChild(d);
    });

    pintarLista();
    actualizarEstado();
    marcarSeleccion();
    ajustarTamano();
    arrancarReloj();
  }

  function pintarLista() {
    var ol = $("#lista");
    ol.innerHTML = "";
    var orden = partida.entradas.map(function (e, i) { return i; })
      .sort(function (a, b) { return partida.entradas[a].n - partida.entradas[b].n; });
    orden.forEach(function (i) {
      var e = partida.entradas[i];
      var li = el("li");
      li.dataset.e = i;
      var b = el("button", "pista-item");
      b.type = "button";
      b.appendChild(el("b", "num", e.n));
      b.appendChild(el("span", "flecha-lista", FLECHA_TXT[e.flecha]));
      if (e.img) b.appendChild(el("span", "etq", "imagen"));
      b.appendChild(document.createTextNode(" " + e.pista + " "));
      b.appendChild(el("span", "largo", "(" + e.L + ")"));
      b.addEventListener("click", function () { seleccionar(i, 0); enfocar(); });
      li.appendChild(b);
      ol.appendChild(li);
    });
  }

  function ajustarTamano() {
    var tab = $("#tablero"), N = partida.N;
    var ancho = $("#pista-activa").clientWidth || tab.parentElement.clientWidth;
    var tam = Math.max(22, Math.min(64, Math.floor((ancho - 2) / N)));
    // Con ratón (ordenador) las casillas pueden ser más grandes, sin pasar del alto de la ventana.
    if (window.matchMedia && window.matchMedia("(pointer: fine)").matches) {
      var porAlto = Math.max(56, Math.floor((window.innerHeight - 190) / N));
      tam = Math.max(22, Math.min(80, Math.floor((ancho - 2) / N), porAlto));
    }
    tab.style.setProperty("--tam", tam + "px");
    tab.classList.toggle("compacto", tam < 36);
    ajustarTextos(tam);
  }

  // Ajusta la letra de cada casilla de definición para que el texto quepa.
  // Si no cabe ni con la letra mínima, la casilla muestra solo el número.
  function ajustarTextos(tam) {
    var tab = $("#tablero");
    if (tab.classList.contains("compacto")) return;
    var max = Math.min(13, tam * 0.24), min = 8;
    tab.querySelectorAll(".celda.def").forEach(function (cel) {
      cel.classList.remove("solo-num");
      var spans = Array.prototype.slice.call(cel.querySelectorAll(".def-txt"));
      var doble = spans.length > 1;
      // Se mide el texto (.in), que no se recorta, frente al hueco disponible.
      function cabe() {
        return spans.every(function (s) {
          var t = s.querySelector(".in");
          var alto = doble ? s.clientHeight : cel.clientHeight - 2;
          return t.offsetHeight <= alto && t.scrollWidth <= s.clientWidth + 1;
        });
      }
      var f = max;
      spans.forEach(function (s) { s.style.fontSize = f + "px"; });
      while (!cabe() && f > min) {
        f = Math.max(min, f - 0.5);
        spans.forEach(function (s) { s.style.fontSize = f + "px"; });
      }
      if (!cabe()) cel.classList.add("solo-num");
    });
  }

  /* ---------- Selección y escritura ---------- */
  function tocarLetra(r, c) {
    var x = celda(r, c);
    var ents = [x.en.h, x.en.v].filter(function (v) { return v !== undefined; });
    var e = ents[0];
    if (seleccion && ents.length > 1) {
      var actual = partida.entradas[seleccion.e];
      var dentro = posiciones(actual).some(function (p) { return p[0] === r && p[1] === c; });
      if (dentro && seleccion.pos === indiceEn(actual, r, c)) e = ents[(ents.indexOf(seleccion.e) + 1) % ents.length];
      else if (dentro) e = seleccion.e;
    }
    seleccionar(e, indiceEn(partida.entradas[e], r, c));
    enfocar();
  }
  function indiceEn(e, r, c) { return e.dir === "h" ? c - e.c : r - e.r; }

  function seleccionar(ei, pos) {
    seleccion = { e: ei, pos: pos };
    marcarSeleccion();
  }

  function marcarSeleccion() {
    var tab = $("#tablero");
    tab.querySelectorAll(".sel, .actual, .def-sel").forEach(function (n) { n.classList.remove("sel", "actual", "def-sel"); });
    document.querySelectorAll("#lista li.activo").forEach(function (n) { n.classList.remove("activo"); });
    var barra = $("#pista-activa");
    if (!seleccion) { barra.textContent = "Toca una casilla o una definición para empezar."; return; }
    var e = partida.entradas[seleccion.e], N = partida.N;
    posiciones(e).forEach(function (p, i) {
      var n = tab.querySelector('[data-p="' + (p[0] * N + p[1]) + '"]');
      if (n) { n.classList.add("sel"); if (i === seleccion.pos) n.classList.add("actual"); }
    });
    var s = tab.querySelector('.def-txt[data-e="' + seleccion.e + '"]');
    if (s) s.classList.add("def-sel");
    if (e.img) { var im = tab.querySelector(".imagen"); if (im) im.classList.add("def-sel"); }
    var li = document.querySelector('#lista li[data-e="' + seleccion.e + '"]');
    if (li) li.classList.add("activo");
    // El campo de escritura (invisible) se coloca sobre la casilla actual para que,
    // al abrir el teclado del iPad, la página se desplace hasta ella.
    var act = tab.querySelector(".celda.actual"), inp = $("#teclado");
    if (act && inp) { inp.style.left = (act.offsetLeft + tab.offsetLeft) + "px"; inp.style.top = (act.offsetTop + tab.offsetTop) + "px"; }
    barra.innerHTML = "";
    barra.appendChild(el("b", "num", e.n));
    barra.appendChild(el("span", "flecha-lista", FLECHA_TXT[e.flecha]));
    barra.appendChild(document.createTextNode(" " + e.pista + " "));
    barra.appendChild(el("span", "largo", "(" + e.L + " letras)"));
  }

  function enfocar() {
    var inp = $("#teclado");
    try { inp.focus({ preventScroll: true }); } catch (e) { inp.focus(); }
  }

  function escribir(ch) {
    if (!seleccion || partida.terminada) return;
    var e = partida.entradas[seleccion.e];
    var p = posiciones(e)[seleccion.pos], x = celda(p[0], p[1]);
    if (!x.fija) { x.v = ch; x.mal = false; }
    if (seleccion.pos < e.L - 1) seleccion.pos++;
    despuesDeCambio();
  }
  function borrar() {
    if (!seleccion || partida.terminada) return;
    var e = partida.entradas[seleccion.e];
    var p = posiciones(e)[seleccion.pos], x = celda(p[0], p[1]);
    if ((!x.v || x.fija) && seleccion.pos > 0) {
      seleccion.pos--;
      p = posiciones(e)[seleccion.pos]; x = celda(p[0], p[1]);
    }
    if (!x.fija) { x.v = ""; x.mal = false; }
    despuesDeCambio();
  }
  function mover(dr, dc) {
    if (!seleccion) return;
    var e = partida.entradas[seleccion.e], p = posiciones(e)[seleccion.pos], N = partida.N;
    var r = p[0] + dr, c = p[1] + dc;
    while (r >= 0 && c >= 0 && r < N && c < N) {
      var x = celda(r, c);
      if (x.k === "L") {
        var quiere = dr !== 0 ? "v" : "h";
        var ei = x.en[quiere] !== undefined ? x.en[quiere] : (x.en.h !== undefined ? x.en.h : x.en.v);
        seleccionar(ei, indiceEn(partida.entradas[ei], r, c));
        return;
      }
      r += dr; c += dc;
    }
  }

  function despuesDeCambio() {
    refrescarLetras();
    marcarSeleccion();
    if (todoLleno() && todoBien()) terminar(false);
    guardar();
  }

  function refrescarLetras() {
    var tab = $("#tablero"), nv = NIVELES[partida.nivel];
    partida.celdas.forEach(function (x, p) {
      if (x.k !== "L") return;
      var n = tab.querySelector('[data-p="' + p + '"]');
      if (!n) return;
      $(".v", n).textContent = x.v || "";
      var mal = x.v && x.v !== x.s && (nv.auto || x.mal);
      n.classList.toggle("mal", !!mal);
      n.classList.toggle("revelada", !!x.revelada);
    });
    // Definiciones resueltas.
    partida.entradas.forEach(function (e, i) {
      var ok = entradaCompleta(e);
      var li = document.querySelector('#lista li[data-e="' + i + '"]');
      if (li) li.classList.toggle("hecha", ok);
      var s = tab.querySelector('.def-txt[data-e="' + i + '"]');
      if (s) s.classList.toggle("hecha", ok);
    });
  }

  /* ---------- Ayudas ---------- */
  function actualizarEstado() {
    var nv = NIVELES[partida.nivel];
    var quedan = nv.letras === Infinity ? "∞" : Math.max(0, nv.letras - partida.ayudas);
    $("#b-letra").textContent = "Dame una letra (" + quedan + ")";
    $("#b-letra").disabled = partida.terminada || (nv.letras !== Infinity && partida.ayudas >= nv.letras);
    $("#b-comprobar").hidden = nv.auto;
    $("#b-comprobar").disabled = partida.terminada;
    $("#b-solucion").disabled = partida.terminada;
    var hechas = partida.entradas.filter(entradaCompleta).length;
    $("#progreso").textContent = hechas + " de " + partida.entradas.length + " palabras";
    $("#repaso").hidden = !partida.terminada;
    if (partida.terminada) pintarRepaso();
    refrescarLetras();
    pintarReloj();
  }

  function darLetra() {
    var nv = NIVELES[partida.nivel];
    if (partida.terminada || (nv.letras !== Infinity && partida.ayudas >= nv.letras)) return;
    var objetivo = null;
    if (seleccion) {
      var e = partida.entradas[seleccion.e];
      var ps = posiciones(e);
      // Primero la casilla actual; si ya está bien, la siguiente que falte de la palabra.
      var orden = ps.slice(seleccion.pos).concat(ps.slice(0, seleccion.pos));
      for (var i = 0; i < orden.length && !objetivo; i++) {
        var x = celda(orden[i][0], orden[i][1]);
        if (x.v !== x.s) objetivo = x;
      }
    }
    if (!objetivo) {
      var libres = partida.celdas.filter(function (x) { return x.k === "L" && x.v !== x.s; });
      if (!libres.length) return;
      objetivo = libres[Math.floor(Math.random() * libres.length)];
    }
    objetivo.v = objetivo.s; objetivo.fija = true; objetivo.revelada = true; objetivo.mal = false;
    partida.ayudas++;
    despuesDeCambio();
    actualizarEstado();
  }

  function comprobar() {
    if (partida.terminada) return;
    partida.comprobaciones++;
    var fallos = 0;
    partida.celdas.forEach(function (x) {
      if (x.k === "L" && x.v && x.v !== x.s) { x.mal = true; fallos++; }
    });
    refrescarLetras();
    aviso(fallos ? (fallos === 1 ? "Hay 1 letra mal (en rojo)." : "Hay " + fallos + " letras mal (en rojo).")
                 : (todoLleno() ? "¡Todo bien!" : "De momento no hay ninguna letra mal."));
    guardar();
  }

  // Confirmación dentro de la página (las ventanas confirm() pueden estar bloqueadas):
  // el primer toque pide confirmar y el segundo, en menos de 5 s, muestra la solución.
  var confirmaSolucion = null;
  function solucion() {
    if (partida.terminada) return;
    var b = $("#b-solucion");
    if (!confirmaSolucion) {
      b.textContent = "¿Seguro? Pulsa otra vez";
      b.classList.add("aviso-boton");
      confirmaSolucion = setTimeout(function () {
        confirmaSolucion = null; b.textContent = "Ver solución"; b.classList.remove("aviso-boton");
      }, 5000);
      return;
    }
    clearTimeout(confirmaSolucion); confirmaSolucion = null;
    b.textContent = "Ver solución"; b.classList.remove("aviso-boton");
    partida.celdas.forEach(function (x) { if (x.k === "L" && x.v !== x.s) { x.v = x.s; x.revelada = true; } });
    terminar(true);
  }

  function terminar(rendido) {
    partida.terminada = true;
    partida.resuelta = !rendido;
    pararReloj();
    guardar();
    pintarJuego();
    if (!rendido) {
      var nv = NIVELES[partida.nivel];
      var txt = "¡Autodefinido completado en " + formatoTiempo(partida.segundos) + "!";
      var extras = [];
      if (partida.ayudas) extras.push(partida.ayudas + (partida.ayudas === 1 ? " letra de ayuda" : " letras de ayuda"));
      if (!nv.auto && partida.comprobaciones) extras.push(partida.comprobaciones + (partida.comprobaciones === 1 ? " comprobación" : " comprobaciones"));
      aviso(txt + (extras.length ? " (" + extras.join(", ") + ")" : " Sin ninguna ayuda."), 6000);
    }
    var rep = $("#repaso");
    if (rep && rep.scrollIntoView && rendido) rep.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /* ---------- Repaso con las definiciones completas ---------- */
  function pintarRepaso() {
    var cont = $("#repaso-lista");
    cont.innerHTML = "";
    var porId = {};
    DATOS.terminos.forEach(function (t) { porId[t.id] = t; });
    partida.entradas.slice().sort(function (a, b) { return a.n - b.n; }).forEach(function (e) {
      var t = porId[e.id];
      var art = el("article", "ficha");
      var h = el("h3");
      h.appendChild(el("span", "num", e.n));
      h.appendChild(document.createTextNode(" " + t.t));
      art.appendChild(h);
      art.appendChild(el("p", "resp", "Respuesta: " + t.r + " · Hoja «" + DATOS.hojas[t.h].nombre + "» del Excel"));
      if (e.img) {
        var im = DATOS.imagenes[e.img];
        var fig = el("figure", "mini");
        var i = el("img"); i.src = "img/" + im.img; i.alt = im.obra; i.loading = "lazy";
        fig.appendChild(i);
        fig.appendChild(el("figcaption", "", im.obra + (im.autor ? " · " + im.autor : "") + ". Relación con el término: " + im.fuente + "."));
        art.appendChild(fig);
      }
      if (t.d) { var pd = el("p"); pd.appendChild(el("b", "", "Definición: ")); pd.appendChild(document.createTextNode(t.d)); art.appendChild(pd); }
      if (t.c) { var pc = el("p"); pc.appendChild(el("b", "", "Contexto: ")); pc.appendChild(document.createTextNode(t.c)); art.appendChild(pc); }
      if (t.nota) art.appendChild(el("p", "nota", t.nota));
      cont.appendChild(art);
    });
  }

  /* ---------- Imagen ampliada ---------- */
  function abrirImagen(key) {
    var im = DATOS.imagenes[key];
    var dlg = $("#visor");
    $("#visor-img").src = "img/" + im.img;
    $("#visor-img").alt = partida.terminada ? im.obra : "Imagen de la pista";
    var muestraPie = partida.terminada || partida.nivel === "facil" || partida.nivel === "normal";
    $("#visor-pie").textContent = muestraPie
      ? im.obra + (im.autor ? " · " + im.autor : "") + (im.fecha ? " (" + im.fecha + ")" : "") + " · " + im.licencia
      : "El pie de la imagen se muestra al terminar.";
    var ei = partida.entradas.findIndex(function (e) { return e.img === key; });
    if (ei >= 0) seleccionar(ei, 0);
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute("open", "");
  }

  /* ---------- Reloj ---------- */
  function formatoTiempo(s) {
    var m = Math.floor(s / 60), r = s % 60;
    return m + ":" + (r < 10 ? "0" : "") + r;
  }
  function pintarReloj() { $("#reloj").textContent = formatoTiempo(partida ? partida.segundos : 0); }
  function arrancarReloj() {
    pararReloj();
    if (!partida || partida.terminada) return;
    reloj = setInterval(function () {
      if (document.hidden) return;
      partida.segundos++;
      pintarReloj();
      if (partida.segundos % 10 === 0) guardar();
    }, 1000);
  }
  function pararReloj() { if (reloj) clearInterval(reloj); reloj = null; }

  /* ---------- Avisos y vistas ---------- */
  var tAviso = null;
  function aviso(txt, ms) {
    var a = $("#aviso");
    a.textContent = txt;
    a.hidden = false;
    clearTimeout(tAviso);
    tAviso = setTimeout(function () { a.hidden = true; }, ms || 3000);
  }
  function mostrar(vista) {
    $("#inicio").hidden = vista !== "inicio";
    $("#juego").hidden = vista !== "juego";
    if (vista === "inicio") { pararReloj(); pintarOpciones(); $("#b-continuar").hidden = !(partida && !partida.terminada); }
  }

  /* ---------- Créditos ---------- */
  function pintarCreditos() {
    var tb = $("#creditos-imagenes");
    Object.keys(DATOS.imagenes).forEach(function (k) {
      var im = DATOS.imagenes[k];
      var tr = el("tr");
      var t1 = el("td"); var a = el("a", "", im.obra);
      a.href = "https://commons.wikimedia.org/wiki/File:" + encodeURIComponent(im.archivo);
      a.target = "_blank"; a.rel = "noopener";
      t1.appendChild(a);
      tr.appendChild(t1);
      tr.appendChild(el("td", "", [im.autor, im.fecha, im.lugar].filter(Boolean).join(" · ")));
      tr.appendChild(el("td", "", im.licencia));
      var term = DATOS.terminos.find(function (t) { return t.id === im.termino; });
      tr.appendChild(el("td", "", (term ? term.t : "") + " — " + im.fuente));
      tb.appendChild(tr);
    });
  }

  /* ---------- Eventos ---------- */
  function iniciar() {
    $("#desde").addEventListener("change", function (ev) { opciones.desde = +ev.target.value; guardar(); actualizarResumen(); });
    $("#hasta").addEventListener("change", function (ev) { opciones.hasta = +ev.target.value; guardar(); actualizarResumen(); });
    $("#tamano").addEventListener("change", function (ev) { opciones.tamano = ev.target.value; guardar(); });
    $("#con-imagenes").addEventListener("change", function (ev) { opciones.imagenes = ev.target.checked; guardar(); actualizarResumen(); });
    $("#b-crear").addEventListener("click", function () {
      var b = $("#b-crear");
      b.disabled = true; b.textContent = "Creando…";
      setTimeout(function () { crearPartida(); b.disabled = false; b.textContent = "Crear autodefinido"; }, 30);
    });
    $("#b-continuar").addEventListener("click", function () { pintarJuego(); });
    $("#b-nuevo").addEventListener("click", function () { mostrar("inicio"); window.scrollTo(0, 0); });
    $("#b-otro").addEventListener("click", function () { mostrar("inicio"); window.scrollTo(0, 0); });
    $("#b-letra").addEventListener("click", function () { darLetra(); });
    $("#b-comprobar").addEventListener("click", function () { comprobar(); });
    $("#b-solucion").addEventListener("click", function () { solucion(); });
    $("#visor-cerrar").addEventListener("click", function () { var d = $("#visor"); if (d.close) d.close(); else d.removeAttribute("open"); });

    var inp = $("#teclado");
    var borradoPorTecla = false;
    inp.addEventListener("input", function (ev) {
      var v = inp.value; inp.value = "";
      // Teclados que no envían la tecla de borrar (algunos táctiles).
      if (ev.inputType === "deleteContentBackward") { if (!borradoPorTecla) borrar(); borradoPorTecla = false; return; }
      Array.from(v).forEach(function (ch) { var n = normaliza(ch); if (n) escribir(n); });
    });
    inp.addEventListener("keydown", function (ev) {
      borradoPorTecla = false;
      if (ev.key === "Backspace") { ev.preventDefault(); borradoPorTecla = true; borrar(); }
      else if (ev.key === "ArrowLeft") { ev.preventDefault(); mover(0, -1); }
      else if (ev.key === "ArrowRight") { ev.preventDefault(); mover(0, 1); }
      else if (ev.key === "ArrowUp") { ev.preventDefault(); mover(-1, 0); }
      else if (ev.key === "ArrowDown") { ev.preventDefault(); mover(1, 0); }
      else if (ev.key === "Enter" || ev.key === "Tab") {
        ev.preventDefault();
        if (seleccion) {
          var n = partida.entradas.length, cur = partida.entradas[seleccion.e].n;
          var sig = (ev.shiftKey ? cur - 2 + n : cur) % n + 1;
          seleccionar(partida.entradas.findIndex(function (e) { return e.n === sig; }), 0);
        }
      }
    });
    window.addEventListener("resize", function () { if (partida && !$("#juego").hidden) ajustarTamano(); });

    pintarCreditos();
    if (partida && !partida.terminada) pintarJuego(); else mostrar("inicio");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar);
  else iniciar();
})();
