import * as React from 'react';
import * as FilterHelper from '../../../../components/FilterList/FilterHelper';
import { RenderContent } from '../../../../components/Nav/Page';
import * as ExpListv2Filters from './FiltersAndSortsv2';
import * as Iter8v2ExperimentListFilters from './FiltersAndSortsv2';
import { style } from 'typestyle';
import * as FilterComponent from '../../../../components/FilterList/FilterComponent';
import { Iter8v2Experiment, Iter8v2Info } from '../../../../types/Iter8v2';
import Namespace from '../../../../types/Namespace';
import {
  cellWidth,
  IRow,
  ISortBy,
  sortable,
  SortByDirection,
  Table,
  TableBody,
  TableHeader
} from '@patternfly/react-table';
import { PromisesRegistry } from '../../../../utils/CancelablePromises';
import * as API from '../../../../services/Api';
import * as AlertUtils from '../../../../utils/AlertUtils';
import { FilterSelected, StatefulFilters } from '../../../../components/Filters/StatefulFilters';
import history from '../../../../app/History';
import {
  Dropdown,
  DropdownItem,
  DropdownPosition,
  DropdownToggle,
  EmptyState,
  EmptyStateBody,
  EmptyStateVariant,
  PopoverPosition,
  Text,
  TextContent,
  TextVariants,
  Title,
  Tooltip,
  TooltipPosition
} from '@patternfly/react-core';
import { PFColors } from '../../../../components/Pf/PfColors';
import { KialiIcon } from '../../../../config/KialiIcon';
import { OkIcon, PowerOffIcon } from '@patternfly/react-icons';
import { Link } from 'react-router-dom';
import { KialiAppState } from '../../../../store/Store';
import { activeNamespacesSelector, durationSelector } from '../../../../store/Selectors';
import { connect } from 'react-redux';
import DefaultSecondaryMasthead from '../../../../components/DefaultSecondaryMasthead/DefaultSecondaryMasthead';
import RefreshContainer from '../../../../components/Refresh/Refresh';
import { PFBadge, PFBadges } from 'components/Pf/PfBadges';
import { namespaceEquals } from '../../../../utils/Common';
import { DurationInSeconds } from '../../../../types/Common';

// Style constants
const containerPadding = style({ padding: '20px 20px 20px 20px' });
const greenIconStyle = style({
  fontSize: '1.0em',
  color: 'green'
});
const redIconStyle = style({
  fontSize: '1.0em',
  color: 'red'
});
const statusIconStyle = style({
  fontSize: '1.0em'
});

interface Props extends FilterComponent.Props<Iter8v2Experiment> {
  duration: DurationInSeconds;
  activeNamespaces: Namespace[];
}

// State of the component/page
// It stores the visual state of the components and the experiments fetched from the backend.
interface State extends FilterComponent.State<Iter8v2Experiment> {
  iter8v2Info: Iter8v2Info;
  experimentLists: Iter8v2Experiment[];
  sortBy: ISortBy;
  dropdownOpen: boolean;
  onFilterChange: boolean;
}

const columns = [
  {
    title: 'Name',
    transforms: [sortable]
  },
  {
    title: 'Namespace',
    transforms: [sortable]
  },
  {
    title: 'Service',
    transforms: [sortable]
  },
  {
    title: 'Stage',
    transforms: [sortable, cellWidth(5) as any]
  },
  {
    title: 'Baseline',
    transforms: [sortable]
  },
  {
    title: 'Candidate',
    transforms: [sortable]
  }
];

class ExperimentListv2PageComponent extends React.Component<Props, State> {
  private promises = new PromisesRegistry();

  constructor(props: Props) {
    super(props);
    const prevCurrentSortField = FilterHelper.currentSortField(ExpListv2Filters.sortFields);
    const prevIsSortAscending = FilterHelper.isCurrentSortAscending();
    this.state = {
      iter8v2Info: {
        enabled: false,
        supportedVersion: false,
        controllerImgVersion: '',
        analyticsImgVersion: '',
        namespace: 'iter8',
        etc3: true
      },
      experimentLists: [],
      sortBy: {},
      dropdownOpen: false,
      listItems: [],
      currentSortField: prevCurrentSortField,
      isSortAscending: prevIsSortAscending,
      onFilterChange: false
    };
  }

