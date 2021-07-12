import * as React from 'react';
import {
  Card,
  CardActions,
  CardBody,
  CardHead,
  CardHeader,
  DataList,
  DataListCell,
  DataListItem,
  DataListItemCells,
  DataListItemRow,
  Dropdown,
  DropdownItem,
  Grid,
  GridItem,
  KebabToggle,
  List,
  ListItem,
  PopoverPosition,
  Stack,
  StackItem,
  Tab,
  Tabs,
  Text,
  TextVariants,
  Title,
  Tooltip
} from '@patternfly/react-core';

import LocalTime from '../../../../components/Time/LocalTime';
import * as API from '../../../../services/Api';
import { Link } from 'react-router-dom';
import { Iter8v2ExpDetailsInfo } from '../../../../types/Iter8v2';
import { RenderComponentScroll } from '../../../../components/Nav/Page';
import { GraphType } from '../../../../types/Graph';
import history from '../../../../app/History';
import jsyaml from 'js-yaml';
import YAML from 'yaml';
import { KialiIcon } from '../../../../config/KialiIcon';
import { style } from 'typestyle';
import equal from 'fast-deep-equal';
import { PFColors } from '../../../../components/Pf/PfColors';
import { PFBadge } from 'components/Pf/PfBadges';

interface ExperimentInfoDescriptionProps {
  target: string;
  namespace: string;
  experimentDetails: Iter8v2ExpDetailsInfo;
  experiment: string;
  actionTaken: string;
}

type ExperimentInfoState = {
  isKebabOpen: boolean;
  isUpdated: boolean;
};

const infoStyle = style({
  margin: '0px 16px 2px 4px'
});

class ExperimentInfoDescription extends React.Component<ExperimentInfoDescriptionProps, ExperimentInfoState> {
  constructor(props) {
    super(props);

    this.state = {
      isKebabOpen: false,
      isUpdated: false
    };
  }

  serviceLink(namespace: string, workload: string) {
    return '/namespaces/' + namespace + '/services/' + workload;
  }

  serviceInfo() {
    let targetNamespace = this.props.experimentDetails
      ? this.props.experimentDetails.experimentItem.namespace
      : this.props.namespace;
    let targetService = this.props.experimentDetails
      ? this.props.experimentDetails.experimentItem.target
      : this.props.target;

    return [
      <DataListCell key="service-icon" isIcon={true}>
        <PFBadge badge={{ badge: 'S' }} />
      </DataListCell>,
      <DataListCell key="targetService">
        <Text component={TextVariants.h3}>Service </Text>
      </DataListCell>,
      <>{this.serviceLinkCell(targetNamespace, targetService)}</>
    ];
  }

  serviceLinkCell(namespace: string, bname: string) {
    return [
      <DataListCell key={bname}>
        <Text component={TextVariants.h3}>
          <Link to={this.serviceLink(namespace, bname)}>{bname}</Link>
        </Text>
      </DataListCell>
    ];
  }

  virtualServiceLink(namespace: string, workload: string) {
    return '/namespaces/' + namespace + '/istio/virtualservices/' + workload;
  }

  virtualServiceInfo() {
    return [
      <DataListCell key="service-icon" isIcon={true}>
        <PFBadge badge={{ badge: 'VS' }} />
      </DataListCell>,
      <DataListCell key="targetService">
        <Text component={TextVariants.h3}>Virtual Service</Text>
      </DataListCell>,
      <>
        {this.virtualServiceLinkCell(
          this.props.experimentDetails
            ? this.props.experimentDetails.experimentItem.versionInfo.baseline.weightObjRef.namespace
            : '',
          this.props.experimentDetails
            ? this.props.experimentDetails.experimentItem.versionInfo.baseline.weightObjRef.name
            : ''
        )}
      </>
    ];
  }

  virtualServiceLinkCell(namespace: string, bname: string) {
    return [
      <DataListCell key={bname} width={1}>
        <Text component={TextVariants.h3}>
          <Link to={this.virtualServiceLink(namespace, bname)}>{bname}</Link>
        </Text>
      </DataListCell>
    ];
  }

  renderDeployments(baseline: string, bNamespace: string, kind: string) {
    let linkTo = '/namespaces/' + bNamespace + '/workloads/' + baseline;
    if (kind === 'Service') {
      linkTo = '/namespaces/' + bNamespace + '/services/' + baseline;
    }
    return (
      <ListItem key={`AppService_${baseline}`}>
        <Link to={linkTo}>{baseline}</Link>
      </ListItem>
    );
  }

