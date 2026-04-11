/* bg-3d.js — Three.js rotating 3D background */
// =============================================================================
// 3D BACKGROUND — Three.js Rotating Command Center
// =============================================================================

function init3DBackground() {
    const canvas = document.getElementById('bg-canvas');
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Particle field — distant stars
    const starGeometry = new THREE.BufferGeometry();
    const starCount = 800;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
        const i3 = i * 3;
        positions[i3] = (Math.random() - 0.5) * 30;
        positions[i3 + 1] = (Math.random() - 0.5) * 30;
        positions[i3 + 2] = (Math.random() - 0.5) * 30;

        // Cyan/magenta/white mix
        const r = Math.random();
        if (r < 0.3) { colors[i3] = 0; colors[i3+1] = 1; colors[i3+2] = 0.98; } // cyan
        else if (r < 0.5) { colors[i3] = 1; colors[i3+1] = 0; colors[i3+2] = 1; } // magenta
        else { colors[i3] = 0.8; colors[i3+1] = 0.8; colors[i3+2] = 0.9; } // white-ish
    }

    starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const starMaterial = new THREE.PointsMaterial({
        size: 0.04,
        vertexColors: true,
        transparent: true,
        opacity: 0.7,
        sizeAttenuation: true,
    });

    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);

    // Wireframe sphere — holographic command station
    const sphereGeo = new THREE.IcosahedronGeometry(2.5, 2);
    const sphereMat = new THREE.MeshBasicMaterial({
        color: 0x00fff9,
        wireframe: true,
        transparent: true,
        opacity: 0.06,
    });
    const sphere = new THREE.Mesh(sphereGeo, sphereMat);
    scene.add(sphere);

    // Inner sphere
    const innerGeo = new THREE.IcosahedronGeometry(1.8, 1);
    const innerMat = new THREE.MeshBasicMaterial({
        color: 0xff00ff,
        wireframe: true,
        transparent: true,
        opacity: 0.04,
    });
    const innerSphere = new THREE.Mesh(innerGeo, innerMat);
    scene.add(innerSphere);

    // Ring
    const ringGeo = new THREE.TorusGeometry(3, 0.02, 8, 100);
    const ringMat = new THREE.MeshBasicMaterial({
        color: 0x00fff9,
        transparent: true,
        opacity: 0.1,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    scene.add(ring);

    // Second ring at angle
    const ring2 = new THREE.Mesh(
        new THREE.TorusGeometry(2.8, 0.015, 8, 80),
        new THREE.MeshBasicMaterial({ color: 0xff00ff, transparent: true, opacity: 0.07 })
    );
    ring2.rotation.x = Math.PI / 3;
    ring2.rotation.y = Math.PI / 4;
    scene.add(ring2);

    // Animation loop
    function animate() {
        requestAnimationFrame(animate);

        const time = Date.now() * 0.001;

        // Slow rotation
        stars.rotation.y += 0.0003;
        stars.rotation.x += 0.0001;

        sphere.rotation.y += 0.001;
        sphere.rotation.x += 0.0005;

        innerSphere.rotation.y -= 0.0015;
        innerSphere.rotation.z += 0.001;

        ring.rotation.z += 0.0005;
        ring2.rotation.z -= 0.0007;

        // Mouse parallax — 360 effect
        camera.position.x += (mouseX * 0.5 - camera.position.x) * 0.02;
        camera.position.y += (-mouseY * 0.3 - camera.position.y) * 0.02;
        camera.lookAt(scene.position);

        renderer.render(scene, camera);
    }

    animate();

    // Resize handler
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

