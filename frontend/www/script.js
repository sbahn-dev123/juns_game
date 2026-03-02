
//! =================================================================
//! script.js
//!
//! 이 파일은 게임의 핵심 로직을 담당합니다.
//! - 게임 상태 변수 (플레이어, 몬스터, 층 등) 정의
//! - 전투 시스템 (공격, 스킬, 턴 관리)
//! - 캐릭터 성장 (레벨업, 스탯 분배)
//! - 게임 진행 (다음 층 이동, 상점, 게임 오버)
//! - 서버 통신 (저장, 불러오기, 랭킹)
//! =================================================================

//** ============================================================ **//
//** 1. 게임 상태 변수 정의
//** ============================================================ **//

/**
 * @namespace player
 * @description 플레이어의 모든 상태 정보를 담고 있는 객체.
 */
const player = {
    // --- 기본 스탯 ---
    baseMaxHp: 35,      // 기본 최대 체력 (스탯, 장비 미적용)
    maxHp: 35,          // 현재 최대 체력 (스탯, 장비 적용)
    hp: 35,             // 현재 체력
    baseMaxMp: 40,      // 기본 최대 마나
    maxMp: 40,          // 현재 최대 마나
    mp: 40,             // 현재 마나
    baseAtk: 10,        // 기본 공격력 (스탯, 장비 미적용)
    atk: 10,            // 현재 공격력 (스탯, 장비 적용)
    level: 1,           // 현재 레벨
    xp: 0,              // 현재 경험치
    xpToNextLevel: 100, // 다음 레벨까지 필요한 경험치
    statPoints: 0,      // 분배 가능한 스탯 포인트 (레벨업 시 획득)
    // --- 분배 가능 스탯 ---
    str: 0,             // 힘 스탯 (공격력에 영향)
    vit: 0,             // 체력 스탯 (최대 체력에 영향)
    mag: 0,             // 마력 스탯 (스킬 피해량 증폭)
    characterClass: 'hero', // 캐릭터 클래스 ('hero', 'wizard')
    mnd: 0,             // 정신력 스탯 (최대 MP에 영향)
    agi: 0,             // 민첩 스탯 (회피 확률에 영향)
    int: 0,             // 지혜 스탯 (골드 획득량에 영향)
    luk: 0,             // 집중 스탯 (치명타 확률에 영향)
    fcs: 0,             // 고도의 집중 스탯 (흑섬 확률에 영향)
    // --- 버프 및 상태 ---
    blackFlashBuff: { active: false, duration: 0 }, // 흑섬 버프 상태 (활성화 여부, 남은 층 수)
    critBuff: { turns: 0, bonus: 0 }, // 치명타 확률 증가 버프 (남은 턴, 추가 확률%)
    guaranteedCrit: false, // 다음 공격이 확정 치명타인지 여부 (흑섬 발동 시 활성화)
    defenseBuff: { turns: 0, reduction: 0.6 }, // 방어 성공 시 받는 피해량 감소 버프 (남은 턴, 피해 감소율)
    defenseStance: false, // 방어 태세 활성화 여부 (토글 스킬)
    shoutOfResolveBuff: { active: false, turns: 0 }, // Hero
    iceWall: { active: false, hp: 0, maxHp: 0, turns: 0 }, // Wizard
    smokeBombBuff: { active: false, turns: 0 }, // Rogue
    isHidden: false, // Rogue
    blessingBuff: { active: false, turns: 0 }, // Paladin
    poisonBuff: { turns: 0, damage: 0 }, // 독 바르기 버프
    divineShieldBuff: { active: false, turns: 0 }, // 성기사 신성한 방패 버프
    strBuff: { multiplier: 1, turns: 0 }, // 도박꾼 힘 버프
    invincibleBuff: { active: false, turns: 0 }, // 도박꾼 무적 버프
    isStunned: false,   // 플레이어의 기절 상태 여부
    domainActive: false, // 영역 전개 활성화 상태
    skillLockTurns: 0, // 영역 해제 후 스킬 사용 불가 턴
    domainCooldownUntilFloor: 0, // 영역 전개 재사용 가능 층
    // --- 계산된 스탯 ---
    evasionChance: 4,   // 최종 회피 확률 (%)
    critChance: 11,     // 최종 치명타 확률 (%)
    critDamage: 2,      // 최종 치명타 배율 (기본 2배)
    goldBonus: 1,       // 최종 골드 획득 보너스 배율
    blackFlashChance: 0.008, // 최종 흑섬 발동 확률
    magicDamageBonus: 0, // 마력 스탯에 의한 스킬 추가 피해량
    // --- 전리품으로 인한 특수 능력치 ---
    critDamageBonus: 0, // 치명타 피해량 보너스
    mpCostMultiplier: 1, // MP 소모량 배율 (감소 효과)
    hpRegen: 0,          // 턴 종료 시 HP 회복량
    bonusStatPointsPerLevel: 0, // 레벨업 시 추가 스탯 포인트
    debuffResistance: 0, // 상태이상(기절 등) 저항 확률
    // --- 재화, 장비, 캐릭터 정보 ---
    coins: 0,           // 보유 골드
    baseEmoji: '🧑',   // 기본 이모지
    emoji: '🧑',       // 현재 이모지 (장비에 따라 변경)
    // --- 인벤토리 ---
    equippedArmor: null, // 현재 착용한 방어구
    equippedWeapon: null,// 현재 착용한 무기
    armorInventory: [], // 보유 중인 모든 방어구 목록
    weaponInventory: [],// 보유 중인 모든 무기 목록
    capturedSpirits: [],// 흡수한 영체 목록 (네크로맨서용)
    minions: [],        // 현재 소환된 소환수 목록 (네크로맨서용)
    lootInventory: [],  // 보유 중인 모든 전리품 목록 (패시브 효과)
    targetIndex: 0,     // 현재 공격 대상으로 지정된 몬스터의 인덱스
    buff: { turns: 0, multiplier: 1.5 }, // 공격력 강화 물약 버프 (남은 턴, 공격력 배율)
    // --- 소비 아이템 인벤토리 ---
    inventory: [        // 보유한 모든 소비 아이템(물약 등) 목록
        // 게임 시작 시 기본 회복 물약 3개 지급
        { type: 'heal', name: '기본 회복 물약', healAmount: 20 },
        { type: 'heal', name: '기본 회복 물약', healAmount: 20 },
        { type: 'heal', name: '기본 회복 물약', healAmount: 20 },
    ]
};

/** @type {Array<object>} 현재 전투 중인 몬스터 객체들을 담는 배열 */
let monsters = [];

/** @type {number} 현재 진행 중인 층 */
let floor = 1;              // 현재 층
/** @type {number} 현재 층의 턴 수 */
let turn = 1;               // 현재 턴
/** @type {boolean} 플레이어의 턴인지 여부 */
let isPlayerTurn = true;    // 플레이어 턴 여부
/** @type {boolean} 게임 오버 상태인지 여부 */
let isGameOver = false;     // 게임 오버 여부
/** @type {boolean} 5층마다 상점이 자동으로 열렸는지 여부 (상점 닫을 때 다음 층 자동 진행을 위함) */
let isShopAutoOpened = false; // 5층마다 상점이 자동으로 열렸는지 여부

/** @type {number} 스탯 분배 모달에서 임시로 사용할 스탯 포인트 */
let tempStatPoints = 0;
/** @type {object} 스탯 분배 모달에서 임시로 사용할 스탯 객체 (힘, 체력, 운 등) */
let tempStats = {};

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
 * 플레이어의 일반 공격을 처리하는 함수
 * - 플레이어 턴, MP, 기절 상태 등을 확인합니다.
 * - 방어 태세 효과를 적용합니다.
 * - 흑섬 또는 일반 공격을 실행하고, 몬스터에게 피해를 줍니다.
 * - 전투 종료 또는 몬스터 턴으로 전환을 처리합니다.
 */
function executeNormalAttack() {
    // --- 턴 시작 조건 검사 ---
    if (isGameOver || !isPlayerTurn) return;

    // 캐릭터별 공격 이름 가져오기
    const charData = characterData[player.characterClass] || characterData.hero;
    const charName = charData.name;
    const attackName = charData.attackName || '일반 공격';

    const targetMonster = monsters[player.targetIndex];
    if (targetMonster.hp <= 0) {
        log("이미 쓰러진 몬스터입니다.", 'log-system');
        return;
    }

    // 방어 태세 여부에 따라 총 MP 소모량 계산
    const mpCost = 0;
    const defenseMpCost = player.defenseStance ? 10 : 0;
    const totalMpCost = Math.floor((mpCost + defenseMpCost) * player.mpCostMultiplier);

    if (player.mp < totalMpCost) {
        alert(`MP가 부족합니다! (필요: ${totalMpCost})`);
        return;
    }

    // 기절 상태 검사
    if (player.isStunned) {
        log("플레이어가 기절해서 움직일 수 없습니다!", 'log-player');
        player.isStunned = false; // 턴을 넘기면서 기절 해제
        setTimeout(playerTurnEnd, 800);
        return;
    }

    isPlayerTurn = false;
    toggleControls(false); // 플레이어 턴이 아니므로 컨트롤 버튼 비활성화

    // --- 방어 태세 로직 적용 ---
    if (player.defenseStance) {
        if (Math.random() < 0.78) {
            player.defenseBuff.turns = 1;
            log('🛡️ 방어 태세에 성공했습니다! 다음 몬스터 턴의 피해가 60% 감소합니다.', 'log-system');
            showFloatingText('방어 성공!', document.getElementById('player-character'), 'buff');
        } else {
            log('방어에 집중했지만, 실패했습니다...', 'log-system');
            showFloatingText('방어 실패', document.getElementById('player-character'), 'miss');
        }
        player.defenseStance = false; // 사용 후 해제
    }

    // --- MP 소모 및 공격 애니메이션 ---
    player.mp -= totalMpCost;
    playSound('attack');

    // 플레이어 공격 애니메이션
    const playerElement = document.getElementById('player-character');
    playerElement.style.transform = 'translateX(40px) scale(1.05)';
    setTimeout(() => {
        playerElement.style.transform = ''; // 원래 위치로
    }, 150);
    // --- 애니메이션 끝 ---

    const monsterWrappers = document.querySelectorAll('#monster-area .monster-wrapper');
    const targetMonsterElement = monsterWrappers[player.targetIndex];

    // --- 흑섬(Black Flash) 발동 체크 ---
    if (Math.random() < player.blackFlashChance) {
        playSound('black-flash');
        triggerBlackFlash();
        let dmg = Math.floor(player.atk * 6.25);
        log('⚫ 흑섬(黑閃) 발동!', 'log-player', { fontSize: '24px', color: 'white', textShadow: '0 0 5px black, 0 0 15px red' });
        log(`${charName}의 ${attackName}! ${targetMonster.name}에게 ${dmg}의 경이적인 피해를 입혔습니다!`, 'log-player');

        if (!player.blackFlashBuff.active) {
            player.blackFlashBuff.active = true;
            recalculatePlayerStats(); // 스탯 즉시 적용
            log('온 몸에 흑섬의 기운이 감돈다! (3층 동안 모든 능력치 1.6배)', 'log-system');
        }
        player.blackFlashBuff.duration = 3; // 흑섬이 터질 때마다 지속시간 갱신

        player.guaranteedCrit = true; // 다음 공격 확정 치명타
        log('흑섬의 여파로 다음 공격은 반드시 치명타가 됩니다!', 'log-system');

        targetMonster.hp -= dmg;
        showFloatingText(dmg, targetMonsterElement, 'black-flash');
    } else {
        // --- 일반 공격 로직 ---
        // 몬스터 회피 체크 (5% 확률)
        if (Math.random() < 0.05) {
            log(`${targetMonster.name}이(가) 공격을 회피했다! (MISS)`, 'log-monster');
            showFloatingText('MISS', targetMonsterElement, 'miss');
            setTimeout(playerTurnEnd, 800);
            return;
        }

        // 플레이어 기본 공격 데미지 계산 (기본 공격력 + 0~4 랜덤 데미지)
        let dmg = Math.floor(Math.random() * 5) + player.atk;

        // 공격력 버프 턴 감소 및 적용
        if (player.buff.turns > 0) {
            dmg = Math.floor(dmg * player.buff.multiplier);
            player.buff.turns--;
            log(`⚔️ 공격력 강화 효과! 데미지가 증가합니다. (남은 턴: ${player.buff.turns})`, 'log-system');
        }

        // 집중 버프 턴 감소
        if (player.critBuff.turns > 0) {
            player.critBuff.turns--;
            if (player.critBuff.turns === 0) {
                player.critBuff.bonus = 0;
                recalculatePlayerStats();
                log(`🔮 집중 효과가 끝났습니다.`, 'log-system');
            }
        }

        // --- 플레이어 치명타 발동 체크 ---
        let isCrit = false;
        if (player.guaranteedCrit) {
            isCrit = true;
            player.guaranteedCrit = false; // 사용 후 플래그 해제
            log('⚡ 흑섬의 여파로 확정 치명타가 발동됩니다!', 'log-player');
        } else if (Math.random() < player.critChance / 100) {
            isCrit = true;
        }

        if (isCrit) {
            playSound('crit');
            dmg = Math.floor(dmg * player.critDamage);
            log(`⚡ 치명타! ${charName}의 ${attackName}! ${targetMonster.name}에게 ${dmg}의 폭발적인 피해를 입혔습니다!`, 'log-player');
            showFloatingText(dmg, targetMonsterElement, 'crit');
        } else {
            log(`${charName}의 ${attackName}! ${targetMonster.name}에게 ${dmg}의 피해를 입혔습니다.`, 'log-player');
            showFloatingText(dmg, targetMonsterElement, 'damage');
        }

        targetMonster.hp -= dmg;
        applyPoisonEffect(targetMonster);

        // 3% 확률로 몬스터에게 기절 효과 부여
        if (Math.random() < 0.03) {
            targetMonster.isStunned = true;
            log(`몬스터가 기절했습니다!`, 'log-system');
            showFloatingText('STUN', targetMonsterElement, 'stun');
        }
    }

    // --- 몬스터 피격 애니메이션 ---
    if (monsterWrappers[player.targetIndex]) {
        const emojiElement = monsterWrappers[player.targetIndex].querySelector('.emoji');
        if (emojiElement) {
            emojiElement.classList.add('hit');
            setTimeout(() => emojiElement.classList.remove('hit'), 300);
        }
    }

    updateUI();

    // --- 전투 종료 또는 턴 전환 처리 ---
    const allDead = monsters.every(m => m.hp <= 0);
    if (allDead) {
        if (targetMonster.hp <= 0) {
            log(`${targetMonster.name}을(를) 쓰러뜨렸다!`, 'log-player');
            playSound('monster-die');
            gainXP(targetMonster.xp);
        }
        winBattle();
    } else {
        // 현재 타겟 몬스터가 죽었는지 확인
        if (targetMonster.hp <= 0) {
            log(`${targetMonster.name}을(를) 쓰러뜨렸다!`, 'log-player');
            playSound('monster-die');
            gainXP(targetMonster.xp);
            findNextTarget();
        }
        setTimeout(playerTurnEnd, 800); // 0.8초 뒤 소환수 공격 또는 몬스터 반격
    }
}

/**
 * 플레이어 턴 종료 후 소환수 공격 -> 몬스터 공격 순서로 진행하는 함수
 */
function playerTurnEnd() {
    // 소환수가 있으면 소환수가 먼저 공격
    if (player.minions && player.minions.length > 0) {
        minionsAttack();
    } else { // 없으면 바로 몬스터 턴
        monstersAttack();
    }
}

/**
 * 네크로맨서의 소환수들이 공격하는 함수.
 * 소환수 공격 후 몬스터 턴으로 넘어갑니다.
 */
function minionsAttack() {
    if (isGameOver) return;

    const livingMinions = player.minions.filter(m => m.hp > 0);
    
    // 소환수가 없으면 바로 몬스터 턴으로 넘어갑니다.
    if (livingMinions.length === 0) {
        setTimeout(monstersAttack, 100);
        return;
    }

    log('💀 소환수들이 공격을 시작합니다!', 'log-player');
    let totalXpGained = 0;
    let attackPromises = [];

    livingMinions.forEach((minion, i) => {
        const promise = new Promise(resolve => {
            setTimeout(() => {
                if (isGameOver || monsters.every(m => m.hp <= 0)) return resolve();
                if (monsters[player.targetIndex].hp <= 0) findNextTarget();

                const targetMonster = monsters[player.targetIndex];
                const monsterWrappers = document.querySelectorAll('#monster-area .monster-wrapper');
                const targetMonsterElement = monsterWrappers[player.targetIndex];

                const dmg = minion.atk;
                targetMonster.hp -= dmg;
                log(`💀 ${minion.name}이(가) ${targetMonster.name}에게 ${dmg}의 피해를 입혔습니다.`, 'log-player');
                if(targetMonsterElement) showFloatingText(dmg, targetMonsterElement, 'minion-damage');

                if (targetMonster.hp <= 0) {
                    log(`${targetMonster.name}을(를) 쓰러뜨렸다!`, 'log-player');
                    playSound('monster-die');
                    totalXpGained += targetMonster.xp;
                }
                updateUI();
                resolve();
            }, i * 400); // 0.4초 간격으로 순차 공격
        });
        attackPromises.push(promise);
    });

    // 모든 소환수 공격이 끝나면 몬스터 턴을 시작합니다.
    Promise.all(attackPromises).then(() => {
        if (isGameOver) return;
        if (totalXpGained > 0) gainXP(totalXpGained);
        if (monsters.every(m => m.hp <= 0)) {
            winBattle();
        } else {
            findNextTarget();
            setTimeout(monstersAttack, 400);
        }
    });
}

/**
 * 몬스터들의 공격을 처리하는 함수
 * 살아있는 모든 몬스터가 순서대로 플레이어를 공격합니다.
 */
