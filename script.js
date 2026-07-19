// Ilagay dito ang CSV link mula sa "Publish to web" ng Google Sheets mo
const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSJ_lcgCnFcVd8hiNtxdRBkAkT501hb59-tPFkYMEvJkCb6yMZp2Fc8noZYxMEZVGZwY0OWtItWJuZc/pub?output=csv';
// Ilagay dito yung dalawang magkaibang link
const OFFLINE_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSJ_lcgCnFcVd8hiNtxdRBkAkT501hb59-tPFkYMEvJkCb6yMZp2Fc8noZYxMEZVGZwY0OWtItWJuZc/pub?gid=0&single=true&output=csv';
const ONLINE_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSJ_lcgCnFcVd8hiNtxdRBkAkT501hb59-tPFkYMEvJkCb6yMZp2Fc8noZYxMEZVGZwY0OWtItWJuZc/pub?gid=1711893319&single=true&output=csv';

// Baguhin ang fetchGameData para tumanggap ng URL parameter
async function fetchGameData(sheetUrl) {
    try {
        const response = await fetch(sheetUrl);
        const data = await response.text();
        return parseCSV(data);
    } catch (error) {
        console.error('Error fetching game data:', error);
        return [];
    }
}


function parseCSV(csvText) {
    const lines = csvText.split('\n');
    const result = [];
    
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Idinagdag natin ang 'customImg' sa dulo
        const [title, price, genre, appId, players, type, setup, size, customImg] = line.split(',');

        // Steam Image URL
        const steamUrl = appId ? `https://cdn.akamai.steamstatic.com/steam/apps/${appId.trim()}/header.jpg` : '';
        
        // LOGIC: Kung may custom image, yun ang gamitin. Kung wala, check ang Steam AppID. Kung wala pa rin, fallback.
        const imageUrl = (customImg && customImg.trim() !== '') ? customImg.trim() : steamUrl;

        result.push({
            name: title,
            price: price,
            genres: genre,
            image: imageUrl,
            // Pinalitan ko yung fallback image ng mas dark na placeholder para bumagay sa theme mo
            fallbackImage: "https://placehold.co/400x160/1a1a1a/4a9eff?text=No+Image", 
            players: players,
            type: type,
            setup: setup,
            size: size
        });
    }
    return result;
}

function createGameCard(game) {
    const imageHtml = game.image 
        ? `<div class="game-image">
             <img src="${game.image}" 
                  alt="${game.name}" 
                  loading="lazy"
                  onerror="this.src='${game.fallbackImage}'; this.onerror=function(){this.style.display='none'; this.parentElement.classList.add('no-image');}">
             <div class="game-icon-fallback">🎮</div>
           </div>`
        : `<div class="game-icon">🎮</div>`;
    
    const typeBadgeClass = game.type?.toLowerCase().includes('co-op') ? 'badge-coop' : 'badge-pvp';
    const setupBadgeClass = game.setup?.toLowerCase().includes('only') ? 'badge-diskless-only' : 'badge-diskless-trad';
    
    // Check kung may nakalagay na size sa sheet para hindi lumabas kung blangko
    const sizeTagHtml = game.size ? `<span class="tag badge-size">💾 ${game.size}</span>` : '';
    
    return `
        <div class="game-card">
            ${imageHtml}
            <div class="game-info">
                <h3>${game.name}</h3>
                <div class="game-meta">${game.genres || 'Action, Adventure'}</div>
                <div class="game-tags">
                    <span class="tag">${game.players || '1 Player'}</span>
                    <span class="tag ${typeBadgeClass}">${game.type || 'Offline'}</span>
                    <span class="tag ${setupBadgeClass}">${game.setup || 'Diskless & Trad'}</span>
                    ${sizeTagHtml}
                </div>
                <div class="price-tag">${game.price || 'Free'}</div>
            </div>
        </div>
    `;
}

// --- PAGINATION & STATE VARIABLES ---
let masterGamesList = [];
let filteredGamesList = [];
let currentPage = 1;
const GAMES_PER_PAGE = 24; // Dito mo papalitan kung ilang laro kada page

// --- MAIN FUNCTIONS ---
async function populateGames(sheetUrl) {
    const allGamesGrid = document.getElementById('allGamesGrid');
    allGamesGrid.innerHTML = '<p style="color: var(--accent);">Loading games database...</p>';
    
    // Reset page kapag nag-switch tab (Offline/Online)
    currentPage = 1; 

    const games = await fetchGameData(sheetUrl);
    
    if (games.length === 0) {
        allGamesGrid.innerHTML = '<p style="color: red;">Error loading games. Check your Google Sheet link.</p>';
        document.getElementById('paginationControls').innerHTML = ''; 
        return;
    }
    
    // I-save ang data sa global variables para ma-cut by page
    masterGamesList = games;
    filteredGamesList = games; 
    
    renderPage();
}

