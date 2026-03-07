//! =================================================================
//! ui.js
//!
//! 이 파일은 게임의 UI 렌더링 및 조작과 관련된 모든 함수를 정의합니다.
//! - 정보 출력 (로그, 데미지 텍스트)
//! - UI 상태 업데이트 (체력바, 버프 아이콘 등)
//! - 모달 창 관리 (상점, 인벤토리, 로그인 등)
//! =================================================================

/**
 * 로그 창에 메시지를 출력하고 자동으로 스크롤합니다.
 * @param {string} msg - 출력할 메시지 내용.
 * @param {string} [type=''] - 메시지 종류에 따른 CSS 클래스 ('log-player', 'log-monster', 'log-system').
 * @param {object} [styles={}] - 적용할 추가 인라인 CSS 스타일.
 */
function log(msg, type = '', styles = {}) {
    const box = document.getElementById('log-box');
    const p = document.createElement('div');
    p.className = `log-msg ${type}`;
    p.innerText = msg;
    Object.assign(p.style, styles);
    box.appendChild(p);
    box.scrollTop = box.scrollHeight; // 자동 스크롤
}

/**
 * 도박꾼 영역 전개 시 룰렛 애니메이션을 표시합니다.
 * @param {Array<string>} finalNumbers - 최종적으로 표시될 3개의 숫자 배열.
 * @returns {Promise<void>} - 애니메이션 완료 시 resolve되는 Promise
 */
function showGamblerRouletteAnimation(finalNumbers) {
    return new Promise(resolve => {
        const playerElement = document.getElementById('player-character');
        if (!playerElement) {
            resolve();
            return;
        }

        const battleField = document.getElementById('battle-field');
        let rouletteContainer = document.querySelector('.gambler-roulette-container');
        if (rouletteContainer) rouletteContainer.remove(); // 이전 애니메이션이 있으면 제거

        rouletteContainer = document.createElement('div');
        rouletteContainer.className = 'gambler-roulette-container';
        
        for (let i = 0; i < 3; i++) {
            const slot = document.createElement('div');
            slot.className = 'roulette-slot';
            slot.innerText = '7';
            rouletteContainer.appendChild(slot);
        }

        battleField.appendChild(rouletteContainer);

        const playerRect = playerElement.getBoundingClientRect();
        const battleFieldRect = battleField.getBoundingClientRect();
        rouletteContainer.style.position = 'absolute';
        rouletteContainer.style.left = `${playerRect.left - battleFieldRect.left + playerRect.width / 2 - 60}px`;
        rouletteContainer.style.top = `${playerRect.top - battleFieldRect.top - 50}px`;
        rouletteContainer.style.display = 'flex';
        rouletteContainer.style.gap = '5px';
        rouletteContainer.style.zIndex = '20';

        const slots = rouletteContainer.querySelectorAll('.roulette-slot');
        slots.forEach(slot => {
            Object.assign(slot.style, {
                width: '30px', height: '40px', border: '2px solid gold',
                backgroundColor: 'black', color: 'white', display: 'flex',
                justifyContent: 'center', alignItems: 'center', fontSize: '24px',
                fontWeight: 'bold', textShadow: '0 0 5px yellow', borderRadius: '4px'
            });
        });

        const spinDuration = 1000;
        const intervalTime = 50;
        let elapsed = 0;

        const spinInterval = setInterval(() => {
            elapsed += intervalTime;
            slots.forEach((slot, index) => {
                if (elapsed < spinDuration * ((index + 1) / 3.5)) {
                    slot.innerText = Math.floor(Math.random() * 8);
                } else {
                    slot.innerText = finalNumbers[index];
                }
            });

            if (elapsed >= spinDuration) {
                clearInterval(spinInterval);
                setTimeout(() => {
                    rouletteContainer.remove();
                    resolve();
                }, 800);
            }
        }, intervalTime);
    });
}

/**
 * 플레이어로부터 몬스터에게 날아가는 효과 애니메이션을 표시합니다.
 * @param {'poison-orb' | 'shadow-dash' | 'holy-lightning' | 'soul-skull'} effectType - 효과 종류
 * @param {HTMLElement} targetMonsterElement - 대상 몬스터 요소
 * @returns {Promise<void>} - 애니메이션 완료 시 resolve되는 Promise
 */
function showEffectAnimation(effectType, targetMonsterElement) {
    return new Promise(resolve => {
        const playerElement = document.getElementById('player-character');
        if (!playerElement || !targetMonsterElement) {
            resolve();
            return;
        }

        const battleField = document.getElementById('battle-field');
        const effectEl = document.createElement('div');
        Object.assign(effectEl.style, { position: 'absolute', transition: 'all 0.5s ease-out', zIndex: '20' });

        const targetRect = targetMonsterElement.getBoundingClientRect();
        const battleFieldRect = battleField.getBoundingClientRect();

        switch (effectType) {
            case 'poison-orb':
                effectEl.innerText = '☠️';
                effectEl.style.fontSize = '24px';
                effectEl.style.textShadow = '0 0 10px #86efac';
                break;
            case 'shadow-dash':
                const playerEmoji = document.getElementById('player-emoji');
                const originalTransform = playerEmoji.style.transform;
                const playerRect = playerElement.getBoundingClientRect();
                const dx = targetRect.left - playerRect.left - 20;
                const dy = targetRect.top - playerRect.top;
                
                playerEmoji.style.transition = 'transform 0.2s ease-in-out';
                playerEmoji.style.transform = `translate(${dx}px, ${dy}px) scale(1.2)`;
                
                setTimeout(() => {
                    playerEmoji.style.transform = originalTransform;
                    setTimeout(resolve, 200);
                }, 200);
                return;
            case 'holy-lightning':
                effectEl.innerText = '⚡';
                Object.assign(effectEl.style, { fontSize: '48px', color: 'yellow', textShadow: '0 0 15px white', transition: 'opacity 0.3s, transform 0.3s' });
                break;
            case 'soul-skull':
                effectEl.innerText = '💀';
                Object.assign(effectEl.style, { fontSize: '32px', color: '#a78bfa', textShadow: '0 0 10px #c4b5fd' });
                break;
        }

        battleField.appendChild(effectEl);

        if (effectType === 'holy-lightning') {
            const startX = targetRect.left - battleFieldRect.left + (targetRect.width / 2) - 15;
            const startY = targetRect.top - battleFieldRect.top - 60;
            Object.assign(effectEl.style, { left: `${startX}px`, top: `${startY}px`, opacity: '0', transform: 'scale(0.5)' });

            setTimeout(() => {
                Object.assign(effectEl.style, { opacity: '1', transform: 'scale(1)' });
                playSound('crit');
            }, 50);
            setTimeout(() => {
                effectEl.remove();
                resolve();
            }, 400);
        } else {
            const playerRect = playerElement.getBoundingClientRect();
            const startX = playerRect.left - battleFieldRect.left + (playerRect.width / 2);
            const startY = playerRect.top - battleFieldRect.top + 20;
            const endX = targetRect.left - battleFieldRect.left + (targetRect.width / 2);
            const endY = targetRect.top - battleFieldRect.top + 20;

            effectEl.style.left = `${startX}px`;
            effectEl.style.top = `${startY}px`;

            setTimeout(() => {
                Object.assign(effectEl.style, { left: `${endX}px`, top: `${endY}px`, transform: 'scale(0.5)', opacity: '0' });
            }, 50);

            setTimeout(() => {
                effectEl.remove();
                resolve();
            }, 550);
        }
    });
}

/**
 * 캐릭터 위에 떠오르는 텍스트(데미지, MISS 등)를 표시합니다.
 * @param {string|number} text - 표시할 텍스트.
 * @param {HTMLElement} targetElement - 텍스트가 표시될 대상 캐릭터의 DOM 요소.
 * @param {string} type - 텍스트 종류에 따른 CSS 클래스 ('damage', 'crit', 'miss', 'heal' 등).
 */
function showFloatingText(text, targetElement, type) {
    if (!targetElement) return;

    const textEl = document.createElement('div');
    textEl.className = `floating-text ${type}`;
    textEl.innerText = text;

    // 전투 필드를 기준으로 위치를 잡음
    const battleField = document.getElementById('battle-field');
    battleField.appendChild(textEl);

    const targetRect = targetElement.getBoundingClientRect();
    const battleFieldRect = battleField.getBoundingClientRect();

    // 텍스트 위치 계산 (캐릭터 중앙 상단에서 약간 랜덤)
    const x = targetRect.left - battleFieldRect.left + (targetRect.width / 2) - (textEl.offsetWidth / 2) + (Math.random() * 20 - 10);
    const y = targetRect.top - battleFieldRect.top - 30 + (Math.random() * 10 - 5);

    textEl.style.left = `${x}px`;
    textEl.style.top = `${y}px`;

    // 애니메이션이 끝난 후 요소 제거
    setTimeout(() => textEl.remove(), 1200); // 애니메이션 시간과 동일하게 설정
}

/**
 * 게임의 모든 UI를 현재 게임 상태(`player`, `monsters` 등)에 맞게 업데이트하는 메인 함수.
 */
function updateUI() {
    // 플레이어 정보 UI 업데이트 (체력, 골드, 이모지 등)
    document.getElementById('player-hp').innerText = player.hp;
    document.getElementById('player-max-hp').innerText = player.maxHp;
    document.getElementById('player-coins').innerText = player.coins;
    document.getElementById('player-emoji').innerText = player.emoji;
    document.getElementById('player-hp-bar').style.width = (player.hp / player.maxHp * 100) + '%';

    // 쉴드 UI 업데이트 로직 제거

    // 경험치 바 UI 업데이트
    document.getElementById('player-level').innerText = player.level;
    document.getElementById('player-xp').innerText = player.xp;
    document.getElementById('player-xp-next').innerText = player.xpToNextLevel;
    document.getElementById('player-xp-bar').style.width = (player.xp / player.xpToNextLevel * 100) + '%';

    // MP 바 UI 업데이트
    document.getElementById('player-mp').innerText = player.mp;
    document.getElementById('player-max-mp').innerText = player.maxMp;
    document.getElementById('player-mp-bar').style.width = (player.mp / player.maxMp * 100) + '%';

    // 버프 상태 UI 업데이트 (공격력, 치명타, 흑섬)
    if (player.buff.turns > 0) {
        document.getElementById('buff-badge').style.display = 'inline-block';
        document.getElementById('buff-turns').innerText = player.buff.turns;
    } else {
        document.getElementById('buff-badge').style.display = 'none';
    }

    if (player.critBuff.turns > 0) {
        document.getElementById('crit-buff-badge').style.display = 'inline-block';
        document.getElementById('crit-buff-turns').innerText = player.critBuff.turns;
    } else {
        document.getElementById('crit-buff-badge').style.display = 'none';
    }

    if (player.blackFlashBuff.active) {
        document.getElementById('black-flash-badge').style.display = 'inline-block';
        document.getElementById('black-flash-turns').innerText = player.blackFlashBuff.duration;
    } else {
        document.getElementById('black-flash-badge').style.display = 'none';
    }

    // 스킬 봉인 배지 UI 업데이트
    const skillLockBadge = document.getElementById('skill-lock-badge');
    if (skillLockBadge) {
        if (player.skillLockTurns > 0) {
            skillLockBadge.style.display = 'inline-block';
            document.getElementById('skill-lock-turns').innerText = player.skillLockTurns;
        } else {
            skillLockBadge.style.display = 'none';
        }
    }

    // 성기사 신성한 방패 버프 UI 업데이트
    if (player.divineShieldBuff.active) {
        document.getElementById('divine-shield-badge').style.display = 'inline-block';
        document.getElementById('divine-shield-turns').innerText = player.divineShieldBuff.turns;
    } else {
        document.getElementById('divine-shield-badge').style.display = 'none';
    }

    // 가호(전리품) 버프 상태 UI 업데이트
    const blessingBadge = document.getElementById('blessing-badge');
    if (blessingBadge) { // 요소가 존재하는지 확인하는 방어 코드 추가
        if (player.lootInventory.length > 0) {
            blessingBadge.style.display = 'inline-block';
            const blessingNames = player.lootInventory.map(loot => loot.name).join('\n');
            blessingBadge.title = `보유 중인 가호:\n${blessingNames}`;
        } else {
            blessingBadge.style.display = 'none';
        }
    }

    // 몬스터 UI 동적 생성 및 업데이트
    const monsterArea = document.getElementById('monster-area');
    monsterArea.innerHTML = '';
    monsters.forEach((monster, index) => {
        const isTargeted = index === player.targetIndex;
        const isDead = monster.hp <= 0;
        const isStunned = monster.isStunned;
        const isPoisoned = monster.poison && monster.poison.turns > 0;
        const isBurned = monster.burn && monster.burn.turns > 0;

        const monsterWrapper = document.createElement('div');
        monsterWrapper.className = 'monster-wrapper';
        if (isTargeted) monsterWrapper.classList.add('targeted');
        if (isDead) monsterWrapper.classList.add('dead');

        // 몬스터 클릭 시 타겟으로 지정하는 이벤트 추가
        monsterWrapper.setAttribute('onclick', `selectTarget(${index})`);

        monsterWrapper.innerHTML = `
            <div class="stun-indicator ${isStunned ? 'visible' : ''}">💫</div>
            <div class="burn-indicator ${isBurned ? 'visible' : ''}">🔥</div>
            <div class="poison-indicator ${isPoisoned ? 'visible' : ''}">☠️</div>
            <div class="target-indicator">🔻</div>
            <div class="character">
                <div class="emoji">${isDead ? '💀' : monster.emoji}</div>
                <div class="name">${monster.name}</div>
                <div class="hp-bar-bg">
                    <div class="hp-bar-fill" style="width: ${Math.max(0, monster.hp) / monster.maxHp * 100}%"></div>
                </div>
                <div class="hp-text">${Math.max(0, monster.hp)} / ${monster.maxHp}</div>
            </div>
        `;
        monsterArea.appendChild(monsterWrapper);
    });

    // 네크로맨서 소환수 UI 동적 생성 및 업데이트
    const minionArea = document.getElementById('minion-area');
    if (minionArea) {
        minionArea.innerHTML = '';
        if (player.minions && player.minions.length > 0) {
            player.minions.forEach(minion => {
                const minionWrapper = document.createElement('div');
                minionWrapper.className = 'minion-wrapper'; // CSS 스타일링을 위한 클래스
                minionWrapper.innerHTML = `
                    <div class="character">
                        <div class="emoji">${minion.emoji}</div>
                        <div class="name" style="font-size: 12px;">${minion.name}</div>
                        <div class="hp-bar-bg">
                            <div class="hp-bar-fill" style="width: ${Math.max(0, minion.hp) / minion.maxHp * 100}%"></div>
                        </div>
                        <div class="hp-text" style="font-size: 11px;">${Math.max(0, minion.hp)} / ${minion.maxHp}</div>
                    </div>
                `;
                minionArea.appendChild(minionWrapper);
            });
        }
    }
    // 현재 층, 턴 정보 업데이트
    document.getElementById('floor-num').innerText = floor;
    document.getElementById('turn-num').innerText = turn;
}

