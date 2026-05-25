# WindowSense

Web aplikacija za pametni sustav automatskog upravljanja prozorima i roletama prema vremenskim uvjetima.

Projekt je postavljen kao backend + frontend MVP spreman za kasnije spajanje na ESP32 i ThingsBoard. Ne koristi mobilnu aplikaciju.

## Sto je implementirano

- Java 21 + Spring Boot backend.
- REST API za telemetriju, prognozu, komande, pragove automatizacije i ESP32 command polling.
- Server-Sent Events stream za live dashboard.
- ThingsBoard HTTP Device API adapter za slanje telemetrije.
- Web dashboard za nadzor prozora, roleta, kise, svjetlosti, prognoze, pravila i IoT statusa.
- Simulacijski panel za testiranje automatizacije bez fizickog hardvera.
- Spring testovi za automatizacijska pravila i glavne API tokove.

## Pokretanje

```bash
mvn spring-boot:run
```

Otvoriti:

```text
http://localhost:3000
```

Build JAR datoteke:

```bash
mvn package
```

Testovi:

```bash
mvn test
```

## Konfiguracija

Spring Boot cita environment varijable direktno. Primjer lokalnog pokretanja:

```bash
export PORT=3000
export THINGSBOARD_HOST=https://thingsboard.cloud
export THINGSBOARD_ACCESS_TOKEN=DEVICE_ACCESS_TOKEN
export THINGSBOARD_SYNC_ENABLED=true
export WINDOWSENSE_DEVICE_ID=windowsense-esp32-01
mvn spring-boot:run
```

Ako ThingsBoard nije konfiguriran, web app i dalje radi lokalno sa simuliranim stanjem.

## Glavni API

### Slanje telemetrije

```http
POST /api/telemetry
Content-Type: application/json
```

```json
{
  "rainDetected": true,
  "rainIntensity": 72,
  "lightLux": 62000,
  "windowContactOpen": true,
  "windowOpenPercent": 65,
  "blindsPositionPercent": 20,
  "indoorTempC": 26.4,
  "outdoorTempC": 22.1,
  "rainProbability": 80,
  "windKph": 18,
  "batteryPercent": 94,
  "signalStrength": -58
}
```

### Rucna komanda

```http
POST /api/commands
Content-Type: application/json
```

```json
{
  "target": "window",
  "action": "close"
}
```

Podrzani ciljevi:

- `window`
- `blinds`
- `automation`

Podrzane akcije:

- `open`
- `close`
- `stop`
- `setPosition`
- `auto`
- `manual`

Za `setPosition` poslati i `positionPercent`.

### ESP32 preuzimanje komandi

```http
GET /api/device/commands?deviceId=windowsense-esp32-01
```

ESP32 nakon izvrsenja potvrdjuje komandu:

```http
POST /api/device/ack
Content-Type: application/json
```

```json
{
  "commandId": "cmd-id",
  "status": "done"
}
```

## Automatizacijska logika

U `auto` nacinu rada backend donosi odluke prema ovim pravilima:

- Ako je detektirana kisa, intenzitet kise je veci od praga ili je prognozirani rizik kise visok, prozor se zatvara.
- Ako brzina vjetra prelazi sigurni prag, prozor se zatvara.
- Ako je svjetlost visoka i unutarnja temperatura prelazi prag, rolete se spustaju na poziciju zasjene.
- Ako je svjetlost niska i nema rizika kise, rolete se vracaju u otvoreniji polozaj.

Pragovi se mogu mijenjati iz dashboarda ili preko `POST /api/automation/thresholds`.

## ThingsBoard

Adapter koristi ThingsBoard HTTP Device API:

```text
POST {THINGSBOARD_HOST}/api/v1/{THINGSBOARD_ACCESS_TOKEN}/telemetry
```

U ovoj fazi backend salje najnovije stanje kao telemetriju. Za proizvodnu verziju preporuka je:

- ESP32 salje primarnu telemetriju direktno u ThingsBoard preko MQTT-a ili HTTP-a.
- Backend cita agregirane podatke i alarme iz ThingsBoard REST API-ja.
- Komande prema aktuatorima idu kroz ThingsBoard RPC ili lokalni command polling endpoint, ovisno o mrezi i sigurnosnom modelu.

Detaljniji IoT ugovor je u [docs/IOT_CONTRACT.md](docs/IOT_CONTRACT.md).
