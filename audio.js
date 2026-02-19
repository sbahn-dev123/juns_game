const sounds = {};

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
    };

    for (const key in soundFiles) {
        sounds[key] = new Audio(soundFiles[key]);
        sounds[key].preload = 'auto';
    }
    console.log("사운드 파일이 로드되었습니다.");
}

function playSound(soundName, volume = 0.7) {
    if (sounds[soundName]) {
        sounds[soundName].currentTime = 0;
        sounds[soundName].volume = volume;
        sounds[soundName].play().catch(error => { /* Autoplay policy might block the sound, can be ignored. */ });
    }
}