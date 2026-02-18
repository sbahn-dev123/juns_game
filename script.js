
//! ============================================================
//! 1. 게임 상태 변수 및 데이터 정의
//! 이 섹션에서는 게임의 모든 상태와 기본 데이터를 정의합니다.
//! ============================================================

//* 플레이어의 모든 상태를 담고 있는 객체
const player = {
    // --- 기본 스탯 ---
    baseMaxHp: 35,      // 기본 최대 체력 (스탯, 장비 미적용)
    maxHp: 35,          // 현재 최대 체력 (스탯, 장비 적용)
    hp: 35,             // 현재 체력
    baseMaxMp: 40,      // 기본 최대 마나
    maxMp: 40,          // 현재 최대 마나
    mp: 40,             // 현재 마나
    baseAtk: 8,        // 기본 공격력 (스탯, 장비 미적용)
    atk: 10,            // 현재 공격력 (스탯, 장비 적용)
    level: 1,           // 현재 레벨
    xp: 0,              // 현재 경험치
    xpToNextLevel: 100, // 다음 레벨까지 필요한 경험치
    statPoints: 0,      // 분배 가능한 스탯 포인트
    // --- 분배 가능 스탯 ---
    str: 0,             // 힘 스탯 (공격력에 영향)
    vit: 0,             // 체력 스탯 (최대 체력에 영향)
    luk: 0,             // 운 스탯 (치명타 확률에 영향)
    agi: 0,             // 민첩 스탯 (회피 확률에 영향)
    int: 0,             // 지혜 스탯 (골드 획득량에 영향)
    mnd: 0,             // 정신력 스탯 (최대 MP에 영향)
    fcs: 0,             // 고도의 집중 스탯 (흑섬 확률에 영향)
    // --- 버프 및 상태 ---
    blackFlashBuff: { active: false, duration: 0 }, // 흑섬 버프 상태 (활성화 여부, 남은 층)
    critBuff: { turns: 0, bonus: 0 }, // 치명타 확률 버프 상태 (남은 턴, 추가 확률)
    guaranteedCrit: false, // 다음 공격 확정 치명타 여부
    defenseBuff: { turns: 0, reduction: 0.6 }, // 방어 버프 (60% 감소)
    defenseStance: false, // 방어 태세 여부
    isStunned: false,   // 기절 상태 여부
    // --- 계산된 스탯 ---
    evasionChance: 4,   // 현재 회피 확률 (%)
    critChance: 11,     // 현재 치명타 확률 (%)
    critDamage: 2,      // 현재 치명타 배율
    goldBonus: 1,       // 골드 획득 보너스 배율
    // --- 재화 및 장비 ---
    coins: 0,           // 보유 골드
    baseEmoji: '🧙‍♂️',   // 기본 이모지
    emoji: '🧙‍♂️',       // 현재 이모지 (장비에 따라 변경)
    // --- 인벤토리 ---
    equippedArmor: null, // 현재 착용한 방어구
    equippedWeapon: null,// 현재 착용한 무기
    armorInventory: [], // 보유한 방어구 목록
    weaponInventory: [],// 보유한 무기 목록
    lootInventory: [], // 보스 전리품 보관
    targetIndex: 0,     // 현재 공격 목표 몬스터의 인덱스
    buff: { turns: 0, multiplier: 1.5 }, // 공격력 강화 버프 상태 (남은 턴, 공격력 배율)
    // --- 소비 아이템 인벤토리 ---
    inventory: [        // 보유한 소비 아이템 목록
        // 게임 시작 시 기본 회복 물약 3개 지급
        { type: 'heal', name: '기본 회복 물약', healAmount: 20 },
        { type: 'heal', name: '기본 회복 물약', healAmount: 20 },
        { type: 'heal', name: '기본 회복 물약', healAmount: 20 },
    ]
};

//* 현재 전투 중인 몬스터 객체들을 담는 배열
let monsters = [];

//* 게임의 주요 상태 변수
let floor = 1;              // 현재 층
let turn = 1;               // 현재 턴
let isPlayerTurn = true;    // 플레이어 턴 여부
let isGameOver = false;     // 게임 오버 여부
let isShopAutoOpened = false; // 5층마다 상점이 자동으로 열렸는지 여부

//* 스탯 분배 모달에서 임시로 사용할 변수
let tempStatPoints = 0; // 임시 스탯 포인트
let tempStats = {};     // 임시 스탯 객체 (힘, 체력, 운 등)

