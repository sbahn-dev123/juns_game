
//! ============================================================
//! 1. 게임 상태 변수 및 데이터 정의
//! ============================================================

//* 플레이어의 모든 상태를 담고 있는 객체
const player = {
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
    str: 0,             // 힘 스탯 (공격력에 영향)
    vit: 0,             // 체력 스탯 (최대 체력에 영향)
    luk: 0,             // 운 스탯 (치명타 확률에 영향)
    agi: 0,             // 민첩 스탯 (회피 확률에 영향)
    int: 0,             // 지혜 스탯 (골드 획득량에 영향)
    mnd: 0,             // 정신력 스탯 (최대 MP에 영향)
    fcs: 0,             // 고도의 집중 스탯 (흑섬 확률에 영향)
    blackFlashBuff: { active: false, duration: 0 }, // 흑섬 버프 상태 (활성화 여부, 남은 층)
    critBuff: { turns: 0, bonus: 0 }, // 치명타 확률 버프 상태 (남은 턴, 추가 확률)
    defenseBuff: { turns: 0, reduction: 0.6 }, // 방어 버프 (60% 감소)
    defenseStance: false, // 방어 태세 여부
    evasionChance: 4,   // 현재 회피 확률 (%)
    critChance: 11,     // 현재 치명타 확률 (%)
    critDamage: 2,      // 현재 치명타 배율
    goldBonus: 1,       // 골드 획득 보너스 배율
    isStunned: false,   // 기절 상태 여부
    coins: 0,           // 보유 골드
    baseEmoji: '🧙‍♂️',   // 기본 이모지
    emoji: '🧙‍♂️',       // 현재 이모지 (장비에 따라 변경)
    equippedArmor: null, // 현재 착용한 방어구
    equippedWeapon: null,// 현재 착용한 무기
    armorInventory: [], // 보유한 방어구 목록
    weaponInventory: [],// 보유한 무기 목록
    lootInventory: [], // 보스 전리품 보관
    targetIndex: 0,     // 현재 공격 목표 몬스터의 인덱스
    buff: { turns: 0, multiplier: 1.5 }, // 공격력 강화 버프 상태 (남은 턴, 공격력 배율)
    inventory: [        // 보유한 소비 아이템 목록
        // 게임 시작 시 기본 회복 물약 3개 지급
        { type: 'heal', name: '기본 회복 물약', healAmount: 20 },
        { type: 'heal', name: '기본 회복 물약', healAmount: 20 },
        { type: 'heal', name: '기본 회복 물약', healAmount: 20 },
    ]
};

//* 현재 전투 중인 몬스터 목록을 담는 배열
let monsters = [];

//* 게임의 주요 상태 변수
let floor = 1;              // 현재 층
let turn = 1;               // 현재 턴
let isPlayerTurn = true;    // 플레이어 턴 여부
let isGameOver = false;     // 게임 오버 여부
let isShopAutoOpened = false; // 5층마다 상점이 자동으로 열렸는지 여부

//* 몬스터 도감: 층이 올라갈수록 이 목록에서 순서대로 더 강한 몬스터가 등장
const monsterList = [
    { name: "박쥐", emoji: "🦇", hp: 30, atk: 3 },
    { name: "시궁창 쥐", emoji: "🐀", hp: 32, atk: 3 },
    { name: "작은 거미", emoji: "🕷️", hp: 34, atk: 4 },
    { name: "독버섯", emoji: "🍄", hp: 36, atk: 4 },
    { name: "초록 뱀", emoji: "🐍", hp: 38, atk: 5 },
    { name: "슬라임", emoji: "💧", hp: 40, atk: 5 },
    { name: "늑대", emoji: "🐺", hp: 42, atk: 6 },
    { name: "고블린", emoji: "👺", hp: 44, atk: 6 },
    { name: "선인장", emoji: "🌵", hp: 46, atk: 7 },
    { name: "해골 병사", emoji: "💀", hp: 48, atk: 7 },
    { name: "유령", emoji: "👻", hp: 50, atk: 8 },
    { name: "멧돼지", emoji: "🐗", hp: 52, atk: 8 },
    { name: "거대 게", emoji: "🦀", hp: 54, atk: 9 },
    { name: "좀비", emoji: "🧟", hp: 56, atk: 9 },
    { name: "리자드맨", emoji: "🦎", hp: 58, atk: 10 },
    { name: "하피", emoji: "🦅", hp: 60, atk: 10 },
    { name: "돌 골렘", emoji: "🗿", hp: 65, atk: 11, skill: { type: 'stun', chance: 0.25 } },
    { name: "뱀파이어", emoji: "🧛", hp: 70, atk: 11, skill: { type: 'drain', chance: 0.3, power: 0.5 } },
    { name: "늑대인간", emoji: "🐺", hp: 75, atk: 12 },
    { name: "오크 전사", emoji: "👹", hp: 80, atk: 12 },
    { name: "외눈박이 거인", emoji: "👁️", hp: 85, atk: 13 },
    { name: "사막 전갈", emoji: "🦂", hp: 90, atk: 13 },
    { name: "만티코어", emoji: "🦁", hp: 95, atk: 14 },
    { name: "사악한 마법사", emoji: "🧙", hp: 100, atk: 14, skill: { type: 'mp_drain', chance: 0.4, power: 15 } },
    { name: "홉고블린 대장", emoji: "👺", hp: 105, atk: 15 },
    { name: "크라켄", emoji: "🦑", hp: 110, atk: 15 },
    { name: "동굴 트롤", emoji: "👹", hp: 115, atk: 16 },
    { name: "와이번", emoji: "🐉", hp: 120, atk: 16 },
    { name: "히드라", emoji: "🦕", hp: 125, atk: 17 },
    { name: "발록", emoji: "👿", hp: 130, atk: 18 },
    { name: "리치 왕", emoji: "💀", hp: 140, atk: 19 },
    { name: "심연의 마왕", emoji: "😈", hp: 150, atk: 20 }
];