function monstersAttack() {
    if (isGameOver) return;

    const playerElement = document.getElementById('player-character');
    const livingMonsters = monsters.filter(m => m.hp > 0);

    let defenseBuffUsedThisTurn = false; // 이번 턴에 방어 성공 로그가 출력되었는지 확인하는 플래그

    livingMonsters.forEach((monster, i) => {
        setTimeout(() => { // 몬스터 공격 간 딜레이
            // Declare monsterIndex and monsterElement once at the beginning of the loop iteration
            const monsterIndex = monsters.findIndex(m => m === monster);
            const monsterElement = document.querySelectorAll('#monster-area .monster-wrapper')[monsterIndex];
            if (isGameOver) return;

            // --- 화상(Burn) 데미지 처리 ---
            if (monster.burn && monster.burn.turns > 0) {
                const burnDamage = monster.burn.damage;
                monster.hp -= burnDamage;
                monster.burn.turns--;
                log(`🔥 ${monster.name}이(가) 화상으로 ${burnDamage}의 피해를 입었습니다. (남은 턴: ${monster.burn.turns})`, 'log-monster');
                if(monsterElement) showFloatingText(burnDamage, monsterElement, 'burn');

                if (monster.hp <= 0) {
                    log(`${monster.name}이(가) 화상 피해로 쓰러졌다!`, 'log-monster');
                    playSound('monster-die');
                    gainXP(monster.xp);
                    updateUI();

                    // 모든 몬스터가 죽었는지 확인
                    const allDead = monsters.every(m => m.hp <= 0);
                    if (allDead) {
                        winBattle(); // 전투 승리 처리
                        return; // 추가 진행 중단
                    }

                    // 이 몬스터가 루프의 마지막 몬스터였다면 턴 종료
                    if (i === livingMonsters.length - 1) {
                        endMonstersTurn();
                    }
                    return; // 이 몬스터의 턴은 종료
                }
            }
            // --- 화상 데미지 처리 끝 ---

            // --- 독(Poison) 데미지 처리 ---
            if (monster.poison && monster.poison.turns > 0) {
                const poisonDamage = monster.poison.damage;
                monster.hp -= poisonDamage;
                monster.poison.turns--;
                log(`☠️ ${monster.name}이(가) 중독으로 ${poisonDamage}의 피해를 입었습니다. (남은 턴: ${monster.poison.turns})`, 'log-monster');
                if(monsterElement) showFloatingText(poisonDamage, monsterElement, 'poison');

                if (monster.hp <= 0) {
                    log(`${monster.name}이(가) 중독 피해로 쓰러졌다!`, 'log-monster');
                    playSound('monster-die');
                    gainXP(monster.xp);
                    updateUI();
                    const allDead = monsters.every(m => m.hp <= 0);
                    if (allDead) {
                        winBattle();
                        return;
                    }
                    if (i === livingMonsters.length - 1) { endMonstersTurn(); }
                    return; // 이 몬스터의 턴은 종료
                }
            }
            // --- 독 데미지 처리 끝 ---

            // --- 보스 궁극기(Charge Attack) 발동 ---
            if (monster.isCharging) {
                const skill = monster.skill;
                let chargeDmg = Math.floor(monster.atk * skill.power);
                const originalDmg = chargeDmg;

                // 신성한 방패 버프 적용
                        if (player.isHidden) {
                            log(`🌫️ 그림자 속에 숨어 ${monster.name}의 ${skill.name}을(를) 완벽하게 회피했습니다!`, 'log-player');
                            showFloatingText('EVADE', playerElement, 'miss');
                            player.isHidden = false;
                            chargeDmg = 0;
                        }
                        if (player.iceWall.active && player.iceWall.hp > 0) {
                            const absorbedDmg = Math.min(player.iceWall.hp, originalDmg);
                            player.iceWall.hp -= absorbedDmg;
                            chargeDmg -= absorbedDmg;
                            log(`❄️ 아이스 월이 ${absorbedDmg}의 피해를 흡수했습니다! (남은 내구도: ${player.iceWall.hp})`, 'log-player');
                            if (player.iceWall.hp <= 0) {
                                player.iceWall.active = false;
                                log('❄️ 아이스 월이 파괴되었습니다!', 'log-system');
                            }
                        }
                        if (player.invincibleBuff.active) {
                            log(`🎲 무적 효과! ${monster.name}의 ${skill.name}을(를) 완벽하게 막아냈습니다!`, 'log-player');
                            showFloatingText('IMMUNE', playerElement, 'buff');
                            chargeDmg = 0;
                        }

                if (player.divineShieldBuff.active) {
                    const reflectedDmg = Math.floor(originalDmg * 0.7);
                    monster.hp -= reflectedDmg;
                    log(`🛡️ 신성한 방패가 ${monster.name}에게 ${reflectedDmg}의 피해를 반사했습니다!`, 'log-player');
                    if(monsterElement) showFloatingText(reflectedDmg, monsterElement, 'damage');
                    chargeDmg = Math.floor(originalDmg * 0.2); // 80% 피해 감소
                }

                // 방어 버프가 활성화된 경우 데미지 감소
                if (player.defenseBuff.turns > 0) {
                    chargeDmg = Math.floor(chargeDmg * (1 - player.defenseBuff.reduction));
                    if (!defenseBuffUsedThisTurn) { log(`🛡️ 방어 성공! 받는 피해가 감소했습니다.`, 'log-system'); defenseBuffUsedThisTurn = true; }
                }
                if (chargeDmg > 0) player.hp -= chargeDmg;
                playSound('hit');
                monster.isCharging = false;
                log(`🔥 ${monster.name}의 ${skill.name}! ${chargeDmg}의 엄청난 피해를 입었습니다!`, 'log-monster');
                showFloatingText(chargeDmg, playerElement, 'crit');

                const pEmoji = document.getElementById('player-emoji');
                pEmoji.classList.add('hit');
                setTimeout(() => pEmoji.classList.remove('hit'), 300);
                
                updateUI();
                if (i === livingMonsters.length - 1) {
                    endMonstersTurn();
                }
                return; // 공격했으므로 이 몬스터의 턴 종료
            }

            // --- 몬스터 기절 상태 처리 ---
            if (monster.isStunned) {
                log(`${monster.name}은(는) 기절해서 움직일 수 없습니다!`, 'log-monster');
                monster.isStunned = false; // 턴을 넘기면서 기절 해제
                // 마지막 몬스터가 기절한 경우, 바로 플레이어 턴으로 넘어가야 함
                if (i === livingMonsters.length - 1) {
                    endMonstersTurn();
                }
                return;
            }

            // 몬스터 공격 애니메이션
            if (monsterElement) {
                monsterElement.style.transform = 'translateX(-40px) scale(1.05)';
                setTimeout(() => {
                    // 타겟팅된 몬스터는 원래의 Y축 이동으로 되돌림
                    if (monsterElement.classList.contains('targeted')) {
                        monsterElement.style.transform = 'translateY(-10px)';
                    } else {
                        monsterElement.style.transform = '';
                    }
                }, 150);
            }
            // --- 애니메이션 끝 ---

            // --- 플레이어 회피 체크 ---
            if (Math.random() < player.evasionChance / 100) {
                log(`용사가 ${monster.name}의 공격을 회피했다! (MISS)`, 'log-player');
                showFloatingText('MISS', playerElement, 'miss');
            } else {
                let usedSkill = false;
                // --- 몬스터 스킬 사용 시도 ---
                if (monster.skill && Math.random() < monster.skill.chance) {
                    const skill = monster.skill;
                    usedSkill = true;
                    switch (skill.type) {
                        case 'charge_attack':
                            monster.isCharging = true;
                            log(`⚡ ${monster.name}이(가) 강력한 힘을 모으기 시작합니다! (${skill.name})`, 'log-monster');
                            if(monsterElement) showFloatingText('Charging...', monsterElement, 'buff');
                            // 공격하지 않고 충전만 함
                            break;
                        case 'stun': {
                            let stunDmg = Math.floor(monster.atk * 1.2); // 스킬은 약간 더 강하게
                            const originalDmg = stunDmg;

                            // 신성한 방패 버프 적용
                    if (player.isHidden) {
                        log(`🌫️ 그림자 속에 숨어 ${monster.name}의 공격을 완벽하게 회피했습니다!`, 'log-player');
                        showFloatingText('EVADE', playerElement, 'miss');
                        player.isHidden = false; // 1회용
                        dmg = 0;
                    }

                    if (player.iceWall.active && player.iceWall.hp > 0) {
                        const absorbedDmg = Math.min(player.iceWall.hp, originalDmg);
                        player.iceWall.hp -= absorbedDmg;
                        dmg -= absorbedDmg;
                        log(`❄️ 아이스 월이 ${absorbedDmg}의 피해를 흡수했습니다! (남은 내구도: ${player.iceWall.hp})`, 'log-player');
                        if (player.iceWall.hp <= 0) {
                            player.iceWall.active = false;
                            log('❄️ 아이스 월이 파괴되었습니다!', 'log-system');
                        }
                    }

                    if (player.invincibleBuff.active) {
                        log(`🎲 무적 효과! ${monster.name}의 공격을 완벽하게 막아냈습니다!`, 'log-player');
                        showFloatingText('IMMUNE', playerElement, 'buff');
                        // 데미지를 0으로 만들고 함수를 계속 진행하여 다른 몬스터의 공격을 처리
                        dmg = 0;
                    }

                            if (player.divineShieldBuff.active) {
                                const reflectedDmg = Math.floor(originalDmg * 0.7);
                                monster.hp -= reflectedDmg;
                                log(`🛡️ 신성한 방패가 ${monster.name}에게 ${reflectedDmg}의 피해를 반사했습니다!`, 'log-player');
                                if(monsterElement) showFloatingText(reflectedDmg, monsterElement, 'damage');
                                stunDmg = Math.floor(originalDmg * 0.2); // 80% 피해 감소
                            }

                            // 방어 버프 적용
                            if (player.defenseBuff.turns > 0) {
                                stunDmg = Math.floor(stunDmg * (1 - player.defenseBuff.reduction));
                                if (!defenseBuffUsedThisTurn) { log(`🛡️ 방어 성공! 받는 피해가 감소했습니다.`, 'log-system'); defenseBuffUsedThisTurn = true; }
                            }
                            if (stunDmg > 0) player.hp -= stunDmg;
                            playSound('hit');                            
                            const skillName = skill.name || '강타';
                            showFloatingText(stunDmg, playerElement, 'crit');

                            // 기절 저항 체크
                            if (Math.random() < player.debuffResistance) {
                                log(`💥 ${monster.name}의 ${skillName}! ${dmg}의 피해를 입었지만, 기절 효과에는 저항했습니다!`, 'log-monster');
                                showFloatingText('RESIST', playerElement, 'buff');
                            } else {
                                player.isStunned = true;
                                log(`💥 ${monster.name}의 ${skillName}! ${stunDmg}의 피해를 입고 기절했습니다!`, 'log-monster');
                                showFloatingText('STUN', playerElement, 'stun');
                            }
                            break;
                        }
                        case 'drain': {
                            let drainDmg = monster.atk;
                            const originalDmg = drainDmg; // 회복량은 원래 데미지 기준

                            // 신성한 방패 버프 적용
                            if (player.isHidden) {
                                log(`🌫️ 그림자 속에 숨어 ${monster.name}의 ${skill.name}을(를) 완벽하게 회피했습니다!`, 'log-player');
                                showFloatingText('EVADE', playerElement, 'miss');
                                player.isHidden = false;
                                drainDmg = 0;
                            }
                            if (player.iceWall.active && player.iceWall.hp > 0) {
                                const absorbedDmg = Math.min(player.iceWall.hp, originalDmg);
                                player.iceWall.hp -= absorbedDmg;
                                drainDmg -= absorbedDmg;
                                log(`❄️ 아이스 월이 ${absorbedDmg}의 피해를 흡수했습니다! (남은 내구도: ${player.iceWall.hp})`, 'log-player');
                                if (player.iceWall.hp <= 0) {
                                    player.iceWall.active = false;
                                    log('❄️ 아이스 월이 파괴되었습니다!', 'log-system');
                                }
                            }
                            if (player.invincibleBuff.active) {
                                log(`🎲 무적 효과! ${monster.name}의 ${skill.name}을(를) 완벽하게 막아냈습니다!`, 'log-player');
                                showFloatingText('IMMUNE', playerElement, 'buff');
                                drainDmg = 0;
                            }

                            if (player.divineShieldBuff.active) {
                                const reflectedDmg = Math.floor(originalDmg * 0.7);
                                monster.hp -= reflectedDmg;
                                log(`🛡️ 신성한 방패가 ${monster.name}에게 ${reflectedDmg}의 피해를 반사했습니다!`, 'log-player');
                                if(monsterElement) showFloatingText(reflectedDmg, monsterElement, 'damage');
                                drainDmg = Math.floor(originalDmg * 0.2); // 80% 피해 감소
                            }

                            if (player.defenseBuff.turns > 0) {
                                drainDmg = Math.floor(drainDmg * (1 - player.defenseBuff.reduction));
                                if (!defenseBuffUsedThisTurn) { log(`🛡️ 방어 성공! 받는 피해가 감소했습니다.`, 'log-system'); defenseBuffUsedThisTurn = true; }
                            }
                            if (drainDmg > 0) player.hp -= drainDmg;
                            playSound('hit');
                            monster.hp = Math.min(monster.maxHp, monster.hp + originalDmg);
                            const skillName = skill.name || '생명력 흡수';
                            log(`🩸 ${monster.name}의 ${skillName}! ${drainDmg}의 피해를 입고 자신의 체력을 ${originalDmg}만큼 회복합니다.`, 'log-monster');
                            showFloatingText(drainDmg, playerElement, 'damage');
                            if(monsterElement) showFloatingText(`+${originalDmg}`, monsterElement, 'heal');
                            break;
                        }
                        case 'mp_drain': {
                            // 상태이상 저항 체크
                            if (Math.random() < player.debuffResistance) {
                                log(`🛡️ 전리품 효과! ${monster.name}의 마력 흡수 효과에 저항했습니다!`, 'log-player');
                                showFloatingText('RESIST', playerElement, 'buff');
                                break; // 저항 성공 시 스킬 무효
                            }
                            const drainedMp = skill.power;
                            player.mp = Math.max(0, player.mp - drainedMp);
                            const skillName = skill.name || '마력 흡수';
                            log(`🌀 ${monster.name}의 ${skillName}! 마나를 ${drainedMp}만큼 잃었습니다.`, 'log-monster');
                            showFloatingText(`-${drainedMp}MP`, playerElement, 'mp-heal');
                            break;
                        }
                        default:
                            usedSkill = false; // 정의되지 않은 스킬이면 일반 공격
                    }
                }
                
                // --- 몬스터 일반 공격 ---
                if (!usedSkill) {
                    const livingMinions = player.minions.filter(m => m.hp > 0);
                    let dmg = Math.floor(Math.random() * 3) + monster.atk;
                    let targetIsPlayer = true;

                    // 살아있는 미니언이 있으면 50% 확률로 미니언을 공격
                    if (livingMinions.length > 0 && Math.random() < 0.5) {
                        targetIsPlayer = false;
                    }

                    if (!targetIsPlayer) {
                        // --- 미니언 공격 로직 ---
                        const targetMinion = livingMinions[Math.floor(Math.random() * livingMinions.length)];
                        const minionWrappers = document.querySelectorAll('#minion-area .minion-wrapper');
                        const minionIndex = player.minions.findIndex(m => m.sourceId === targetMinion.sourceId);
                        const targetMinionElement = minionWrappers[minionIndex];

                        if (Math.random() < 0.17) { // 몬스터 치명타
                            dmg = Math.floor(dmg * 1.6);
                            log(`⚡ 치명타! ${monster.name}의 강력한 공격! ${targetMinion.name}에게 ${dmg}의 피해를 입혔습니다.`, 'log-monster');
                            if(targetMinionElement) showFloatingText(dmg, targetMinionElement, 'crit');
                        } else {
                            log(`${monster.name}의 공격! ${targetMinion.name}에게 ${dmg}의 피해를 입혔습니다.`, 'log-monster');
                            if(targetMinionElement) showFloatingText(dmg, targetMinionElement, 'damage');
                        }
                        
                        targetMinion.hp -= dmg;
                        playSound('hit');

                        if (targetMinion.hp <= 0) {
                            handleMinionDeath(targetMinion);
                        }
                    } else {
                        // --- 플레이어 공격 로직 (기존) ---
                        let isCrit = false;
                        if (Math.random() < 0.17) {
                            isCrit = true;
                            dmg = Math.floor(dmg * 1.6);
                        }
                        const originalDmg = dmg;

                        if (player.invincibleBuff.active) {
                            log(`🎲 무적 효과! ${monster.name}의 공격을 완벽하게 막아냈습니다!`, 'log-player');
                            showFloatingText('IMMUNE', playerElement, 'buff');
                            dmg = 0;
                        }

                        if (player.divineShieldBuff.active) {
                            const reflectedDmg = Math.floor(originalDmg * 0.7);
                            monster.hp -= reflectedDmg;
                            log(`🛡️ 신성한 방패가 ${monster.name}에게 ${reflectedDmg}의 피해를 반사했습니다!`, 'log-player');
                            if(monsterElement) showFloatingText(reflectedDmg, monsterElement, 'damage');
                            dmg = Math.floor(originalDmg * 0.2);
                        }

                        if (player.defenseBuff.turns > 0) {
                            dmg = Math.floor(dmg * (1 - player.defenseBuff.reduction));
                            if (!defenseBuffUsedThisTurn) { log(`🛡️ 방어 성공! 받는 피해가 감소했습니다.`, 'log-system'); defenseBuffUsedThisTurn = true; }
                        }

                        if (dmg > 0) {
                            player.hp -= dmg;
                            playSound('hit');
                        }

                        if (isCrit) {
                            log(`⚡ 치명타! ${monster.name}의 강력한 공격! ${dmg}의 피해를 입었습니다.`, 'log-monster');
                            showFloatingText(dmg, playerElement, 'crit');
                        } else {
                            log(`${monster.name}의 공격! ${dmg}의 피해를 입었습니다.`, 'log-monster');
                            showFloatingText(dmg, playerElement, 'damage');
                        }
                    }
                }

                // 플레이어 피격 애니메이션
                const pEmoji = document.getElementById('player-emoji');
                pEmoji.classList.add('hit');
                setTimeout(() => pEmoji.classList.remove('hit'), 300);
            }

            updateUI();

            // 모든 살아있는 몬스터의 공격이 끝났을 때 턴 종료 처리
            if (i === livingMonsters.length - 1) {
                endMonstersTurn();
            }
        }, i * 800); // 0.8초 간격으로 공격 (가독성 향상)
    });
}