/**
 * 메인 컨트롤 UI를 스킬 선택 버튼들로 교체하여 보여줍니다.
 * - 각 스킬의 예상 데미지를 동적으로 계산하여 표시합니다.
 */
function showSkillSelection() {
    playSound('click');
    // 플레이어 턴이 아니거나 게임오버 상태면 실행하지 않음
    if (isGameOver || !isPlayerTurn) return;
    const controlsPanel = document.getElementById('controls-panel');
    controlsPanel.classList.add('skill-view');
    const defenseBtnClass = player.defenseStance ? 'btn-defend-active' : 'btn-defend';

    // 캐릭터별 일반 공격 이름 가져오기
    const charData = characterData[player.characterClass] || characterData.hero;
    const normalAttackName = charData.attackName || '일반 공격';

    // 모든 버튼의 높이를 통일하기 위해 내용 없는 설명 줄 추가
    const emptyDesc = `<br><span class="skill-desc">&nbsp;</span>`;

    if (player.characterClass === 'wizard') {
        // 마법사 스킬 데미지 계산
        const manaBlasterDmg = Math.floor(player.atk * 1.5 + player.magicDamageBonus);
        const fireballDmg = Math.floor(player.atk * 2.0 + player.magicDamageBonus); // MP 20으로 수정
        const beamDmg = Math.floor(player.atk * 2.5 + player.magicDamageBonus);
        const iceWallBtnStyle = `background-color: ${player.iceWall.active ? '#60a5fa' : '#3b82f6'};`;
        const domain = domainData.wizard;

        const domainButtonHtml = player.domainActive
            ? `<button class="btn-defend-active" onclick="deactivateDomain()">🌀 영역 해제<br><span class="skill-desc">(MP 0 / 턴 미소모)</span></button>`
            : (floor < player.domainCooldownUntilFloor
                ? `<button class="btn-attack" disabled style="background: linear-gradient(45deg, #555, #333);">
                       ☄️ 영역 재사용 대기<br><span class="skill-desc">(${player.domainCooldownUntilFloor}층부터 사용 가능)</span>
                   </button>`
                : `<button class="btn-attack" style="background: linear-gradient(45deg, #8b5cf6, #c4b5fd);" onclick="activateDomain('wizard')">
                    ☄️ 영역 전개: ${domain.name}<br><span class="skill-desc">(MP ${domain.mpCost} / 턴 미소모)</span>
                   </button>`);

        controlsPanel.innerHTML = `
            <button class="btn-attack" onclick="executeNormalAttack()">⚔️ ${normalAttackName}<br><span class="skill-desc">(피해량: ${player.atk})</span></button>
            <button class="btn-attack" style="background-color: #3b82f6;" onclick="executeManaBlaster()">💧 마나 블래스터<br><span class="skill-desc">(MP 10 / 피해량: ${manaBlasterDmg})</span></button>
            <button class="btn-attack" style="background-color: #dc2626;" onclick="executeFireball()">🔥 파이어볼<br><span class="skill-desc">(MP 15 / 피해량: ${fireballDmg})</span></button>
            <button class="btn-attack" style="background-color: #f59e0b;" onclick="executeElectronicBeam()">⚡ 일렉트로닉 빔<br><span class="skill-desc">(MP 25 / 피해량: ${beamDmg} / 연쇄,기절)</span></button>
            <button class="btn-defend" style="${iceWallBtnStyle}" onclick="executeIceWall()">❄️ 아이스 월<br><span class="skill-desc">(MP 20 / 턴 미소모)</span></button>
            ${domainButtonHtml}
            <button class="btn-inventory btn-back" onclick="showMainControls()" style="grid-column: 1 / -1;">↩️ 뒤로가기${emptyDesc}</button>
        `;
    } else if (player.characterClass === 'rogue') {
        // 도적 스킬 UI
        const poisonBuffActive = player.poisonBuff && player.poisonBuff.turns > 0;
        // 독 바르기 버프가 활성화 상태면 버튼 색을 진하게 변경
        const applyPoisonBtnStyle = poisonBuffActive ? 'background-color: #581c87;' : 'background-color: #8b5cf6;';
        const vitalStrikeDmg = Math.floor(player.atk * 1.2 + player.magicDamageBonus);
        const shadowRaidDmg = Math.floor(player.atk * 1.5 + player.magicDamageBonus);
        const smokeBombBtnStyle = `background-color: ${player.smokeBombBuff.active ? '#6b7280' : '#4b5563'};`;
        const domain = domainData.rogue;

        const domainButtonHtml = player.domainActive
            ? `<button class="btn-defend-active" onclick="deactivateDomain()">🌀 영역 해제<br><span class="skill-desc">(MP 0 / 턴 미소모)</span></button>`
            : (floor < player.domainCooldownUntilFloor
                ? `<button class="btn-attack" disabled style="background: linear-gradient(45deg, #555, #333);">
                       🌙 영역 재사용 대기<br><span class="skill-desc">(${player.domainCooldownUntilFloor}층부터 사용 가능)</span>
                   </button>`
                : `<button class="btn-attack" style="background: linear-gradient(45deg, #4c1d95, #1e293b);" onclick="activateDomain('rogue')">
                       🌙 영역 전개: ${domain.name}<br><span class="skill-desc">(MP ${domain.mpCost} / 턴 미소모)</span>
                   </button>`);

        controlsPanel.innerHTML = `
            <button class="btn-attack" onclick="executeNormalAttack()">⚔️ ${normalAttackName}<br><span class="skill-desc">(피해량: ${player.atk})</span></button>
            <button class="btn-buff" style="${applyPoisonBtnStyle}" onclick="executeApplyPoison()">☠️ 독 바르기<br><span class="skill-desc">(MP 15 / 5턴 지속)</span></button>
            <button class="btn-attack" style="background-color: #be123c;" onclick="executeVitalStrike()">🩸 급소 찌르기<br><span class="skill-desc">(MP 20 / 피해량: ${vitalStrikeDmg}+)</span></button>
            <button class="btn-defend" style="${smokeBombBtnStyle}" onclick="executeSmokeBomb()">🌫️ 연막탄<br><span class="skill-desc">(MP 15 / 턴 미소모)</span></button>
            <button class="btn-attack" style="background-color: #1f2937;" onclick="executeShadowRaid()">🔪 그림자 습격<br><span class="skill-desc">(MP 25 / 피해량: ${shadowRaidDmg})</span></button>
            ${domainButtonHtml}
            <button class="btn-inventory btn-back" onclick="showMainControls()" style="grid-column: 1 / -1;">↩️ 뒤로가기${emptyDesc}</button>
        `;
    } else if (player.characterClass === 'paladin') {
        // 성기사 스킬 UI
        const judgmentDesc = '적 현재 체력 30%';
        const earthShatterDmg = Math.floor(player.atk * 2.0 + player.magicDamageBonus);
        const divineShieldBtnStyle = `background-color: ${player.divineShieldBuff.active ? '#facc15' : '#eab308'};`;
        const blessingBtnStyle = `background-color: ${player.blessingBuff.active ? '#4ade80' : '#22c55e'};`;
        const domain = domainData.paladin;

        const domainButtonHtml = player.domainActive
            ? `<button class="btn-defend-active" onclick="deactivateDomain()">🌀 영역 해제<br><span class="skill-desc">(MP 0 / 턴 미소모)</span></button>`
            : (floor < player.domainCooldownUntilFloor
                ? `<button class="btn-attack" disabled style="background: linear-gradient(45deg, #555, #333);">
                       🌟 영역 재사용 대기<br><span class="skill-desc">(${player.domainCooldownUntilFloor}층부터 사용 가능)</span>
                   </button>`
                : `<button class="btn-attack" style="background: linear-gradient(45deg, #facc15, #fef08a); color: #422006;" onclick="activateDomain('paladin')">
                       🌟 영역 전개: ${domain.name}<br><span class="skill-desc">(MP ${domain.mpCost} / 턴 미소모)</span>
                   </button>`);

        controlsPanel.innerHTML = `
            <button class="btn-attack" onclick="executeNormalAttack()">⚔️ ${normalAttackName}<br><span class="skill-desc">(피해량: ${player.atk})</span></button>
            <button class="btn-defend" style="${divineShieldBtnStyle}" onclick="executeDivineShield()">🛡️ 신성한 방패<br><span class="skill-desc">(MP 15 / 1턴간 피해 반사&감소)</span></button>
            <button class="btn-attack" style="background-color: #f59e0b;" onclick="executeJudgment()">⚖️ 심판<br><span class="skill-desc">(MP 25 / 피해량: ${judgmentDesc})</span></button>
            <button class="btn-attack" style="background-color: #a16207;" onclick="executeEarthShatteringSwordAura()">💥 대지를 가르는 검기<br><span class="skill-desc">(MP 30 / 피해량: ${earthShatterDmg})</span></button>
            <button class="btn-heal" style="${blessingBtnStyle}" onclick="executeBlessing()">✨ 축복<br><span class="skill-desc">(MP 20 / 턴 미소모)</span></button>
            ${domainButtonHtml}
            <button class="btn-inventory btn-back" onclick="showMainControls()" style="grid-column: 1 / -1;">↩️ 뒤로가기${emptyDesc}</button>
        `;
    } else if (player.characterClass === 'gambler') {
        // 도박꾼 스킬 UI
        const luckyPunchDmg = Math.floor(player.atk * 1.8 + player.magicDamageBonus);
        const machineThrowDmg = Math.floor(player.atk * 1.4 + player.magicDamageBonus);
        const domain = domainData.gambler;

        const domainButtonHtml = player.domainActive
            ? `<button class="btn-defend-active" onclick="deactivateDomain()">🌀 영역 해제<br><span class="skill-desc">(MP 0 / 턴 미소모)</span></button>`
            : (floor < player.domainCooldownUntilFloor
                ? `<button class="btn-attack" disabled style="background: linear-gradient(45deg, #555, #333);">
                       🃏 영역 재사용 대기<br><span class="skill-desc">(${player.domainCooldownUntilFloor}층부터 사용 가능)</span>
                   </button>`
                : `<button class="btn-attack" style="background: linear-gradient(45deg, #be123c, #fda4af);" onclick="activateDomain('gambler')">
                       🃏 영역 전개: ${domain.name}<br><span class="skill-desc">(MP ${domain.mpCost} / 턴 미소모)</span>
                   </button>`);

        controlsPanel.innerHTML = `
            <button class="btn-attack" onclick="executeNormalAttack()">⚔️ ${normalAttackName}<br><span class="skill-desc">(피해량: ${player.atk})</span></button>
            <button class="btn-attack" style="background-color: #c12828;" onclick="executeLuckyPunch()">🎲 럭키 펀치<br><span class="skill-desc">(MP 15 / 피해량: ${luckyPunchDmg})</span></button>
            <button class="btn-attack" style="background-color: #9a2020;" onclick="executeThrowPunchingMachine()">🎰 펀칭머신 던지기<br><span class="skill-desc">(MP 15 / 피해량: ${machineThrowDmg})</span></button>
            <button class="btn-buff" style="background-color: #f59e0b;" onclick="executeSpinRoulette()">🎡 룰렛 돌리기<br><span class="skill-desc">(MP 20 / 무작위 버프)</span></button>
            <button class="btn-heal" style="background-color: #ca8a04;" onclick="executeCoinToss()">💰 코인 토스<br><span class="skill-desc">(MP 15 / 회복 or 공격)</span></button>
            ${domainButtonHtml}
            <button class="btn-inventory btn-back" onclick="showMainControls()" style="grid-column: 1 / -1;">↩️ 뒤로가기${emptyDesc}</button>
        `;
    } else if (player.characterClass === 'necromancer') {
        // 네크로맨서 스킬 UI
        const soulPunchDmg = Math.floor(player.atk * 2.1 + player.magicDamageBonus);
        const spiritVortexDmg = Math.floor(player.atk * 1.3 + player.magicDamageBonus);
        const domain = domainData.necromancer;

        const domainButtonHtml = player.domainActive
            ? `<button class="btn-defend-active" onclick="deactivateDomain()">🌀 영역 해제<br><span class="skill-desc">(MP 0 / 턴 미소모)</span></button>`
            : (floor < player.domainCooldownUntilFloor
                ? `<button class="btn-attack" disabled style="background: linear-gradient(45deg, #555, #333);">
                       💥 영역 재사용 대기<br><span class="skill-desc">(${player.domainCooldownUntilFloor}층부터 사용 가능)</span>
                   </button>`
                : `<button class="btn-attack" style="background: linear-gradient(45deg, #581c87, #0f172a);" onclick="activateDomain('necromancer')">
                       💥 영역 전개: ${domain.name}<br><span class="skill-desc">(MP ${domain.mpCost} / 턴 미소모)</span>
                   </button>`);

        controlsPanel.innerHTML = `
            <button class="btn-attack" onclick="executeNormalAttack()">⚔️ ${normalAttackName}<br><span class="skill-desc">(피해량: ${player.atk})</span></button>
            <button class="btn-attack" style="background-color: #c12828;" onclick="executeSoulPunch()">👊 영혼 펀치<br><span class="skill-desc">(MP 10 / 피해량: ${soulPunchDmg})</span></button>
            <button class="btn-attack" style="background-color: #7f1d1d;" onclick="executeSpiritVortex()">🌪️ 영혼 소용돌이<br><span class="skill-desc">(MP 15 / 피해량: ${spiritVortexDmg})</span></button>
            <button class="btn-buff" style="background-color: #581c87;" onclick="executeSummonSpirit()">👻 영체 소환/보관<br><span class="skill-desc">(MP 0 / 턴 미소모)</span></button>
            <button class="btn-heal" style="background-color: #14532d;" onclick="executeSpiritAbsorption()">🌀 영체 흡수<br><span class="skill-desc">(MP 25 / HP < ATK인 적 포획)</span></button>
            ${domainButtonHtml}
            <button class="btn-inventory btn-back" onclick="showMainControls()" style="grid-column: 1 / -1;">↩️ 뒤로가기${emptyDesc}</button>
        `;
    } else if (player.characterClass === 'limitless') {
        // 무하한 능력자 스킬 UI
        const blueDmg = Math.floor(player.atk * 1.5 + player.magicDamageBonus);
        const redDmg = Math.floor(player.atk * 2.2 + player.magicDamageBonus);
        const purpleDmg = Math.floor(player.atk * 4.0 + player.magicDamageBonus);
        const infinityFistDmg = Math.floor(player.atk * 1.8 + player.magicDamageBonus);
        const domain = domainData.limitless;

        const domainButtonHtml = player.domainActive
            ? `<button class="btn-defend-active" onclick="deactivateDomain()">🌀 영역 해제<br><span class="skill-desc">(MP 0 / 턴 미소모)</span></button>`
            : (floor < player.domainCooldownUntilFloor
                ? `<button class="btn-attack" disabled style="background: linear-gradient(45deg, #555, #333);">
                       🌌 영역 재사용 대기<br><span class="skill-desc">(${player.domainCooldownUntilFloor}층부터 사용 가능)</span>
                   </button>`
                : `<button class="btn-attack" style="background: linear-gradient(45deg, #000000, #434343);" onclick="activateDomain('limitless')">
                       🌌 영역 전개: ${domain.name}<br><span class="skill-desc">(MP ${domain.mpCost} / 턴 미소모)</span>
                   </button>`);

        controlsPanel.innerHTML = `
            <button class="btn-attack" onclick="executeNormalAttack()">⚔️ ${normalAttackName}<br><span class="skill-desc">(피해량: ${player.atk})</span></button>
            <button class="btn-attack" style="background-color: #3b82f6;" onclick="executeCursedTechniqueBlue()">🔵 술식 순전: 창<br><span class="skill-desc">(MP 20 / 피해: ${blueDmg} / 적 공-20%)</span></button>
            <button class="btn-attack" style="background-color: #ef4444;" onclick="executeCursedTechniqueRed()">🔴 술식 반전: 혁<br><span class="skill-desc">(MP 25 / 피해: ${redDmg} / 80% 스플래시)</span></button>
            <button class="btn-attack" style="background-color: #7e22ce;" onclick="executeHollowPurple()">🟣 허식: 자<br><span class="skill-desc">(MP 40 / 피해: ${purpleDmg} / 65% 스플래시)</span></button>
            <button class="btn-attack" style="background-color: #4c1d95;" onclick="executeInfinityFist()">👊 무한을 두른 주먹<br><span class="skill-desc">(MP 15 / 피해량: ${infinityFistDmg})</span></button>
            ${domainButtonHtml}
            <button class="btn-inventory btn-back" onclick="showMainControls()" style="grid-column: 1 / -1;">↩️ 뒤로가기${emptyDesc}</button>
        `;
    } else if (player.characterClass === 'curseKing') {
        // 저주의 왕 스킬 UI
        const dismantleDmg = Math.floor(player.atk * 2.0 + player.magicDamageBonus); // 해 (광역)
        const cleaveDmg = Math.floor(player.atk * 2.5 + player.magicDamageBonus);    // 팔 (단일)
        const cleavePunchDmg = Math.floor(player.atk * 1.5 + player.magicDamageBonus); // 참격을 담은 펀치 (단일)
        const fugaDmg = Math.floor(player.atk * 3.0 + player.magicDamageBonus);       // 푸가 (단일)
        const domain = domainData.curseKing;

        const domainButtonHtml = player.domainActive
            ? `<button class="btn-defend-active" onclick="deactivateDomain()">🌀 영역 해제<br><span class="skill-desc">(MP 0 / 턴 미소모)</span></button>`
            : (floor < player.domainCooldownUntilFloor
                ? `<button class="btn-attack" disabled style="background: linear-gradient(45deg, #555, #333);">
                       ⛓️ 영역 재사용 대기<br><span class="skill-desc">(${player.domainCooldownUntilFloor}층부터 사용 가능)</span>
                   </button>`
                : `<button class="btn-attack" style="background: linear-gradient(45deg, #4a044e, #1e293b);" onclick="activateDomain('curseKing')">
                       ⛓️ 영역 전개: ${domain.name}<br><span class="skill-desc">(MP ${domain.mpCost} / 턴 미소모)</span>
                   </button>`);

        controlsPanel.innerHTML = `
            <button class="btn-attack" onclick="executeNormalAttack()">⚔️ ${normalAttackName}<br><span class="skill-desc">(피해량: ${player.atk})</span></button>
            <button class="btn-attack" style="background-color: #7f1d1d;" onclick="executeDismantle()">🔪 해<br><span class="skill-desc">(MP 20 / 광역피해: ${dismantleDmg})</span></button>
            <button class="btn-attack" style="background-color: #9a2020;" onclick="executeCleave()">🪓 팔<br><span class="skill-desc">(MP 25 / 피해량: ${cleaveDmg})</span></button>
            <button class="btn-attack" style="background-color: #b91c1c;" onclick="executeCleavePunch()">💥 참격을 담은 펀치<br><span class="skill-desc">(MP 15 / 피해량: ${cleavePunchDmg})</span></button>
            <button class="btn-attack" style="background-color: #4a044e;" onclick="executeFuga()">🎶 푸가<br><span class="skill-desc">(MP 30 / 광역피해: ${fugaDmg} + 화상)</span></button>
            ${domainButtonHtml}
            <button class="btn-inventory btn-back" onclick="showMainControls()" style="grid-column: 1 / -1;">↩️ 뒤로가기${emptyDesc}</button>
        `;
    } else {
        // 기본 용사 스킬 데미지 계산
        const powerAttackDmg = Math.floor(player.atk * 2.0 + player.magicDamageBonus);
        const sweepAttackDmg = Math.floor(player.atk * 0.8 + player.magicDamageBonus);
        const shoutBtnStyle = `background-color: ${player.shoutOfResolveBuff.active ? '#fb923c' : '#f97316'};`;
        const domain = domainData.hero;

        const domainButtonHtml = player.domainActive
            ? `<button class="btn-defend-active" onclick="deactivateDomain()">🌀 영역 해제<br><span class="skill-desc">(MP 0 / 턴 미소모)</span></button>`
            : (floor < player.domainCooldownUntilFloor
                ? `<button class="btn-attack" disabled style="background: linear-gradient(45deg, #555, #333);">
                       🌟 영역 재사용 대기<br><span class="skill-desc">(${player.domainCooldownUntilFloor}층부터 사용 가능)</span>
                   </button>`
                : `<button class="btn-attack" style="background: linear-gradient(45deg, #f59e0b, #ef4444);" onclick="activateDomain('hero')">
                       🌟 영역 전개: ${domain.name}<br><span class="skill-desc">(MP ${domain.mpCost} / 턴 미소모)</span>
                   </button>`);

        controlsPanel.innerHTML = `
            <button class="btn-attack" onclick="executeNormalAttack()">⚔️ ${normalAttackName}<br><span class="skill-desc">(피해량: ${player.atk})</span></button>
            <button class="btn-attack" style="background-color: #c12828;" onclick="executePowerAttack()">💥 강 공격<br><span class="skill-desc">(MP 15 / 피해량: ${powerAttackDmg})</span></button>
            <button class="btn-attack" style="background-color: #9a2020;" onclick="executeSweepAttack()">🌪️ 휩쓸기<br><span class="skill-desc">(MP 25 / 피해량: ${sweepAttackDmg})</span></button>
            <button class="${defenseBtnClass}" onclick="toggleDefenseStance()">🛡️ 방어 태세<br><span class="skill-desc">(MP 10)</span></button>
            <button class="btn-heal" style="${shoutBtnStyle}" onclick="executeShoutOfResolve()">🗣️ 결의의 외침<br><span class="skill-desc">(MP 20 / 턴 미소모)</span></button>
            ${domainButtonHtml}
            <button class="btn-inventory btn-back" onclick="showMainControls()" style="grid-column: 1 / -1;">↩️ 뒤로가기${emptyDesc}</button>
        `;
    }
}

