/**
 * RoadSeaker - Main Application Logic
 * Author: Antigravity AI
 */

const AppState = {
    panorama: null,
    panoMarker: null,
    staticMapImage: null,
    scriptLoaded: false,
    scriptLoadingPromise: null,
    staticZoom: 18,
    maxFid: 0,
    fields: [],
    selectedFields: [],
    // Original record coordinates for fixed marker
    originalLat: 0,
    originalLng: 0
};

function getClientId() {
    if (typeof AUTH_CONFIG !== 'object' || !AUTH_CONFIG) return '';
    return String(AUTH_CONFIG.client_id || '').trim();
}

// Initialize the app
function init() {
    checkOrigin();
    setupEventListeners();
}

/**
 * Check if the app is running via file:// and warn the user
 */
function checkOrigin() {
    if (window.location.protocol === 'file:') {
        const warning = document.createElement('div');
        warning.className = 'origin-warning';
        warning.innerHTML = `
            <strong>주의:</strong> 로컬 파일(file://)로 실행 중입니다. 
            보안 정책으로 인해 지도가 표시되지 않을 수 있습니다. 
            <code>npx serve</code> 또는 Live Server 등을 사용하여 로컬 서버에서 실행해 주세요.
        `;
        document.body.prepend(warning);
        console.warn('Running from file:// protocol may break API requests (CORS).');
    }
}

function setupEventListeners() {
    const fileInput = document.getElementById('fileInput');
    fileInput.addEventListener('change', handleFileSelect);

    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');

    prevBtn.addEventListener('click', () => navigate(-1));
    nextBtn.addEventListener('click', () => navigate(1));

    // Keyboard navigation
    window.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') navigate(-1);
        if (e.key === 'ArrowRight') navigate(1);
    });

    // Jump to FID
    const fidInput = document.getElementById('fidInput');
    fidInput.addEventListener('change', () => {
        const targetFid = parseInt(fidInput.value);
        const index = AppState.records.findIndex(r => r.fid === targetFid);
        if (index !== -1) {
            AppState.currentIndex = index;
            updateDisplay();
        } else {
            alert(`FID ${targetFid}을(를) 찾을 수 없습니다.`);
            updateDisplay(); // Reset to current
        }
    });

    // Static Map Double Click to move Panorama
    const mapHost = document.getElementById('staticMap');
    mapHost.addEventListener('dblclick', (e) => {
        if (!AppState.panorama || !AppState.records || AppState.records.length === 0) return;
        
        const rect = mapHost.getBoundingClientRect();
        // Calculate logical pixel offset relative to the 640x640 source image
        // Final fixed sensitivity: 0.0023
        const sensitivity = 0.0023;
        const logicalX = (e.clientX - rect.left - rect.width / 2) * (640 / rect.width) * sensitivity;
        const logicalY = (e.clientY - rect.top - rect.height / 2) * (640 / rect.height) * sensitivity;

        const currentPanoPos = AppState.panorama.getPosition();
        if (!currentPanoPos) return;

        // Use EPSG3857 (Standard Web Mercator) for static map calculation
        const projection = naver.maps.EPSG3857 || naver.maps.SphericalMercator;
        if (!projection) return;

        const centerPoint = projection.fromLatLngToPoint(currentPanoPos);
        // At zoom Level L, 1 logical pixel = 1 / 2^L in 256-scale world points
        const pointScale = Math.pow(2, AppState.staticZoom);
        
        const targetPoint = new naver.maps.Point(
            centerPoint.x + (logicalX / pointScale),
            centerPoint.y + (logicalY / pointScale)
        );

        const targetLatLng = projection.fromPointToLatLng(targetPoint);
        AppState.panorama.setPosition(targetLatLng);
    });
}

function buildStaticMapProxyUrl(centerLat, centerLng) {
    const params = new URLSearchParams({
        center: `${centerLng},${centerLat}`,
        level: String(AppState.staticZoom),
        w: '640',
        h: '640',
        maptype: 'satellite_base'
    });
    
    // Proper way to add multiple duplicate keys in URLSearchParams
    params.append('markers', `type:d|size:small|pos:${AppState.originalLng} ${AppState.originalLat}|color:red`);
    params.append('markers', `type:d|size:tiny|pos:${AppState.originalLng} ${AppState.originalLat}|color:blue`);

    return `/map-proxy?${params.toString()}`;
}

