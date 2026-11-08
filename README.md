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

Al cabo de un par de minutos estará en `https://vidal3375.github.io/para-estudiar/`
(la raíz redirige a `pomodoro/`).

### Probarlo en local

El service worker no funciona abriendo el archivo directamente (`file://`); hace falta un servidor:

```bash
python3 -m http.server 8000
```

y abrir `http://localhost:8000/pomodoro/`.

## Licencias

- **Código y contenido propio** (HTML, JavaScript, `sw.js`, manifiesto, README y el PDF de citas):
  licencia abierta [MIT](LICENSE).
- **Sonidos e icono**: obras de terceros con sus propias licencias libres (CC0, dominio público,
  CC BY-SA 3.0 y CC BY-SA 4.0). Autores, fuentes, licencias y cambios realizados en
  [`pomodoro/sonidos/CREDITOS.md`](pomodoro/sonidos/CREDITOS.md); los mismos créditos aparecen
  dentro de la app, en **Ajustes → Créditos**.
