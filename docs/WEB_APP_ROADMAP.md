# WindowSense web app roadmap

Ovo je kratki plan nastavka nakon trenutnog MVP-a.

## MVP koji je sada spreman

- Web dashboard za nadzor senzora, prozora, roleta, automatizacije i IoT statusa.
- Spring Boot REST API za telemetriju, komande, pragove i stanje sustava.
- Server-Sent Events za live prikaz bez refreshanja.
- Lokalni command queue za ESP32 demonstraciju.
- ThingsBoard HTTP Device API adapter za slanje telemetrije.
- Dokumentiran IoT payload i tok komandi.

## Sljedeci koraci

1. Dodati stvarnu vremensku prognozu.
   Backend treba servis koji periodicki dohvaća prognozu iz odabranog weather API-ja i puni `rainProbability`, `windKph`, `outdoorTempC` i `condition`.

2. Dodati trajnu pohranu.
   Trenutno je stanje in-memory. Za projektni demo je dovoljno, ali za dugotrajan rad treba SQLite ili PostgreSQL za dogadjaje, konfiguraciju i povijesnu telemetriju.

3. Ucvrstiti ESP32 integraciju.
   Definirati firmware payload, polling interval, retry logiku, potvrdu izvrsenja komandi i sigurnosni token za lokalni backend API.

4. Prosiriti ThingsBoard integraciju.
   Trenutni adapter salje telemetriju. Produkcijska verzija moze citati ThingsBoard alarme, koristiti server-side RPC i mapirati svaki prozor/roletu kao zaseban device ili asset.

5. Dodati korisnicke role.
   Admin mijenja pragove i konfiguraciju, operator upravlja uredjajima, viewer samo prati stanje.

6. Dodati obavijesti.
   Web toast vec postoji, a sljedeci nivo su email/Teams/Telegram obavijesti za kisu, jak vjetar, neuspjesnu komandu ili offline uredjaj.

7. Pripremiti deploy.
   Dodati Dockerfile, healthcheck, reverse proxy upute i produkcijske environment varijable.

8. Dodati Spring profile.
   `dev` profil moze koristiti simulirano stanje i lokalni ThingsBoard, a `prod` profil produkcijske tajne i stabilniji logging.

## Predlozena demo skripta

1. Otvoriti dashboard.
2. Pokazati pocetno stanje: prozor djelomicno otvoren, rolete djelomicno spustene.
3. U simulaciji ukljuciti senzor kise i kliknuti `Primijeni`.
4. Pokazati da se prozor automatski zatvara i da se u dogadjajima vidi automatska odluka.
5. Povecati lux i temperaturu te pokazati automatsko spustanje roleta.
6. Prebaciti u `Manual` i pokazati da korisnik moze rucno upravljati sustavom.
