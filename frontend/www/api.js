//! =================================================================
//! api.js
//!
//! 이 파일은 서버 통신(API 호출)과 관련된 모든 함수를 정의합니다.
//! - 로그인, 회원가입, 로그아웃
//! - 게임 저장, 불러오기
//! - 점수 제출, 랭킹 조회
//! - 프로필 관리
//! =================================================================

// API_URL은 index.html에 포함된 config.js에서 전역 변수(window.API_URL)로 설정됩니다.
const API_URL = window.API_URL; // config.js에서 생성된 전역 변수를 상수로 할당

/**
 * 로그인 상태인지 확인하는 함수
 * @returns {boolean}
 */
function isLoggedIn() {
    return !!localStorage.getItem('jwt');
}

/**
 * 인증 토큰(JWT)이 포함된 HTTP 요청 헤더를 생성하여 반환하는 함수.
 * @returns {Headers}
 */
function getAuthHeaders() {
    const headers = new Headers({ 'Content-Type': 'application/json' });
    const token = localStorage.getItem('jwt');
    if (token) {
        headers.append('Authorization', `Bearer ${token}`);
    }
    return headers;
}

/**
 * API 응답을 공통으로 처리하고 인증 오류(토큰 만료 등)를 감지하는 함수.
 * - fetch 응답을 받아 JSON으로 파싱하고, 에러가 있으면 throw 합니다.
 * @param {Response} response - fetch API의 응답(Response) 객체.
 * @returns {Promise<any>} - 성공 시 JSON 데이터 또는 true. 인증 오류 시 null.
 */
async function handleApiResponse(response) {
    // 인증 오류 (토큰 만료, 유효하지 않은 토큰 등)
    if (response.status === 401 || response.status === 400) {
        const errorData = await response.json().catch(() => ({ message: '응답을 파싱할 수 없습니다.' }));
        if (errorData.message === '유효하지 않은 토큰입니다.' || errorData.message === '인증 토큰이 없어 접근이 거부되었습니다.') {
            alert('세션이 만료되었거나 유효하지 않습니다. 다시 로그인해주세요.');
            logout();
            showStartMenu();
            return null; // 처리되었음을 알림
        }
    }

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: '오류 메시지를 파싱할 수 없습니다.' }));
        throw new Error(errorData.message || `서버 오류: ${response.status}`);
    }

    // 내용이 없는 성공적인 응답 (e.g., 204 No Content)
    const contentType = response.headers.get("content-type");
    if (response.status === 204 || !contentType || !contentType.includes("application/json")) {
        return true;
    }

    return response.json();
}

/**
 * 회원가입 폼 데이터를 서버로 전송하여 회원가입을 처리하는 함수.
 */
async function handleRegister() {
    const username = document.getElementById('register-username').value;
    const password = document.getElementById('register-password').value;
    const email = document.getElementById('register-email').value;
    const country = document.getElementById('register-country').value;
    const birthdate = document.getElementById('register-birthdate').value;
    const errorMsgEl = document.getElementById('register-error-msg');

    try {
        const response = await fetch(`${API_URL}/users/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, email, country, birthdate }),
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || '회원가입에 실패했습니다.');
        }
        alert('회원가입 성공! 이제 로그인해주세요.');
        switchToLoginModal(new Event('submit')); // 로그인 창으로 전환
    } catch (error) {
        errorMsgEl.textContent = error.message;
        errorMsgEl.style.display = 'block';
    }
}

/**
 * 로그인 폼 데이터를 서버로 전송하여 로그인을 처리하는 함수.
 * - 성공 시 JWT 토큰을 받아 localStorage에 저장합니다.
 */
async function handleLogin() {
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    const errorMsgEl = document.getElementById('login-error-msg');

    try {
        const response = await fetch(`${API_URL}/users/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || '로그인에 실패했습니다.');
        }
        localStorage.setItem('jwt', data.token);
        localStorage.setItem('username', data.username);
        localStorage.setItem('userRole', data.role); // 역할 정보 저장
        updateLoginStatus(data.username);
        closeLoginModal();
    } catch (error) {
        errorMsgEl.textContent = error.message;
        errorMsgEl.style.display = 'block';
    }
}

/**
 * 로그아웃을 처리하는 함수.
 * - localStorage에서 사용자 정보와 토큰을 제거합니다.
 */
function logout() {
    localStorage.removeItem('jwt');
    localStorage.removeItem('username');
    localStorage.removeItem('userRole'); // 역할 정보 삭제
    updateLoginStatus(null);
    alert("로그아웃되었습니다.");
}

