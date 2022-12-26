import * as THREE from 'three';

export class Boid {
    public position: THREE.Vector3;
    public velocity: THREE.Vector3;
    public acceleration: THREE.Vector3;
    public mesh: THREE.Mesh
    private _scene: THREE.Scene;
    private _screen: { width: number; height: number };


    constructor(scene: THREE.Scene, screen: { width: number; height: number }) {
        this._scene = scene;
        this._screen = screen;
        this.position = new THREE.Vector3();
        this.velocity = new THREE.Vector3();
        this.acceleration = new THREE.Vector3();
        this.position.set(Math.random() * 50 - 5, Math.random() * 50 - 5, Math.random() * 50 - 5);
        this.velocity.set(THREE.MathUtils.randFloat(-1, 1),THREE.MathUtils.randFloat(-1, 1), THREE.MathUtils.randFloat(-1, 1));
        this.mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({color: "#f00"}));
        this.mesh.position.copy(this.position);
        this._scene.add(this.mesh);
    }

    public update(boids: Boid[]) {
        this.flock(boids);
        this.position.add(this.velocity);
        this.velocity.add(this.acceleration);
        this.acceleration.multiplyScalar(0);
        this.edges();
        this.render();
    }

    public render() {
        this.mesh.position.copy(this.position);
        this.mesh.lookAt(this.position.clone().add(this.velocity));
    }

    public applyForce(force: THREE.Vector3) {
        this.acceleration.add(force);
    }

    public flock(boids: Boid[]) {
        let sep = this.separate(boids);
        let ali = this.align(boids);
        let coh = this.cohesion(boids);
        sep.multiplyScalar(1.5);
        ali.multiplyScalar(1.0);
        coh.multiplyScalar(1.0);
        this.applyForce(sep);
        this.applyForce(ali);
        this.applyForce(coh);
    }

    public calculateSteering(boids: Boid[], getVector: (other: Boid) => THREE.Vector3) {
        let perceptionRadius = 20;
        let steering = new THREE.Vector3();
        let total = 0;
        for (let other of boids) {
            let d = this.position.distanceTo(other.position);
            if (other != this && d < perceptionRadius) {
                steering.add(getVector(other));
                total++;
            }
        }
        if (total > 0) {
            steering.divideScalar(total);
            if (getVector(this) === this.position) steering.sub(this.position);
            steering.multiplyScalar(3);
            steering.sub(this.velocity);
            steering.clampLength(0, 0.1);
        }
        return steering;
    }

    public align(boids: Boid[]): THREE.Vector3 {
        return this.calculateSteering(boids, (other) => other.velocity);
    }

    public cohesion(boids: Boid[]) : THREE.Vector3 {
       return this.calculateSteering(boids, (other) => other.position);
    }

    public separate(boids: Boid[]) : THREE.Vector3 {
        return this.calculateSteering(boids, (other) => {
            let diff = new THREE.Vector3();
            diff.subVectors(this.position, other.position);
            diff.normalize();
            diff.divideScalar(this.position.distanceTo(other.position));
            return diff;
        });
    }

    edges() {
        if (this.position.x > this._screen.width / 2) this.position.x = -this._screen.width / 2;
        if (this.position.x < -this._screen.width / 2) this.position.x = this._screen.width / 2;
        if (this.position.y > this._screen.height / 2) this.position.y = -this._screen.height / 2;
        if (this.position.y < -this._screen.height / 2) this.position.y = this._screen.height / 2;
    }


}