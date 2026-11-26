  // ---------------- Rejoindre ----------------
  function vJoin() {
    $('#barTitle').textContent = 'Rejoindre';
    return `<section class="card"><h2>Code de la partie</h2>
      <p class="note">Le responsable voit le code en haut de sa carte (4 lettres).</p>
      <input id="code" type="text" autocapitalize="characters" maxlength="8" placeholder="ABCD" style="font-family:var(--display);font-size:28px;letter-spacing:.2em;text-transform:uppercase">
      <button class="btn" id="joinBtn" type="button">Ouvrir la partie</button>
      ${Store.mode === 'local' ? '<div class="warn">En mode local, seules les parties créées sur ce téléphone sont accessibles.</div>' : ''}</section>`;
  }
