// アプリケーション全体の状態管理
class WatakokoApp {
    constructor() {
        this.map = null;
        this.fullMap = null;
        this.buildingData = null;
        this.membersData = null;
        this.currentUser = null;
        this.currentLocation = null;
        this.selectedBuilding = null;
        this.selectedFloor = null;
        this.selectedRoom = null;
        this.showBuildings = false;
        this.showMembers = false;
        this.currentGroupFilter = 'all';
        
        // 個人位置マーカー管理
        this.personalMarkers = {
            gps: null,           // GPSマーカー
            registered: null     // 登録位置マーカー
        };
        this.personalMarkersFullMap = {
            gps: null,           // フルマップ用GPSマーカー
            registered: null     // フルマップ用登録位置マーカー
        };
        
        this.init();
    }

    async init() {
        // データの読み込み
        await this.loadData();
        
        // UI初期化
        this.initUI();
        
        // ユーザーデータの確認
        this.checkUserData();
        
        // マップ初期化
        this.initMaps();
        
        // イベントリスナーの設定
        this.setupEventListeners();
    }

    async loadData() {
        try {
            const buildingResponse = await fetch('building_info.json');
            this.buildingData = await buildingResponse.json();
            
            const membersResponse = await fetch('members_loc.json');
            this.membersData = await membersResponse.json();
        } catch (error) {
            console.error('データの読み込みに失敗しました:', error);
        }
    }

