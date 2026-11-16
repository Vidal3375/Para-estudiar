# Para estudiar

Herramientas sencillas para estudiar.

## Pomodoro

Temporizador Pomodoro con estadísticas, sonidos naturales y citas para estudiar con atención.
Funciona en el navegador, se puede instalar como app (PWA) y sigue funcionando sin conexión
después de la primera visita.

- App: [`pomodoro/`](pomodoro/)
- Citas en PDF: [`pomodoro/citas-pomodoro.pdf`](pomodoro/citas-pomodoro.pdf)
- Créditos de sonidos e icono: [`pomodoro/sonidos/CREDITOS.md`](pomodoro/sonidos/CREDITOS.md)

Los ajustes y el historial se guardan solo en el navegador (`localStorage`); no se envía nada a ningún servidor.

### Publicar con GitHub Pages

1. En el repositorio, ve a **Settings → Pages**.
2. En **Build and deployment → Source**, elige **Deploy from a branch**.
3. Elige la rama `master` y la carpeta `/ (root)`, y pulsa **Save**.

Al cabo de un par de minutos estará en `https://vidal3375.github.io/Para-estudiar/`
(la raíz es un menú con las herramientas).

### Probarlo en local

El service worker no funciona abriendo el archivo directamente (`file://`); hace falta un servidor:

```bash
python3 -m http.server 8000
```

y abrir `http://localhost:8000/pomodoro/`.

## Autodefinido de Historia de España

Autodefinido con el vocabulario del Excel «Vocabulario Historia de España».

- App: [`autodefinido/`](autodefinido/)
- **Periodo:** se elige por las hojas del Excel (Hasta 1833, 1833-1876, 1876-1931, 1931-1939, 1939-1975, 1975-1986).
- **Dificultad:**
  - Fácil: la primera letra viene puesta y los fallos se marcan al momento.
  - Normal: pistas sacadas de la definición.
  - Difícil: pistas sacadas del contexto.
  - Muy difícil: tablero grande, pistas del contexto, imágenes sin pie y 1 sola letra de ayuda.
- **Tamaño del tablero:** de 9 × 9 a 20 × 20.
- **Imágenes como pista:** cuadros y retratos de Wikimedia Commons tomados del proyecto
  [aprender-historia-de-espanya](https://github.com/Vidal3375/aprender-historia-de-espanya). Solo los hay para el periodo hasta 1876.
- Al terminar se muestran la definición y el contexto completos de cada término.

Los datos están en [`autodefinido/datos/vocabulario.js`](autodefinido/datos/vocabulario.js) y se pueden editar a mano.
Cada término lleva la respuesta, una pista corta (resumen de la definición), una pista difícil (resumen del contexto)
y los textos completos del Excel.

Cambios respecto al Excel:

- Se quitan los números de página de algunos términos.
- Se quitan las filas de cabecera.
- En «Referéndum» pone «participación del 67,1 %» en lugar de «abstención del 67,1 %». Está pendiente de contrastar.
- «Estado confesional» (hoja «Hasta 1833») no sale porque no tiene definición.
- «23F» no sale porque lleva números.

## Licencias

- **Código y contenido propio** (HTML, JavaScript, `sw.js`, manifiesto, README y el PDF de citas):
  licencia abierta [MIT](LICENSE).
- **Sonidos e icono**: obras de terceros con sus propias licencias libres (CC0, dominio público,
  CC BY-SA 3.0 y CC BY-SA 4.0). Autores, fuentes, licencias y cambios realizados en
  [`pomodoro/sonidos/CREDITOS.md`](pomodoro/sonidos/CREDITOS.md); los mismos créditos aparecen
  dentro de la app, en **Ajustes → Créditos**.
