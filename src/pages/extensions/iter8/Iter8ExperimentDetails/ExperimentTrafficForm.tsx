import {
  cellWidth,
  compoundExpand,
  ICell,
  IRow,
  Table,
  TableBody,
  TableHeader,
  TableVariant,
  wrappable
} from '@patternfly/react-table';
import { Criteria, HeaderMatch, Host, HttpMatch, initCriteria } from '../../../../types/Iter8';
import * as React from 'react';
import {
  Button,
  ButtonVariant,
  Card,
  CardBody,
  EmptyState,
  EmptyStateBody,
  EmptyStateVariant,
  Flex,
  FlexItem,
  FlexModifiers,
  FormGroup,
  FormSelect,
  FormSelectOption,
  Grid,
  GridItem,
  Popover,
  Modal,
  TextInput,
  Title
} from '@patternfly/react-core';
import CodeBranchIcon from '@patternfly/react-icons/dist/js/icons/code-branch-icon';
import { InfoAltIcon } from '@patternfly/react-icons';
import { style } from 'typestyle';

const MatchOptions = [
  { value: '', label: '--- select ---' },
  { value: 'exact', label: 'exact string match' },
  { value: 'prefix', label: 'prefix-based match' },
  { value: 'regex', label: 'ECMAscript style regex-based match' }
];

const headerCells: ICell[] = [
  {
    title: 'header keys',
    transforms: [wrappable, cellWidth(20) as any],
    props: {}
  },
  {
    title: 'match',
    transforms: [cellWidth(35) as any],
    props: {}
  },
  {
    title: 'string match',
    transforms: [cellWidth(20) as any],
    props: {}
  },
  {
    title: '',
    props: {}
  }
];

const containerPadding = style({ padding: '20px' });

const matchWizardTableColumns = [
  'URL Match Policy',
  'Match String',
  {
    title: 'Headers',
    cellTransforms: [compoundExpand]
  },
  '' // Delete button
];
const matchWizardTableChildColumns = ['Header Key', 'Match Policy', 'Match String'];

type Props = {
  matches: HttpMatch[];
  onRemove: (type: string, index: number) => void;
  onAdd: (criteria: Criteria, host: Host, match: any) => void;
};

export type TrafficState = {
  showAddMatchWizard: boolean;
  addMatch: HttpMatch;
  addHeader: HeaderMatch;
  rows: any[];
  focusElementName: string;
  validName: boolean;
};

export const initMatch = (): TrafficState => ({
  showAddMatchWizard: false,
  addMatch: {
    uri: {
      match: '',
      stringMatch: ''
    },
    headers: []
  },
  addHeader: {
    key: '',
    match: '',
    stringMatch: ''
  },
  rows: [],
  focusElementName: 'Unknown',
  validName: false
});

// Create Success Criteria, can be multiple with same metric, but different sampleSize, etc...
class ExperimentTrafficForm extends React.Component<Props, TrafficState> {
  constructor(props: Props) {
    super(props);
    this.state = initMatch();
  }

  // @ts-ignore
  actionResolver = (rowData, { rowIndex }) => {
    const removeAction = {
      title: 'Remove Header',
      // @ts-ignore
      onClick: (event, rowIndex) => {
        this.onHeaderRemove(rowIndex);
      }
    };
    if (rowIndex < this.state.addMatch.headers.length) {
      return [removeAction];
    }
    return [];
  };

  componentDidUpdate() {
    if (this.state.focusElementName !== '') {
      const focusElement = document.getElementById(this.state.focusElementName);
      if (focusElement) {
        focusElement.focus();
      }
    }
  }

  onAddUriMatch = (value: string) => {
    this.setState(prevState => ({
      addMatch: {
        uri: {
          match: value.trim(),
          stringMatch: prevState.addMatch.uri.stringMatch
        },
        headers: prevState.addMatch.headers
      },
      focusElementName: 'Unknow',
      validName: true
    }));
  };

  onAddUriMatchString = (value: string) => {
    this.setState(prevState => ({
      addMatch: {
        uri: {
          match: prevState.addMatch.uri.match,
          stringMatch: value.trim()
        },
        headers: prevState.addMatch.headers
      },
      focusElementName: 'Unknow',
      validName: true
    }));
  };

  onAddHeader = () => {
    this.setState(prevState => ({
      addMatch: {
        uri: {
          match: prevState.addMatch.uri.match,
          stringMatch: prevState.addMatch.uri.stringMatch
        },
        headers: prevState.addMatch.headers.concat(this.state.addHeader)
      },
      addHeader: {
        key: '',
        match: '',
        stringMatch: ''
      },
      focusElementName: 'Unknown'
    }));
  };