//* 중간 보스 몬스터 도감: 10층, 30층, 50층... 에 등장
const midBossList = [
    // 10층 보스
    { name: "오크 족장", emoji: "🗿", hp: 100, atk: 15, xp: 300, dropCoins: 150, specialDrop: { type: 'permanent_stat', stat: 'str', value: 1, name: '족장의 징표', sellPrice: 500 } },
    // 30층 보스
    { name: "미노타우르스", emoji: "🐃", hp: 350, atk: 32, xp: 1100, dropCoins: 700, specialDrop: { type: 'permanent_stat', stat: 'vit', value: 1, name: '미노타우르스의 심장', sellPrice: 1200 } },
    // 50층 보스
    { name: "키메라", emoji: "🦁", hp: 600, atk: 48, xp: 2000, dropCoins: 1200, specialDrop: { type: 'permanent_stat', stat: 'luk', value: 1, name: '키메라의 눈', sellPrice: 2200 } },
    // 70층 보스
    { name: "나가 여왕", emoji: "🐍", hp: 850, atk: 58, xp: 3200, dropCoins: 2000, specialDrop: { type: 'permanent_stat', stat: 'mnd', value: 1, name: '여왕의 비늘', sellPrice: 3500 } },
    // 90층 보스
    { name: "언데드 소서러", emoji: "💀", hp: 1500, atk: 70, xp: 5500, dropCoins: 3200, specialDrop: { type: 'permanent_stat', stat: 'int', value: 1, name: '고대 지식의 파편', sellPrice: 6000 } },
    // 110층 보스
    { name: "용암 골렘", emoji: "🌋", hp: 2100, atk: 95, xp: 8500, dropCoins: 5000, specialDrop: { type: 'permanent_stat', stat: 'vit', value: 2, name: '용암의 핵', sellPrice: 9000 } },
    // 130층 보스
    { name: "사막의 폭군", emoji: "🦂", hp: 3000, atk: 120, xp: 12000, dropCoins: 7500, specialDrop: { type: 'permanent_stat', stat: 'agi', value: 2, name: '모래의 정수', sellPrice: 13000 } },
    // 150층 보스
    { name: "심해의 지배자", emoji: "🦑", hp: 4500, atk: 160, xp: 18000, dropCoins: 11000, specialDrop: { type: 'permanent_stat', stat: 'mnd', value: 2, name: '심해의 진주', sellPrice: 20000 } },
    // 170층 보스
    { name: "별의 포식자", emoji: "🌠", hp: 6000, atk: 220, xp: 27000, dropCoins: 16000, specialDrop: { type: 'permanent_stat', stat: 'fcs', value: 2, name: '별의 조각', sellPrice: 30000 } },
    // 190층 보스
    { name: "차원의 방랑자", emoji: "💠", hp: 8500, atk: 330, xp: 40000, dropCoins: 27000, specialDrop: { type: 'permanent_stat', stat: 'luk', value: 2, name: '차원의 균열', sellPrice: 45000 } },
];

//* 보스 몬스터 도감: 20층마다 등장하는 특별한 몬스터
const bossList = [
    // 20층 보스
    { name: "거대 고블린 왕", emoji: "👑", hp: 280, atk: 22, xp: 800, dropCoins: 500, skill: { type: 'stun', chance: 0.32, name: '왕의 철퇴' }, specialDrop: { type: 'permanent_stat', stat: 'int', value: 2, name: '탐욕의 왕관', sellPrice: 1000 } },
    // 40층 보스
    { name: "어둠의 기사", emoji: "⚔️", hp: 500, atk: 34, xp: 1500, dropCoins: 900, skill: { type: 'charge_attack', chance: 0.4, power: 2.5, name: '어둠의 검격' }, specialDrop: { type: 'permanent_stat', stat: 'str', value: 2, name: '기사의 맹세', sellPrice: 2000 } },
    // 60층 보스
    { name: "고대 드래곤", emoji: "🐉", hp: 800, atk: 46, xp: 2500, dropCoins: 1600, skill: { type: 'charge_attack', chance: 0.4, power: 2.8, name: '드래곤 브레스' }, specialDrop: { type: 'permanent_stat', stat: 'vit', value: 3, name: '드래곤의 심장', sellPrice: 3500 } },
    // 80층 보스
    { name: "심연의 군주", emoji: "😈", hp: 1300, atk: 60, xp: 4000, dropCoins: 2500, skill: { type: 'mp_drain', chance: 0.5, power: 80, name: '심연의 속삭임' }, specialDrop: { type: 'permanent_stat', stat: 'mnd', value: 3, name: '심연의 결정', sellPrice: 5500 } },
    // 100층 보스
    { name: "세계의 파괴자", emoji: "☄️", hp: 2200, atk: 75, xp: 7000, dropCoins: 4000, skill: { type: 'charge_attack', chance: 0.5, power: 3.5, name: '종말의 운석' }, specialDrop: { type: 'permanent_stat', stat: 'str', value: 3, name: '파괴자의 파편', sellPrice: 9000 } },
    // 120층 보스
    { name: "타락한 천사", emoji: "👼", hp: 3200, atk: 95, xp: 10000, dropCoins: 6000, skill: { type: 'drain', chance: 0.4, power: 0.8, name: '타락의 권능' }, specialDrop: { type: 'permanent_stat', stat: 'luk', value: 3, name: '타락한 깃털', sellPrice: 13000 } },
    // 140층 보스
    { name: "강철의 거신병", emoji: "🤖", hp: 4500, atk: 130, xp: 15000, dropCoins: 9000, skill: { type: 'stun', chance: 0.57, name: '강철 주먹' }, specialDrop: { type: 'permanent_stat', stat: 'vit', value: 4, name: '거신병의 동력원', sellPrice: 18000 } },
    // 160층 보스
    { name: "우주 장로", emoji: "🐙", hp: 6500, atk: 175, xp: 22000, dropCoins: 13000, skill: { type: 'charge_attack', chance: 0.6, power: 3.8, name: '우주 붕괴' }, specialDrop: { type: 'permanent_stat', stat: 'fcs', value: 4, name: '우주의 지혜', sellPrice: 28000 } },
    // 180층 보스
    { name: "혼돈의 화신", emoji: "🌀", hp: 9000, atk: 240, xp: 32000, dropCoins: 20000, skill: { type: 'mp_drain', chance: 0.7, power: 200, name: '혼돈의 소용돌이' }, specialDrop: { type: 'permanent_stat', stat: 'agi', value: 4, name: '혼돈의 정수', sellPrice: 42000 } },
    // 200층 보스
    { name: "종언의 창조주", emoji: "🌌", hp: 14000, atk: 350, xp: 50000, dropCoins: 35000, skill: { type: 'charge_attack', chance: 0.7, power: 4.5, name: '빅뱅' }, specialDrop: { type: 'permanent_stat', stat: 'fcs', value: 8, name: '창조주의 권능', sellPrice: 65000 } },
];