/**
 * 메인 컨트롤 버튼(스킬, 물약, 장비 등)들을 보여줍니다.
 */
function showMainControls() {
    playSound('click');
    if (isGameOver) return;
    const controlsPanel = document.getElementById('controls-panel');
    controlsPanel.classList.remove('skill-view');

    const saveButtonHtml = isLoggedIn() ? `💾 저장&종료` : `💾 홈으로`;
    const saveButtonOnclick = isLoggedIn() ? `saveGame()` : `goHomeAndConfirm()`;

    // 모든 버튼에 2줄 구조를 적용하여 높이를 통일합니다.
    // 주 메뉴 버튼에는 내용이 없는 두 번째 줄을 추가합니다.
    const emptyDesc = `<br><span class="skill-desc">&nbsp;</span>`;

    controlsPanel.innerHTML = `
        <button class="btn-attack" onclick="showSkillSelection()">⚔️ 스킬${emptyDesc}</button>
        <button class="btn-heal" onclick="showAllPotions()">🧪 물약${emptyDesc}</button>
        <button class="btn-buff" onclick="${saveButtonOnclick}">${saveButtonHtml}${emptyDesc}</button>
        <button class="btn-armor" onclick="openInventoryModal('equipment')">🛡️ 장비${emptyDesc}</button>
        <button class="btn-inventory" onclick="openInventoryModal('loot')">💎 전리품${emptyDesc}</button>
        <button class="btn-buff" onclick="openInventoryModal('stats')">📊 스탯${emptyDesc}</button>
    `;
}

/**
 * 게임을 중단하고 홈 화면으로 돌아갈지 확인한 후 이동합니다.
 * 비로그인 상태에서 사용됩니다.
 */
function goHomeAndConfirm() {
    // 진행 상황이 저장되지 않음을 알리고 확인을 받습니다.
    if (confirm("정말로 게임을 종료하고 홈 화면으로 돌아가시겠습니까?\n현재 진행 상황은 저장되지 않습니다.")) {
        showStartMenu();
    }
}

/**
 * 사용 가능한 모든 물약 목록을 보여주는 모달을 엽니다.
 * - 인벤토리의 소비 아이템을 종류별로 그룹화하여 개수와 함께 표시합니다.
 */
