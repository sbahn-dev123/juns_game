//! =================================================================
//! game-flow.js
//!
//! 이 파일은 게임의 전반적인 진행 및 성장 로직을 담당합니다.
//! - 경험치 획득 및 레벨업
//! - 전투 승리 및 다음 스테이지 진행
//! - 다음 층 이동 및 몬스터 생성
//! - 게임 오버 처리
//! =================================================================

//** ============================================================ **//
//** 4. 게임 진행 및 성장
//** ============================================================ **//

/**
 * 플레이어가 경험치를 획득하고, 레벨업 조건을 확인합니다.
 * @param {number} amount - 획득할 경험치 양
 */
function gainXP(amount) {
    // 전리품으로 인한 경험치 보너스 계산
    let lootXpBonus = 0;
    player.lootInventory.forEach(loot => {
        if (loot.type === 'xp_bonus') {
            lootXpBonus += loot.value;
        }
    });
    const finalAmount = Math.floor(amount * (1 + lootXpBonus));

    player.xp += finalAmount;
    log(`${finalAmount}의 경험치를 획득했다!`, 'log-system', { color: '#a78bfa' });
    updateUI();
    checkForLevelUp();
}

/**
 * 플레이어의 경험치가 레벨업 조건을 만족하는지 확인하고, 레벨업을 처리합니다.
 */
function checkForLevelUp() {
    // 현재 경험치가 필요 경험치보다 많거나 같으면 레벨업
    if (player.xp >= player.xpToNextLevel) {
        playSound('level-up');
        player.level++;
        player.xp -= player.xpToNextLevel; // 레벨업에 사용된 경험치 차감
        const baseStatPoints = 3;
        const totalStatPoints = baseStatPoints + player.bonusStatPointsPerLevel;
        player.statPoints += totalStatPoints;
        player.xpToNextLevel = Math.floor(100 * Math.pow(1.3, player.level - 1)); // 다음 레벨업에 필요한 경험치 증가

        // 레벨업 시각 효과 및 애니메이션
        const playerElement = document.getElementById('player-character');
        showFloatingText('LEVEL UP!', playerElement, 'level-up');

        const levelUpModal = document.getElementById('levelup-modal');
        const levelUpText = levelUpModal.querySelector('.levelup-text');
        if (levelUpText) {
            levelUpText.innerHTML = `✨ LEVEL ${player.level} ✨`;
            levelUpText.classList.add('animated');
        }
        levelUpModal.style.display = 'flex';

        setTimeout(() => {
            levelUpModal.style.display = 'none';
            if (levelUpText) {
                levelUpText.classList.remove('animated');
            }
        }, 2000); // 2초간 표시
        // --- 애니메이션 끝 ---

        log(`✨ LEVEL UP! ✨ 레벨 ${player.level} 달성!`, 'log-system', { fontSize: '24px', textShadow: '0 0 10px #fbbf24' });
        if (player.bonusStatPointsPerLevel > 0) {
            log(`스탯 포인트를 ${totalStatPoints} (기본 3 + 보너스 ${player.bonusStatPointsPerLevel}) 획득했습니다!`, 'log-system');
        } else {
            log(`스탯 포인트를 ${totalStatPoints} 획득했습니다!`, 'log-system');
        }
        log('장비/스탯 창에서 포인트를 분배할 수 있습니다.', 'log-system');
    }
}

/**
 * 전투에서 승리했을 때 호출되는 함수.
 * - 골드를 정산하고, 보스 몬스터의 경우 특별 전리품 드랍을 처리합니다.
 * - 경험치는 몬스터 사망 시점에 즉시 획득합니다.
 */
