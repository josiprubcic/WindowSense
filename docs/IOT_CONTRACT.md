# WindowSense IoT ugovor

Ovaj dokument definira podatke koje ESP32 i Spring Boot web backend razmjenjuju u MVP fazi.

## Telemetry keys

| Key | Tip | Jedinica | Opis |
| --- | --- | --- | --- |
| `rainDetected` | boolean | - | Stanje digitalnog senzora kise. |
| `rainIntensity` | number | 0-100 | Relativni intenzitet kise ako senzor podrzava analogno ocitanje. |
| `lightLux` | number | lux | Ocitanje LDR/lux senzora. |
| `windowContactOpen` | boolean | - | Reed switch, true kada je prozor otvoren. |
| `windowOpenPercent` | number | 0-100 | Procijenjena ili izmjerena otvorenost prozora. |
| `blindsPositionPercent` | number | 0-100 | 0 znaci podignute, 100 znaci spustene. |
| `indoorTempC` | number | C | Unutarnja temperatura ako je dostupna. |
| `outdoorTempC` | number | C | Vanjska temperatura ili podatak iz prognoze. |
| `rainProbability` | number | 0-100 | Rizik kise iz vremenskog API-ja. |
| `windKph` | number | km/h | Brzina vjetra iz vremenskog API-ja. |
| `batteryPercent` | number | 0-100 | Stanje baterije ako uredjaj nije stalno napajan. |
| `signalStrength` | number | dBm | Wi-Fi signal. |

## Lokalni backend flow

1. ESP32 salje telemetriju na `POST /api/telemetry`.
2. Backend azurira stanje i izvrsava automatizacijska pravila.
3. Ako pravila ili korisnik kreiraju komandu, backend je stavlja u command queue.
4. ESP32 periodicki poziva `GET /api/device/commands?deviceId=windowsense-esp32-01`.
5. ESP32 izvrsava komandu i potvrdjuje `POST /api/device/ack`.

## Primjer komande za ESP32

```json
{
  "id": "cmd-lx64x1-ab12cd",
  "ts": "2026-05-25T12:00:00.000Z",
  "deviceId": "windowsense-esp32-01",
  "target": "window",
  "action": "close",
  "positionPercent": 0,
  "source": "automation",
  "status": "pending",
  "acknowledgedAt": null
}
```

## ThingsBoard flow

Za ThingsBoard postoje dva prirodna nacina spajanja:

1. ESP32 direktno salje telemetriju u ThingsBoard preko MQTT-a ili HTTP-a.
2. Ovaj backend salje agregiranu telemetriju u ThingsBoard HTTP Device API.

MVP backend trenutno podrzava drugi nacin preko varijabli:

```text
THINGSBOARD_HOST
THINGSBOARD_ACCESS_TOKEN
THINGSBOARD_SYNC_ENABLED=true
```

Za RPC produkcijski tok preporuka je koristiti ThingsBoard server-side RPC prema ESP32-u. Lokalni command queue ostaje koristan za demonstraciju, razvoj bez clouda i backup scenarij.
