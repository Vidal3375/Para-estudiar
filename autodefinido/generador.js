/* =====================================================================
   GENERADOR DE AUTODEFINIDOS
   ---------------------------------------------------------------------
   Coloca palabras en un tablero cuadrado. Cada palabra tiene una casilla
   de definición justo antes de su primera letra:
     h1  definición a la izquierda, la palabra va hacia la derecha  (▸)
     h2  definición encima, la palabra va hacia la derecha          (↳)
     v1  definición encima, la palabra va hacia abajo               (▾)
     v2  definición a la izquierda, la palabra va hacia abajo       (↴)
     img la definición es una imagen de 2×2 casillas
   Una casilla de definición puede llevar hasta dos definiciones.
   Se hacen muchos intentos al azar y se queda el tablero más lleno.
   ===================================================================== */
(function () {
  "use strict";

  var DIRS = { h: [0, 1], v: [1, 0] };
  // Posición de la casilla de definición respecto a la primera letra.
  var FLECHAS = {
    h1: { dir: "h", dr: 0, dc: -1 },
    h2: { dir: "h", dr: -1, dc: 0 },
    v1: { dir: "v", dr: -1, dc: 0 },
    v2: { dir: "v", dr: 0, dc: -1 }
  };

  function barajar(a, rnd) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rnd() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function Tablero(N) {
    this.N = N;
    this.c = new Array(N * N).fill(null);
    this.entradas = [];
    this.usadas = {};   // respuestas ya colocadas
  }
  Tablero.prototype.dentro = function (r, c) { return r >= 0 && c >= 0 && r < this.N && c < this.N; };
  Tablero.prototype.get = function (r, c) { return this.dentro(r, c) ? this.c[r * this.N + c] : undefined; };
  Tablero.prototype.set = function (r, c, v) { this.c[r * this.N + c] = v; };
  function esLetra(x) { return x && x.k === "L"; }

  // Comprueba si se puede poner la palabra; devuelve un resumen o null.
  Tablero.prototype.probar = function (pal, r, c, flecha) {
    var f = FLECHAS[flecha], d = DIRS[f ? f.dir : (flecha === "img-h" ? "h" : "v")];
    var dir = f ? f.dir : (flecha === "img-h" ? "h" : "v");
    var L = pal.length, dr = d[0], dc = d[1];
    var er = r + dr * (L - 1), ec = c + dc * (L - 1);
    if (!this.dentro(r, c) || !this.dentro(er, ec)) return null;

    var reusa = false, nuevaDef = false, cr = -1, cc = -1;
    if (f) {
      cr = r + f.dr; cc = c + f.dc;
      if (!this.dentro(cr, cc)) return null;
      var cd = this.get(cr, cc);
      if (cd === null || (cd && cd.k === "B")) nuevaDef = true;
      else if (cd.k === "C" && cd.defs.length < 2) reusa = true;
      else return null;
    }
    // Casilla anterior y posterior: no pueden ser letras.
    var ar = r - dr, ac = c - dc;
    if (this.dentro(ar, ac) && esLetra(this.get(ar, ac))) return null;
    var pr = er + dr, pc = ec + dc;
    if (this.dentro(pr, pc) && esLetra(this.get(pr, pc))) return null;
    // La casilla de definición no puede ser la posterior (no pasa) ni una letra.
    var cruces = 0, nuevas = 0;
    for (var i = 0; i < L; i++) {
      var rr = r + dr * i, cc2 = c + dc * i, x = this.get(rr, cc2);
      if (rr === cr && cc2 === cc) return null;
      if (x === null) {
        // Vecinos perpendiculares vacíos de letras.
        if (esLetra(this.get(rr + dc, cc2 + dr)) || esLetra(this.get(rr - dc, cc2 - dr))) return null;
        nuevas++;
      } else if (esLetra(x)) {
        if (x.ch !== pal[i] || x.en[dir] !== undefined) return null;
        cruces++;
      } else return null;
    }
    if (nuevas === 0) return null;
    return { cruces: cruces, reusa: reusa, nuevaDef: nuevaDef, dir: dir, cr: cr, cc: cc, nuevas: nuevas };
  };

  Tablero.prototype.poner = function (w, r, c, flecha, info) {
    var dir = info.dir, d = DIRS[dir], L = w.r.length;
    var idx = this.entradas.length;
    var e = { w: w, r: r, c: c, dir: dir, flecha: flecha, cr: info.cr, cc: info.cc };
    this.entradas.push(e);
    this.usadas[w.r] = true;
    for (var i = 0; i < L; i++) {
      var rr = r + d[0] * i, cc = c + d[1] * i, x = this.get(rr, cc);
      if (x === null) { x = { k: "L", ch: w.r[i], en: {} }; this.set(rr, cc, x); }
      x.en[dir] = idx;
    }
    if (FLECHAS[flecha]) {
      var cd = this.get(info.cr, info.cc);
      if (!cd || cd.k === "B") { cd = { k: "C", defs: [] }; this.set(info.cr, info.cc, cd); }
      cd.defs.push(idx);
    }
    // Las casillas de antes y después quedan bloqueadas (sin letra).
    var bloq = [[r - d[0], c - d[1]], [r + d[0] * L, c + d[1] * L]];
    for (var k = 0; k < bloq.length; k++) {
      var b = bloq[k];
      if (this.dentro(b[0], b[1]) && this.get(b[0], b[1]) === null) this.set(b[0], b[1], { k: "B" });
    }
    return e;
  };

  // Valora una colocación: premia cruces, aprovechar casillas de definición
  // y llenar huecos junto a lo ya puesto; castiga las palabras paralelas
  // separadas por una sola columna (dejan una franja gris que no se puede usar).
  function puntuar(t, pal, r, c, info, rnd) {
    var d = DIRS[info.dir], pr = d[1], pc = d[0];   // perpendicular
    var vecinos = 0, peine = 0;
    for (var i = 0; i < pal.length; i++) {
      var rr = r + d[0] * i, cc = c + d[1] * i;
      var x = t.get(rr, cc);
      if (x !== null) continue;   // cruce: ya contado
      for (var s = -1; s <= 1; s += 2) {
        var lado = t.get(rr + pr * s, cc + pc * s), lejos = t.get(rr + pr * 2 * s, cc + pc * 2 * s);
        if (lado && lado.k !== "B") vecinos++;
        if (lado === null && lejos && lejos.k === "L" && lejos.en[info.dir] !== undefined) peine++;
      }
    }
    return info.cruces * 6 + (info.reusa ? 4 : 0) - (info.nuevaDef ? 1 : 0) + vecinos * 0.6
      - peine * 0.9 + info.nuevas * 0.15 + rnd() * 3;
  }

  // Busca la mejor colocación de una palabra. conCruce: exige cruzar otra.
  function mejorSitio(t, w, conCruce, rnd) {
    var mejor = null, N = t.N, pal = w.r;
    var tipos = ["h1", "h2", "v1", "v2"];
    if (conCruce) {
      for (var p = 0; p < N * N; p++) {
        var x = t.c[p];
        if (!esLetra(x)) continue;
        var R = Math.floor(p / N), C = p % N;
        for (var i = 0; i < pal.length; i++) {
          if (pal[i] !== x.ch) continue;
          for (var k = 0; k < 4; k++) {
            var fl = tipos[k], dir = FLECHAS[fl].dir;
            if (x.en[dir] !== undefined) continue;
            var d = DIRS[dir], r = R - d[0] * i, c = C - d[1] * i;
            var info = t.probar(pal, r, c, fl);
            if (!info) continue;
            var s = puntuar(t, pal, r, c, info, rnd);
            if (!mejor || s > mejor.s) mejor = { s: s, r: r, c: c, fl: fl, info: info };
          }
        }
      }
    } else {
      for (var r2 = 0; r2 < N; r2++) for (var c2 = 0; c2 < N; c2++) {
        for (var k2 = 0; k2 < 4; k2++) {
          var info2 = t.probar(pal, r2, c2, tipos[k2]);
          if (!info2) continue;
          // Sin cruce solo si aprovecha una casilla de definición o un hueco del borde.
          var s2 = (info2.reusa ? 5 : 0) + info2.nuevas * 0.2 + rnd() * 3 - 4;
          if (!mejor || s2 > mejor.s) mejor = { s: s2, r: r2, c: c2, fl: tipos[k2], info: info2 };
        }
      }
    }
    return mejor;
  }

  function intento(palabras, N, imagenes, rnd, opc) {
    var t = new Tablero(N);
    var pool = barajar(palabras.filter(function (w) { return w.r.length >= 2 && w.r.length <= N; }), rnd);
    // Palabras más largas primero, con algo de azar.
    pool.sort(function (a, b) { return (b.r.length + rnd() * 5) - (a.r.length + rnd() * 5); });

    // 1) Imagen (opcional): bloque de 2×2 cuya palabra empieza al lado o debajo.
    var img = null;
    var cand = barajar(imagenes.slice(), rnd);
    for (var q = 0; q < cand.length && !img; q++) {
      var w = cand[q];
      if (w.r.length > N - 2) continue;
      for (var tries = 0; tries < 20 && !img; tries++) {
        var horiz = rnd() < 0.5;
        var r0 = Math.floor(rnd() * (N - 1)), c0 = Math.floor(rnd() * (N - 1));
        var sr = horiz ? r0 + Math.floor(rnd() * 2) : r0 + 2;
        var sc = horiz ? c0 + 2 : c0 + Math.floor(rnd() * 2);
        var fl = horiz ? "img-h" : "img-v";
        var info = t.probar(w.r, sr, sc, fl);
        if (!info) continue;
        for (var a = 0; a < 2; a++) for (var b = 0; b < 2; b++)
          t.set(r0 + a, c0 + b, { k: "I", key: w.img, raiz: a === 0 && b === 0 });
        info = t.probar(w.r, sr, sc, fl);
        if (!info) { for (var a2 = 0; a2 < 2; a2++) for (var b2 = 0; b2 < 2; b2++) t.set(r0 + a2, c0 + b2, null); continue; }
        info.cr = r0; info.cc = c0;
        t.poner(w, sr, sc, fl, info);
        img = { r: r0, c: c0, key: w.img };
      }
    }

    // 2) Primera palabra (si no hubo imagen).
    if (!t.entradas.length && pool.length) {
      for (var z = 0; z < pool.length && !t.entradas.length; z++) {
        var w1 = pool[z];
        var r1 = 1 + Math.floor(rnd() * (N - 2));
        var info1 = t.probar(w1.r, r1, 1, "h1");
        if (info1) t.poner(w1, r1, 1, "h1", info1);
      }
    }

    // 3) Cruces.
    var seguir = true;
    while (seguir) {
      seguir = false;
      for (var i = 0; i < pool.length; i++) {
        var wi = pool[i];
        if (t.usadas[wi.r]) continue;
        var m = mejorSitio(t, wi, true, rnd);
        if (m) { t.poner(wi, m.r, m.c, m.fl, m.info); seguir = true; }
      }
    }
    // 4) Rellenar huecos con palabras sueltas (siguen teniendo su definición).
    if (opc.rellenar) {
      seguir = true;
      while (seguir) {
        seguir = false;
        for (var j = 0; j < pool.length; j++) {
          var wj = pool[j];
          if (t.usadas[wj.r]) continue;
          var m2 = mejorSitio(t, wj, true, rnd) || mejorSitio(t, wj, false, rnd);
          if (m2) { t.poner(wj, m2.r, m2.c, m2.fl, m2.info); seguir = true; }
        }
      }
    }
    var llenas = 0, letras = 0, cruces = 0;
    for (var p = 0; p < N * N; p++) {
      var x = t.c[p];
      if (x && x.k !== "B") llenas++;
      if (esLetra(x)) { letras++; if (x.en.h !== undefined && x.en.v !== undefined) cruces++; }
    }
    t.img = img;
    // Tablero lleno, con muchas letras y bien trabado.
    t.puntos = llenas / (N * N) * 100 + letras / (N * N) * 40 + cruces / (N * N) * 120 + t.entradas.length * 0.5;
    return t;
  }

  /* palabras: [{id, r, img?}]  (r = array de letras)
     imagenes: palabras que pueden ir con imagen (mismo formato + img)
     Devuelve el mejor tablero en el tiempo dado. */
  function generar(palabras, N, imagenes, opc) {
    opc = opc || {};
    var rnd = opc.rnd || Math.random;
    var limite = opc.ms || 900, ini = Date.now(), mejor = null, n = 0;
    while (n < 6 || (Date.now() - ini < limite && n < 400)) {
      var t = intento(palabras, N, imagenes, rnd, opc);
      if (!mejor || t.puntos > mejor.puntos) mejor = t;
      n++;
    }
    return mejor;
  }

  window.GeneradorAutodefinido = { generar: generar };
})();
