//! =================================================================
//! ui-game.js
//!
//! 이 파일은 핵심 게임 플레이 화면의 UI 렌더링 및 조작을 담당합니다.
//! - 정보 출력 (로그, 데미지 텍스트)
//! - 게임 상태 UI 업데이트 (체력바, 몬스터, 버프 아이콘 등)
//! - 컨트롤 패널 관리 (스킬, 아이템 버튼 등)
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
        const fireballDmg = Math.floor(player.atk * 2.0 + player.magicDamageBonus);
        const beamDmg = Math.floor(player.atk * 2.5 + player.magicDamageBonus);
        const iceWallBtnStyle = `background-color: ${player.iceWall.active ? '#60a5fa' : '#3b82f6'};`;

        const domainButtonHtml = player.domainActive
            ? `<button class="btn-defend-active" onclick="deactivateDomain()">🌀 영역 해제<br><span class="skill-desc">(MP 0 / 턴 미소모)</span></button>`
            : (floor < player.domainCooldownUntilFloor
                ? `<button class="btn-attack" disabled style="background: linear-gradient(45deg, #555, #333);">
                       ☄️ 영역 재사용 대기<br><span class="skill-desc">(${player.domainCooldownUntilFloor}층부터 사용 가능)</span>
                   </button>`
                : `<button class="btn-attack" style="background: linear-gradient(45deg, #8b5cf6, #c084fd);" onclick="activateDomain('wizard')">
                    ☄️ 영역 전개: 진리의 문 (眞理之門)<br><span class="skill-desc">(MP 50 / 턴 미소모)</span>
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

        const domainButtonHtml = player.domainActive
            ? `<button class="btn-defend-active" onclick="deactivateDomain()">🌀 영역 해제<br><span class="skill-desc">(MP 0 / 턴 미소모)</span></button>`
            : (floor < player.domainCooldownUntilFloor
                ? `<button class="btn-attack" disabled style="background: linear-gradient(45deg, #555, #333);">
                       🌙 영역 재사용 대기<br><span class="skill-desc">(${player.domainCooldownUntilFloor}층부터 사용 가능)</span>
                   </button>`
                : `<button class="btn-attack" style="background: linear-gradient(45deg, #4c1d95, #1e293b);" onclick="activateDomain('rogue')">
                       🌙 영역 전개: 환영의 장막 (幻影之帳幕)<br><span class="skill-desc">(MP 35 / 턴 미소모)</span>
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

        const domainButtonHtml = player.domainActive
            ? `<button class="btn-defend-active" onclick="deactivateDomain()">🌀 영역 해제<br><span class="skill-desc">(MP 0 / 턴 미소모)</span></button>`
            : (floor < player.domainCooldownUntilFloor
                ? `<button class="btn-attack" disabled style="background: linear-gradient(45deg, #555, #333);">
                       🌟 영역 재사용 대기<br><span class="skill-desc">(${player.domainCooldownUntilFloor}층부터 사용 가능)</span>
                   </button>`
                : `<button class="btn-attack" style="background: linear-gradient(45deg, #facc15, #fef08a); color: #422006;" onclick="activateDomain('paladin')">
                       🌟 영역 전개: 천벌의 성역 (天罰之聖域)<br><span class="skill-desc">(MP 45 / 턴 미소모)</span>
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
        controlsPanel.innerHTML = `
            <button class="btn-attack" onclick="executeNormalAttack()">⚔️ ${normalAttackName}<br><span class="skill-desc">(피해량: ${player.atk})</span></button>
            <button class="btn-attack" style="background-color: #c12828;" onclick="executeLuckyPunch()">🎲 럭키 펀치<br><span class="skill-desc">(MP 10 / 피해량: ${luckyPunchDmg})</span></button>
            <button class="btn-attack" style="background-color: #9a2020;" onclick="executeThrowPunchingMachine()">🎰 펀칭머신 던지기<br><span class="skill-desc">(MP 15 / 피해량: ${machineThrowDmg})</span></button>
            <button class="btn-buff" style="background-color: #f59e0b;" onclick="executeSpinRoulette()">🎡 룰렛 돌리기<br><span class="skill-desc">(MP 20 / 무작위 버프)</span></button>
            <button class="btn-heal" style="background-color: #ca8a04;" onclick="executeCoinToss()">💰 코인 토스<br><span class="skill-desc">(MP 15 / 회복 or 공격)</span></button>
            <button class="btn-attack" style="background: linear-gradient(45deg, #16a34a, #facc15);" onclick="executeAllIn()">🃏 올인<br><span class="skill-desc">(MP 30 / 운명의 한 판)</span></button>
            <button class="btn-inventory btn-back" onclick="showMainControls()" style="grid-column: 1 / -1;">↩️ 뒤로가기${emptyDesc}</button>
        `;
    } else if (player.characterClass === 'necromancer') {
        // 네크로맨서 스킬 UI
        const soulPunchDmg = Math.floor(player.atk * 2.1 + player.magicDamageBonus);
        const spiritVortexDmg = Math.floor(player.atk * 1.3 + player.magicDamageBonus);

        const domainButtonHtml = player.domainActive
            ? `<button class="btn-defend-active" onclick="deactivateDomain()">🌀 영역 해제<br><span class="skill-desc">(MP 0 / 턴 미소모)</span></button>`
            : (floor < player.domainCooldownUntilFloor
                ? `<button class="btn-attack" disabled style="background: linear-gradient(45deg, #555, #333);">
                       💥 영역 재사용 대기<br><span class="skill-desc">(${player.domainCooldownUntilFloor}층부터 사용 가능)</span>
                   </button>`
                : `<button class="btn-attack" style="background: linear-gradient(45deg, #581c87, #0f172a);" onclick="activateDomain('necromancer')">
                       💥 영역 전개: 사혼의 연회 (死魂之宴會)<br><span class="skill-desc">(MP 35 / 턴 미소모)</span>
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
    } else {
        // 기본 용사 스킬 데미지 계산
        const powerAttackDmg = Math.floor(player.atk * 2.0 + player.magicDamageBonus);
        const sweepAttackDmg = Math.floor(player.atk * 0.8 + player.magicDamageBonus);
        const finalBlowDmg = Math.floor(player.atk * 4.0 + player.magicDamageBonus);
        const shoutBtnStyle = `background-color: ${player.shoutOfResolveBuff.active ? '#fb923c' : '#f97316'};`;

        controlsPanel.innerHTML = `
            <button class="btn-attack" onclick="executeNormalAttack()">⚔️ ${normalAttackName}<br><span class="skill-desc">(피해량: ${player.atk})</span></button>
            <button class="btn-attack" style="background-color: #c12828;" onclick="executePowerAttack()">💥 강 공격<br><span class="skill-desc">(MP 15 / 피해량: ${powerAttackDmg})</span></button>
            <button class="btn-attack" style="background-color: #9a2020;" onclick="executeSweepAttack()">🌪️ 휩쓸기<br><span class="skill-desc