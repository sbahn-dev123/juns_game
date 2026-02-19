const sounds = {};
let bgm = null; // BGM을 위한 별도의 Audio 객체
let currentTrackName = null; // 현재 재생 중인 BGM 트랙 이름

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
        'main-theme': 'assets/sounds/bgm-main.mp3',     // 일반 배경음악
        'boss-theme': 'assets/sounds/bgm-boss.mp3',     // 보스전 배경음악
    };

    for (const key in soundFiles) {
        sounds[key] = new Audio(soundFiles[key]);
        sounds[key].preload = 'auto';
    }
    console.log("사운드 파일이 로드되었습니다.");
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

    // 이미 같은 BGM이 재생 중이면 아무것도 안 함
    if (currentTrackName === trackName && bgm && !bgm.paused) {
        return;
    }

    if (sounds[trackName]) {
        // 현재 재생 중인 BGM이 있다면 정지
        if (bgm) {
            bgm.pause();
        }

        bgm = sounds[trackName];
        bgm.loop = true; // BGM은 반복 재생
        bgm.volume = volume;
        bgm.currentTime = 0;
        bgm.play().catch(error => { /* Autoplay policy might block the sound, can be ignored. */ });
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
    }
    currentTrackName = null;
}