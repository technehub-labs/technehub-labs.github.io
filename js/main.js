/* TechNeHub Labs — GitHub Pages JavaScript */

(function () {
  'use strict'

  // ── Navbar scroll effect ──────────────────────────────
  const navbar = document.getElementById('navbar')
  let lastScroll = 0

  window.addEventListener('scroll', function () {
    const current = window.scrollY
    if (current > 80) {
      navbar.style.background = 'rgba(13, 17, 23, 0.95)'
      navbar.style.boxShadow = '0 1px 0 rgba(45, 212, 191, 0.1)'
    } else {
      navbar.style.background = 'rgba(13, 17, 23, 0.85)'
      navbar.style.boxShadow = 'none'
    }
    lastScroll = current
  }, { passive: true })

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

  // ── Intersection Observer for fade-in animations ──────
  const observerOptions = {
    root: null,
    rootMargin: '0px 0px -60px 0px',
    threshold: 0.1
  }

  const fadeObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible')
        fadeObserver.unobserve(entry.target)
      }
    })
  }, observerOptions)

  document.querySelectorAll('.about-card, .layer, .repo-card, .tool-card, .stakeholder-card, .community-card, .mm-table').forEach(function (el) {
    el.style.opacity = '0'
    el.style.transform = 'translateY(20px)'
    el.style.transition = 'opacity 0.5s ease, transform 0.5s ease'
    fadeObserver.observe(el)
  })

  var style = document.createElement('style')
  style.textContent = '.visible { opacity: 1 !important; transform: translateY(0) !important; }'
  document.head.appendChild(style)

  // ── Hero canvas particle animation ─────────────────────
  var canvas = document.getElementById('hero-canvas')
  if (canvas) {
    var ctx = canvas.getContext('2d')
    var particles = []
    var animFrame = null

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
      animFrame = requestAnimationFrame(animateCanvas)
    }

    function initCanvas () {
      resizeCanvas()
      particles = []
      var count = Math.min(60, Math.floor((canvas.width * canvas.height) / 12000))
      for (var i = 0; i < count; i++) {
        particles.push(createParticle())
      }
    }

    window.addEventListener('resize', function () {
      initCanvas()
    })

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

  // ── Parallax scroll effects ───────────────────────────
  var parallaxBgs = document.querySelectorAll('.parallax-bg')
  var parallaxCards = document.querySelectorAll('.parallax-card')

  var parallaxWindow = {
    lastScroll: 0,
    ticking: false
  }

  function updateParallax () {
    var scrollY = window.scrollY
    var winH = window.innerHeight

    parallaxBgs.forEach(function (bg) {
      var rect = bg.parentElement.getBoundingClientRect()
      var visible = rect.top < winH && rect.bottom > 0
      if (!visible) return
      var offset = (rect.top / winH) * 40
      bg.style.transform = 'translateY(' + offset + 'px)'
    })

    parallaxCards.forEach(function (card) {
      var rect = card.getBoundingClientRect()
      var visible = rect.top < winH && rect.bottom > 0
      if (!visible) return
      if (card.classList.contains('in-view')) return
      var midpoint = rect.top + rect.height / 2
      if (midpoint < winH * 0.7) {
        card.classList.add('in-view')
        card.classList.remove('offset-up', 'offset-down')
      }
    })

    parallaxWindow.ticking = false
  }

  window.addEventListener('scroll', function () {
    if (!parallaxWindow.ticking) {
      requestAnimationFrame(updateParallax)
      parallaxWindow.ticking = true
    }
  }, { passive: true })

  // Initialise parallax card states
  parallaxCards.forEach(function (card) {
    card.classList.add('offset-up')
  })

  // ── ModAS sidebar expand on click ─────────────────────
  var modasSidebar = document.getElementById('modasSidebar')
  var modasLabel = document.querySelector('.modas-sidebar-label')

  if (modasSidebar && modasLabel) {
    modasLabel.addEventListener('click', function () {
      modasSidebar.classList.toggle('expanded')
    })
    modasSidebar.addEventListener('mouseenter', function () {
      modasSidebar.classList.add('expanded')
    })
    modasSidebar.addEventListener('mouseleave', function () {
      modasSidebar.classList.remove('expanded')
    })
  }

  // ── ModAS orbit auto-play on scroll ─────────────────
  var modasCenter = document.querySelector('.modas-center')
  var modasSatellites = document.querySelectorAll('.modas-satellite')

  function playModasAnimation () {
    if (!modasCenter) return
    modasSatellites.forEach(function (sat, i) {
      sat.style.animation = 'none'
      sat.offsetHeight
      sat.style.animation = 'satIn 0.5s ease forwards ' + (i * 0.15) + 's'
    })
  }

  var modasObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        playModasAnimation()
        modasObserver.unobserve(entry.target)
      }
    })
  }, { threshold: 0.3 })

  var modasSection = document.getElementById('about')
  if (modasSection) {
    modasObserver.observe(modasSection)
  }

  // Inject satellite animation keyframes
  var satStyle = document.createElement('style')
  satStyle.textContent = [
    '@keyframes satIn {',
    '  from { opacity: 0; transform: translateX(20px); }',
    '  to   { opacity: 1; transform: translateX(0); }',
    '}'
  ].join('\n')
  document.head.appendChild(satStyle)

})()
