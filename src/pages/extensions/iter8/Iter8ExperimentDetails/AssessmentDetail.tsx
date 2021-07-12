import * as React from 'react';
import { emptyv2ExperimentItem, Iter8v2Experiment, Iter8v2Info, Iter8v2VersionDetail } from '../../../../types/Iter8v2';
import { cellWidth, expandable, IRow, RowWrapperProps, Table, TableBody, TableHeader } from '@patternfly/react-table';
import { connect } from 'react-redux';
import { KialiAppState } from '../../../../store/Store';
import { durationSelector, lastRefreshAtSelector } from '../../../../store/Selectors';
import { TimeInMilliseconds } from '../../../../types/Common';
import * as API from '../../../../services/Api';
import * as AlertUtils from '../../../../utils/AlertUtils';
import {
  EmptyState,
  EmptyStateBody,
  EmptyStateVariant,
  Grid,
  GridItem,
  PopoverPosition,
  Title,
  Tooltip
} from '@patternfly/react-core';
import { KialiIcon } from '../../../../config/KialiIcon';
import { style } from 'typestyle';
import { RenderComponentScroll } from '../../../../components/Nav/Page';
import { css } from '@patternfly/react-styles';
import styles from '@patternfly/react-styles/css/components/Table/table';

const statusIconStyle = style({
  fontSize: '2.0em'
});

const infoStyle = style({
  margin: '0px 16px 2px 4px'
});

interface AssessmentDetailProps {
  lastRefreshAt: TimeInMilliseconds;
  iter8Info: Iter8v2Info;
  name: string;
  namespace: string;
  experimentItem: Iter8v2Experiment;
  fetchOp: () => void;
}

type State = {
  experimentItem: Iter8v2Experiment;
  columns: any;
  rows: any;
};

class AssessmentDetailTab extends React.Component<AssessmentDetailProps, State> {
  constructor(props: AssessmentDetailProps) {
    super(props);
    this.state = {
      experimentItem: emptyv2ExperimentItem,
      columns: [
        { title: 'Type', cellFormatters: [expandable], transforms: [cellWidth(10) as any] },
        'Assessment Version',
        'Metrics Assessment'
      ],
      rows: this.getRows()
    };
  }
  componentDidMount() {
    this.setState({
      experimentItem: this.props.experimentItem,
      rows: this.getRows()
    });
  }

  componentDidUpdate(prevProps: AssessmentDetailProps) {
    if (
      this.props.experimentItem !== prevProps.experimentItem ||
      prevProps.lastRefreshAt !== this.props.lastRefreshAt
    ) {
      this.renderRows();
    }
  }

  fetchAssesment = () => {
    const namespace = this.props.namespace;
    const name = this.props.name;
    API.getv2Experiment(namespace, name)
      .then(result => {
        this.setState({
          experimentItem: result.data.experimentItem,
          rows: this.getRows()
        });
      })
      .catch(error => {
        AlertUtils.addError('Could not fetch Iter8 Experiment', error);
      });
  };

  renderRows() {
    this.setState({
      experimentItem: this.props.experimentItem,
      rows: this.getRows()
    });
  }
  renderRow(type, assessment: Iter8v2VersionDetail, metricInfo: Map<string, string>) {
    return {
      cells: [
        { title: <>{type}</> },
        {
          title: (
            <>
              {this.props.experimentItem?.winnerFound && this.props.experimentItem?.winner === assessment.name ? (
                <Grid gutter="md">
                  <GridItem span={6}>
                    Winner
                    <Tooltip
                      key={'winnerTooltip'}
                      aria-label={'Winner Tooltip'}
                      position={PopoverPosition.auto}
                      className={'health_indicator'}
                      content={<>{'Winning version identified by iter8 analytics'}</>}
                    >
                      <KialiIcon.Info className={infoStyle} />
                    </Tooltip>
                  </GridItem>
                  <GridItem span={6}>
                    {' '}
                    <KialiIcon.Ok className={statusIconStyle} />
                  </GridItem>
                </Grid>
              ) : (
                <></>
              )}
              <Grid gutter="md">
                <GridItem span={6}>Name:</GridItem>
                <GridItem span={6}>{assessment.name}</GridItem>
              </Grid>
              <Grid gutter="md">
                <GridItem span={6}>Weight:</GridItem>
                <GridItem span={6}>{assessment.weight}</GridItem>
              </Grid>
            </>
          )
        },
        {
          props: { nonPadding: true },
          title: (
            <>
              {Object.keys(assessment.metricData).length &&
                Object.keys(assessment.metricData).map((c, _) => {
                  return (
                    <Grid gutter="md">
                      <GridItem span={4}>{c}</GridItem>
                      {metricInfo.hasOwnProperty(c) ? (
                        <GridItem span={4}>{metricInfo[c]}</GridItem>
                      ) : (
                        <GridItem span={4}> </GridItem>
                      )}
                      <GridItem span={4}>{assessment.metricData[c]}</GridItem>
                    </Grid>
                  );
                })}
            </>
          )
        }
      ]
    };
  }

  getRows = (): IRow[] => {
    let rows: IRow[] = [];

    rows.push(
      this.renderRow('Baseline', this.props.experimentItem?.versionInfo.baseline, this.props.experimentItem?.metricInfo)
    );
    this.props.experimentItem?.versionInfo.candidates.map(assessment => {
      rows.push(this.renderRow('Candidate', assessment, this.props.experimentItem?.metricInfo));
      return rows;
    });
    return rows;
  };
  customRowWrapper = ({ trRef, className, rowProps, row: { isExpanded, isHeightAuto }, ...props }) => {
    const dangerErrorStyle = {
      borderLeft: '3px solid var(--pf-global--primary-color--100)'
    };

    return (
      <tr
        {...props}
        ref={trRef}
        className={css(
          className,
          'custom-static-class',
          isExpanded !== undefined && styles.tableExpandableRow,
          isExpanded && styles.modifiers.expanded,
          isHeightAuto && styles.modifiers.heightAuto
        )}
        hidden={isExpanded !== undefined && !isExpanded}
        style={dangerErrorStyle}
      />
    );
  };

  render() {
    const { columns, rows } = this.state;
    return (
      <>
        <RenderComponentScroll>
          <Grid gutter="md">
            <GridItem span={12}>
              <Table
                aria-label="SpanTable"
                className={'spanTracingTagsTable'}
                rows={rows}
                cells={columns}
                rowWrapper={(props: RowWrapperProps) =>
                  this.customRowWrapper({
                    trRef: props.trRef,
                    className: props.className,
                    rowProps: props.rowProps,
                    row: props.row as any,
                    ...props
                  })
                }
              >
                <TableHeader />
                {rows.length > 0 ? (
                  <TableBody />
                ) : (
                  <tr>
                    <td colSpan={columns.length}>
                      <EmptyState variant={EmptyStateVariant.full}>
                        <Title headingLevel="h5" size="lg">
                          No Criteria found
                        </Title>
                        <EmptyStateBody>Experiment has not been started</EmptyStateBody>
                      </EmptyState>
                    </td>
                  </tr>
                )}
              </Table>
            </GridItem>
          </Grid>
        </RenderComponentScroll>
      </>
    );
  }
}

const mapStateToProps = (state: KialiAppState) => ({
  duration: durationSelector(state),
  lastRefreshAt: lastRefreshAtSelector(state)
});
const AssessmentDetail = connect(mapStateToProps, null)(AssessmentDetailTab);

export default AssessmentDetail;