/**
 * 소환수가 죽었을 때 처리하는 함수.
 * @param {object} minion - 죽은 소환수 객체.
 */
function handleMinionDeath(minion) {
    log(`💀 ${minion.name}이(가) 쓰러졌습니다! 5층 후에 다시 소환할 수 있습니다.`, 'log-system');
    
    // 보관함에 있는 원본 영체의 상태를 업데이트합니다.
    const originalSpirit = player.capturedSpirits.find(s => s.id === minion.sourceId);
    if (originalSpirit) {
        originalSpirit.isSummoned = false;
        originalSpirit.cooldownUntilFloor = floor + 5;
    }

    // 필드에서 소환수를 제거합니다.
    const minionIdx = player.minions.findIndex(m => m.sourceId === minion.sourceId);
    if (minionIdx > -1) {
        player.minions.splice(minionIdx, 1);
    }
}
/**
 * 몬스터 턴 종료 후 플레이어 턴으로 전환하거나 게임오버를 처리합니다.
 */
function endMonstersTurn() {
    // 플레이어 사망 체크
    if (player.hp <= 0) {
        player.hp = 0;
        updateUI();
        gameOver();
    } else {
        // 방어 버프 턴 감소
        if (player.defenseBuff.turns > 0) {
            player.defenseBuff.turns--;
        }

        // Hero: Shout of Resolve
        if (player.shoutOfResolveBuff.active) {
            player.shoutOfResolveBuff.turns--;
            const regen = Math.floor(player.maxHp * 0.05);
            player.hp = Math.min(player.maxHp, player.hp + regen);
            log(`🗣️ 결의의 외침 효과로 체력이 ${regen}만큼 회복됩니다.`, 'log-system', { color: '#22c55e' });
            showFloatingText(`+${regen}`, document.getElementById('player-character'), 'heal');
            if (player.shoutOfResolveBuff.turns === 0) {
                recalculatePlayerStats();
                log('결의의 외침 효과가 사라졌습니다.', 'log-system');
            }
        }

        // Wizard: Ice Wall
        if (player.iceWall.active) {
            player.iceWall.turns--;
            if (player.iceWall.turns <= 0) {
                player.iceWall.active = false;
                log('❄️ 아이스 월이 녹아 사라집니다.', 'log-system');
            }
        }

        // Rogue: Smoke Bomb
        if (player.smokeBombBuff.active) {
            player.smokeBombBuff.turns--;
            if (player.smokeBombBuff.turns === 0) {
                recalculatePlayerStats();
                log('🌫️ 연막 효과가 사라졌습니다.', 'log-system');
            }
        }

        // Paladin: Blessing
        if (player.blessingBuff.active) {
            player.blessingBuff.turns--;
            const regen = Math.floor(player.maxHp * 0.1);
            player.hp = Math.min(player.maxHp, player.hp + regen);
            log(`✨ 축복 효과로 체력이 ${regen}만큼 회복됩니다.`, 'log-system', { color: '#22c55e' });
            showFloatingText(`+${regen}`, document.getElementById('player-character'), 'heal');
            if (player.blessingBuff.turns === 0) {
                log('축복 효과가 사라졌습니다.', 'log-system');
            }
        }

        // 독 바르기 버프 턴 감소
        if (player.poisonBuff.turns > 0) {
            player.poisonBuff.turns--;
            if (player.poisonBuff.turns === 0) {
                log('무기에 바른 독의 효과가 사라졌습니다.', 'log-system');
            }
        }

        // 신성한 방패 버프 턴 감소
        if (player.divineShieldBuff.active && player.divineShieldBuff.turns > 0) {
            player.divineShieldBuff.turns--;
            if (player.divineShieldBuff.turns === 0) {
                player.divineShieldBuff.active = false;
                log('신성한 방패의 기운이 사라졌습니다.', 'log-system');
            }
        }

        // 도박꾼 힘 버프 턴 감소
        if (player.strBuff.turns > 0) {
            player.strBuff.turns--;
            if (player.strBuff.turns === 0) {
                player.strBuff.multiplier = 1;
                recalculatePlayerStats();
                log('힘 증가 효과가 사라졌습니다.', 'log-system');
            }
        }

        // 도박꾼 무적 버프 턴 감소
        if (player.invincibleBuff.turns > 0) {
            player.invincibleBuff.turns--;
            if (player.invincibleBuff.turns === 0) player.invincibleBuff.active = false;
        }

        // 전리품 효과: 턴 종료 시 체력 회복
        if (player.hpRegen > 0 && player.hp < player.maxHp) {
            const healedAmount = Math.min(player.maxHp - player.hp, player.hpRegen);
            player.hp += healedAmount;
            log(`✨ 전리품 효과로 체력이 ${healedAmount}만큼 회복됩니다.`, 'log-system', { color: '#22c55e' });
            showFloatingText(`+${healedAmount}`, document.getElementById('player-character'), 'heal');
        }

        turn++;
        isPlayerTurn = true;
        toggleControls(true); // 플레이어 턴으로 전환하고 컨트롤 버튼 활성화
        updateUI();
    }
}

//** ============================================================ **//
//** 3. 스킬 및 아이템 사용
//** ============================================================ **//

/**
 * '강 공격' 스킬을 실행하는 함수.
 * - 단일 대상에게 높은 피해를 줍니다. (기본 공격력의 200% + 마력 추가 피해)
 * - 15 MP를 소모하며, 3%의 고정 흑섬 발동 확률을 가집니다.
 */
function executePowerAttack() {
    if (isGameOver || !isPlayerTurn) return;

    const targetMonster = monsters[player.targetIndex];
    if (targetMonster.hp <= 0) {
        log("이미 쓰러진 몬스터입니다.", 'log-system');
        return;
    }

    // 방어 태세 여부에 따라 총 MP 소모량 계산
    const mpCost = 15;
    const defenseMpCost = player.defenseStance ? 10 : 0;
    const totalMpCost = Math.floor((mpCost + defenseMpCost) * player.mpCostMultiplier);

    if (player.mp < totalMpCost) {
        alert(`MP가 부족합니다! (필요: ${totalMpCost})`);
        if (player.defenseStance) {
            // MP 부족 시 방어 태세 자동 해제
            player.defenseStance = false;
            showSkillSelection();
        }
        return;
    }

    if (player.isStunned) {
        log("플레이어가 기절해서 움직일 수 없습니다!", 'log-player');
        player.isStunned = false; // 턴을 넘기면서 기절 해제
        setTimeout(playerTurnEnd, 800);
        return;
    }

    isPlayerTurn = false;
    toggleControls(false);

    // --- 방어 태세 로직 적용 ---
    if (player.defenseStance) {
        if (Math.random() < 0.78) {
            player.defenseBuff.turns = 1;
            log('🛡️ 방어 태세에 성공했습니다! 다음 몬스터 턴의 피해가 60% 감소합니다.', 'log-system');
            showFloatingText('방어 성공!', document.getElementById('player-character'), 'buff');
        } else {
            log('방어에 집중했지만, 실패했습니다...', 'log-system');
            showFloatingText('방어 실패', document.getElementById('player-character'), 'miss');
        }
        player.defenseStance = false; // 사용 후 해제
    }

    // --- MP 소모 및 공격 애니메이션 ---
    player.mp -= totalMpCost;
    playSound('attack');

    // 강한 공격 애니메이션
    const playerElement = document.getElementById('player-character');
    playerElement.style.transform = 'translateX(50px) scale(1.1)'; // 일반 공격보다 조금 더 강하게
    setTimeout(() => {
        playerElement.style.transform = ''; // 원래 위치로
    }, 150);
    // --- 애니메이션 끝 ---

    const monsterWrappers = document.querySelectorAll('#monster-area .monster-wrapper');
    const targetMonsterElement = monsterWrappers[player.targetIndex];

    // --- 몬스터 회피 체크 (5% 확률) ---
    // MP를 사용하는 스킬도 빗나갈 수 있으며, 빗나가도 MP는 소모됩니다.
    if (Math.random() < 0.05) {
        log(`💥 강 공격! 하지만 ${targetMonster.name}이(가) 공격을 회피했다! (MISS)`, 'log-monster');
        showFloatingText('MISS', targetMonsterElement, 'miss');
        updateUI(); // MP 감소를 UI에 즉시 반영
        setTimeout(playerTurnEnd, 800);
        return;
    }

    // --- 흑섬(Black Flash) 발동 체크 (강공격 시 3% 고정 확률) ---
    if (Math.random() < 0.03) {
        playSound('black-flash');
        triggerBlackFlash();
        let dmg = Math.floor(player.atk * 6.25);
        log('⚫ 흑섬(黑閃) 발동!', 'log-player', { fontSize: '24px', color: 'white', textShadow: '0 0 5px black, 0 0 15px red' });
        log(`용사가 ${targetMonster.name}에게 ${dmg}의 경이적인 피해를 입혔습니다!`, 'log-player');

        if (!player.blackFlashBuff.active) {
            player.blackFlashBuff.active = true;
            recalculatePlayerStats(); // 스탯 즉시 적용
            log('온 몸에 흑섬의 기운이 감돈다! (3층 동안 모든 능력치 1.6배)', 'log-system');
        }
        player.blackFlashBuff.duration = 3; // 흑섬이 터질 때마다 지속시간 갱신

        player.guaranteedCrit = true; // 다음 공격 확정 치명타
        log('흑섬의 여파로 다음 공격은 반드시 치명타가 됩니다!', 'log-system');

        targetMonster.hp -= dmg;
        showFloatingText(dmg, targetMonsterElement, 'black-flash');
    } else {
        // --- 일반 강 공격 로직 ---
        let dmg = Math.floor(player.atk * 2.0 + player.magicDamageBonus); // 200% 데미지 + 마력 추가 피해

        // 확정 치명타 체크
        if (player.guaranteedCrit) {
            playSound('crit');
            dmg = Math.floor((player.atk * 2.0) * player.critDamage + player.magicDamageBonus); // 치명타는 기본 공격력에만 적용 후 마력 피해 추가
            player.guaranteedCrit = false; // 사용 후 플래그 해제
            log('⚡ 흑섬의 여파로 강 공격이 치명타로 적중했습니다!', 'log-player');
        } else {
            log(`💥 강 공격! ${targetMonster.name}에게 ${dmg}의 강력한 피해를 입혔습니다!`, 'log-player');
        }
        showFloatingText(dmg, targetMonsterElement, 'crit'); // 강공격은 항상 crit 스타일로 표시

        targetMonster.hp -= dmg;
        applyPoisonEffect(targetMonster);

        // 3% 확률로 몬스터 기절 (강공격은 2배 확률)
        if (Math.random() < 0.06) {
            targetMonster.isStunned = true;
            log(`몬스터가 기절했습니다!`, 'log-system');
            showFloatingText('STUN', targetMonsterElement, 'stun');
        }
    }

    // --- 몬스터 피격 애니메이션 및 턴 종료 처리 ---
    if (targetMonsterElement) {
        const emojiElement = targetMonsterElement.querySelector('.emoji');
        emojiElement.classList.add('hit');
        setTimeout(() => emojiElement.classList.remove('hit'), 300);
    }

    updateUI();

    const allDead = monsters.every(m => m.hp <= 0);
    if (allDead) {
        if (targetMonster.hp <= 0) {
            playSound('monster-die');
            log(`${targetMonster.name}을(를) 쓰러뜨렸다!`, 'log-player');
            gainXP(targetMonster.xp);
        }
        winBattle();
    } else {
        if (targetMonster.hp <= 0) {
            playSound('monster-die');
            log(`${targetMonster.name}을(를) 쓰러뜨렸다!`, 'log-player');
            gainXP(targetMonster.xp);
            findNextTarget();
        }
        setTimeout(playerTurnEnd, 800);
    }
}

/**
 * '휩쓸기' 스킬을 실행하는 함수.
 * - 살아있는 모든 몬스터에게 광역 피해를 줍니다. (기본 공격력의 80% + 마력 추가 피해)
 * - 25 MP를 소모합니다.
 */
function executeSweepAttack() {
    if (isGameOver || !isPlayerTurn) return;

    // 방어 태세 여부에 따라 총 MP 소모량 계산
    const mpCost = 25;
    const defenseMpCost = player.defenseStance ? 10 : 0;
    const totalMpCost = Math.floor((mpCost + defenseMpCost) * player.mpCostMultiplier);

    if (player.mp < totalMpCost) {
        alert(`MP가 부족합니다! (필요: ${totalMpCost})`);
        if (player.defenseStance) {
            // MP 부족 시 방어 태세 자동 해제
            player.defenseStance = false;
            showSkillSelection();
        }
        return;
    }

    if (player.isStunned) {
        log("플레이어가 기절해서 움직일 수 없습니다!", 'log-player');
        player.isStunned = false; // 턴을 넘기면서 기절 해제
        setTimeout(playerTurnEnd, 800);
        return;
    }

    isPlayerTurn = false;
    toggleControls(false);

    // --- 방어 태세 로직 적용 ---
    if (player.defenseStance) {
        if (Math.random() < 0.78) {
            player.defenseBuff.turns = 1;
            log('🛡️ 방어 태세에 성공했습니다! 다음 몬스터 턴의 피해가 60% 감소합니다.', 'log-system');
            showFloatingText('방어 성공!', document.getElementById('player-character'), 'buff');
        } else {
            log('방어에 집중했지만, 실패했습니다...', 'log-system');
            showFloatingText('방어 실패', document.getElementById('player-character'), 'miss');
        }
        player.defenseStance = false; // 사용 후 해제
    }

    // --- MP 소모 및 공격 애니메이션 ---
    player.mp -= totalMpCost;
    playSound('attack');

    // 휩쓸기 애니메이션
    const playerElement = document.getElementById('player-character');
    // transition을 임시로 변경하여 회전 효과를 줌
    playerElement.style.transition = 'transform 0.3s ease';
    playerElement.style.transform = 'rotate(360deg) scale(1.1)';
    setTimeout(() => {
        playerElement.style.transform = '';
        // transition 속성을 원래대로 복구 (CSS에 정의된 값으로 돌아가도록)
        setTimeout(() => playerElement.style.removeProperty('transition'), 300);
    }, 300);
    // --- 애니메이션 끝 ---

    log('🌪️ 휩쓸기를 시전하여 모든 적을 공격합니다!', 'log-player');

    const livingMonsters = monsters.filter(m => m.hp > 0);
    const monsterElements = document.querySelectorAll('#monster-area .monster-wrapper');
    let totalXpGained = 0;

    // --- 확정 치명타 체크 ---
    const isCrit = player.guaranteedCrit;
    if (isCrit) {
        playSound('crit');
        player.guaranteedCrit = false; // 사용 후 플래그 해제
        log('⚡ 흑섬의 여파로 휩쓸기가 치명타로 적중합니다!', 'log-player');
    }

    livingMonsters.forEach((monster, index) => {
        // 각 몬스터에게 순차적으로 데미지를 줌
        setTimeout(() => {
            let baseDmg = Math.floor(Math.random() * 5) + player.atk;
            let dmg = Math.floor(baseDmg * 0.8 + player.magicDamageBonus); // 기본 데미지의 80% + 마력 추가 피해

            const monsterIndexInAll = monsters.findIndex(m => m === monster);
            const targetElement = monsterElements[monsterIndexInAll];
            
            // 치명타 여부에 따라 데미지 및 효과 적용
            if (isCrit) {
                dmg = Math.floor((baseDmg * 0.8) * player.critDamage + player.magicDamageBonus);
                showFloatingText(dmg, targetElement, 'crit');
            } else {
                showFloatingText(dmg, targetElement, 'damage');
            }
            
            monster.hp -= dmg;
            applyPoisonEffect(monster);

            // 몬스터 피격 애니메이션
            if (targetElement) {
                const emojiElement = targetElement.querySelector('.emoji');
                emojiElement.classList.add('hit');
                setTimeout(() => emojiElement.classList.remove('hit'), 300);
            }

            // 몬스터 사망 처리 및 경험치 합산
            if (monster.hp <= 0) {
                playSound('monster-die');
                log(`${monster.name}을(를) 쓰러뜨렸다!`, 'log-player');
                totalXpGained += monster.xp;
            } else {
                // 살아남은 몬스터에게만 기절 확률 적용
                if (Math.random() < 0.03) {
                    monster.isStunned = true;
                    log(`${monster.name}이(가) 기절했습니다!`, 'log-system');
                    showFloatingText('STUN', targetElement, 'stun');
                }
            }

            // --- 마지막 몬스터 공격 후 턴 종료 처리 ---
            if (index === livingMonsters.length - 1) {
                if (totalXpGained > 0) {
                    gainXP(totalXpGained);
                }
                updateUI();
                const allDead = monsters.every(m => m.hp <= 0);
                if (allDead) {
                    winBattle();
                } else {
                    findNextTarget();
                    setTimeout(playerTurnEnd, 800);
                }
            }
        }, index * 150); // 0.15초 간격으로 공격
    });

    updateUI();
}

/**
 * '방어 태세'를 켜고 끄는 토글 함수.
 * - 이 행동 자체는 턴을 소모하지 않습니다.
 * - 활성화된 상태에서 다음 공격 스킬 사용 시 10 MP를 추가로 소모하여, 78% 확률로 방어 버프를 얻습니다.
 */
function toggleDefenseStance() {
    if (isGameOver || !isPlayerTurn) return;

    player.defenseStance = !player.defenseStance;

    if (player.defenseStance) {
        log('방어 태세를 취합니다. 다음 공격 행동 시 방어 효과가 적용됩니다.', 'log-player');
    } else {
        log('방어 태세를 해제합니다.', 'log-player');
    }

    showSkillSelection(); // 버튼 색상 등 UI 갱신
}

/**
 * '결의의 외침' 스킬을 실행하는 함수 (용사 전용).
 * - 3턴간 공격력을 30% 증가시키고, 턴마다 최대 체력의 5%를 회복합니다.
 * - 턴을 소모하지 않습니다.
 */
