/* Prime Safety — Google Places Autocomplete integration.
 * Uses Places API (New) / Maps JavaScript API dynamic library import.
 * The existing #site input remains the source-of-truth for the quote form.
 */
(function () {
  'use strict';

  const input = document.getElementById('site');
  if (!input) return;

  const GOOGLE_KEY = window.PRIME_SAFETY_GOOGLE_MAPS_KEY || '';
  const PLACEHOLDER_KEYS = new Set(['', 'YOUR_GOOGLE_MAPS_API_KEY', 'REPLACE_WITH_YOUR_GOOGLE_MAPS_BROWSER_KEY']);

  const wrapper = input.closest('.address-field-wrap') || input.parentElement;
  if (!wrapper) return;
  wrapper.classList.add('has-place-autocomplete');

  const list = document.createElement('div');
  list.id = 'siteAddressPredictions';
  list.className = 'address-predictions';
  list.setAttribute('role', 'listbox');
  list.hidden = true;
  wrapper.appendChild(list);

  let apiPromise = null;
  let token = null;
  let placesLib = null;
  let requestId = 0;
  let highlighted = -1;

  function hideSuggestions() {
    list.hidden = true;
    list.replaceChildren();
    highlighted = -1;
  }

  function loadMapsApi() {
    if (apiPromise) return apiPromise;
    if (PLACEHOLDER_KEYS.has(GOOGLE_KEY)) return Promise.reject(new Error('Google Maps browser key is not configured.'));

    apiPromise = new Promise((resolve, reject) => {
      const finish = () => resolve(window.google.maps);
      if (window.google && window.google.maps && window.google.maps.importLibrary) {
        finish();
        return;
      }

      // Google-recommended dynamic library bootstrap pattern.
      ((g) => {
        const h = g.maps || (g.maps = {}),
          b = 'google',
          l = 'importLibrary',
          p = 'The Google Maps JavaScript API',
          q = '__ib__',
          m = document,
          r = new Set(),
          e = new URLSearchParams(),
          u = () => h[q] || (h[q] = new Promise(async (resolveScript, rejectScript) => {
            const script = m.createElement('script');
            e.set('libraries', [...r] + '');
            for (const k in g) e.set(k.replace(/[A-Z]/g, t => '_' + t[0].toLowerCase()), g[k]);
            e.set('callback', b + '.maps.' + q);
            script.src = `https://maps.${b}apis.com/maps/api/js?` + e;
            script.async = true;
            script.onerror = () => rejectScript(new Error(p + ' could not load.'));
            m.head.appendChild(script);
          }));
        if (h[l]) {
          console.warn(p + ' only loads once. Ignoring:', g);
        } else {
          h[l] = (f, ...n) => r.add(f) && u().then(() => h[l](f, ...n));
        }
      })({ key: GOOGLE_KEY, v: 'weekly' });

      const wait = () => {
        if (window.google?.maps?.importLibrary) finish();
        else setTimeout(wait, 30);
      };
      wait();

      setTimeout(() => {
        if (!window.google?.maps?.importLibrary) reject(new Error('Google Maps API timed out.'));
      }, 15000);
    });

    return apiPromise;
  }

  async function ensurePlaces() {
    await loadMapsApi();
    if (!placesLib) placesLib = await google.maps.importLibrary('places');
    return placesLib;
  }

  function startSession() {
    if (!token && placesLib?.AutocompleteSessionToken) token = new placesLib.AutocompleteSessionToken();
  }

  function renderSuggestions(suggestions) {
    list.replaceChildren();
    highlighted = -1;
    if (!suggestions.length) {
      hideSuggestions();
      return;
    }

    suggestions.forEach((suggestion, index) => {
      const prediction = suggestion.placePrediction;
      if (!prediction) return;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'address-prediction';
      button.setAttribute('role', 'option');
      button.dataset.index = String(index);

      const main = document.createElement('strong');
      main.textContent = prediction.mainText?.text || prediction.text?.toString() || '';
      const secondary = document.createElement('span');
      secondary.textContent = prediction.secondaryText?.text || '';
      button.append(main, secondary);

      button.addEventListener('click', async () => {
        input.value = prediction.text?.toString() || '';
        input.dataset.placeSelected = 'true';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        hideSuggestions();
        try {
          const place = prediction.toPlace();
          await place.fetchFields({ fields: ['formattedAddress', 'location'] });
          if (place.formattedAddress) input.value = place.formattedAddress;
          input.dispatchEvent(new Event('change', { bubbles: true }));
        } catch (_) {
          // Keep the selected prediction as the fallback value; the quote form still works.
        }
        token = null;
      });
      list.appendChild(button);
    });

    const attribution = document.createElement('div');
    attribution.className = 'address-google-attribution';
    attribution.textContent = 'Powered by Google';
    list.appendChild(attribution);
    list.hidden = false;
  }

  async function queryPlaces() {
    const value = input.value.trim();
    input.dataset.placeSelected = 'false';
    const id = ++requestId;
    if (value.length < 3) {
      hideSuggestions();
      return;
    }

    try {
      await ensurePlaces();
      if (id !== requestId) return;
      startSession();
      const request = {
        input: value,
        language: 'en-AU',
        region: 'au',
        includedRegionCodes: ['au'],
        locationBias: { lat: -31.9523, lng: 115.8613, radius: 75000 },
        sessionToken: token
      };
      const { suggestions } = await placesLib.AutocompleteSuggestion.fetchAutocompleteSuggestions(request);
      if (id !== requestId) return;
      renderSuggestions(suggestions || []);
    } catch (error) {
      // Configuration/network failures degrade gracefully to normal text entry.
      hideSuggestions();
      console.warn('Prime Safety address autocomplete unavailable:', error.message);
    }
  }

  input.addEventListener('input', () => {
    window.clearTimeout(input.__primeAddressTimer);
    input.__primeAddressTimer = window.setTimeout(queryPlaces, 180);
  });

  input.addEventListener('focus', () => {
    if (input.value.trim().length >= 3) queryPlaces();
  });

  input.addEventListener('keydown', (event) => {
    if (list.hidden) return;
    const options = [...list.querySelectorAll('.address-prediction')];
    if (!options.length) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      highlighted = Math.min(highlighted + 1, options.length - 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      highlighted = Math.max(highlighted - 1, 0);
    } else if (event.key === 'Escape') {
      hideSuggestions();
      return;
    } else if (event.key === 'Enter' && highlighted >= 0) {
      event.preventDefault();
      options[highlighted].click();
      return;
    } else {
      return;
    }
    options.forEach((option, index) => option.classList.toggle('is-highlighted', index === highlighted));
  });

  document.addEventListener('click', (event) => {
    if (!wrapper.contains(event.target)) hideSuggestions();
  });
})();