//* 상점에서 판매하는 방어구 목록
const armorList = [
    { name: '누더기 가죽 갑옷', emoji: '🧑‍🌾', maxHpBonus: 20, cost: 120 },
    { name: '견고한 나무 갑옷', emoji: '🪖', maxHpBonus: 40, cost: 320 },
    { name: '강철 사슬 갑옷', emoji: '🛡️', maxHpBonus: 70, cost: 680 },
    { name: '기사의 판금 갑옷', emoji: '🤺', maxHpBonus: 110, cost: 1400 },
    { name: '백은 갑옷', emoji: '🤴', maxHpBonus: 160, cost: 2900 },
    { name: '용비늘 갑옷', emoji: '🐉', maxHpBonus: 220, cost: 6800 },
    { name: '지옥불 갑옷', emoji: '😈', maxHpBonus: 300, cost: 12500 },
    { name: '천상의 수호자 갑옷', emoji: '😇', maxHpBonus: 400, cost: 24000 },
];

//* 상점에서 판매하는 회복 물약 목록
const healPotionList = [
    { name: '낡은 물약', healAmount: 15, cost: 70 },
    { name: '소형 물약', healAmount: 25, cost: 130 },
    { name: '중형 물약', healAmount: 45, cost: 220 },
    { name: '대형 물약', healAmount: 70, cost: 340 },
    { name: '특제 물약', healAmount: 100, cost: 480 },
    { name: '정제된 성수', healAmount: 140, cost: 700 },
    { name: '엘릭서', healAmount: 200, cost: 1000 },
    { name: '생명의 샘물', healAmount: 9999, cost: 1600 },
];

//* 상점에서 판매하는 MP 회복 물약 목록
const mpPotionList = [
    { name: '마나의 이슬', mpAmount: 20, cost: 80 },
    { name: '소형 마나 물약', mpAmount: 40, cost: 180 },
    { name: '중형 마나 물약', mpAmount: 70, cost: 320 },
    { name: '대형 마나 물약', mpAmount: 110, cost: 520 },
    { name: '정신의 비약', mpAmount: 160, cost: 760 },
    { name: '현자의 돌', mpAmount: 220, cost: 1150 },
    { name: '마력의 샘', mpAmount: 300, cost: 1650 },
    { name: '세계수의 눈물', mpAmount: 9999, cost: 2200 },
];

//* 상점에서 판매하는 공격력 강화 물약 목록
const buffPotionList = [
    { name: '흐릿한 힘의 물약', turns: 6, mult: 1.2, cost: 150 },
    { name: '하급 힘의 물약', turns: 6, mult: 1.3, cost: 260 },
    { name: '중급 힘의 물약', turns: 5, mult: 1.45, cost: 440 },
    { name: '상급 힘의 물약', turns: 5, mult: 1.6, cost: 700 },
    { name: '괴력의 비약', turns: 4, mult: 1.8, cost: 1150 },
    { name: '용사의 영약', turns: 4, mult: 2.0, cost: 1700 },
    { name: '거인의 심장', turns: 3, mult: 2.5, cost: 2500 },
    { name: '신의 분노', turns: 3, mult: 3.2, cost: 3800 },
];

//* 상점에서 판매하는 무기 목록
const weaponList = [
    { name: '낡은 단검', emoji: '🔪', atkBonus: 8, cost: 180 },
    { name: '무쇠 도끼', emoji: '🪓', atkBonus: 15, cost: 480 },
    { name: '강철 장검', emoji: '🗡️', atkBonus: 25, cost: 1000 },
    { name: '미스릴 창', emoji: '🔱', atkBonus: 38, cost: 2000 },
    { name: '오리할콘 대검', emoji: '⚔️', atkBonus: 55, cost: 4000 },
    { name: '요도 무라마사', emoji: '👹', atkBonus: 75, cost: 8500 },
    { name: '용살자의 검', emoji: '🐲', atkBonus: 100, cost: 16000 },
    { name: '신검 엑스칼리버', emoji: '✨', atkBonus: 130, cost: 30000 },
];

//* 상점에서 판매하는 치명타 확률 증가 물약 목록
const critPotionList = [
    { name: '약한 집중의 물약', bonus: 9, turns: 5, cost: 170 },
    { name: '집중의 물약', bonus: 14, turns: 5, cost: 360 },
    { name: '강한 집중의 물약', bonus: 27, turns: 5, cost: 600 },
    { name: '예리함의 비약', bonus: 29, turns: 4, cost: 900 },
    { name: '통찰의 영약', bonus: 36, turns: 4, cost: 1100 },
    { name: '매의 눈', bonus: 54, turns: 3, cost: 1900 },
    { name: '절대집중', bonus: 70, turns: 3, cost: 2800 },
    { name: '신의 시야', bonus: 90, turns: 2, cost: 4000 },
];

//* 스탯 분배 모달에서 임시로 사용할 변수
let tempStatPoints = 0; // 임시 스탯 포인트
let tempStats = {};     // 임시 스탯 객체 (힘, 체력, 운 등)

//* 각 스탯의 이름과 설명을 정의한 객체
const statInfo = {
    str: { name: '힘', description: '공격력을 2 증가시킵니다.' },
    vit: { name: '체력', description: '최대 체력을 5 증가시킵니다.' },
    luk: { name: '집중', description: '치명타 확률을 0.7% 증가시킵니다.' },
    agi: { name: '민첩', description: '회피 확률 2%를 증가시킵니다.' },
    int: { name: '지혜', description: '골드 획득량을 2% 증가시킵니다.' },
    mnd: { name: '정신력', description: '최대 MP를 5 증가시킵니다.' },
    fcs: { name: '고도의 집중', description: '흑섬 확률을 0.4% 증가시킵니다.'}
};