function showAllPotions() {
    playSound('click');
    const modal = document.getElementById('item-select-modal');

    // 아이템 목록이 길어져 UI가 잘리는 것을 방지하기 위해
    // 모달 컨텐츠에 최대 높이와 스크롤을 적용합니다. (상점/인벤토리와 동일한 방식)
    const modalContent = modal.querySelector('.modal-content');
    if (modalContent) {
        modalContent.style.maxHeight = '90vh';
        modalContent.style.overflowY = 'auto';
    }

    document.getElementById('item-select-title').innerText = "물약 사용";

    const allPotions = player.inventory.filter(item => item.type === 'heal' || item.type === 'mpPotion' || item.type === 'buff' || item.type === 'critBuff');

    if (allPotions.length === 0) {
        alert("사용 가능한 물약이 없습니다.");
        return;
    }

    // 각 카테고리별 리스트 컨테이너 가져오기
    const healList = document.getElementById('potion-list-heal');
    const mpList = document.getElementById('potion-list-mp');
    const buffList = document.getElementById('potion-list-buff');
    const critBuffList = document.getElementById('potion-list-critBuff');

    // 리스트 초기화
    healList.innerHTML = '';
    mpList.innerHTML = '';
    buffList.innerHTML = '';
    critBuffList.innerHTML = '';

    // 같은 이름의 아이템을 그룹화하여 개수를 셉니다.
    const groupedHeal = {};
    const groupedMp = {};
    const groupedBuff = {};
    const groupedCritBuff = {};

    player.inventory.forEach((item, index) => {
        let targetGroup;
        if (item.type === 'heal') targetGroup = groupedHeal;
        else if (item.type === 'buff') targetGroup = groupedBuff;
        else if (item.type === 'critBuff') targetGroup = groupedCritBuff;
        else if (item.type === 'mpPotion') targetGroup = groupedMp;
        else return;

        if (!targetGroup[item.name]) {
            targetGroup[item.name] = { ...item, count: 0, originalIndexes: [] };
        }
        targetGroup[item.name].count++;
        targetGroup[item.name].originalIndexes.push(index);
    });

    // 그룹화된 아이템을 UI에 렌더링하는 헬퍼 함수
    const renderPotionGroup = (group, container) => {
        if (Object.keys(group).length === 0) {
            container.innerHTML = '<div class="inventory-item" style="justify-content: center; color: #888;">없음</div>';
            return;
        }
        for (const name in group) {
            const itemGroup = group[name];
            const itemEl = document.createElement('div'); // '사용' 버튼은 항상 첫 번째 아이템의 인덱스를 사용
            itemEl.className = 'inventory-item';
            const useIndex = itemGroup.originalIndexes[0];
            
            let emoji = '';
            let description = '';

            if (itemGroup.type === 'heal') {
                emoji = '💊';
                const healText = itemGroup.healAmount === 9999 ? '전체' : itemGroup.healAmount;
                description = `(체력 ${healText} 회복)`;
            } else if (itemGroup.type === 'buff') {
                emoji = '🧪';
                description = `(공격력 ${itemGroup.mult}배, ${itemGroup.turns}턴)`;
            } else if (itemGroup.type === 'critBuff') {
                emoji = '🔮';
                description = `(치명타 +${itemGroup.bonus}%, ${itemGroup.turns}턴)`;
            } else if (itemGroup.type === 'mpPotion') {
                emoji = '💧';
                const mpText = itemGroup.mpAmount === 9999 ? '전체' : itemGroup.mpAmount;
                description = `(마나 ${mpText} 회복)`;
            }

            itemEl.innerHTML = `
                <div class="item-info">
                    ${emoji} ${itemGroup.name} (보유: ${itemGroup.count}개)<br>
                    <span class="skill-desc" style="color: #f59e0b;">${description}</span>
                </div>
                <button class="btn-use" onclick="useInventoryItem(${useIndex})">사용</button>
            `;
            container.appendChild(itemEl);
        }
    };

    // 각 카테고리 렌더링
    renderPotionGroup(groupedHeal, healList);
    renderPotionGroup(groupedMp, mpList);
    renderPotionGroup(groupedBuff, buffList);
    renderPotionGroup(groupedCritBuff, critBuffList);
    
    // potion-container의 스타일을 원래대로 복원 (가로 정렬)
    const potionContainer = modal.querySelector('.potion-container');
    potionContainer.style.flexDirection = ''; // 'column' 속성 제거

    modal.style.display = 'flex';
}

/**
 * 아이템(물약) 선택 모달을 닫습니다.
 */
function closeItemSelect() {
    playSound('click');
    document.getElementById('item-select-modal').style.display = 'none';
}

/**
 * 스탯 분배 모달의 내용을 렌더링합니다.
 * - 현재 스탯, 분배 후 예상 능력치 등을 실시간으로 계산하여 보여줍니다.
 */
function renderStatUpModal() {
    document.querySelector('#stat-points-display span').innerText = tempStatPoints;
    const list = document.querySelector('.stat-up-list');
    list.innerHTML = '';

    for (const key in statInfo) {
        if (!statInfo.hasOwnProperty(key)) continue; // 객체 자체의 속성인지 확인
        const info = statInfo[key];
        const itemEl = document.createElement('div');
        itemEl.className = 'stat-up-item';
        itemEl.innerHTML = `
            <div class="stat-info">
                <h4>${info.name}: ${tempStats[key]}</h4>
                <p>${info.description}</p>
            </div>
            <button class="btn-use" onclick="addStat('${key}')">+</button>
        `;
        list.appendChild(itemEl);
    }

    // --- 스탯 분배 시 변경될 능력치를 미리 보여주는 로직 ---
    const currentValuesEl = document.getElementById('stat-current-values');
    const weaponBonus = player.equippedWeapon ? player.equippedWeapon.atkBonus : 0;
    const armorBonus = player.equippedArmor ? player.equippedArmor.maxHpBonus : 0;

    // 전리품 보너스 계산 (미리보기용)
    const lootBonuses = { str: 0, vit: 0, mag: 0, mnd: 0, agi: 0, int: 0, luk: 0, fcs: 0 };
    let lootGoldBonus = 0;
    // --- 추가: 특별 효과 전리품 변수 ---
    let critDamageBonus = 0;
    let hpRegen = 0;
    let mpCostReduction = 0;
    let bonusStatPoints = 0;
    let debuffResistance = 0;

    player.lootInventory.forEach(loot => {
        if (loot.type === 'permanent_stat' && lootBonuses.hasOwnProperty(loot.stat)) {
            lootBonuses[loot.stat] += loot.value;
        } else if (loot.type === 'gold_bonus') { // 골드 보너스 타입 처리
            lootGoldBonus += loot.value;
        } else if (loot.type === 'crit_damage_bonus') {
            critDamageBonus += loot.value;
        } else if (loot.type === 'hp_regen_per_turn') {
            hpRegen += loot.value;
        } else if (loot.type === 'mp_cost_reduction') {
            mpCostReduction += loot.value;
        } else if (loot.type === 'bonus_stat_points') {
            bonusStatPoints += loot.value;
        } else if (loot.type === 'debuff_resistance') {
            debuffResistance += loot.value;
        }
    });

    // "현재" 값 (버프 제외, 순수 스탯/장비 효과만)
    const currentAtk = player.baseAtk + ((player.str + lootBonuses.str) * 2) + weaponBonus;
    const currentMaxHp = player.baseMaxHp + ((player.vit + lootBonuses.vit) * 5) + armorBonus;
    const currentMaxMp = player.baseMaxMp + ((player.mnd + lootBonuses.mnd) * 5);
    const currentCritChance = 11 + ((player.luk + lootBonuses.luk) * 0.7);
    const currentEvasionChance = Math.min(50, 4 + ((player.agi + lootBonuses.agi) * 3));
    const currentGoldBonus = 1 + ((player.int + lootBonuses.int) * 0.02) + lootGoldBonus;
    const currentBlackFlashChance = 0.008 + ((player.fcs + lootBonuses.fcs) * 0.004);

    // "임시" 값 (스탯 분배 후 + 전리품 효과 포함)
    const tempAtk = player.baseAtk + ((tempStats.str + lootBonuses.str) * 2) + weaponBonus;
    const tempMaxHp = player.baseMaxHp + ((tempStats.vit + lootBonuses.vit) * 5) + armorBonus;
    const tempMaxMp = player.baseMaxMp + ((tempStats.mnd + lootBonuses.mnd) * 5);
    const tempCritChance = 11 + ((tempStats.luk + lootBonuses.luk) * 0.7);
    const tempEvasionChance = Math.min(50, 4 + ((tempStats.agi + lootBonuses.agi) * 3));
    const tempGoldBonus = 1 + ((tempStats.int + lootBonuses.int) * 0.02) + lootGoldBonus;
    const tempBlackFlashChance = 0.008 + ((tempStats.fcs + lootBonuses.fcs) * 0.004);

    // --- 스킬 추가 피해 미리보기 계산 ---
    const currentMagicDamageBonus = ((player.mag + lootBonuses.mag) * 2.0);
    const tempMagicDamageBonus = ((tempStats.mag + lootBonuses.mag) * 2.0);

    // --- 특별 효과 텍스트 생성 ---
    let specialEffectsHtml = '';
    const effects = [];
    if (critDamageBonus > 0) effects.push(`치명타 피해 +${(critDamageBonus * 100).toFixed(0)}%`);
    if (hpRegen > 0) effects.push(`턴당 체력 회복 +${hpRegen}`);
    if (mpCostReduction > 0) effects.push(`MP 소모 감소 -${(mpCostReduction * 100).toFixed(0)}%`);
    if (bonusStatPoints > 0) effects.push(`레벨업당 추가 스탯 +${bonusStatPoints}`);
    if (debuffResistance > 0) effects.push(`상태이상 저항 +${(debuffResistance * 100).toFixed(0)}%`);

    if (effects.length > 0) {
        specialEffectsHtml = `
            <hr style="border-color: #444; margin: 8px 0;">
            <div style="color: #a78bfa; font-weight: bold;">✨ 전리품 특별 효과</div>
            <div style="font-size: 14px; color: #ccc; line-height: 1.6;">${effects.join(' | ')}</div>
        `;
    }

    // --- 회피율 최대치 도달 시 강조 표시 ---
    const evasionNextValueStyle = tempEvasionChance >= 50 ? 'color: #fbbf24; font-weight: bold;' : '';

    currentValuesEl.innerHTML = `
        공격력: ${currentAtk} → ${tempAtk} | 최대체력: ${currentMaxHp} → ${tempMaxHp}<br>
        최대MP: ${currentMaxMp} → ${tempMaxMp} | 회피: ${currentEvasionChance.toFixed(1)}% → <span style="${evasionNextValueStyle}">${tempEvasionChance.toFixed(1)}%</span> (최대 50%)<br>
        치명타: ${currentCritChance.toFixed(1)}% → ${tempCritChance.toFixed(1)}% | 골드 보너스: ${((currentGoldBonus - 1) * 100).toFixed(0)}% → ${((tempGoldBonus - 1) * 100).toFixed(0)}%<br>
        흑섬 확률: ${(currentBlackFlashChance * 100).toFixed(1)}% → ${(tempBlackFlashChance * 100).toFixed(1)}% | 스킬 추가 피해: ${currentMagicDamageBonus.toFixed(1)} → <span style="color: #f87171; font-weight: bold;">${tempMagicDamageBonus.toFixed(1)}</span>
        ${specialEffectsHtml}
    `;
}

/**
 * 로그인 상태에 따라 시작 메뉴의 UI(게스트/로그인 메뉴)를 업데이트합니다.
 * @param {string|null} username - 로그인한 사용자 이름. 비로그인 시 null.
 */
function updateLoginStatus(username) {
    const guestMenu = document.getElementById('guest-menu');
    const loggedInMenu = document.getElementById('logged-in-menu');
    const loggedInUserEl = document.getElementById('logged-in-user');
    const adminLink = document.getElementById('admin-link');

    if (username) {
        guestMenu.style.display = 'none';
        loggedInMenu.style.display = 'flex';
        loggedInUserEl.textContent = username;

        // 관리자일 경우 관리자 페이지 링크 표시
        if (localStorage.getItem('userRole') === 'admin') {
            adminLink.style.display = 'flex';
        }
    } else {
        guestMenu.style.display = 'flex';
        loggedInMenu.style.display = 'none';
        loggedInUserEl.textContent = '';
        adminLink.style.display = 'none';
    }
}

/**
 * 시작 메뉴 화면을 표시하고 메인 테마 BGM을 재생합니다.
 */
function showStartMenu() {
    playBGM('main-theme'); // 시작 메뉴 BGM 재생
    document.getElementById('start-menu').style.display = 'block';
    document.getElementById('game-wrapper').style.display = 'none';
}

/**
 * 간단한 마크다운 텍스트를 HTML로 변환합니다.
 * 지원하는 문법: #, ##, ### (제목), - (목록), > (인용), **bold**, `code`
 * @param {string} markdown - 변환할 마크다운 텍스트.
 * @returns {string} - 변환된 HTML 문자열.
 */
function markdownToHtml(markdown) {
    const lines = markdown.split('\n');
    let html = '';
    let inList = false;

    const processInline = (text) => {
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/`(.*?)`/g, '<code>$1</code>');
    };

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];

        // Headers
        if (line.startsWith('# ')) {
            if (inList) { html += '</ul>'; inList = false; }
            html += `<h1>${processInline(line.substring(2))}</h1>`;
            continue;
        }
        if (line.startsWith('## ')) {
            if (inList) { html += '</ul>'; inList = false; }
            html += `<h2>${processInline(line.substring(3))}</h2>`;
            continue;
        }
        if (line.startsWith('### ')) {
            if (inList) { html += '</ul>'; inList = false; }
            html += `<h3>${processInline(line.substring(4))}</h3>`;
            continue;
        }
        // Blockquote
        if (line.startsWith('> ')) {
            if (inList) { html += '</ul>'; inList = false; }
            html += `<blockquote>${processInline(line.substring(2))}</blockquote>`;
            continue;
        }
        // Unordered List
        if (line.startsWith('- ')) {
            if (!inList) { html += '<ul>'; inList = true; }
            html += `<li>${processInline(line.substring(2))}</li>`;
            continue;
        }

        if (inList) { html += '</ul>'; inList = false; }
        if (line.trim() !== '') html += `<p>${processInline(line)}</p>`;
    }
    if (inList) html += '</ul>';
    return html;
}

/**
 * 게임 설명서 모달을 엽니다.
 * - 모달이 없으면 동적으로 생성하고, 'manual.md' 파일 내용을 불러와 표시합니다.
 */
