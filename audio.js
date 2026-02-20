const sounds = {};
let bgm = null; // BGM을 위한 별도의 Audio 객체
let currentTrackName = null; // 현재 재생 중인 BGM 트랙 이름

let bgmNeedsResume = false; // BGM 자동 재생이 차단되었는지 확인하는 플래그
// --- BGM 플레이리스트 관리 ---
const mainThemePlaylist = []; // 메인 BGM 트랙 키들을 담는 배열
let currentPlaylistIndex = 0; // 현재 재생 중인 플레이리스트 인덱스

// --- 볼륨 상태 관리 ---
// localStorage에서 설정을 불러오고, 없으면 true(켜짐)로 기본 설정합니다.
let isBgmEnabled = localStorage.getItem('isBgmEnabled') !== 'false';
let isSfxEnabled = localStorage.getItem('isSfxEnabled') !== 'false';

/**
 * 배경음악(BGM)을 켜고 끄는 함수
 */
function toggleBgm() {
    isBgmEnabled = !isBgmEnabled;
    localStorage.setItem('isBgmEnabled', isBgmEnabled);
    updateVolumeButtons(); // UI 버튼 상태 업데이트

    if (isBgmEnabled) {
        // BGM이 켜졌을 때, 현재 화면에 맞는 BGM을 재생합니다.
        const isGameRunning = document.getElementById('game-wrapper').style.display !== 'none';
        if (isGameRunning) {
            const isBossFloor = typeof floor !== 'undefined' && floor % 10 === 0;
            playBGM(isBossFloor ? 'boss-theme' : 'main-theme');
        } else {
            playBGM('main-theme');
        }
    } else {
        stopBGM();
    }
}

/**
 * 효과음(SFX)을 켜고 끄는 함수
 */
function toggleSfx() {
    isSfxEnabled = !isSfxEnabled;
    localStorage.setItem('isSfxEnabled', isSfxEnabled);
    updateVolumeButtons(); // UI 버튼 상태 업데이트
    if (isSfxEnabled) {
        playSound('click', 0.5); // 켜졌음을 알리는 효과음 재생
    }
}

/**
 * 사용자의 첫 상호작용 시, 자동 재생이 막혔던 BGM을 다시 재생 시도합니다.
 */
function tryResumeBGM() {
    // BGM이 활성화 상태이고, 재시도가 필요하며, 현재 BGM이 없거나 정지 상태일 때
    if (isBgmEnabled && bgmNeedsResume && (!bgm || bgm.paused)) {
        console.log("사용자 상호작용으로 BGM 재생을 다시 시도합니다.");
        bgmNeedsResume = false; // 플래그를 먼저 리셋하여 중복 실행 방지

        // 현재 화면 상태에 맞는 BGM을 재생
        const isGameRunning = document.getElementById('game-wrapper').style.display !== 'none';
        if (isGameRunning) {
            const isBossFloor = typeof floor !== 'undefined' && floor % 10 === 0;
            playBGM(isBossFloor ? 'boss-theme' : 'main-theme');
        } else {
            playBGM('main-theme');
        }
    }
}

/**
 * 메인 BGM 플레이리스트에서 다음 곡을 재생하는 함수
 */
function playNextMainTheme() {
    if (!isBgmEnabled || mainThemePlaylist.length === 0) return;

    // 현재 재생 중인 곡의 'ended' 이벤트 리스너를 제거합니다.
    if (bgm) {
        bgm.removeEventListener('ended', playNextMainTheme);
    }

    // 다음 곡 인덱스로 이동
    currentPlaylistIndex = (currentPlaylistIndex + 1) % mainThemePlaylist.length;
    const nextTrackKey = mainThemePlaylist[currentPlaylistIndex];

    bgm = sounds[nextTrackKey];
    bgm.loop = false; // 플레이리스트의 각 곡은 반복하지 않습니다.
    bgm.volume = 0.3; // BGM 볼륨
    bgm.currentTime = 0;
    const playPromise = bgm.play();
    if (playPromise !== undefined) {
        playPromise.catch(error => {
            console.error("BGM 재생 실패:", error.name, error.message);
            if (error.name === 'NotAllowedError') {
                console.log("자동 재생이 차단되었습니다. 사용자 상호작용 시 재시도합니다.");
                bgmNeedsResume = true;
            }
        });
    }

    // 새로 재생하는 곡이 끝나면 다시 이 함수가 호출되도록 이벤트 리스너를 추가합니다.
    bgm.addEventListener('ended', playNextMainTheme);

    currentTrackName = nextTrackKey;
}

/**
 * 게임에 필요한 모든 사운드 파일을 미리 로드합니다.
 */
