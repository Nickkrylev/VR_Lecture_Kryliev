AFRAME.registerComponent('drop-surface-18', {
    init: function () {
        const el = this.el;

        const group = new THREE.Group();

        const surfaceData = createSievertSurfaceData(64, 112);
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(surfaceData.vertices, 3));
        geometry.setIndex(surfaceData.indices);
        geometry.computeVertexNormals();
        normalizeGeometryToUnitSize(geometry, 1.25);

        const solidMaterial = new THREE.MeshPhongMaterial({
            color: 0x31d158,
            transparent: true,
            opacity: 0.48,
            side: THREE.DoubleSide,
            shininess: 45
        });

        const wireMaterial = new THREE.MeshBasicMaterial({
            color: 0x0b3d1b,
            wireframe: true,
            transparent: true,
            opacity: 0.95,
            side: THREE.DoubleSide
        });

        const solidMesh = new THREE.Mesh(geometry, solidMaterial);
        const wireMesh = new THREE.Mesh(geometry.clone(), wireMaterial);

        group.add(solidMesh);
        group.add(wireMesh);

        const axisMaterial = new THREE.MeshBasicMaterial({ color: 0xff3344 });
        const axisGeometry = new THREE.CylinderGeometry(0.025, 0.025, 1.0, 16);
        const axis = new THREE.Mesh(axisGeometry, axisMaterial);
        axis.position.set(0, -0.05, 0.18);
        group.add(axis);

        group.position.y = 0.62;
        group.rotation.x = 0;

        el.setObject3D('drop-surface', group);
    }
});

function createSievertSurfaceData(rows, cols) {
    const vertices = [];
    const indices = [];
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

            vertices.push(
                x * SCALE,
                z * SCALE,
                y * SCALE
            );
        }
    }

    const stride = cols + 1;
    for (let row = 0; row < rows; row += 1) {
        for (let col = 0; col < cols; col += 1) {
            const v0 = row * stride + col;
            const v1 = v0 + 1;
            const v2 = v0 + stride;
            const v3 = v2 + 1;

            indices.push(v0, v2, v1);
            indices.push(v1, v2, v3);
        }
    }

    return { vertices, indices };
}

function normalizeGeometryToUnitSize(geometry, targetSize) {
    geometry.computeBoundingBox();

    const box = geometry.boundingBox;
    const center = new THREE.Vector3();
    const size = new THREE.Vector3();

    box.getCenter(center);
    box.getSize(size);

    geometry.translate(-center.x, -center.y, -center.z);

    const maxDimension = Math.max(size.x, size.y, size.z);
    const scale = targetSize / maxDimension;
    geometry.scale(scale, scale, scale);

    geometry.computeBoundingBox();
}
