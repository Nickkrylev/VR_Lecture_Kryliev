function StereoCamera(
    convergence,
    eyeSeparation,
    aspectRatio,
    fovDegrees,
    nearClippingDistance,
    farClippingDistance
) {
    this.convergence = convergence;
    this.eyeSeparation = eyeSeparation;
    this.aspectRatio = aspectRatio;
    this.fovDegrees = fovDegrees;
    this.FOV = fovDegrees * Math.PI / 180;
    this.nearClippingDistance = nearClippingDistance;
    this.farClippingDistance = farClippingDistance;

    this.setAspectRatio = function(aspectRatio) {
        this.aspectRatio = aspectRatio;
    };

    this.setFovDegrees = function(fovDegrees) {
        this.fovDegrees = fovDegrees;
        this.FOV = fovDegrees * Math.PI / 180;
    };

    this.calcFrustum = function(eyeOffset) {
        let top = this.nearClippingDistance * Math.tan(this.FOV / 2);
        let bottom = -top;
        let halfWidthAtConvergence =
            this.aspectRatio * Math.tan(this.FOV / 2) * this.convergence;
        let nearScale = this.nearClippingDistance / this.convergence;

        let left = (-halfWidthAtConvergence + eyeOffset) * nearScale;
        let right = (halfWidthAtConvergence + eyeOffset) * nearScale;

        return m4.frustum(
            left,
            right,
            bottom,
            top,
            this.nearClippingDistance,
            this.farClippingDistance
        );
    };

    this.calcLeftFrustum = function() {
        return this.calcFrustum(this.eyeSeparation / 2);
    };

    this.calcRightFrustum = function() {
        return this.calcFrustum(-this.eyeSeparation / 2);
    };

    this.calcEyeModelView = function(eyeOffset, modelView) {
        return m4.multiply(m4.translation(eyeOffset, 0, 0), modelView);
    };

    this.calcLeftModelView = function(modelView) {
        return this.calcEyeModelView(this.eyeSeparation / 2, modelView);
    };

    this.calcRightModelView = function(modelView) {
        return this.calcEyeModelView(-this.eyeSeparation / 2, modelView);
    };
}