function loadSounds() {
    const soundFiles = {
        attack: 'assets/sounds/attack.wav',             // 플레이어 공격 시
        hit: 'assets/sounds/hit.wav',                   // 플레이어 피격 시
        crit: 'assets/sounds/crit.wav',                 // 치명타 공격 시
        'black-flash': 'assets/sounds/black-flash.wav', // 흑섬 발동 시
        'level-up': 'assets/sounds/level-up.wav',       // 레벨업 시
        win: 'assets/sounds/win.wav',                   // 전투 승리 시
        'game-over': 'assets/sounds/game-over.wav',     // 게임 오버 시
        buy: 'assets/sounds/buy.wav',                   // 상점에서 아이템 구매 시
        heal: 'assets/sounds/heal.wav',                 // 물약 사용(회복/버프) 시
        'monster-die': 'assets/sounds/monster-die.wav', // 몬스터 사망 시
        click: 'assets/sounds/click.wav',               // UI 버튼 클릭 시
        'boss-appear': 'assets/sounds/boss-appear.wav', // 보스 등장 시
        'boss-theme': 'assets/sounds/bgm-boss.mp3',     // 보스전 배경음악
        // 여러 개의 메인 BGM을 등록합니다.
        'main-theme-1': 'assets/sounds/bgm-main-1.mp3',
        'main-theme-2': 'assets/sounds/bgm-main-2.mp3',
        'main-theme-3': 'assets/sounds/bgm-main-3.mp3',
    };

    // 모든 사운드 객체를 먼저 생성합니다.
    Object.keys(soundFiles).forEach(key => {
        sounds[key] = new Audio(soundFiles[key]);
        sounds[key].preload = 'auto';
        if (key.startsWith('main-theme-')) {
            mainThemePlaylist.push(key);
        }
    });

    // 플레이리스트를 섞습니다.
    mainThemePlaylist.sort(() => Math.random() - 0.5);

    return new Promise((resolve) => {
        if (mainThemePlaylist.length === 0) {
            console.log("메인 BGM이 없습니다.");
            resolve(); // BGM이 없으면 바로 진행
            return;
        }
    
        const firstTrack = sounds[mainThemePlaylist[0]];

        // readyState 3: HAVE_FUTURE_DATA, 4: HAVE_ENOUGH_DATA
        // 이미 데이터가 충분히 로드된 경우 (캐시 등) 즉시 resolve
        if (firstTrack.readyState >= 3) {
            console.log("초기 BGM이 이미 캐시되어 있습니다. 재생을 시작합니다.");
            resolve();
            return;
        }

        // 아직 로드되지 않은 경우, 'loadeddata' 이벤트를 기다립니다.
        // 'loadeddata'는 재생을 시작하기에 충분한 데이터가 로드되었을 때 발생합니다.
        firstTrack.addEventListener('loadeddata', () => {
            console.log("초기 BGM 로드 완료. 재생을 시작합니다.");
            resolve();
        }, { once: true });

        firstTrack.addEventListener('error', () => {
            console.error("초기 BGM 로드에 실패했습니다.");
            resolve(); // 오류가 나도 앱이 멈추지 않도록 resolve
        }, { once: true });
    });
}

function playSound(soundName, volume = 0.7) {
    if (!isSfxEnabled) return; // 효과음이 꺼져있으면 재생하지 않음
    if (sounds[soundName]) {
        sounds[soundName].currentTime = 0;
        sounds[soundName].volume = volume;
        sounds[soundName].play().catch(error => { /* Autoplay policy might block the sound, can be ignored. */ });
    }
}

/**
 * 배경음악(BGM)을 재생하는 함수
 * @param {string} trackName - 재생할 BGM 트랙의 키 ('main-theme', 'boss-theme')
 * @param {number} [volume=0.3] - BGM 볼륨
 */
function playBGM(trackName, volume = 0.3) {
    if (!isBgmEnabled) return; // BGM이 꺼져있으면 재생하지 않음

    // 'main-theme' 재생 요청 시
    if (trackName === 'main-theme') {
        // 이미 메인 테마가 '재생 중'이면 아무것도 하지 않습니다. (일시정지 상태는 제외)
        if (currentTrackName && currentTrackName.startsWith('main-theme-') && bgm && !bgm.paused) {
            return;
        }
        // 다른 BGM(예: 보스 테마)이 재생 중이었다면 정지하고 리스너를 제거합니다.
        if (bgm) {
            bgm.pause();
            bgm.removeEventListener('ended', playNextMainTheme);
        }
        // 플레이리스트를 처음부터 시작합니다.
        currentPlaylistIndex = -1;
        playNextMainTheme();
        return;
    }

    // 'boss-theme' 등 다른 특정 BGM 재생 요청 시
    if (sounds[trackName]) {
        // 이미 같은 BGM이 재생 중이면 아무것도 안 함
        if (currentTrackName === trackName && bgm && !bgm.paused) {
            return;
        }

        // 현재 재생 중인 BGM(플레이리스트 포함)을 정지하고 리스너를 제거합니다.
        if (bgm) {
            bgm.pause();
            bgm.removeEventListener('ended', playNextMainTheme);
        }

        bgm = sounds[trackName];
        bgm.loop = true; // 보스 테마 등 단일 곡은 반복 재생합니다.
        bgm.volume = volume;
        bgm.currentTime = 0;
        const playPromise = bgm.play();
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                console.error("BGM 재생 실패:", error.name, error.message);
                if (error.name === 'NotAllowedError') {
                    console.log("자동 재생이 차단되었습니다. 사용자 상호작용 시 재시도합니다.");
                    bgmNeedsResume = true;
                }
            });
        }
        currentTrackName = trackName;
    }
}

/**
 * 현재 재생 중인 배경음악(BGM)을 정지하는 함수
 */
function stopBGM() {
    if (bgm) {
        bgm.pause();
        bgm.currentTime = 0; // 시작 메뉴로 돌아갈 때 등 완전히 정지할 때 사용
        bgm.removeEventListener('ended', playNextMainTheme); // 이벤트 리스너 정리
    }
    currentTrackName = null;
    currentPlaylistIndex = 0; // 다음에 재생할 때 처음부터 시작하도록 인덱스 초기화
}