  baselineInfo(btype: string, bname: string, bnamespace: string, kind: string, weight: string) {
    const workloadList = this.renderDeployments(bname, bnamespace, kind);
    let badgeKind = kind === 'Deployment' ? 'W' : 'S';
    return [
      <DataListCell key="workload-icon" isIcon={true}>
        <PFBadge badge={{ badge: badgeKind }} />
      </DataListCell>,
      <DataListCell key={btype}>
        <Text component={TextVariants.h3}>{btype}</Text>
        <List>{workloadList}</List>
      </DataListCell>,
      <>{this.percentageInfo('Candidate', weight)}</>
    ];
  }

  candidatesInfo() {
    this.props.experimentDetails?.experimentItem.versionInfo.candidates.map(can => {
      let kind = this.props.experimentDetails?.experimentItem.kind
        ? this.props.experimentDetails?.experimentItem.kind
        : 'Deployment';
      return this.baselineInfo('Candidate', can.name, can.namespace, kind, can.weight);
    });
  }

  percentageInfo(bname: string, bpercentage: string) {
    return [
      <DataListCell key={bname}>
        <Text component={TextVariants.h3}>Weight</Text>
        <Text>{bpercentage} %</Text>
      </DataListCell>
    ];
  }

  defaultTab() {
    return 'trafficControl';
  }

  gatewayInfo(badgeKind: string, namespace: string, gatewayname: string) {
    let linkTo = '/namespaces/' + namespace + '/istio/gateways/' + gatewayname;
    return [
      <DataListCell key="workload-icon" isIcon={true}>
        <PFBadge badge={{ badge: badgeKind }} />
      </DataListCell>,
      <DataListCell key="gateway">
        <Text>Gateway</Text>
        <Text component={TextVariants.h3}>
          <Link to={linkTo}>{gatewayname}</Link>
        </Text>
      </DataListCell>
    ];
  }

  getConclusionList(conclusions: string[]) {
    return (
      <ul>
        {conclusions.map((sub, subIdx) => {
          return <li key={subIdx}>{sub}</li>;
        })}
      </ul>
    );
  }

  onDownloadClick = () => {
    API.getExperimentYAML(this.props.namespace, this.props.experimentDetails.experimentItem.name)
      .then(response => response.data)
      .then(data => {
        const url = window.URL.createObjectURL(
          new Blob([YAML.stringify(jsyaml.safeLoad(JSON.stringify(data, null, 2)))], { type: 'application/json' })
        );
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', this.props.experimentDetails.experimentItem.name + `.yaml`);
        // 3. Append to html page
        document.body.appendChild(link); // 4. Force download
        link.click(); // 5. Clean up and remove the link
        link.parentNode?.removeChild(link);
      });
  };

  renderCardHead() {
    const graphCardActions = [
      <DropdownItem key="viewGraph" onClick={this.showFullMetric}>
        Show service inbound metrics
      </DropdownItem>,
      <DropdownItem key="viewGraph" onClick={this.showFullGraph}>
        Show traffic graph
      </DropdownItem>,
      <DropdownItem key="viewGraph" onClick={this.onDownloadClick}>
        Download Experiment YAML
      </DropdownItem>
    ];

    return [
      <CardHead>
        <CardActions>
          <Dropdown
            toggle={<KebabToggle onToggle={this.onGraphActionsToggle} />}
            dropdownItems={graphCardActions}
            isPlain
            isOpen={this.state.isKebabOpen}
            position={'right'}
          />
        </CardActions>
        <CardHeader>
          <Title style={{ float: 'left' }} headingLevel="h3" size="2xl">
            <PFBadge badge={{ badge: this.props.experimentDetails.experimentType }} />
            &nbsp;&nbsp;
            {this.props.experimentDetails.experimentItem.name}
          </Title>
        </CardHeader>
      </CardHead>
    ];
  }

  componentDidUpdate(prevProps) {
    if (!equal(this.props.experiment, prevProps.experiment)) {
      this.setState({ isUpdated: true });
    } else if (equal(this.props.experiment, prevProps.experiment) && this.state.isUpdated) {
      this.setState({ isUpdated: false });
    }
  }

