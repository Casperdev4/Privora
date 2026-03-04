/* ===========================
   PRIVORA - Cyber Script
   =========================== */

document.addEventListener('DOMContentLoaded', () => {

    // ---- Utility: Sanitize HTML to prevent XSS ----
    function sanitizeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // ---- Utility: Throttle function ----
    function throttle(fn, delay) {
        let lastCall = 0;
        return function(...args) {
            const now = Date.now();
            if (now - lastCall >= delay) {
                lastCall = now;
                fn.apply(this, args);
            }
        };
    }

    // ---- Matrix Rain Background ----
    const matrixCanvas = document.getElementById('matrix-canvas');
    if (matrixCanvas) {
        const mCtx = matrixCanvas.getContext('2d');
        matrixCanvas.width = window.innerWidth;
        matrixCanvas.height = window.innerHeight;

        const chars = '01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン';
        const fontSize = 14;
        const columns = Math.floor(matrixCanvas.width / fontSize);
        const drops = Array(columns).fill(1);

        function drawMatrix() {
            mCtx.fillStyle = 'rgba(5, 5, 5, 0.05)';
            mCtx.fillRect(0, 0, matrixCanvas.width, matrixCanvas.height);

            mCtx.fillStyle = 'rgba(201, 162, 39, 0.3)';
            mCtx.font = fontSize + 'px monospace';

            for (let i = 0; i < drops.length; i++) {
                const text = chars[Math.floor(Math.random() * chars.length)];
                mCtx.fillText(text, i * fontSize, drops[i] * fontSize);

                if (drops[i] * fontSize > matrixCanvas.height && Math.random() > 0.975) {
                    drops[i] = 0;
                }
                drops[i]++;
            }
        }

        setInterval(drawMatrix, 80);

        window.addEventListener('resize', throttle(() => {
            matrixCanvas.width = window.innerWidth;
            matrixCanvas.height = window.innerHeight;
        }, 200));
    }

    // ---- Particle Canvas ----
    const canvas = document.getElementById('particles-canvas');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        let particles = [];
        let mouse = { x: null, y: null };

        function resizeCanvas() {
            canvas.width = canvas.parentElement.offsetWidth;
            canvas.height = canvas.parentElement.offsetHeight;
        }
        resizeCanvas();
        window.addEventListener('resize', throttle(resizeCanvas, 200));

        canvas.parentElement.addEventListener('mousemove', (e) => {
            const rect = canvas.parentElement.getBoundingClientRect();
            mouse.x = e.clientX - rect.left;
            mouse.y = e.clientY - rect.top;
        });

        canvas.parentElement.addEventListener('mouseleave', () => {
            mouse.x = null;
            mouse.y = null;
        });

        class Particle {
            constructor() {
                this.reset();
            }
            reset() {
                this.x = Math.random() * canvas.width;
                this.y = Math.random() * canvas.height;
                this.size = Math.random() * 2 + 0.5;
                this.speedX = (Math.random() - 0.5) * 0.5;
                this.speedY = (Math.random() - 0.5) * 0.5;
                this.opacity = Math.random() * 0.5 + 0.1;
                this.pulse = Math.random() * Math.PI * 2;
            }
            update() {
                this.x += this.speedX;
                this.y += this.speedY;
                this.pulse += 0.02;

                if (mouse.x !== null) {
                    const dx = mouse.x - this.x;
                    const dy = mouse.y - this.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 150) {
                        this.x -= dx * 0.008;
                        this.y -= dy * 0.008;
                        this.opacity = Math.min(this.opacity + 0.01, 0.8);
                    }
                }

                if (this.x < 0 || this.x > canvas.width) this.speedX *= -1;
                if (this.y < 0 || this.y > canvas.height) this.speedY *= -1;
            }
            draw() {
                const glow = Math.sin(this.pulse) * 0.2 + 0.3;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(201, 162, 39, ${this.opacity * glow})`;
                ctx.fill();

                // Glow
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size * 3, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(201, 162, 39, ${this.opacity * glow * 0.15})`;
                ctx.fill();
            }
        }

        // Create particles
        const particleCount = Math.min(100, Math.floor(canvas.width * canvas.height / 12000));
        for (let i = 0; i < particleCount; i++) {
            particles.push(new Particle());
        }

        // Spatial grid for O(n) particle connection lookups
        const GRID_SIZE = 140;

        function connectParticles() {
            const grid = {};

            // Build spatial grid
            for (let i = 0; i < particles.length; i++) {
                const gx = Math.floor(particles[i].x / GRID_SIZE);
                const gy = Math.floor(particles[i].y / GRID_SIZE);
                const key = `${gx},${gy}`;
                if (!grid[key]) grid[key] = [];
                grid[key].push(i);
            }

            // Check only neighboring cells
            for (let i = 0; i < particles.length; i++) {
                const gx = Math.floor(particles[i].x / GRID_SIZE);
                const gy = Math.floor(particles[i].y / GRID_SIZE);

                for (let dx = -1; dx <= 1; dx++) {
                    for (let dy = -1; dy <= 1; dy++) {
                        const key = `${gx + dx},${gy + dy}`;
                        const cell = grid[key];
                        if (!cell) continue;

                        for (const j of cell) {
                            if (j <= i) continue;
                            const ddx = particles[i].x - particles[j].x;
                            const ddy = particles[i].y - particles[j].y;
                            const dist = Math.sqrt(ddx * ddx + ddy * ddy);

                            if (dist < 140) {
                                const opacity = (1 - dist / 140) * 0.18;
                                ctx.beginPath();
                                ctx.moveTo(particles[i].x, particles[i].y);
                                ctx.lineTo(particles[j].x, particles[j].y);
                                ctx.strokeStyle = `rgba(201, 162, 39, ${opacity})`;
                                ctx.lineWidth = 0.5;
                                ctx.stroke();
                            }
                        }
                    }
                }
            }

            // Connect to mouse
            if (mouse.x !== null) {
                for (let i = 0; i < particles.length; i++) {
                    const ddx = mouse.x - particles[i].x;
                    const ddy = mouse.y - particles[i].y;
                    const dist = Math.sqrt(ddx * ddx + ddy * ddy);
                    if (dist < 180) {
                        const opacity = (1 - dist / 180) * 0.25;
                        ctx.beginPath();
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(mouse.x, mouse.y);
                        ctx.strokeStyle = `rgba(201, 162, 39, ${opacity})`;
                        ctx.lineWidth = 0.3;
                        ctx.stroke();
                    }
                }
            }
        }

        function animateParticles() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach(p => {
                p.update();
                p.draw();
            });
            connectParticles();
            requestAnimationFrame(animateParticles);
        }
        animateParticles();
    }

    // ---- Mobile Navigation Toggle ----
    const navToggle = document.getElementById('navToggle');
    const navLinks = document.getElementById('navLinks');

    if (navToggle && navLinks) {
        navToggle.addEventListener('click', () => {
            navToggle.classList.toggle('active');
            navLinks.classList.toggle('active');
        });

        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                navToggle.classList.remove('active');
                navLinks.classList.remove('active');
            });
        });
    }

    // ---- Navbar scroll effect ----
    const navbar = document.getElementById('navbar');
    if (navbar) {
        window.addEventListener('scroll', throttle(() => {
            if (window.scrollY > 50) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        }, 100));
    }

    // ---- Scroll animations with stagger ----
    const fadeElements = document.querySelectorAll('.service-card, .mission-card, .pricing-card, .blog-card, .contact-detail, .sidebar-card');

    fadeElements.forEach((el, index) => {
        el.classList.add('fade-in');
        el.style.transitionDelay = `${index * 0.08}s`;
    });

    const observerOptions = {
        root: null,
        rootMargin: '0px 0px -40px 0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    fadeElements.forEach(el => observer.observe(el));

    // ---- Section headers fade in ----
    const sectionHeaders = document.querySelectorAll('.section-header, .section-tag, .page-hero h1, .page-hero p');
    sectionHeaders.forEach(el => {
        el.classList.add('fade-in');
    });
    const headerObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                headerObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });
    sectionHeaders.forEach(el => headerObserver.observe(el));

    // ---- Counter Animation ----
    const statNumbers = document.querySelectorAll('.stat-number[data-target]');

    const counterObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const target = parseInt(entry.target.dataset.target);
                animateCounter(entry.target, target);
                counterObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });

    statNumbers.forEach(el => counterObserver.observe(el));

    function animateCounter(element, target) {
        const duration = 2500;
        const start = performance.now();

        function update(currentTime) {
            const elapsed = currentTime - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 4);
            const current = Math.floor(eased * target);

            element.textContent = current.toLocaleString('fr-FR');

            if (progress < 1) {
                requestAnimationFrame(update);
            }
        }

        requestAnimationFrame(update);
    }

    // ---- Smooth scroll ----
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (href === '#') return;

            e.preventDefault();
            const target = document.querySelector(href);
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

    // ---- Contact form handler (shared) ----
    function handleContactForm(form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();

            const formData = new FormData(this);
            const data = Object.fromEntries(formData);

            if (!data.name || !data.email || !data.phone) {
                showNotification('Veuillez remplir tous les champs obligatoires.', 'error');
                return;
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(data.email)) {
                showNotification('Veuillez entrer une adresse email valide.', 'error');
                return;
            }

            const subject = encodeURIComponent(data.subject || 'Contact depuis le site Privora');
            const body = encodeURIComponent(
                `Nom: ${data.name}\nEmail: ${data.email}\nTéléphone: ${data.phone}\n\nMessage:\n${data.message || 'Aucun message'}`
            );

            window.location.href = `mailto:contact@privora.fr?subject=${subject}&body=${body}`;

            const btn = this.querySelector('button[type="submit"]');
            const originalText = btn.textContent;
            btn.textContent = 'Message envoyé !';
            btn.style.background = '#27ae60';
            btn.style.borderColor = '#27ae60';

            setTimeout(() => {
                btn.textContent = originalText;
                btn.style.background = '';
                btn.style.borderColor = '';
                this.reset();
            }, 3000);
        });
    }

    const contactForm = document.getElementById('contactForm');
    if (contactForm) handleContactForm(contactForm);

    const statsContactForm = document.getElementById('statsContactForm');
    if (statsContactForm) handleContactForm(statsContactForm);

    // ---- Notification helper ----
    function showNotification(message, type) {
        const existing = document.querySelector('.notification');
        if (existing) existing.remove();

        const notif = document.createElement('div');
        notif.className = `notification notification-${type}`;
        notif.textContent = message;
        notif.style.cssText = `
            position: fixed;
            top: 90px;
            right: 20px;
            padding: 14px 24px;
            border-radius: 8px;
            font-size: 0.9rem;
            font-weight: 600;
            z-index: 9999;
            animation: slideIn 0.3s ease;
            background: ${type === 'error' ? '#ff4444' : '#27ae60'};
            color: #fff;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        `;
        document.body.appendChild(notif);

        setTimeout(() => {
            notif.style.opacity = '0';
            notif.style.transform = 'translateX(20px)';
            notif.style.transition = 'all 0.3s ease';
            setTimeout(() => notif.remove(), 300);
        }, 3000);
    }

    // ---- Cyber Tools Section ----
    const toolTabs = document.querySelectorAll('.tool-tab');
    const toolPanels = document.querySelectorAll('.tool-panel');

    if (toolTabs.length) {
        toolTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                toolTabs.forEach(t => t.classList.remove('active'));
                toolPanels.forEach(p => p.classList.remove('active'));
                tab.classList.add('active');
                const panel = document.getElementById('tool-' + tab.dataset.tool);
                if (panel) panel.classList.add('active');
            });
        });

        // ---- IP Checker (AbuseIPDB demo) ----
        const ipCheck = document.getElementById('ipCheck');
        const ipInput = document.getElementById('ipInput');
        if (ipCheck && ipInput) {
            ipCheck.addEventListener('click', () => {
                const ip = ipInput.value.trim();
                if (!ip || !/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) {
                    showNotification('Veuillez entrer une adresse IP valide.', 'error');
                    return;
                }
                runToolScan('ipResult', `Analyse de ${ip}...`, () => generateIPResult(ip));
            });
            ipInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') ipCheck.click(); });
        }

        // ---- URL Scanner (VirusTotal demo) ----
        const urlScan = document.getElementById('urlScan');
        const urlInput = document.getElementById('urlInput');
        if (urlScan && urlInput) {
            urlScan.addEventListener('click', () => {
                const url = urlInput.value.trim();
                if (!url) {
                    showNotification('Veuillez entrer une URL.', 'error');
                    return;
                }
                runToolScan('urlResult', `Scan de ${url}...`, () => generateURLResult(url));
            });
            urlInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') urlScan.click(); });
        }

        // ---- DNS Intel (SecurityTrails demo) ----
        const dnsCheck = document.getElementById('dnsCheck');
        const dnsInput = document.getElementById('dnsInput');
        if (dnsCheck && dnsInput) {
            dnsCheck.addEventListener('click', () => {
                const domain = dnsInput.value.trim();
                if (!domain || !domain.includes('.')) {
                    showNotification('Veuillez entrer un nom de domaine valide.', 'error');
                    return;
                }
                runToolScan('dnsResult', `Analyse DNS de ${domain}...`, () => generateDNSResult(domain));
            });
            dnsInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') dnsCheck.click(); });
        }

        // ---- Shodan Exposure ----
        const shodanCheck = document.getElementById('shodanCheck');
        const shodanInput = document.getElementById('shodanInput');
        if (shodanCheck && shodanInput) {
            shodanCheck.addEventListener('click', () => {
                const target = shodanInput.value.trim();
                if (!target) {
                    showNotification('Veuillez entrer un domaine ou une IP.', 'error');
                    return;
                }
                runToolScan('shodanResult', `Scan des ports de ${target}...`, () => generateShodanResult(target));
            });
            shodanInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') shodanCheck.click(); });
        }
    }

    // Scanning animation helper
    function runToolScan(resultId, message, callback) {
        const container = document.getElementById(resultId);
        if (!container) return;

        container.innerHTML = `
            <div class="scan-progress">
                <div class="scan-progress-bar"><div class="scan-progress-fill"></div></div>
                <span>${sanitizeHTML(message)}</span>
            </div>
        `;

        setTimeout(() => {
            container.innerHTML = callback();
        }, 2200);
    }

    // IP Reputation Result (AbuseIPDB style)
    function generateIPResult(rawIp) {
        const ip = sanitizeHTML(rawIp);
        const hash = ip.split('.').reduce((a, b) => a + parseInt(b), 0);
        const isMalicious = hash % 3 === 0;
        const confidence = isMalicious ? Math.floor(60 + (hash % 40)) : Math.floor(hash % 15);
        const status = confidence > 50 ? 'danger' : confidence > 20 ? 'warning' : 'safe';
        const statusText = confidence > 50 ? 'IP Malveillante' : confidence > 20 ? 'Suspecte' : 'IP Propre';
        const countries = ['US', 'RU', 'CN', 'DE', 'NL', 'FR', 'BR', 'KR'];
        const isps = ['OVH SAS', 'DigitalOcean', 'Amazon AWS', 'Google Cloud', 'Hetzner', 'Cloudflare'];
        const reports = isMalicious ? Math.floor(50 + hash % 500) : Math.floor(hash % 5);

        return `
            <div class="tool-result-card">
                <div class="result-header">
                    <div class="result-status">
                        <div class="result-status-dot ${status}"></div>
                        <span class="result-status-text">${statusText}</span>
                    </div>
                    <div class="result-score ${status}">${confidence}%</div>
                </div>
                <div class="result-grid">
                    <div class="result-item">
                        <span class="result-label">Adresse IP</span>
                        <span class="result-value">${ip}</span>
                    </div>
                    <div class="result-item">
                        <span class="result-label">Pays</span>
                        <span class="result-value">${countries[hash % countries.length]}</span>
                    </div>
                    <div class="result-item">
                        <span class="result-label">FAI / Hébergeur</span>
                        <span class="result-value">${isps[hash % isps.length]}</span>
                    </div>
                    <div class="result-item">
                        <span class="result-label">Signalements</span>
                        <span class="result-value">${reports} rapports</span>
                    </div>
                    <div class="result-item">
                        <span class="result-label">Confiance abus</span>
                        <span class="result-value">${confidence}%</span>
                    </div>
                    <div class="result-item">
                        <span class="result-label">Catégories</span>
                        <span class="result-value">${isMalicious ? 'Brute-Force, Scan' : 'Aucune'}</span>
                    </div>
                </div>
                <div class="result-cta">
                    <p>Pour un rapport complet avec historique et liste noire :</p>
                    <a href="cybersecurite-pme.html" class="btn btn-primary">Contacter nos experts</a>
                </div>
            </div>
        `;
    }

    // URL Scanner Result (VirusTotal style)
    function generateURLResult(rawUrl) {
        const url = sanitizeHTML(rawUrl);
        const hash = url.length + url.charCodeAt(0);
        const detections = hash % 5 === 0 ? Math.floor(2 + hash % 8) : 0;
        const engines = 67;
        const status = detections > 3 ? 'danger' : detections > 0 ? 'warning' : 'safe';
        const statusText = detections > 3 ? 'Menace détectée' : detections > 0 ? 'Suspect' : 'Aucune menace';
        const categories = ['Phishing', 'Malware', 'Spam', 'Clean'];

        return `
            <div class="tool-result-card">
                <div class="result-header">
                    <div class="result-status">
                        <div class="result-status-dot ${status}"></div>
                        <span class="result-status-text">${statusText}</span>
                    </div>
                    <div class="result-score ${status}">${detections}/${engines}</div>
                </div>
                <div class="result-grid">
                    <div class="result-item">
                        <span class="result-label">URL analysée</span>
                        <span class="result-value result-url-break">${url}</span>
                    </div>
                    <div class="result-item">
                        <span class="result-label">Moteurs d'analyse</span>
                        <span class="result-value">${engines} moteurs</span>
                    </div>
                    <div class="result-item">
                        <span class="result-label">Détections</span>
                        <span class="result-value ${detections > 0 ? 'detection-red' : 'detection-green'}">${detections} moteur${detections > 1 ? 's' : ''}</span>
                    </div>
                    <div class="result-item">
                        <span class="result-label">Catégorie</span>
                        <span class="result-value">${detections > 0 ? categories[hash % 3] : categories[3]}</span>
                    </div>
                </div>
                <div class="result-cta">
                    <p>Besoin d'un scan approfondi de votre site web ?</p>
                    <a href="cybersecurite-pme.html" class="btn btn-primary">Demander un audit</a>
                </div>
            </div>
        `;
    }

    // DNS Intel Result (SecurityTrails style)
    function generateDNSResult(rawDomain) {
        const domain = sanitizeHTML(rawDomain);
        const hash = domain.length + domain.charCodeAt(0);
        const subdomains = ['www', 'mail', 'ftp', 'api', 'dev', 'staging', 'cdn', 'admin', 'vpn', 'webmail'];
        const foundSubs = subdomains.slice(0, 3 + hash % 5);
        const ips = [`${80 + hash % 100}.${hash % 255}.${(hash * 3) % 255}.${(hash * 7) % 255}`];
        const nameservers = [`ns1.${domain.includes('.fr') ? 'ovh.net' : 'cloudflare.com'}`, `ns2.${domain.includes('.fr') ? 'ovh.net' : 'cloudflare.com'}`];

        return `
            <div class="tool-result-card">
                <div class="result-header">
                    <div class="result-status">
                        <div class="result-status-dot safe"></div>
                        <span class="result-status-text">Analyse terminée</span>
                    </div>
                </div>
                <div class="result-grid">
                    <div class="result-item">
                        <span class="result-label">Domaine</span>
                        <span class="result-value">${domain}</span>
                    </div>
                    <div class="result-item">
                        <span class="result-label">IP actuelle</span>
                        <span class="result-value">${ips[0]}</span>
                    </div>
                    <div class="result-item">
                        <span class="result-label">Serveurs DNS</span>
                        <span class="result-value">${nameservers.join(', ')}</span>
                    </div>
                    <div class="result-item">
                        <span class="result-label">Sous-domaines trouvés</span>
                        <span class="result-value">${foundSubs.length} détectés</span>
                    </div>
                </div>
                <div class="result-section-divider">
                    <span class="result-label result-section-label">Sous-domaines</span>
                    ${foundSubs.map(s => `<span class="result-value result-subdomain-tag">${s}.${domain}</span>`).join('')}
                </div>
                <div class="result-cta">
                    <p>Rapport DNS complet avec historique et analyse WHOIS :</p>
                    <a href="cybersecurite-pme.html" class="btn btn-primary">Contacter nos experts</a>
                </div>
            </div>
        `;
    }

    // Shodan Exposure Result
    function generateShodanResult(rawTarget) {
        const target = sanitizeHTML(rawTarget);
        const hash = target.length + target.charCodeAt(0);
        const ports = [
            { port: 80, service: 'HTTP', status: 'open' },
            { port: 443, service: 'HTTPS', status: 'open' },
            { port: 22, service: 'SSH', status: hash % 3 === 0 ? 'open' : 'filtered' },
            { port: 21, service: 'FTP', status: hash % 4 === 0 ? 'open' : 'closed' },
            { port: 3306, service: 'MySQL', status: hash % 5 === 0 ? 'open' : 'closed' },
            { port: 8080, service: 'HTTP-Alt', status: hash % 3 === 0 ? 'open' : 'closed' },
            { port: 3389, service: 'RDP', status: hash % 6 === 0 ? 'open' : 'closed' }
        ];
        const openPorts = ports.filter(p => p.status === 'open');
        const riskyPorts = openPorts.filter(p => [22, 21, 3306, 3389, 8080].includes(p.port));
        const riskLevel = riskyPorts.length > 2 ? 'danger' : riskyPorts.length > 0 ? 'warning' : 'safe';
        const riskText = riskyPorts.length > 2 ? 'Exposition élevée' : riskyPorts.length > 0 ? 'Exposition modérée' : 'Faible exposition';

        return `
            <div class="tool-result-card">
                <div class="result-header">
                    <div class="result-status">
                        <div class="result-status-dot ${riskLevel}"></div>
                        <span class="result-status-text">${riskText}</span>
                    </div>
                    <div class="result-score ${riskLevel}">${openPorts.length} ports</div>
                </div>
                <div class="result-grid">
                    <div class="result-item">
                        <span class="result-label">Cible</span>
                        <span class="result-value">${target}</span>
                    </div>
                    <div class="result-item">
                        <span class="result-label">Ports ouverts</span>
                        <span class="result-value">${openPorts.length} / ${ports.length} scannés</span>
                    </div>
                </div>
                <div class="result-section-divider">
                    <span class="result-label result-section-label">Ports détectés</span>
                    ${ports.map(p => `
                        <div class="port-row">
                            <span class="port-number">:${p.port}</span>
                            <span class="port-service">${sanitizeHTML(p.service)}</span>
                            <span class="port-status ${p.status}">${sanitizeHTML(p.status)}</span>
                        </div>
                    `).join('')}
                </div>
                <div class="result-cta">
                    <p>Sécurisez vos ports exposés avec un audit complet :</p>
                    <a href="cybersecurite-pme.html" class="btn btn-primary">Demander un pentest</a>
                </div>
            </div>
        `;
    }

    // ---- Typing effect for hero h1 (homepage only) ----
    const heroH1 = document.querySelector('.hero-text h1');
    if (heroH1) {
        heroH1.style.opacity = '0';
        heroH1.style.animation = 'fadeSlideUp 0.8s ease forwards 0.3s';
    }

    // ---- Encrypted text scramble on section tags ----
    const scrambleChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&*!?<>{}[]';

    document.querySelectorAll('.section-tag').forEach(tag => {
        const original = tag.textContent;
        let isAnimating = false;
        let currentInterval = null;

        tag.addEventListener('mouseenter', () => {
            if (isAnimating) return;
            isAnimating = true;
            let iterations = 0;

            // Clear any leftover interval (safety)
            if (currentInterval) clearInterval(currentInterval);

            currentInterval = setInterval(() => {
                tag.textContent = original.split('')
                    .map((char, index) => {
                        if (char === ' ') return ' ';
                        if (index < iterations) return original[index];
                        return scrambleChars[Math.floor(Math.random() * scrambleChars.length)];
                    })
                    .join('');

                iterations += 1 / 2;

                if (iterations >= original.length) {
                    tag.textContent = original;
                    clearInterval(currentInterval);
                    currentInterval = null;
                    isAnimating = false;
                }
            }, 30);
        });
    });

    // ---- Parallax on scroll for hero ----
    const hero = document.querySelector('.hero');
    if (hero) {
        const heroBg = hero.querySelector('.hero-bg-image');
        const heroOverlay = hero.querySelector('.hero-overlay');

        window.addEventListener('scroll', throttle(() => {
            const scrollY = window.scrollY;
            const heroHeight = hero.offsetHeight;

            if (scrollY < heroHeight) {
                const ratio = scrollY / heroHeight;
                if (heroBg) heroBg.style.transform = `translateY(${scrollY * 0.3}px)`;
                if (heroOverlay) heroOverlay.style.opacity = 0.5 + ratio * 0.5;
            }
        }, 16));
    }

    // Add keyframes dynamically
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeSlideUp {
            0% { opacity: 0; transform: translateY(30px); }
            100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideIn {
            0% { opacity: 0; transform: translateX(20px); }
            100% { opacity: 1; transform: translateX(0); }
        }
    `;
    document.head.appendChild(style);

    // ---- 3D Globe Attack Map ----
    const globeContainer = document.getElementById('globeViz');
    if (globeContainer && typeof Globe !== 'undefined') {
        const feedList = document.getElementById('attackFeedList');
        const attackCountEl = document.getElementById('attackCount');
        const blockedCountEl = document.getElementById('blockedCount');
        let attackTotal = 0;
        let blockedTotal = 0;

        // Cities with real lat/lng coordinates
        const cities = [
            { name: 'Paris', lat: 48.86, lng: 2.35, flag: '\uD83C\uDDEB\uD83C\uDDF7' },
            { name: 'New York', lat: 40.71, lng: -74.01, flag: '\uD83C\uDDFA\uD83C\uDDF8' },
            { name: 'Moscou', lat: 55.76, lng: 37.62, flag: '\uD83C\uDDF7\uD83C\uDDFA' },
            { name: 'P\u00e9kin', lat: 39.90, lng: 116.40, flag: '\uD83C\uDDE8\uD83C\uDDF3' },
            { name: 'S\u00e3o Paulo', lat: -23.55, lng: -46.63, flag: '\uD83C\uDDE7\uD83C\uDDF7' },
            { name: 'Londres', lat: 51.51, lng: -0.13, flag: '\uD83C\uDDEC\uD83C\uDDE7' },
            { name: 'Tokyo', lat: 35.68, lng: 139.69, flag: '\uD83C\uDDEF\uD83C\uDDF5' },
            { name: 'Sydney', lat: -33.87, lng: 151.21, flag: '\uD83C\uDDE6\uD83C\uDDFA' },
            { name: 'Berlin', lat: 52.52, lng: 13.41, flag: '\uD83C\uDDE9\uD83C\uDDEA' },
            { name: 'Mumbai', lat: 19.08, lng: 72.88, flag: '\uD83C\uDDEE\uD83C\uDDF3' },
            { name: 'Lagos', lat: 6.52, lng: 3.38, flag: '\uD83C\uDDF3\uD83C\uDDEC' },
            { name: 'Dubai', lat: 25.20, lng: 55.27, flag: '\uD83C\uDDE6\uD83C\uDDEA' },
            { name: 'Toronto', lat: 43.65, lng: -79.38, flag: '\uD83C\uDDE8\uD83C\uDDE6' },
            { name: 'S\u00e9oul', lat: 37.57, lng: 126.98, flag: '\uD83C\uDDF0\uD83C\uDDF7' },
            { name: 'Amsterdam', lat: 52.37, lng: 4.90, flag: '\uD83C\uDDF3\uD83C\uDDF1' },
            { name: 'Tel Aviv', lat: 32.09, lng: 34.78, flag: '\uD83C\uDDEE\uD83C\uDDF1' },
            { name: 'Johannesburg', lat: -26.20, lng: 28.05, flag: '\uD83C\uDDFF\uD83C\uDDE6' },
            { name: 'Singapour', lat: 1.35, lng: 103.82, flag: '\uD83C\uDDF8\uD83C\uDDEC' },
            { name: 'Mexico', lat: 19.43, lng: -99.13, flag: '\uD83C\uDDF2\uD83C\uDDFD' },
            { name: 'Le Caire', lat: 30.04, lng: 31.24, flag: '\uD83C\uDDEA\uD83C\uDDEC' }
        ];

        const simAttackTypes = [
            'DDoS Attack', 'Brute Force SSH', 'SQL Injection', 'XSS Attack',
            'Ransomware', 'Phishing', 'Port Scan', 'Malware C2',
            'RDP Brute Force', 'DNS Amplification', 'SMB Exploit',
            'API Abuse', 'Credential Stuffing', 'Zero-Day Exploit'
        ];

        const severities = ['critical', 'high', 'medium', 'low'];
        const sevWeights = [0.1, 0.25, 0.4, 0.25];

        // Country code to lat/lng + flag lookup
        const countryCoords = {
            US: { lat: 38.0, lng: -97.0, flag: '\uD83C\uDDFA\uD83C\uDDF8', name: 'USA' },
            CN: { lat: 35.0, lng: 105.0, flag: '\uD83C\uDDE8\uD83C\uDDF3', name: 'Chine' },
            RU: { lat: 61.5, lng: 105.3, flag: '\uD83C\uDDF7\uD83C\uDDFA', name: 'Russie' },
            DE: { lat: 51.2, lng: 10.4, flag: '\uD83C\uDDE9\uD83C\uDDEA', name: 'Allemagne' },
            NL: { lat: 52.1, lng: 5.3, flag: '\uD83C\uDDF3\uD83C\uDDF1', name: 'Pays-Bas' },
            FR: { lat: 46.2, lng: 2.2, flag: '\uD83C\uDDEB\uD83C\uDDF7', name: 'France' },
            GB: { lat: 55.4, lng: -3.4, flag: '\uD83C\uDDEC\uD83C\uDDE7', name: 'UK' },
            IN: { lat: 20.6, lng: 79.0, flag: '\uD83C\uDDEE\uD83C\uDDF3', name: 'Inde' },
            BR: { lat: -14.2, lng: -51.9, flag: '\uD83C\uDDE7\uD83C\uDDF7', name: 'Br\u00e9sil' },
            JP: { lat: 36.2, lng: 138.3, flag: '\uD83C\uDDEF\uD83C\uDDF5', name: 'Japon' },
            KR: { lat: 35.9, lng: 127.8, flag: '\uD83C\uDDF0\uD83C\uDDF7', name: 'Cor\u00e9e' },
            AU: { lat: -25.3, lng: 133.8, flag: '\uD83C\uDDE6\uD83C\uDDFA', name: 'Australie' },
            CA: { lat: 56.1, lng: -106.3, flag: '\uD83C\uDDE8\uD83C\uDDE6', name: 'Canada' },
            SG: { lat: 1.4, lng: 103.8, flag: '\uD83C\uDDF8\uD83C\uDDEC', name: 'Singapour' },
            ZA: { lat: -30.6, lng: 22.9, flag: '\uD83C\uDDFF\uD83C\uDDE6', name: 'Afrique du Sud' },
            UA: { lat: 48.4, lng: 31.2, flag: '\uD83C\uDDFA\uD83C\uDDE6', name: 'Ukraine' },
            IR: { lat: 32.4, lng: 53.7, flag: '\uD83C\uDDEE\uD83C\uDDF7', name: 'Iran' },
            KP: { lat: 40.3, lng: 127.5, flag: '\uD83C\uDDF0\uD83C\uDDF5', name: 'Cor\u00e9e du Nord' },
            VN: { lat: 14.1, lng: 108.3, flag: '\uD83C\uDDFB\uD83C\uDDF3', name: 'Vietnam' },
            ID: { lat: -0.8, lng: 113.9, flag: '\uD83C\uDDEE\uD83C\uDDE9', name: 'Indon\u00e9sie' },
            TR: { lat: 39.0, lng: 35.2, flag: '\uD83C\uDDF9\uD83C\uDDF7', name: 'Turquie' },
            PL: { lat: 51.9, lng: 19.1, flag: '\uD83C\uDDF5\uD83C\uDDF1', name: 'Pologne' },
            IT: { lat: 41.9, lng: 12.6, flag: '\uD83C\uDDEE\uD83C\uDDF9', name: 'Italie' },
            MX: { lat: 23.6, lng: -102.6, flag: '\uD83C\uDDF2\uD83C\uDDFD', name: 'Mexique' },
            EG: { lat: 26.8, lng: 30.8, flag: '\uD83C\uDDEA\uD83C\uDDEC', name: '\u00c9gypte' },
            NG: { lat: 9.1, lng: 8.7, flag: '\uD83C\uDDF3\uD83C\uDDEC', name: 'Nigeria' },
            AE: { lat: 23.4, lng: 53.8, flag: '\uD83C\uDDE6\uD83C\uDDEA', name: 'EAU' },
            IL: { lat: 31.0, lng: 34.9, flag: '\uD83C\uDDEE\uD83C\uDDF1', name: 'Isra\u00ebl' },
            SE: { lat: 60.1, lng: 18.6, flag: '\uD83C\uDDF8\uD83C\uDDEA', name: 'Su\u00e8de' },
            RO: { lat: 45.9, lng: 25.0, flag: '\uD83C\uDDF7\uD83C\uDDF4', name: 'Roumanie' },
            TH: { lat: 15.9, lng: 100.9, flag: '\uD83C\uDDF9\uD83C\uDDED', name: 'Tha\u00eflande' },
            AR: { lat: -38.4, lng: -63.6, flag: '\uD83C\uDDE6\uD83C\uDDF7', name: 'Argentine' },
            PH: { lat: 12.9, lng: 121.8, flag: '\uD83C\uDDF5\uD83C\uDDED', name: 'Philippines' }
        };

        // Map ThreatFox threat types to readable labels
        const threatTypeLabels = {
            'botnet_cc': 'Botnet C2',
            'payload_delivery': 'Payload Delivery',
            'payload': 'Malware Payload',
            'cryptominer': 'Cryptominer',
            'stealer': 'Info Stealer',
            'ransomware': 'Ransomware',
            'rat': 'Remote Access Trojan',
            'loader': 'Malware Loader'
        };

        function randomIP() {
            return `${Math.floor(Math.random() * 223) + 1}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`;
        }

        function pickSeverity() {
            const r = Math.random();
            let cumulative = 0;
            for (let i = 0; i < sevWeights.length; i++) {
                cumulative += sevWeights[i];
                if (r <= cumulative) return severities[i];
            }
            return 'medium';
        }

        function sevColor(sev) {
            return sev === 'critical' ? '#ff4444' :
                   sev === 'high' ? '#ff6644' :
                   sev === 'medium' ? '#ffcc00' : '#27ae60';
        }

        // ---- Real Threat Intelligence (ThreatFox - abuse.ch) ----
        let realIOCs = [];
        let realIOCIndex = 0;

        async function fetchRealThreats() {
            try {
                const response = await fetch('https://threatfox-api.abuse.ch/api/v1/', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ query: 'get_iocs', days: 1 })
                });
                const data = await response.json();
                if (data.query_status === 'ok' && data.data) {
                    realIOCs = data.data
                        .filter(ioc => ioc.ioc_type === 'ip:port' && ioc.country)
                        .slice(0, 100)
                        .map(ioc => ({
                            ip: ioc.ioc_value.split(':')[0],
                            port: ioc.ioc_value.split(':')[1],
                            country: ioc.country,
                            malware: ioc.malware_printable || 'Unknown',
                            threat: threatTypeLabels[ioc.threat_type] || ioc.threat_type,
                            confidence: ioc.confidence_level || 50,
                            firstSeen: ioc.first_seen_utc,
                            tags: ioc.tags || []
                        }));
                    console.log(`[Privora] ${realIOCs.length} vrais IOC charg\u00e9s depuis ThreatFox`);
                }
            } catch (e) {
                console.log('[Privora] ThreatFox API indisponible, mode simulation uniquement');
            }
        }

        // Fetch real threats immediately
        fetchRealThreats();
        // Refresh every 5 minutes (store ref to allow cleanup)
        let threatRefreshInterval = setInterval(fetchRealThreats, 5 * 60 * 1000);

        let arcsData = [];
        let globe = null;

        // Preload earth textures early
        const preloadEarth = new Image();
        preloadEarth.src = 'https://unpkg.com/three-globe/example/img/earth-night.jpg';
        const preloadSky = new Image();
        preloadSky.src = 'https://unpkg.com/three-globe/example/img/night-sky.png';

        // Show loading state
        globeContainer.innerHTML = '<div class="tool-loading" style="height:500px"><div class="tool-spinner"></div><span>Chargement du globe...</span></div>';

        function initGlobe() {
            const w = globeContainer.offsetWidth || 600;
            const h = 500;

            globeContainer.innerHTML = '';

            globe = Globe()
                (globeContainer)
                .globeImageUrl('https://unpkg.com/three-globe/example/img/earth-night.jpg')
                .backgroundImageUrl('https://unpkg.com/three-globe/example/img/night-sky.png')
                .backgroundColor('rgba(0,0,0,0)')
                .arcColor(d => d.color)
                .arcDashLength(0.6)
                .arcDashGap(0.3)
                .arcDashAnimateTime(1500)
                .arcStroke(0.8)
                .arcsTransitionDuration(300)
                .pointColor(() => 'rgba(201, 162, 39, 0.9)')
                .pointAltitude(0.01)
                .pointRadius(0.4)
                .atmosphereColor('#C9A227')
                .atmosphereAltitude(0.15)
                .showGraticules(true)
                .width(w)
                .height(h)
                .pointsData(cities.map(c => ({ lat: c.lat, lng: c.lng })));

            globe.controls().autoRotate = true;
            globe.controls().autoRotateSpeed = 0.4;
            globe.controls().enableZoom = false;
            globe.pointOfView({ lat: 30, lng: 20, altitude: 2.2 });

            window.addEventListener('resize', throttle(() => {
                const nw = globeContainer.offsetWidth || 600;
                globe.width(nw).height(h);
            }, 200));
        }

        // Add arc to globe
        function addArc(startLat, startLng, endLat, endLng, color) {
            const arcId = Date.now() + Math.random();
            arcsData.push({ id: arcId, startLat, startLng, endLat, endLng, color });
            globe.arcsData([...arcsData]);
            setTimeout(() => {
                arcsData = arcsData.filter(a => a.id !== arcId);
                if (globe) globe.arcsData([...arcsData]);
            }, 3000);
        }

        // Add entry to feed
        function addFeedEntry(flag, ip, targetName, type, sev, isReal) {
            if (!feedList) return;
            const timeStr = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            const entry = document.createElement('div');
            entry.className = 'attack-entry';
            const badge = isReal
                ? '<span class="attack-entry-badge real">LIVE</span>'
                : '<span class="attack-entry-badge sim">SIM</span>';
            entry.innerHTML = `
                <span class="attack-entry-flag">${sanitizeHTML(flag)}</span>
                <div class="attack-entry-info">
                    <span class="attack-entry-ip">${sanitizeHTML(ip)} \u2192 ${sanitizeHTML(targetName)}</span>
                    <span class="attack-entry-type">${sanitizeHTML(type)} ${badge}</span>
                </div>
                <span class="attack-entry-severity ${sanitizeHTML(sev)}">${sanitizeHTML(sev)}</span>
                <span class="attack-entry-time">${timeStr}</span>
            `;
            feedList.insertBefore(entry, feedList.firstChild);
            while (feedList.children.length > 50) {
                feedList.removeChild(feedList.lastChild);
            }
        }

        // Create a REAL attack from ThreatFox IOC data
        function createRealAttack() {
            if (!globe || realIOCs.length === 0) return false;

            const ioc = realIOCs[realIOCIndex % realIOCs.length];
            realIOCIndex++;

            const srcCoords = countryCoords[ioc.country];
            if (!srcCoords) return false;

            // Target = Paris (Privora HQ) or random city
            const tgt = Math.random() > 0.3
                ? { lat: 48.86, lng: 2.35, name: 'Paris' }
                : cities[Math.floor(Math.random() * cities.length)];

            const sev = ioc.confidence >= 80 ? 'critical' :
                        ioc.confidence >= 50 ? 'high' : 'medium';

            addArc(srcCoords.lat, srcCoords.lng, tgt.lat, tgt.lng, sevColor(sev));

            const typeLabel = `${ioc.malware} \u2022 ${ioc.threat}`;
            addFeedEntry(srcCoords.flag, ioc.ip, tgt.name, typeLabel, sev, true);

            attackTotal++;
            if (Math.random() > 0.1) blockedTotal++;
            if (attackCountEl) attackCountEl.textContent = attackTotal.toLocaleString('fr-FR');
            if (blockedCountEl) blockedCountEl.textContent = blockedTotal.toLocaleString('fr-FR');
            return true;
        }

        // Create a SIMULATED attack
        function createSimAttack() {
            if (!globe) return;

            const src = cities[Math.floor(Math.random() * cities.length)];
            let tgt = cities[Math.floor(Math.random() * cities.length)];
            while (tgt === src) tgt = cities[Math.floor(Math.random() * cities.length)];

            const sev = pickSeverity();
            const type = simAttackTypes[Math.floor(Math.random() * simAttackTypes.length)];

            addArc(src.lat, src.lng, tgt.lat, tgt.lng, sevColor(sev));
            addFeedEntry(src.flag, randomIP(), tgt.name, type, sev, false);

            attackTotal++;
            if (Math.random() > 0.15) blockedTotal++;
            if (attackCountEl) attackCountEl.textContent = attackTotal.toLocaleString('fr-FR');
            if (blockedCountEl) blockedCountEl.textContent = blockedTotal.toLocaleString('fr-FR');
        }

        // Spawn attacks: prefer real data when available, mix with simulation
        function spawnAttacks() {
            // 60% chance to use real data if available
            if (realIOCs.length > 0 && Math.random() < 0.6) {
                if (!createRealAttack()) createSimAttack();
            } else {
                createSimAttack();
            }
            setTimeout(spawnAttacks, 800 + Math.random() * 2000);
        }

        // Start globe when section becomes visible
        const mapObserver = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                initGlobe();
                setTimeout(() => spawnAttacks(), 800);
                mapObserver.disconnect();
            }
        }, { threshold: 0.1 });
        mapObserver.observe(globeContainer);
    }

});
