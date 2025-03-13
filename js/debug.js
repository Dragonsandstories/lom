// Lägg till denna kod efter att alla andra skript har laddats
document.addEventListener('DOMContentLoaded', function() {
    console.log("Debug-skript laddat");
    
    const createDebugPanel = function() {
        const debugPanel = document.createElement('div');
        debugPanel.style.position = 'fixed';
        debugPanel.style.top = '10px';
        debugPanel.style.right = '10px';
        debugPanel.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        debugPanel.style.padding = '10px';
        debugPanel.style.borderRadius = '5px';
        debugPanel.style.zIndex = '10000';
        debugPanel.style.display = 'flex';
        debugPanel.style.flexDirection = 'column';
        debugPanel.style.gap = '5px';
        
        // Knapp för att visa message-overlay
        const showMessageBtn = document.createElement('button');
        showMessageBtn.textContent = 'Visa meddelande';
        showMessageBtn.onclick = function() {
            console.log("Visar testmeddelande");
            const messageText = document.getElementById('message-text');
            if (messageText) messageText.textContent = 'Detta är ett testmeddelande';
            document.getElementById('message-overlay').classList.remove('hidden');
            document.getElementById('restart-button').classList.remove('hidden');
        };
        
        // Knapp för att visa highscore-screen
        const showHighscoreBtn = document.createElement('button');
        showHighscoreBtn.textContent = 'Visa highscore';
        showHighscoreBtn.onclick = function() {
            console.log("Visar highscore-skärm");
            document.getElementById('highscore-screen').classList.remove('hidden');
        };
        
        // Knapp för att visa easter egg
        const showEasterEggBtn = document.createElement('button');
        showEasterEggBtn.textContent = 'Visa easter egg';
        showEasterEggBtn.onclick = function() {
            console.log("Visar easter egg");
            document.getElementById('easter-egg').classList.remove('hidden');
        };
        
        // Knapp för att toggla UI-overlay
        const toggleUIBtn = document.createElement('button');
        toggleUIBtn.textContent = 'Toggla UI';
        toggleUIBtn.onclick = function() {
            const uiOverlay = document.getElementById('ui-overlay');
            uiOverlay.classList.toggle('hidden');
            console.log("UI-overlay synlig:", !uiOverlay.classList.contains('hidden'));
        };
        
        // Stäng debug-panelen
        const closeBtn = document.createElement('button');
        closeBtn.textContent = 'Stäng debug';
        closeBtn.onclick = function() {
            debugPanel.remove();
        };
        
        // Lägg till knapparna till panelen
        debugPanel.appendChild(showMessageBtn);
        debugPanel.appendChild(showHighscoreBtn);
        debugPanel.appendChild(showEasterEggBtn);
        debugPanel.appendChild(toggleUIBtn);
        debugPanel.appendChild(closeBtn);
        
        // Lägg till panelen till body
        document.body.appendChild(debugPanel);
        
        console.log("Debug-panel skapad");
    };
    
    // Skapa debug-panelen när användaren trycker Ctrl+D
    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.key === 'd') {
            e.preventDefault();
            createDebugPanel();
        }
    });
});