function executeShoutOfResolve() {
    if (isGameOver || !isPlayerTurn) return;

    // 버프가 활성화 상태이면 취소
    if (player.shoutOfResolveBuff.active) {
        player.shoutOfResolveBuff.active = false;
        player.shoutOfResolveBuff.turns = 0;
        recalculatePlayerStats(); // 버프 효과 제거 후 스탯 재계산
        log('🗣️ 결의의 외침 효과를 해제했습니다.', 'log-system');
        updateUI();
        showSkillSelection(); // 버튼 UI 갱신
        return;
    }

    const totalMpCost = Math.floor(20 * player.mpCostMultiplier);
    if (player.mp < totalMpCost) {
        alert(`MP가 부족합니다! (필요: ${totalMpCost})`);
        return;
    }
    player.mp -= totalMpCost;
    playSound('heal');

    player.shoutOfResolveBuff = { active: true, turns: 3 };
    recalculatePlayerStats(); // 버프 적용을 위해 스탯 재계산

    log('🗣️ 결의의 외침! 3턴간 공격력이 30% 증가하고, 턴마다 체력이 회복됩니다.', 'log-player');
    showFloatingText('ATK UP & REGEN', document.getElementById('player-character'), 'buff');
    
    updateUI();
    showSkillSelection(); // 버튼 UI 갱신
}

/**
 * 공격 시 '독 바르기' 버프가 활성화되어 있으면 대상에게 독 효과를 적용합니다.
 * @param {object} monster - 독을 적용할 몬스터 객체.
 */
function applyPoisonEffect(monster) {
    // 도적의 '독 바르기' 버프가 활성화 상태일 때만 작동
    if (player.characterClass === 'rogue' && player.poisonBuff.turns > 0) {
        // 이미 중독 상태면 턴만 갱신, 아니면 새로 적용
        if (monster.poison && monster.poison.turns > 0) {
            monster.poison.turns = 3;
        } else {
            monster.poison = { turns: 3, damage: player.poisonBuff.damage };
        }
        
        const monsterIndex = monsters.findIndex(m => m === monster);
        const monsterElement = document.querySelectorAll('#monster-area .monster-wrapper')[monsterIndex];
        
        log(`☠️ ${monster.name}에게 독을 묻혔습니다!`, 'log-player');
        if (monsterElement) showFloatingText('POISON', monsterElement, 'poison-buff');
    }
}

/**
 * '마나 블래스터' 스킬을 실행하는 함수 (마법사 전용).
 * - 단일 대상에게 마법 피해를 줍니다. (MP 20 소모)
 */
function executeManaBlaster() {
    if (isGameOver || !isPlayerTurn) return;

    const targetMonster = monsters[player.targetIndex];
    if (targetMonster.hp <= 0) {
        log("이미 쓰러진 몬스터입니다.", 'log-system');
        return;
    }

    const totalMpCost = Math.floor(10 * player.mpCostMultiplier);
    if (player.mp < totalMpCost) {
        alert(`MP가 부족합니다! (필요: ${totalMpCost})`);
        return;
    }

    isPlayerTurn = false;
    toggleControls(false);
    player.mp -= totalMpCost;
    playSound('heal'); // 마법 효과음으로 재사용

    const monsterWrappers = document.querySelectorAll('#monster-area .monster-wrapper');
    const targetMonsterElement = monsterWrappers[player.targetIndex];

    let dmg = Math.floor(player.atk * 1.5 + player.magicDamageBonus);
    log(`💧 마나 블래스터! ${targetMonster.name}에게 ${dmg}의 마법 피해를 입혔습니다!`, 'log-player');
    showFloatingText(dmg, targetMonsterElement, 'mana-blast');

    targetMonster.hp -= dmg;

    if (targetMonsterElement) {
        const emojiElement = targetMonsterElement.querySelector('.emoji');
        emojiElement.classList.add('hit');
        setTimeout(() => emojiElement.classList.remove('hit'), 300);
    }

    updateUI();

    const allDead = monsters.every(m => m.hp <= 0);
    if (allDead) {
        if (targetMonster.hp <= 0) {
            playSound('monster-die');
            log(`${targetMonster.name}을(를) 쓰러뜨렸다!`, 'log-player');
            gainXP(targetMonster.xp);
        }
        winBattle();
    } else {
        if (targetMonster.hp <= 0) {
            playSound('monster-die');
            log(`${targetMonster.name}을(를) 쓰러뜨렸다!`, 'log-player');
            gainXP(targetMonster.xp);
            findNextTarget();
        }
        setTimeout(playerTurnEnd, 800);
    }
}

/**
 * '파이어볼' 스킬을 실행하는 함수 (마법사 전용).
 * - 단일 대상에게 강력한 화염 피해를 줍니다. (MP 25 소모)
 */
function executeFireball() {
    // --- 기본 조건 검사 ---
    if (isGameOver || !isPlayerTurn) return;

    const totalMpCost = Math.floor(20 * player.mpCostMultiplier);
    if (player.mp < totalMpCost) {
        alert(`MP가 부족합니다! (필요: ${totalMpCost})`);
        return;
    }

    const targetMonster = monsters[player.targetIndex];
    if (targetMonster.hp <= 0) {
        log("이미 쓰러진 몬스터입니다.", 'log-system');
        return;
    }

    // --- 턴 및 MP 처리 ---
    isPlayerTurn = false;
    toggleControls(false);
    player.mp -= totalMpCost;
    playSound('crit'); // 강력한 효과음으로 재사용

    // --- 다중 타겟 선정 로직 ---
    const targets = [targetMonster];
    const otherLivingMonsters = monsters.filter(m => m.hp > 0 && m !== targetMonster);
    // 다른 몬스터들을 무작위로 섞음
    for (let i = otherLivingMonsters.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [otherLivingMonsters[i], otherLivingMonsters[j]] = [otherLivingMonsters[j], otherLivingMonsters[i]];
    }
    // 최대 2마리의 추가 타겟을 선정
    const additionalTargets = otherLivingMonsters.slice(0, 2);
    targets.push(...additionalTargets);
    // --- 타겟 선정 끝 ---

    log(`🔥 파이어볼! ${targets.map(t => t.name).join(', ')}에게 화염구를 날립니다!`, 'log-player');

    const monsterElements = document.querySelectorAll('#monster-area .monster-wrapper');
    let totalXpGained = 0;

    targets.forEach((monster, index) => {
        setTimeout(() => {
            const monsterIndexInAll = monsters.findIndex(m => m === monster);
            const targetElement = monsterElements[monsterIndexInAll];

            // --- 데미지 및 화상 효과 적용 ---
            let dmg = Math.floor(player.atk * 2.0 + player.magicDamageBonus);
            // 화상 데미지를 파이어볼 초기 피해량의 15%로 설정
            let burnDmg = Math.floor(dmg * 0.15); 
            showFloatingText(dmg, targetElement, 'fireball');
            monster.hp -= dmg;

            // 화상 효과 적용
            if (burnDmg > 0) {
                monster.burn = { turns: 3, damage: burnDmg };
                log(`${monster.name}이(가) 화상 상태가 되었다! (3턴 동안 턴마다 ${burnDmg} 피해)`, 'log-monster');
            }

            if (targetElement) {
                const emojiElement = targetElement.querySelector('.emoji');
                emojiElement.classList.add('hit');
                setTimeout(() => emojiElement.classList.remove('hit'), 300);
            }

            if (monster.hp <= 0) {
                playSound('monster-die');
                log(`${monster.name}을(를) 쓰러뜨렸다!`, 'log-player');
                totalXpGained += monster.xp;
            }

            // 마지막 타겟 공격 후 턴 종료 처리
            if (index === targets.length - 1) {
                if (totalXpGained > 0) gainXP(totalXpGained);
                updateUI();
                const allDead = monsters.every(m => m.hp <= 0);
                if (allDead) winBattle();
                else { findNextTarget(); setTimeout(playerTurnEnd, 800); }
            }
        }, index * 150); // 순차적으로 공격하는 것처럼 보이게 함
    });
    updateUI();
}

/**
 * '일렉트로닉 빔' 스킬을 실행하는 함수 (마법사 전용).
 * - 단일 적에게 피해를 주고, 20% 확률로 기절시킵니다.
 * - 60% 확률로 인접한 다른 적에게 연쇄 공격을 가합니다. (MP 25 소모)
 */
function executeElectronicBeam() {
    if (isGameOver || !isPlayerTurn) return;

    const totalMpCost = Math.floor(25 * player.mpCostMultiplier);
    if (player.mp < totalMpCost) {
        alert(`MP가 부족합니다! (필요: ${totalMpCost})`);
        return;
    }

    const primaryTarget = monsters[player.targetIndex];
    if (primaryTarget.hp <= 0) {
        log("이미 쓰러진 몬스터입니다.", 'log-system');
        return;
    }

    isPlayerTurn = false;
    toggleControls(false);
    player.mp -= totalMpCost;
    playSound('black-flash'); // 광역 효과음으로 재사용

    log(`⚡ 일렉트로닉 빔! ${primaryTarget.name}에게 전기를 방출합니다!`, 'log-player');

    const monsterElements = document.querySelectorAll('#monster-area .monster-wrapper');
    let totalXpGained = 0;
    const targets = [primaryTarget];

    // --- 연쇄 공격(Chain Attack) 대상 찾기 ---
    if (Math.random() < 0.6) {
        const adjacentIndices = [player.targetIndex - 1, player.targetIndex + 1];
        const validChainTargets = adjacentIndices
            .map(i => monsters[i])
            .filter(m => m && m.hp > 0);

        if (validChainTargets.length > 0) {
            const chainTarget = validChainTargets[Math.floor(Math.random() * validChainTargets.length)];
            targets.push(chainTarget);
            log(`⚡ 빔이 ${chainTarget.name}에게 연쇄됩니다!`, 'log-player');
        }
    }

    // --- 대상들에게 공격 및 효과 적용 ---
    const attackTarget = (monster, isChain) => {
        let dmg = Math.floor(player.atk * 2.5 + player.magicDamageBonus);
        const monsterIndex = monsters.findIndex(m => m === monster);
        const targetElement = monsterElements[monsterIndex];

        showFloatingText(dmg, targetElement, 'beam');
        monster.hp -= dmg;

        // 기절 효과 (20% 확률)
        if (Math.random() < 0.2) {
            if (Math.random() >= player.debuffResistance) {
                monster.isStunned = true;
                log(`${monster.name}이(가) 감전되어 기절했습니다!`, 'log-monster');
                showFloatingText('STUN', targetElement, 'stun');
            } else {
                log(`${monster.name}이(가) 감전되었지만, 기절에 저항했습니다!`, 'log-player');
                showFloatingText('RESIST', targetElement, 'buff');
            }
        }

        if (targetElement) {
            const emojiElement = targetElement.querySelector('.emoji');
            emojiElement.classList.add('hit');
            setTimeout(() => emojiElement.classList.remove('hit'), 300);
        }

        if (monster.hp <= 0) {
            playSound('monster-die');
            log(`${monster.name}을(를) 쓰러뜨렸다!`, 'log-player');
            totalXpGained += monster.xp;
        }
    };

    attackTarget(targets[0], false);
    if (targets.length > 1) {
        setTimeout(() => attackTarget(targets[1], true), 200);
    }

    // --- 턴 종료 처리 ---
    setTimeout(() => {
        if (totalXpGained > 0) gainXP(totalXpGained);
        updateUI();
        const allDead = monsters.every(m => m.hp <= 0);
        if (allDead) winBattle();
        else { findNextTarget(); setTimeout(playerTurnEnd, 800); }
    }, targets.length > 1 ? 400 : 200);
    
    updateUI();
}

/**
 * '독 바르기' 스킬을 실행하는 함수 (도적 전용).
 * - 5턴간 자신의 공격에 독 효과를 부여합니다. (MP 15 소모)
 */
function executeApplyPoison() {
    if (isGameOver || !isPlayerTurn) return;

    const totalMpCost = Math.floor(10 * player.mpCostMultiplier);
    if (player.mp < totalMpCost) {
        alert(`MP가 부족합니다! (필요: ${totalMpCost})`);
        return;
    }

    isPlayerTurn = false;
    toggleControls(false);
    player.mp -= totalMpCost;
    playSound('heal'); // 버프 사운드 재사용

    // 독 데미지는 민첩(agi)과 마력(mag)에 비례
    const poisonDamage = Math.floor((player.agi + player.mag) * 0.5 + 5);
    player.poisonBuff = { turns: 5, damage: poisonDamage };

    log(`☠️ 독 바르기! 5턴 동안 공격 시 ${poisonDamage}의 독 피해를 추가로 입힙니다.`, 'log-player');
    showFloatingText('독 바르기!', document.getElementById('player-character'), 'poison-buff');
    
    updateUI();
    setTimeout(playerTurnEnd, 800); // 턴 종료
}

/**
 * '급소 찌르기' 스킬을 실행하는 함수 (도적 전용).
 * - 단일 대상에게 피해를 주며, 중독 상태일 경우 추가 피해를 줍니다. (MP 20 소모)
 */
function executeVitalStrike() {
    if (isGameOver || !isPlayerTurn) return;

    const targetMonster = monsters[player.targetIndex];
    if (targetMonster.hp <= 0) {
        log("이미 쓰러진 몬스터입니다.", 'log-system');
        return;
    }

    const totalMpCost = Math.floor(20 * player.mpCostMultiplier);
    if (player.mp < totalMpCost) {
        alert(`MP가 부족합니다! (필요: ${totalMpCost})`);
        return;
    }

    isPlayerTurn = false;
    toggleControls(false);
    player.mp -= totalMpCost;

    const monsterWrappers = document.querySelectorAll('#monster-area .monster-wrapper');
    const targetMonsterElement = monsterWrappers[player.targetIndex];

    let dmg = Math.floor(player.atk * 1.2 + player.magicDamageBonus);
    const isAlreadyPoisoned = targetMonster.poison && targetMonster.poison.turns > 0;

    // --- 치명타 체크 (급소 찌르기는 기본 치명타율 + 15% 보너스) ---
    let isCrit = false;
    const critChanceForSkill = player.critChance + 15;
    if (player.guaranteedCrit) {
        isCrit = true;
        player.guaranteedCrit = false; // 사용 후 플래그 해제
    } else if (Math.random() < critChanceForSkill / 100) {
        isCrit = true;
    }

    // --- 데미지 계산 ---
    if (isAlreadyPoisoned) {
        const extraDamage = Math.floor(dmg * 1.5 + targetMonster.poison.damage * 2);
        dmg += extraDamage;
    }

    if (isCrit) {
        playSound('crit');
        dmg = Math.floor(dmg * player.critDamage);
        log(`🩸 치명적인 급소 찌르기! ${isAlreadyPoisoned ? `중독된 ${targetMonster.name}의 약점을 파고들어` : `${targetMonster.name}에게`} ${dmg}의 폭발적인 피해를 입혔습니다!`, 'log-player');
        showFloatingText(dmg, targetMonsterElement, 'crit');
    } else {
        playSound('attack');
        log(`🩸 급소 찌르기! ${isAlreadyPoisoned ? `중독된 ${targetMonster.name}의 약점을 파고들어` : `${targetMonster.name}에게`} ${dmg}의 피해를 입혔습니다.`, 'log-player');
        showFloatingText(dmg, targetMonsterElement, 'damage');
    }

    // --- 독 바르기 효과 적용 ---
    if (player.poisonBuff.turns > 0) {
        let appliedPoisonDamage = player.poisonBuff.damage;
        if (isCrit) {
            appliedPoisonDamage *= 2;
            log(`☠️ 치명타 효과로 더욱 강력한 독이 스며듭니다! (피해량 2배)`, 'log-player');
        }
        targetMonster.poison = { turns: 3, damage: appliedPoisonDamage };
        log(`☠️ ${targetMonster.name}에게 독을 묻혔습니다!`, 'log-player');
        if (targetMonsterElement) showFloatingText('POISON', targetMonsterElement, 'poison-buff');
    }

    targetMonster.hp -= dmg;

    if (targetMonsterElement) {
        const emojiElement = targetMonsterElement.querySelector('.emoji');
        emojiElement.classList.add('hit');
        setTimeout(() => emojiElement.classList.remove('hit'), 300);
    }

    updateUI();

    const allDead = monsters.every(m => m.hp <= 0);
    if (allDead) {
        if (targetMonster.hp <= 0) {
            playSound('monster-die');
            log(`${targetMonster.name}을(를) 쓰러뜨렸다!`, 'log-player');
            gainXP(targetMonster.xp);
        }
        winBattle();
    } else {
        if (targetMonster.hp <= 0) {
            playSound('monster-die');
            log(`${targetMonster.name}을(를) 쓰러뜨렸다!`, 'log-player');
            gainXP(targetMonster.xp);
            findNextTarget();
        }
        setTimeout(playerTurnEnd, 800);
    }
}

/**
 * '연막탄' 스킬을 실행하는 함수 (도적 전용).
 * - 2턴간 회피율을 30% 증가시킵니다.
 */
function executeSmokeBomb() {
    if (isGameOver || !isPlayerTurn) return;

    // 버프가 활성화 상태이면 취소
    if (player.smokeBombBuff.active) {
        player.smokeBombBuff.active = false;
        player.smokeBombBuff.turns = 0;
        recalculatePlayerStats();
        log('🌫️ 연막 효과를 해제했습니다.', 'log-system');
        updateUI();
        showSkillSelection();
        return;
    }

    const totalMpCost = Math.floor(15 * player.mpCostMultiplier);
    if (player.mp < totalMpCost) {
        alert(`MP가 부족합니다! (필요: ${totalMpCost})`);
        return;
    }
    player.mp -= totalMpCost;
    playSound('heal');

    player.smokeBombBuff = { active: true, turns: 2 };
    recalculatePlayerStats(); // To apply evasion buff

    log('🌫️ 연막탄! 2턴간 회피율이 30% 증가합니다.', 'log-player');
    showFloatingText('EVASION UP', document.getElementById('player-character'), 'buff');
    
    updateUI();
    showSkillSelection();
}

/**
 * '그림자 습격' 스킬을 실행하는 함수 (도적 전용).
 * - 무작위 적을 공격하고, 치명타 시 1턴간 숨습니다.
 */
