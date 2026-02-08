/**
 * AI-Powered Health Risk Prediction System
 * Analyzes environmental data to predict health risks
 */

// Health Risk Levels
const RISK_LEVELS = {
    SAFE: { level: 0, color: '#00c853', text: 'Safe' },
    LOW: { level: 1, color: '#ffd600', text: 'Low Risk' },
    MODERATE: { level: 2, color: '#ff9800', text: 'Moderate Risk' },
    HIGH: { level: 3, color: '#ff5722', text: 'High Risk' },
    CRITICAL: { level: 4, color: '#d50000', text: 'CRITICAL' }
};

class HealthPredictor {
    constructor() {
        this.riskHistory = [];
        this.alertCooldowns = {
            heatStroke: 0,
            respiratory: 0,
            sleepQuality: 0,
            general: 0
        };
        this.COOLDOWN_MINUTES = 15;
    }

    /**
     * Main analysis function - analyzes all health risks
     */
    analyzeHealthRisks(sensorData) {
        const { tempF, hum, air, light } = sensorData;

        // Calculate all risk factors
        const heatIndexRisk = this.calculateHeatIndexRisk(tempF, hum);
        const respiratoryRisk = this.calculateRespiratoryRisk(air, hum, tempF);
        const sleepQualityRisk = this.calculateSleepQualityRisk(tempF, hum, light);
        const overallComfortRisk = this.calculateOverallComfort(tempF, hum, air);

        // Determine highest risk
        const risks = [heatIndexRisk, respiratoryRisk, sleepQualityRisk, overallComfortRisk];
        const highestRisk = risks.reduce((max, risk) =>
            risk.level > max.level ? risk : max
        );

        // Store in history
        this.riskHistory.push({
            timestamp: Date.now(),
            overall: highestRisk,
            details: { heatIndexRisk, respiratoryRisk, sleepQualityRisk, overallComfortRisk }
        });

        // Keep only last 100 entries
        if (this.riskHistory.length > 100) {
            this.riskHistory.shift();
        }

        // Check if emergency action needed
        this.checkEmergencyAction(highestRisk, { heatIndexRisk, respiratoryRisk });

        return {
            overall: highestRisk,
            heatIndex: heatIndexRisk,
            respiratory: respiratoryRisk,
            sleepQuality: sleepQualityRisk,
            comfort: overallComfortRisk,
            recommendations: this.generateRecommendations(risks)
        };
    }

    /**
     * Calculate Heat Index and associated health risks
     */
    calculateHeatIndexRisk(tempF, humidity) {
        if (tempF < 80) {
            return {
                type: 'heatIndex',
                level: 0,
                ...RISK_LEVELS.SAFE,
                heatIndex: tempF,
                description: 'Temperature is comfortable',
                details: 'No heat-related health concerns'
            };
        }

        // Heat Index Formula (Rothfusz regression)
        const T = tempF;
        const R = humidity;

        let HI = -42.379 +
                 2.04901523 * T +
                 10.14333127 * R -
                 0.22475541 * T * R -
                 0.00683783 * T * T -
                 0.05481717 * R * R +
                 0.00122874 * T * T * R +
                 0.00085282 * T * R * R -
                 0.00000199 * T * T * R * R;

        HI = Math.round(HI * 10) / 10;

        // Determine risk level
        let risk;
        if (HI < 80) {
            risk = { ...RISK_LEVELS.SAFE, level: 0 };
        } else if (HI < 90) {
            risk = { ...RISK_LEVELS.LOW, level: 1, description: 'Caution: Possible fatigue with prolonged exposure' };
        } else if (HI < 103) {
            risk = { ...RISK_LEVELS.MODERATE, level: 2, description: 'Extreme Caution: Heat exhaustion possible' };
        } else if (HI < 125) {
            risk = { ...RISK_LEVELS.HIGH, level: 3, description: 'DANGER: Heat stroke likely' };
        } else {
            risk = { ...RISK_LEVELS.CRITICAL, level: 4, description: 'EXTREME DANGER: Heat stroke imminent!' };
        }

        return {
            type: 'heatIndex',
            heatIndex: HI,
            temperature: tempF,
            humidity: humidity,
            ...risk,
            details: this.getHeatIndexDetails(HI)
        };
    }

    getHeatIndexDetails(HI) {
        if (HI < 80) return 'Comfortable conditions';
        if (HI < 90) return 'Fatigue possible during physical activity';
        if (HI < 103) return 'Heat cramps, heat exhaustion possible. Avoid strenuous activity.';
        if (HI < 125) return 'Heat stroke, muscle cramps probable. Dangerous for elderly and children.';
        return 'IMMEDIATE DANGER: Seek air conditioning immediately!';
    }