async function openManualModal() {
    playSound('click');
    let modal = document.getElementById('manual-modal');

    // 모달이 없으면 동적으로 생성
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'manual-modal';
        modal.className = 'modal'; // .modal 클래스를 사용하여 CSS 적용
        modal.style.display = 'none';
        modal.innerHTML = `
            <div class="modal-content notice-content">
                <span class="close-btn" onclick="closeManualModal()">&times;</span>
                <h2>📜 게임 설명서</h2>
                <div id="manual-content">
                    로딩 중...
                </div>
                <button class="modal-close-btn" onclick="closeManualModal()">닫기</button>
            </div>
        `;
        document.body.appendChild(modal);
    }

    // 모달 컨텐츠 스크롤 스타일 적용
    const modalContent = modal.querySelector('.modal-content');
    if (modalContent) {
        modalContent.style.maxHeight = '85vh';
        modalContent.style.overflowY = 'auto';
    }

    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('visible'), 10);

    // 'manual.md' 파일 내용 불러오기
    const contentEl = document.getElementById('manual-content');
    // 내용이 이미 로드되었으면 다시 로드하지 않음
    if (contentEl.innerText !== '로딩 중...') return;

    try {
        const response = await fetch('manual.md');
        if (!response.ok) throw new Error('설명서를 불러올 수 없습니다.');
        const markdownText = await response.text();
        contentEl.innerHTML = markdownToHtml(markdownText); // 마크다운을 HTML로 변환하여 삽입
    } catch (error) {
        contentEl.textContent = error.message;
    }
}

/**
 * 게임 설명서 모달을 닫습니다.
 */
function closeManualModal() {
    playSound('click');
    const modal = document.getElementById('manual-modal');
    if (modal) {
        modal.classList.remove('visible');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    }
}

/**
 * 시작 메뉴에 '게임 설명서' 링크를 추가합니다.
 * - 이 함수는 게임 초기화 시 한 번만 호출됩니다.
 */
function addManualLinkToStartMenu() {
    const guestMenu = document.getElementById('guest-menu');
    const loggedInMenu = document.getElementById('logged-in-menu');

    const createButton = () => {
        const button = document.createElement('button');
        button.className = 'start-btn';
        button.textContent = '📜 게임설명서';
        button.onclick = openManualModal;
        return button;
    };

    // 버튼이 이미 추가되었는지 확인하여 중복 추가 방지
    if (guestMenu && !guestMenu.querySelector('.start-btn[onclick="openManualModal()"]')) guestMenu.appendChild(createButton());
    if (loggedInMenu && !loggedInMenu.querySelector('.start-btn[onclick="openManualModal()"]')) loggedInMenu.appendChild(createButton());
}

/**
 * 볼륨 조절 버튼의 UI 상태(on/off)를 현재 설정에 맞게 업데이트합니다.
 */
function updateVolumeButtons() {
    const bgmBtn = document.getElementById('bgm-toggle-btn');
    const sfxBtn = document.getElementById('sfx-toggle-btn');
    

    if (isBgmEnabled) {
        bgmBtn.classList.remove('off');
    } else {
        bgmBtn.classList.add('off');
    }

    if (isSfxEnabled) {
        sfxBtn.classList.remove('off');
    } else {
        sfxBtn.classList.add('off');
    }
}

/**
 * 메인 게임 화면을 표시합니다.
 */
function showGameScreen() {
    document.getElementById('start-menu').style.display = 'none';
    document.getElementById('game-wrapper').style.display = 'block';
}

/**
 * 로그인 모달을 엽니다.
 */
function openLoginModal() {
    playSound('click');
    const modal = document.getElementById('login-modal');
    // 이전 입력값과 에러 메시지 초기화
    const usernameInput = document.getElementById('login-username');
    const passwordInput = document.getElementById('login-password');
    if (usernameInput) usernameInput.value = '';
    if (passwordInput) passwordInput.value = '';
    
    const errorMsg = document.getElementById('login-error-msg');
    if (errorMsg) errorMsg.style.display = 'none';

    modal.style.display = 'flex';
    setTimeout(() => {
        modal.classList.add('visible');
    }, 10);
}

/**
 * 로그인 모달을 닫습니다.
 */
function closeLoginModal() {
    playSound('click');
    const modal = document.getElementById('login-modal');
    modal.classList.remove('visible');
    // transition 애니메이션이 끝난 후 display를 none으로 변경합니다.
    setTimeout(() => {
        modal.style.display = 'none';
        // 모달이 닫힐 때 에러 메시지도 숨김
        document.getElementById('login-error-msg').style.display = 'none';
    }, 300); // CSS의 transition 시간과 일치해야 합니다.
}

/**
 * 회원가입 모달을 엽니다.
 */
function openRegisterModal() {
    playSound('click');
    const modal = document.getElementById('register-modal');
    
    // 이전 입력값과 에러 메시지 초기화
    document.getElementById('register-username').value = '';
    document.getElementById('register-password').value = '';
    document.getElementById('register-email').value = '';
    document.getElementById('register-birthdate').value = '';
    document.getElementById('register-country').value = '';
    document.getElementById('register-error-msg').style.display = 'none';

    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('visible'), 10);
}

/**
 * 회원가입 모달을 닫습니다.
 */
function closeRegisterModal() {
    playSound('click');
    const modal = document.getElementById('register-modal');
    modal.classList.remove('visible');
    setTimeout(() => {
        modal.style.display = 'none';
        document.getElementById('register-error-msg').style.display = 'none';
    }, 300);
}

/**
 * 로그인 창에서 회원가입 창으로 전환합니다.
 */
function switchToRegisterModal(event) {
    event.preventDefault();
    closeLoginModal();
    setTimeout(openRegisterModal, 350); // 모달 전환 애니메이션을 위한 지연
}

/**
 * 회원가입 창에서 로그인 창으로 전환합니다.
 */
function switchToLoginModal(event) {
    event.preventDefault();
    closeRegisterModal();
    setTimeout(openLoginModal, 350); // 모달 전환 애니메이션을 위한 지연
}

/**
 * 아이디/비밀번호 찾기 모달을 엽니다.
 */
function openFindAccountModal() {
    playSound('click');
    const modal = document.getElementById('find-account-modal');
    
    // 이전 입력값과 결과 메시지 초기화
    document.getElementById('find-email').value = '';
    document.getElementById('find-birthdate').value = '';
    const resultEl = document.getElementById('find-account-result');
    resultEl.style.display = 'none';
    resultEl.innerText = '';

    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('visible'), 10);
}

/**
 * 아이디/비밀번호 찾기 모달을 닫습니다.
 */
function closeFindAccountModal() {
    playSound('click');
    const modal = document.getElementById('find-account-modal');
    modal.classList.remove('visible');
    setTimeout(() => {
        modal.style.display = 'none';
        document.getElementById('find-account-result').style.display = 'none';
    }, 300);
}

/**
 * 로그인 창에서 아이디/비밀번호 찾기 창으로 전환합니다.
 */
function switchToFindAccountModal(event) {
    event.preventDefault();
    closeLoginModal();
    setTimeout(openFindAccountModal, 350);
}

/**
 * 아이디/비밀번호 찾기 창에서 로그인 창으로 전환합니다.
 */
function switchToLoginFromFind(event) {
    event.preventDefault();
    closeFindAccountModal();
    setTimeout(openLoginModal, 350);
}

/**
 * 이메일과 생년월일로 아이디를 찾는 요청을 보냅니다.
 */
async function handleFindId() {
    const email = document.getElementById('find-email').value;
    const birthdate = document.getElementById('find-birthdate').value;
    const resultEl = document.getElementById('find-account-result');

    if (!email || !birthdate) {
        resultEl.style.display = 'block';
        resultEl.style.color = '#ef4444'; // red
        resultEl.innerText = '이메일과 생년월일을 모두 입력해주세요.';
        return;
    }

    try {
        const response = await fetch(`${window.API_URL}/users/find-id`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, birthdate }),
        });
        const data = await response.json();

        if (response.ok && data.success) {
            resultEl.style.display = 'block';
            resultEl.style.color = '#22c55e'; // green
            resultEl.innerText = `회원님의 아이디는 [ ${data.username} ] 입니다.`;
        } else {
            resultEl.style.display = 'block';
            resultEl.style.color = '#ef4444'; // red
            resultEl.innerText = data.message || '일치하는 사용자 정보가 없습니다.';
        }
    } catch (error) {
        console.error('아이디 찾기 요청 오류:', error);
        resultEl.style.display = 'block';
        resultEl.style.color = '#ef4444';
        resultEl.innerText = '요청 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
    }
}

/**
 * 이메일과 생년월일로 비밀번호를 초기화하는 요청을 보냅니다.
 */