  onHeaderRemove = (index: number) => {
    this.setState(prevState => {
      prevState.addMatch.headers.splice(index, 1);
      return {
        addMatch: prevState.addMatch,
        addHeader: prevState.addHeader,
        focusElementName: 'UNknown'
      };
    });
  };

  onAddHeaderValue = (field: string, value: string) => {
    this.setState(prevState => {
      const headerInfo = prevState.addHeader;
      switch (field) {
        case 'addNewHeaderKey':
          headerInfo.key = value.trim();
          break;
        case 'addNewHeaderMatch':
          headerInfo.match = value.trim();
          break;
        case 'addNewHeaderStringMatch':
          headerInfo.stringMatch = value.trim();
          break;
        default:
      }
      return {
        addMatch: prevState.addMatch,
        addHeader: headerInfo,
        focusElementName: field
      };
    });
  };

  onShowAddMatchWizard = (show: boolean) => {
    this.setState({
      showAddMatchWizard: show
    });
  };

  isAddMatchValid = () => {
    return !(
      (this.state.addMatch.uri.match.length === 0 || this.state.addMatch.uri.stringMatch.length === 0) &&
      this.state.addMatch.headers.length === 0
    );
  };

  onAddMatchRules = () => {
    this.props.onAdd(initCriteria(), { name: '', gateway: '' }, this.state.addMatch);
    this.onShowAddMatchWizard(false);

    this.setState(() => {
      return {
        addMatch: {
          uri: {
            match: '',
            stringMatch: ''
          },
          headers: []
        },
        addHeader: {
          key: '',
          match: '',
          stringMatch: ''
        },
        rows: this.getRows(),
        focusElementName: 'Unknown',
        validName: false
      };
    });
  };

  onRemoveMatchRules = (index: number) => {
    this.props.matches.splice(index, 1);

    this.setState(() => {
      return {
        rows: this.getRows()
      };
    });
  };

  getRows = (): IRow[] => {
    let rows: IRow[] = [];

    this.props.matches.forEach((matchRule, index) => {
      const parentCount = index * 2;

      const childRows: IRow[] = matchRule.headers.map(h => {
        return {
          cells: [h.key, h.match, h.stringMatch]
        };
      });

      rows.push({
        cells: [
          matchRule.uri.match,
          matchRule.uri.stringMatch,
          {
            title: (
              <React.Fragment>
                <CodeBranchIcon key="icon" /> {matchRule.headers.length}
              </React.Fragment>
            ),
            props: {
              isOpen: false
            }
          },
          {
            title: <Button onClick={() => this.onRemoveMatchRules(index)}>Delete</Button>
          }
        ]
      });

      rows.push({
        parent: parentCount,
        compoundParent: 2,
        cells: [
          {
            title: (
              <Table
                cells={matchWizardTableChildColumns}
                variant={TableVariant.compact}
                rows={childRows}
                className="pf-m-no-border-rows"
              >
                <TableHeader />
                <TableBody />
              </Table>
            ),
            props: {
              className: 'pf-m-no-padding',
              colSpan: 3
            }
          }
        ]
      });
    });

    return rows;
  };

  onExpand = (_, rowIndex, colIndex, isOpen) => {
    const { rows } = this.state;

    rows[rowIndex].cells[colIndex].props.isOpen = !isOpen;

    this.setState({
      rows
    });
  };

  getMatchWizardRows = (): IRow[] => {
    return this.state.addMatch.headers
      .map((header, i) => ({
        key: 'header' + i,
        cells: [<>{header.key}</>, <>{header.match}</>, <>{header.stringMatch}</>]
      }))
      .concat([
        {
          key: 'Header',
          cells: [
            <>
              <TextInput
                id="addNewHeaderKey"
                placeholder="Key"
                value={this.state.addHeader.key}
                onChange={value => this.onAddHeaderValue('addNewHeaderKey', value)}
              />
            </>,
            <>
              <FormSelect
                id="addNewHeaderMatch"
                onChange={value => this.onAddHeaderValue('addNewHeaderMatch', value)}
                value={this.state.addHeader.match}
              >
                {MatchOptions.map((mt, index) => (
                  <FormSelectOption label={mt.label} key={'mt' + index} value={mt.value} />
                ))}
              </FormSelect>
            </>,
            <FormGroup fieldId="faddNewHeaderStringMatch" isValid={this.state.addHeader.stringMatch.length > 0}>
              <TextInput
                id="addNewHeaderStringMatch"
                placeholder="match string"
                onChange={value => this.onAddHeaderValue('addNewHeaderStringMatch', value)}
                value={this.state.addHeader.stringMatch}
              />
            </FormGroup>,
            <>
              <Button
                id="addHostBtn"
                aria-label="slider-text"
                variant="secondary"
                isDisabled={
                  this.state.addHeader.key === '' ||
                  this.state.addHeader.match === '' ||
                  this.state.addHeader.stringMatch === ''
                }
                onClick={this.onAddHeader}
              >
                Add this Header
              </Button>
            </>
          ]
        }
      ]);
  };

