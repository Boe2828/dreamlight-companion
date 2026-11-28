// Navigation partagée des pages de l’encyclopédie.
(() => {
  const backLink = document.querySelector('.page-back');
  if (!backLink) return;

  let touchStart = null;
  let characterDetailAtStart = false;

  document.addEventListener('pointerdown', event => {
    if (event.pointerType !== 'touch' || event.clientX > 40) {
      touchStart = null;
      return;
    }

    if (event.target.closest('input, textarea, select, button, a, [contenteditable="true"]')) {
      touchStart = null;
      return;
    }

    touchStart = { x: event.clientX, y: event.clientY };
    characterDetailAtStart = Boolean(document.getElementById('character-back'));
  }, { passive: true });

  document.addEventListener('pointerup', event => {
    if (!touchStart || event.pointerType !== 'touch') return;

    const dx = event.clientX - touchStart.x;
    const dy = event.clientY - touchStart.y;
    touchStart = null;

    if (dx < 85 || Math.abs(dx) < Math.abs(dy) * 1.4) return;

    // app.js gère déjà le retour fiche → liste des personnages.
    if (characterDetailAtStart) return;

    const characterBack = document.getElementById('character-back');
    if (characterBack) {
      characterBack.click();
      return;
    }

    window.location.href = backLink.href;
  }, { passive: true });
})();
