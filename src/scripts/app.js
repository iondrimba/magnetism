import 'styles/index.css';
import Stats from 'stats.js';
import {
  radians,
  map,
  distance,
  hexToRgbTreeJs
} from './helpers';

export default class App {
  setup() {
    this.targetFPS = 60;
    this.frameInterval = 1000 / this.targetFPS; // milliseconds per frame
    this.lastFrameTime = 0;
    this.stats = new Stats();
    this.stats.showPanel(0);
    document.body.appendChild(this.stats.dom);

    this.gui = new dat.GUI();
    this.backgroundColor = '#801336';
    this.gutter = {
      size: -.9
    };

    this.pendulum = {
      length: 4,
      angle: 180,
      angleVelocity: 0,
      angleAcceleration: 0,
      origin: {
        x: 0,
        y: 0,
      },
      current: {
        x: 0,
        y: 0,
      }
    };

    this.meshes = [];
    this.grid = {
      cols: 40,
      rows: 20,
    };

    this.width = window.innerWidth;
    this.height = window.innerHeight;

    const gui = this.gui.addFolder('Background');
    gui.addColor(this, 'backgroundColor').onChange((color) => {
      document.body.style.backgroundColor = color;
    });

    window.addEventListener('resize', this.onResize.bind(this), {
      passive: true
    });
  }

  createScene() {
    this.scene = new THREE.Scene();
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });

    this.renderer.setSize(window.innerWidth, window.innerHeight);

    document.body.appendChild(this.renderer.domElement);
  }

  addSphere() {
    const meshParams = {
      color: '#fff400',
    };

    const geometry = new THREE.SphereGeometry(.3, 32, 32);
    const material = new THREE.MeshPhysicalMaterial(meshParams);

    this.sphere = new THREE.Mesh(geometry, material);
    this.sphere.position.set(0, 0, 0);

    const gui = this.gui.addFolder('Sphere Material');
    gui.addColor(meshParams, 'color').onChange((color) => {
      material.color = hexToRgbTreeJs(color);
    });

    this.scene.add(this.sphere);
  }

  createCamera() {
    this.camera = new THREE.PerspectiveCamera(20, window.innerWidth / window.innerHeight, 1, 1000);
    this.camera.position.set(10, 10, 10);

    this.scene.add(this.camera);
  }

  addAmbientLight() {
    const obj = { color: '#fff' };
    const light = new THREE.AmbientLight(obj.color, 1);

    this.scene.add(light);
  }

  getMesh(geometry, material, count) {
    const mesh = new THREE.InstancedMesh(geometry, material, count);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    return mesh;
  }

  addCameraControls() {
    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.controls.maxPolarAngle = radians(50);
  }

  onResize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.width, this.height);
  }

  init() {
    this.setup();

    this.createScene();

    this.createCamera();

    this.addSphere();

    this.addAmbientLight();

    this.createGrid();

    this.addCameraControls();

    requestAnimationFrame(this.animate.bind(this));
  }

  createGrid() {
    this.topMaterialProps = {
      color: '#ff214a',
    };

    this.insideMaterialProps = {
      color: '#190d6d',
    };

    this.leftMaterialProps = {
      color: '#fff400',
    };

    this.topMaterial = new THREE.MeshPhysicalMaterial(this.topMaterialProps);
    this.insideMaterial = new THREE.MeshPhysicalMaterial(this.insideMaterialProps);
    this.leftMaterial = new THREE.MeshPhysicalMaterial(this.leftMaterialProps);
    const materials = [this.leftMaterial, this.leftMaterial, this.topMaterial, this.insideMaterial, this.insideMaterial, this.insideMaterial];

    const gui = this.gui.addFolder('Mesh Material Top');
    gui.addColor(this.topMaterialProps, 'color').onChange((color) => {
      this.topMaterial.color = hexToRgbTreeJs(color);
    });

    const guiinside = this.gui.addFolder('Mesh Material Inside');
    guiinside.addColor(this.insideMaterialProps, 'color').onChange((color) => {
      this.insideMaterial.color = hexToRgbTreeJs(color);
    });

    const guileft = this.gui.addFolder('Mesh Material Left');
    guileft.addColor(this.leftMaterialProps, 'color').onChange((color) => {
      this.leftMaterial.color = hexToRgbTreeJs(color);
    });

    const geometry = new THREE.BoxBufferGeometry(.1, .1, .1);
    geometry.translate( 0, .025, 0 );
    this.mesh = this.getMesh(geometry, materials, this.grid.rows * this.grid.cols);
    this.scene.add(this.mesh);

    let ii = 0;
    const centerX = ((this.grid.cols) + ((this.grid.cols) * this.gutter.size)) * .46;
    const centerZ = ((this.grid.rows) + ((this.grid.rows) * this.gutter.size)) * .46;

    for (let row = 0; row < this.grid.rows; row++) {
      this.meshes[row] = [];

      for (let col = 0; col < this.grid.cols; col++) {
        const pivot = new THREE.Object3D();

        pivot.scale.set(1, 0.001, 1);
        pivot.position.set(col + (col * this.gutter.size)-centerX, 0, row + (row * this.gutter.size)-centerZ);
        this.meshes[row][col] = pivot;

        pivot.updateMatrix();

        this.mesh.setMatrixAt(ii++, pivot.matrix);
      }
    }

    this.mesh.instanceMatrix.needsUpdate = true;
  }

  draw() {
    this.pendulum.current.x = this.pendulum.origin.x + this.pendulum.length * Math.sin(this.pendulum.angle);
    this.pendulum.current.y = this.pendulum.origin.y + this.pendulum.length * Math.cos(this.pendulum.angle);
    this.pendulum.angleAcceleration = .58 * .0019 * Math.sin(this.pendulum.angle);
    this.pendulum.angleVelocity += this.pendulum.angleAcceleration;
    this.pendulum.angle += this.pendulum.angleVelocity;
    this.sphere.position.set(this.pendulum.current.x, this.pendulum.current.y + 3.6, 0);

    let ii = 0;
    for (let row = 0; row < this.grid.rows; row++) {
      for (let col = 0; col < this.grid.cols; col++) {

        const pivot = this.meshes[row][col];
        const dist = distance(this.sphere.position.x, this.sphere.position.z, pivot.position.x, pivot.position.z  );
        const y = map(dist, .6, 0.001, 0, 140 * dist);
        gsap.to(pivot.scale, .2, { y: y < 0.001 ? 0.001 : y });

        pivot.updateMatrix();

        this.mesh.setMatrixAt(ii++, pivot.matrix);
      }
    }

    this.mesh.instanceMatrix.needsUpdate = true;
  }

  animate(currentTime = 0) {
    this.stats.begin();
    this.controls.update();

    const timeElapsed = currentTime - this.lastFrameTime;

    // Only run animation logic if enough time has passed
    if (timeElapsed >= this.frameInterval) {
      // Update lastFrameTime, accounting for the actual time passed
      // This prevents timing drift
      this.lastFrameTime = currentTime - (timeElapsed % this.frameInterval);

      this.draw();
    }

    this.renderer.render(this.scene, this.camera);
    this.stats.end();
    requestAnimationFrame(this.animate.bind(this));
  }
}
