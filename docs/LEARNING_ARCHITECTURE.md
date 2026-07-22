# Continuous Learning & Autonomous Improvement Architecture

## Overview

The Learning System layer provides a feedback-driven continuous improvement loop for YantraMitra. It captures post-workflow outcomes, analyzes historical data to detect patterns, evaluates recommendation accuracy, generates improvement KPIs, and autonomously tunes decision weights to optimize future recommendations.

## Architecture Diagram

```
                          ┌───────────────────────────┐
                          │   External API Routes      │
                          │  /api/learning/*           │
                          └──────┬────────────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │   services/learning/     │
                    │      index.js (Facade)   │
                    └────────────┬────────────┘
                                 │
           ┌───────────┬────────┼────────┬───────────┐
           │           │        │        │           │
     ┌─────┴─────┐ ┌──┴───┐ ┌──┴───┐ ┌──┴───┐ ┌────┴────┐
     │ Feedback  │ │Outcme│ │Learn │ │Recmd │ │Adaptive │
     │ Engine    │ │Repo  │ │Engine│ │Eval  │ │Weights  │
     └─────┬─────┘ └──┬───┘ └──┬───┘ └──┬───┘ └────┬────┘
           │          │        │        │          │
           └──────────┴────────┴────────┴──────────┘
                              │
                    ┌─────────┴─────────┐
                    │ Continuous Improve │
                    │   KPIs Service     │
                    └───────────────────┘
```

## Service Modules

### 1. Feedback Engine (`feedbackEngine.js`)
- Captures post-workflow feedback with predicted vs. actual outcomes
- Stores feedback with machine, plant, workflow, cost, downtime, and rating data
- Provides filtering by machine, plant, outcome, date range
- Tracks spare parts used during maintenance
- Contains 5 synthetic seed entries for demo/CI

### 2. Outcome Repository (`outcomeRepository.js`)
- `queryOutcomes(filters)` — aggregate query with average rating, downtime, cost, total spare parts used
- `getMachineOutcomeSummary(machineId)` — per-machine success rate, total workflows, repeated spare parts
- `getWorkflowOutcomeSummary(workflowId)` — per-workflow executions, success rate, ratings, cost, downtime
- `getPlantOutcomeSummary(plantId)` — per-plant metrics including machine count and overall maintainability

### 3. Learning Engine (`learningEngine.js`)
- `analyzeRecurringFailures()` — identifies machines with multiple consecutive failures
- `analyzeIneffectiveProcedures()` — scores workflows by effectiveness based on success rate, rating, and downtime
- `analyzeRepeatedSparePartFailures()` — tracks failure rates per spare part
- `analyzeMTBFImprovement()` — estimates Mean Time Between Failures improvement
- `generateMaintenanceIntervalRecommendations()` — suggests adjusted intervals based on failure patterns
- `generateLearningInsights()` — composite insight object with all analyses + timestamp

### 4. Recommendation Evaluator (`recommendationEvaluator.js`)
- `evaluateRecommendationAccuracy()` — compares predicted vs. actual (accuracy %, drift, over/under estimation)
- `evaluateWorkflowEffectiveness()` — per-workflow success rates, rankings, overall metrics
- `evaluateMaintenanceEffectiveness()` — maintenance success rate, cost efficiency, composite score

### 5. Continuous Improvement KPIs (`continuousImprovement.js`)
8 KPIs with value, unit, trend (improving/stable/declining), and description:
- **recommendationAccuracy** — how well predictions match actuals (%)
- **workflowSuccessRate** — overall workflow success rate (%)
- **downtimeReduction** — reduction in repair downtime vs. predictions (%)
- **mtbfImprovement** — estimated MTBF change (%)
- **mttrImprovement** — estimated MTTR change (%)
- **maintenanceEffectiveness** — composite maintenance score (%)
- **fleetImprovementTrend** — fleet-wide improvement trajectory (%)
- **learningConfidence** — data confidence level based on sample count (0–100)

### 6. Adaptive Decision Weights (`adaptiveWeights.js`)
- `tuneWeightsFromOutcomes()` — analyzes outcome patterns to adjust 6 decision dimensions
- `getTunedWeights()` — returns current weight state with default indicator
- `resetWeights()` — resets to factory defaults
- Tuning adjusts: safety, reliability, cost, downtime, productionImpact, energyImpact
- Adjustments based on: failure rate, cost overrun rate, duration overrun rate, safety incident rate

## Data Flow

```
Workflow Complete → Feedback Captured → Outcome Stored → Analysis Triggered →
→ Weights Tuned → Decision Engine Uses New Weights → Future Workflow Improved
```

## API Endpoints

| Method | Endpoint                    | Description                        |
|--------|-----------------------------|------------------------------------|
| GET    | `/api/learning`             | System status + capability list    |
| GET    | `/api/learning/metrics`     | KPIs + current decision weights    |
| GET    | `/api/learning/outcomes`    | Query outcomes + learning insights |
| POST   | `/api/learning/feedback`    | Submit new workflow feedback        |

All endpoints are protected with `authApi` middleware.

## Design Decisions

1. **In-memory storage** — initial implementation keeps data in memory for simplicity; follows the existing pattern of `services/decisions` and `services/fleet`
2. **No ML retraining** — weights are adjusted heuristically based on accumulated evidence, matching the constraint to not retrain ML models
3. **Seed data** — 5 synthetic entries provide realistic patterns for development, testing, and demo purposes
4. **Vercel-safe** — no file-system or external DB dependencies; all state is ephemeral (matches the Vercel deployment model)
5. **Tests are standalone** — `node tests/continuous_learning.test.js` runs 25 tests without any test runner dependency
