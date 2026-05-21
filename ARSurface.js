function createSievertGeometry() {
    let vertices = [];
    let uvs = [];
    let indices = [];

    let uMin = -1.5;
    let uMax = 1.5;
    let vMin = 0.05;
    let vMax = Math.PI - 0.05;
    let uSteps = 35;
    let vSteps = 45;
    let rowSize = vSteps + 1;

    for (let i = 0; i <= uSteps; i++) {
        let uRatio = i / uSteps;
        let u = uMin + (uMax - uMin) * uRatio;

        for (let j = 0; j <= vSteps; j++) {
            let vRatio = j / vSteps;
            let v = vMin + (vMax - vMin) * vRatio;
            let point = SievertPoint(u, v);

            vertices.push(point[0], point[1], point[2]);
            uvs.push(uRatio, vRatio);
        }
    }

    for (let i = 0; i < uSteps; i++) {
        for (let j = 0; j < vSteps; j++) {
            let v0 = i * rowSize + j;
            let v1 = (i + 1) * rowSize + j;
            let v2 = (i + 1) * rowSize + j + 1;
            let v3 = i * rowSize + j + 1;

            indices.push(v0, v1, v2);
            indices.push(v0, v2, v3);
        }
    }

    let geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
        'position',
        new THREE.Float32BufferAttribute(vertices, 3)
    );
    geometry.setAttribute(
        'uv',
        new THREE.Float32BufferAttribute(uvs, 2)
    );
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    return geometry;
}

AFRAME.registerComponent('sievert-surface', {
    init: function() {
        let geometry = createSievertGeometry();
        geometry.computeBoundingBox();

        let bounds = geometry.boundingBox;
        let center = new THREE.Vector3();
        bounds.getCenter(center);
        geometry.translate(-center.x, -center.y, -center.z);

        let fillMaterial = new THREE.MeshStandardMaterial({
            color: '#b9c5c0',
            metalness: 0.05,
            roughness: 0.72,
            side: THREE.DoubleSide
        });

        let mesh = new THREE.Mesh(geometry, fillMaterial);

        let wireframe = new THREE.LineSegments(
            new THREE.WireframeGeometry(geometry),
            new THREE.LineBasicMaterial({ color: '#ffffff' })
        );

        let group = new THREE.Group();
        group.add(mesh);
        group.add(wireframe);
        this.el.setObject3D('mesh', group);
    }
});