  fetchExperiments = (namespaces: string[]) => {
    API.getIter8v2Info()
      .then(result => {
        const iter8v2Info = result.data;
        if (iter8v2Info.enabled) {
          if (!iter8v2Info.supportedVersion) {
            if (iter8v2Info.analyticsImgVersion !== '' && iter8v2Info.analyticsImgVersion.startsWith('2')) {
              AlertUtils.addError(
                'Iter8 v' +
                  iter8v2Info.analyticsImgVersion +
                  ' is not supported, please use the supported version (v1.x).'
              );
              return;
            }
            AlertUtils.addError(
              'You are running an unsupported Iter8 version, please upgrade to supported version  (v0.2+) to take advantage of the full features of Iter8 .'
            );
            return;
          }
          if (namespaces.length > 0) {
            API.getv2Experiments(namespaces)
              .then(result => {
                this.setState(prevState => {
                  return {
                    iter8v2Info: iter8v2Info,
                    experimentLists: Iter8v2ExperimentListFilters.filterBy(result.data, FilterSelected.getSelected()),
                    sortBy: prevState.sortBy
                  };
                });
              })
              .catch(error => {
                AlertUtils.addError('Could not fetch Iter8 Experiments.', error);
              });
          }
        } else {
          AlertUtils.addError(
            'Kiali has Iter8 extension enabled but it is not detected in the cluster under namespace ' +
              iter8v2Info.namespace
          );
        }
      })
      .catch(error => {
        AlertUtils.addError('Could not fetch Iter8 Info.', error);
      });
  };

  // It invokes backend when component is mounted
  componentDidMount() {
    this.updateListItems();
  }

  componentDidUpdate(prevProps: Props, _prevState: State, _snapshot: any) {
    const prevCurrentSortField = FilterHelper.currentSortField(Iter8v2ExperimentListFilters.sortFields);
    const prevIsSortAscending = FilterHelper.isCurrentSortAscending();
    if (
      !namespaceEquals(this.props.activeNamespaces, prevProps.activeNamespaces) ||
      this.props.duration !== prevProps.duration ||
      this.state.currentSortField !== prevCurrentSortField ||
      this.state.isSortAscending !== prevIsSortAscending
    ) {
      this.setState({
        currentSortField: prevCurrentSortField,
        isSortAscending: prevIsSortAscending
      });
      this.updateListItems();
    }
  }

  componentWillUnmount() {
    this.promises.cancelAll();
  }

  // Helper used for Table to sort handlers based on index column == field
  onSort = (_event, index, direction) => {
    const experimentList = this.state.experimentLists.sort((a, b) => {
      switch (index) {
        case 0:
          return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
        case 1:
          return a.namespace < b.namespace ? -1 : a.namespace > b.namespace ? 1 : 0;
        case 2:
          return a.stage < b.stage ? -1 : a.stage > b.stage ? 1 : 0;
        case 3:
          return a.stage < b.stage ? -1 : a.stage > b.stage ? 1 : 0;
        case 4:
          return a.versionInfo.baseline.name < b.versionInfo.baseline.name
            ? -1
            : a.versionInfo.baseline.name > b.versionInfo.baseline.name
            ? 1
            : 0;
      }
      return 0;
    });
    this.setState({
      experimentLists: direction === SortByDirection.asc ? experimentList : experimentList.reverse(),
      sortBy: {
        index,
        direction
      }
    });
  };

  updateListItems = () => {
    this.promises.cancelAll();
    const namespacesSelected = this.props.activeNamespaces.map(item => item.name);
    if (namespacesSelected.length !== 0) {
      this.fetchExperiments(namespacesSelected);
    } else {
      this.setState({ experimentLists: [] });
    }
  };

  // Invoke the history object to update and URL and start a routing
  goNewExperimentPage = () => {
    history.push('/extensions/iter8/new');
  };

  goNewExperimentFromFile = () => {
    history.push('/extensions/iter8/newfromfile');
  };

  // It contains a create new experiment action.
  actionsToolbar = () => {
    return (
      <Dropdown
        id="actions"
        title="Actions"
        toggle={<DropdownToggle onToggle={toggle => this.setState({ dropdownOpen: toggle })}>Actions</DropdownToggle>}
        onSelect={() => this.setState({ dropdownOpen: !this.state.dropdownOpen })}
        position={DropdownPosition.right}
        isOpen={this.state.dropdownOpen}
        dropdownItems={[
          <DropdownItem
            key="createExperiment"
            isDisabled={!this.state.iter8v2Info.enabled}
            onClick={() => this.goNewExperimentPage()}
          >
            Create New Experiment
          </DropdownItem>,
          <DropdownItem
            key="createExperimentFromFile"
            isDisabled={!this.state.iter8v2Info.enabled}
            onClick={() => this.goNewExperimentFromFile()}
          >
            Create New Experiment from YAML
          </DropdownItem>
        ]}
      />
    );
  };

  onFilterChange = () => {
    // Resetting pagination when filters change
    this.updateListItems();
  };

  toolbar = () => {
    return (
      <StatefulFilters
        initialFilters={Iter8v2ExperimentListFilters.availableFilters}
        onFilterChange={this.onFilterChange}
      />
    );
  };