  render() {
    const { rows } = this.state;

    return (
      <div>
        <Flex breakpointMods={[{ modifier: FlexModifiers.column }]}>
          <FlexItem>
            <div className={containerPadding}>
              <Title headingLevel="h6" size="lg">
                Match Rules
                <Popover
                  position={'right'}
                  hideOnOutsideClick={true}
                  maxWidth={'40rem'}
                  headerContent={<div>Match Rules</div>}
                  bodyContent={
                    <div>
                      <p>
                        Specifies the portion of traffic that can be routed to candidates during the experiment. Traffic
                        that does not match this clause will be sent to baseline and never to a candidate during an
                        experiment. By default, if this field is left unspecified, all traffic is used for an
                        experiment.
                      </p>
                      <p>
                        Currently, only HTTP traffic is controlled. For each match rule, please specify one or both of
                        <b>uri</b> and one or multiple <b>headers</b>. Use <b>Add this Header</b> to add the header to
                        the match rule, and use <b>Add Match Rule</b> to add the match rule.
                      </p>
                    </div>
                  }
                >
                  <Button variant="link">
                    <InfoAltIcon noVerticalAlign />
                  </Button>
                </Popover>
              </Title>

              <Table
                aria-label="Compound expandable table"
                onExpand={this.onExpand}
                rows={rows}
                cells={matchWizardTableColumns}
              >
                <TableHeader />
                {rows.length > 0 ? (
                  <TableBody />
                ) : (
                  <tr>
                    <td colSpan={matchWizardTableColumns.length}>
                      <EmptyState variant={EmptyStateVariant.full}>
                        <Title headingLevel="h5" size="lg">
                          No Match Rule found
                        </Title>
                        <EmptyStateBody>No Match Rules is defined in Experiment</EmptyStateBody>
                      </EmptyState>
                    </td>
                  </tr>
                )}
              </Table>
            </div>
          </FlexItem>
        </Flex>

        <Modal
          width={'50%'}
          title={'Create New Match Rule'}
          isOpen={this.state.showAddMatchWizard}
          onClose={() => this.onShowAddMatchWizard(false)}
          onKeyPress={e => {
            if (e.key === 'Enter' && this.isAddMatchValid()) {
              this.onAddMatchRules();
            }
          }}
          actions={[
            <Button
              variant={ButtonVariant.secondary}
              isDisabled={!this.isAddMatchValid()}
              onClick={() => this.onAddMatchRules()}
            >
              Create Rule
            </Button>
          ]}
        >
          <>
            <Card>
              <CardBody>
                <Grid gutter="md">
                  <GridItem span={6}>
                    <FormGroup fieldId="matchSelect" label="URI Match criterion">
                      <FormSelect id="match" value={this.state.addMatch.uri.match} onChange={this.onAddUriMatch}>
                        {MatchOptions.map((mt, index) => (
                          <FormSelectOption label={mt.label} key={'gateway' + index} value={mt.value} />
                        ))}
                      </FormSelect>
                    </FormGroup>
                  </GridItem>
                  <GridItem span={6}>
                    <FormGroup fieldId="stringMatch" label="Match String">
                      <TextInput
                        id={'stringMatch'}
                        placeholder="match string"
                        value={this.state.addMatch.uri.stringMatch}
                        onChange={value => this.onAddUriMatchString(value)}
                      />
                    </FormGroup>
                  </GridItem>
                  <GridItem span={12}>
                    <Table
                      aria-label="HTTP Match Requests"
                      cells={headerCells}
                      rows={this.getMatchWizardRows()}
                      // @ts-ignore
                      actionResolver={this.actionResolver}
                    >
                      <TableHeader />
                      <TableBody />
                    </Table>
                  </GridItem>
                </Grid>
              </CardBody>
            </Card>
          </>
        </Modal>

        <Button variant={ButtonVariant.secondary} onClick={() => this.onShowAddMatchWizard(true)}>
          Add Match Rule
        </Button>
      </div>
    );
  }
}

export default ExperimentTrafficForm;
