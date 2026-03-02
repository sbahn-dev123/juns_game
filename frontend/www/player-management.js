//! =================================================================
//! player-management.js
//!
//! 이 파일은 플레이어의 성장 및 관리와 관련된 로직을 담당합니다.
//! - 스탯 분배 및 재계산
//! - 장비 착용
//! - 아이템 사용 및 상점 거래
//! =================================================================

//** ============================================================ **//
//** 3. 스킬 및 아이템 사용 (일부)
//** ============================================================ **//

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