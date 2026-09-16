let playersData = [];

// Format currency
const formatMoney = (amount) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0
    }).format(amount);
};

// Elements
const searchInput = document.getElementById('searchInput');
const clearBtn = document.getElementById('clearBtn');
const autocompleteList = document.getElementById('autocompleteList');
const welcomeState = document.getElementById('welcomeState');
const loadingState = document.getElementById('loadingState');
const resultState = document.getElementById('resultState');

// Load Data
fetch('data/predictions.json')
    .then(response => response.json())
    .then(data => {
        playersData = data;
        renderInsights(data);
        document.getElementById('insightsState').classList.remove('hidden');
    })
    .catch(error => {
        console.error("Error loading player data:", error);
        welcomeState.querySelector('p').textContent = "Error loading data. Make sure you are running via a local server.";
    });

// Search Input Logic
searchInput.addEventListener('input', function() {
    const val = this.value.trim();
    autocompleteList.innerHTML = '';
    
    if (!val) {
        autocompleteList.classList.add('hidden');
        clearBtn.classList.add('hidden');
        return;
    }
    
    clearBtn.classList.remove('hidden');
    
    const matches = playersData.filter(player => 
        player.PLAYER_NAME.toLowerCase().includes(val.toLowerCase())
    ).slice(0, 5); // Max 5 results
    
    if (matches.length > 0) {
        autocompleteList.classList.remove('hidden');
        matches.forEach(player => {
            const div = document.createElement('div');
            div.innerHTML = `
                <span><strong>${player.PLAYER_NAME.substr(0, val.length)}</strong>${player.PLAYER_NAME.substr(val.length)}</span>
                <span class="ac-team">${player.TEAM_ABBREVIATION}</span>
            `;
            
            div.addEventListener('click', () => {
                searchInput.value = player.PLAYER_NAME;
                autocompleteList.classList.add('hidden');
                displayPlayer(player);
            });
            
            autocompleteList.appendChild(div);
        });
    } else {
        autocompleteList.classList.add('hidden');
    }
});

// Clear Button
clearBtn.addEventListener('click', () => {
    searchInput.value = '';
    autocompleteList.classList.add('hidden');
    clearBtn.classList.add('hidden');
    resultState.classList.add('hidden');
    welcomeState.classList.remove('hidden');
    searchInput.focus();
});

// Hide autocomplete when clicking outside
document.addEventListener('click', (e) => {
    if (e.target !== searchInput && e.target !== autocompleteList) {
        autocompleteList.classList.add('hidden');
    }
});

// Display Player Data
function displayPlayer(player) {
    welcomeState.classList.add('hidden');
    resultState.classList.add('hidden');
    loadingState.classList.remove('hidden');
    
    // Simulate loading for cool effect
    setTimeout(() => {
        loadingState.classList.add('hidden');
        
        // Fill basic info
        document.getElementById('playerName').textContent = player.PLAYER_NAME;
        document.getElementById('playerTeam').textContent = player.TEAM_ABBREVIATION;
        document.getElementById('playerAge').textContent = player.AGE;
        document.getElementById('playerGP').textContent = player.GP;
        
        // Fill stats
        document.getElementById('statPTS').textContent = player.PTS.toFixed(1);
        document.getElementById('statREB').textContent = player.REB.toFixed(1);
        document.getElementById('statAST').textContent = player.AST.toFixed(1);
        
        // Fill salaries
        document.getElementById('actualSalary').textContent = formatMoney(player.ACTUAL_SALARY);
        document.getElementById('predictedSalary').textContent = formatMoney(player.PREDICTED_SALARY);
        
        // Handle Verdict
        const container = document.getElementById('verdictContainer');
        const icon = document.getElementById('verdictIcon');
        const title = document.getElementById('verdictTitle');
        const desc = document.getElementById('verdictDescription');
        const diffText = document.getElementById('verdictDifference');
        
        container.className = 'verdict-container'; // Reset classes
        
        const diff = player.DIFFERENCE;
        const absDiff = Math.abs(diff);
        const margin = player.ACTUAL_SALARY * 0.1; // 10% margin for "Fair"
        
        diffText.textContent = formatMoney(absDiff);
        
        if (absDiff < margin) {
            container.classList.add('is-fair');
            icon.innerHTML = '<i class="fa-solid fa-check"></i>';
            title.textContent = "Fairly Paid";
            desc.textContent = "Player's salary matches their performance output.";
            diffText.textContent = "± " + formatMoney(absDiff);
        } else if (diff > 0) {
            // Actual > Predicted = Overpaid
            container.classList.add('is-overpaid');
            icon.innerHTML = '<i class="fa-solid fa-arrow-trend-down"></i>';
            title.textContent = "Overpaid (Bag Alert)";
            desc.textContent = "Player is making more money than their stats justify.";
        } else {
            // Actual < Predicted = Underpaid
            container.classList.add('is-underpaid');
            icon.innerHTML = '<i class="fa-solid fa-gem"></i>';
            title.textContent = "Underpaid (Steal)";
            desc.textContent = "Player is generating far more value than their contract.";
        }
        
        // Handle AI Analysis (Fairly Paid olanlarda gizle, LLM sadece Overpaid/Underpaid biliyor)
        const aiCard = document.getElementById('aiAnalysisCard');
        const aiText = document.getElementById('aiAnalysisText');
        const aiBadges = document.getElementById('aiBadges');
        
        if (absDiff >= margin && player.LLM_ANALYSIS && player.KEY_DRIVERS) {
            aiText.textContent = player.LLM_ANALYSIS;
            
            // Clear old badges
            aiBadges.innerHTML = '';
            
            // Parse and create badges
            const drivers = player.KEY_DRIVERS.split(',').map(d => d.trim()).filter(d => d);
            drivers.forEach(driver => {
                const badge = document.createElement('span');
                badge.className = 'ai-badge';
                badge.innerHTML = `<i class="fa-solid fa-tag" style="margin-right:5px; font-size:0.7rem;"></i> ${driver}`;
                aiBadges.appendChild(badge);
            });
            
            aiCard.classList.remove('hidden');
        } else {
            if(aiCard) aiCard.classList.add('hidden');
        }

        resultState.classList.remove('hidden');
    }, 600); // 600ms fake loading
}

