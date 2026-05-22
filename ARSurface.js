AFRAME.registerComponent('sievert-surface', {
    init: function() {
        let element = this.el;
        let geometry = createSievertGeometry();

        let containerGeometry = new THREE.BoxGeometry(1, 1, 1);
        let containerMaterial = new THREE.MeshNormalMaterial({
            opacity: 0.2,
            side: THREE.BackSide,
            transparent: true
        });
        let container = new THREE.Mesh(containerGeometry, containerMaterial);
        element.setObject3D('container', container);

        geometry.computeBoundingBox();

        let center = new THREE.Vector3();
        geometry.boundingBox.getCenter(center);
        geometry.translate(-center.x, -center.y, -center.z);

        let size = new THREE.Vector3();
        geometry.boundingBox.getSize(size);
        let maxDimension = Math.max(size.x, size.y, size.z);
        let scaleFactor = maxDimension > 0 ? 0.95 / maxDimension : 1;
        geometry.scale(scaleFactor, scaleFactor, scaleFactor);

        let material = new THREE.MeshPhongMaterial({
            color: 0xff9900,
            opacity: 0.8,
            side: THREE.DoubleSide,
            transparent: true,
            wireframe: true
        });

        this.surfaceMesh = new THREE.Mesh(geometry, material);
        this.surfaceMesh.rotation.x = 1;
        element.setObject3D('mesh', this.surfaceMesh);
    },

    tick: function() {
        if (this.surfaceMesh) {
            this.surfaceMesh.rotation.y += 0.01;
        }
    }
});

function createSievertGeometry() {
    let vertices = [];
    let indices = [];

    let uMin = -1.5;
    let uMax = 1.5;
    let vMin = 0.05;
    let vMax = Math.PI - 0.05;
    let uSteps = 35;
    let vSteps = 45;
    let rowSize = vSteps + 1;

    for (let i = 0; i <= uSteps; i++) {
        let u = uMin + (uMax - uMin) * i / uSteps;

        for (let j = 0; j <= vSteps; j++) {
            let v = vMin + (vMax - vMin) * j / vSteps;
            let point = sievertPoint(u, v);
            vertices.push(point[0], point[1], point[2]);
        }
    }

    for (let i = 0; i < uSteps; i++) {
        for (let j = 0; j < vSteps; j++) {
            let index = i * rowSize + j;
            let nextU = (i + 1) * rowSize + j;
            let nextV = i * rowSize + j + 1;
            let diagonal = (i + 1) * rowSize + j + 1;

            indices.push(index, nextU, diagonal);
            indices.push(index, diagonal, nextV);
        }
    }

    let geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
        'position',
        new THREE.Float32BufferAttribute(vertices, 3)
    );
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    return geometry;
}

function sievertPoint(u, v) {
    let c = 1.0;
    let sqrtC = Math.sqrt(c);
    let sqrtCp1 = Math.sqrt(c + 1.0);

    let sinU = Math.sin(u);
    let cosU = Math.cos(u);
    let sinV = Math.sin(v);
    let cosV = Math.cos(v);

    let denominator = (c + 1.0) - c * sinV * sinV * cosU * cosU;
    let a = 2.0 / denominator;

    let radius = (
        a *
        Math.sqrt((c + 1.0) * (1.0 + c * sinU * sinU)) *
        sinV
    ) / sqrtC;
    let phi = -u / sqrtCp1 + Math.atan(Math.tan(u) * sqrtCp1);

    let scale = 0.8;
    return [
        scale * radius * Math.cos(phi),
        scale * radius * Math.sin(phi),
        scale * (
            Math.log(Math.tan(v / 2.0)) +
            a * (c + 1.0) * cosV
        ) / sqrtC
    ];
}
