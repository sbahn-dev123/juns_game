
//! =================================================================
//! script.js
//!
//! 이 파일은 게임의 최상위 진입점(entry point) 역할을 합니다.
//! - 게임 초기화 (`init`)
//! - 새 게임 시작 및 캐릭터 선택 로직
//! - 전역 이벤트 리스너 (키보드 입력 등)
//! =================================================================



//** ============================================================ **//
//** 2. 전투 로직
//** ============================================================ **//

/**
 * 흑섬(Black Flash) 효과 애니메이션을 실행하는 함수
 */
function triggerBlackFlash() {
    const overlay = document.getElementById('black-flash-overlay');
    overlay.style.animation = 'none';
    overlay.offsetHeight; // 애니메이션 재시작을 위한 리플로우 강제
    overlay.style.animation = 'black-flash-animation 0.25s ease-out';
}

/**
 * 영역 전개(Domain Expansion) 효과 애니메이션을 실행하는 함수
 */
function triggerDomainExpansion() {
    const domainCircle = document.getElementById('domain-expansion-circle');
    if (domainCircle) {
        domainCircle.style.display = 'block';
        domainCircle.style.animation = 'none';
        domainCircle.offsetHeight; // Reflow
        domainCircle.style.animation = 'expand-domain 2.5s forwards';

        // 애니메이션이 끝난 후 원을 숨깁니다.
        setTimeout(() => {
            domainCircle.style.display = 'none';
        }, 2500);
    }
}



/**
 * 현재 타겟 몬스터가 죽었을 경우, 다음 살아있는 몬스터를 자동으로 타겟으로 지정하는 함수.
 */
function findNextTarget() {
    let maxAtk = -1;
    let nextTargetIndex = -1;

    // 살아있는 몬스터 중에서 공격력이 가장 높은 몬스터를 찾습니다.
    monsters.forEach((monster, index) => {
        if (monster.hp > 0 && monster.atk > maxAtk) {
            maxAtk = monster.atk;
            nextTargetIndex = index;
        }
    });

    if (nextTargetIndex !== -1) {
        player.targetIndex = nextTargetIndex;
    }
}


/**
 * 컨트롤 버튼(스킬, 물약 등)의 활성화/비활성화 상태를 조절하는 함수.
 * - 플레이어 턴일 때만 버튼을 활성화합니다.
 * @param {boolean} enable - true면 활성화, false면 비활성화
 */
function toggleControls(enable) {
    if (enable) {
        showMainControls();
    } else {
        const btns = document.querySelectorAll('.controls button');
        btns.forEach(btn => btn.disabled = !enable);
    }
}

//** ============================================================ **//
//** 7. 게임 초기화 및 이벤트 리스너
//** ============================================================ **//

/**
 * 게임을 시작하고 첫 층을 설정하는 함수.
 * - 새 게임 또는 불러온 게임 상태에 따라 게임 환경을 설정합니다.
 * @param {object|null} [loadedState=null] - 불러온 게임 상태. null이면 초기 상태로 시작.
 */
function startGame(loadedState = null) {
    if (loadedState) {
        // 불러온 데이터로 게임 상태 복원
        Object.assign(player, loadedState.player);
        floor = loadedState.floor;
        turn = loadedState.turn;
        monsters = loadedState.monsters;
        isPlayerTurn = loadedState.isPlayerTurn;
        isGameOver = false;
        log("💾 저장된 게임을 이어합니다.", "log-system");
    } else {
        // 새 게임
        // (player object는 startNewGame에서 초기화됨)
        monsters = generateMonstersForFloor(floor);
        // HP가 가장 높은 몬스터를 자동으로 타겟팅
        if (monsters.length > 0) {
            player.targetIndex = monsters.reduce((maxIndex, monster, currentIndex, arr) => {
                return monster.hp > arr[maxIndex].hp ? currentIndex : maxIndex;
            }, 0);
        }
    }

    // --- 데이터 호환성 및 무결성 보장 ---
    // 불러온 데이터나 초기 데이터의 배열 속성이 undefined가 되지 않도록 보장합니다.
    // 이는 이전 버전의 저장 파일과 호환성을 유지하기 위함입니다.
    player.inventory = player.inventory || [];
    player.armorInventory = player.armorInventory || [];
    player.weaponInventory = player.weaponInventory || [];
    player.lootInventory = player.lootInventory || [];
    monsters = monsters || [];

    // 플레이어 스탯을 현재 상태(장비, 전리품 등)에 맞게 재계산합니다.
    recalculatePlayerStats();

    // 새 게임일 경우에만 체력/마나를 가득 채웁니다. (불러오기 시에는 저장된 값 유지)
    if (!loadedState) {
        player.hp = player.maxHp;
        player.mp = player.maxMp;
    }
    updateUI();
    toggleControls(isPlayerTurn);
}