function executeShadowRaid() {
    if (isGameOver || !isPlayerTurn) return;
    const totalMpCost = Math.floor(25 * player.mpCostMultiplier);
    if (player.mp < totalMpCost) {
        alert(`MP가 부족합니다! (필요: ${totalMpCost})`);
        return;
    }

    const livingMonsters = monsters.filter(m => m.hp > 0);
    if (livingMonsters.length === 0) {
        log("공격할 대상이 없습니다.", "log-system");
        return;
    }

    isPlayerTurn = false;
    toggleControls(false);
    player.mp -= totalMpCost;
    playSound('attack');

    const targetMonster = livingMonsters[Math.floor(Math.random() * livingMonsters.length)];
    const targetIndex = monsters.indexOf(targetMonster);
    const targetMonsterElement = document.querySelectorAll('#monster-area .monster-wrapper')[targetIndex];

    let dmg = Math.floor(player.atk * 1.5 + player.magicDamageBonus);
    let isCrit = Math.random() < (player.critChance / 100);

    if (isCrit) {
        dmg = Math.floor(dmg * player.critDamage);
        player.isHidden = true;
        log(`🔪 그림자 습격! 치명타! ${targetMonster.name}에게 ${dmg}의 피해를 입히고 그림자 속에 숨습니다.`, 'log-player');
        showFloatingText(dmg, targetMonsterElement, 'crit');
        showFloatingText('숨기!', document.getElementById('player-character'), 'buff');
    } else {
        log(`🔪 그림자 습격! ${targetMonster.name}에게 ${dmg}의 피해를 입혔습니다.`, 'log-player');
        showFloatingText(dmg, targetMonsterElement, 'damage');
    }

    targetMonster.hp -= dmg;
    applyPoisonEffect(targetMonster);

    if (targetMonsterElement) {
        const emojiElement = targetMonsterElement.querySelector('.emoji');
        emojiElement.classList.add('hit');
        setTimeout(() => emojiElement.classList.remove('hit'), 300);
    }
    updateUI();
    const allDead = monsters.every(m => m.hp <= 0);
    if (allDead) {
        if (targetMonster.hp <= 0) gainXP(targetMonster.xp);
        winBattle();
    } else {
        if (targetMonster.hp <= 0) {
            gainXP(targetMonster.xp);
            findNextTarget();
        }
        setTimeout(playerTurnEnd, 800);
    }
}

/**
 * '아이스 월' 스킬을 실행하는 함수 (마법사 전용).
 * - 최대 체력의 30%만큼 피해를 흡수하는 보호막을 생성합니다.
 */
function executeIceWall() {
    if (isGameOver || !isPlayerTurn) return;

    // 버프가 활성화 상태이면 취소
    if (player.iceWall.active) {
        player.iceWall.active = false;
        player.iceWall.hp = 0;
        player.iceWall.turns = 0;
        log('❄️ 아이스 월을 스스로 해제했습니다.', 'log-system');
        updateUI();
        showSkillSelection();
        return;
    }

    const totalMpCost = Math.floor(20 * player.mpCostMultiplier);
    if (player.mp < totalMpCost) {
        alert(`MP가 부족합니다! (필요: ${totalMpCost})`);
        return;
    }
    player.mp -= totalMpCost;
    playSound('boss-appear'); // A solid sound

    const shieldHp = Math.floor(player.maxHp * 0.3);
    player.iceWall = { active: true, hp: shieldHp, maxHp: shieldHp, turns: 3 };

    log(`❄️ 아이스 월! ${shieldHp}의 피해를 흡수하는 얼음 방벽을 생성합니다. (3턴 지속)`, 'log-player');
    showFloatingText('ICE WALL', document.getElementById('player-character'), 'buff');
    
    updateUI();
    showSkillSelection();
}

/**
 * '영체 소환' 스킬을 실행하는 함수 (네크로맨서 전용).
 * - 흡수한 영체 목록을 보여주는 모달을 엽니다.
 */
function executeSummonSpirit() {
    if (isGameOver || !isPlayerTurn) return;

    if (player.capturedSpirits.length === 0) {
        log("소환할 수 있는 영체가 없습니다. 먼저 '영체 흡수'로 영체를 포획하세요.", 'log-system');
        return;
    }

    // UI 스크립트에 정의된 함수를 호출하여 모달을 엽니다.
    openSummonSpiritModal();
}

/**
 * 영체 소환 모달에서 영체를 선택했을 때 호출되는 확인 함수.
 * @param {number} spiritIndex - player.capturedSpirits 배열의 인덱스
 */
function confirmSummonSpirit(spiritIndex) {
    // --- Get spirit data, don't remove it ---
    const spiritData = player.capturedSpirits[spiritIndex];

    // --- Check conditions ---
    if (!spiritData) return;
    if (player.minions.length >= 3) {
        log("더 이상 소환수를 부릴 수 없습니다. (최대 3기)", 'log-system');
        return;
    }
    if (spiritData.isSummoned) {
        log("이미 소환된 영체입니다.", 'log-system');
        return;
    }
    if (spiritData.cooldownUntilFloor > floor) {
        log(`해당 영체는 ${spiritData.cooldownUntilFloor}층까지 재소환할 수 없습니다.`, 'log-system');
        return;
    }

    playSound('boss-appear');

    // --- Mark as summoned ---
    spiritData.isSummoned = true;

    // 소환될 영체의 능력치를 흡수한 몬스터 스펙의 80%로 설정
    const minionAtk = Math.floor(spiritData.baseAtk * 0.8);

    const newMinion = {
        name: `${spiritData.name}의 영체`,
        emoji: spiritData.emoji,
        // 보관된 체력을 사용하고, 없으면 최대 체력으로 소환
        hp: spiritData.currentHp !== undefined ? spiritData.currentHp : spiritData.maxHp,
        maxHp: spiritData.maxHp,
        atk: minionAtk,
        isBoss: spiritData.isBoss || false, // 보스 여부 플래그 추가
        sourceId: spiritData.id, // Link to original spirit data
    };

    player.minions.push(newMinion);
    log(`💀 ${newMinion.name}을(를) 전장에 소환했습니다! (HP: ${newMinion.hp}, ATK: ${newMinion.atk})`, 'log-player');
    
    closeSummonSpiritModal(); // 모달 닫기
    updateUI();
}

/**
 * 소환된 영체를 다시 보관함으로 되돌리는 함수.
 * @param {number} spiritIndex - player.capturedSpirits 배열의 인덱스
 */
function confirmRecallSpirit(spiritIndex) {
    const spiritData = player.capturedSpirits[spiritIndex];
    if (!spiritData || !spiritData.isSummoned) {
        log("소환되지 않은 영체는 보관할 수 없습니다.", 'log-system');
        return;
    }

    // Find and remove the minion from the field
    const minionIndex = player.minions.findIndex(m => m.sourceId === spiritData.id);
    if (minionIndex > -1) {
        const recalledMinion = player.minions.splice(minionIndex, 1)[0];
        spiritData.currentHp = recalledMinion.hp; // 보관 시 현재 체력 저장
        log(`👻 ${recalledMinion.name}을(를) 다시 영체 보관함으로 돌려보냅니다.`, 'log-player');
    }

    // Update the spirit's state
    spiritData.isSummoned = false;

    playSound('click'); // some sound
    closeSummonSpiritModal();
    updateUI();
}

/**
 * '영혼 소용돌이' 스킬을 실행하는 함수 (네크로맨서 전용).
 * - 모든 적에게 공격력의 130%만큼 광역 피해를 줍니다. (MP 15 소모)
 */
function executeSpiritVortex() {
    if (isGameOver || !isPlayerTurn) return;

    const totalMpCost = Math.floor(15 * player.mpCostMultiplier);
    if (player.mp < totalMpCost) {
        alert(`MP가 부족합니다! (필요: ${totalMpCost})`);
        return;
    }

    isPlayerTurn = false;
    toggleControls(false);
    player.mp -= totalMpCost;
    playSound('black-flash');


    log('🌪️ 영혼 소용돌이! 모든 적을 공격합니다!', 'log-player');

    const livingMonsters = monsters.filter(m => m.hp > 0);
    const monsterElements = document.querySelectorAll('#monster-area .monster-wrapper');
    let totalXpGained = 0;

    livingMonsters.forEach((monster, index) => {
        setTimeout(() => {
            let dmg = Math.floor(player.atk * 1.3 + player.magicDamageBonus);
            const monsterIndexInAll = monsters.findIndex(m => m === monster);
            const targetElement = monsterElements[monsterIndexInAll];
            
            showFloatingText(dmg, targetElement, 'damage');
            monster.hp -= dmg;

            if (targetElement) {
                const emojiElement = targetElement.querySelector('.emoji');
                emojiElement.classList.add('hit');
                setTimeout(() => emojiElement.classList.remove('hit'), 300);
            }

            if (monster.hp <= 0) {
                playSound('monster-die');
                log(`${monster.name}을(를) 쓰러뜨렸다!`, 'log-player');
                totalXpGained += monster.xp;
            }

            if (index === livingMonsters.length - 1) {
                if (totalXpGained > 0) gainXP(totalXpGained);
                updateUI();
                const allDead = monsters.every(m => m.hp <= 0);
                if (allDead) winBattle();
                else { findNextTarget(); setTimeout(playerTurnEnd, 800); }
            }
        }, index * 150);
    });

    updateUI();
}

/**
 * '영체 흡수' 스킬을 실행하는 함수 (네크로맨서 전용).
 * - 체력이 7% 이하인 몬스터를 흡수하여 영체로 만듭니다.
 */
function executeSpiritAbsorption() {
    if (isGameOver || !isPlayerTurn) return;

    const targetMonster = monsters[player.targetIndex];
    if (targetMonster.hp <= 0) {
        log("이미 쓰러진 몬스터입니다.", 'log-system');
        return;
    }

    if (targetMonster.hp >= targetMonster.maxHp * 0.15) {
        log(`대상의 남은 체력이 15% 이상이라 흡수할 수 없습니다. (현재: ${((targetMonster.hp / targetMonster.maxHp) * 100).toFixed(1)}%)`, 'log-system');
        return; // 조건 미달 시 스킬 사용 불가 (턴, MP 소모 없음)
    }

    const totalMpCost = Math.floor(25 * player.mpCostMultiplier);
    if (player.mp < totalMpCost) {
        alert(`MP가 부족합니다! (필요: ${totalMpCost})`);
        return;
    }

    isPlayerTurn = false;
    toggleControls(false);
    player.mp -= totalMpCost;

    const successRate = targetMonster.isBoss ? 0.70 : 0.80;
    if (Math.random() < successRate) {
        playSound('level-up');
        const spiritMaxHp = Math.floor(targetMonster.maxHp * 0.8);
        const spiritData = {
            id: Date.now() + Math.random(), // Add unique ID
            name: targetMonster.name,
            emoji: targetMonster.emoji,
            baseHp: targetMonster.maxHp,
            baseAtk: targetMonster.atk,
            isBoss: targetMonster.isBoss || false, // 보스 여부 저장
            maxHp: spiritMaxHp, // 최대 체력 저장
            currentHp: spiritMaxHp, // 현재 체력 저장 (처음엔 최대)
            isSummoned: false,
            cooldownUntilFloor: 0,
        };
        player.capturedSpirits.push(spiritData);
        log(`👻 ${targetMonster.name}의 영체를 흡수했습니다!`, 'log-player');
        targetMonster.hp = 0; // 흡수된 몬스터는 즉시 처치
        gainXP(targetMonster.xp);
    } else {
        playSound('hit');
        log(`👻 영체 흡수에 실패했습니다...`, 'log-system');
    }

    updateUI();

    // 모든 몬스터가 쓰러졌는지 확인
    const allDead = monsters.every(m => m.hp <= 0);
    if (allDead) {
        winBattle(); // 전투 승리
    } else {
        findNextTarget(); // 흡수한 몬스터가 타겟이었다면 다음 타겟을 찾음
        setTimeout(playerTurnEnd, 800); // 몬스터 턴으로 진행
    }
}

/**
 * '영혼을 담은 펀치' 스킬을 실행하는 함수 (네크로맨서 전용).
 * - 단일 대상에게 공격력의 210% 피해를 줍니다.
 */
function executeSoulPunch() {
    if (isGameOver || !isPlayerTurn) return;

    const targetMonster = monsters[player.targetIndex];
    if (targetMonster.hp <= 0) {
        log("이미 쓰러진 몬스터입니다.", 'log-system');
        return;
    }

    const totalMpCost = Math.floor(10 * player.mpCostMultiplier);
    if (player.mp < totalMpCost) {
        alert(`MP가 부족합니다! (필요: ${totalMpCost})`);
        return;
    }

    isPlayerTurn = false;
    toggleControls(false);
    player.mp -= totalMpCost;
    playSound('crit'); // Use a strong sound

    const monsterWrappers = document.querySelectorAll('#monster-area .monster-wrapper');
    const targetMonsterElement = monsterWrappers[player.targetIndex];

    let dmg = Math.floor(player.atk * 2.1 + player.magicDamageBonus);
    log(`👊 영혼을 담은 펀치! ${targetMonster.name}에게 ${dmg}의 피해를 입혔습니다!`, 'log-player');
    showFloatingText(dmg, targetMonsterElement, 'crit');

    targetMonster.hp -= dmg;

    if (targetMonsterElement) {
        const emojiElement = targetMonsterElement.querySelector('.emoji');
        emojiElement.classList.add('hit');
        setTimeout(() => emojiElement.classList.remove('hit'), 300);
    }

    updateUI();

    const allDead = monsters.every(m => m.hp <= 0);
    if (allDead) {
        winBattle();
    } else {
        if (targetMonster.hp <= 0) {
            gainXP(targetMonster.xp);
            findNextTarget();
        }
        setTimeout(playerTurnEnd, 800);
    }
}
/**
 * '신성한 방패' 스킬을 실행하는 함수 (성기사 전용).
 * - 1턴 동안 받는 피해를 80% 감소시키고, 받은 피해의 70%를 반사합니다. (MP 15 소모)
 */
function executeDivineShield() {
    if (isGameOver || !isPlayerTurn) return;

    // 버프가 활성화 상태이면 취소
    if (player.divineShieldBuff.active) {
        player.divineShieldBuff.active = false;
        player.divineShieldBuff.turns = 0;
        log('🛡️ 신성한 방패를 해제했습니다.', 'log-system');
        updateUI();
        showSkillSelection();
        return;
    }

    const totalMpCost = Math.floor(15 * player.mpCostMultiplier);
    if (player.mp < totalMpCost) {
        alert(`MP가 부족합니다! (필요: ${totalMpCost})`);
        return;
    }

    player.mp -= totalMpCost;
    playSound('heal');

    player.divineShieldBuff = { active: true, turns: 1 };

    log(`🛡️ 신성한 방패! 1턴 동안 받는 피해를 감소시키고 일부를 적에게 반사합니다.`, 'log-player');
    showFloatingText('신성한 방패!', document.getElementById('player-character'), 'buff');
    
    updateUI();
    showSkillSelection();
}

/**
 * '심판' 스킬을 실행하는 함수 (성기사 전용).
 * - 대상의 현재 체력 30%만큼 신성 피해를 줍니다. (MP 25 소모)
 */
function executeJudgment() {
    if (isGameOver || !isPlayerTurn) return;

    const targetMonster = monsters[player.targetIndex];
    if (targetMonster.hp <= 0) {
        log("이미 쓰러진 몬스터입니다.", 'log-system');
        return;
    }

    const totalMpCost = Math.floor(25 * player.mpCostMultiplier);
    if (player.mp < totalMpCost) {
        alert(`MP가 부족합니다! (필요: ${totalMpCost})`);
        return;
    }

    isPlayerTurn = false;
    toggleControls(false);
    player.mp -= totalMpCost;
    playSound('crit');

    const monsterWrappers = document.querySelectorAll('#monster-area .monster-wrapper');
    const targetMonsterElement = monsterWrappers[player.targetIndex];

    let dmg = Math.floor(targetMonster.hp * 0.3);
    log(`⚖️ 심판! ${targetMonster.name}의 현재 체력의 30%인 ${dmg}의 신성한 피해를 입혔습니다!`, 'log-player');
    showFloatingText(dmg, targetMonsterElement, 'crit');

    targetMonster.hp -= dmg;

    if (targetMonsterElement) {
        const emojiElement = targetMonsterElement.querySelector('.emoji');
        emojiElement.classList.add('hit');
        setTimeout(() => emojiElement.classList.remove('hit'), 300);
    }

    updateUI();

    const allDead = monsters.every(m => m.hp <= 0);
    if (allDead) {
        if (targetMonster.hp <= 0) {
            playSound('monster-die');
            log(`${targetMonster.name}을(를) 쓰러뜨렸다!`, 'log-player');
            gainXP(targetMonster.xp);
        }
        winBattle();
    } else {
        if (targetMonster.hp <= 0) {
            playSound('monster-die');
            log(`${targetMonster.name}을(를) 쓰러뜨렸다!`, 'log-player');
            gainXP(targetMonster.xp);
            findNextTarget();
        }
        setTimeout(playerTurnEnd, 800);
    }
}

/**
 * '축복' 스킬을 실행하는 함수 (성기사 전용).
 * - 4턴 동안 턴마다 체력을 10% 회복합니다.
 */
function executeBlessing() {
    if (isGameOver || !isPlayerTurn) return;

    // 버프가 활성화 상태이면 취소
    if (player.blessingBuff.active) {
        player.blessingBuff.active = false;
        player.blessingBuff.turns = 0;
        log('✨ 축복 효과를 해제했습니다.', 'log-system');
        updateUI();
        showSkillSelection();
        return;
    }

    const totalMpCost = Math.floor(20 * player.mpCostMultiplier);
    if (player.mp < totalMpCost) {
        alert(`MP가 부족합니다! (필요: ${totalMpCost})`);
        return;
    }
    player.mp -= totalMpCost;
    playSound('heal');

    player.blessingBuff = { active: true, turns: 4 };

    log('✨ 축복! 4턴 동안 턴마다 체력이 10% 회복됩니다.', 'log-player');
    showFloatingText('BLESSING', document.getElementById('player-character'), 'buff');
    
    updateUI();
    showSkillSelection();
}

/**
 * '대지를 가르는 검기' 스킬을 실행하는 함수 (성기사 전용).
 * - 모든 적에게 공격력의 200%만큼 광역 피해를 줍니다. (MP 30 소모)
 */