//! ============================================================
//! 2. 유틸리티 함수
//! 게임 전반에서 사용되는 보조 기능들을 정의합니다.
//! ============================================================

//! ============================================================
//! 3. 전투 로직
//! 플레이어와 몬스터가 턴을 주고받는 핵심 전투 로직을 다룹니다.
//! ============================================================

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
 * 플레이어의 일반 공격을 처리하는 함수
 */
function executeNormalAttack() {
    // --- 턴 시작 조건 검사 ---
    if (isGameOver || !isPlayerTurn) return;

    const targetMonster = monsters[player.targetIndex];
    if (targetMonster.hp <= 0) {
        log("이미 쓰러진 몬스터입니다.", 'log-system');
        return;
    }

    // 방어 태세 여부에 따라 총 MP 소모량 계산
    const mpCost = 0;
    const defenseMpCost = player.defenseStance ? 10 : 0;
    const totalMpCost = mpCost + defenseMpCost;

    if (player.mp < totalMpCost) {
        alert(`MP가 부족합니다! (필요: ${totalMpCost})`);
        return;
    }

    // 기절 상태 검사
    if (player.isStunned) {
        log("플레이어가 기절해서 움직일 수 없습니다!", 'log-player');
        player.isStunned = false; // 턴을 넘기면서 기절 해제
        setTimeout(monstersAttack, 800);
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

    // 플레이어 공격 애니메이션
    const playerElement = document.getElementById('player-character');
    playerElement.style.transform = 'translateX(40px) scale(1.05)';
    setTimeout(() => {
        playerElement.style.transform = ''; // 원래 위치로
    }, 150);
    // --- 애니메이션 끝 ---

    const monsterWrappers = document.querySelectorAll('#monster-area .monster-wrapper');
    const targetMonsterElement = monsterWrappers[player.targetIndex];

    // --- 흑섬(Black Flash) 발동 체크 (기본 0.8% + 집중 스탯) ---
    const blackFlashChance = 0.008 + (player.fcs * 0.004);
    if (Math.random() < blackFlashChance) {
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
        // --- 일반 공격 로직 ---
        // 몬스터 회피 체크 (5% 확률)
        if (Math.random() < 0.05) {
            log(`${targetMonster.name}이(가) 공격을 회피했다! (MISS)`, 'log-monster');
            showFloatingText('MISS', targetMonsterElement, 'miss');
            setTimeout(monstersAttack, 800);
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
            log(`⚡ 치명타! 용사가 ${targetMonster.name}에게 ${dmg}의 폭발적인 피해를 입혔습니다!`, 'log-player');
        }

        if (isCrit) {
            dmg = Math.floor(dmg * player.critDamage);
            showFloatingText(dmg, targetMonsterElement, 'crit');
        } else {
            log(`용사가 ${targetMonster.name}에게 ${dmg}의 피해를 입혔습니다!`, 'log-player');
            showFloatingText(dmg, targetMonsterElement, 'damage');
        }

        targetMonster.hp -= dmg;

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
            gainXP(targetMonster.xp);
        }
        winBattle();
    } else {
        // 현재 타겟 몬스터가 죽었는지 확인
        if (targetMonster.hp <= 0) {
            log(`${targetMonster.name}을(를) 쓰러뜨렸다!`, 'log-player');
            gainXP(targetMonster.xp);
            findNextTarget();
        }
        setTimeout(monstersAttack, 800); // 0.8초 뒤 몬스터 반격
    }
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
            if (isGameOver) return;

            const monsterIndex = monsters.findIndex(m => m === monster);
            const monsterElement = document.querySelectorAll('#monster-area .monster-wrapper')[monsterIndex];

            // --- 보스 궁극기(Charge Attack) 발동 ---
            if (monster.isCharging) {
                const skill = monster.skill;
                let dmg = Math.floor(monster.atk * skill.power);
                // 방어 버프가 활성화된 경우 데미지 감소
                if (player.defenseBuff.turns > 0) {
                    dmg = Math.floor(dmg * (1 - player.defenseBuff.reduction));
                    if (!defenseBuffUsedThisTurn) { log(`🛡️ 방어 성공! 받는 피해가 감소했습니다.`, 'log-system'); defenseBuffUsedThisTurn = true; }
                }
                player.hp -= dmg;
                monster.isCharging = false;
                log(`🔥 ${monster.name}의 ${skill.name}! ${dmg}의 엄청난 피해를 입었습니다!`, 'log-monster');
                showFloatingText(dmg, playerElement, 'crit');

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
                            let dmg = Math.floor(monster.atk * 1.2); // 스킬은 약간 더 강하게
                            // 방어 버프 적용
                            if (player.defenseBuff.turns > 0) {
                                dmg = Math.floor(dmg * (1 - player.defenseBuff.reduction));
                                if (!defenseBuffUsedThisTurn) { log(`🛡️ 방어 성공! 받는 피해가 감소했습니다.`, 'log-system'); defenseBuffUsedThisTurn = true; }
                            }
                            player.hp -= dmg;
                            player.isStunned = true;
                            const skillName = skill.name || '강타';
                            log(`💥 ${monster.name}의 ${skillName}! ${dmg}의 피해를 입고 기절했습니다!`, 'log-monster');
                            showFloatingText(dmg, playerElement, 'crit');
                            showFloatingText('STUN', playerElement, 'stun');
                            break;
                        }
                        case 'drain': {
                            let dmg = monster.atk;
                            // 방어 버프 적용
                            if (player.defenseBuff.turns > 0) {
                                dmg = Math.floor(dmg * (1 - player.defenseBuff.reduction));
                                if (!defenseBuffUsedThisTurn) { log(`🛡️ 방어 성공! 받는 피해가 감소했습니다.`, 'log-system'); defenseBuffUsedThisTurn = true; }
                            }
                            const healedAmount = Math.floor(dmg * skill.power);
                            player.hp -= dmg;
                            monster.hp = Math.min(monster.maxHp, monster.hp + healedAmount);
                            const skillName = skill.name || '생명력 흡수';
                            log(`🩸 ${monster.name}의 ${skillName}! ${dmg}의 피해를 입고, ${monster.name}은(는) ${healedAmount}의 체력을 회복합니다.`, 'log-monster');
                            showFloatingText(dmg, playerElement, 'damage');
                            if(monsterElement) showFloatingText(`+${healedAmount}`, monsterElement, 'heal');
                            break;
                        }
                        case 'mp_drain': {
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
                    let dmg = Math.floor(Math.random() * 3) + monster.atk;
                    // 몬스터 치명타 (17% 확률, 1.6배 데미지)
                    if (Math.random() < 0.17) {
                        dmg = Math.floor(dmg * 1.6);
                        log(`⚡ 치명타! ${monster.name}의 강력한 공격! ${dmg}의 피해를 입었습니다.`, 'log-monster');
                        showFloatingText(dmg, playerElement, 'crit');
                    } else {
                        log(`${monster.name}의 공격! ${dmg}의 피해를 입었습니다.`, 'log-monster');
                        showFloatingText(dmg, playerElement, 'damage');
                    }

                    // 방어 버프 적용
                    if (player.defenseBuff.turns > 0) {
                        dmg = Math.floor(dmg * (1 - player.defenseBuff.reduction));
                        if (!defenseBuffUsedThisTurn) { log(`🛡️ 방어 성공! 받는 피해가 감소했습니다.`, 'log-system'); defenseBuffUsedThisTurn = true; }
                    }

                    player.hp -= dmg;
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
        turn++;
        isPlayerTurn = true;
        toggleControls(true); // 플레이어 턴으로 전환하고 컨트롤 버튼 활성화
        updateUI();
    }
}