function winBattle() {
    playSound('win');
    const totalCoins = Math.floor(monsters.reduce((sum, m) => sum + m.dropCoins, 0) * player.goldBonus);
    player.coins += totalCoins;
    log(`전투 승리! ${totalCoins} 골드를 획득했습니다.`, 'log-system');
    
    // --- 보스 특별 전리품 처리 ---
    monsters.forEach(monster => {
        if (monster.specialDrop && Math.random() < 0.85) { // 85% 확률로 드랍
            const drop = monster.specialDrop;
            player.lootInventory.push(drop);
            log(`🌟 특별한 전리품! [${drop.name}]을(를) 획득했습니다! 인벤토리에서 확인하세요.`, 'log-system', { color: '#f59e0b', fontWeight: 'bold' });
        }
    });
    // --- 전리품 처리 끝 ---

    // 전투 종료 후 잠시 대기 (레벨업 애니메이션 등을 위한 시간)
    setTimeout(() => {
        proceedToNextStage();
    }, 1500);
}

/**
 * 전투 승리 후 다음 단계(상점 또는 다음 층)로 진행하는 함수.
 */
function proceedToNextStage() {
    if (floor % 5 === 0) {
        openShop(true);
    } else {
        nextFloor();
    }
}

/**
 * 다음 층으로 이동하는 함수.
 * - 플레이어 상태를 일부 회복(체력 전체, 마나 일부)하고, 버프 턴을 감소시킵니다.
 * - 낮은 확률로 아이템을 줍고, 새로운 몬스터를 생성합니다.
 */
function nextFloor() {
    floor++;
    turn = 1;
    isPlayerTurn = true;
    monsters = [];
    // player.minions = []; // 네크로맨서의 소환수는 다음 층으로 이동해도 유지됩니다.
    
    // --- 플레이어 상태 회복 및 버프 턴 감소 ---
    player.hp = player.maxHp; // 다음 층 이동 시 체력은 완전 회복
    // 캐릭터 클래스에 따라 기본 MP 회복량 설정
    const baseMpRecovery = (player.characterClass === 'wizard') ? 30 : 20;
    const lootMagBonus = player.lootInventory
        .filter(loot => loot.type === 'permanent_stat' && loot.stat === 'mag')
        .reduce((sum, loot) => sum + loot.value, 0);
    const finalMag = player.mag + lootMagBonus;
    const totalMpRecovery = baseMpRecovery + Math.floor(finalMag * 3); // 마력 1당 3 MP 추가 회복
    player.mp = Math.min(player.maxMp, player.mp + totalMpRecovery);
    log(`다음 층으로 이동하며 마나가 ${totalMpRecovery}만큼 회복되었습니다.`, 'log-system');

    // --- 영체 회복 로직 추가 ---
    if (player.characterClass === 'necromancer') {
        // 필드에 소환된 영체들 회복
        player.minions.forEach(minion => {
            minion.hp = minion.maxHp;
        });
        // 보관함에 있는 모든 영체의 HP 데이터도 리셋
        player.capturedSpirits.forEach(spirit => {
            if (spirit.maxHp) { // maxHp가 있는 영체만 (구 데이터 호환성)
                spirit.currentHp = spirit.maxHp;
            }
        });
        log('👻 모든 영체들의 체력이 완전히 회복되었습니다.', 'log-system');
    }

    // 흑섬 버프 지속 층 감소
    if (player.blackFlashBuff.active) {
        player.blackFlashBuff.duration--;
        if (player.blackFlashBuff.duration <= 0) {
            player.blackFlashBuff.active = false;
            recalculatePlayerStats(); // 버프 제거 후 스탯 재계산
            log("흑섬의 기운이 사라졌다...", 'log-system');
        }
    }

    // --- 랜덤 아이템 획득 ---
    // 55% 확률로 기본 HP 물약 획득
    if (Math.random() < 0.55) {
        const potion = healPotionList[0]; // 제일 안좋은 회복 물약
        player.inventory.push({ ...potion, type: 'heal' });
        log(`바닥에서 ${potion.name}을(를) 주웠다!`, 'log-system', { fontSize: '20px' });
    }

    // 30% 확률로 하급 버프/MP 물약 중 하나 획득
    if (Math.random() < 0.3) {
        const possiblePotions = [
            { potion: buffPotionList[0], type: 'buff' },       // 제일 약한 힘 물약
            { potion: critPotionList[0], type: 'critBuff' },   // 제일 약한 집중 물약
            { potion: mpPotionList[0], type: 'mpPotion' }      // 제일 약한 MP 물약
        ];

        const randomIndex = Math.floor(Math.random() * possiblePotions.length);
        const { potion, type: potionType } = possiblePotions[randomIndex];

        player.inventory.push({ ...potion, type: potionType });
        log(`바닥에서 ${potion.name}을(를) 주웠다!`, 'log-system', { fontSize: '20px' });
    }
    
    // --- 새로운 층의 몬스터 생성 및 UI 업데이트 ---
    monsters = generateMonstersForFloor(floor);

    // 공격력이 가장 높은 몬스터를 자동으로 타겟팅
    if (monsters.length > 0) {
        player.targetIndex = monsters.reduce((maxIndex, monster, currentIndex, arr) => {
            return monster.atk > arr[maxIndex].atk ? currentIndex : maxIndex;
        }, 0);
    }

    updateUI();
    toggleControls(true);

    // 자동 저장 기능: 다음 층으로 이동 시 게임 상태를 자동으로 저장합니다.
    if (isLoggedIn()) {
        saveGame(true); // UI를 블록하지 않도록 await 없이 호출
    }
}

