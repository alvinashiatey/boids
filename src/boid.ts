import * as THREE from 'three';
import * as dat from 'dat.gui';


import sky from '../public/sky.png';

export type BoidSettings = {
    maxSpeed: number,
    maxForce: number,
    separationWeight: number,
    alignmentWeight: number,
    cohesionWeight: number
    centerDist: number
    alignmentDist: number
    separationDist: number
    cohesionDist: number
    boundingContainer: string
}

export class BoidBoxContainer extends THREE.Mesh{
    constructor(width: number=2300, height: number=2300, depth: number = 2300) {
        const geometry = new THREE.BoxGeometry(width, height, depth, 10, 10, 10);
        const material = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.2,
            wireframe: false,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
        });
        super(geometry, material);
    }
}

export class BoidSphereContainer extends THREE.Mesh{
    constructor(radius: number=2300, widthSegments: number=100, heightSegments: number=100) {
        const geometry = new THREE.SphereGeometry(radius, widthSegments, heightSegments);
        const texture = new THREE.TextureLoader().load(sky);
        const material = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            // opacity: 0.2,
            wireframe: false,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            map: texture,
            side: THREE.DoubleSide
        }) as THREE.MeshBasicMaterial;
        super(geometry, material);
        this.initGUI()
    }

    initGUI() {
        const gui = new dat.GUI();

        const materialFolder = gui.addFolder('Material');
        materialFolder.add(this.material, 'opacity', 0, 1);
        materialFolder.add(this.material, 'wireframe');

        const textureFolder = gui.addFolder('Texture');
        textureFolder.add(this, 'loadTexture');
    }

    protected loadTexture(): void {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.onchange = () => {
            const file = fileInput.files?.[0];
            if (file) {
                const textureLoader = new THREE.TextureLoader();
                if (this.material instanceof THREE.MeshBasicMaterial) {
                    this.material.map = textureLoader.load(URL.createObjectURL(file));
                    this.material.needsUpdate = true;
                }
            }
        };
        fileInput.click();
    }
}

export class Boid extends THREE.Mesh {
    public velocity: THREE.Vector3;
    public acceleration: THREE.Vector3;

    constructor(geometry: THREE.CylinderGeometry = new THREE.CylinderGeometry(1,8,25, 12), material: THREE.Material = new THREE.MeshNormalMaterial()) {
        geometry.rotateX(THREE.MathUtils.degToRad(90));
        super(geometry, material);
        this.velocity = new THREE.Vector3();
        this.acceleration = new THREE.Vector3();
        const x = this.getRandomInt(500, 1000);
        const y = THREE.MathUtils.degToRad(this.getRandomInt(180));
        const z = THREE.MathUtils.degToRad(this.getRandomInt(360));
        this.position.x = Math.sin(y) * Math.cos(z) * x;
        this.position.y = Math.sin(y) * Math.sin(z) * x;
        this.position.z = Math.cos(y) * x;
        this.velocity.set(THREE.MathUtils.randFloat(-100, 100)*0.1,THREE.MathUtils.randFloat(-100, 100)*0.1, THREE.MathUtils.randFloat(-100, 100)*0.1);
    }

    private getRandomInt(min: number=0, max:number =0):number{
        return  Math.floor(Math.random() * (max + 1 - min)) + min;
    }

    public update(boids: Boid[], settings: BoidSettings) {
        this.boidBehaviour(boids, settings);
        this.velocity.add(this.acceleration);
        if (this.velocity.length() > settings.maxSpeed) {
            this.velocity.clampLength(0, settings.maxSpeed);
        }
        this.position.add(this.velocity);
        this.acceleration.multiplyScalar(0);
        this.render();
    }

    public render() {
        const heading = this.velocity.clone();
        heading.multiplyScalar(10)
        heading.add(this.position);
        this.lookAt(heading);
    }

    public applyForce(force: THREE.Vector3) {
        this.acceleration.add(force.clone());
    }

    public boidBehaviour(boids: Boid[], settings: BoidSettings) {
        let sep = this.separate(boids, settings);
        let ali = this.align(boids, settings);
        let coh = this.cohesion(boids, settings);
        this.applyForce(sep);
        this.applyForce(ali);
        this.applyForce(coh);
        if (settings.boundingContainer == "box") {
        this.applyForce(this.avoidBoxContainer(settings.centerDist, settings.centerDist, settings.centerDist))
        } else if (settings.boundingContainer == "sphere") {
        this.applyForce(this.avoidSphereContainer(settings.centerDist))
        }
    }

    public seek(target: THREE.Vector3, settings: BoidSettings): THREE.Vector3 {
        const maxSpeed = settings.maxSpeed;
        const maxForce = settings.maxForce;
        const toTarget = new THREE.Vector3();
        toTarget.subVectors(target, this.position);
        toTarget.length();
        toTarget.normalize();
        toTarget.multiplyScalar(maxSpeed);
        const steerVector = new THREE.Vector3();
        steerVector.subVectors(toTarget, this.velocity);

        if (steerVector.length() > maxForce) {
            steerVector.clampLength(0, maxForce);
        }
        return steerVector;
    }

