'use strict';

let gl;                         // The webgl context.
let canvas;                     // The WebGL canvas.
let surface;                    // A surface model
let surfaceWebCam;              // A substrate for webcam image
let shProgram;                  // A shader program
let spaceball;                  // A SimpleRotator object that lets the user rotate the view by mouse.
let stereoCam;                  // Object holding stereo camera and its parameters

let iTextureWebCam = null;

let video;
let controls;

// Constructor
function ShaderProgram(name, program) {

    this.name = name;
    this.prog = program;

    // Location of the vertex attribute variable in the shader program.
    this.iAttribVertex = -1;
    // Location of the texture coordinate attribute variable in the shader program.
    this.iAttribTexCoords = -1;
    // Location of the uniform specifying a color for the primitive.
    this.iColor = -1;
    // Location of the uniform matrix representing the combined transformation.
    this.iModelViewProjectionMatrix = -1;
    // Location of the uniform matrix representing the modelview transformation
    this.iModelViewMatrix = -1;
    // Location of the TMU0
    this.iTMU0 = -1;

    this.Use = function() {
        gl.useProgram(this.prog);
    }
}


/* Draws a colored cube, along with a set of coordinate axes.
 * (Note that the use of the above drawPrimitive function is not an efficient
 * way to draw with WebGL.  Here, the geometry is so simple that it doesn't matter.)
 */
function draw() {
    if (!gl || !spaceball) {
        return;
    }

    resizeCanvas();

    gl.clearColor(0,0,0,1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.uniform1i(shProgram.iTMU0, 0);

    updateWebCamTexture();

    let modelRotation = spaceball.getViewMatrix();
    let modelDepth = getNegativeParallaxModelDepth();
    let modelTransform = m4.multiply(
        m4.translation(0, 0, -modelDepth),
        modelRotation
    );

    const colorPolygon = new Float32Array([0.5,0.5,0.5,1]);
    const colorEdge    = new Float32Array([1,1,1,1]);

    // The FIRST PASS (for the left eye)

    let matrLeftFrustum = stereoCam.calcLeftFrustum();
    gl.uniformMatrix4fv(shProgram.iProjectionMatrix, false, matrLeftFrustum);
    gl.colorMask(true, false, false, true);

    drawWebCamPlane(stereoCam.calcLeftModelView.bind(stereoCam));
    drawStereoModel(
        stereoCam.calcLeftModelView(modelTransform),
        colorPolygon,
        colorEdge
    );

    // The SECOND PASS (for the right eye)

    gl.clear(gl.DEPTH_BUFFER_BIT);

    let matrRightFrustum = stereoCam.calcRightFrustum();
    gl.uniformMatrix4fv(shProgram.iProjectionMatrix, false, matrRightFrustum);
    gl.colorMask(false, true, true, true);

    drawWebCamPlane(stereoCam.calcRightModelView.bind(stereoCam));
    drawStereoModel(
        stereoCam.calcRightModelView(modelTransform),
        colorPolygon,
        colorEdge
    );

    // RESET specific params to their default state

    gl.disable(gl.POLYGON_OFFSET_FILL);
    gl.colorMask(true, true, true, true);
}

function resizeCanvas() {
    let pixelRatio = window.devicePixelRatio || 1;
    let width = Math.round(canvas.clientWidth * pixelRatio);
    let height = Math.round(canvas.clientHeight * pixelRatio);

    if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
    }

    gl.viewport(0, 0, canvas.width, canvas.height);
    stereoCam.setAspectRatio(canvas.width / canvas.height);
}

function updateWebCamTexture() {
    if (!iTextureWebCam || video.readyState < video.HAVE_CURRENT_DATA) {
        return;
    }

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, iTextureWebCam);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, video);
}

function getNegativeParallaxModelDepth() {
    let distanceFromNearToConvergence =
        stereoCam.convergence - stereoCam.nearClippingDistance;

    return stereoCam.nearClippingDistance +
        Math.max(2, distanceFromNearToConvergence * 0.55);
}