/**
 * 특정 층에 맞는 몬스터들을 생성하고 로그를 출력하는 함수.
 * - 보스 층, 중간 보스 층, 일반 층을 구분하여 몬스터를 생성합니다.
 * @param {number} floorNumber - 몬스터를 생성할 층 번호.
 * @returns {Array<object>} - 생성된 몬스터 객체 배열
 */
function generateMonstersForFloor(floorNumber) {
    let generatedMonsters = [];
    const isBossFloor = floorNumber % 10 === 0;

    // 메인 보스 몬스터 등장 로직 (20, 40, 60...)
    if (floorNumber % 20 === 0) {
        playBGM('boss-theme');
        const bossIndex = (floorNumber / 20) - 1;
        const bossTemplate = bossList[Math.min(bossIndex, bossList.length - 1)];
        const boss = createMonster(bossTemplate, 1);
        generatedMonsters.push(boss);
        log(`============ 지하 ${floorNumber}층: 보스전! ============`, 'log-system', { fontSize: '28px', color: '#ef4444', textShadow: '0 0 10px #ef4444' });
        playSound('boss-appear');
        log(`🚨 강력한 ${boss.name}이(가) 나타났습니다!`, 'log-monster', { fontSize: '24px', color: '#ef4444' });
    } else if (floorNumber % 20 === 10) { // 중간 보스 몬스터 등장 로직 (10, 30, 50...)
        playBGM('boss-theme');
        const bossIndex = Math.floor(floorNumber / 20);
        const bossTemplate = midBossList[Math.min(bossIndex, midBossList.length - 1)];
        const boss = createMonster(bossTemplate, 1);
        generatedMonsters.push(boss);
        playSound('boss-appear');
        log(`============ 지하 ${floorNumber}층: 보스전! ============`, 'log-system', { fontSize: '28px', color: '#ef4444', textShadow: '0 0 10px #ef4444' });
        log(`🚨 강력한 ${boss.name}이(가) 나타났습니다!`, 'log-monster', { fontSize: '24px', color: '#ef4444' });
    } else {
        // 일반 층에서는 메인 테마 재생
        playBGM('main-theme');

        // 일반 몬스터 생성 로직

        // 100층부터 일반 몬스터 스펙업 배율 계산
        const difficultyMultiplier = (floorNumber >= 100) ? (1 + (floorNumber - 100) * 0.0335) : 1;

        // --- 추가 몬스터 생성 로직 ---
        // 51층부터 30층마다 1마리씩, 순차적으로 강해지는 몬스터 추가
        if (floorNumber > 50) {
            const progressiveExtraMobsCount = Math.floor((floorNumber - 51) / 30) + 1;
            for (let i = 0; i < progressiveExtraMobsCount; i++) {
                const startFloorForSlot = 51 + i * 30;
                const monsterIndex = (floorNumber - startFloorForSlot) % monsterList.length;
                const mobTemplate = monsterList[monsterIndex];
                const mob = createMonster(mobTemplate, difficultyMultiplier);
                generatedMonsters.push(mob);
            }
        } else if (floorNumber >= 17) { // 17~50층 사이의 기존 추가 몬스터 로직
            const extraMobsCount = floorNumber >= 22 ? 2 : 1;
            for (let i = 0; i < extraMobsCount; i++) {
                const mobTemplateIndex = Math.floor(Math.random() * Math.min(floorNumber, 10));
                const mobTemplate = monsterList[mobTemplateIndex];
                const mob = createMonster(mobTemplate, 1); // 이 구간 몬스터는 스펙업 배율(difficultyMultiplier)이 1이므로 그대로 1을 사용
                generatedMonsters.push(mob);
            }
        }

        // --- 메인 몬스터 생성 ---
        const mainMonsterTemplate = monsterList[Math.min(floorNumber - 1, monsterList.length - 1)];
        const mainMonster = createMonster(mainMonsterTemplate, difficultyMultiplier);
        generatedMonsters.push(mainMonster); // 메인 몬스터를 마지막에 추가

        log(`============ 지하 ${floorNumber}층 ============`, 'log-system');
        if (generatedMonsters.length > 1) {
            log(`야생의 ${mainMonster.name}와(과) 무리가 나타났습니다!`, 'log-monster');
        } else {
            log(`야생의 ${generatedMonsters[0].name}이(가) 나타났습니다!`, 'log-monster');
        }
    }
    return generatedMonsters;
}