    public calculateSteering(boids: Boid[], getVector: (boid: Boid) => THREE.Vector3, config: {force: string, maxSpeed: number, maxForce:number, VecDistance: number}): THREE.Vector3 {
        const sumVector = new THREE.Vector3();
        let cnt = 0
        const maxSpeed = config.maxSpeed;
        const maxForce = config.maxForce;
        const VecDistance = config.VecDistance;
        const steerVector = new THREE.Vector3();

        for (let other of boids) {
            const distance = this.position.distanceTo(other.position);
            if (other != this && distance < VecDistance) {
                sumVector.add(getVector(other));
                cnt++;
            }
        }

        if (cnt > 0) {
            sumVector.divideScalar(cnt);
            sumVector.normalize();
            sumVector.multiplyScalar(maxSpeed);
            steerVector.subVectors(sumVector, this.velocity);
            if (steerVector.length() > maxForce) {
                steerVector.clampLength(0, maxForce);
            }
        }

        return steerVector;
    }

    public align(boids: Boid[], settings:BoidSettings): THREE.Vector3 {
        return this.calculateSteering(boids, (boid: Boid) => boid.velocity, {force: "align", maxSpeed: settings.maxSpeed, maxForce: settings.maxForce, VecDistance: settings.alignmentDist});
    }

    public cohesion(boids: Boid[], settings: BoidSettings) : THREE.Vector3 {
        const sumVector = new THREE.Vector3();
        let cnt = 0
        const cohesionDist = settings.cohesionDist;
        const steerVector = new THREE.Vector3();

        for (let other of boids) {
            const distance = this.position.distanceTo(other.position);
            if (other != this && distance < cohesionDist) {
                sumVector.add(other.position);
                cnt++;
            }
        }

        if (cnt > 0){
            sumVector.divideScalar(cnt);
            steerVector.add(this.seek(sumVector, settings));
        }

        return steerVector;
    }

    public separate(boids: Boid[], settings: BoidSettings) : THREE.Vector3 {
        return this.calculateSteering(boids, (boid: Boid) => {
            const diff = new THREE.Vector3();
            diff.subVectors(this.position, boid.position);
            diff.normalize();
            diff.divideScalar(this.position.distanceTo(boid.position));
            return diff;
        }, {force: "separate", maxSpeed: settings.maxSpeed, maxForce: settings.separationWeight, VecDistance: settings.separationDist});
    }

    private avoid( wall: THREE.Vector3 = new THREE.Vector3()): THREE.Vector3 {
        this.geometry.computeBoundingSphere();
        const boundingSphere = this.geometry.boundingSphere;

        const toVector = new THREE.Vector3();
        toVector.subVectors(this.position, wall);
        if (!boundingSphere) return new THREE.Vector3();
        const distance = toVector.length() - boundingSphere.radius * 2
        const steerVector = toVector.clone()
        steerVector.multiplyScalar(1 / (Math.pow(distance, 2)))
        return steerVector
    }

    public avoidBoxContainer( rangeWidth = 80, rangeHeight = 80, rangeDepth = 80) {
        const sumVector = new THREE.Vector3();
        sumVector.add(this.avoid(new THREE.Vector3(rangeWidth, this.position.y, this.position.z)));
        sumVector.add(this.avoid(new THREE.Vector3(-rangeWidth, this.position.y, this.position.z)));
        sumVector.add(this.avoid(new THREE.Vector3(this.position.x, rangeHeight, this.position.z)));
        sumVector.add(this.avoid(new THREE.Vector3(this.position.x, -rangeHeight, this.position.z)));
        sumVector.add(this.avoid(new THREE.Vector3(this.position.x, this.position.y, rangeDepth)));
        sumVector.add(this.avoid(new THREE.Vector3(this.position.x, this.position.y, -rangeDepth)));
        sumVector.multiplyScalar(Math.pow(this.velocity.length(), 3))
        return sumVector
    }

    public avoidSphereContainer( radius = 100) {
        this.geometry.computeBoundingSphere();
        const boundingSphere = this.geometry.boundingSphere;
        if (!boundingSphere) return new THREE.Vector3();
        const distance = radius - this.position.length() - boundingSphere.radius * 2
        const steerVector = this.position.clone()
        steerVector.normalize()
        steerVector.multiplyScalar(-1 / (Math.pow(distance, 2)))
        steerVector.multiplyScalar(Math.pow(this.velocity.length(), 3))
        return steerVector
    }

}

export class Boids {
    public settings: BoidSettings;
    public boidsGroup: THREE.Group;
    constructor(settings: BoidSettings= {
        maxForce: 0.04,
        maxSpeed: 7,
        centerDist: 1800,
        separationWeight: 0.2,
        alignmentWeight: 0.16,
        cohesionWeight: 1.0,
        alignmentDist: 85,
        separationDist: 70,
        cohesionDist: 200,
        boundingContainer: "sphere",
    }) {
        this.settings = settings;
        this.boidsGroup = new THREE.Group();
    }

    public addBoid(boid: Boid) {
        this.boidsGroup.add(boid);
        return this.boidsGroup
    }

