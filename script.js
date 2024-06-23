import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.118/build/three.module.js';
import { FBXLoader } from 'https://cdn.jsdelivr.net/npm/three@0.118.1/examples/jsm/loaders/FBXLoader.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.118/examples/jsm/controls/OrbitControls.js';

class BasicCharacterControls {
    constructor(params) {
        this._Init(params);
        this._score = 0; // Initialize score
        this._scoreElement = document.getElementById('score'); // Reference to the score element
    }

    _Init(params) {
        this._params = params;
        this._lane = 1; // Current lane, -1 for left, 0 for center, 1 for right
        this._lanes = [-30, 0, 30]; // X positions of the lanes

        document.addEventListener('keydown', (e) => this._onKeyDown(e), false);
    }

    _onKeyDown(event) {
        console.log("Key down:", event.keyCode);
        switch (event.keyCode) {
            case 39: // Right arrow
                if (this._lane > 0) {
                    this._lane--;
                    console.log("Lane:", this._lane);
                }
                break;
            case 37: // Left arrow
                if (this._lane < 2) {
                    this._lane++;
                    console.log("Lane:", this._lane);
                }
                break;
        }
    }

    Update(timeInSeconds) {
        const controlObject = this._params.target;
        const targetX = this._lanes[this._lane];

        // Smoothly interpolate to the target lane position
        controlObject.position.x = THREE.MathUtils.lerp(controlObject.position.x, targetX, 0.1);
    }

    // Function to check collision with coins
    CheckCollision(coins) {
        const characterBox = new THREE.Box3().setFromObject(this._params.target);
        const coinsToRemove = []; // Array to store coins to be removed

        coins.forEach((coin, index) => {
            if (!coin) return; // Check if coin is valid

            const coinBox = new THREE.Box3().setFromObject(coin);

            if (characterBox.intersectsBox(coinBox)) {
                // Collision detected
                coin.visible = false; // Hide the coin
                this._score++; // Increase score
                console.log("Score:", this._score);
                this._UpdateScore();
                // Mark coin for removal
                coinsToRemove.push(coin);
            }
        });
        if (this.score === 20) {
            alert('you win this level!!!');
            location.reload(); // Reload the page to restart the game
        }

        // Remove marked coins from scene and array
        coinsToRemove.forEach(coin => {
            const index = coins.indexOf(coin);
            if (index !== -1) {
                coins.splice(index, 1);
            }
        });
    }
    _UpdateScore() {
        this._scoreElement.innerText = `Score: ${this._score}`;
    }

    get score() {
        return this._score;
    }
}

class Coin {
    constructor(scene, startPosition) {
        this._scene = scene;
        this._startPosition = startPosition.clone();
        this._geometry = new THREE.SphereGeometry(5, 32, 16);
        this._material = new THREE.MeshStandardMaterial({ color: 0xff00f7 }); // Yellow color for coins

        this._mesh = new THREE.Mesh(this._geometry, this._material);
        this._mesh.position.copy(this._startPosition);
        this._scene.add(this._mesh);

        this._speed = new THREE.Vector3(0, 0, 100); // Speed of the coin towards the character
    }

    Update(timeInSeconds) {
        // Move the coin towards the character
        this._mesh.position.addScaledVector(this._speed, timeInSeconds);
    }

    get mesh() {
        return this._mesh;
    }
}


class LoadModelDemo {
    constructor() {
        this._Initialize();
    }