//! ============================================================
//! 2. 유틸리티 함수
//! ============================================================

/**
 * 로그 창에 메시지를 출력하는 함수
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
 * 흑섬(Black Flash) 효과 애니메이션을 실행하는 함수
 */
function triggerBlackFlash() {
    const overlay = document.getElementById('black-flash-overlay');
    overlay.style.animation = 'none';
    overlay.offsetHeight; // 애니메이션 재시작을 위한 리플로우 강제
    overlay.style.animation = 'black-flash-animation 0.25s ease-out';
}

/**
 * 캐릭터 위에 떠오르는 텍스트(데미지, MISS 등)를 표시하는 함수
 * @param {string|number} text - 표시할 텍스트
 * @param {HTMLElement} targetElement - 텍스트가 표시될 대상 DOM 요소
 * @param {string} type - 텍스트 종류 ('damage', 'crit', 'miss', 'heal', 'black-flash')
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
 * 게임의 모든 UI를 현재 게임 상태에 맞게 업데이트하는 함수
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

        monsterWrapper.innerHTML = `
            <div class="stun-indicator" style="position: absolute; top: -30px; left: 50%; transform: translateX(-50%); font-size: 30px; display: ${isStunned ? 'block' : 'none'};">💫</div>
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

//! ============================================================
//! 3. 전투 로직
//! ============================================================

/**
 * 플레이어의 일반 공격을 처리하는 함수
 */
function executeNormalAttack() {
    if (isGameOver || !isPlayerTurn) return;

    const targetMonster = monsters[player.targetIndex];
    if (targetMonster.hp <= 0) {
        log("이미 쓰러진 몬스터입니다.", 'log-system');
        return;
    }

    const mpCost = 0;
    const defenseMpCost = player.defenseStance ? 10 : 0;
    const totalMpCost = mpCost + defenseMpCost;

    if (player.mp < totalMpCost) {
        alert(`MP가 부족합니다! (필요: ${totalMpCost})`);
        return;
    }

    if (player.isStunned) {
        log("플레이어가 기절해서 움직일 수 없습니다!", 'log-player');
        player.isStunned = false; // 턴을 넘기면서 기절 해제
        setTimeout(monstersAttack, 800);
        return;
    }

    isPlayerTurn = false;
    toggleControls(false); // 플레이어 턴이 아니므로 컨트롤 버튼 비활성화

    // 방어 태세 로직 적용
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

    // 총 MP 소모
    player.mp -= totalMpCost;

    // --- 공격 애니메이션 ---
    const playerElement = document.getElementById('player-character');
    playerElement.style.transform = 'translateX(40px) scale(1.05)';
    setTimeout(() => {
        playerElement.style.transform = ''; // 원래 위치로
    }, 150);
    // --- 애니메이션 끝 ---

    const monsterWrappers = document.querySelectorAll('#monster-area .monster-wrapper');
    const targetMonsterElement = monsterWrappers[player.targetIndex];

    // 흑섬(Black Flash) 발동 체크 (기본 0.8% + 집중 스탯)
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

        targetMonster.hp -= dmg;
        showFloatingText(dmg, targetMonsterElement, 'black-flash');
    } else {
        // 일반 공격 로직
        // 몬스터 회피 체크 (5% 확률)
        if (Math.random() < 0.05) {
            log(`${targetMonster.name}이(가) 공격을 회피했다! (MISS)`, 'log-monster');
            showFloatingText('MISS', targetMonsterElement, 'miss');
            setTimeout(monstersAttack, 800);
            return;
        }

        // 플레이어 기본 공격 데미지 계산 (기본 공격력 + 0~4 랜덤 데미지)
        let dmg = Math.floor(Math.random() * 5) + player.atk;

        // 공격력 버프 적용
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

                // 플레이어 치명타 발동 체크
        if (Math.random() < player.critChance / 100) {
            dmg = Math.floor(dmg * player.critDamage);
            log(`⚡ 치명타! 용사가 ${targetMonster.name}에게 ${dmg}의 폭발적인 피해를 입혔습니다!`, 'log-player');
            showFloatingText(dmg, targetMonsterElement, 'crit');
        } else {
            log(`용사가 ${targetMonster.name}에게 ${dmg}의 피해를 입혔습니다!`, 'log-player');
            showFloatingText(dmg, targetMonsterElement, 'damage');
        }

        targetMonster.hp -= dmg;

        // 3% 확률로 몬스터 기절
        if (Math.random() < 0.03) {
            targetMonster.isStunned = true;
            log(`몬스터가 기절했습니다!`, 'log-system');
            showFloatingText('STUN', targetMonsterElement, 'stun');
        }
    }

    // 몬스터 피격 시 흔들리는 애니메이션 효과
    if (monsterWrappers[player.targetIndex]) {
        const emojiElement = monsterWrappers[player.targetIndex].querySelector('.emoji');
        if (emojiElement) {
            emojiElement.classList.add('hit');
            setTimeout(() => emojiElement.classList.remove('hit'), 300);
        }
    }

    updateUI();

    // 모든 몬스터가 죽었는지 확인
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
 */
