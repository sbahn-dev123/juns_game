//! =================================================================
//! state.js
//!
//! 이 파일은 게임의 핵심 상태 변수를 정의합니다.
//! - player: 플레이어의 모든 상태 정보
//! - monsters: 현재 전투 중인 몬스터 배열
//! - floor, turn: 게임 진행 상태
//! - isPlayerTurn, isGameOver: 전투 상태 플래그
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