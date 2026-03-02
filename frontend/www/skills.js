//! =================================================================
//! skills.js
//!
//! 이 파일은 플레이어의 모든 특수 스킬 로직을 담당합니다.
//! - 공용 스킬 (강 공격, 휩쓸기 등)
//! - 각 직업별 고유 스킬 및 궁극기
//! =================================================================

//** ============================================================ **//
//** 1. 공용 스킬
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

//** ============================================================ **//
//** 2. 용사 (Hero) 스킬
//** ============================================================ **//

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
        setTimeout(playerTurnEnd, 800);
    }
}

//** ============================================================ **//
//** 3. 마법사 (Wizard) 스킬
//** ============================================================ **//

/**
 * '마나 블래스터' 스킬을 실행하는 함수 (마법사 전용).
 * - 단일 대상에게 마법 피해를 줍니다. (MP 10 소모)
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
 * - 최대 3명의 적에게 화염 피해를 주고 화상 효과를 부여합니다. (MP 20 소모)
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
 * '아이스 월' 스킬을 실행하는 함수 (마법사 전용).
 * - 최대 체력의 30%만큼 피해를 흡수하는 보호막을 생성합니다. (턴 미소모)
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
                else { findNextTarget(); setTimeout(playerTurnEnd, 800); }
            }
        }, index * 150);
    });

    updateUI();
}

//** ============================================================ **//
//** 4. 도적 (Rogue) 스킬
//** ============================================================ **//

/**
 * '독 바르기' 스킬을 실행하는 함수 (도적 전용).
 * - 5턴간 자신의 공격에 독 효과를 부여합니다. (MP 10 소모)
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
 * - 2턴간 회피율을 30% 증가시킵니다. (턴 미소모)
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

//** ============================================================ **//
//** 5. 네크로맨서 (Necromancer) 스킬
//** ============================================================ **//

/**
 * '영체 소환' 스킬을 실행하는 함수 (네크로맨서 전용).
 * - 흡수한 영체 목록을 보여주는 모달을 엽니다. (턴 미소모)
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
 * - 체력이 15% 이하인 몬스터를 흡수하여 영체로 만듭니다.
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
                else { findNextTarget(); setTimeout(playerTurnEnd, 800); }
            }
        }, index * 150);
    });

    updateUI();
}

//** ============================================================ **//
//** 6. 성기사 (Paladin) 스킬
//** ============================================================ **//

/**
 * '신성한 방패' 스킬을 실행하는 함수 (성기사 전용).
 * - 1턴 동안 받는 피해를 80% 감소시키고, 받은 피해의 70%를 반사합니다. (MP 15 소모, 턴 미소모)
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
 * - 4턴 동안 턴마다 체력을 10% 회복합니다. (턴 미소모)
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

//** ============================================================ **//
//** 7. 도박꾼 (Gambler) 스킬
//** ============================================================ **//

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
        showSkillSelection(); // 턴을 소모하지 않으므로 스킬 선택창을 다시 표시
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
            player.invincibleBuff = { active: true, turns: 5 };
            outcomeText = '잭팟! 7️⃣7️⃣7️⃣ 5턴간 무적!';
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