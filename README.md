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