function getOrCreateStaticMapImage() {
    if (AppState.staticMapImage) return AppState.staticMapImage;

    const host = document.getElementById('staticMap');
    if (!host) return null;

    const img = document.createElement('img');
    img.className = 'static-map-image';
    img.alt = 'Static map';
    img.decoding = 'async';
    img.loading = 'eager';
    img.draggable = false;
    img.referrerPolicy = 'no-referrer-when-downgrade';
    host.appendChild(img);

    AppState.staticMapImage = img;
    return img;
}

function updateStaticMapImage(centerLat, centerLng) {
    const img = getOrCreateStaticMapImage();
    if (!img) return;

    img.onerror = () => {
        const mapPlaceholder = document.getElementById('staticMapPlaceholder');
        if (mapPlaceholder) {
            mapPlaceholder.style.display = 'block';
            mapPlaceholder.textContent = 'Static map request failed. Check server.py and API key settings.';
        }
    };
    img.onload = () => {
        const mapPlaceholder = document.getElementById('staticMapPlaceholder');
        if (mapPlaceholder) mapPlaceholder.style.display = 'none';
    };
    img.src = buildStaticMapProxyUrl(centerLat, centerLng);
}

function collectFieldNames(rawData) {
    const fieldSet = new Set();
    rawData.forEach((row) => {
        Object.keys(row || {}).forEach((key) => fieldSet.add(key));
    });
    return Array.from(fieldSet);
}

function pickDefaultFields(fields) {
    return [...fields];
}

function renderFieldSelector() {
    const container = document.getElementById('fieldSelector');
    if (!container) return;

    container.innerHTML = '';

    if (!AppState.fields.length) {
        container.textContent = 'No fields';
        return;
    }

    AppState.fields.forEach((field) => {
        const label = document.createElement('label');
        label.className = 'field-check-item';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = AppState.selectedFields.includes(field);
        checkbox.addEventListener('change', () => {
            if (checkbox.checked) {
                if (!AppState.selectedFields.includes(field)) AppState.selectedFields.push(field);
            } else {
                AppState.selectedFields = AppState.selectedFields.filter((name) => name !== field);
            }
            renderFieldValueTable(AppState.records?.[AppState.currentIndex]);
        });

        const text = document.createElement('span');
        text.textContent = field;

        label.appendChild(checkbox);
        label.appendChild(text);
        container.appendChild(label);
    });
}

function renderFieldValueTable(record) {
    const head = document.getElementById('fieldValueHead');
    const body = document.getElementById('fieldValueBody');
    if (!head || !body) return;

    head.innerHTML = '';
    body.innerHTML = '';

    if (!record || !record.raw) {
        head.innerHTML = '<tr><th>Field</th></tr>';
        body.innerHTML = '<tr><td>No data</td></tr>';
        return;
    }

    if (!AppState.selectedFields.length) {
        head.innerHTML = '<tr><th>Field</th></tr>';
        body.innerHTML = '<tr><td>No field selected</td></tr>';
        return;
    }

    const headRow = document.createElement('tr');
    const bodyRow = document.createElement('tr');

    AppState.selectedFields.forEach((field) => {
        const headCell = document.createElement('th');
        const valueCell = document.createElement('td');
        const rawValue = record.raw[field];

        headCell.textContent = field;
        valueCell.textContent = rawValue === undefined || rawValue === null || rawValue === '' ? '-' : String(rawValue);

        headRow.appendChild(headCell);
        bodyRow.appendChild(valueCell);
    });

    head.appendChild(headRow);
    body.appendChild(bodyRow);
}

/**
 * Dynamically load Naver Maps JS SDK
 */