/**
 * 새로운 게임을 시작하는 함수.
 * - 모든 게임 상태를 초기값으로 리셋합니다.
 * @param {boolean} [isNew=false] - 로그인 상태에서 '새 게임' 버튼을 눌렀는지 여부 (경고창 표시용).
 */
function startNewGame(isNew = false, characterId = 'hero') {
    if (isNew && isLoggedIn() && !confirm("정말로 새로운 게임을 시작하시겠습니까? 기존에 저장된 데이터는 덮어씌워집니다.")) {
        return;
    }
    // 게임 상태 초기화
    const initialPlayerState = {
        level: 1, xp: 0, xpToNextLevel: 100, statPoints: 0,
        str: 0, vit: 0, mag: 0, mnd: 0, agi: 0, int: 0, luk: 0, fcs: 0, minions: [], capturedSpirits: [],
        poisonBuff: { turns: 0, damage: 0 },
        divineShieldBuff: { active: false, turns: 0 },
        blackFlashBuff: { active: false, duration: 0 }, critBuff: { turns: 0, bonus: 0 },
        shoutOfResolveBuff: { active: false, turns: 0 },
        iceWall: { active: false, hp: 0, maxHp: 0, turns: 0 },
        smokeBombBuff: { active: false, turns: 0 },
        isHidden: false,
        blessingBuff: { active: false, turns: 0 },
        strBuff: { multiplier: 1, turns: 0 },
        invincibleBuff: { active: false, turns: 0 },
        guaranteedCrit: false, defenseBuff: { turns: 0, reduction: 0.6 },
        defenseStance: false, isStunned: false, evasionChance: 4, critChance: 11,
        critDamage: 2, goldBonus: 1, coins: 0,
        equippedArmor: null, equippedWeapon: null, armorInventory: [],
        weaponInventory: [], lootInventory: [], targetIndex: 0,
        buff: { turns: 0, multiplier: 1.5 },
        // 전리품 효과 초기화
        critDamageBonus: 0, mpCostMultiplier: 1, hpRegen: 0,
        bonusStatPointsPerLevel: 0, debuffResistance: 0,
    };
    Object.assign(player, initialPlayerState);

    // characterData에서 선택된 캐릭터 정보 가져오기
    const selectedCharacterData = characterData[characterId] || characterData.hero;

    player.characterClass = selectedCharacterData.id;
    player.baseMaxHp = selectedCharacterData.stats.hp;
    player.baseMaxMp = selectedCharacterData.stats.mp;
    player.baseAtk = selectedCharacterData.stats.atk;
    player.baseEmoji = selectedCharacterData.emoji;
    player.emoji = selectedCharacterData.emoji;
    // 인벤토리는 깊은 복사를 통해 원본 데이터가 변경되지 않도록 합니다.
    player.inventory = JSON.parse(JSON.stringify(selectedCharacterData.inventory));

    recalculatePlayerStats(); // 스탯을 기반으로 최종 능력치(maxHp, atk 등)를 계산합니다.

    // 새 게임 시작 시 체력과 마나를 최대로 설정합니다.
    player.hp = player.maxHp;
    player.mp = player.maxMp;

    floor = 1;
    turn = 1;
    isPlayerTurn = true;
    isGameOver = false;

    showGameScreen();
    startGame();
}

