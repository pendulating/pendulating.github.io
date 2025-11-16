/* Lightweight Leaflet map initializer for inline embeds */
(function() {
  var injectedRouteStyle = false;
  var DEFAULT_MARKER_ICON = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png';

  function ensureRouteLabelStyle() {
    if (injectedRouteStyle) return;
    injectedRouteStyle = true;
    var style = document.createElement('style');
    style.type = 'text/css';
    style.textContent = `
.leaflet-route-label{display:flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:50%;background:rgba(15,23,42,0.85);color:#f8fafc;font-size:13px;font-weight:600;border:2px solid rgba(148,163,184,0.6);box-shadow:0 4px 12px rgba(15,23,42,0.25);pointer-events:none;transform:translate(-50%, -50%);}
.leaflet-route-label span{display:block;line-height:1;}
.leaflet-cluster-wrapper{border:none;background:transparent;}
.leaflet-cluster-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:3px;padding:6px;border-radius:18px;min-width:56px;min-height:56px;box-shadow:0 8px 22px rgba(15,23,42,0.35);backdrop-filter:blur(3px);}
.leaflet-cluster-grid img{width:24px;height:24px;object-fit:cover;border-radius:6px;box-shadow:0 2px 6px rgba(15,23,42,0.25);}
.leaflet-cluster-count{display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;color:#f8fafc;background:rgba(15,23,42,0.45);border-radius:6px;padding:2px 4px;}
.leaflet-cluster-popup{min-width:240px;}
.leaflet-cluster-popup h4{margin:0 0 8px;font-size:15px;font-weight:600;color:#0f172a;}
.leaflet-cluster-popup ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px;}
.leaflet-cluster-popup li{display:flex;gap:10px;align-items:flex-start;}
.leaflet-cluster-popup img{width:48px;height:48px;border-radius:8px;object-fit:cover;box-shadow:0 4px 12px rgba(15,23,42,0.25);}
.leaflet-cluster-popup .cluster-item-body{display:flex;flex-direction:column;gap:2px;}
.leaflet-cluster-popup .cluster-item-title{font-weight:600;color:#0f172a;}
.leaflet-cluster-popup .cluster-item-subtitle{font-size:13px;color:#475569;}
.leaflet-cluster-popup .cluster-item-link{margin-top:4px;}
.leaflet-cluster-popup .cluster-item-link a{font-size:13px;color:#0284c7;text-decoration:none;}
.leaflet-cluster-popup .cluster-item-link a:hover{text-decoration:underline;}
`;
    document.head.appendChild(style);
  }

  function escapeHtml(value) {
    if (value === null || value === undefined) return '';
    return String(value).replace(/[&<>"']/g, function(char) {
      switch (char) {
        case '&': return '&amp;';
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '"': return '&quot;';
        case "'": return '&#39;';
        default: return char;
      }
    });
  }

  function safeParse(jsonText) {
    try { return JSON.parse(jsonText); } catch (_) { return {}; }
  }

  function createPopupHtml(marker) {
    var title = marker.title || 'Untitled';
    var subtitle = marker.subtitle || '';
    var link = marker.link || '';
    var cover = marker.iconUrl || '';
    var html = '';
    if (cover) {
      html += '<img src="' + escapeHtml(cover) + '" alt="' + escapeHtml(title) + '" style="width:120px;height:120px;object-fit:cover;border-radius:8px;margin-bottom:8px;"/>';
    }
    html += '<div style="font-weight:600;">' + escapeHtml(title) + '</div>';
    if (subtitle) html += '<div style="opacity:0.8">' + escapeHtml(subtitle) + '</div>';
    if (link) html += '<div style="margin-top:6px;"><a href="' + escapeHtml(link) + '" target="_blank" rel="noopener noreferrer">Open in Apple Music</a></div>';
    return html;
  }

  async function fetchArtworkUrl(appleId) {
    try {
      var resp = await fetch('https://itunes.apple.com/lookup?id=' + appleId);
      var json = await resp.json();
      var item = (json && json.results && json.results[0]) || null;
      if (item && item.artworkUrl100) {
        return item.artworkUrl100.replace('100x100bb', '200x200bb');
      }
    } catch (_) {}
    return null;
  }

  function resolveCoordinate(input, lookup) {
    if (!input) return null;
    if (typeof input === 'string') {
      return lookup[input] || null;
    }
    if (Array.isArray(input) && input.length === 2) {
      var lat = Number(input[0]);
      var lng = Number(input[1]);
      return Number.isFinite(lat) && Number.isFinite(lng) ? [lat, lng] : null;
    }
    if (typeof input === 'object' && Number.isFinite(input.lat) && Number.isFinite(input.lng)) {
      return [input.lat, input.lng];
    }
    return null;
  }

  function toRadians(value) {
    return (value * Math.PI) / 180;
  }

  function toDegrees(value) {
    return (value * 180) / Math.PI;
  }

  function computeBearing(start, end) {
    if (!start || !end) return 0;
    var lat1 = toRadians(start[0]);
    var lat2 = toRadians(end[0]);
    var dLon = toRadians(end[1] - start[1]);

    var y = Math.sin(dLon) * Math.cos(lat2);
    var x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
    var bearing = Math.atan2(y, x);
    var bearingDeg = (toDegrees(bearing) + 360) % 360;
    return bearingDeg;
  }

  function buildPolylineSegments(coords, map) {
    var segments = [];
    var total = 0;
    for (var i = 0; i < coords.length - 1; i++) {
      var start = coords[i];
      var end = coords[i + 1];
      var length = map.distance(start, end) || 0;
      segments.push({ start: start, end: end, length: length });
      total += length;
    }
    return { segments: segments, total: total };
  }

  function getPointAlongPolyline(segmentData, fraction) {
    fraction = Math.max(0, Math.min(1, typeof fraction === 'number' ? fraction : 0.5));
    var segments = segmentData.segments;
    if (!segments.length) {
      return null;
    }

    var total = segmentData.total;
    if (total === 0) {
      var single = segments[0];
      return {
        point: [single.start[0], single.start[1]],
        headingDeg: computeBearing(single.start, single.end)
      };
    }

    var target = total * fraction;
    var remaining = target;

    for (var i = 0; i < segments.length; i++) {
      var seg = segments[i];
      if (remaining <= seg.length || i === segments.length - 1) {
        var segLength = seg.length || 1;
        var ratio = segLength === 0 ? 0 : remaining / segLength;
        ratio = Math.max(0, Math.min(1, ratio));
        var lat = seg.start[0] + (seg.end[0] - seg.start[0]) * ratio;
        var lng = seg.start[1] + (seg.end[1] - seg.start[1]) * ratio;
        return {
          point: [lat, lng],
          headingDeg: computeBearing(seg.start, seg.end)
        };
      }
      remaining -= seg.length;
    }
    var last = segments[segments.length - 1];
    return {
      point: [last.end[0], last.end[1]],
      headingDeg: computeBearing(last.start, last.end)
    };
  }

  function expandMarkers(markers) {
    var expanded = [];
    markers.forEach(function(marker) {
      if (!marker) return;
      var base = Object.assign({}, marker);
      var locations = Array.isArray(marker.locations) ? marker.locations : [];
      delete base.locations;

      if (!locations.length) {
        if (base.id) base.aliases = [base.id];
        expanded.push(base);
        return;
      }

      locations.forEach(function(location, index) {
        if (!location) return;
        var clone = Object.assign({}, base, location);
        delete clone.locations;

        var baseId = base.id;
        var locationId = location.id || (baseId ? baseId + '-' + (index + 1) : null);
        if (locationId) clone.id = locationId;

        var aliases = [];
        if (index === 0 && baseId) aliases.push(baseId);
        if (Array.isArray(location.aliases)) {
          location.aliases.forEach(function(alias) {
            if (alias) aliases.push(alias);
          });
        }
        if (aliases.length) clone.aliases = aliases;

        expanded.push(clone);
      });
    });
    return expanded;
  }

  function addSingleMarker(markerData, boundsGroup, coordinatesById) {
    if (!markerData || !Number.isFinite(markerData.lat) || !Number.isFinite(markerData.lng)) {
      return;
    }
    var icon = L.icon({
      iconUrl: markerData.iconUrl || DEFAULT_MARKER_ICON,
      iconSize: markerData.iconUrl ? [48, 48] : [25, 41],
      iconAnchor: markerData.iconUrl ? [24, 24] : [12, 41],
      popupAnchor: [0, -20],
      className: markerData.iconUrl ? 'album-cover-icon' : ''
    });

    var latLng = [markerData.lat, markerData.lng];
    var marker = L.marker(latLng, { icon: icon, pane: 'albumsPane' });
    marker.bindPopup(createPopupHtml(markerData));
    marker.addTo(boundsGroup);

    if (markerData.id) {
      coordinatesById[markerData.id] = latLng;
    }
    if (Array.isArray(markerData.aliases)) {
      markerData.aliases.forEach(function(alias) {
        if (alias) {
          coordinatesById[alias] = latLng;
        }
      });
    }
  }

  function createClusterMarker(cluster, boundsGroup, coordinatesById) {
    if (!cluster || !Number.isFinite(cluster.lat) || !Number.isFinite(cluster.lng)) {
      return;
    }
    ensureRouteLabelStyle();

    var center = [cluster.lat, cluster.lng];
    var accent = cluster.markers.find(function(m) { return typeof m.clusterColor === 'string' && m.clusterColor; });
    var accentColor = accent ? accent.clusterColor : 'rgba(15,23,42,0.78)';

    var preview = cluster.markers
      .map(function(m) { return m.iconUrl || DEFAULT_MARKER_ICON; })
      .slice(0, 4)
      .map(function(url) { return '<img src="' + escapeHtml(url) + '" alt="" />'; })
      .join('');

    var extraCount = cluster.markers.length - 4;
    var gridHtml = '<div class="leaflet-cluster-grid" style="background:' + escapeHtml(accentColor) + ';">' + preview;
    if (extraCount > 0) {
      gridHtml += '<span class="leaflet-cluster-count">+' + extraCount + '</span>';
    }
    gridHtml += '</div>';

    var clusterMarker = L.marker(center, {
      icon: L.divIcon({
        className: 'leaflet-cluster-wrapper',
        html: gridHtml,
        iconSize: [60, 60],
        iconAnchor: [30, 30]
      }),
      pane: 'albumsPane'
    });

    var popupTitle = cluster.title || (cluster.markers[0] && (cluster.markers[0].clusterTitle || cluster.markers[0].title)) || cluster.id;
    var popupHtml = '<div class="leaflet-cluster-popup"><h4>' + escapeHtml(popupTitle || 'Albums') + '</h4><ul>';
    cluster.markers.forEach(function(m) {
      var cover = m.iconUrl || DEFAULT_MARKER_ICON;
      var subtitle = m.subtitle ? '<div class="cluster-item-subtitle">' + escapeHtml(m.subtitle) + '</div>' : '';
      var link = m.link ? '<div class="cluster-item-link"><a href="' + escapeHtml(m.link) + '" target="_blank" rel="noopener noreferrer">Open in Apple Music</a></div>' : '';
      popupHtml += '<li><img src="' + escapeHtml(cover) + '" alt="' + escapeHtml(m.title || 'Album cover') + '" /><div class="cluster-item-body"><div class="cluster-item-title">' + escapeHtml(m.title || 'Untitled') + '</div>' + subtitle + link + '</div></li>';
    });
    popupHtml += '</ul></div>';

    clusterMarker.bindPopup(popupHtml);
    clusterMarker.addTo(boundsGroup);

    cluster.markers.forEach(function(m) {
      if (m.id) {
        coordinatesById[m.id] = center;
      }
      if (Array.isArray(m.aliases)) {
        m.aliases.forEach(function(alias) {
          if (alias) {
            coordinatesById[alias] = center;
          }
        });
      }
    });
    if (cluster.id) {
      coordinatesById[cluster.id] = center;
    }
  }

  async function init() {
    var cfgEl = document.getElementById('map-config');
    var cfg = safeParse(cfgEl ? cfgEl.textContent || '{}' : '{}');
    var dataUrl = cfg.dataUrl || '/data/springs-best-25-map.json';
    var initialCenter = Array.isArray(cfg.initialCenter) ? cfg.initialCenter : [20, 0];
    var initialZoom = typeof cfg.initialZoom === 'number' ? cfg.initialZoom : 2;

    if (typeof L === 'undefined') {
      console.error('Leaflet not loaded');
      return;
    }

    var map = L.map('map', { zoomControl: true, worldCopyJump: true })
      .setView(initialCenter, initialZoom);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    if (!map.getPane('albumsPane')) {
      var albumsPane = map.createPane('albumsPane');
      albumsPane.style.zIndex = '540';
    }
    if (!map.getPane('routesPane')) {
      var routesPane = map.createPane('routesPane');
      routesPane.style.zIndex = '610';
      routesPane.style.pointerEvents = 'none';
    }
    if (!map.getPane('routeOverlaysPane')) {
      var overlaysPane = map.createPane('routeOverlaysPane');
      overlaysPane.style.zIndex = '620';
      overlaysPane.style.pointerEvents = 'none';
    }

    try {
      var res = await fetch(dataUrl, { cache: 'no-cache' });
      var data = await res.json();
      var markers = Array.isArray(data) ? data : (data.markers || []);

      await Promise.all(markers.map(async function(m) {
        if (!m.iconUrl && m.appleAlbumId) {
          m.iconUrl = await fetchArtworkUrl(m.appleAlbumId);
        }
      }));

      markers = expandMarkers(markers);

      var boundsGroup = L.featureGroup();
      var coordinatesById = {};

      var singles = [];
      var clusterMap = new Map();

      markers.forEach(function(markerData) {
        if (!markerData) return;
        var hasCluster = !!markerData.cluster;
        var lat = Number.isFinite(markerData.lat) ? markerData.lat : Number(markerData.clusterLat);
        var lng = Number.isFinite(markerData.lng) ? markerData.lng : Number(markerData.clusterLng);

        if (hasCluster) {
          var clusterKey = String(markerData.cluster);
          var cluster = clusterMap.get(clusterKey);
          if (!cluster) {
            cluster = {
              id: clusterKey,
              title: markerData.clusterTitle || null,
              lat: Number.isFinite(markerData.clusterLat) ? markerData.clusterLat : (Number.isFinite(markerData.lat) ? markerData.lat : null),
              lng: Number.isFinite(markerData.clusterLng) ? markerData.clusterLng : (Number.isFinite(markerData.lng) ? markerData.lng : null),
              markers: []
            };
            clusterMap.set(clusterKey, cluster);
          }
          if (Number.isFinite(markerData.clusterLat)) cluster.lat = markerData.clusterLat;
          if (Number.isFinite(markerData.clusterLng)) cluster.lng = markerData.clusterLng;
          if (!Number.isFinite(cluster.lat) && Number.isFinite(lat)) cluster.lat = lat;
          if (!Number.isFinite(cluster.lng) && Number.isFinite(lng)) cluster.lng = lng;
          cluster.markers.push(markerData);
        } else {
          if (Number.isFinite(lat) && Number.isFinite(lng)) {
            markerData.lat = lat;
            markerData.lng = lng;
            singles.push(markerData);
          }
        }
      });

      singles.forEach(function(single) {
        addSingleMarker(single, boundsGroup, coordinatesById);
      });

      clusterMap.forEach(function(cluster) {
        if (cluster.markers.length === 1) {
          var loneMarker = cluster.markers[0];
          if (!Number.isFinite(loneMarker.lat) || !Number.isFinite(loneMarker.lng)) {
            loneMarker.lat = cluster.lat;
            loneMarker.lng = cluster.lng;
          }
          addSingleMarker(loneMarker, boundsGroup, coordinatesById);
          if (cluster.id && Array.isArray(coordinatesById[loneMarker.id])) {
            coordinatesById[cluster.id] = coordinatesById[loneMarker.id];
          }
        } else {
          createClusterMarker(cluster, boundsGroup, coordinatesById);
        }
      });

      var routes = Array.isArray(data.routes) ? data.routes : [];
      routes.forEach(function(route, routeIndex) {
        if (!route) return;
        var path = Array.isArray(route.path) ? route.path : Array.isArray(route.stops) ? route.stops : [];
        if (!path.length) return;

        var coords = [];
        path.forEach(function(entry) {
          var resolved = resolveCoordinate(entry, coordinatesById);
          if (resolved) coords.push(resolved);
        });

        if (coords.length < 2) return;

        var segmentData = buildPolylineSegments(coords, map);
        if (!segmentData.segments.length) return;

        var style = {
          color: route.color || '#fb7185',
          weight: typeof route.weight === 'number' ? route.weight : 3,
          opacity: typeof route.opacity === 'number' ? route.opacity : 0.75,
          lineJoin: route.lineJoin || 'round',
          lineCap: route.lineCap || 'round'
        };
        if (route.dashArray) style.dashArray = route.dashArray;

        var polyline = L.polyline(coords, style);
        polyline.options.pane = 'routesPane';
        if (route.popup) polyline.bindPopup(route.popup);
        if (route.tooltip) polyline.bindTooltip(route.tooltip);
        polyline.addTo(boundsGroup);

        var labelText = route.label || route.number || (routeIndex + 1);
        var defaultLabelConfig = typeof route.labelFraction === 'number' ? { fraction: route.labelFraction } : undefined;

        var labelConfigs = Array.isArray(route.labels) && route.labels.length
          ? route.labels
          : (labelText != null ? [defaultLabelConfig || {}] : []);

        labelConfigs.forEach(function(labelCfg) {
          if (labelCfg == null && labelText == null) return;
          ensureRouteLabelStyle();

          var fraction = (labelCfg && typeof labelCfg.fraction === 'number') ? labelCfg.fraction : 0.5;
          var text = labelCfg && labelCfg.text != null ? labelCfg.text : labelText;
          if (text == null) return;

          var labelData = getPointAlongPolyline(segmentData, fraction);
          if (labelData && labelData.point) {
            var labelMarker = L.marker(labelData.point, {
              icon: L.divIcon({
                className: 'leaflet-route-label',
                html: '<span>' + escapeHtml(text) + '</span>',
                iconSize: [26, 26]
              }),
              pane: 'routeOverlaysPane',
              interactive: false
            });
            labelMarker.addTo(boundsGroup);
          }
        });

        if (route.arrow !== false) {
          // Arrowheads disabled; keep structure for future extensions.
        }
      });

      boundsGroup.addTo(map);
      if (boundsGroup.getLayers().length > 0) {
        try { map.fitBounds(boundsGroup.getBounds().pad(0.4), { maxZoom: 6 }); }
        catch (_) { map.setView(initialCenter, initialZoom); }
      } else {
        map.setView(initialCenter, initialZoom);
      }
    } catch (err) {
      console.error('Failed to initialize map', err);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();


