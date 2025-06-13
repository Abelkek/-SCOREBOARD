// DOM Elements
const scoreboard = document.getElementById('scoreboard');
const scoreboardContainer = document.querySelector('.scoreboard-container');
const playerCount = document.getElementById('player-count');
const playerList = document.getElementById('player-list');
const closeBtn = document.getElementById('close-btn');
const serverName = document.querySelector('.server-name');
const headerEl = document.querySelector('.scoreboard-header');

// Data storage
let currentPlayerJob = null;
let currentPlayerGroup = null;
let lastReceivedData = null;
let isClosing = false;
let isDragging = false;
let dragOffset = { x: 0, y: 0 };

// Ensure DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('Scoreboard UI loaded');
    
    // Set server name from config or default
    const currentServerName = GetParentResourceName() || "FiveM Szerver";
    serverName.textContent = currentServerName;
    
    // Add draggable functionality
    initDraggable();
});

// Make scoreboard draggable
function initDraggable() {
    // Mouse down on header to start dragging
    headerEl.addEventListener('mousedown', function(e) {
        isDragging = true;
        const rect = scoreboardContainer.getBoundingClientRect();
        dragOffset.x = e.clientX - rect.left;
        dragOffset.y = e.clientY - rect.top;
        
        scoreboardContainer.style.transition = 'none';
    });
    
    // Mouse move to drag
    document.addEventListener('mousemove', function(e) {
        if (!isDragging) return;
        
        const x = e.clientX - dragOffset.x;
        const y = e.clientY - dragOffset.y;
        
        scoreboardContainer.style.position = 'absolute';
        scoreboardContainer.style.left = `${x}px`;
        scoreboardContainer.style.top = `${y}px`;
        scoreboardContainer.style.transform = 'none';
    });
    
    // Mouse up to stop dragging
    document.addEventListener('mouseup', function() {
        isDragging = false;
        scoreboardContainer.style.transition = 'transform 0.3s ease-out';
    });
}

// Listen for messages from Lua
window.addEventListener('message', function(event) {
    const data = event.data;
    console.log('Received message:', data.action);
    
    switch(data.action) {
        case 'showScoreboard':
            if (!isClosing) {
                showScoreboard(data);
            }
            break;
        case 'updateScoreboard':
            lastReceivedData = data;
            updateScoreboardData(data);
            break;
        case 'hideScoreboard':
            if (!isClosing) {
                hideScoreboard();
            }
            break;
    }
});

// Show scoreboard and populate with data
function showScoreboard(data) {
    console.log('Showing scoreboard');
    isClosing = false;
    scoreboard.classList.remove('hidden');
    scoreboard.classList.remove('fade-out');
    
    // Reset position if previously moved
    if (!scoreboardContainer.style.left) {
        scoreboardContainer.style.position = '';
        scoreboardContainer.style.left = '';
        scoreboardContainer.style.top = '';
        scoreboardContainer.style.transform = '';
    }
    
    // Add animation class
    scoreboard.classList.add('fade-in');
    setTimeout(() => {
        scoreboard.classList.remove('fade-in');
    }, 500);
    
    // If we have data in the current message, use it
    if (data.data) {
        updateScoreboardData(data);
    } 
    // Otherwise try to use the last received data
    else if (lastReceivedData) {
        console.log('Using cached data instead');
        updateScoreboardData(lastReceivedData);
    }
    // If we still don't have data, show a loading message
    else {
        console.log('No data available, showing loading state');
        playerCount.textContent = 'Betöltés...';
        playerList.innerHTML = '<tr><td colspan="9" style="text-align: center;"><i class="fas fa-spinner fa-spin" style="margin-right: 10px;"></i>Adatok betöltése...</td></tr>';
    }
}