function drawWebCamPlane(calcEyeModelView) {
    if (!iTextureWebCam) {
        return;
    }

    let halfHeight =
        stereoCam.convergence * Math.tan(stereoCam.FOV / 2);
    let halfWidth = halfHeight * stereoCam.aspectRatio;
    let planeTransform = m4.multiply(
        m4.translation(0, 0, -stereoCam.convergence),
        m4.scaling(halfWidth, halfHeight, 1)
    );

    surfaceWebCam.idTextureDiffuse = iTextureWebCam;
    gl.uniform1i(shProgram.bUseTexture, 1);
    gl.uniformMatrix4fv(
        shProgram.iModelViewMatrix,
        false,
        calcEyeModelView(planeTransform)
    );
    surfaceWebCam.Draw();
}

function drawStereoModel(modelView, colorPolygon, colorEdge) {
    gl.uniform1i(shProgram.bUseTexture, 0);
    gl.uniformMatrix4fv(shProgram.iModelViewMatrix, false, modelView);

    gl.enable(gl.POLYGON_OFFSET_FILL);
    gl.polygonOffset(1, 1);
    gl.uniform4fv(shProgram.iColor, colorPolygon);
    surface.Draw();

    gl.disable(gl.POLYGON_OFFSET_FILL);
    gl.uniform4fv(shProgram.iColor, colorEdge);
    surface.DrawWireframe();
}



/* Initialize the WebGL context. Called from init() */
function initGL() {
    let prog = createProgram( gl, vertexShaderSource, fragmentShaderSource );

    shProgram = new ShaderProgram('Basic', prog);
    shProgram.Use();

    shProgram.iAttribVertex              = gl.getAttribLocation(prog, "vertex");
    shProgram.iAttribTexCoords           = gl.getAttribLocation(prog, "tex");
    shProgram.iModelViewMatrix           = gl.getUniformLocation(prog, "ModelViewMatrix");
    shProgram.iProjectionMatrix          = gl.getUniformLocation(prog, "ProjectionMatrix");
    shProgram.iColor                     = gl.getUniformLocation(prog, "color");
    shProgram.bUseTexture                = gl.getUniformLocation(prog, "bUseTexture");
   
    shProgram.iTMU0                      = gl.getUniformLocation(prog, "iTMU0");

    let data = {};
    
    CreateSurfaceData(data)

    surface = new Model('Surface');
    surface.BufferData(data.verticesF32, data.indicesU16, data.texcoordsF32);

    surfaceWebCam = new Model('SurfaceWebCam');
    surfaceWebCam.BufferData(
        new Float32Array([
            -1, -1, 0,
             1, -1, 0,
             1,  1, 0,
            -1,  1, 0
        ]),
        new Uint16Array([0, 1, 2, 0, 2, 3]),
        new Float32Array([
            0, 1,
            1, 1,
            1, 0,
            0, 0
        ])
    );

    stereoCam = new StereoCamera(
        14.0,   // convergence in decimeters
        0.7,    // eye separation in decimeters
        1.0,    // aspect ratio is updated from the canvas
        45.0,   // vertical FOV in degrees
        8.0,    // decimeters
        30.0    // decimeters
    );

    surface.idTextureDiffuse  = LoadTexture();

    gl.enable(gl.DEPTH_TEST);
}


/* Creates a program for use in the WebGL context gl, and returns the
 * identifier for that program.  If an error occurs while compiling or
 * linking the program, an exception of type Error is thrown.  The error
 * string contains the compilation or linking error.  If no error occurs,
 * the program identifier is the return value of the function.
 * The second and third parameters are strings that contain the
 * source code for the vertex shader and for the fragment shader.
 */
