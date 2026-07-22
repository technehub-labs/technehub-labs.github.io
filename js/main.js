/* TechNeHub Labs — GitHub Pages JavaScript
   Senior-grade: parallax scroll, fade-in reveals, navbar state, mobile nav */

(function () {
  'use strict'

  // ── Parallax scroll handler ───────────────────────────
  const parallaxTargets = []
  const heroBg = document.querySelector('.hero-bg')
  const heroGrid = document.querySelector('.hero-grid')
  const heroOrbs = document.querySelectorAll('.hero-orb')
  const parallaxDividers = document.querySelectorAll('.parallax-divider')

  if (heroBg)     parallaxTargets.push({ el: heroBg,     speed: 0.30, axis: 'y' })
  if (heroGrid)   parallaxTargets.push({ el: heroGrid,   speed: 0.15, axis: 'y' })
  heroOrbs.forEach(function (orb, i) {
    parallaxTargets.push({ el: orb, speed: 0.25 + (i * 0.08), axis: 'y' })
  })
  parallaxDividers.forEach(function (div) {
    const bg = div.querySelector('.parallax-bg')
    const rings = div.querySelectorAll('.parallax-ring')
    if (bg)     parallaxTargets.push({ el: bg,     speed: 0.18, axis: 'y' })
    rings.forEach(function (ring, i) {
      parallaxTargets.push({ el: ring, speed: 0.08 + (i * 0.05), axis: 'y' })
    })
  })

  let scrollY = window.pageYOffset
  let ticking = false

  function updateParallax () {
    parallaxTargets.forEach(function (t) {
      const rect = t.el.getBoundingClientRect()
      if (rect.bottom > -200 && rect.top < window.innerHeight + 200) {
        const offset = (rect.top + scrollY) * t.speed * -0.5
        t.el.style.transform = 'translate3d(0,' + offset.toFixed(2) + 'px,0)'
      }
    })
    ticking = false
  }

  function onScroll () {
    scrollY = window.pageYOffset
    if (!ticking) {
      window.requestAnimationFrame(updateParallax)
      ticking = true
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onScroll, { passive: true })
  updateParallax()

  // ── Navbar scroll effect ──────────────────────────────
  const navbar = document.getElementById('navbar')
  if (navbar) {
    window.addEventListener('scroll', function () {
      if (window.scrollY > 80) {
        navbar.style.background = 'rgba(8, 11, 16, 0.92)'
        navbar.style.boxShadow = '0 1px 0 rgba(45, 212, 191, 0.08)'
      } else {
        navbar.style.background = 'rgba(8, 11, 16, 0.75)'
        navbar.style.boxShadow = 'none'
      }
    }, { passive: true })
  }

  // ── Mobile nav toggle ─────────────────────────────────
  const toggle = document.getElementById('navToggle')
  const links = document.getElementById('navLinks')
  if (toggle && links) {
    toggle.addEventListener('click', function () {
      links.classList.toggle('open')
    })
    links.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        links.classList.remove('open')
      })
    })
  }

  // ── Intersection Observer — fade-in reveals ────────────
  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible')
          revealObserver.unobserve(entry.target)
        }
      })
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' })

    document.querySelectorAll(
      '.about-card, .layer, .repo-card, .tool-card, .stakeholder-card, ' +
      '.community-card, .assessment-main, .assessment-side, .cli-window, ' +
      '.metamodel-diagram, .diagram-node'
    ).forEach(function (el) {
      el.classList.add('reveal')
      revealObserver.observe(el)
    })
  }

  // ── Hero canvas particle field ─────────────────────────
  const canvas = document.getElementById('hero-canvas')
  if (canvas && canvas.getContext) {
    const ctx = canvas.getContext('2d')
    let particles = []
    let animFrame = null

    function resizeCanvas () {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    function createParticle () {
      return {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        size: Math.random() * 1.5 + 0.4,
        opacity: Math.random() * 0.45 + 0.08
      }
    }

    function drawParticle (p) {
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(45, 212, 191, ' + p.opacity + ')'
      ctx.fill()
    }

    function drawConnections () {
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const p1 = particles[i]
          const p2 = particles[j]
          const dx = p1.x - p2.x
          const dy = p1.y - p2.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 140) {
            ctx.beginPath()
            ctx.moveTo(p1.x, p1.y)
            ctx.lineTo(p2.x, p2.y)
            ctx.strokeStyle = 'rgba(45, 212, 191, ' + (0.07 * (1 - dist / 140)) + ')'
            ctx.lineWidth = 0.5
            ctx.stroke()
          }
        }
      }
    }

    function updateParticle (p) {
      p.x += p.vx
      p.y += p.vy
      if (p.x < 0 || p.x > canvas.width) p.vx *= -1
      if (p.y < 0 || p.y > canvas.height) p.vy *= -1
    }

    function animateCanvas () {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      drawConnections()
      particles.forEach(function (p) {
        updateParticle(p)
        drawParticle(p)
      })
      animFrame = requestAnimationFrame(animateCanvas)
    }

    function initCanvas () {
      resizeCanvas()
      particles = []
      const count = Math.min(60, Math.floor((canvas.width * canvas.height) / 12000))
      for (let i = 0; i < count; i++) particles.push(createParticle())
    }

    window.addEventListener('resize', initCanvas)
    initCanvas()
    animateCanvas()
  }

  // ── Smooth scroll for anchor links ─────────────────────
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      const target = document.querySelector(this.getAttribute('href'))
      if (target) {
        e.preventDefault()
        target.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    })
  })

  // ── Active nav highlighting ────────────────────────────
  const sectionIds = ['hero', 'about', 'architecture', 'assessment', 'repos', 'tooling', 'community']
  const navLinksAll = document.querySelectorAll('.nav-links a[href^="#"]')
  if ('IntersectionObserver' in window) {
    const sectionObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute('id')
          navLinksAll.forEach(function (link) {
            link.classList.remove('active')
            if (link.getAttribute('href') === '#' + id) {
              link.classList.add('active')
            }
          })
        }
      })
    }, { rootMargin: '-40% 0px -50% 0px' })

    sectionIds.forEach(function (id) {
      const section = document.getElementById(id)
      if (section) sectionObserver.observe(section)
    })
  }

})()