async function handleResetPassword() {
    const email = document.getElementById('find-email').value;
    const birthdate = document.getElementById('find-birthdate').value;
    const resultEl = document.getElementById('find-account-result');

    if (!email || !birthdate) {
        resultEl.style.display = 'block';
        resultEl.style.color = '#ef4444';
        resultEl.innerText = '이메일과 생년월일을 모두 입력해주세요.';
        return;
    }
    
    if (!confirm('비밀번호를 초기화하시겠습니까?\n초기화된 비밀번호는 화면에 표시됩니다.\n로그인 후 반드시 비밀번호를 변경해주세요.')) {
        return;
    }

    try {
        const response = await fetch(`${window.API_URL}/users/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, birthdate }),
        });
        const data = await response.json();

        if (response.ok && data.success) {
            resultEl.style.display = 'block';
            resultEl.style.color = '#fbbf24'; // yellow
            resultEl.innerHTML = `새로운 비밀번호는 [ <span style="user-select: text; color: white;">${data.newPassword}</span> ] 입니다.<br>로그인 후 반드시 비밀번호를 변경해주세요.`;
        } else {
            resultEl.style.display = 'block';
            resultEl.style.color = '#ef4444';
            resultEl.innerText = data.message || '일치하는 사용자 정보가 없습니다.';
        }
    } catch (error) {
        console.error('비밀번호 초기화 요청 오류:', error);
        resultEl.style.display = 'block';
        resultEl.style.color = '#ef4444';
        resultEl.innerText = '요청 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
    }
}

/**
 * 네크로맨서의 '영체 소환' 모달을 엽니다.
 */
function openSummonSpiritModal() {
    playSound('click');
    let modal = document.getElementById('summon-spirit-modal');

    // 모달이 없으면 동적으로 생성
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'summon-spirit-modal';
        modal.className = 'modal';
        modal.style.display = 'none';
        modal.innerHTML = `
            <div class="modal-content" style="max-height: 85vh; overflow-y: auto;">
                <span class="close-btn" onclick="closeSummonSpiritModal()">&times;</span>
                <h2>👻 소환할 영체 선택</h2>
                <div id="summon-spirit-list" class="equipment-list"></div>
                <button class="modal-close-btn" onclick="closeSummonSpiritModal()">닫기</button>
            </div>
        `;
        document.body.appendChild(modal);
    }

    renderSummonSpiritList();

    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('visible'), 10);
}

/**
 * '영체 소환' 모달을 닫습니다.
 */
function closeSummonSpiritModal() {
    playSound('click');
    const modal = document.getElementById('summon-spirit-modal');
    if (modal) {
        modal.classList.remove('visible');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    }
}

/**
 * 보유 중인 영체 목록을 소환 모달에 렌더링합니다.
 */
function renderSummonSpiritList() {
    const listEl = document.getElementById('summon-spirit-list');
    listEl.innerHTML = '';

    if (player.capturedSpirits.length === 0) {
        listEl.innerHTML = '<div class="inventory-item" style="justify-content: center;">보유한 영체가 없습니다.</div>';
        return;
    }

    const bossMinionCount = player.minions.filter(m => m.isBoss).length;
    const normalMinionCount = player.minions.length - bossMinionCount;

    player.capturedSpirits.forEach((spirit, index) => {
        const itemEl = document.createElement('div');
        itemEl.className = 'inventory-item';
        
        let buttonHtml = '';
        if (spirit.cooldownUntilFloor > floor) {
            const remainingFloors = spirit.cooldownUntilFloor - floor;
            buttonHtml = `<button class="btn-use" disabled>💀 사망 (${remainingFloors}층 후 부활)</button>`;
        } else if (spirit.isSummoned) {
            buttonHtml = `<button class="btn-heal" onclick="confirmRecallSpirit(${index})">보관</button>`;
        } else {
            let canSummon = true;
            let disabledReason = '';
            if (player.minions.length >= 3) {
                canSummon = false; disabledReason = '소환 불가 (최대 3기)';
            } else if (spirit.isBoss && bossMinionCount >= 1) {
                canSummon = false; disabledReason = '소환 불가 (보스 1기 초과)';
            } else if (!spirit.isBoss && normalMinionCount >= 2) {
                canSummon = false; disabledReason = '소환 불가 (일반 2기 초과)';
            }
            buttonHtml = `<button class="btn-use" onclick="confirmSummonSpirit(${index})" ${!canSummon ? 'disabled' : ''}>${canSummon ? '소환' : disabledReason}</button>`;
        }

        itemEl.innerHTML = `
            <div class="item-info">
                ${spirit.emoji} ${spirit.name}
                <span class="skill-desc" style="color: #ccc;">(기본 HP: ${spirit.baseHp}, 기본 ATK: ${spirit.baseAtk})</span>
            </div>
            ${buttonHtml}
        `;
        listEl.appendChild(itemEl);
    });
}

/**
 * 회원정보 수정 모달을 엽니다.
 * - 모달을 열기 전에 서버에서 현재 사용자 정보를 가져와 폼을 채웁니다.
 */
async function openEditProfileModal() {
    playSound('click');
    try {
        // 서버에서 현재 사용자 정보 가져오기
        const userData = await fetchUserProfile();
        if (!userData) {
            alert('사용자 정보를 불러오는데 실패했습니다.');
            return;
        }

        // 폼 필드 채우기
        document.getElementById('edit-username').value = userData.username;
        document.getElementById('edit-email').value = userData.email;
        document.getElementById('edit-country').value = userData.country;
        // 날짜 입력 필드는 'YYYY-MM-DD' 형식을 사용합니다.
        const birthDate = new Date(userData.birthdate);
        if (!isNaN(birthDate.getTime())) {
            document.getElementById('edit-birthdate').value = birthDate.toISOString().split('T')[0];
        } else {
            document.getElementById('edit-birthdate').value = '';
            console.warn("서버로부터 받은 생년월일 값이 없습니다. 새로 입력해주세요:", userData.birthdate);
        }

        // 비밀번호 필드 및 에러 메시지 초기화
        document.getElementById('edit-current-password').value = '';
        document.getElementById('edit-new-password').value = '';
        document.getElementById('edit-confirm-password').value = '';
        document.getElementById('edit-profile-error-msg').style.display = 'none';

        const modal = document.getElementById('edit-profile-modal');
        modal.style.display = 'flex';
        setTimeout(() => {
            modal.classList.add('visible');
        }, 10);

    } catch (error) {
        alert(`오류: ${error.message}`);
    }
}

/**
 * 회원정보 수정 모달을 닫습니다.
 */
function closeEditProfileModal() {
    playSound('click');
    const modal = document.getElementById('edit-profile-modal');
    modal.classList.remove('visible');
    setTimeout(() => {
        modal.style.display = 'none';
        document.getElementById('edit-profile-error-msg').style.display = 'none';
    }, 300);
}

/**
 * 회원정보 수정을 서버에 요청합니다.
 * 이메일, 국가, 생년월일 및 비밀번호 변경을 처리합니다.
 */
// async function handleUpdateProfile() {
//     const email = document.getElementById('edit-email').value;
//     const country = document.getElementById('edit-country').value;
//     const birthdate = document.getElementById('edit-birthdate').value;
//     const currentPassword = document.getElementById('edit-current-password').value;
//     const newPassword = document.getElementById('edit-new-password').value;
//     const confirmPassword = document.getElementById('edit-confirm-password').value;
//     const errorMsgEl = document.getElementById('edit-profile-error-msg');

//     errorMsgEl.style.display = 'none';

//     // 새 비밀번호 유효성 검사
//     if (newPassword !== confirmPassword) {
//         errorMsgEl.textContent = '새 비밀번호가 일치하지 않습니다.';
//         errorMsgEl.style.display = 'block';
//         return;
//     }

//     const payload = {
//         email,
//         country,
//         birthdate,
//         currentPassword,
//     };

//     // 새 비밀번호가 입력된 경우에만 payload에 추가
//     if (newPassword) {
//         payload.newPassword = newPassword;
//     }

//     try {
//         const token = localStorage.getItem('token');
//         const response = await fetch(`${window.API_URL}/users/profile`, {
//             method: 'PUT',
//             headers: {
//                 'Content-Type': 'application/json',
//                 'x-auth-token': token,
//             },
//             body: JSON.stringify(payload),
//         });

//         const data = await response.json();

//         if (response.ok) {
//             alert('회원정보가 성공적으로 수정되었습니다.');
//             closeEditProfileModal();
//         } else {
//             errorMsgEl.textContent = data.message || '정보 수정에 실패했습니다.';
//             errorMsgEl.style.display = 'block';
//         }
//     } catch (error) {
//         console.error('회원정보 수정 요청 오류:', error);
//         errorMsgEl.textContent = '요청 중 오류가 발생했습니다.';
//         errorMsgEl.style.display = 'block';
//     }
// }

/**
 * 스코어보드 모달을 엽니다.
 */
function openScoreboardModal() {
    playSound('click');
    const modal = document.getElementById('scoreboard-modal');

    // 화면이 작은 기기에서 모달 내용이 잘리는 것을 방지하기 위해
    // 모달 컨텐츠에 최대 높이와 스크롤을 적용합니다.
    const modalContent = modal.querySelector('.scoreboard-content');
    if (modalContent) {
        modalContent.style.maxHeight = '85vh';
        modalContent.style.overflowY = 'auto';
    }

    modal.style.display = 'flex';
    // 브라우저가 display 변경을 인지하고 transition을 적용할 수 있도록 짧은 지연을 줍니다.
    setTimeout(() => {
        modal.classList.add('visible');
    }, 10);
}

/**
 * 스코어보드 모달을 닫습니다.
 */
function closeScoreboardModal() {
    playSound('click');
    const modal = document.getElementById('scoreboard-modal');
    modal.classList.remove('visible');
    // transition 애니메이션이 끝난 후 display를 none으로 변경합니다.
    setTimeout(() => {
        modal.style.display = 'none';
    }, 300); // CSS의 transition 시간과 일치해야 합니다.
}

/**
 * 국가 코드를 국기 이미지 HTML로 변환합니다.
 * @param {string} countryCode - 'KR', 'US' 등의 2자리 국가 코드.
 * @returns {string} - `<img>` 태그 문자열 또는 이모지.
 */
function getFlagImgHtml(countryCode) {
    if (!countryCode) return '';
    if (countryCode.toUpperCase() === 'ETC') return '<span class="flag-icon">🌐</span>'; // 기타 국가는 이모지 사용
    const code = countryCode.toLowerCase();
    return `<img src="https://flagcdn.com/w20/${code}.png" srcset="https://flagcdn.com/w40/${code}.png 2x" width="20" alt="${countryCode}" class="flag-icon">`;
}

/**
 * 날짜 문자열을 "N분 전", "N시간 전" 등 상대적인 시간으로 변환합니다.
 * @param {string} dateString - ISO 8601 형식의 날짜 문자열.
 * @returns {string} - 변환된 상대 시간 문자열.
 */
function formatTimeAgo(dateString) {
    if (!dateString) return '';

    const now = new Date();
    const past = new Date(dateString);
    const seconds = Math.floor((now - past) / 1000);

    let interval = seconds / 31536000; // 1년
    if (interval > 1) {
        return Math.floor(interval) + "년 전";
    }
    interval = seconds / 2592000; // 1달
    if (interval > 1) {
        return Math.floor(interval) + "개월 전";
    }
    interval = seconds / 86400; // 1일
    if (interval > 1) {
        return Math.floor(interval) + "일 전";
    }
    interval = seconds / 3600; // 1시간
    if (interval > 1) {
        return Math.floor(interval) + "시간 전";
    }
    interval = seconds / 60; // 1분
    if (interval > 1) {
        return Math.floor(interval) + "분 전";
    }
    return "방금 전";
}

/**
 * 캐릭터 클래스에 맞는 이모지 아이콘을 반환합니다.
 * @param {string} characterClass - 'hero', 'wizard' 등의 캐릭터 클래스 문자열.
 * @returns {string} - 이모지 문자열.
 */
function getCharacterEmoji(characterClass) {
    switch (characterClass) {
        case 'hero': return '🧑';
        case 'wizard': return '🧙';
        case 'rogue': return '🥷';
        case 'paladin': return '🛡️';
        case 'necromancer': return '💀';
        case 'gambler': return '🎲';
        case 'limitless': return '🌌';
        case 'curseKing': return '⛓️';
        default: return '';
    }
}
/**
 * 서버에서 받은 스코어보드 데이터를 UI에 렌더링합니다.
 * @param {Array<object>} scores - `{ username: string, score: number, country: string }` 형태의 배열.
 */
function renderScoreboard(scores) {
    const listEl = document.getElementById('scoreboard-list');
    listEl.innerHTML = '';
    const currentUsername = localStorage.getItem('username');
    const isMyGameActive = !isGameOver && floor > 1;

    // 서버에서 liveFloor 데이터를 보내준다고 가정합니다.
    // 1. 현재 진행 중인 게임 중 최고 기록 찾기
    const liveGames = scores.filter(s => s.liveFloor && s.liveFloor > 0);
    if (liveGames.length > 0) {
        // liveFloor 기준으로 내림차순 정렬
        liveGames.sort((a, b) => b.liveFloor - a.liveFloor);
        const topLivePlayer = liveGames[0];

        const headerEl = document.createElement('h4');
        headerEl.className = 'scoreboard-header';
        headerEl.innerText = '--- 실시간 최고 기록 ---';
        listEl.appendChild(headerEl);

        const flagHtml = getFlagImgHtml(topLivePlayer.country);
        const characterEmoji = getCharacterEmoji(topLivePlayer.characterClass);
        const liveRecordEl = document.createElement('div');
        liveRecordEl.className = 'scoreboard-item current-run'; // 강조 스타일 재사용
        
        // 만약 실시간 1위가 '나'라면, 가장 정확한 로컬 'floor' 변수 사용
        const liveFloor = (currentUsername && topLivePlayer.username === currentUsername && isMyGameActive) ? floor : topLivePlayer.liveFloor;

        const timeAgo = formatTimeAgo(topLivePlayer.liveDate);

        liveRecordEl.innerHTML = `
            <div>
                <div><span class="rank" style="color: #fde047;">🔥</span> <span class="name">${characterEmoji} ${flagHtml} ${topLivePlayer.username}</span></div>
                <div class="score" style="color: #fde047; font-size: 13px; padding-left: 28px; margin-top: 2px;">(${liveFloor}층 진행 중)</div>
            </div>
            <div class="score-time" style="color: #9ca3af; font-size: 14px;">${timeAgo}</div>
        `;
        listEl.appendChild(liveRecordEl);
    }

    // 2. 명예의 전당 (TOP 10 최종 기록) 표시
    if (scores && scores.length > 0) {
        if (listEl.children.length > 0) { // 구분선 추가
            const separator = document.createElement('hr');
            separator.style.borderColor = '#444';
            separator.style.margin = '12px 0';
            separator.style.borderStyle = 'solid';
            listEl.appendChild(separator);
        }

        const headerEl = document.createElement('h4');
        headerEl.className = 'scoreboard-header';
        headerEl.innerText = '--- 명예의 전당 (최종 기록) ---';
        listEl.appendChild(headerEl);

        const top10 = scores.slice(0, 10);

        top10.forEach((entry, index) => {
            const itemEl = document.createElement('div');
            itemEl.className = 'scoreboard-item';

            // 1위 강조
            if (index === 0) {
                itemEl.classList.add('top-ranker');
            }
            // 현재 로그인한 유저의 최고 기록을 강조 표시
            if (currentUsername && entry.username === currentUsername) {
                itemEl.classList.add('current-user-score');
            }

            const flagHtml = getFlagImgHtml(entry.country);
            const characterEmoji = getCharacterEmoji(entry.characterClass);

            // 3. 랭커가 현재 게임을 진행 중인 경우, 그 기록을 옆에 표시
            let progressHtml = '';
            // 서버에서 받은 liveFloor 데이터 사용
            if (entry.liveFloor && entry.liveFloor > 0) {
                 // 만약 랭커가 '나'라면, 가장 정확한 로컬 'floor' 변수 사용
                const liveFloor = (currentUsername && entry.username === currentUsername && isMyGameActive) ? floor : entry.liveFloor;
                progressHtml = `<div class="score-progress" style="color: #fde047; font-size: 13px; padding-left: 38px; margin-top: 2px;">(현재 ${liveFloor}층)</div>`;
            }

            const rankDisplay = index === 0 ? '👑' : `#${index + 1}`;
            const rankColor = index === 0 ? '#ffd700' : '#fbbf24';

            const timeAgo = formatTimeAgo(entry.date);

            itemEl.innerHTML = `
                <div>
                    <div><span class="rank" style="color: ${rankColor};">${rankDisplay}</span> <span class="name">${characterEmoji} ${flagHtml} ${entry.username}</span> <span class="score" style="margin-left: 8px;">(${entry.score} 층)</span></div>
                    ${progressHtml}
                </div>
                <div class="score-time" style="color: #9ca3af; font-size: 14px;">${timeAgo}</div>
            `;
            listEl.appendChild(itemEl);
        });
    }

    // 표시할 내용이 아무것도 없을 경우
    if (listEl.children.length === 0) {
        listEl.innerHTML = '<div class="scoreboard-item" style="justify-content: center;">기록된 점수가 없습니다.</div>';
    }
}

/**
 * 새로운 공지나 업데이트가 있는지 확인하고 'N' 배지를 표시합니다.
 * - 페이지 로드 시 한 번 호출됩니다.
 */