  getStatusTooltip = (
    stage: string,
    winnerFound: boolean,
    winnerName: string,
    baselineName: string,
    messages: string
  ) => {
    // let statusValue = 'Status: In Progress';
    // let retStatus = status;
    // if (stage.length > 0) {
    // const values = status.split(':');
    // if (values.length > 1) {
    //   retStatus = values.slice(1)[0];
    // }
    //  if (status.includes('Failed')) {
    //    statusValue = 'Status: Failed';
    // } else if (status.includes('Completed')) {
    //   statusValue = 'Status: Completed';
    //  if (winnerName === baselineName) {
    //   retStatus = 'Traffic to Baseline';
    // }
    // }
    // }
    let retStatus = '';
    if (winnerName === baselineName || winnerName === '') {
      retStatus = 'Traffic to Baseline';
    } else {
      retStatus = 'Traffic to ' + winnerName;
    }
    return (
      <TextContent style={{ color: PFColors.White }}>
        <Text>
          <h2>Stage: </h2> {stage}
        </Text>
        <Text>
          <h2>Message: </h2> {messages}
        </Text>
        <Text>
          <h2>Winner Found: {winnerFound ? winnerName : 'False'}</h2>
          <Text component={TextVariants.p}>{retStatus} (Winning version as identified by iter8 analytics)</Text>
        </Text>
      </TextContent>
    );
  };

  experimentStatusIcon = (
    key: string,
    stage: string,
    winnerfound: boolean,
    winner: string,
    baselineName: string,
    messages: string
  ) => {
    let className = greenIconStyle;
    let toBaseline = false;
    let statusString = this.getStatusTooltip(stage, winnerfound, winner, baselineName, messages);
    //if (status.includes('Abort')) {
    //  className = greenIconStyle;
    //} else if (winnerfound) {
    //  className = redIconStyle;
    //}

    if (winner === baselineName) {
      toBaseline = true;
      className = redIconStyle;
    }
    switch (stage) {
      case 'Initializing':
        return (
          <Tooltip
            key={'Initializing_' + key}
            aria-label={'Status indicator'}
            position={PopoverPosition.auto}
            className={'health_indicator'}
            content={<>{statusString}</>}
          >
            <KialiIcon.InProgressIcon className={statusIconStyle} />
          </Tooltip>
        );
      case 'Progressing':
        return (
          <Tooltip
            key={'Progressing_' + key}
            aria-label={'Status indicator'}
            position={PopoverPosition.auto}
            className={'health_indicator'}
            content={<>{statusString}</>}
          >
            <KialiIcon.OnRunningIcon className={statusIconStyle} />
          </Tooltip>
        );
      case 'Pause':
        return (
          <Tooltip
            key={'Pause_' + key}
            aria-label={'Status indicator'}
            position={PopoverPosition.auto}
            className={'health_indicator'}
            content={<>{statusString}</>}
          >
            <KialiIcon.PauseCircle className={statusIconStyle} />
          </Tooltip>
        );
      case 'Completed':
        if (stage.includes('Abort')) {
          return (
            <Tooltip
              key={'Completed_' + key}
              aria-label={'Status indicator'}
              position={PopoverPosition.auto}
              className={'health_indicator'}
              content={<>{statusString}</>}
            >
              <PowerOffIcon className={className} />
            </Tooltip>
          );
        } else if (toBaseline) {
          return (
            <Tooltip
              key={'Completed_' + key}
              aria-label={'Status indicator'}
              position={PopoverPosition.auto}
              className={'health_indicator'}
              content={<>{statusString}</>}
            >
              <OkIcon className={className} />
            </Tooltip>
          );
        }
        return (
          <Tooltip
            key={'Completed_' + key}
            aria-label={'Status indicator'}
            position={PopoverPosition.auto}
            className={'health_indicator'}
            content={<>{statusString}</>}
          >
            <OkIcon className={className} />
          </Tooltip>
        );
      default:
        return (
          <Tooltip
            key={'default_' + key}
            aria-label={'Status indicator'}
            position={PopoverPosition.auto}
            className={'health_indicator'}
            content={<>{statusString}</>}
          >
            <KialiIcon.OnRunningIcon className={statusIconStyle} />
          </Tooltip>
        );
    }
  };

  redirectLink(namespace: string, name: string, kind: string) {
    if (kind === 'Deployment') {
      let linkTo = '/namespaces/' + namespace + '/workloads/' + name;
      return (
        <>
          <PFBadge badge={{ badge: 'W' }} />
          <Link to={linkTo}>{name}</Link>
        </>
      );
    } else {
      if (name !== '') {
        let linkTo = '/namespaces/' + namespace + '/services/' + name;
        return (
          <>
            <PFBadge badge={{ badge: 'S' }} />
            <Link to={linkTo}>{name}</Link>
          </>
        );
      } else {
        return 'N/A';
      }
    }
  }