//! ============================================================
//! 3.5 스킬 시스템
//! 플레이어가 사용하는 다양한 스킬의 로직을 정의합니다.
//! ============================================================

/**
 * 강 공격 (단일 대상, 높은 데미지, MP 소모, 낮은 확률로 흑섬 발동)
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
    const totalMpCost = mpCost + defenseMpCost;

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
        setTimeout(monstersAttack, 800);
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

    // 강한 공격 애니메이션
    const playerElement = document.getElementById('player-character');
    playerElement.style.transform = 'translateX(50px) scale(1.1)'; // 일반 공격보다 조금 더 강하게
    setTimeout(() => {
        playerElement.style.transform = ''; // 원래 위치로
    }, 150);
    // --- 애니메이션 끝 ---

    const monsterWrappers = document.querySelectorAll('#monster-area .monster-wrapper');
    const targetMonsterElement = monsterWrappers[player.targetIndex];

    // --- 흑섬(Black Flash) 발동 체크 (강공격 시 3% 고정 확률) ---
    if (Math.random() < 0.03) {
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
        let dmg = Math.floor(player.atk * 2.0); // 200% 데미지

        // 확정 치명타 체크
        if (player.guaranteedCrit) {
            dmg = Math.floor(dmg * player.critDamage);
            player.guaranteedCrit = false; // 사용 후 플래그 해제
            log('⚡ 흑섬의 여파로 강 공격이 치명타로 적중했습니다!', 'log-player');
        } else {
            log(`💥 강 공격! ${targetMonster.name}에게 ${dmg}의 강력한 피해를 입혔습니다!`, 'log-player');
        }
        showFloatingText(dmg, targetMonsterElement, 'crit'); // 강공격은 항상 crit 스타일로 표시

        targetMonster.hp -= dmg;

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
            log(`${targetMonster.name}을(를) 쓰러뜨렸다!`, 'log-player');
            gainXP(targetMonster.xp);
        }
        winBattle();
    } else {
        if (targetMonster.hp <= 0) {
            log(`${targetMonster.name}을(를) 쓰러뜨렸다!`, 'log-player');
            gainXP(targetMonster.xp);
            findNextTarget();
        }
        setTimeout(monstersAttack, 800);
    }
}

/**
 * 휩쓸기 (모든 몬스터 대상 광역 공격, MP 소모)
 */