function monstersAttack() {
    if (isGameOver) return;

    const playerElement = document.getElementById('player-character');
    const livingMonsters = monsters.filter(m => m.hp > 0);

    let defenseBuffUsedThisTurn = false;

    livingMonsters.forEach((monster, i) => {
        setTimeout(() => { // 몬스터 공격 간 딜레이
            if (isGameOver) return;

            const monsterIndex = monsters.findIndex(m => m === monster);
            const monsterElement = document.querySelectorAll('#monster-area .monster-wrapper')[monsterIndex];

            // 보스 궁극기 발동 (이전 턴에 충전한 경우)
            if (monster.isCharging) {
                const skill = monster.skill;
                let dmg = Math.floor(monster.atk * skill.power);
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

            if (monster.isStunned) {
                log(`${monster.name}은(는) 기절해서 움직일 수 없습니다!`, 'log-monster');
                monster.isStunned = false; // 턴을 넘기면서 기절 해제
                // 마지막 몬스터가 기절한 경우, 바로 플레이어 턴으로 넘어가야 함
                if (i === livingMonsters.length - 1) {
                    endMonstersTurn();
                }
                return;
            }

            // --- 몬스터 공격 애니메이션 ---
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

            // 플레이어 회피 확률 체크
            if (Math.random() < player.evasionChance / 100) {
                log(`용사가 ${monster.name}의 공격을 회피했다! (MISS)`, 'log-player');
                showFloatingText('MISS', playerElement, 'miss');
            } else {
                let usedSkill = false;
                // 몬스터 스킬 사용 시도
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

                // 스킬을 사용하지 않았으면 일반 공격
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

                    if (player.defenseBuff.turns > 0) {
                        dmg = Math.floor(dmg * (1 - player.defenseBuff.reduction));
                        if (!defenseBuffUsedThisTurn) { log(`🛡️ 방어 성공! 받는 피해가 감소했습니다.`, 'log-system'); defenseBuffUsedThisTurn = true; }
                    }

                    player.hp -= dmg;
                }

                // 플레이어 피격 시 흔들리는 애니메이션 효과
                const pEmoji = document.getElementById('player-emoji');
                pEmoji.classList.add('hit');
                setTimeout(() => pEmoji.classList.remove('hit'), 300);
            }

            updateUI();

            // 모든 살아있는 몬스터의 공격이 끝났을 때
            if (i === livingMonsters.length - 1) {
                endMonstersTurn();
            }
        }, i * 800); // 0.8초 간격으로 공격 (가독성 향상)
    });
}

/**
 * 몬스터 턴 종료 후 플레이어 턴으로 전환하는 로직
 */