/**
 * 몬스터가 쓰러졌을 때 공통으로 처리하는 함수 (사망 로그, 사운드, 경험치 획득).
 * 중복 처리를 방지하기 위해 isDeathProcessed 플래그를 사용합니다.
 * @param {object} monster - 쓰러진 몬스터 객체.
 * @param {string} [reason=''] - 사망 원인 (e.g., '화상 피해').
 */
function handleMonsterDeath(monster, reason = '') {
    if (!monster || monster.isDeathProcessed) return;

    monster.isDeathProcessed = true;
    playSound('monster-die');
    const reasonText = reason ? `(${reason})` : '';
    log(`${monster.name}을(를) 쓰러뜨렸다! ${reasonText}`, 'log-player');
    gainXP(monster.xp);
}

/**
 * 몬스터 템플릿과 난이도 배율을 기반으로 실제 몬스터 객체를 생성하는 함수
 * @param {object} template - 몬스터 도감(data.js)에 정의된 몬스터 템플릿.
 * @param {number} multiplier - 난이도 배율 (층이 높아질수록 증가).
 * @returns {object} - 실제 게임에서 사용될 몬스터 객체.
 */
function createMonster(template, multiplier) {
    const baseCoin = Math.floor(template.hp / 2);
    const coinDrop = Math.floor(baseCoin * multiplier) + Math.floor(Math.random() * 10);
    const xpDrop = Math.floor((template.hp * 2 + template.atk * 10) * multiplier);
    return {
        ...template,
        maxHp: Math.floor(template.hp * multiplier),
        hp: Math.floor(template.hp * multiplier),
        atk: Math.floor(template.atk * multiplier),
        dropCoins: coinDrop,
        xp: xpDrop,
        isStunned: false,
        isCharging: false,
        isBoss: template.isBoss || false,
        isDeathProcessed: false, // 사망 처리 여부 플래그
        poison: { turns: 0, damage: 0 },
        burn: { turns: 0, damage: 0 },
    };
}

/**
 * 플레이어 사망 시 게임 오버를 처리하는 함수.
 * - 점수를 서버에 제출하고, 게임 상태를 저장한 후 게임 오버 모달을 표시합니다.
 */
async function gameOver() {
    stopBGM();
    playSound('game-over');
    isGameOver = true;
    log("체력이 0이 되었습니다. 게임 오버...", 'log-monster');
    toggleControls(false); // Disable game controls
 
    await submitScore(); // 점수 제출
 
    if (isLoggedIn()) {
        log("최종 게임 상태를 저장합니다...", "log-system");
        await saveGame(true); // Silently save the game state
    }
 
    // 게임 오버 모달을 표시합니다.
    showGameOverModal(floor);
}