function executeEarthShatteringSwordAura() {
    if (isGameOver || !isPlayerTurn) return;

    const totalMpCost = Math.floor(30 * player.mpCostMultiplier);
    if (player.mp < totalMpCost) {
        alert(`MP가 부족합니다! (필요: ${totalMpCost})`);
        return;
    }

    isPlayerTurn = false;
    toggleControls(false);
    player.mp -= totalMpCost;
    playSound('black-flash');

    log('💥 대지를 가르는 검기! 모든 적을 공격합니다!', 'log-player');

    const livingMonsters = monsters.filter(m => m.hp > 0);
    const monsterElements = document.querySelectorAll('#monster-area .monster-wrapper');
    let totalXpGained = 0;

    livingMonsters.forEach((monster, index) => {
        setTimeout(() => {
            let dmg = Math.floor(player.atk * 2.0 + player.magicDamageBonus);
            const monsterIndexInAll = monsters.findIndex(m => m === monster);
            const targetElement = monsterElements[monsterIndexInAll];
            
            showFloatingText(dmg, targetElement, 'damage');
            monster.hp -= dmg;

            if (targetElement) {
                const emojiElement = targetElement.querySelector('.emoji');
                emojiElement.classList.add('hit');
                setTimeout(() => emojiElement.classList.remove('hit'), 300);
            }

            if (monster.hp <= 0) {
                playSound('monster-die');
                log(`${monster.name}을(를) 쓰러뜨렸다!`, 'log-player');
                totalXpGained += monster.xp;
            }

            if (index === livingMonsters.length - 1) {
                if (totalXpGained > 0) gainXP(totalXpGained);
                updateUI();
                const allDead = monsters.every(m => m.hp <= 0);
                if (allDead) winBattle();
                else { findNextTarget(); setTimeout(playerTurnEnd, 800); }
            }
        }, index * 150);
    });

    updateUI();
}

/**
 * '럭키 펀치' 스킬을 실행하는 함수 (도박꾼 전용).
 * - 단일 대상에게 공격력의 180% 피해를 줍니다.
 */
function executeLuckyPunch() {
    if (isGameOver || !isPlayerTurn) return;

    const targetMonster = monsters[player.targetIndex];
    if (targetMonster.hp <= 0) {
        log("이미 쓰러진 몬스터입니다.", 'log-system');
        return;
    }

    const totalMpCost = Math.floor(10 * player.mpCostMultiplier);
    if (player.mp < totalMpCost) {
        alert(`MP가 부족합니다! (필요: ${totalMpCost})`);
        return;
    }

    isPlayerTurn = false;
    toggleControls(false);
    player.mp -= totalMpCost;
    playSound('crit');

    const monsterWrappers = document.querySelectorAll('#monster-area .monster-wrapper');
    const targetMonsterElement = monsterWrappers[player.targetIndex];

    let dmg = Math.floor(player.atk * 1.8 + player.magicDamageBonus);
    log(`🎲 럭키 펀치! ${targetMonster.name}에게 ${dmg}의 피해를 입혔습니다!`, 'log-player');
    showFloatingText(dmg, targetMonsterElement, 'crit');

    targetMonster.hp -= dmg;

    if (targetMonsterElement) {
        const emojiElement = targetMonsterElement.querySelector('.emoji');
        emojiElement.classList.add('hit');
        setTimeout(() => emojiElement.classList.remove('hit'), 300);
    }

    updateUI();

    const allDead = monsters.every(m => m.hp <= 0);
    if (allDead) {
        winBattle();
    } else {
        if (targetMonster.hp <= 0) {
            gainXP(targetMonster.xp);
            findNextTarget();
        }
        setTimeout(playerTurnEnd, 800);
    }
}

/**
 * '펀칭머신 던지기' 스킬을 실행하는 함수 (도박꾼 전용).
 * - 모든 적에게 공격력의 140%만큼 광역 피해를 줍니다.
 */
function executeThrowPunchingMachine() {
    if (isGameOver || !isPlayerTurn) return;

    const totalMpCost = Math.floor(15 * player.mpCostMultiplier);
    if (player.mp < totalMpCost) {
        alert(`MP가 부족합니다! (필요: ${totalMpCost})`);
        return;
    }

    isPlayerTurn = false;
    toggleControls(false);
    player.mp -= totalMpCost;
    playSound('black-flash');

    log('🎰 펀칭머신 던지기! 모든 적을 공격합니다!', 'log-player');

    const livingMonsters = monsters.filter(m => m.hp > 0);
    const monsterElements = document.querySelectorAll('#monster-area .monster-wrapper');
    let totalXpGained = 0;

    livingMonsters.forEach((monster, index) => {
        setTimeout(() => {
            let dmg = Math.floor(player.atk * 1.4 + player.magicDamageBonus);
            const monsterIndexInAll = monsters.findIndex(m => m === monster);
            const targetElement = monsterElements[monsterIndexInAll];
            
            showFloatingText(dmg, targetElement, 'damage');
            monster.hp -= dmg;

            if (targetElement) {
                const emojiElement = targetElement.querySelector('.emoji');
                emojiElement.classList.add('hit');
                setTimeout(() => emojiElement.classList.remove('hit'), 300);
            }

            if (monster.hp <= 0) {
                playSound('monster-die');
                log(`${monster.name}을(를) 쓰러뜨렸다!`, 'log-player');
                totalXpGained += monster.xp;
            }

            if (index === livingMonsters.length - 1) {
                if (totalXpGained > 0) gainXP(totalXpGained);
                updateUI();
                const allDead = monsters.every(m => m.hp <= 0);
                if (allDead) winBattle();
                else { findNextTarget(); setTimeout(playerTurnEnd, 800); }
            }
        }, index * 150);
    });

    updateUI();
}

/**
 * '룰렛 돌리기' 스킬을 실행하는 함수 (도박꾼 전용).
 * - 무작위 버프를 얻습니다.
 */
function executeSpinRoulette() {
    if (isGameOver || !isPlayerTurn) return;

    const totalMpCost = Math.floor(20 * player.mpCostMultiplier);
    if (player.mp < totalMpCost) {
        alert(`MP가 부족합니다! (필요: ${totalMpCost})`);
        return;
    }

    isPlayerTurn = false;
    toggleControls(false);
    player.mp -= totalMpCost;
    playSound('buy');

    const roll = Math.random() * 100;
    let outcomeText = '';

    if (roll < 40) { // 40%
        player.strBuff = { multiplier: 1.2, turns: 5 };
        outcomeText = '힘 1.2배 증가 (5턴)!';
    } else if (roll < 70) { // 30%
        player.strBuff = { multiplier: 1.5, turns: 5 };
        outcomeText = '힘 1.5배 증가 (5턴)!';
    } else if (roll < 90) { // 20%
        player.critBuff = { bonus: 30, turns: 5 };
        outcomeText = '치명타 확률 30% 증가 (5턴)!';
    } else { // 10% Jackpot
        const jackpotRoll = Math.random() * 100;
        if (jackpotRoll < 50) { // 50% of 10%
            player.strBuff = { multiplier: 2, turns: 4 };
            outcomeText = '잭팟! 4️⃣4️⃣4️⃣ 힘 2배 증가 (4턴)!';
        } else if (jackpotRoll < 85) { // 35% of 10%
            player.critBuff = { bonus: 60, turns: 4 };
            outcomeText = '잭팟! 6️⃣6️⃣6️⃣ 치명타 확률 60% 증가 (4턴)!';
        } else { // 15% of 10%
            player.invincibleBuff = { active: true, turns: 3 };
            outcomeText = '잭팟! 7️⃣7️⃣7️⃣ 3턴간 무적!';
        }
    }

    log(`🎲 룰렛 결과: ${outcomeText}`, 'log-system');
    showFloatingText(outcomeText, document.getElementById('player-character'), 'buff');
    recalculatePlayerStats();
    updateUI();
    setTimeout(playerTurnEnd, 800);
}

/**
 * '코인 토스' 스킬을 실행하는 함수 (도박꾼 전용).
 * - 50% 확률로 체력을 회복하거나, 50% 확률로 무작위 적을 공격합니다.
 */
function executeCoinToss() {
    if (isGameOver || !isPlayerTurn) return;
    const totalMpCost = Math.floor(15 * player.mpCostMultiplier);
    if (player.mp < totalMpCost) {
        alert(`MP가 부족합니다! (필요: ${totalMpCost})`);
        return;
    }

    isPlayerTurn = false;
    toggleControls(false);
    player.mp -= totalMpCost;
    playSound('buy');

    if (Math.random() < 0.5) {
        // Heal
        const healAmount = Math.floor(player.maxHp * 0.2);
        player.hp = Math.min(player.maxHp, player.hp + healAmount);
        log(`💰 코인 토스 (앞면)! 체력을 ${healAmount}만큼 회복합니다.`, 'log-player');
        showFloatingText(`+${healAmount}`, document.getElementById('player-character'), 'heal');
    } else {
        // Attack
        const livingMonsters = monsters.filter(m => m.hp > 0);
        if (livingMonsters.length > 0) {
            const targetMonster = livingMonsters[Math.floor(Math.random() * livingMonsters.length)];
            const targetIndex = monsters.indexOf(targetMonster);
            const targetMonsterElement = document.querySelectorAll('#monster-area .monster-wrapper')[targetIndex];
            
            let dmg = Math.floor(player.atk * 1.5 + player.magicDamageBonus);
            log(`💰 코인 토스 (뒷면)! ${targetMonster.name}에게 ${dmg}의 피해를 입혔습니다.`, 'log-player');
            showFloatingText(dmg, targetMonsterElement, 'damage');
            targetMonster.hp -= dmg;

            if (targetMonster.hp <= 0) {
                log(`${targetMonster.name}을(를) 쓰러뜨렸다!`, 'log-player');
                gainXP(targetMonster.xp);
            }
        } else {
            log("💰 코인 토스 (뒷면)! 공격할 대상이 없습니다...", 'log-system');
        }
    }

    updateUI();
    setTimeout(playerTurnEnd, 800);
}

/**
 * '최후의 일격' 스킬을 실행하는 함수 (용사 전용 궁극기).
 * - 단일 적에게 공격력의 400% 피해를 줍니다.
 * - 대상의 체력이 25% 미만일 경우 피해량이 1.5배 증가합니다.
 */
function executeFinalBlow() {
    if (isGameOver || !isPlayerTurn) return;

    const targetMonster = monsters[player.targetIndex];
    if (targetMonster.hp <= 0) {
        log("이미 쓰러진 몬스터입니다.", 'log-system');
        return;
    }

    const totalMpCost = Math.floor(40 * player.mpCostMultiplier);
    if (player.mp < totalMpCost) {
        alert(`MP가 부족합니다! (필요: ${totalMpCost})`);
        return;
    }

    player.mp -= totalMpCost;
    playSound('boss-appear'); // 영역 전개 사운드
    triggerDomainExpansion(); // 영역 전개 시각 효과
    log('영역 전개: 불굴의 투기장', 'log-player', { fontSize: '24px', color: 'orange', textShadow: '0 0 10px red' });
    log('⚔️ 최후의 일격! 영역 내의 적에게 모든 힘을 담아 내리칩니다!', 'log-player');

    const monsterWrappers = document.querySelectorAll('#monster-area .monster-wrapper');
    const targetMonsterElement = monsterWrappers[player.targetIndex];

    let dmg = Math.floor(player.atk * 4.0 + player.magicDamageBonus);
    
    // 대상의 체력이 25% 미만일 경우 피해량 증가
    if (targetMonster.hp < targetMonster.maxHp * 0.25) {
        dmg = Math.floor(dmg * 1.5);
        log(`상대의 약점을 포착하여 피해량이 증폭됩니다!`, 'log-system');
    }

    showFloatingText(dmg, targetMonsterElement, 'crit');
    targetMonster.hp -= dmg;
    applyPoisonEffect(targetMonster);

    if (targetMonsterElement) {
        const emojiElement = targetMonsterElement.querySelector('.emoji');
        emojiElement.classList.add('hit');
        setTimeout(() => emojiElement.classList.remove('hit'), 300);
    }

    updateUI();

    const allDead = monsters.every(m => m.hp <= 0);
    if (allDead) {
        if (targetMonster.hp <= 0) {
            playSound('monster-die');
            log(`${targetMonster.name}을(를) 쓰러뜨렸다!`, 'log-player');
            gainXP(targetMonster.xp);
        }
        winBattle();
    } else {
        if (targetMonster.hp <= 0) {
            playSound('monster-die');
            log(`${targetMonster.name}을(를) 쓰러뜨렸다!`, 'log-player');
            gainXP(targetMonster.xp);
            findNextTarget();
        }
        showSkillSelection(); // 턴을 소모하지 않으므로 스킬 선택창을 다시 표시
    }
}

/**
 * '메테오' 스킬을 실행하는 함수 (마법사 전용 궁극기).
 * - 모든 적에게 공격력의 300% 피해를 주고 강력한 화상 효과를 부여합니다.
 */
function executeMeteor() {
    if (isGameOver || !isPlayerTurn) return;

    const totalMpCost = Math.floor(50 * player.mpCostMultiplier);
    if (player.mp < totalMpCost) {
        alert(`MP가 부족합니다! (필요: ${totalMpCost})`);
        return;
    }

    player.mp -= totalMpCost;
    playSound('boss-appear'); // 영역 전개 사운드
    triggerDomainExpansion(); // 영역 전개 시각 효과
    log('영역 전개: 만상(森羅萬象)의 섭리', 'log-player', { fontSize: '24px', color: '#8b5cf6', textShadow: '0 0 10px #c4b5fd' });
    log('☄️ 메테오! 영역 내의 모든 적에게 거대한 운석을 소환합니다!', 'log-player');

    const livingMonsters = monsters.filter(m => m.hp > 0);
    const monsterElements = document.querySelectorAll('#monster-area .monster-wrapper');
    let totalXpGained = 0;

    livingMonsters.forEach((monster, index) => {
        setTimeout(() => {
            let dmg = Math.floor(player.atk * 3.0 + player.magicDamageBonus);
            const monsterIndexInAll = monsters.findIndex(m => m === monster);
            const targetElement = monsterElements[monsterIndexInAll];
            
            showFloatingText(dmg, targetElement, 'fireball');
            monster.hp -= dmg;

            // 피해량의 20%에 해당하는 강력한 화상 효과 적용
            const burnDmg = Math.floor(dmg * 0.2);
            monster.burn = { turns: 3, damage: burnDmg };
            log(`${monster.name}이(가) 격렬한 화염에 휩싸였다! (3턴 동안 턴마다 ${burnDmg} 피해)`, 'log-monster');

            if (targetElement) {
                const emojiElement = targetElement.querySelector('.emoji');
                emojiElement.classList.add('hit');
                setTimeout(() => emojiElement.classList.remove('hit'), 300);
            }

            if (monster.hp <= 0) {
                playSound('monster-die');
                log(`${monster.name}을(를) 쓰러뜨렸다!`, 'log-player');
                totalXpGained += monster.xp;
            }

            if (index === livingMonsters.length - 1) {
                if (totalXpGained > 0) gainXP(totalXpGained);
                updateUI();
                const allDead = monsters.every(m => m.hp <= 0);
                if (allDead) winBattle();
                else {
                    findNextTarget();
                    showSkillSelection(); // 턴을 소모하지 않으므로 스킬 선택창을 다시 표시
                }
            }
        }, index * 150);
    });

    updateUI();
}

/**
 * '그림자 절기' 스킬을 실행하는 함수 (도적 전용 궁극기).
 * - 무작위 적들에게 5회의 빠른 공격을 가합니다.
 */
function executeShadowRend() {
    if (isGameOver || !isPlayerTurn) return;

    const totalMpCost = Math.floor(35 * player.mpCostMultiplier);
    if (player.mp < totalMpCost) {
        alert(`MP가 부족합니다! (필요: ${totalMpCost})`);
        return;
    }

    const livingMonsters = monsters.filter(m => m.hp > 0);
    if (livingMonsters.length === 0) {
        log("공격할 대상이 없습니다.", "log-system");
        return;
    }

    player.mp -= totalMpCost;
    playSound('boss-appear'); // 영역 전개 사운드
    triggerDomainExpansion(); // 영역 전개 시각 효과
    log('영역 전개: 자복암영정(自伏暗影庭)', 'log-player', { fontSize: '24px', color: '#3f3f46', textShadow: '0 0 10px #a1a1aa' });
    log('🔪 그림자 절기! 영역 내의 적들을 그림자로 난무합니다!', 'log-player');

    let totalXpGained = 0;
    const hitCount = 5;
    const attackPromises = [];

    for (let i = 0; i < hitCount; i++) {
        const promise = new Promise(resolve => {
            setTimeout(() => {
                playSound('attack');
                const stillLivingMonsters = monsters.filter(m => m.hp > 0);
                if (stillLivingMonsters.length === 0) return resolve();

                const targetMonster = stillLivingMonsters[Math.floor(Math.random() * stillLivingMonsters.length)];
                const targetIndex = monsters.indexOf(targetMonster);
                const targetMonsterElement = document.querySelectorAll('#monster-area .monster-wrapper')[targetIndex];

                let dmg = Math.floor(player.atk * 0.9 + player.magicDamageBonus);
                let isCrit = Math.random() < (player.critChance / 100);

                if (isCrit) {
                    dmg = Math.floor(dmg * player.critDamage);
                    showFloatingText(dmg, targetMonsterElement, 'crit');
                } else {
                    showFloatingText(dmg, targetMonsterElement, 'damage');
                }
                
                targetMonster.hp -= dmg;
                applyPoisonEffect(targetMonster);

                if (targetMonster.hp <= 0) {
                    log(`${targetMonster.name}을(를) 쓰러뜨렸다!`, 'log-player');
                    playSound('monster-die');
                    totalXpGained += targetMonster.xp;
                }
                updateUI();
                resolve();
            }, i * 120); // 빠른 연타 효과
        });
        attackPromises.push(promise);
    }

    Promise.all(attackPromises).then(() => {
        if (totalXpGained > 0) gainXP(totalXpGained);
        
        const allDead = monsters.every(m => m.hp <= 0);
        if (allDead) {
            winBattle();
        } else {
            findNextTarget();
            showSkillSelection(); // 턴을 소모하지 않으므로 스킬 선택창을 다시 표시
        }
    });
}

/**
 * '천상의 분노' 스킬을 실행하는 함수 (성기사 전용 궁극기).
 * - 모든 적에게 공격력의 250% 피해를 주고 30% 확률로 기절시킵니다.
 */