    /**
     * Calculate respiratory health risks
     */
    calculateRespiratoryRisk(airQuality, humidity, tempF) {
        let riskScore = 0;
        let factors = [];

        // Air Quality Impact (matching dashboard thresholds)
        if (airQuality > 2000) {
            riskScore += 3;
            factors.push('Severe air pollution detected');
        } else if (airQuality >= 1000) {
            riskScore += 2;
            factors.push('High air pollution levels');
        } else if (airQuality >= 800) {
            riskScore += 1;
            factors.push('Moderate air pollution');
        } else if (airQuality >= 500) {
            riskScore += 1;
            factors.push('Good air quality but monitor');
        }

        // Humidity Impact
        if (humidity > 70) {
            riskScore += 2;
            factors.push('High humidity (breathing difficulty)');
        } else if (humidity < 30) {
            riskScore += 1;
            factors.push('Low humidity (dry airways)');
        }

        // Temperature Impact
        if (tempF > 90 || tempF < 50) {
            riskScore += 1;
            factors.push('Temperature stress');
        }

        // Compound effect
        if (humidity > 60 && airQuality > 800) {
            riskScore += 1;
            factors.push('Dangerous compound effect');
        }

        let risk;
        if (riskScore === 0) {
            risk = { ...RISK_LEVELS.SAFE };
        } else if (riskScore <= 2) {
            risk = { ...RISK_LEVELS.LOW };
        } else if (riskScore <= 4) {
            risk = { ...RISK_LEVELS.MODERATE };
        } else if (riskScore <= 6) {
            risk = { ...RISK_LEVELS.HIGH };
        } else {
            risk = { ...RISK_LEVELS.CRITICAL };
        }

        return {
            type: 'respiratory',
            score: riskScore,
            airQuality: airQuality,
            humidity: humidity,
            temperature: tempF,
            ...risk,
            factors: factors,
            description: this.getRespiratoryDescription(riskScore)
        };
    }

    getRespiratoryDescription(score) {
        if (score === 0) return 'Air quality is excellent for breathing';
        if (score === 1) return 'Good air quality, safe for everyone';
        if (score <= 3) return 'Minor irritation possible for sensitive individuals';
        if (score <= 5) return 'Asthma/COPD patients should limit outdoor exposure';
        if (score <= 7) return 'UNHEALTHY: Everyone limit outdoor activity';
        return 'HAZARDOUS: Stay indoors, use air purifier';
    }

    /**
     * Predict sleep quality
     */
    calculateSleepQualityRisk(tempF, humidity, light) {
        let sleepScore = 100;
        let issues = [];

        // Optimal sleep: 60-67°F
        if (tempF < 60) {
            sleepScore -= 20;
            issues.push('Too cold for optimal sleep');
        } else if (tempF > 67 && tempF <= 72) {
            sleepScore -= 10;
            issues.push('Slightly warm');
        } else if (tempF > 72) {
            sleepScore -= 30;
            issues.push('Too warm - sleep disruption likely');
        }

        // Optimal humidity: 30-50%
        if (humidity < 30) {
            sleepScore -= 15;
            issues.push('Dry air discomfort');
        } else if (humidity > 60) {
            sleepScore -= 25;
            issues.push('High humidity disrupts sleep');
        }

        const isNighttime = light < 500;
        if (isNighttime && light > 100) {
            sleepScore -= 15;
            issues.push('Light levels too high');
        }

        let risk;
        if (sleepScore >= 80) {
            risk = { ...RISK_LEVELS.SAFE, text: 'Excellent' };
        } else if (sleepScore >= 60) {
            risk = { ...RISK_LEVELS.LOW, text: 'Good' };
        } else if (sleepScore >= 40) {
            risk = { ...RISK_LEVELS.MODERATE, text: 'Fair' };
        } else {
            risk = { ...RISK_LEVELS.HIGH, text: 'Poor' };
        }

        return {
            type: 'sleepQuality',
            score: sleepScore,
            temperature: tempF,
            humidity: humidity,
            light: light,
            isNighttime: isNighttime,
            ...risk,
            issues: issues,
            description: `Sleep quality: ${Math.round(sleepScore)}%`
        };
    }

    /**
     * Calculate overall comfort
     */
    calculateOverallComfort(tempF, humidity, airQuality) {
        let comfortScore = 100;
        let factors = [];

        const tempDiff = Math.abs(tempF - 70);
        if (tempDiff > 15) {
            comfortScore -= 30;
            factors.push('Temperature very uncomfortable');
        } else if (tempDiff > 8) {
            comfortScore -= 15;
            factors.push('Temperature uncomfortable');
        }

        if (humidity < 30 || humidity > 70) {
            comfortScore -= 25;
            factors.push('Humidity uncomfortable');
        }

        if (airQuality > 1000) {
            comfortScore -= 30;
            factors.push('Poor air quality');
        }

        let risk;
        if (comfortScore >= 80) risk = RISK_LEVELS.SAFE;
        else if (comfortScore >= 60) risk = RISK_LEVELS.LOW;
        else if (comfortScore >= 40) risk = RISK_LEVELS.MODERATE;
        else risk = RISK_LEVELS.HIGH;

        return {
            type: 'comfort',
            score: comfortScore,
            ...risk,
            factors: factors,
            description: `Comfort: ${Math.round(comfortScore)}%`
        };
    }

