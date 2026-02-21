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

        const monsterWrapper = document.createElement('div');
        monsterWrapper.className = 'monster-wrapper';
        if (isTargeted) monsterWrapper.classList.add('targeted');
        if (isDead) monsterWrapper.classList.add('dead');

        // 몬스터 클릭 시 타겟으로 지정하는 이벤트 추가
        monsterWrapper.setAttribute('onclick', `selectTarget(${index})`);

        monsterWrapper.innerHTML = `
            <div class="stun-indicator ${isStunned ? 'visible' : ''}">💫</div>
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

    // 스킬 데미지 계산 (마력 스탯 적용)
    const powerAttackDmg = Math.floor(player.atk * 2.0 + player.magicDamageBonus);
    const sweepAttackDmg = Math.floor(player.atk * 0.8 + player.magicDamageBonus); // 휩쓸기는 광역이라 기본 공격력의 80%로 표시

    controlsPanel.innerHTML = `
        <button class="btn-attack" onclick="executeNormalAttack()">⚔️ 일반 공격<br><span class="skill-desc">(피해량: ${player.atk})</span></button>
        <button class="btn-attack" style="background-color: #c12828;" onclick="executePowerAttack()">💥 강 공격<br><span class="skill-desc">(MP 15 / 피해량: ${powerAttackDmg})</span></button>
        <button class="btn-attack" style="background-color: #9a2020;" onclick="executeSweepAttack()">🌪️ 휩쓸기<br><span class="skill-desc">(MP 25 / 피해량: ${sweepAttackDmg})</span></button>
        <button class="${defenseBtnClass}" onclick="toggleDefenseStance()">🛡️ 방어 태세<br><span class="skill-desc">(MP 10)</span></button>
        <button class="btn-inventory btn-back" onclick="showMainControls()">↩️ 뒤로가기</button>
    `;
}

/**
 * 메인 컨트롤 버튼(스킬, 물약, 장비 등)들을 보여줍니다.
 */
function showMainControls() {
    playSound('click');
    if (isGameOver) return;
    const controlsPanel = document.getElementById('controls-panel');
    controlsPanel.classList.remove('skill-view');
    const saveButton = isLoggedIn() ? `<button class="btn-buff" onclick="saveGame()">💾 저장</button>` : `<button class="btn-buff" disabled title="로그인 시 사용 가능">💾 저장</button>`;
    controlsPanel.innerHTML = `
        <button class="btn-attack" onclick="showSkillSelection()">⚔️ 스킬</button>
        <button class="btn-heal" onclick="showAllPotions()">🧪 물약</button>
        ${saveButton}
        <button class="btn-armor" onclick="openInventoryModal('equipment')">🛡️ 장비</button>
        <button class="btn-inventory" onclick="openInventoryModal('loot')">💎 전리품</button>
        <button class="btn-buff" onclick="openInventoryModal('stats')">📊 스탯</button>
    `;
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
            if (itemGroup.type === 'heal') emoji = '💊';
            else if (itemGroup.type === 'buff') emoji = '🧪';
            else if (itemGroup.type === 'critBuff') emoji = '🔮';
            else if (itemGroup.type === 'mpPotion') emoji = '💧';

            itemEl.innerHTML = `
                <div class="item-info">${emoji} ${itemGroup.name} (보유: ${itemGroup.count}개)</div>
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
    let lootGoldBonus = 0; // 골드 보너스 전리품을 위한 변수 추가
    player.lootInventory.forEach(loot => {
        if (loot.type === 'permanent_stat' && lootBonuses.hasOwnProperty(loot.stat)) {
            lootBonuses[loot.stat] += loot.value;
        } else if (loot.type === 'gold_bonus') { // 골드 보너스 타입 처리
            lootGoldBonus += loot.value;
        }
    });

    // "현재" 값 (버프 제외, 순수 스탯/장비 효과만)
    const currentAtk = player.baseAtk + ((player.str + lootBonuses.str) * 2) + weaponBonus;
    const currentMaxHp = player.baseMaxHp + ((player.vit + lootBonuses.vit) * 5) + armorBonus;
    const currentMaxMp = player.baseMaxMp + ((player.mnd + lootBonuses.mnd) * 5);
    const currentCritChance = 11 + ((player.luk + lootBonuses.luk) * 0.7);
    const currentEvasionChance = 4 + ((player.agi + lootBonuses.agi) * 3);
    const currentGoldBonus = 1 + ((player.int + lootBonuses.int) * 0.02) + lootGoldBonus;
    const currentBlackFlashChance = 0.008 + ((player.fcs + lootBonuses.fcs) * 0.004);

    // "임시" 값 (스탯 분배 후 + 전리품 효과 포함)
    const tempAtk = player.baseAtk + ((tempStats.str + lootBonuses.str) * 2) + weaponBonus;
    const tempMaxHp = player.baseMaxHp + ((tempStats.vit + lootBonuses.vit) * 5) + armorBonus;
    const tempMaxMp = player.baseMaxMp + ((tempStats.mnd + lootBonuses.mnd) * 5);
    const tempCritChance = 11 + ((tempStats.luk + lootBonuses.luk) * 0.7);
    const tempEvasionChance = 4 + ((tempStats.agi + lootBonuses.agi) * 3);
    const tempGoldBonus = 1 + ((tempStats.int + lootBonuses.int) * 0.02) + lootGoldBonus;
    const tempBlackFlashChance = 0.008 + ((tempStats.fcs + lootBonuses.fcs) * 0.004);

    // --- 스킬 추가 피해 미리보기 계산 ---
    const currentMagicDamageBonus = ((player.mag + lootBonuses.mag) * 2.0);
    const tempMagicDamageBonus = ((tempStats.mag + lootBonuses.mag) * 2.0);

    currentValuesEl.innerHTML = `
        공격력: ${currentAtk} → ${tempAtk} | 최대체력: ${currentMaxHp} → ${tempMaxHp}<br>
        최대MP: ${currentMaxMp} → ${tempMaxMp} | 회피: ${currentEvasionChance.toFixed(1)}% → ${tempEvasionChance.toFixed(1)}%<br>
        치명타: ${currentCritChance.toFixed(1)}% → ${tempCritChance.toFixed(1)}% | 골드 보너스: ${((currentGoldBonus - 1) * 100).toFixed(0)}% → ${((tempGoldBonus - 1) * 100).toFixed(0)}%<br>
        흑섬 확률: ${(currentBlackFlashChance * 100).toFixed(1)}% → ${(tempBlackFlashChance * 100).toFixed(1)}% | 스킬 추가 피해: ${currentMagicDamageBonus.toFixed(1)} → <span style="color: #f87171; font-weight: bold;">${tempMagicDamageBonus.toFixed(1)}</span>
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
        const liveRecordEl = document.createElement('div');
        liveRecordEl.className = 'scoreboard-item current-run'; // 강조 스타일 재사용
        
        // 만약 실시간 1위가 '나'라면, 가장 정확한 로컬 'floor' 변수 사용
        const liveFloor = (currentUsername && topLivePlayer.username === currentUsername && isMyGameActive) ? floor : topLivePlayer.liveFloor;

        liveRecordEl.innerHTML = `
            <div>
                <span class="rank" style="color: #fde047;">🔥</span> <span class="name">${flagHtml} ${topLivePlayer.username}</span> <span class="score" style="color: #fde047; margin-left: 8px;">(${liveFloor}층 진행 중)</span>
            </div>
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

            // 3. 랭커가 현재 게임을 진행 중인 경우, 그 기록을 옆에 표시
            let progressHtml = '';
            // 서버에서 받은 liveFloor 데이터 사용
            if (entry.liveFloor && entry.liveFloor > 0) {
                 // 만약 랭커가 '나'라면, 가장 정확한 로컬 'floor' 변수 사용
                const liveFloor = (currentUsername && entry.username === currentUsername && isMyGameActive) ? floor : entry.liveFloor;
                progressHtml = `<span class="score-progress" style="color: #fde047; margin-left: 8px;">(현재 ${liveFloor}층)</span>`;
            }

            const rankDisplay = index === 0 ? '👑' : `#${index + 1}`;
            const rankColor = index === 0 ? '#ffd700' : '#fbbf24';

            const timeAgo = formatTimeAgo(entry.date);

            itemEl.innerHTML = `
                <div>
                    <span class="rank" style="color: ${rankColor};">${rankDisplay}</span> <span class="name">${flagHtml} ${entry.username}</span> <span class="score" style="margin-left: 8px;">(${entry.score} 층)</span>
                    ${progressHtml}
                </div>
                <div class="score-time" style="color: #9ca3af; font-size: 14px; align-self: center;">${timeAgo}</div>
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
function showGameOverModal(score) {
    const modal = document.getElementById('game-over-modal');
    document.getElementById('final-score').innerText = score;
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
    startNewGame(true); // script.js에 정의된 함수
}

/**
 * 게임 오버 화면에서 '메인으로' 버튼 클릭을 처리합니다.
 */
function handleToMainFromGameOver() {
    closeGameOverModal();
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
    modal.style.display = 'flex';

    // 모바일 환경에서 모달 내용이 잘리는 것을 방지하기 위해
    // 모달 컨텐츠에 최대 높이와 스크롤을 적용합니다.
    const modalContent = modal.querySelector('.modal-content');
    if (modalContent) {
        modalContent.style.maxHeight = '85vh';
        modalContent.style.overflowY = 'auto';
    }
    
    // 전리품 섹션이 없으면 동적으로 생성
    const container = modal.querySelector('.management-container');
    let lootSection = document.getElementById('loot-management-section');
    if (!lootSection) {
        lootSection = document.createElement('div');
        lootSection.id = 'loot-management-section';
        lootSection.className = 'management-section';
        lootSection.innerHTML = `
            <h3>전리품 (스크롤 가능)</h3>
            <div id="loot-inventory-list" class="equipment-list" style="max-height: 60vh; overflow-y: auto;"></div>
        `;
        // 스탯 섹션 앞에 전리품 섹션 삽입
        const statSectionEl = container.querySelector('.stat-up-list')?.closest('.management-section');
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
    const modalTitleEl = modal.querySelector('h2'); // 모달의 메인 제목
    const managementContainer = container;
    const currentEquipmentSection = document.getElementById('current-equipment-display');
    const armorSection = document.getElementById('equipment-armor-list')?.closest('.management-section');
    const weaponSection = document.getElementById('equipment-weapon-list')?.closest('.management-section');
    const statSection = document.querySelector('.stat-up-list')?.closest('.management-section');
    // lootSection은 위에서 이미 정의됨

    // --- 모든 관련 섹션 숨기기 ---
    if (currentEquipmentSection) currentEquipmentSection.style.display = 'none';
    if (armorSection) armorSection.style.display = 'none';
    if (weaponSection) weaponSection.style.display = 'none';
    if (lootSection) lootSection.style.display = 'none';
    if (statSection) statSection.style.display = 'none';

    // --- 컨테이너 스타일 초기화 및 탭에 맞게 재설정 ---
    managementContainer.style.display = 'grid'; // 그리드를 기본값으로 재설정
    managementContainer.style.gridTemplateColumns = '';
    managementContainer.style.margin = '';

    switch (activeTab) {
        case 'equipment':
            if (modalTitleEl) modalTitleEl.innerText = '🛡️ 장비 관리';
            if (currentEquipmentSection) currentEquipmentSection.style.display = 'block';
            if (armorSection) armorSection.style.display = 'block';
            if (weaponSection) weaponSection.style.display = 'block';
            
            // 단일 뷰로 표시하기 위해 그리드 해제
            managementContainer.style.display = 'block';
            break;
        case 'loot':
            if (modalTitleEl) modalTitleEl.innerText = '💎 전리품';
            if (lootSection) lootSection.style.display = 'block';
            // 단일 뷰로 표시하기 위해 그리드 해제
            managementContainer.style.display = 'block';
            break;
        case 'stats':
            if (modalTitleEl) modalTitleEl.innerText = '📊 스탯 분배';
            if (statSection) statSection.style.display = 'block';
            // 단일 뷰로 표시하기 위해 그리드 해제
            managementContainer.style.display = 'block';
            break;
    }
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
            itemEl.innerHTML = `
                <div class="item-info">${armor.emoji} ${armor.name} (+체력 ${armor.maxHpBonus})</div>
                <button class="btn-use" onclick="equipItem('armor', ${index})" ${isEquipped ? 'disabled' : ''}>
                    ${isEquipped ? '착용중' : '착용'}
                </button>
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
            itemEl.innerHTML = `
                <div class="item-info">${weapon.emoji} ${weapon.name} (+공격력 ${weapon.atkBonus})</div>
                <button class="btn-use" onclick="equipItem('weapon', ${index})" ${isEquipped ? 'disabled' : ''}>
                    ${isEquipped ? '착용중' : '착용'}
                </button>
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