    public createBoid(posX: number, posY: number, posZ: number) {
        const boid = new Boid();
        boid.position.set(posX, posY, posZ);
        this.boidsGroup.add(boid);
        return this.boidsGroup
    }

    public clearBoids() {
        this.boidsGroup.children = [];
    }

    public createRandomBoids(count: number = 50) {
        this.clearBoids();
        for (let i = 0; i < count; i++) {
            const pos = new THREE.Vector3(
                Math.random() - 0.5,
                Math.random() - 0.5,
                Math.random() - 0.5);
            this.createBoid(pos.x, pos.y, pos.z);
        }
        return this.boidsGroup
    }

    public getCenter() {
        const sceneSize = this.boidsGroup.children.length;
        let averagePosition = new THREE.Vector3(0,0,0);
        if (!sceneSize) return averagePosition;
        for (let i = 0; i < sceneSize; i++) {
            averagePosition.add(this.boidsGroup.children[i].position);
        }
        return averagePosition.divideScalar(sceneSize);
    }

    public update() {
        const boids = this.boidsGroup.children as Boid[];
        boids.forEach(boid => boid.update(boids, this.settings));
    }

    public getRandomBoid() {
        return this.boidsGroup.children[Math.floor(Math.random() * this.boidsGroup.children.length)] as Boid;
    }
}

export class BoidCamera extends THREE.PerspectiveCamera {
    private velocity: THREE.Vector3;
    private readonly acceleration: THREE.Vector3;
    private readonly maxSpeed: number;
    private readonly maxForce: number;

    constructor() {
        super(45, window.innerWidth / window.innerHeight, 1, 10000);
        this.position.set(0, 0, 0);
        this.velocity = new THREE.Vector3();
        this.acceleration = new THREE.Vector3();
        this.maxSpeed = 7;
        this.maxForce = 0.04;
    }

    public applyForce(force: THREE.Vector3) {
        this.acceleration.add(force);
    }

    public embodyBoid(boid: Boid) {
        const boidPos = new THREE.Vector3();
        const offsetTarget = boid.velocity.clone();
        offsetTarget.multiplyScalar(-20);
        boidPos.addVectors(boid.position, offsetTarget);
        this.setCameraPosition(boid.position)
        this.seek(boid.position);
    }

    public seek(target: THREE.Vector3) {
        const desired = new THREE.Vector3();
        desired.subVectors(target, this.position);
        desired.normalize();
        desired.multiplyScalar(this.maxSpeed);
        const steer = new THREE.Vector3();
        steer.subVectors(desired, this.velocity);
        if (steer.length() > this.maxForce) {
            steer.clampLength(0, this.maxForce);
        }
        this.applyForce(steer);
    }

    public setCameraPosition(target: THREE.Vector3) {
        this.position.set(
            target.x,
            target.y,
            target.z);
        this.velocity = new THREE.Vector3();
    }

    public update(target: Boid) {
        this.velocity.add(this.acceleration);
        if (this.velocity.length() > this.maxSpeed) {
            this.velocity.clampLength(0, this.maxSpeed);
        }
        this.position.add(this.velocity);
        this.acceleration.multiplyScalar(0);
        this.embodyBoid(target);
    }




}

export class BoidsRenderer {
    private renderer: THREE.WebGLRenderer;
    public scene: THREE.Scene;
    public camera: BoidCamera;
    private readonly rendererContainer: HTMLElement | null;
    private animationFrame: number;
    public updateFunction: (() => void) | undefined;

    constructor() {
        this.camera = new BoidCamera()
        this.camera.position.y = 0;
        this.camera.position.x = 0;
        this.camera.position.z = 1800;
        this.scene = new THREE.Scene();
        this.camera.lookAt(this.scene.position);
        this.rendererContainer = document.getElementById('app');
        this.renderer = new THREE.WebGLRenderer({antialias: true});
        this.resize()
        this.rendererContainer?.appendChild(this.renderer.domElement);
        window.addEventListener('resize', this.resize.bind(this));
        this.animationFrame = 0;
    }
    public resize() {
        if (!this.rendererContainer) return
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setClearColor(new THREE.Color(0x000000));
        this.renderer.setSize(this.rendererContainer.clientWidth, this.rendererContainer.clientHeight);
        this.renderer.shadowMap.enabled = true;
        this.camera.aspect = this.rendererContainer.clientWidth / this.rendererContainer.clientHeight;
        this.camera.updateProjectionMatrix();
    }

    public start() {
        if (this.scene.children.length === 0) return;
        if (this.updateFunction){
            return this.runWithUpdate()
        }
        this.run()
    }

    public stop() {
            cancelAnimationFrame(this.animationFrame);
    }

    private run() {
        this.animationFrame = requestAnimationFrame(this.run.bind(this));
        this.render()
    }

    private runWithUpdate() {
        this.animationFrame = requestAnimationFrame(this.runWithUpdate.bind(this));
        if (this.updateFunction) this.updateFunction();
        this.render()
    }

    private render(){
        this.renderer.render(this.scene, this.camera);
    }

}

