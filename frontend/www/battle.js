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

        // 공격력 버프 턴 감소 및 적용
        let atkMultiplier = 1;
        if (player.buff.turns > 0) {
            atkMultiplier = player.buff.multiplier;
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

        // --- 무하한 능력자: 연속 타격 로직 ---
        if (player.characterClass === 'limitless') {
            let totalDmg = Math.floor(player.atk * atkMultiplier);

            if (isCrit) {
                playSound('crit');
                totalDmg = Math.floor(totalDmg * player.critDamage);
                log(`⚡ 치명타! ${charName}의 ${attackName}! ${targetMonster.name}에게 연속 공격을 가합니다!`, 'log-player');
            } else {
                log(`${charName}의 ${attackName}! ${targetMonster.name}에게 연속 공격을 가합니다.`, 'log-player');
            }

            const hitCount = 10;
            const baseDmgPerHit = Math.floor(totalDmg / hitCount);
            const remainder = totalDmg % hitCount;
            const damages = [];
            for (let i = 0; i < hitCount; i++) {
                let hitDmg = baseDmgPerHit;
                if (i < remainder) hitDmg++;
                damages.push(hitDmg);
            }
            for (let i = damages.length - 1; i > 0; i--) { // 데미지 순서 섞기
                const j = Math.floor(Math.random() * (i + 1));
                [damages[i], damages[j]] = [damages[j], damages[i]];
            }

            let totalDealtDmg = 0;
            const attackPromises = [];

            for (let i = 0; i < hitCount; i++) {
                const promise = new Promise(resolve => {
                    setTimeout(() => {
                        // 모든 몬스터가 죽었는지 확인
                        if (monsters.every(m => m.hp <= 0)) return resolve();

                        // 현재 타겟을 가져오고 상태를 확인합니다.
                        let currentTarget = monsters[player.targetIndex];
                        if (!currentTarget || currentTarget.hp <= 0) {
                            findNextTarget(); // 새로운 살아있는 타겟을 찾습니다.
                            currentTarget = monsters[player.targetIndex];
                            // 새 타겟을 찾은 후에도 여전히 죽어있다면 (예: 모두 죽음) 중단합니다.
                            if (!currentTarget || currentTarget.hp <= 0) return resolve();
                        }
                        
                        const currentTargetElement = document.querySelectorAll('#monster-area .monster-wrapper')[player.targetIndex];
                        const dmg = damages[i];
                        if (dmg <= 0) return resolve();

                        currentTarget.hp -= dmg;
                        totalDealtDmg += dmg;
                        showFloatingText(dmg, currentTargetElement, isCrit ? 'crit' : 'minion-damage');
                        
                        if (i === hitCount - 1) applyPoisonEffect(currentTarget);
                        
                        resolve();
                    }, i * 80);
                });
                attackPromises.push(promise);
            }

            Promise.all(attackPromises).then(() => {
                log(`${targetMonster.name}에게 총 ${totalDealtDmg}의 피해를 입혔습니다.`, 'log-player');
                if (targetMonsterElement) {
                    const emojiElement = targetMonsterElement.querySelector('.emoji');
                    emojiElement.classList.add('hit');
                    setTimeout(() => emojiElement.classList.remove('hit'), 300);
                }
                updateUI();
                const allDead = monsters.every(m => m.hp <= 0);
                if (allDead) {
                    if (targetMonster.hp <= 0) handleMonsterDeath(targetMonster);
                    winBattle();
                } else {
                    if (targetMonster.hp <= 0) {
                        handleMonsterDeath(targetMonster);
                        findNextTarget();
                    }
                    setTimeout(playerTurnEnd, 800);
                }
            });
            return; // 다른 캐릭터 로직 실행 방지
        } else {
            // --- 일반 공격 로직 (다른 캐릭터) ---
            let dmg = Math.floor(Math.random() * 5) + player.atk;
            dmg = Math.floor(dmg * atkMultiplier);

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
        }

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
        if (targetMonster.hp <= 0) handleMonsterDeath(targetMonster);
        winBattle();
    } else {
        // 현재 타겟 몬스터가 죽었는지 확인
        if (targetMonster.hp <= 0) {
            handleMonsterDeath(targetMonster);
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

                if (targetMonster.hp <= 0) handleMonsterDeath(targetMonster);
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
 * 몬스터가 죽었을 때 처리하는 함수 (경험치 획득, 전리품 드랍 등).
 * @param {object} monster - 죽은 몬스터 객체.
 * @param {string} [reason=''] - 사망 원인 (로그 출력용).
 */
function handleMonsterDeath(monster, reason = '') {
    if (!monster || monster.isDeathProcessed) return;
    monster.isDeathProcessed = true;

    const reasonText = reason ? `(${reason}) ` : '';
    playSound('monster-die');
    log(`${monster.name}을(를) ${reasonText}쓰러뜨렸다!`, 'log-player');
    gainXP(monster.xp);

    // Necromancer Domain Effect: Soul Explosion
    if (monster.soulPoison) {
        log(`💥 ${monster.name}이(가) 영혼 폭발을 일으킵니다!`, 'log-system');
        const monsterIndex = monsters.indexOf(monster);
        // Find up to 2 living adjacent targets
        const explosionTargets = [];
        if (monsters[monsterIndex - 1] && monsters[monsterIndex - 1].hp > 0) {
            explosionTargets.push(monsters[monsterIndex - 1]);
        }
        if (monsters[monsterIndex + 1] && monsters[monsterIndex + 1].hp > 0) {
            explosionTargets.push(monsters[monsterIndex + 1]);
        }

        if (explosionTargets.length > 0) {
            const explosionDmg = Math.floor(monster.atk * 1.4);
            explosionTargets.forEach(target => {
                const targetMonsterElement = document.querySelectorAll('#monster-area .monster-wrapper')[monsters.indexOf(target)];
                target.hp -= explosionDmg;
                log(`💥 ${target.name}이(가) 폭발에 휘말려 ${explosionDmg}의 피해를 입었습니다.`, 'log-monster');
                showFloatingText(explosionDmg, targetMonsterElement, 'damage');
                if (target.hp <= 0) {
                    // To prevent recursive explosions or complex chains, just mark as dead.
                    // The main loop will handle the win condition.
                    handleMonsterDeath(target, '영혼 폭발');
                }
            });
        }
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
            // Declare monsterIndex and monsterElement once at the beginning of the loop iteration
            const monsterIndex = monsters.findIndex(m => m === monster);
            const monsterElement = document.querySelectorAll('#monster-area .monster-wrapper')[monsterIndex];
            if (isGameOver) return;

            // --- 무량공처 지속 스턴 처리 ---
            if (monster.stunTurns > 0) {
                log(`🌌 ${monster.name}은(는) 무량공처의 여파로 움직일 수 없습니다! (남은 턴: ${monster.stunTurns})`, 'log-monster');
                monster.stunTurns--;
                if (i === livingMonsters.length - 1) {
                    endMonstersTurn();
                }
                return; // 이 몬스터의 턴은 종료
            }

            // --- 공격력 디버프 적용 ---
            let monsterAtk = monster.atk;
            if (monster.atkDebuff && monster.atkDebuff.turns > 0) {
                monsterAtk = Math.floor(monster.atk * monster.atkDebuff.multiplier);
            }

            // --- 화상(Burn) 데미지 처리 ---
            if (monster.burn && monster.burn.turns > 0) {
                const burnDamage = monster.burn.damage;
                monster.hp -= burnDamage;
                monster.burn.turns--;
                log(`🔥 ${monster.name}이(가) 화상으로 ${burnDamage}의 피해를 입었습니다. (남은 턴: ${monster.burn.turns})`, 'log-monster');
                if(monsterElement) showFloatingText(burnDamage, monsterElement, 'burn');

                if (monster.hp <= 0) {
                    handleMonsterDeath(monster, '화상 피해');
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
                    handleMonsterDeath(monster, '중독 피해');
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
                let chargeDmg = Math.floor(monsterAtk * skill.power);
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
                    if (monster.hp <= 0) {
                        handleMonsterDeath(monster, '반사 피해');
                        updateUI();
                        const allDead = monsters.every(m => m.hp <= 0);
                        if (allDead) {
                            winBattle();
                            return;
                        }
                    }
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
                            let stunDmg = Math.floor(monsterAtk * 1.2); // 스킬은 약간 더 강하게
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
                                if (monster.hp <= 0) {
                                    handleMonsterDeath(monster, '반사 피해');
                                    updateUI();
                                    const allDead = monsters.every(m => m.hp <= 0);
                                    if (allDead) {
                                        winBattle();
                                        return;
                                    }
                                }
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
                            let drainDmg = monsterAtk;
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
                                if (monster.hp <= 0) {
                                    handleMonsterDeath(monster, '반사 피해');
                                    updateUI();
                                    const allDead = monsters.every(m => m.hp <= 0);
                                    if (allDead) {
                                        winBattle();
                                        return;
                                    }
                                }
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
                    let dmg = Math.floor(Math.random() * 3) + monsterAtk;
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
                            if (monster.hp <= 0) {
                                handleMonsterDeath(monster, '반사 피해');
                                updateUI();
                                const allDead = monsters.every(m => m.hp <= 0);
                                if (allDead) {
                                    winBattle();
                                    return;
                                }
                            }
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
 * 턴 종료 시 활성화된 영역의 효과를 적용합니다.
 * (현재는 기능이 없으며, 향후 확장을 위한 틀입니다.)
 */
async function applyDomainEffects() {
    if (!player.domainActive) return;

    const livingMonsters = monsters.filter(m => m.hp > 0);
    if (livingMonsters.length === 0) return;

    const randomMonster = livingMonsters[Math.floor(Math.random() * livingMonsters.length)];
    const monsterElement = document.querySelectorAll('#monster-area .monster-wrapper')[monsters.indexOf(randomMonster)];

    switch (player.characterClass) {
        case 'hero':
        case 'wizard':
            // Passive effects (Stat boost / MP cost reduction) are handled by recalculatePlayerStats.
            break;
        case 'rogue':
            log(`🌙 [환영의 장막]이 꿈틀거립니다...`, 'log-system');
            await new Promise(r => setTimeout(r, 500)); // 효과 발동 전 잠시 대기

            if (Math.random() < 0.6) { // 60% 독 부여
                const poisonDamage = Math.floor((player.agi + player.mag) * 0.5 + 5);
                randomMonster.poison = { turns: 3, damage: poisonDamage };
                log(`🌙 ${randomMonster.name}에게 독을 부여합니다.`, 'log-system');
                await showEffectAnimation('poison-orb', monsterElement);
                if (monsterElement) showFloatingText('POISON', monsterElement, 'poison-buff');
            } else { // 40% 그림자 습격
                const dmg = Math.floor(player.atk * 1.5 + player.magicDamageBonus);
                log(`🌙 ${randomMonster.name}에게 그림자 습격을 가합니다!`, 'log-system');
                await showEffectAnimation('shadow-dash', monsterElement);
                if (monsterElement) showFloatingText(dmg, monsterElement, 'damage');
                randomMonster.hp -= dmg;
                if (randomMonster.hp <= 0) {
                    handleMonsterDeath(randomMonster, '환영의 장막');
                }
            }
            break;
        case 'paladin':
            log(`🌟 [천벌의 성역]에서 신성한 벼락이 내리칩니다!`, 'log-system');
            await new Promise(r => setTimeout(r, 500)); // 효과 발동 전 잠시 대기
            await showEffectAnimation('holy-lightning', monsterElement);

            // Note: monster.holyShocked property should be reset when new monsters are generated.
            if (!randomMonster.holyShocked) {
                randomMonster.holyShocked = true;
                const oldAtk = randomMonster.atk;
                randomMonster.atk = Math.floor(randomMonster.atk * 0.65); // 35% 감소
                log(`⚡ ${randomMonster.name}의 공격력이 ${oldAtk}에서 ${randomMonster.atk}로 감소했습니다!`, 'log-monster');
                if (monsterElement) showFloatingText('ATK Down', monsterElement, 'debuff');
            } else {
                const dmg = player.atk * 2;
                randomMonster.hp -= dmg;
                log(`⚡ ${randomMonster.name}에게 ${dmg}의 추가 피해를 입혔습니다!`, 'log-monster');
                if (monsterElement) showFloatingText(dmg, monsterElement, 'crit');
                if (randomMonster.hp <= 0) {
                    handleMonsterDeath(randomMonster, '천벌의 성역');
                }
            }
            break;
        case 'necromancer':
            log(`💥 [사혼의 연회] 효과로 ${randomMonster.name}에게 영혼의 독을 부여합니다.`, 'log-system');
            await showEffectAnimation('soul-skull', monsterElement);

            const dmg = Math.floor(player.atk * 2.3);
            randomMonster.hp -= dmg;
            randomMonster.soulPoison = true; // Flag for explosion on death
            if (monsterElement) {
                showFloatingText(dmg, monsterElement, 'damage');
                showFloatingText('영혼독', monsterElement, 'poison-buff');
            }

            if (randomMonster.hp <= 0) {
                handleMonsterDeath(randomMonster, '사혼의 연회');
            }
            break;
        case 'gambler':
            const spinAndAnimate = async () => {
                // Helper function to generate roulette numbers
                const generateRouletteNumbers = (isJackpot, jackpotType = null) => {
                    if (isJackpot) {
                        switch (jackpotType) {
                            case 'str': return ['4', '4', '4'];
                            case 'crit': return ['6', '6', '6'];
                            case 'invincible': return ['7', '7', '7'];
                            default: return ['7', '7', '7'];
                        }
                    } else {
                        // For non-jackpots, generate a "pair" and a random third number.
                        const n1 = Math.floor(Math.random() * 8).toString();
                        let n2;
                        do {
                            n2 = Math.floor(Math.random() * 8).toString();
                        } while (n1 === n2); // Ensure the third number is different
                        const result = [n1, n1, n2];
                        // Shuffle the array to make the position of the single number random
                        for (let i = result.length - 1; i > 0; i--) {
                            const j = Math.floor(Math.random() * (i + 1));
                            [result[i], result[j]] = [result[j], result[i]];
                        }
                        return result;
                    }
                };

                const roll = Math.random() * 100;
                let outcomeText = '';
                let jackpot = null;
                let finalNumbers = [];

                if (roll < 40) { // 40%
                    finalNumbers = generateRouletteNumbers(false);
                    outcomeText = '힘 1.2배 (5턴)';
                } else if (roll < 70) { // 30%
                    finalNumbers = generateRouletteNumbers(false);
                    outcomeText = '힘 1.5배 (5턴)';
                } else if (roll < 90) { // 20%
                    finalNumbers = generateRouletteNumbers(false);
                    outcomeText = '치명타 +30% (5턴)';
                } else { // 10%
                    const jackpotRoll = Math.random() * 100;
                    if (jackpotRoll < 50) { jackpot = 'str'; outcomeText = '잭팟! 4️⃣4️⃣4️⃣ 힘 2배 (4턴)'; } 
                    else if (jackpotRoll < 85) { jackpot = 'crit'; outcomeText = '잭팟! 6️⃣6️⃣6️⃣ 치명타 +60% (4턴)'; } 
                    else { jackpot = 'invincible'; outcomeText = '잭팟! 7️⃣7️⃣7️⃣ 5턴간 무적'; }
                    finalNumbers = generateRouletteNumbers(true, jackpot);
                }

                await showGamblerRouletteAnimation(finalNumbers);

                if (roll < 40) { player.strBuff = { multiplier: 1.2, turns: 5 }; } 
                else if (roll < 70) { player.strBuff = { multiplier: 1.5, turns: 5 }; } 
                else if (roll < 90) { player.critBuff = { bonus: 30, turns: 5 }; } 
                else {
                    if (jackpot === 'str') { player.strBuff = { multiplier: 2, turns: 4 }; } 
                    else if (jackpot === 'crit') { player.critBuff = { bonus: 60, turns: 4 }; } 
                    else { player.invincibleBuff = { active: true, turns: 5 }; }
                }

                log(`🎲 [운명의 무대] 룰렛 결과: ${outcomeText}`, 'log-system');
                recalculatePlayerStats();
                return jackpot;
            };

            log(`🃏 [운명의 무대] 효과로 룰렛을 2회 돌립니다!`, 'log-system');
            for (let i = 0; i < 2; i++) {
                if (player.domainActive) { // 잭팟으로 영역이 해제되었는지 확인
                    const jackpot = await spinAndAnimate();
                    if (jackpot) {
                        let jackpotText = '';
                        switch(jackpot) {
                            case 'str':
                                player.strBuff = { multiplier: 2 * 1.2, turns: 4 };
                                jackpotText = '힘 2.4배 (4턴)';
                                break;
                            case 'crit':
                                player.critBuff = { bonus: 60 * 1.2, turns: 4 };
                                jackpotText = '치명타 +72% (4턴)';
                                break;
                            case 'invincible':
                                player.invincibleBuff = { active: true, turns: Math.floor(5 * 1.2) };
                                jackpotText = '6턴간 무적';
                                break;
                        }
                        log(`🃏 강화된 잭팟! ${jackpotText}! 영역이 해제됩니다.`, 'log-system');
                        deactivateDomain();
                        recalculatePlayerStats();
                    }
                }
            }
            break;
        case 'limitless':
            log(`🌌 [무량공처]의 무한한 정보가 모든 적을 속박합니다!`, 'log-system');
            await new Promise(r => setTimeout(r, 500));

            livingMonsters.forEach((monster) => {
                monster.isStunned = true; // 1턴간 확정 기절
                const monsterEl = document.querySelectorAll('#monster-area .monster-wrapper')[monsters.indexOf(monster)];
                log(`🌌 ${monster.name}이(가) 정보 과부하로 멈췄습니다!`, 'log-system');
                if (monsterEl) showFloatingText('STUN', monsterEl, 'stun');
            });
            break;
        case 'curseKing':
            log('⛓️ [복마어주자]의 술식이 전개됩니다!', 'log-system');
            await new Promise(r => setTimeout(r, 500));

            const attackPromises = livingMonsters.map((monster, index) => {
                return new Promise(resolve => {
                    setTimeout(() => {
                        if (monster.hp > 0) {
                            let dmg = 0;
                            let skillName = '';
                            const monsterEl = document.querySelectorAll('#monster-area .monster-wrapper')[monsters.indexOf(monster)];
                            if (monster.hp >= 200) {
                                dmg = Math.floor(player.atk * 2.75 + player.magicDamageBonus);
                                skillName = '팔';
                            } else {
                                dmg = Math.floor(player.atk * 2.0 + player.magicDamageBonus);
                                skillName = '해';
                            }
                            monster.hp -= dmg;
                            log(`⛓️ [복마어주자]가 ${monster.name}에게 ${skillName}을(를) 사용하여 ${dmg}의 피해를 입혔습니다.`, 'log-monster');
                            if (monsterEl) showFloatingText(dmg, monsterEl, 'damage');
                            if (monster.hp <= 0) handleMonsterDeath(monster, '복마어주자');
                        }
                        resolve();
                    }, index * 100);
                });
            });
            await Promise.all(attackPromises);
            break;
    }
}

/**
 * 몬스터 턴 종료 후 플레이어 턴으로 전환하거나 게임오버를 처리합니다.
 */
async function endMonstersTurn() {
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
                player.smokeBombBuff.active = false;
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

        // 몬스터 디버프 턴 감소
        monsters.forEach(monster => {
            if (monster.hp > 0) {
                if (monster.atkDebuff && monster.atkDebuff.turns > 0) {
                    monster.atkDebuff.turns--;
                    if (monster.atkDebuff.turns === 0) {
                        log(`🌀 ${monster.name}의 공격력이 원래대로 돌아옵니다.`, 'log-monster');
                    }
                }
            }
        });

        // 턴 종료 시 영역 유지비 소모
        if (player.domainActive) {
            const maintenanceCost = 10;
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