// Update scoreboard content
function updateScoreboardData(data) {
    if (!data.data) {
        console.log('No data provided');
        return;
    }
    
    // Store player information
    currentPlayerJob = data.playerJob;
    currentPlayerGroup = data.playerGroup;
    
    // Update player count
    playerCount.textContent = `${data.data.playerCount}/${data.data.maxPlayers}`;
    
    // Clear player list
    playerList.innerHTML = '';
    
    // Check if user is admin to show additional columns
    const isAdmin = currentPlayerGroup && ['admin', 'superadmin', 'mod', 'moderator'].includes(currentPlayerGroup);
    document.querySelectorAll('.admin-only').forEach(el => {
        el.style.display = isAdmin ? 'table-cell' : 'none';
    });
    
    // Check if we have players to display
    if (data.data.players && data.data.players.length > 0) {
        // Add each player to the list
        data.data.players.forEach(player => {
            // Create row
            const row = document.createElement('tr');
            
            // Highlight player's faction members
            if (currentPlayerJob && player.job === currentPlayerJob.name) {
                row.classList.add('same-faction');
            }
            
            // Highlight admin rows
            if (player.adminLevel) {
                row.classList.add('admin-row');
            }
            
            // Create cells with player info
            row.innerHTML = `
                <td>${player.serverId}</td>
                <td>${player.name}</td>
                <td>${player.ping} ms</td>
                <td>${formatJobName(player.job)}</td>
                <td>${player.jobGrade || ''}</td>
                <td class="${player.onDuty ? 'status-on-duty' : 'status-off-duty'}">${player.onDuty ? 'Szolgálatban' : 'Szolgálaton kívül'}</td>
                ${isAdmin ? `
                <td class="admin-only">${formatIdentifier(player.identifiers?.steam)}</td>
                <td class="admin-only">${formatIdentifier(player.identifiers?.ip)}</td>
                <td class="admin-only">${player.adminLevel || 'N/A'}</td>
                ` : ''}
            `;
            
            // Add row to the table
            playerList.appendChild(row);
        });
    } else {
        // No players found
        playerList.innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; padding: 30px;">
                    <i class="fas fa-user-slash" style="font-size: 24px; margin-bottom: 10px; display: block; color: #5e7ce2;"></i>
                    Nincsenek játékosok a szerveren
                </td>
            </tr>
        `;
    }
}

// Format job name for display
function formatJobName(job) {
    // Map of job names to display names
    const jobDisplayNames = {
        'police': 'Rendőrség',
        'ambulance': 'Mentő',
        'mechanic': 'Szerelő',
        'unemployed': 'Munkanélküli'
        // Add more job mappings as needed
    };
    
    return jobDisplayNames[job] || job;
}

// Format identifier for better display
function formatIdentifier(identifier) {
    if (!identifier) return 'N/A';
    
    // Format Steam ID to show only the last part
    if (identifier.startsWith('steam:')) {
        return identifier.substring(6, 16) + '...';
    }
    
    // Format IP to hide most of it for privacy
    if (identifier.startsWith('ip:')) {
        const ipParts = identifier.substring(3).split('.');
        return ipParts[0] + '.' + ipParts[1] + '.***.**';
    }
    
    return identifier;
}

// Hide scoreboard
function hideScoreboard() {
    console.log('Hiding scoreboard');
    
    if (isClosing) return;
    
    isClosing = true;
    
    // Add animation class
    scoreboard.classList.add('fade-out');
    scoreboard.classList.remove('fade-in');
    
    // Delay hiding until animation completes
    setTimeout(() => {
        scoreboard.classList.add('hidden');
        scoreboard.classList.remove('fade-out');
        isClosing = false;
    }, 300);
}

// Close button click event
closeBtn.addEventListener('click', function() {
    console.log('Close button clicked');
    fetch(`https://${GetParentResourceName()}/close`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
    })
    .catch(error => console.error('Error:', error));
    
    hideScoreboard();
});

// Add keypress event listener for ESC key
document.addEventListener('keydown', function(event) {
    if ((event.key === "Escape" || event.key === "F10") && !isClosing) {
        closeBtn.click();
    }
}); 