function createProgram(gl, vShader, fShader) {
    let vsh = gl.createShader( gl.VERTEX_SHADER );
    gl.shaderSource(vsh,vShader);
    gl.compileShader(vsh);
    if ( ! gl.getShaderParameter(vsh, gl.COMPILE_STATUS) ) {
        throw new Error("Error in vertex shader:  " + gl.getShaderInfoLog(vsh));
     }
    let fsh = gl.createShader( gl.FRAGMENT_SHADER );
    gl.shaderSource(fsh, fShader);
    gl.compileShader(fsh);
    if ( ! gl.getShaderParameter(fsh, gl.COMPILE_STATUS) ) {
       throw new Error("Error in fragment shader:  " + gl.getShaderInfoLog(fsh));
    }
    let prog = gl.createProgram();
    gl.attachShader(prog,vsh);
    gl.attachShader(prog, fsh);
    gl.linkProgram(prog);
    if ( ! gl.getProgramParameter( prog, gl.LINK_STATUS) ) {
       throw new Error("Link error in program:  " + gl.getProgramInfoLog(prog));
    }
    return prog;
}


/**
 * initialization function that will be called when the page has loaded
 */
function init() {
    try {
        canvas = document.getElementById("webglcanvas");
        gl = canvas.getContext("webgl");
        if ( ! gl ) {
            throw "Browser does not support WebGL";
        }
    }
    catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not get a WebGL graphics context.</p>";
        return;
    }
    try {
        initGL();  // initialize the WebGL graphics context
    }
    catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not initialize the WebGL graphics context: " + e + "</p>";
        return;
    }

    bindCameraControls();

    video = document.createElement('video');
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;

    // Connect to video stream
    let constraints = {video: true};
    setCameraStatus("Requesting webcam access");

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraStatus("Webcam capture is unavailable in this browser context");
    } else {
        navigator.mediaDevices.getUserMedia(constraints).then(function (stream) {
        video.srcObject = stream;

        let track = stream.getVideoTracks()[0];
        let settings = track.getSettings();

        video.oncanplay = function () {
            let width = settings.width || video.videoWidth || 1;
            let height = settings.height || video.videoHeight || 1;
            iTextureWebCam = CreateWebCamTexture(width, height);
            setCameraStatus("Webcam stream active");
        };

        // Fired when the browser has metadata (width, height, duration, etc.)
        video.onloadedmetadata = function () {
            video.play();
        };
        })
        .catch(function(err) {
            setCameraStatus(err.name + ": " + err.message);
        });
    }

    spaceball = new TrackballRotator(canvas, draw, 0);
    spaceball.setRotationCenter(surface.center);

    requestAnimationFrame(renderFrame);
}

function renderFrame() {
    draw();
    requestAnimationFrame(renderFrame);
}

function bindCameraControls() {
    controls = {
        eyeSeparation: document.getElementById("eye-separation"),
        fov: document.getElementById("fov"),
        near: document.getElementById("near-clipping"),
        convergence: document.getElementById("convergence"),
        eyeSeparationValue: document.getElementById("eye-separation-value"),
        fovValue: document.getElementById("fov-value"),
        nearValue: document.getElementById("near-clipping-value"),
        convergenceValue: document.getElementById("convergence-value")
    };

    [
        controls.eyeSeparation,
        controls.fov,
        controls.near,
        controls.convergence
    ].forEach(function(control) {
        control.addEventListener("input", updateCameraFromControls);
    });

    updateCameraFromControls();
}

function updateCameraFromControls() {
    let eyeSeparation = Number(controls.eyeSeparation.value);
    let fov = Number(controls.fov.value);
    let near = Number(controls.near.value);
    let convergence = Math.max(Number(controls.convergence.value), near + 4);

    controls.convergence.value = convergence;

    stereoCam.eyeSeparation = eyeSeparation;
    stereoCam.nearClippingDistance = near;
    stereoCam.convergence = convergence;
    stereoCam.farClippingDistance = Math.max(30, convergence + 8);
    stereoCam.setFovDegrees(fov);

    controls.eyeSeparationValue.textContent = eyeSeparation.toFixed(2);
    controls.fovValue.textContent = fov.toFixed(0) + " deg";
    controls.nearValue.textContent = near.toFixed(1);
    controls.convergenceValue.textContent = convergence.toFixed(1);

    draw();
}

function setCameraStatus(message) {
    document.getElementById("camera-status").textContent = message;
}