// Render League Insights (Chart.js)
let scatterChartInstance = null;
let barChartInstance = null;

function renderInsights(data) {
    // 1. Scatter Plot (Actual vs Predicted)
    const scatterData = data.map(p => {
        const diff = p.DIFFERENCE;
        const absDiff = Math.abs(diff);
        const margin = p.ACTUAL_SALARY * 0.1;
        
        let color = '#dc2626'; // Overpaid (Red)
        if (absDiff < margin) {
            color = '#eab308'; // Fairly Paid (Yellow)
        } else if (diff < 0) {
            color = '#16a34a'; // Underpaid (Green)
        }
        
        return {
            x: p.ACTUAL_SALARY / 1e6, // In Millions
            y: p.PREDICTED_SALARY / 1e6,
            player: p.PLAYER_NAME,
            team: p.TEAM_ABBREVIATION,
            bgColor: color
        };
    });
    
    const maxVal = Math.max(...scatterData.map(d => Math.max(d.x, d.y))) + 2;

    const ctxScatter = document.getElementById('scatterChart').getContext('2d');
    if (scatterChartInstance) scatterChartInstance.destroy();
    
    scatterChartInstance = new Chart(ctxScatter, {
        type: 'scatter',
        data: {
            datasets: [
                {
                    label: 'NBA Players',
                    data: scatterData,
                    backgroundColor: scatterData.map(d => d.bgColor),
                    pointRadius: 6,
                    pointHoverRadius: 9,
                    borderWidth: 1,
                    borderColor: '#ffffff'
                },
                {
                    type: 'line',
                    label: 'Exact Match (y=x)',
                    data: [{x: 0, y: 0}, {x: maxVal, y: maxVal}],
                    borderColor: '#0f172a',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    fill: false,
                    pointRadius: 0,
                    pointHoverRadius: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(ctx) {
                            if (ctx.datasetIndex === 1) return 'Exact Match (y=x)';
                            const p = ctx.raw;
                            return `${p.player} (${p.team}) | Actual: $${p.x.toFixed(1)}M | Predicted: $${p.y.toFixed(1)}M`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    title: { display: true, text: 'Actual Salary (Millions $)', font: { weight: 'bold' } },
                    grid: { color: '#e2e8f0' }
                },
                y: {
                    title: { display: true, text: 'Predicted Salary (Millions $)', font: { weight: 'bold' } },
                    grid: { color: '#e2e8f0' }
                }
            }
        }
    });

    // 2. Bar Chart (Top 10 Overpaid & Underpaid)
    const overpaid = [...data].sort((a, b) => b.DIFFERENCE - a.DIFFERENCE).slice(0, 10);
    const underpaid = [...data].sort((a, b) => a.DIFFERENCE - b.DIFFERENCE).slice(0, 10);
    
    const barLabels = [];
    const barData = [];
    const barColors = [];
    
    overpaid.forEach(p => {
        barLabels.push(p.PLAYER_NAME);
        barData.push(p.DIFFERENCE / 1e6); // Positive
        barColors.push('#dc2626');
    });
    
    underpaid.forEach(p => {
        barLabels.push(p.PLAYER_NAME);
        barData.push(p.DIFFERENCE / 1e6); // Negative
        barColors.push('#16a34a');
    });

    const ctxBar = document.getElementById('barChart').getContext('2d');
    if (barChartInstance) barChartInstance.destroy();
    
    barChartInstance = new Chart(ctxBar, {
        type: 'bar',
        data: {
            labels: barLabels,
            datasets: [{
                label: 'Salary Difference (Millions $)',
                data: barData,
                backgroundColor: barColors
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(ctx) {
                            const val = ctx.raw;
                            const prefix = val > 0 ? "Overpaid by" : "Underpaid by";
                            return `${prefix} $${Math.abs(val).toFixed(2)}M`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    title: { display: true, text: 'Difference (Millions $)', font: { weight: 'bold' } },
                    grid: { color: '#e2e8f0' }
                },
                y: {
                    grid: { display: false },
                    ticks: { font: { weight: 'bold', family: 'Outfit' } }
                }
            }
        }
    });
}
