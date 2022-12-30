import { Boids, BoidsRenderer, BoidContainer} from "./boid";


export class World {
    public renderer: BoidsRenderer;
    public boids: Boids ;
    private readonly count: number;
    private running: boolean;
    private readonly boidContainer: BoidContainer;

    constructor() {
        this.renderer = new BoidsRenderer()
        this.boidContainer = new BoidContainer()
        this.boids = new Boids()
        this.count = 200
        this.running = false
        this.setCameraDefault()
    }

    createBoids() {
        this.renderer.scene.remove(this.boids.boidsGroup)
        this.boids.createRandomBoids(this.count)
        this.renderer.scene.add(this.boids.boidsGroup)
        this.renderer.scene.add(this.boidContainer)
    }

    setCameraDefault() {
        this.renderer.updateFunction = () => {
            this.boids.update()
            // this.renderer.camera.lookAt(this.boids.getCenter())
        }
    }

    stop() {
        if (!this.running) return
        this.renderer.stop()
        this.running = false
    }

    start() {
        if (!this.running) this.createBoids()
        this.renderer.start()
        this.running = true
    }
}