    _Initialize() {
        this._threejs = new THREE.WebGLRenderer({
            antialias: true,
        });
        this._threejs.shadowMap.enabled = true;
        this._threejs.shadowMap.type = THREE.PCFSoftShadowMap;
        this._threejs.setPixelRatio(window.devicePixelRatio);
        this._threejs.setSize(window.innerWidth, window.innerHeight);

        document.body.appendChild(this._threejs.domElement);

        window.addEventListener('resize', () => {
            this._OnWindowResize();
        }, false);

        const fov = 60;
        const aspect = window.innerWidth / window.innerHeight;
        const near = 1.0;
        const far = 1000.0;
        this._camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
        this._camera.position.set(0, 50, -100);
        this._camera.lookAt(new THREE.Vector3(0, 0, 0)); // Look at the center of the plane

        this._scene = new THREE.Scene();

        let light = new THREE.DirectionalLight(0xFFFFFF, 1.0);
        light.position.set(20, 100, 10);
        light.target.position.set(0, 0, 0);
        light.castShadow = true;
        light.shadow.bias = -0.001;
        light.shadow.mapSize.width = 2048;
        light.shadow.mapSize.height = 2048;
        light.shadow.camera.near = 0.1;
        light.shadow.camera.far = 500.0;
        light.shadow.camera.left = 100;
        light.shadow.camera.right = -100;
        light.shadow.camera.top = 100;
        light.shadow.camera.bottom = -100;
        this._scene.add(light);

        light = new THREE.AmbientLight(0xFFFFFF, 4.0);
        this._scene.add(light);
        this._coins = []; // Array to hold coins

        // Create coins at the beginning  lane
        this._CreateCoins();
        const controls = new OrbitControls(this._camera, this._threejs.domElement);
        controls.target.set(0, 0, 0); // Orbit controls center
        controls.update();

        const loader = new THREE.CubeTextureLoader();
        const texture = loader.load([
            './resources/skyrender0001.bmp',
            './resources/skyrender0004.bmp',
            './resources/skyrender0003.bmp',
            './resources/skyrender0006.bmp',
            './resources/skyrender0005.bmp',
            './resources/skyrender0002.bmp',
        ]);
        this._scene.background = texture;

        const planeTexture = new THREE.TextureLoader().load("./resources/road.jpg");
        const plane = new THREE.Mesh(
            new THREE.PlaneGeometry(100, 300, 10, 10),
            new THREE.MeshStandardMaterial({
                map: planeTexture,
            })
        );
        plane.castShadow = false;
        plane.receiveShadow = true;
        plane.rotation.x = -Math.PI / 2;
        this._scene.add(plane);

        this._mixers = [];
        this._previousRAF = null;

        this._LoadAnimatedModel();
        this._RAF();
    }

    _LoadAnimatedModel() {
        const loader = new FBXLoader();
        loader.setPath('./resources/boy/');
        loader.load('Aj.fbx', (fbx) => {
            fbx.scale.setScalar(0.1);
            fbx.traverse(c => {
                c.castShadow = true;
            });

            fbx.position.set(0, 0, -50); // Initial position

            const params = {
                target: fbx,
                camera: this._camera,
            };
            this._controls = new BasicCharacterControls(params);

            const anim = new FBXLoader();
            anim.setPath('./resources/boy/');
            anim.load('Running.fbx', (anim) => {
                const m = new THREE.AnimationMixer(fbx);
                this._mixers.push(m);
                const idle = m.clipAction(anim.animations[0]);
                idle.play();
            });
            this._scene.add(fbx);
        });
    }

    _CreateCoins() {
        const coinPositions = [
            new THREE.Vector3(-30, 5, 100), // Lane 1
            new THREE.Vector3(0, 5, 100),  // Lane 2
            new THREE.Vector3(30, 5, 100)  // Lane 3
        ];

        const randomPosition = this.getRendomPosition(); // This function generates a random position index

        // Ensure randomPosition is within the range of coinPositions
        if (randomPosition >= 0 && randomPosition < coinPositions.length) {
            const coin = new Coin(this._scene, coinPositions[randomPosition]);
            this._coins.push(coin.mesh);
        }
    }

    getRendomPosition() {
        return Math.floor(Math.random() * 100);
    }
    _OnWindowResize() {
        this._camera.aspect = window.innerWidth / window.innerHeight;
        this._camera.updateProjectionMatrix();
        this._threejs.setSize(window.innerWidth, window.innerHeight);
    }

    _RAF() {
        requestAnimationFrame((t) => {
            if (this._previousRAF === null) {
                this._previousRAF = t;
            }
            this._CreateCoins();
            this._RAF();

            this._threejs.render(this._scene, this._camera);
            this._Step(t - this._previousRAF);
            this._previousRAF = t;
        });
    }

    _Step(timeElapsed) {
        const timeElapsedS = timeElapsed * 0.001;
        if (this._mixers) {
            this._mixers.forEach(m => m.update(timeElapsedS));
        }

        if (this._controls) {
            this._controls.Update(timeElapsedS);
            this._controls.CheckCollision(this._coins); // Check collision with coins
        }

        // Update coins
        this._coins.forEach(coin => {
            if (coin.visible) {
                coin.position.addScaledVector(new THREE.Vector3(0, 0, -1), timeElapsedS * 30); // Move coins towards the character
            }
        });
    }
}

let _APP = null;
window.addEventListener('DOMContentLoaded', () => {
    _APP = new LoadModelDemo();
});