function loadNaverMapsSDK() {
    if (AppState.scriptLoaded) return Promise.resolve();
    if (AppState.scriptLoadingPromise) return AppState.scriptLoadingPromise;

    const clientId = getClientId();
    if (!clientId) {
        return Promise.reject(new Error('AUTH_CONFIG.client_id is missing. Check auth.js.'));
    }

    AppState.scriptLoadingPromise = new Promise((resolve, reject) => {
        const timeoutId = window.setTimeout(() => {
            reject(new Error('Naver Maps SDK load timed out. Check authentication settings.'));
        }, 8000);

        const script = document.createElement('script');
        script.type = 'text/javascript';
        // Use protocol-relative URL and ensure both panorama and geocoder are included
        script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpClientId=${clientId}&submodules=panorama,geocoder`;

        script.onload = () => {
            if (typeof naver === 'undefined' || !naver.maps) {
                window.clearTimeout(timeoutId);
                reject(new Error('네이버 지도 인증 실패 (Error 200).'));
            } else {
                naver.maps.onJSContentLoaded = () => {
                    window.clearTimeout(timeoutId);
                    AppState.scriptLoaded = true;
                    resolve();
                };
            }
        };
        script.onerror = () => {
            window.clearTimeout(timeoutId);
            reject(new Error('네이버 지도 SDK 로드 실패. API 키 또는 네트워크를 확인하세요.'));
        };
        document.head.appendChild(script);
    });

    AppState.scriptLoadingPromise.finally(() => {
        AppState.scriptLoadingPromise = null;
    });

    return AppState.scriptLoadingPromise;
}

/**
 * Handle File Selection (.xlsx or .dbf)
 */
async function handleFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    document.getElementById('fileInfo').textContent = `${file.name} 로딩 중...`;

    try {
        const extension = file.name.split('.').pop().toLowerCase();
        const arrayBuffer = await file.arrayBuffer();

        let data = [];
        if (extension === 'xlsx') {
            data = parseXlsx(arrayBuffer);
        } else if (extension === 'dbf') {
            data = await parseDbf(arrayBuffer);
        } else {
            alert('지원하지 않는 파일 형식입니다 (.xlsx, .dbf만 지원)');
            return;
        }

        if (data.length === 0) {
            alert('데이터를 찾을 수 없습니다.');
            return;
        }

        AppState.records = normalizeData(data);
        if (AppState.records.length === 0) {
            alert('좌표 정보가 있는 레코드를 찾을 수 없습니다.');
            return;
        }

        AppState.fields = collectFieldNames(data);
        AppState.selectedFields = pickDefaultFields(AppState.fields);
        renderFieldSelector();
        AppState.currentIndex = 0;
        AppState.maxFid = Math.max(...AppState.records.map(r => r.fid || 0));

        document.getElementById('fileInfo').textContent = `${file.name} (${AppState.records.length}개 레코드)`;
        document.getElementById('maxFid').textContent = AppState.maxFid;

        // Load API and initialize views
        await loadNaverMapsSDK();
        initViews();
        updateDisplay();
    } catch (err) {
        console.error(err);
        const mapPlaceholder = document.getElementById('staticMapPlaceholder');
        if (mapPlaceholder) {
            mapPlaceholder.style.display = 'block';
            mapPlaceholder.innerHTML = `
                <div style="color:#ff6b6b; font-size:0.8rem;">
                    <strong>[인증 실패]</strong><br>
                    네이버 클라우드 설정을 확인하세요.<br>
                    URI: ${window.location.origin}/<br>
                    ID: ${AUTH_CONFIG.client_id}
                </div>`;
        }
        if (mapPlaceholder) {
            mapPlaceholder.innerHTML = `
                <div style="color:#ff6b6b; font-size:0.8rem; line-height:1.5;">
                    <strong>[Authentication Failed]</strong><br>
                    Check NCP Console API settings.<br>
                    URI: ${window.location.origin}/<br>
                    Client ID: ${getClientId() || '(missing)'}
                </div>`;
        }

        const currentOrigin = `${window.location.protocol}//${window.location.host}/`;
        alert(
            '네이버 지도 인증 실패\n' +
            `- 현재 실행 URL: ${currentOrigin}\n` +
            '- NCP 콘솔 > Maps > Web Dynamic Map 사용 여부 확인\n' +
            '- Web 서비스 URL에 위 URL을 정확히 등록\n' +
            '- 필요 시 http://127.0.0.1:8000/ 도 함께 등록'
        );
    }
}

/**
 * Parse Excel File (using SheetJS)
 */
function parseXlsx(buffer) {
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    return XLSX.utils.sheet_to_json(worksheet);
}

/**
 * Parse DBF File (using shpjs)
 */
async function parseDbf(buffer) {
    // shpjs handles DBF parsing, passing 'euc-kr' as encoding as requested
    const dbf = await shp.parseDbf(buffer, 'euc-kr');
    return dbf;
}

/**
 * Normalize data to extract YX (Lat/Lng) and Address
 */
function normalizeData(rawData) {
    return rawData.map((item, idx) => {
        let lat = 0, lng = 0;

        // Check for 'YX' field (expected format: "lat, lng" as seen in test.xlsx)
        if (item.YX && typeof item.YX === 'string' && item.YX.includes(',')) {
            const parts = item.YX.split(',').map(p => p.trim());
            lat = parseFloat(parts[0]);
            lng = parseFloat(parts[1]);
        }
        // Fallback to explicit fields like 'Y좌표', 'X좌표', etc.
        else {
            lat = item.Y좌표 || item.Y || item.y || item.Lat || item.LAT || item.LATITUDE || item.latitude || 0;
            lng = item.X좌표 || item.X || item.x || item.Lng || item.LON || item.LONGITUDE || item.LONG || item.longitude || 0;
        }

        const address = item.주소 || item.ADDRESS || item.address || item.ADDR || item.addr || '주소 정보 없음';
        
        let rawFid;
        if (item.FID !== undefined && item.FID !== null) rawFid = item.FID;
        else if (item.fid !== undefined && item.fid !== null) rawFid = item.fid;
        else rawFid = idx + 1;
        
        const fid = parseInt(rawFid);

        return { lat: parseFloat(lat), lng: parseFloat(lng), address, fid, raw: item };
    }).filter(r => !isNaN(r.lat) && !isNaN(r.lng) && r.lat !== 0);
}

/**
 * Initialize Panorama and Map Views
 */
function initViews() {
    const panoPlaceholder = document.getElementById('panoPlaceholder');
    const mapPlaceholder = document.getElementById('staticMapPlaceholder');
    
    if (panoPlaceholder) panoPlaceholder.style.display = 'none';
    if (mapPlaceholder) mapPlaceholder.style.display = 'none';

    const record = AppState.records[AppState.currentIndex];
    const latlng = new naver.maps.LatLng(record.lat, record.lng);

    try {
        // 1. Initialize Panorama
        AppState.panorama = new naver.maps.Panorama('pano', {
            position: latlng,
            pov: { pan: -135, tilt: 29, fov: 100 }
        });

        AppState.panoMarker = new naver.maps.Marker({
            position: latlng,
            map: AppState.panorama,
            icon: {
                content: `
                    <div style="cursor:pointer;">
                        <svg viewBox="0 0 24 24" width="42" height="42" filter="drop-shadow(0 0 5px rgba(0,0,0,0.5))">
                            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-12-7z" fill="#ff4d4d" stroke="#fff" stroke-width="1.5"/>
                            <circle cx="12" cy="9" r="3" fill="#fff"/>
                        </svg>
                    </div>`,
                anchor: new naver.maps.Point(21, 42)
            }
        });

        // 2. Initialize Static Map image via server-side proxy (ID-KEY)
        updateStaticMapImage(record.lat, record.lng);

        // Handle POV Arrow (SVG overlay method)
        const povArrow = document.getElementById('povArrow');
        if (povArrow) {
            povArrow.classList.add('visible');
            updatePovArrowRotation();
            naver.maps.Event.addListener(AppState.panorama, 'pov_changed', updatePovArrowRotation);
        }

        // Handle internal position changes (clicks in pano)
        // Map center follows panorama, but marker stays at original record position
        naver.maps.Event.addListener(AppState.panorama, 'pano_changed', () => {
            const pos = AppState.panorama.getPosition();
            if (pos) updateStaticMapImage(pos.lat(), pos.lng());
        });

    } catch (e) {
        console.error("SDK initialization failed:", e);
    }
}

function updatePovArrowRotation() {
    const povArrow = document.getElementById('povArrow');
    if (povArrow && AppState.panorama) {
        const pan = AppState.panorama.getPov().pan;
        povArrow.style.transform = `translate(-50%, -50%) rotate(${pan}deg)`;
    }
}

/**
 * Update the UI displays
 */
async function updateDisplay() {
    const record = AppState.records[AppState.currentIndex];
    if (!record) return;

    // Update Record Indicator (FID)
    const fidInput = document.getElementById('fidInput');
    fidInput.value = record.fid;
    document.getElementById('maxFid').textContent = AppState.maxFid;

    renderFieldValueTable(record);

    // Update Buttons
    document.getElementById('prevBtn').disabled = AppState.currentIndex <= 0;
    document.getElementById('nextBtn').disabled = AppState.currentIndex >= AppState.records.length - 1;

    // Update Views
    updateViews(record);
}

/**
 * Update Map and Panorama positions
 */
function updateViews(record) {
    if (typeof naver === 'undefined' || !naver.maps || !naver.maps.LatLng) {
        return;
    }
    const latlng = new naver.maps.LatLng(record.lat, record.lng);

    // Set the anchor for the fixed marker
    AppState.originalLat = record.lat;
    AppState.originalLng = record.lng;

    updateStaticMapImage(record.lat, record.lng);

    if (AppState.panorama) {
        AppState.panorama.setPosition(latlng);
        if (AppState.panoMarker) {
            AppState.panoMarker.setPosition(latlng);
            AppState.panoMarker.setTitle(record.address);
        }
    }
    
    updatePovArrowRotation();
}

/**
 * Navigator Logic
 */
function navigate(direction) {
    const newIndex = AppState.currentIndex + direction;
    if (newIndex >= 0 && newIndex < AppState.records.length) {
        AppState.currentIndex = newIndex;
        updateDisplay();
    }
}

// Global start
window.onload = init;