async function checkNewContent() {
    // 1. 공지사항 확인
    const latestVersion = updateHistory.length > 0 ? updateHistory[0].version : null;
    const lastSeenVersion = localStorage.getItem('lastSeenNoticeVersion');
    const hasNewNotice = latestVersion && latestVersion !== lastSeenVersion;
 
    const noticeBadgeGuest = document.getElementById('notice-new-badge-guest');
    const noticeBadgeLoggedIn = document.getElementById('notice-new-badge-loggedin');
    const scoreboardBadgeGuest = document.getElementById('scoreboard-new-badge-guest');
    const scoreboardBadgeLoggedIn = document.getElementById('scoreboard-new-badge-loggedin');
 
    if (hasNewNotice) {
        // 공지 'N' 배지 표시
        if (noticeBadgeGuest) noticeBadgeGuest.style.display = 'flex';
        if (noticeBadgeLoggedIn) noticeBadgeLoggedIn.style.display = 'flex';
 
        // 새로운 공지가 있으면 스코어보드도 확인하도록 플래그 설정
        localStorage.setItem('showScoreboardNewBadge', 'true');
    }
 
    // 2. 실시간 랭킹 변동 확인
    try {
        const response = await fetch(`${window.API_URL}/scores`);
        if (response.ok) {
            const scores = await response.json();
            const liveGames = scores.filter(s => s.liveFloor && s.liveFloor > 0);
            if (liveGames.length > 0) {
                liveGames.sort((a, b) => b.liveFloor - a.liveFloor);
                const topLivePlayer = liveGames[0];

                const lastSeen = JSON.parse(localStorage.getItem('lastSeenTopLivePlayer') || '{}');
                // 실시간 1위 유저가 바뀌었거나, 층수가 갱신되었을 때 'N' 표시 플래그 설정
                if (lastSeen.username !== topLivePlayer.username || lastSeen.liveFloor < topLivePlayer.liveFloor) {
                    localStorage.setItem('showScoreboardNewBadge', 'true');
                }
            }
        }
    } catch (error) {
        console.error("실시간 랭킹 확인 중 오류:", error);
    }
 
    // 3. 스코어보드 배지 최종 표시 결정
    if (localStorage.getItem('showScoreboardNewBadge') === 'true') {
        if (scoreboardBadgeGuest) scoreboardBadgeGuest.style.display = 'flex';
        if (scoreboardBadgeLoggedIn) scoreboardBadgeLoggedIn.style.display = 'flex';
    }
}

/**
 * 공지사항 모달을 엽니다.
 */
function openNoticeModal() {
    playSound('click');
    const modal = document.getElementById('notice-modal');

    // 화면이 작은 기기에서 모달 내용이 잘리는 것을 방지하기 위해
    // 모달 컨텐츠에 최대 높이와 스크롤을 적용합니다.
    const modalContent = modal.querySelector('.notice-content');
    if (modalContent) {
        modalContent.style.maxHeight = '85vh';
        modalContent.style.overflowY = 'auto';
    }

    modal.style.display = 'flex';
    setTimeout(() => {
        modal.classList.add('visible');
    }, 10);
}

/**
 * 공지사항 모달을 닫습니다.
 */
function closeNoticeModal() {
    playSound('click');
    const modal = document.getElementById('notice-modal');
    modal.classList.remove('visible');
    setTimeout(() => {
        modal.style.display = 'none';
    }, 300);
}

/**
 * 게임 오버 모달을 표시합니다.
 * @param {number} score - 최종 점수 (도달한 층).
 */
function showGameOverModal(score, characterClass) {
    const modal = document.getElementById('game-over-modal');
    document.getElementById('final-score').innerText = score;

    // 캐릭터 정보 표시
    let charInfoEl = document.getElementById('final-character-display');
    if (!charInfoEl) {
        charInfoEl = document.createElement('p');
        charInfoEl.id = 'final-character-display';
        charInfoEl.style.fontSize = '1.2rem';
        charInfoEl.style.marginTop = '15px';
        charInfoEl.style.color = '#eee';
        
        const scoreEl = document.getElementById('final-score');
        if (scoreEl && scoreEl.parentElement) {
            scoreEl.parentElement.insertAdjacentElement('afterend', charInfoEl);
        }
    }

    const charData = characterData[characterClass];
    if (charData) {
        charInfoEl.innerHTML = `플레이한 캐릭터: ${charData.emoji} ${charData.name}`;
    }

    modal.style.display = 'flex';
    setTimeout(() => {
        modal.classList.add('visible');
    }, 10);
}

/**
 * 게임 오버 모달을 닫습니다.
 */
function closeGameOverModal() {
    const modal = document.getElementById('game-over-modal');
    modal.classList.remove('visible');
    // transition 애니메이션이 끝난 후 display를 none으로 변경합니다.
    setTimeout(() => {
        modal.style.display = 'none';
    }, 500); // CSS의 transition 시간과 일치해야 합니다.
}

/**
 * 게임 오버 화면에서 '새 게임' 버튼 클릭을 처리합니다.
 */
function handleNewGameFromGameOver() {
    closeGameOverModal();
    // 캐릭터 선택창을 열도록 수정 (isLoggedIn()은 script.js에 정의됨)
    openCharacterSelectModal(isLoggedIn());
}

/**
 * 게임 오버 화면에서 '메인으로' 버튼 클릭을 처리합니다.
 */
function handleToMainFromGameOver() {
    closeGameOverModal();
    showStartMenu();
}

/**
 * 캐릭터 선택 창을 여는 함수
 * @param {boolean} isLoggedIn - 로그인 상태 여부
 */
function openCharacterSelectModal(isLoggedIn) {
    playSound('click');
    // '모험 시작' 버튼이 startNewGame을 올바르게 호출하도록 플래그를 window 객체에 저장합니다.
    window.isNewGameForLoggedInUser = isLoggedIn;

    // 캐릭터 카드를 동적으로 생성하고 스탯 정보를 렌더링합니다.
    renderCharacterCards();
    renderCharacterSelectStats();

    const modal = document.getElementById('character-select-modal');
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('visible'), 10);
}

/**
 * data.js의 characterData를 기반으로 캐릭터 선택 카드들을 동적으로 생성합니다.
 * - 이 함수는 캐릭터 카드가 HTML에 하드코딩되어 있지 않아도 동작하도록 보장합니다.
 */
function renderCharacterCards() {
    const characterListEl = document.getElementById('character-list');
    if (!characterListEl || typeof characterData === 'undefined') return;

    // 이미 모든 캐릭터 카드가 렌더링되었다면 중복 생성을 방지합니다.
    const existingCardCount = characterListEl.children.length;
    const totalCharacterCount = Object.keys(characterData).length;
    if (existingCardCount === totalCharacterCount) {
        return;
    }

    characterListEl.innerHTML = ''; // 기존 카드를 모두 지우고 새로 생성

    for (const id in characterData) {
        const char = characterData[id];
        const cardEl = document.createElement('div');
        cardEl.className = 'character-card';
        cardEl.dataset.characterId = id;
        cardEl.setAttribute('onclick', `selectCharacter('${id}')`);
        cardEl.innerHTML = `
            <div class="character-card-emoji">${char.emoji}</div>
            <h3 class="character-card-name">${char.name}</h3>
            <p class="character-card-desc">${char.description}</p>
        `;
        characterListEl.appendChild(cardEl);
    }
}

/**
 * 캐릭터 선택 모달의 각 캐릭터 카드에 기본 스탯을 렌더링합니다.
 * - data.js의 characterData를 참조합니다.
 * - 용사(hero)를 기준으로 스탯이 높으면 초록색, 낮으면 빨간색으로 표시합니다.
 */
function renderCharacterSelectStats() {
    // characterData가 로드되었는지 확인
    if (typeof characterData === 'undefined') return;

    const heroStats = characterData.hero.stats;

    for (const id in characterData) {
        const card = document.querySelector(`.character-card[data-character-id="${id}"]`);
        if (!card) continue;

        // 스탯이 이미 렌더링되었다면 중복 생성 방지
        if (card.querySelector('.character-stats')) continue;

        const statsContainer = document.createElement('div');
        statsContainer.className = 'character-stats';

        const createStatLi = (label, value, baseValue, suffix = '') => {
            let style = '';
            // 용사 자신은 비교하지 않음
            if (id !== 'hero') {
                if (value > baseValue) {
                    style = 'style="color: #22c55e; font-weight: bold;"'; // 초록색
                } else if (value < baseValue) {
                    style = 'style="color: #ef4444; font-weight: bold;"'; // 빨간색
                }
            }
            return `<li ${style}>- ${label}: ${value}${suffix}</li>`;
        };
        let statsHtml = '<ul>';
        statsHtml += createStatLi('최대 HP', characterData[id].stats.hp, heroStats.hp);
        statsHtml += createStatLi('최대 MP', characterData[id].stats.mp, heroStats.mp);
        statsHtml += createStatLi('기본 ATK', characterData[id].stats.atk, heroStats.atk);
        statsHtml += createStatLi('기본 회피율', characterData[id].stats.evasion, heroStats.evasion, '%');
        statsHtml += createStatLi('기본 치명타율', characterData[id].stats.crit, heroStats.crit, '%');
        statsHtml += '</ul>';

        statsContainer.innerHTML = `
            <h4 style="margin-top: 12px; margin-bottom: 5px; border-top: 1px solid #444; padding-top: 12px;">기본 능력치</h4>
            ${statsHtml}
        `;

        // 생성된 스탯 정보를 캐릭터 설명(<p>) 뒤에 추가
        const description = card.querySelector('p');
        if (description) {
            description.insertAdjacentElement('afterend', statsContainer);
        } else {
            card.appendChild(statsContainer);
        }
    }
}

/**
 * 캐릭터 선택 창을 닫는 함수
 */
function closeCharacterSelectModal() {
    const modal = document.getElementById('character-select-modal');
    modal.classList.remove('visible');
    setTimeout(() => modal.style.display = 'none', 300);
}

/**
 * 캐릭터 선택 창에서 메인 메뉴로 돌아가는 함수.
 */
function goBackToMainMenuFromCharSelect() {
    closeCharacterSelectModal();
    showStartMenu();
}

/**
 * `updates.js`의 공지사항 데이터를 받아 UI에 렌더링합니다.
 * @param {Array<object>} notices - `{ version, date, summary, file }` 형태의 배열.
 */
function renderNotices(notices) {
    const listEl = document.getElementById('notice-list');
    listEl.innerHTML = '';

    if (!notices || notices.length === 0) {
        listEl.innerHTML = '<div class="notice-item" style="text-align: center;">공지사항이 없습니다.</div>';
        return;
    }

    notices.forEach(notice => {
        const itemEl = document.createElement('div');
        itemEl.className = 'notice-item';
        // 클릭 시 상세 내용을 토글하는 함수 호출
        itemEl.setAttribute('onclick', `toggleNoticeDetail(this, '${notice.file}')`);
        itemEl.innerHTML = `
            <div class="notice-item-header">
                <span class="notice-version">${notice.version}</span>
                <span class="notice-date">${notice.date}</span>
            </div>
            <p class="notice-summary">${notice.summary}</p>
            <div class="notice-details"></div> <!-- 상세 내용이 표시될 영역 -->
        `;
        listEl.appendChild(itemEl);
    });
}

/**
 * 인벤토리 관리 모달(장비, 전리품, 스탯)을 엽니다.
 * - `activeTab` 파라미터에 따라 해당 탭의 내용만 보여줍니다.
 * @param {'equipment' | 'loot' | 'stats'} activeTab - 표시할 탭.
 */
function openInventoryModal(activeTab) {
    playSound('click');
    // 스탯 분배를 위한 임시 변수 초기화
    tempStatPoints = player.statPoints;
    tempStats = { str: player.str, vit: player.vit, mag: player.mag, mnd: player.mnd, agi: player.agi, int: player.int, luk: player.luk, fcs: player.fcs };

    const modal = document.getElementById('equipment-modal');
    
    // 전리품 섹션이 없으면 동적으로 생성
    const container = modal.querySelector('.management-container');
    let lootSection = document.getElementById('loot-management-section');
    if (!lootSection) {
        lootSection = document.createElement('div');
        lootSection.id = 'loot-management-section';
        lootSection.className = 'management-section';
        lootSection.innerHTML = `
            <h3 style="text-align: center; margin-bottom: 15px;">💎 전리품</h3>
            <div id="loot-inventory-list" class="equipment-list" style="max-height: 60vh; overflow-y: auto;"></div>
        `;
        // 스탯 섹션 앞에 전리품 섹션 삽입
        const statSectionEl = document.getElementById('stat-management-section');
        if (statSectionEl) {
            container.insertBefore(lootSection, statSectionEl);
        } else {
            container.appendChild(lootSection);
        }
    }

    // 모달 내용 렌더링 (UI에 요소가 존재하도록 보장)
    renderStatUpModal();
    renderEquipment();
    renderLootInventory();

    // --- 섹션 및 UI 요소 가져오기 ---
    const modalTitleEl = modal.querySelector('.shop-title');
    const equipmentSection = document.getElementById('equipment-management-section');
    const statSection = document.getElementById('stat-management-section');
    // lootSection은 위에서 이미 정의 및 생성됨

    // --- 모든 관련 섹션 숨기기 ---
    if (equipmentSection) equipmentSection.style.display = 'none';
    if (lootSection) lootSection.style.display = 'none';
    if (statSection) statSection.style.display = 'none';

    switch (activeTab) {
        case 'equipment':
            if (modalTitleEl) modalTitleEl.innerText = '🛡️ 장비 관리';
            if (equipmentSection) equipmentSection.style.display = 'flex';
            break;
        case 'loot':
            if (modalTitleEl) modalTitleEl.innerText = '💎 전리품';
            if (lootSection) lootSection.style.display = 'flex';
            break;
        case 'stats':
            if (modalTitleEl) modalTitleEl.innerText = '📊 스탯 분배';
            if (statSection) statSection.style.display = 'flex';
            break;
    }

    modal.style.display = 'flex';
}

/**
 * 인벤토리(장비/전리품/스탯) 관리 모달을 닫습니다.
 */
function closeInventoryModal() {
    playSound('click');
    document.getElementById('equipment-modal').style.display = 'none';
}

/**
 * 장비 관리 모달을 닫는 함수 (HTML과의 호환성을 위해 유지).
 * - `closeInventoryModal`을 호출합니다.
 */
