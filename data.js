//* 일반 몬스터 도감: 층이 올라갈수록 이 목록에서 순서대로 더 강한 몬스터가 등장합니다.
const monsterList = [
    { name: "박쥐", emoji: "🦇", hp: 35, atk: 4 },
    { name: "시궁창 쥐", emoji: "🐀", hp: 38, atk: 4 },
    { name: "작은 거미", emoji: "🕷️", hp: 42, atk: 5 },
    { name: "독버섯", emoji: "🍄", hp: 45, atk: 5 },
    { name: "초록 뱀", emoji: "🐍", hp: 50, atk: 6 },
    { name: "슬라임", emoji: "💧", hp: 55, atk: 6 },
    { name: "늑대", emoji: "🐺", hp: 60, atk: 7 },
    { name: "고블린", emoji: "👺", hp: 65, atk: 7 },
    { name: "선인장", emoji: "🌵", hp: 70, atk: 8 },
    { name: "해골 병사", emoji: "💀", hp: 75, atk: 8 },
    { name: "유령", emoji: "👻", hp: 80, atk: 10 },
    { name: "멧돼지", emoji: "🐗", hp: 85, atk: 10 },
    { name: "거대 게", emoji: "🦀", hp: 90, atk: 11 },
    { name: "좀비", emoji: "🧟", hp: 95, atk: 11 },
    { name: "리자드맨", emoji: "🦎", hp: 100, atk: 12 },
    { name: "하피", emoji: "🦅", hp: 110, atk: 12 },
    { name: "돌 골렘", emoji: "🗿", hp: 120, atk: 14, skill: { type: 'stun', chance: 0.25 } },
    { name: "뱀파이어", emoji: "🧛", hp: 130, atk: 14, skill: { type: 'drain', chance: 0.3, power: 0.5 } },
    { name: "늑대인간", emoji: "🐺", hp: 140, atk: 15 },
    { name: "오크 전사", emoji: "👹", hp: 150, atk: 15 },
    { name: "외눈박이 거인", emoji: "👁️", hp: 160, atk: 17 },
    { name: "사막 전갈", emoji: "🦂", hp: 170, atk: 17 },
    { name: "만티코어", emoji: "🦁", hp: 180, atk: 18 },
    { name: "사악한 마법사", emoji: "🧙", hp: 190, atk: 18, skill: { type: 'mp_drain', chance: 0.4, power: 15 } },
    { name: "홉고블린 대장", emoji: "👺", hp: 200, atk: 20 },
    { name: "크라켄", emoji: "🦑", hp: 210, atk: 20 },
    { name: "동굴 트롤", emoji: "👹", hp: 220, atk: 22 },
    { name: "와이번", emoji: "🐉", hp: 230, atk: 22 },
    { name: "히드라", emoji: "🦕", hp: 240, atk: 24 },
    { name: "발록", emoji: "👿", hp: 250, atk: 25 },
    { name: "리치 왕", emoji: "💀", hp: 270, atk: 28 },
    { name: "심연의 마왕", emoji: "😈", hp: 300, atk: 30 },
    { name: "지옥의 사냥개", emoji: "🐕", hp: 320, atk: 32 },
    { name: "그리폰", emoji: "🦅", hp: 340, atk: 34 },
    { name: "골렘 파수꾼", emoji: "🗿", hp: 360, atk: 36 },
    { name: "서큐버스", emoji: "💋", hp: 380, atk: 38, skill: { type: 'drain', chance: 0.3, power: 0.5 } },
    { name: "베히모스", emoji: "🦏", hp: 400, atk: 40 },
    { name: "사신", emoji: "💀", hp: 420, atk: 42 },
    { name: "고대의 정령", emoji: "✨", hp: 440, atk: 44 },
    { name: "타락한 성기사", emoji: "🤺", hp: 460, atk: 46, skill: { type: 'stun', chance: 0.25 } },
    { name: "악마 군주", emoji: "👹", hp: 480, atk: 48 },
    { name: "천공의 지배자", emoji: "🌌", hp: 500, atk: 50 },
];

