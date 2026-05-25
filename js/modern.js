/**
 * modern.js — Scroll reveal + header scroll state
 * No content changes — purely cosmetic enhancements
 */
(function () {
  'use strict';

  /* ── 1. Header shadow on scroll ── */
  var header = document.querySelector('.site-header');
  if (header) {
    function onScroll() {
      header.classList.toggle('is-scrolled', window.scrollY > 24);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll(); // run once on load
  }

  /* ── 2. Scroll-reveal via IntersectionObserver ── */
  if (!('IntersectionObserver' in window)) return; // graceful fallback

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  /* Elements to fade-up individually */
  var revealSelectors = [
    '.hero-text',
    '.hero-media',
    '.pull-quote blockquote',
    '.story-inner',
    '.section-title',
    '.section-sub',
    '.faq-inner',
    '.factory-card',
    '.payment-section .section-title',
  ];

  revealSelectors.forEach(function (sel) {
    document.querySelectorAll(sel).forEach(function (el) {
      el.classList.add('reveal');
      observer.observe(el);
    });
  });

  /* Elements whose children stagger in */
  var staggerSelectors = [
    '.trust-strip ul',
    '.why-grid',
    '.process-grid',
  ];

  staggerSelectors.forEach(function (sel) {
    document.querySelectorAll(sel).forEach(function (el) {
      el.classList.add('reveal-stagger');
      observer.observe(el);
    });
  });

  /* ── 3. Ornament pulse class ── */
  document.querySelectorAll('.pull-quote').forEach(function (el) {
    /* wrap the ✦ ornament so we can animate it */
    var html = el.innerHTML;
    el.innerHTML = html.replace(/✦/g, '<span class="ornament" aria-hidden="true">✦</span>');
  });

}());