/**
 * 현재 게임 상태를 서버에 저장하는 함수.
 * @param {boolean} [isSilent=false] - 사용자에게 알림(alert)을 표시하지 않고 조용히 저장할지 여부.
 */
async function saveGame(isSilent = false) {
    if (!isLoggedIn()) {
        if (!isSilent) alert("로그인이 필요합니다.");
        return;
    }
    const gameState = {
        player,
        floor,
        turn,
        monsters,
        isPlayerTurn,
    };

    try {
        const response = await fetch(`${API_URL}/game/save`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(gameState),
        });

        const result = await handleApiResponse(response);
        if (result === null) return; // 인증 오류 처리됨

        if (!isSilent) {
            log("💾 게임 상태를 서버에 저장했습니다.", "log-system");
            alert("게임이 저장되었습니다. 시작 화면으로 돌아갑니다.");
            showStartMenu();
        } else {
            log("💾 자동 저장 완료.", "log-system");
        }
    } catch (error) {
        if (!isSilent) alert(`게임 저장 중 오류가 발생했습니다: ${error.message}`);
    }
}

/**
 * 서버에서 마지막으로 저장된 게임 상태를 불러오는 함수.
 * - 저장된 데이터가 없거나 유효하지 않으면 새 게임을 시작합니다.
 */
async function loadGame() {
    if (!isLoggedIn()) {
        alert("로그인이 필요합니다.");
        return;
    }
    try {
        const response = await fetch(`${API_URL}/game/load`, {
            headers: getAuthHeaders(),
        });
        if (response.status === 404) {
            alert("저장된 게임이 없습니다. 새 게임을 시작합니다.");
            startNewGame();
            return;
        }

        const loadedState = await handleApiResponse(response);
        if (loadedState === null) return; // 인증 오류 처리됨

        // Check for invalid game state (e.g., saved on game over)
        if (loadedState && loadedState.player && loadedState.player.hp <= 0) {
            alert("저장된 게임 데이터가 유효하지 않습니다. 새 게임을 시작합니다.");
            startNewGame();
            return;
        }

        showGameScreen();
        startGame(loadedState);
    } catch (error) {
        alert(`게임 불러오기에 실패했습니다: ${error.message}`);
    }
}

/**
 * 게임 점수(도달한 층)를 서버에 제출하는 함수.
 * - 게임 오버 시 호출됩니다.
 */
async function submitScore() {
    if (!isLoggedIn()) return; // 로그인 상태가 아니면 점수 제출 안 함
    
    const score = floor;
    try {
        const response = await fetch(`${API_URL}/scores`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ score, characterClass: player.characterClass }),
        });
        const result = await handleApiResponse(response);
        if (result === null) return; // 인증 오류 처리됨

        log(`🏆 최종 점수 ${score}층을 서버에 기록합니다.`, "log-system");
    } catch (error) {
        console.error("점수 제출 실패:", error);
    }
}

/**
 * 서버에서 전체 사용자 랭킹(스코어보드)을 가져와 표시하는 함수.
 */
async function fetchAndShowScores() {
    // 'N' 배지를 숨기고, 확인했다는 플래그를 저장합니다.
    const scoreboardBadgeGuest = document.getElementById('scoreboard-new-badge-guest');
    const scoreboardBadgeLoggedIn = document.getElementById('scoreboard-new-badge-loggedin');
    if (scoreboardBadgeGuest) scoreboardBadgeGuest.style.display = 'none';
    if (scoreboardBadgeLoggedIn) scoreboardBadgeLoggedIn.style.display = 'none';
    localStorage.setItem('showScoreboardNewBadge', 'false');

    try {
        const response = await fetch(`${API_URL}/scores`);
        if (!response.ok) {
            throw new Error('스코어보드를 불러오는데 실패했습니다.');
        }
        const scores = await response.json();

        // --- 실시간 1위 기록을 '확인했음'으로 저장 ---
        const liveGames = scores.filter(s => s.liveFloor && s.liveFloor > 0);
        if (liveGames.length > 0) {
            liveGames.sort((a, b) => b.liveFloor - a.liveFloor);
            const topLivePlayer = liveGames[0];
            // username과 liveFloor를 함께 저장
            localStorage.setItem('lastSeenTopLivePlayer', JSON.stringify(topLivePlayer));
        } else {
            // 실시간 게임이 없으면 확인 기록도 삭제
            localStorage.removeItem('lastSeenTopLivePlayer');
        }
        // --- 저장 로직 끝 ---

        renderScoreboard(scores);
        openScoreboardModal();
    } catch (error) {
        alert(error.message);
    }
}

/**
 * `updates.js` 파일에 정의된 공지사항 데이터를 가져와 모달에 표시하는 함수.
 */
