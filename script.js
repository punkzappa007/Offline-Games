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

// Dagdagan ng sheetUrl parameter
async function populateGames(sheetUrl) {
    const allGamesGrid = document.getElementById('allGamesGrid');
    allGamesGrid.innerHTML = '<p style="color: var(--accent);">Loading games database...</p>';
    
    const games = await fetchGameData(sheetUrl); // Ipasa yung URL
    
    if (games.length === 0) {
        allGamesGrid.innerHTML = '<p style="color: red;">Error loading games. Check your Google Sheet link.</p>';
        return;
    }
    
    allGamesGrid.innerHTML = games.map(game => createGameCard(game)).join('');
}

// Pinagsamang Initialize kapag nag-load ang DOM
document.addEventListener('DOMContentLoaded', () => {
    // Unang load, Offline agad ang ipapakita
    populateGames(OFFLINE_CSV_URL);

    // Setup Tab Switching Logic
    const tabOffline = document.getElementById('tabOffline');
    const tabOnline = document.getElementById('tabOnline');

    if (tabOffline && tabOnline) {
        tabOffline.addEventListener('click', (e) => {
            e.preventDefault(); // Para hindi mag-jump ang page sa taas
            tabOffline.classList.add('active');
            tabOnline.classList.remove('active');
            populateGames(OFFLINE_CSV_URL); // Load Offline Data
        });

        tabOnline.addEventListener('click', (e) => {
            e.preventDefault();
            tabOnline.classList.add('active');
            tabOffline.classList.remove('active');
            populateGames(ONLINE_CSV_URL); // Load Online Data
        });
    }

    // Search Bar Logic
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keyup', (e) => {
            const term = e.target.value.toLowerCase();
            const cards = document.querySelectorAll('.game-card');
            
            cards.forEach(card => {
                const title = card.querySelector('h3').textContent.toLowerCase();
                if (title.includes(term)) {
                    card.style.display = 'flex';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    }
});
    }
});