function executeSweepAttack() {
    if (isGameOver || !isPlayerTurn) return;

    // 방어 태세 여부에 따라 총 MP 소모량 계산
    const mpCost = 25;
    const defenseMpCost = player.defenseStance ? 10 : 0;
    const totalMpCost = mpCost + defenseMpCost;

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
        setTimeout(monstersAttack, 800);
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
        player.guaranteedCrit = false; // 사용 후 플래그 해제
        log('⚡ 흑섬의 여파로 휩쓸기가 치명타로 적중합니다!', 'log-player');
    }

    livingMonsters.forEach((monster, index) => {
        // 각 몬스터에게 순차적으로 데미지를 줌
        setTimeout(() => {
            const baseDmg = Math.floor(Math.random() * 5) + player.atk;
            let dmg = Math.floor(baseDmg * 0.8); // 기본 데미지의 80%

            const monsterIndexInAll = monsters.findIndex(m => m === monster);
            const targetElement = monsterElements[monsterIndexInAll];
            
            // 치명타 여부에 따라 데미지 및 효과 적용
            if (isCrit) {
                dmg = Math.floor(dmg * player.critDamage);
                showFloatingText(dmg, targetElement, 'crit');
            } else {
                showFloatingText(dmg, targetElement, 'damage');
            }
            
            monster.hp -= dmg;

            // 몬스터 피격 애니메이션
            if (targetElement) {
                const emojiElement = targetElement.querySelector('.emoji');
                emojiElement.classList.add('hit');
                setTimeout(() => emojiElement.classList.remove('hit'), 300);
            }

            // 몬스터 사망 처리 및 경험치 합산
            if (monster.hp <= 0) {
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
                    setTimeout(monstersAttack, 800);
                }
            }
        }, index * 150); // 0.15초 간격으로 공격
    });

    updateUI();
}

/**
 * 방어 태세를 켜고 끄는 함수 (토글)
 * 이 행동 자체는 턴을 소모하지 않으며, 다음 공격 스킬 사용 시 MP를 추가로 소모하여 방어 효과를 발동시킵니다.
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
 * 인벤토리의 소비 아이템을 사용하는 함수
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
        player.buff.turns = item.turns;
        player.buff.multiplier = item.mult;
        log(`🧪 ${item.name} 사용! ${item.turns}턴 동안 공격력이 ${item.mult}배가 됩니다.`, 'log-system');
        showFloatingText('ATK UP', playerElement, 'buff');
        flashColor = '#a855f7'; // 보라색
    } else if (item.type === 'heal') {
        const healAmount = Math.min(player.maxHp - player.hp, item.healAmount);
        player.hp = Math.min(player.maxHp, player.hp + healAmount);
        log(`💊 ${item.name} 사용! 체력이 ${healAmount} 회복되었습니다.`, 'log-system');
        if (healAmount > 0) {
            showFloatingText(`+${healAmount}`, playerElement, 'heal');
        }
        flashColor = '#22c55e'; // 초록색
    } else if (item.type === 'mpPotion') {
        const mpAmount = Math.min(player.maxMp - player.mp, item.mpAmount);
        player.mp = Math.min(player.maxMp, player.mp + mpAmount);
        log(`💧 ${item.name} 사용! 마나가 ${mpAmount} 회복되었습니다.`, 'log-system');
        if (mpAmount > 0) {
            showFloatingText(`+${mpAmount}`, playerElement, 'mp-heal');
        }
        flashColor = '#60a5fa'; // 파란색
    } else if (item.type === 'critBuff') {
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
 * 현재 타겟 몬스터가 죽었을 경우, 다음 살아있는 몬스터를 자동으로 타겟으로 지정합니다.
 */