function fetchAndShowNotices() {
    // 'N' 배지를 숨기고, 확인한 최신 버전을 저장합니다.
    const noticeBadgeGuest = document.getElementById('notice-new-badge-guest');
    const noticeBadgeLoggedIn = document.getElementById('notice-new-badge-loggedin');
    if (noticeBadgeGuest) noticeBadgeGuest.style.display = 'none';
    if (noticeBadgeLoggedIn) noticeBadgeLoggedIn.style.display = 'none';
    
    if (updateHistory.length > 0) {
        localStorage.setItem('lastSeenNoticeVersion', updateHistory[0].version);
    }

    // updates.js 파일에서 updateHistory 변수를 전역으로 사용합니다.
    if (typeof updateHistory !== 'undefined' && updateHistory.length > 0) {
        renderNotices(updateHistory);
        openNoticeModal();
    } else {
        alert('표시할 공지사항이 없습니다.');
    }
}

/**
 * 공지사항 항목을 클릭했을 때 상세 내용을 보여주거나 숨기는 함수.
 * @param {HTMLElement} element - 클릭된 `.notice-item` 요소.
 * @param {string} filePath - 불러올 상세 내용 파일의 경로.
 */
async function toggleNoticeDetail(element, filePath) {
    if (!element || !filePath) return;

    const detailsEl = element.querySelector('.notice-details');
    const isActive = element.classList.contains('active');

    // 현재 열려있는 다른 모든 항목을 닫습니다.
    document.querySelectorAll('#notice-list .notice-item.active').forEach(item => {
        if (item !== element) {
            item.classList.remove('active');
            item.querySelector('.notice-details').style.display = 'none';
        }
    });

    if (isActive) {
        // 이미 열려있으면 닫습니다.
        element.classList.remove('active');
        detailsEl.style.display = 'none';
    } else {
        // 닫혀있으면 엽니다.
        element.classList.add('active');
        
        // 내용이 아직 로드되지 않았다면 fetch로 불러옵니다.
        if (detailsEl.innerHTML.trim() === '') {
            try {
                detailsEl.textContent = '로딩 중...';
                const response = await fetch(filePath);
                if (!response.ok) throw new Error('내용을 불러올 수 없습니다.');
                detailsEl.textContent = await response.text();
            } catch (error) {
                detailsEl.textContent = error.message;
            }
        }
        detailsEl.style.display = 'block';
    }
}

/**
 * 서버에서 현재 로그인된 사용자의 프로필 정보를 가져오는 함수.
 */
async function fetchUserProfile() {
    if (!isLoggedIn()) return null;

    try {
        const response = await fetch(`${API_URL}/users/profile`, {
            headers: getAuthHeaders(),
        });
        const data = await handleApiResponse(response);
        return data;
    } catch (error) {
        console.error('프로필 정보 로딩 실패:', error);
        throw error; // 에러를 다시 던져서 openEditProfileModal에서 처리하도록 함
    }
}

/**
 * 사용자 프로필 업데이트 폼 데이터를 서버로 전송하여 정보를 수정하는 함수.
 */
async function handleUpdateProfile() {
    const email = document.getElementById('edit-email').value;
    const country = document.getElementById('edit-country').value;
    const birthdate = document.getElementById('edit-birthdate').value;
    const currentPassword = document.getElementById('edit-current-password').value;
    const newPassword = document.getElementById('edit-new-password').value;
    const confirmPassword = document.getElementById('edit-confirm-password').value;
    const errorMsgEl = document.getElementById('edit-profile-error-msg');

    errorMsgEl.style.display = 'none';

    // 새 비밀번호 유효성 검사
    if (newPassword !== confirmPassword) {
        errorMsgEl.textContent = '새 비밀번호가 일치하지 않습니다.';
        errorMsgEl.style.display = 'block';
        return;
    }

    const payload = {
        email,
        country,
        birthdate,
        currentPassword,
    };

    // 새 비밀번호가 입력된 경우에만 payload에 추가
    if (newPassword) {
        payload.newPassword = newPassword;
    }

    try {
        const response = await fetch(`${window.API_URL}/users/profile`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (response.ok) {
            alert('회원정보가 성공적으로 수정되었습니다.');
            closeEditProfileModal();
        } else {
            errorMsgEl.textContent = data.message || '정보 수정에 실패했습니다.';
            errorMsgEl.style.display = 'block';
        }
    } catch (error) {
        console.error('회원정보 수정 요청 오류:', error);
        errorMsgEl.textContent = '요청 중 오류가 발생했습니다.';
        errorMsgEl.style.display = 'block';
    }
}