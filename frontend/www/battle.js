//! =================================================================
//! battle.js
//!
//! 이 파일은 게임의 전투 및 스킬 사용 로직을 담당합니다.
//! - 일반 공격 및 스킬 실행
//! - 몬스터 공격 및 턴 관리
//! - 소환수 공격
//! - 흑섬, 치명타 등 전투 관련 판정
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
            handleMonsterDeath(targetMonster, player.targetIndex);
        }
        winBattle();
    } else {
        // 현재 타겟 몬스터가 죽었는지 확인
        if (targetMonster.hp <= 0) {
            handleMonsterDeath(targetMonster, player.targetIndex);
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
                    handleMonsterDeath(targetMonster, player.targetIndex);
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
                    handleMonsterDeath(monster, monsterIndex, '화상 피해');
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
                    handleMonsterDeath(monster, monsterIndex, '중독 피해');
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

        // 턴 종료 시 영역 유지비 소모
        if (player.domainActive) {
            const maintenanceCost = 15;
            if (player.mp >= maintenanceCost) {
                player.mp -= maintenanceCost;
                log(`🔮 영역 유지를 위해 MP를 ${maintenanceCost} 소모합니다.`, 'log-system');
                // 턴 종료 시 영역 효과 발동
                await applyDomainEffects();
            } else {
                deactivateDomain(true); // MP 부족으로 강제 해제
            }
        }

        // 스킬 봉인 턴 감소
        if (player.skillLockTurns > 0) {
            player.skillLockTurns--;
            if (player.skillLockTurns === 0) {
                log('⛓️ 스킬 봉인이 해제되었습니다.', 'log-system');
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
    if (checkSkillLock()) return;
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
    if (checkSkillLock()) return;
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
                handleMonsterDeath(monster, monsterIndexInAll);
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
    if (checkSkillLock()) return;
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
    if (checkSkillLock()) return;
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
        if (targetMonster.hp <= 0) handleMonsterDeath(targetMonster, player.targetIndex);
        winBattle();
    } else {
        if (targetMonster.hp <= 0) {
            handleMonsterDeath(targetMonster, player.targetIndex);
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
    if (checkSkillLock()) return;
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
    if (checkSkillLock()) return;
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
            handleMonsterDeath(monster, monsterIndex);
        }
    };

    attackTarget(targets[0], false);
    if (targets.length > 1) {
        setTimeout(() => attackTarget(targets[1], true), 200);
    }

    // --- 턴 종료 처리 ---
    setTimeout(() => {
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
    if (checkSkillLock()) return;
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
    if (checkSkillLock()) return;
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
        if (targetMonster.hp <= 0) handleMonsterDeath(targetMonster, player.targetIndex);
        winBattle();
    } else {
        if (targetMonster.hp <= 0) {
            handleMonsterDeath(targetMonster, player.targetIndex);
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
    if (checkSkillLock()) return;
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
    if (checkSkillLock()) return;
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
        if (targetMonster.hp <= 0) handleMonsterDeath(targetMonster, targetIndex);
        winBattle();
    } else {
        if (targetMonster.hp <= 0) {
            handleMonsterDeath(targetMonster, targetIndex);
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
    if (checkSkillLock()) return;
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
    if (checkSkillLock()) return;
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
    if (checkSkillLock()) return;
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
        handleMonsterDeath(targetMonster, player.targetIndex);
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
    if (checkSkillLock()) return;
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
            handleMonsterDeath(targetMonster, player.targetIndex);
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
    if (checkSkillLock()) return;
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
    if (checkSkillLock()) return;
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
        if (targetMonster.hp <= 0) handleMonsterDeath(targetMonster, player.targetIndex);
        winBattle();
    } else {
        if (targetMonster.hp <= 0) {
            handleMonsterDeath(targetMonster, player.targetIndex);
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
    if (checkSkillLock()) return;
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
    if (checkSkillLock()) return;
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
    if (checkSkillLock()) return;
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
            handleMonsterDeath(targetMonster, player.targetIndex);
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
    if (checkSkillLock()) return;
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
    if (checkSkillLock()) return;
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
    if (checkSkillLock()) return;
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

            if (targetMonster.hp <= 0) handleMonsterDeath(targetMonster, targetIndex);
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
                handleMonsterDeath(monster, monsterIndexInAll);
            }

            if (index === livingMonsters.length - 1) {
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
                handleMonsterDeath(monster, monsterIndexInAll);
            }

            if (index === livingMonsters.length - 1) {
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
                handleMonsterDeath(monster, monsterIndexInAll);
            }

            if (index === livingMonsters.length - 1) {
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
//** 8. 영역 전개 (Domain Expansion) 스킬
//** ============================================================ **//

const domainData = {
    hero: { name: '불굴의 투기장', mpCost: 40, style: { color: 'orange', textShadow: '0 0 10px red' } },
    wizard: { name: '만상(森羅萬象)의 섭리', mpCost: 50, style: { color: '#8b5cf6', textShadow: '0 0 10px #c4b5fd' } },
    rogue: { name: '자복암영정(自伏暗影庭)', mpCost: 35, style: { color: '#3f3f46', textShadow: '0 0 10px #a1a1aa' } },
    paladin: { name: '신성한 심판의 영역', mpCost: 45, style: { color: '#facc15', textShadow: '0 0 10px #fef08a' } },
    necromancer: { name: '망자의 연회', mpCost: 35, style: { color: '#7e22ce', textShadow: '0 0 10px #c084fc' } },
    gambler: { name: '복마어주자(伏魔御廚子)', mpCost: 30, style: { color: '#be123c', textShadow: '0 0 10px #fda4af' } }
};

/**
 * 영역 전개를 활성화하는 토글 함수.
 * @param {string} characterClass - 영역을 사용하는 캐릭터의 클래스.
 */
function activateDomain(characterClass) {
    if (isGameOver || !isPlayerTurn) return;

    const domain = domainData[characterClass];
    if (!domain) return;

    const totalMpCost = Math.floor(domain.mpCost * player.mpCostMultiplier);
    if (player.mp < totalMpCost) {
        alert(`MP가 부족합니다! (필요: ${totalMpCost})`);
        return;
    }

    player.mp -= totalMpCost;
    player.domainActive = true;
    playSound('boss-appear');

    log(`영역 전개: ${domain.name}`, 'log-player', { fontSize: '24px', ...domain.style });

    const domainCircle = document.getElementById('domain-expansion-circle');
    if (domainCircle) {
        domainCircle.style.display = 'block';
        domainCircle.style.animation = 'none';
        domainCircle.offsetHeight; // Reflow
        domainCircle.style.animation = 'expand-domain-persistent 1.5s forwards';
    }
    
    updateUI();
    showSkillSelection(); // 버튼 상태 갱신
}

/**
 * 활성화된 영역을 해제하는 토글 함수.
 */
function deactivateDomain() {
    if (isGameOver || !isPlayerTurn) return;

    player.domainActive = false;
    playSound('click'); // 해제는 간단한 사운드 사용

    log('영역을 해제합니다.', 'log-system');

    const domainCircle = document.getElementById('domain-expansion-circle');
    if (domainCircle) {
        domainCircle.style.animation = 'none';
        domainCircle.offsetHeight; // Reflow
        domainCircle.style.animation = 'shrink-domain 1s forwards';
        // 애니메이션이 끝난 후 완전히 숨김
        setTimeout(() => {
            if (!player.domainActive) { // 그 사이에 다시 활성화되지 않았는지 확인
                domainCircle.style.display = 'none';
            }
        }, 1000);
    }

    updateUI();
    showSkillSelection(); // 버튼 상태 갱신
}