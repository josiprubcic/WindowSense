# Arhitektura

## Komponente

```text
Web browser
  |
  | HTTP + Server-Sent Events
  v
WindowSense Node backend
  |
  | HTTP Device API telemetry
  v
ThingsBoard

ESP32
  |
  | POST telemetry + GET commands
  v
WindowSense Node backend
```

## Backend

Backend je u `src/` i sastoji se od:

- `server.js` - pokretanje HTTP servera.
- `app.js` - rute, static frontend, SSE stream.
- `store.js` - in-memory stanje sustava, dogadjaji i command queue.
- `automation.js` - pravila za kisu, svjetlost, vjetar i rolete.
- `thingsboard.js` - adapter za ThingsBoard HTTP Device API.
- `config.js` - konfiguracija iz environment varijabli.

## Frontend

Frontend je u `public/`:

- `index.html` - struktura dashboarda.
- `styles.css` - responzivni UI i vizual prozora/roleta.
- `app.js` - spajanje na API, SSE update, komande i simulacija.

## GitHub nalaz

U lokalnom workspaceu nije postojao valjan Git repozitorij ni source kod. Javna pretraga za `WindowSense` pronalazi stari projekt `SilentRhetoric/WindowSense`, ali taj projekt koristi Raspberry Pi, Sense HAT, Nest i OpenWeatherMap te ne odgovara ovoj temi koja cilja ESP32, rolete/prozore i ThingsBoard. Zato je ovaj kod postavljen kao novi temelj za zadani projekt.