  // Helper used to build the table content.
  rows = (): IRow[] => {
    return this.state.experimentLists.map(h => {
      let candidates: string[] = [];
      for (const c of h.versionInfo.candidates) {
        candidates.push(c.name);
      }
      let messages = '';
      if (h.messageInfo.error.trim().length > 0) {
        messages = messages.concat('Error:' + h.messageInfo.error.trim() + ' ');
      }
      if (h.messageInfo.warning.trim().length > 0) {
        messages = messages.concat('Warning:' + h.messageInfo.warning.trim() + ' ');
      }
      if (h.messageInfo.info.trim().length > 0) {
        messages = messages.concat('Info: ' + h.messageInfo.info.trim() + ' ');
      }
      return {
        cells: [
          <>
            <PFBadge
              key={`TooltipExtensionIter8Name_${h.name}`}
              badge={PFBadges.Iter8}
              position={TooltipPosition.top}
            />
            <PFBadge badge={{ badge: h.testingPattern, tt: 'Testing Strategies' }} />
            <PFBadge badge={{ badge: h.deploymentPattern, tt: 'Rollout Strategies' }} />
            <br />
            <Link
              to={`/extensions/namespaces/${h.namespace}/iter8/${h.name}?target=${h.target}&startTime=${h.startTime}&endTime=${h.lastUpdateTime}&baseline=${h.versionInfo.baseline.name}&candidates=${candidates}`}
              key={'Experiment_' + h.namespace + '_' + h.namespace}
            >
              {h.name}
            </Link>
          </>,
          <>
            <PFBadge
              key={`TooltipExtensionNamespace_${h.namespace}`}
              badge={PFBadges.Namespace}
              position={TooltipPosition.top}
            />
            {h.namespace}
          </>,
          <>
            {h.kind === 'Deployment'
              ? this.redirectLink(h.namespace, h.target, 'Service')
              : this.redirectLink(h.namespace, '', h.testingPattern)}
          </>,
          <>
            {this.experimentStatusIcon(
              h.name + '_' + h.namespace,
              h.stage,
              h.winnerFound,
              h.winner,
              h.versionInfo.baseline.name,
              messages
            )}
          </>,

          <>
            {this.redirectLink(h.versionInfo.baseline.namespace, h.versionInfo.baseline.name, h.kind)}
            <br /> {h.versionInfo.baseline.weight}%
          </>,
          <>
            {h.versionInfo.candidates.map(can => {
              return (
                <>
                  {this.redirectLink(can.namespace, can.name, h.kind)}
                  &nbsp;{can.weight}% <br />
                </>
              );
            })}
          </>
        ]
      };
    });
  };

  render() {
    return (
      <>
        <div style={{ backgroundColor: '#fff' }}>
          <DefaultSecondaryMasthead
            rightToolbar={
              <RefreshContainer
                id="exp_list_refresh"
                disabled={false}
                hideLabel={true}
                handleRefresh={this.updateListItems}
                manageURL={true}
              />
            }
            actionsToolbar={this.actionsToolbar()}
          />
        </div>
        <RenderContent>
          <div className={containerPadding}>
            {this.toolbar()}
            <Table
              aria-label="Sortable Table"
              sortBy={this.state.sortBy}
              cells={columns}
              rows={this.rows()}
              onSort={this.onSort}
            >
              <TableHeader />
              {this.state.experimentLists.length > 0 ? (
                <TableBody />
              ) : (
                <tr>
                  <td colSpan={columns.length}>
                    {this.props.activeNamespaces.length > 0 ? (
                      <EmptyState variant={EmptyStateVariant.full}>
                        <Title headingLevel="h5" size="lg">
                          No Iter8 Experiments found
                        </Title>
                        <EmptyStateBody>
                          No Iter8 Experiments in namespace
                          {this.props.activeNamespaces.length === 1
                            ? ` ${this.props.activeNamespaces[0].name}`
                            : `s: ${this.props.activeNamespaces.map(ns => ns.name).join(', ')}`}
                        </EmptyStateBody>
                      </EmptyState>
                    ) : (
                      <EmptyState variant={EmptyStateVariant.full}>
                        <Title headingLevel="h5" size="lg">
                          No namespace is selected
                        </Title>
                        <EmptyStateBody>
                          There is currently no namespace selected, please select one using the Namespace selector.
                        </EmptyStateBody>
                      </EmptyState>
                    )}
                  </td>
                </tr>
              )}
            </Table>
          </div>
        </RenderContent>
      </>
    );
  }
}

const mapStateToProps = (state: KialiAppState) => ({
  activeNamespaces: activeNamespacesSelector(state),
  duration: durationSelector(state)
});

const ExperimentListv2Page = connect(mapStateToProps)(ExperimentListv2PageComponent);
export default ExperimentListv2Page;
