// Quick patch script - Run this in browser console to test the 70/30 layout
// Then we'll apply it properly to the HTML file

// This demonstrates the layout change
console.log('Applying 70/30 layout with health sidebar...');

// Wrap dashboard in container
const body = document.body;
const header = document.querySelector('.header');
const dashboardGrid = document.querySelector('.dashboard-grid');
const bottomSection = document.querySelector('.bottom-section');

// Create main container
const mainContainer = document.createElement('div');
mainContainer.className = 'main-content-container';
mainContainer.style.cssText = `
    display: flex;
    gap: 18px;
    flex: 1;
    min-height: 0;
    overflow: hidden;
`;

// Create dashboard container (70%)
const dashContainer = document.createElement('div');
dashContainer.className = 'dashboard-container';
dashContainer.style.cssText = `
    flex: 0 0 70%;
    display: flex;
    flex-direction: column;
    gap: 18px;
    min-height: 0;
    overflow-y: auto;
`;

// Create health panel (30%)
const healthPanel = document.createElement('div');
healthPanel.className = 'health-panel';
healthPanel.innerHTML = `
    <div class="health-panel-header">
        <h2>❤️ Health Risk Analysis</h2>
        <button class="refresh-health-btn" onclick="refreshHealthAnalysis()">🔄</button>
    </div>
    <div id="overallRiskStatus" style="padding: 20px; border-radius: 12px; text-align: center;">
        <div style="font-size: 2rem;">⏳</div>
        <div style="font-weight: bold; margin-top: 8px;">Analyzing...</div>
    </div>
    <!-- Add health cards here -->
`;

console.log('Layout transformation complete!');