function endMonstersTurn() {
    if (player.hp <= 0) {
        player.hp = 0;
        updateUI();
        gameOver();
    } else {
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
//! ============================================================

/**
 * 스킬 선택 버튼들을 보여주는 함수
 */
function showSkillSelection() {
    if (isGameOver || !isPlayerTurn) return;
    const controlsPanel = document.getElementById('controls-panel');
    const defenseBtnClass = player.defenseStance ? 'btn-defend-active' : 'btn-defend';
    controlsPanel.style.gridTemplateColumns = '1fr 1fr 1fr 1fr'; // 4개의 스킬 버튼을 위한 레이아웃
    controlsPanel.innerHTML = `
        <button class="btn-attack" onclick="executeNormalAttack()">⚔️ 일반 공격<br><span style="font-size: 16px;">(MP 0)</span></button>
        <button class="btn-attack" style="background-color: #c12828;" onclick="executePowerAttack()">💥 강 공격<br><span style="font-size: 16px;">(MP 15)</span></button>
        <button class="btn-attack" style="background-color: #9a2020;" onclick="executeSweepAttack()">🌪️ 휩쓸기<br><span style="font-size: 16px;">(MP 25)</span></button>
        <button class="${defenseBtnClass}" onclick="toggleDefenseStance()">🛡️ 방어 태세<br><span style="font-size: 16px;">(MP 10)</span></button>
        <button class="btn-inventory" style="grid-column: 1 / 5; font-size: 20px;" onclick="showMainControls()">↩️ 뒤로가기</button>
    `;
}

/**
 * 메인 컨트롤 버튼들을 보여주는 함수
 */
function showMainControls() {
    if (isGameOver) return;
    const controlsPanel = document.getElementById('controls-panel');
    controlsPanel.style.gridTemplateColumns = '4fr 3fr 3fr'; // 원래 레이아웃으로 복원
    controlsPanel.innerHTML = `
        <button class="btn-attack" onclick="showSkillSelection()">⚔️ 공격 / 스킬</button>
        <button class="btn-heal" onclick="showAllPotions()">🧪 물약 사용</button>
        <button class="btn-armor" onclick="openInventoryModal()">🛡️ 인벤토리</button>
    `;
}

/**
 * 강 공격 (단일 대상, MP 소모)
 */
function executePowerAttack() {
    if (isGameOver || !isPlayerTurn) return;

    const targetMonster = monsters[player.targetIndex];
    if (targetMonster.hp <= 0) {
        log("이미 쓰러진 몬스터입니다.", 'log-system');
        return;
    }

    const mpCost = 15;
    const defenseMpCost = player.defenseStance ? 10 : 0;
    const totalMpCost = mpCost + defenseMpCost;

    if (player.mp < totalMpCost) {
        alert(`MP가 부족합니다! (필요: ${totalMpCost})`);
        if (player.defenseStance) {
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

    // 방어 태세 로직 적용
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

    // 총 MP 소모
    player.mp -= totalMpCost;

    // --- 강한 공격 애니메이션 ---
    const playerElement = document.getElementById('player-character');
    playerElement.style.transform = 'translateX(50px) scale(1.1)'; // 일반 공격보다 조금 더 강하게
    setTimeout(() => {
        playerElement.style.transform = ''; // 원래 위치로
    }, 150);
    // --- 애니메이션 끝 ---

    const monsterWrappers = document.querySelectorAll('#monster-area .monster-wrapper');
    const targetMonsterElement = monsterWrappers[player.targetIndex];

    let dmg = Math.floor(player.atk * 2.0); // 200% 데미지
    log(`💥 강 공격! ${targetMonster.name}에게 ${dmg}의 강력한 피해를 입혔습니다!`, 'log-player');
    showFloatingText(dmg, targetMonsterElement, 'crit'); // 치명타 효과로 보여주기

    targetMonster.hp -= dmg;

    // 3% 확률로 몬스터 기절 (강공격은 2배 확률)
    if (Math.random() < 0.06) {
        targetMonster.isStunned = true;
        log(`몬스터가 기절했습니다!`, 'log-system');
        showFloatingText('STUN', targetMonsterElement, 'stun');
    }

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
 * 휩쓸기 (광역 공격, MP 소모)
 */
function executeSweepAttack() {
    if (isGameOver || !isPlayerTurn) return;

    const mpCost = 25;
    const defenseMpCost = player.defenseStance ? 10 : 0;
    const totalMpCost = mpCost + defenseMpCost;

    if (player.mp < totalMpCost) {
        alert(`MP가 부족합니다! (필요: ${totalMpCost})`);
        if (player.defenseStance) {
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

    // 방어 태세 로직 적용
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

    // 총 MP 소모
    player.mp -= totalMpCost;

    // --- 휩쓸기 애니메이션 ---
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

    livingMonsters.forEach((monster, index) => {
        setTimeout(() => {
            const baseDmg = Math.floor(Math.random() * 5) + player.atk;
            let dmg = Math.floor(baseDmg * 0.8); // 기본 데미지의 80%
            monster.hp -= dmg;

            const monsterIndexInAll = monsters.findIndex(m => m === monster);
            const targetElement = monsterElements[monsterIndexInAll];
            
            showFloatingText(dmg, targetElement, 'damage');
            
            if (targetElement) {
                const emojiElement = targetElement.querySelector('.emoji');
                emojiElement.classList.add('hit');
                setTimeout(() => emojiElement.classList.remove('hit'), 300);
            }

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

            // 마지막 몬스터 공격 후 처리
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
 * 이 행동은 턴을 소모하지 않습니다.
 */
function toggleDefenseStance() {
    if (isGameOver || !isPlayerTurn) return;

    player.defenseStance = !player.defenseStance;

    if (player.defenseStance) {
        log('방어 태세를 취합니다. 다음 공격 행동 시 방어 효과가 적용됩니다.', 'log-player');
    } else {
        log('방어 태세를 해제합니다.', 'log-player');
    }

    showSkillSelection(); // UI 갱신
}

/**
 * 사용 가능한 모든 물약 목록을 보여주는 모달을 여는 함수
 */
function showAllPotions() {
    const modal = document.getElementById('item-select-modal');
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

    // 카테고리별로 아이템 그룹화
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

    // 그룹화된 아이템을 렌더링하는 헬퍼 함수
    const renderPotionGroup = (group, container) => {
        if (Object.keys(group).length === 0) {
            container.innerHTML = '<div class="inventory-item" style="justify-content: center; color: #888;">없음</div>';
            return;
        }
        for (const name in group) {
            const itemGroup = group[name];
            const itemEl = document.createElement('div');
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
    
    modal.style.display = 'flex';
}

/**
 * 아이템 선택 모달을 닫는 함수
 */
function closeItemSelect() {
    document.getElementById('item-select-modal').style.display = 'none';
}

/**
 * 인벤토리의 아이템을 사용하는 함수
 * @param {number} index - 사용할 아이템의 player.inventory 배열 인덱스
 */
function useInventoryItem(index) {
    const item = player.inventory[index];
    if (!item) return; // 아이템이 없는 경우 방어
    const itemType = item.type; // 아이템 사용 전에 타입 저장
    const playerElement = document.getElementById('player-character');
    const emojiElement = document.getElementById('player-emoji');
    let flashColor = '';
    
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

    // --- 아이템 사용 애니메이션 (이모지 반짝임) ---
    if (flashColor) {
        const originalFilter = emojiElement.style.filter;
        emojiElement.style.filter = `drop-shadow(0 0 25px ${flashColor})`;
        setTimeout(() => {
            emojiElement.style.filter = originalFilter; // 원래 필터로 복구
        }, 400);
    }

    // 아이템 제거
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
 * 현재 타겟 몬스터가 죽었을 경우, 다음 살아있는 몬스터를 타겟으로 지정하는 함수
 */
function findNextTarget() {
    const livingMonsterIndex = monsters.findIndex(m => m.hp > 0);
    if (livingMonsterIndex !== -1) {
        player.targetIndex = livingMonsterIndex;
    }
}

/**
 * 플레이어가 경험치를 획득하고 레벨업을 체크하는 함수
 * @param {number} amount - 획득할 경험치 양
 */
function gainXP(amount) {
    player.xp += amount;
    log(`${amount}의 경험치를 획득했다!`, 'log-system', { color: '#a78bfa' });
    updateUI();
    checkForLevelUp();
}

/**
 * 플레이어의 경험치가 레벨업 조건을 만족하는지 확인하고 처리하는 함수
 */
function checkForLevelUp() {
    if (player.xp >= player.xpToNextLevel) {
        player.level++;
        player.xp -= player.xpToNextLevel;
        player.statPoints += 3;
        player.xpToNextLevel = Math.floor(100 * Math.pow(1.3, player.level - 1)); // 다음 레벨업에 필요한 경험치 증가

        // --- 레벨업 애니메이션 ---
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
//! ============================================================

/**
 * 전투에서 승리했을 때 호출되는 함수
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
 * 전투 승리 후 다음 단계(상점 또는 다음 층)로 진행하는 함수
 */
function proceedToNextStage() {
    if (floor % 5 === 0) {
        openShop(true);
    } else {
        nextFloor();
    }
}

/**
 * 다음 층으로 이동하고 게임 상태를 초기화하는 함수
 */
function nextFloor() {
    floor++;
    turn = 1;
    isPlayerTurn = true;
    monsters = [];
    player.targetIndex = 0;
    
    // 플레이어 스펙업
    player.hp = player.maxHp; // 다음 층 이동 시 체력은 완전 회복
    const mpRecovery = 20;
    player.mp = Math.min(player.maxMp, player.mp + mpRecovery); // 남은 마나 + 20 회복
    log(`다음 층으로 이동하며 마나가 ${mpRecovery}만큼 회복되었습니다.`, 'log-system');

    // 흑섬 버프 지속시간 감소
    if (player.blackFlashBuff.active) {
        player.blackFlashBuff.duration--;
        if (player.blackFlashBuff.duration <= 0) {
            player.blackFlashBuff.active = false;
            recalculatePlayerStats(); // 버프 제거 후 스탯 재계산
            log("흑섬의 기운이 사라졌다...", 'log-system');
        }
    }

    // 55% 확률로 기본 회복 물약 획득
    if (Math.random() < 0.55) {
        const potion = healPotionList[0]; // 제일 안좋은 회복 물약
        player.inventory.push({ ...potion, type: 'heal' });
        log(`바닥에서 ${potion.name}을(를) 주웠다!`, 'log-system', { fontSize: '20px' });
    }

    // 30% 확률로 힘, 집중, MP 물약 중 하나 획득
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
    
    monsters = generateMonstersForFloor(floor);

    updateUI();
    toggleControls(true);
}

/**
 * 특정 층에 맞는 몬스터들을 생성하고 로그를 출력하는 함수
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
 * @param {object} template - 몬스터 도감(monsterList)에 있는 몬스터 템플릿
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
 * 게임 오버를 처리하는 함수
 */
function gameOver() {
    isGameOver = true;
    log("체력이 0이 되었습니다. 게임 오버...", 'log-monster');
    // 게임 오버 시 버튼 비활성화 처리
    const btns = document.querySelectorAll('button');
    btns.forEach(btn => btn.disabled = true);
}

/**
 * 컨트롤 버튼(공격, 물약 등)의 활성화/비활성화 상태를 조절하는 함수
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
//! ============================================================

/**
 * 스탯 분배 모달의 내용을 렌더링하는 함수
 */
function renderStatUpModal() {
    document.querySelector('#stat-points-display span').innerText = tempStatPoints;
    const list = document.querySelector('.stat-up-list');
    list.innerHTML = '';

    for (const key in statInfo) {
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

    // 스탯 분배 시 변경될 능력치를 미리 보여줌
    const currentValuesEl = document.getElementById('stat-current-values');
    const weaponBonus = player.equippedWeapon ? player.equippedWeapon.atkBonus : 0;
    const armorBonus = player.equippedArmor ? player.equippedArmor.maxHpBonus : 0;

    // "현재" 값 (버프 제외, 순수 스탯/장비 효과만)
    const currentAtk = player.baseAtk + (player.str * 2) + weaponBonus;
    const currentMaxHp = player.baseMaxHp + (player.vit * 5) + armorBonus;
    const currentMaxMp = player.baseMaxMp + (player.mnd * 5);
    const currentCritChance = 11 + (player.luk * 0.7);
    const currentEvasionChance = 4 + (player.agi * 2);
    const currentGoldBonus = 1 + (player.int * 0.02);
    const currentBlackFlashChance = 0.008 + (player.fcs * 0.004);

    // "임시" 값 (스탯 분배 후)
    const tempAtk = player.baseAtk + (tempStats.str * 2) + weaponBonus;
    const tempMaxHp = player.baseMaxHp + (tempStats.vit * 5) + armorBonus;
    const tempMaxMp = player.baseMaxMp + (tempStats.mnd * 5);
    const tempCritChance = 11 + (tempStats.luk * 0.7);
    const tempEvasionChance = 4 + (tempStats.agi * 2);
    const tempGoldBonus = 1 + (tempStats.int * 0.02);
    const tempBlackFlashChance = 0.008 + (tempStats.fcs * 0.004);

    currentValuesEl.innerHTML = `
        공격력: ${currentAtk} → ${tempAtk} | 최대체력: ${currentMaxHp} → ${tempMaxHp}<br>
        최대MP: ${currentMaxMp} → ${tempMaxMp} | 회피: ${currentEvasionChance.toFixed(1)}% → ${tempEvasionChance.toFixed(1)}%<br>
        치명타: ${currentCritChance.toFixed(1)}% → ${tempCritChance.toFixed(1)}% | 골드 보너스: ${((currentGoldBonus - 1) * 100).toFixed(0)}% → ${((tempGoldBonus - 1) * 100).toFixed(0)}%<br>
        흑섬 확률: ${(currentBlackFlashChance * 100).toFixed(1)}% → ${(tempBlackFlashChance * 100).toFixed(1)}%
    `;
}

/**
 * 특정 스탯을 1 증가시키는 함수 (임시)
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
 * 임시로 분배한 스탯을 초기화하는 함수
 */
function resetTempStats() {
    tempStatPoints = player.statPoints;
// script.js 中
function nextFloor() {
    // ... (다른 코드)
    
    // 플레이어 스펙업
    player.hp = player.maxHp; // 체력은 모두 회복
    const mpRecovery = 20;
    player.mp = Math.min(player.maxMp, player.mp + mpRecovery); // 남은 마나 + 20 회복
    log(`다음 층으로 이동하며 마나가 ${mpRecovery}만큼 회복되었습니다.`, 'log-system');

    // ... (다른 코드)
}
// script.js 中
function checkForLevelUp() {
    if (player.xp >= player.xpToNextLevel) {
        player.level++;
        player.xp -= player.xpToNextLevel;
        player.statPoints += 3; // 스탯 포인트 3만 지급됩니다.
        player.xpToNextLevel = Math.floor(100 * Math.pow(1.3, player.level - 1));
        // ... (애니메이션 및 로그 출력 코드)
    }
}
// script.js 中
function nextFloor() {
    // ... (다른 코드)
    
    // 플레이어 스펙업
    player.hp = player.maxHp; // 체력은 모두 회복
    const mpRecovery = 20;
    player.mp = Math.min(player.maxMp, player.mp + mpRecovery); // 남은 마나 + 20 회복
    log(`다음 층으로 이동하며 마나가 ${mpRecovery}만큼 회복되었습니다.`, 'log-system');

    // ... (다른 코드)
}
// script.js 中
function nextFloor() {
    // ... (다른 코드)
    
    // 플레이어 스펙업
    player.hp = player.maxHp; // 체력은 모두 회복
    const mpRecovery = 20;
    player.mp = Math.min(player.maxMp, player.mp + mpRecovery); // 남은 마나 + 20 회복
    log(`다음 층으로 이동하며 마나가 ${mpRecovery}만큼 회복되었습니다.`, 'log-system');

    // ... (다른 코드)
}
// script.js 中
function checkForLevelUp() {
    if (player.xp >= player.xpToNextLevel) {
        player.level++;
        player.xp -= player.xpToNextLevel;
        player.statPoints += 3; // 스탯 포인트 3만 지급됩니다.
        player.xpToNextLevel = Math.floor(100 * Math.pow(1.3, player.level - 1));
        // ... (애니메이션 및 로그 출력 코드)
    }
}
    tempStats = { str: player.str, vit: player.vit, luk: player.luk, agi: player.agi, int: player.int, mnd: player.mnd, fcs: player.fcs };
    renderStatUpModal();
}

/**
 * 스탯 분배를 확정하고 실제 플레이어 능력치에 적용하는 함수
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
 * 스탯, 장비, 버프 등을 모두 고려하여 플레이어의 최종 능력치를 재계산하는 함수
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
//! ============================================================

/**
 * 인벤토리(장비, 전리품, 스탯) 관리 모달을 여는 함수
 */
function openInventoryModal() {
    // 스탯 분배를 위한 임시 변수 초기화
    tempStatPoints = player.statPoints;
    tempStats = { str: player.str, vit: player.vit, luk: player.luk, agi: player.agi, int: player.int, mnd: player.mnd, fcs: player.fcs };

    const modal = document.getElementById('equipment-modal');
    modal.style.display = 'flex';
    
    // --- 전리품 섹션 동적 추가 ---
    const container = modal.querySelector('.management-container');
    let lootSection = document.getElementById('loot-management-section');
    if (!lootSection) {
        lootSection = document.createElement('div');
        lootSection.id = 'loot-management-section';
        lootSection.className = 'management-section';
        lootSection.innerHTML = `
            <h3>전리품</h3>
            <div id="loot-inventory-list" class="equipment-list" style="max-height: 45vh; overflow-y: auto;"></div>
        `;
        // 스탯 섹션 앞에 전리품 섹션 삽입
        const statSection = container.querySelector('.stat-up-list').closest('.management-section');
        if (statSection) {
            container.insertBefore(lootSection, statSection);
        } else {
            container.appendChild(lootSection);
        }
    }
    // --- 섹션 추가 끝 ---
    
    // 모달 내용 렌더링
    renderStatUpModal();
    renderEquipment();
    renderLootInventory(); // 전리품 인벤토리 렌더링
}

/**
 * 인벤토리 모달을 닫는 함수
 */
function closeInventoryModal() {
    document.getElementById('equipment-modal').style.display = 'none';
}

/**
 * 장비 관리 모달을 닫는 함수 (이전 버전 호환용)
 * HTML 파일에 onclick="closeEquipment()"가 남아있을 수 있어 추가합니다.
 */
function closeEquipment() {
    closeInventoryModal();
}

/**
 * 전리품 인벤토리 섹션을 렌더링하는 함수
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
            const statInfoText = loot.type === 'permanent_stat' ? `${statInfo[loot.stat].name} +${loot.value}` : '특별 효과';
            itemEl.innerHTML = `
                <div class="item-info">
                    <h4>${loot.name}</h4>
                    <p style="color: #f59e0b;">효과: ${statInfoText}</p>
                </div>
                <button class="btn-use" onclick="useLootItem(${index})">사용</button>
            `;
            listEl.appendChild(itemEl);
        });
    }
}

/**
 * 임시로 분배한 스탯을 초기화하는 함수
 */
function resetTempStats() {
    tempStatPoints = player.statPoints;
    tempStats = { str: player.str, vit: player.vit, luk: player.luk, agi: player.agi, int: player.int, mnd: player.mnd, fcs: player.fcs };
    renderStatUpModal();
}

/**
 * 장비 관리 모달의 내용을 렌더링하는 함수
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
 * 아이템을 착용하는 함수
 * @param {string} type - 착용할 아이템 타입 ('armor' 또는 'weapon')
 * @param {number} index - 해당 타입의 인벤토리 배열 인덱스
 */
function equipItem(type, index) {
    let hpPercentage = 1.0; // 체력 비율 유지를 위한 변수

    if (type === 'armor') {
        const armor = player.armorInventory[index];
        // 장비 변경 전 체력 비율 저장
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
 * 전리품 아이템을 사용하는 함수
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
//! ============================================================

/**
 * 상점 모달을 여는 함수
 * @param {boolean} auto - 5층마다 자동으로 열렸는지 여부.
 *                         true이면 상점을 닫을 때 자동으로 다음 층으로 이동.
 */
function openShop(auto = false) {
    isShopAutoOpened = auto;
    const modal = document.getElementById('shop-modal');
    modal.style.display = 'flex';
    document.getElementById('shop-coins').innerText = player.coins;

    // --- 전리품 판매 섹션 동적 추가 ---
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
    // --- 섹션 추가 끝 ---

    renderShopItems();
    log("떠돌이 상인을 만났습니다.", 'log-system');
}

/**
 * 상점 모달을 닫는 함수
 */
function closeShop() {
    document.getElementById('shop-modal').style.display = 'none';
    updateUI(); // 상점에서 나온 후 UI 갱신
    if (isShopAutoOpened) {
        isShopAutoOpened = false;
        nextFloor();
    }
}

/**
 * 상점에서 판매하는 아이템 목록을 렌더링하는 함수
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
 * 판매 가능한 전리품 목록을 렌더링하는 함수
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
        button.innerHTML = `
            ${loot.name}<br>
            <span>판매 가격: ${loot.sellPrice} G</span>
        `;
        button.onclick = () => sellLootItem(index);
        sellContainer.appendChild(button);
    });
}

/**
 * 전리품을 판매하는 함수
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
 * 상점에서 아이템을 구매하는 함수
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
//! ============================================================

/**
 * 인벤토리 모달을 여는 함수 (현재는 사용되지 않음, 컨트롤 패널에 버튼 없음)
 */
function openInventory() {
    document.getElementById('inventory-modal').style.display = 'flex';
    renderInventory();
}

/**
 * 인벤토리 모달을 닫는 함수
 */
function closeInventory() {
    document.getElementById('inventory-modal').style.display = 'none';
}

/**
 * 인벤토리 모달의 내용을 렌더링하는 함수
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

//! ============================================================
//! 9. 초기화 및 이벤트 리스너
//! ============================================================

/**
 * 게임을 시작하고 1층을 설정하는 함수
 */
function startGame() {
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
 * 키보드 입력(좌우 방향키)을 처리하여 몬스터 타겟을 변경하는 함수
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