function executeHeavensWrath() {
    if (isGameOver || !isPlayerTurn) return;

    const totalMpCost = Math.floor(45 * player.mpCostMultiplier);
    if (player.mp < totalMpCost) {
        alert(`MP가 부족합니다! (필요: ${totalMpCost})`);
        return;
    }

    player.mp -= totalMpCost;
    playSound('boss-appear'); // 영역 전개 사운드
    triggerDomainExpansion(); // 영역 전개 시각 효과
    log('영역 전개: 신성한 심판의 영역', 'log-player', { fontSize: '24px', color: '#facc15', textShadow: '0 0 10px #fef08a' });
    log('✨ 천상의 분노! 영역 내의 모든 적을 신성한 빛으로 심판합니다!', 'log-player');

    const livingMonsters = monsters.filter(m => m.hp > 0);
    const monsterElements = document.querySelectorAll('#monster-area .monster-wrapper');
    let totalXpGained = 0;

    livingMonsters.forEach((monster, index) => {
        setTimeout(() => {
            let dmg = Math.floor(player.atk * 2.5 + player.magicDamageBonus);
            const monsterIndexInAll = monsters.findIndex(m => m === monster);
            const targetElement = monsterElements[monsterIndexInAll];
            
            showFloatingText(dmg, targetElement, 'crit'); // 신성 피해는 치명타 스타일로 표시
            monster.hp -= dmg;

            // 30% 확률로 기절
            if (Math.random() < 0.3) {
                monster.isStunned = true;
                log(`${monster.name}이(가) 신성한 빛에 눈이 멀어 기절했습니다!`, 'log-system');
                showFloatingText('STUN', targetElement, 'stun');
            }

            if (targetElement) {
                const emojiElement = targetElement.querySelector('.emoji');
                emojiElement.classList.add('hit');
                setTimeout(() => emojiElement.classList.remove('hit'), 300);
            }

            if (monster.hp <= 0) {
                playSound('monster-die');
                log(`${monster.name}을(를) 쓰러뜨렸다!`, 'log-player');
                totalXpGained += monster.xp;
            }

            if (index === livingMonsters.length - 1) {
                if (totalXpGained > 0) gainXP(totalXpGained);
                updateUI();
                const allDead = monsters.every(m => m.hp <= 0);
                if (allDead) winBattle();
                else {
                    findNextTarget();
                    showSkillSelection(); // 턴을 소모하지 않으므로 스킬 선택창을 다시 표시
                }
            }
        }, index * 150);
    });

    updateUI();
}

/**
 * '영혼 폭발' 스킬을 실행하는 함수 (네크로맨서 전용 궁극기).
 * - 모든 적에게 피해를 주며, 소환된 영체의 수에 비례하여 피해량이 증가합니다.
 */
function executeSoulExplosion() {
    if (isGameOver || !isPlayerTurn) return;

    const totalMpCost = Math.floor(35 * player.mpCostMultiplier);
    if (player.mp < totalMpCost) {
        alert(`MP가 부족합니다! (필요: ${totalMpCost})`);
        return;
    }

    player.mp -= totalMpCost;
    playSound('boss-appear'); // 영역 전개 사운드
    triggerDomainExpansion(); // 영역 전개 시각 효과

    const livingMinionsCount = player.minions.filter(m => m.hp > 0).length;
    log('영역 전개: 망자의 연회', 'log-player', { fontSize: '24px', color: '#7e22ce', textShadow: '0 0 10px #c084fc' });
    log(`💀 영혼 폭발! 영역 내의 영혼들을 폭발시킵니다! (소환수: ${livingMinionsCount}기)`, 'log-player');

    const livingMonsters = monsters.filter(m => m.hp > 0);
    const monsterElements = document.querySelectorAll('#monster-area .monster-wrapper');
    let totalXpGained = 0;

    const damageMultiplier = 1 + 0.5 * livingMinionsCount;

    livingMonsters.forEach((monster, index) => {
        setTimeout(() => {
            let dmg = Math.floor((player.atk * 1.5 + player.magicDamageBonus) * damageMultiplier);
            const monsterIndexInAll = monsters.findIndex(m => m === monster);
            const targetElement = monsterElements[monsterIndexInAll];
            
            showFloatingText(dmg, targetElement, 'damage');
            monster.hp -= dmg;

            if (targetElement) {
                const emojiElement = targetElement.querySelector('.emoji');
                emojiElement.classList.add('hit');
                setTimeout(() => emojiElement.classList.remove('hit'), 300);
            }

            if (monster.hp <= 0) {
                playSound('monster-die');
                log(`${monster.name}을(를) 쓰러뜨렸다!`, 'log-player');
                totalXpGained += monster.xp;
            }

            if (index === livingMonsters.length - 1) {
                if (totalXpGained > 0) gainXP(totalXpGained);
                updateUI();
                const allDead = monsters.every(m => m.hp <= 0);
                if (allDead) winBattle();
                else {
                    findNextTarget();
                    showSkillSelection(); // 턴을 소모하지 않으므로 스킬 선택창을 다시 표시
                }
            }
        }, index * 150);
    });

    updateUI();
}

/**
 * '올인' 스킬을 실행하는 함수 (도박꾼 전용 궁극기).
 * - 운에 따라 결과가 극적으로 달라지는 하이리스크 하이리턴 공격입니다.
 */
function executeAllIn() {
    if (isGameOver || !isPlayerTurn) return;

    const targetMonster = monsters[player.targetIndex];
    if (targetMonster.hp <= 0) {
        log("이미 쓰러진 몬스터입니다.", 'log-system');
        return;
    }

    const totalMpCost = Math.floor(30 * player.mpCostMultiplier);
    if (player.mp < totalMpCost) {
        alert(`MP가 부족합니다! (필요: ${totalMpCost})`);
        return;
    }

    player.mp -= totalMpCost;
    playSound('boss-appear'); // 영역 전개 사운드
    triggerDomainExpansion(); // 영역 전개 시각 효과
    log('영역 전개: 복마어주자(伏魔御廚子)', 'log-player', { fontSize: '24px', color: '#be123c', textShadow: '0 0 10px #fda4af' });
    log('🎲 올인! 영역 내에서 운명에 모든 것을 겁니다!', 'log-player');

    const monsterWrappers = document.querySelectorAll('#monster-area .monster-wrapper');
    const targetMonsterElement = monsterWrappers[player.targetIndex];
    const playerElement = document.getElementById('player-character');

    const roll = Math.random() * 100;
    let dmg = 0;

    if (roll < 5) { // 5% 파산
        const selfDmg = Math.floor(player.maxHp * 0.2);
        player.hp -= selfDmg;
        log(`💥 파산! 스킬이 실패하여 ${selfDmg}의 피해를 입습니다!`, 'log-system', { color: '#ef4444' });
        showFloatingText(selfDmg, playerElement, 'damage');
        if (player.hp <= 0) {
            updateUI();
            gameOver();
            return;
        }
    } else if (roll < 20) { // 15% 잭팟
        dmg = Math.floor(player.atk * 6.0 + player.magicDamageBonus);
        log(`JACKPOT! 잭팟! ${targetMonster.name}에게 ${dmg}의 엄청난 피해를 입혔습니다!`, 'log-player', { color: '#fde047' });
        showFloatingText(dmg, targetMonsterElement, 'black-flash');
        targetMonster.hp -= dmg;
    } else if (roll < 50) { // 30% 꽝
        dmg = Math.floor(player.atk * 1.0 + player.magicDamageBonus);
        log(`...꽝. ${targetMonster.name}에게 ${dmg}의 미미한 피해를 입혔습니다.`, 'log-player');
        showFloatingText(dmg, targetMonsterElement, 'miss');
        targetMonster.hp -= dmg;
    } else { // 50% 성공
        dmg = Math.floor(player.atk * 3.0 + player.magicDamageBonus);
        log(`성공! ${targetMonster.name}에게 ${dmg}의 강력한 피해를 입혔습니다!`, 'log-player');
        showFloatingText(dmg, targetMonsterElement, 'crit');
        targetMonster.hp -= dmg;
    }

    if (dmg > 0 && targetMonsterElement) {
        const emojiElement = targetMonsterElement.querySelector('.emoji');
        emojiElement.classList.add('hit');
        setTimeout(() => emojiElement.classList.remove('hit'), 300);
    }

    updateUI();

    const allDead = monsters.every(m => m.hp <= 0);
    if (allDead) {
        if (targetMonster.hp <= 0 && dmg > 0) {
            playSound('monster-die');
            log(`${targetMonster.name}을(를) 쓰러뜨렸다!`, 'log-player');
            gainXP(targetMonster.xp);
        }
        winBattle();
    } else {
        if (targetMonster.hp <= 0 && dmg > 0) {
            playSound('monster-die');
            log(`${targetMonster.name}을(를) 쓰러뜨렸다!`, 'log-player');
            gainXP(targetMonster.xp);
            findNextTarget();
        }
        showSkillSelection(); // 턴을 소모하지 않으므로 스킬 선택창을 다시 표시
    }
}

/**
 * 인벤토리의 소비 아이템(물약)을 사용하는 함수.
 * - 아이템 종류(회복, 버프 등)에 따라 적절한 효과를 적용하고 인벤토리에서 제거합니다.
 * @param {number} index - 사용할 아이템의 player.inventory 배열 인덱스
 */
function useInventoryItem(index) {
    const item = player.inventory[index];
    if (!item) return; // 아이템이 없는 경우 방어
    const itemType = item.type; // 아이템 사용 전에 타입 저장
    const playerElement = document.getElementById('player-character');
    const emojiElement = document.getElementById('player-emoji');
    let flashColor = '';
    
    // 아이템 타입에 따라 다른 효과 적용
    if (item.type === 'buff') {
        playSound('heal'); // 버프 물약도 동일한 사운드 사용
        player.buff.turns = item.turns;
        player.buff.multiplier = item.mult;
        log(`🧪 ${item.name} 사용! ${item.turns}턴 동안 공격력이 ${item.mult}배가 됩니다.`, 'log-system');
        showFloatingText('ATK UP', playerElement, 'buff');
        flashColor = '#a855f7'; // 보라색
    } else if (item.type === 'heal') {
        const healAmount = Math.min(player.maxHp - player.hp, item.healAmount);
        if (healAmount > 0) playSound('heal');
        player.hp = Math.min(player.maxHp, player.hp + healAmount);
        log(`💊 ${item.name} 사용! 체력이 ${healAmount} 회복되었습니다.`, 'log-system');
        if (healAmount > 0) {
            showFloatingText(`+${healAmount}`, playerElement, 'heal');
        }
        flashColor = '#22c55e'; // 초록색
    } else if (item.type === 'mpPotion') {
        const mpAmount = Math.min(player.maxMp - player.mp, item.mpAmount);
        if (mpAmount > 0) playSound('heal');
        player.mp = Math.min(player.maxMp, player.mp + mpAmount);
        log(`💧 ${item.name} 사용! 마나가 ${mpAmount} 회복되었습니다.`, 'log-system');
        if (mpAmount > 0) {
            showFloatingText(`+${mpAmount}`, playerElement, 'mp-heal');
        }
        flashColor = '#60a5fa'; // 파란색
    } else if (item.type === 'critBuff') {
        playSound('heal');
        player.critBuff.turns = item.turns;
        player.critBuff.bonus = item.bonus;
        recalculatePlayerStats();
        log(`🔮 ${item.name} 사용! ${item.turns}턴 동안 치명타 확률이 ${item.bonus}% 증가합니다.`, 'log-system');
        showFloatingText('CRIT UP', playerElement, 'buff');
        flashColor = '#ffdd44'; // 금색
    }

    // 아이템 사용 시각 효과 (이모지 반짝임)
    if (flashColor) {
        const originalFilter = emojiElement.style.filter;
        emojiElement.style.filter = `drop-shadow(0 0 25px ${flashColor})`;
        setTimeout(() => {
            emojiElement.style.filter = originalFilter; // 원래 필터로 복구
        }, 400);
    }

    // 사용한 아이템을 인벤토리에서 제거
    player.inventory.splice(index, 1);
    
    updateUI();

    // 아이템 사용 후 모달을 다시 렌더링합니다.
    const remainingPotions = player.inventory.filter(i => i.type === 'heal' || i.type === 'mpPotion' || i.type === 'buff' || i.type === 'critBuff');
    if (remainingPotions.length === 0) {
        closeItemSelect(); // 물약이 하나도 없으면 모달을 닫습니다.
    } else {
        showAllPotions(); // 목록을 새로고침합니다.
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
        debuffs: {
            holyStruck: false, // 성기사 벼락 디버프
            soulPoison: false, // 네크로맨서 영혼의 독 디버프
        },
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
//** 5. 스탯 및 장비 관리
//** ============================================================ **//

/**
 * 스탯 분배 모달에서 특정 스탯을 1 증가시키는 임시 함수 (분배 확정 전).
 * @param {string} statKey - 증가시킬 스탯의 키 ('str', 'vit' 등)
 */
function addStat(statKey) {
    if (tempStatPoints > 0) {
        tempStatPoints--;
        tempStats[statKey]++;
        renderStatUpModal();
    }
}

/**
 * 임시로 분배한 스탯을 원래대로 초기화하는 함수.
 */
function resetTempStats() {
    tempStatPoints = player.statPoints;
    tempStats = { str: player.str, vit: player.vit, mag: player.mag, mnd: player.mnd, agi: player.agi, int: player.int, luk: player.luk, fcs: player.fcs };
    renderStatUpModal();
}

/**
 * 스탯 분배를 확정하고 실제 플레이어 능력치에 적용하는 함수.
 */
function confirmStatUp() {
    player.statPoints = tempStatPoints;
    Object.assign(player, tempStats);

    recalculatePlayerStats();
    
    // 분배된 스탯을 적용하고 UI를 업데이트합니다. 모달은 닫히지 않습니다.
    updateUI();
    renderStatUpModal(); // 스탯 모달 UI를 새로운 값으로 다시 렌더링합니다.
    
    // 추가 레벨업이 있는지 확인
    checkForLevelUp();
}

/**
 * 스탯, 장비, 전리품, 버프 등을 모두 고려하여 플레이어의 최종 능력치를 재계산하는 함수.
 * - 이 함수는 스탯 변경, 장비 교체, 버프 획득/소실 시 호출되어야 합니다.
 */
function recalculatePlayerStats() {
    // 전리품 패시브 스탯 보너스 계산
    const lootBonuses = { str: 0, vit: 0, mag: 0, mnd: 0, agi: 0, int: 0, luk: 0, fcs: 0 };
    let lootGoldBonus = 0;

    // 특수 능력치 초기화
    player.critDamageBonus = 0;
    player.mpCostMultiplier = 1;
    player.hpRegen = 0;
    player.bonusStatPointsPerLevel = 0;
    player.debuffResistance = 0;

    player.lootInventory.forEach(loot => {
        if (loot.type === 'permanent_stat' && lootBonuses.hasOwnProperty(loot.stat)) {
            lootBonuses[loot.stat] += loot.value;
        } else if (loot.type === 'gold_bonus') {
            lootGoldBonus += loot.value;
        } else if (loot.type === 'crit_damage_bonus') {
            player.critDamageBonus += loot.value;
        } else if (loot.type === 'mp_cost_reduction') {
            player.mpCostMultiplier -= loot.value;
        } else if (loot.type === 'hp_regen_per_turn') {
            player.hpRegen += loot.value;
        } else if (loot.type === 'bonus_stat_points') {
            player.bonusStatPointsPerLevel += loot.value;
        } else if (loot.type === 'debuff_resistance') {
            player.debuffResistance += loot.value;
        }
    });

    const weaponBonus = player.equippedWeapon ? player.equippedWeapon.atkBonus : 0;
    const armorBonus = player.equippedArmor ? player.equippedArmor.maxHpBonus : 0;
    
    // 스탯 포인트와 전리품 보너스를 합산
    const finalStr = Math.floor((player.str) * player.strBuff.multiplier) + lootBonuses.str;
    const finalVit = player.vit + lootBonuses.vit;
    const finalMag = player.mag + lootBonuses.mag;
    const finalMnd = player.mnd + lootBonuses.mnd;
    const finalAgi = player.agi + lootBonuses.agi;
    const finalInt = player.int + lootBonuses.int;
    const finalLuk = player.luk + lootBonuses.luk;
    const finalFcs = player.fcs + lootBonuses.fcs;

    // 캐릭터 클래스에 따른 기본 스탯 보정 (data.js 참조)
    const charData = characterData[player.characterClass] || characterData.hero;
    const baseCritChance = charData.stats.crit;
    const baseEvasionChance = charData.stats.evasion;

    player.atk = player.baseAtk + (finalStr * 2) + weaponBonus;
    player.maxHp = player.baseMaxHp + (finalVit * 5) + armorBonus;
    player.maxMp = player.baseMaxMp + (finalMnd * 5);
    player.critChance = baseCritChance + (finalLuk * 0.7) + player.critBuff.bonus;
    player.evasionChance = baseEvasionChance + (finalAgi * 3);
    player.critDamage = 2 + player.critDamageBonus;
    player.goldBonus = 1 + (finalInt * 0.02) + lootGoldBonus;
    player.blackFlashChance = 0.008 + (finalFcs * 0.004);
    player.magicDamageBonus = finalMag * 3.0;

    // Hero: 결의의 외침 버프 적용
    if (player.shoutOfResolveBuff.active) {
        player.atk = Math.floor(player.atk * 1.3);
    }

    // 흑섬 버프 적용
    if (player.blackFlashBuff.active) {
        player.atk = Math.floor(player.atk * 1.6);
        player.maxHp = Math.floor(player.maxHp * 1.6);
        player.maxMp = Math.floor(player.maxMp * 1.6);
        player.critChance = player.critChance * 1.6;
        player.evasionChance = player.evasionChance * 1.6;
        player.goldBonus = player.goldBonus * 1.6;
        player.blackFlashChance = player.blackFlashChance * 1.6;
        player.magicDamageBonus = player.magicDamageBonus * 1.6;
    }

    // 영역 전개 효과 적용
    if (player.domainActive) {
        switch (player.characterClass) {
            case 'hero':
                player.atk = Math.floor(player.atk * 2);
                player.maxHp = Math.floor(player.maxHp * 2);
                player.maxMp = Math.floor(player.maxMp * 2);
                player.critChance = player.critChance * 2;
                player.evasionChance = player.evasionChance * 2;
                player.goldBonus = player.goldBonus * 2;
                player.blackFlashChance = player.blackFlashChance * 2;
                player.magicDamageBonus = Math.floor(player.magicDamageBonus * 2);
                break;
            case 'wizard':
                player.mpCostMultiplier *= 0.15; // 85% 감소
                break;
            case 'rogue':
                player.evasionChance += 55;
                break;
        }
    }

    // 회피율 최대치(60%) 적용
    player.evasionChance = Math.min(player.evasionChance, 60);

    // 체력이 최대 체력을 초과하지 않도록 조정
    if (player.hp > player.maxHp) player.hp = player.maxHp;
    if (player.mp > player.maxMp) player.mp = player.maxMp;
}

/**
 * 장비 아이템을 착용하는 함수.
 * @param {'armor' | 'weapon'} type - 착용할 아이템 타입.
 * @param {number} index - 해당 타입의 인벤토리 배열 인덱스.
 */
function equipItem(type, index) {
    let hpPercentage = 1.0; // 체력 비율 유지를 위한 변수

    if (type === 'armor') {
        const armor = player.armorInventory[index];
        // 방어구 교체 시 현재 체력 비율을 유지하기 위해 비율을 저장
        if (player.maxHp > 0) {
            hpPercentage = player.hp / player.maxHp;
        }
        player.equippedArmor = armor;
        player.emoji = armor.emoji;
        log(`🛡️ ${armor.name}을(를) 착용했습니다.`, 'log-system');
    } else if (type === 'weapon') {
        player.equippedWeapon = player.weaponInventory[index];
        log(`🗡️ ${player.equippedWeapon.name}을(를) 장착했습니다.`, 'log-system');
    }
    recalculatePlayerStats(); // 스탯 재계산
    // 방어구 변경 시에만, 재계산된 최대 체력에 맞춰 현재 체력을 비율대로 조정
    if (type === 'armor') {
        player.hp = Math.round(player.maxHp * hpPercentage);
    }
    updateUI();
    renderEquipment(); // 버튼 상태 갱신을 위해 다시 렌더링
}

/**
 * (사용되지 않음) 전리품은 이제 소모품이 아닌 패시브 아이템입니다.
 * @param {number} index
 */
function useLootItem(index) {
    // 전리품은 이제 소모하는 아이템이 아니라, 보유 시 지속 효과(패시브)를 제공합니다.
    // 이 기능은 더 이상 사용되지 않으며, 인벤토리 UI에서 '사용' 버튼이 제거되었습니다.
    log("전리품은 보유하는 것만으로 효과가 적용됩니다.", "log-system");
}

//** ============================================================ **//
//** 6. 상점 시스템
//** ============================================================ **//

/**
 * 전리품을 판매하여 골드를 획득하는 함수
 * @param {number} index - 판매할 전리품의 player.lootInventory 배열 인덱스
 */
function sellLootItem(index) {
    const loot = player.lootInventory[index];
    if (!loot) return;

    player.coins += loot.sellPrice;
    player.lootInventory.splice(index, 1);

    log(`💰 ${loot.name}을(를) 판매하여 ${loot.sellPrice}G를 획득했습니다.`, 'log-system');
    alert(`${loot.name}을(를) ${loot.sellPrice}G에 판매했습니다.`);

    // 스탯 및 UI 즉시 갱신
    recalculatePlayerStats();
    updateUI();

    // 상점 UI 갱신
    document.getElementById('shop-coins').innerText = player.coins;
    renderSellableLoot();
}

/**
 * 상점에서 아이템을 구매하고 골드를 차감하는 함수
 * @param {'armor' | 'weapon' | 'heal' | 'buff' | 'critBuff' | 'mpPotion'} type - 구매할 아이템 타입.
 * @param {number} cost - 아이템 가격.
 * @param {object} data - 구매할 아이템의 데이터 (data.js 에서 가져옴).
 */
function buyItem(type, cost, data) {
    playSound('buy');
    if (player.coins < cost) {
        alert("코인이 부족합니다!");
        return;
    }

    if (type === 'armor' && player.armorInventory.some(item => item.name === data.name)) {
        alert("이미 보유하고 있는 방어구입니다.");
        return;
    }

    if (type === 'weapon' && player.weaponInventory.some(item => item.name === data.name)) {
        alert("이미 보유하고 있는 무기입니다.");
        return;
    }

    player.coins -= cost;

    if (type === 'armor') {
        player.armorInventory.push(data);
        alert(`${data.name}을(를) 구매했습니다. 장비창에서 착용할 수 있습니다.`);
        log(`🛡️ ${data.name}을(를) 구매했습니다.`, 'log-system');
    } else if (type === 'weapon') {
        player.weaponInventory.push(data);
        alert(`${data.name}을(를) 구매했습니다. 장비창에서 착용할 수 있습니다.`);
        log(`🗡️ ${data.name}을(를) 구매했습니다.`, 'log-system');
    } else if (type === 'heal' || type === 'buff' || type === 'critBuff' || type === 'mpPotion') {
        player.inventory.push({ type: type, ...data });
        alert(`${data.name}을(를) 인벤토리에 넣었습니다.`);
    }
    
    document.getElementById('shop-coins').innerText = player.coins;
    if (document.getElementById('shop-modal').style.display === 'flex') {
        renderShopItems();
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

//** ============================================================ **//
//** 8. 서버 통신
//** ============================================================ **//

// API_URL은 index.html에 포함된 config.js에서 전역 변수(window.API_URL)로 설정됩니다.
const API_URL = window.API_URL; // config.js에서 생성된 전역 변수를 상수로 할당

/**
 * 로그인 상태인지 확인하는 함수
 * @returns {boolean}
 */
function isLoggedIn() {
    return !!localStorage.getItem('jwt');
}

/**
 * 인증 토큰(JWT)이 포함된 HTTP 요청 헤더를 생성하여 반환하는 함수.
 * @returns {Headers}
 */
function getAuthHeaders() {
    const headers = new Headers({ 'Content-Type': 'application/json' });
    const token = localStorage.getItem('jwt');
    if (token) {
        headers.append('Authorization', `Bearer ${token}`);
    }
    return headers;
}

/**
 * API 응답을 공통으로 처리하고 인증 오류(토큰 만료 등)를 감지하는 함수.
 * - fetch 응답을 받아 JSON으로 파싱하고, 에러가 있으면 throw 합니다.
 * @param {Response} response - fetch API의 응답(Response) 객체.
 * @returns {Promise<any>} - 성공 시 JSON 데이터 또는 true. 인증 오류 시 null.
 */
async function handleApiResponse(response) {
    // 인증 오류 (토큰 만료, 유효하지 않은 토큰 등)
    if (response.status === 401 || response.status === 400) {
        const errorData = await response.json().catch(() => ({ message: '응답을 파싱할 수 없습니다.' }));
        if (errorData.message === '유효하지 않은 토큰입니다.' || errorData.message === '인증 토큰이 없어 접근이 거부되었습니다.') {
            alert('세션이 만료되었거나 유효하지 않습니다. 다시 로그인해주세요.');
            logout();
            showStartMenu();
            return null; // 처리되었음을 알림
        }
    }

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: '오류 메시지를 파싱할 수 없습니다.' }));
        throw new Error(errorData.message || `서버 오류: ${response.status}`);
    }

    // 내용이 없는 성공적인 응답 (e.g., 204 No Content)
    const contentType = response.headers.get("content-type");
    if (response.status === 204 || !contentType || !contentType.includes("application/json")) {
        return true;
    }

    return response.json();
}