    initUI() {
        // ハンバーガーメニューの初期化
        const hamburgerBtn = document.getElementById('hamburger-btn');
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('overlay');

        hamburgerBtn.addEventListener('click', () => {
            hamburgerBtn.classList.toggle('active');
            sidebar.classList.toggle('open');
            overlay.classList.toggle('active');
        });

        overlay.addEventListener('click', () => {
            hamburgerBtn.classList.remove('active');
            sidebar.classList.remove('open');
            overlay.classList.remove('active');
        });

        // ナビゲーションの初期化
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = item.id.replace('nav-', '');
                this.showScreen(targetId);
                
                // サイドバーを閉じる
                hamburgerBtn.classList.remove('active');
                sidebar.classList.remove('open');
                overlay.classList.remove('active');
                
                // アクティブ状態の更新
                navItems.forEach(nav => nav.classList.remove('active'));
                item.classList.add('active');
            });
        });
    }

    showScreen(screenName) {
        const screens = document.querySelectorAll('.screen');
        screens.forEach(screen => screen.classList.remove('active'));
        
        let targetScreen;
        switch(screenName) {
            case 'settings':
                targetScreen = document.getElementById('user-settings-screen');
                break;
            case 'map':
                targetScreen = document.getElementById('map-screen');
                // フルマップの初期化（まだ初期化されていない場合）
                if (!this.fullMap) {
                    setTimeout(() => this.initFullMap(), 100);
                } else {
                    // ③個人マーカーを復元（フルマップが既に初期化済みの場合）
                    setTimeout(() => this.restorePersonalMarkers(), 100);
                }
                break;
            default:
                targetScreen = document.getElementById('main-screen');
        }
        
        if (targetScreen) {
            targetScreen.classList.add('active');
        }
    }

    checkUserData() {
        const userData = localStorage.getItem('watakoko_user');
        if (userData) {
            this.currentUser = JSON.parse(userData);
            this.showScreen('main');
        } else {
            this.showScreen('settings');
        }
    }

    setupEventListeners() {
        // ユーザー設定画面のイベント
        this.setupUserSettingsEvents();
        
        // メイン画面のイベント
        this.setupMainScreenEvents();
        
        // マップ画面のイベント
        this.setupMapScreenEvents();
    }

    setupUserSettingsEvents() {
        // 既存ユーザーデータを読み込み
        this.loadExistingUserData();

        // デフォルトアイコン選択
        const defaultIconItems = document.querySelectorAll('.default-icon-item');
        defaultIconItems.forEach(item => {
            item.addEventListener('click', () => {
                // 他の選択を解除
                defaultIconItems.forEach(i => i.classList.remove('selected'));
                // 現在のアイテムを選択
                item.classList.add('selected');
                
                // SVGアイコンをプレビューに設定
                const iconType = item.dataset.icon;
                this.setDefaultIconPreview(iconType);
                
                // カスタムアップロードをクリア
                this.clearCustomUpload();
            });
        });

        // ファイル選択ボタン
        const fileSelectBtn = document.querySelector('.file-select-btn');
        const fileInput = document.getElementById('user-icon');
        const uploadArea = document.getElementById('icon-upload-area');
        const previewArea = document.getElementById('preview-area');
        const iconPreview = document.getElementById('icon-preview');

        fileSelectBtn.addEventListener('click', () => {
            fileInput.click();
        });

        // ドラッグ&ドロップ
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleFileSelection(files[0]);
            }
        });

                    // アップロードエリアをフォーカス可能にする
            uploadArea.setAttribute('tabindex', '0');

            // アップロードエリアをクリック可能にしてフォーカスを設定
            uploadArea.addEventListener('click', () => {
                uploadArea.focus();
            });

            // フォーカス時の視覚的フィードバック
            uploadArea.addEventListener('focus', () => {
                uploadArea.style.outline = '2px solid var(--gold-color)';
            });

            uploadArea.addEventListener('blur', () => {
                uploadArea.style.outline = 'none';
            });

            // Ctrl+V ペースト機能（アップロードエリアにフォーカスがある時のみ動作）
            const handlePaste = (e) => {
                console.log('アップロードエリアでペーストイベント検出:', e);
                console.log('クリップボードアイテム数:', e.clipboardData.items.length);
                
                const items = e.clipboardData.items;
                let hasImage = false;

                for (let i = 0; i < items.length; i++) {
                    const item = items[i];
                    console.log(`アイテム ${i}: タイプ=${item.type}, 種類=${item.kind}`);

                    if (item.type.indexOf('image') !== -1) {
                        console.log('画像を検出しました:', item.type);
                        e.preventDefault();
                        hasImage = true;
                        const file = item.getAsFile();
                        if (file) {
                            console.log('ファイル取得成功:', file.name, file.size, 'bytes');
                            uploadArea.classList.add('paste-active');
                            setTimeout(() => uploadArea.classList.remove('paste-active'), 1000);
                            this.handleFileSelection(file);
                            break;
                        } else {
                            console.log('ファイル取得失敗');
                        }
                    }
                }

                if (!hasImage) {
                    console.log('画像が見つかりませんでした');
                }
            };

            // アップロードエリア専用のペーストイベントリスナー
            uploadArea.addEventListener('paste', handlePaste);

        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFileSelection(e.target.files[0]);
            }
        });

        // ID入力の制限
        const userIdInput = document.getElementById('user-id');
        userIdInput.addEventListener('input', (e) => {
            // 数字のみ許可
            e.target.value = e.target.value.replace(/[^0-9]/g, '');
            // 7桁に制限
            if (e.target.value.length > 7) {
                e.target.value = e.target.value.slice(0, 7);
            }
        });

        // 設定保存ボタン
        const saveBtn = document.getElementById('save-settings-btn');
        saveBtn.addEventListener('click', () => {
            this.saveUserSettings();
        });
    }

    handleFileSelection(file) {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/x-icon'];
        if (!allowedTypes.includes(file.type)) {
            alert('JPG、PNG、ICOファイルのみ対応しています。');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const iconPreview = document.getElementById('icon-preview');
            const previewArea = document.getElementById('preview-area');
            const uploadText = document.querySelector('.upload-text');
            
            iconPreview.src = e.target.result;
            previewArea.style.display = 'block';
            
            // デフォルトアイコンの選択を解除
            this.clearDefaultIconSelection();
            
            // カスタムアイコンフラグを設定
            this.selectedIconType = 'custom';
            this.selectedIconData = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    // 既存ユーザーデータを読み込み
    loadExistingUserData() {
        const userData = localStorage.getItem('watakoko_user');
        if (userData) {
            const user = JSON.parse(userData);
            
            // 基本情報を設定
            document.getElementById('username').value = user.username || '';
            document.getElementById('user-id').value = user.id || '';
            document.getElementById('user-group').value = user.group || '営業部';
            
            // アイコン情報を復元
            if (user.iconType === 'default' && user.iconData) {
                this.setDefaultIconPreview(user.iconData, true);
            } else if (user.iconUrl && user.iconUrl !== 'icons/default.png') {
                this.setCustomIconPreview(user.iconUrl);
            }
        }
    }

    // デフォルトアイコンのプレビューを設定
    setDefaultIconPreview(iconType, selectItem = false) {
        const iconPreview = document.getElementById('icon-preview');
        const previewArea = document.getElementById('preview-area');
        const uploadText = document.querySelector('.upload-text');
        
        // SVGアイコンを生成
        const svgIcon = this.generateSVGIcon(iconType);
        
        // SVGをData URLに変換
        const svgBlob = new Blob([svgIcon], {type: 'image/svg+xml'});
        const url = URL.createObjectURL(svgBlob);
        
        iconPreview.src = url;
        previewArea.style.display = 'block';
        
        // 選択状態を更新
        if (selectItem) {
            const defaultIconItems = document.querySelectorAll('.default-icon-item');
            defaultIconItems.forEach(item => {
                if (item.dataset.icon === iconType) {
                    item.classList.add('selected');
                } else {
                    item.classList.remove('selected');
                }
            });
        }
        
        this.selectedIconType = 'default';
        this.selectedIconData = iconType;
    }

    // カスタムアイコンのプレビューを設定
    setCustomIconPreview(iconUrl) {
        const iconPreview = document.getElementById('icon-preview');
        const previewArea = document.getElementById('preview-area');
        const uploadText = document.querySelector('.upload-text');
        
        iconPreview.src = iconUrl;
        previewArea.style.display = 'block';
        
        this.selectedIconType = 'custom';
        this.selectedIconData = iconUrl;
    }

    // SVGアイコンを生成
    generateSVGIcon(iconType) {
        const svgTemplates = {
            person: `<svg width="80" height="80" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
                <circle cx="40" cy="24" r="12" fill="#4ECDC4"/>
                <path d="M16 64c0-13.254 10.746-24 24-24s24 10.746 24 24" fill="#4ECDC4"/>
            </svg>`,
            star: `<svg width="80" height="80" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
                <path d="M40 8l9.8 19.8 21.8 3.2-15.8 15.4 3.8 21.6L40 59.6 20.4 68l3.8-21.6L8.4 31l21.8-3.2z" fill="#FFD700"/>
            </svg>`,
            heart: `<svg width="80" height="80" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
                <path d="M40 70c-2.2 0-4-1.8-4-4 0-1.2.4-2.2 1.2-3L64 36c4.4-4.4 4.4-11.6 0-16s-11.6-4.4-16 0L40 28 32 20c-4.4-4.4-11.6-4.4-16 0s-4.4 11.6 0 16l26.8 27c.8.8 1.2 1.8 1.2 3 0 2.2-1.8 4-4 4z" fill="#FF6B6B"/>
            </svg>`,
            flower: `<svg width="80" height="80" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
                <circle cx="40" cy="40" r="8" fill="#98D8C8"/>
                <ellipse cx="40" cy="20" rx="6" ry="12" fill="#98D8C8"/>
                <ellipse cx="60" cy="40" rx="12" ry="6" fill="#98D8C8"/>
                <ellipse cx="40" cy="60" rx="6" ry="12" fill="#98D8C8"/>
                <ellipse cx="20" cy="40" rx="12" ry="6" fill="#98D8C8"/>
            </svg>`
        };
        
        return svgTemplates[iconType] || svgTemplates.person;
    }

    // デフォルトアイコンの選択を解除
    clearDefaultIconSelection() {
        const defaultIconItems = document.querySelectorAll('.default-icon-item');
        defaultIconItems.forEach(item => item.classList.remove('selected'));
    }

    // カスタムアップロードをクリア
    clearCustomUpload() {
        const fileInput = document.getElementById('user-icon');
        const previewArea = document.getElementById('preview-area');
        const uploadText = document.querySelector('.upload-text');
        
        fileInput.value = '';
        // プレビューエリアは表示したままにする（デフォルトアイコンが表示されるため）
    }

    saveUserSettings() {
        const username = document.getElementById('username').value.trim();
        const userId = document.getElementById('user-id').value.trim();
        const userGroup = document.getElementById('user-group').value;
        const iconPreview = document.getElementById('icon-preview');

        // バリデーション
        if (!username || username.length > 20) {
            alert('ユーザー名を正しく入力してください（最大20文字）。');
            return;
        }

        if (!userId || userId.length !== 7) {
            alert('IDは7桁の数字で入力してください。');
            return;
        }

        // アイコン情報を取得
        let iconUrl = 'icons/default.png';
        let iconType = 'default';
        let iconData = 'person';

        if (this.selectedIconType === 'default') {
            // デフォルトアイコンの場合、SVGを生成してData URLにする
            const svgIcon = this.generateSVGIcon(this.selectedIconData);
            const svgBlob = new Blob([svgIcon], {type: 'image/svg+xml'});
            iconUrl = URL.createObjectURL(svgBlob);
            iconType = 'default';
            iconData = this.selectedIconData;
        } else if (this.selectedIconType === 'custom') {
            // カスタムアイコンの場合
            iconUrl = this.selectedIconData;
            iconType = 'custom';
            iconData = null;
        }

        const userData = {
            id: userId,
            username: username,
            group: userGroup,
            iconUrl: iconUrl,
            iconType: iconType,
            iconData: iconData,
            createdAt: new Date().toISOString()
        };

        localStorage.setItem('watakoko_user', JSON.stringify(userData));
        this.currentUser = userData;
        
        alert('設定を保存しました！');
        this.showScreen('main');
    }

    // ユーザーアイコンを取得（各所で使用）
    getUserIcon() {
        if (!this.currentUser) return 'icons/default.png';
        
        if (this.currentUser.iconType === 'default' && this.currentUser.iconData) {
            // デフォルトアイコンの場合、SVGを生成
            const svgIcon = this.generateSVGIcon(this.currentUser.iconData);
            const svgBlob = new Blob([svgIcon], {type: 'image/svg+xml'});
            return URL.createObjectURL(svgBlob);
        }
        
        return this.currentUser.iconUrl || 'icons/default.png';
    }

    setupMainScreenEvents() {
        // 位置取得ボタン
        const locationBtn = document.getElementById('location-btn');
        locationBtn.addEventListener('click', () => {
            this.getCurrentLocation();
        });

        // 位置登録ボタン
        const registerBtn = document.getElementById('register-location-btn');
        registerBtn.addEventListener('click', () => {
            this.registerLocation();
        });

        // マップコントロール
        const toggleBuildingsBtn = document.getElementById('toggle-buildings-btn');
        const toggleMembersBtn = document.getElementById('toggle-members-btn');
        const groupSelect = document.getElementById('group-select');

        toggleBuildingsBtn.addEventListener('click', () => {
            this.toggleBuildingDisplay();
        });

        toggleMembersBtn.addEventListener('click', () => {
            this.toggleMembersDisplay();
        });

        groupSelect.addEventListener('change', (e) => {
            this.currentGroupFilter = e.target.value;
            if (this.showMembers) {
                this.updateMemberDisplay();
            }
        });
    }

    setupMapScreenEvents() {
        // フルマップのコントロール
        const mapToggleBuildingsBtn = document.getElementById('map-toggle-buildings-btn');
        const mapToggleMembersBtn = document.getElementById('map-toggle-members-btn');
        const mapGroupSelect = document.getElementById('map-group-select');

        mapToggleBuildingsBtn.addEventListener('click', () => {
            this.toggleBuildingDisplay(true);
        });

        mapToggleMembersBtn.addEventListener('click', () => {
            this.toggleMembersDisplay(true);
        });

        mapGroupSelect.addEventListener('change', (e) => {
            this.currentGroupFilter = e.target.value;
            if (this.showMembers) {
                this.updateMemberDisplay(true);
            }
        });
    }

    initMaps() {
        // メイン画面のマップ
        this.map = new maplibregl.Map({
            container: 'map',
            style: {
                version: 8,
                sources: {
                    'raster-tiles': {
                        type: 'raster',
                        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
                        tileSize: 256,
                        attribution: '© OpenStreetMap contributors'
                    }
                },
                layers: [
                    {
                        id: 'simple-tiles',
                        type: 'raster',
                        source: 'raster-tiles'
                    }
                ]
            },
            center: [136.881537, 35.170915], // 名古屋駅周辺
            zoom: 14
        });

        this.map.on('load', () => {
            this.addBuildingLayers(this.map);
        });

        // ズーム変更時にメンバー表示を更新
        this.map.on('zoom', () => {
            if (this.showMembers) {
                this.updateMemberDisplay(false);
            }
        });
    }

    initFullMap() {
        if (this.fullMap) return;
        
        this.fullMap = new maplibregl.Map({
            container: 'full-map',
            style: {
                version: 8,
                sources: {
                    'raster-tiles': {
                        type: 'raster',
                        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
                        tileSize: 256,
                        attribution: '© OpenStreetMap contributors'
                    }
                },
                layers: [
                    {
                        id: 'simple-tiles',
                        type: 'raster',
                        source: 'raster-tiles'
                    }
                ]
            },
            center: [136.881537, 35.170915],
            zoom: 14
        });

        this.fullMap.on('load', () => {
            this.addBuildingLayers(this.fullMap);
            // ③個人マーカーを復元
            this.restorePersonalMarkers();
        });

        // ズーム変更時にメンバー表示を更新
        this.fullMap.on('zoom', () => {
            if (this.showMembers) {
                this.updateMemberDisplay(true);
            }
        });
    }

    addBuildingLayers(map) {
        if (!this.buildingData) return;

        // 建物ポリゴンのデータを準備
        const buildingFeatures = this.buildingData.buildings.map((building, index) => ({
            type: 'Feature',
            properties: {
                id: building.id,
                name: building.name_ja,
                color: this.getBuildingColor(index)
            },
            geometry: {
                type: 'Polygon',
                coordinates: [building.polygon.map(point => [point.lng, point.lat])]
            }
        }));

        // 建物レイヤーのソースを追加
        map.addSource('buildings', {
            type: 'geojson',
            data: {
                type: 'FeatureCollection',
                features: buildingFeatures
            }
        });

        // 建物の塗りつぶしレイヤー
        map.addLayer({
            id: 'buildings-fill',
            type: 'fill',
            source: 'buildings',
            layout: {
                visibility: 'none'
            },
            paint: {
                'fill-color': ['get', 'color'],
                'fill-opacity': 0.3
            }
        });

        // 建物の境界線レイヤー
        map.addLayer({
            id: 'buildings-line',
            type: 'line',
            source: 'buildings',
            layout: {
                visibility: 'none'
            },
            paint: {
                'line-color': ['get', 'color'],
                'line-width': 2
            }
        });
    }

    getBuildingColor(index) {
        const colors = [
            '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
            '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
        ];
        return colors[index % colors.length];
    }

    getCurrentLocation() {
        if (!navigator.geolocation) {
            alert('お使いのブラウザは位置情報に対応していません。');
            return;
        }

        const locationBtn = document.getElementById('location-btn');
        locationBtn.textContent = '位置を取得中...';
        locationBtn.disabled = true;

        navigator.geolocation.getCurrentPosition(
            (position) => {
                this.currentLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                
                // ①GPSマーカーを表示
                this.addPersonalGPSMarker();
                
                // マップの中央を自分の位置に移動
                this.centerMapOnCurrentLocation();
                
                this.findNearestBuilding();
                locationBtn.textContent = '私はここにいる！';
                locationBtn.disabled = false;
            },
            (error) => {
                console.error('位置情報の取得に失敗しました:', error);
                alert('位置情報の取得に失敗しました。設定を確認してください。');
                locationBtn.textContent = '私はここにいる！';
                locationBtn.disabled = false;
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 300000
            }
        );
    }

    findNearestBuilding() {
        if (!this.currentLocation || !this.buildingData) return;

        const userPoint = [this.currentLocation.lng, this.currentLocation.lat];
        let foundBuilding = null;

        // まず、ユーザーが建物のポリゴン内にいるかチェック
        this.buildingData.buildings.forEach(building => {
            if (this.isPointInPolygon(userPoint, building.polygon)) {
                foundBuilding = building;
            }
        });

        if (foundBuilding) {
            // 建物内にいる場合は通常の建物選択UI
            this.selectedBuilding = foundBuilding;
            this.showBuildingResult();
        } else {
            // 建物内にいない場合は手動入力モード
            this.showManualLocationInput();
        }
    }

    isPointInPolygon(point, polygon) {
        const x = point[0];
        const y = point[1];
        let inside = false;

        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const xi = polygon[i].lng;
            const yi = polygon[i].lat;
            const xj = polygon[j].lng;
            const yj = polygon[j].lat;

            if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
                inside = !inside;
            }
        }

        return inside;
    }

    calculateDistanceToPolygon(point, polygon) {
        let minDistance = Infinity;
        
        for (let i = 0; i < polygon.length; i++) {
            const vertex = [polygon[i].lng, polygon[i].lat];
            const distance = this.calculateDistance(point, vertex);
            minDistance = Math.min(minDistance, distance);
        }
        
        return minDistance;
    }

    calculateDistance(point1, point2) {
        const R = 6371000; // 地球の半径（メートル）
        const lat1 = point1[1] * Math.PI / 180;
        const lat2 = point2[1] * Math.PI / 180;
        const deltaLat = (point2[1] - point1[1]) * Math.PI / 180;
        const deltaLng = (point2[0] - point1[0]) * Math.PI / 180;

        const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
                  Math.cos(lat1) * Math.cos(lat2) *
                  Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c;
    }

    showBuildingResult() {
        const locationResult = document.getElementById('location-result');
        const manualLocationInput = document.getElementById('manual-location-input');
        const buildingName = document.getElementById('building-name');
        
        // 手動入力を隠して建物選択を表示
        manualLocationInput.style.display = 'none';
        buildingName.textContent = this.selectedBuilding.name_ja;
        locationResult.style.display = 'block';
        
        this.showFloorSelection();
    }

    showManualLocationInput() {
        // 現在のスクリーンに応じて適切な要素を取得
        const isMapScreen = this.currentScreen === 'map';
        const buildingSelection = document.getElementById('building-selection');
        
        let manualLocationInput, manualLocationText, registerBtn, closeBtn;
        
        if (isMapScreen) {
            // マップ画面の場合
            manualLocationInput = document.getElementById('map-manual-location-input');
            manualLocationText = document.getElementById('map-manual-location-text');
            registerBtn = document.getElementById('map-register-manual-location-btn');
            closeBtn = document.getElementById('map-close-manual-input-btn');
        } else {
            // メイン画面の場合
            manualLocationInput = document.getElementById('manual-location-input');
            manualLocationText = document.getElementById('manual-location-text');
            registerBtn = document.getElementById('register-manual-location-btn');
        }
        
        // 建物選択を隠して手動入力を表示
        if (buildingSelection) {
            buildingSelection.style.display = 'none';
        }
        manualLocationInput.style.display = 'block';
        
        // 入力フィールドをクリア
        manualLocationText.value = '';
        
        // 手動登録ボタンのイベントリスナーを設定（重複を避けるため一度削除）
        registerBtn.replaceWith(registerBtn.cloneNode(true));
        const newRegisterBtn = isMapScreen ? 
            document.getElementById('map-register-manual-location-btn') : 
            document.getElementById('register-manual-location-btn');
        newRegisterBtn.addEventListener('click', () => {
            this.registerManualLocation();
        });
        
        // 閉じるボタンのイベントリスナーを設定（マップ画面のみ）
        if (closeBtn) {
            closeBtn.replaceWith(closeBtn.cloneNode(true));
            document.getElementById('map-close-manual-input-btn').addEventListener('click', () => {
                this.closeManualLocationInput();
            });
        }
        
        // Enterキーでの登録機能を追加
        manualLocationText.replaceWith(manualLocationText.cloneNode(true));
        const newManualLocationText = isMapScreen ? 
            document.getElementById('map-manual-location-text') : 
            document.getElementById('manual-location-text');
        newManualLocationText.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && newManualLocationText.value.trim() !== '') {
                e.preventDefault();
                this.registerManualLocation();
            }
        });
        
        // 自動スクロールと自動フォーカス
        setTimeout(() => {
            // 手動入力欄が見えるようにスクロール
            manualLocationInput.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center'
            });
            
            // 入力フィールドにフォーカス
            newManualLocationText.focus();
        }, 100);
    }

    closeManualLocationInput() {
        // 現在のスクリーンに応じて適切な要素を取得
        const isMapScreen = this.currentScreen === 'map';
        const buildingSelection = document.getElementById('building-selection');
        
        let manualLocationInput, manualLocationText;
        
        if (isMapScreen) {
            // マップ画面の場合
            manualLocationInput = document.getElementById('map-manual-location-input');
            manualLocationText = document.getElementById('map-manual-location-text');
        } else {
            // メイン画面の場合
            manualLocationInput = document.getElementById('manual-location-input');
            manualLocationText = document.getElementById('manual-location-text');
        }
        
        // 手動入力を隠す
        manualLocationInput.style.display = 'none';
        
        // 入力フィールドをクリア
        manualLocationText.value = '';
        
        // 建物選択は非表示のまま（GPSで建物が見つからなかった状態を維持）
    }

    showFloorSelection() {
        const floorSelection = document.getElementById('floor-selection');
        const floorButtons = document.getElementById('floor-buttons');
        
        floorButtons.innerHTML = '';
        
        this.selectedBuilding.floors.forEach(floor => {
            const button = document.createElement('button');
            button.className = 'floor-btn';
            button.textContent = floor.label;
            button.addEventListener('click', () => {
                document.querySelectorAll('.floor-btn').forEach(btn => btn.classList.remove('selected'));
                button.classList.add('selected');
                this.selectedFloor = floor;
                this.showRoomSelection();
            });
            floorButtons.appendChild(button);
        });
        
        floorSelection.style.display = 'block';
    }

    showRoomSelection() {
        const roomSelection = document.getElementById('room-selection');
        const roomList = document.getElementById('room-list');
        
        roomList.innerHTML = '';
        
        // 現在位置から50m以内の部屋を取得
        const nearbyRooms = this.selectedFloor.rooms.filter(room => {
            const roomCenter = this.calculatePolygonCenter(room.polygon);
            const distance = this.calculateDistance(
                [this.currentLocation.lng, this.currentLocation.lat],
                [roomCenter.lng, roomCenter.lat]
            );
            return distance <= 50; // 50m以内
        });

        // 距離順にソート
        nearbyRooms.sort((a, b) => {
            const centerA = this.calculatePolygonCenter(a.polygon);
            const centerB = this.calculatePolygonCenter(b.polygon);
            const distanceA = this.calculateDistance(
                [this.currentLocation.lng, this.currentLocation.lat],
                [centerA.lng, centerA.lat]
            );
            const distanceB = this.calculateDistance(
                [this.currentLocation.lng, this.currentLocation.lat],
                [centerB.lng, centerB.lat]
            );
            return distanceA - distanceB;
        });

        nearbyRooms.forEach(room => {
            const roomItem = document.createElement('div');
            roomItem.className = 'room-item';
            
            const center = this.calculatePolygonCenter(room.polygon);
            const distance = this.calculateDistance(
                [this.currentLocation.lng, this.currentLocation.lat],
                [center.lng, center.lat]
            );
            
            roomItem.innerHTML = `
                <div class="room-name">${room.name_ja}</div>
                <div class="room-usage">${room.usage}</div>
                <div class="room-distance">距離: ${Math.round(distance)}m</div>
            `;
            
            roomItem.addEventListener('click', () => {
                document.querySelectorAll('.room-item').forEach(item => item.classList.remove('selected'));
                roomItem.classList.add('selected');
                this.selectedRoom = room;
                document.getElementById('register-location-btn').style.display = 'block';
            });
            
            roomList.appendChild(roomItem);
        });
        
        roomSelection.style.display = 'block';
    }

    calculatePolygonCenter(polygon) {
        let centerLat = 0;
        let centerLng = 0;
        
        polygon.forEach(point => {
            centerLat += point.lat;
            centerLng += point.lng;
        });
        
        return {
            lat: centerLat / polygon.length,
            lng: centerLng / polygon.length
        };
    }

    registerLocation() {
        if (!this.currentUser || !this.selectedBuilding || !this.selectedFloor || !this.selectedRoom) {
            alert('必要な情報が不足しています。');
            return;
        }

        const locationData = {
            userId: this.currentUser.id,
            username: this.currentUser.username,
            buildingId: this.selectedBuilding.id,
            buildingName: this.selectedBuilding.name_ja,
            floorLabel: this.selectedFloor.label,
            roomId: this.selectedRoom.id,
            roomName: this.selectedRoom.name_ja,
            coordinates: this.currentLocation,
            timestamp: new Date().toISOString(),
            isManual: false
        };

        // キャッシュに保存
        localStorage.setItem('watakoko_location', JSON.stringify(locationData));
        
        // ②登録位置マーカーを表示
        this.addPersonalRegisteredMarker();
        
        alert(`位置を登録しました！\n${this.selectedBuilding.name_ja} ${this.selectedFloor.label} ${this.selectedRoom.name_ja}`);
    }

    registerManualLocation() {
        // 現在のスクリーンに応じて適切な要素を取得
        const isMapScreen = this.currentScreen === 'map';
        const manualLocationText = isMapScreen ? 
            document.getElementById('map-manual-location-text') : 
            document.getElementById('manual-location-text');
        const locationName = manualLocationText.value.trim();
        
        if (!this.currentUser) {
            alert('ユーザー情報が不足しています。');
            return;
        }
        
        if (!locationName) {
            alert('場所名を入力してください。');
            manualLocationText.focus();
            return;
        }

        const locationData = {
            userId: this.currentUser.id,
            username: this.currentUser.username,
            buildingId: null,
            buildingName: null,
            floorLabel: null,
            roomId: null,
            roomName: locationName,
            coordinates: null, // GPSマーカーは登録しない
            timestamp: new Date().toISOString(),
            isManual: true,
            manualLocationName: locationName
        };

        // キャッシュに保存
        localStorage.setItem('watakoko_location', JSON.stringify(locationData));
        
        // 手動入力の場合はGPSマーカーは追加しないが、登録位置マーカーは追加
        this.addPersonalRegisteredMarker();
        
        alert(`手動で位置を登録しました！\n場所: ${locationName}\n\n※GPSマーカーは秘密保持のため登録されません。`);
        
        // 登録後は入力フィールドをクリアするが、フィールド自体は表示したままにする
        manualLocationText.value = '';
        manualLocationText.focus();
    }

    addLocationPins() {
        if (!this.map || !this.currentLocation || !this.selectedRoom) return;

        // GPS位置のピン（緑）
        const gpsMarker = new maplibregl.Marker({ color: '#00FF00' })
            .setLngLat([this.currentLocation.lng, this.currentLocation.lat])
            .addTo(this.map);

        // 選択した部屋の中心のピン（青）
        const roomCenter = this.calculatePolygonCenter(this.selectedRoom.polygon);
        const roomMarker = new maplibregl.Marker({ color: '#0000FF' })
            .setLngLat([roomCenter.lng, roomCenter.lat])
            .addTo(this.map);

        // マップの表示範囲を調整
        const bounds = new maplibregl.LngLatBounds();
        bounds.extend([this.currentLocation.lng, this.currentLocation.lat]);
        bounds.extend([roomCenter.lng, roomCenter.lat]);
        this.map.fitBounds(bounds, { padding: 50 });
    }

    // マップの中央を現在位置に移動
    centerMapOnCurrentLocation() {
        if (!this.currentLocation) return;

        const coordinates = [this.currentLocation.lng, this.currentLocation.lat];

        // メインマップの中央を移動
        if (this.map) {
            this.map.flyTo({
                center: coordinates,
                zoom: 16, // 建物詳細が見えるズームレベル
                duration: 2000 // 2秒でアニメーション
            });
        }

        // フルマップの中央を移動
        if (this.fullMap) {
            this.fullMap.flyTo({
                center: coordinates,
                zoom: 16,
                duration: 2000
            });
        }
    }

    // ①GPSマーカーを表示
    addPersonalGPSMarker() {
        if (!this.currentLocation) return;

        // 既存のGPSマーカーを削除
        this.removePersonalGPSMarker();

        // メインマップにGPSマーカーを追加
        if (this.map) {
            const gpsMarkerEl = this.createPersonalMarkerElement(false);
            this.personalMarkers.gps = new maplibregl.Marker(gpsMarkerEl)
            .setLngLat([this.currentLocation.lng, this.currentLocation.lat])
            .addTo(this.map);
        }

        // フルマップにもGPSマーカーを追加
        if (this.fullMap) {
            const gpsMarkerElFull = this.createPersonalMarkerElement(false);
            this.personalMarkersFullMap.gps = new maplibregl.Marker(gpsMarkerElFull)
            .setLngLat([this.currentLocation.lng, this.currentLocation.lat])
            .addTo(this.fullMap);
        }
    }

    // 個人マーカー要素を作成（ユーザーアイコン付き）
    createPersonalMarkerElement(isRegistered = false) {
        const el = document.createElement('div');
        el.className = isRegistered ? 'personal-registered-marker' : 'personal-gps-marker';
        
        // マーカーのベース色（GPS: 赤、登録位置: 青）
        const baseColor = isRegistered ? '#0066FF' : '#FF0000';
        const borderColor = isRegistered ? '#004499' : '#CC0000';
        
        el.style.cssText = `
            width: 50px;
            height: 50px;
            border-radius: 50%;
            background-color: ${baseColor};
            border: 4px solid ${borderColor};
            box-shadow: 0 4px 12px rgba(0,0,0,0.4);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
            overflow: hidden;
            transition: all 0.3s ease;
        `;

        // ユーザーアイコンを取得して表示
        if (this.currentUser) {
            try {
                const iconUrl = this.getUserIcon();
                
                // アイコンが利用可能な場合
                if (iconUrl && iconUrl !== 'icons/default.png') {
                    const iconImg = document.createElement('img');
                    iconImg.style.cssText = `
                        width: 38px;
                        height: 38px;
                        border-radius: 50%;
                        object-fit: cover;
                        background-color: white;
                        border: 2px solid white;
                    `;
                    
                    iconImg.src = iconUrl;
                    iconImg.alt = this.currentUser.username;
                    
                    // 画像読み込み成功時
                    iconImg.onload = () => {
                        // 既存のフォールバックテキストがあれば削除
                        const existingText = el.querySelector('.fallback-text');
                        if (existingText) {
                            existingText.remove();
                        }
                    };
                    
                    // 画像読み込みエラー時のフォールバック
                    iconImg.onerror = () => {
                        iconImg.style.display = 'none';
                        this.addFallbackText(el, this.currentUser.username.charAt(0));
                    };
                    
                    el.appendChild(iconImg);
                    
                    // 初期フォールバックテキストも追加（画像読み込み中に表示）
                    this.addFallbackText(el, this.currentUser.username.charAt(0));
                } else {
                    // アイコンがない場合は直接フォールバックテキスト
                    this.addFallbackText(el, this.currentUser.username.charAt(0));
                }
            } catch (error) {
                console.error('アイコン読み込みエラー:', error);
                this.addFallbackText(el, this.currentUser.username.charAt(0));
            }
        } else {
            // ユーザー情報がない場合のフォールバック
            this.addFallbackText(el, '?');
        }

        // ホバー効果
        el.addEventListener('mouseenter', () => {
            el.style.transform = 'scale(1.1)';
            el.style.boxShadow = '0 6px 16px rgba(0,0,0,0.5)';
        });

        el.addEventListener('mouseleave', () => {
            el.style.transform = 'scale(1)';
            el.style.boxShadow = '0 4px 12px rgba(0,0,0,0.4)';
        });

        return el;
    }

    // フォールバックテキストを追加するヘルパーメソッド
    addFallbackText(parentEl, text) {
        const fallbackText = document.createElement('div');
        fallbackText.className = 'fallback-text';
        fallbackText.textContent = text;
        fallbackText.style.cssText = `
            font-size: 20px;
            font-weight: bold;
            color: white;
            text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
        `;
        parentEl.appendChild(fallbackText);
    }

    // ②登録位置マーカーを表示
    addPersonalRegisteredMarker() {
        // 保存されている位置データを確認
        const savedLocation = localStorage.getItem('watakoko_location');
        if (!savedLocation) return;
        
        const locationData = JSON.parse(savedLocation);
        
        // 既存の登録位置マーカーを削除
        this.removePersonalRegisteredMarker();

        let coordinates;
        
        if (locationData.isManual) {
            // 手動入力の場合は現在のGPS位置を使用（GPSマーカーは表示しないが座標は使用）
            if (!this.currentLocation) return;
            coordinates = [this.currentLocation.lng, this.currentLocation.lat];
        } else if (this.selectedRoom) {
            // 通常の部屋選択の場合は部屋の中心座標を使用
            const roomCenter = this.calculatePolygonCenter(this.selectedRoom.polygon);
            coordinates = [roomCenter.lng, roomCenter.lat];
        } else {
            return;
        }

        // メインマップに登録位置マーカーを追加
        if (this.map) {
            const registeredMarkerEl = this.createPersonalMarkerElement(true);
            this.personalMarkers.registered = new maplibregl.Marker(registeredMarkerEl)
            .setLngLat(coordinates)
            .addTo(this.map);
        }

        // フルマップにも登録位置マーカーを追加
        if (this.fullMap) {
            const registeredMarkerElFull = this.createPersonalMarkerElement(true);
            this.personalMarkersFullMap.registered = new maplibregl.Marker(registeredMarkerElFull)
            .setLngLat(coordinates)
            .addTo(this.fullMap);
        }
    }

    // GPSマーカーを削除
    removePersonalGPSMarker() {
        if (this.personalMarkers.gps) {
            this.personalMarkers.gps.remove();
            this.personalMarkers.gps = null;
        }
        if (this.personalMarkersFullMap.gps) {
            this.personalMarkersFullMap.gps.remove();
            this.personalMarkersFullMap.gps = null;
        }
    }

    // 登録位置マーカーを削除
    removePersonalRegisteredMarker() {
        if (this.personalMarkers.registered) {
            this.personalMarkers.registered.remove();
            this.personalMarkers.registered = null;
        }
        if (this.personalMarkersFullMap.registered) {
            this.personalMarkersFullMap.registered.remove();
            this.personalMarkersFullMap.registered = null;
        }
    }

    // ③個人マーカーを復元（画面切り替え時）
    restorePersonalMarkers() {
        // 保存された位置情報を読み込み
        const savedLocation = localStorage.getItem('watakoko_location');
        if (savedLocation) {
            const locationData = JSON.parse(savedLocation);
            
            // GPSマーカーの復元（手動入力でない場合のみ）
            if (locationData.coordinates && !locationData.isManual) {
                this.currentLocation = locationData.coordinates;
                this.addPersonalGPSMarker();
            }
            
            // 登録位置マーカーの復元（建物/部屋情報がある場合のみ）
            if (locationData.buildingId && locationData.roomId && this.buildingData) {
                // 建物と部屋を特定
                const building = this.buildingData.buildings.find(b => b.id === locationData.buildingId);
                if (building) {
                    const floor = building.floors.find(f => f.label === locationData.floorLabel);
                    if (floor) {
                        const room = floor.rooms.find(r => r.id === locationData.roomId);
                        if (room) {
                            this.selectedBuilding = building;
                            this.selectedFloor = floor;
                            this.selectedRoom = room;
                            this.addPersonalRegisteredMarker();
                        }
                    }
                }
            }
        }
    }

    toggleBuildingDisplay(isFullMap = false) {
        const map = isFullMap ? this.fullMap : this.map;
        const btn = isFullMap ? 
            document.getElementById('map-toggle-buildings-btn') : 
            document.getElementById('toggle-buildings-btn');

        if (!map) return;

        this.showBuildings = !this.showBuildings;
        
        const visibility = this.showBuildings ? 'visible' : 'none';
        map.setLayoutProperty('buildings-fill', 'visibility', visibility);
        map.setLayoutProperty('buildings-line', 'visibility', visibility);
        
        btn.textContent = this.showBuildings ? '建物範囲非表示' : '建物範囲表示';
        btn.classList.toggle('active', this.showBuildings);
    }

    toggleMembersDisplay(isFullMap = false) {
        const map = isFullMap ? this.fullMap : this.map;
        const btn = isFullMap ? 
            document.getElementById('map-toggle-members-btn') : 
            document.getElementById('toggle-members-btn');
        const filter = isFullMap ? 
            document.getElementById('map-group-filter') : 
            document.getElementById('group-filter');

        if (!map) return;

        this.showMembers = !this.showMembers;
        
        btn.textContent = this.showMembers ? '自分のみ表示' : 'みんどこ？';
        btn.classList.toggle('active', this.showMembers);
        filter.style.display = this.showMembers ? 'block' : 'none';
        
        if (this.showMembers) {
            this.updateMemberDisplay(isFullMap);
        } else {
            this.clearMemberDisplay(isFullMap);
        }
    }

    updateMemberDisplay(isFullMap = false) {
        const map = isFullMap ? this.fullMap : this.map;
        if (!map || !this.membersData) return;

        this.clearMemberDisplay(isFullMap);

        const now = new Date();
        const filteredMembers = this.membersData.members.filter(member => {
            if (this.currentGroupFilter === 'all') return true;
            return member.groups.includes(this.currentGroupFilter);
        });

        const currentZoom = map.getZoom();
        
        console.log('現在のズームレベル:', currentZoom); // デバッグ用
        console.log('フィルター後のメンバー数:', filteredMembers.length);
        
        // ズームレベルに応じた表示切り替え
        // ズーム 0-8: 県全体レベル（クラスター表示）
        // ズーム 9-12: 市全体レベル（クラスター表示）  
        // ズーム 13-15: 地区レベル（クラスター表示）
        // ズーム 16以上: 建物詳細レベル（個別ピン表示）
        const clusterThreshold = 16;

        if (currentZoom >= clusterThreshold) {
            // 高ズームレベル：個別ピン表示
            this.displayIndividualPins(map, filteredMembers, now);
        } else {
            // 低ズームレベル：クラスター表示
            this.displayClusteredPins(map, filteredMembers, now);
        }
    }

    displayIndividualPins(map, members, now) {
        members.forEach(member => {
            const timestamp = new Date(member.location.timestamp);
            const hoursDiff = (now - timestamp) / (1000 * 60 * 60);
            
            let opacity = 1;
            let color = '#FF0000';
            
            // ステータスによる色分け
            switch(member.status) {
                case '在席':
                    color = '#00FF00';
                    break;
                case '離席':
                    color = '#FFFF00';
                    break;
                case '移動中':
                    color = '#FFA500';
                    break;
                case '退室済':
                    color = '#808080';
                    break;
            }
            
            // 時間による透明度調整
            if (hoursDiff > 24) {
                opacity = 0.3;
            } else if (hoursDiff > 1) {
                opacity = 0.6;
            }

            // マーカーの作成
            const el = document.createElement('div');
            el.className = 'member-marker';
            el.style.cssText = `
                width: 40px;
                height: 40px;
                border-radius: 50%;
                background-color: ${color};
                opacity: ${opacity};
                border: 3px solid white;
                box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 12px;
                font-weight: bold;
                color: white;
                transition: all 0.3s ease;
            `;
            
            // アイコンまたはイニシャル
            if (member.iconUrl && member.iconUrl !== 'icons/default.png') {
                el.style.backgroundImage = `url(${member.iconUrl})`;
                el.style.backgroundSize = 'cover';
                el.style.backgroundPosition = 'center';
            } else {
                el.textContent = member.username.charAt(0);
            }

            const coordinates = [
                member.location.coordinates.lng + (member.location.display_offset.x * 0.00001),
                member.location.coordinates.lat + (member.location.display_offset.y * 0.00001)
            ];

            const marker = new maplibregl.Marker(el)
                .setLngLat(coordinates)
                .addTo(map);

            // クリックイベント
            el.addEventListener('click', () => {
                this.showMemberPopup(member);
            });

            // マーカーを記録（後で削除するため）
            if (!map._memberMarkers) map._memberMarkers = [];
            map._memberMarkers.push(marker);
        });
    }

    displayClusteredPins(map, members, now) {
        const currentZoom = map.getZoom();
        const clusters = {};
        
        console.log('クラスタリング開始 - メンバー数:', members.length);
        
        members.forEach(member => {
            let key;
            // ズームレベルによってクラスタリングの粒度を変更
            if (currentZoom < 12) {
                // 低ズーム：建物レベルでクラスタリング
                key = member.location.building_id;
            } else {
                // 中ズーム：部屋レベルでクラスタリング
                key = `${member.location.building_id}_${member.location.floor_label}_${member.location.room_id}`;
            }
            
            console.log(`メンバー ${member.username}: キー=${key}`);
            
            if (!clusters[key]) {
                clusters[key] = {
                    members: [],
                    coordinates: member.location.coordinates,
                    building_id: member.location.building_id,
                    floor_label: member.location.floor_label,
                    room_id: member.location.room_id,
                    isBuilding: currentZoom < 12
                };
            }
            clusters[key].members.push(member);
        });
        
        console.log('作成されたクラスター:', Object.keys(clusters).length);
        Object.entries(clusters).forEach(([key, cluster]) => {
            console.log(`クラスター ${key}: ${cluster.members.length}名`);
        });

        // クラスターマーカーを作成
        Object.values(clusters).forEach(cluster => {
            const memberCount = cluster.members.length;
            
            console.log(`クラスター処理: ${memberCount}名のクラスター`);
            
            if (memberCount === 1) {
                // 1人の場合は個別ピンとして表示
                console.log('1名のため個別ピン表示');
                this.displayIndividualPins(map, cluster.members, now);
                return;
            }

            // 複数人の場合はクラスターマーカーを作成
            console.log(`${memberCount}名のクラスターマーカーを作成`);
            const el = document.createElement('div');
            el.className = 'cluster-marker';
            
            // 人数表示（99以上は99+）
            const displayCount = memberCount > 99 ? '99+' : memberCount.toString();
            console.log(`表示する人数: ${displayCount}`);
            
            // シンプルな円形背景で数字を表示
            el.style.cssText = `
                width: 50px;
                height: 50px;
                border-radius: 50%;
                background-color: #FFD700;
                border: 3px solid #9ACD32;
                box-shadow: 0 4px 8px rgba(0,0,0,0.3);
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.3s ease;
                position: relative;
                font-size: ${memberCount > 99 ? '12px' : '16px'};
                font-weight: 900;
                color: #000;
                font-family: Arial, sans-serif;
                line-height: 1;
                text-align: center;
            `;
            
            // 人数をテキストとして設定
            el.textContent = displayCount;
            console.log(`クラスターマーカーのテキスト設定: "${displayCount}" (要素内容: "${el.textContent}")`);

            // デバッグ用：要素の内容を確認
            console.log(`クラスターマーカー作成完了:`, {
                textContent: el.textContent,
                innerHTML: el.innerHTML,
                memberCount: memberCount,
                displayCount: displayCount,
                className: el.className
            });

            // ホバー効果
            el.addEventListener('mouseenter', () => {
                el.style.transform = 'scale(1.1)';
                el.style.boxShadow = '0 6px 12px rgba(0,0,0,0.4)';
            });

            el.addEventListener('mouseleave', () => {
                el.style.transform = 'scale(1)';
                el.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
            });

            const marker = new maplibregl.Marker(el)
                .setLngLat([cluster.coordinates.lng, cluster.coordinates.lat])
                .addTo(map);

            console.log(`マーカー追加完了: 座標 [${cluster.coordinates.lng}, ${cluster.coordinates.lat}]`);

            // クリックイベント：クラスター詳細を表示
            el.addEventListener('click', () => {
                this.showClusterPopup(cluster);
            });

            // マーカーを記録（後で削除するため）
            if (!map._memberMarkers) map._memberMarkers = [];
            map._memberMarkers.push(marker);
        });
    }

    showClusterPopup(cluster) {
        const popup = document.getElementById('member-popup');
        const popupContent = popup.querySelector('.popup-content');
        
        // 建物と部屋の情報を取得
        const building = this.buildingData.buildings.find(b => b.id === cluster.building_id);
        const floor = building ? building.floors.find(f => f.label === cluster.floor_label) : null;
        const room = floor ? floor.rooms.find(r => r.id === cluster.room_id) : null;

        // クラスター用のポップアップ内容を作成
        let locationText;
        let statusText;
        
        if (cluster.isBuilding) {
            // 建物レベルクラスター
            locationText = building ? building.name_ja : '不明';
            statusText = `${cluster.members.length}名が在館中`;
        } else {
            // 部屋レベルクラスター
            locationText = `${building ? building.name_ja : '不明'} ${cluster.floor_label} ${room ? room.name_ja : '不明'}`;
            statusText = `${cluster.members.length}名が在室中`;
        }
        
        const clusterContent = `
            <button class="popup-close">&times;</button>
            <div class="cluster-info">
                <h3>${locationText}</h3>
                <p class="member-count">${statusText}</p>
                <div class="cluster-members">
                    ${cluster.members.map(member => {
                        // 建物レベルの場合は部屋情報も表示
                        const memberBuilding = this.buildingData.buildings.find(b => b.id === member.location.building_id);
                        const memberFloor = memberBuilding ? memberBuilding.floors.find(f => f.label === member.location.floor_label) : null;
                        const memberRoom = memberFloor ? memberFloor.rooms.find(r => r.id === member.location.room_id) : null;
                        const roomInfo = cluster.isBuilding ? 
                            `<span class="member-room">${member.location.floor_label} ${memberRoom ? memberRoom.name_ja : '不明'}</span>` : '';
                        
                        return `
                            <div class="cluster-member-item" data-member-id="${member.id}">
                                <img src="${member.iconUrl || 'icons/default.png'}" alt="${member.username}" class="cluster-member-icon">
                                <div class="cluster-member-info">
                                    <span class="cluster-member-name">${member.username}</span>
                                    ${roomInfo}
                                    <span class="cluster-member-status status-${member.status}">${member.status}</span>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;

        popupContent.innerHTML = clusterContent;
        popup.style.display = 'block';

        // 個別メンバークリックイベント
        const memberItems = popupContent.querySelectorAll('.cluster-member-item');
        memberItems.forEach(item => {
            item.addEventListener('click', () => {
                const memberId = item.dataset.memberId;
                const member = cluster.members.find(m => m.id === memberId);
                if (member) {
                    popup.style.display = 'none';
                    this.showMemberPopup(member);
                }
            });
        });

        // 閉じるボタン
        const closeBtn = popupContent.querySelector('.popup-close');
        closeBtn.addEventListener('click', () => {
            popup.style.display = 'none';
        });

        // ポップアップ外クリックで閉じる
        popup.addEventListener('click', (e) => {
            if (e.target === popup) {
                popup.style.display = 'none';
            }
        });
    }

    clearMemberDisplay(isFullMap = false) {
        const map = isFullMap ? this.fullMap : this.map;
        if (!map || !map._memberMarkers) return;

        map._memberMarkers.forEach(marker => marker.remove());
        map._memberMarkers = [];
    }

    showMemberPopup(member) {
        const popup = document.getElementById('member-popup');
        const popupIcon = document.getElementById('popup-icon');
        const popupUsername = document.getElementById('popup-username');
        const popupStatus = document.getElementById('popup-status');
        const popupLocation = document.getElementById('popup-location');
        const popupNote = document.getElementById('popup-note');
        const popupTimestamp = document.getElementById('popup-timestamp');
        const closeBtn = document.querySelector('.popup-close');

        // 建物と部屋の情報を取得
        const building = this.buildingData.buildings.find(b => b.id === member.location.building_id);
        const floor = building ? building.floors.find(f => f.label === member.location.floor_label) : null;
        const room = floor ? floor.rooms.find(r => r.id === member.location.room_id) : null;

        popupIcon.src = member.iconUrl || 'icons/default.png';
        popupUsername.textContent = member.username;
        popupStatus.textContent = `ステータス: ${member.status}`;
        popupLocation.textContent = `場所: ${building ? building.name_ja : '不明'} ${member.location.floor_label} ${room ? room.name_ja : '不明'}`;
        popupNote.textContent = `メモ: ${member.note || 'なし'}`;
        
        const timestamp = new Date(member.location.timestamp);
        popupTimestamp.textContent = `更新: ${timestamp.toLocaleString('ja-JP')}`;

        popup.style.display = 'block';

        closeBtn.addEventListener('click', () => {
            popup.style.display = 'none';
        });

        // ポップアップ外クリックで閉じる
        popup.addEventListener('click', (e) => {
            if (e.target === popup) {
                popup.style.display = 'none';
            }
        });
    }
}

// アプリケーション初期化
document.addEventListener('DOMContentLoaded', () => {
    new WatakokoApp();
});