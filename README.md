# WebGL

Project that accompanies VGGI credit module.

Visit vggi-kpi.blogspot.com for more information

## PA2 sensor sync

Run the WebGL preview:

```bash
python3 -m http.server 8000 --bind 127.0.0.1
```

Open `http://127.0.0.1:8000/`.

For Android Sensor Server, use a WebSocket URL in this form:

```text
ws://PHONE_IP:8080/sensor/connect?type=android.sensor.game_rotation_vector
```

For the local bridge server:

```bash
node bridge-server.js
```

This starts:

- `POST /sensor` for incoming sensor JSON
- `ws://127.0.0.1:8091/ws` for the browser client

The browser UI includes `Connect`, `Disconnect`, `Calibrate`, and a toggle for phone-orientation sync.

## Marker-based AR

Open the AR page on the phone:

```text
http://YOUR_HOST:8000/ar.html
```

Files:

- `assets/vr-surface-marker-template.svg` is the custom registration template artwork
- `ar.html` is the AR.js marker scene
- `ARSurface.js` rebuilds the same Sievert surface used in PA#1/PA2

Before final recording, generate `assets/vr-surface-marker.patt` from `assets/vr-surface-marker-template.svg` using the AR.js marker generator:

`https://ar-js-org.github.io/studio/pages/marker/index.html`