/**
 * 회원가입 폼 데이터를 서버로 전송하여 회원가입을 처리하는 함수.
 */
async function handleRegister() {
    const username = document.getElementById('register-username').value;
    const password = document.getElementById('register-password').value;
    const email = document.getElementById('register-email').value;
    const country = document.getElementById('register-country').value;
    const birthdate = document.getElementById('register-birthdate').value;
    const errorMsgEl = document.getElementById('register-error-msg');

    try {
        const response = await fetch(`${API_URL}/users/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, email, country, birthdate }),
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || '회원가입에 실패했습니다.');
        }
        alert('회원가입 성공! 이제 로그인해주세요.');
        switchToLoginModal(new Event('submit')); // 로그인 창으로 전환
    } catch (error) {
        errorMsgEl.textContent = error.message;
        errorMsgEl.style.display = 'block';
    }
}

/**
 * 로그인 폼 데이터를 서버로 전송하여 로그인을 처리하는 함수.
 * - 성공 시 JWT 토큰을 받아 localStorage에 저장합니다.
 */
async function handleLogin() {
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    const errorMsgEl = document.getElementById('login-error-msg');

    try {
        const response = await fetch(`${API_URL}/users/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || '로그인에 실패했습니다.');
        }
        localStorage.setItem('jwt', data.token);
        localStorage.setItem('username', data.username);
        localStorage.setItem('userRole', data.role); // 역할 정보 저장
        updateLoginStatus(data.username);
        closeLoginModal();
    } catch (error) {
        errorMsgEl.textContent = error.message;
        errorMsgEl.style.display = 'block';
    }
}

/**
 * 로그아웃을 처리하는 함수.
 * - localStorage에서 사용자 정보와 토큰을 제거합니다.
 */
function logout() {
    localStorage.removeItem('jwt');
    localStorage.removeItem('username');
    localStorage.removeItem('userRole'); // 역할 정보 삭제
    updateLoginStatus(null);
    alert("로그아웃되었습니다.");
}

/**
 * 현재 게임 상태를 서버에 저장하는 함수.
 * @param {boolean} [isSilent=false] - 사용자에게 알림(alert)을 표시하지 않고 조용히 저장할지 여부.
 */
async function saveGame(isSilent = false) {
    if (!isLoggedIn()) {
        if (!isSilent) alert("로그인이 필요합니다.");
        return;
    }
    const gameState = {
        player,
        floor,
        turn,
        monsters,
        isPlayerTurn,
    };

    try {
        const response = await fetch(`${API_URL}/game/save`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(gameState),
        });

        const result = await handleApiResponse(response);
        if (result === null) return; // 인증 오류 처리됨

        if (!isSilent) {
            log("💾 게임 상태를 서버에 저장했습니다.", "log-system");
            alert("게임이 저장되었습니다. 시작 화면으로 돌아갑니다.");
            showStartMenu();
        } else {
            log("💾 자동 저장 완료.", "log-system");
        }
    } catch (error) {
        if (!isSilent) alert(`게임 저장 중 오류가 발생했습니다: ${error.message}`);
    }
}

/**
 * 서버에서 마지막으로 저장된 게임 상태를 불러오는 함수.
 * - 저장된 데이터가 없거나 유효하지 않으면 새 게임을 시작합니다.
 */
async function loadGame() {
    if (!isLoggedIn()) {
        alert("로그인이 필요합니다.");
        return;
    }
    try {
        const response = await fetch(`${API_URL}/game/load`, {
            headers: getAuthHeaders(),
        });
        if (response.status === 404) {
            alert("저장된 게임이 없습니다. 새 게임을 시작합니다.");
            startNewGame();
            return;
        }

        const loadedState = await handleApiResponse(response);
        if (loadedState === null) return; // 인증 오류 처리됨

        // Check for invalid game state (e.g., saved on game over)
        if (loadedState && loadedState.player && loadedState.player.hp <= 0) {
            alert("저장된 게임 데이터가 유효하지 않습니다. 새 게임을 시작합니다.");
            startNewGame();
            return;
        }

        showGameScreen();
        startGame(loadedState);
    } catch (error) {
        alert(`게임 불러오기에 실패했습니다: ${error.message}`);
    }
}

/**
 * 게임 점수(도달한 층)를 서버에 제출하는 함수.
 * - 게임 오버 시 호출됩니다.
 */
async function submitScore() {
    if (!isLoggedIn()) return; // 로그인 상태가 아니면 점수 제출 안 함
    
    const score = floor;
    try {
        const response = await fetch(`${API_URL}/scores`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ score, characterClass: player.characterClass }),
        });
        const result = await handleApiResponse(response);
        if (result === null) return; // 인증 오류 처리됨

        log(`🏆 최종 점수 ${score}층을 서버에 기록합니다.`, "log-system");
    } catch (error) {
        console.error("점수 제출 실패:", error);
    }
}

/**
 * 서버에서 전체 사용자 랭킹(스코어보드)을 가져와 표시하는 함수.
 */
async function fetchAndShowScores() {
    // 'N' 배지를 숨기고, 확인했다는 플래그를 저장합니다.
    const scoreboardBadgeGuest = document.getElementById('scoreboard-new-badge-guest');
    const scoreboardBadgeLoggedIn = document.getElementById('scoreboard-new-badge-loggedin');
    if (scoreboardBadgeGuest) scoreboardBadgeGuest.style.display = 'none';
    if (scoreboardBadgeLoggedIn) scoreboardBadgeLoggedIn.style.display = 'none';
    localStorage.setItem('showScoreboardNewBadge', 'false');

    try {
        const response = await fetch(`${API_URL}/scores`);
        if (!response.ok) {
            throw new Error('스코어보드를 불러오는데 실패했습니다.');
        }
        const scores = await response.json();

        // --- 실시간 1위 기록을 '확인했음'으로 저장 ---
        const liveGames = scores.filter(s => s.liveFloor && s.liveFloor > 0);
        if (liveGames.length > 0) {
            liveGames.sort((a, b) => b.liveFloor - a.liveFloor);
            const topLivePlayer = liveGames[0];
            // username과 liveFloor를 함께 저장
            localStorage.setItem('lastSeenTopLivePlayer', JSON.stringify(topLivePlayer));
        } else {
            // 실시간 게임이 없으면 확인 기록도 삭제
            localStorage.removeItem('lastSeenTopLivePlayer');
        }
        // --- 저장 로직 끝 ---

        renderScoreboard(scores);
        openScoreboardModal();
    } catch (error) {
        alert(error.message);
    }
}

/**
 * `updates.js` 파일에 정의된 공지사항 데이터를 가져와 모달에 표시하는 함수.
 */
function fetchAndShowNotices() {
    // 'N' 배지를 숨기고, 확인한 최신 버전을 저장합니다.
    const noticeBadgeGuest = document.getElementById('notice-new-badge-guest');
    const noticeBadgeLoggedIn = document.getElementById('notice-new-badge-loggedin');
    if (noticeBadgeGuest) noticeBadgeGuest.style.display = 'none';
    if (noticeBadgeLoggedIn) noticeBadgeLoggedIn.style.display = 'none';
    
    if (updateHistory.length > 0) {
        localStorage.setItem('lastSeenNoticeVersion', updateHistory[0].version);
    }

    // updates.js 파일에서 updateHistory 변수를 전역으로 사용합니다.
    if (typeof updateHistory !== 'undefined' && updateHistory.length > 0) {
        renderNotices(updateHistory);
        openNoticeModal();
    } else {
        alert('표시할 공지사항이 없습니다.');
    }
}

/**
 * 공지사항 항목을 클릭했을 때 상세 내용을 보여주거나 숨기는 함수.
 * @param {HTMLElement} element - 클릭된 `.notice-item` 요소.
 * @param {string} filePath - 불러올 상세 내용 파일의 경로.
 */
async function toggleNoticeDetail(element, filePath) {
    if (!element || !filePath) return;

    const detailsEl = element.querySelector('.notice-details');
    const isActive = element.classList.contains('active');

    // 현재 열려있는 다른 모든 항목을 닫습니다.
    document.querySelectorAll('#notice-list .notice-item.active').forEach(item => {
        if (item !== element) {
            item.classList.remove('active');
            item.querySelector('.notice-details').style.display = 'none';
        }
    });

    if (isActive) {
        // 이미 열려있으면 닫습니다.
        element.classList.remove('active');
        detailsEl.style.display = 'none';
    } else {
        // 닫혀있으면 엽니다.
        element.classList.add('active');
        
        // 내용이 아직 로드되지 않았다면 fetch로 불러옵니다.
        if (detailsEl.innerHTML.trim() === '') {
            try {
                detailsEl.textContent = '로딩 중...';
                const response = await fetch(filePath);
                if (!response.ok) throw new Error('내용을 불러올 수 없습니다.');
                detailsEl.textContent = await response.text();
            } catch (error) {
                detailsEl.textContent = error.message;
            }
        }
        detailsEl.style.display = 'block';
    }
}

/**
 * 서버에서 현재 로그인된 사용자의 프로필 정보를 가져오는 함수.
 */
async function fetchUserProfile() {
    if (!isLoggedIn()) return null;

    try {
        const response = await fetch(`${API_URL}/users/profile`, {
            headers: getAuthHeaders(),
        });
        const data = await handleApiResponse(response);
        return data;
    } catch (error) {
        console.error('프로필 정보 로딩 실패:', error);
        throw error; // 에러를 다시 던져서 openEditProfileModal에서 처리하도록 함
    }
}

/**
 * 사용자 프로필 업데이트 폼 데이터를 서버로 전송하여 정보를 수정하는 함수.
 */
async function handleUpdateProfile() {
    const email = document.getElementById('edit-email').value;
    const country = document.getElementById('edit-country').value;
    const birthdate = document.getElementById('edit-birthdate').value;
    const currentPassword = document.getElementById('edit-current-password').value;
    const newPassword = document.getElementById('edit-new-password').value;
    const confirmPassword = document.getElementById('edit-confirm-password').value;
    const errorMsgEl = document.getElementById('edit-profile-error-msg');

    errorMsgEl.style.display = 'none';

    // 새 비밀번호 유효성 검사
    if (newPassword !== confirmPassword) {
        errorMsgEl.textContent = '새 비밀번호가 일치하지 않습니다.';
        errorMsgEl.style.display = 'block';
        return;
    }

    const payload = {
        email,
        country,
        birthdate,
        currentPassword,
    };

    // 새 비밀번호가 입력된 경우에만 payload에 추가
    if (newPassword) {
        payload.newPassword = newPassword;
    }

    try {
        const response = await fetch(`${window.API_URL}/users/profile`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (response.ok) {
            alert('회원정보가 성공적으로 수정되었습니다.');
            closeEditProfileModal();
        } else {
            errorMsgEl.textContent = data.message || '정보 수정에 실패했습니다.';
            errorMsgEl.style.display = 'block';
        }
    } catch (error) {
        console.error('회원정보 수정 요청 오류:', error);
        errorMsgEl.textContent = '요청 중 오류가 발생했습니다.';
        errorMsgEl.style.display = 'block';
    }
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
