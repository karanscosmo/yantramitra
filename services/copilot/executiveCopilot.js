const questions = {
  'which plant needs attention today': {
    answer: '',
    requiresData: ['plantHealth', 'activeIncidents'],
    generateAnswer: (data) => {
      const plants = data.plantHealth || [];
      if (!plants.length) return 'No plant health data available. Please check the Executive Dashboard.';
      const worst = plants.reduce((a, b) => (a.healthScore || 0) < (b.healthScore || 0) ? a : b);
      const incidents = (data.activeIncidents || []).filter(i => i.plantId === worst.plantId);
      return `**${worst.plantName || 'Unknown'}** requires immediate attention with a health score of **${worst.healthScore || 'N/A'}** (lowest across all plants) and **${incidents.length}** active incidents. Key concerns include ${worst.maintenanceBacklog || 0} maintenance backlog items and ${worst.activeAlarms || 0} active alarms. Recommended action: Escalate maintenance resources to ${worst.plantName || 'this plant'} within 24 hours.`;
    }
  },
  'why is plant a underperforming': {
    answer: '',
    requiresData: ['plantHealth'],
    generateAnswer: (data) => {
      const plantA = (data.plantHealth || []).find(p => p.plantId === 'plant-pune' || p.plantName?.toLowerCase().includes('pune'));
      if (!plantA) return 'Plant performance data not available for detailed analysis.';
      const factors = [];
      if (plantA.activeAlarms > 5) factors.push(`${plantA.activeAlarms} active alarms indicate unresolved issues`);
      if (plantA.maintenanceBacklog > 3) factors.push(`${plantA.maintenanceBacklog} maintenance items in backlog`);
      if (plantA.healthScore < 80) factors.push(`Health score of ${plantA.healthScore}% is below the 80% threshold`);
      return `**${plantA.plantName}** is underperforming due to the following factors: ${factors.join('; ') || 'Normal performance levels'}. The plant has ${plantA.runningMachines || 0}/${plantA.totalMachines || 0} machines running, with a risk level of **${plantA.riskLevel}**. Recommendation: Address ${plantA.activeAlarms > 5 ? 'alarm fatigue and ' : ''}maintenance backlog to improve health score.`;
    }
  },
  'what will happen if we postpone maintenance': {
    answer: '',
    requiresData: ['simulation'],
    generateAnswer: (data) => {
      const sim = data.simulation || {};
      const cost = sim.cost?.value || 250000;
      const downtime = sim.downtime?.value || 45;
      const mtbf = sim.mtbf?.value || 8.5;
      return `Postponing maintenance by the specified period would result in:\n- **Cost Impact**: Additional ₹${cost.toLocaleString()} in emergency repair costs\n- **Downtime**: ${downtime}h increase in unplanned downtime\n- **MTBF**: ${mtbf}% reduction in Mean Time Between Failures\n- **Risk Level**: Escalation to HIGH severity\n\n**Recommendation**: Proceed with scheduled maintenance to avoid 3-5x cost multiplier from emergency repairs.`;
    }
  },
  'which assets should we replace first': {
    answer: '',
    requiresData: ['criticalAssets'],
    generateAnswer: (data) => {
      const assets = data.criticalAssets || [];
      if (assets.length === 0) return 'No critical asset data available for replacement analysis.';
      const sorted = [...assets].sort((a, b) => (b.riskScore || 0) - (a.riskScore || 0));
      const top3 = sorted.slice(0, 3);
      return `Based on risk scoring, the following assets should be prioritized for replacement:\n${top3.map((a, i) => `${i + 1}. **${a.assetName}** (${a.plantName}) — Risk Score: ${a.riskScore}, ${a.daysSinceLastMaintenance} days since last maintenance, failure probability: ${a.failureProbability}%`).join('\n')}\n\nEstimated total replacement impact: ₹${top3.reduce((s, a) => s + (a.estimatedImpact || 0), 0).toLocaleString()}. Recommendation: Begin replacement planning for ${top3[0]?.assetName} within 2 weeks.`;
    }
  },
  'where are we losing the most money': {
    answer: '',
    requiresData: ['costImpact'],
    generateAnswer: (data) => {
      const cost = data.costImpact || {};
      const drivers = cost.topCostDrivers || [];
      const total = cost.totalMonthlyCost || 1000000;
      return `**Total monthly cost impact: ₹${total.toLocaleString()}**\n\nPrimary cost drivers:\n${drivers.map(d => `- **${d.category}**: ${d.percentage}% (₹${(d.amount || 0).toLocaleString()})`).join('\n')}\n\n**Biggest opportunity**: Reducing unplanned downtime (${drivers[0]?.percentage || 35}% of costs) through predictive maintenance could save ₹${Math.round(total * 0.15).toLocaleString()}/month. The cost trend is **${cost.costTrend || 'stable'}**.`;
    }
  },
  'what changed this week': {
    answer: '',
    requiresData: ['briefing'],
    generateAnswer: (data) => {
      const briefing = data.briefing || {};
      const events = briefing.majorEvents || briefing.majorFailures || [];
      const kpis = briefing.kpiSummary || briefing.kpiChanges || [];
      return `**This Week's Changes**\n\n**Major Events**: ${events.length > 0 ? events.slice(0, 3).map(e => `- ${e.summary || e.failure || 'Event'} [${e.severity || e.impact || 'INFO'}]`).join('\n') : 'No major events reported.'}\n\n**KPI Movements**:\n${kpis.slice(0, 3).map(k => `- ${k.metric || 'Metric'}: ${k.value || k.current || 'N/A'} (${k.change || '0%'} — ${k.trend || k.direction || 'STABLE'})`).join('\n')}\n\n**Recommendations**: Review weekly briefing for detailed action items.`;
    }
  }
};

