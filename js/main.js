/* TechNeHub Labs — GitHub Pages JavaScript */

(function () {
  'use strict'

  // ── Navbar scroll effect ──────────────────────────────
  var navbar = document.getElementById('navbar')
  window.addEventListener('scroll', function () {
    if (window.scrollY > 80) {
      navbar.style.background = 'rgba(13, 17, 23, 0.95)'
      navbar.style.boxShadow = '0 1px 0 rgba(45, 212, 191, 0.1)'
    } else {
      navbar.style.background = 'rgba(13, 17, 23, 0.85)'
      navbar.style.boxShadow = 'none'
    }
  }, { passive: true })

  // ── Mobile nav toggle ─────────────────────────────────
  var toggle = document.getElementById('navToggle')
  var links = document.getElementById('navLinks')
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

  // ── Intersection Observer for fade-in animations ──────
  var fadeObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible')
        fadeObserver.unobserve(entry.target)
      }
    })
  }, { rootMargin: '0px 0px -60px 0px', threshold: 0.1 })

  document.querySelectorAll('.about-card, .layer, .repo-card, .tool-card, .stakeholder-card, .community-card, .mm-table').forEach(function (el) {
    el.style.opacity = '0'
    el.style.transform = 'translateY(20px)'
    el.style.transition = 'opacity 0.5s ease, transform 0.5s ease'
    fadeObserver.observe(el)
  })

  var fadeStyle = document.createElement('style')
  fadeStyle.textContent = '.visible { opacity: 1 !important; transform: translateY(0) !important; }'
  document.head.appendChild(fadeStyle)

  // ── Parallax card reveal ───────────────────────────
  var parallaxCards = document.querySelectorAll('.parallax-card')
  var revealObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view')
        entry.target.classList.remove('reveal-up')
        revealObserver.unobserve(entry.target)
      }
    })
  }, { rootMargin: '0px 0px -80px 0px', threshold: 0.05 })

  parallaxCards.forEach(function (card) {
    card.classList.add('reveal-up')
    revealObserver.observe(card)
  })

  // ── Hero canvas particle animation ─────────────────────
  var canvas = document.getElementById('hero-canvas')
  if (canvas) {
    var ctx = canvas.getContext('2d')
    var particles = []

    function resizeCanvas () {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    function createParticle () {
      return {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        size: Math.random() * 1.5 + 0.5,
        opacity: Math.random() * 0.4 + 0.1
      }
    }

    function drawParticle (p) {
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(45, 212, 191, ' + p.opacity + ')'
      ctx.fill()
    }

    function drawConnections () {
      for (var i = 0; i < particles.length; i++) {
        for (var j = i + 1; j < particles.length; j++) {
          var p1 = particles[i]
          var p2 = particles[j]
          var dx = p1.x - p2.x
          var dy = p1.y - p2.y
          var dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 140) {
            ctx.beginPath()
            ctx.moveTo(p1.x, p1.y)
            ctx.lineTo(p2.x, p2.y)
            ctx.strokeStyle = 'rgba(45, 212, 191, ' + (0.08 * (1 - dist / 140)) + ')'
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
      requestAnimationFrame(animateCanvas)
    }

    function initCanvas () {
      resizeCanvas()
      particles = []
      var count = Math.min(60, Math.floor((canvas.width * canvas.height) / 12000))
      for (var i = 0; i < count; i++) {
        particles.push(createParticle())
      }
    }

    window.addEventListener('resize', initCanvas)
    initCanvas()
    animateCanvas()
  }

  // ── Smooth scroll for anchor links ─────────────────────
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      var target = document.querySelector(this.getAttribute('href'))
      if (target) {
        e.preventDefault()
        target.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    })
  })

  // ── Active nav highlighting ────────────────────────────
  var sectionObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        var id = entry.target.getAttribute('id')
        document.querySelectorAll('.nav-links a').forEach(function (link) {
          link.style.color = ''
          if (link.getAttribute('href') === '#' + id) {
            link.style.color = 'var(--accent)'
          }
        })
      }
    })
  }, { rootMargin: '-50% 0px -50% 0px' })

  document.querySelectorAll('section[id]').forEach(function (section) {
    sectionObserver.observe(section)
  })

  // ── ModAS Floating Card toggle ──────────────────────
  var modasFloat = document.getElementById('modasFloat')
  var modasFloatHeader = document.getElementById('modasFloatHeader')

  if (modasFloat && modasFloatHeader) {
    function toggleModas (expanded) {
      var isExpanded = expanded !== undefined ? expanded : !modasFloat.classList.contains('expanded')
      modasFloat.classList.toggle('expanded', isExpanded)
      modasFloatHeader.setAttribute('aria-expanded', String(isExpanded))
    }

    modasFloatHeader.addEventListener('click', function () {
      toggleModas()
    })

    modasFloatHeader.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        toggleModas()
      }
    })

    // Close on outside click
    document.addEventListener('click', function (e) {
      if (!modasFloat.contains(e.target)) {
        toggleModas(false)
      }
    })
  }

})()
