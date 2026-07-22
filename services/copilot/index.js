const executiveDashboard = require('./executiveDashboard');
const executiveBriefing = require('./executiveBriefing');
const businessIntelligence = require('./businessIntelligence');
const whatIfSimulation = require('./whatIfSimulation');
const executiveCopilot = require('./executiveCopilot');
const enterpriseKpis = require('./enterpriseKpis');

function getCopilotSystemStatus() {
  return {
    systemStatus: 'ACTIVE_READY',
    copilotMode: 'EXECUTIVE_AI',
    capabilities: [
      'Executive Dashboard — Real-time enterprise health, fleet, incidents, costs',
      'AI Executive Briefing — Daily, weekly, monthly strategic summaries',
      'Business Intelligence — Maintenance costs, downtime, utilization, reliability',
      'What-If Simulation — 6 scenario types with cost/downtime/MTBF impact estimates',
      'Executive Copilot — Natural language Q&A across all platform subsystems',
      'Enterprise KPI Aggregator — 14 KPIs from 8 subsystems with unified scorecard'
    ],
    kpisAvailable: enterpriseKpis.kpiDefinitions.length,
    simulationTypes: whatIfSimulation.listSimulationTypes().length,
    copilotQuestions: executiveCopilot.getSuggestedQuestions().length,
    lastUpdated: new Date().toISOString()
  };
}

module.exports = {
  executiveDashboard,
  executiveBriefing,
  businessIntelligence,
  whatIfSimulation,
  executiveCopilot,
  enterpriseKpis,
  getCopilotSystemStatus
};