function findBestMatch(query) {
  const q = query.toLowerCase().trim();
  const keys = Object.keys(questions);

  let bestMatch = null;
  let bestScore = 0;

  for (const key of keys) {
    const keyWords = key.split(/\s+/);
    const queryWords = q.split(/\s+/);
    let matches = 0;
    for (const kw of keyWords) {
      if (queryWords.includes(kw)) matches++;
    }
    const score = matches / Math.min(keyWords.length, Math.max(queryWords.length, 1));
    if (score > bestScore) {
      bestScore = score;
      bestMatch = key;
    }
  }

  return bestScore > 0.3 ? { key: bestMatch, score: bestScore } : null;
}

function answer(query, contextData = {}) {
  const match = findBestMatch(query);
  if (!match) {
    return {
      query,
      answered: false,
      answer: 'I understand you\'re asking about operations, but I need more specific information. Try asking about plant health, asset replacement, cost analysis, maintenance impact, or weekly changes.\n\n**Example questions**:\n- Which plant needs attention today?\n- Why is Plant A underperforming?\n- What will happen if we postpone maintenance?\n- Which assets should we replace first?\n- Where are we losing the most money?\n- What changed this week?',
      suggestions: Object.keys(questions).slice(0, 6),
      confidence: 0
    };
  }

  const matchedKey = match.key;
  const bestScore = match.score;
  const q = questions[matchedKey];
  let data = {};
  if (q.requiresData.includes('plantHealth')) data.plantHealth = contextData.plantHealth || [];
  if (q.requiresData.includes('activeIncidents')) data.activeIncidents = contextData.activeIncidents || [];
  if (q.requiresData.includes('criticalAssets')) data.criticalAssets = contextData.criticalAssets || [];
  if (q.requiresData.includes('costImpact')) data.costImpact = contextData.costImpact || null;
  if (q.requiresData.includes('briefing')) data.briefing = contextData.briefing || {};
  if (q.requiresData.includes('simulation')) {
    try {
      const sim = require('./whatIfSimulation');
      data.simulation = sim.runSimulation('delayed_maintenance', { delayDays: 30, affectedMachines: 10 });
    } catch (e) { data.simulation = {}; }
  }

  const answerText = q.generateAnswer(data);

  return {
    query,
    answered: true,
    matchedQuestion: matchedKey,
    answer: answerText,
    confidence: Math.round(bestScore * 100),
    timestamp: new Date().toISOString(),
    citations: contextData.citations || []
  };
}

function getSuggestedQuestions() {
  return Object.keys(questions).map(q => ({
    question: q.charAt(0).toUpperCase() + q.slice(1),
    category: categorizeQuestion(q)
  }));
}

function categorizeQuestion(q) {
  if (q.includes('plant')) return 'PLANT_OPERATIONS';
  if (q.includes('maintenance') || q.includes('postpone')) return 'MAINTENANCE';
  if (q.includes('asset') || q.includes('replace')) return 'ASSETS';
  if (q.includes('money') || q.includes('cost')) return 'FINANCE';
  if (q.includes('week') || q.includes('change')) return 'TRENDS';
  return 'GENERAL';
}

module.exports = {
  answer,
  getSuggestedQuestions,
  findBestMatch
};