    /**
     * Generate recommendations
     */
    generateRecommendations(risks) {
        const recommendations = [];
        const heatRisk = risks.find(r => r.type === 'heatIndex');
        const respRisk = risks.find(r => r.type === 'respiratory');
        const sleepRisk = risks.find(r => r.type === 'sleepQuality');

        if (heatRisk && heatRisk.level >= 2) {
            recommendations.push({
                icon: '🌡️',
                priority: heatRisk.level >= 3 ? 'high' : 'medium',
                title: 'Heat Safety',
                actions: [
                    'Stay in air-conditioned spaces',
                    'Drink plenty of water',
                    'Avoid strenuous activities',
                    'Check on elderly family'
                ]
            });
        }

        if (respRisk && respRisk.level >= 2) {
            recommendations.push({
                icon: '💨',
                priority: respRisk.level >= 3 ? 'high' : 'medium',
                title: 'Air Quality',
                actions: [
                    'Close windows',
                    'Use air purifier',
                    'Avoid outdoor exercise',
                    'Take medications if needed'
                ]
            });
        }

        if (sleepRisk && sleepRisk.level >= 2 && sleepRisk.isNighttime) {
            recommendations.push({
                icon: '😴',
                priority: 'medium',
                title: 'Sleep Optimization',
                actions: [
                    sleepRisk.temperature > 72 ? 'Lower temp to 65-68°F' : 'Adjust temperature',
                    sleepRisk.humidity > 60 ? 'Use dehumidifier' : 'Check humidity',
                    'Reduce light exposure',
                    'Use fan for circulation'
                ]
            });
        }

        return recommendations;
    }

    /**
     * Check if emergency action needed
     */
    checkEmergencyAction(highestRisk, detailedRisks) {
        const now = Date.now();

        // CRITICAL Heat Index
        if (detailedRisks.heatIndexRisk.level >= 4) {
            if (now - this.alertCooldowns.heatStroke > this.COOLDOWN_MINUTES * 60 * 1000) {
                this.triggerEmergencyAlert('HEAT STROKE RISK', detailedRisks.heatIndexRisk);
                this.alertCooldowns.heatStroke = now;
            }
        }

        // CRITICAL Respiratory
        if (detailedRisks.respiratoryRisk.level >= 4) {
            if (now - this.alertCooldowns.respiratory > this.COOLDOWN_MINUTES * 60 * 1000) {
                this.triggerEmergencyAlert('RESPIRATORY HAZARD', detailedRisks.respiratoryRisk);
                this.alertCooldowns.respiratory = now;
            }
        }
    }

    /**
     * Trigger emergency alert
     */
    triggerEmergencyAlert(alertType, riskData) {
        console.log(`🚨 EMERGENCY ALERT: ${alertType}`, riskData);

        // Browser notification
        if (Notification.permission === 'granted') {
            new Notification(`🚨 ${alertType}`, {
                body: riskData.description,
                icon: '/icon-192.png',
                tag: 'emergency-health',
                requireInteraction: true
            });
        }

        // Show banner
        this.showEmergencyBanner(alertType, riskData);

        // Trigger call if CRITICAL
        if (riskData.level >= 4) {
            this.triggerEmergencyCall(alertType, riskData);
        }
    }

    showEmergencyBanner(alertType, riskData) {
        const banner = document.createElement('div');
        banner.id = 'emergency-banner';
        banner.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: linear-gradient(135deg, #d50000, #ff5722);
            color: white;
            padding: 20px;
            text-align: center;
            z-index: 10000;
            font-size: 1.2rem;
            font-weight: bold;
            box-shadow: 0 4px 20px rgba(0,0,0,0.5);
            animation: emergencyPulse 1s infinite;
        `;
        banner.innerHTML = `
            🚨 ${alertType} 🚨<br>
            <span style="font-size: 0.9rem;">${riskData.description}</span><br>
            <button onclick="this.parentElement.remove()" style="margin-top: 10px; padding: 8px 16px; background: white; color: #d50000; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">
                ACKNOWLEDGE
            </button>
        `;

        const existing = document.getElementById('emergency-banner');
        if (existing) existing.remove();
        document.body.appendChild(banner);
    }

    async triggerEmergencyCall(alertType, riskData) {
        try {
            const response = await fetch(`${SERVER_URL}/api/emergency-call`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    alertType: alertType,
                    riskLevel: riskData.level,
                    temperature: riskData.temperature || currentSensorData.tempF,
                    reason: riskData.description
                })
            });
            if (response.ok) console.log('✅ Emergency call triggered');
        } catch (error) {
            console.error('❌ Emergency call failed:', error);
        }
    }
}

// Export
if (typeof window !== 'undefined') {
    window.HealthPredictor = HealthPredictor;
}
