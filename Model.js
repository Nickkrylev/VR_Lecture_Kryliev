function CreateSurfaceData(data) {
    const vertices = [];
    const triangles = [];

    const rows = 96;
    const cols = 128;

    const C = 1.0;
    const U_MIN = -1.5;
    const U_MAX = 1.5;
    const V_MIN = 0.05;
    const V_MAX = Math.PI - 0.05;
    const SCALE = 0.8;

    const sqrtC = Math.sqrt(C);
    const sqrtCPlusOne = Math.sqrt(C + 1.0);

    for (let row = 0; row <= rows; row += 1) {
        const tV = row / rows;
        const v = V_MIN + tV * (V_MAX - V_MIN);

        const sinV = Math.sin(v);
        const cosV = Math.cos(v);
        const logTanHalfV = Math.log(Math.tan(v * 0.5));

        for (let col = 0; col <= cols; col += 1) {
            const tU = col / cols;
            const u = U_MIN + tU * (U_MAX - U_MIN);

            const sinU = Math.sin(u);
            const cosU = Math.cos(u);
            const tanU = Math.tan(u);

            const denom = (C + 1.0) - C * sinV * sinV * cosU * cosU;
            const a = 2.0 / denom;

            const phi = -u / sqrtCPlusOne + Math.atan(tanU * sqrtCPlusOne);

            const r = (
                a
                * Math.sqrt((C + 1.0) * (1.0 + C * sinU * sinU))
                * sinV
            ) / sqrtC;

            const x = r * Math.cos(phi);
            const y = r * Math.sin(phi);
            const z = (logTanHalfV + a * (C + 1.0) * cosV) / sqrtC;

            vertices.push(new Vertex([
                x * SCALE,
                z * SCALE,
                y * SCALE
            ]));
        }
    }

    const stride = cols + 1;
    for (let row = 0; row < rows; row += 1) {
        for (let col = 0; col < cols; col += 1) {
            const v0 = row * stride + col;
            const v1 = v0 + 1;
            const v2 = v0 + stride;
            const v3 = v2 + 1;

            triangles.push(new Triangle(v0, v2, v1));
            triangles.push(new Triangle(v1, v2, v3));
        }
    }

    centerVertices(vertices);

    data.verticesF32 = new Float32Array(vertices.length * 3);
    for (let i = 0; i < vertices.length; i += 1) {
        data.verticesF32[i * 3 + 0] = vertices[i].p[0];
        data.verticesF32[i * 3 + 1] = vertices[i].p[1];
        data.verticesF32[i * 3 + 2] = vertices[i].p[2];
    }

    data.indicesU16 = new Uint16Array(triangles.length * 3);
    for (let i = 0; i < triangles.length; i += 1) {
        data.indicesU16[i * 3 + 0] = triangles[i].v0;
        data.indicesU16[i * 3 + 1] = triangles[i].v1;
        data.indicesU16[i * 3 + 2] = triangles[i].v2;
    }
}
