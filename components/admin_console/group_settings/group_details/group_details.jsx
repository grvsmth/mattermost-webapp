// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import PropTypes from 'prop-types';
import {FormattedMessage} from 'react-intl';
import {Groups} from 'mattermost-redux/constants';

import {t} from 'utils/i18n';
import {localizeMessage} from 'utils/utils.jsx';
import GroupTeamsAndChannels from 'components/admin_console/group_settings/group_details/group_teams_and_channels';
import GroupUsers from 'components/admin_console/group_settings/group_details/group_users';
import AdminPanel from 'components/widgets/admin_console/admin_panel';
import BlockableLink from 'components/admin_console/blockable_link';

import TeamSelectorModal from 'components/team_selector_modal';
import ChannelSelectorModal from 'components/channel_selector_modal';
import Menu from 'components/widgets/menu/menu';
import MenuWrapper from 'components/widgets/menu/menu_wrapper';

import {GroupProfileAndSettings} from './group_profile_and_settings';
export default class GroupDetails extends React.PureComponent {
    static propTypes = {
        groupID: PropTypes.string.isRequired,
        group: PropTypes.object,
        groupTeams: PropTypes.arrayOf(PropTypes.object),
        groupChannels: PropTypes.arrayOf(PropTypes.object),
        members: PropTypes.arrayOf(PropTypes.object),
        memberCount: PropTypes.number.isRequired,
        actions: PropTypes.shape({
            getGroup: PropTypes.func.isRequired,
            getMembers: PropTypes.func.isRequired,
            getGroupSyncables: PropTypes.func.isRequired,
            link: PropTypes.func.isRequired,
            unlink: PropTypes.func.isRequired,
            patchGroupSyncable: PropTypes.func.isRequired,
            patchGroup: PropTypes.func.isRequired,
        }).isRequired,
    };

    static defaultProps = {
        members: [],
        groupTeams: [],
        groupChannels: [],
        group: {name: '', display_name: '', allow_reference: false},
        memberCount: 0,
    };

    constructor(props) {
        super(props);
        this.state = {
            loadingTeamsAndChannels: true,
            addTeamOpen: false,
            addChannelOpen: false,
            allowReference: Boolean(props.group.allow_reference),
        };
    }

    componentDidMount() {
        const {groupID, actions, group} = this.props;
        actions.getGroup(groupID);

        Promise.all([
            actions.getGroupSyncables(groupID, Groups.SYNCABLE_TYPE_TEAM),
            actions.getGroupSyncables(groupID, Groups.SYNCABLE_TYPE_CHANNEL),
        ]).then(() => {
            this.setState({loadingTeamsAndChannels: false, group, allowReference: Boolean(this.props.group.allow_reference)});
        });
    }

    openAddChannel = () => {
        this.setState({addChannelOpen: true});
    }

    closeAddChannel = () => {
        this.setState({addChannelOpen: false});
    }

    openAddTeam = () => {
        this.setState({addTeamOpen: true});
    }

    closeAddTeam = () => {
        this.setState({addTeamOpen: false});
    }

    addTeams = (teams) => {
        const promises = [];
        for (const team of teams) {
            promises.push(this.props.actions.link(this.props.groupID, team.id, Groups.SYNCABLE_TYPE_TEAM, {auto_add: true}));
        }
        return Promise.all(promises).finally(() => this.props.actions.getGroupSyncables(this.props.groupID, Groups.SYNCABLE_TYPE_TEAM));
    }

    addChannels = async (channels) => {
        const promises = [];
        for (const channel of channels) {
            promises.push(this.props.actions.link(this.props.groupID, channel.id, Groups.SYNCABLE_TYPE_CHANNEL, {auto_add: true}));
        }
        return Promise.all(promises).finally(() => {
            this.props.actions.getGroupSyncables(this.props.groupID, Groups.SYNCABLE_TYPE_CHANNEL);
            this.props.actions.getGroupSyncables(this.props.groupID, Groups.SYNCABLE_TYPE_TEAM);
        });
    }

    onChangeRoles = async (id, type, roleToBe) => {
        this.setState({loadingTeamsAndChannels: true});
        if (type === 'public-team' || type === 'private-team') {
            await this.props.actions.patchGroupSyncable(this.props.groupID, id, Groups.SYNCABLE_TYPE_TEAM, {scheme_admin: roleToBe});
            await this.props.actions.getGroupSyncables(this.props.groupID, Groups.SYNCABLE_TYPE_TEAM);
        } else {
            await this.props.actions.patchGroupSyncable(this.props.groupID, id, Groups.SYNCABLE_TYPE_CHANNEL, {scheme_admin: roleToBe});
            await this.props.actions.getGroupSyncables(this.props.groupID, Groups.SYNCABLE_TYPE_CHANNEL);
        }
        this.setState({loadingTeamsAndChannels: false});
    }

