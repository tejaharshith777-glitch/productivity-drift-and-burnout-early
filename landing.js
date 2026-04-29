// --- TECH STACK: THREE.JS & GSAP ---
let laptops = [];

document.addEventListener('DOMContentLoaded', () => {
    try {
        initCursor();
    } catch(e) { console.error('Cursor error', e); }
    
    try {
        initWebGL();
    } catch(e) { 
        console.error('WebGL error', e); 
        // Hide loading screen if WebGL fails
        const loader = document.getElementById('loading-screen');
        if (loader) loader.style.display = 'none';
    }
    
    try {
        initAnimations();
    } catch(e) { console.error('Animations error', e); }
});


/* 1. CUSTOM GLOWING CURSOR */
function initCursor() {
    const cursor = document.querySelector('.custom-cursor');
    
    document.addEventListener('mousemove', (e) => {
        cursor.style.left = e.clientX + 'px';
        cursor.style.top = e.clientY + 'px';
    });

    document.querySelectorAll('a, button, .glass-card, .btn').forEach(el => {
        el.addEventListener('mouseenter', () => cursor.classList.add('grow'));
        el.addEventListener('mouseleave', () => cursor.classList.remove('grow'));
    });

}

/* 2. THREE.JS FLOATING LAPTOPS ENVIRONMENT */
function initWebGL() {
    const canvas = document.getElementById('webgl-canvas');
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x05070f);

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 15;

    const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0x00E5C3, 1.5, 30);
    pointLight.position.set(5, 5, 10);
    scene.add(pointLight);

    const pointLightOrange = new THREE.PointLight(0xFF6B35, 1, 30);
    pointLightOrange.position.set(-5, -5, 10);
    scene.add(pointLightOrange);

    // Volumetric beams metaphor (particles)
    const particleCount = 100;
    const particlesGeo = new THREE.BufferGeometry();
    const posArray = new Float32Array(particleCount * 3);
    
    for(let i=0; i<particleCount*3; i++) {
        posArray[i] = (Math.random() - 0.5) * 30;
    }
    particlesGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    const particlesMaterial = new THREE.PointsMaterial({
        size: 0.05,
        color: 0x00E5C3,
        transparent: true,
        opacity: 0.5
    });
    const particles = new THREE.Points(particlesGeo, particlesMaterial);
    scene.add(particles);

    laptops = [];
    const laptopCount = 8;

    function createLaptop() {
        const group = new THREE.Group();

        // Base
        const baseGeo = new THREE.BoxGeometry(2, 0.1, 1.5);
        const baseMat = new THREE.MeshPhongMaterial({ 
            color: 0x0D1526, 
            shininess: 100,
            transparent: true,
            opacity: 0.8
        });
        const base = new THREE.Mesh(baseGeo, baseMat);
        group.add(base);

        // Screen
        const screenGeo = new THREE.BoxGeometry(2, 1.3, 0.05);
        const screenMat = new THREE.MeshPhongMaterial({ 
            color: 0x0f172a,
            emissive: 0x00E5C3,
            emissiveIntensity: 0.3,
            transparent: true,
            opacity: 0.9
        });
        const screen = new THREE.Mesh(screenGeo, screenMat);
        screen.position.set(0, 0.65, -0.75);
        screen.rotation.x = -Math.PI / 12; // Angled open
        group.add(screen);

        // Floating micro elements (badges ⚠️)
        const badgeGeo = new THREE.OctahedronGeometry(0.15);
        const badgeMat = new THREE.MeshBasicMaterial({ color: 0xFF6B35, wireframe: true });
        const badge = new THREE.Mesh(badgeGeo, badgeMat);
        badge.position.set(1.2, 1, 0);
        group.add(badge);

        return { group, badge };
    }

    for(let i=0; i<laptopCount; i++) {
        const laptopData = createLaptop();
        
        laptopData.group.position.x = (Math.random() - 0.5) * 20;
        laptopData.group.position.y = (Math.random() - 0.5) * 10;
        laptopData.group.position.z = -Math.random() * 15;
        
        laptopData.group.rotation.x = Math.random() * Math.PI;
        laptopData.group.rotation.y = Math.random() * Math.PI;
        
        laptopData.seed = Math.random() * 100;
        laptopData.speed = 0.2 + Math.random() * 0.3;
        
        scene.add(laptopData.group);
        laptops.push(laptopData);
    }

    // Mouse Interaction Parallax
    let mouseX = 0, mouseY = 0;
    document.addEventListener('mousemove', (e) => {
        mouseX = (e.clientX / window.innerWidth) - 0.5;
        mouseY = (e.clientY / window.innerHeight) - 0.5;
    });

    // Animation Loop
    const clock = new THREE.Clock();
    function animate() {
        requestAnimationFrame(animate);
        
        const elapsedTime = clock.getElapsedTime();

        // Animate Laptops
        laptops.forEach(lap => {
            lap.group.position.y += Math.sin(elapsedTime * lap.speed + lap.seed) * 0.005;
            lap.group.rotation.y += 0.002;
            lap.group.rotation.x += 0.001;

            // Badge orbit
            lap.badge.position.y = 1 + Math.sin(elapsedTime * 3 + lap.seed) * 0.2;
            lap.badge.rotation.y += 0.05;
        });

        // Camera Parallax
        camera.position.x += (mouseX * 5 - camera.position.x) * 0.05;
        camera.position.y += (-mouseY * 5 - camera.position.y) * 0.05;
        camera.lookAt(scene.position);

        renderer.render(scene, camera);
    }

    animate();

    // Hide Loading Screen
    setTimeout(() => {
        const loader = document.getElementById('loading-screen');
        if (loader) {
            loader.style.opacity = 0;
            setTimeout(() => loader.style.display = 'none', 800);
        }
    }, 500);

    // Responsive
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