function findNextTarget() {
    const livingMonsterIndex = monsters.findIndex(m => m.hp > 0);
    if (livingMonsterIndex !== -1) {
        player.targetIndex = livingMonsterIndex;
    }
}

/**
 * 플레이어가 경험치를 획득하고, 레벨업 조건을 확인합니다.
 * @param {number} amount - 획득할 경험치 양
 */
function gainXP(amount) {
    player.xp += amount;
    log(`${amount}의 경험치를 획득했다!`, 'log-system', { color: '#a78bfa' });
    updateUI();
    checkForLevelUp();
}

/**
 * 플레이어의 경험치가 레벨업 조건을 만족하는지 확인하고, 레벨업을 처리합니다.
 */
function checkForLevelUp() {
    // 현재 경험치가 필요 경험치보다 많거나 같으면 레벨업
    if (player.xp >= player.xpToNextLevel) {
        player.level++;
        player.xp -= player.xpToNextLevel;
        player.statPoints += 3;
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
        log(`스탯 포인트를 3 획득했습니다!`, 'log-system');
        log('장비/스탯 창에서 포인트를 분배할 수 있습니다.', 'log-system');
    }
}

//! ============================================================
//! 4. 게임 진행 로직 (승리, 패배, 다음 층)
//! 전투 종료 후의 흐름과 다음 단계로의 진행을 관리합니다.
//! ============================================================

/**
 * 전투에서 승리했을 때 호출되는 함수
 * 골드와 경험치를 정산하고, 보스 전리품 드랍을 처리합니다.
 */