    onToggle = async (allowReference) => {
        this.setState({allowReference});
        this.props.actions.patchGroup(this.props.groupID, {allow_reference: allowReference});
    }

    render = () => {
        const {group, members, groupTeams, groupChannels, memberCount} = this.props;
        const {allowReference} = this.state;

        return (
            <div className='wrapper--fixed'>
                <div className='admin-console__header with-back'>
                    <div>
                        <BlockableLink
                            to='/admin_console/user_management/groups'
                            className='fa fa-angle-left back'
                        />
                        <FormattedMessage
                            id='admin.group_settings.group_detail.group_configuration'
                            defaultMessage='Group Configuration'
                        />
                    </div>
                </div>

                <div className='admin-console__wrapper'>
                    <div className='admin-console__content'>
                        <div className='banner info'>
                            <div className='banner__content'>
                                <FormattedMessage
                                    id='admin.group_settings.group_detail.introBanner'
                                    defaultMessage='Configure default teams and channels and view users belonging to this group.'
                                />
                            </div>
                        </div>

                        <GroupProfileAndSettings
                            displayname={group.display_name}
                            name={group.name}
                            allowReference={allowReference}
                            onToggle={this.onToggle}
                        />

                        <AdminPanel
                            id='group_teams_and_channels'
                            titleId={t('admin.group_settings.group_detail.groupTeamsAndChannelsTitle')}
                            titleDefault='Team and Channel Membership'
                            subtitleId={t('admin.group_settings.group_detail.groupTeamsAndChannelsDescription')}
                            subtitleDefault='Set default teams and channels for group members. Teams added will include default channels, town-square, and off-topic. Adding a channel without setting the team will add the implied team to the listing below.'
                            button={(
                                <div className='group-profile-add-menu'>
                                    <MenuWrapper>
                                        <button
                                            id='add_team_or_channel'
                                            className='btn btn-primary'
                                        >
                                            <FormattedMessage
                                                id='admin.group_settings.group_details.add_team_or_channel'
                                                defaultMessage='Add Team or Channel'
                                            />
                                            <i className={'fa fa-caret-down'}/>
                                        </button>
                                        <Menu ariaLabel={localizeMessage('admin.group_settings.group_details.menuAriaLabel', 'Add Team or Channel Menu')}>
                                            <Menu.ItemAction
                                                id='add_team'
                                                onClick={this.openAddTeam}
                                                text={localizeMessage('admin.group_settings.group_details.add_team', 'Add Team')}
                                            />
                                            <Menu.ItemAction
                                                id='add_channel'
                                                onClick={this.openAddChannel}
                                                text={localizeMessage('admin.group_settings.group_details.add_channel', 'Add Channel')}
                                            />
                                        </Menu>
                                    </MenuWrapper>
                                </div>
                            )}
                        >
                            <GroupTeamsAndChannels
                                id={this.props.groupID}
                                teams={groupTeams}
                                channels={groupChannels}
                                loading={this.state.loadingTeamsAndChannels}
                                getGroupSyncables={this.props.actions.getGroupSyncables}
                                unlink={this.props.actions.unlink}
                                onChangeRoles={this.onChangeRoles}
                            />
                        </AdminPanel>
                        {this.state.addTeamOpen &&
                            <TeamSelectorModal
                                onModalDismissed={this.closeAddTeam}
                                onTeamsSelected={this.addTeams}
                                alreadySelected={this.props.groupTeams.map((team) => team.team_id)}
                            />
                        }
                        {this.state.addChannelOpen &&
                            <ChannelSelectorModal
                                onModalDismissed={this.closeAddChannel}
                                onChannelsSelected={this.addChannels}
                                alreadySelected={this.props.groupChannels.map((channel) => channel.channel_id)}
                                groupID={this.props.groupID}
                            />
                        }

                        <AdminPanel
                            id='group_users'
                            titleId={t('admin.group_settings.group_detail.groupUsersTitle')}
                            titleDefault='Users'
                            subtitleId={t('admin.group_settings.group_detail.groupUsersDescription')}
                            subtitleDefault='Listing of users in Mattermost associated with this group.'
                        >
                            <GroupUsers
                                members={members}
                                total={memberCount}
                                groupID={this.props.groupID}
                                getMembers={this.props.actions.getMembers}
                            />
                        </AdminPanel>
                    </div>
                </div>

            </div>
        );
    };
}