/* 3. GSAP SCROLL ANIMATIONS & 3D TILTS */
function initAnimations() {
    gsap.registerPlugin(ScrollTrigger);

    // Navbar opacity shift
    window.addEventListener('scroll', () => {
        const nav = document.querySelector('.glass-nav');
        if (window.scrollY > 50) nav.classList.add('scrolled');
        else nav.classList.remove('scrolled');
    });

    // 3D Laptop Scatter on Scroll
    gsap.to({}, {
        scrollTrigger: {
            trigger: 'body',
            start: 'top top',
            end: 'bottom top',
            scrub: true
        },
        onUpdate: function() {
            const scrollPercent = window.scrollY / (document.body.scrollHeight - window.innerHeight);
            laptops.forEach((lap, index) => {
                const dirX = index % 2 === 0 ? 1 : -1;
                const dirY = index % 3 === 0 ? 1 : -1;
                lap.group.position.x += dirX * 0.1;
                lap.group.position.y += dirY * 0.1;
                lap.group.position.z -= 0.2;
            });
        }
    });

    // Section Reveals
    document.querySelectorAll('.section-padding').forEach(sec => {
        gsap.from(sec, {
            scrollTrigger: {
                trigger: sec,
                start: 'top 80%',
                toggleActions: 'play none none none'
            },
            opacity: 0,
            y: 40,
            duration: 1,
            ease: 'power3.out'
        });
    });

    // Card Stagger
    gsap.from('.feature-card', {
        scrollTrigger: {
            trigger: '#how-it-works',
            start: 'top 70%'
        },
        opacity: 0,
        y: 50,
        duration: 0.8,
        stagger: 0.2,
        ease: 'power3.out'
    });

    // Interactive Dashboard Tilt on Mouse Move
    const dashMockup = document.getElementById('tilt-dashboard');
    if (dashMockup) {
        document.addEventListener('mousemove', (e) => {
            const dx = e.clientX - window.innerWidth / 2;
            const dy = e.clientY - window.innerHeight / 2;
            const rx = 15 + dy * 0.01;
            const ry = -10 + dx * 0.01;
            dashMockup.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`;
        });
    }

    // Stats Counter Animation
    document.querySelectorAll('.count').forEach(counterEl => {
        const target = parseFloat(counterEl.innerText);
        gsap.fromTo(counterEl, {
            innerText: 0
        }, {
            innerText: target,
            duration: 2,
            scrollTrigger: {
                trigger: '#stats',
                start: 'top 80%',
            },
            snap: { innerText: 0.1 },
            ease: 'power1.out'
        });
    });
}

