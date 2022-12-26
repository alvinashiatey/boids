import * as THREE from 'three';
import {Boid} from "./boid";


export class World {
    public scene: THREE.Scene;
    public camera: THREE.PerspectiveCamera;
    public renderer: THREE.WebGLRenderer;
    public boids: Boid[] = [];
    public clock: THREE.Clock;
    private size: { width: number; height: number };

    constructor() {
        this.renderer = new THREE.WebGLRenderer({antialias: true});
        this.size = {
            width: window.innerWidth,
            height: window.innerHeight
        }
        this.renderer.setSize(this.size.width, this.size.height);
        document.querySelector("#app")?.appendChild(this.renderer.domElement);
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.z = 100;
        this.scene = new THREE.Scene();
        this.clock = new THREE.Clock();
        this.setup()
    }

    setup() {
        this.resize()
        for (let i = 0; i < 100; i++) {
        this.boids.push(new Boid(this.scene, this.size))
        }
    }

    resize() {
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        })
    }

    public addBoid(boid: Boid) {
        this.boids.push(boid);
    }

    public removeBoid(boid: Boid) {
        this.boids.splice(this.boids.indexOf(boid), 1);
    }

    public update() {
        this.boids.forEach(boid => boid.update(this.boids));
    }

    render() {
        this.update()
        this.renderer.render(this.scene, this.camera);
        requestAnimationFrame(() => this.render());
    }

}