function winBattle() {
    const totalCoins = Math.floor(monsters.reduce((sum, m) => sum + m.dropCoins, 0) * player.goldBonus);
    player.coins += totalCoins;
    log(`전투 승리! ${totalCoins} 골드를 획득했습니다.`, 'log-system');
    
    // --- 보스 특별 전리품 처리 ---
    monsters.forEach(monster => {
        if (monster.specialDrop && Math.random() < 0.62) { // 62% 확률로 드랍
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
 * 전투 승리 후 다음 단계(상점 또는 다음 층)로 진행합니다.
 */
function proceedToNextStage() {
    if (floor % 5 === 0) {
        openShop(true);
    } else {
        nextFloor();
    }
}

/**
 * 다음 층으로 이동하고, 플레이어 상태를 일부 회복하며, 새로운 몬스터를 생성합니다.
 */
function nextFloor() {
    floor++;
    turn = 1;
    isPlayerTurn = true;
    monsters = [];
    player.targetIndex = 0;
    
    // --- 플레이어 상태 회복 및 버프 턴 감소 ---
    player.hp = player.maxHp; // 다음 층 이동 시 체력은 완전 회복
    const mpRecovery = 20;
    player.mp = Math.min(player.maxMp, player.mp + mpRecovery); // 남은 마나 + 20 회복
    log(`다음 층으로 이동하며 마나가 ${mpRecovery}만큼 회복되었습니다.`, 'log-system');

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

    updateUI();
    toggleControls(true);
}

/**
 * 특정 층에 맞는 몬스터들을 생성하고 로그를 출력하는 함수
 * 보스 층, 중간 보스 층, 일반 층을 구분하여 몬스터를 생성합니다.
 * @param {number} floorNumber - 생성할 층 번호
 * @returns {Array<object>} - 생성된 몬스터 객체 배열
 */
function generateMonstersForFloor(floorNumber) {
    let generatedMonsters = [];
    // 메인 보스 몬스터 등장 로직 (20, 40, 60...)
    if (floorNumber % 20 === 0) {
        const bossIndex = (floorNumber / 20) - 1;
        const bossTemplate = bossList[Math.min(bossIndex, bossList.length - 1)];
        const bossMultiplier = 1 + (bossIndex * 0.8); // 보스 능력치 증가폭 상향
        const boss = createMonster(bossTemplate, bossMultiplier);
        generatedMonsters.push(boss);
        log(`============ 지하 ${floorNumber}층: 보스전! ============`, 'log-system', { fontSize: '28px', color: '#ef4444', textShadow: '0 0 10px #ef4444' });
        log(`🚨 강력한 ${boss.name}이(가) 나타났습니다!`, 'log-monster', { fontSize: '24px', color: '#ef4444' });
    } else if (floorNumber % 20 === 10) { // 중간 보스 몬스터 등장 로직 (10, 30, 50...)
        const bossIndex = Math.floor(floorNumber / 20);
        const bossTemplate = midBossList[Math.min(bossIndex, midBossList.length - 1)];
        const bossMultiplier = 1 + (bossIndex * 0.7); // 중간 보스 능력치 증가폭 상향
        const boss = createMonster(bossTemplate, bossMultiplier);
        generatedMonsters.push(boss);
        log(`============ 지하 ${floorNumber}층: 보스전! ============`, 'log-system', { fontSize: '28px', color: '#ef4444', textShadow: '0 0 10px #ef4444' });
        log(`🚨 강력한 ${boss.name}이(가) 나타났습니다!`, 'log-monster', { fontSize: '24px', color: '#ef4444' });
    } else {
        // 일반 몬스터 생성 로직
        const mainMonsterTemplate = monsterList[Math.min(floorNumber - 1, monsterList.length - 1)];
        const difficultyMultiplier = 1 + (Math.floor((floorNumber - 1) / 10) * 0.3);
        const mainMonster = createMonster(mainMonsterTemplate, difficultyMultiplier);

        // 17층 이상일 경우 추가 몬스터 생성
        if (floorNumber >= 17) {
            const extraMobsCount = floorNumber >= 22 ? 2 : 1;
            for (let i = 0; i < extraMobsCount; i++) {
                const mobTemplateIndex = Math.floor(Math.random() * Math.min(floorNumber, 10));
                const mobTemplate = monsterList[mobTemplateIndex];
                const mob = createMonster(mobTemplate, 1);
                generatedMonsters.push(mob);
            }
        }

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
 * @param {object} template - 몬스터 도감에 있는 몬스터 템플릿
 * @param {number} multiplier - 난이도 배율
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
    };
}

/**
 * 플레이어 사망 시 게임 오버를 처리하는 함수
 */
function gameOver() {
    isGameOver = true;
    log("체력이 0이 되었습니다. 게임 오버...", 'log-monster');
    // 게임 오버 시 버튼 비활성화 처리
    const btns = document.querySelectorAll('button');
    btns.forEach(btn => btn.disabled = true);
}

/**
 * 컨트롤 버튼(공격, 물약 등)의 활성화/비활성화 상태를 조절합니다.
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

//! ============================================================
//! 5. 스탯 분배 시스템 (장비 모달에 통합됨)
//! 레벨업으로 얻은 스탯 포인트를 분배하는 UI와 로직을 관리합니다.
//! ============================================================

/**
 * 특정 스탯을 1 증가시키는 임시 함수 (분배 확정 전)
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
 * 임시로 분배한 스탯을 원래대로 초기화하는 함수
 */
function resetTempStats() {
    tempStatPoints = player.statPoints;
    tempStats = { str: player.str, vit: player.vit, luk: player.luk, agi: player.agi, int: player.int, mnd: player.mnd, fcs: player.fcs };
    renderStatUpModal();
}

/**
 * 스탯 분배를 확정하고 실제 플레이어 능력치에 적용합니다.
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
 * 스탯, 장비, 버프 등을 모두 고려하여 플레이어의 최종 능력치를 재계산합니다.
 */
function recalculatePlayerStats() {
    const weaponBonus = player.equippedWeapon ? player.equippedWeapon.atkBonus : 0;
    const armorBonus = player.equippedArmor ? player.equippedArmor.maxHpBonus : 0;
    
    player.atk = player.baseAtk + (player.str * 2) + weaponBonus;
    player.maxHp = player.baseMaxHp + (player.vit * 5) + armorBonus;
    player.maxMp = player.baseMaxMp + (player.mnd * 5); // 정신력 1당 5 증가
    player.critChance = 11 + (player.luk * 0.7) + player.critBuff.bonus;
    player.evasionChance = 4 + (player.agi * 2);
    player.critDamage = 2;
    player.goldBonus = 1 + (player.int * 0.02);

    // 흑섬 버프 적용
    if (player.blackFlashBuff.active) {
        player.atk = Math.floor(player.atk * 1.6);
        player.maxHp = Math.floor(player.maxHp * 1.6);
        player.maxMp = Math.floor(player.maxMp * 1.6);
        player.critChance *= 1.6;
        player.evasionChance *= 1.6;
        player.critDamage *= 1.6;
        player.goldBonus *= 1.6;
    }

    // 체력이 최대 체력을 초과하지 않도록 조정
    if (player.hp > player.maxHp) player.hp = player.maxHp;
    if (player.mp > player.maxMp) player.mp = player.maxMp;
}

//! ============================================================
//! 6. 장비 및 스탯 모달
//! 인벤토리(장비, 전리품)와 스탯 분배 창을 관리하는 로직입니다.
//! ============================================================

/**
 * 장비 아이템을 착용하는 함수
 * @param {string} type - 착용할 아이템 타입 ('armor' 또는 'weapon')
 * @param {number} index - 해당 타입의 인벤토리 배열 인덱스
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
 * 전리품 아이템을 사용하여 영구 스탯을 얻는 함수
 * @param {number} index - 사용할 전리품의 player.lootInventory 배열 인덱스
 */
function useLootItem(index) {
    const loot = player.lootInventory[index];
    if (!loot) return;

    if (loot.type === 'permanent_stat') {
        player[loot.stat] += loot.value;
        log(`🌟 [${loot.name}]을(를) 사용하여 ${statInfo[loot.stat].name} 스탯이 영구적으로 ${loot.value} 증가했습니다!`, 'log-system', { color: '#f59e0b', fontWeight: 'bold' });
    }

    player.lootInventory.splice(index, 1);

    recalculatePlayerStats();
    updateUI();
    
    // 모달 UI 새로고침
    renderLootInventory();
    renderStatUpModal();
}

//! ============================================================
//! 7. 상점 시스템
//! 아이템 구매 및 전리품 판매를 담당하는 상점 로직입니다.
//! ============================================================

/**
 * 전리품을 판매하여 골드를 획득하는 함수
 * @param {number} index - 판매할 전리품의 player.lootInventory 배열 인덱스
 */
function sellLootItem(index) {
    const loot = player.lootInventory[index];
    if (!loot) return;

    player.coins += loot.sellPrice;
    player.lootInventory.splice(index, 1);

    alert(`${loot.name}을(를) ${loot.sellPrice}G에 판매했습니다.`);
    log(`💰 ${loot.name}을(를) 판매하여 ${loot.sellPrice}G를 획득했습니다.`, 'log-system');

    document.getElementById('shop-coins').innerText = player.coins;
    renderSellableLoot(); // 판매 목록 새로고침
}

/**
 * 상점에서 아이템을 구매하고 골드를 차감하는 함수
 * @param {string} type - 구매할 아이템 타입 ('armor', 'weapon', 'heal' 등)
 * @param {number} cost - 아이템 가격
 * @param {object} data - 구매할 아이템의 데이터
 */
function buyItem(type, cost, data) {
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

//! ============================================================
//! 8. 인벤토리 시스템
//! 소비 아이템 인벤토리를 관리하는 로직입니다. (현재는 물약 사용 모달로 대체됨)
//! ============================================================

//! ============================================================
//! 9. 초기화 및 이벤트 리스너
//! 게임 시작 및 사용자 입력(키보드)을 처리합니다.
//! ============================================================

/**
 * 게임을 시작하고 1층을 설정하는 함수
 */
function startGame() {
    // 플레이어 스탯을 초기 계산하고, 체력/마나를 가득 채웁니다.
    recalculatePlayerStats();
    player.hp = player.maxHp;
    player.mp = player.maxMp;
    monsters = generateMonstersForFloor(floor);
    updateUI();
    toggleControls(true);
}

//* 게임 시작 시 UI를 한 번 업데이트하여 초기 상태를 표시
startGame();

//* 키보드 입력을 처리하기 위한 이벤트 리스너 추가
document.addEventListener('keydown', handleKeydown);

/**
 * 키보드 입력(좌우 방향키)을 감지하여 몬스터 타겟을 변경합니다.
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
