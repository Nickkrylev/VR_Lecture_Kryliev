AFRAME.registerComponent('surface-16', {
    init: function () {
        const group = new THREE.Group();
        const geometry = buildSurfaceGeometry();

        const fillMesh = new THREE.Mesh(
            geometry,
            new THREE.MeshPhongMaterial({
                color: 0x3b82f6,
                emissive: 0x08111f,
                shininess: 80,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.88
            })
        );

        const wireframe = new THREE.LineSegments(
            new THREE.EdgesGeometry(geometry, 18),
            new THREE.LineBasicMaterial({
                color: 0xf8fafc,
                transparent: true,
                opacity: 0.72
            })
        );

        group.add(fillMesh);
        group.add(wireframe);

        this.meshGroup = group;
        this.el.setObject3D('mesh', group);
    },

    tick: function (_time, timeDelta) {
        if (!this.meshGroup) {
            return;
        }

        this.meshGroup.rotation.y += 0.00055 * timeDelta;
        this.meshGroup.rotation.x = 0.35;
    }
});

function buildSurfaceGeometry() {
    const a = 1.5;
    const b = 3.0;
    const c = 2.0;
    const d = 4.0;
    const uSteps = 60;
    const vSteps = 60;
    const uMax = Math.PI * 2;
    const vMax = Math.PI * 2;
    const surfaceData = createVirichSurfaceData(a, b, c, d, uSteps, vSteps, uMax, vMax);
    const geometry = new THREE.BufferGeometry();

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(surfaceData.verts, 3));
    geometry.setIndex(generateIndices(uSteps, vSteps));
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();

    const center = new THREE.Vector3();
    geometry.boundingBox.getCenter(center);
    geometry.translate(-center.x, -center.y, -center.z);

    geometry.computeBoundingBox();
    const size = new THREE.Vector3();
    geometry.boundingBox.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const scaleFactor = 2.35 / maxDim;
    geometry.scale(scaleFactor, scaleFactor, scaleFactor);

    return geometry;
}

function computeSurfacePoint(a, b, c, d, u, v) {
    function f(vLocal) {
        const s = Math.sin(vLocal);
        const co = Math.cos(vLocal);
        return (a * b) / Math.sqrt(a * a * s * s + b * b * co * co);
    }

    const fv = f(v);
    const common = 0.5 * (fv * (1 + Math.cos(u)) + (d * d - c * c) * (1 - Math.cos(u)) / fv);
    const x = common * Math.cos(v);
    const y = common * Math.sin(v);
    const z = 0.5 * (fv - (d * d - c * c) / fv) * Math.sin(u);

    return [x, y, z];
}

function createVirichSurfaceData(a, b, c, d, uSteps, vSteps, uMax, vMax) {
    const verts = [];

    for (let i = 0; i <= uSteps; i++) {
        const u = uMax * i / uSteps;
        for (let j = 0; j <= vSteps; j++) {
            const v = vMax * j / vSteps;
            verts.push(...computeSurfacePoint(a, b, c, d, u, v));
        }
    }

    return { verts: verts };
}

function generateIndices(uSteps, vSteps) {
    const indices = [];

    for (let i = 0; i < uSteps; i++) {
        for (let j = 0; j < vSteps; j++) {
            const idx = i * (vSteps + 1) + j;
            const idxNextU = (i + 1) * (vSteps + 1) + j;
            const idxNextV = i * (vSteps + 1) + (j + 1);
            const idxDiag = (i + 1) * (vSteps + 1) + (j + 1);

            indices.push(idx, idxNextU, idxDiag);
            indices.push(idx, idxDiag, idxNextV);
        }
    }

    return indices;
}
