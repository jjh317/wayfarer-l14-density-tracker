// ==UserScript==
// @name         WFMM L14 Cell Status
// @namespace    https://local.wfmm.plugins/jjh
// @version      1.2.12
// @description  Mark the remaining Pokestop candidates by S2 L14 cell.
// @author       Personal WFMM Addon
// @match        https://wayfarer.scopely.com/*
// @run-at       document-start
// @inject-into  page
// @grant        none
// @updateURL    https://raw.githubusercontent.com/jjh317/wayfarer-l14-density-tracker/main/wfmm-l14-cell-status.user.js
// @downloadURL  https://raw.githubusercontent.com/jjh317/wayfarer-l14-density-tracker/main/wfmm-l14-cell-status.user.js
// ==/UserScript==

(() => {
  'use strict';

  // 이 플러그인은 Wayfarer Map Mods(WFMM) 외부 플러그인 API v1을 사용합니다.
  // Wayfarer 서버에 데이터를 전송하지 않으며, 본인 브라우저의 WFMM 저장소만 변경합니다.
  const PLUGIN_ID = 'jjh.l14-cell-status';
  const API_VERSION = 1;
  const STORE = 'jjhL14CellStatuses';
  const LEVEL = 14;
  const MIN_ZOOM = 9;
  const MIN_BAR_WIDTH = 128; // compact at rest; grows when counts gain digits
  const BAR_GAP = 16;
  const COLORS = Object.freeze({
    red: { label: 'None', hex: '#EF4444', indicator: '#d93025' },
    blue: { label: 'Little', hex: '#3B82F6', indicator: '#1a73e8' },
    green: { label: 'Plenty', hex: '#22C55E', indicator: '#1e8e3e' },
  });

  const PLUGIN_METADATA = Object.freeze({
    name: 'L14 Cell Status',
    description: 'Track candidate availability in S2 L14 cells.',
    author: 'Personal WFMM Addon',
    version: '1.2.12',
    namespace: 'https://local.wfmm.plugins/jjh',
  });

  const pluginDefinition = {
    id: PLUGIN_ID,
    source: 'external',
    requirement: 'optional',
    apiVersion: API_VERSION,
    metadata: PLUGIN_METADATA,
    backup: {
      id: 'jjh-l14-cell-status-records',
      label: 'L14 셀 후보 상태',
      description: '각 S2 L14 셀의 빨강/파랑/초록 상태 기록',
      storeName: STORE,
      keyPath: 'id',
      schemaVersion: 1,
      describe(records) {
        const n = records.length;
        return { hasData: n > 0, text: `${n}개 셀에 상태 지정` };
      },
    },

    create(WFMM) {
      const lifecycle = WFMM.plugins.createLifecycle(PLUGIN_ID);
      const statuses = new Map();
      let loaded = false;
      let saving = false;
      let editing = false;
      let brush = 'red';
      let currentMap = null;
      let mapScope = null;
      let toolbar = null;
      let buttons = {};
      let statusMessage = '';
      // Track the native map-type menu to avoid covering it or painting cells behind it.
      let mapTypeMenuOpen = false;
      const polygons = new Map();

      function clearPolygons() {
        for (const polygon of polygons.values()) polygon.setMap(null);
        polygons.clear();
      }

      function detachMap() {
        mapScope?.dispose();
        mapScope = null;
        clearPolygons();
        currentMap = null;
        toolbar?.remove();
        toolbar = null;
        buttons = {};
        editing = false;
        mapTypeMenuOpen = false;
      }

      function make(tag, options = {}) {
        const node = document.createElement(tag);
        if (options.className) node.className = options.className;
        if (options.text !== undefined) node.textContent = options.text;
        if (options.title) node.title = options.title;
        if (options.type) node.type = options.type;
        return node;
      }

      // Satellite/지도 유형 버튼의 실제 화면 좌표를 기준으로 위치를 맞춘다.
      // 고정 top/left 값으로 놓으면 브라우저 확대나 WFMM 레이아웃 변경 시 겹치게 된다.
      function findMapTypeControl() {
        const possible = [];
        const mapControls = document.querySelectorAll('.gm-style-mtc');
        for (const control of mapControls) {
          const button = control.querySelector('button, [role="button"]') || control;
          possible.push(button);
        }

        // 일부 Google Maps 빌드에서는 gm-style-mtc 대신 일반 버튼으로 노출된다.
        if (!possible.length) {
          const mapRoot = document.querySelector('.gm-style');
          if (mapRoot) {
            for (const el of mapRoot.querySelectorAll('button, [role="button"]')) {
              const label = (el.innerText || el.textContent || el.getAttribute('aria-label') || '').trim();
              if (/^(Satellite|Map|Terrain|Hybrid|Bing|Esri(?:\s+Clarity)?|OSM|위성|지도)(\s*[▼▾▿])?$/i.test(label)) {
                possible.push(el);
              }
            }
          }
        }

        const matches = [];
        for (const node of possible) {
          if (toolbar?.contains(node)) continue;
          const rect = node.getBoundingClientRect();
          if (rect.width < 60 || rect.height < 26 || rect.width > 320) continue;
          if (rect.left < 0 || rect.top < 0 || rect.top > window.innerHeight * 0.4) continue;
          if (rect.left > window.innerWidth * 0.5) continue;
          const label = (node.innerText || node.textContent || node.getAttribute('aria-label') || '').trim();
          const satellite = /Satellite|위성/i.test(label);
          matches.push({ rect, node, satellite });
        }
        // 'Satellite'가 표시돼 있으면 그것을 우선 사용한다.
        matches.sort((a, b) => Number(b.satellite) - Number(a.satellite)
          || a.rect.top - b.rect.top || a.rect.left - b.rect.left);
        return matches[0] || null;
      }

      // Google Maps builds differ: some expose aria-expanded and some insert
      // the list under .gm-style-mtc without an expanded attribute.
      // Return null when the state is not knowable from the current DOM.
      function readMapTypeMenuState(button) {
        if (!button) return null;
        const expanded = button.getAttribute?.('aria-expanded');
        if (expanded === 'true') return true;
        if (expanded === 'false') return false;

        const host = button.closest?.('.gm-style-mtc');
        if (!host) return null;
        const anchor = button.getBoundingClientRect();
        for (const item of host.querySelectorAll('div, ul, [role="menu"], [role="listbox"]')) {
          if (item.contains(button)) continue;
          const r = item.getBoundingClientRect();
          // Map type popup begins just below the control and is much taller.
          if (r.width < 90 || r.height < 70 || r.top > anchor.bottom + 35 ||
              r.bottom < anchor.bottom + 30 || r.right < anchor.left - 25 ||
              r.left > anchor.right + 40) continue;
          if (typeof item.checkVisibility === 'function' &&
              !item.checkVisibility({ checkVisibilityCSS: true, checkOpacity: true })) continue;
          if (window.getComputedStyle(item).visibility === 'hidden') continue;
          return true;
        }
        return null;
      }

      // The native type menu can be wider than its trigger (notably for Bing/Map).
      // When open, use the popup's right edge so the status bar never blocks choices.
      function findMapTypePopupRect(button) {
        const host = button?.closest?.('.gm-style-mtc');
        if (!host) return null;
        const anchor = button.getBoundingClientRect();
        const candidates = [];
        for (const item of host.querySelectorAll('div, ul, [role="menu"], [role="listbox"]')) {
          if (item.contains(button)) continue;
          const r = item.getBoundingClientRect();
          if (r.width < 90 || r.height < 70 || r.top > anchor.bottom + 35 ||
              r.bottom < anchor.bottom + 30 || r.right < anchor.left - 25 ||
              r.left > anchor.right + 40) continue;
          if (typeof item.checkVisibility === 'function' &&
              !item.checkVisibility({ checkVisibilityCSS: true, checkOpacity: true })) continue;
          if (window.getComputedStyle(item).visibility === 'hidden') continue;
          candidates.push(r);
        }
        // Prefer the whole dropdown over an individual menu row.
        return candidates.sort((a, b) => b.height - a.height)[0] || null;
      }

      // Reuse the native map-style control's visual properties. Some builds
      // put the shadow on its wrapper rather than on the button itself.
      function syncMapControlAppearance(button) {
        if (!toolbar || !button) return;
        const chain = [button, button.parentElement, button.parentElement?.parentElement]
          .filter(Boolean);
        const styles = chain.map(node => window.getComputedStyle(node));
        const solidBackground = style => {
          const value = style.backgroundColor;
          return value && value !== 'transparent' &&
            !/^rgba\([^)]*,\s*0(?:\.0+)?\s*\)$/.test(value);
        };
        const background = styles.find(solidBackground)?.backgroundColor || '#fff';
        const radius = styles.find(style => {
          const value = style.borderTopLeftRadius;
          return value && value !== '0px' && value !== '0';
        })?.borderRadius || '2px';
        const shadow = styles.find(style => style.boxShadow && style.boxShadow !== 'none')
          ?.boxShadow || '0 1px 4px rgba(0,0,0,0.3)';

        toolbar.style.backgroundColor = background;
        toolbar.style.borderRadius = radius;
        toolbar.style.boxShadow = shadow;
        toolbar.style.fontFamily = styles[0].fontFamily || 'Roboto, Arial, sans-serif';
        if (buttons.menu) {
          buttons.menu.style.backgroundColor = background;
          buttons.menu.style.borderRadius = radius;
          buttons.menu.style.boxShadow = shadow;
        }
      }

      function placeToolbar() {
        if (!toolbar) return;
        const control = findMapTypeControl();
        if (!control) {
          toolbar.style.visibility = 'hidden';
          return;
        }

        const { rect, node } = control;
        syncMapControlAppearance(node);
        const observed = readMapTypeMenuState(node);
        if (observed !== null) mapTypeMenuOpen = observed;

        // Follow the selector's position, but allow count content to set the bar width.
        let left = rect.right + BAR_GAP;
        let top = rect.top;
        if (mapTypeMenuOpen) {
          const popup = findMapTypePopupRect(node);
          if (popup) left = Math.max(left, popup.right + BAR_GAP);
        }

        // Small windows: measure the actual bar width, including extra digits.
        const barWidth = Math.max(MIN_BAR_WIDTH, toolbar.getBoundingClientRect().width);
        if (left + barWidth > window.innerWidth - 8) {
          left = Math.max(8, Math.min(rect.left, window.innerWidth - barWidth - 8));
          const popup = mapTypeMenuOpen ? findMapTypePopupRect(node) : null;
          top = (popup?.bottom ?? rect.bottom) + 6;
        }
        // Keep exact (fractional) pixel alignment with the native button.
        toolbar.style.left = `${left}px`;
        toolbar.style.top = `${top}px`;
        toolbar.style.height = `${rect.height}px`;
        toolbar.style.visibility = 'visible';
      }

      function onMapTypeDocumentClick(event) {
        const control = findMapTypeControl();
        if (!control) return;
        const target = event.target;
        const trigger = control.node;
        const isTrigger = target instanceof Node &&
          (target === trigger || trigger.contains(target));
        if (isTrigger) {
          // Recalculate after the native dropdown changes its layout.
          mapTypeMenuOpen = !mapTypeMenuOpen;
          window.requestAnimationFrame(placeToolbar);
        } else if (mapTypeMenuOpen) {
          // Do not clear the flag until the native click has finished: this
          // also prevents an accidental cell paint while dismissing the popup.
          window.requestAnimationFrame(() => {
            const next = readMapTypeMenuState(findMapTypeControl()?.node);
            mapTypeMenuOpen = next === null ? false : next;
            placeToolbar();
          });
        }
      }

      function onMapTypeKeyDown(event) {
        if (event.key !== 'Escape' || !mapTypeMenuOpen) return;
        window.requestAnimationFrame(() => {
          mapTypeMenuOpen = false;
          placeToolbar();
        });
      }

      function updateToolbar() {
        if (!toolbar) return;
        const counts = { red: 0, blue: 0, green: 0 };
        for (const color of statuses.values()) {
          if (Object.prototype.hasOwnProperty.call(counts, color)) counts[color] += 1;
        }
        for (const [color, node] of Object.entries(buttons.counts)) {
          node.textContent = String(counts[color]);
          node.title = `${counts[color]} cells`;
        }
        // Keep gaps fixed; extra digits expand the bar naturally.
        buttons.toggle.setAttribute('aria-expanded', String(editing));
        buttons.toggle.setAttribute('aria-label', editing ? 'Close options' : 'Open options');
        buttons.toggle.title = editing ? 'Close options' : 'Open options';
        buttons.toggle.classList.toggle('jjh-l14-is-editing', editing);
        buttons.toggle.disabled = !loaded || saving;
        buttons.palette.hidden = !editing;
        buttons.menu.hidden = !editing && !statusMessage;
        for (const [name, btn] of Object.entries(buttons.brushes)) {
          btn.classList.toggle('jjh-l14-selected', brush === name);
          btn.setAttribute('aria-pressed', String(brush === name));
          btn.disabled = saving;
        }
        buttons.info.textContent = statusMessage || (
          !loaded ? 'Loading records…' :
          saving ? 'Saving…' :
          editing ? 'Click empty map space to paint' : ''
        );
        buttons.info.hidden = !buttons.info.textContent;
        placeToolbar();
      }

      function render() {
        if (!currentMap || !loaded) return;
        const bounds = currentMap.getBounds?.();
        const zoom = currentMap.getZoom?.();
        if (!bounds || !Number.isFinite(zoom) || zoom < MIN_ZOOM) {
          clearPolygons();
          return;
        }

        const visible = new Set();
        for (const [key, color] of statuses.entries()) {
          if (!COLORS[color]) continue;
          try {
            if (!WFMM.s2.cellIntersectsBounds(key, bounds)) continue;
            visible.add(key);
            if (polygons.has(key)) continue;

            const polygon = new window.google.maps.Polygon({
              paths: WFMM.s2.getCellBoundary(key, { closed: false }),
              map: currentMap,
              clickable: false, // 지도 이동 및 Wayspot 마커 클릭을 방해하지 않음
              draggable: false,
              editable: false,
              fillColor: COLORS[color].hex,
              fillOpacity: 0.24,
              strokeColor: COLORS[color].hex,
              strokeOpacity: 0.62,
              strokeWeight: 1.4,
              zIndex: 1,
            });
            polygons.set(key, polygon);
          } catch (error) {
            console.warn(`[${PLUGIN_ID}] 셀 표시 건너뜀: ${key}`, error);
          }
        }

        for (const [key, polygon] of polygons) {
          if (!visible.has(key)) {
            polygon.setMap(null);
            polygons.delete(key);
          } else {
            polygon.setOptions({
              fillColor: COLORS[statuses.get(key)].hex,
              strokeColor: COLORS[statuses.get(key)].hex,
            });
          }
        }
      }

      async function paintCell(key) {
        if (!loaded || saving || !editing || !currentMap) return;
        const oldStatus = statuses.get(key) || null;
        const newStatus = brush === 'erase' ? null : brush;
        if (oldStatus === newStatus) return;

        saving = true;
        statusMessage = '';
        if (newStatus) statuses.set(key, newStatus);
        else statuses.delete(key);
        render();
        updateToolbar();

        try {
          if (newStatus) {
            await WFMM.storage.put(STORE, {
              id: key,
              status: newStatus,
              updatedAt: new Date().toISOString(),
            });
          } else {
            await WFMM.storage.delete(STORE, key);
          }
        } catch (error) {
          if (oldStatus) statuses.set(key, oldStatus);
          else statuses.delete(key);
          render();
          statusMessage = 'Save failed — change reverted (check console)';
          console.error(`[${PLUGIN_ID}] 셀 저장 실패`, error);
        } finally {
          saving = false;
          if (lifecycle.active) updateToolbar();
        }
      }

      function buildToolbar() {
        const root = make('section', { className: 'jjh-l14-root' });
        root.setAttribute('aria-label', 'S2 레벨 14 셀 후보 상태');

        const top = make('div', { className: 'jjh-l14-top' });

        const count = make('div', { className: 'jjh-l14-count' });
        count.setAttribute('aria-label', 'Cell counts by color');
        const counts = {};
        for (const color of ['red', 'blue', 'green']) {
          const stat = make('span', { className: 'jjh-l14-stat', title: COLORS[color].label });
          const dot = make('span', { className: 'jjh-l14-dot' });
          dot.style.backgroundColor = COLORS[color].indicator;
          dot.setAttribute('aria-hidden', 'true');
          const number = make('span', { className: 'jjh-l14-number', text: '0' });
          stat.append(dot, number);
          count.append(stat);
          counts[color] = number;
        }

        const toggle = make('button', { type: 'button', title: 'Open options' });
        toggle.className = 'jjh-l14-toggle';
        toggle.setAttribute('aria-label', 'Open options');
        toggle.innerHTML = '<span aria-hidden="true">⋮</span>';
        toggle.setAttribute('aria-controls', 'jjh-l14-palette');
        toggle.addEventListener('click', () => {
          if (!loaded || saving) return;
          editing = !editing;
          statusMessage = '';
          updateToolbar();
        });
        top.append(count, toggle);

        const palette = make('div', { className: 'jjh-l14-palette' });
        palette.id = 'jjh-l14-palette';
        const brushes = {};
        const labels = { red: 'None', blue: 'Little', green: 'Plenty', erase: 'Clear' };
        for (const name of ['red', 'blue', 'green', 'erase']) {
          const btn = make('button', {
            type: 'button',
            title: name === 'erase' ? 'Clear cell status' : COLORS[name].label,
          });
          btn.className = 'jjh-l14-brush';
          if (name !== 'erase') {
            const dot = make('span', { className: 'jjh-l14-dot' });
            dot.style.backgroundColor = COLORS[name].indicator;
            dot.setAttribute('aria-hidden', 'true');
            btn.append(dot);
          }
          btn.append(make('span', { text: labels[name] }));
          btn.addEventListener('click', () => {
            if (saving) return;
            brush = name;
            statusMessage = '';
            updateToolbar();
          });
          brushes[name] = btn;
          palette.append(btn);
        }

        const info = make('div', { className: 'jjh-l14-info' });
        info.setAttribute('role', 'status');
        info.setAttribute('aria-live', 'polite');
        const menu = make('div', { className: 'jjh-l14-menu' });
        menu.append(palette, info);
        root.append(top, menu);
        (document.body || document.documentElement).appendChild(root);
        toolbar = root;
        buttons = { toggle, counts, menu, palette, brushes, info };
        updateToolbar();
        placeToolbar();
      }

      function attachMap(map) {
        if (!lifecycle.active || !WFMM.routes.is('mapview')) return;
        if (currentMap === map && toolbar) return;
        detachMap();
        currentMap = map;
        mapScope = lifecycle.child('mapview-l14-status');
        buildToolbar();
        // Keep the native map-type dropdown usable without hiding the counters.
        document.addEventListener('click', onMapTypeDocumentClick, true);
        document.addEventListener('keydown', onMapTypeKeyDown, true);
        mapScope.add(() => document.removeEventListener('click', onMapTypeDocumentClick, true));
        mapScope.add(() => document.removeEventListener('keydown', onMapTypeKeyDown, true));
        // Also track position changes and non-click changes to the native UI.
        const timer = window.setInterval(placeToolbar, 500);
        mapScope.add(() => window.clearInterval(timer));
        window.addEventListener('resize', placeToolbar);
        mapScope.add(() => window.removeEventListener('resize', placeToolbar));
        mapScope.add(map.addListener('idle', () => {
          render();
          placeToolbar();
        }));
        mapScope.add(map.addListener('click', event => {
          if (!editing || saving || !loaded || mapTypeMenuOpen || !event.latLng) return;
          const lat = event.latLng.lat();
          const lng = event.latLng.lng();
          let key;
          try {
            key = WFMM.s2.latLngToKey(lat, lng, LEVEL);
          } catch (error) {
            console.error(`[${PLUGIN_ID}] S2 변환 실패`, error);
            return;
          }
          void paintCell(key);
        }));
        render();
      }

      async function initialize() {
        try {
          await WFMM.storage.ensureStore(STORE, { keyPath: 'id' });
          const saved = await WFMM.storage.getAll(STORE);
          if (!lifecycle.active) return;
          statuses.clear();
          for (const record of saved || []) {
            if (!record || !COLORS[record.status]) continue;
            try {
              if (WFMM.s2.getKeyLevel(record.id) === LEVEL) {
                statuses.set(record.id, record.status);
              }
            } catch (_) { /* 손상된 레코드는 무시 */ }
          }
          loaded = true;
          updateToolbar();
          render();
        } catch (error) {
          statusMessage = 'Storage unavailable — check plugin setup';
          console.error(`[${PLUGIN_ID}] 저장소 초기화 실패`, error);
          updateToolbar();
        }
      }

      return {
        start() {
          const style = make('style');
          style.textContent = `
            /* Match the original Google Maps style selector, not a mobile card. */
            .jjh-l14-root {
              position: fixed;
              left: 0;
              top: 0;
              z-index: 2147480000;
              width: max-content;
              min-width: 128px;
              height: 44px;
              visibility: hidden;
              box-sizing: border-box;
              overflow: visible;
              background: #fff;
              color: #3c4043;
              border: 0;
              border-radius: 2px;
              box-shadow: 0 1px 4px rgba(0,0,0,0.3);
              font: 500 14px/1.25 Roboto, Arial, 'Apple SD Gothic Neo', sans-serif;
            }
            .jjh-l14-root, .jjh-l14-root * { box-sizing: border-box; }
            .jjh-l14-top {
              display: flex;
              align-items: center;
              width: 100%;
              height: 100%;
              padding: 0 7px 0 11px;
              gap: 7px;
            }
            .jjh-l14-count {
              display: flex;
              align-items: center;
              flex: 0 0 auto;
              gap: 7px;
            }
            .jjh-l14-stat {
              display: inline-flex;
              align-items: center;
              justify-content: center;
              flex: 0 0 auto;
              gap: 4px;
              white-space: nowrap;
              font-variant-numeric: tabular-nums;
            }
            .jjh-l14-dot {
              display: inline-block;
              width: 7px;
              height: 7px;
              flex: 0 0 7px;
              border-radius: 50%;
            }
            .jjh-l14-number {
              display: inline-block;
              color: #3c4043;
              font: 500 14px/1.1 Roboto, Arial, sans-serif;
              letter-spacing: 0;
              white-space: nowrap;
            }
            .jjh-l14-root button {
              appearance: none;
              -webkit-appearance: none;
              font-family: inherit;
              cursor: pointer;
              touch-action: manipulation;
            }
            .jjh-l14-toggle {
              display: inline-flex;
              justify-content: center;
              align-items: center;
              flex: 0 0 24px;
              width: 24px;
              margin-left: auto;
              height: 28px;
              padding: 0;
              border: 0;
              border-radius: 2px;
              background: transparent;
              color: #5f6368;
              font-size: 18px;
              font-weight: 400;
              line-height: 1;
            }
            .jjh-l14-toggle span { display:block; line-height:1; transform:translateY(-1px); }
            .jjh-l14-toggle:hover, .jjh-l14-toggle.jjh-l14-is-editing {
              background: rgba(60,64,67,.06);
            }
            .jjh-l14-root button:focus-visible {
              outline: 2px solid #1a73e8;
              outline-offset: 2px;
            }
            .jjh-l14-root button:disabled { opacity: .5; cursor: default; }
            .jjh-l14-menu {
              position: absolute;
              left: 0;
              top: calc(100% + 6px);
              width: 208px;
              max-width: calc(100vw - 20px);
              padding: 9px;
              background: #fff;
              color: #3c4043;
              border: 0;
              border-radius: 2px;
              box-shadow: 0 1px 4px rgba(0,0,0,0.3);
            }
            .jjh-l14-menu[hidden], .jjh-l14-palette[hidden], .jjh-l14-info[hidden] {
              display: none !important;
            }
            .jjh-l14-palette {
              display: grid;
              grid-template-columns: repeat(2,minmax(0,1fr));
              gap: 6px;
            }
            .jjh-l14-brush {
              display: inline-flex;
              align-items: center;
              justify-content: center;
              gap: 6px;
              height: 33px;
              min-width: 0;
              padding: 0 6px;
              border: 1px solid #dadce0;
              border-radius: 2px;
              background: #fff;
              color: #3c4043;
              font-size: 13px;
              font-weight: 500;
              white-space: nowrap;
            }
            .jjh-l14-brush:hover { background: #f8f9fa; }
            .jjh-l14-brush.jjh-l14-selected {
              background: #f1f3f4;
              border-color: #9aa0a6;
            }
            .jjh-l14-info {
              padding: 8px 3px 0;
              color: #5f6368;
              font-size: 12px;
              font-weight: 400;
            }
            @media (max-width: 600px) {
              .jjh-l14-top { padding: 0 8px 0 11px; gap: 6px; }
              .jjh-l14-count { gap: 6px; }
              .jjh-l14-number { font-size: 13px; }
              .jjh-l14-dot { width: 6px; height: 6px; flex-basis: 6px; }
              .jjh-l14-toggle { flex-basis: 22px; width: 22px; }
            }
          `;
          (document.head || document.documentElement).appendChild(style);
          lifecycle.add(() => style.remove());
          lifecycle.add(WFMM.map.onReady(({ map }) => attachMap(map)));
          lifecycle.add(WFMM.map.onCleared(({ map }) => {
            if (map === currentMap) detachMap();
          }));
          lifecycle.add(WFMM.routes.onChange(() => {
            if (!WFMM.routes.is('mapview')) {
              detachMap();
            } else if (WFMM.map.get()) {
              attachMap(WFMM.map.get());
            }
          }));
          lifecycle.add(detachMap);
          void initialize();
        },
        stop() {
          lifecycle.dispose();
        },
      };
    },
  };

  function registerPlugin() {
    const WFMM = window.WFMM;
    if (!WFMM?.plugins) return;
    if (WFMM.pluginApiVersion !== API_VERSION) {
      console.warn(`[${PLUGIN_ID}] WFMM 외부 플러그인 API v1이 필요합니다.`);
      return;
    }
    if (WFMM.plugins.has(PLUGIN_ID)) return;
    try {
      WFMM.plugins.registerExternal(pluginDefinition);
    } catch (error) {
      console.error(`[${PLUGIN_ID}] 등록 실패`, error);
    }
  }

  if (window.WFMM?.plugins) registerPlugin();
  else window.addEventListener('wfmm:api-ready', registerPlugin, { once: true });
})();