//* 중간 보스 몬스터 도감: 10층, 30층, 50층 등 20층 간격으로 등장하는 특별한 몬스터입니다.
const midBossList = [
    // 10층 보스
    { name: "오크 족장", emoji: "🗿", hp: 110, atk: 18, xp: 300, dropCoins: 150, specialDrop: { type: 'permanent_stat', stat: 'str', value: 3, name: '족장의 징표', sellPrice: 500 } },
    // 30층 보스
    { name: "미노타우르스", emoji: "🐃", hp: 400, atk: 36, xp: 1100, dropCoins: 700, specialDrop: { type: 'permanent_stat', stat: 'vit', value: 3, name: '미노타우르스의 심장', sellPrice: 1200 } },
    // 50층 보스
    { name: "키메라", emoji: "🦁", hp: 680, atk: 56, xp: 2000, dropCoins: 1200, specialDrop: { type: 'xp_bonus', value: 0.15, name: '성장의 룬', sellPrice: 2500 } },
    // 70층 보스
    { name: "나가 여왕", emoji: "🐍", hp: 950, atk: 68, xp: 3200, dropCoins: 2000, specialDrop: { type: 'permanent_stat', stat: 'mnd', value: 3, name: '여왕의 비늘', sellPrice: 3500 } },
    // 90층 보스
    { name: "언데드 소서러", emoji: "💀", hp: 1300, atk: 68, xp: 5500, dropCoins: 3200, specialDrop: { type: 'permanent_stat', stat: 'int', value: 3, name: '고대 지식의 파편', sellPrice: 6000 } },
    // 110층 보스
    { name: "용암 골렘", emoji: "🌋", hp: 1750, atk: 80, xp: 8500, dropCoins: 5000, specialDrop: { type: 'permanent_stat', stat: 'vit', value: 6, name: '용암의 핵', sellPrice: 9000 } },
    // 130층 보스
    { name: "사막의 폭군", emoji: "🦂", hp: 2200, atk: 96, xp: 12000, dropCoins: 7500, specialDrop: { type: 'permanent_stat', stat: 'agi', value: 6, name: '모래의 정수', sellPrice: 13000 } },
    // 150층 보스
    { name: "심해의 지배자", emoji: "🦑", hp: 3000, atk: 120, xp: 18000, dropCoins: 11000, specialDrop: { type: 'permanent_stat', stat: 'mnd', value: 6, name: '심해의 진주', sellPrice: 20000 } },
    // 170층 보스
    { name: "별의 포식자", emoji: "🌠", hp: 4000, atk: 152, xp: 27000, dropCoins: 16000, specialDrop: { type: 'permanent_stat', stat: 'fcs', value: 6, name: '별의 조각', sellPrice: 30000 } },
    // 190층 보스
    { name: "차원의 방랑자", emoji: "💠", hp: 5200, atk: 200, xp: 40000, dropCoins: 27000, specialDrop: { type: 'permanent_stat', stat: 'luk', value: 6, name: '차원의 균열', sellPrice: 45000 } },
];