function renderPage() {
    const allGamesGrid = document.getElementById('allGamesGrid');
    const totalCountSpan = document.getElementById('totalGamesCount'); // Kukunin natin yung span
    
    // Logic para makuha lang ang games per page
    const startIndex = (currentPage - 1) * GAMES_PER_PAGE;
    const endIndex = startIndex + GAMES_PER_PAGE;
    const gamesToShow = filteredGamesList.length > 0 ? filteredGamesList.slice(startIndex, endIndex) : [];

    // I-update ang text ng total games (Halimbawa: "(150 games)")
    if (totalCountSpan) {
        totalCountSpan.textContent = `(${filteredGamesList.length} games)`;
    }

    if (gamesToShow.length === 0) {
        allGamesGrid.innerHTML = '<p style="color: var(--text-secondary);">Walang nahanap na laro.</p>';
    } else {
        allGamesGrid.innerHTML = gamesToShow.map(game => createGameCard(game)).join('');
    }

    renderPaginationControls();
}

function renderPaginationControls() {
    const paginationContainer = document.getElementById('paginationControls');
    const paginationContainerTop = document.getElementById('paginationControlsTop'); // Kinuha natin ang top container
    const totalPages = Math.ceil(filteredGamesList.length / GAMES_PER_PAGE);

    if (totalPages <= 1) {
        if (paginationContainer) paginationContainer.innerHTML = ''; 
        if (paginationContainerTop) paginationContainerTop.innerHTML = '';
        return;
    }

    let html = '';

    // Back Button
    html += `<button class="page-btn ${currentPage === 1 ? 'disabled' : ''}" onclick="changePage(${currentPage - 1})">Back</button>`;

    // Page Numbers (1, 2, 3...)
    for (let i = 1; i <= totalPages; i++) {
        html += `<button class="page-btn ${currentPage === i ? 'active' : ''}" onclick="changePage(${i})">${i}</button>`;
    }

    // Next Button
    html += `<button class="page-btn ${currentPage === totalPages ? 'disabled' : ''}" onclick="changePage(${currentPage + 1})">Next</button>`;

    // I-apply ang nabuong HTML sa parehong lalagyan
    if (paginationContainer) paginationContainer.innerHTML = html;
    if (paginationContainerTop) paginationContainerTop.innerHTML = html;
}

// Global function para matawag kapag pinindot ang page buttons
window.changePage = function(newPage) {
    const totalPages = Math.ceil(filteredGamesList.length / GAMES_PER_PAGE);
    if (newPage >= 1 && newPage <= totalPages) {
        currentPage = newPage;
        renderPage();
        // Automatic scroll pataas kapag lumipat ng page para makita agad yung first game
        window.scrollTo({ top: 0, behavior: 'smooth' }); 
    }
};

// --- INITIALIZATION & EVENT LISTENERS ---
document.addEventListener('DOMContentLoaded', () => {
    // Unang load, Offline agad ang ipapakita
    populateGames(OFFLINE_CSV_URL);

    // Setup Tab Switching Logic (Offline/Online)
    const tabOffline = document.getElementById('tabOffline');
    const tabOnline = document.getElementById('tabOnline');

    if (tabOffline && tabOnline) {
        tabOffline.addEventListener('click', (e) => {
            e.preventDefault(); 
            tabOffline.classList.add('active');
            tabOnline.classList.remove('active');
            document.getElementById('searchInput').value = ''; // I-clear ang search pag switch tab
            populateGames(OFFLINE_CSV_URL); 
        });

        tabOnline.addEventListener('click', (e) => {
            e.preventDefault();
            tabOnline.classList.add('active');
            tabOffline.classList.remove('active');
            document.getElementById('searchInput').value = ''; // I-clear ang search pag switch tab
            populateGames(ONLINE_CSV_URL); 
        });
    }

    // Search Bar Logic (Bagong logic na hindi bumabangga sa pagination)
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keyup', (e) => {
            const term = e.target.value.toLowerCase();
            
            // I-filter ang master list
            filteredGamesList = masterGamesList.filter(game => 
                game.name.toLowerCase().includes(term)
            );
            
            // I-reset sa Page 1 tuwing may bago nang tina-type
            currentPage = 1; 
            renderPage();
        });
    }
});
