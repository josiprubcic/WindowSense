# Arhitektura

## Komponente

```text
Web browser
  |
  | HTTP + Server-Sent Events
  v
WindowSense Spring Boot backend
  |
  | HTTP Device API telemetry
  v
ThingsBoard

ESP32
  |
  | POST telemetry + GET commands
  v
WindowSense Spring Boot backend
```

## Backend

Backend je u `src/main/java/com/windowsense/` i sastoji se od:

- `WindowSenseApplication.java` - pokretanje Spring Boot aplikacije.
- `api/WindowSenseController.java` - REST API, static frontend i SSE stream.
- `store/WindowSenseStore.java` - in-memory stanje sustava, dogadjaji i command queue.
- `automation/AutomationService.java` - pravila za kisu, svjetlost, vjetar i rolete.
- `iot/ThingsBoardClient.java` - adapter za ThingsBoard HTTP Device API.
- `iot/ThingsBoardSyncService.java` - slanje telemetrije prema ThingsBoardu kada je konfigurirano.
- `config/WindowSenseProperties.java` - konfiguracija iz environment varijabli.
- `model/` - DTO i model stanja sustava.

Konfiguracija je u `src/main/resources/application.yml`.

## Frontend

Frontend je u `public/`:

- `index.html` - struktura dashboarda.
- `styles.css` - responzivni UI i vizual prozora/roleta.
- `app.js` - spajanje na API, SSE update, komande i simulacija.

Maven kopira `public/` u Spring static resources tijekom builda, a u razvoju Spring ga servira i direktno iz `public/`.

## GitHub nalaz

U lokalnom workspaceu nije postojao valjan Git repozitorij ni source kod. Javna pretraga za `WindowSense` pronalazi stari projekt `SilentRhetoric/WindowSense`, ali taj projekt koristi Raspberry Pi, Sense HAT, Nest i OpenWeatherMap te ne odgovara ovoj temi koja cilja ESP32, rolete/prozore i ThingsBoard. Zato je ovaj kod postavljen kao novi temelj za zadani projekt.
