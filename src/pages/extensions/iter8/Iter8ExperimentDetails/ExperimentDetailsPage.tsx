import * as React from 'react';

import ParameterizedTabs, { activeTab } from '../../../../components/Tab/Tabs';
import { RouteComponentProps } from 'react-router-dom';
import { RenderHeader } from '../../../../components/Nav/Page';
import { Tab } from '@patternfly/react-core';
import * as API from '../../../../services/Api';
import * as AlertUtils from '../../../../utils/AlertUtils';
import { Iter8v2ExpDetailsInfo, Iter8v2Info, Emptyv2Experiment } from '../../../../types/Iter8v2';
import Iter8Dropdown from './Iter8Dropdown';
import history from '../../../../app/History';
import { connect } from 'react-redux';

import ExperimentInfoDescription from './ExperimentInfoDescription';
import AssessmentDetail from './AssessmentDetail';
import { KialiAppState } from '../../../../store/Store';
import { durationSelector } from '../../../../store/Selectors';
import { TimeInMilliseconds } from '../../../../types/Common';
import RefreshContainer from '../../../../components/Refresh/Refresh';
import { WorkloadWeight } from '../../../../components/IstioWizards/TrafficShifting';

interface ExpeerimentId {
  namespace: string;
  name: string;
}

interface Props extends RouteComponentProps<ExpeerimentId> {
  lastRefreshAt: TimeInMilliseconds;
}

interface State {
  iter8Info: Iter8v2Info;
  experiment: Iter8v2ExpDetailsInfo;
  currentTab: string;
  canDelete: boolean;
  target: string;
  baseline: string;
  actionTaken: string;
  resetActionFlag: boolean;
  manualOverride: WorkloadWeight[];
  lastRefreshAt: TimeInMilliseconds;
}

const tabName = 'tab';
const defaultTab = 'overview';

const tabIndex: { [tab: string]: number } = {
  info: 0,
  assessment: 1,
  criteria: 2
};

class ExperimentDetailsPage extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    const urlParams = new URLSearchParams(history.location.search);

    let baseline = urlParams.get('baseline') || '';

    this.state = {
      iter8Info: {
        enabled: false,
        supportedVersion: false,
        analyticsImgVersion: '',
        controllerImgVersion: '',
        namespace: 'iter8',
        etc3: true
      },
      experiment: Emptyv2Experiment,
      canDelete: false,
      currentTab: activeTab(tabName, defaultTab),
      target: urlParams.get('target') || '',
      baseline: baseline,
      actionTaken: '',
      resetActionFlag: false,
      manualOverride: [],
      lastRefreshAt: Date.now()
    };
  }

  fetchExperiment = () => {
    const namespace = this.props.match.params.namespace;
    const name = this.props.match.params.name;
    API.getIter8v2Info()
      .then(result => {
        const iter8Info = result.data;
        if (iter8Info.enabled) {
          API.getv2Experiment(namespace, name)
            .then(result => {
              if (this.state.resetActionFlag) {
                this.setState({
                  iter8Info: iter8Info,
                  actionTaken: '',
                  experiment: result.data,
                  canDelete: false,
                  resetActionFlag: false,
                  lastRefreshAt: Date.now()
                });
              } else {
                this.setState({
                  experiment: result.data,
                  canDelete: false,
                  resetActionFlag: true,
                  lastRefreshAt: Date.now()
                });
              }
            })
            .catch(error => {
              AlertUtils.addError('Could not fetch Iter8 Experiment', error);
            });
        } else {
          AlertUtils.addError('Kiali has Iter8 extension enabled but it is not detected in the cluster');
        }
      })

      .catch(error => {
        AlertUtils.addError('Could not fetch Iter8 Info.', error);
      });
  };

  componentDidMount() {
    this.fetchExperiment();
  }

  componentDidUpdate(prevProps: Props) {
    if (
      this.state.currentTab !== activeTab(tabName, defaultTab) ||
      prevProps.lastRefreshAt !== this.props.lastRefreshAt
    ) {
      this.setState({
        currentTab: activeTab(tabName, defaultTab)
      });
    }
  }

  backToList = () => {
    // Back to list page
    history.push(`/extensions/iter8?namespaces=${this.props.match.params.namespace}`);
  };

  doRefresh = () => {
    this.fetchExperiment();
  };

  renderRightToolbar = () => {
    return (
      <Iter8Dropdown
        experimentName={this.props.match.params.name}
        manualOverride={this.state.manualOverride}
        canDelete={this.state.canDelete}
        startTime={this.state.experiment ? this.state.experiment.experimentItem.startTime : ''}
        endTime={this.state.experiment ? this.state.experiment.experimentItem.lastUpdateTime : ''}
        phase={this.state.experiment ? this.state.experiment.experimentItem.stage : ' '}
      />
    );
  };

  render() {
    const overviewTab = (
      <Tab eventKey={0} title="Overview" key="Overview">
        <ExperimentInfoDescription
          namespace={this.props.match.params.namespace}
          experiment={this.props.match.params.name}
          target={this.state.target}
          experimentDetails={this.state.experiment}
          actionTaken={this.state.actionTaken}
        />
      </Tab>
    );

    const assessmentTab = (
      <Tab eventKey={1} title="Assessment" key="Assessment">
        <AssessmentDetail
          lastRefreshAt={this.state.lastRefreshAt}
          iter8Info={this.state.iter8Info}
          name={this.props.match.params.name}
          namespace={this.props.match.params.namespace}
          experimentItem={this.state.experiment.experimentItem}
          fetchOp={() => this.fetchExperiment()}
        ></AssessmentDetail>
      </Tab>
    );

    const metricsTab = <Tab eventKey={2} title="Metrics" key="Metrics"></Tab>;

    const tabsArray: any[] = [overviewTab, assessmentTab, metricsTab];
    return (
      <>
        <RenderHeader
          location={this.props.location}
          rightToolbar={
            <RefreshContainer
              id="time_range_refresh"
              hideLabel={true}
              handleRefresh={this.doRefresh}
              manageURL={true}
            />
          }
          actionsToolbar={this.renderRightToolbar()}
        />
        <ParameterizedTabs
          id="basic-tabs"
          onSelect={tabValue => {
            this.setState({ currentTab: tabValue });
          }}
          tabMap={tabIndex}
          tabName={tabName}
          defaultTab={defaultTab}
          postHandler={this.fetchExperiment}
          activeTab={this.state.currentTab}
          mountOnEnter={true}
          unmountOnExit={true}
        >
          {tabsArray}
        </ParameterizedTabs>
      </>
    );
  }
}

const mapStateToProps = (state: KialiAppState) => ({
  duration: durationSelector(state),
  lastRefreshAt: state.globalState.lastRefreshAt
});

const ExperimentDetailsPageContainer = connect(mapStateToProps, null)(ExperimentDetailsPage);

export default ExperimentDetailsPageContainer;