//* 메인 보스 몬스터 도감: 20층, 40층, 60층 등 20층마다 등장하는 강력한 몬스터입니다.
const bossList = [
    // 20층 보스
    { name: "거대 고블린 왕", emoji: "👑", hp: 330, atk: 28, xp: 800, dropCoins: 500, skill: { type: 'stun', chance: 0.32, name: '왕의 철퇴' }, specialDrop: { type: 'gold_bonus', value: 0.2, name: '탐욕의 왕관', sellPrice: 1500 } },
    // 40층 보스
    { name: "어둠의 기사", emoji: "⚔️", hp: 580, atk: 44, xp: 1500, dropCoins: 900, skill: { type: 'charge_attack', chance: 0.4, power: 2.5, name: '어둠의 검격' }, specialDrop: { type: 'permanent_stat', stat: 'str', value: 6, name: '기사의 맹세', sellPrice: 2000 } },
    // 60층 보스
    { name: "고대 드래곤", emoji: "🐉", hp: 950, atk: 60, xp: 2500, dropCoins: 1600, skill: { type: 'charge_attack', chance: 0.4, power: 2.8, name: '드래곤 브레스' }, specialDrop: { type: 'permanent_stat', stat: 'vit', value: 9, name: '드래곤의 심장', sellPrice: 3500 } },
    // 80층 보스
    { name: "심연의 군주", emoji: "😈", hp: 1450, atk: 72, xp: 4000, dropCoins: 2500, skill: { type: 'mp_drain', chance: 0.5, power: 80, name: '심연의 속삭임' }, specialDrop: { type: 'permanent_stat', stat: 'mnd', value: 9, name: '심연의 결정', sellPrice: 5500 } },
    // 100층 보스
    { name: "세계의 파괴자", emoji: "☄️", hp: 1800, atk: 72, xp: 7000, dropCoins: 4000, skill: { type: 'charge_attack', chance: 0.5, power: 3.5, name: '종말의 운석' }, specialDrop: { type: 'permanent_stat', stat: 'str', value: 9, name: '파괴자의 파편', sellPrice: 9000 } },
    // 120층 보스
    { name: "타락한 천사", emoji: "👼", hp: 2400, atk: 84, xp: 10000, dropCoins: 6000, skill: { type: 'drain', chance: 0.4, power: 0.8, name: '타락의 권능' }, specialDrop: { type: 'permanent_stat', stat: 'luk', value: 9, name: '타락한 깃털', sellPrice: 13000 } },
    // 140층 보스
    { name: "강철의 거신병", emoji: "🤖", hp: 3300, atk: 104, xp: 15000, dropCoins: 9000, skill: { type: 'stun', chance: 0.57, name: '강철 주먹' }, specialDrop: { type: 'permanent_stat', stat: 'vit', value: 12, name: '거신병의 동력원', sellPrice: 18000 } },
    // 160층 보스
    { name: "우주 장로", emoji: "🐙", hp: 4500, atk: 132, xp: 22000, dropCoins: 13000, skill: { type: 'charge_attack', chance: 0.6, power: 3.8, name: '우주 붕괴' }, specialDrop: { type: 'permanent_stat', stat: 'fcs', value: 12, name: '우주의 지혜', sellPrice: 28000 } },
    // 180층 보스
    { name: "혼돈의 화신", emoji: "🌀", hp: 5800, atk: 168, xp: 32000, dropCoins: 20000, skill: { type: 'mp_drain', chance: 0.7, power: 200, name: '혼돈의 소용돌이' }, specialDrop: { type: 'permanent_stat', stat: 'agi', value: 12, name: '혼돈의 정수', sellPrice: 42000 } },
    // 200층 보스
    { name: "종언의 창조주", emoji: "🌌", hp: 8000, atk: 224, xp: 50000, dropCoins: 35000, skill: { type: 'charge_attack', chance: 0.7, power: 4.5, name: '빅뱅' }, specialDrop: { type: 'permanent_stat', stat: 'fcs', value: 24, name: '창조주의 권능', sellPrice: 65000 } },
];

//* 상점에서 판매하는 방어구 목록: 티어가 높아질수록 성능과 가격이 증가합니다.
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

//* 상점에서 판매하는 HP 회복 물약 목록
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

//* 상점에서 판매하는 공격력 강화(버프) 물약 목록
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

//* 상점에서 판매하는 치명타 확률 증가(버프) 물약 목록
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

//* 각 스탯의 이름과 설명을 정의한 객체 (스탯 분배 창에서 사용)
const statInfo = {
    str: { name: '힘', description: '공격력을 2 증가시킵니다.' },
    vit: { name: '체력', description: '최대 체력을 5 증가시킵니다.' },
    mag: { name: '마력', description: 'MP 소모 스킬의 피해량을 3.5 증가시키고, 층 이동 시 MP 회복량을 2.5 증가시킵니다.' },
    mnd: { name: '정신력', description: '최대 MP를 5 증가시킵니다.' },
    agi: { name: '민첩', description: '회피 확률 2%를 증가시킵니다.' },
    int: { name: '지혜', description: '골드 획득량을 2% 증가시킵니다.' },
    luk: { name: '집중', description: '치명타 확률을 0.7% 증가시킵니다.' },
    fcs: { name: '고도의 집중', description: '흑섬 확률을 0.4% 증가시킵니다.'}
};