  render() {
    let stageString = this.props.experimentDetails ? this.props.experimentDetails.experimentItem.stage : '';
    let messageString = '';
    if (this.props.experimentDetails.experimentItem.messageInfo.error.trim().length > 0) {
      messageString = messageString.concat(
        'Error:' + this.props.experimentDetails.experimentItem.messageInfo.error.trim() + ' '
      );
    }
    if (this.props.experimentDetails.experimentItem.messageInfo.warning.trim().length > 0) {
      messageString = messageString.concat(
        'Warning:' + this.props.experimentDetails.experimentItem.messageInfo.warning.trim() + ' '
      );
    }
    if (this.props.experimentDetails.experimentItem.messageInfo.info.trim().length > 0) {
      messageString = messageString.concat(
        'Info: ' + this.props.experimentDetails.experimentItem.messageInfo.info.trim() + ' '
      );
    }
    let winnerInfo = '';
    let additionInfo = '';
    if (this.props.experimentDetails.experimentItem.stage.indexOf('Abort') > 0) {
      winnerInfo = ' (Tentative)';
      additionInfo = ' at the time of Termination(Abort).';
    }
    return (
      <>
        <RenderComponentScroll>
          <Grid gutter="md">
            <GridItem span={12}>
              <Grid gutter="md">
                <GridItem span={6}>
                  <Card style={{ height: '100%' }}>
                    {this.props.experimentDetails?.experimentItem.kind === 'Deployment' ? this.renderCardHead() : ''}
                    <CardBody>
                      <DataList aria-label="baseline and candidate">
                        {this.props.experimentDetails?.experimentItem.kind === 'Deployment' ? (
                          <DataListItem aria-labelledby="target">
                            <DataListItemRow>
                              <DataListItemCells dataListCells={this.serviceInfo()} />
                            </DataListItemRow>
                          </DataListItem>
                        ) : (
                          ''
                        )}
                        <DataListItem aria-labelledby="Baseline">
                          <DataListItemRow>
                            <DataListItemCells
                              dataListCells={this.baselineInfo(
                                'Baseline',
                                this.props.experimentDetails
                                  ? this.props.experimentDetails.experimentItem.versionInfo.baseline.name
                                  : '',
                                this.props.experimentDetails
                                  ? this.props.experimentDetails.experimentItem.versionInfo.baseline.namespace
                                  : '',
                                this.props.experimentDetails ? this.props.experimentDetails.experimentItem.kind : '',
                                this.props.experimentDetails
                                  ? this.props.experimentDetails.experimentItem.versionInfo.baseline.weight
                                  : '0'
                              )}
                            />
                          </DataListItemRow>
                        </DataListItem>
                        {this.props.experimentDetails?.experimentItem.versionInfo.candidates.map(can => {
                          let kind = this.props.experimentDetails?.experimentItem.kind
                            ? this.props.experimentDetails?.experimentItem.kind
                            : 'Deployment';
                          return (
                            <DataListItem aria-labelledby="Candidate(s)">
                              <DataListItemRow>
                                <DataListItemCells
                                  dataListCells={this.baselineInfo(
                                    'Candidate(s)',
                                    can.name,
                                    can.namespace,
                                    kind,
                                    can.weight
                                  )}
                                />
                              </DataListItemRow>
                            </DataListItem>
                          );
                        })}

                        <DataListItem aria-labelledby="virtualservice">
                          <DataListItemRow>
                            <DataListItemCells dataListCells={this.virtualServiceInfo()} width={4} />
                          </DataListItemRow>
                        </DataListItem>
                      </DataList>
                    </CardBody>
                  </Card>
                </GridItem>
                <GridItem span={6}>
                  <Card style={{ height: '100%' }}>
                    <CardBody>
                      <Stack gutter="md" style={{ marginTop: '10px' }}>
                        <StackItem id={'Stage'}>
                          <Text component={TextVariants.h3}> Stage: </Text>
                          {stageString}
                        </StackItem>
                        <StackItem id={'Messages'}>
                          <Text component={TextVariants.h3}> Messages: </Text>
                          {messageString}
                        </StackItem>
                        <StackItem id={'Winner'}>
                          {this.props.experimentDetails.experimentItem.lastUpdateTime !== '' ? (
                            <Grid>
                              <GridItem span={12}>
                                <StackItem>
                                  {this.props.experimentDetails.experimentItem.winnerFound ? (
                                    <>
                                      <Text component={TextVariants.h3}> Winner Found: {winnerInfo}</Text>
                                      {this.props.experimentDetails.experimentItem.winner}
                                      <Tooltip
                                        key={'winnerTooltip'}
                                        aria-label={'Winner Tooltip'}
                                        position={PopoverPosition.auto}
                                        className={'health_indicator'}
                                        content={
                                          <>
                                            {'Winning version identified by iter8 analytics'}
                                            {additionInfo}
                                          </>
                                        }
                                      >
                                        <KialiIcon.Info className={infoStyle} />
                                      </Tooltip>
                                    </>
                                  ) : (
                                    <Text component={TextVariants.h3}> Winner not Found </Text>
                                  )}
                                </StackItem>
                              </GridItem>
                            </Grid>
                          ) : (
                            <Grid>
                              <GridItem span={6}>
                                <StackItem>
                                  <Text component={TextVariants.h3}>
                                    {' '}
                                    {this.props.experimentDetails.experimentItem.lastUpdateTime === ''
                                      ? 'Current Best Version'
                                      : 'Winner Version'}{' '}
                                  </Text>
                                  {this.props.experimentDetails.experimentItem.winner}
                                </StackItem>
                              </GridItem>
                              <GridItem span={6}>
                                <StackItem></StackItem>
                              </GridItem>
                            </Grid>
                          )}
                        </StackItem>
                        <StackItem id={'VersionForPromotion'}>
                          <Text component={TextVariants.h3}> Version Recommended for Promotion: </Text>
                          {this.props.experimentDetails.experimentItem.versionRecommendedForPromotion}
                        </StackItem>
                        <StackItem>
                          <Grid>
                            <GridItem span={4}>
                              <StackItem id={'started_at'}>
                                <Text component={TextVariants.h3}> Created at </Text>
                                <LocalTime
                                  time={
                                    this.props.experimentDetails && this.props.experimentDetails.experimentItem.initTime
                                      ? this.props.experimentDetails.experimentItem.initTime
                                      : ''
                                  }
                                />
                              </StackItem>
                            </GridItem>
                            <GridItem span={4}>
                              <StackItem id={'started_at'}>
                                <Text component={TextVariants.h3}> Started at </Text>
                                <LocalTime
                                  time={
                                    this.props.experimentDetails &&
                                    this.props.experimentDetails.experimentItem.startTime
                                      ? this.props.experimentDetails.experimentItem.startTime
                                      : ''
                                  }
                                />
                              </StackItem>
                            </GridItem>
                            <GridItem span={4}>
                              <StackItem id={'ended_at'}>
                                <Text component={TextVariants.h3}> Ended at </Text>
                                <LocalTime
                                  time={
                                    this.props.experimentDetails &&
                                    this.props.experimentDetails.experimentItem.lastUpdateTime
                                      ? this.props.experimentDetails.experimentItem.lastUpdateTime
                                      : ''
                                  }
                                />
                              </StackItem>
                            </GridItem>
                          </Grid>
                        </StackItem>
                      </Stack>
                    </CardBody>
                  </Card>
                </GridItem>
              </Grid>
            </GridItem>
            <GridItem span={12}>
              <Tabs isFilled={false} activeKey={0}>
                <Tab title={'Traffic Control'} eventKey={0} style={{ backgroundColor: PFColors.White }}></Tab>
              </Tabs>
            </GridItem>
          </Grid>
        </RenderComponentScroll>
      </>
    );
  }

  private onGraphActionsToggle = (isOpen: boolean) => {
    this.setState({
      isKebabOpen: isOpen
    });
  };

  private showFullGraph = () => {
    let graphType: GraphType = GraphType.WORKLOAD;
    const graphUrl = `/graph/namespaces?graphType=${graphType}&injectServiceNodes=true&namespaces=${this.props.namespace}&idleNodes=false&edges=requestsPercentage&`;
    history.push(graphUrl);
  };

  private showFullMetric = () => {
    const graphUrl = `/namespaces/${this.props.namespace}/services/${this.props.target}?tab=metrics&bylbl=destination_version`;
    let candidateVersions: string[];
    candidateVersions = [];
    this.props.experimentDetails?.experimentItem.versionInfo.candidates.map(can => {
      candidateVersions.push(can.name);
    });
    if (this.props.experimentDetails !== undefined) {
      const params = `=${
        this.props.experimentDetails.experimentItem.versionInfo.baseline.name
      },${candidateVersions.join()}`;
      history.push(graphUrl + encodeURIComponent(params));
    } else {
      history.push(graphUrl);
    }
  };
}

export default ExperimentInfoDescription;
