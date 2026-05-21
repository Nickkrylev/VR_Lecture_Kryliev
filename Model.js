// p: an array of xyz vertex coords
// t: an array of uv tex coords
function Vertex(p,t)
{
    this.p = p;
    this.t = t;
    this.normal = [];
    this.triangles = [];
}

function Triangle(v0, v1, v2)
{
    this.v0 = v0;
    this.v1 = v1;
    this.v2 = v2;
    this.normal = [];
    this.tangent = [];
}

// Model Constructor function
function Model(name) {
    this.name = name;
    this.iVertexBuffer = gl.createBuffer();
    this.iTexCoordsBuffer = gl.createBuffer();
    this.iIndexBuffer = gl.createBuffer();
    this.count = 0;
    this.center = [0, 0, 0];

    // Identifier of a diffuse texture
    this.idTextureDiffuse  = -1;

    this.BufferData = function(vertices, indices, texCoords) {
        let vertexCount = vertices.length / 3;
        let center = [0, 0, 0];

        for (let i = 0; i < vertices.length; i += 3) {
            center[0] += vertices[i + 0];
            center[1] += vertices[i + 1];
            center[2] += vertices[i + 2];
        }

        if (vertexCount > 0) {
            center[0] /= vertexCount;
            center[1] /= vertexCount;
            center[2] /= vertexCount;
        }

        this.center = center;

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iTexCoordsBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.iIndexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

        this.count = indices.length;
    }

    this.Draw = function() {
        
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.idTextureDiffuse);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribVertex);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iTexCoordsBuffer);
        gl.vertexAttribPointer(shProgram.iAttribTexCoords, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribTexCoords);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.iIndexBuffer);

        //gl.drawArrays(gl.LINE_STRIP, 0, this.count);
        gl.drawElements(gl.TRIANGLES, this.count, gl.UNSIGNED_SHORT, 0);
    }

    this.DrawWireframe = function() {

        for (let p=0; p<this.count; p+=3)                    // offset in bytes (UNSIGNED_SHORT is two bytes)
            gl.drawElements(gl.LINE_LOOP, 3, gl.UNSIGNED_SHORT, p*2);
    }
}

function SievertPoint(u, v) {
    let C = 1.0;
    let sqrtC = Math.sqrt(C);
    let sqrtCp1 = Math.sqrt(C + 1.0);

    let sinU = Math.sin(u);
    let cosU = Math.cos(u);
    let sinV = Math.sin(v);
    let cosV = Math.cos(v);

    let denominator = (C + 1.0) - C * sinV * sinV * cosU * cosU;
    let a = 2.0 / denominator;

    let r =
        a *
        Math.sqrt((C + 1.0) * (1.0 + C * sinU * sinU)) *
        sinV /
        sqrtC;
    let phi = -u / sqrtCp1 + Math.atan(Math.tan(u) * sqrtCp1);

    let scale = 0.8;
    return [
        scale * r * Math.cos(phi),
        scale * r * Math.sin(phi),
        scale * (Math.log(Math.tan(v / 2.0)) + a * (C + 1.0) * cosV) / sqrtC
    ];
}

function AddSurfaceTriangle(vertices, triangles, v0, v1, v2) {
    let triangle = new Triangle(v0, v1, v2);
    let triangleIndex = triangles.length;

    triangles.push(triangle);
    vertices[v0].triangles.push(triangleIndex);
    vertices[v1].triangles.push(triangleIndex);
    vertices[v2].triangles.push(triangleIndex);
}

function CreateSurfaceData(data)
{
    let vertices = [];
    let triangles = [];

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

            vertices.push(new Vertex(SievertPoint(u, v), [uRatio, vRatio]));
        }
    }

    for (let i = 0; i < uSteps; i++) {
        for (let j = 0; j < vSteps; j++) {
            let v0 = i * rowSize + j;
            let v1 = (i + 1) * rowSize + j;
            let v2 = (i + 1) * rowSize + j + 1;
            let v3 = i * rowSize + j + 1;

            AddSurfaceTriangle(vertices, triangles, v0, v1, v2);
            AddSurfaceTriangle(vertices, triangles, v0, v2, v3);
        }
    }

    data.verticesF32  = new Float32Array(vertices.length*3);
    data.texcoordsF32 = new Float32Array(vertices.length*2);
    for (let i=0, len=vertices.length; i<len; i++)
    {
        data.verticesF32[i*3 + 0] = vertices[i].p[0];
        data.verticesF32[i*3 + 1] = vertices[i].p[1];
        data.verticesF32[i*3 + 2] = vertices[i].p[2];

        data.texcoordsF32[i*2 + 0] = vertices[i].t[0];
        data.texcoordsF32[i*2 + 1] = vertices[i].t[1];
    }

    data.indicesU16 = new Uint16Array(triangles.length*3);
    for (let i=0, len=triangles.length; i<len; i++)
    {
        data.indicesU16[i*3 + 0] = triangles[i].v0;
        data.indicesU16[i*3 + 1] = triangles[i].v1;
        data.indicesU16[i*3 + 2] = triangles[i].v2;
    }

}
