function identityRotation3() {
    return [
        1, 0, 0,
        0, 1, 0,
        0, 0, 1
    ];
}

function transposeRotation3(rotation) {
    return [
        rotation[0], rotation[3], rotation[6],
        rotation[1], rotation[4], rotation[7],
        rotation[2], rotation[5], rotation[8]
    ];
}

function multiplyRotation3(left, right) {
    return [
        left[0] * right[0] + left[1] * right[3] + left[2] * right[6],
        left[0] * right[1] + left[1] * right[4] + left[2] * right[7],
        left[0] * right[2] + left[1] * right[5] + left[2] * right[8],
        left[3] * right[0] + left[4] * right[3] + left[5] * right[6],
        left[3] * right[1] + left[4] * right[4] + left[5] * right[7],
        left[3] * right[2] + left[4] * right[5] + left[5] * right[8],
        left[6] * right[0] + left[7] * right[3] + left[8] * right[6],
        left[6] * right[1] + left[7] * right[4] + left[8] * right[7],
        left[6] * right[2] + left[7] * right[5] + left[8] * right[8]
    ];
}

function getRotationMatrixFromVector(rotationVector) {
    let q1 = rotationVector[0];
    let q2 = rotationVector[1];
    let q3 = rotationVector[2];
    let q0;

    if (rotationVector.length >= 4) {
        q0 = rotationVector[3];
    } else {
        q0 = 1 - q1 * q1 - q2 * q2 - q3 * q3;
        q0 = q0 > 0 ? Math.sqrt(q0) : 0;
    }

    let sqQ1 = 2 * q1 * q1;
    let sqQ2 = 2 * q2 * q2;
    let sqQ3 = 2 * q3 * q3;
    let q1Q2 = 2 * q1 * q2;
    let q3Q0 = 2 * q3 * q0;
    let q1Q3 = 2 * q1 * q3;
    let q2Q0 = 2 * q2 * q0;
    let q2Q3 = 2 * q2 * q3;
    let q1Q0 = 2 * q1 * q0;

    return [
        1 - sqQ2 - sqQ3,
        q1Q2 - q3Q0,
        q1Q3 + q2Q0,
        q1Q2 + q3Q0,
        1 - sqQ1 - sqQ3,
        q2Q3 - q1Q0,
        q1Q3 - q2Q0,
        q2Q3 + q1Q0,
        1 - sqQ1 - sqQ2
    ];
}

function rotation3ToMat4(rotation) {
    return new Float32Array([
        rotation[0], rotation[3], rotation[6], 0,
        rotation[1], rotation[4], rotation[7], 0,
        rotation[2], rotation[5], rotation[8], 0,
        0, 0, 0, 1
    ]);
}

function extractQuaternionPayload(payload) {
    if (Array.isArray(payload.quaternion) && payload.quaternion.length >= 4) {
        return payload.quaternion.slice(0, 4);
    }

    if (
        typeof payload.x === "number" &&
        typeof payload.y === "number" &&
        typeof payload.z === "number" &&
        typeof payload.w === "number"
    ) {
        return [payload.x, payload.y, payload.z, payload.w];
    }

    if (
        typeof payload.qx === "number" &&
        typeof payload.qy === "number" &&
        typeof payload.qz === "number" &&
        typeof payload.qw === "number"
    ) {
        return [payload.qx, payload.qy, payload.qz, payload.qw];
    }

    return null;
}

function parseSensorPayload(messageData) {
    let payload;

    try {
        payload = JSON.parse(messageData);
    } catch (error) {
        return null;
    }

    if (Array.isArray(payload)) {
        return {
            accuracy: null,
            timestamp: null,
            values: payload
        };
    }

    if (!payload || typeof payload !== "object") {
        return null;
    }

    if (Array.isArray(payload.values)) {
        return payload;
    }

    if (Array.isArray(payload.rotationVector)) {
        return {
            accuracy: payload.accuracy ?? null,
            timestamp: payload.timestamp ?? null,
            values: payload.rotationVector
        };
    }

    let quaternion = extractQuaternionPayload(payload);
    if (quaternion) {
        return {
            accuracy: payload.accuracy ?? null,
            timestamp: payload.timestamp ?? null,
            values: quaternion
        };
    }

    return null;
}

function PhoneSensorController(onUpdate) {
    this.onUpdate = onUpdate;
    this.socket = null;
    this.url = "";
    this.status = "Idle";
    this.messageCount = 0;
    this.latestPayload = null;
    this.currentRotation = identityRotation3();
    this.referenceRotation = null;
    this.relativeRotation = identityRotation3();

    this.notify = function() {
        if (this.onUpdate) {
            this.onUpdate(this.getSnapshot());
        }
    };

    this.setStatus = function(status) {
        this.status = status;
        this.notify();
    };

    this.getSnapshot = function() {
        return {
            active: !!this.socket,
            connected: !!this.socket && this.socket.readyState === WebSocket.OPEN,
            messageCount: this.messageCount,
            latestPayload: this.latestPayload,
            status: this.status,
            url: this.url,
            hasReference: !!this.referenceRotation
        };
    };

    this.updateRelativeRotation = function() {
        if (!this.referenceRotation) {
            this.relativeRotation = identityRotation3();
            return;
        }

        this.relativeRotation = multiplyRotation3(
            this.currentRotation,
            transposeRotation3(this.referenceRotation)
        );
    };

    this.ingestPayload = function(payload) {
        if (!payload || !Array.isArray(payload.values) || payload.values.length < 3) {
            return;
        }

        this.latestPayload = payload;
        this.currentRotation = getRotationMatrixFromVector(payload.values);

        if (!this.referenceRotation) {
            this.referenceRotation = this.currentRotation.slice();
        }

        this.updateRelativeRotation();
        this.messageCount += 1;
        this.status = "Streaming sensor data";
        this.notify();
    };

    this.connect = function(url) {
        this.disconnect(false);
        this.url = url;
        this.latestPayload = null;
        this.messageCount = 0;
        this.referenceRotation = null;
        this.relativeRotation = identityRotation3();
        this.setStatus("Connecting");

        this.socket = new WebSocket(url);

        this.socket.addEventListener("open", function() {
            this.setStatus("Connected, waiting for samples");
        }.bind(this));

        this.socket.addEventListener("message", function(event) {
            let payload = parseSensorPayload(event.data);

            if (!payload) {
                this.setStatus("Unsupported sensor payload");
                return;
            }

            this.ingestPayload(payload);
        }.bind(this));

        this.socket.addEventListener("close", function() {
            this.socket = null;
            this.setStatus("Disconnected");
        }.bind(this));

        this.socket.addEventListener("error", function() {
            this.setStatus("WebSocket error");
        }.bind(this));
    };

    this.disconnect = function(announce) {
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }

        this.referenceRotation = null;
        this.relativeRotation = identityRotation3();
        this.latestPayload = null;
        this.messageCount = 0;

        if (announce !== false) {
            this.setStatus("Disconnected");
        }
    };

    this.calibrate = function() {
        if (!this.latestPayload) {
            this.setStatus("No samples available for calibration");
            return;
        }

        this.referenceRotation = this.currentRotation.slice();
        this.updateRelativeRotation();
        this.setStatus("Calibrated to current phone pose");
    };

    this.getRelativeMatrix4 = function() {
        return rotation3ToMat4(this.relativeRotation);
    };
}
