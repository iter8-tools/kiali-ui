import { ObjectReference } from './IstioObjects';

export interface namedValue {
  name: string;
  value: string;
}

export interface Iter8v2VersionDetail {
  name: string;
  namespace: string;
  variables: namedValue[];
  weightObjRef: ObjectReference;
  weight: string;
  metricData: Map<string, string>;
}
export interface Iter8v2VersionInfo {
  baseline: Iter8v2VersionDetail;
  candidates: Iter8v2VersionDetail[];
}

export interface Iter8Messages {
  info: string;
  error: string;
  warning: string;
}

export interface Iter8v2Experiment {
  name: string;
  target: string;
  kind: string;
  versionInfo: Iter8v2VersionInfo;
  metricInfo: Map<string, string>;
  winnerFound: boolean;
  winner: string;
  messageInfo: Iter8Messages;
  namespace: string;
  initTime: string;
  startTime: string;
  lastUpdateTime: string;

  stage: string;
  testingPattern: string;
  deploymentPattern: string;
  versionRecommendedForPromotion: string;
}

export const emptyv2ExperimentItem: Iter8v2Experiment = {
  name: '',
  target: '',
  kind: '',
  versionInfo: {
    baseline: {
      name: '',
      namespace: '',
      variables: new Array<namedValue>(),
      weightObjRef: {
        objectType: '',
        name: '',
        namespace: ''
      },
      weight: '',
      metricData: new Map<string, string>()
    },
    candidates: [
      {
        name: '',
        namespace: '',
        variables: new Array<namedValue>(),
        weightObjRef: {
          objectType: '',
          name: '',
          namespace: ''
        },
        weight: '',
        metricData: new Map<string, string>()
      }
    ]
  },
  metricInfo: new Map<string, string>(),
  winnerFound: true,
  winner: '',
  namespace: '',
  initTime: '',
  startTime: '',
  lastUpdateTime: '',
  messageInfo: {
    info: '',
    warning: '',
    error: ''
  },
  stage: '',
  testingPattern: '',
  deploymentPattern: '',
  versionRecommendedForPromotion: ''
};

export const emptyAnalysisInfoDetail: AnalysisInfoDetail = {
  aggregatedMetrics: {
    data: new Map<string, AggregatedMetricsData>()
  },
  winnerAssessment: {
    data: new Map<string, WinnerAssessmentData>()
  },

  versionAssessments: {
    data: new Map<string, boolean[]>()
  },

  weights: {
    data: new Array<WeightData>()
  }
};

export const Emptyv2Experiment: Iter8v2ExpDetailsInfo = {
  experimentItem: emptyv2ExperimentItem,
  criteria: {
    requestCount: '',
    rewards: new Array<Reward>(),
    indicators: [''],
    objectives: new Array<Objective>()
  },
  duration: {
    intervalSeconds: 30,
    IterationsPerLoop: 10,
    MaxLoops: 100
  },
  strategy: {
    deploymentPattern: '',
    testingPattern: ''
  },
  analysis: emptyAnalysisInfoDetail,
  experimentType: ''
};

export interface Iter8v2Info {
  enabled: boolean;
  supportedVersion: boolean;
  controllerImgVersion: string;
  analyticsImgVersion: string;
  namespace: string;
  etc3: boolean;
}

export interface Durationv2 {
  intervalSeconds: number;
  IterationsPerLoop: number;
  MaxLoops: number;
}

export interface StrategyInfoDetail {
  deploymentPattern: string;
  testingPattern: string;
}
/*
export interface AggregatedMetricsVersionData {
  max: string;
  min: string;
  value: string;
  sampleSize: number;
}
*/
export interface AggregatedMetricsData {
  max: string;
  min: string;
  data: Map<string, string>;
}

export interface AggregatedMetrics {
  data: Map<string, AggregatedMetricsData>;
}

export interface WinnerAssessment {
  data: Map<string, WinnerAssessmentData>;
}
export interface WinnerAssessmentData {
  winnerFound: boolean;
  winner: string;
}
export interface VersionAssessments {
  data: Map<string, boolean[]>;
}

export interface WeightsAnalysis {
  data: WeightData[];
}
export interface WeightData {
  Name: string;
  Value: number;
}
export interface AnalysisInfoDetail {
  aggregatedMetrics: AggregatedMetrics;
  winnerAssessment: WinnerAssessment;
  versionAssessments: VersionAssessments;
  weights: WeightsAnalysis;
}

export interface Iter8v2ExpDetailsInfo {
  experimentItem: Iter8v2Experiment;
  criteria: CriteriaInfov2Detail;
  duration: Durationv2;
  strategy: StrategyInfoDetail;
  analysis: AnalysisInfoDetail;
  experimentType: string;
}

export interface Objective {
  metric: string;
  upperLimit: string;
  lowerLimit: string;
  rollback_on_failure: boolean;
}
export interface Reward {
  metric: string;
  preferredDirection: string;
}

export interface CriteriaInfov2Detail {
  requestCount: string;
  rewards: Reward[];
  indicators: string[];
  objectives: Objective[];
}
