/* ---------------------------------------------------------------------
   Loads every photo on this page from the buannel-photos GitHub repo.
   Nothing here is hardcoded to a specific image — upload a file with
   the right name (see the folder structure in the setup guide) and it
   appears. Nothing uploaded yet -> the page falls back cleanly.

   SETUP: replace this line with your real GitHub username.
--------------------------------------------------------------------- */
const GH_USER = 'buannelhostel';
const GH_REPO = 'buannelhostel';
const RAW_BASE = 'https://raw.githubusercontent.com/' + GH_USER + '/' + GH_REPO + '/main/';
const API_BASE = 'https://api.github.com/repos/' + GH_USER + '/' + GH_REPO + '/contents/';
const EXTS = ['jpg', 'jpeg', 'png', 'webp'];
const IMG_EXT_RE = /\.(jpe?g|png|webp|gif)$/i;

function isConfigured() { return GH_USER && GH_USER !== 'YOUR-GITHUB-USERNAME'; }

function humanize(filename) {
  return filename.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim()
    .replace(/\w\S*/g, function (w) { return w.charAt(0).toUpperCase() + w.slice(1); });
}

/* Try each extension in turn for a fixed-name photo (e.g. "profiles/warden").
   Calls onFound(url) if any extension exists, onMissing() if none do. */
function loadFixedPhoto(path, onFound, onMissing) {
  if (!isConfigured()) { onMissing(); return; }
  var i = 0;
  function tryNext() {
    if (i >= EXTS.length) { onMissing(); return; }
    var url = RAW_BASE + path + '.' + EXTS[i];
    var probe = new Image();
    probe.onload = function () { onFound(url); };
    probe.onerror = function () { i++; tryNext(); };
    probe.src = url;
  }
  tryNext();
}

/* Sets an <img>'s src to a fixed-name photo if it exists; otherwise
   leaves the element's existing fallback content/state alone. */
function wireFixedImage(imgEl, path) {
  if (!imgEl) return;
  loadFixedPhoto(path, function (url) {
    imgEl.src = url;
    imgEl.classList.add('is-loaded');
  }, function () { /* leave placeholder as-is */ });
}

/* Sets an element's CSS background-image to a fixed-name photo if found. */
function wireFixedBackground(el, path) {
  if (!el) return;
  loadFixedPhoto(path, function (url) {
    el.style.backgroundImage = 'linear-gradient(180deg, rgba(16,27,51,.15), rgba(16,27,51,.55)), url(' + url + ')';
    el.classList.add('has-photo');
  }, function () { /* keep the plain colour hero */ });
}

/* Loads a whole folder (residents, activities) via the GitHub contents API
   and calls render(files) with the image files found, or render([]) if
   the folder is empty/missing/unreachable. */
function loadFolder(path, render) {
  if (!isConfigured()) { render([], 'unconfigured'); return; }
  fetch(API_BASE + path)
    .then(function (res) {
      if (!res.ok) throw new Error('status ' + res.status);
      return res.json();
    })
    .then(function (files) {
      var images = files.filter(function (f) { return f.type === 'file' && IMG_EXT_RE.test(f.name); });
      images.sort(function (a, b) { return a.name.localeCompare(b.name); });
      render(images, images.length ? 'ok' : 'empty');
    })
    .catch(function () { render([], 'error'); });
}

document.addEventListener('DOMContentLoaded', function () {

  /* ---- Fixed single photos ---- */
  wireFixedBackground(document.getElementById('hero'), 'site/cover');
  wireFixedImage(document.getElementById('mzu-logo'), 'site/logo');
  wireFixedImage(document.getElementById('warden-photo'), 'profiles/warden');
  wireFixedImage(document.getElementById('photo-prefect'), 'profiles/prefect');
  wireFixedImage(document.getElementById('photo-asst-prefect'), 'profiles/assistant-prefect');
  wireFixedImage(document.getElementById('photo-mess-sec'), 'profiles/mess-secretary');
  wireFixedImage(document.getElementById('photo-asst-mess-sec'), 'profiles/assistant-mess-secretary');

  /* ---- Residents: dynamic folder, name comes from filename ---- */
  var residentsGrid = document.getElementById('residents-grid');
  var residentsNote = document.getElementById('residents-note');
  if (residentsGrid) {
    loadFolder('profiles/residents', function (images, state) {
      if (state === 'ok') {
        residentsGrid.innerHTML = '';
        images.forEach(function (f) {
          var card = document.createElement('figure');
          card.className = 'person-card';
          card.innerHTML = '<div class="photo-wrap"><img alt="' + humanize(f.name) + '" loading="lazy"></div>' +
                            '<figcaption>' + humanize(f.name) + '</figcaption>';
          var img = card.querySelector('img');
          img.addEventListener('load', function () { img.classList.add('is-loaded'); });
          img.src = f.download_url;
          residentsGrid.appendChild(card);
        });
        if (residentsNote) residentsNote.textContent = images.length + ' resident' + (images.length === 1 ? '' : 's') + ' shown, loaded automatically.';
      } else {
        if (residentsNote) {
          residentsNote.textContent = state === 'unconfigured'
            ? 'Not yet connected — set GH_USER in site_photos.js.'
            : 'No resident photos uploaded yet. Add them to profiles/residents in the buannel-photos repo — the filename becomes the name shown (e.g. lalrinliana-sailo.jpg → "Lalrinliana Sailo").';
        }
      }
    });
  }

  /* ---- Activities: dynamic folder, plain gallery ---- */
  var activitiesGrid = document.getElementById('activities-grid');
  var activitiesNote = document.getElementById('activities-note');
  if (activitiesGrid) {
    loadFolder('activities', function (images, state) {
      if (state === 'ok') {
        activitiesGrid.innerHTML = '';
        images.forEach(function (f) {
          var fig = document.createElement('figure');
          fig.className = 'gallery-photo';
          fig.innerHTML = '<img src="' + f.download_url + '" alt="' + humanize(f.name) + '" loading="lazy">';
          activitiesGrid.appendChild(fig);
        });
        if (activitiesNote) activitiesNote.textContent = images.length + ' photo' + (images.length === 1 ? '' : 's') + ', loaded automatically from the activities folder.';
      } else {
        if (activitiesNote) {
          activitiesNote.textContent = state === 'unconfigured'
            ? 'Not yet connected — set GH_USER in site_photos.js.'
            : 'No activity photos uploaded yet — add them to the activities folder in the buannel-photos repo (cricket, badminton, joint hostel sports, and so on).';
        }
      }
    });
  }

});