function closeEquipment() {
    closeInventoryModal();
}

/**
 * 보유 중인 전리품 목록과 그 효과를 UI에 렌더링합니다.
 */
function renderLootInventory() {
    const listEl = document.getElementById('loot-inventory-list');
    listEl.innerHTML = '';
    if (player.lootInventory.length === 0) {
        listEl.innerHTML = '<div class="inventory-item" style="justify-content: center;">보유한 전리품이 없습니다.</div>';
    } else {
        player.lootInventory.forEach((loot, index) => {
            const itemEl = document.createElement('div');
            itemEl.className = 'inventory-item';
            
            let statInfoText = '특별 효과';
            if (loot.type === 'permanent_stat') {
                statInfoText = `${statInfo[loot.stat].name} +${loot.value}`;
            } else if (loot.type === 'gold_bonus') {
                statInfoText = `골드 획득량 +${loot.value * 100}%`;
            } else if (loot.type === 'xp_bonus') {
                statInfoText = `경험치 획득량 +${loot.value * 100}%`;
            }

            itemEl.innerHTML = `
                <div class="item-info">
                    <h4>${loot.name} <span style="color: #f59e0b; font-size: 16px;">(${statInfoText})</span></h4>
                    <p style="color: #ccc; font-size: 14px;">판매 가격: ${loot.sellPrice}G</p>
                </div>
                <div class="item-passive-effect">보유 효과</div>
            `;
            listEl.appendChild(itemEl);
        });
    }
}

/**
 * 장비 관리 UI(현재 착용 장비, 보유 장비 목록)를 렌더링합니다.
 */
function renderEquipment() {
    // 현재 착용 장비 표시
    const currentDisplay = document.getElementById('current-equipment-display');
    const currentArmorName = player.equippedArmor ? player.equippedArmor.name : '없음';
    const currentWeaponName = player.equippedWeapon ? player.equippedWeapon.name : '없음';
    currentDisplay.innerHTML = `
        <div class="current-equipment-item">현재 방어구: ${currentArmorName}</div>
        <div class="current-equipment-item">현재 무기: ${currentWeaponName}</div>
    `;

    // 보유 방어구 목록 렌더링
    const armorListEl = document.getElementById('equipment-armor-list');
    // 모바일에서 스크롤이 가능하도록 스타일을 추가합니다.
    armorListEl.style.maxHeight = '15vh';
    armorListEl.style.overflowY = 'auto';
    armorListEl.innerHTML = '';
    if (player.armorInventory.length === 0) {
        armorListEl.innerHTML = '<div class="inventory-item">보유한 방어구가 없습니다.</div>';
    } else {
        player.armorInventory.forEach((armor, index) => {
            const isEquipped = player.equippedArmor && player.equippedArmor.name === armor.name;
            const itemEl = document.createElement('div');
            itemEl.className = 'inventory-item';

            let buttonsHtml = `<button class="btn-use" onclick="equipItem('armor', ${index})" ${isEquipped ? 'disabled' : ''}>${isEquipped ? '착용중' : '착용'}</button>`;
            if (!isEquipped) {
                const sellPrice = Math.floor(armor.cost * 0.8);
                buttonsHtml += `<button class="btn-sell" onclick="sellEquipment('armor', ${index})">판매 (${sellPrice}G)</button>`;
            }

            itemEl.innerHTML = `
                <div class="item-info">${armor.emoji} ${armor.name} (+체력 ${armor.maxHpBonus})</div>
                <div class="item-buttons">
                    ${buttonsHtml}
                </div>
            `;
            armorListEl.appendChild(itemEl);
        });
    }

    // 보유 무기 목록 렌더링
    const weaponListEl = document.getElementById('equipment-weapon-list');
    // 모바일에서 스크롤이 가능하도록 스타일을 추가합니다.
    weaponListEl.style.maxHeight = '15vh';
    weaponListEl.style.overflowY = 'auto';
    weaponListEl.innerHTML = '';
    if (player.weaponInventory.length === 0) {
        weaponListEl.innerHTML = '<div class="inventory-item">보유한 무기가 없습니다.</div>';
    } else {
        player.weaponInventory.forEach((weapon, index) => {
            const isEquipped = player.equippedWeapon && player.equippedWeapon.name === weapon.name;
            const itemEl = document.createElement('div');
            itemEl.className = 'inventory-item';

            let buttonsHtml = `<button class="btn-use" onclick="equipItem('weapon', ${index})" ${isEquipped ? 'disabled' : ''}>${isEquipped ? '착용중' : '착용'}</button>`;
            if (!isEquipped) {
                const sellPrice = Math.floor(weapon.cost * 0.8);
                buttonsHtml += `<button class="btn-sell" onclick="sellEquipment('weapon', ${index})">판매 (${sellPrice}G)</button>`;
            }

            itemEl.innerHTML = `
                <div class="item-info">${weapon.emoji} ${weapon.name} (+공격력 ${weapon.atkBonus})</div>
                <div class="item-buttons">${buttonsHtml}</div>
            `;
            weaponListEl.appendChild(itemEl);
        });
    }
}

/**
 * 상점 모달을 엽니다.
 * @param {boolean} [auto=false] - 5층마다 자동으로 열렸는지 여부. `true`이면 상점을 닫을 때 자동으로 다음 층으로 이동합니다.
 */
function openShop(auto = false) {
    if (!auto) playSound('click');
    isShopAutoOpened = auto;
    const modal = document.getElementById('shop-modal');
    modal.style.display = 'flex';

    // 모바일 환경에서 상점 내용이 잘리는 것을 방지하기 위해
    // 모달 컨텐츠에 최대 높이와 스크롤을 적용합니다.
    const modalContent = modal.querySelector('.modal-content');
    if (modalContent) {
        modalContent.style.maxHeight = '90vh';
        modalContent.style.overflowY = 'auto';
    }

    document.getElementById('shop-coins').innerText = player.coins;

    // 전리품 판매 섹션이 없으면 동적으로 생성
    const shopContainer = modal.querySelector('.shop-container');
    let sellRow = document.getElementById('sell-loot-row');
    if (!sellRow) {
        sellRow = document.createElement('div');
        sellRow.id = 'sell-loot-row';
        sellRow.className = 'shop-row';
        sellRow.innerHTML = `
            <div class="shop-section" style="flex: 1 1 100%;">
                <h3>전리품 판매</h3>
                <div id="sell-loot-items" class="shop-items"></div>
            </div>
        `;
        shopContainer.appendChild(sellRow);
    }

    renderShopItems();
    log("떠돌이 상인을 만났습니다.", 'log-system');
}

/**
 * 상점 모달을 닫고, 자동으로 열렸던 경우 다음 층으로 진행합니다.
 */
function closeShop() {
    playSound('click');
    document.getElementById('shop-modal').style.display = 'none';
    updateUI(); // 상점에서 나온 후 UI 갱신
    if (isShopAutoOpened) {
        isShopAutoOpened = false;
        nextFloor();
    }
}

/**
 * 상점에서 판매하는 모든 아이템 목록을 UI에 렌더링합니다.
 */
function renderShopItems() {
    const armorContainer = document.getElementById('armor-shop-items');
    armorContainer.innerHTML = '';
    armorList.forEach(armor => {
        const isEquipped = player.equippedArmor && player.equippedArmor.name === armor.name;
        const button = document.createElement('button');
        button.className = 'shop-btn';
        button.disabled = isEquipped;
        button.innerHTML = `
            <div class="armor-emoji">${armor.emoji}</div>
            ${armor.name}<br>
            (최대체력 +${armor.maxHpBonus})<br>
            <span>${isEquipped ? '착용중' : armor.cost + ' G'}</span>
        `;
        button.onclick = () => buyItem('armor', armor.cost, armor);
        armorContainer.appendChild(button);
    });

    const healContainer = document.getElementById('heal-potion-shop-items');
    healContainer.innerHTML = '';
    healPotionList.forEach(potion => {
        const button = document.createElement('button');
        button.className = 'shop-btn';
        const healText = potion.healAmount === 9999 ? 'MAX' : `+${potion.healAmount}`;
        button.innerHTML = `
            ${potion.name}<br>
            (체력 ${healText} 회복)<br>
            <span>${potion.cost} G</span>
        `;
        button.onclick = () => buyItem('heal', potion.cost, potion);
        healContainer.appendChild(button);
    });

    const mpContainer = document.getElementById('mp-potion-shop-items');
    mpContainer.innerHTML = '';
    mpPotionList.forEach(potion => {
        const button = document.createElement('button');
        button.className = 'shop-btn';
        const mpText = potion.mpAmount === 9999 ? 'MAX' : `+${potion.mpAmount}`;
        button.innerHTML = `
            ${potion.name}<br>
            (마나 ${mpText} 회복)<br>
            <span>${potion.cost} G</span>
        `;
        button.onclick = () => buyItem('mpPotion', potion.cost, potion);
        mpContainer.appendChild(button);
    });

    const buffContainer = document.getElementById('buff-potion-shop-items');
    buffContainer.innerHTML = '';
    buffPotionList.forEach(potion => {
        const button = document.createElement('button');
        button.className = 'shop-btn';
        button.innerHTML = `
            ${potion.name}<br>
            (${potion.mult}배 / ${potion.turns}턴)<br>
            <span>${potion.cost} G</span>
        `;
        button.onclick = () => buyItem('buff', potion.cost, potion);
        buffContainer.appendChild(button);
    });
    
    const critContainer = document.getElementById('crit-potion-shop-items');
    critContainer.innerHTML = '';
    critPotionList.forEach(potion => {
        const button = document.createElement('button');
        button.className = 'shop-btn';
        button.innerHTML = `
            ${potion.name}<br>
            (치명타 +${potion.bonus}% / ${potion.turns}턴)<br>
            <span>${potion.cost} G</span>
        `;
        button.onclick = () => buyItem('critBuff', potion.cost, potion);
        critContainer.appendChild(button);
    });

    const weaponContainer = document.getElementById('weapon-shop-items');
    weaponContainer.innerHTML = '';
    weaponList.forEach(weapon => {
        const isEquipped = player.equippedWeapon && player.equippedWeapon.name === weapon.name;
        const button = document.createElement('button');
        button.className = 'shop-btn';
        button.disabled = isEquipped;
        button.innerHTML = `
            <div class="armor-emoji">${weapon.emoji}</div>
            ${weapon.name}<br>
            (공격력 +${weapon.atkBonus})<br>
            <span>${isEquipped ? '착용중' : weapon.cost + ' G'}</span>
        `;
        button.onclick = () => buyItem('weapon', weapon.cost, weapon);
        weaponContainer.appendChild(button);
    });

    // 전리품 판매 목록 렌더링
    renderSellableLoot();
}

/**
 * 판매 가능한 전리품 목록을 상점 UI에 렌더링합니다.
 */
function renderSellableLoot() {
    const sellContainer = document.getElementById('sell-loot-items');
    sellContainer.innerHTML = '';

    if (player.lootInventory.length === 0) {
        sellContainer.innerHTML = '<div class="shop-btn" style="justify-content: center; color: #888;">판매할 전리품이 없습니다.</div>';
        return;
    }

    player.lootInventory.forEach((loot, index) => {
        const button = document.createElement('button');
        button.className = 'shop-btn';

        let effectText = '특별 효과';
        if (loot.type === 'permanent_stat') {
            effectText = `${statInfo[loot.stat].name} +${loot.value}`;
        } else if (loot.type === 'gold_bonus') {
            effectText = `골드 획득량 +${loot.value * 100}%`;
        } else if (loot.type === 'xp_bonus') {
            effectText = `경험치 획득량 +${loot.value * 100}%`;
        }

        button.innerHTML = `
            ${loot.name} <span style="font-size: 14px; color: #f59e0b;">(${effectText})</span><br>
            <span>판매 가격: ${loot.sellPrice} G</span>
        `;
        button.onclick = () => sellLootItem(index);
        sellContainer.appendChild(button);
    });
}

/**
 * (사용되지 않음) 인벤토리 모달을 여는 함수.
 */
function openInventory() {
    document.getElementById('inventory-modal').style.display = 'flex';
    renderInventory();
}

/**
 * (사용되지 않음) 인벤토리 모달을 닫는 함수.
 */
function closeInventory() {
    document.getElementById('inventory-modal').style.display = 'none';
}

/**
 * (사용되지 않음) 인벤토리 모달의 내용을 렌더링하는 함수.
 */
function renderInventory() {
    const list = document.getElementById('inventory-list');
    list.innerHTML = '';
    const groupedInventory = {};
    player.inventory.forEach(item => {
        if (!groupedInventory[item.name]) {
            groupedInventory[item.name] = { ...item, count: 0 };
        }
        groupedInventory[item.name].count++;
    });

    for (const name in groupedInventory) {
        const itemGroup = groupedInventory[name];
        const itemEl = document.createElement('div');
        itemEl.className = 'inventory-item';
        
        let emoji = '';
        if (itemGroup.type === 'heal') emoji = '💊';
        else if (itemGroup.type === 'buff') emoji = '🧪';
        else if (itemGroup.type === 'mpPotion') emoji = '💧';

        itemEl.innerHTML = `<div class="item-info">${emoji} ${itemGroup.name} (보유: ${itemGroup.count}개)</div>`;
        list.appendChild(itemEl);
    }

    if (list.innerHTML === '') {
        list.innerHTML = '<div class="inventory-item">인벤토리가 비어있습니다.</div>';
    }
}