/**
 * 캐릭터 선택 창에서 캐릭터를 선택하는 함수.
 * @param {string} characterId - 선택된 캐릭터의 ID ('hero', 'wizard').
 */
function selectCharacter(characterId) {
    // 모든 카드의 'selected' 클래스 제거
    const allCards = document.querySelectorAll('.character-card');
    allCards.forEach(card => card.classList.remove('selected'));

    // 클릭된 카드에 'selected' 클래스 추가
    const selectedCard = document.querySelector(`.character-card[data-character-id="${characterId}"]`);
    if (selectedCard) {
        selectedCard.classList.add('selected');
    }
    playSound('click');
}

/**
 * '모험 시작' 버튼 클릭 시 호출될 함수
 * - 캐릭터 선택을 확정하고 게임을 시작합니다.
 */
function confirmCharacterSelectionAndStart() {
    const selectedCharacterCard = document.querySelector('.character-card.selected');
    if (!selectedCharacterCard) {
        alert('용사를 선택해주세요.');
        return;
    }

    const characterId = selectedCharacterCard.dataset.characterId;
    
    // HTML의 onclick에서 전달한 로그인 상태(isLoggedIn)를 사용합니다.
    // 이 값은 openCharacterSelectModal 함수에서 window 객체에 저장되었습니다.
    startNewGame(window.isNewGameForLoggedInUser, characterId); 
    
    // 모달을 닫습니다. (ui.js에 정의된 함수)
    closeCharacterSelectModal();
}


/**
 * 페이지 로드 시 실행되는 초기화 함수.
 * - 사운드 로드, UI 초기화, 로그인 상태 확인 등을 수행합니다.
 */
async function init() {
    await loadSounds(); // 사운드, 특히 첫 BGM이 로드될 때까지 기다립니다.
    showStartMenu(); // UI와 BGM을 먼저 표시하고 재생합니다.
    const username = localStorage.getItem('username');
    updateLoginStatus(username);
    updateVolumeButtons(); // 페이지 로드 시 볼륨 버튼 상태 초기화
    checkNewContent(); // 새로운 콘텐츠 확인 및 'N' 배지 표시
    addManualLinkToStartMenu(); // 게임 설명서 링크 추가

    // BGM 자동 재생 실패 시 복구를 위한 이벤트 리스너 (최초 1회만 실행)
    document.body.addEventListener('click', tryResumeBGM, { once: true });
    document.body.addEventListener('keydown', tryResumeBGM, { once: true });
}

// 키보드 입력을 처리하기 위한 이벤트 리스너 추가
document.addEventListener('keydown', handleKeydown);

/**
 * 키보드 입력(좌우 방향키)을 감지하여 몬스터 타겟을 변경하는 함수.
 * @param {KeyboardEvent} e - 키보드 이벤트 객체.
 */
function handleKeydown(e) {
    if (!isPlayerTurn || isGameOver || monsters.length <= 1) return;

    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        
        let newIndex = player.targetIndex;
        const direction = e.key === 'ArrowRight' ? 1 : -1;
        
        // 살아있는 다음 타겟을 찾을 때까지 반복
        do {
            newIndex = (newIndex + direction + monsters.length) % monsters.length;
        } while (monsters.length > 1 && monsters[newIndex].hp <= 0);

        player.targetIndex = newIndex;
        updateUI();
    }
}

/**
 * 마우스 클릭으로 몬스터 타겟을 변경하는 함수.
 * @param {number} index - 선택한 몬스터의 인덱스.
 */
function selectTarget(index) {
    if (isGameOver || !isPlayerTurn) return;

    const monster = monsters[index];
    if (monster && monster.hp > 0) {
        player.targetIndex = index;
        updateUI();
    } else {
        log("쓰러진 몬스터는 선택할 수 없습니다.", 'log-system');
    }
}

// 게임 시작
init();
